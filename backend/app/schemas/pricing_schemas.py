from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class PlanOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    price_monthly: float
    price_yearly: Optional[float] = None
    is_active: bool = True
    
    # File upload limits
    file_limit: int
    file_size_limit_mb: int
    storage_limit_gb: float
    
    # Rules and features
    rules_limit: int
    custom_lists_limit: int
    
    # AI and synthetic data
    ai_prompts_per_month: int
    ai_tokens_per_month: int
    synthetic_rows_per_month: int
    
    # Additional features
    features: Optional[Dict[str, Any]] = {}
    is_addon: bool = False
    priority_processing: bool = False
    team_sharing: bool = False
    
    # Stripe subscription pricing
    stripe_price_id_monthly: Optional[str] = None
    stripe_price_id_yearly: Optional[str] = None
    
    class Config:
        from_attributes = True

class PlanWithUsageOut(PlanOut):
    current_usage: Optional[Dict[str, float]] = None
    usage_percentages: Optional[Dict[str, float]] = None

class CreatePlanIn(BaseModel):
    name: str = Field(..., description="Unique name for the plan")
    description: Optional[str] = Field(None, description="Plan description")
    price_monthly: float = Field(..., description="Monthly price in USD", ge=0)
    price_yearly: Optional[float] = Field(None, description="Yearly price in USD", ge=0)
    is_active: bool = Field(True, description="Whether the plan is active")
    
    # File upload limits
    file_limit: int = Field(1, description="Maximum number of files allowed")
    file_size_limit_mb: int = Field(5, description="Maximum file size in MB")
    storage_limit_gb: float = Field(0.005, description="Total storage limit in GB")
    
    # Rules and features
    rules_limit: int = Field(1, description="Number of active rules allowed")
    custom_lists_limit: int = Field(1, description="Number of custom lists allowed")
    
    # AI and synthetic data
    ai_prompts_per_month: int = Field(100, description="Monthly AI prompts limit")
    ai_tokens_per_month: int = Field(50000, description="Monthly token limit")
    synthetic_rows_per_month: int = Field(500, description="Monthly synthetic rows limit")
    
    # Additional features
    features: Optional[Dict[str, Any]] = Field({}, description="Additional features as JSON")
    is_addon: bool = Field(False, description="Whether this is an add-on plan")
    priority_processing: bool = Field(False, description="Priority processing feature")
    team_sharing: bool = Field(False, description="Team sharing feature")
    
    # Stripe subscription pricing
    stripe_price_id_monthly: Optional[str] = Field(None, description="Monthly Stripe price ID")
    stripe_price_id_yearly: Optional[str] = Field(None, description="Yearly Stripe price ID")

class PurchasePlanIn(BaseModel):
    plan_id: UUID
    duration_months: int = Field(1, description="Duration in months", ge=1, le=12)

class SubscriptionPurchaseIn(BaseModel):
    plan_id: UUID = Field(..., description="Plan ID to subscribe to")
    price_id: str = Field(..., description="Stripe price ID")
    interval: str = Field(..., description="Billing interval", pattern="^(month|year)$")

class UserPlanOut(BaseModel):
    id: UUID
    user_id: UUID
    plan_id: UUID
    start_date: datetime
    end_date: Optional[datetime]
    is_active: bool
    stripe_session_id: Optional[str] = None
    
    # Include plan details
    plan: Optional[PlanOut] = None
    
    class Config:
        from_attributes = True

class UsageOut(BaseModel):
    id: UUID
    user_id: UUID
    feature: str
    amount: float
    date: datetime
    timestamp: datetime
    description: Optional[str] = None
    
    class Config:
        from_attributes = True

class UsageSummaryOut(BaseModel):
    user_id: UUID
    current_month: Dict[str, float]  # feature -> amount
    limits: Dict[str, float]  # feature -> limit
    percentages: Dict[str, float]  # feature -> percentage used

class AddonPurchaseIn(BaseModel):
    addon_type: str = Field(..., description="Type of addon: storage, tokens, synthetic_data")
    quantity: int = Field(..., description="Quantity to purchase", gt=0)

class VerifyPaymentIn(BaseModel):
    session_id: str = Field(..., description="Stripe checkout session ID")

class UpdateSubscriptionIn(BaseModel):
    subscription_id: str = Field(..., description="Stripe subscription ID")
    new_price_id: str = Field(..., description="New Stripe price ID")
    proration_behavior: str = Field("create_prorations", description="Proration behavior")

class CancelSubscriptionIn(BaseModel):
    subscription_id: str = Field(..., description="Stripe subscription ID")
    cancel_at_period_end: bool = Field(True, description="Cancel at period end or immediately")

class StripePaymentOut(BaseModel):
    id: UUID
    user_id: UUID
    plan_id: UUID
    session_id: str
    subscription_id: Optional[str] = None
    amount_paid: float
    currency: str
    status: str
    is_addon: bool
    payment_metadata: Optional[Dict[str, Any]] = {}
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserSubscriptionOut(BaseModel):
    id: UUID
    user_id: UUID
    subscription_id: str
    plan_id: UUID
    status: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    canceled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Include plan details
    plan: Optional[PlanOut] = None
    
    class Config:
        from_attributes = True

class SubscriptionOut(BaseModel):
    id: str
    status: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    canceled_at: Optional[datetime] = None