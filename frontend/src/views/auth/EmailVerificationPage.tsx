import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Container from '@/components/shared/Container';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useAuth } from '@/hooks/useApi';
import EmailVerificationService from '@/services/EmailVerificationService';
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineMail, HiOutlineRefresh, HiOutlineExclamation } from 'react-icons/hi';

type VerificationState = 'loading' | 'success' | 'error' | 'idle';

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail: verifyEmailApi, resendVerificationByToken, loading: apiLoading } = useAuth();
  const [state, setState] = useState<VerificationState>('loading');
  const [error, setError] = useState<string>('');
  const [hasVerified, setHasVerified] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const hasCalledVerify = useRef<boolean>(false);
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setState('error');
      setError('No verification token provided');
      return;
    }

    // Only verify if we haven't already called verify and have a token
    if (!hasCalledVerify.current && token) {
      hasCalledVerify.current = true;
      verifyEmail(token);
    }
  }, [token]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (countdown === 0 && state === 'success') {
      navigate('/sign-in');
    }
  }, [countdown, state, navigate]);

  const startCountdown = () => {
    setCountdown(10);
  };

  const verifyEmail = async (verificationToken: string) => {
    try {
      setState('loading');
      setHasVerified(true); // Mark as attempted to prevent duplicate calls
      const response = await verifyEmailApi(verificationToken);
      
      // Debug: Log the response to understand the structure
      console.log('Verification response:', response);
      
      // Check for success in the response (API returns success: true)
      if (response.success || response.verified) {
        setState('success');
        toast.push(
          <Notification title="Success" type="success">
            Email verified successfully! Redirecting to sign-in...
          </Notification>
        );
        
        // Start countdown timer
        startCountdown();
      } else {
        setState('error');
        setError('Email verification failed');
      }
    } catch (err: any) {
      setState('error');
      let errorMessage = err instanceof Error ? err.message : 'Verification failed';
      
      // Handle "already used" token error gracefully
      if (errorMessage.includes('already used') || errorMessage.includes('already verified')) {
        setState('success');
        toast.push(
          <Notification title="Success" type="success">
            Email already verified! Redirecting to sign-in...
          </Notification>
        );
        
        // Start countdown timer
        startCountdown();
        return;
      }
      
      setError(errorMessage);
      
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    }
  };

  const handleResendEmail = async () => {
    // First try to use token if available
    if (token) {
      try {
        const response = await resendVerificationByToken(token);
        
        if (response.success) {
          toast.push(
            <Notification title="Success" type="success">
              {response.message || 'Verification email sent! Please check your inbox.'}
            </Notification>
          );
        }
        return;
      } catch (error) {
        // Error is automatically handled by the error context
        console.log('Resend verification by token failed:', error);
        return;
      }
    }

    // If no token, check for email_keeper in sessionStorage
    const storedEmail = sessionStorage.getItem('email_keeper');
    
    if (storedEmail) {
      try {
        const response = await EmailVerificationService.resendVerificationByEmail(storedEmail);
        
        if (response.success) {
          toast.push(
            <Notification title="Success" type="success">
              {response.message || `Verification email sent to ${storedEmail}! Please check your inbox.`}
            </Notification>
          );
        }
        return;
      } catch (error) {
        // Error is automatically handled by the error context
        console.log('Resend verification by email failed:', error);
        return;
      }
    }

    // If neither token nor email exists, show user-friendly message
    toast.push(
      <Notification title="Error" type="danger">
        No verification token or email address found. Please try signing in again or contact support.
      </Notification>
    );
  };

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Your Email</h2>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <HiOutlineCheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-4">
              Your email has been successfully verified. You can now sign in to your account.
            </p>
            {countdown > 0 && (
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Redirecting automatically in:</p>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {countdown}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <Button
                variant="solid"
                onClick={() => navigate('/sign-in')}
                className="w-full"
              >
                Go to Sign In {countdown > 0 && `(${countdown}s)`}
              </Button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <HiOutlineExclamation className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verification Required</h2>
            <p className="text-gray-600 mb-6">
              {error || (token 
                ? 'We couldn\'t verify your email. The link may have expired or is invalid. Click below to resend a new verification email.'
                : 'No verification token found. We\'ll try to resend a verification email using your stored email address.'
              )}
            </p>
            <div className="space-y-3">
              <Button
                variant="solid"
                onClick={handleResendEmail}
                loading={apiLoading}
                icon={<HiOutlineMail />}
                className="w-full"
              >
                {token ? 'Resend Verification Email' : 'Send Verification Email'}
              </Button>
              <Button
                variant="plain"
                onClick={() => navigate('/sign-in')}
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Container>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card className="p-8">
            {renderContent()}
          </Card>
          
          {/* Help Section */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Need help? Check your spam folder or{' '}
              <a href="mailto:support@datilio.com" className="text-blue-600 hover:text-blue-500">
                contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default EmailVerificationPage;
