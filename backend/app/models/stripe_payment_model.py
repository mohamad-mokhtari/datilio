from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.db_setup import Base
from datetime import datetime
import uuid

class StripePayment(Base):
    __tablename__ = "stripe_payments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id"), nullable=False)
    
    # Stripe details
    session_id = Column(String, unique=True, nullable=False)
    subscription_id = Column(String, nullable=True)  # For recurring subscriptions
    customer_id = Column(String, nullable=True)  # Stripe customer ID
    
    # Payment details
    amount_paid = Column(Float, nullable=False)
    currency = Column(String, default="usd")
    status = Column(String, default="pending")  # pending, completed, failed, cancelled
    
    # Metadata (renamed to avoid SQLAlchemy conflict)
    payment_metadata = Column(JSON, default={})  # Store additional payment metadata
    is_addon = Column(Boolean, default=False)  # Whether this is an add-on purchase
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="stripe_payments")
    plan = relationship("Plan", back_populates="stripe_payments")
    
    def __repr__(self):
        return f"<StripePayment(id={self.id}, user_id={self.user_id}, amount=${self.amount_paid}, status={self.status})>" 