from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Dict, Any

class RuleBase(BaseModel):
    rule_name: str
    rule_definition: Optional[str] = None
    query: Dict[str, Any]

class RuleCreate(RuleBase):
    pass

class RuleUpdate(RuleBase):
    pass

class Rule(RuleBase):
    id: UUID
    user_data_id: UUID

    class Config:
        from_attributes = True
