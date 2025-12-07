from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class AssignPlanRequest(BaseModel):
    """Schema for admin to assign a plan to a user"""
    plan_id: UUID = Field(
        ..., 
        description="UUID of the plan to assign (get from GET /admin/plans). Example: 'b8c9d0e1-f2a3-4567-8901-234567890abc' for MVP plan"
    )
    duration_months: Optional[int] = Field(
        None, 
        description="How long user gets this plan: null/omit = UNLIMITED (forever), 12 = 1 year, 3 = 3 months. Use null for free plans and VIPs.",
        ge=1, 
        le=120
    )
    deactivate_existing: bool = Field(
        True, 
        description="What to do with current plans: true = REPLACE (deactivate old plans, most common), false = ADD (keep existing plans active, use for add-ons)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "plan_id": "b8c9d0e1-f2a3-4567-8901-234567890abc",
                "duration_months": None,
                "deactivate_existing": True
            }
        }

class AssignPlanResponse(BaseModel):
    """Response after assigning a plan"""
    success: bool
    message: str
    user_plan_id: UUID
    user_id: UUID
    plan_id: UUID
    plan_name: str
    start_date: datetime
    end_date: Optional[datetime]
    is_active: bool
    
    class Config:
        from_attributes = True

class PlanListItem(BaseModel):
    """Simplified plan info for dropdowns/lists"""
    id: UUID
    name: str
    description: Optional[str]
    price_monthly: float
    price_yearly: Optional[float]
    is_active: bool
    is_addon: bool
    
    # Key limits for display
    file_limit: int
    storage_limit_gb: float
    ai_tokens_per_month: int
    synthetic_rows_per_month: int
    
    class Config:
        from_attributes = True

