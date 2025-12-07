export interface Feedback {
  id: string;
  user_id: string;
  title: string;
  message: string;
  feedback_type: FeedbackType;
  status: FeedbackStatus;
  closed_at: string | null;
  closed_by: string | null;
  image_path: string | null;
  created_at: string;
  updated_at: string;
  user_email: string;
  closed_by_email: string | null;
  message_count: number;
  messages?: FeedbackMessage[];
}

export interface FeedbackMessage {
  id: string;
  feedback_id: string;
  user_id: string;
  message: string;
  is_admin_message: boolean;
  image_path: string | null;
  created_at: string;
  updated_at: string;
  user_email: string;
}

export interface CreateFeedbackRequest {
  title: string;
  message: string;
  feedback_type: FeedbackType;
}

export interface CreateFeedbackMessageRequest {
  message: string;
  is_admin_message?: boolean;
}

export interface CloseFeedbackRequest {
  message: string;
}

export interface ReopenFeedbackRequest {
  message: string;
}

export interface FeedbackListResponse {
  data: Feedback[];
  pagination: {
    total: number;
    current_page: number;
    page_size: number;
    has_next: boolean;
  };
}

export interface ImageUploadResponse {
  status: string;
  message: string;
  image_path: string;
}

export type FeedbackType = 'general' | 'bug' | 'feature' | 'ui' | 'performance' | 'other';

export type FeedbackStatus = 'open' | 'closed';

export interface FeedbackFilters {
  status?: FeedbackStatus;
  feedback_type?: FeedbackType;
  search?: string;
  page?: number;
  page_size?: number;
}
