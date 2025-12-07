import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailVerificationService from '@/services/EmailVerificationService';
import { useAppSelector } from '@/store/hook';

interface UseEmailVerificationReturn {
  isVerified: boolean | null;
  isLoading: boolean;
  checkVerification: () => Promise<void>;
  showVerificationModal: boolean;
  setShowVerificationModal: (show: boolean) => void;
}

export const useEmailVerification = (): UseEmailVerificationReturn => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const checkVerification = async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await EmailVerificationService.getVerificationStatus();
      setIsVerified(response.is_verified);
      
      // Show modal if not verified
      if (!response.is_verified) {
        setShowVerificationModal(true);
      }
    } catch (error) {
      console.error('Failed to check email verification status:', error);
      // If we can't check status, assume not verified for safety
      setIsVerified(false);
      setShowVerificationModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      checkVerification();
    } else {
      setIsLoading(false);
      setIsVerified(null);
      setShowVerificationModal(false);
    }
  }, [isAuthenticated]);

  return {
    isVerified,
    isLoading,
    checkVerification,
    showVerificationModal,
    setShowVerificationModal,
  };
};

export default useEmailVerification;
