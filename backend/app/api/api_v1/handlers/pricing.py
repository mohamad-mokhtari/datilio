from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import os
import stripe

from app.models.plan_model import Plan
from app.models.user_plan_model import UserPlan
from app.models.usage_tracking_model import UsageTracking
from app.models.user_model import User
from app.models.stripe_payment_model import StripePayment
from app.models.user_subscription_model import UserSubscription
from app.core.db_setup import get_db
from app.core.stripe_config import stripe, STRIPE_WEBHOOK_SECRET
from app.core.config import settings
from app.schemas.pricing_schemas import (
    PlanOut,
    PlanWithUsageOut,
    PurchasePlanIn,
    UserPlanOut,
    UsageOut,
    UsageSummaryOut,
    CreatePlanIn,
    AddonPurchaseIn,
    StripePaymentOut,
    VerifyPaymentIn,
    SubscriptionPurchaseIn,
    UpdateSubscriptionIn,
    CancelSubscriptionIn,
    UserSubscriptionOut,
    SubscriptionOut,
)
from app.services.plan_seeder import PlanSeeder
from app.services.usage_service import UsageService

router = APIRouter()

# Import the real authentication dependency
from app.api.deps.user_deps import get_current_user
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)

# Admin-only dependency
def get_admin_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action",
        )
    return current_user

# -------------------
# Plan Management
# -------------------

@router.get("/plans", response_model=List[PlanOut])
def get_plans(db: Session = Depends(get_db)):
    """Get all active plans"""
    plans = db.query(Plan).filter(Plan.is_active == True).order_by(Plan.price_monthly).all()
    return plans

@router.get("/plans/main", response_model=List[PlanOut])
def get_main_plans(db: Session = Depends(get_db)):
    """Get main plans (non-addons)"""
    return PlanSeeder.get_main_plans(db)

@router.get("/plans/addons", response_model=List[PlanOut])
def get_addon_plans(db: Session = Depends(get_db)):
    """Get add-on plans"""
    return PlanSeeder.get_addons(db)

@router.post("/plans/seed")
def seed_plans(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Seed the database with default plans (admin only)"""
    plans = PlanSeeder.seed_plans(db)
    return {"message": f"Successfully seeded {len(plans)} plans", "plans": len(plans)}

@router.post("/plans", response_model=PlanOut)
def create_plan(
    data: CreatePlanIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Create a new plan (admin only)"""
    # Check if plan name already exists
    existing_plan = db.query(Plan).filter(Plan.name == data.name).first()
    if existing_plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A plan with this name already exists",
        )

    # Create new plan
    plan = Plan(
        name=data.name,
        description=data.description,
        price_monthly=data.price_monthly,
        is_active=data.is_active,
        file_limit=data.file_limit,
        file_size_limit_mb=data.file_size_limit_mb,
        storage_limit_gb=data.storage_limit_gb,
        rules_limit=data.rules_limit,
        custom_lists_limit=data.custom_lists_limit,
        ai_prompts_per_month=data.ai_prompts_per_month,
        ai_tokens_per_month=data.ai_tokens_per_month,
        synthetic_rows_per_month=data.synthetic_rows_per_month,
        features=data.features,
        is_addon=data.is_addon,
        priority_processing=data.priority_processing,
        team_sharing=data.team_sharing,
    )

    db.add(plan)
    db.commit()
    db.refresh(plan)

    return plan

# -------------------
# User Plan Management
# -------------------

