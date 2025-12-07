from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
from app.models.user_model import Role

class UserAuth(BaseModel):
    email: EmailStr = Field(..., description='email of user')
    username:str = Field(..., min_length=5, max_length=50, description='username of user')
    password: str = Field(... ,min_length=5, max_length=24, description='password of user')

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    disabled: Optional[bool] = None

class UserOut(UserBase):
    id: UUID
    disabled: bool
    email_verified: bool
    role: Role

    class Config:
        from_attributes = True
