from fastapi import HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.models.user_model import User
from app.api.deps.user_deps import get_current_user
from app.core.db_setup import get_db
from app.services.email_verification_service import EmailVerificationService
from app.utils.http_exceptions import forbidden_error


async def get_verified_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency that ensures the current user has verified their email.
    Raises HTTPException if email is not verified.
    """
    is_verified = await EmailVerificationService.is_email_verified(current_user.id, db)
    
    if not is_verified:
        raise forbidden_error(
            error_code="EMAIL_NOT_VERIFIED",
            message="Email verification required",
            extra={"email": current_user.email}
        )
    
    return current_user


async def get_user_with_verification_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Dependency that returns user with verification status.
    Does not block access but provides verification info.
    """
    is_verified = await EmailVerificationService.is_email_verified(current_user.id, db)
    
    return {
        "user": current_user,
        "email_verified": is_verified
    }
