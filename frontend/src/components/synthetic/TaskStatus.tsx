import React, { useState, useEffect } from 'react';
import TaskError from './TaskError';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { TaskStatus as TaskStatusType } from '@/services/SyntheticDataService';

interface TaskStatusProps {
  taskId: string;
  onRetry: (task?: any) => void;
  onContactSupport: (task?: any) => void;
  className?: string;
}

// Use the TaskStatusType from the service
type Task = TaskStatusType;

const TaskStatus: React.FC<TaskStatusProps> = ({
  taskId,
  onRetry,
  onContactSupport,
  className = ''
}) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch task status
  const fetchTaskStatus = async (id: string): Promise<Task> => {
    const response = await fetch(`/api/v1/synthetic/tasks/${id}/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch task status: ${response.statusText}`);
    }

    return response.json();
  };

  // Poll task status
  useEffect(() => {
    if (!taskId) return;

    let interval: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const taskData = await fetchTaskStatus(taskId);
        setTask(taskData);
        setLoading(false);
        setError(null);

        // Stop polling if completed or failed
        if (['success', 'failure'].includes(taskData.status)) {
          clearInterval(interval);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch task status');
        setLoading(false);
        clearInterval(interval);
      }
    };

    // Initial fetch
    pollStatus();

    // Set up polling every 3 seconds
    interval = setInterval(pollStatus, 3000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [taskId]);

  if (loading) {
    return (
      <div className={`task-status loading ${className}`}>
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-blue-700">Loading task status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`task-status error ${className}`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">Failed to load task status: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className={`task-status not-found ${className}`}>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-gray-700">Task not found</span>
        </div>
      </div>
    );
  }

  // Success state
  if (task.status === 'success') {
    return (
      <div className={`task-status success ${className}`}>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <span className="text-green-700 font-medium">Task completed successfully!</span>
              {task.message && (
                <p className="text-green-600 text-sm mt-1">{task.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Running state
  if (task.status === 'running') {
    return (
      <div className={`task-status running ${className}`}>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <span className="text-blue-700 font-medium">Processing...</span>
              {task.message && (
                <p className="text-blue-600 text-sm mt-1">{task.message}</p>
              )}
              {task.progress !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-blue-600 text-xs mt-1">{task.progress}% complete</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending state
  if (task.status === 'pending') {
    return (
      <div className={`task-status pending ${className}`}>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <span className="text-yellow-700 font-medium">
                Queued {task.minutes_pending ? `(${task.minutes_pending} min)` : ''}
              </span>
              {task.message && (
                <p className="text-yellow-600 text-sm mt-1">{task.message}</p>
              )}
              {task.warning && (
                <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="text-yellow-700 text-sm">{task.warning}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Failure state - use TaskError component
  if (task.status === 'failure') {
    return (
      <div className={`task-status failure ${className}`}>
        <TaskError
          task={task}
          onRetry={onRetry}
          onContactSupport={onContactSupport}
        />
      </div>
    );
  }

  // Unknown state
  return (
    <div className={`task-status unknown ${className}`}>
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-gray-700">Unknown task status: {task.status}</span>
      </div>
    </div>
  );
};

export default TaskStatus;
