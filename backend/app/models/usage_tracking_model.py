from sqlalchemy import Column, Integer, ForeignKey, Date, String, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.db_setup import Base
from datetime import datetime
import uuid

class UsageTracking(Base):
    __tablename__ = "usage_tracking"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=datetime.utcnow().date)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Feature tracking
    feature = Column(String, nullable=False)  # e.g., "file_storage_mb", "rules_used", "openai_tokens", "synthetic_rows", "custom_lists"
    amount = Column(Float, default=0.0)  # Changed to Float for more precise tracking
    
    # Additional context
    description = Column(String, nullable=True)  # Optional description of the usage
    
    # Relationships
    user = relationship("User", back_populates="usage_tracking")
    
    def __repr__(self):
        return f"<UsageTracking(user_id={self.user_id}, feature={self.feature}, amount={self.amount}, date={self.date})>" 