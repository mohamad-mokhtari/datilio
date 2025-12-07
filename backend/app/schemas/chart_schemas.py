from typing import Dict, Any, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


# Sampling metadata model
class SamplingMetadata(BaseModel):
    is_sampled: bool = Field(..., description="Whether the data was sampled")
    total_rows: int = Field(..., description="Total rows in the original dataset")
    returned_rows: int = Field(..., description="Number of rows returned after sampling")
    sampling_method: Optional[str] = Field(None, description="Method used for sampling (e.g., 'systematic', 'random')")
    sampling_interval: Optional[float] = Field(None, description="Sampling interval used (only for systematic sampling)")
    sampling_ratio: float = Field(..., description="Ratio of returned rows to total rows (0.0 to 1.0)")


# Unified Data Endpoint
class UnifiedDataIn(BaseModel):
    file_id: UUID
    columns: List[str]  # Required - user must specify columns
    max_points: Optional[int] = Field(10000, description="Maximum number of data points to return (default: 10000)")
    sampling_method: Optional[str] = Field("systematic", description="Sampling method: 'systematic' or 'random' (default: 'systematic')")
    drop_empty_rows: Optional[bool] = Field(True, description="Whether to drop fully empty rows before sampling (default: True)")

class UnifiedDataOut(BaseModel):
    data: List[Dict[str, Any]] = Field(..., description="The actual data")
    columns: List[str] = Field(..., description="Column names that were requested")
    size_kb: float = Field(..., description="Estimated compressed size in KB")
    sampling: SamplingMetadata = Field(..., description="Information about data sampling")


# Filtered Data Endpoint for Charts
class FilteredDataIn(BaseModel):
    file_id: UUID
    python_code_snippet: str  # The python code snippet from filter_worker.execute_query()
    columns: List[str]  # Required - user must specify which columns to return
    max_points: Optional[int] = Field(10000, description="Maximum number of data points to return (default: 10000)")
    sampling_method: Optional[str] = Field("systematic", description="Sampling method: 'systematic' or 'random' (default: 'systematic')")
    drop_empty_rows: Optional[bool] = Field(True, description="Whether to drop fully empty rows before sampling (default: True)")

class FilteredDataOut(BaseModel):
    data: List[Dict[str, Any]] = Field(..., description="The filtered data")
    columns: List[str] = Field(..., description="Column names that were requested")
    size_kb: float = Field(..., description="Estimated compressed size in KB")
    total_filtered_records: int = Field(..., description="Total number of records after filtering")
    sampling: SamplingMetadata = Field(..., description="Information about data sampling")
