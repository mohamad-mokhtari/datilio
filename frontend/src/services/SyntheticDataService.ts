import { FailedTask, FailedTasksResponse } from '@/components/synthetic/types';
import ApiService2 from './ApiService2';

export interface SyntheticDataRequest {
  num_rows: number;
  columns_info: {
    columns: Record<string, {
      field: string;
      params: Record<string, any>;
      category: string;
    }>;
  };
  csv_file_name: string;
}

export interface SyntheticDataResponse {
  task_id: string;
  message: string;
  status: string;
}

export interface TaskStatus {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failure';
  message?: string;
  error?: string;
  retry_count?: number;
  failure_reason?: string;
  minutes_pending?: number;
  warning?: string;
  progress?: number;
  result?: any;
}

// FailedTask interface is now imported from types.ts

export interface ServiceError {
  detail?: {
    message: string;
    error_code: string;
    extra?: {
      service: string;
      user_action: string;
    };
  };
  message?: string;
  error_code?: string;
}

export class SyntheticDataService {

  /**
   * Generate synthetic data with comprehensive error handling
   */
  static async generateSyntheticData(data: SyntheticDataRequest): Promise<SyntheticDataResponse> {
    try {
      const response = await ApiService2.post<SyntheticDataResponse>('/synthetic/generate-synthetic-data/', data);
      return response.data;
    } catch (error) {
      // Handle network errors or parsing errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw {
          detail: {
            message: 'Network error: Unable to connect to the server. Please check your internet connection and try again.',
            error_code: 'NETWORK_ERROR',
            extra: {
              service: 'network',
              user_action: 'check_connection'
            }
          }
        } as ServiceError;
      }

      // Re-throw service errors
      throw error;
    }
  }

  /**
   * Get task status with error handling
   */
  static async getTaskStatus(taskId: string): Promise<TaskStatus> {
    try {
      const response = await ApiService2.get<TaskStatus>(`/synthetic/tasks/${taskId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task status:', error);
      throw error;
    }
  }

  /**
   * Retry a failed task
   */
  static async retryTask(taskId: string): Promise<SyntheticDataResponse> {
    try {
      const response = await ApiService2.post<SyntheticDataResponse>(`/synthetic/tasks/${taskId}/retry/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel a running task
   */
  static async cancelTask(taskId: string): Promise<void> {
    try {
      await ApiService2.post(`/synthetic/tasks/${taskId}/cancel/`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all user tasks
   */
  static async getUserTasks(): Promise<TaskStatus[]> {
    try {
      const response = await ApiService2.get<TaskStatus[]>('/synthetic/tasks/');
      return response.data;
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      throw error;
    }
  }

  /**
   * Get failed tasks (original tasks only, excludes retry attempts)
   */
  static async getFailedTasks(limit: number = 20, offset: number = 0): Promise<FailedTasksResponse> {
    try {
      const response = await ApiService2.get<FailedTasksResponse>(`/synthetic/my-failed-tasks?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching failed tasks:', error);
      throw error;
    }
  }

  /**
   * Retry a failed task with optional new filename
   */
  static async retryFailedTask(taskId: string, newFilename?: string): Promise<{ new_task_id: string }> {
    try {
      const requestBody = newFilename ? { new_filename: newFilename } : {};
      const response = await ApiService2.post<{ new_task_id: string }>(`/synthetic/retry-task/${taskId}`, requestBody);
      return response.data;
    } catch (error) {
      console.error('Error retrying failed task:', error);
      throw error;
    }
  }
}

/**
 * Error handling utility functions
 */
export class ErrorHandler {
  /**
   * Check if error is a service unavailable error (Scenario 1)
   */
  static isServiceUnavailable(error: ServiceError): boolean {
    return error.detail?.error_code === 'SERVICE_UNAVAILABLE' || 
           error.error_code === 'SERVICE_UNAVAILABLE';
  }

  /**
   * Check if error is a quota exceeded error
   */
  static isQuotaExceeded(error: ServiceError): boolean {
    return error.detail?.error_code === 'QUOTA_EXCEEDED' || 
           error.error_code === 'QUOTA_EXCEEDED';
  }

  /**
   * Check if error is a network error
   */
  static isNetworkError(error: ServiceError): boolean {
    return error.detail?.error_code === 'NETWORK_ERROR' || 
           error.error_code === 'NETWORK_ERROR';
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: ServiceError): string {
    if (this.isServiceUnavailable(error)) {
      return error.detail?.message || 'Our background processing system is temporarily unavailable. Please try again in a few minutes.';
    }
    
    if (this.isQuotaExceeded(error)) {
      return error.detail?.message || 'You have exceeded your usage quota. Please upgrade your plan or wait for the quota to reset.';
    }
    
    if (this.isNetworkError(error)) {
      return error.detail?.message || 'Network error: Unable to connect to the server. Please check your internet connection.';
    }
    
    return error.detail?.message || error.message || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Get error type for UI rendering
   */
  static getErrorType(error: ServiceError): 'service_unavailable' | 'quota_exceeded' | 'network_error' | 'generic' {
    if (this.isServiceUnavailable(error)) return 'service_unavailable';
    if (this.isQuotaExceeded(error)) return 'quota_exceeded';
    if (this.isNetworkError(error)) return 'network_error';
    return 'generic';
  }
}
