from pydantic import BaseModel, Field
from typing import Dict, Any


class SyntheticDataRequest(BaseModel):
    csv_file_name: str = Field(..., description="Desired CSV file name")
    num_rows: int = Field(3, description="Number of rows to generate")
    columns_info: Dict[str, Any] = Field(..., description="Columns configuration for synthetic data") 

class SimilarColumnsRequest(BaseModel):
    collection_name: str = Field(..., description="Name of the Qdrant collection to search in")
    llm_model_name: str = Field("all-MiniLM-L6-v2", description="Sentence transformer model to use for encoding")
    top_k: int = Field(10, description="Number of similar columns to return")