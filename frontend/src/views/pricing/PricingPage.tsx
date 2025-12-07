import React, { useEffect, useState } from 'react';
import Container from '@/components/shared/Container';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import TabList from '@/components/ui/Tabs/TabList';
import TabNav from '@/components/ui/Tabs/TabNav';
import TabContent from '@/components/ui/Tabs/TabContent';
import PlanCard from '@/components/pricing/PlanCard';
import { useAppSelector, useAppDispatch } from '@/store/hook';
import {
    fetchMainPlans,
    fetchAddonPlans,
    fetchUserPlan,
    createSubscriptionSession,
    createAddonCheckoutSession,
    clearCheckoutSession
} from '@/store/slices/pricing/pricingSlice';
import type { Plan, AddonPlan } from '@/@types/pricing';
import { HiCheck, HiX, HiQuestionMarkCircle, HiSparkles, HiClock } from 'react-icons/hi';
import { formatCurrency } from '@/utils/format';



const PricingPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { plans, addonPlans, userPlan, loading, error, checkoutSession } = useAppSelector(
        (state) => state.pricing
    );
    const [activeTab, setActiveTab] = useState('plans');
    
    // Check if we're in production environment
    const isProduction = import.meta.env.VITE_ENV === 'production';
    
    // Get MVP plan from Redux store
    const mvpPlan = plans.find(plan => plan.name.toLowerCase() === 'mvp' || plan.id === 'mvp');

    useEffect(() => {
        console.log('PricingPage: Dispatching fetch actions...');
        dispatch(fetchMainPlans());
        dispatch(fetchAddonPlans());
        dispatch(fetchUserPlan());
    }, [dispatch]);

    // Debug logging
    useEffect(() => {
        console.log('PricingPage: Current state:', { plans, addonPlans, userPlan, loading, error });
    }, [plans, addonPlans, userPlan, loading, error]);

    useEffect(() => {
        if (checkoutSession?.checkout_url) {
            window.location.href = checkoutSession.checkout_url;
            dispatch(clearCheckoutSession());
        }
    }, [checkoutSession, dispatch]);

    const handleSelectPlan = (planId: string, interval: 'month' | 'year') => {
        const plan = plans.find(p => p.id === planId);
        if (!plan) {
            console.error('Plan not found:', planId);
            return;
        }

        const priceId = interval === 'year' ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;
        dispatch(createSubscriptionSession({ 
            plan_id: planId, 
            price_id: priceId,
            interval: interval 
        }));
    };

    const handleSelectAddon = (addonId: string, quantity: number) => {
        // Extract addon type from the addon data
        const addon = addonPlans.find(a => a.id === addonId);
        if (addon) {
            dispatch(createAddonCheckoutSession({ 
                addon_type: addon.features.addon_type, 
                quantity 
            }));
        }
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
                    We're working hard to bring you amazing pricing plans. 
                    For now, enjoy our MVP plan with essential features!
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

    const faqData = [
        {
            question: "How does subscription billing work?",
            answer: "Your subscription automatically renews monthly or annually based on your chosen plan. You'll be charged in advance for each billing period, and you can cancel anytime."
        },
        {
            question: "Can I change my plan mid-cycle?",
            answer: "Yes! You can upgrade or downgrade your plan anytime. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your current billing period."
        },
        {
            question: "What happens if I exceed my plan limits?",
            answer: "When you approach your limits, you'll receive notifications. You can upgrade your plan or purchase add-ons to continue using the service without interruption."
        },
        {
            question: "Can I cancel my subscription anytime?",
            answer: "Absolutely! You can cancel your subscription at any time from your account settings. You'll continue to have access until the end of your current billing period."
        },
        {
            question: "What payment methods do you accept?",
            answer: "We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. All payments are processed securely through Stripe."
        },
        {
            question: "Do you offer refunds?",
            answer: "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact our support team for a full refund."
        }
    ];

    const renderPlansSection = (showAllPlans = false, hidePrices = false) => {
        console.log('PricingPage: Rendering plans section with plans:', plans);
        
        // In production, show only MVP plan (unblurred) unless showAllPlans is true
        if (isProduction && !showAllPlans) {
            if (!mvpPlan) {
                return (
                    <div className="text-center py-8">
                        <p className="text-gray-500">MVP plan not available</p>
                    </div>
                );
            }
            return (
                <div className="flex justify-center mb-8 mt-4">
                    <div className="w-full max-w-md">
                        <PlanCard
                            key={mvpPlan.id}
                            plan={mvpPlan}
                            currentPlanId={userPlan?.plan_id}
                            onSelectPlan={handleSelectPlan}
                            loading={loading}
                        />
                    </div>
                </div>
            );
        }
        
        // Show all plans (for development or blurred section in production)
        if (plans.length === 0) {
            return (
                <div className="text-center py-8">
                    <p className="text-gray-500">No plans available</p>
                    <p className="text-sm text-gray-400">Plans array length: {plans.length}</p>
                </div>
            );
        }
        
        // Filter out MVP plan if we're in the blurred section
        const plansToShow = showAllPlans && isProduction 
            ? plans.filter(plan => plan.name.toLowerCase() !== 'mvp' && plan.id !== 'mvp')
            : plans;
        
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-4">
                {plansToShow.map((plan) => (
                    <PlanCard
                        key={plan.id}
                        plan={plan}
                        currentPlanId={userPlan?.plan_id}
                        onSelectPlan={handleSelectPlan}
                        loading={loading}
                        hidePrice={hidePrices}
                    />
                ))}
            </div>
        );
    };

    const renderAddonsSection = () => {
        console.log('PricingPage: Rendering addons section with addonPlans:', addonPlans);
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {addonPlans.map((addon) => (
                    <Card key={addon.id} className="p-6">
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {addon.name}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {addon.description}
                            </p>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                {formatCurrency(addon.price_monthly)}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                per month
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {addon.features.unit}
                            </p>
                        </div>
                        <Button
                            variant="solid"
                            color="blue"
                            className="w-full"
                            onClick={() => handleSelectAddon(addon.id, 1)}
                            loading={loading}
                        >
                            Add to Plan
                        </Button>
                    </Card>
                ))}
            </div>
        );
    };

    const renderFeatureComparison = (excludeMvp = false) => {
        if (plans.length === 0) return null;
        
        // Filter out MVP plan if needed
        const plansToShow = excludeMvp && isProduction 
            ? plans.filter(plan => plan.name.toLowerCase() !== 'mvp' && plan.id !== 'mvp')
            : plans;

        const features = [
            { name: 'File Uploads', key: 'file_limit', unit: 'files' },
            { name: 'File Size', key: 'file_size_limit_mb', unit: 'MB per file' },
            { name: 'Storage', key: 'storage_limit_gb', unit: 'GB' },
            { name: 'AI Tokens', key: 'ai_tokens_per_month', unit: 'per month' },
            { name: 'Synthetic Data', key: 'synthetic_rows_per_month', unit: 'rows per month' },
            { name: 'Rules', key: 'rules_limit', unit: 'rules' },
            { name: 'Custom Lists', key: 'custom_lists_limit', unit: 'lists' },
            { name: 'Priority Processing', key: 'priority_processing', unit: '' },
            { name: 'Team Sharing', key: 'team_sharing', unit: '' },
        ];
        
        return (
            <Card className="mb-8">
                <div className="p-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                        Feature Comparison
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                                        Features
                                    </th>
                                    {plansToShow.map((plan) => (
                                        <th key={plan.id} className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                                            {plan.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {features.map((feature) => (
                                    <tr key={feature.name} className="border-b border-gray-100 dark:border-gray-800">
                                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                                            {feature.name}
                                            {feature.unit && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                                    ({feature.unit})
                                                </span>
                                            )}
                                        </td>
                                        {plansToShow.map((plan) => {
                                            const value = (plan as any)[feature.key];
                                            const isBoolean = typeof value === 'boolean';
                                            const isUnlimited = value === -1;
                                            
                                            return (
                                                <td key={plan.id} className="text-center py-3 px-4">
                                                    {isBoolean ? (
                                                        value ? (
                                                            <HiCheck className="w-5 h-5 text-green-500 mx-auto" />
                                                        ) : (
                                                            <HiX className="w-5 h-5 text-red-500 mx-auto" />
                                                        )
                                                    ) : isUnlimited ? (
                                                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                                            Unlimited
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                                            {value}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        );
    };

    const renderFAQSection = () => (
        <Card className={isProduction ? 'blur-sm pointer-events-none' : ''}>
            <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                    Frequently Asked Questions
                </h3>
                <div className="space-y-6">
                    {faqData.map((faq, index) => (
                        <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <HiQuestionMarkCircle className="w-5 h-5 text-blue-500" />
                                {faq.question}
                            </h4>
                            <p className="text-gray-600 dark:text-gray-400">
                                {faq.answer}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );

    if (error) {
        return (
            <Container>
                <div className="text-center py-12">
                    <div className="text-red-500 text-lg mb-4">Error loading pricing information</div>
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
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        {isProduction ? 'MVP Plan Available' : 'Choose Your Subscription Plan'}
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        {isProduction 
                            ? 'Get started with our MVP plan featuring essential features. More plans coming soon!'
                            : 'Start your subscription today with flexible monthly or annual billing. Cancel anytime with no long-term commitments.'
                        }
                    </p>
                    {!isProduction && (
                        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                <HiCheck className="w-4 h-4 text-green-500" />
                                <span>Cancel anytime</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <HiCheck className="w-4 h-4 text-green-500" />
                                <span>Upgrade/downgrade anytime</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <HiCheck className="w-4 h-4 text-green-500" />
                                <span>Save with annual billing</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* MVP Plan Section - Always Clear in Production */}
                {isProduction ? (
                    <div className="mb-8">
                        {renderPlansSection()}
                    </div>
                ) : (
                    /* Tabs - Only in Development */
                    <div>
                        <Tabs value={activeTab} onChange={setActiveTab} className="mb-6">
                            <TabList>
                                <TabNav value="plans">Plans</TabNav>
                                <TabNav value="addons">Add-ons</TabNav>
                            </TabList>

                            {/* Content */}
                            <TabContent value="plans">
                                {renderPlansSection()}
                                {renderFeatureComparison()}
                            </TabContent>

                            <TabContent value="addons">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-4">
                                        Additional Resources
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                                        Need more resources? Purchase add-ons to extend your current plan limits.
                                    </p>
                                </div>
                                {renderAddonsSection()}
                            </TabContent>
                        </Tabs>
                    </div>
                )}

                {/* Blurred Sections - Only in Production */}
                {isProduction && (
                    <div className="blur-sm pointer-events-none">
                        <Tabs value={activeTab} onChange={setActiveTab} className="mb-6">
                            <TabList>
                                <TabNav value="plans">Plans</TabNav>
                                <TabNav value="addons">Add-ons</TabNav>
                            </TabList>

                            {/* Content */}
                            <TabContent value="plans">
                                {renderPlansSection(true, true)}
                                {renderFeatureComparison(true)}
                            </TabContent>

                            <TabContent value="addons">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-4">
                                        Additional Resources
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                                        Need more resources? Purchase add-ons to extend your current plan limits.
                                    </p>
                                </div>
                                {renderAddonsSection()}
                            </TabContent>
                        </Tabs>
                    </div>
                )}

                {/* FAQ Section */}
                {renderFAQSection()}
            </div>
        </Container>
    );
};

export default PricingPage;