@router.get("/user/plan", response_model=Optional[UserPlanOut])
def get_user_plan(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get current user's active plan"""
    user_plan = (
        db.query(UserPlan)
        .filter(UserPlan.user_id == current_user.id, UserPlan.is_active == True)
        .first()
    )
    return user_plan

@router.get("/user/plan/with-usage", response_model=Optional[PlanWithUsageOut])
def get_user_plan_with_usage(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get current user's plan with usage information"""
    user_plan = (
        db.query(UserPlan)
        .filter(UserPlan.user_id == current_user.id, UserPlan.is_active == True)
        .first()
    )
    
    if not user_plan:
        # Return free plan with usage
        free_plan = PlanSeeder.get_plan_by_name(db, "Free")
        if free_plan:
            usage_summary = UsageService.get_usage_summary(db, str(current_user.id))
            return PlanWithUsageOut(
                **free_plan.__dict__,
                current_usage=usage_summary.current_month,
                usage_percentages=usage_summary.percentages
            )
        return None
    
    usage_summary = UsageService.get_usage_summary(db, str(current_user.id))
    return PlanWithUsageOut(
        **user_plan.plan.__dict__,
        current_usage=usage_summary.current_month,
        usage_percentages=usage_summary.percentages
    )

@router.post("/user/plan/cancel")
def cancel_user_plan(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Cancel user's current plan"""
    user_plan = (
        db.query(UserPlan)
        .filter(UserPlan.user_id == current_user.id, UserPlan.is_active == True)
        .first()
    )
    if not user_plan:
        raise HTTPException(status_code=404, detail="No active plan to cancel")
    
    user_plan.is_active = False
    user_plan.end_date = datetime.utcnow()
    db.commit()
    
    return {"status": "cancelled", "message": "Plan cancelled successfully"}

# -------------------
# Usage Tracking
# -------------------

@router.get("/user/usage", response_model=List[UsageOut])
def get_user_usage(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get user's usage history"""
    usage = (
        db.query(UsageTracking)
        .filter(UsageTracking.user_id == current_user.id)
        .order_by(UsageTracking.timestamp.desc())
        .all()
    )
    return usage

@router.get("/user/usage/summary", response_model=UsageSummaryOut)
def get_user_usage_summary(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get user's current month usage summary"""
    return UsageService.get_usage_summary(db, str(current_user.id))

@router.get("/user/usage/breakdown")
def get_user_usage_breakdown(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get detailed usage breakdown by feature"""
    return UsageService.get_usage_breakdown(db, str(current_user.id))

@router.get("/user/usage/history/{feature}")
def get_feature_usage_history(
    feature: str,
    days: int = 30,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get usage history for a specific feature"""
    return UsageService.get_feature_usage_history(db, str(current_user.id), feature, days)

# -------------------
# COMMON ENDPOINTS (Used by both payment methods)
# -------------------

@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events for both one-time payments and subscriptions"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    # Log webhook received
    print(f"🔔 Webhook received: {request.headers.get('stripe-signature', 'No signature')}")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
        print(f"✅ Webhook verified: {event['type']}")
    except ValueError as e:
        print(f"❌ Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        print(f"❌ Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        event_type = event["type"]
        print(f"🔄 Processing event: {event_type}")
        
        if event_type == "checkout.session.completed":
            handle_checkout_completed(event["data"]["object"], db)
            print("✅ Checkout completed handled")
        elif event_type == "customer.subscription.created":
            handle_subscription_created(event["data"]["object"], db)
            print("✅ Subscription created handled")
        elif event_type == "customer.subscription.updated":
            handle_subscription_updated(event["data"]["object"], db)
            print("✅ Subscription updated handled")
        elif event_type == "customer.subscription.deleted":
            handle_subscription_deleted(event["data"]["object"], db)
            print("✅ Subscription deleted handled")
        elif event_type == "invoice.paid":
            handle_invoice_paid(event["data"]["object"], db)
            print("✅ Invoice paid handled")
        else:
            print(f"⚠️ Unhandled event type: {event_type}")
    except Exception as e:
        print(f"❌ Error processing webhook {event_type}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Error processing {event_type}: {str(e)}")
    
    return {"status": "success"}

@router.post("/stripe/verify-payment")
def verify_and_activate_payment(
    data: VerifyPaymentIn,
     db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually verify payment and activate plan (fallback for webhook issues)"""
    # Find the payment record
    payment = db.query(StripePayment).filter(
        StripePayment.session_id == data.session_id,
        StripePayment.user_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.status == "completed":
        return {"message": "Payment already activated", "status": "completed"}
    
    # Verify with Stripe that the session was completed
    try:
        stripe_session = stripe.checkout.Session.retrieve(data.session_id)
        
        if stripe_session.payment_status == "paid":
            # Activate the plan (same logic as webhook)
            payment.status = "completed"
            payment.completed_at = datetime.utcnow()
            
            # If it's a main plan purchase, update user plan
            if not payment.is_addon:
                # Deactivate existing plans
                db.query(UserPlan).filter(
                    UserPlan.user_id == payment.user_id, 
                    UserPlan.is_active == True
                ).update({"is_active": False})
                
                # Create new user plan
                duration_months = int(stripe_session.metadata.get("duration_months", 1))
                start_date = datetime.utcnow()
                end_date = start_date + timedelta(days=30 * duration_months)
                
                user_plan = UserPlan(
                    user_id=payment.user_id,
                    plan_id=payment.plan_id,
                    start_date=start_date,
                    end_date=end_date,
                    is_active=True,
                    stripe_session_id=data.session_id
                )
                db.add(user_plan)
            
            db.commit()
            
            return {
                "message": "Payment verified and plan activated successfully",
                "status": "completed",
                "plan_activated": not payment.is_addon
            }
        else:
            raise HTTPException(status_code=400, detail="Payment not completed")
            
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

@router.get("/user/payments", response_model=List[StripePaymentOut])
def get_user_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's payment history (both one-time and subscription payments)"""
    payments = db.query(StripePayment).filter(
        StripePayment.user_id == current_user.id
    ).order_by(StripePayment.created_at.desc()).all()
    
    return payments

# -------------------
# ONE-TIME PAYMENT ENDPOINTS
# -------------------

@router.post("/stripe/create-checkout-session")
def create_checkout_session(
    data: PurchasePlanIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create Stripe checkout session for one-time plan purchase"""
    # Find the plan
    plan = db.query(Plan).filter(Plan.id == data.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    if not plan.is_active:
        raise HTTPException(status_code=400, detail="Plan is not active")
    
    # Create Stripe Checkout Session
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": plan.name,
                            "description": plan.description or f"{plan.name} Plan"
                        },
                        "unit_amount": int(plan.price_monthly * 100),  # Stripe uses cents
                    },
                    "quantity": data.duration_months,
                }
            ],
            mode="payment",
            customer_email=current_user.email,
            success_url=os.getenv("STRIPE_SUCCESS_URL", f"{settings.FRONTEND_BASE_URL}/pricing/success"),
            cancel_url=os.getenv("STRIPE_CANCEL_URL", f"{settings.FRONTEND_BASE_URL}/pricing/cancel"),
            metadata={
                "user_id": str(current_user.id), 
                "plan_id": str(plan.id),
                "duration_months": str(data.duration_months)
            },
        )
            
        # Record the payment attempt
        payment = StripePayment(
            user_id=current_user.id,
            plan_id=plan.id,
            session_id=session.id,
            amount_paid=plan.price_monthly * data.duration_months,
            status="pending"
        )
        db.add(payment)
        db.commit()
        
        return {"checkout_url": session.url, "session_id": session.id}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/stripe/create-addon-session")
def create_addon_checkout_session(
    data: AddonPurchaseIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create Stripe checkout session for one-time add-on purchase"""
    # Find the addon plan
    addon_plans = PlanSeeder.get_addons(db)
    addon_plan = None
    
    for plan in addon_plans:
        if plan.features.get("addon_type") == data.addon_type:
            addon_plan = plan
            break
    
    if not addon_plan:
        raise HTTPException(status_code=404, detail="Addon not found")
    
    # Calculate total amount
    total_amount = addon_plan.price_monthly * data.quantity
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": f"{addon_plan.name} x{data.quantity}",
                            "description": addon_plan.description
                        },
                        "unit_amount": int(addon_plan.price_monthly * 100),
                    },
                    "quantity": data.quantity,
                }
            ],
            mode="payment",
            customer_email=current_user.email,
            success_url=os.getenv("STRIPE_SUCCESS_URL", f"{settings.FRONTEND_BASE_URL}/billing/success"),
            cancel_url=os.getenv("STRIPE_CANCEL_URL", f"{settings.FRONTEND_BASE_URL}/billing/cancel"),
            metadata={
                "user_id": str(current_user.id), 
                "plan_id": str(addon_plan.id),
                "addon_type": data.addon_type,
                "quantity": str(data.quantity)
            },
        )
        
        # Record the addon payment attempt
        payment = StripePayment(
            user_id=current_user.id,
            plan_id=addon_plan.id,
            session_id=session.id,
            amount_paid=total_amount,
            status="pending",
            is_addon=True,
            payment_metadata={"addon_type": data.addon_type, "quantity": data.quantity}
        )
        db.add(payment)
        db.commit()
        
        return {"checkout_url": session.url, "session_id": session.id}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------
# SUBSCRIPTION PAYMENT ENDPOINTS
# -------------------

@router.post("/stripe/create-subscription-session")
def create_subscription_checkout_session(
    data: SubscriptionPurchaseIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create Stripe subscription checkout session for plan subscription"""
    # Find the plan
    plan = db.query(Plan).filter(Plan.id == data.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    if not plan.is_active:
        raise HTTPException(status_code=400, detail="Plan is not active")
    
    # Validate price_id matches the plan and interval
    expected_price_id = None
    if data.interval == "month":
        expected_price_id = plan.stripe_price_id_monthly
    elif data.interval == "year":
        expected_price_id = plan.stripe_price_id_yearly
    
    if not expected_price_id or expected_price_id != data.price_id:
        raise HTTPException(status_code=400, detail="Invalid price ID for this plan and interval")
    
    # Create Stripe Subscription Checkout Session
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price": data.price_id,
                    "quantity": 1,
                }
            ],
            mode="subscription",
            customer_email=current_user.email,
            success_url=os.getenv("STRIPE_SUCCESS_URL", f"{settings.FRONTEND_BASE_URL}/billing/success"),
            cancel_url=os.getenv("STRIPE_CANCEL_URL", f"{settings.FRONTEND_BASE_URL}/billing/cancel"),
            subscription_data={
                "metadata": {
                    "user_id": str(current_user.id), 
                    "plan_id": str(plan.id),
                    "interval": data.interval
                }
            },
            metadata={
                "user_id": str(current_user.id), 
                "plan_id": str(plan.id),
                "interval": data.interval
            },
        )
        
        
        # Record the subscription attempt
        payment = StripePayment(
            user_id=current_user.id,
            plan_id=plan.id,
            session_id=session.id,
            amount_paid=0.0,  # Will be updated when subscription is created
            status="pending",
            is_addon=False,
            payment_metadata={"subscription_mode": True, "interval": data.interval}
        )
        db.add(payment)
        db.commit()
        
        return {"checkout_url": session.url, "session_id": session.id}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/stripe/create-addon-subscription-session")
def create_addon_subscription_session(
    data: SubscriptionPurchaseIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create Stripe subscription checkout session for add-on"""
    # Find the addon plan
    addon_plan = db.query(Plan).filter(
        Plan.id == data.plan_id,
        Plan.is_addon == True,
        Plan.is_active == True
    ).first()
    
    if not addon_plan:
        raise HTTPException(status_code=404, detail="Addon not found")
    
    # Validate price_id matches the addon and interval
    expected_price_id = None
    if data.interval == "month":
        expected_price_id = addon_plan.stripe_price_id_monthly
    elif data.interval == "year":
        expected_price_id = addon_plan.stripe_price_id_yearly
    
    if not expected_price_id or expected_price_id != data.price_id:
        raise HTTPException(status_code=400, detail="Invalid price ID for this addon and interval")
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price": data.price_id,
                    "quantity": 1,
                }
            ],
            mode="subscription",
            customer_email=current_user.email,
            success_url=os.getenv("STRIPE_SUCCESS_URL", f"{settings.FRONTEND_BASE_URL}/billing/success"),
            cancel_url=os.getenv("STRIPE_CANCEL_URL", f"{settings.FRONTEND_BASE_URL}/billing/cancel"),
            subscription_data={
                "metadata": {
                    "user_id": str(current_user.id), 
                    "plan_id": str(addon_plan.id),
                    "interval": data.interval,
                    "is_addon": "true"
                }
            },
            metadata={
                "user_id": str(current_user.id), 
                "plan_id": str(addon_plan.id),
                "interval": data.interval,
                "is_addon": "true"
            },
        )
        
        # Record the addon subscription attempt
        payment = StripePayment(
            user_id=current_user.id,
            plan_id=addon_plan.id,
            session_id=session.id,
            amount_paid=0.0,  # Will be updated when subscription is created
            status="pending",
            is_addon=True,
            payment_metadata={
                "subscription_mode": True, 
                "interval": data.interval,
                "addon_type": addon_plan.features.get("addon_type")
            }
        )
        db.add(payment)
        db.commit()
        
        return {"checkout_url": session.url, "session_id": session.id}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Webhook handler functions
def handle_checkout_completed(session, db: Session):
    """Handle checkout.session.completed event"""
    # Update payment record
    payment = db.query(StripePayment).filter(
        StripePayment.session_id == session.id
    ).first()
    
    if payment:
        payment.status = "completed"
        payment.completed_at = datetime.utcnow()
        
        # Check if this is a subscription or one-time payment
        if payment.payment_metadata.get("subscription_mode"):
            # For subscriptions, the subscription will be created separately
            # We'll handle it in handle_subscription_created
            pass
        else:
            # Handle one-time payment (legacy)
            if not payment.is_addon:
                # Deactivate existing plans
                db.query(UserPlan).filter(
                    UserPlan.user_id == payment.user_id, 
                    UserPlan.is_active == True
                ).update({"is_active": False})
                
                # Create new user plan
                duration_months = int(session.metadata.get("duration_months", 1))
                start_date = datetime.utcnow()
                end_date = start_date + timedelta(days=30 * duration_months)
                
                user_plan = UserPlan(
                    user_id=payment.user_id,
                    plan_id=payment.plan_id,
                    start_date=start_date,
                    end_date=end_date,
                    is_active=True,
                    stripe_session_id=session.id
                )
                db.add(user_plan)
        
        db.commit()

def handle_subscription_created(subscription, db: Session):
    """Handle customer.subscription.created event"""
    print(f"🔄 Processing subscription.created: {subscription.id}")
    print(f"📋 Subscription metadata: {subscription.metadata}")
    print(f"📋 Subscription keys: {list(subscription.keys()) if hasattr(subscription, 'keys') else 'No keys method'}")
    print(f"📋 Subscription status: {subscription.status}")
    print(f"📋 Subscription customer: {subscription.customer}")
    
    # Find the payment record by session metadata
    user_id = subscription.metadata.get("user_id")
    plan_id = subscription.metadata.get("plan_id")
    
    if not user_id or not plan_id:
        print(f"⚠️ No user_id or plan_id in subscription metadata")
        # Try to find by looking up the customer's recent sessions
        customer_id = subscription.customer
        print(f"🔍 Looking up customer: {customer_id}")
        
        # Find the most recent StripePayment record for this customer
        # This is a fallback method
        recent_payment = db.query(StripePayment).filter(
            StripePayment.payment_metadata['subscription_mode'].astext == 'true'
        ).order_by(StripePayment.created_at.desc()).first()
        
        if recent_payment:
            user_id = str(recent_payment.user_id)
            plan_id = str(recent_payment.plan_id)
            print(f"✅ Found payment record: user_id={user_id}, plan_id={plan_id}")
        else:
            print(f"❌ No recent payment record found for subscription")
            return
    
    # Deactivate existing subscriptions
    db.query(UserSubscription).filter(
        UserSubscription.user_id == user_id,
        UserSubscription.status.in_(["active", "trialing"])
    ).update({"status": "canceled", "canceled_at": datetime.utcnow()})
    
    # Deactivate existing user plans (for subscription-based plans)
    db.query(UserPlan).filter(
        UserPlan.user_id == user_id,
        UserPlan.is_active == True
    ).update({"is_active": False})
    
    # Update the StripePayment record with the actual amount paid
    # Find the payment record by session or by user_id/plan_id
    payment_record = None
    
    # First try to find by session_id from subscription metadata
    session_id = subscription.metadata.get("session_id")
    if session_id:
        payment_record = db.query(StripePayment).filter(
            StripePayment.session_id == session_id
        ).first()
    
    try:
        # If not found by session_id, find by user_id and plan_id
        if not payment_record:
            payment_record = db.query(StripePayment).filter(
                StripePayment.user_id == user_id,
                StripePayment.plan_id == plan_id,
                StripePayment.payment_metadata['subscription_mode'].astext == 'true'
            ).order_by(StripePayment.created_at.desc()).first()
    except Exception as e:
        print(f"❌ Error finding payment record: {e}")
    if payment_record:
        # Get the subscription amount from the plan data
        items = subscription.get('items', {})
        items_data = items.get('data', [])
        
        if items_data:
            subscription_item = items_data[0]
            price_data = subscription_item.get('price', {})
            unit_amount = price_data.get('unit_amount', 0)  # Amount in cents
            amount_paid = unit_amount / 100.0  # Convert to dollars
            
            payment_record.amount_paid = amount_paid
            payment_record.status = "completed"
            payment_record.completed_at = datetime.utcnow()
            print(f"💰 Updated payment record: amount_paid=${amount_paid}")
        else:
            print(f"⚠️ Could not determine subscription amount")
    else:
        print(f"⚠️ No payment record found to update")
    
    try:
        # Get subscription period data safely
        # The current_period_start and current_period_end are in items.data[0]
        items = subscription.get('items', {})
        items_data = items.get('data', [])
        
        if items_data:
            subscription_item = items_data[0]
            current_period_start = subscription_item.get('current_period_start')
            current_period_end = subscription_item.get('current_period_end')
        else:
            # Fallback to top-level fields if items.data is empty
            current_period_start = subscription.get('current_period_start')
            current_period_end = subscription.get('current_period_end')
        
        canceled_at = subscription.get('canceled_at')
        
        print(f"📅 Subscription periods: start={current_period_start}, end={current_period_end}, canceled_at={canceled_at}")
        
        # Validate required fields
        if not current_period_start or not current_period_end:
            print(f"❌ Missing required period data: start={current_period_start}, end={current_period_end}")
            raise ValueError("Missing required subscription period data")
        
        # Create new subscription record
        user_subscription = UserSubscription(
            user_id=user_id,
            subscription_id=subscription.id,
            plan_id=plan_id,
            status=subscription.status,
            current_period_start=datetime.fromtimestamp(current_period_start),
            current_period_end=datetime.fromtimestamp(current_period_end),
            cancel_at_period_end=subscription.get('cancel_at_period_end', False),
            canceled_at=datetime.fromtimestamp(canceled_at) if canceled_at else None
        )
        db.add(user_subscription)
        print(f"✅ Created user subscription: {user_subscription.id}")
    except Exception as e:
        print(f"❌ Error creating user subscription: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
    
    try:
        # Create corresponding UserPlan for subscription-based plans
        # This ensures the UI can find the user's active plan
        user_plan = UserPlan(
            user_id=user_id,
            plan_id=plan_id,
            start_date=datetime.fromtimestamp(current_period_start),
            end_date=datetime.fromtimestamp(current_period_end),
            is_active=True,
            stripe_session_id=None  # Subscriptions don't have session IDs
        )
        db.add(user_plan)
        
        db.commit()
        print(f"✅ Created user plan: {user_plan.id}")
    except Exception as e:
        print(f"❌ Error creating user plan: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

def handle_subscription_updated(subscription, db: Session):
    """Handle customer.subscription.updated event"""
    user_subscription = db.query(UserSubscription).filter(
        UserSubscription.subscription_id == subscription.id
    ).first()
    
    if user_subscription:
        # Get subscription period data safely (same logic as handle_subscription_created)
        items = subscription.get('items', {})
        items_data = items.get('data', [])
        
        if items_data:
            subscription_item = items_data[0]
            current_period_start = subscription_item.get('current_period_start')
            current_period_end = subscription_item.get('current_period_end')
        else:
            current_period_start = subscription.get('current_period_start')
            current_period_end = subscription.get('current_period_end')
        
        user_subscription.status = subscription.status
        user_subscription.current_period_start = datetime.fromtimestamp(current_period_start)
        user_subscription.current_period_end = datetime.fromtimestamp(current_period_end)
        user_subscription.cancel_at_period_end = subscription.get('cancel_at_period_end', False)
        user_subscription.canceled_at = datetime.fromtimestamp(subscription.get('canceled_at')) if subscription.get('canceled_at') else None
        user_subscription.updated_at = datetime.utcnow()
        
        # Update corresponding UserPlan
        user_plan = db.query(UserPlan).filter(
            UserPlan.user_id == user_subscription.user_id,
            UserPlan.plan_id == user_subscription.plan_id,
            UserPlan.is_active == True
        ).first()
        
        if user_plan:
            user_plan.end_date = datetime.fromtimestamp(current_period_end)
            # If subscription is canceled, deactivate the user plan
            if subscription.status in ["canceled", "unpaid", "past_due"]:
                user_plan.is_active = False
        
        db.commit()

def handle_subscription_deleted(subscription, db: Session):
    """Handle customer.subscription.deleted event"""
    user_subscription = db.query(UserSubscription).filter(
        UserSubscription.subscription_id == subscription.id
    ).first()
    
    if user_subscription:
        user_subscription.status = "canceled"
        user_subscription.canceled_at = datetime.utcnow()
        user_subscription.updated_at = datetime.utcnow()
        
        # Deactivate corresponding UserPlan
        user_plan = db.query(UserPlan).filter(
            UserPlan.user_id == user_subscription.user_id,
            UserPlan.plan_id == user_subscription.plan_id,
            UserPlan.is_active == True
        ).first()
        
        if user_plan:
            user_plan.is_active = False
        
        db.commit()

def handle_invoice_paid(invoice, db: Session):
    """Handle invoice.paid event"""
    print(f"💰 Processing invoice.paid: {invoice.id}")
    try:
        # Debug: Print invoice structure
        print(f"📋 Invoice keys: {list(invoice.keys()) if hasattr(invoice, 'keys') else 'No keys method'}")
        
        # Update payment records for successful invoices
        # Use get() method to safely access subscription field
        subscription_id = invoice.get('subscription')
        
        if subscription_id:
            print(f"🔗 Invoice has subscription: {subscription_id}")
            # Find the subscription and update its status
            user_subscription = db.query(UserSubscription).filter(
                UserSubscription.subscription_id == subscription_id
            ).first()
            
            if user_subscription:
                user_subscription.status = "active"
                user_subscription.updated_at = datetime.utcnow()
                
                # Also update the corresponding UserPlan
                user_plan = db.query(UserPlan).filter(
                    UserPlan.user_id == user_subscription.user_id,
                    UserPlan.plan_id == user_subscription.plan_id,
                    UserPlan.is_active == True
                ).first()
                
                if user_plan:
                    # Update the end date based on the invoice period
                    period_end = invoice.get('period_end')
                    if period_end:
                        user_plan.end_date = datetime.fromtimestamp(period_end)
                
                db.commit()
                print(f"✅ Updated subscription and user plan for invoice: {invoice.id}")
            else:
                print(f"⚠️ No user subscription found for invoice subscription: {subscription_id}")
        else:
            print(f"ℹ️ Invoice {invoice.id} has no subscription (one-time payment)")
            
    except Exception as e:
        print(f"❌ Error processing invoice.paid: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/user/subscription", response_model=Optional[UserSubscriptionOut])
def get_user_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's active subscription"""
    subscription = db.query(UserSubscription).filter(
        UserSubscription.user_id == current_user.id,
        UserSubscription.status.in_(["active", "trialing"])
    ).first()
    
    return subscription

@router.post("/stripe/update-subscription")
def update_subscription(
    data: UpdateSubscriptionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user's subscription plan"""
    # Verify the subscription belongs to the user
    user_subscription = db.query(UserSubscription).filter(
        UserSubscription.subscription_id == data.subscription_id,
        UserSubscription.user_id == current_user.id
    ).first()
    
    if not user_subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    try:
        # Get current subscription from Stripe
        subscription = stripe.Subscription.retrieve(data.subscription_id)
        
        # Get the subscription item ID
        subscription_item_id = subscription['items']['data'][0]['id']
        
        # Update subscription with new price
        updated_subscription = stripe.Subscription.modify(
            data.subscription_id,
            items=[{
                'id': subscription_item_id,
                'price': data.new_price_id,
            }],
            proration_behavior=data.proration_behavior
        )
        
        # Update database
        user_subscription.status = updated_subscription.status
        user_subscription.current_period_start = datetime.fromtimestamp(updated_subscription.current_period_start)
        user_subscription.current_period_end = datetime.fromtimestamp(updated_subscription.current_period_end)
        user_subscription.updated_at = datetime.utcnow()
        db.commit()
        
        return SubscriptionOut(
            id=updated_subscription.id,
            status=updated_subscription.status,
            current_period_start=datetime.fromtimestamp(updated_subscription.current_period_start),
            current_period_end=datetime.fromtimestamp(updated_subscription.current_period_end),
            cancel_at_period_end=updated_subscription.cancel_at_period_end,
            canceled_at=datetime.fromtimestamp(updated_subscription.canceled_at) if updated_subscription.canceled_at else None
        )
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

@router.post("/stripe/cancel-subscription")
def cancel_subscription(
    data: CancelSubscriptionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel user's subscription"""
    # Verify the subscription belongs to the user
    user_subscription = db.query(UserSubscription).filter(
        UserSubscription.subscription_id == data.subscription_id,
        UserSubscription.user_id == current_user.id
    ).first()
    
    if not user_subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    try:
        if data.cancel_at_period_end:
            # Cancel at period end (recommended)
            subscription = stripe.Subscription.modify(
                data.subscription_id,
                cancel_at_period_end=True
            )
        else:
            # Cancel immediately
            subscription = stripe.Subscription.delete(data.subscription_id)
        
        # Update database
        user_subscription.status = subscription.status
        user_subscription.cancel_at_period_end = subscription.cancel_at_period_end
        user_subscription.canceled_at = datetime.fromtimestamp(subscription.canceled_at) if subscription.canceled_at else datetime.utcnow()
        user_subscription.updated_at = datetime.utcnow()
        db.commit()
        
        return {"message": "Subscription canceled successfully"}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

@router.get("/stripe/subscription/{subscription_id}", response_model=SubscriptionOut)
def get_subscription(
    subscription_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get subscription details from Stripe"""
    # Verify the subscription belongs to the user
    user_subscription = db.query(UserSubscription).filter(
        UserSubscription.subscription_id == subscription_id,
        UserSubscription.user_id == current_user.id
    ).first()
    
    if not user_subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        return SubscriptionOut(
            id=subscription.id,
            status=subscription.status,
            current_period_start=datetime.fromtimestamp(subscription.current_period_start),
            current_period_end=datetime.fromtimestamp(subscription.current_period_end),
            cancel_at_period_end=subscription.cancel_at_period_end,
            canceled_at=datetime.fromtimestamp(subscription.canceled_at) if subscription.canceled_at else None
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

# -------------------
# WEBHOOK HANDLER FUNCTIONS (Internal functions)
# -------------------
# These functions are called by the webhook endpoint above
# They handle the actual processing of Stripe events
