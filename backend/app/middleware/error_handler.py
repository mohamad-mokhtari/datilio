"""
Global error handler middleware for FastAPI
"""
import traceback
import json
from typing import Union, Optional
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError
from pydantic import ValidationError

from app.core.error_messages import ErrorMessages
from app.services.error_logging_service import ErrorLoggingService
from app.core.db_setup import get_db


class ErrorHandler:
    """Global error handler for the application"""
    
    @staticmethod
    async def handle_exception(request: Request, exc: Exception) -> JSONResponse:
        """Handle all exceptions and return user-friendly responses"""
        
        # Get database session for logging
        db = next(get_db())
        
        try:
            # Determine error type and response
            if isinstance(exc, HTTPException):
                return await ErrorHandler._handle_http_exception(request, exc, db)
            elif isinstance(exc, RequestValidationError):
                return await ErrorHandler._handle_validation_error(request, exc, db)
            elif isinstance(exc, SQLAlchemyError):
                return await ErrorHandler._handle_database_error(request, exc, db)
            elif isinstance(exc, ValidationError):
                return await ErrorHandler._handle_pydantic_validation_error(request, exc, db)
            else:
                return await ErrorHandler._handle_generic_error(request, exc, db)
                
        except Exception as logging_error:
            # If logging fails, at least return a basic error response
            print(f"Error in error handler: {logging_error}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "Something went wrong. Please try again later.",
                        "details": None
                    }
                }
            )
        finally:
            db.close()
    
    @staticmethod
    async def _handle_http_exception(request: Request, exc: HTTPException, db) -> JSONResponse:
        """Handle HTTP exceptions"""
        
        # Map HTTP status codes to error codes
        status_code_mapping = {
            400: "VALIDATION_ERROR",
            401: "INVALID_CREDENTIALS",
            403: "ACCESS_DENIED",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            422: "VALIDATION_ERROR",
            429: "RATE_LIMIT_EXCEEDED",
            500: "INTERNAL_SERVER_ERROR",
            502: "SERVICE_UNAVAILABLE",
            503: "SERVICE_UNAVAILABLE",
            504: "SERVICE_UNAVAILABLE"
        }
        
        error_code = status_code_mapping.get(exc.status_code, "INTERNAL_SERVER_ERROR")
        user_message = ErrorMessages.get_user_message(error_code)
        
        # Log error if it's a server error
        if exc.status_code >= 500:
            ErrorLoggingService.log_error(
                error_code=error_code,
                error_message=user_message,
                technical_message=str(exc.detail),
                stack_trace=traceback.format_exc(),
                request=request,
                response_status=exc.status_code,
                db=db
            )
        elif exc.status_code >= 400:
            # Log client errors as counters
            ErrorLoggingService._increment_error_counter(
                error_code=error_code,
                endpoint=request.url.path,
                db=db
            )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": error_code,
                    "message": user_message,
                    "details": exc.detail if exc.status_code < 500 else None
                }
            }
        )
    
    @staticmethod
    async def _handle_validation_error(request: Request, exc: RequestValidationError, db) -> JSONResponse:
        """Handle request validation errors"""
        
        # Extract validation errors
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            message = error["msg"]
            errors.append(f"{field}: {message}")
        
        error_details = "; ".join(errors)
        
        # Log as counter (validation errors are common and not critical)
        ErrorLoggingService._increment_error_counter(
            error_code="VALIDATION_ERROR",
            endpoint=request.url.path,
            db=db
        )
        
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Please check your input and try again.",
                    "details": error_details
                }
            }
        )
    
    @staticmethod
    async def _handle_database_error(request: Request, exc: SQLAlchemyError, db) -> JSONResponse:
        """Handle database errors"""
        
        error_code = "DATABASE_ERROR"
        user_message = ErrorMessages.get_user_message(error_code)
        
        # Log database errors as they are critical
        ErrorLoggingService.log_error(
            error_code=error_code,
            error_message=user_message,
            technical_message=str(exc),
            stack_trace=traceback.format_exc(),
            request=request,
            response_status=500,
            db=db
        )
        
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": error_code,
                    "message": user_message,
                    "details": None
                }
            }
        )
    
    @staticmethod
    async def _handle_pydantic_validation_error(request: Request, exc: ValidationError, db) -> JSONResponse:
        """Handle Pydantic validation errors"""
        
        error_code = "VALIDATION_ERROR"
        user_message = ErrorMessages.get_user_message(error_code)
        
        # Extract validation errors
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            message = error["msg"]
            errors.append(f"{field}: {message}")
        
        error_details = "; ".join(errors)
        
        # Log as counter
        ErrorLoggingService._increment_error_counter(
            error_code=error_code,
            endpoint=request.url.path,
            db=db
        )
        
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": error_code,
                    "message": user_message,
                    "details": error_details
                }
            }
        )
    
    @staticmethod
    async def _handle_generic_error(request: Request, exc: Exception, db) -> JSONResponse:
        """Handle generic/unexpected errors"""
        
        error_code = "INTERNAL_SERVER_ERROR"
        user_message = ErrorMessages.get_user_message(error_code)
        
        # Log all unexpected errors
        ErrorLoggingService.log_error(
            error_code=error_code,
            error_message=user_message,
            technical_message=str(exc),
            stack_trace=traceback.format_exc(),
            request=request,
            response_status=500,
            db=db
        )
        
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": error_code,
                    "message": user_message,
                    "details": None
                }
            }
        )


def create_error_response(error_code: str, message: Optional[str] = None, details: Optional[str] = None) -> JSONResponse:
    """Create a standardized error response"""
    
    user_message = message or ErrorMessages.get_user_message(error_code)
    
    return JSONResponse(
        status_code=500,  # Default status code
        content={
            "error": {
                "code": error_code,
                "message": user_message,
                "details": details
            }
        }
    )
