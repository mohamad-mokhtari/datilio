import { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import FeedbackService from '@/services/FeedbackService';
import type { Feedback, FeedbackMessage, FeedbackStatus, FeedbackType } from '@/@types/feedback';
import { HiOutlineX, HiOutlineChat, HiOutlineCheck, HiOutlinePhotograph } from 'react-icons/hi';
import { formatDistanceToNow } from 'date-fns';
import { useConfig } from '@/components/ui/ConfigProvider';

interface FeedbackDetailModalProps {
  feedback: Feedback | null;
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackDetailModal = ({ feedback, isOpen, onClose }: FeedbackDetailModalProps) => {
  const { themeColor, primaryColorLevel } = useConfig();
  const [currentFeedback, setCurrentFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messageImage, setMessageImage] = useState<File | null>(null);
  const [closeMessage, setCloseMessage] = useState('');
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  // Get CSS color values for the theme
  const getThemeColors = () => {
    const colorMap: Record<string, Record<number, string>> = {
      red: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
      orange: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
      amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
      yellow: { 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
      lime: { 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#365314', 900: '#1a2e05' },
      green: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
      emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
      teal: { 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
      cyan: { 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63' },
      sky: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
      blue: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
      indigo: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
      violet: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
      purple: { 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87' },
      fuchsia: { 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75' },
      pink: { 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
      rose: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' }
    };
    
    const primaryColor = colorMap[themeColor]?.[primaryColorLevel] || '#4f46e5'; // fallback to indigo-600
    const lightColor = colorMap[themeColor]?.[Math.max(primaryColorLevel - 100, 100) as number] || '#6366f1'; // fallback to indigo-500
    
    return { primaryColor, lightColor };
  };

  const { primaryColor, lightColor } = getThemeColors();

  // Handle message image file selection
  const handleMessageImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.push(
          <Notification title="Error" type="danger">
            Please select an image file
          </Notification>
        );
        return;
      }
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.push(
          <Notification title="Error" type="danger">
            File size must be less than 5MB
          </Notification>
        );
        return;
      }
      setMessageImage(file);
    }
  };

  // Helper function to convert local file path to backend URL
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    
    // If it's already a URL, return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Convert local file path to backend URL
    // Extract the relative path from the full local path
    const pathParts = imagePath.split('users_data_files');
    if (pathParts.length > 1) {
      const relativePath = pathParts[1].replace(/\\/g, '/'); // Convert backslashes to forward slashes
      const backendUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
      return `${backendUrl}/static/users_data_files${relativePath}`;
    }
    
    return imagePath; // Fallback to original path
  };

  useEffect(() => {
    if (feedback && isOpen) {
      fetchFeedbackDetails();
    }
  }, [feedback, isOpen]);

  const fetchFeedbackDetails = async () => {
    if (!feedback) return;

    setLoading(true);
    try {
      const detailedFeedback = await FeedbackService.getFeedbackById(feedback.id);
      setCurrentFeedback(detailedFeedback);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch feedback details';
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentFeedback || (!newMessage.trim() && !messageImage)) return;

    setMessageLoading(true);
    try {
      await FeedbackService.addFeedbackMessage(
        currentFeedback.id, 
        {
          message: newMessage.trim(),
        },
        messageImage || undefined
      );
      setNewMessage('');
      setMessageImage(null);
      await fetchFeedbackDetails(); // Refresh to get new messages
      toast.push(
        <Notification title="Success" type="success">
          Message sent successfully
        </Notification>
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setMessageLoading(false);
    }
  };

  const handleCloseFeedback = async () => {
    if (!currentFeedback || !closeMessage.trim()) return;

    setLoading(true);
    try {
      await FeedbackService.closeFeedback(currentFeedback.id, {
        message: closeMessage.trim(),
      });
      setCloseMessage('');
      setShowCloseDialog(false);
      await fetchFeedbackDetails();
      toast.push(
        <Notification title="Success" type="success">
          Feedback closed successfully
        </Notification>
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to close feedback';
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setLoading(false);
    }
  };


  const getStatusBadge = (status: FeedbackStatus) => {
    const statusConfig = {
      open: {
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        icon: '●',
        label: 'Open'
      },
      closed: {
        className: 'bg-gray-50 text-gray-600 border border-gray-200',
        icon: '●',
        label: 'Closed'
      }
    };

    const config = statusConfig[status];
    return (
      <Badge className={`${config.className} flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium`}>
        <span className="text-xs">{config.icon}</span>
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: FeedbackType) => {
    const typeConfig: Record<FeedbackType, { className: string; icon: string; label: string }> = {
      general: {
        className: 'bg-blue-50 text-blue-700 border border-blue-200',
        icon: '💬',
        label: 'General'
      },
      bug: {
        className: 'bg-red-50 text-red-700 border border-red-200',
        icon: '🐛',
        label: 'Bug'
      },
      feature: {
        className: 'bg-purple-50 text-purple-700 border border-purple-200',
        icon: '✨',
        label: 'Feature'
      },
      ui: {
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
        icon: '🎨',
        label: 'UI/UX'
      },
      performance: {
        className: 'bg-orange-50 text-orange-700 border border-orange-200',
        icon: '⚡',
        label: 'Performance'
      },
      other: {
        className: 'bg-gray-50 text-gray-600 border border-gray-200',
        icon: '📝',
        label: 'Other'
      },
    };

    const config = typeConfig[type];
    return (
      <Badge className={`${config.className} flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium`}>
        <span className="text-xs">{config.icon}</span>
        {config.label}
      </Badge>
    );
  };

  if (!currentFeedback) {
    return (
      <Dialog isOpen={isOpen} onClose={onClose}>
        <div className="flex items-center justify-center py-8">
          {loading ? 'Loading...' : 'No feedback selected'}
        </div>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog 
        isOpen={isOpen} 
        onClose={onClose} 
        width={800}
        height="90vh"
        contentClassName="p-0 my-0 flex flex-col h-[90vh] max-h-[90vh] overflow-hidden"
        closable={false}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-3 text-white rounded-t-lg flex-shrink-0"
          style={{
            background: `linear-gradient(to right, #4f46e5, ${primaryColor})`
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <HiOutlineChat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Feedback Details</h2>
              <p className="text-white/80 text-xs">View and manage feedback conversation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors duration-200 group"
            aria-label="Close modal"
          >
            <HiOutlineX className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <div className="space-y-6">
            {/* Feedback Header */}
            <div className="border-b pb-4">
            <div className="flex items-start justify-between mb-2">
              <h5 className="text-lg font-medium text-gray-900">{currentFeedback.title}</h5>
              <div className="flex gap-2">
                {getTypeBadge(currentFeedback.feedback_type)}
                {getStatusBadge(currentFeedback.status)}
              </div>
            </div>
            <p className="text-gray-600 mb-3">{currentFeedback.message}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>By: {currentFeedback.user_email}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(currentFeedback.created_at), { addSuffix: true })}</span>
              {currentFeedback.message_count > 0 && (
                <>
                  <span>•</span>
                  <span>{currentFeedback.message_count} messages</span>
                </>
              )}
            </div>
            {currentFeedback.image_path && (
              <div className="mt-3">
                <img
                  src={getImageUrl(currentFeedback.image_path)}
                  alt="Feedback attachment"
                  className="max-w-full h-auto max-h-64 rounded-lg border"
                  onError={(e) => {
                    console.error('Failed to load image:', currentFeedback.image_path);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Messages */}
          <div>
            <h6 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <HiOutlineChat className="w-4 h-4" />
              Conversation ({currentFeedback.messages?.length || 0})
            </h6>
            <div className="space-y-3 max-h-80 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              {currentFeedback.messages?.map((message: FeedbackMessage) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.is_admin_message
                      ? 'bg-blue-50 border-l-4 border-blue-400'
                      : 'bg-gray-50 border-l-4 border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {message.is_admin_message ? 'Admin' : 'User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{message.message}</p>
                  {message.image_path && (
                    <div className="mt-2">
                      <img
                        src={getImageUrl(message.image_path)}
                        alt="Message attachment"
                        className="max-w-full h-auto max-h-48 rounded-lg border"
                        onError={(e) => {
                          console.error('Failed to load message image:', message.image_path);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
              {(!currentFeedback.messages || currentFeedback.messages.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No messages yet</p>
              )}
            </div>
          </div>

          {/* New Message */}
          {currentFeedback.status === 'open' && (
            <div>
              <h6 className="font-medium text-gray-900 mb-2">Add Message</h6>
              <div className="space-y-3">
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                
                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Attach Image (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMessageImageChange}
                      className="hidden"
                      id="message-image-upload"
                    />
                    <label
                      htmlFor="message-image-upload"
                      className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <HiOutlinePhotograph className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {messageImage ? messageImage.name : 'Choose image'}
                      </span>
                    </label>
                    {messageImage && (
                      <Button
                        variant="plain"
                        size="xs"
                        onClick={() => setMessageImage(null)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {messageImage && (
                    <div className="mt-2">
                      <img
                        src={URL.createObjectURL(messageImage)}
                        alt="Preview"
                        className="max-w-full h-auto max-h-32 rounded-lg border"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="solid"
                    size="sm"
                    onClick={handleSendMessage}
                    loading={messageLoading}
                    disabled={!newMessage.trim() && !messageImage}
                  >
                    Send Message
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Closed Feedback Banner */}
          {currentFeedback.status === 'closed' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <HiOutlineCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Feedback Closed</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    This feedback has been closed by an administrator. You can no longer add new messages to this conversation.
                  </p>
                </div>
              </div>
            </div>
          )}

          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50 flex-shrink-0">
          <Button
            variant="plain"
            size="sm"
            onClick={onClose}
            className="flex items-center justify-center"
          >
            Close Modal
          </Button>
          {currentFeedback.status === 'open' && (
            <Button
              variant="plain"
              size="sm"
              icon={<HiOutlineCheck />}
              onClick={() => setShowCloseDialog(true)}
              className="flex items-center justify-center"
            >
              Close Feedback
            </Button>
          )}
        </div>
      </Dialog>

      {/* Close Feedback Dialog */}
      <Dialog isOpen={showCloseDialog} onClose={() => setShowCloseDialog(false)}>
        <div className="mb-4">
          <h4 className="text-lg font-semibold">Close Feedback</h4>
          <p className="text-sm text-gray-600 mt-1">
            Please provide a reason for closing this feedback.
          </p>
        </div>
        <div className="space-y-4">
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="Reason for closing..."
            value={closeMessage}
            onChange={(e) => setCloseMessage(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="plain"
              onClick={() => setShowCloseDialog(false)}
              disabled={loading}
              className="flex items-center justify-center"
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={handleCloseFeedback}
              loading={loading}
              disabled={!closeMessage.trim()}
              className="flex items-center justify-center"
            >
              Close Feedback
            </Button>
          </div>
        </div>
      </Dialog>

    </>
  );
};

export default FeedbackDetailModal;
