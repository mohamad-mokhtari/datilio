"""
Error logging service for handling and storing errors
"""
import traceback
import json
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from fastapi import Request

from app.models.error_log_model import ErrorLog, ErrorCounter, ErrorSeverity, ErrorCategory
from app.core.error_messages import ErrorMessages
from app.core.db_setup import get_db


class ErrorLoggingService:
    """Service for logging and managing errors"""
    
    @staticmethod
    def log_error(
        error_code: str,
        error_message: str,
        technical_message: Optional[str] = None,
        stack_trace: Optional[str] = None,
        request: Optional[Request] = None,
        user_id: Optional[UUID] = None,
        request_data: Optional[Dict[str, Any]] = None,
        response_status: Optional[int] = None,
        db: Optional[Session] = None
    ) -> Optional[ErrorLog]:
        """
        Log an error to the database
        
        Args:
            error_code: Custom error code
            error_message: User-friendly error message
            technical_message: Technical details for debugging
            stack_trace: Full stack trace
            request: FastAPI request object
            user_id: User ID who triggered the error
            request_data: Request payload (will be sanitized)
            response_status: HTTP response status
            db: Database session
            
        Returns:
            ErrorLog instance if logged, None if not logged
        """
        if not db:
            db = next(get_db())
        
        try:
            # Get error configuration
            error_config = ErrorMessages.get_error_config(error_code)
            
            # Only log to database if configured to do so
            if not error_config["log_to_db"]:
                # Increment counter for non-critical errors
                ErrorLoggingService._increment_error_counter(
                    error_code=error_code,
                    endpoint=request.url.path if request else None,
                    user_id=user_id,
                    db=db
                )
                return None
            
            # Sanitize request data
            sanitized_data = ErrorLoggingService._sanitize_request_data(request_data)
            
            # Extract request information
            endpoint = request.url.path if request else None
            method = request.method if request else None
            ip_address = ErrorLoggingService._get_client_ip(request) if request else None
            user_agent = request.headers.get("user-agent") if request else None
            
            # Create error log entry
            error_log = ErrorLog(
                error_code=error_code,
                error_message=error_message,
                technical_message=technical_message,
                stack_trace=stack_trace,
                severity=error_config["severity"],
                category=error_config["category"],
                endpoint=endpoint,
                method=method,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                request_data=sanitized_data,
                response_status=response_status
            )
            
            db.add(error_log)
            db.commit()
            db.refresh(error_log)
            
            return error_log
            
        except Exception as e:
            # If logging fails, at least print to console
            print(f"Failed to log error to database: {e}")
            db.rollback()
            return None
    
    @staticmethod
    def _increment_error_counter(
        error_code: str,
        endpoint: Optional[str] = None,
        user_id: Optional[UUID] = None,
        db: Optional[Session] = None
    ):
        """Increment error counter for non-critical errors"""
        if not db:
            db = next(get_db())
        
        try:
            # Check if counter exists for today
            today = datetime.utcnow().date()
            counter = db.query(ErrorCounter).filter(
                ErrorCounter.error_code == error_code,
                ErrorCounter.endpoint == endpoint,
                ErrorCounter.user_id == user_id,
                func.date(ErrorCounter.date) == today
            ).first()
            
            if counter:
                # Increment existing counter
                counter.count += 1
                counter.last_occurrence = datetime.utcnow()
            else:
                # Create new counter
                counter = ErrorCounter(
                    error_code=error_code,
                    endpoint=endpoint,
                    user_id=user_id,
                    count=1
                )
                db.add(counter)
            
            db.commit()
            
        except Exception as e:
            print(f"Failed to increment error counter: {e}")
            db.rollback()
    
    @staticmethod
    def _sanitize_request_data(request_data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Sanitize request data to remove sensitive information"""
        if not request_data:
            return None
        
        # Fields to remove or mask
        sensitive_fields = {
            'password', 'token', 'secret', 'key', 'api_key', 
            'authorization', 'cookie', 'session', 'credit_card',
            'ssn', 'social_security', 'bank_account'
        }
        
        def sanitize_value(value):
            if isinstance(value, dict):
                return {k: sanitize_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [sanitize_value(item) for item in value]
            elif isinstance(value, str) and len(value) > 100:
                return value[:100] + "..."
            else:
                return value
        
        sanitized = {}
        for key, value in request_data.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_fields):
                sanitized[key] = "[REDACTED]"
            else:
                sanitized[key] = sanitize_value(value)
        
        return sanitized
    
    @staticmethod
    def _get_client_ip(request: Request) -> Optional[str]:
        """Extract client IP address from request"""
        # Check for forwarded IP first
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to client host
        return request.client.host if request.client else None
    
    @staticmethod
    def get_error_logs(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        severity: Optional[str] = None,
        category: Optional[str] = None,
        is_resolved: Optional[bool] = None,
        user_id: Optional[UUID] = None
    ) -> tuple[List[ErrorLog], int]:
        """Get paginated error logs with filtering"""
        query = db.query(ErrorLog)
        
        # Apply filters
        if severity:
            query = query.filter(ErrorLog.severity == severity)
        
        if category:
            query = query.filter(ErrorLog.category == category)
        
        if is_resolved is not None:
            query = query.filter(ErrorLog.is_resolved == is_resolved)
        
        if user_id:
            query = query.filter(ErrorLog.user_id == user_id)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        error_logs = query.order_by(desc(ErrorLog.created_at)).offset(offset).limit(page_size).all()
        
        return error_logs, total_count
    
    @staticmethod
    def get_error_statistics(db: Session, days: int = 7) -> Dict[str, Any]:
        """Get error statistics for the last N days"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Error counts by severity
        severity_counts = db.query(
            ErrorLog.severity,
            func.count(ErrorLog.id).label('count')
        ).filter(
            ErrorLog.created_at >= start_date
        ).group_by(ErrorLog.severity).all()
        
        # Error counts by category
        category_counts = db.query(
            ErrorLog.category,
            func.count(ErrorLog.id).label('count')
        ).filter(
            ErrorLog.created_at >= start_date
        ).group_by(ErrorLog.category).all()
        
        # Daily error counts
        daily_counts = db.query(
            func.date(ErrorLog.created_at).label('date'),
            func.count(ErrorLog.id).label('count')
        ).filter(
            ErrorLog.created_at >= start_date
        ).group_by(func.date(ErrorLog.created_at)).all()
        
        # Top error codes
        top_errors = db.query(
            ErrorLog.error_code,
            func.count(ErrorLog.id).label('count')
        ).filter(
            ErrorLog.created_at >= start_date
        ).group_by(ErrorLog.error_code).order_by(desc('count')).limit(10).all()
        
        return {
            "severity_counts": {item.severity: item.count for item in severity_counts},
            "category_counts": {item.category: item.count for item in category_counts},
            "daily_counts": [{"date": str(item.date), "count": item.count} for item in daily_counts],
            "top_errors": [{"error_code": item.error_code, "count": item.count} for item in top_errors]
        }
    
    @staticmethod
    def mark_error_resolved(
        error_id: UUID,
        resolved_by: UUID,
        resolution_notes: Optional[str] = None,
        db: Optional[Session] = None
    ) -> bool:
        """Mark an error as resolved"""
        if not db:
            db = next(get_db())
        
        try:
            error_log = db.query(ErrorLog).filter(ErrorLog.id == error_id).first()
            
            if not error_log:
                return False
            
            error_log.is_resolved = True
            error_log.resolved_at = datetime.utcnow()
            error_log.resolved_by = resolved_by
            error_log.resolution_notes = resolution_notes
            
            db.commit()
            return True
            
        except Exception as e:
            print(f"Failed to mark error as resolved: {e}")
            db.rollback()
            return False
    
    @staticmethod
    def get_error_counters(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        error_code: Optional[str] = None
    ) -> tuple[List[ErrorCounter], int]:
        """Get error counters with pagination"""
        query = db.query(ErrorCounter)
        
        if error_code:
            query = query.filter(ErrorCounter.error_code == error_code)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        counters = query.order_by(desc(ErrorCounter.last_occurrence)).offset(offset).limit(page_size).all()
        
        return counters, total_count
