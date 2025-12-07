# Stripe Subscription Implementation Guide

This guide outlines the backend implementation required to support Stripe subscriptions with mid-cycle upgrade/downgrade functionality.

## 🎯 Overview

The frontend has been updated to support subscription-based billing. The backend needs to implement the following changes:

1. **Checkout Session**: Change from `mode="payment"` to `mode="subscription"`
2. **Database Schema**: Add subscription tracking
3. **Webhook Handling**: Process subscription events
4. **Subscription Management**: Handle upgrades/downgrades with proration

## 📋 Backend Implementation Checklist

### 1. Update Checkout Session Creation

**Endpoint**: `POST /pricing/stripe/create-checkout-session`

**Request Body** (Updated):
```json
{
  "plan_id": "123e4567-e89b-12d3-a456-426614174001",
  "price_id": "price_pro_monthly", // Stripe price ID
  "interval": "month" // or "year"
}
```

**Backend Implementation**:
```python
# Example Python/Flask implementation
import stripe

def create_checkout_session(data):
    try:
        checkout_session = stripe.checkout.Session.create(
            mode='subscription',  # Changed from 'payment'
            line_items=[{
                'price': data['price_id'],  # Use Stripe price ID
                'quantity': 1,
            }],
            success_url=f"{FRONTEND_URL}/pricing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/pricing/cancel",
            customer_email=current_user.email,
            metadata={
                'user_id': current_user.id,
                'plan_id': data['plan_id']
            }
        )
        
        # Store session.subscription_id in database
        store_subscription_session(checkout_session.id, checkout_session.subscription)
        
        return {
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id
        }
    except stripe.error.StripeError as e:
        raise Exception(f"Stripe error: {str(e)}")
```

### 2. Database Schema Updates

**Create UserSubscription Table**:
```sql
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    subscription_id VARCHAR(255) NOT NULL UNIQUE, -- Stripe subscription ID
    plan_id UUID NOT NULL REFERENCES plans(id),
    status VARCHAR(50) NOT NULL, -- active, canceled, past_due, etc.
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_subscription_id ON user_subscriptions(subscription_id);
```

**Update Plans Table**:
```sql
ALTER TABLE plans ADD COLUMN stripe_price_id_monthly VARCHAR(255);
ALTER TABLE plans ADD COLUMN stripe_price_id_yearly VARCHAR(255);
ALTER TABLE plans ADD COLUMN price_yearly DECIMAL(10,2);
```

### 3. Webhook Implementation

**Endpoint**: `POST /stripe/webhook`

**Required Event Handlers**:

```python
import stripe
from flask import request, jsonify

def handle_stripe_webhook():
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError:
        return jsonify({'error': 'Invalid signature'}), 400

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        handle_checkout_completed(event['data']['object'])
    elif event['type'] == 'customer.subscription.updated':
        handle_subscription_updated(event['data']['object'])
    elif event['type'] == 'invoice.paid':
        handle_invoice_paid(event['data']['object'])
    elif event['type'] == 'customer.subscription.deleted':
        handle_subscription_deleted(event['data']['object'])
    
    return jsonify({'status': 'success'})

def handle_checkout_completed(session):
    """Store subscription ID when checkout is completed"""
    subscription_id = session.get('subscription')
    if subscription_id:
        # Update user_subscriptions table with subscription_id
        update_user_subscription_from_session(session['id'], subscription_id)

def handle_subscription_updated(subscription):
    """Update subscription when plan changes"""
    # Update database with new subscription details
    update_user_subscription(subscription)

def handle_invoice_paid(invoice):
    """Update payment status when invoice is paid"""
    # Update payment history
    record_payment_success(invoice)

def handle_subscription_deleted(subscription):
    """Mark subscription as canceled"""
    # Update subscription status to canceled
    cancel_user_subscription(subscription['id'])
```

### 4. Subscription Management Endpoints

