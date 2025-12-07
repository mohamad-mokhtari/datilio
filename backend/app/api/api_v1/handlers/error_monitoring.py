"""
Admin endpoints for error monitoring and management
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from app.models.user_model import User
from app.api.deps.user_deps import get_admin_user
from app.core.db_setup import get_db
from app.services.error_logging_service import ErrorLoggingService
from app.models.error_log_model import ErrorLog, ErrorCounter
from app.schemas.error_schemas import (
    ErrorLogResponse, ErrorLogListResponse, ErrorStatisticsResponse,
    ErrorCounterResponse, ErrorResolutionRequest
)
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)

error_monitoring_router = APIRouter()


@error_monitoring_router.get("/logs", response_model=List[ErrorLogListResponse], summary="Get Error Logs")
async def get_error_logs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    category: Optional[str] = Query(None, description="Filter by category"),
    is_resolved: Optional[bool] = Query(None, description="Filter by resolution status"),
    user_id: Optional[UUID] = Query(None, description="Filter by user ID"),
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get paginated error logs with filtering options (Admin only)
    """
    try:
        error_logs, total_count = ErrorLoggingService.get_error_logs(
            db=db,
            page=page,
            page_size=page_size,
            severity=severity,
            category=category,
            is_resolved=is_resolved,
            user_id=user_id
        )
        
        return [
            ErrorLogListResponse(
                id=log.id,
                error_code=log.error_code,
                error_message=log.error_message,
                severity=log.severity,
                category=log.category,
                endpoint=log.endpoint,
                method=log.method,
                user_id=log.user_id,
                user_email=log.user.email if log.user else None,
                ip_address=log.ip_address,
                response_status=log.response_status,
                is_resolved=log.is_resolved,
                resolved_at=log.resolved_at,
                resolved_by=log.resolved_by,
                resolver_email=log.resolver.email if log.resolver else None,
                created_at=log.created_at
            ) for log in error_logs
        ]
        
    except Exception as e:
        raise internal_server_error(
            message="Failed to retrieve error logs. Please try again later."
        )


@error_monitoring_router.get("/logs/{error_id}", response_model=ErrorLogResponse, summary="Get Error Log Details")
async def get_error_log_details(
    error_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific error log (Admin only)
    """
    try:
        error_log = db.query(ErrorLog).filter(ErrorLog.id == error_id).first()
        
        if not error_log:
            raise not_found_error(message="Error log not found")
        
        return ErrorLogResponse(
            id=error_log.id,
            error_code=error_log.error_code,
            error_message=error_log.error_message,
            technical_message=error_log.technical_message,
            stack_trace=error_log.stack_trace,
            severity=error_log.severity,
            category=error_log.category,
            endpoint=error_log.endpoint,
            method=error_log.method,
            user_id=error_log.user_id,
            user_email=error_log.user.email if error_log.user else None,
            ip_address=error_log.ip_address,
            user_agent=error_log.user_agent,
            request_data=error_log.request_data,
            response_status=error_log.response_status,
            is_resolved=error_log.is_resolved,
            resolved_at=error_log.resolved_at,
            resolved_by=error_log.resolved_by,
            resolver_email=error_log.resolver.email if error_log.resolver else None,
            resolution_notes=error_log.resolution_notes,
            created_at=error_log.created_at,
            updated_at=error_log.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise internal_server_error(
            message="Failed to retrieve error log. Please try again later."
        )


@error_monitoring_router.post("/logs/{error_id}/resolve", summary="Mark Error as Resolved")
async def mark_error_resolved(
    error_id: UUID,
    resolution_data: ErrorResolutionRequest,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Mark an error as resolved with resolution notes (Admin only)
    """
    try:
        success = ErrorLoggingService.mark_error_resolved(
            error_id=error_id,
            resolved_by=current_user.id,
            resolution_notes=resolution_data.resolution_notes,
            db=db
        )
        
        if not success:
            raise not_found_error(message="Error log not found")
        
        return {"message": "Error marked as resolved successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise internal_server_error(
            message="Failed to mark error as resolved. Please try again later."
        )


@error_monitoring_router.get("/statistics", response_model=ErrorStatisticsResponse, summary="Get Error Statistics")
async def get_error_statistics(
    days: int = Query(7, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get error statistics and trends (Admin only)
    """
    try:
        statistics = ErrorLoggingService.get_error_statistics(db=db, days=days)
        
        return ErrorStatisticsResponse(
            period_days=days,
            severity_counts=statistics["severity_counts"],
            category_counts=statistics["category_counts"],
            daily_counts=statistics["daily_counts"],
            top_errors=statistics["top_errors"]
        )
        
    except Exception as e:
        raise internal_server_error(
            message="Failed to retrieve error statistics. Please try again later."
        )


@error_monitoring_router.get("/counters", response_model=List[ErrorCounterResponse], summary="Get Error Counters")
async def get_error_counters(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    error_code: Optional[str] = Query(None, description="Filter by error code"),
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get error counters for non-critical errors (Admin only)
    """
    try:
        counters, total_count = ErrorLoggingService.get_error_counters(
            db=db,
            page=page,
            page_size=page_size,
            error_code=error_code
        )
        
        return [
            ErrorCounterResponse(
                id=counter.id,
                error_code=counter.error_code,
                endpoint=counter.endpoint,
                user_id=counter.user_id,
                user_email=counter.user.email if counter.user else None,
                count=counter.count,
                first_occurrence=counter.first_occurrence,
                last_occurrence=counter.last_occurrence,
                date=counter.date
            ) for counter in counters
        ]
        
    except Exception as e:
        raise internal_server_error(
            message="Failed to retrieve error counters. Please try again later."
        )


@error_monitoring_router.get("/health", summary="Error Monitoring Health Check")
async def error_monitoring_health(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Health check for error monitoring system (Admin only)
    """
    try:
        # Check if we can query the error logs table
        error_count = db.query(ErrorLog).count()
        counter_count = db.query(ErrorCounter).count()
        
        return {
            "status": "healthy",
            "error_logs_count": error_count,
            "error_counters_count": counter_count,
            "message": "Error monitoring system is operational"
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "message": "Error monitoring system has issues"
        }
