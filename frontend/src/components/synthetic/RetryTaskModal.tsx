import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';
import { FailedTask } from './types';
import { SyntheticDataService } from '@/services/SyntheticDataService';

interface RetryTaskModalProps {
  task: FailedTask | null;
  isOpen: boolean;
  onClose: () => void;
  onRetrySuccess: (newTaskId: string) => void;
}

const RetryTaskModal: React.FC<RetryTaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onRetrySuccess
}) => {
  const [filename, setFilename] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && task) {
      // Suggest a default filename
      const originalFilename = task.input_params?.csv_file_name || 'synthetic_data.csv';
      const suggestedFilename = originalFilename.replace('.csv', '_retry.csv');
      setFilename(suggestedFilename);
      setError(null);
    } else {
      setFilename('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen, task]);

  const handleRetry = async () => {
    if (!task) return;

    setLoading(true);
    setError(null);

    try {
      const result = await SyntheticDataService.retryFailedTask(task.id, filename);
      
      // Success!
      onRetrySuccess(result.new_task_id);
      onClose();
      
    } catch (err: any) {
      console.error('Failed to retry task:', err);
      
      // Handle specific error types
      if (err.response?.data?.detail?.error_code === 'FILENAME_EXISTS') {
        const errorData = err.response.data.detail;
        setError(errorData.message);
        
        // Auto-suggest the suggested filename
        if (errorData.extra?.suggestion) {
          setFilename(errorData.extra.suggestion);
        }
      } else {
        setError(err.message || 'Failed to retry task. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && filename.trim()) {
      handleRetry();
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Retry Task
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Task Info */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Original Task Details
            </h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><strong>Task:</strong> {task.task_name}</p>
              <p><strong>Rows:</strong> {task.input_params?.num_rows || 'N/A'}</p>
              <p><strong>Columns:</strong> {Object.keys(task.input_params?.columns_info?.columns || {}).length}</p>
              <p><strong>Original File:</strong> {task.input_params?.csv_file_name || 'N/A'}</p>
            </div>
          </div>

          {/* Filename Input */}
          <div className="mb-4">
            <label htmlFor="filename" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Filename <span className="text-red-500">*</span>
            </label>
            <input
              id="filename"
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter new filename"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Choose a different filename to avoid overwriting existing data.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Please choose a different filename and try again.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="default"
            color="gray"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            color="blue"
            onClick={handleRetry}
            disabled={loading || !filename.trim()}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Retry Task
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RetryTaskModal;
