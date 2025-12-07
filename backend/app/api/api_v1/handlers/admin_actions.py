"""
Admin Actions Handler - Comprehensive admin control system
This handler provides all admin functionality for system management.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, date, timedelta
import json
import os
import shutil
import uuid
from pathlib import Path

from app.models.user_model import User, Role
from app.models.usage_tracking_model import UsageTracking
from app.models.feedback_model import Feedback, FeedbackMessage, FeedbackStatus
from app.models.blog_model import BlogPost
from app.models.user_data_model import UserData
from app.models.user_plan_model import UserPlan
from app.models.plan_model import Plan
from app.models.stripe_payment_model import StripePayment
from app.models.user_subscription_model import UserSubscription
from app.models.email_verification_model import EmailVerificationToken

from app.api.deps.user_deps import get_admin_user
from app.core.db_setup import get_db
from app.services.feedback_service import FeedbackService
from app.services.blog_service import BlogService
from app.services.usage_service import UsageService

from app.schemas.feedback_schemas import (
    FeedbackResponse, FeedbackListResponse, FeedbackMessageResponse, FeedbackMessageCreate
)
from app.schemas.blog_schemas import (
    BlogPostCreate, BlogPostUpdate, BlogPostResponse
)
from app.schemas.user_schemas import UserOut, UserUpdate
from app.schemas.user_limits_schemas import UserLimitsUpdate, UserLimitsResponse
from app.schemas.plan_assignment_schemas import AssignPlanRequest, AssignPlanResponse, PlanListItem

from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)

admin_actions_router = APIRouter()

# ============================================================================
# USER MANAGEMENT ENDPOINTS
# ============================================================================

@admin_actions_router.get("/users", response_model=List[UserOut], summary="Get All Users")
async def get_all_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by email, username, or name"),
    role: Optional[str] = Query(None, description="Filter by role (admin, user)"),
    email_verified: Optional[bool] = Query(None, description="Filter by email verification status"),
    disabled: Optional[bool] = Query(None, description="Filter by disabled status"),
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users with filtering and pagination"""
    try:
        query = db.query(User)
        
        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    User.email.ilike(search_term),
                    User.username.ilike(search_term),
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term)
                )
            )
        
        if role:
            query = query.filter(User.role == role)
        
        if email_verified is not None:
            query = query.filter(User.email_verified == email_verified)
        
        if disabled is not None:
            query = query.filter(User.disabled == disabled)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        users = query.order_by(desc(User.created_at)).offset(offset).limit(page_size).all()
        
        return users
        
    except Exception as e:
        raise internal_server_error(message=f"Error fetching users: {str(e)}")


