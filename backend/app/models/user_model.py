import enum
import uuid

from sqlalchemy import Boolean, Column, String, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.db_setup import Base
from .mixins import Timestamp


class Role(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"


class User(Timestamp, Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    first_name = Column(String, default=None)
    last_name = Column(String, default=None)
    disabled = Column(Boolean, default=False)
    role = Column(Enum(Role), default=Role.USER, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)

    plans = relationship("UserPlan", back_populates="user", cascade="all, delete-orphan")
    data_files = relationship("UserData", back_populates="user", cascade="all, delete-orphan")
    file_qa_interactions = relationship("FileQA", back_populates="user", cascade="all, delete-orphan")
    usage_tracking = relationship("UsageTracking", back_populates="user", cascade="all, delete-orphan")
    stripe_payments = relationship("StripePayment", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("UserSubscription", back_populates="user", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="user", foreign_keys="Feedback.user_id", cascade="all, delete-orphan")
    email_verification_tokens = relationship("EmailVerificationToken", back_populates="user", cascade="all, delete-orphan")
    preprocessed_files = relationship("PreprocessedData", back_populates="user", cascade="all, delete-orphan")
    ml_models = relationship("MLModel", back_populates="user", cascade="all, delete-orphan")

    @property
    def is_admin(self) -> bool:
        return self.role == Role.ADMIN

    