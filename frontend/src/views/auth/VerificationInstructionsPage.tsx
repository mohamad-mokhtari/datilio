import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Container from '@/components/shared/Container';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import EmailVerificationService from '@/services/EmailVerificationService';
import { HiOutlineMail, HiOutlineCheckCircle, HiOutlineArrowRight, HiOutlineRefresh } from 'react-icons/hi';

const VerificationInstructionsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [resendLoading, setResendLoading] = useState(false);
  
  // Get email from location state or use a default
  const userEmail = location.state?.email || 'your email';

  const handleResendVerification = async () => {
    try {
      setResendLoading(true);
      const response = await EmailVerificationService.resendVerificationEmail(userEmail);
      
      if (response.email_sent) {
        toast.push(
          <Notification title="Success" type="success">
            Verification email sent to {userEmail}! Please check your inbox.
          </Notification>
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend verification email';
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoToSignIn = () => {
    navigate('/sign-in');
  };

  return (
    <Container>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card className="p-8">
            <div className="text-center">
              {/* Success Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                <HiOutlineCheckCircle className="w-8 h-8 text-green-600" />
              </div>

              {/* Main Message */}
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Account Created Successfully!
              </h2>
              
              <p className="text-gray-600 mb-6">
                We've sent a verification email to <strong>{userEmail}</strong>. 
                Please check your inbox and click the verification link to activate your account.
              </p>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <HiOutlineMail className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-left">
                    <h4 className="font-medium text-blue-900 mb-2">
                      What to do next:
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                      <li>Check your email inbox</li>
                      <li>Look for an email from Datilio</li>
                      <li>Click the verification link in the email</li>
                      <li>Return here and sign in to your account</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  variant="solid"
                  onClick={handleResendVerification}
                  loading={resendLoading}
                  icon={<HiOutlineRefresh />}
                  className="w-full"
                >
                  Resend Verification Email
                </Button>
                
                <Button
                  variant="plain"
                  onClick={handleGoToSignIn}
                  icon={<HiOutlineArrowRight />}
                  className="w-full"
                >
                  Go to Sign In
                </Button>
              </div>

              {/* Help Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2">
                  Didn't receive the email?
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Check your spam/junk folder</li>
                  <li>• Make sure you entered the correct email address</li>
                  <li>• Wait a few minutes for the email to arrive</li>
                </ul>
                <p className="text-xs text-gray-500 mt-3">
                  Still having issues?{' '}
                  <a 
                    href="mailto:support@datilio.com" 
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Contact Support
                  </a>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
};

export default VerificationInstructionsPage;
