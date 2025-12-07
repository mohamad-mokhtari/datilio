"""
Utility functions for standardized HTTP exceptions
"""
from fastapi import HTTPException, status
from typing import Optional, Dict, Any


def create_http_exception(
    status_code: int,
    error_code: str,
    message: str,
    extra: Optional[Dict[str, Any]] = None
) -> HTTPException:
    """
    Create a standardized HTTPException with consistent format
    
    Args:
        status_code: HTTP status code
        error_code: Custom error code for frontend handling
        message: User-friendly error message
        extra: Additional data (optional)
    
    Returns:
        HTTPException with standardized detail format
    """
    detail = {
        "message": message,
        "error_code": error_code
    }
    
    if extra:
        detail["extra"] = extra
    
    return HTTPException(status_code=status_code, detail=detail)


# Common error exceptions
def not_found_error(message: str = "Resource not found", extra: Optional[Dict[str, Any]] = None) -> HTTPException:
    """Create a 404 Not Found error"""
    return create_http_exception(
        status_code=status.HTTP_404_NOT_FOUND,
        error_code="NOT_FOUND",
        message=message,
        extra=extra
    )


def bad_request_error(error_code: str, message: str, extra: Optional[Dict[str, Any]] = None) -> HTTPException:
    """Create a 400 Bad Request error"""
    return create_http_exception(
        status_code=status.HTTP_400_BAD_REQUEST,
        error_code=error_code,
        message=message,
        extra=extra
    )


def unauthorized_error(message: str = "Authentication required", extra: Optional[Dict[str, Any]] = None) -> HTTPException:
    """Create a 401 Unauthorized error"""
    return create_http_exception(
        status_code=status.HTTP_401_UNAUTHORIZED,
        error_code="UNAUTHORIZED",
        message=message,
        extra=extra
    )


def forbidden_error(error_code: str, message: str, extra: Optional[Dict[str, Any]] = None) -> HTTPException:
    """Create a 403 Forbidden error"""
    return create_http_exception(
        status_code=status.HTTP_403_FORBIDDEN,
        error_code=error_code,
        message=message,
        extra=extra
    )


def internal_server_error(message: str = "Something went wrong. Please try again later.", extra: Optional[Dict[str, Any]] = None) -> HTTPException:
    """Create a 500 Internal Server Error"""
    return create_http_exception(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code="INTERNAL_SERVER_ERROR",
        message=message,
        extra=extra
    )


def validation_error(message: str = "Please check your input and try again.", extra: Optional[Dict[str, Any]] = None) -> HTTPException:
    """Create a 422 Validation Error"""
    return create_http_exception(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error_code="VALIDATION_ERROR",
        message=message,
        extra=extra
    )


def conflict_error(error_code: str, message: str, extra: Optional[Dict[str, Any]] = None) -> HTTPException:
    """Create a 409 Conflict error"""
    return create_http_exception(
        status_code=status.HTTP_409_CONFLICT,
        error_code=error_code,
        message=message,
        extra=extra
    )


def too_many_requests_error(message: str = "Too many requests. Please wait a moment before trying again.", extra: Optional[Dict[str, Any]] = None) -> HTTPException:
    """Create a 429 Too Many Requests error"""
    return create_http_exception(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        error_code="RATE_LIMIT_EXCEEDED",
        message=message,
        extra=extra
    )
