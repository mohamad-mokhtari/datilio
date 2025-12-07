import { extractError, getErrorMessage, isCriticalError, formatValidationErrors, createEnhancedError, ApiError } from './errorHandler';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Get backend base URL (without /api/v1)
export const getBackendBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  // Remove /api/v1 from the end if it exists
  return apiUrl.replace(/\/api\/v1$/, '');
};

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Create headers with auth token
const createHeaders = (customHeaders: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return headers;
};

// Enhanced fetch with error handling
const apiRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
  const config: RequestInit = {
    headers: createHeaders(options.headers as Record<string, string>),
    ...options
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);
    
    // Handle successful responses
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return response;
    }
    
    // Handle error responses
    const error = await extractError(response);
    const userMessage = getErrorMessage(error.code);
    
    // Create enhanced error object
    const enhancedError: ApiError = {
      ...error,
      message: userMessage,
      status: response.status,
      isCritical: isCriticalError(error.code),
      validationErrors: formatValidationErrors(error.details)
    };
    
    throw enhancedError;
    
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw createEnhancedError({
        code: 'NETWORK_ERROR',
        message: getErrorMessage('NETWORK_ERROR'),
        status: 0,
        isCritical: true
      });
    }
    
    // Re-throw API errors
    throw error;
  }
};

// HTTP method helpers
export const apiClient = {
  get: (url: string, options: RequestInit = {}): Promise<any> => 
    apiRequest(url, { ...options, method: 'GET' }),
  
  post: (url: string, data?: any, options: RequestInit = {}): Promise<any> => 
    apiRequest(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    }),
  
  put: (url: string, data?: any, options: RequestInit = {}): Promise<any> => 
    apiRequest(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    }),
  
  patch: (url: string, data?: any, options: RequestInit = {}): Promise<any> => 
    apiRequest(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    }),
  
  delete: (url: string, options: RequestInit = {}): Promise<any> => 
    apiRequest(url, { ...options, method: 'DELETE' }),
  
  // File upload helper
  upload: (url: string, formData: FormData, options: RequestInit = {}): Promise<any> => {
    const headers = createHeaders();
    delete headers['Content-Type']; // Let browser set multipart/form-data
    
    return apiRequest(url, {
      ...options,
      method: 'POST',
      body: formData,
      headers
    });
  }
};

export default apiClient;
