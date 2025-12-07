import React, { useEffect } from 'react';
import Container from '@/components/shared/Container';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { HiCheckCircle, HiHome, HiCreditCard } from 'react-icons/hi';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentSuccessPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        // You can verify the payment here if needed
        console.log('Payment session ID:', sessionId);
    }, [sessionId]);

    const handleGoToDashboard = () => {
        navigate('/dashboard');
    };

    const handleGoToBilling = () => {
        navigate('/billing');
    };

    return (
        <Container>
            <div className="min-h-screen flex items-center justify-center py-12">
                <Card className="w-full max-w-md mx-4">
                    <div className="p-8 text-center">
                        {/* Success Icon */}
                        <div className="mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20">
                                <HiCheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                        </div>

                        {/* Success Message */}
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            Payment Successful!
                        </h1>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Thank you for your purchase. Your subscription has been activated and you now have access to all the features included in your plan.
                        </p>

                        {/* Session ID (for debugging) */}
                        {sessionId && (
                            <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Session ID: {sessionId}
                                </p>
                            </div>
                        )}

                        {/* Next Steps */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                What's Next?
                            </h3>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                <li>• Your new plan features are now active</li>
                                <li>• You'll receive a confirmation email shortly</li>
                                <li>• Check your billing dashboard for usage tracking</li>
                                <li>• Start using your enhanced features right away</li>
                            </ul>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <Button
                                variant="solid"
                                color="blue"
                                className="w-full"
                                onClick={handleGoToDashboard}
                                icon={<HiHome />}
                            >
                                Go to Dashboard
                            </Button>
                            
                            <Button
                                variant="outline"
                                color="gray"
                                className="w-full"
                                onClick={handleGoToBilling}
                                icon={<HiCreditCard />}
                            >
                                View Billing
                            </Button>
                        </div>

                        {/* Support Info */}
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Need help? Contact our support team at{' '}
                                <a 
                                    href="mailto:support@datilio.com" 
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    support@datilio.com
                                </a>
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </Container>
    );
};

export default PaymentSuccessPage;
