import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ApiError } from '@/utils/errorHandler';

interface ErrorContextType {
  errors: ApiError[];
  isLoading: boolean;
  addError: (error: ApiError) => void;
  removeError: (errorId: number) => void;
  clearErrors: () => void;
  handleApiError: (error: ApiError) => void;
  setLoading: (loading: boolean) => void;
}

interface ErrorWithId extends ApiError {
  id: number;
  timestamp: Date;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorWithId[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Add error to the list
  const addError = useCallback((error: ApiError) => {
    const errorWithId: ErrorWithId = {
      ...error,
      id: Date.now() + Math.random(),
      timestamp: new Date()
    };
    
    setErrors(prev => [...prev, errorWithId]);
    
    // Auto-remove non-critical errors after 5 seconds
    if (!error.isCritical) {
      setTimeout(() => {
        removeError(errorWithId.id);
      }, 5000);
    }
  }, []);

  // Remove error by ID
  const removeError = useCallback((errorId: number) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Handle API errors
  const handleApiError = useCallback((error: ApiError) => {
    addError(error);
  }, [addError]);

  // Set loading state
  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const value: ErrorContextType = {
    errors,
    isLoading,
    addError,
    removeError,
    clearErrors,
    handleApiError,
    setLoading
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};
