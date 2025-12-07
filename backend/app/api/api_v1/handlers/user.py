from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.schemas.user_schemas import UserAuth, UserOut, UserCreate, UserUpdate
from app.services.user_services import UserService
from app.models.user_model import User, Role
from app.api.deps.user_deps import get_current_user
from app.core.db_setup import get_db
from app.core.security import get_password as get_password_hash


router = APIRouter()

# -------------------
# Regular User Endpoints
# -------------------

@router.post("/create", summary="Create new user", response_model=UserOut)
async def create_user(data: UserAuth, db: Session = Depends(get_db)):
    """Create a new regular user."""
    try:
        return await UserService.create_user(user=data, db=db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/me", summary="Get details of currently logged in user", response_model=UserOut)
async def get_current_user_details(current_user: User = Depends(get_current_user)):
    """Get details of the currently logged in user."""
    return current_user


@router.put("/me", summary="Update current user details", response_model=UserOut)
async def update_current_user(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update details of the currently logged in user."""
    try:
        return await UserService.update_user(user_id=current_user.id, data=data, db=db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# -------------------
# Admin Management Endpoints
# -------------------

@router.post("/admin/create", response_model=UserOut)
async def create_admin_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new admin user.
    This endpoint should be protected and only accessible by super admins or during initial setup.
    """
    # Check if current user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create admin users"
        )
    
    # Check if user with email already exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if user with username already exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new admin user
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=Role.ADMIN
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@router.put("/admin/{user_id}", response_model=UserOut)
async def update_user_to_admin(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing user to admin role.
    This endpoint should be protected and only accessible by super admins.
    """
    # Check if current user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update user roles"
        )
    
    # Find the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update role to admin
    user.role = Role.ADMIN
    db.commit()
    db.refresh(user)
    
    return user


@router.get("/admin/list", response_model=List[UserOut])
async def list_admin_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all admin users.
    This endpoint should be protected and only accessible by admins.
    """
    # Check if current user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view admin users"
        )
    
    admin_users = db.query(User).filter(User.role == Role.ADMIN).all()
    return admin_users


@router.put("/admin/{user_id}/remove", response_model=UserOut)
async def remove_admin_role(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove admin role from a user.
    This endpoint should be protected and only accessible by super admins.
    """
    # Check if current user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update user roles"
        )
    
    # Find the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Don't allow removing admin role from self
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove admin role from yourself"
        )
    
    # Update role to regular user
    user.role = Role.USER
    db.commit()
    db.refresh(user)
    
    return user
