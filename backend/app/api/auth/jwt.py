from re import M
from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from fastapi.security import OAuth2PasswordRequestForm
from typing import Any
from pydantic import ValidationError
from jose import jwt
from sqlalchemy.orm import Session

from app.models.user_model import User
from app.schemas.auth_schemas import TokenPayload, TokenSchema
from app.schemas.user_schemas import UserOut
from app.services.user_services import UserService
from app.api.deps.user_deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.core.db_setup import get_db
from app.services.email_verification_service import EmailVerificationService
from app.utils.http_exceptions import (
    not_found_error, forbidden_error, bad_request_error, 
    internal_server_error, unauthorized_error
)
from app.middleware.rate_limiter import limiter


auth_router = APIRouter()


@auth_router.post('/login', summary='Create access and refresh tokens for user', response_model=TokenSchema)
@limiter.limit("5/minute")  # Limit to 5 login attempts per minute
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> Any:
    user = await UserService.authenticate(email=form_data.username, password=form_data.password, db=db)
    if not user:
        raise not_found_error(
            message="Incorrect email or password",
            extra={"field": "credentials"}
        )

    # Check if email is verified
    if not user.email_verified:
        raise forbidden_error(
            error_code="EMAIL_NOT_VERIFIED",
            message="Please verify your email before signing in",
            extra={"email": user.email}
        )

    return {"access_token": create_access_token(subject=user.id), "refresh_token": create_refresh_token(subject=user.id)}


@auth_router.post('/test-token', summary='Test if the access token is valid', response_model=UserOut)
async def test_token(user: User = Depends(get_current_user)):
    return user


@auth_router.post('/refresh', summary='Refresh token', response_model=TokenSchema)
@limiter.limit("10/minute")  # Limit token refresh to 10 per minute
async def refresh_token(request: Request, refresh_token: str = Body(...), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(
            token=refresh_token, key=settings.JWT_REFRESH_SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise forbidden_error(
            error_code="INVALID_TOKEN",
            message="Invalid or expired token"
        )

    user = await UserService.get_user_by_id(token_data.sub, db)
    if not user:
        raise not_found_error(
            message="User not found for this token"
        )

    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id)
    }


@auth_router.post('/resend-verification', summary='Resend verification email (public endpoint)')
@limiter.limit("3/minute")  # Limit to 3 verification emails per minute to prevent spam
async def resend_verification_email(request: Request, email: str = Body(..., embed=True), db: Session = Depends(get_db)):
    """
    Public endpoint to resend verification email.
    Can be used by users who haven't verified their email yet.
    """
    try:
        # Find user by email
        user = await UserService.get_user_by_email(email, db)
        if not user:
            raise not_found_error(
                message="User with this email does not exist. Please sign up first.",
                extra={"email": email}
            )
        
        # Check if email is already verified
        if user.email_verified:
            raise bad_request_error(
                error_code="EMAIL_ALREADY_VERIFIED",
                message="Email is already verified. You can sign in normally.",
                extra={"email": user.email}
            )
        
        # Send verification email
        success = await EmailVerificationService.send_verification_email(user, db)
        
        if success:
            return {
                "success": True,
                "message": "Verification email sent successfully! Please check your inbox."
            }
        else:
            raise internal_server_error(
                message="Failed to send verification email. Please try again later."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise internal_server_error(
            message="Error resending verification email. Please try again later."
        )