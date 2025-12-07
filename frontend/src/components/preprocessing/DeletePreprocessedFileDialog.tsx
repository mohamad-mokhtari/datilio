import React from 'react';
import { Dialog, Button } from '@/components/ui';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeletePreprocessedFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fileName: string;
  loading?: boolean;
}

const DeletePreprocessedFileDialog: React.FC<DeletePreprocessedFileDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  fileName,
  loading = false
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      width="500px"
      closable={false}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Delete Preprocessed File
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <Trash2 className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                  Are you sure you want to delete this file?
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                  <strong>File:</strong> {fileName}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  This will permanently remove the preprocessed file from your account and delete it from the server. The original file will remain safe and unaffected.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                  What happens when you delete:
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• The preprocessed file will be permanently removed</li>
                  <li>• Your original data file remains safe and unchanged</li>
                  <li>• You can always create new preprocessed versions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3">
          <Button
            variant="plain"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            variant="solid"
            color="red"
            onClick={onConfirm}
            loading={loading}
            icon={<Trash2 />}
            className="px-4 py-2"
          >
            {loading ? 'Deleting...' : 'Delete File'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default DeletePreprocessedFileDialog;
