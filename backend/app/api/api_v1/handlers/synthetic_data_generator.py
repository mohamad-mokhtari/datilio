from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.services.synthetic_data_service import SyntheticDataService
from app.models.user_data_model import UserData, FileType, DataSource
from app.schemas.synthetic_data_schemas import SyntheticDataRequest, SimilarColumnsRequest
from app.db_drivers.qdrant_driver import QdrantDriver
import os
import json
import pandas as pd
from typing import List, Optional
from sentence_transformers import SentenceTransformer
from qdrant_client.models import PointStruct
from pydantic import BaseModel, Field
from typing import Dict, Any, List
from app.models.user_model import User
from app.api.deps.user_deps import get_current_user
from app.core.db_setup import get_db
from app.services.usage_service import UsageService
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)

synthetic_generator_router = APIRouter()


class RetryTaskRequest(BaseModel):
    """Request body for retrying a task with optional new filename"""
    new_filename: Optional[str] = Field(
        None,
        description="New filename for the generated data. If not provided, will use original filename with '_retry_N' suffix.",
        example="my_new_data.csv"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "new_filename": "synthetic_data_retry.csv"
            }
        }


@synthetic_generator_router.post("/retry-task/{task_id}")
async def retry_failed_task(
    task_id: str,
    request: RetryTaskRequest = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retry a failed synthetic data generation task with a new filename.
    
    **IMPORTANT:** You must provide a NEW filename that doesn't already exist.
    This prevents accidentally overwriting data you created after the original failure.
    
    How it works:
    1. Fetch the original failed task
    2. Extract the input parameters (columns, num_rows)
    3. Check if the new filename already exists
    4. If exists → Return error (user must choose different name)
    5. If not exists → Create new task with new filename
    
    Request Body:
        {
            "new_filename": "my_data_v2.csv"  // Optional: If not provided, auto-generates
        }
    
    Returns:
        {
            "message": "Task retry initiated successfully",
            "original_task_id": "old-uuid",
            "new_task_id": "new-uuid",
            "task_name": "Generate my_data_v2.csv",
            "estimated_time_seconds": 60
        }
    """
    from app.tasks.synthetic_data_tasks import generate_synthetic_data_task
    from app.models.task_model import Task, TaskType, TaskStatus
    from app.models.user_data_model import UserData
    from datetime import datetime, timezone
    import uuid
    import re
    
    try:
        # Handle optional request body
        if request is None:
            request = RetryTaskRequest()
        # Get the original task
        original_task = db.query(Task).filter(
            Task.id == task_id,
            Task.user_id == current_user.id  # Ensure user owns the task
        ).first()
        
        if not original_task:
            raise not_found_error(
                message="Task not found or you don't have permission to retry it.",
                extra={"task_id": task_id}
            )
        
        # Check if task can be retried (only failed tasks)
        if original_task.status != TaskStatus.FAILURE:
            raise bad_request_error(
                error_code="TASK_NOT_RETRYABLE",
                message=f"Only failed tasks can be retried. This task has status: {original_task.status.value}",
                extra={
                    "task_status": original_task.status.value,
                    "task_id": task_id
                }
            )
        
        # Extract input parameters from original task
        input_params = original_task.input_params
        columns_info = input_params.get("columns_info")
        num_rows = input_params.get("num_rows")
        original_csv_file_name = input_params.get("csv_file_name")
        
        # Determine the new filename
        if request.new_filename:
            # User provided a new filename
            csv_file_name = request.new_filename.strip()
            
            # Ensure it ends with .csv
            if not csv_file_name.lower().endswith('.csv'):
                csv_file_name += '.csv'
            
            # Validate filename (no special characters except underscore, hyphen, dot)
            if not re.match(r'^[a-zA-Z0-9_\-\.]+\.csv$', csv_file_name):
                raise bad_request_error(
                    error_code="INVALID_FILENAME",
                    message="Filename can only contain letters, numbers, underscores, hyphens, and dots.",
                    extra={"filename": csv_file_name}
                )
        else:
            # Auto-generate filename with retry suffix
            base_name = original_csv_file_name.replace('.csv', '') if original_csv_file_name else 'synthetic_data'
            
            # Find next available retry number
            retry_num = 1
            while True:
                csv_file_name = f"{base_name}_retry_{retry_num}.csv"
                
                # Check if this filename exists
                existing = db.query(UserData).filter(
                    UserData.user_id == current_user.id,
                    UserData.file_name == csv_file_name
                ).first()
                
                if not existing:
                    break
                retry_num += 1
                
                # Safety: prevent infinite loop
                if retry_num > 100:
                    raise bad_request_error(
                        error_code="TOO_MANY_RETRIES",
                        message="Too many retry attempts with this filename. Please specify a custom filename.",
                        extra={"base_name": base_name}
                    )
        
        # Check if the chosen filename already exists
        existing_file = db.query(UserData).filter(
            UserData.user_id == current_user.id,
            UserData.file_name == csv_file_name
        ).first()
        
        if existing_file:
            raise bad_request_error(
                error_code="FILENAME_EXISTS",
                message=f"A file with the name '{csv_file_name}' already exists. Please choose a different filename to avoid overwriting your existing data.",
                extra={
                    "existing_filename": csv_file_name,
                    "existing_file_id": str(existing_file.id),
                    "suggestion": f"{csv_file_name.replace('.csv', '')}_v2.csv"
                }
            )
        
        if not columns_info or not num_rows:
            raise bad_request_error(
                error_code="INVALID_TASK_DATA",
                message="Original task is missing required parameters and cannot be retried.",
                extra={"task_id": task_id}
            )
        
        # Check usage limits before retrying
        if not UsageService.check_usage_limit(db, str(current_user.id), "synthetic_rows", num_rows):
            usage_summary = UsageService.get_usage_summary(db, str(current_user.id))
            current_usage = usage_summary.current_month.get("synthetic_rows", 0)
            limit = usage_summary.limits.get("synthetic_rows", 0)
            remaining = max(0, limit - current_usage)
            
            raise bad_request_error(
                error_code="QUOTA_EXCEEDED",
                message=f"Synthetic data limit exceeded. You requested {num_rows:,} rows, but you only have {int(remaining):,} rows remaining this month (used {int(current_usage):,} of {int(limit):,}). Please upgrade your plan or purchase additional synthetic data capacity.",
                extra={
                    "limit_type": "synthetic_rows",
                    "requested_amount": num_rows,
                    "current_usage": int(current_usage),
                    "monthly_limit": int(limit),
                    "remaining": int(remaining)
                }
            )
        
        # Estimate completion time
        estimated_time_seconds = max(10, int(num_rows / 1000 * 60))
        
        # Create new task record
        new_task_id = uuid.uuid4()
        
        new_task_record = Task(
            id=new_task_id,
            celery_task_id=str(new_task_id),
            user_id=current_user.id,
            task_type=TaskType.SYNTHETIC_DATA_GENERATION,
            task_name=f"Generate {csv_file_name or 'synthetic_data.csv'}",
            status=TaskStatus.PENDING,
            progress=0.0,
            input_params={
                "columns_info": columns_info,
                "num_rows": num_rows,
                "csv_file_name": csv_file_name,
                "retried_from": str(task_id)  # Track that this is a retry
            },
            estimated_time_seconds=estimated_time_seconds
        )
        db.add(new_task_record)
        db.commit()
        db.refresh(new_task_record)
        
        # Try to queue the Celery task
        try:
            celery_task = generate_synthetic_data_task.apply_async(
                args=[
                    str(new_task_id),
                    str(current_user.id),
                    current_user.email,
                    columns_info,
                    num_rows,
                    csv_file_name
                ],
                task_id=str(new_task_id)
            )
            
        except Exception as celery_error:
            # If Celery/Redis fails, mark the new task as failed
            new_task_record.status = TaskStatus.FAILURE
            new_task_record.completed_at = datetime.now(timezone.utc)
            new_task_record.error_message = f"Failed to queue task: {str(celery_error)}"
            db.commit()
            raise celery_error
        
        # Return success response
        return {
            "message": "Task retry initiated successfully",
            "original_task_id": str(task_id),
            "new_task_id": str(new_task_id),
            "task_name": new_task_record.task_name,
            "estimated_time_seconds": estimated_time_seconds,
            "progress_url": f"/api/v1/synthetic-data/task-status/{new_task_id}"
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        
        # Log technical error for backend team
        import logging
        logger = logging.getLogger(__name__)
        logger.error(
            f"Failed to retry task",
            exc_info=True,
            extra={
                "original_task_id": task_id,
                "user_id": str(current_user.id),
                "error_type": type(e).__name__,
                "error_details": str(e)
            }
        )
        
        # Check for specific error types
        error_str = str(e).lower()
        
        if "error 10061" in error_str or "connection refused" in error_str or "redis" in error_str:
            raise bad_request_error(
                error_code="SERVICE_UNAVAILABLE",
                message="Our background processing system is temporarily unavailable. Please try again in a few minutes.",
                extra={
                    "service": "background_processing",
                    "user_action": "retry_later"
                }
            )
        else:
            raise bad_request_error(
                error_code="RETRY_FAILED",
                message="Unable to retry task. Please try again or contact support.",
                extra={"user_action": "contact_support"}
            )

@synthetic_generator_router.get("/task-status/{task_id}")
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check the status and progress of a synthetic data generation task.
    
    Args:
        task_id: UUID of the task
    
    Returns:
        {
            "task_id": "uuid-string",
            "status": "pending|processing|success|failure",
            "progress": 75.5,
            "message": "Status message",
            "result": {...},  # Only present when status is 'success'
            "error": "Error message"  # Only present when status is 'failure'
        }
    """
    from app.models.task_model import Task, TaskStatus
    from app.core.celery_app import celery_app
    from datetime import datetime, timedelta, timezone
    
    try:
        # Get task from database
        task_record = db.query(Task).filter(
            Task.id == task_id,
            Task.user_id == current_user.id  # Ensure user can only see their own tasks
        ).first()
        
        if not task_record:
            raise not_found_error(
                message="Task not found or you don't have permission to access it.",
                extra={"task_id": task_id}
            )
        
        # Check for stale pending tasks (pending for more than 5 minutes)
        if task_record.status == TaskStatus.PENDING:
            time_since_created = datetime.now(timezone.utc) - task_record.created_at
            
            # If pending for more than 5 minutes, likely no workers available
            if time_since_created > timedelta(minutes=5):
                # Mark as failed due to timeout
                task_record.status = TaskStatus.FAILURE
                task_record.completed_at = datetime.now(timezone.utc)
                task_record.error_message = "Task timeout: No workers available to process this task. The task remained in queue for over 5 minutes. Please ensure Celery workers are running and try again."
                db.commit()
        
        # Get Celery task state (for real-time progress)
        celery_task = celery_app.AsyncResult(task_record.celery_task_id)
        
        response = {
            "task_id": str(task_record.id),
            "task_name": task_record.task_name,
            "status": task_record.status.value,
            "progress": task_record.progress,
            "created_at": task_record.created_at.isoformat() if task_record.created_at else None,
            "started_at": task_record.started_at.isoformat() if task_record.started_at else None,
            "estimated_time_seconds": task_record.estimated_time_seconds
        }
        
        # Add status-specific information
        if task_record.status == TaskStatus.SUCCESS:
            response["completed_at"] = task_record.completed_at.isoformat() if task_record.completed_at else None
            response["result"] = task_record.result
            response["message"] = "Task completed successfully"
            
        elif task_record.status == TaskStatus.FAILURE:
            response["completed_at"] = task_record.completed_at.isoformat() if task_record.completed_at else None
            response["error"] = task_record.error_message
            response["retry_count"] = task_record.retry_count if hasattr(task_record, 'retry_count') else 0
            
            # Differentiate between timeout and actual failure
            if "timeout" in task_record.error_message.lower() or "no workers" in task_record.error_message.lower():
                response["message"] = "Task failed: No workers available"
                response["failure_reason"] = "no_workers"
            else:
                response["message"] = "Task failed after retries"
                response["failure_reason"] = "processing_error"
            
        elif task_record.status == TaskStatus.PROCESSING:
            # Get real-time progress from Celery if available
            if celery_task.state == 'PROGRESS':
                celery_info = celery_task.info or {}
                response["progress"] = celery_info.get('progress', task_record.progress)
                response["current_step"] = celery_info.get('status', 'Processing...')
            response["message"] = "Task is currently processing"
            
        elif task_record.status == TaskStatus.PENDING:
            # Calculate how long it's been pending
            time_pending = datetime.now(timezone.utc) - task_record.created_at
            minutes_pending = int(time_pending.total_seconds() / 60)
            
            response["message"] = f"Task is queued and waiting to start (pending for {minutes_pending} min)"
            response["minutes_pending"] = minutes_pending
            
            # Warn if pending too long
            if minutes_pending >= 3:
                response["warning"] = "Task has been pending for a while. Workers may be busy or unavailable."
            
        elif task_record.status == TaskStatus.REVOKED:
            response["message"] = "Task was cancelled"
        
        return response
        
    except Exception as e:
        raise internal_server_error(
            message="Failed to retrieve task status.",
            extra={"error_details": str(e)}
        )


@synthetic_generator_router.get("/my-failed-tasks")
async def get_my_failed_tasks(
    limit: int = Query(20, ge=1, le=100, description="Number of tasks to return"),
    offset: int = Query(0, ge=0, description="Number of tasks to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's ORIGINAL failed tasks (excluding retry attempts).
    
    This endpoint returns only the original failed tasks that the user can retry.
    If a task was retried multiple times, only the ORIGINAL task is shown, not the retry attempts.
    
    Example:
        - Task A (original) → Failed
        - Task B (retry of A) → Failed  
        - Task C (retry of B) → Success
        
        This endpoint returns only: Task A (the original)
    
    Response includes:
        - can_retry: Whether the task can be retried
        - failure_type: Type of failure (service_unavailable, worker_timeout, processing_error)
        - has_successful_retry: Whether this task was successfully retried later
    
    Returns:
        {
            "total": 5,
            "limit": 20,
            "offset": 0,
            "failed_tasks": [...]
        }
    """
    from app.models.task_model import Task, TaskStatus
    from sqlalchemy import and_, or_
    
    try:
        # Get all user's tasks
        all_tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
        
        # Build map of retry relationships
        retry_map = {}  # {original_task_id: [retry_task_ids]}
        retried_from_map = {}  # {retry_task_id: original_task_id}
        
        for task in all_tasks:
            if task.input_params and 'retried_from' in task.input_params:
                original_id = task.input_params['retried_from']
                if original_id not in retry_map:
                    retry_map[original_id] = []
                retry_map[original_id].append(str(task.id))
                retried_from_map[str(task.id)] = original_id
        
        # Get failed tasks that are NOT retries themselves
        failed_tasks_query = db.query(Task).filter(
            and_(
                Task.user_id == current_user.id,
                Task.status == TaskStatus.FAILURE
            )
        )
        
        all_failed = failed_tasks_query.order_by(Task.created_at.desc()).all()
        
        # Filter to only original tasks (not retry attempts)
        original_failed_tasks = []
        for task in all_failed:
            task_id = str(task.id)
            # Include task if it's NOT a retry of another task
            if task_id not in retried_from_map:
                original_failed_tasks.append(task)
        
        # Apply pagination
        total = len(original_failed_tasks)
        paginated_tasks = original_failed_tasks[offset:offset + limit]
        
        # Build response with retry information
        tasks_list = []
        for task in paginated_tasks:
            task_id = str(task.id)
            
            task_dict = {
                "id": task_id,
                "celery_task_id": task.celery_task_id,
                "task_type": task.task_type.value,
                "task_name": task.task_name,
                "status": task.status.value,
                "progress": task.progress,
                "input_params": task.input_params,
                "error_message": task.error_message,
                "created_at": task.created_at.isoformat() if task.created_at else None,
                "started_at": task.started_at.isoformat() if task.started_at else None,
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                "estimated_time_seconds": task.estimated_time_seconds,
                "retry_count": task.retry_count if hasattr(task, 'retry_count') else 0,
                "can_retry": True  # All tasks in this list can be retried
            }
            
            # Categorize failure type
            if task.error_message:
                error_msg_lower = task.error_message.lower()
                if "redis" in error_msg_lower or "connection refused" in error_msg_lower or "failed to queue" in error_msg_lower:
                    task_dict["failure_type"] = "service_unavailable"
                elif "timeout" in error_msg_lower or "no workers" in error_msg_lower:
                    task_dict["failure_type"] = "worker_timeout"
                else:
                    task_dict["failure_type"] = "processing_error"
            
            # Check if this task has any retry attempts
            retry_attempts = retry_map.get(task_id, [])
            task_dict["retry_attempts_count"] = len(retry_attempts)
            
            # Check if any retry attempt succeeded
            has_successful_retry = False
            if retry_attempts:
                for retry_id in retry_attempts:
                    retry_task = db.query(Task).filter(Task.id == retry_id).first()
                    if retry_task and retry_task.status == TaskStatus.SUCCESS:
                        has_successful_retry = True
                        task_dict["successful_retry_id"] = retry_id
                        task_dict["successful_retry_result"] = retry_task.result
                        break
            
            task_dict["has_successful_retry"] = has_successful_retry
            
            tasks_list.append(task_dict)
        
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "failed_tasks": tasks_list
        }
        
    except Exception as e:
        raise internal_server_error(
            message="Failed to retrieve failed tasks.",
            extra={"error_details": str(e)}
        )


@synthetic_generator_router.get("/my-tasks")
async def get_my_tasks(
    status: str = Query(None, description="Filter by status: pending, processing, success, failure"),
    limit: int = Query(20, ge=1, le=100, description="Number of tasks to return"),
    offset: int = Query(0, ge=0, description="Number of tasks to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of user's tasks with optional filtering.
    
    Returns:
        {
            "total": 45,
            "tasks": [...]
        }
    """
    from app.models.task_model import Task, TaskStatus, TaskType
    
    try:
        # Build query
        query = db.query(Task).filter(Task.user_id == current_user.id)
        
        # Apply status filter if provided
        if status:
            try:
                status_enum = TaskStatus(status.lower())
                query = query.filter(Task.status == status_enum)
            except ValueError:
                raise bad_request_error(
                    error_code="INVALID_STATUS",
                    message=f"Invalid status: {status}. Valid values: pending, processing, success, failure, revoked"
                )
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        tasks = query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()
        
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "tasks": [task.to_dict() for task in tasks]
        }
        
    except Exception as e:
        raise internal_server_error(
            message="Failed to retrieve tasks.",
            extra={"error_details": str(e)}
        )


@synthetic_generator_router.post("/generate-synthetic-data/")
async def generate_synthetic_data(
    request: SyntheticDataRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start asynchronous synthetic data generation.
    
    This endpoint immediately returns a task_id that can be used to track progress.
    The actual data generation happens in the background via Celery.
    
    Returns:
        {
            "status": "processing",
            "message": "Synthetic data generation started",
            "task_id": "uuid-string",
            "task_name": "Generate synthetic_data.csv",
            "estimated_time_seconds": 120
        }
    """
    from app.tasks.synthetic_data_tasks import generate_synthetic_data_task
    from app.models.task_model import Task, TaskType, TaskStatus
    from datetime import datetime, timezone
    import uuid
    
    try:
        # Check usage limits before generating data
        if not UsageService.check_usage_limit(db, str(current_user.id), "synthetic_rows", request.num_rows):
            # Get current usage to show user helpful info
            usage_summary = UsageService.get_usage_summary(db, str(current_user.id))
            current_usage = usage_summary.current_month.get("synthetic_rows", 0)
            limit = usage_summary.limits.get("synthetic_rows", 0)
            remaining = max(0, limit - current_usage)
            
            raise bad_request_error(
                error_code="QUOTA_EXCEEDED",
                message=f"Synthetic data limit exceeded. You requested {request.num_rows:,} rows, but you only have {int(remaining):,} rows remaining this month (used {int(current_usage):,} of {int(limit):,}). Please upgrade your plan or purchase additional synthetic data capacity.",
                extra={
                    "limit_type": "synthetic_rows",
                    "requested_amount": request.num_rows,
                    "current_usage": int(current_usage),
                    "monthly_limit": int(limit),
                    "remaining": int(remaining)
                }
            )
        
        # Estimate completion time (rough estimate: 1000 rows per second)
        estimated_time_seconds = max(10, int(request.num_rows / 1000 * 60))
        
        # Create task record in database
        task_id = uuid.uuid4()
        
        # CRITICAL FIX: Must COMMIT database record BEFORE queueing Celery task
        # Why? Celery worker uses a DIFFERENT database session and can't see uncommitted records
        # This means we need to handle Redis failures differently (mark record as failed, don't delete)
        task_record = Task(
            id=task_id,
            celery_task_id=str(task_id),  # Set to task_id (will be same as Celery task ID)
            user_id=current_user.id,
            task_type=TaskType.SYNTHETIC_DATA_GENERATION,
            task_name=f"Generate {request.csv_file_name or 'synthetic_data.csv'}",
            status=TaskStatus.PENDING,
            progress=0.0,
            input_params={
                "columns_info": request.columns_info,
                "num_rows": request.num_rows,
                "csv_file_name": request.csv_file_name
            },
            estimated_time_seconds=estimated_time_seconds
        )
        db.add(task_record)
        db.commit()  # COMMIT NOW so Celery worker can see it
        db.refresh(task_record)
        
        # Try to queue the Celery task
        # If this fails, mark the existing record as failed (don't delete it)
        try:
            celery_task = generate_synthetic_data_task.apply_async(
                args=[
                    str(task_id),
                    str(current_user.id),
                    current_user.email,
                    request.columns_info,
                    request.num_rows,
                    request.csv_file_name
                ],
                task_id=str(task_id)  # Use our UUID as Celery task ID
            )
            
        except Exception as celery_error:
            # If Celery/Redis fails, mark the task as failed (don't delete the record)
            # This prevents orphaned records while still allowing worker to find existing records
            task_record.status = TaskStatus.FAILURE
            task_record.completed_at = datetime.now(timezone.utc)
            task_record.error_message = f"Failed to queue task: {str(celery_error)}"
            db.commit()
            # Re-raise to be caught by outer exception handler
            raise celery_error
        
        # Return immediately with task information
        return {
            "status": "processing",
            "message": "Synthetic data generation started. Use the task_id to check progress.",
            "task_id": str(task_id),
            "task_name": task_record.task_name,
            "estimated_time_seconds": estimated_time_seconds,
            "progress_url": f"/api/v1/synthetic-data/task-status/{task_id}"
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (like quota exceeded) with their original message
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        
        # Log technical error for backend team
        import logging
        logger = logging.getLogger(__name__)
        logger.error(
            f"Failed to start synthetic data generation task",
            exc_info=True,
            extra={
                "user_id": str(current_user.id),
                "user_email": current_user.email,
                "num_rows": request.num_rows,
                "error_type": type(e).__name__,
                "error_details": str(e)
            }
        )
        
        # Check for specific error types and show user-friendly messages
        error_str = str(e).lower()
        
        # Redis connection errors
        if "error 10061" in error_str or "connection refused" in error_str or "redis" in error_str:
            raise bad_request_error(
                error_code="SERVICE_UNAVAILABLE",
                message="Our background processing system is temporarily unavailable. Please try again in a few minutes. If the issue persists, please contact support.",
                extra={
                    "service": "background_processing",
                    "user_action": "retry_later"
                }
            )
        
        # Celery worker errors
        elif "celery" in error_str or "worker" in error_str:
            raise bad_request_error(
                error_code="PROCESSING_UNAVAILABLE",
                message="Our data generation service is temporarily unavailable. Please try again in a few minutes. If the issue persists, please contact support.",
                extra={
                    "service": "data_generation",
                    "user_action": "retry_later"
                }
            )
        
        # Generic error with user-friendly message
        else:
            raise bad_request_error(
                error_code="TASK_CREATION_FAILED",
                message="Unable to start data generation. Please try again. If the problem continues, please contact our support team.",
                extra={
                    "user_action": "retry_or_contact_support"
                }
            ) 

@synthetic_generator_router.post("/generate-data-for-train/")
async def generate_data_for_train(
    num_rows: int = Query(100, description="Number of rows to generate for each file"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Ensure outputs directory exists
        # outputs_dir = os.path.join(SyntheticDataService.SYNTHETIC_CSV_DIR, "train_outputs")
        outputs_dir = os.path.join(SyntheticDataService.SYNTHETIC_CSV_DIR, "test_output")
        if not os.path.exists(outputs_dir):
            os.makedirs(outputs_dir)
        
        # Path to inputs folder - full path for reliability
        inputs_dir = os.path.join(os.getcwd(), "inputs2")
        
        # List to store results
        results = []
        
        # Iterate through all JSON files in the inputs directory
        for i, filename in enumerate(os.listdir(inputs_dir)):
            if filename.endswith('.json'):
                try:
                    # Read the JSON file
                    with open(os.path.join(inputs_dir, filename), 'r') as f:
                        columns_info = json.load(f)
                    
                    # Generate file names with _001, _002 suffix
                    base_name = os.path.splitext(filename)[0]
                    csv_file_name = f"{base_name}_{i+1:03d}.csv"
                    
                    # Add the required fields
                    request_data = {
                        "user_id": current_user.id,
                        "csv_file_name": csv_file_name,
                        "num_rows": num_rows,
                        "columns_info": columns_info
                    }
                    
                    # Generate synthetic data using the service
                    result = await SyntheticDataService.generate_and_save_csv_data(
                        request_data["columns_info"],
                        request_data["num_rows"],
                        os.path.join("train_outputs", request_data["csv_file_name"])
                    )
                    
                    # Add to results without saving to UserCSV table
                    results.append({
                        "input_file": filename,
                        "output_file": result["filename"],
                        "filepath": result["filepath"]
                    })
                    
                except Exception as e:
                    results.append({
                        "input_file": filename,
                        "error": str(e)
                    })
        
        # No need to commit to database since we're not saving records
        
        return {
            "status": "success",
            "message": f"Generated {len(results)} training datasets",
            "results": results
        }
    except Exception as e:
        raise bad_request_error(
            error_code="TRAINING_DATA_GENERATION_FAILED",
            message="Failed to generate training data. Please check your input and try again.",
            extra={"error_details": str(e)}
        )

@synthetic_generator_router.post("/vectorize-and-index-data/")
async def vectorize_and_index_data(
    collection_name: str,
    model_name: str = "all-MiniLM-L6-v2",
    csv_directory: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Initialize the Qdrant driver
        qdrant_driver = QdrantDriver()
        
        # Initialize the sentence transformer model
        model = SentenceTransformer(model_name)
        
        # If no directory specified, use the train_outputs directory
        if csv_directory is None:
            csv_directory = os.path.join(SyntheticDataService.SYNTHETIC_CSV_DIR, "train_outputs")
        
        # Check if directory exists
        if not os.path.exists(csv_directory):
            raise not_found_error(
                message=f"Directory not found",
                extra={"directory_path": csv_directory}
            )
        
        # Results to track progress
        processed_files = []
        error_files = []
        
        # Vector size from the model
        vector_size = model.get_sentence_embedding_dimension()
        
        # Create the collection first with the proper vector size
        qdrant_driver.create_collection(collection_name, vector_size)
        
        # Iterate through all CSV files in the directory
        for filename in os.listdir(csv_directory):
            if filename.endswith('.csv'):
                try:
                    csv_path = os.path.join(csv_directory, filename)
                    
                    # Read the CSV file
                    df = pd.read_csv(csv_path)
                    
                    # Initialize list to store points
                    points = []
                    
                    # Process each column in the CSV - one vector per column
                    for col_name in df.columns:
                        # Combine all values in the column into a single text representation
                        # Convert each value to string and join with spaces
                        column_values = df[col_name].astype(str).tolist()
                        
                        # For large columns, we might need to truncate or sample to avoid token limits
                        # Combine values, but limit to first 100 values to avoid token limits
                        if len(column_values) > 100:
                            combined_text = " ".join(column_values[:100]) + f" (+ {len(column_values)-100} more values)"
                        else:
                            combined_text = " ".join(column_values)
                        
                        # Generate embedding vector for the entire column
                        vector = model.encode(combined_text).tolist()
                        
                        # Create a point with the vector and metadata - using a hash of the string ID as numeric ID
                        # Generate a unique integer ID by hashing the string ID
                        import hashlib
                        id_string = f"{filename.replace('.csv', '')}_{col_name}"
                        # Use last 16 digits of hash to create an integer ID (avoiding negative values)
                        point_id = int(hashlib.md5(id_string.encode()).hexdigest(), 16) % (2**63)
                        
                        point = PointStruct(
                            id=point_id,  # Using integer ID instead of string
                            vector=vector,
                            payload={
                                "file": filename,
                                "column": col_name,
                                "sample_values": column_values[:5],  # Store first 5 values as sample
                                "num_rows": len(column_values),
                                "column_name": col_name,
                                "original_id": id_string  # Store the original string ID in payload for reference
                            }
                        )
                        
                        points.append(point)
                    
                    # Add points to the collection
                    qdrant_driver.add_points(collection_name, points)
                    
                    processed_files.append({
                        "file": filename,
                        "points_added": len(points)
                    })
                    
                except Exception as e:
                    error_files.append({
                        "file": filename,
                        "error": str(e)
                    })
        
        # Return results
        return {
            "status": "success",
            "collection_name": collection_name,
            "model_used": model_name,
            "vector_size": vector_size,
            "processed_files": processed_files,
            "errors": error_files
        }
        
    except Exception as e:
        raise bad_request_error(
            error_code="VECTORIZATION_FAILED",
            message="Failed to vectorize and index data. Please check your input and try again.",
            extra={"error_details": str(e)}
        ) 

class GetCollectionInfoRequest(BaseModel):
    collection_name: str = Field(..., description="Name of the Qdrant collection")

    model_config = {
        "arbitrary_types_allowed": True
    }

class GetCollectionInfoResponse(BaseModel):
    info: Dict[str, Any] = Field(..., description="Collection information")
    payload_fields: Dict[str, str] = Field(default_factory=dict, description="Payload fields available for hybrid search and their data types")

    model_config = {
        "arbitrary_types_allowed": True
    }

@synthetic_generator_router.post("/get_collection_info", response_model=GetCollectionInfoResponse)
async def get_collection_info(
    request: GetCollectionInfoRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get information about a Qdrant collection including payload fields available for hybrid search.
    
    This endpoint provides details about:
    - Collection configuration and statistics
    - Vector dimensions and settings
    - Points count
    - Payload fields available for hybrid search with their data types
    """
    try:
        # Initialize the Qdrant driver
        qdrant_driver = QdrantDriver()

        # # Get internal collection name with user_id prefix
        # internal_collection_name = get_internal_collection_name(current_user.id, request.collection_name)

        # Get the collection info with payload fields
        info = qdrant_driver.get_collection_info(request.collection_name)
        
        # Extract payload fields if available
        payload_fields = info.pop("payload_fields", {})
        
        return {
            "info": info,
            "payload_fields": payload_fields
        }
    except Exception as e:
        raise internal_server_error(
            message="Failed to retrieve collection information. Please try again later.",
            extra={"error_details": str(e)}
        )

@synthetic_generator_router.post("/find-similar-columns/")
async def find_similar_columns(
    request: SimilarColumnsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Find similar columns in a Qdrant collection for each column in CSV files from the test_output folder.
    
    For each CSV file in the test_output directory:
    1. Read the CSV and process each column
    2. Vectorize each column using the specified sentence transformer model
    3. Search for similar columns in the specified Qdrant collection
    4. Return the top K most similar columns with their similarity scores and payload information
    """
    try:
        # Initialize the Qdrant driver
        qdrant_driver = QdrantDriver()
        
        # Initialize the sentence transformer model
        model = SentenceTransformer(request.model_name)
        
        # Define the test output directory
        test_output_dir = os.path.join(SyntheticDataService.SYNTHETIC_CSV_DIR, "test_output")
        
        # Check if directory exists
        if not os.path.exists(test_output_dir):
            raise not_found_error(
                message="Test output directory not found",
                extra={"directory_path": test_output_dir}
            )
        
        # Results to track similarities for all files and columns
        results = []
        
        # Iterate through all CSV files in the test_output directory
        for filename in os.listdir(test_output_dir):
            if filename.endswith('.csv'):
                try:
                    csv_path = os.path.join(test_output_dir, filename)
                    
                    # Read the CSV file
                    df = pd.read_csv(csv_path)
                    
                    # Process each column in the CSV - one vector per column
                    file_results = {
                        "file": filename,
                        "columns": []
                    }
                    
                    for col_name in df.columns:
                        # Combine all values in the column into a single text representation
                        column_values = df[col_name].astype(str).tolist()
                        
                        # For large columns, limit to first 100 values
                        if len(column_values) > 100:
                            combined_text = " ".join(column_values[:100]) + f" (+ {len(column_values)-100} more values)"
                        else:
                            combined_text = " ".join(column_values)
                        
                        # Generate embedding vector for the entire column
                        vector = model.encode(combined_text).tolist()
                        
                        # Search for similar columns in the collection
                        search_results = qdrant_driver.search(
                            collection_name=request.collection_name,
                            query_vector=vector,
                            limit=request.top_k
                        )
                        
                        # Format the search results
                        formatted_results = []
                        for result in search_results:
                            formatted_results.append({
                                "score": result.score,
                                "payload": result.payload,
                                "id": result.id
                            })
                        
                        # Add column results
                        file_results["columns"].append({
                            "column_name": col_name,
                            "sample_values": column_values[:5],
                            "similar_columns": formatted_results
                        })
                    
                    # Add file results
                    results.append(file_results)
                    
                except Exception as e:
                    results.append({
                        "file": filename,
                        "error": str(e)
                    })
        
        # Return all results
        return {
            "status": "success",
            "collection_searched": request.collection_name,
            "model_used": request.model_name,
            "top_k": request.top_k,
            "results": results
        }
        
    except Exception as e:
        raise bad_request_error(
            error_code="SIMILAR_COLUMNS_SEARCH_FAILED",
            message="Failed to find similar columns. Please check your input and try again.",
            extra={"error_details": str(e)}
        )