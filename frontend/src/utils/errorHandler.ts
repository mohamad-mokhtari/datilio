// Error message mappings for consistent user experience
const ERROR_MESSAGES = {
  // Authentication errors
  'INVALID_CREDENTIALS': 'Invalid email or password. Please check your credentials and try again.',
  'EMAIL_NOT_VERIFIED': 'Please verify your email address before signing in. Check your inbox for the verification link.',
  'ACCOUNT_NOT_FOUND': 'No account found with this email address. Please sign up first.',
  'TOKEN_EXPIRED': 'Your session has expired. Please sign in again.',
  'INVALID_TOKEN': 'Invalid or corrupted verification link. Please request a new one.',
  
  // Authorization errors
  'ACCESS_DENIED': 'You don\'t have permission to access this resource.',
  'ADMIN_REQUIRED': 'This action requires administrator privileges.',
  
  // Validation errors
  'VALIDATION_ERROR': 'Please check your input and try again.',
  'EMAIL_ALREADY_EXISTS': 'An account with this email address already exists. Please use a different email or sign in.',
  'USERNAME_ALREADY_EXISTS': 'This username is already taken. Please choose a different one.',
  'WEAK_PASSWORD': 'Password must be at least 8 characters long and contain letters and numbers.',
  
  // File upload errors
  'FILE_TOO_LARGE': 'File size exceeds the maximum limit. Please choose a smaller file.',
  'INVALID_FILE_TYPE': 'File type not supported. Please upload a valid file format.',
  'FILE_UPLOAD_FAILED': 'Failed to upload file. Please try again.',
  
  // System errors
  'INTERNAL_SERVER_ERROR': 'Something went wrong. Please try again later.',
  'SERVICE_UNAVAILABLE': 'Service is temporarily unavailable. Please try again in a few minutes.',
  'DATABASE_ERROR': 'Unable to process your request due to a database issue. Please try again later.',
  
  // Security errors
  'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment before trying again.',
  'SUSPICIOUS_ACTIVITY': 'Suspicious activity detected. Your account has been temporarily locked for security.',
  
  // Business logic errors
  'FEEDBACK_CLOSED': 'This feedback conversation is closed. You cannot add more messages.',
  'QUOTA_EXCEEDED': 'You have reached your usage limit. Please upgrade your plan to continue.',
  
  // Not found errors
  'NOT_FOUND': 'The requested resource was not found.',
  'RECORD_NOT_FOUND': 'The requested information could not be found.',
  
  // Payment errors
  'PAYMENT_FAILED': 'Payment could not be processed. Please check your payment details and try again.',
  'PAYMENT_GATEWAY_ERROR': 'Payment service is temporarily unavailable. Please try again later.',
  
  // Email errors
  'EMAIL_SEND_FAILED': 'Failed to send email. Please try again later.',
  
  // External API errors
  'EXTERNAL_API_ERROR': 'External service is temporarily unavailable. Please try again later.',
  
  // Network errors
  'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
  'PARSE_ERROR': 'Failed to parse error response',
  'UNKNOWN_ERROR': 'Something went wrong. Please try again later.'
};

export interface ApiError {
  code: string;
  message: string;
  details?: string;
  status?: number;
  isCritical?: boolean;
  validationErrors?: string[];
}

// Get user-friendly error message
export const getErrorMessage = (errorCode: string): string => {
  return ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.UNKNOWN_ERROR;
};

// Extract error from API response
export const extractError = async (response: Response): Promise<ApiError> => {
  try {
    const data = await response.json();
    if (data.error) {
      return {
        code: data.error.code || 'UNKNOWN_ERROR',
        message: data.error.message || 'An unknown error occurred',
        details: data.error.details
      };
    }
    return { 
      code: 'UNKNOWN_ERROR', 
      message: 'An unknown error occurred' 
    };
  } catch (e) {
    return { 
      code: 'PARSE_ERROR', 
      message: ERROR_MESSAGES.PARSE_ERROR 
    };
  }
};

// Check if error is critical (should show detailed message)
export const isCriticalError = (errorCode: string): boolean => {
  const criticalErrors = [
    'INTERNAL_SERVER_ERROR',
    'DATABASE_ERROR',
    'SERVICE_UNAVAILABLE',
    'PAYMENT_FAILED',
    'PAYMENT_GATEWAY_ERROR',
    'NETWORK_ERROR'
  ];
  return criticalErrors.includes(errorCode);
};

// Format validation errors
export const formatValidationErrors = (details?: string): string[] | null => {
  if (!details) return null;
  
  // Split by semicolon and format
  return details.split(';').map(error => error.trim()).filter(Boolean);
};

// Create enhanced error object
export const createEnhancedError = (error: any, response?: Response): ApiError => {
  const errorCode = error.code || 'UNKNOWN_ERROR';
  const userMessage = getErrorMessage(errorCode);
  
  return {
    ...error,
    code: errorCode,
    message: userMessage,
    status: response?.status || error.status || 0,
    isCritical: isCriticalError(errorCode),
    validationErrors: formatValidationErrors(error.details)
  };
};
