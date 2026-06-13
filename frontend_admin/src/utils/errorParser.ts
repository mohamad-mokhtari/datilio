/**
 * Utility functions for parsing different error formats from the backend
 */

export interface BackendError {
  error_code?: string;
  message: string;
  extra?: any;
}

export interface ParsedError {
  title: string;
  message: string;
  errorCode?: string;
  extra?: any;
}

export const DEFAULT_USER_ERROR_MESSAGE =
  'Something went wrong. Please try again.';

/**
 * Extract a user-facing message from an API error response body.
 */
export const extractApiErrorMessage = (
  data: unknown,
  fallback: string = DEFAULT_USER_ERROR_MESSAGE
): string => {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const body = data as Record<string, unknown>;
  const detail = body.detail;

  if (detail && typeof detail === 'object' && detail !== null && 'message' in detail) {
    return String((detail as { message: unknown }).message);
  }

  if (typeof detail === 'string') {
    return detail;
  }

  if (typeof body.message === 'string') {
    return body.message;
  }

  const nested = body.error;
  if (nested && typeof nested === 'object' && nested !== null && 'message' in nested) {
    return String((nested as { message: unknown }).message);
  }

  return fallback;
};

/**
 * Turn any caught error into user-safe text.
 */
export const getUserFacingMessage = (
  error: unknown,
  fallback: string = DEFAULT_USER_ERROR_MESSAGE
): string => {
  const parsed = parseBackendError(error);

  if (parsed.errorCode && parsed.message) {
    return parsed.message;
  }

  const message = parsed.message?.trim();
  if (message && message !== 'An error occurred') {
    return message;
  }

  return fallback;
};

/**
 * Parse error from backend response
 * Handles multiple error formats:
 * 1. New format: {error_code: "INVALID_FILE_TYPE", message: "...", extra: {...}}
 * 2. Legacy format: {detail: "message"}
 * 3. Simple format: {message: "..."}
 * 4. String format: "error message"
 */
export const parseBackendError = (error: any): ParsedError => {
  let title = 'Error';
  let message = 'An error occurred';
  let errorCode: string | undefined;
  let extra: any;

  // Handle new error format: error.data.detail or error.response.data.detail
  const detailFromData =
    error?.data?.detail ??
    error?.response?.data?.detail;
  if (
    detailFromData &&
    typeof detailFromData === 'object' &&
    detailFromData?.error_code &&
    detailFromData?.message
  ) {
    errorCode = detailFromData.error_code;
    message = detailFromData.message;
    extra = detailFromData.extra;
    title = getErrorTitle(errorCode || 'UNKNOWN_ERROR');

    if (extra && errorCode) {
      message = enhanceErrorMessage(message, errorCode, extra);
    }
    return { title, message, errorCode, extra };
  }

  // Handle Error objects with JSON string messages (legacy)
  if (error instanceof Error && error.message) {
    // First check if the message looks like JSON (starts with { and ends with })
    if (error.message.trim().startsWith('{') && error.message.trim().endsWith('}')) {
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.error_code && errorData.message) {
          errorCode = errorData.error_code;
          message = errorData.message;
          extra = errorData.extra;
          title = getErrorTitle(errorCode || 'UNKNOWN_ERROR');
          
          // Add extra information to message if available
          if (extra && errorCode) {
            message = enhanceErrorMessage(message, errorCode, extra);
          }
          return { title, message, errorCode, extra };
        }
      } catch (parseError) {
        // If JSON parsing fails, use the error message as is
        message = error.message;
      }
    } else {
      // If it's not JSON, use the message as is
      message = error.message;
    }
  }

  // Handle direct error objects
  if (error?.error_code && error?.message) {
    errorCode = error.error_code;
    message = error.message;
    extra = error.extra;
    title = getErrorTitle(errorCode || 'UNKNOWN_ERROR');
    
    if (extra && errorCode) {
      message = enhanceErrorMessage(message, errorCode, extra);
    }
    return { title, message, errorCode, extra };
  }

  // Handle legacy format
  if (error?.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === 'object' && detail?.error_code && detail?.message) {
      errorCode = detail.error_code;
      message = detail.message;
      extra = detail.extra;
      title = getErrorTitle(errorCode || 'UNKNOWN_ERROR');
      return { title, message, errorCode, extra };
    }
    if (typeof detail === 'string') {
      message = detail;
      return { title, message };
    }
  }

  // Handle simple message format
  if (error?.response?.data?.message) {
    message = error.response.data.message;
    return { title, message };
  }

  // Handle direct message
  if (error?.message) {
    message = error.message;
    return { title, message };
  }

  // Handle string errors
  if (typeof error === 'string') {
    message = error;
    return { title, message };
  }

  return { title, message };
};

