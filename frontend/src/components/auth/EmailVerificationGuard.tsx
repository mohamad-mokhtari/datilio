import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useEmailVerification from '@/hooks/useEmailVerification';
import VerificationRequiredModal from './VerificationRequiredModal';
import { useAppSelector } from '@/store/hook';

interface EmailVerificationGuardProps {
  children: React.ReactNode;
}

const EmailVerificationGuard = ({ children }: EmailVerificationGuardProps) => {
  const location = useLocation();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { 
    isVerified, 
    isLoading, 
    showVerificationModal, 
    setShowVerificationModal 
  } = useEmailVerification();

  // Skip verification check for certain routes
  const skipVerificationRoutes = [
    '/verify-email',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password'
  ];

  const shouldSkipVerification = skipVerificationRoutes.some(route => 
    location.pathname.startsWith(route)
  );

  useEffect(() => {
    // Only check verification for authenticated users on protected routes
    if (isAuthenticated && !shouldSkipVerification && !isLoading) {
      if (isVerified === false) {
        setShowVerificationModal(true);
      }
    }
  }, [isAuthenticated, isVerified, isLoading, shouldSkipVerification, setShowVerificationModal]);

  // Show loading spinner while checking verification status
  if (isAuthenticated && !shouldSkipVerification && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking verification status...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <VerificationRequiredModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        userEmail={isAuthenticated ? 'user@example.com' : undefined} // You might want to get this from user state
      />
    </>
  );
};

export default EmailVerificationGuard;
