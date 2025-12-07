from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, UUID4


class FilterIn(BaseModel):
    pseudo_query: Dict[str, Any] = Field(..., description="A dictionary representing a pseudo SQL query")
    file_id: UUID4 = Field(..., description="The ID of the CSV file to filter")
    offset: Optional[int] = Field(default=0, ge=0, description="Number of records to skip for pagination")
    limit: Optional[int] = Field(default=100, ge=1, le=1000, description="Maximum number of records to return (1-1000)")

class FilterOut(BaseModel):
    result: List[Dict[str, Any]] = Field(..., description="A dictionary containing result data.")
    total_count: int = Field(..., description="Total number of records matching the filter")
    has_more: bool = Field(..., description="Whether there are more records available")
    offset: int = Field(..., description="Current offset value")
    limit: int = Field(..., description="Current limit value")
    python_code_snippet: str = Field(..., description="The python code snippet used for filtering, can be reused for charting")
