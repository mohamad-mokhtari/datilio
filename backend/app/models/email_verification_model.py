import uuid
import json
import hmac
import hashlib
import base64
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta

from app.core.db_setup import Base
from app.core.config import settings
from .mixins import Timestamp
from .user_model import User


class EmailVerificationToken(Base, Timestamp):
    """Email verification token model"""
    __tablename__ = "email_verification_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete="CASCADE"), nullable=False)
    token = Column(String(1000), nullable=False, unique=True, index=True)
    is_used = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="email_verification_tokens")
    
    @classmethod
    def create_token(cls, user_id: uuid.UUID, user_email: str) -> 'EmailVerificationToken':
        """Create a new verification token with email and signature"""
        # Create token data
        token_data = {
            "user_id": str(user_id),
            "email": user_email,
            "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
            "nonce": str(uuid.uuid4())
        }
        
        # Create signature
        token_string = json.dumps(token_data, sort_keys=True)
        signature = cls._create_signature(token_string)
        
        # Combine token and signature
        full_token = f"{base64.b64encode(token_string.encode()).decode()}.{signature}"
        
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        return cls(
            user_id=user_id,
            token=full_token,
            expires_at=expires_at
        )
    
    @classmethod
    def _create_signature(cls, token_string: str) -> str:
        """Create HMAC signature for token"""
        secret_key = getattr(settings, 'JWT_SECRET_KEY', 'default-secret-key')
        signature = hmac.new(
            secret_key.encode(),
            token_string.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    @classmethod
    def verify_and_extract_token(cls, token: str) -> dict:
        """Verify token signature and extract data"""
        try:
            # Split token and signature
            if '.' not in token:
                raise ValueError("Invalid token format")
            
            token_part, signature = token.split('.', 1)
            
            # Decode token
            token_string = base64.b64decode(token_part.encode()).decode()
            
            # Verify signature
            expected_signature = cls._create_signature(token_string)
            if not hmac.compare_digest(signature, expected_signature):
                raise ValueError("Invalid token signature")
            
            # Parse token data
            token_data = json.loads(token_string)
            
            # Check expiration
            expires_at = datetime.fromisoformat(token_data['expires_at'])
            if datetime.utcnow() > expires_at:
                raise ValueError("Token has expired")
            
            return token_data
            
        except Exception as e:
            raise ValueError(f"Invalid token: {str(e)}")
    
    @classmethod
    def get_email_from_token(cls, token: str) -> str:
        """Extract email from token without database lookup"""
        try:
            token_data = cls.verify_and_extract_token(token)
            return token_data['email']
        except Exception as e:
            print(f"Error getting email from token: {str(e)}")
            return None
    
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if token is valid (not used and not expired)"""
        return not self.is_used and not self.is_expired()
