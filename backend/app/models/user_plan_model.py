from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean, String, Float
from sqlalchemy.orm import relationship
from app.core.db_setup import Base
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
import uuid

class UserPlan(Base):
    __tablename__ = "user_plans"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime)
    is_active = Column(Boolean, default=True)
    stripe_session_id = Column(String, nullable=True)
    
    # Custom limit overrides (nullable - only set when admin manually overrides)
    # These override the plan's default limits when set
    custom_file_limit = Column(Integer, nullable=True)
    custom_file_size_limit_mb = Column(Integer, nullable=True)
    custom_storage_limit_gb = Column(Float, nullable=True)
    custom_rules_limit = Column(Integer, nullable=True)
    custom_lists_limit = Column(Integer, nullable=True)
    custom_ai_prompts_per_month = Column(Integer, nullable=True)
    custom_ai_tokens_per_month = Column(Integer, nullable=True)
    custom_synthetic_rows_per_month = Column(Integer, nullable=True)

    user = relationship("User", back_populates="plans")
    plan = relationship("Plan", back_populates="user_plans")
    
    def get_effective_limits(self):
        """
        Get effective limits, using custom overrides if set, otherwise plan defaults.
        This is the key method that makes custom limits work!
        """
        return {
            'file_limit': self.custom_file_limit if self.custom_file_limit is not None else self.plan.file_limit,
            'file_size_limit_mb': self.custom_file_size_limit_mb if self.custom_file_size_limit_mb is not None else self.plan.file_size_limit_mb,
            'storage_limit_gb': self.custom_storage_limit_gb if self.custom_storage_limit_gb is not None else self.plan.storage_limit_gb,
            'rules_limit': self.custom_rules_limit if self.custom_rules_limit is not None else self.plan.rules_limit,
            'custom_lists_limit': self.custom_lists_limit if self.custom_lists_limit is not None else self.plan.custom_lists_limit,
            'ai_prompts_per_month': self.custom_ai_prompts_per_month if self.custom_ai_prompts_per_month is not None else self.plan.ai_prompts_per_month,
            'ai_tokens_per_month': self.custom_ai_tokens_per_month if self.custom_ai_tokens_per_month is not None else self.plan.ai_tokens_per_month,
            'synthetic_rows_per_month': self.custom_synthetic_rows_per_month if self.custom_synthetic_rows_per_month is not None else self.plan.synthetic_rows_per_month,
        }

    def __repr__(self):
        return f"<UserPlan(id={self.id}, user_id={self.user_id}, plan_id={self.plan_id})>" 