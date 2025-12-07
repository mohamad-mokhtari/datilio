from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.schemas.user_schemas import UserAuth
from app.models.user_model import User
from app.models.user_plan_model import UserPlan
from app.models.plan_model import Plan
from app.core.security import get_password, verify_password
from app.services.email_verification_service import EmailVerificationService


class UserService:
    @staticmethod
    async def create_user(user: UserAuth, db: Session):
        hashed_password = get_password(user.password)
        db_user = User(
            username=user.username, 
            email=user.email, 
            hashed_password=hashed_password,
            email_verified=False  # New users start with unverified email
        )

        try:
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            # Automatically assign MVP plan to new users
            try:
                mvp_plan = db.query(Plan).filter(
                    Plan.name == "MVP",
                    Plan.is_active == True,
                    Plan.is_addon == False
                ).first()
                
                if mvp_plan:
                    # Create user plan with unlimited duration (free plan)
                    user_plan = UserPlan(
                        user_id=db_user.id,
                        plan_id=mvp_plan.id,
                        start_date=datetime.utcnow(),
                        end_date=None,  # No expiration for free plan
                        is_active=True
                    )
                    db.add(user_plan)
                    db.commit()
                    print(f"✅ Assigned MVP plan to new user: {db_user.email}")
                else:
                    print(f"⚠️ Warning: MVP plan not found. User created without plan.")
            except Exception as e:
                # Log the error but don't fail user creation
                print(f"⚠️ Failed to assign MVP plan: {e}")
                # Continue anyway - user is created, just without a plan
            
            # Send verification email
            try:
                await EmailVerificationService.send_verification_email(db_user, db)
            except Exception as e:
                # Log the error but don't fail user creation
                print(f"Failed to send verification email: {e}")
            
            return db_user
        except IntegrityError as e:
            db.rollback()
            if 'duplicate key' in str(e.orig):
                # Handle the case where a duplicate key violation occurs (e.g., duplicate email or username)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='User with this email or username already exists'
                )
            else:
                # Handle other IntegrityError cases as needed
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Failed to create user'
                )

    @staticmethod
    async def get_user_by_email(email: str, db: Session) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    async def get_user_by_id(id: UUID, db: Session) -> Optional[User]:
        return db.query(User).filter(User.id == id).first()

    @staticmethod
    async def authenticate(email: str, password: str, db: Session) -> Optional[User]:
        user = await UserService.get_user_by_email(email, db)
        if not user or not verify_password(password=password, hashed_pass=user.hashed_password):
            return None
        return user