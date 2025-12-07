import React, { useEffect, useState, useMemo } from 'react';
import Container from '@/components/shared/Container';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import Tabs from '@/components/ui/Tabs';
import TabList from '@/components/ui/Tabs/TabList';
import TabNav from '@/components/ui/Tabs/TabNav';
import TabContent from '@/components/ui/Tabs/TabContent';
import UsageProgressBar from '@/components/pricing/UsageProgressBar';
import { useAppSelector, useAppDispatch } from '@/store/hook';
import { 
    fetchUserPlanWithUsage, 
    fetchUsageSummary, 
    fetchUsageHistory, 
    fetchPaymentHistory,
    cancelUserPlan,
    fetchMainPlans
} from '@/store/slices/pricing/pricingSlice';
import SubscriptionManager from '@/components/pricing/SubscriptionManager';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';
import { HiCheck, HiX, HiExclamation, HiCreditCard, HiCalendar, HiDownload, HiSparkles, HiClock } from 'react-icons/hi';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SimpleBarChartComponent from '@/components/charts/SimpleBarChartComponent';

const { Tr, Th, Td, THead, TBody } = Table;


const BillingDashboard: React.FC = () => {
    const dispatch = useAppDispatch();
    const { userPlan, plans, usageSummary, usageHistory, paymentHistory, loading, error } = useAppSelector(
        (state) => state.pricing
    );
    const [activeTab, setActiveTab] = useState('overview');
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    
    // Check if we're in production environment
    const isProduction = import.meta.env.VITE_ENV === 'production';

    useEffect(() => {
        dispatch(fetchUserPlanWithUsage());
        dispatch(fetchUsageSummary());
        dispatch(fetchUsageHistory());
        dispatch(fetchPaymentHistory());
        dispatch(fetchMainPlans());
    }, [dispatch]);

    // Toggle sort order
    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    // Memoized sorted payment history
    const sortedPaymentHistory = useMemo(() => {
        if (!paymentHistory) return [];
        return [...paymentHistory].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            
            return sortOrder === 'desc' 
                ? dateB - dateA // Newest first
                : dateA - dateB; // Oldest first
        });
    }, [paymentHistory, sortOrder]);

    const handleCancelPlan = () => {
        dispatch(cancelUserPlan());
        setShowCancelConfirm(false);
    };

    // Coming Soon Banner Component
    const ComingSoonBanner = () => (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl mb-8">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative px-8 py-12 text-center">
                <div className="flex items-center justify-center mb-4">
                    <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                        <HiSparkles className="w-8 h-8 text-white" />
                    </div>
                </div>
                <h2 className="text-4xl font-bold text-white mb-4">
                    Coming Soon
                </h2>
                <p className="text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                    We're working hard to bring you advanced billing features. 
                    For now, enjoy our MVP plan with essential billing capabilities!
                </p>
                <div className="flex items-center justify-center gap-2 text-white/80">
                    <HiClock className="w-5 h-5" />
                    <span className="text-sm">Stay tuned for updates</span>
                </div>
            </div>
            {/* Animated background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/10 rounded-full animate-pulse"></div>
                <div className="absolute top-1/2 -right-8 w-32 h-32 bg-white/5 rounded-full animate-pulse delay-1000"></div>
                <div className="absolute bottom-0 left-1/3 w-16 h-16 bg-white/10 rounded-full animate-pulse delay-500"></div>
            </div>
        </div>
    );

    const getUsagePercentage = (used: number, limit: number) => {
        return Math.min((used / limit) * 100, 100);
    };

    const getUsageStatus = (percentage: number) => {
        if (percentage >= 95) return 'danger';
        if (percentage >= 80) return 'warning';
        return 'success';
    };

    const renderCurrentPlan = () => {
        if (!userPlan) return null;

        return (
            <Card className="mb-6">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {userPlan.plan?.name || userPlan.name || 'Current Plan'}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                {userPlan.description || 'Your current subscription plan'}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(userPlan.plan?.price_monthly || 0)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                per month
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                            <Badge 
                                className={`mt-1 ${userPlan.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                            >
                                {userPlan.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Next Billing</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatDate(userPlan.end_date)}
                            </div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Plan ID</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {userPlan.plan_id}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button 
                            variant="solid" 
                            color="blue"
                            onClick={() => window.location.href = '/pricing'}
                        >
                            Change Plan
                        </Button>
                        <Button 
                            variant="default" 
                            color="red"
                            onClick={() => setShowCancelConfirm(true)}
                        >
                            Cancel Plan
                        </Button>
                    </div>
                </div>
            </Card>
        );
    };

    const renderUsageOverview = () => {
        if (!usageSummary) return null;

        const usageData = [
            {
                label: 'File Storage',
                used: usageSummary.current_month.file_storage_mb,
                limit: usageSummary.limits.file_storage_mb,
                unit: 'MB'
            },
            {
                label: 'AI Tokens',
                used: usageSummary.current_month.openai_tokens,
                limit: usageSummary.limits.openai_tokens,
                unit: 'tokens'
            },
            {
                label: 'Synthetic Data',
                used: usageSummary.current_month.synthetic_rows,
                limit: usageSummary.limits.synthetic_rows,
                unit: 'rows'
            },
            {
                label: 'Rules',
                used: usageSummary.current_month.rules_used,
                limit: usageSummary.limits.rules_used,
                unit: 'rules'
            },
            {
                label: 'Custom Lists',
                used: usageSummary.current_month.custom_lists,
                limit: usageSummary.limits.custom_lists,
                unit: 'lists'
            }
        ];

        return (
            <Card className="mb-6">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        Usage Overview
                    </h3>
                    <div className="space-y-6">
                        {usageData.map((item) => {
                            const percentage = getUsagePercentage(item.used, item.limit);
                            const status = getUsageStatus(percentage);
                            
                            return (
                                <div key={item.label}>
                                    <UsageProgressBar
                                        label={item.label}
                                        used={item.used}
                                        limit={item.limit}
                                        unit={item.unit}
                                    />
                                    {percentage >= 80 && (
                                        <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <HiExclamation className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                                                    You're approaching your {item.label.toLowerCase()} limit. 
                                                    Consider upgrading your plan or purchasing add-ons.
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>
        );
    };

    const renderUsageChart = () => {
        if (!usageHistory || usageHistory.length === 0) return null;

        // Group usage by date and feature
        const usageByDate: Record<string, any> = {};
        
        usageHistory.forEach((item) => {
            if (!usageByDate[item.date]) {
                usageByDate[item.date] = {
                    name: formatDate(item.date),
                    'Storage (MB)': 0,
                    'AI Tokens': 0,
                    'Synthetic Data': 0,
                };
            }
            
            if (item.feature === 'file_storage_mb') {
                usageByDate[item.date]['Storage (MB)'] += item.amount;
            } else if (item.feature === 'openai_tokens') {
                usageByDate[item.date]['AI Tokens'] += item.amount;
            } else if (item.feature === 'synthetic_rows') {
                usageByDate[item.date]['Synthetic Data'] += item.amount;
            }
        });

        const chartData = Object.values(usageByDate).slice(-7);

        return (
            <Card className="mb-6">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        Usage Trends (Last 7 Days)
                    </h3>
                    <SimpleBarChartComponent 
                        userId="current-user"
                        fileId="billing-data"
                        columnNames="Storage (MB),AI Tokens,Synthetic Data"
                        xAxisName="Date"
                        visible_plot_extra_info={false}
                    />
                </div>
            </Card>
        );
    };

    const renderPaymentHistory = () => {
        return (
            <Card>
                <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        Payment History
                    </h3>
                    <Table>
                        <THead>
                            <Tr>
                                <Th>
                                    <button 
                                        onClick={toggleSortOrder}
                                        className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                                        title={`Sort by date (${sortOrder === 'desc' ? 'newest first' : 'oldest first'})`}
                                    >
                                        <span>Date</span>
                                        {sortOrder === 'desc' ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronUp className="h-4 w-4" />
                                        )}
                                    </button>
                                </Th>
                                <Th>Type</Th>
                                <Th>Amount</Th>
                                <Th>Status</Th>
                                <Th>Session ID</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {sortedPaymentHistory.map((payment) => (
                                <Tr key={payment.id}>
                                    <Td>{formatDateTime(payment.created_at)}</Td>
                                    <Td>
                                        <Badge 
                                            className={payment.is_addon ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                                        >
                                            {payment.is_addon ? 'Add-on' : 'Plan'}
                                        </Badge>
                                    </Td>
                                    <Td>{formatCurrency(payment.amount_paid, payment.currency)}</Td>
                                    <Td>
                                        <Badge 
                                            className={
                                                payment.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                            }
                                        >
                                            {payment.status}
                                        </Badge>
                                    </Td>
                                    <Td className="text-xs text-gray-500 dark:text-gray-400">
                                        {payment.session_id}
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                </div>
            </Card>
        );
    };

    if (error) {
        return (
            <Container>
                <div className="text-center py-12">
                    <div className="text-red-500 text-lg mb-4">Error loading billing information</div>
                    <Button onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </div>
            </Container>
        );
    }

    return (
        <Container>
            <div className="py-8">
                {/* Coming Soon Banner - Only in Production */}
                {isProduction && <ComingSoonBanner />}

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {isProduction ? 'MVP Billing Dashboard' : 'Billing & Usage'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {isProduction 
                            ? 'Basic billing information for your MVP plan. Advanced features coming soon!'
                            : 'Manage your subscription, track usage, and view payment history.'
                        }
                    </p>
                </div>

                {/* Content with Blur Effect in Production */}
                <div className={isProduction ? 'blur-sm pointer-events-none' : ''}>
                    {/* Current Plan */}
                    {renderCurrentPlan()}
                    {/* Tabs */}
                    <Tabs value={activeTab} onChange={setActiveTab} className="mb-8">
                        <TabList>
                            <TabNav value="overview">Overview</TabNav>
                            <TabNav value="subscription">Subscription</TabNav>
                            <TabNav value="usage">Usage Analytics</TabNav>
                            <TabNav value="payments">Payment History</TabNav>
                        </TabList>
                    </Tabs>

                    {/* Content */}
                    <TabContent value="overview">
                        {renderUsageOverview()}
                    </TabContent>

                    <TabContent value="subscription">
                        {userPlan?.subscription_id && (
                            <SubscriptionManager
                                subscriptionId={userPlan.subscription_id}
                                currentPlanId={userPlan.plan_id}
                                availablePlans={plans}
                            />
                        )}
                    </TabContent>

                    <TabContent value="usage">
                        {renderUsageChart()}
                    </TabContent>

                    <TabContent value="payments">
                        {renderPaymentHistory()}
                    </TabContent>
                </div>

                {/* Cancel Confirmation Modal */}
                {showCancelConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <Card className="w-full max-w-md mx-4">
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                                    Cancel Subscription
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period.
                                </p>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="solid" 
                                        color="red"
                                        onClick={handleCancelPlan}
                                        loading={loading}
                                    >
                                        Cancel Subscription
                                    </Button>
                                    <Button 
                                        variant="default" 
                                        onClick={() => setShowCancelConfirm(false)}
                                    >
                                        Keep Subscription
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </Container>
    );
};

export default BillingDashboard;
