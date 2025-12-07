# Backend Implementation Prompt: Stripe Subscription System

## 🎯 **Objective**
Implement Stripe subscription-based billing system with mid-cycle upgrade/downgrade support to replace the current one-time payment system.

## 📋 **Requirements Overview**

### **Current State**
- Frontend sends: `{ plan_id: string, duration_months: number }`
- Backend creates one-time payment checkout sessions
- No subscription management or proration handling

### **Target State**
- Frontend sends: `{ plan_id: string, price_id: string, interval: 'month' | 'year' }`
- Backend creates subscription checkout sessions
- Full subscription lifecycle management with proration

## 🔧 **Implementation Tasks**

### **1. Update Checkout Session Creation**

**Endpoint**: `POST /pricing/stripe/create-checkout-session`

**Current Request Body**:
```json
{
  "plan_id": "123e4567-e89b-12d3-a456-426614174001",
  "duration_months": 1
}
```

**New Request Body**:
```json
{
  "plan_id": "123e4567-e89b-12d3-a456-426614174001",
  "price_id": "price_pro_monthly",
  "interval": "month"
}
```

**Implementation Changes**:
```python
# BEFORE (one-time payment)
checkout_session = stripe.checkout.Session.create(
    mode='payment',
    line_items=[{
        'price_data': {
            'currency': 'usd',
            'product_data': {'name': plan.name},
            'unit_amount': int(plan.price_monthly * 100),
            'recurring': {'interval': 'month'}
        },
        'quantity': 1,
    }],
    # ... other params
)

# AFTER (subscription)
checkout_session = stripe.checkout.Session.create(
    mode='subscription',  # Changed from 'payment'
    line_items=[{
        'price': data['price_id'],  # Use Stripe price ID directly
        'quantity': 1,
    }],
    # ... other params
)

# Store subscription ID for later use
store_subscription_session(checkout_session.id, checkout_session.subscription)
```

### **2. Database Schema Updates**

**Create New Table**:
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

**Sample Data for Plans**:
```sql
UPDATE plans SET 
    stripe_price_id_monthly = 'price_pro_monthly',
    stripe_price_id_yearly = 'price_pro_yearly',
    price_yearly = 90.0
WHERE id = '123e4567-e89b-12d3-a456-426614174001';

UPDATE plans SET 
    stripe_price_id_monthly = 'price_business_monthly',
    stripe_price_id_yearly = 'price_business_yearly',
    price_yearly = 290.0
WHERE id = '123e4567-e89b-12d3-a456-426614174002';
```

### **3. Webhook Implementation**

**Endpoint**: `POST /stripe/webhook`

**Required Event Handlers**:
```python
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

    # Handle subscription events
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
        # Get user from session metadata
        user_id = session['metadata']['user_id']
        plan_id = session['metadata']['plan_id']
        
        # Create or update user subscription record
        create_user_subscription(user_id, subscription_id, plan_id, session)

def handle_subscription_updated(subscription):
    """Update subscription when plan changes"""
    update_user_subscription(subscription)

def handle_invoice_paid(invoice):
    """Update payment status when invoice is paid"""
    record_payment_success(invoice)

def handle_subscription_deleted(subscription):
    """Mark subscription as canceled"""
    cancel_user_subscription(subscription['id'])
```

### **4. New Subscription Management Endpoints**

**Update Subscription**:
```python
# POST /pricing/stripe/update-subscription
def update_subscription(data):
    """
    Request: {
        "subscription_id": "sub_1234567890",
        "new_price_id": "price_business_monthly",
        "proration_behavior": "create_prorations"
    }
    """
    try:
        # Get current subscription
        subscription = stripe.Subscription.retrieve(data['subscription_id'])
        
        # Get the subscription item ID
        subscription_item_id = subscription['items']['data'][0]['id']
        
        # Update subscription with new price
        updated_subscription = stripe.Subscription.modify(
            data['subscription_id'],
            items=[{
                'id': subscription_item_id,
                'price': data['new_price_id'],
            }],
            proration_behavior=data.get('proration_behavior', 'create_prorations')
        )
        
        # Update database
        update_user_subscription(updated_subscription)
        
        return {
            'id': updated_subscription.id,
            'status': updated_subscription.status,
            'current_period_start': updated_subscription.current_period_start,
            'current_period_end': updated_subscription.current_period_end,
            'cancel_at_period_end': updated_subscription.cancel_at_period_end
        }
    except stripe.error.StripeError as e:
        raise Exception(f"Stripe error: {str(e)}")
```

