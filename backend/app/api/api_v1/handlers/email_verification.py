from fastapi import APIRouter, HTTPException, Depends, status, Body
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.models.user_model import User
from app.api.deps.user_deps import get_current_user
from app.core.db_setup import get_db
from app.services.email_verification_service import EmailVerificationService
from app.schemas.email_verification_schemas import (
    EmailVerificationRequest, 
    EmailVerificationResponse,
    EmailVerificationStatus,
    ResendVerificationResponse
)
from app.utils.http_exceptions import internal_server_error

email_verification_router = APIRouter()


@email_verification_router.post("/verify", response_model=EmailVerificationResponse, summary="Verify Email")
async def verify_email(
    request: EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Verify user email using verification token
    """
    try:
        success = await EmailVerificationService.verify_email(request.token, db)
        
        if success:
            return EmailVerificationResponse(
                success=True,
                message="Email verified successfully! You can now access your dashboard."
            )
        else:
            return EmailVerificationResponse(
                success=False,
                message="Email verification failed. Please try again."
            )
            
    except HTTPException as e:
        raise e
    except Exception as e:
        raise internal_server_error(
            message="Error verifying email. Please try again later."
        )


@email_verification_router.post("/resend-by-token", response_model=ResendVerificationResponse, summary="Resend Verification Email by Token")
async def resend_verification_by_token(
    request: EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Resend verification email using token (no login required)
    Useful when user has a verification token but needs a new email
    """
    try:
        success = await EmailVerificationService.resend_verification_by_token(request.token, db)
        
        if success:
            return ResendVerificationResponse(
                success=True,
                message="New verification email sent successfully! Please check your inbox."
            )
        else:
            return ResendVerificationResponse(
                success=False,
                message="Failed to send verification email. Please try again later."
            )
            
    except HTTPException as e:
        raise e
    except Exception as e:
        raise internal_server_error(
            message="Error resending verification email. Please try again later."
        )


@email_verification_router.get("/status", response_model=EmailVerificationStatus, summary="Get Verification Status")
async def get_verification_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get email verification status for current user
    """
    try:
        is_verified = await EmailVerificationService.is_email_verified(current_user.id, db)
        
        message = None
        if not is_verified:
            message = "Please verify your email to access all features."
        
        return EmailVerificationStatus(
            email_verified=is_verified,
            message=message
        )
        
    except Exception as e:
        raise internal_server_error(
            message="Error getting verification status. Please try again later."
        )


@email_verification_router.post("/resend-by-email", response_model=ResendVerificationResponse, summary="Resend Verification Email by Email")
async def resend_verification_by_email(
    email: str = Body(..., embed=True, description="Email address to resend verification to"),
    db: Session = Depends(get_db)
):
    """
    Resend verification email using email address directly (no login required)
    More user-friendly than token-based resend
    """
    try:
        success = await EmailVerificationService.resend_verification_by_email(email, db)
        
        if success:
            return ResendVerificationResponse(
                success=True,
                message="Verification email sent successfully! Please check your inbox."
            )
        else:
            return ResendVerificationResponse(
                success=False,
                message="Failed to send verification email. Please try again later."
            )
            
    except HTTPException as e:
        raise e
    except Exception as e:
        raise internal_server_error(
            message="Error resending verification email. Please try again later."
        )
