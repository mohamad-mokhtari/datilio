import React, { useState, useEffect } from 'react';
import { SyntheticDataRequest } from '@/services/SyntheticDataService';
import { SyntheticDataService, ServiceError, TaskStatus as TaskStatusType } from '@/services/SyntheticDataService';
import TaskStatus from './TaskStatus';
import ErrorDialog from './ErrorDialog';
import Button from '@/components/ui/Button';
import { Play, Square, RefreshCw } from 'lucide-react';

interface SyntheticDataGeneratorProps {
  data: SyntheticDataRequest;
  onSuccess?: (result: any) => void;
  onError?: (error: ServiceError) => void;
  className?: string;
}

const SyntheticDataGenerator: React.FC<SyntheticDataGeneratorProps> = ({
  data,
  onSuccess,
  onError,
  className = ''
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskStatusType | null>(null);
  const [error, setError] = useState<ServiceError | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [taskHistory, setTaskHistory] = useState<TaskStatusType[]>([]);

  // Load task history on component mount
  useEffect(() => {
    loadTaskHistory();
  }, []);

  const loadTaskHistory = async () => {
    try {
      const tasks = await SyntheticDataService.getUserTasks();
      setTaskHistory(tasks);
    } catch (err) {
      console.error('Failed to load task history:', err);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setCurrentTask(null);
    setShowErrorDialog(false);

    try {
      const response = await SyntheticDataService.generateSyntheticData(data);
      
      if (response.task_id) {
        setCurrentTask({
          id: response.task_id,
          status: 'pending',
          message: 'Task queued successfully'
        });
      } else {
        // Immediate success
        onSuccess?.(response);
        setIsGenerating(false);
      }
    } catch (err) {
      const serviceError = err as ServiceError;
      setError(serviceError);
      setShowErrorDialog(true);
      onError?.(serviceError);
      setIsGenerating(false);
    }
  };

  const handleRetry = async (task?: TaskStatusType) => {
    if (task) {
      // Retry specific task
      try {
        const response = await SyntheticDataService.retryTask(task.id);
        if (response.task_id) {
          setCurrentTask({
            id: response.task_id,
            status: 'pending',
            message: 'Task retried successfully'
          });
        }
      } catch (err) {
        const serviceError = err as ServiceError;
        setError(serviceError);
        setShowErrorDialog(true);
      }
    } else {
      // Retry current generation
      handleGenerate();
    }
  };

  const handleContactSupport = (task?: TaskStatusType) => {
    // Open support dialog or redirect to support page
    const supportData = {
      error: error,
      task: task || currentTask,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    // You can implement your support system here
    console.log('Contact support with data:', supportData);
    
    // For now, just show an alert
    alert('Support contact functionality would be implemented here. Error details have been logged.');
  };

  const handleCancelTask = async () => {
    if (currentTask) {
      try {
        await SyntheticDataService.cancelTask(currentTask.id);
        setCurrentTask(null);
        setIsGenerating(false);
      } catch (err) {
        console.error('Failed to cancel task:', err);
      }
    }
  };

  const handleTaskComplete = (task: TaskStatusType) => {
    if (task.status === 'success') {
      onSuccess?.(task.result);
      setIsGenerating(false);
      setCurrentTask(null);
      loadTaskHistory(); // Refresh task history
    } else if (task.status === 'failure') {
      setIsGenerating(false);
      // TaskError component will handle the display
    }
  };

  return (
    <div className={`synthetic-data-generator ${className}`}>
      {/* Generation Controls */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="solid"
            color="blue"
            onClick={handleGenerate}
            disabled={isGenerating}
            loading={isGenerating}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate Data'}
          </Button>

          {currentTask && currentTask.status === 'running' && (
            <Button
              variant="default"
              color="red"
              onClick={handleCancelTask}
              className="flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Cancel
            </Button>
          )}

          <Button
            variant="default"
            color="gray"
            onClick={loadTaskHistory}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Current Task Status */}
      {currentTask && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Current Task
          </h3>
          <TaskStatus
            taskId={currentTask.id}
            onRetry={handleRetry}
            onContactSupport={handleContactSupport}
            className="mb-4"
          />
        </div>
      )}

      {/* Task History */}
      {taskHistory.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Recent Tasks
          </h3>
          <div className="space-y-3">
            {taskHistory.slice(0, 5).map((task) => (
              <div key={task.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Task #{task.id.slice(-8)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.status === 'success' ? 'bg-green-100 text-green-800' :
                    task.status === 'failure' ? 'bg-red-100 text-red-800' :
                    task.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {task.status}
                  </span>
                </div>
                
                {task.status === 'failure' && (
                  <TaskStatus
                    taskId={task.id}
                    onRetry={handleRetry}
                    onContactSupport={handleContactSupport}
                  />
                )}
                
                {task.status === 'success' && task.message && (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {task.message}
                  </p>
                )}
                
                {task.status === 'pending' && task.message && (
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {task.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        error={error}
        onRetry={handleRetry}
        onContactSupport={handleContactSupport}
      />
    </div>
  );
};

export default SyntheticDataGenerator;
