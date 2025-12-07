from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, UUID4


class StatAnlysisPerColIn(BaseModel):
    pseudo_query: Dict[str, Any] = Field(..., description="A dictionary representing a pseudo SQL query")
    column_name: str = Field(..., description="The column name.")

class NumericColumnStats(BaseModel):
    column: str
    mean: float = None
    median: float = None
    std_dev: float = None
    variance: float = None
    skewness: float = None
    kurtosis: float = None
    min: float = None
    max: float = None
    percentiles: dict = None

class StringColumnStats(BaseModel):
    column: str
    unique_values: int = None
    most_frequent: str = None
    frequency: dict = None

class ColumnStats(BaseModel):
    numeric_stats: NumericColumnStats = None
    string_stats: StringColumnStats = None

class StatAnlysisPerColOut(BaseModel):
    result: ColumnStats = Field(..., description="A dictionary containing result data.")