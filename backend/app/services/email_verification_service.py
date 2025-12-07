from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.email_verification_model import EmailVerificationToken
from app.utils.http_exceptions import (
    bad_request_error, not_found_error, internal_server_error
)
from app.models.user_model import User
from app.services.email_service import email_service


class EmailVerificationService:
    """Service for handling email verification"""
    
    @staticmethod
    async def create_verification_token(user_id: UUID, user_email: str, db: Session) -> EmailVerificationToken:
        """Create a new verification token for a user"""
        # Invalidate any existing tokens for this user
        existing_tokens = db.query(EmailVerificationToken).filter(
            EmailVerificationToken.user_id == user_id,
            EmailVerificationToken.is_used == False
        ).all()
        
        for token in existing_tokens:
            token.is_used = True
        
        # Create new token with email
        verification_token = EmailVerificationToken.create_token(user_id, user_email)
        db.add(verification_token)
        db.commit()
        db.refresh(verification_token)
        
        return verification_token
    
    @staticmethod
    async def send_verification_email(user: User, db: Session) -> bool:
        """Send verification email to user"""
        try:
            # Create verification token
            verification_token = await EmailVerificationService.create_verification_token(user.id, user.email, db)
            
            # Send email
            success = email_service.send_verification_email(
                user_email=user.email,
                username=user.username or user.email,
                verification_token=verification_token.token
            )
            
            return success
            
        except Exception as e:
            print(f"Error sending verification email: {e}")
            return False
    
    @staticmethod
    async def verify_email(token: str, db: Session) -> bool:
        """Verify email using token"""
        try:
            # First verify token signature and extract data
            try:
                token_data = EmailVerificationToken.verify_and_extract_token(token)
                user_id = UUID(token_data['user_id'])
                email = token_data['email']
            except ValueError as e:
                raise bad_request_error(
                    error_code="INVALID_TOKEN",
                    message="Invalid or corrupted verification link. Please request a new one."
                )
            
            # Find the token in database
            verification_token = db.query(EmailVerificationToken).filter(
                EmailVerificationToken.token == token
            ).first()
            
            if not verification_token:
                raise bad_request_error(
                    error_code="INVALID_TOKEN",
                    message="Invalid verification token"
                )
            
            # Check if token is already used
            if verification_token.is_used:
                raise bad_request_error(
                    error_code="TOKEN_ALREADY_USED",
                    message="Verification token has already been used"
                )
            
            # Get the user
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise not_found_error(
                    message="User not found"
                )
            
            # Verify email matches
            if user.email != email:
                raise bad_request_error(
                    error_code="TOKEN_EMAIL_MISMATCH",
                    message="Token email does not match user email"
                )
            
            # Mark token as used
            verification_token.is_used = True
            
            # Mark user email as verified
            user.email_verified = True
            
            db.commit()
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise internal_server_error(
                message="Error verifying email. Please try again later."
            )
    
    @staticmethod
    async def resend_verification_email(user_id: UUID, db: Session) -> bool:
        """Resend verification email to user"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise not_found_error(
                    message="User not found"
                )
            
            if user.email_verified:
                raise bad_request_error(
                    error_code="EMAIL_ALREADY_VERIFIED",
                    message="Email is already verified"
                )
            
            return await EmailVerificationService.send_verification_email(user, db)
            
        except HTTPException:
            raise
        except Exception as e:
            raise internal_server_error(
                message="Error resending verification email. Please try again later."
            )
    
    @staticmethod
    async def resend_verification_by_token(token: str, db: Session) -> bool:
        """Resend verification email using token (no login required)"""
        try:
            # Extract email from token
            email = EmailVerificationToken.get_email_from_token(token)
            if not email:
                raise bad_request_error(
                    error_code="INVALID_TOKEN",
                    message="Invalid or expired token"
                )
            
            # Find user by email
            user = db.query(User).filter(User.email == email).first()
            if not user:
                raise not_found_error(
                    message="User not found"
                )
            
            # Check if already verified
            if user.email_verified:
                raise bad_request_error(
                    error_code="EMAIL_ALREADY_VERIFIED",
                    message="Email is already verified"
                )
            
            # Send new verification email
            return await EmailVerificationService.send_verification_email(user, db)
            
        except HTTPException:
            raise
        except Exception as e:
            raise internal_server_error(
                message="Error resending verification email. Please try again later."
            )
    
    @staticmethod
    async def resend_verification_by_email(email: str, db: Session) -> bool:
        """Resend verification email using email address directly"""
        try:
            # Find user by email
            user = db.query(User).filter(User.email == email).first()
            if not user:
                raise not_found_error(
                    message="User with this email address does not exist. Please sign up first.",
                    extra={"email": email}
                )
            
            # Check if already verified
            if user.email_verified:
                raise bad_request_error(
                    error_code="EMAIL_ALREADY_VERIFIED",
                    message="Email is already verified. You can sign in normally.",
                    extra={"email": user.email}
                )
            
            # Send new verification email
            return await EmailVerificationService.send_verification_email(user, db)
            
        except HTTPException:
            raise
        except Exception as e:
            raise internal_server_error(
                message="Error resending verification email. Please try again later."
            )
    
    @staticmethod
    async def is_email_verified(user_id: UUID, db: Session) -> bool:
        """Check if user's email is verified"""
        user = db.query(User).filter(User.id == user_id).first()
        return user.email_verified if user else False
