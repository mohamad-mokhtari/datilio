import { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Upload from '@/components/ui/Upload';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import FeedbackService from '@/services/FeedbackService';
import type { CreateFeedbackRequest, FeedbackType } from '@/@types/feedback';
import { HiOutlineX, HiOutlinePaperClip, HiOutlineChat } from 'react-icons/hi';
import { useConfig } from '@/components/ui/ConfigProvider';

interface CreateFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateFeedbackModal = ({ isOpen, onClose, onSuccess }: CreateFeedbackModalProps) => {
  const { themeColor, primaryColorLevel } = useConfig();
  const [formData, setFormData] = useState<CreateFeedbackRequest>({
    title: '',
    message: '',
    feedback_type: 'general',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const feedbackTypes: { value: FeedbackType; label: string }[] = [
    { value: 'general', label: 'General' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'ui', label: 'UI/UX Issue' },
    { value: 'performance', label: 'Performance Issue' },
    { value: 'other', label: 'Other' },
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Create the feedback
      const feedback = await FeedbackService.createFeedback(formData);

      // Upload image if provided
      if (selectedFile && feedback.id) {
        try {
          await FeedbackService.uploadFeedbackImage(feedback.id, selectedFile);
        } catch (imageError) {
          console.warn('Failed to upload image:', imageError);
          toast.push(
            <Notification title="Warning" type="warning">
              Feedback created but image upload failed
            </Notification>
          );
        }
      }

      toast.push(
        <Notification title="Success" type="success">
          Feedback created successfully
        </Notification>
      );

      // Reset form
      setFormData({
        title: '',
        message: '',
        feedback_type: 'general',
      });
      setSelectedFile(null);
      setErrors({});

      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create feedback';
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        title: '',
        message: '',
        feedback_type: 'general',
      });
      setSelectedFile(null);
      setErrors({});
      onClose();
    }
  };

  const handleFileChange = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
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
      setSelectedFile(file);
    }
  };

  return (
    <Dialog 
      isOpen={isOpen} 
      onClose={handleClose}
      width={600}
      height="auto"
      contentClassName="p-0 my-0 flex flex-col"
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
            <h2 className="text-lg font-bold text-white">Create New Feedback</h2>
            <p className="text-white/80 text-xs">Share your thoughts and suggestions</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors duration-200 group"
          aria-label="Close modal"
          disabled={loading}
        >
          <HiOutlineX className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <Input
            placeholder="Brief description of your feedback"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            invalid={!!errors.title}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <Select
            value={feedbackTypes.find(opt => opt.value === formData.feedback_type) || null}
            onChange={(option) => setFormData(prev => ({ ...prev, feedback_type: option?.value as FeedbackType || 'general' }))}
            options={feedbackTypes}
            placeholder="Select feedback type"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message *
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            placeholder="Please provide detailed information about your feedback..."
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600">{errors.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attach Image (Optional)
          </label>
          <Upload
            accept="image/*"
            onChange={handleFileChange}
            showList={false}
          >
            <div className="flex items-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer">
              <HiOutlinePaperClip className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {selectedFile ? selectedFile.name : 'Click to upload an image'}
              </span>
            </div>
          </Upload>
          {selectedFile && (
            <p className="mt-1 text-xs text-gray-500">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="plain" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="solid"
          onClick={handleSubmit}
          loading={loading}
        >
          Create Feedback
        </Button>
      </div>
      </div>
    </Dialog>
  );
};

export default CreateFeedbackModal;
