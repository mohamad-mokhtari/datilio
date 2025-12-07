import React from 'react';
import Button from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, HelpCircle, Settings } from 'lucide-react';

interface TaskErrorProps {
  task: {
    status: string;
    message?: string;
    error?: string;
    retry_count?: number;
    failure_reason?: string;
    minutes_pending?: number;
    warning?: string;
  };
  onRetry: (task?: any) => void;
  onContactSupport: (task?: any) => void;
  className?: string;
}

const TaskError: React.FC<TaskErrorProps> = ({
  task,
  onRetry,
  onContactSupport,
  className = ''
}) => {
  
  // Scenario 1: Service Unavailable (shown immediately on API call failure)
  const ServiceUnavailableError = ({ error }: { error: any }) => (
    <div className={`error-dialog service-unavailable ${className}`}>
      <div className="error-header">
        <div className="error-icon">
          <Settings className="w-6 h-6" />
        </div>
        <h3>Service Temporarily Unavailable</h3>
      </div>
      
      <div className="error-body">
        <p>{error?.detail?.message || error?.message || 'Our background processing system is temporarily unavailable.'}</p>
        <p>If the issue persists, please contact support.</p>
      </div>
      
      <div className="error-actions">
        <Button
          variant="solid"
          color="orange"
          onClick={() => onRetry()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
        <Button
            variant="default"
          color="orange"
          onClick={() => onContactSupport()}
          className="flex items-center gap-2"
        >
          <HelpCircle className="w-4 h-4" />
          Contact Support
        </Button>
      </div>
    </div>
  );
  
  // Scenario 2: No Workers (shown in task list after 5 min)
  const NoWorkersError = () => (
    <div className={`task-error no-workers ${className}`}>
      <div className="error-header">
        <span className="status-badge error">❌ Failed</span>
        <span className="error-reason">No Workers Available</span>
      </div>
      
      <div className="error-body">
        <p className="error-message">{task.error}</p>
        
        <div className="help-box system-issue">
          <div className="help-icon">
            <Settings className="w-5 h-5" />
          </div>
          <div className="help-content">
            <h4>System Issue Detected</h4>
            <p>
              Our background processing system is currently unavailable. 
              This is usually temporary and resolves within a few minutes.
            </p>
            <p><strong>What you can do:</strong></p>
            <ul>
              <li>Wait a few minutes and try again</li>
              <li>Contact support if issue persists</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="error-actions">
        <Button
          variant="solid"
          color="blue"
          onClick={() => onRetry(task)}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
        <Button
            variant="default"
          color="blue"
          onClick={() => onContactSupport(task)}
          className="flex items-center gap-2"
        >
          <HelpCircle className="w-4 h-4" />
          Contact Support
        </Button>
      </div>
    </div>
  );
  
  // Scenario 3: Processing Error (shown in task list)
  const ProcessingError = () => (
    <div className={`task-error processing-error ${className}`}>
      <div className="error-header">
        <span className="status-badge error">❌ Failed</span>
        <span className="error-reason">Retried {task.retry_count || 0} times</span>
      </div>
      
      <div className="error-body">
        <p className="error-message">{task.error}</p>
        
        <div className="help-box retry-info">
          <div className="help-icon">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="help-content">
            <h4>Auto-Retry Information</h4>
            <p>
              This task was automatically retried {task.retry_count || 0} times 
              but still failed. This may indicate an issue with your 
              data configuration.
            </p>
            <p><strong>What you can do:</strong></p>
            <ul>
              <li>Review your column configuration</li>
              <li>Try with fewer rows first</li>
              <li>Contact support for assistance</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="error-actions">
        <Button
          variant="solid"
          color="blue"
          onClick={() => onRetry(task)}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Task
        </Button>
        <Button
            variant="default"
          color="blue"
          onClick={() => onContactSupport(task)}
          className="flex items-center gap-2"
        >
          <HelpCircle className="w-4 h-4" />
          Contact Support
        </Button>
      </div>
    </div>
  );
  
  // Pending with warning (3-5 min)
  const PendingWithWarning = () => (
    <div className={`task-pending has-warning ${className}`}>
      <div className="status">⏸️ Queued ({task.minutes_pending} min)</div>
      <div className="warning-box">
        <span className="warning-icon">⚠️</span>
        <span className="warning-text">{task.warning}</span>
      </div>
    </div>
  );
  
  // Render appropriate error based on failure_reason
  if (task.status === 'pending' && task.warning) {
    return <PendingWithWarning />;
  }
  
  if (task.status === 'failure') {
    if (task.failure_reason === 'no_workers') {
      return <NoWorkersError />;
    } else if (task.failure_reason === 'processing_error') {
      return <ProcessingError />;
    } else {
      return <ProcessingError />; // Default to processing error
    }
  }
  
  return null;
};

export default TaskError;
