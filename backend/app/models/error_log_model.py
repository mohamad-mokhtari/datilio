import uuid
import enum
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.db_setup import Base
from .mixins import Timestamp


class ErrorSeverity(str, enum.Enum):
    """Error severity levels"""
    LOW = "low"           # 4xx client errors, validation errors
    MEDIUM = "medium"     # Business logic failures, data integrity issues
    HIGH = "high"         # 5xx server errors, security events
    CRITICAL = "critical" # Payment failures, system crashes


class ErrorCategory(str, enum.Enum):
    """Error categories for better organization"""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    DATABASE = "database"
    EXTERNAL_API = "external_api"
    PAYMENT = "payment"
    SECURITY = "security"
    SYSTEM = "system"
    BUSINESS_LOGIC = "business_logic"
    FILE_UPLOAD = "file_upload"
    EMAIL = "email"
    OTHER = "other"


class ErrorLog(Base, Timestamp):
    """Model for storing important errors in database"""
    __tablename__ = "error_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    
    # Error details
    error_code = Column(String(50), nullable=False, index=True)  # Custom error code
    error_message = Column(Text, nullable=False)  # User-friendly message
    technical_message = Column(Text, nullable=True)  # Technical details for debugging
    stack_trace = Column(Text, nullable=True)  # Full stack trace for debugging
    
    # Classification
    severity = Column(String(20), nullable=False, default=ErrorSeverity.MEDIUM)
    category = Column(String(30), nullable=False, default=ErrorCategory.OTHER)
    
    # Request context
    endpoint = Column(String(255), nullable=True)  # API endpoint that failed
    method = Column(String(10), nullable=True)  # HTTP method
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)  # User who triggered error
    ip_address = Column(String(45), nullable=True)  # Client IP address
    user_agent = Column(String(500), nullable=True)  # User agent string
    
    # Additional context
    request_data = Column(JSON, nullable=True)  # Request payload (sanitized)
    response_status = Column(Integer, nullable=True)  # HTTP status code
    
    # Resolution tracking
    is_resolved = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    resolver = relationship("User", foreign_keys=[resolved_by])
    
    def __repr__(self):
        return f"<ErrorLog(id={self.id}, code={self.error_code}, severity={self.severity})>"


class ErrorCounter(Base):
    """Model for tracking error counts (for non-critical errors)"""
    __tablename__ = "error_counters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    
    # Error identification
    error_code = Column(String(50), nullable=False, index=True)
    endpoint = Column(String(255), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Count tracking
    count = Column(Integer, default=1, nullable=False)
    first_occurrence = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_occurrence = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Date tracking for daily aggregation
    date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<ErrorCounter(code={self.error_code}, count={self.count})>"
