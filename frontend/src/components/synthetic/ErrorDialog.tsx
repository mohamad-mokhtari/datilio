import React from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import TaskError from './TaskError';
import { X, RefreshCw, HelpCircle, Settings, AlertTriangle } from 'lucide-react';
import { ServiceError } from '@/services/SyntheticDataService';

interface ErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  error: ServiceError | null;
  onRetry: () => void;
  onContactSupport: () => void;
  title?: string;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({
  isOpen,
  onClose,
  error,
  onRetry,
  onContactSupport,
  title
}) => {
  if (!error) return null;

  const getErrorIcon = () => {
    if (error.detail?.error_code === 'SERVICE_UNAVAILABLE' || error.error_code === 'SERVICE_UNAVAILABLE') {
      return <Settings className="w-8 h-8 text-orange-600" />;
    }
    if (error.detail?.error_code === 'QUOTA_EXCEEDED' || error.error_code === 'QUOTA_EXCEEDED') {
      return <AlertTriangle className="w-8 h-8 text-red-600" />;
    }
    return <AlertTriangle className="w-8 h-8 text-red-600" />;
  };

  const getErrorTitle = () => {
    if (error.detail?.error_code === 'SERVICE_UNAVAILABLE' || error.error_code === 'SERVICE_UNAVAILABLE') {
      return 'Service Temporarily Unavailable';
    }
    if (error.detail?.error_code === 'QUOTA_EXCEEDED' || error.error_code === 'QUOTA_EXCEEDED') {
      return 'Usage Quota Exceeded';
    }
    return title || 'Error Occurred';
  };

  const getErrorColor = () => {
    if (error.detail?.error_code === 'SERVICE_UNAVAILABLE' || error.error_code === 'SERVICE_UNAVAILABLE') {
      return 'orange';
    }
    if (error.detail?.error_code === 'QUOTA_EXCEEDED' || error.error_code === 'QUOTA_EXCEEDED') {
      return 'red';
    }
    return 'red';
  };

  const getErrorMessage = () => {
    return error.detail?.message || error.message || 'An unexpected error occurred. Please try again.';
  };

  const getErrorActions = () => {
    const color = getErrorColor();
    
    if (error.detail?.error_code === 'QUOTA_EXCEEDED' || error.error_code === 'QUOTA_EXCEEDED') {
      return (
        <div className="flex gap-3">
          <Button
            variant="solid"
            color={color}
            onClick={onContactSupport}
            className="flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            Upgrade Plan
          </Button>
          <Button
            variant="default"
            color={color}
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      );
    }

    return (
      <div className="flex gap-3">
        <Button
          variant="solid"
          color={color}
          onClick={onRetry}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
        <Button
          variant="default"
          color={color}
          onClick={onContactSupport}
          className="flex items-center gap-2"
        >
          <HelpCircle className="w-4 h-4" />
          Contact Support
        </Button>
        <Button
          variant="default"
          color="gray"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      width={500}
      closable={true}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {getErrorIcon()}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {getErrorTitle()}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Error Message */}
        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {getErrorMessage()}
          </p>
          
          {/* Additional context for quota errors */}
          {(error.detail?.error_code === 'QUOTA_EXCEEDED' || error.error_code === 'QUOTA_EXCEEDED') && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                What you can do:
              </h4>
              <ul className="text-blue-800 dark:text-blue-200 text-sm space-y-1">
                <li>• Upgrade your plan for higher limits</li>
                <li>• Wait for your quota to reset (usually monthly)</li>
                <li>• Contact support for assistance</li>
              </ul>
            </div>
          )}

          {/* Additional context for service unavailable */}
          {(error.detail?.error_code === 'SERVICE_UNAVAILABLE' || error.error_code === 'SERVICE_UNAVAILABLE') && (
            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">
                This is usually temporary:
              </h4>
              <ul className="text-orange-800 dark:text-orange-200 text-sm space-y-1">
                <li>• Our background processing system is being updated</li>
                <li>• Try again in a few minutes</li>
                <li>• Contact support if the issue persists</li>
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          {getErrorActions()}
        </div>
      </div>
    </Dialog>
  );
};

export default ErrorDialog;
