import { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import EmailVerificationService from '@/services/EmailVerificationService';
import { HiOutlineMail, HiOutlineX, HiOutlineCheckCircle, HiOutlineExclamation } from 'react-icons/hi';

interface VerificationRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

const VerificationRequiredModal = ({ isOpen, onClose, userEmail }: VerificationRequiredModalProps) => {
  const [resendLoading, setResendLoading] = useState(false);

  const handleResendVerification = async () => {
    try {
      setResendLoading(true);
      const response = await EmailVerificationService.resendVerificationEmail(userEmail || '');
      
      if (response.email_sent) {
        toast.push(
          <Notification title="Success" type="success">
            Verification email sent! Please check your inbox.
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

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={500} closable={false}>
      <div className="text-center">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <HiOutlineExclamation className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Email Verification Required</h3>
          </div>
          <Button
            variant="plain"
            size="sm"
            icon={<HiOutlineX />}
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HiOutlineMail className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="text-left">
                <h4 className="font-medium text-orange-900 mb-1">
                  Verify Your Email Address
                </h4>
                <p className="text-sm text-orange-700">
                  To access all features of Datilio, please verify your email address first.
                  {userEmail && (
                    <span className="block mt-1 font-medium">
                      Email: {userEmail}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="text-left space-y-3">
            <h5 className="font-medium text-gray-900">What you need to do:</h5>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Check your email inbox for a verification message</li>
              <li>Click the verification link in the email</li>
              <li>If you don't see the email, check your spam folder</li>
              <li>Return to this page after verification</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HiOutlineCheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-left">
                <h4 className="font-medium text-blue-900 mb-1">
                  Need Help?
                </h4>
                <p className="text-sm text-blue-700">
                  If you're having trouble finding the verification email, we can send you a new one.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="plain"
            onClick={onClose}
            className="flex-1"
          >
            I'll Check My Email
          </Button>
          <Button
            variant="solid"
            onClick={handleResendVerification}
            loading={resendLoading}
            icon={<HiOutlineMail />}
            className="flex-1"
          >
            Resend Email
          </Button>
        </div>

        {/* Support Link */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
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
    </Dialog>
  );
};

export default VerificationRequiredModal;
