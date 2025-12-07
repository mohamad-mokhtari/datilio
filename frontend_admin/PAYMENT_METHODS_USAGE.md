# Payment Methods Usage Guide

The PricingService now supports both subscription and one-time payment methods. You can switch between them using environment variables.

## Environment Configuration

Add to your `.env` file:

```env
# Payment Method Configuration
# Set to 'onetime' for one-time payments or 'subscription' for recurring subscriptions
# Default: 'subscription'
VITE_PAYMENT_MODE=subscription
```

## Usage Examples

### Subscription Payments (Default)

```typescript
import PricingService from '@/services/PricingService';

// For main plans (recurring subscription)
const subscriptionSession = await PricingService.createSubscriptionSession({
    plan_id: 'plan_id_here',
    price_id: 'price_monthly_or_yearly_id',
    interval: 'month' // or 'year'
});

// For add-ons (recurring subscription)
const addonSession = await PricingService.createAddonCheckoutSession({
    addon_type: 'storage',
    quantity: 5
});
```

### One-Time Payments

```typescript
import PricingService from '@/services/PricingService';

// For main plans (one-time payment)
const oneTimeSession = await PricingService.createOneTimeCheckoutSession({
    plan_id: 'plan_id_here',
    duration_months: 6 // 1-12 months
});

// For add-ons (one-time payment)
const oneTimeAddonSession = await PricingService.createOneTimeAddonCheckoutSession({
    addon_type: 'storage',
    quantity: 10
});
```

## Backend Endpoints

The service automatically routes to the correct endpoints based on `VITE_PAYMENT_MODE`:

- **Subscription Mode**: 
  - Main plans: `POST /pricing/stripe/create-subscription-session`
  - Add-ons: `POST /pricing/stripe/create-addon-session`

- **One-Time Mode**:
  - Main plans: `POST /pricing/stripe/create-checkout-session`
  - Add-ons: `POST /pricing/stripe/create-addon-session`

## Switching Payment Methods

To switch from subscription to one-time payments:

1. Set `VITE_PAYMENT_MODE=onetime` in your `.env` file
2. Restart your development server
3. The existing `createSubscriptionSession()` and `createAddonCheckoutSession()` methods will now use one-time payment endpoints

To switch back to subscriptions:

1. Set `VITE_PAYMENT_MODE=subscription` in your `.env` file
2. Restart your development server
3. All methods will use subscription endpoints again
