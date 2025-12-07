"""
Synthetic Data Generation Tasks
================================

Celery tasks for generating synthetic data asynchronously.

Task Flow:
----------
1. Task is queued with Celery
2. Worker picks up the task
3. Updates task status to PROCESSING
4. Generates synthetic data with progress updates
5. Saves file and updates database
6. Updates task status to SUCCESS/FAILURE
"""

import os
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from celery import Task

from app.core.celery_app import celery_app
from app.core.db_setup import SessionLocal
from app.services.synthetic_data_service import SyntheticDataService
from app.models.task_model import Task as TaskModel, TaskStatus
from app.models.user_data_model import UserData, FileType, DataSource
from app.services.usage_service import UsageService


class DatabaseTask(Task):
    """Base task with database session support"""
    _db: Session = None
    
    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db
    
    def after_return(self, *args, **kwargs):
        """Close database session after task completes"""
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(
    bind=True, 
    base=DatabaseTask, 
    name='app.tasks.generate_synthetic_data',
    autoretry_for=(Exception,),  # Retry on any exception
    retry_kwargs={'max_retries': 1},  # Retry up to 2 times
    retry_backoff=True,  # Exponential backoff between retries
    retry_backoff_max=600,  # Max 10 minutes between retries
    retry_jitter=True  # Add randomness to avoid thundering herd
)
def generate_synthetic_data_task(
    self,
    task_id: str,
    user_id: str,
    user_email: str,
    columns_info: dict,
    num_rows: int,
    csv_file_name: str
):
    """
    Generate synthetic data asynchronously with automatic retry (MVP).
    
    🔄 **Automatic Retry:**
    - Retries up to 2 times on failure
    - Exponential backoff between retries
    - Handles temporary Redis/worker issues
    
    Args:
        self: Celery task instance
        task_id: Database task ID (UUID)
        user_id: User ID
        user_email: User email for file storage
        columns_info: Column configuration
        num_rows: Number of rows to generate
        csv_file_name: Output CSV file name
    
    Returns:
        dict: Task result with file information
    """
    
    db = self.db
    
    try:
        # Update task status to PROCESSING
        task_record = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        if task_record:
            task_record.status = TaskStatus.PROCESSING
            task_record.started_at = datetime.now(timezone.utc)
            task_record.progress = 0.0
            db.commit()
        
        # Update progress: 10% - Starting generation
        self.update_state(
            state='PROGRESS',
            meta={
                'status': 'Starting synthetic data generation...',
                'progress': 10,
                'current': 0,
                'total': num_rows
            }
        )
        if task_record:
            task_record.progress = 10.0
            db.commit()
        
        # Update progress: 30% - Generating data
        self.update_state(
            state='PROGRESS',
            meta={
                'status': 'Generating synthetic data...',
                'progress': 30,
                'current': 0,
                'total': num_rows
            }
        )
        if task_record:
            task_record.progress = 30.0
            db.commit()
        
        # Generate the synthetic data (this is the long-running operation)
        result = SyntheticDataService.generate_and_save_csv_data_sync(
            columns_info=columns_info,
            num_rows=num_rows,
            csv_file_name=csv_file_name,
            user_email=user_email
        )
        
        file_location = result["filepath"]
        
        # Update progress: 70% - Saving file
        self.update_state(
            state='PROGRESS',
            meta={
                'status': 'Saving file and updating database...',
                'progress': 70,
                'current': num_rows,
                'total': num_rows
            }
        )
        if task_record:
            task_record.progress = 70.0
            db.commit()
        
        # Get the actual file size
        actual_file_size = os.path.getsize(file_location)
        
        # Save a record in the UserData table
        # NOTE: Filename uniqueness is enforced at retry endpoint level
        # If we get here, the filename is guaranteed to be unique
        user_data = UserData(
            user_id=user_id,
            file_path=file_location,
            file_name=result["filename"],
            file_type=FileType.CSV,
            file_size=actual_file_size,
            source=DataSource.SYNTHETIC
        )
        db.add(user_data)
        db.commit()
        db.refresh(user_data)
        
        # Update progress: 90% - Tracking usage
        self.update_state(
            state='PROGRESS',
            meta={
                'status': 'Finalizing...',
                'progress': 90,
                'current': num_rows,
                'total': num_rows
            }
        )
        if task_record:
            task_record.progress = 90.0
            db.commit()
        
        # Track usage after successful generation
        UsageService.track_usage(
            db=db,
            user_id=user_id,
            feature="synthetic_rows",
            amount=num_rows,
            description=f"Generated synthetic data: {result['filename']}"
        )
        
        # Prepare final result
        final_result = {
            "status": "success",
            "filename": result["filename"],
            "filepath": result["filepath"],
            "data_id": str(user_data.id),
            "file_size": actual_file_size,
            "file_size_mb": round(actual_file_size / (1024 * 1024), 2),
            "rows_generated": num_rows,
            "message": f"Successfully generated {num_rows} rows of synthetic data"
        }
        
        # Update task status to SUCCESS
        if task_record:
            task_record.status = TaskStatus.SUCCESS
            task_record.progress = 100.0
            task_record.completed_at = datetime.now(timezone.utc)
            task_record.result = final_result
            db.commit()
        
        return final_result
        
    except Exception as e:
        # Handle errors with logging
        error_message = str(e)
        
        # Log error for monitoring (MVP: Simple logging)
        import logging
        logger = logging.getLogger(__name__)
        logger.error(
            f"Synthetic data task failed: {error_message}",
            extra={
                "task_id": task_id,
                "user_id": user_id,
                "num_rows": num_rows,
                "retry_count": self.request.retries,
                "max_retries": self.max_retries
            }
        )
        
        # CRITICAL: Rollback the database session first
        # This prevents "PendingRollbackError" on subsequent queries
        db.rollback()
        
        # Update task status to FAILURE
        try:
            task_record = db.query(TaskModel).filter(TaskModel.id == task_id).first()
            if task_record:
                task_record.status = TaskStatus.FAILURE
                task_record.completed_at = datetime.now(timezone.utc)
                task_record.error_message = error_message
                task_record.retry_count = self.request.retries
                db.commit()
        except Exception as update_error:
            logger.error(f"Failed to update task status: {update_error}")
            db.rollback()
        
        # Log if this is the final failure (after all retries)
        if self.request.retries >= self.max_retries:
            logger.error(
                f"Task permanently failed after {self.request.retries} retries: {error_message}",
                extra={
                    "task_id": task_id,
                    "user_id": user_id,
                    "final_failure": True
                }
            )
        
        # Re-raise exception for Celery to handle (triggers retry if not max retries yet)
        raise

