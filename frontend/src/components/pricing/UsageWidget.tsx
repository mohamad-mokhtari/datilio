import React, { useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import UsageProgressBar from './UsageProgressBar';
import { useAppSelector, useAppDispatch } from '@/store/hook';
import { fetchUserPlanWithUsage } from '@/store/slices/pricing/pricingSlice';
import { formatBytes, formatNumber } from '@/utils/format';
import { HiExclamation, HiArrowRight } from 'react-icons/hi';

interface UsageWidgetProps {
    className?: string;
    showUpgradePrompt?: boolean;
}

const UsageWidget: React.FC<UsageWidgetProps> = ({ 
    className = '',
    showUpgradePrompt = true 
}) => {
    const dispatch = useAppDispatch();
    const { userPlan, loading } = useAppSelector((state) => state.pricing);

    useEffect(() => {
        dispatch(fetchUserPlanWithUsage());
    }, [dispatch]);

    if (!userPlan || !userPlan.usage) {
        return (
            <Card className={className}>
                <div className="p-4">
                    <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                        <div className="space-y-3">
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    const { usage } = userPlan;
    
    // Calculate usage percentages
    const storagePercentage = (usage.storage_used_mb / (usage.storage_limit_gb * 1024)) * 100;
    const tokensPercentage = (usage.ai_tokens_used / usage.ai_tokens_limit) * 100;
    const syntheticDataPercentage = (usage.synthetic_data_rows_used / usage.synthetic_data_rows_limit) * 100;
    const rulesPercentage = (usage.rules_used / usage.rules_limit) * 100;
    const listsPercentage = (usage.custom_lists_used / usage.custom_lists_limit) * 100;

    // Find the highest usage percentage
    const maxUsage = Math.max(
        storagePercentage,
        tokensPercentage,
        syntheticDataPercentage,
        rulesPercentage,
        listsPercentage
    );

    const needsUpgrade = maxUsage >= 80;

    return (
        <Card className={className}>
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Usage Overview
                    </h3>
                    <Badge 
                        variant="solid" 
                        color={userPlan.status === 'active' ? 'green' : 'red'}
                    >
                        {userPlan.plan_name}
                    </Badge>
                </div>

                <div className="space-y-3 mb-4">
                    <UsageProgressBar
                        label="Storage"
                        used={usage.storage_used_mb}
                        limit={usage.storage_limit_gb * 1024}
                        unit="MB"
                        showPercentage={false}
                    />
                    <UsageProgressBar
                        label="AI Tokens"
                        used={usage.ai_tokens_used}
                        limit={usage.ai_tokens_limit}
                        unit="tokens"
                        showPercentage={false}
                    />
                    <UsageProgressBar
                        label="Synthetic Data"
                        used={usage.synthetic_data_rows_used}
                        limit={usage.synthetic_data_rows_limit}
                        unit="rows"
                        showPercentage={false}
                    />
                </div>

                {needsUpgrade && showUpgradePrompt && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <HiExclamation className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                Approaching Limits
                            </span>
                        </div>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                            You're approaching your usage limits. Consider upgrading your plan for uninterrupted service.
                        </p>
                        <Button
                            size="sm"
                            variant="solid"
                            color="yellow"
                            onClick={() => window.location.href = '/pricing'}
                            icon={<HiArrowRight />}
                        >
                            Upgrade Plan
                        </Button>
                    </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        size="sm"
                        variant="outline"
                        color="gray"
                        onClick={() => window.location.href = '/billing'}
                        className="w-full"
                    >
                        View Detailed Usage
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default UsageWidget;
