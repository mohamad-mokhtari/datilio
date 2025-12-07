import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hook';
import { updateSubscription, cancelSubscription } from '@/store/slices/pricing/pricingSlice';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Dialog from '@/components/ui/Dialog';
import { HiRefresh, HiX, HiCheckCircle, HiExclamation } from 'react-icons/hi';
import { useConfig } from '@/components/ui/ConfigProvider';

interface SubscriptionManagerProps {
    subscriptionId: string;
    currentPlanId: string;
    availablePlans: Array<{
        id: string;
        name: string;
        price_monthly: number;
        price_yearly: number;
        stripe_price_id_monthly: string;
        stripe_price_id_yearly: string;
    }>;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
    subscriptionId,
    currentPlanId,
    availablePlans
}) => {
    const dispatch = useAppDispatch();
    const { loading, error } = useAppSelector((state) => state.pricing);
    const { themeColor, primaryColorLevel } = useConfig();
    
    // Get CSS color values for the theme
    const getThemeColors = () => {
        const colorMap: Record<string, Record<number, string>> = {
            red: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
            orange: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
            amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
            yellow: { 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
            lime: { 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#365314', 900: '#1a2e05' },
            green: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
            emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
            teal: { 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
            cyan: { 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63' },
            sky: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
            blue: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
            indigo: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
            violet: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
            purple: { 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87' },
            fuchsia: { 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75' },
            pink: { 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
            rose: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' }
        };
        
        const primaryColor = colorMap[themeColor]?.[primaryColorLevel] || '#4f46e5'; // fallback to indigo-600
        const lightColor = colorMap[themeColor]?.[Math.max(primaryColorLevel - 100, 100) as number] || '#6366f1'; // fallback to indigo-500
        
        return { primaryColor, lightColor };
    };

    const { primaryColor, lightColor } = getThemeColors();
    
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string>('');
    const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');
    const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);

    const currentPlan = availablePlans.find(p => p.id === currentPlanId);
    const otherPlans = availablePlans.filter(p => p.id !== currentPlanId);

    const handleUpgrade = () => {
        if (!selectedPlan) return;

        const plan = availablePlans.find(p => p.id === selectedPlan);
        if (!plan) return;

        const priceId = selectedInterval === 'year' 
            ? plan.stripe_price_id_yearly 
            : plan.stripe_price_id_monthly;

        dispatch(updateSubscription({
            subscription_id: subscriptionId,
            new_price_id: priceId,
            proration_behavior: 'create_prorations'
        }));

        setShowUpgradeDialog(false);
    };

    const handleCancel = () => {
        dispatch(cancelSubscription({
            subscription_id: subscriptionId,
            cancel_at_period_end: cancelAtPeriodEnd
        }));

        setShowCancelDialog(false);
    };

    const getPlanPrice = (plan: any, interval: 'month' | 'year') => {
        return interval === 'year' ? plan.price_yearly : plan.price_monthly;
    };

    return (
        <div className="space-y-6">
            {/* Current Subscription Status */}
            <Card>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Subscription Management
                    </h3>
                    
                    {currentPlan && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 
                                        className="font-medium dark:text-blue-100"
                                        style={{ color: primaryColor }}
                                    >
                                        Current Plan: {currentPlan.name}
                                    </h4>
                                    <p 
                                        className="text-sm dark:text-blue-300"
                                        style={{ color: primaryColor }}
                                    >
                                        ${currentPlan.price_monthly}/month or ${currentPlan.price_yearly}/year
                                    </p>
                                </div>
                                <HiCheckCircle 
                                    className="w-6 h-6" 
                                    style={{ color: primaryColor }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            variant="solid"
                            color="blue"
                            onClick={() => setShowUpgradeDialog(true)}
                            icon={<HiRefresh />}
                            disabled={loading}
                        >
                            Change Plan
                        </Button>
                        
                        <Button
                            variant="outline"
                            color="red"
                            onClick={() => setShowCancelDialog(true)}
                            icon={<HiX />}
                            disabled={loading}
                        >
                            Cancel Subscription
                        </Button>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Upgrade Plan Dialog */}
            <Dialog
                isOpen={showUpgradeDialog}
                onClose={() => setShowUpgradeDialog(false)}
                title="Change Subscription Plan"
            >
                <div className="p-6">
                    <div className="mb-6">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Select New Plan
                        </h4>
                        <div className="space-y-3">
                            {otherPlans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                        selectedPlan === plan.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                                    onClick={() => setSelectedPlan(plan.id)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h5 className="font-medium text-gray-900 dark:text-white">
                                                {plan.name}
                                            </h5>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                ${getPlanPrice(plan, selectedInterval)}/{selectedInterval}
                                            </p>
                                        </div>
                                        <input
                                            type="radio"
                                            checked={selectedPlan === plan.id}
                                            onChange={() => setSelectedPlan(plan.id)}
                                            className="text-blue-600"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Billing Interval
                        </h4>
                        <div className="flex gap-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="month"
                                    checked={selectedInterval === 'month'}
                                    onChange={(e) => setSelectedInterval(e.target.value as 'month')}
                                    className="mr-2"
                                />
                                Monthly
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="year"
                                    checked={selectedInterval === 'year'}
                                    onChange={(e) => setSelectedInterval(e.target.value as 'year')}
                                    className="mr-2"
                                />
                                Yearly (Save 2 months)
                            </label>
                        </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                            <HiExclamation className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
                            <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                <p className="font-medium mb-1">Proration Notice</p>
                                <p>
                                    You'll be charged or credited the difference between your current plan 
                                    and the new plan for the remaining billing period.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowUpgradeDialog(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="solid"
                            color="blue"
                            onClick={handleUpgrade}
                            loading={loading}
                            disabled={!selectedPlan}
                        >
                            Change Plan
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Cancel Subscription Dialog */}
            <Dialog
                isOpen={showCancelDialog}
                onClose={() => setShowCancelDialog(false)}
                title="Cancel Subscription"
            >
                <div className="p-6">
                    <div className="mb-6">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Cancellation Options
                        </h4>
                        <div className="space-y-3">
                            <label className="flex items-start">
                                <input
                                    type="radio"
                                    checked={cancelAtPeriodEnd}
                                    onChange={() => setCancelAtPeriodEnd(true)}
                                    className="mt-1 mr-3"
                                />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        Cancel at period end (Recommended)
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Keep access until the end of your current billing period
                                    </p>
                                </div>
                            </label>
                            <label className="flex items-start">
                                <input
                                    type="radio"
                                    checked={!cancelAtPeriodEnd}
                                    onChange={() => setCancelAtPeriodEnd(false)}
                                    className="mt-1 mr-3"
                                />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        Cancel immediately
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Lose access immediately (no refund)
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                            <HiExclamation className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                            <div className="text-sm text-red-800 dark:text-red-200">
                                <p className="font-medium mb-1">Warning</p>
                                <p>
                                    Canceling your subscription will remove access to premium features. 
                                    You can reactivate anytime.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowCancelDialog(false)}
                            disabled={loading}
                        >
                            Keep Subscription
                        </Button>
                        <Button
                            variant="solid"
                            color="red"
                            onClick={handleCancel}
                            loading={loading}
                        >
                            Cancel Subscription
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default SubscriptionManager;
