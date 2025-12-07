from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

class UserLimitsUpdate(BaseModel):
    """Schema for updating user's custom limits (admin only)"""
    custom_file_limit: Optional[int] = Field(
        None, 
        ge=0, 
        description="Override file upload limit. Example: 20 (instead of MVP's 5). Omit to keep plan default."
    )
    custom_file_size_limit_mb: Optional[int] = Field(
        None, 
        ge=0, 
        description="Override max file size in MB. Example: 100 (instead of MVP's 10). Omit to keep plan default."
    )
    custom_storage_limit_gb: Optional[float] = Field(
        None, 
        ge=0, 
        description="Override total storage in GB. Example: 10.0 (instead of MVP's 1.0). Omit to keep plan default."
    )
    custom_rules_limit: Optional[int] = Field(
        None, 
        ge=0, 
        description="Override rules limit. Example: 50 (instead of MVP's 10). Omit to keep plan default."
    )
    custom_lists_limit: Optional[int] = Field(
        None, 
        ge=-1, 
        description="Override custom lists limit. Use -1 for unlimited. Example: -1 (instead of MVP's 5). Omit to keep plan default."
    )
    custom_ai_prompts_per_month: Optional[int] = Field(
        None, 
        ge=0, 
        description="Override monthly AI prompts. Example: 1000 (instead of MVP's 200). Omit to keep plan default."
    )
    custom_ai_tokens_per_month: Optional[int] = Field(
        None, 
        ge=0, 
        description="Override monthly AI tokens. Example: 500000 (instead of MVP's 100000). Omit to keep plan default."
    )
    custom_synthetic_rows_per_month: Optional[int] = Field(
        None, 
        ge=0, 
        description="Override monthly synthetic rows. Example: 50000 (instead of MVP's 5000). Omit to keep plan default."
    )

    class Config:
        json_schema_extra = {
            "example": {
                "custom_file_limit": 20,
                "custom_storage_limit_gb": 10.0,
                "custom_ai_tokens_per_month": 500000
            }
        }

class UserLimitsResponse(BaseModel):
    """Response schema for user limits"""
    user_id: UUID
    plan_id: UUID
    plan_name: str
    
    # Plan default limits
    plan_file_limit: int
    plan_file_size_limit_mb: int
    plan_storage_limit_gb: float
    plan_rules_limit: int
    plan_lists_limit: int
    plan_ai_prompts_per_month: int
    plan_ai_tokens_per_month: int
    plan_synthetic_rows_per_month: int
    
    # Custom overrides (if set)
    custom_file_limit: Optional[int] = None
    custom_file_size_limit_mb: Optional[int] = None
    custom_storage_limit_gb: Optional[float] = None
    custom_rules_limit: Optional[int] = None
    custom_lists_limit: Optional[int] = None
    custom_ai_prompts_per_month: Optional[int] = None
    custom_ai_tokens_per_month: Optional[int] = None
    custom_synthetic_rows_per_month: Optional[int] = None
    
    # Effective limits (custom if set, otherwise plan default)
    effective_file_limit: int
    effective_file_size_limit_mb: int
    effective_storage_limit_gb: float
    effective_rules_limit: int
    effective_lists_limit: int
    effective_ai_prompts_per_month: int
    effective_ai_tokens_per_month: int
    effective_synthetic_rows_per_month: int
    
    class Config:
        from_attributes = True
