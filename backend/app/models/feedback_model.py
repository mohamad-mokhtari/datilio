import uuid
import enum
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.db_setup import Base
from .mixins import Timestamp
from .user_model import User


class FeedbackType(str, enum.Enum):
    """Simple feedback types"""
    BUG = "bug"
    FEATURE = "feature"
    GENERAL = "general"
    UI = "ui"
    PERFORMANCE = "performance"
    OTHER = "other"
    

class FeedbackStatus(str, enum.Enum):
    """Feedback conversation status"""
    OPEN = "open"  # Conversation is active
    CLOSED = "closed"  # Conversation is closed, no more messages allowed


class Feedback(Base, Timestamp):
    """Feedback model with conversation support"""
    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete="CASCADE"), nullable=False)
    
    # Feedback content
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    feedback_type = Column(String(20), nullable=False, default="general")
    
    # Conversation status - using simple string instead of enum
    status = Column(String(20), nullable=False, default="open")
    closed_at = Column(DateTime, nullable=True)
    closed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)  # Who closed it
    
    # Optional image
    image_path = Column(String(500), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="feedback", foreign_keys=[user_id])
    closed_by_user = relationship("User", foreign_keys=[closed_by])
    messages = relationship("FeedbackMessage", back_populates="feedback", cascade="all, delete-orphan", order_by="FeedbackMessage.created_at")


class FeedbackMessage(Base, Timestamp):
    """Messages in feedback conversation"""
    __tablename__ = "feedback_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    feedback_id = Column(UUID(as_uuid=True), ForeignKey('feedback.id', ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete="CASCADE"), nullable=False)
    
    # Message content
    message = Column(Text, nullable=False)
    is_admin_message = Column(Boolean, default=False, nullable=False)  # True if sent by admin
    
    # Optional image for the message
    image_path = Column(String(500), nullable=True)
    
    # Relationships
    feedback = relationship("Feedback", back_populates="messages")
    user = relationship("User")
