from sqlalchemy import Column, Integer, String, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.db_setup import Base
from .user_model import User

import uuid


class UserList(Base):
    __tablename__ = 'user_lists'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete="CASCADE"), nullable=False)
    name = Column(String, index=True, unique=True)
    items = relationship("ListItem", back_populates="list", cascade="all, delete-orphan")

    # Relationship to User
    user = relationship("User", back_populates="lists")

class ListItem(Base):
    __tablename__ = 'list_items'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    list_id = Column(UUID(as_uuid=True), ForeignKey('user_lists.id', ondelete="CASCADE"), nullable=False)
    value = Column(String)
    list = relationship("UserList", back_populates="items") 

User.lists = relationship("UserList", back_populates="user", cascade="all, delete-orphan")
