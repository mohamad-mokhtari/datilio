import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_PRICING_NAME } from './constants'
import PricingService from '@/services/PricingService'
import type {
    Plan,
    AddonPlan,
    UserPlan,
    UsageSummary,
    UsageHistory,
    UsageBreakdown,
    PaymentHistory,
    CheckoutSession,
    UserSubscription,
    SubscriptionUpdateRequest,
    SubscriptionCancelRequest
} from '@/@types/pricing'

export interface PricingState {
    plans: Plan[]
    addonPlans: AddonPlan[]
    userPlan: UserPlan | null
    userSubscription: UserSubscription | null
    usageSummary: UsageSummary | null
    usageHistory: UsageHistory[]
    usageBreakdown: UsageBreakdown[]
    paymentHistory: PaymentHistory[]
    loading: boolean
    error: string | null
    checkoutSession: CheckoutSession | null
}

const initialState: PricingState = {
    plans: [],
    addonPlans: [],
    userPlan: null,
    userSubscription: null,
    usageSummary: null,
    usageHistory: [],
    usageBreakdown: [],
    paymentHistory: [],
    loading: false,
    error: null,
    checkoutSession: null
}

// Async thunks
export const fetchAllPlans = createAsyncThunk(
    'pricing/fetchAllPlans',
    async (_, { rejectWithValue }) => {
        try {
            return await PricingService.getAllPlans()
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch plans')
        }
    }
)

export const fetchMainPlans = createAsyncThunk(
    'pricing/fetchMainPlans',
    async (_, { rejectWithValue }) => {
        try {
            console.log('Redux: Fetching main plans...');
            const result = await PricingService.getMainPlans()
            console.log('Redux: Main plans result:', result);
            return result;
        } catch (error: any) {
            console.error('Redux: Error fetching main plans:', error);
            return rejectWithValue(error.message || 'Failed to fetch main plans')
        }
    }
)

export const fetchAddonPlans = createAsyncThunk(
    'pricing/fetchAddonPlans',
    async (_, { rejectWithValue }) => {
        try {
            console.log('Redux: Fetching addon plans...');
            const result = await PricingService.getAddonPlans()
            console.log('Redux: Addon plans result:', result);
            return result;
        } catch (error: any) {
            console.error('Redux: Error fetching addon plans:', error);
            return rejectWithValue(error.message || 'Failed to fetch addon plans')
        }
    }
)

export const fetchUserPlan = createAsyncThunk(
    'pricing/fetchUserPlan',
    async (_, { rejectWithValue }) => {
        try {
            return await PricingService.getCurrentUserPlan()
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch user plan')
        }
    }
)

export const fetchUserPlanWithUsage = createAsyncThunk(
    'pricing/fetchUserPlanWithUsage',
    async (_, { rejectWithValue }) => {
        try {
            return await PricingService.getUserPlanWithUsage()
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch user plan with usage')
        }
    }
)

export const cancelUserPlan = createAsyncThunk(
    'pricing/cancelUserPlan',
    async (_, { rejectWithValue }) => {
        try {
            const result = await PricingService.cancelUserPlan()
            return result.message
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to cancel user plan')
        }
    }
)

export const fetchUsageSummary = createAsyncThunk(
    'pricing/fetchUsageSummary',
    async (_, { rejectWithValue }) => {
        try {
            return await PricingService.getUsageSummary()
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch usage summary')
        }
    }
)

export const fetchUsageHistory = createAsyncThunk(
    'pricing/fetchUsageHistory',
    async (_, { rejectWithValue }) => {
        try {
            return await PricingService.getUsageHistory()
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch usage history')
        }
    }
)

export const fetchUsageBreakdown = createAsyncThunk(
    'pricing/fetchUsageBreakdown',
    async (_, { rejectWithValue }) => {
        try {
            return await PricingService.getUsageBreakdown()
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch usage breakdown')
        }
    }
)

export const fetchPaymentHistory = createAsyncThunk(
    'pricing/fetchPaymentHistory',
    async (_, { rejectWithValue }) => {
        try {
            return await PricingService.getPaymentHistory()
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch payment history')
        }
    }
)

export const createSubscriptionSession = createAsyncThunk(
    'pricing/createSubscriptionSession',
    async (data: { plan_id: string; price_id: string; interval: 'month' | 'year' }, { rejectWithValue }) => {
        try {
            return await PricingService.createSubscriptionSession(data)
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create subscription session')
        }
    }
)

export const createAddonCheckoutSession = createAsyncThunk(
    'pricing/createAddonCheckoutSession',
    async (data: { addon_type: 'storage' | 'tokens' | 'synthetic'; quantity: number }, { rejectWithValue }) => {
        try {
            return await PricingService.createAddonCheckoutSession(data)
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create addon checkout session')
        }
    }
)

// Subscription Management Thunks
export const updateSubscription = createAsyncThunk(
    'pricing/updateSubscription',
    async (data: SubscriptionUpdateRequest, { rejectWithValue }) => {
        try {
            return await PricingService.updateSubscription(data)
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to update subscription')
        }
    }
)

export const cancelSubscription = createAsyncThunk(
    'pricing/cancelSubscription',
    async (data: SubscriptionCancelRequest, { rejectWithValue }) => {
        try {
            return await PricingService.cancelSubscription(data)
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to cancel subscription')
        }
    }
)

