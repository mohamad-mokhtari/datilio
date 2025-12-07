import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import EmailVerificationService from '@/services/EmailVerificationService';
import { HiOutlineMail, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineRefresh } from 'react-icons/hi';

interface EmailVerificationStatusProps {
  className?: string;
  showResendButton?: boolean;
}

const EmailVerificationStatus = ({ className = '', showResendButton = true }: EmailVerificationStatusProps) => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      setLoading(true);
      const response = await EmailVerificationService.getVerificationStatus();
      setIsVerified(response.is_verified);
      setEmail(response.email);
    } catch (error) {
      console.error('Failed to check verification status:', error);
      // Don't show error toast for status check failures
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setResendLoading(true);
      const response = await EmailVerificationService.resendVerificationEmail(email);
      
      if (response.email_sent) {
        toast.push(
          <Notification title="Success" type="success">
            Verification email sent to {email}! Please check your inbox.
          </Notification>
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification email';
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setResendLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-500">Checking verification status...</span>
      </div>
    );
  }

  if (isVerified === null) {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        {isVerified ? (
          <>
            <HiOutlineCheckCircle className="w-5 h-5 text-green-600" />
            <Badge className="bg-green-100 text-green-800 border border-green-200">
              Email Verified
            </Badge>
          </>
        ) : (
          <>
            <HiOutlineXCircle className="w-5 h-5 text-red-600" />
            <Badge className="bg-red-100 text-red-800 border border-red-200">
              Email Not Verifiedddd
            </Badge>
          </>
        )}
      </div>
      
      {!isVerified && showResendButton && (
        <Button
          variant="plain"
          size="sm"
          onClick={handleResendVerification}
          loading={resendLoading}
          icon={<HiOutlineMail />}
          className="text-blue-600 hover:text-blue-700"
        >
          Resend Verification
        </Button>
      )}
      
      {!isVerified && (
        <Button
          variant="plain"
          size="sm"
          onClick={checkVerificationStatus}
          icon={<HiOutlineRefresh />}
          className="text-gray-600 hover:text-gray-700"
        >
          Refresh Status
        </Button>
      )}
    </div>
  );
};

export default EmailVerificationStatus;
