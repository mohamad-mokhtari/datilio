import ApiService2 from './ApiService2';
import type {
  Feedback,
  FeedbackListResponse,
  CreateFeedbackRequest,
  CreateFeedbackMessageRequest,
  CloseFeedbackRequest,
  ReopenFeedbackRequest,
  ImageUploadResponse,
  FeedbackFilters,
  FeedbackMessage
} from '@/@types/feedback';

/**
 * Feedback Service
 * Handles all feedback-related API operations
 */
export const FeedbackService = {
  /**
   * Create a new feedback
   */
  async createFeedback(data: CreateFeedbackRequest): Promise<Feedback> {
    const response = await ApiService2.post<Feedback>('/feedback/', data);
    if (!response.ok) {
      throw new Error(`Failed to create feedback: ${response.statusText}`);
    }
    return response.data;
  },

  /**
   * Get paginated list of feedback
   */
  async getFeedbackList(filters: FeedbackFilters = {}): Promise<FeedbackListResponse> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.feedback_type) params.append('feedback_type', filters.feedback_type);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.page_size) params.append('page_size', filters.page_size.toString());

    const queryString = params.toString();
    const url = queryString ? `/feedback/?${queryString}` : '/feedback/';
    
    const response = await ApiService2.get<Feedback[]>(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch feedback list: ${response.statusText}`);
    }

    // Since the API returns an array, we need to construct the pagination response
    // This might need adjustment based on actual API response structure
    return {
      data: response.data,
      pagination: {
        total: response.data.length,
        current_page: filters.page || 1,
        page_size: filters.page_size || 20,
        has_next: response.data.length === (filters.page_size || 20)
      }
    };
  },

  /**
   * Get a specific feedback by ID
   */
  async getFeedbackById(feedbackId: string): Promise<Feedback> {
    const response = await ApiService2.get<Feedback>(`/feedback/${feedbackId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch feedback: ${response.statusText}`);
    }
    return response.data;
  },

  /**
   * Upload image for a feedback
   */
  async uploadFeedbackImage(feedbackId: string, imageFile: File): Promise<ImageUploadResponse> {
    const formData = new FormData();
    formData.append('image_file', imageFile);

    const response = await ApiService2.post<ImageUploadResponse>(
      `/feedback/${feedbackId}/image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }
    return response.data;
  },

  /**
   * Add a message to a feedback (user message)
   */
  async addFeedbackMessage(feedbackId: string, data: CreateFeedbackMessageRequest, imageFile?: File): Promise<FeedbackMessage> {
    let response;
    
    if (imageFile) {
      // If image is provided, send as FormData
      const formData = new FormData();
      // Send the message directly (not as message_data wrapper)
      formData.append('message', data.message);
      formData.append('image_file', imageFile);
      
      response = await ApiService2.post<FeedbackMessage>(
        `/feedback/${feedbackId}/messages`,
        formData
        // Don't set Content-Type header - let browser handle it automatically
      );
    } else {
      // If no image, send as JSON with message directly
      response = await ApiService2.post<FeedbackMessage>(
        `/feedback/${feedbackId}/messages`,
        { message: data.message }
      );
    }
    
    if (!response.ok) {
      throw new Error(`Failed to add message: ${response.statusText}`);
    }
    return response.data;
  },

  /**
   * Add an admin message to a feedback
   */
  async addAdminMessage(feedbackId: string, data: CreateFeedbackMessageRequest): Promise<FeedbackMessage> {
    const response = await ApiService2.post<FeedbackMessage>(
      `/feedback/admin/${feedbackId}/messages`,
      data
    );
    if (!response.ok) {
      throw new Error(`Failed to add admin message: ${response.statusText}`);
    }
    return response.data;
  },

  /**
   * Close a feedback
   */
  async closeFeedback(feedbackId: string, data: CloseFeedbackRequest): Promise<void> {
    const response = await ApiService2.post(
      `/feedback/${feedbackId}/close`,
      data
    );
    if (!response.ok) {
      throw new Error(`Failed to close feedback: ${response.statusText}`);
    }
  },

  /**
   * Reopen a feedback (admin only)
   */
  async reopenFeedback(feedbackId: string, data: ReopenFeedbackRequest): Promise<void> {
    const response = await ApiService2.post(
      `/feedback/admin/${feedbackId}/reopen`,
      data
    );
    if (!response.ok) {
      throw new Error(`Failed to reopen feedback: ${response.statusText}`);
    }
  }
};

export default FeedbackService;