export const fetchUserSubscription = createAsyncThunk(
    'pricing/fetchUserSubscription',
    async (subscriptionId: string, { rejectWithValue }) => {
        try {
            return await PricingService.getSubscription(subscriptionId)
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch subscription')
        }
    }
)

const pricingSlice = createSlice({
    name: SLICE_PRICING_NAME,
    initialState,
    reducers: {
        clearPricing: (state) => {
            state.plans = []
            state.addonPlans = []
            state.userPlan = null
            state.userSubscription = null
            state.usageSummary = null
            state.usageHistory = []
            state.usageBreakdown = []
            state.paymentHistory = []
            state.loading = false
            state.error = null
            state.checkoutSession = null
        },
        clearCheckoutSession: (state) => {
            state.checkoutSession = null
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload
        },
        clearError: (state) => {
            state.error = null
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch All Plans
            .addCase(fetchAllPlans.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchAllPlans.fulfilled, (state, action) => {
                state.loading = false
                state.plans = action.payload
            })
            .addCase(fetchAllPlans.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            // Fetch Main Plans
            .addCase(fetchMainPlans.pending, (state) => {
                console.log('Redux: Main plans pending...');
                state.loading = true
                state.error = null
            })
            .addCase(fetchMainPlans.fulfilled, (state, action) => {
                console.log('Redux: Main plans fulfilled with:', action.payload);
                state.loading = false
                state.plans = action.payload
            })
            .addCase(fetchMainPlans.rejected, (state, action) => {
                console.log('Redux: Main plans rejected with:', action.payload);
                state.loading = false
                state.error = action.payload as string
            })
            // Fetch Addon Plans
            .addCase(fetchAddonPlans.pending, (state) => {
                console.log('Redux: Addon plans pending...');
                state.loading = true
                state.error = null
            })
            .addCase(fetchAddonPlans.fulfilled, (state, action) => {
                console.log('Redux: Addon plans fulfilled with:', action.payload);
                state.loading = false
                state.addonPlans = action.payload
            })
            .addCase(fetchAddonPlans.rejected, (state, action) => {
                console.log('Redux: Addon plans rejected with:', action.payload);
                state.loading = false
                state.error = action.payload as string
            })
            // Fetch User Plan
            .addCase(fetchUserPlan.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchUserPlan.fulfilled, (state, action) => {
                state.loading = false
                state.userPlan = action.payload
            })
            .addCase(fetchUserPlan.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            // Fetch User Plan With Usage
            .addCase(fetchUserPlanWithUsage.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchUserPlanWithUsage.fulfilled, (state, action) => {
                state.loading = false
                state.userPlan = action.payload
            })
            .addCase(fetchUserPlanWithUsage.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            // Cancel User Plan
            .addCase(cancelUserPlan.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(cancelUserPlan.fulfilled, (state) => {
                state.loading = false
                if (state.userPlan) {
                    state.userPlan.cancel_at_period_end = true
                }
            })
            .addCase(cancelUserPlan.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            // Fetch Usage Summary
            .addCase(fetchUsageSummary.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchUsageSummary.fulfilled, (state, action) => {
                state.loading = false
                state.usageSummary = action.payload
            })
            .addCase(fetchUsageSummary.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            // Fetch Usage History
            .addCase(fetchUsageHistory.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchUsageHistory.fulfilled, (state, action) => {
                state.loading = false
                state.usageHistory = action.payload
            })
            .addCase(fetchUsageHistory.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            // Fetch Usage Breakdown
            .addCase(fetchUsageBreakdown.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchUsageBreakdown.fulfilled, (state, action) => {
                state.loading = false
                state.usageBreakdown = action.payload
            })
            .addCase(fetchUsageBreakdown.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            // Fetch Payment History
            .addCase(fetchPaymentHistory.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchPaymentHistory.fulfilled, (state, action) => {
                state.loading = false
                state.paymentHistory = action.payload
            })
            .addCase(fetchPaymentHistory.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            // Create Subscription Session
            .addCase(createSubscriptionSession.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(createSubscriptionSession.fulfilled, (state, action) => {
                state.loading = false
                state.checkoutSession = action.payload
            })
            .addCase(createSubscriptionSession.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            // Create Addon Checkout Session
            .addCase(createAddonCheckoutSession.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(createAddonCheckoutSession.fulfilled, (state, action) => {
                state.loading = false
                state.checkoutSession = action.payload
            })
            .addCase(createAddonCheckoutSession.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            // Update Subscription
            .addCase(updateSubscription.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(updateSubscription.fulfilled, (state, action) => {
                state.loading = false
                state.userSubscription = action.payload
            })
            .addCase(updateSubscription.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            // Cancel Subscription
            .addCase(cancelSubscription.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(cancelSubscription.fulfilled, (state) => {
                state.loading = false
                if (state.userSubscription) {
                    state.userSubscription.status = 'canceled'
                    state.userSubscription.cancel_at_period_end = true
                }
            })
            .addCase(cancelSubscription.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            // Fetch User Subscription
            .addCase(fetchUserSubscription.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchUserSubscription.fulfilled, (state, action) => {
                state.loading = false
                state.userSubscription = action.payload
            })
            .addCase(fetchUserSubscription.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
    }
})

export const { clearPricing, clearCheckoutSession, setError, clearError } = pricingSlice.actions

export default pricingSlice.reducer
