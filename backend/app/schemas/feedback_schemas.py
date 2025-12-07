from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.feedback_model import FeedbackType, FeedbackStatus


class FeedbackCreate(BaseModel):
    """Schema for creating new feedback"""
    title: str = Field(..., min_length=3, max_length=255, description="Title for the feedback")
    message: str = Field(..., min_length=10, description="Detailed message")
    feedback_type: FeedbackType = Field(default=FeedbackType.GENERAL, description="Type of feedback")


class FeedbackMessageResponse(BaseModel):
    """Schema for feedback message response"""
    id: UUID
    feedback_id: UUID
    user_id: UUID
    message: str
    is_admin_message: bool
    image_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


class FeedbackMessageCreate(BaseModel):
    """Schema for creating a feedback message"""
    message: str = Field(..., min_length=1, description="Message content")


class FeedbackResponse(BaseModel):
    """Schema for feedback response with conversation"""
    id: UUID
    user_id: UUID
    title: str
    message: str
    feedback_type: FeedbackType
    status: FeedbackStatus
    closed_at: Optional[datetime] = None
    closed_by: Optional[UUID] = None
    image_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user_email: Optional[str] = None
    closed_by_email: Optional[str] = None
    messages: List[FeedbackMessageResponse] = []

    class Config:
        from_attributes = True


class FeedbackListResponse(BaseModel):
    """Schema for feedback list response"""
    id: UUID
    title: str
    message: str
    feedback_type: FeedbackType
    status: FeedbackStatus
    closed_at: Optional[datetime] = None
    created_at: datetime
    user_email: Optional[str] = None
    message_count: int = 0

    class Config:
        from_attributes = True


class FeedbackCloseRequest(BaseModel):
    """Schema for closing feedback"""
    pass  # No additional data needed, just close the feedback
