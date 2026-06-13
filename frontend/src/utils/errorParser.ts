/**
 * Utility functions for parsing different error formats from the backend
 */

import { formatSyntheticTaskError } from '@/utils/syntheticErrorMessages';

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

export const DEFAULT_NETWORK_ERROR_MESSAGE =
  'Unable to connect to the server. Please check your internet connection and try again.';

export const DEFAULT_CHART_ERROR_MESSAGE =
  'Unable to load this chart. Please try again.';

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
    return sanitizeRawMessage(detail, fallback);
  }

  if (typeof body.message === 'string') {
    return sanitizeRawMessage(body.message, fallback);
  }

  const nested = body.error;
  if (nested && typeof nested === 'object' && nested !== null && 'message' in nested) {
    return String((nested as { message: unknown }).message);
  }

  return fallback;
};

const TECHNICAL_MESSAGE_PATTERNS: RegExp[] = [
  /sqlalchemy/i,
  /integrityerror/i,
  /uniqueviolation/i,
  /psycopg2/i,
  /duplicate key/i,
  /traceback/i,
  /\bat\s+\/[\w./-]+\.(py|ts|tsx|js)\b/i,
  /\[object object\]/i,
  /networkerror/i,
  /failed to fetch/i,
  /econnrefused/i,
  /axioserror/i,
  /internal server error/i,
  /bad gateway/i,
  /service unavailable/i,
  /unprocessable entity/i,
  /request failed with status/i,
  /check the console/i,
  /vite_api_url/i,
  /rebuild the frontend/i,
  /^error:\s*\d{3}/i,
  /^\d{3}\s+(internal|bad|not found)/i,
  /insert into\s+/i,
  /select\s+.+\s+from\s+/i,
  /:\s*(internal server error|bad request|not found|unauthorized|forbidden)$/i,
];

/**
 * Returns true when a string looks like a developer/technical error, not user copy.
 */
export const isTechnicalMessage = (message: string): boolean => {
  const trimmed = message.trim();
  if (!trimmed) {
    return true;
  }

  if (TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      // Structured API errors are user-facing; only raw debug payloads are technical
      if (parsed.error_code && parsed.message) {
        return false;
      }
      if (parsed.detail || parsed.stack) {
        return true;
      }
    } catch {
      return true;
    }
  }

  if (trimmed.length > 220 && trimmed.split('\n').length === 1) {
    return true;
  }

  return false;
};

const sanitizeRawMessage = (
  message: string,
  fallback: string = DEFAULT_USER_ERROR_MESSAGE
): string => {
  const trimmed = message.trim();
  if (!trimmed) {
    return fallback;
  }

  const lower = trimmed.toLowerCase();
  if (
    lower === 'failed to fetch' ||
    lower.includes('networkerror') ||
    (lower.includes('fetch') && lower.includes('failed'))
  ) {
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      (import.meta.env.VITE_API_URL || '').startsWith('http://')
    ) {
      return 'We could not connect to the server securely. Please refresh the page or try again later.';
    }
    return DEFAULT_NETWORK_ERROR_MESSAGE;
  }

  const formatted = formatSyntheticTaskError(trimmed);
  if (isTechnicalMessage(formatted)) {
    return fallback;
  }

  return formatted;
};

/**
 * Primary entry point: turn any caught error into user-safe text.
 */
export const getUserFacingMessage = (
  error: unknown,
  fallback: string = DEFAULT_USER_ERROR_MESSAGE
): string => {
  const parsed = parseBackendError(error);

  // Always show structured backend errors (e.g. RULE_NAME_EXISTS, LIST_NAME_EXISTS)
  if (parsed.errorCode && parsed.message) {
    return parsed.message;
  }

  const message = parsed.message.trim();

  if (!message || message === DEFAULT_USER_ERROR_MESSAGE || isTechnicalMessage(message)) {
    return fallback;
  }

  return message;
};

export const getChartErrorMessage = (error: unknown): string => {
  return getUserFacingMessage(error, DEFAULT_CHART_ERROR_MESSAGE);
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
  let message = DEFAULT_USER_ERROR_MESSAGE;
  let errorCode: string | undefined;
  let extra: any;

  // Handle global handler legacy format: error.data.error
  if (error?.data?.error?.code && error?.data?.error?.message) {
    errorCode = error.data.error.code;
    message = error.data.error.message;
    title = getErrorTitle(errorCode || 'UNKNOWN_ERROR');
    return { title, message, errorCode, extra: error.data.error.details };
  }

  // Handle response wrapper: error.response.data.error
  if (error?.response?.data?.error?.code && error?.response?.data?.error?.message) {
    errorCode = error.response.data.error.code;
    message = error.response.data.error.message;
    title = getErrorTitle(errorCode || 'UNKNOWN_ERROR');
    return { title, message, errorCode, extra: error.response.data.error.details };
  }

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
        message = sanitizeRawMessage(error.message);
        return { title, message };
      }
    } else {
      message = sanitizeRawMessage(error.message);
      return { title, message };
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
    message =
      typeof detail === 'string'
        ? sanitizeRawMessage(detail)
        : detail?.message || 'An error occurred';
    return { title, message };
  }

  // Handle simple message format
  if (error?.response?.data?.message) {
    message = sanitizeRawMessage(error.response.data.message);
    return { title, message };
  }

  // Handle direct message
  if (error?.message) {
    message = sanitizeRawMessage(error.message);
    return { title, message };
  }

  // Handle string errors
  if (typeof error === 'string') {
    message = sanitizeRawMessage(error);
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
    'VALIDATION_ERROR': 'Check Your Input',
    'EMAIL_ALREADY_EXISTS': 'Email Already Exists',
    'WEAK_PASSWORD': 'Weak Password',
    'RATE_LIMIT_EXCEEDED': 'Rate Limit Exceeded',
    'SERVICE_UNAVAILABLE': 'Service Unavailable',
    'INTERNAL_SERVER_ERROR': 'Something Went Wrong',
    'NOT_FOUND': 'Not Found',
    'PAYMENT_FAILED': 'Payment Failed',
    'EMAIL_SEND_FAILED': 'Email Send Failed',
    'NETWORK_ERROR': 'Connection Problem',
    'FILENAME_EXISTS': 'File Name Already Exists',
    'QUOTA_EXCEEDED': 'Usage Limit Reached',
    'LIST_NAME_EXISTS': 'List Name Already Exists',
    'RULE_NAME_EXISTS': 'Rule Name Already Exists',
    'CONFLICT': 'Unable to Complete',
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