/**
 * Get appropriate error title based on error code
 */
const getErrorTitle = (errorCode: string): string => {
  const titleMap: Record<string, string> = {
    'INVALID_FILE_TYPE': 'Invalid File Type',
    'FILE_TOO_LARGE': 'File Too Large',
    'FILE_TOO_SMALL': 'File Too Small',
    'UPLOAD_FAILED': 'Upload Failed',
    'INVALID_CREDENTIALS': 'Invalid Credentials',
    'EMAIL_NOT_VERIFIED': 'Email Not Verified',
    'ACCOUNT_NOT_FOUND': 'Account Not Found',
    'TOKEN_EXPIRED': 'Token Expired',
    'INVALID_TOKEN': 'Invalid Token',
    'ACCESS_DENIED': 'Access Denied',
    'VALIDATION_ERROR': 'Validation Error',
    'EMAIL_ALREADY_EXISTS': 'Email Already Exists',
    'WEAK_PASSWORD': 'Weak Password',
    'RATE_LIMIT_EXCEEDED': 'Rate Limit Exceeded',
    'SERVICE_UNAVAILABLE': 'Service Unavailable',
    'INTERNAL_SERVER_ERROR': 'Internal Server Error',
    'NOT_FOUND': 'Not Found',
    'PAYMENT_FAILED': 'Payment Failed',
    'EMAIL_SEND_FAILED': 'Email Send Failed',
    'NETWORK_ERROR': 'Network Error'
  };

  return titleMap[errorCode] || 'Error';
};

/**
 * Enhance error message with extra information
 */
const enhanceErrorMessage = (message: string, errorCode: string, extra: any): string => {
  let enhancedMessage = message;

  switch (errorCode) {
    case 'INVALID_FILE_TYPE':
      if (extra.allowed_types && Array.isArray(extra.allowed_types)) {
        enhancedMessage += ` Allowed file types: ${extra.allowed_types.join(', ')}.`;
      }
      break;
    
    case 'FILE_TOO_LARGE':
      if (extra.max_size) {
        enhancedMessage += ` Maximum file size: ${extra.max_size}.`;
      }
      break;
    
    case 'FILE_TOO_SMALL':
      if (extra.min_size) {
        enhancedMessage += ` Minimum file size: ${extra.min_size}.`;
      }
      break;
    
    case 'RATE_LIMIT_EXCEEDED':
      if (extra.retry_after) {
        enhancedMessage += ` Please try again in ${extra.retry_after} seconds.`;
      }
      break;
    
    case 'VALIDATION_ERROR':
      if (extra.validation_errors && Array.isArray(extra.validation_errors)) {
        enhancedMessage += ` Issues: ${extra.validation_errors.join(', ')}.`;
      }
      break;
  }

  return enhancedMessage;
};

/**
 * Check if error is critical (should not auto-dismiss)
 */
export const isCriticalError = (errorCode?: string): boolean => {
  const criticalErrors = [
    'INTERNAL_SERVER_ERROR',
    'SERVICE_UNAVAILABLE',
    'PAYMENT_FAILED',
    'NETWORK_ERROR',
    'ACCESS_DENIED'
  ];
  
  return errorCode ? criticalErrors.includes(errorCode) : false;
};
