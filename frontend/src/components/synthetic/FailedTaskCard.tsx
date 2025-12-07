import React from 'react';
import Button from '@/components/ui/Button';
import { RefreshCw, HelpCircle, CheckCircle, AlertTriangle, Settings, Clock } from 'lucide-react';
import { FailedTask } from './types';

interface FailedTaskCardProps {
  task: FailedTask;
  onRetry: (taskId: string) => void;
  onViewData: (task: FailedTask) => void;
  onContactSupport: (task: FailedTask) => void;
  isRetrying?: boolean;
  className?: string;
}

const FailedTaskCard: React.FC<FailedTaskCardProps> = ({
  task,
  onRetry,
  onViewData,
  onContactSupport,
  isRetrying = false,
  className = ''
}) => {
  const getFailureIcon = (type: string) => {
    switch (type) {
      case 'service_unavailable': return <Settings className="w-5 h-5" />;
      case 'worker_timeout': return <Clock className="w-5 h-5" />;
      case 'processing_error': return <AlertTriangle className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getFailureTitle = (type: string) => {
    switch (type) {
      case 'service_unavailable': return 'Service Unavailable';
      case 'worker_timeout': return 'Worker Timeout';
      case 'processing_error': return 'Processing Error';
      default: return 'Task Failed';
    }
  };

  const getFailureHelp = (type: string) => {
    switch (type) {
      case 'service_unavailable':
        return 'Our background processing system was temporarily down. The service is now available.';
      case 'worker_timeout':
        return 'No processing workers were available. Workers may have been busy or offline.';
      case 'processing_error':
        return 'The task failed during processing. This may be due to invalid data configuration.';
      default:
        return 'An unexpected error occurred.';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // If task was successfully retried, show success state
  if (task.has_successful_retry) {
    return (
      <div className={`failed-task-card success-retry ${className}`}>
        <div className="card-header">
          <div className="task-info">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {task.task_name}
            </h3>
            <span className="status-badge resolved">
              <CheckCircle className="w-4 h-4 mr-1" />
              Resolved
            </span>
          </div>
          <span className="created-date text-sm text-gray-500 dark:text-gray-400">
            {formatDate(task.created_at)}
          </span>
        </div>
        
        <div className="card-body">
          <div className="original-error mb-4">
            <p className="label text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Original error:
            </p>
            <p className="error-text text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg font-mono">
              {task.error_message}
            </p>
          </div>
          
          <div className="success-box">
            <div className="success-header">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800 dark:text-green-200">
                Successfully retried!
              </span>
            </div>
            <p className="success-text text-sm text-green-700 dark:text-green-300 mt-2">
              This task was successfully completed after {task.retry_attempts_count} retry attempt(s).
            </p>
            {task.successful_retry_result && (
              <div className="mt-3 text-sm text-green-600 dark:text-green-400">
                <p>📊 Generated: {task.successful_retry_result.rows_generated} rows</p>
                <p>📁 File: {task.successful_retry_result.filename}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="card-actions">
          <Button
            variant="solid"
            color="green"
            onClick={() => onViewData(task)}
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            View Generated Data
          </Button>
        </div>
      </div>
    );
  }

  // Show failed task with retry option
  return (
    <div className={`failed-task-card ${className}`}>
      <div className="card-header">
        <div className="task-info">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {task.task_name}
          </h3>
          <span className="status-badge error">
            {getFailureIcon(task.failure_type)}
            <span className="ml-1">{getFailureTitle(task.failure_type)}</span>
          </span>
        </div>
        <span className="created-date text-sm text-gray-500 dark:text-gray-400">
          {formatDate(task.created_at)}
        </span>
      </div>
      
      <div className="card-body">
        <div className="error-details">
          <p className="error-message text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg font-mono mb-4">
            {task.error_message}
          </p>
          
          <div className={`help-box ${task.failure_type}`}>
            <div className="help-icon text-orange-600 dark:text-orange-400">
              {getFailureIcon(task.failure_type)}
            </div>
            <div className="help-content">
              <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
                {getFailureHelp(task.failure_type)}
              </p>
              
              {task.retry_attempts_count > 0 && (
                <p className="retry-info text-sm font-medium text-orange-900 dark:text-orange-100 mb-2">
                  ⚠️ Already retried {task.retry_attempts_count} time(s) without success.
                </p>
              )}
              
              {task.failure_type === 'processing_error' && task.retry_attempts_count >= 2 ? (
                <p className="suggestion text-sm font-medium text-orange-900 dark:text-orange-100">
                  💡 Consider reviewing your data configuration or contacting support.
                </p>
              ) : (
                <p className="suggestion text-sm font-medium text-orange-900 dark:text-orange-100">
                  💡 Click "Retry" to try generating this data again.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="card-actions">
        <Button
          variant="solid"
          color="blue"
          onClick={() => onRetry(task.id)}
          disabled={isRetrying || !task.can_retry}
          loading={isRetrying}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {isRetrying ? 'Retrying...' : 'Retry Task'}
        </Button>
        
        {task.retry_attempts_count >= 2 && (
          <Button
            variant="outline"
            color="blue"
            onClick={() => onContactSupport(task)}
            className="flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            Contact Support
          </Button>
        )}
      </div>
    </div>
  );
};

export default FailedTaskCard;
