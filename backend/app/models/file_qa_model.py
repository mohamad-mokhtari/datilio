import uuid
import enum
from sqlalchemy import Column, String, ForeignKey, Text, Enum, Integer, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.db_setup import Base
from .mixins import Timestamp
from .user_model import User
from .user_data_model import UserData

class GPTModelType(str, enum.Enum):
    """Enum for different GPT model types"""
    GPT_3_5_TURBO = "gpt-3.5-turbo"
    GPT_4 = "gpt-4"
    PHI_3 = "phi-3"
    CLAUDE_3 = "claude-3"
    # Add more models as needed

class FileQA(Timestamp, Base):
    """Model for storing file Q&A interactions with GPT"""
    __tablename__ = "file_qa"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete="CASCADE"), nullable=False)
    file_id = Column(UUID(as_uuid=True), ForeignKey('user_data.id', ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    gpt_model = Column(Enum(GPTModelType), nullable=False)
    prompt_tokens = Column(Integer, nullable=True)  # Number of tokens in the prompt
    completion_tokens = Column(Integer, nullable=True)  # Number of tokens in the completion
    tokens_used = Column(Integer, nullable=True)  # Total tokens used (prompt + completion)
    processing_time = Column(Float, nullable=True)  # Time taken to process in seconds
    error_message = Column(Text, nullable=True)  # Store any error messages
    context_used = Column(Text, nullable=True)  # Store the context used for the question
    confidence_score = Column(Float, nullable=True)  # GPT's confidence in the answer
    feedback_score = Column(Integer, nullable=True)  # User feedback on the answer (1-5)
    feedback_comment = Column(Text, nullable=True)  # User's feedback comment

    # Relationships
    user = relationship("User", back_populates="file_qa_interactions")
    file = relationship("UserData", back_populates="qa_interactions")

    def __repr__(self):
        return f"<FileQA(id={self.id}, user_id={self.user_id}, file_id={self.file_id})>" 