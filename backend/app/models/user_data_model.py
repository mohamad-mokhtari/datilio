import uuid
import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Enum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.db_setup import Base
from .mixins import Timestamp
from .user_model import User
from .file_rules_model import Rule  # Ensure this import is correct

class FileType(str, enum.Enum):
    CSV = "csv"
    JSON = "json"
    EXCEL = "excel"

class DataSource(str, enum.Enum):
    UPLOADED = "uploaded"
    SYNTHETIC = "synthetic"
    # Note: Preprocessed data has its own table (preprocessed_data)

class UserData(Timestamp, Base):
    __tablename__ = "user_data"
    __table_args__ = (
        UniqueConstraint('user_id', 'file_name', name='uq_user_file_name'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete="CASCADE"), nullable=False)
    file_name = Column(String, nullable=False)
    file_type = Column(Enum(FileType), nullable=False)
    file_path = Column(String, nullable=False)
    file_path_exists = Column(Boolean, default=True, nullable=True)
    file_size = Column(Integer, nullable=True)  # File size in bytes
    source = Column(Enum(DataSource), nullable=False, default=DataSource.UPLOADED)  # Data source: uploaded or synthetic

    # Relationships
    user = relationship("User", back_populates="data_files")
    qa_interactions = relationship("FileQA", back_populates="file", cascade="all, delete-orphan") 
    rules = relationship("Rule", back_populates="user_data", cascade="all, delete-orphan")
    preprocessed_versions = relationship("PreprocessedData", back_populates="original_file", cascade="all, delete-orphan")