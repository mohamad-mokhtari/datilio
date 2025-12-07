import React from 'react';
import Container from '@/components/shared/Container';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { HiXCircle, HiHome, HiCreditCard, HiRefresh } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

const PaymentCancelPage: React.FC = () => {
    const navigate = useNavigate();

    const handleGoToPricing = () => {
        navigate('/pricing');
    };

    const handleGoToDashboard = () => {
        navigate('/dashboard');
    };

    const handleTryAgain = () => {
        navigate('/pricing');
    };

    return (
        <Container>
            <div className="min-h-screen flex items-center justify-center py-12">
                <Card className="w-full max-w-md mx-4">
                    <div className="p-8 text-center">
                        {/* Cancel Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                                <HiXCircle className="w-8 h-8 text-red-500" />
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            Payment Cancelled
                        </h1>

                        {/* Description */}
                        <p className="text-gray-600 dark:text-gray-400 mb-8">
                            Your payment was cancelled. No charges have been made to your account. 
                            You can try again anytime or explore our other plans.
                        </p>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <Button
                                variant="solid"
                                color="blue"
                                size="lg"
                                className="w-full"
                                onClick={handleTryAgain}
                                icon={<HiRefresh />}
                            >
                                Try Again
                            </Button>
                            
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full"
                                onClick={handleGoToPricing}
                                icon={<HiCreditCard />}
                            >
                                View All Plans
                            </Button>
                            
                            <Button
                                variant="plain"
                                size="lg"
                                className="w-full"
                                onClick={handleGoToDashboard}
                                icon={<HiHome />}
                            >
                                Go to Dashboard
                            </Button>
                        </div>

                        {/* Help Text */}
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Need help? Contact our support team for assistance with your payment.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </Container>
    );
};

export default PaymentCancelPage;
