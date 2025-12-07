from pydantic import BaseModel, Field
from typing import Dict, Any
import uuid

class PromptInput(BaseModel):
    prompt: str = Field(..., description="The prompt to send to the LLM")

class AskFileRequest(BaseModel):
    file_id: uuid.UUID
    question: str
    model: str = "gpt-3.5-turbo"