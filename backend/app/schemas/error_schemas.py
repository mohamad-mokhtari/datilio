"""
Pydantic schemas for error monitoring
"""
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class ErrorLogResponse(BaseModel):
    """Schema for detailed error log response"""
    id: UUID
    error_code: str
    error_message: str
    technical_message: Optional[str] = None
    stack_trace: Optional[str] = None
    severity: str
    category: str
    endpoint: Optional[str] = None
    method: Optional[str] = None
    user_id: Optional[UUID] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_data: Optional[Dict[str, Any]] = None
    response_status: Optional[int] = None
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[UUID] = None
    resolver_email: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ErrorLogListResponse(BaseModel):
    """Schema for error log list response"""
    id: UUID
    error_code: str
    error_message: str
    severity: str
    category: str
    endpoint: Optional[str] = None
    method: Optional[str] = None
    user_id: Optional[UUID] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    response_status: Optional[int] = None
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[UUID] = None
    resolver_email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ErrorCounterResponse(BaseModel):
    """Schema for error counter response"""
    id: UUID
    error_code: str
    endpoint: Optional[str] = None
    user_id: Optional[UUID] = None
    user_email: Optional[str] = None
    count: int
    first_occurrence: datetime
    last_occurrence: datetime
    date: datetime

    class Config:
        from_attributes = True


class ErrorStatisticsResponse(BaseModel):
    """Schema for error statistics response"""
    period_days: int
    severity_counts: Dict[str, int]
    category_counts: Dict[str, int]
    daily_counts: List[Dict[str, Any]]
    top_errors: List[Dict[str, Any]]


class ErrorResolutionRequest(BaseModel):
    """Schema for marking error as resolved"""
    resolution_notes: Optional[str] = Field(None, description="Notes about how the error was resolved")


class ErrorResponse(BaseModel):
    """Standard error response schema"""
    error: Dict[str, Any] = Field(..., description="Error details")
    
    class Config:
        schema_extra = {
            "example": {
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Please check your input and try again.",
                    "details": "email: field required"
                }
            }
        }
