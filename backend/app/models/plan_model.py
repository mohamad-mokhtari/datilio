from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.db_setup import Base

class Plan(Base):
    __tablename__ = "plans"
    id = Column(UUID(as_uuid=True), primary_key=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    price_monthly = Column(Float, nullable=False, default=0.0)
    is_active = Column(Boolean, default=True)
    
    # File upload limits
    file_limit = Column(Integer, default=1)  # Number of files allowed
    file_size_limit_mb = Column(Integer, default=5)  # Max file size per upload
    storage_limit_gb = Column(Float, default=0.005)  # Total storage limit in GB
    
    # Rules and features
    rules_limit = Column(Integer, default=1)  # Number of active rules
    custom_lists_limit = Column(Integer, default=1)  # Number of custom lists
    
    # AI and synthetic data
    ai_prompts_per_month = Column(Integer, default=100)  # Monthly AI prompts
    ai_tokens_per_month = Column(Integer, default=50000)  # Monthly token limit
    synthetic_rows_per_month = Column(Integer, default=500)  # Monthly synthetic rows
    
    # Additional features
    features = Column(JSON, default={})  # Store extra features as JSON
    is_addon = Column(Boolean, default=False)  # Whether this is an add-on plan
    
    # Stripe subscription pricing
    stripe_price_id_monthly = Column(String, nullable=True)  # Monthly Stripe price ID
    stripe_price_id_yearly = Column(String, nullable=True)  # Yearly Stripe price ID
    price_yearly = Column(Float, nullable=True)  # Yearly price (for display)
    
    # Priority features
    priority_processing = Column(Boolean, default=False)
    team_sharing = Column(Boolean, default=False)
    
    # Relationships
    user_plans = relationship("UserPlan", back_populates="plan", cascade="all, delete-orphan")
    stripe_payments = relationship("StripePayment", back_populates="plan")
    user_subscriptions = relationship("UserSubscription", back_populates="plan", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Plan(id={self.id}, name={self.name}, price=${self.price_monthly})>" 