**Cancel Subscription**:
```python
# POST /pricing/stripe/cancel-subscription
def cancel_subscription(data):
    """
    Request: {
        "subscription_id": "sub_1234567890",
        "cancel_at_period_end": true
    }
    """
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
            'cancel_at_period_end': subscription.cancel_at_period_end,
            'canceled_at': subscription.canceled_at
        }
    except stripe.error.StripeError as e:
        raise Exception(f"Stripe error: {str(e)}")
```

### **5. Stripe Dashboard Configuration**

**Required Setup**:
1. **Create Products and Prices in Stripe Dashboard**:
   - Free Plan: `price_free_monthly`, `price_free_yearly`
   - Pro Plan: `price_pro_monthly`, `price_pro_yearly` 
   - Business Plan: `price_business_monthly`, `price_business_yearly`

2. **Configure Webhooks**:
   - Add webhook endpoint: `https://yourdomain.com/stripe/webhook`
   - Select events: 
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `invoice.paid`
     - `customer.subscription.deleted`

3. **Environment Variables**:
   ```bash
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_SUCCESS_URL=http://localhost:5173/pricing/success
   STRIPE_CANCEL_URL=http://localhost:5173/pricing/cancel
   ```

### **6. Database Helper Functions**

```python
def create_user_subscription(user_id, subscription_id, plan_id, session_data):
    """Create new user subscription record"""
    subscription = UserSubscription(
        user_id=user_id,
        subscription_id=subscription_id,
        plan_id=plan_id,
        status='incomplete',  # Will be updated via webhook
        current_period_start=session_data.get('current_period_start'),
        current_period_end=session_data.get('current_period_end')
    )
    db.session.add(subscription)
    db.session.commit()

def update_user_subscription(stripe_subscription):
    """Update user subscription from Stripe data"""
    subscription = UserSubscription.query.filter_by(
        subscription_id=stripe_subscription.id
    ).first()
    
    if subscription:
        subscription.status = stripe_subscription.status
        subscription.current_period_start = datetime.fromtimestamp(
            stripe_subscription.current_period_start
        )
        subscription.current_period_end = datetime.fromtimestamp(
            stripe_subscription.current_period_end
        )
        subscription.cancel_at_period_end = stripe_subscription.cancel_at_period_end
        subscription.canceled_at = datetime.fromtimestamp(
            stripe_subscription.canceled_at
        ) if stripe_subscription.canceled_at else None
        subscription.updated_at = datetime.utcnow()
        
        db.session.commit()

def cancel_user_subscription(subscription_id):
    """Mark subscription as canceled"""
    subscription = UserSubscription.query.filter_by(
        subscription_id=subscription_id
    ).first()
    
    if subscription:
        subscription.status = 'canceled'
        subscription.canceled_at = datetime.utcnow()
        subscription.updated_at = datetime.utcnow()
        db.session.commit()
```

### **7. Testing Checklist**

**Test Scenarios**:
- [ ] Create new subscription (monthly/yearly)
- [ ] Upgrade plan mid-cycle (verify proration)
- [ ] Downgrade plan mid-cycle (verify credit)
- [ ] Cancel subscription at period end
- [ ] Cancel subscription immediately
- [ ] Handle failed payments
- [ ] Webhook event processing
- [ ] Database synchronization

**Test Data**:
```json
{
  "plans": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "name": "Pro",
      "stripe_price_id_monthly": "price_pro_monthly",
      "stripe_price_id_yearly": "price_pro_yearly",
      "price_monthly": 9.0,
      "price_yearly": 90.0
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174002", 
      "name": "Business",
      "stripe_price_id_monthly": "price_business_monthly",
      "stripe_price_id_yearly": "price_business_yearly",
      "price_monthly": 29.0,
      "price_yearly": 290.0
    }
  ]
}
```

## 🚀 **Implementation Priority**

1. **Phase 1**: Update checkout session creation (mode='subscription')
2. **Phase 2**: Implement webhook handlers for subscription events
3. **Phase 3**: Add subscription management endpoints (update/cancel/get)
4. **Phase 4**: Update database schema and helper functions
5. **Phase 5**: Test complete flow and deploy

## 📞 **Support Resources**

- **Stripe Subscriptions Docs**: https://stripe.com/docs/billing/subscriptions
- **Webhook Events**: https://stripe.com/docs/api/events/types
- **Stripe CLI for Testing**: https://stripe.com/docs/stripe-cli
- **Proration Guide**: https://stripe.com/docs/billing/subscriptions/prorations

## ⚠️ **Important Notes**

1. **Backward Compatibility**: Ensure existing one-time payments continue to work during transition
2. **Error Handling**: Implement proper error handling for all Stripe API calls
3. **Security**: Always verify webhook signatures
4. **Testing**: Use Stripe test mode for all development
5. **Monitoring**: Set up logging for all subscription events

---

**Frontend is ready and waiting for these backend changes!** 🎯
