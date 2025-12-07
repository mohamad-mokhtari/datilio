from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, UploadFile
import os
import shutil
import uuid
from datetime import datetime

from app.models.feedback_model import Feedback, FeedbackMessage, FeedbackType, FeedbackStatus
from app.schemas.feedback_schemas import FeedbackCreate, FeedbackMessageCreate
from app.helpers.storage_helpers import StorageManager
from pathlib import Path
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)


class FeedbackService:
    """Simple service class for managing user feedback"""
    
    @staticmethod
    def _get_feedback_image_path(user_email: str, filename: str) -> str:
        """Get the path for feedback images in the new static directory structure"""
        # Sanitize email for filesystem
        safe_email = StorageManager._sanitize_filename(user_email)
        
        # Create directory structure: app/static/user_images/{user_email}/feedbacks/images/
        base_dir = Path.cwd() / "app" / "static" / "user_images" / safe_email / "feedbacks" / "images"
        base_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename to avoid conflicts
        safe_filename = StorageManager._sanitize_filename(filename)
        file_path = base_dir / safe_filename
        
        # If file already exists, add a counter
        counter = 1
        original_path = file_path
        while file_path.exists():
            stem = original_path.stem
            suffix = original_path.suffix
            file_path = original_path.parent / f"{stem}_{counter}{suffix}"
            counter += 1
        
        return str(file_path)
    
    @staticmethod
    def get_image_url(image_path: str) -> Optional[str]:
        """Convert image path to URL for frontend access"""
        if not image_path:
            return None
        
        # If it's already a URL, return as is
        if image_path.startswith('http'):
            return image_path
        
        # Convert local path to URL
        # Extract relative path from the full path
        if 'user_images' in image_path:
            # Find the user_images part and everything after it
            user_images_index = image_path.find('user_images')
            if user_images_index != -1:
                relative_path = image_path[user_images_index:]
                return f"http://localhost:8000/static/{relative_path.replace(os.sep, '/')}"
        
        return None

    @staticmethod
    async def create_feedback(
        feedback_data: FeedbackCreate,
        user_id: UUID,
        db: Session
    ) -> Feedback:
        """Create a new feedback entry"""
        try:
            feedback = Feedback(
                user_id=user_id,
                title=feedback_data.title,
                message=feedback_data.message,
                feedback_type=feedback_data.feedback_type.value,  # Use enum value instead of enum object
                status="open"
            )
            
            db.add(feedback)
            db.commit()
            db.refresh(feedback)
            
            return feedback
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error creating feedback: {str(e)}")

    @staticmethod
    async def get_feedback_by_id(feedback_id: UUID, db: Session) -> Optional[Feedback]:
        """Get feedback by ID"""
        return db.query(Feedback).filter(Feedback.id == feedback_id).first()

    @staticmethod
    async def get_user_feedback(
        user_id: UUID, 
        db: Session, 
        page: int = 1, 
        page_size: int = 20,
        status: Optional[str] = None,
        feedback_type: Optional[str] = None
    ) -> Tuple[List[Feedback], int]:
        """Get feedback for a specific user with pagination and filtering"""
        query = db.query(Feedback).filter(Feedback.user_id == user_id)
        
        # Apply filters
        if status:
            query = query.filter(Feedback.status == status)
        
        if feedback_type:
            query = query.filter(Feedback.feedback_type == feedback_type)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        feedback_list = query.order_by(desc(Feedback.created_at)).offset(offset).limit(page_size).all()
        
        return feedback_list, total_count

    @staticmethod
    async def get_all_feedback(
        db: Session, 
        page: int = 1, 
        page_size: int = 20,
        status: Optional[str] = None,
        feedback_type: Optional[str] = None
    ) -> Tuple[List[Feedback], int]:
        """Get all feedback (admin only) with filtering"""
        query = db.query(Feedback)
        
        # Apply filters
        if status:
            query = query.filter(Feedback.status == status)
        
        if feedback_type:
            query = query.filter(Feedback.feedback_type == feedback_type)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        feedback_list = query.order_by(desc(Feedback.created_at)).offset(offset).limit(page_size).all()
        
        return feedback_list, total_count

    @staticmethod
    async def add_message(
        feedback_id: UUID,
        message_data: FeedbackMessageCreate,
        user_id: UUID,
        is_admin: bool,
        db: Session,
        image_file: Optional[UploadFile] = None,
        user_email: Optional[str] = None
    ) -> Optional[FeedbackMessage]:
        """Add a message to feedback conversation with optional image"""
        feedback = await FeedbackService.get_feedback_by_id(feedback_id, db)
        
        if not feedback:
            return None
        
        # Check if feedback is closed
        if feedback.status == "closed":
            raise HTTPException(status_code=400, detail="Cannot add message to closed feedback")
        
        try:
            message = FeedbackMessage(
                feedback_id=feedback_id,
                user_id=user_id,
                message=message_data.message,
                is_admin_message=is_admin
            )
            
            # Handle image upload if provided
            if image_file and user_email:
                # Validate file type
                allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
                if image_file.content_type not in allowed_types:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
                    )
                
                # Validate file size (max 5MB)
                max_size = 5 * 1024 * 1024  # 5MB
                if image_file.size and image_file.size > max_size:
                    raise HTTPException(status_code=400, detail="File size too large. Maximum size is 5MB")
                
                # Generate unique filename
                file_extension = os.path.splitext(image_file.filename)[1]
                unique_filename = f"message_{feedback_id}_{uuid.uuid4()}{file_extension}"
                
                # Get storage path for message images
                image_path = FeedbackService._get_feedback_image_path(user_email, unique_filename)
                
                # Save the file
                with open(image_path, "wb") as buffer:
                    shutil.copyfileobj(image_file.file, buffer)
                
                message.image_path = image_path
            
            db.add(message)
            db.commit()
            db.refresh(message)
            
            return message
        except Exception as e:
            # Clean up image file if database operation fails
            if 'image_path' in locals() and os.path.exists(image_path):
                try:
                    os.remove(image_path)
                except OSError:
                    pass
            
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error adding message: {str(e)}")

    @staticmethod
    async def close_feedback(
        feedback_id: UUID,
        user_id: UUID,
        db: Session
    ) -> Optional[Feedback]:
        """Close feedback conversation"""
        feedback = await FeedbackService.get_feedback_by_id(feedback_id, db)
        
        if not feedback:
            return None
        
        # Check if already closed
        if feedback.status == "closed":
            raise HTTPException(status_code=400, detail="Feedback is already closed")
        
        try:
            feedback.status = "closed"
            feedback.closed_at = datetime.utcnow()
            feedback.closed_by = user_id
            
            db.commit()
            db.refresh(feedback)
            
            return feedback
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error closing feedback: {str(e)}")

    @staticmethod
    async def reopen_feedback(
        feedback_id: UUID,
        user_id: UUID,
        db: Session
    ) -> Optional[Feedback]:
        """Reopen feedback conversation (admin only)"""
        feedback = await FeedbackService.get_feedback_by_id(feedback_id, db)
        
        if not feedback:
            return None
        
        # Check if already open
        if feedback.status == "open":
            raise HTTPException(status_code=400, detail="Feedback is already open")
        
        try:
            feedback.status = "open"
            feedback.closed_at = None
            feedback.closed_by = None
            
            db.commit()
            db.refresh(feedback)
            
            return feedback
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error reopening feedback: {str(e)}")

    @staticmethod
    async def delete_feedback(feedback_id: UUID, db: Session) -> bool:
        """Delete feedback and associated files"""
        feedback = await FeedbackService.get_feedback_by_id(feedback_id, db)
        
        if not feedback:
            return False
        
        try:
            # Delete associated image from disk if exists
            if feedback.image_path and os.path.exists(feedback.image_path):
                try:
                    os.remove(feedback.image_path)
                except OSError as e:
                    print(f"Warning: Could not delete image file {feedback.image_path}: {e}")
            
            # Delete from database
            db.delete(feedback)
            db.commit()
            
            return True
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error deleting feedback: {str(e)}")

    @staticmethod
    async def upload_feedback_image(
        feedback_id: UUID,
        image_file: UploadFile,
        user_email: str,
        db: Session
    ) -> str:
        """Upload an image for feedback and return the file path"""
        feedback = await FeedbackService.get_feedback_by_id(feedback_id, db)
        
        if not feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if image_file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
            )
        
        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        if image_file.size and image_file.size > max_size:
            raise HTTPException(status_code=400, detail="File size too large. Maximum size is 5MB")
        
        try:
            # Generate unique filename
            file_extension = os.path.splitext(image_file.filename)[1]
            unique_filename = f"feedback_{feedback_id}_{uuid.uuid4()}{file_extension}"
            
            # Get storage path for feedback images using new location
            image_path = FeedbackService._get_feedback_image_path(user_email, unique_filename)
            
            # Save the file
            with open(image_path, "wb") as buffer:
                shutil.copyfileobj(image_file.file, buffer)
            
            # Update feedback with image path
            feedback.image_path = image_path
            db.commit()
            
            return image_path
        except Exception as e:
            # Clean up file if database operation fails
            if 'image_path' in locals() and os.path.exists(image_path):
                try:
                    os.remove(image_path)
                except OSError:
                    pass
            
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")
