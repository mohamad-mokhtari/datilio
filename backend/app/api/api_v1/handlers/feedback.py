from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.models.user_model import User
from app.models.feedback_model import Feedback
from app.api.deps.user_deps import get_current_user, get_admin_user
from app.core.db_setup import get_db
from app.services.feedback_service import FeedbackService
from app.schemas.feedback_schemas import (
    FeedbackCreate, FeedbackResponse, FeedbackListResponse, 
    FeedbackMessageCreate, FeedbackMessageResponse, FeedbackCloseRequest
)
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)

feedback_router = APIRouter()


@feedback_router.post("/", response_model=FeedbackResponse, summary="Submit Feedback")
async def create_feedback(
    feedback_data: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit new feedback (bug report, feature request, or general feedback)
    """
    try:
        feedback = await FeedbackService.create_feedback(
            feedback_data=feedback_data,
            user_id=current_user.id,
            db=db
        )
        
        return FeedbackResponse(
            id=feedback.id,
            user_id=feedback.user_id,
            title=feedback.title,
            message=feedback.message,
            feedback_type=feedback.feedback_type,
            status=feedback.status,
            closed_at=feedback.closed_at,
            closed_by=feedback.closed_by,
            image_path=FeedbackService.get_image_url(feedback.image_path) if feedback.image_path else None,
            created_at=feedback.created_at,
            updated_at=feedback.updated_at,
            user_email=current_user.email,
            closed_by_email=feedback.closed_by_user.email if feedback.closed_by_user else None,
            messages=[_format_message_response(msg) for msg in feedback.messages]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@feedback_router.get("/", response_model=List[FeedbackListResponse], summary="Get User Feedback")
async def get_user_feedback(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    feedback_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get feedback submitted by the current user with optional filtering
    
    Query Parameters:
    - page: Page number (default: 1)
    - page_size: Number of items per page (default: 20)
    - status: Filter by status (open, closed)
    - feedback_type: Filter by type (bug, feature, general)
    """
    try:
        feedback_list, total_count = await FeedbackService.get_user_feedback(
            user_id=current_user.id,
            db=db,
            page=page,
            page_size=page_size,
            status=status,
            feedback_type=feedback_type
        )
        
        return [
            FeedbackListResponse(
                id=feedback.id,
                title=feedback.title,
                message=feedback.message,
                feedback_type=feedback.feedback_type,
                status=feedback.status,
                closed_at=feedback.closed_at,
                created_at=feedback.created_at,
                user_email=current_user.email,
                message_count=len(feedback.messages)
            ) for feedback in feedback_list
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@feedback_router.get("/{feedback_id}", response_model=FeedbackResponse, summary="Get Feedback Details")
async def get_feedback(
    feedback_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific feedback item
    """
    feedback = await FeedbackService.get_feedback_by_id(feedback_id, db)
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    # Check if user can access this feedback
    if feedback.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return FeedbackResponse(
        id=feedback.id,
        user_id=feedback.user_id,
        title=feedback.title,
        message=feedback.message,
        feedback_type=feedback.feedback_type,
        status=feedback.status,
        closed_at=feedback.closed_at,
        closed_by=feedback.closed_by,
        image_path=FeedbackService.get_image_url(feedback.image_path) if feedback.image_path else None,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
        user_email=feedback.user.email,
        closed_by_email=feedback.closed_by_user.email if feedback.closed_by_user else None,
        messages=[_format_message_response(msg) for msg in feedback.messages]
    )


@feedback_router.delete("/{feedback_id}", summary="Delete Feedback")
async def delete_feedback(
    feedback_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete feedback (user can delete their own, admin can delete any)
    """
    feedback = await FeedbackService.get_feedback_by_id(feedback_id, db)
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    # Check permissions
    if feedback.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    success = await FeedbackService.delete_feedback(feedback_id, db)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete feedback")
    
    return {"status": "success", "message": "Feedback deleted successfully"}


@feedback_router.post("/{feedback_id}/image", summary="Upload Feedback Image")
async def upload_feedback_image(
    feedback_id: UUID,
    image_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload an image for feedback
    """
    # Check if user can access this feedback
    feedback = await FeedbackService.get_feedback_by_id(feedback_id, db)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    if feedback.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        image_path = await FeedbackService.upload_feedback_image(
            feedback_id=feedback_id,
            image_file=image_file,
            user_email=current_user.email,
            db=db
        )
        
        return {"status": "success", "message": "Image uploaded successfully", "image_path": image_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Admin endpoints
@feedback_router.get("/admin/all", response_model=List[FeedbackListResponse], summary="Get All Feedback (Admin)")
async def get_all_feedback(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    feedback_type: Optional[str] = None,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get all feedback (admin only) with optional filtering
    
    Query Parameters:
    - page: Page number (default: 1)
    - page_size: Number of items per page (default: 20)
    - status: Filter by status (open, closed)
    - feedback_type: Filter by type (bug, feature, general)
    """
    try:
        feedback_list, total_count = await FeedbackService.get_all_feedback(
            db=db,
            page=page,
            page_size=page_size,
            status=status,
            feedback_type=feedback_type
        )
        
        return [
            FeedbackListResponse(
                id=feedback.id,
                title=feedback.title,
                message=feedback.message,
                feedback_type=feedback.feedback_type,
                status=feedback.status,
                closed_at=feedback.closed_at,
                created_at=feedback.created_at,
                user_email=feedback.user.email,
                message_count=len(feedback.messages)
            ) for feedback in feedback_list
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@feedback_router.post("/{feedback_id}/messages", response_model=FeedbackMessageResponse, summary="Add Message")
async def add_message(
    feedback_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    message_data: Optional[FeedbackMessageCreate] = None,
    image_file: Optional[UploadFile] = File(None),
    message: Optional[str] = Form(None)
):
    """Add a message to feedback conversation with optional image"""
    
    # Handle different request formats
    if message_data is None and message is None:
        raise HTTPException(status_code=400, detail="Message content is required")
    
    # If message_data is provided (JSON request), use it
    if message_data:
        message_content = message_data
    # If message is provided (FormData request), create FeedbackMessageCreate
    else:
        message_content = FeedbackMessageCreate(message=message)
    
    result_message = await FeedbackService.add_message(
        feedback_id=feedback_id,
        message_data=message_content,
        user_id=current_user.id,
        is_admin=False,  # User message
        db=db,
        image_file=image_file,
        user_email=current_user.email
    )
    
    if not result_message:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return _format_message_response(result_message)


@feedback_router.post("/{feedback_id}/close", summary="Close Feedback")
async def close_feedback(
    feedback_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Close feedback conversation"""
    feedback = await FeedbackService.close_feedback(
        feedback_id=feedback_id,
        user_id=current_user.id,
        db=db
    )
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return {"message": "Feedback closed successfully"}


# Admin endpoints for conversation
@feedback_router.post("/admin/{feedback_id}/messages", response_model=FeedbackMessageResponse, summary="Add Admin Message")
async def add_admin_message(
    feedback_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    message_data: Optional[FeedbackMessageCreate] = None,
    image_file: Optional[UploadFile] = File(None),
    message: Optional[str] = Form(None)
):
    """Add an admin message to feedback conversation with optional image"""
    
    # Handle different request formats
    if message_data is None and message is None:
        raise HTTPException(status_code=400, detail="Message content is required")
    
    # If message_data is provided (JSON request), use it
    if message_data:
        message_content = message_data
    # If message is provided (FormData request), create FeedbackMessageCreate
    else:
        message_content = FeedbackMessageCreate(message=message)
    
    result_message = await FeedbackService.add_message(
        feedback_id=feedback_id,
        message_data=message_content,
        user_id=current_user.id,
        is_admin=True,  # Admin message
        db=db,
        image_file=image_file,
        user_email=current_user.email
    )
    
    if not result_message:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return _format_message_response(result_message)


@feedback_router.post("/admin/{feedback_id}/close", summary="Close Feedback (Admin)")
async def admin_close_feedback(
    feedback_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Close feedback conversation (admin only)"""
    feedback = await FeedbackService.close_feedback(
        feedback_id=feedback_id,
        user_id=current_user.id,
        db=db
    )
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return {"message": "Feedback closed successfully by admin"}


@feedback_router.post("/admin/{feedback_id}/reopen", summary="Reopen Feedback (Admin)")
async def admin_reopen_feedback(
    feedback_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Reopen feedback conversation (admin only)"""
    feedback = await FeedbackService.reopen_feedback(
        feedback_id=feedback_id,
        user_id=current_user.id,
        db=db
    )
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return {"message": "Feedback reopened successfully by admin"}


def _format_message_response(message) -> FeedbackMessageResponse:
    """Format message response"""
    return FeedbackMessageResponse(
        id=message.id,
        feedback_id=message.feedback_id,
        user_id=message.user_id,
        message=message.message,
        is_admin_message=message.is_admin_message,
        image_path=FeedbackService.get_image_url(message.image_path) if message.image_path else None,
        created_at=message.created_at,
        updated_at=message.updated_at,
        user_email=message.user.email
    )


def _format_feedback_response(feedback: Feedback) -> FeedbackResponse:
    """Format feedback response"""
    return FeedbackResponse(
        id=feedback.id,
        user_id=feedback.user_id,
        title=feedback.title,
        message=feedback.message,
        feedback_type=feedback.feedback_type,
        status=feedback.status,
        closed_at=feedback.closed_at,
        closed_by=feedback.closed_by,
        image_path=FeedbackService.get_image_url(feedback.image_path) if feedback.image_path else None,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
        user_email=feedback.user.email,
        closed_by_email=feedback.closed_by_user.email if feedback.closed_by_user else None,
        messages=[_format_message_response(msg) for msg in feedback.messages]
    )


def _format_feedback_list_response(feedback: Feedback) -> FeedbackListResponse:
    """Format feedback list response"""
    return FeedbackListResponse(
        id=feedback.id,
        title=feedback.title,
        message=feedback.message,
        feedback_type=feedback.feedback_type,
        status=feedback.status,
        closed_at=feedback.closed_at,
        created_at=feedback.created_at,
        user_email=feedback.user.email,
        message_count=len(feedback.messages)
    )