**Update Subscription**:
```python
# POST /pricing/stripe/update-subscription
def update_subscription(data):
    try:
        subscription = stripe.Subscription.modify(
            data['subscription_id'],
            items=[{
                'id': get_subscription_item_id(data['subscription_id']),
                'price': data['new_price_id'],
            }],
            proration_behavior=data.get('proration_behavior', 'create_prorations')
        )
        
        # Update database
        update_user_subscription(subscription)
        
        return {
            'id': subscription.id,
            'status': subscription.status,
            'current_period_start': subscription.current_period_start,
            'current_period_end': subscription.current_period_end
        }
    except stripe.error.StripeError as e:
        raise Exception(f"Stripe error: {str(e)}")
```

**Cancel Subscription**:
```python
# POST /pricing/stripe/cancel-subscription
def cancel_subscription(data):
    try:
        if data.get('cancel_at_period_end', True):
            # Cancel at period end (recommended)
            subscription = stripe.Subscription.modify(
                data['subscription_id'],
                cancel_at_period_end=True
            )
        else:
            # Cancel immediately
            subscription = stripe.Subscription.delete(data['subscription_id'])
        
        # Update database
        update_user_subscription(subscription)
        
        return {'message': 'Subscription canceled successfully'}
    except stripe.error.StripeError as e:
        raise Exception(f"Stripe error: {str(e)}")
```

**Get Subscription**:
```python
# GET /pricing/stripe/subscription/{subscription_id}
def get_subscription(subscription_id):
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        return {
            'id': subscription.id,
            'status': subscription.status,
            'current_period_start': subscription.current_period_start,
            'current_period_end': subscription.current_period_end,
            'cancel_at_period_end': subscription.cancel_at_period_end
        }
    except stripe.error.StripeError as e:
        raise Exception(f"Stripe error: {str(e)}")
```

### 5. Stripe Dashboard Configuration

**Required Setup**:
1. **Create Products and Prices**:
   - Free Plan: `price_free_monthly`, `price_free_yearly`
   - Pro Plan: `price_pro_monthly`, `price_pro_yearly`
   - Business Plan: `price_business_monthly`, `price_business_yearly`

2. **Configure Webhooks**:
   - Add webhook endpoint: `https://yourdomain.com/stripe/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `invoice.paid`, `customer.subscription.deleted`

3. **Environment Variables**:
   ```
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_SUCCESS_URL=http://localhost:5173/pricing/success
   STRIPE_CANCEL_URL=http://localhost:5173/pricing/cancel
   ```

### 6. Frontend Integration Points

**Updated API Calls**:
- `createCheckoutSession()` now sends `price_id` and `interval`
- New methods: `updateSubscription()`, `cancelSubscription()`, `getSubscription()`
- Updated types include subscription status and billing periods

**State Management**:
- Added `userSubscription` to Redux state
- New actions: `updateSubscription`, `cancelSubscription`, `fetchUserSubscription`

### 7. Testing Checklist

**Test Scenarios**:
- [ ] Create new subscription
- [ ] Upgrade plan mid-cycle (with proration)
- [ ] Downgrade plan mid-cycle (with credit)
- [ ] Cancel subscription (at period end)
- [ ] Cancel subscription (immediately)
- [ ] Handle failed payments
- [ ] Webhook event processing
- [ ] Database synchronization

**Test Data**:
```json
{
  "plans": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "stripe_price_id_monthly": "price_pro_monthly",
      "stripe_price_id_yearly": "price_pro_yearly",
      "price_yearly": 90.0
    }
  ]
}
```

## 🚀 Migration Strategy

1. **Phase 1**: Update checkout session to subscription mode
2. **Phase 2**: Implement webhook handlers
3. **Phase 3**: Add subscription management endpoints
4. **Phase 4**: Update database schema
5. **Phase 5**: Test and deploy

## 📞 Support

For questions about this implementation:
- Check Stripe documentation: https://stripe.com/docs/billing/subscriptions
- Review webhook events: https://stripe.com/docs/api/events/types
- Test with Stripe CLI: https://stripe.com/docs/stripe-cli
