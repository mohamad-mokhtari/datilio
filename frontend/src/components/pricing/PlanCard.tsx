import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { HiCheck, HiX } from 'react-icons/hi';
import { formatCurrency } from '@/utils/format';
import type { Plan } from '@/@types/pricing';

interface PlanCardProps {
    plan: Plan;
    currentPlanId?: string;
    onSelectPlan: (planId: string, interval: 'month' | 'year') => void;
    loading?: boolean;
    className?: string;
    hidePrice?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
    plan,
    currentPlanId,
    onSelectPlan,
    loading = false,
    className = '',
    hidePrice = false
}) => {
    const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');
    const isCurrentPlan = currentPlanId === plan.id;
    const isPopular = plan.name === 'Pro'; // Pro plan is popular

    const getGradientClass = () => {
        switch (plan.name.toLowerCase()) {
            case 'free':
                return 'from-gray-400 to-gray-600';
            case 'pro':
                return 'from-blue-500 to-blue-700';
            case 'business':
                return 'from-purple-500 to-purple-700';
            default:
                return 'from-gray-400 to-gray-600';
        }
    };

    const getYearlySavings = () => {
        if (plan.price_yearly && plan.price_monthly) {
            const monthlyTotal = plan.price_monthly * 12;
            return monthlyTotal - plan.price_yearly;
        }
        return 0;
    };

    const getYearlySavingsPercentage = () => {
        if (plan.price_yearly && plan.price_monthly) {
            const monthlyTotal = plan.price_monthly * 12;
            const savings = monthlyTotal - plan.price_yearly;
            return Math.round((savings / monthlyTotal) * 100);
        }
        return 0;
    };

    const getDisplayPrice = () => {
        // MVP and Free plans should always show $0
        if (plan.name.toLowerCase() === 'mvp' || plan.name === 'Free') {
            return 0;
        }
        return selectedInterval === 'year' ? plan.price_yearly : plan.price_monthly;
    };

    const getPricePerMonth = () => {
        // MVP and Free plans should always show $0
        if (plan.name.toLowerCase() === 'mvp' || plan.name === 'Free') {
            return 0;
        }
        if (selectedInterval === 'year' && plan.price_yearly) {
            return plan.price_yearly / 12;
        }
        return plan.price_monthly;
    };

    const prices = getDisplayPrice();

    // Create features array from plan data
    const features = [
        { name: 'File Uploads', limit: plan.file_limit, unit: 'files', is_included: true },
        { name: 'File Size', limit: plan.file_size_limit_mb, unit: 'MB per file', is_included: true },
        { name: 'Storage', limit: plan.storage_limit_gb, unit: 'GB', is_included: true },
        { name: 'AI Tokens', limit: plan.ai_tokens_per_month, unit: 'per month', is_included: true },
        { name: 'Synthetic Data', limit: plan.synthetic_rows_per_month, unit: 'rows per month', is_included: true },
        { name: 'Rules', limit: plan.rules_limit, unit: 'rules', is_included: true },
        { name: 'Custom Lists', limit: plan.custom_lists_limit === -1 ? 'Unlimited' : plan.custom_lists_limit, unit: plan.custom_lists_limit === -1 ? '' : 'lists', is_included: true },
        { name: 'Priority Processing', limit: null, unit: '', is_included: plan.priority_processing },
        { name: 'Team Sharing', limit: null, unit: '', is_included: plan.team_sharing },
    ];

    return (
        <Card
            className={`relative transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${className} ${isPopular ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}
        >
            {isPopular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500 text-white shadow-sm">
                        Most Popular
                    </span>
                </div>
            )}

            <div className={`text-center mb-6 ${isPopular ? 'pt-2' : ''}`}>
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${getGradientClass()} mb-4`}>
                    <span className="text-white text-xl font-bold">
                        {plan.name.charAt(0).toUpperCase()}
                    </span>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {plan.description}
                </p>

                {/* Pricing Toggle */}
                {!hidePrice && (
                    <div className="flex items-center justify-center gap-4 mb-4">
                        {plan.name !== 'Free' && plan.name.toLowerCase() !== 'mvp' ? (
                            <>
                                <span
                                    className={`text-sm ${selectedInterval === 'month'
                                            ? 'text-gray-900 dark:text-white'
                                            : 'text-gray-500'
                                        }`}
                                >
                                    Monthly
                                </span>
                                <button
                                    onClick={() =>
                                        setSelectedInterval(
                                            selectedInterval === 'month' ? 'year' : 'month'
                                        )
                                    }
                                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors"
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${selectedInterval === 'year'
                                                ? 'translate-x-6'
                                                : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                                <span
                                    className={`text-sm ${selectedInterval === 'year'
                                            ? 'text-gray-900 dark:text-white'
                                            : 'text-gray-500'
                                        }`}
                                >
                                    Yearly
                                    {selectedInterval === 'year' && getYearlySavingsPercentage() > 0 && (
                                        <span className="inline-flex items-center ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
                                            Save {getYearlySavingsPercentage()}%
                                        </span>
                                    )}
                                </span>
                            </>
                        ) : (
                            // 👇 Placeholder to keep alignment
                            <div className="h-6" />
                        )}
                    </div>
                )}


                {/* Price Display */}
                <div className="mb-6">
                    <div className="flex items-baseline justify-center gap-2">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                            {hidePrice ? '----' : formatCurrency(getPricePerMonth())}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">/month</span>
                    </div>
                    {selectedInterval === 'year' && plan.name.toLowerCase() !== 'mvp' && plan.name !== 'Free' && (
                        <div className="text-center mt-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {hidePrice ? '----' : formatCurrency(getDisplayPrice())} billed annually
                            </p>
                            {getYearlySavings() > 0 && !hidePrice && (
                                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                    Save {formatCurrency(getYearlySavings())} per year
                                </p>
                            )}
                        </div>
                    )}
                    {selectedInterval === 'month' && plan.name.toLowerCase() !== 'mvp' && plan.name !== 'Free' && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
                            Billed monthly
                        </p>
                    )}
                    {(plan.name.toLowerCase() === 'mvp' || plan.name === 'Free') && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
                            Free forever
                        </p>
                    )}
                </div>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
                {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                        {feature.is_included ? (
                            <HiCheck className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                            <HiX className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                {feature.name}
                            </span>
                            {feature.limit && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                    ({feature.limit} {feature.unit})
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Button */}
            <div className="mt-auto">
                {isCurrentPlan ? (
                    <Button
                        variant="solid"
                        color="gray"
                        className="w-full"
                        disabled
                    >
                        Current Plan
                    </Button>
                ) : (
                    <Button
                        variant="solid"
                        color={isPopular ? "blue" : "gray"}
                        className="w-full"
                        onClick={() => onSelectPlan(plan.id, selectedInterval)}
                        loading={loading}
                    >
                        {isCurrentPlan ? 'Current Plan' : 
                         (plan.name.toLowerCase() === 'mvp' || plan.name === 'Free') ? 'Get Started Free' :
                         `Start ${selectedInterval === 'year' ? 'Annual' : 'Monthly'} Subscription`}
                    </Button>
                )}
            </div>
        </Card>
    );
};

export default PlanCard;
