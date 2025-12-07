export interface Plan {
    id: string;
    name: string;
    description: string;
    price_monthly: number;
    price_yearly: number; // Add yearly pricing
    stripe_price_id_monthly: string; // Stripe price ID for monthly billing
    stripe_price_id_yearly: string; // Stripe price ID for yearly billing
    file_limit: number;
    file_size_limit_mb: number;
    storage_limit_gb: number;
    rules_limit: number;
    custom_lists_limit: number;
    ai_prompts_per_month: number;
    ai_tokens_per_month: number;
    synthetic_rows_per_month: number;
    priority_processing: boolean;
    team_sharing: boolean;
    is_addon: boolean;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface PlanFeature {
    id: string;
    name: string;
    description: string;
    is_included: boolean;
    limit?: number;
    unit?: string;
}

export interface PlanLimits {
    storage_gb: number;
    ai_tokens_per_month: number;
    synthetic_data_rows_per_month: number;
    rules_limit: number;
    custom_lists_limit: number;
}

export interface AddonPlan {
    id: string;
    name: string;
    description: string;
    price_monthly: number;
    features: {
        addon_type: 'storage' | 'tokens' | 'synthetic';
        unit: string;
    };
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface UserPlan {
    id: string;
    user_id: string;
    plan_id: string;
    subscription_id?: string; // Stripe subscription ID
    start_date: string;
    end_date: string;
    is_active: boolean;
    stripe_session_id: string;
    subscription_status?: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing';
    cancel_at_period_end?: boolean;
    current_period_start?: string;
    current_period_end?: string;
    plan: {
        name: string;
        price_monthly: number;
        price_yearly: number;
        file_limit: number;
        stripe_price_id_monthly: string;
        stripe_price_id_yearly: string;
    };
    // Additional fields from with-usage endpoint
    name?: string;
    description?: string;
    file_size_limit_mb?: number;
    storage_limit_gb?: number;
    rules_limit?: number;
    custom_lists_limit?: number;
    ai_prompts_per_month?: number;
    ai_tokens_per_month?: number;
    synthetic_rows_per_month?: number;
    priority_processing?: boolean;
    team_sharing?: boolean;
    current_usage?: {
        file_storage_mb: number;
        openai_tokens: number;
        synthetic_rows: number;
        rules_used: number;
        custom_lists: number;
    };
    usage_percentages?: {
        file_storage_mb: number;
        openai_tokens: number;
        synthetic_rows: number;
        rules_used: number;
        custom_lists: number;
    };
}

export interface UsageSummary {
    user_id: string;
    current_month: {
        file_storage_mb: number;
        openai_tokens: number;
        synthetic_rows: number;
        rules_used: number;
        custom_lists: number;
    };
    limits: {
        file_storage_mb: number;
        openai_tokens: number;
        synthetic_rows: number;
        rules_used: number;
        custom_lists: number;
    };
    percentages: {
        file_storage_mb: number;
        openai_tokens: number;
        synthetic_rows: number;
        rules_used: number;
        custom_lists: number;
    };
}

export interface UsageHistory {
    id: string;
    user_id: string;
    feature: string;
    amount: number;
    date: string;
    timestamp: string;
    description: string;
}

export interface UsageBreakdown {
    [key: string]: {
        total: number;
        limit: number;
        percentage: number;
        recent_activity: Array<{
            date: string;
            amount: number;
            description: string;
        }>;
    };
}

export interface CheckoutSession {
    checkout_url: string;
    session_id: string;
}

export interface PaymentHistory {
    id: string;
    user_id: string;
    plan_id: string;
    session_id: string;
    subscription_id: string | null;
    customer_id: string;
    amount_paid: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    is_addon: boolean;
    payment_metadata: Record<string, any>;
    created_at: string;
    completed_at: string | null;
    cancelled_at: string | null;
}

export interface CreateCheckoutSessionRequest {
    plan_id: string;
    price_id: string; // Stripe price ID for subscription
    interval: 'month' | 'year'; // Billing interval
}

export interface CreateAddonCheckoutSessionRequest {
    addon_type: 'storage' | 'tokens' | 'synthetic';
    quantity: number;
}

// New subscription-related interfaces
export interface UserSubscription {
    id: string;
    user_id: string;
    subscription_id: string; // Stripe subscription ID
    plan_id: string;
    status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing';
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface SubscriptionUpdateRequest {
    subscription_id: string;
    new_price_id: string;
    proration_behavior?: 'create_prorations' | 'none' | 'always_invoice';
}

export interface SubscriptionCancelRequest {
    subscription_id: string;
    cancel_at_period_end?: boolean;
}

// One-time payment interfaces
export interface CreateOneTimeCheckoutSessionRequest {
    plan_id: string;
    duration_months: number; // 1-12 months
}

export interface CreateOneTimeAddonCheckoutSessionRequest {
    addon_type: 'storage' | 'tokens' | 'synthetic';
    quantity: number;
}