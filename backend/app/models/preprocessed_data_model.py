"""
Preprocessed Data Model
=======================

Stores metadata about preprocessed data files and their relationship to original files.
"""

import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, JSON, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.db_setup import Base
from .mixins import Timestamp


class PreprocessedData(Timestamp, Base):
    """
    Preprocessed data files with relationship to original UserData file.
    
    Each preprocessed file tracks:
    - Which original file it came from
    - What preprocessing was applied
    - Metadata about transformations
    """
    __tablename__ = "preprocessed_data"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    
    # Relationship to original file
    original_file_id = Column(
        UUID(as_uuid=True),
        ForeignKey('user_data.id', ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Relationship to user (for quick queries)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Processed file information
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)  # File size in bytes
    
    # Preprocessing metadata
    preprocessing_config = Column(JSON, nullable=False)  # Full config sent by frontend
    mode = Column(String, nullable=False)  # "simple" or "advanced"
    transformations_applied = Column(JSON, nullable=True)  # What was actually applied
    warnings = Column(JSON, nullable=True)  # Any warnings during processing
    
    # Statistics
    rows_before = Column(Integer, nullable=True)
    rows_after = Column(Integer, nullable=True)
    columns_before = Column(Integer, nullable=True)
    columns_after = Column(Integer, nullable=True)
    
    # ML Readiness Flag
    is_ml_ready = Column(Boolean, nullable=False, default=False, index=True)
    # True if ALL columns are numeric (ready for ML training without further processing)
    
    # Relationships
    user = relationship("User", back_populates="preprocessed_files")
    original_file = relationship("UserData", back_populates="preprocessed_versions")
    ml_models = relationship("MLModel", back_populates="preprocessed_file", cascade="all, delete-orphan")
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": str(self.id),
            "original_file_id": str(self.original_file_id),
            "user_id": str(self.user_id),
            "file_name": self.file_name,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "file_size_mb": round(self.file_size / (1024 * 1024), 2) if self.file_size else 0,
            "preprocessing_config": self.preprocessing_config,
            "mode": self.mode,
            "transformations_applied": self.transformations_applied,
            "warnings": self.warnings,
            "rows_before": self.rows_before,
            "rows_after": self.rows_after,
            "columns_before": self.columns_before,
            "columns_after": self.columns_after,
            "is_ml_ready": self.is_ml_ready,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

