"""
Task Model
==========

Database model for tracking asynchronous task status and progress.

This model stores information about Celery tasks including:
- Task ID (from Celery)
- Task type (e.g., 'synthetic_data_generation')
- Status (PENDING, PROCESSING, SUCCESS, FAILURE)
- Progress (0-100%)
- Result data (file path, errors, etc.)
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, Float, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.core.db_setup import Base
import uuid
import enum


class TaskStatus(str, enum.Enum):
    """Task status enum"""
    PENDING = "pending"  # Task is queued but not started
    PROCESSING = "processing"  # Task is currently running
    SUCCESS = "success"  # Task completed successfully
    FAILURE = "failure"  # Task failed with error
    REVOKED = "revoked"  # Task was cancelled


class TaskType(str, enum.Enum):
    """Task type enum"""
    SYNTHETIC_DATA_GENERATION = "synthetic_data_generation"
    DATA_ANALYSIS = "data_analysis"
    FILE_CONVERSION = "file_conversion"
    # Add more task types as needed


class Task(Base):
    """Task tracking model"""
    __tablename__ = "tasks"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Celery task ID
    celery_task_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # User information
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Task information
    task_type = Column(SQLEnum(TaskType), nullable=False, index=True)
    task_name = Column(String(255), nullable=False)  # Human-readable task name
    
    # Status and progress
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False, index=True)
    progress = Column(Float, default=0.0)  # Progress percentage (0.0 - 100.0)
    
    # Task details
    input_params = Column(JSONB, nullable=True)  # Input parameters (JSON)
    result = Column(JSONB, nullable=True)  # Task result (JSON)
    error_message = Column(Text, nullable=True)  # Error message if failed
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    estimated_time_seconds = Column(Integer, nullable=True)  # Estimated completion time
    retry_count = Column(Integer, default=0)  # Number of retries
    
    def __repr__(self):
        return f"<Task {self.task_name} ({self.status})>"
    
    def to_dict(self):
        """Convert task to dictionary"""
        return {
            "id": str(self.id),
            "celery_task_id": self.celery_task_id,
            "user_id": str(self.user_id),
            "task_type": self.task_type.value if self.task_type else None,
            "task_name": self.task_name,
            "status": self.status.value if self.status else None,
            "progress": self.progress,
            "input_params": self.input_params,
            "result": self.result,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "estimated_time_seconds": self.estimated_time_seconds,
            "retry_count": self.retry_count,
        }

