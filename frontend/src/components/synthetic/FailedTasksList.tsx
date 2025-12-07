import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { RefreshCw, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { FailedTask } from './types';
import { SyntheticDataService } from '@/services/SyntheticDataService';
import RetryTaskModal from './RetryTaskModal';

interface FailedTasksListProps {
  onRetrySuccess?: (newTaskId: string) => void;
  onViewData?: (dataId: string) => void;
  onEndpointNotAvailable?: () => void;
  className?: string;
  refreshTrigger?: number;
}

const FailedTasksList: React.FC<FailedTasksListProps> = ({
  onRetrySuccess,
  onViewData,
  onEndpointNotAvailable,
  className = '',
  refreshTrigger = 0
}) => {
  const [failedTasks, setFailedTasks] = useState<FailedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryModal, setRetryModal] = useState<{
    isOpen: boolean;
    task: FailedTask | null;
  }>({ isOpen: false, task: null });
  
  useEffect(() => {
    fetchFailedTasks();
  }, []);

  // Auto-refresh when refreshTrigger changes (e.g., when a task fails)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchFailedTasks();
    }
  }, [refreshTrigger]);
  
  const fetchFailedTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await SyntheticDataService.getFailedTasks(20, 0);
      // Filter out tasks that have been successfully retried
      const filteredTasks = (data.failed_tasks || []).filter(task => !task.has_successful_retry);
      setFailedTasks(filteredTasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch failed tasks';
      setError(errorMessage);
      
      // If endpoint is not available, notify parent component
      if (errorMessage.includes('endpoint not available') || errorMessage.includes('coming soon')) {
        onEndpointNotAvailable?.();
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleRetry = (task: FailedTask) => {
    setRetryModal({ isOpen: true, task });
  };

  const handleRetrySuccess = (newTaskId: string) => {
    // Call success callback if provided
    if (onRetrySuccess) {
      onRetrySuccess(newTaskId);
    }
    
    // Refresh the failed tasks list
    fetchFailedTasks();
    
    // Close modal
    setRetryModal({ isOpen: false, task: null });
  };

  const handleCloseRetryModal = () => {
    setRetryModal({ isOpen: false, task: null });
  };
  
  
  const handleContactSupport = (task: FailedTask) => {
    // You can implement your support system here
    const supportData = {
      taskId: task.id,
      taskName: task.task_name,
      errorMessage: task.error_message,
      failureType: task.failure_type,
      retryAttempts: task.retry_attempts_count,
      timestamp: new Date().toISOString()
    };
    
    console.log('Contact support with data:', supportData);
    
    // For now, just show an alert - you can replace this with your support system
    alert(`Support contact functionality would be implemented here.\n\nTask: ${task.task_name}\nError: ${task.error_message}\nRetry attempts: ${task.retry_attempts_count}`);
  };

  if (loading) {
    return (
      <Card header="Failed Tasks" headerBorder className={className}>
        <div className="text-center py-8">
          <Spinner size="lg" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading failed tasks...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    const isEndpointNotAvailable = error.includes('endpoint not available') || error.includes('coming soon');
    
    return (
      <Card header="Failed Tasks" headerBorder className={className}>
        <div className="text-center py-8">
          <div className={`mb-4 ${isEndpointNotAvailable ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">
              {isEndpointNotAvailable ? 'Feature Coming Soon' : 'Failed to load tasks'}
            </p>
            <p className="text-sm">{error}</p>
            {isEndpointNotAvailable && (
              <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">
                The failed tasks feature is currently being developed by our backend team.
              </p>
            )}
          </div>
          {!isEndpointNotAvailable && (
            <Button
              variant="default"
              color="red"
              onClick={fetchFailedTasks}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (failedTasks.length === 0) {
    return (
      <Card header="Failed Tasks" headerBorder className={className}>
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm">No failed tasks - all completed successfully</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      header={
        <div className="flex items-center justify-between">
          <span>Failed Tasks</span>
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-xs font-medium rounded-full">
              {failedTasks.length} task{failedTasks.length !== 1 ? 's' : ''}
            </span>
            <Button
              size="sm"
              variant="default"
              color="gray"
              onClick={fetchFailedTasks}
              className="flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </Button>
          </div>
        </div>
      } 
      headerBorder 
      className={className}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Task</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Error</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Created</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Retries</th>
              <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {failedTasks.map(task => (
              <tr key={task.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {task.task_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {task.input_params?.num_rows} rows • {task.input_params?.csv_file_name}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="max-w-xs">
                    <div className="text-sm text-gray-900 dark:text-white truncate" title={task.error_message}>
                      {task.error_message}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {task.failure_type.replace('_', ' ')}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {new Date(task.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(task.created_at).toLocaleTimeString()}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200">
                    {task.retry_attempts_count} attempt{task.retry_attempts_count !== 1 ? 's' : ''}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-2">
                    {task.can_retry && (
                      <Button
                        size="sm"
                        variant="default"
                        color="blue"
                        onClick={() => handleRetry(task)}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="default"
                      color="gray"
                      onClick={() => handleContactSupport(task)}
                      className="flex items-center gap-1"
                    >
                      <HelpCircle className="w-3 h-3" />
                      Help
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Retry Modal */}
      <RetryTaskModal
        task={retryModal.task}
        isOpen={retryModal.isOpen}
        onClose={handleCloseRetryModal}
        onRetrySuccess={handleRetrySuccess}
      />
    </Card>
  );
};

export default FailedTasksList;
