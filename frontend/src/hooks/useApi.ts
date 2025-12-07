import { useState, useCallback } from 'react';
import { useError } from '@/contexts/ErrorContext';
import apiClient from '@/utils/apiClient';
import { ApiError } from '@/utils/errorHandler';

interface UseApiOptions {
  showGlobalLoading?: boolean;
  showErrorToast?: boolean;
}

export const useApi = (options: UseApiOptions = {}) => {
  const { showGlobalLoading = true, showErrorToast = true } = options;
  const [loading, setLoading] = useState(false);
  const { handleApiError, setLoading: setGlobalLoading } = useError();

  const execute = useCallback(async <T>(
    apiCall: () => Promise<T>,
    customOptions: UseApiOptions = {}
  ): Promise<T> => {
    const finalOptions = { ...options, ...customOptions };
    
    try {
      if (finalOptions.showGlobalLoading) {
        setLoading(true);
        setGlobalLoading(true);
      }

      const result = await apiCall();
      return result;

    } catch (error) {
      if (finalOptions.showErrorToast) {
        handleApiError(error as ApiError);
      }
      throw error;
    } finally {
      if (finalOptions.showGlobalLoading) {
        setLoading(false);
        setGlobalLoading(false);
      }
    }
  }, [handleApiError, setGlobalLoading, options]);

  return {
    loading,
    execute
  };
};

// Specific hooks for common operations
export const useAuth = () => {
  const { execute, loading } = useApi();

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    return execute(() => apiClient.post('/auth/login', credentials));
  }, [execute]);

  const register = useCallback(async (userData: any) => {
    return execute(() => apiClient.post('/auth/register', userData));
  }, [execute]);

  const logout = useCallback(async () => {
    return execute(() => apiClient.post('/auth/logout'));
  }, [execute]);

  const resendVerification = useCallback(async (email: string) => {
    return execute(() => apiClient.post('/auth/resend-verification', { email }));
  }, [execute]);

  const verifyEmail = useCallback(async (token: string) => {
    return execute(() => apiClient.post('/email-verification/verify', { token }));
  }, [execute]);

  const resendVerificationByToken = useCallback(async (token: string) => {
    return execute(() => apiClient.post('/email-verification/resend-by-token', { token }));
  }, [execute]);

  return {
    login,
    register,
    logout,
    resendVerification,
    verifyEmail,
    resendVerificationByToken,
    loading
  };
};

export const useData = () => {
  const { execute, loading } = useApi();

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return execute(() => apiClient.upload('/data/users/upload-file', formData));
  }, [execute]);

  const getFiles = useCallback(async () => {
    return execute(() => apiClient.get('/data/users/files'));
  }, [execute]);

  const deleteFile = useCallback(async (fileId: string) => {
    return execute(() => apiClient.delete(`/data/users/files/${fileId}`));
  }, [execute]);

  return {
    uploadFile,
    getFiles,
    deleteFile,
    loading
  };
};

export const useFeedback = () => {
  const { execute, loading } = useApi();

  const getFeedbacks = useCallback(async () => {
    return execute(() => apiClient.get('/feedback'));
  }, [execute]);

  const getFeedback = useCallback(async (feedbackId: string) => {
    return execute(() => apiClient.get(`/feedback/${feedbackId}`));
  }, [execute]);

  const createFeedback = useCallback(async (feedbackData: any) => {
    return execute(() => apiClient.post('/feedback', feedbackData));
  }, [execute]);

  const addMessage = useCallback(async (feedbackId: string, messageData: any, imageFile?: File) => {
    if (imageFile) {
      const formData = new FormData();
      formData.append('message', messageData.message);
      if (imageFile) {
        formData.append('image_file', imageFile);
      }
      return execute(() => apiClient.upload(`/feedback/${feedbackId}/messages`, formData));
    } else {
      return execute(() => apiClient.post(`/feedback/${feedbackId}/messages`, messageData));
    }
  }, [execute]);

  return {
    getFeedbacks,
    getFeedback,
    createFeedback,
    addMessage,
    loading
  };
};
