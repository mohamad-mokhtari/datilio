from sqlalchemy import Column, String, Text, JSON, TIMESTAMP, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.core.db_setup import Base
from .mixins import Timestamp

class Rule(Timestamp, Base):
    __tablename__ = 'rules'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    user_data_id = Column(UUID(as_uuid=True), ForeignKey('user_data.id', ondelete='CASCADE'), nullable=False)
    rule_name = Column(String(255), nullable=False)
    rule_definition = Column(Text, nullable=True)
    query = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationship to UserData
    user_data = relationship("UserData", back_populates="rules")