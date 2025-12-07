from datetime import datetime

from sqlalchemy import Column, DateTime, func
from sqlalchemy.orm import declarative_mixin

@declarative_mixin
class Timestamp:
    created_at = Column(DateTime, default=func.now(), nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=True)