@admin_actions_router.get("/users/{user_id}", response_model=UserOut, summary="Get User Details")
async def get_user_details(
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific user"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise not_found_error(message="User not found")
        
        return user
        
    except Exception as e:
        raise internal_server_error(message=f"Error fetching user: {str(e)}")


@admin_actions_router.put("/users/{user_id}/verify-email", summary="Manually Verify User Email")
async def verify_user_email(
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Manually verify a user's email address"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise not_found_error(message="User not found")
        
        user.email_verified = True
        db.commit()
        
        return {"message": "User email verified successfully", "user_id": str(user_id)}
        
    except Exception as e:
        raise internal_server_error(message=f"Error verifying email: {str(e)}")


@admin_actions_router.put("/users/{user_id}/disable", summary="Disable User Account")
async def disable_user(
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Disable a user account"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise not_found_error(message="User not found")
        
        if user.id == current_user.id:
            raise bad_request_error(message="Cannot disable your own account")
        
        user.disabled = True
        db.commit()
        
        return {"message": "User account disabled successfully", "user_id": str(user_id)}
        
    except Exception as e:
        raise internal_server_error(message=f"Error disabling user: {str(e)}")


@admin_actions_router.put("/users/{user_id}/enable", summary="Enable User Account")
async def enable_user(
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Enable a user account"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise not_found_error(message="User not found")
        
        user.disabled = False
        db.commit()
        
        return {"message": "User account enabled successfully", "user_id": str(user_id)}
        
    except Exception as e:
        raise internal_server_error(message=f"Error enabling user: {str(e)}")


@admin_actions_router.put("/users/{user_id}/role", summary="Update User Role")
async def update_user_role(
    user_id: UUID,
    role: str = Query(..., description="New role (admin, user)"),
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update user role"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise not_found_error(message="User not found")
        
        if user.id == current_user.id:
            raise bad_request_error(message="Cannot change your own role")
        
        if role not in ["admin", "user"]:
            raise bad_request_error(message="Invalid role. Must be 'admin' or 'user'")
        
        user.role = Role(role)
        db.commit()
        
        return {"message": f"User role updated to {role}", "user_id": str(user_id)}
        
    except Exception as e:
        raise internal_server_error(message=f"Error updating user role: {str(e)}")


@admin_actions_router.delete("/users/{user_id}", summary="Delete User")
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a user and all associated data"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise not_found_error(message="User not found")
        
        if user.id == current_user.id:
            raise bad_request_error(message="Cannot delete your own account")
        
        # Delete user (cascade will handle related data)
        db.delete(user)
        db.commit()
        
        return {"message": "User deleted successfully", "user_id": str(user_id)}
        
    except Exception as e:
        raise internal_server_error(message=f"Error deleting user: {str(e)}")


# ============================================================================
# FEEDBACK MANAGEMENT ENDPOINTS
# ============================================================================

@admin_actions_router.get("/feedback", response_model=List[FeedbackListResponse], summary="Get All Feedback")
async def get_all_feedback(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status (open, closed)"),
    feedback_type: Optional[str] = Query(None, description="Filter by type (bug, feature, general)"),
    user_id: Optional[UUID] = Query(None, description="Filter by user ID"),
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all feedback with filtering and pagination"""
    try:
        feedback_list, total_count = await FeedbackService.get_all_feedback(
            db=db,
            page=page,
            page_size=page_size,
            status=status,
            feedback_type=feedback_type
        )
        
        # Filter by user_id if provided
        if user_id:
            feedback_list = [f for f in feedback_list if f.user_id == user_id]
        
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
        raise internal_server_error(message=f"Error fetching feedback: {str(e)}")


@admin_actions_router.get("/feedback/{feedback_id}", response_model=FeedbackResponse, summary="Get Feedback Details")
async def get_feedback_details(
    feedback_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed feedback information"""
    try:
        feedback = await FeedbackService.get_feedback_by_id(feedback_id, db)
        if not feedback:
            raise not_found_error(message="Feedback not found")
        
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
        
    except Exception as e:
        raise internal_server_error(message=f"Error fetching feedback: {str(e)}")


@admin_actions_router.post("/feedback/{feedback_id}/messages", response_model=FeedbackMessageResponse, summary="Add Admin Message")
async def add_admin_message(
    feedback_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    message_data: Optional[FeedbackMessageCreate] = None,
    message: Optional[str] = Form(None, description="Message content"),
    image_file: Optional[UploadFile] = File(None, description="Optional image file to attach")
):
    """Add an admin message to feedback conversation with optional image"""
    try:
        # Handle different request formats
        if message_data is None and message is None:
            raise bad_request_error(message="Message content is required")
        
        # If message_data is provided (JSON request), use it
        if message_data:
            final_message_data = message_data
        # If message is provided (FormData request), create FeedbackMessageCreate
        else:
            final_message_data = FeedbackMessageCreate(message=message)
        
        result_message = await FeedbackService.add_message(
            feedback_id=feedback_id,
            message_data=final_message_data,
            user_id=current_user.id,
            is_admin=True,
            db=db,
            image_file=image_file,
            user_email=current_user.email
        )
        
        if not result_message:
            raise not_found_error(message="Feedback not found")
        
        return _format_message_response(result_message)
        
    except Exception as e:
        raise internal_server_error(message=f"Error adding message: {str(e)}")


@admin_actions_router.post("/feedback/{feedback_id}/close", summary="Close Feedback")
async def close_feedback(
    feedback_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Close feedback conversation"""
    try:
        feedback = await FeedbackService.close_feedback(
            feedback_id=feedback_id,
            user_id=current_user.id,
            db=db
        )
        
        if not feedback:
            raise not_found_error(message="Feedback not found")
        
        return {"message": "Feedback closed successfully"}
        
    except Exception as e:
        raise internal_server_error(message=f"Error closing feedback: {str(e)}")


@admin_actions_router.post("/feedback/{feedback_id}/reopen", summary="Reopen Feedback")
async def reopen_feedback(
    feedback_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Reopen feedback conversation"""
    try:
        feedback = await FeedbackService.reopen_feedback(
            feedback_id=feedback_id,
            user_id=current_user.id,
            db=db
        )
        
        if not feedback:
            raise not_found_error(message="Feedback not found")
        
        return {"message": "Feedback reopened successfully"}
        
    except Exception as e:
        raise internal_server_error(message=f"Error reopening feedback: {str(e)}")


@admin_actions_router.delete("/feedback/{feedback_id}", summary="Delete Feedback")
async def delete_feedback(
    feedback_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete feedback and all messages"""
    try:
        success = await FeedbackService.delete_feedback(feedback_id, db)
        
        if not success:
            raise not_found_error(message="Feedback not found")
        
        return {"message": "Feedback deleted successfully"}
        
    except Exception as e:
        raise internal_server_error(message=f"Error deleting feedback: {str(e)}")


@admin_actions_router.post("/feedback/{feedback_id}/upload-image", summary="Upload Feedback Image")
async def upload_feedback_image(
    feedback_id: UUID,
    image_file: UploadFile = File(..., description="Image file to upload"),
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Upload an image for feedback"""
    try:
        # Check if feedback exists
        feedback = await FeedbackService.get_feedback_by_id(feedback_id, db)
        if not feedback:
            raise not_found_error(message="Feedback not found")
        
        # Validate image file
        if not image_file.content_type or not image_file.content_type.startswith('image/'):
            raise bad_request_error(message="File must be an image")
        
        # Upload image
        image_path = await FeedbackService.upload_feedback_image(
            feedback_id=feedback_id,
            image_file=image_file,
            user_email=current_user.email,
            db=db
        )
        
        return {
            "message": "Image uploaded successfully", 
            "image_path": image_path,
            "image_url": FeedbackService.get_image_url(image_path)
        }
        
    except Exception as e:
        raise internal_server_error(message=f"Error uploading image: {str(e)}")


# ============================================================================
# USAGE ANALYTICS ENDPOINTS
# ============================================================================

@admin_actions_router.get("/usage/overview", summary="Get Usage Overview")
async def get_usage_overview(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive usage overview for the system"""
    try:
        # Total users
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.disabled == False).count()
        
        # Usage statistics by feature
        usage_stats = db.query(
            UsageTracking.feature,
            func.sum(UsageTracking.amount).label('total_amount'),
            func.count(UsageTracking.id).label('usage_count'),
            func.count(func.distinct(UsageTracking.user_id)).label('unique_users')
        ).group_by(UsageTracking.feature).all()
        
        # Recent activity (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_usage = db.query(
            func.date(UsageTracking.timestamp).label('date'),
            func.count(UsageTracking.id).label('daily_usage')
        ).filter(
            UsageTracking.timestamp >= thirty_days_ago
        ).group_by(func.date(UsageTracking.timestamp)).order_by('date').all()
        
        # Top users by usage
        top_users = db.query(
            User.email,
            func.sum(UsageTracking.amount).label('total_usage')
        ).join(UsageTracking).group_by(User.id, User.email).order_by(
            desc('total_usage')
        ).limit(10).all()
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "usage_by_feature": [
                {
                    "feature": stat.feature,
                    "total_amount": float(stat.total_amount),
                    "usage_count": stat.usage_count,
                    "unique_users": stat.unique_users
                } for stat in usage_stats
            ],
            "recent_activity": [
                {
                    "date": str(activity.date),
                    "daily_usage": activity.daily_usage
                } for activity in recent_usage
            ],
            "top_users": [
                {
                    "email": user.email,
                    "total_usage": float(user.total_usage)
                } for user in top_users
            ]
        }
        
    except Exception as e:
        raise internal_server_error(message=f"Error fetching usage overview: {str(e)}")


@admin_actions_router.get("/usage/user/{user_id}", summary="Get User Usage Details")
async def get_user_usage(
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed usage information for a specific user"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise not_found_error(message="User not found")
        
        # User's usage by feature
        user_usage = db.query(
            UsageTracking.feature,
            func.sum(UsageTracking.amount).label('total_amount'),
            func.count(UsageTracking.id).label('usage_count'),
            func.max(UsageTracking.timestamp).label('last_used')
        ).filter(
            UsageTracking.user_id == user_id
        ).group_by(UsageTracking.feature).all()
        
        # User's recent activity (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_activity = db.query(UsageTracking).filter(
            and_(
                UsageTracking.user_id == user_id,
                UsageTracking.timestamp >= thirty_days_ago
            )
        ).order_by(desc(UsageTracking.timestamp)).limit(50).all()
        
        return {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "created_at": user.created_at,
                "last_login": user.updated_at
            },
            "usage_by_feature": [
                {
                    "feature": usage.feature,
                    "total_amount": float(usage.total_amount),
                    "usage_count": usage.usage_count,
                    "last_used": usage.last_used
                } for usage in user_usage
            ],
            "recent_activity": [
                {
                    "id": str(activity.id),
                    "feature": activity.feature,
                    "amount": float(activity.amount),
                    "timestamp": activity.timestamp,
                    "description": activity.description
                } for activity in recent_activity
            ]
        }
        
    except Exception as e:
        raise internal_server_error(message=f"Error fetching user usage: {str(e)}")


@admin_actions_router.get("/usage/analytics", summary="Get Usage Analytics")
async def get_usage_analytics(
    start_date: Optional[date] = Query(None, description="Start date for analytics"),
    end_date: Optional[date] = Query(None, description="End date for analytics"),
    feature: Optional[str] = Query(None, description="Filter by specific feature"),
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed usage analytics with date filtering"""
    try:
        query = db.query(UsageTracking)
        
        # Apply date filters
        if start_date:
            query = query.filter(UsageTracking.date >= start_date)
        if end_date:
            query = query.filter(UsageTracking.date <= end_date)
        if feature:
            query = query.filter(UsageTracking.feature == feature)
        
        # Daily usage trends
        daily_trends = query.with_entities(
            func.date(UsageTracking.timestamp).label('date'),
            func.sum(UsageTracking.amount).label('total_amount'),
            func.count(UsageTracking.id).label('usage_count'),
            func.count(func.distinct(UsageTracking.user_id)).label('unique_users')
        ).group_by(func.date(UsageTracking.timestamp)).order_by('date').all()
        
        # Feature breakdown
        feature_breakdown = query.with_entities(
            UsageTracking.feature,
            func.sum(UsageTracking.amount).label('total_amount'),
            func.count(UsageTracking.id).label('usage_count'),
            func.count(func.distinct(UsageTracking.user_id)).label('unique_users')
        ).group_by(UsageTracking.feature).order_by(desc('total_amount')).all()
        
        # User engagement
        user_engagement = query.with_entities(
            func.date(UsageTracking.timestamp).label('date'),
            func.count(func.distinct(UsageTracking.user_id)).label('active_users')
        ).group_by(func.date(UsageTracking.timestamp)).order_by('date').all()
        
        return {
            "daily_trends": [
                {
                    "date": str(trend.date),
                    "total_amount": float(trend.total_amount),
                    "usage_count": trend.usage_count,
                    "unique_users": trend.unique_users
                } for trend in daily_trends
            ],
            "feature_breakdown": [
                {
                    "feature": breakdown.feature,
                    "total_amount": float(breakdown.total_amount),
                    "usage_count": breakdown.usage_count,
                    "unique_users": breakdown.unique_users
                } for breakdown in feature_breakdown
            ],
            "user_engagement": [
                {
                    "date": str(engagement.date),
                    "active_users": engagement.active_users
                } for engagement in user_engagement
            ]
        }
        
    except Exception as e:
        raise internal_server_error(message=f"Error fetching usage analytics: {str(e)}")


# ============================================================================
# BLOG MANAGEMENT ENDPOINTS
# ============================================================================

@admin_actions_router.get("/blog/posts", response_model=List[BlogPostResponse], summary="Get All Blog Posts")
async def get_all_blog_posts(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    published_only: bool = Query(False, description="Show only published posts"),
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all blog posts with filtering and pagination"""
    try:
        query = db.query(BlogPost)
        
        if published_only:
            query = query.filter(BlogPost.is_published == True)
        
        if category:
            query = query.filter(BlogPost.category == category)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        posts = query.order_by(desc(BlogPost.created_at)).offset(offset).limit(page_size).all()
        
        return [
            BlogPostResponse(
                id=post.id,
                title=post.title,
                slug=post.slug,
                summary=post.summary,
                featured_image_url=post.featured_image_url,
                content=post.content,
                author_name=post.author_name,
                author_email=post.author_email,
                category=post.category,
                tags=post.tags_list,
                is_published=post.is_published,
                view_count=post.view_count,
                reading_time_minutes=post.reading_time_minutes,
                created_at=post.created_at,
                updated_at=post.updated_at,
                published_at=post.published_at,
                meta_description=post.meta_description,
                meta_keywords=post.meta_keywords
            ) for post in posts
        ]
        
    except Exception as e:
        raise internal_server_error(message=f"Error fetching blog posts: {str(e)}")


@admin_actions_router.post("/blog/posts", response_model=BlogPostResponse, summary="Create Blog Post")
async def create_blog_post(
    blog_data: BlogPostCreate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new blog post"""
    try:
        blog_post = BlogService.create_blog_post(db, blog_data)
        
        return BlogPostResponse(
            id=blog_post.id,
            title=blog_post.title,
            slug=blog_post.slug,
            summary=blog_post.summary,
            featured_image_url=blog_post.featured_image_url,
            content=blog_post.content,
            author_name=blog_post.author_name,
            author_email=blog_post.author_email,
            category=blog_post.category,
            tags=blog_post.tags_list,
            is_published=blog_post.is_published,
            view_count=blog_post.view_count,
            reading_time_minutes=blog_post.reading_time_minutes,
            created_at=blog_post.created_at,
            updated_at=blog_post.updated_at,
            published_at=blog_post.published_at,
            meta_description=blog_post.meta_description,
            meta_keywords=blog_post.meta_keywords
        )
        
    except Exception as e:
        raise internal_server_error(message=f"Error creating blog post: {str(e)}")


@admin_actions_router.post("/blog/upload-image", summary="Upload Blog Image")
async def upload_blog_image(
    image_file: UploadFile = File(..., description="Image file to upload"),
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Upload an image for blog posts"""
    try:
        # Validate image file
        if not image_file.content_type or not image_file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (JPEG, PNG, GIF, WebP)"
            )
        
        # Validate file size (max 10MB)
        file_size = 0
        content = await image_file.read()
        file_size = len(content)
        
        if file_size > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(
                status_code=400,
                detail="File size must be less than 10MB"
            )
        
        # Reset file pointer
        await image_file.seek(0)
        
        # Create unique filename
        file_extension = Path(image_file.filename).suffix.lower()
        if file_extension not in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
            raise HTTPException(
                status_code=400,
                detail="Unsupported image format. Use JPEG, PNG, GIF, or WebP"
            )
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"blog_{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
        
        # Create blog_images directory if it doesn't exist
        blog_images_dir = Path("app/static/blog_images")
        blog_images_dir.mkdir(parents=True, exist_ok=True)
        
        # Save file
        file_path = blog_images_dir / unique_filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image_file.file, buffer)
        
        # Generate URL for the image
        image_url = f"/static/blog_images/{unique_filename}"
        
        return {
            "message": "Image uploaded successfully",
            "filename": unique_filename,
            "url": image_url,
            "size": file_size,
            "content_type": image_file.content_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading image: {str(e)}"
        )


@admin_actions_router.put("/blog/posts/{post_id}", response_model=BlogPostResponse, summary="Update Blog Post")
async def update_blog_post(
    post_id: UUID,
    blog_data: BlogPostUpdate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update an existing blog post"""
    try:
        blog_post = BlogService.update_blog_post(db, post_id, blog_data)
        
        if not blog_post:
            raise not_found_error(message="Blog post not found")
        
        return BlogPostResponse(
            id=blog_post.id,
            title=blog_post.title,
            slug=blog_post.slug,
            summary=blog_post.summary,
            featured_image_url=blog_post.featured_image_url,
            content=blog_post.content,
            author_name=blog_post.author_name,
            author_email=blog_post.author_email,
            category=blog_post.category,
            tags=blog_post.tags_list,
            is_published=blog_post.is_published,
            view_count=blog_post.view_count,
            reading_time_minutes=blog_post.reading_time_minutes,
            created_at=blog_post.created_at,
            updated_at=blog_post.updated_at,
            published_at=blog_post.published_at,
            meta_description=blog_post.meta_description,
            meta_keywords=blog_post.meta_keywords
        )
        
    except Exception as e:
        raise internal_server_error(message=f"Error updating blog post: {str(e)}")


@admin_actions_router.post("/blog/posts/{post_id}/publish", summary="Publish Blog Post")
async def publish_blog_post(
    post_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Publish a blog post"""
    try:
        blog_post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
        if not blog_post:
            raise not_found_error(message="Blog post not found")
        
        blog_post.is_published = True
        blog_post.published_at = datetime.utcnow()
        db.commit()
        
        return {"message": "Blog post published successfully", "post_id": str(post_id)}
        
    except Exception as e:
        raise internal_server_error(message=f"Error publishing blog post: {str(e)}")


@admin_actions_router.post("/blog/posts/{post_id}/unpublish", summary="Unpublish Blog Post")
async def unpublish_blog_post(
    post_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Unpublish a blog post"""
    try:
        blog_post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
        if not blog_post:
            raise not_found_error(message="Blog post not found")
        
        blog_post.is_published = False
        blog_post.published_at = None
        db.commit()
        
        return {"message": "Blog post unpublished successfully", "post_id": str(post_id)}
        
    except Exception as e:
        raise internal_server_error(message=f"Error unpublishing blog post: {str(e)}")


@admin_actions_router.delete("/blog/posts/{post_id}", summary="Delete Blog Post")
async def delete_blog_post(
    post_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a blog post"""
    try:
        success = BlogService.delete_blog_post(db, post_id)
        
        if not success:
            raise not_found_error(message="Blog post not found")
        
        return {"message": "Blog post deleted successfully", "post_id": str(post_id)}
        
    except Exception as e:
        raise internal_server_error(message=f"Error deleting blog post: {str(e)}")


@admin_actions_router.get("/blog/analytics", summary="Get Blog Analytics")
async def get_blog_analytics(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get blog analytics and statistics"""
    try:
        # Total posts
        total_posts = db.query(BlogPost).count()
        published_posts = db.query(BlogPost).filter(BlogPost.is_published == True).count()
        draft_posts = total_posts - published_posts
        
        # Total views
        total_views = db.query(func.sum(BlogPost.view_count)).scalar() or 0
        
        # Most popular posts
        popular_posts = db.query(BlogPost).filter(
            BlogPost.is_published == True
        ).order_by(desc(BlogPost.view_count)).limit(5).all()
        
        # Posts by category
        posts_by_category = db.query(
            BlogPost.category,
            func.count(BlogPost.id).label('count')
        ).group_by(BlogPost.category).all()
        
        # Recent posts
        recent_posts = db.query(BlogPost).order_by(
            desc(BlogPost.created_at)
        ).limit(5).all()
        
        return {
            "total_posts": total_posts,
            "published_posts": published_posts,
            "draft_posts": draft_posts,
            "total_views": int(total_views),
            "popular_posts": [
                {
                    "id": str(post.id),
                    "title": post.title,
                    "slug": post.slug,
                    "view_count": post.view_count,
                    "published_at": post.published_at
                } for post in popular_posts
            ],
            "posts_by_category": [
                {
                    "category": category,
                    "count": count
                } for category, count in posts_by_category
            ],
            "recent_posts": [
                {
                    "id": str(post.id),
                    "title": post.title,
                    "slug": post.slug,
                    "is_published": post.is_published,
                    "created_at": post.created_at
                } for post in recent_posts
            ]
        }
        
    except Exception as e:
        raise internal_server_error(message=f"Error fetching blog analytics: {str(e)}")


# ============================================================================
# PLAN ASSIGNMENT ENDPOINTS
# ============================================================================

@admin_actions_router.get("/plans", response_model=List[PlanListItem], summary="Get All Available Plans")
async def get_all_plans(
    include_inactive: bool = Query(False, description="Include inactive/disabled plans in the list"),
    include_addons: bool = Query(True, description="Include add-on plans (Extra Storage, Extra Tokens, etc.)"),
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get all available plans for admin to assign to users.
    
    📋 **Use this endpoint to:**
    - Get list of plans to show in a dropdown
    - See what plans are available to assign
    - Check plan details (limits, pricing)
    
    💡 **Response includes:**
    - Plan IDs (needed for assignment)
    - Plan names and descriptions
    - Pricing (monthly/yearly)
    - Key limits (files, storage, tokens)
    - Plan type (main plan vs add-on)
    
    🎯 **Common usage:**
    1. Call this endpoint to get all plans
    2. Display plans in a dropdown/list
    3. Copy the plan_id you want
    4. Use it in the assign-plan endpoint
    
    📝 **Example response:**
    - Free: $0/month, 1 file, 5MB storage
    - MVP: $0/month, 5 files, 1GB storage
    - Pro: $9/month, 10 files, 5GB storage
    - Business: $29/month, 50 files, 20GB storage
    - Extra Storage: $2/month add-on
    - Extra AI Tokens: $3/month add-on
    """
    try:
        query = db.query(Plan)
        
        if not include_inactive:
            query = query.filter(Plan.is_active == True)
        
        if not include_addons:
            query = query.filter(Plan.is_addon == False)
        
        plans = query.order_by(Plan.is_addon, Plan.price_monthly).all()
        
        return [
            PlanListItem(
                id=plan.id,
                name=plan.name,
                description=plan.description,
                price_monthly=plan.price_monthly,
                price_yearly=plan.price_yearly,
                is_active=plan.is_active,
                is_addon=plan.is_addon,
                file_limit=plan.file_limit,
                storage_limit_gb=plan.storage_limit_gb,
                ai_tokens_per_month=plan.ai_tokens_per_month,
                synthetic_rows_per_month=plan.synthetic_rows_per_month
            )
            for plan in plans
        ]
        
    except Exception as e:
        raise internal_server_error(message=f"Error fetching plans: {str(e)}")


@admin_actions_router.post("/users/{user_id}/assign-plan", response_model=AssignPlanResponse, summary="Assign Plan to User (Admin)")
async def assign_plan_to_user(
    user_id: UUID,
    assignment: AssignPlanRequest,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Assign a plan to a user without requiring payment (admin action).
    
    🎯 **When to use this:**
    - User has NO active plan (error: "User has no active plan")
    - VIP customers getting free access
    - Beta testers needing elevated plans
    - Offline payments (bank transfer, invoice)
    - Promotional offers and special deals
    - Upgrading/downgrading users manually
    
    📝 **Request Body Fields:**
    
    **plan_id** (required):
    - The UUID of the plan to assign
    - Get plan IDs from: GET /admin/plans
    - Example: "b8c9d0e1-f2a3-4567-8901-234567890abc" (MVP)
    
    **duration_months** (optional):
    - `null` or omit = UNLIMITED (no expiration) ← Use for free plans, VIPs
    - `12` = 1 year (12 months) ← Common for annual subscriptions
    - `3` = 3 months ← Good for trials
    - `1-120` = Any number of months
    
    **deactivate_existing** (optional, default: true):
    - `true` = REPLACE current plan (deactivate old, activate new) ← Most common
    - `false` = ADD to current plan (keep both active) ← Use for add-ons
    
    💡 **Common Examples:**
    
    1️⃣ Assign MVP plan (unlimited, free):
    ```json
    {
      "plan_id": "b8c9d0e1-f2a3-4567-8901-234567890abc",
      "duration_months": null,
      "deactivate_existing": true
    }
    ```
    
    2️⃣ Upgrade to Pro for 1 year:
    ```json
    {
      "plan_id": "97ad91a4-8160-4b86-946f-362adebc9883",
      "duration_months": 12,
      "deactivate_existing": true
    }
    ```
    
    3️⃣ Add Extra Storage (keep existing plan):
    ```json
    {
      "plan_id": "679249e0-fa3c-4c48-ac6d-3d231df3efc7",
      "duration_months": 6,
      "deactivate_existing": false
    }
    ```
    
    4️⃣ VIP lifetime Business plan:
    ```json
    {
      "plan_id": "a742e9e5-55dc-4db5-a1c2-9121152207a8",
      "duration_months": null,
      "deactivate_existing": true
    }
    ```
    
    ⚠️ **Important:**
    - This bypasses Stripe payment
    - User gets immediate access
    - Use responsibly for legitimate cases
    - Consider adding admin notes in your records
    
    ✅ **After assignment:**
    - User immediately has access to plan features
    - You can view limits: GET /admin/users/{user_id}/limits
    - You can set custom limits: PUT /admin/users/{user_id}/limits
    """
    try:
        # Check if user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise not_found_error(message="User not found")
        
        # Check if plan exists
        plan = db.query(Plan).filter(Plan.id == assignment.plan_id).first()
        if not plan:
            raise not_found_error(message="Plan not found")
        
        # Deactivate existing plans if requested
        if assignment.deactivate_existing:
            db.query(UserPlan).filter(
                UserPlan.user_id == user_id,
                UserPlan.is_active == True
            ).update({"is_active": False})
        
        # Calculate dates
        start_date = datetime.utcnow()
        end_date = None
        if assignment.duration_months:
            end_date = start_date + timedelta(days=30 * assignment.duration_months)
        
        # Create new user plan
        new_user_plan = UserPlan(
            user_id=user_id,
            plan_id=assignment.plan_id,
            start_date=start_date,
            end_date=end_date,
            is_active=True,
            stripe_session_id=None  # Admin assignment, no Stripe
        )
        
        db.add(new_user_plan)
        db.commit()
        db.refresh(new_user_plan)
        
        return AssignPlanResponse(
            success=True,
            message=f"Successfully assigned {plan.name} plan to {user.email}",
            user_plan_id=new_user_plan.id,
            user_id=user_id,
            plan_id=plan.id,
            plan_name=plan.name,
            start_date=start_date,
            end_date=end_date,
            is_active=True
        )
        
    except Exception as e:
        db.rollback()
        raise internal_server_error(message=f"Error assigning plan: {str(e)}")


# ============================================================================
# USER LIMITS MANAGEMENT ENDPOINTS
# ============================================================================

@admin_actions_router.get("/users/{user_id}/limits", response_model=UserLimitsResponse, summary="Get User's Plan Limits")
async def get_user_limits(
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    View user's current plan limits and any custom overrides.
    
    📊 **This endpoint shows THREE types of limits:**
    
    1️⃣ **Plan Limits** (plan_* fields):
    - Default limits from the user's plan (MVP, Pro, etc.)
    - What the plan normally provides
    
    2️⃣ **Custom Overrides** (custom_* fields):
    - Limits set by admin for this specific user
    - Overrides plan defaults when set
    - `null` = not set (using plan default)
    
    3️⃣ **Effective Limits** (effective_* fields):
    - What the user ACTUALLY gets
    - = custom limit if set, otherwise plan limit
    - This is what the system enforces
    
    💡 **Example scenario:**
    - User on MVP plan (5 files, 1 GB storage)
    - Admin sets custom_file_limit = 20
    - Result:
      - plan_file_limit: 5 (plan default)
      - custom_file_limit: 20 (admin override)
      - effective_file_limit: 20 (what user gets) ✨
    
    ⚠️ **Common error:**
    - "User has no active plan" → User needs a plan assigned first!
    - Fix: Use POST /admin/users/{user_id}/assign-plan
    
    🎯 **Use this to:**
    - Check what limits a user has
    - See if admin has set custom overrides
    - Verify effective limits before making changes
    """
    try:
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise not_found_error(message="User not found")
        
        # Get user's active plan
        user_plan = db.query(UserPlan).filter(
            UserPlan.user_id == user_id,
            UserPlan.is_active == True
        ).first()
        
        if not user_plan:
            raise not_found_error(message="User has no active plan")
        
        plan = user_plan.plan
        effective_limits = user_plan.get_effective_limits()
        
        return UserLimitsResponse(
            user_id=user_id,
            plan_id=plan.id,
            plan_name=plan.name,
            # Plan defaults
            plan_file_limit=plan.file_limit,
            plan_file_size_limit_mb=plan.file_size_limit_mb,
            plan_storage_limit_gb=plan.storage_limit_gb,
            plan_rules_limit=plan.rules_limit,
            plan_lists_limit=plan.custom_lists_limit,
            plan_ai_prompts_per_month=plan.ai_prompts_per_month,
            plan_ai_tokens_per_month=plan.ai_tokens_per_month,
            plan_synthetic_rows_per_month=plan.synthetic_rows_per_month,
            # Custom overrides
            custom_file_limit=user_plan.custom_file_limit,
            custom_file_size_limit_mb=user_plan.custom_file_size_limit_mb,
            custom_storage_limit_gb=user_plan.custom_storage_limit_gb,
            custom_rules_limit=user_plan.custom_rules_limit,
            custom_lists_limit=user_plan.custom_lists_limit,
            custom_ai_prompts_per_month=user_plan.custom_ai_prompts_per_month,
            custom_ai_tokens_per_month=user_plan.custom_ai_tokens_per_month,
            custom_synthetic_rows_per_month=user_plan.custom_synthetic_rows_per_month,
            # Effective limits
            effective_file_limit=effective_limits['file_limit'],
            effective_file_size_limit_mb=effective_limits['file_size_limit_mb'],
            effective_storage_limit_gb=effective_limits['storage_limit_gb'],
            effective_rules_limit=effective_limits['rules_limit'],
            effective_lists_limit=effective_limits['custom_lists_limit'],
            effective_ai_prompts_per_month=effective_limits['ai_prompts_per_month'],
            effective_ai_tokens_per_month=effective_limits['ai_tokens_per_month'],
            effective_synthetic_rows_per_month=effective_limits['synthetic_rows_per_month']
        )
        
    except Exception as e:
        raise internal_server_error(message=f"Error fetching user limits: {str(e)}")


@admin_actions_router.put("/users/{user_id}/limits", response_model=UserLimitsResponse, summary="Set Custom Limits for User (Override Plan)")
async def update_user_limits(
    user_id: UUID,
    limits: UserLimitsUpdate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Set custom limits for a specific user (overrides their plan's default limits).
    
    🎯 **When to use this:**
    - Important MVP company needs more resources for testing
    - VIP customer deserves special treatment
    - Beta tester needs enhanced limits
    - Temporary boost for demos or presentations
    - Handle special requests without creating custom plans
    
    ⚙️ **How it works:**
    - You set ONLY the limits you want to override
    - Other limits continue to use the plan defaults
    - Changes take effect immediately
    - User doesn't need to do anything
    
    📝 **Available Custom Limits (8 fields):**
    
    1. **custom_file_limit** - Number of files user can upload
       - Example: Set to 20 (instead of MVP's 5)
    
    2. **custom_file_size_limit_mb** - Max size per file in MB
       - Example: Set to 100 (instead of MVP's 10)
    
    3. **custom_storage_limit_gb** - Total storage space in GB
       - Example: Set to 10.0 (instead of MVP's 1.0)
    
    4. **custom_rules_limit** - Number of rules allowed
       - Example: Set to 50 (instead of MVP's 10)
    
    5. **custom_lists_limit** - Number of custom lists
       - Example: Set to -1 for unlimited (instead of MVP's 5)
    
    6. **custom_ai_prompts_per_month** - Monthly AI prompts
       - Example: Set to 1000 (instead of MVP's 200)
    
    7. **custom_ai_tokens_per_month** - Monthly AI tokens
       - Example: Set to 500000 (instead of MVP's 100000)
    
    8. **custom_synthetic_rows_per_month** - Monthly synthetic data rows
       - Example: Set to 50000 (instead of MVP's 5000)
    
    💡 **Common Examples:**
    
    1️⃣ Important company needs more files and storage:
    ```json
    {
      "custom_file_limit": 20,
      "custom_storage_limit_gb": 10.0
    }
    ```
    
    2️⃣ VIP needs more AI tokens:
    ```json
    {
      "custom_ai_tokens_per_month": 1000000
    }
    ```
    
    3️⃣ Beta tester needs everything boosted:
    ```json
    {
      "custom_file_limit": 50,
      "custom_storage_limit_gb": 20.0,
      "custom_lists_limit": -1,
      "custom_ai_tokens_per_month": 2000000
    }
    ```
    
    4️⃣ Temporary demo boost (can reset later with DELETE):
    ```json
    {
      "custom_file_limit": 100,
      "custom_storage_limit_gb": 50.0
    }
    ```
    
    ✅ **Key Features:**
    - Only include fields you want to change
    - Omitted fields keep plan defaults
    - Set to `null` to remove an override
    - Changes are immediate (no server restart)
    - Fully reversible (use DELETE endpoint)
    
    ⚠️ **Important Notes:**
    - User must have an active plan first
    - Custom limits persist until you reset them
    - User sees effective limits (not aware if custom)
    - Set `custom_lists_limit: -1` for unlimited lists
    
    🔄 **To reset later:**
    Use: DELETE /admin/users/{user_id}/limits
    """
    try:
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise not_found_error(message="User not found")
        
        # Get user's active plan
        user_plan = db.query(UserPlan).filter(
            UserPlan.user_id == user_id,
            UserPlan.is_active == True
        ).first()
        
        if not user_plan:
            raise not_found_error(message="User has no active plan")
        
        # Update custom limits (only update fields that are provided)
        update_data = limits.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user_plan, field, value)
        
        db.commit()
        db.refresh(user_plan)
        
        # Return updated limits
        plan = user_plan.plan
        effective_limits = user_plan.get_effective_limits()
        
        return UserLimitsResponse(
            user_id=user_id,
            plan_id=plan.id,
            plan_name=plan.name,
            # Plan defaults
            plan_file_limit=plan.file_limit,
            plan_file_size_limit_mb=plan.file_size_limit_mb,
            plan_storage_limit_gb=plan.storage_limit_gb,
            plan_rules_limit=plan.rules_limit,
            plan_lists_limit=plan.custom_lists_limit,
            plan_ai_prompts_per_month=plan.ai_prompts_per_month,
            plan_ai_tokens_per_month=plan.ai_tokens_per_month,
            plan_synthetic_rows_per_month=plan.synthetic_rows_per_month,
            # Custom overrides
            custom_file_limit=user_plan.custom_file_limit,
            custom_file_size_limit_mb=user_plan.custom_file_size_limit_mb,
            custom_storage_limit_gb=user_plan.custom_storage_limit_gb,
            custom_rules_limit=user_plan.custom_rules_limit,
            custom_lists_limit=user_plan.custom_lists_limit,
            custom_ai_prompts_per_month=user_plan.custom_ai_prompts_per_month,
            custom_ai_tokens_per_month=user_plan.custom_ai_tokens_per_month,
            custom_synthetic_rows_per_month=user_plan.custom_synthetic_rows_per_month,
            # Effective limits
            effective_file_limit=effective_limits['file_limit'],
            effective_file_size_limit_mb=effective_limits['file_size_limit_mb'],
            effective_storage_limit_gb=effective_limits['storage_limit_gb'],
            effective_rules_limit=effective_limits['rules_limit'],
            effective_lists_limit=effective_limits['custom_lists_limit'],
            effective_ai_prompts_per_month=effective_limits['ai_prompts_per_month'],
            effective_ai_tokens_per_month=effective_limits['ai_tokens_per_month'],
            effective_synthetic_rows_per_month=effective_limits['synthetic_rows_per_month']
        )
        
    except Exception as e:
        raise internal_server_error(message=f"Error updating user limits: {str(e)}")


@admin_actions_router.delete("/users/{user_id}/limits", summary="Reset User's Custom Limits (Revert to Plan Defaults)")
async def reset_user_limits(
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Reset all custom limits for a user back to their plan's default limits.
    
    🎯 **When to use this:**
    - Testing period is over (reset beta tester to normal)
    - Demo is complete (remove temporary boost)
    - VIP treatment ends (back to regular plan limits)
    - You want to remove ALL custom overrides at once
    
    ⚙️ **What this does:**
    - Sets all custom_* fields to `null`
    - User reverts to their plan's default limits
    - No changes to the user's plan itself
    - Immediate effect
    
    💡 **Example:**
    - User had custom_file_limit = 20 (override)
    - User has MVP plan with file_limit = 5 (default)
    - After reset → user gets 5 files (back to MVP default)
    
    📝 **Use cases:**
    
    1️⃣ End of beta testing:
    - Beta tester had custom limits for 3 months
    - Testing complete → reset to normal MVP limits
    
    2️⃣ Temporary VIP access ends:
    - VIP had boosted limits for a project
    - Project done → reset to their plan limits
    
    3️⃣ Demo cleanup:
    - Gave user high limits for demo
    - Demo over → reset to normal
    
    ✅ **Result:**
    - All 8 custom limit fields cleared
    - User uses plan defaults again
    - You can see the change in GET /admin/users/{user_id}/limits
    
    ⚠️ **Note:**
    - This does NOT change the user's plan
    - This does NOT deactivate the user
    - User keeps their plan (MVP, Pro, etc.)
    - Only resets the custom overrides
    
    🔄 **You can always set custom limits again later with:**
    PUT /admin/users/{user_id}/limits
    """
    try:
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise not_found_error(message="User not found")
        
        # Get user's active plan
        user_plan = db.query(UserPlan).filter(
            UserPlan.user_id == user_id,
            UserPlan.is_active == True
        ).first()
        
        if not user_plan:
            raise not_found_error(message="User has no active plan")
        
        # Reset all custom limits to None
        user_plan.custom_file_limit = None
        user_plan.custom_file_size_limit_mb = None
        user_plan.custom_storage_limit_gb = None
        user_plan.custom_rules_limit = None
        user_plan.custom_lists_limit = None
        user_plan.custom_ai_prompts_per_month = None
        user_plan.custom_ai_tokens_per_month = None
        user_plan.custom_synthetic_rows_per_month = None
        
        db.commit()
        
        return {
            "message": "Custom limits reset successfully. User now uses plan defaults.",
            "user_id": str(user_id),
            "plan_name": user_plan.plan.name
        }
        
    except Exception as e:
        raise internal_server_error(message=f"Error resetting user limits: {str(e)}")


# ============================================================================
# SYSTEM OVERVIEW ENDPOINTS
# ============================================================================

@admin_actions_router.get("/system/overview", summary="Get System Overview")
async def get_system_overview(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive system overview"""
    try:
        # User statistics
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.disabled == False).count()
        admin_users = db.query(User).filter(User.role == Role.ADMIN).count()
        verified_users = db.query(User).filter(User.email_verified == True).count()
        
        # Data statistics
        total_files = db.query(UserData).count()
        total_feedback = db.query(Feedback).count()
        open_feedback = db.query(Feedback).filter(Feedback.status == "open").count()
        
        # Blog statistics
        total_posts = db.query(BlogPost).count()
        published_posts = db.query(BlogPost).filter(BlogPost.is_published == True).count()
        
        # Usage statistics
        total_usage_records = db.query(UsageTracking).count()
        unique_features_used = db.query(func.distinct(UsageTracking.feature)).count()
        
        # Recent activity (last 7 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_users = db.query(User).filter(User.created_at >= seven_days_ago).count()
        recent_feedback = db.query(Feedback).filter(Feedback.created_at >= seven_days_ago).count()
        recent_usage = db.query(UsageTracking).filter(UsageTracking.timestamp >= seven_days_ago).count()
        
        return {
            "users": {
                "total": total_users,
                "active": active_users,
                "admins": admin_users,
                "verified": verified_users,
                "recent_signups": recent_users
            },
            "data": {
                "total_files": total_files,
                "total_feedback": total_feedback,
                "open_feedback": open_feedback
            },
            "blog": {
                "total_posts": total_posts,
                "published_posts": published_posts,
                "draft_posts": total_posts - published_posts
            },
            "usage": {
                "total_records": total_usage_records,
                "unique_features": unique_features_used,
                "recent_activity": recent_usage
            },
            "recent_activity": {
                "new_users": recent_users,
                "new_feedback": recent_feedback,
                "usage_events": recent_usage
            }
        }
        
    except Exception as e:
        raise internal_server_error(message=f"Error fetching system overview: {str(e)}")


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

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
