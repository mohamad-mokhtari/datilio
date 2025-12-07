"""
Preprocessing Schemas
=====================

Pydantic schemas for data preprocessing requests and responses.
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List


class PreprocessingRequest(BaseModel):
    """Schema for preprocessing request from frontend"""
    
    mode: str = Field(
        "simple",
        description="Preprocessing mode: 'simple' (global settings) or 'advanced' (per-column settings)"
    )
    
    preprocessing: Dict[str, Any] = Field(
        ...,
        description="Preprocessing configuration for each data type"
    )
    
    output_filename: Optional[str] = Field(
        None,
        description="Name for the processed file (will append .csv if not present)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "mode": "advanced",
                "preprocessing": {
                    "numeric": {
                        "global": None,
                        "per_column": {
                            "age": {
                                "missing": "fill_mean",
                                "scaling": "min_max",
                                "remove_outliers": True
                            },
                            "salary": {
                                "missing": "fill_median",
                                "scaling": "standardize",
                                "log_transform": True
                            }
                        }
                    },
                    "categorical": {
                        "global": None,
                        "per_column": {
                            "gender": {
                                "missing": "fill_unknown",
                                "encoding": "one_hot"
                            },
                            "country": {
                                "missing": "fill_unknown",
                                "encoding": "label_encode",
                                "merge_rare": {"threshold": 0.05}
                            }
                        }
                    },
                    "text": {
                        "global": None,
                        "per_column": {
                            "description": {
                                "lowercase": True,
                                "remove_stopwords": True,
                                "stem_or_lemma": "stem"
                            }
                        }
                    },
                    "datetime": {
                        "global": None,
                        "per_column": {
                            "created_at": {
                                "missing": "drop",
                                "extract": ["year", "month", "weekday"],
                                "drop_original": True
                            }
                        }
                    },
                    "boolean": {
                        "global": None,
                        "per_column": {
                            "is_active": {
                                "missing": "fill_false",
                                "encode": "0_1"
                            }
                        }
                    },
                    "identifier": {
                        "global": None,
                        "per_column": {
                            "user_id": {
                                "drop": True
                            }
                        }
                    },
                    "mixed": {
                        "global": None,
                        "per_column": {
                            "messy_column": {
                                "convert_to": "numeric",
                                "fill_missing": "drop"
                            }
                        }
                    }
                },
                "output_filename": "processed_data.csv"
            }
        }


class PreprocessingResponse(BaseModel):
    """Schema for preprocessing response"""
    
    status: str = Field(..., description="Success or failure status")
    file_id: str = Field(..., description="UUID of the new processed file")
    filename: str = Field(..., description="Name of the processed file")
    file_size_mb: float = Field(..., description="File size in MB")
    rows_before: int = Field(..., description="Number of rows before preprocessing")
    rows_after: int = Field(..., description="Number of rows after preprocessing")
    columns_before: int = Field(..., description="Number of columns before preprocessing")
    columns_after: int = Field(..., description="Number of columns after preprocessing")
    transformations_applied: Dict[str, List[str]] = Field(
        ...,
        description="Dictionary mapping column names to list of transformations applied"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="List of warnings encountered during preprocessing"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "file_id": "abc-123-def-456",
                "filename": "processed_data.csv",
                "file_size_mb": 2.5,
                "rows_before": 1000,
                "rows_after": 950,
                "columns_before": 10,
                "columns_after": 18,
                "transformations_applied": {
                    "age": ["filled_missing_with_mean_34.50", "min_max_scaling"],
                    "gender": ["filled_missing_with_unknown", "one_hot_encoding_3_columns"],
                    "description": ["lowercase", "remove_stopwords", "stemming"]
                },
                "warnings": [
                    "Column 'unknown_col' not found in dataset"
                ]
            }
        }

