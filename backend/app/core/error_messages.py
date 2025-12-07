"""
Error messages configuration for user-friendly error handling
"""
from typing import Dict, Any
from app.models.error_log_model import ErrorSeverity, ErrorCategory


class ErrorMessages:
    """Centralized error messages for consistent user experience"""
    
    # General system errors
    INTERNAL_SERVER_ERROR = {
        "code": "INTERNAL_SERVER_ERROR",
        "message": "Something went wrong. Please try again later.",
        "severity": ErrorSeverity.HIGH,
        "category": ErrorCategory.SYSTEM,
        "log_to_db": True
    }
    
    SERVICE_UNAVAILABLE = {
        "code": "SERVICE_UNAVAILABLE", 
        "message": "Service is temporarily unavailable. Please try again in a few minutes.",
        "severity": ErrorSeverity.HIGH,
        "category": ErrorCategory.SYSTEM,
        "log_to_db": True
    }
    
    # Authentication errors
    INVALID_CREDENTIALS = {
        "code": "INVALID_CREDENTIALS",
        "message": "Invalid email or password. Please check your credentials and try again.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.AUTHENTICATION,
        "log_to_db": False
    }
    
    EMAIL_NOT_VERIFIED = {
        "code": "EMAIL_NOT_VERIFIED",
        "message": "Please verify your email address before signing in. Check your inbox for the verification link.",
        "severity": ErrorSeverity.MEDIUM,
        "category": ErrorCategory.AUTHENTICATION,
        "log_to_db": True
    }
    
    ACCOUNT_NOT_FOUND = {
        "code": "ACCOUNT_NOT_FOUND",
        "message": "No account found with this email address. Please sign up first.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.AUTHENTICATION,
        "log_to_db": False
    }
    
    TOKEN_EXPIRED = {
        "code": "TOKEN_EXPIRED",
        "message": "Your session has expired. Please sign in again.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.AUTHENTICATION,
        "log_to_db": False
    }
    
    INVALID_TOKEN = {
        "code": "INVALID_TOKEN",
        "message": "Invalid or corrupted verification link. Please request a new one.",
        "severity": ErrorSeverity.MEDIUM,
        "category": ErrorCategory.AUTHENTICATION,
        "log_to_db": True
    }
    
    # Authorization errors
    ACCESS_DENIED = {
        "code": "ACCESS_DENIED",
        "message": "You don't have permission to access this resource.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.AUTHORIZATION,
        "log_to_db": False
    }
    
    ADMIN_REQUIRED = {
        "code": "ADMIN_REQUIRED",
        "message": "This action requires administrator privileges.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.AUTHORIZATION,
        "log_to_db": False
    }
    
    # Validation errors
    VALIDATION_ERROR = {
        "code": "VALIDATION_ERROR",
        "message": "Please check your input and try again.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.VALIDATION,
        "log_to_db": False
    }
    
    EMAIL_ALREADY_EXISTS = {
        "code": "EMAIL_ALREADY_EXISTS",
        "message": "An account with this email address already exists. Please use a different email or sign in.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.VALIDATION,
        "log_to_db": False
    }
    
    USERNAME_ALREADY_EXISTS = {
        "code": "USERNAME_ALREADY_EXISTS",
        "message": "This username is already taken. Please choose a different one.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.VALIDATION,
        "log_to_db": False
    }
    
    WEAK_PASSWORD = {
        "code": "WEAK_PASSWORD",
        "message": "Password must be at least 8 characters long and contain letters and numbers.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.VALIDATION,
        "log_to_db": False
    }
    
    # Database errors
    DATABASE_ERROR = {
        "code": "DATABASE_ERROR",
        "message": "Unable to process your request due to a database issue. Please try again later.",
        "severity": ErrorSeverity.HIGH,
        "category": ErrorCategory.DATABASE,
        "log_to_db": True
    }
    
    RECORD_NOT_FOUND = {
        "code": "RECORD_NOT_FOUND",
        "message": "The requested information could not be found.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.DATABASE,
        "log_to_db": False
    }
    
    # File upload errors
    FILE_TOO_LARGE = {
        "code": "FILE_TOO_LARGE",
        "message": "File size exceeds the maximum limit. Please choose a smaller file.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.FILE_UPLOAD,
        "log_to_db": False
    }
    
    INVALID_FILE_TYPE = {
        "code": "INVALID_FILE_TYPE",
        "message": "File type not supported. Please upload a valid file format.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.FILE_UPLOAD,
        "log_to_db": False
    }
    
    FILE_UPLOAD_FAILED = {
        "code": "FILE_UPLOAD_FAILED",
        "message": "Failed to upload file. Please try again.",
        "severity": ErrorSeverity.MEDIUM,
        "category": ErrorCategory.FILE_UPLOAD,
        "log_to_db": True
    }
    
    # Email errors
    EMAIL_SEND_FAILED = {
        "code": "EMAIL_SEND_FAILED",
        "message": "Failed to send email. Please try again later.",
        "severity": ErrorSeverity.MEDIUM,
        "category": ErrorCategory.EMAIL,
        "log_to_db": True
    }
    
    # Payment errors
    PAYMENT_FAILED = {
        "code": "PAYMENT_FAILED",
        "message": "Payment could not be processed. Please check your payment details and try again.",
        "severity": ErrorSeverity.CRITICAL,
        "category": ErrorCategory.PAYMENT,
        "log_to_db": True
    }
    
    PAYMENT_GATEWAY_ERROR = {
        "code": "PAYMENT_GATEWAY_ERROR",
        "message": "Payment service is temporarily unavailable. Please try again later.",
        "severity": ErrorSeverity.HIGH,
        "category": ErrorCategory.PAYMENT,
        "log_to_db": True
    }
    
    # Security errors
    SUSPICIOUS_ACTIVITY = {
        "code": "SUSPICIOUS_ACTIVITY",
        "message": "Suspicious activity detected. Your account has been temporarily locked for security.",
        "severity": ErrorSeverity.HIGH,
        "category": ErrorCategory.SECURITY,
        "log_to_db": True
    }
    
    RATE_LIMIT_EXCEEDED = {
        "code": "RATE_LIMIT_EXCEEDED",
        "message": "Too many requests. Please wait a moment before trying again.",
        "severity": ErrorSeverity.MEDIUM,
        "category": ErrorCategory.SECURITY,
        "log_to_db": True
    }
    
    # Business logic errors
    FEEDBACK_CLOSED = {
        "code": "FEEDBACK_CLOSED",
        "message": "This feedback conversation is closed. You cannot add more messages.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.BUSINESS_LOGIC,
        "log_to_db": False
    }
    
    QUOTA_EXCEEDED = {
        "code": "QUOTA_EXCEEDED",
        "message": "You have reached your usage limit. Please upgrade your plan to continue.",
        "severity": ErrorSeverity.MEDIUM,
        "category": ErrorCategory.BUSINESS_LOGIC,
        "log_to_db": True
    }
    
    # External API errors
    EXTERNAL_API_ERROR = {
        "code": "EXTERNAL_API_ERROR",
        "message": "External service is temporarily unavailable. Please try again later.",
        "severity": ErrorSeverity.MEDIUM,
        "category": ErrorCategory.EXTERNAL_API,
        "log_to_db": True
    }
    
    # Not found errors
    NOT_FOUND = {
        "code": "NOT_FOUND",
        "message": "The requested resource was not found.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.OTHER,
        "log_to_db": False
    }
    
    # Method not allowed
    METHOD_NOT_ALLOWED = {
        "code": "METHOD_NOT_ALLOWED",
        "message": "This action is not allowed.",
        "severity": ErrorSeverity.LOW,
        "category": ErrorCategory.OTHER,
        "log_to_db": False
    }
    
    @classmethod
    def get_error_config(cls, error_code: str) -> Dict[str, Any]:
        """Get error configuration by code"""
        return getattr(cls, error_code, cls.INTERNAL_SERVER_ERROR)
    
    @classmethod
    def get_user_message(cls, error_code: str) -> str:
        """Get user-friendly message by error code"""
        config = cls.get_error_config(error_code)
        return config["message"]
    
    @classmethod
    def should_log_to_db(cls, error_code: str) -> bool:
        """Check if error should be logged to database"""
        config = cls.get_error_config(error_code)
        return config["log_to_db"]
    
    @classmethod
    def get_severity(cls, error_code: str) -> str:
        """Get error severity by code"""
        config = cls.get_error_config(error_code)
        return config["severity"]
    
    @classmethod
    def get_category(cls, error_code: str) -> str:
        """Get error category by code"""
        config = cls.get_error_config(error_code)
        return config["category"]
