import ApiService2 from './ApiService2';
import type {
    Plan,
    AddonPlan,
    UserPlan,
    UsageSummary,
    UsageHistory,
    UsageBreakdown,
    CheckoutSession,
    PaymentHistory,
    CreateCheckoutSessionRequest,
    CreateAddonCheckoutSessionRequest,
    CreateOneTimeCheckoutSessionRequest,
    CreateOneTimeAddonCheckoutSessionRequest,
    UserSubscription,
    SubscriptionUpdateRequest,
    SubscriptionCancelRequest
} from '@/@types/pricing';

/**
 * PricingService - Handles both subscription and one-time payment methods
 * 
 * Payment Method Configuration:
 * - Set VITE_PAYMENT_MODE environment variable to switch between payment methods:
 *   - 'subscription' (default): Uses recurring subscription payments
 *   - 'onetime': Uses one-time payments for plans and add-ons
 * 
 * Available Methods:
 * - Subscription: createSubscriptionSession(), createAddonCheckoutSession()
 * - One-time: createOneTimeCheckoutSession(), createOneTimeAddonCheckoutSession()
 * 
 * The service automatically routes to the correct backend endpoints based on VITE_PAYMENT_MODE
 */

// Mock data for development/testing
const mockPlans: Plan[] = [
    {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Free",
        description: "Perfect for getting started",
        price_monthly: 0.0,
        price_yearly: 0.0,
        stripe_price_id_monthly: "price_free_monthly",
        stripe_price_id_yearly: "price_free_yearly",
        file_limit: 1,
        file_size_limit_mb: 5,
        storage_limit_gb: 0.005,
        rules_limit: 1,
        custom_lists_limit: 1,
        ai_prompts_per_month: 100,
        ai_tokens_per_month: 50000,
        synthetic_rows_per_month: 500,
        priority_processing: false,
        team_sharing: false,
        is_addon: false,
        is_active: true
    },
    {
        id: "123e4567-e89b-12d3-a456-426614174001",
        name: "Pro",
        description: "Advanced features for power users",
        price_monthly: 9.0,
        price_yearly: 90.0, // 2 months free
        stripe_price_id_monthly: "price_pro_monthly",
        stripe_price_id_yearly: "price_pro_yearly",
        file_limit: 10,
        file_size_limit_mb: 50,
        storage_limit_gb: 5.0,
        rules_limit: 20,
        custom_lists_limit: -1,
        ai_prompts_per_month: 5000,
        ai_tokens_per_month: 500000,
        synthetic_rows_per_month: 20000,
        priority_processing: false,
        team_sharing: false,
        is_addon: false,
        is_active: true
    },
    {
        id: "123e4567-e89b-12d3-a456-426614174002",
        name: "Business",
        description: "Enterprise-grade features for teams",
        price_monthly: 29.0,
        price_yearly: 290.0, // 2 months free
        stripe_price_id_monthly: "price_business_monthly",
        stripe_price_id_yearly: "price_business_yearly",
        file_limit: 50,
        file_size_limit_mb: 200,
        storage_limit_gb: 20.0,
        rules_limit: 100,
        custom_lists_limit: -1,
        ai_prompts_per_month: 25000,
        ai_tokens_per_month: 2000000,
        synthetic_rows_per_month: 100000,
        priority_processing: true,
        team_sharing: true,
        is_addon: false,
        is_active: true
    }
];

const mockAddonPlans: AddonPlan[] = [
    {
        id: "123e4567-e89b-12d3-a456-426614174003",
        name: "Extra Storage",
        description: "Additional storage space for your data",
        price_monthly: 2.0,
        features: { addon_type: "storage", unit: "GB" },
        is_active: true
    },
    {
        id: "123e4567-e89b-12d3-a456-426614174004",
        name: "Extra AI Tokens",
        description: "Additional AI token allocation",
        price_monthly: 3.0,
        features: { addon_type: "tokens", unit: "100k tokens" },
        is_active: true
    },
    {
        id: "123e4567-e89b-12d3-a456-426614174005",
        name: "Extra Synthetic Data",
        description: "Additional synthetic data generation capacity",
        price_monthly: 2.0,
        features: { addon_type: "synthetic", unit: "10k rows" },
        is_active: true
    }
];

