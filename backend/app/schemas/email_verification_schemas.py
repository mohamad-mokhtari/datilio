from pydantic import BaseModel, Field
from typing import Optional


class EmailVerificationRequest(BaseModel):
    """Schema for email verification request"""
    token: str = Field(..., description="Verification token from email")


class EmailVerificationResponse(BaseModel):
    """Schema for email verification response"""
    success: bool = Field(..., description="Whether verification was successful")
    message: str = Field(..., description="Response message")


class ResendVerificationResponse(BaseModel):
    """Schema for resend verification response"""
    success: bool = Field(..., description="Whether email was sent successfully")
    message: str = Field(..., description="Response message")


class EmailVerificationStatus(BaseModel):
    """Schema for email verification status"""
    email_verified: bool = Field(..., description="Whether user's email is verified")
    message: Optional[str] = Field(None, description="Additional message")