const mockUserPlan: UserPlan = {
    id: "123e4567-e89b-12d3-a456-426614174006",
    user_id: "123e4567-e89b-12d3-a456-426614174007",
    plan_id: "123e4567-e89b-12d3-a456-426614174001",
    start_date: "2024-01-15T10:30:00Z",
    end_date: "2024-02-15T10:30:00Z",
    is_active: true,
    stripe_session_id: "cs_test_1234567890",
    plan: {
        name: "Pro",
        price_monthly: 9.0,
        price_yearly: 90.0,
        file_limit: 10,
        stripe_price_id_monthly: "price_pro_monthly",
        stripe_price_id_yearly: "price_pro_yearly"
    },
    name: "Pro",
    description: "Advanced features for power users",
    file_size_limit_mb: 50,
    storage_limit_gb: 5.0,
    rules_limit: 20,
    custom_lists_limit: -1,
    ai_prompts_per_month: 5000,
    ai_tokens_per_month: 500000,
    synthetic_rows_per_month: 20000,
    priority_processing: false,
    team_sharing: false,
    current_usage: {
        file_storage_mb: 2500.0,
        openai_tokens: 150000.0,
        synthetic_rows: 5000.0,
        rules_used: 5.0,
        custom_lists: 2.0
    },
    usage_percentages: {
        file_storage_mb: 50.0,
        openai_tokens: 30.0,
        synthetic_rows: 25.0,
        rules_used: 25.0,
        custom_lists: 200.0
    }
};

const mockUsageSummary: UsageSummary = {
    user_id: "123e4567-e89b-12d3-a456-426614174007",
    current_month: {
        file_storage_mb: 2500.0,
        openai_tokens: 150000.0,
        synthetic_rows: 5000.0,
        rules_used: 5.0,
        custom_lists: 2.0
    },
    limits: {
        file_storage_mb: 5000.0,
        openai_tokens: 500000.0,
        synthetic_rows: 20000.0,
        rules_used: 20.0,
        custom_lists: -1.0
    },
    percentages: {
        file_storage_mb: 50.0,
        openai_tokens: 30.0,
        synthetic_rows: 25.0,
        rules_used: 25.0,
        custom_lists: 200.0
    }
};

const mockUsageHistory: UsageHistory[] = [
    {
        id: "123e4567-e89b-12d3-a456-426614174008",
        user_id: "123e4567-e89b-12d3-a456-426614174007",
        feature: "file_storage_mb",
        amount: 2.5,
        date: "2024-01-15",
        timestamp: "2024-01-15T14:30:00Z",
        description: "Uploaded data.csv"
    },
    {
        id: "123e4567-e89b-12d3-a456-426614174009",
        user_id: "123e4567-e89b-12d3-a456-426614174007",
        feature: "openai_tokens",
        amount: 1500.0,
        date: "2024-01-15",
        timestamp: "2024-01-15T15:45:00Z",
        description: "AI chat request"
    },
    {
        id: "123e4567-e89b-12d3-a456-426614174010",
        user_id: "123e4567-e89b-12d3-a456-426614174007",
        feature: "synthetic_rows",
        amount: 100.0,
        date: "2024-01-15",
        timestamp: "2024-01-15T16:20:00Z",
        description: "Generated synthetic data"
    }
];

const mockPaymentHistory: PaymentHistory[] = [
    {
        id: "123e4567-e89b-12d3-a456-426614174011",
        user_id: "123e4567-e89b-12d3-a456-426614174007",
        plan_id: "123e4567-e89b-12d3-a456-426614174001",
        session_id: "cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6",
        subscription_id: "sub_1234567890",
        customer_id: "cus_1234567890",
        amount_paid: 9.0,
        currency: "usd",
        status: "completed",
        is_addon: false,
        payment_metadata: {},
        created_at: "2024-01-15T10:30:00Z",
        completed_at: "2024-01-15T10:35:00Z",
        cancelled_at: null
    }
];

class PricingService {
    // Pricing & Plans Endpoints
    async getAllPlans(): Promise<Plan[]> {
        try {
            console.log('Fetching all plans from API...');
            const response = await ApiService2.get<Plan[]>('/pricing/plans');
            console.log('API response for all plans:', response.data);
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock data:', error);
            console.log('Returning mock plans:', mockPlans);
            return mockPlans;
        }
    }

    async getMainPlans(): Promise<Plan[]> {
        try {
            console.log('Fetching main plans from API...');
            const response = await ApiService2.get<Plan[]>('/pricing/plans/main');
            console.log('API response for main plans:', response.data);
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock data:', error);
            console.log('Returning mock plans:', mockPlans);
            return mockPlans;
        }
    }

    async getAddonPlans(): Promise<AddonPlan[]> {
        try {
            console.log('Fetching addon plans from API...');
            const response = await ApiService2.get<AddonPlan[]>('/pricing/plans/addons');
            console.log('API response for addon plans:', response.data);
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock data:', error);
            console.log('Returning mock addon plans:', mockAddonPlans);
            return mockAddonPlans;
        }
    }

    // User Plan Management
    async getCurrentUserPlan(): Promise<UserPlan> {
        const token = this.getAuthToken();
        if (!token) {
            console.warn('No authentication token found, using mock data');
            return mockUserPlan;
        }

        try {
            const response = await ApiService2.get<UserPlan>('/pricing/user/plan', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock data:', error);
            return mockUserPlan;
        }
    }

    async getUserPlanWithUsage(): Promise<UserPlan> {
        const token = this.getAuthToken();
        if (!token) {
            console.warn('No authentication token found, using mock data');
            return mockUserPlan;
        }

        try {
            const response = await ApiService2.get<UserPlan>('/pricing/user/plan/with-usage', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock data:', error);
            return mockUserPlan;
        }
    }

    async cancelUserPlan(): Promise<{ message: string }> {
        const token = this.getAuthToken();
        if (!token) {
            console.warn('No authentication token found, returning mock response');
            return { message: 'Plan cancelled successfully (mock response)' };
        }

        try {
            const response = await ApiService2.post<{ message: string }>('/pricing/user/plan/cancel', {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.warn('API call failed, returning mock response:', error);
            return { message: 'Plan cancelled successfully (mock response)' };
        }
    }

    // Usage Tracking
    async getUsageSummary(): Promise<UsageSummary> {
        const token = this.getAuthToken();
        if (!token) {
            console.warn('No authentication token found, using mock data');
            return mockUsageSummary;
        }

        try {
            const response = await ApiService2.get<UsageSummary>('/pricing/user/usage/summary', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock data:', error);
            return mockUsageSummary;
        }
    }

    async getUsageHistory(): Promise<UsageHistory[]> {
        const token = this.getAuthToken();
        if (!token) {
            console.warn('No authentication token found, using mock data');
            return mockUsageHistory;
        }

        try {
            const response = await ApiService2.get<UsageHistory[]>('/pricing/user/usage', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock data:', error);
            return mockUsageHistory;
        }
    }

    async getUsageBreakdown(): Promise<UsageBreakdown[]> {
        const token = this.getAuthToken();
        if (!token) {
            console.warn('No authentication token found, using mock data');
            return [];
        }

        try {
            const response = await ApiService2.get<UsageBreakdown[]>('/pricing/user/usage/breakdown', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock data:', error);
            return [];
        }
    }

    async getFeatureUsageHistory(feature: string, days: number = 30): Promise<UsageHistory[]> {
        const token = this.getAuthToken();
        if (!token) {
            console.warn('No authentication token found, using mock data');
            return mockUsageHistory.filter(item => item.feature === feature);
        }

        try {
            const response = await ApiService2.get<UsageHistory[]>(`/pricing/user/usage/history/${feature}?days=${days}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock data:', error);
            return mockUsageHistory.filter(item => item.feature === feature);
        }
    }

    // Subscription Management
    async createSubscriptionSession(data: CreateCheckoutSessionRequest): Promise<CheckoutSession> {
        const token = this.getAuthToken();
        const paymentMethod = this.getPaymentMethod();
        
        if (!token) {
            console.warn('No authentication token found, using mock response');
            return {
                checkout_url: 'https://checkout.stripe.com/pay/cs_test_mock#mock',
                session_id: 'cs_test_mock_session'
            };
        }

        try {
            const endpoint = this.getCheckoutEndpoint(paymentMethod);
            const response = await ApiService2.post<CheckoutSession>(endpoint, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock response:', error);
            return {
                checkout_url: 'https://checkout.stripe.com/pay/cs_test_mock#mock',
                session_id: 'cs_test_mock_session'
            };
        }
    }

    async updateSubscription(data: SubscriptionUpdateRequest): Promise<UserSubscription> {
        const token = this.getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        try {
            const response = await ApiService2.post<UserSubscription>('/pricing/stripe/update-subscription', data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to update subscription:', error);
            throw error;
        }
    }

    async cancelSubscription(data: SubscriptionCancelRequest): Promise<{ message: string }> {
        const token = this.getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        try {
            const response = await ApiService2.post<{ message: string }>('/pricing/stripe/cancel-subscription', data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to cancel subscription:', error);
            throw error;
        }
    }

    async getSubscription(subscriptionId: string): Promise<UserSubscription> {
        const token = this.getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        try {
            const response = await ApiService2.get<UserSubscription>(`/pricing/stripe/subscription/${subscriptionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get subscription:', error);
            throw error;
        }
    }

    async createAddonCheckoutSession(data: CreateAddonCheckoutSessionRequest): Promise<CheckoutSession> {
        const token = this.getAuthToken();
        const paymentMethod = this.getPaymentMethod();
        
        if (!token) {
            console.warn('No authentication token found, using mock response');
            return {
                checkout_url: 'https://checkout.stripe.com/pay/cs_test_mock_addon#mock',
                session_id: 'cs_test_mock_addon_session'
            };
        }

        try {
            const endpoint = this.getAddonEndpoint(paymentMethod);
            const response = await ApiService2.post<CheckoutSession>(endpoint, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock response:', error);
            return {
                checkout_url: 'https://checkout.stripe.com/pay/cs_test_mock_addon#mock',
                session_id: 'cs_test_mock_addon_session'
            };
        }
    }

    // One-Time Payment Methods
    async createOneTimeCheckoutSession(data: CreateOneTimeCheckoutSessionRequest): Promise<CheckoutSession> {
        const token = this.getAuthToken();
        if (!token) {
            console.warn('No authentication token found, using mock response');
            return {
                checkout_url: 'https://checkout.stripe.com/pay/cs_test_mock_onetime#mock',
                session_id: 'cs_test_mock_onetime_session'
            };
        }

        try {
            const response = await ApiService2.post<CheckoutSession>('/pricing/stripe/create-checkout-session', data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock response:', error);
            return {
                checkout_url: 'https://checkout.stripe.com/pay/cs_test_mock_onetime#mock',
                session_id: 'cs_test_mock_onetime_session'
            };
        }
    }

    async createOneTimeAddonCheckoutSession(data: CreateOneTimeAddonCheckoutSessionRequest): Promise<CheckoutSession> {
        const token = this.getAuthToken();
        if (!token) {
            console.warn('No authentication token found, using mock response');
            return {
                checkout_url: 'https://checkout.stripe.com/pay/cs_test_mock_onetime_addon#mock',
                session_id: 'cs_test_mock_onetime_addon_session'
            };
        }

        try {
            const response = await ApiService2.post<CheckoutSession>('/pricing/stripe/create-addon-session', data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock response:', error);
            return {
                checkout_url: 'https://checkout.stripe.com/pay/cs_test_mock_onetime_addon#mock',
                session_id: 'cs_test_mock_onetime_addon_session'
            };
        }
    }

    async getPaymentHistory(): Promise<PaymentHistory[]> {
        const token = this.getAuthToken();
        if (!token) {
            console.warn('No authentication token found, using mock data');
            return mockPaymentHistory;
        }

        try {
            const response = await ApiService2.get<PaymentHistory[]>('/pricing/user/payments', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.warn('API call failed, using mock data:', error);
            return mockPaymentHistory;
        }
    }

    // Helper method to get auth token from localStorage
    private getAuthToken(): string | null {
        // Try to get the access_token first (which is the actual JWT token)
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
            return accessToken;
        }
        
        // Fallback to 'token' for backward compatibility
        return localStorage.getItem('token');
    }

    // Helper method to determine payment method based on environment variable
    private getPaymentMethod(): 'subscription' | 'onetime' {
        const paymentMode = import.meta.env.VITE_PAYMENT_MODE;
        return paymentMode === 'onetime' ? 'onetime' : 'subscription';
    }

    // Helper method to get the appropriate endpoint based on payment method
    private getCheckoutEndpoint(paymentMethod: 'subscription' | 'onetime'): string {
        return paymentMethod === 'onetime' 
            ? '/pricing/stripe/create-checkout-session'
            : '/pricing/stripe/create-subscription-session';
    }

    private getAddonEndpoint(paymentMethod: 'subscription' | 'onetime'): string {
        return '/pricing/stripe/create-addon-session';
    }
}

export default new PricingService();
