"""
ML Model Schemas
================

Pydantic schemas for ML model training, prediction, and management.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from uuid import UUID
from datetime import datetime


# =====================================================
# TARGET ANALYSIS
# =====================================================

class TargetAnalysisRequest(BaseModel):
    """Request to analyze a target column"""
    target_column: Optional[str] = Field(None, description="Target column name (None for unsupervised)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "target_column": "price"
            }
        }


class TargetAnalysisResponse(BaseModel):
    """Response from target analysis"""
    preprocessed_file_id: UUID
    target_column: Optional[str]
    problem_type: str = Field(..., description="regression, binary_classification, multiclass_classification, or clustering")
    num_unique_classes: Optional[int] = None
    class_distribution: Optional[Dict[str, int]] = None
    target_dtype: Optional[str] = None
    is_numeric: bool
    suggested_models: List[str] = Field(..., description="List of recommended algorithms")
    feature_columns: List[str] = Field(..., description="Available feature columns")
    total_rows: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "preprocessed_file_id": "abc-123",
                "target_column": "price",
                "problem_type": "regression",
                "num_unique_classes": None,
                "class_distribution": None,
                "target_dtype": "float64",
                "is_numeric": True,
                "suggested_models": ["random_forest", "xgboost", "linear_regression"],
                "feature_columns": ["age", "salary", "city_encoded"],
                "total_rows": 1000
            }
        }


# =====================================================
# MODEL TRAINING
# =====================================================

class ModelTrainingRequest(BaseModel):
    """Request to train a new ML model"""
    model_name: str = Field(..., min_length=1, max_length=200, description="User-defined model name")
    algorithm: str = Field(..., description="Algorithm to use (e.g., 'random_forest', 'logistic_regression')")
    target_column: Optional[str] = Field(None, description="Target column (None for unsupervised)")
    feature_columns: Optional[List[str]] = Field(None, description="Feature columns (None = use all except target)")
    train_size: float = Field(0.8, ge=0.1, le=0.9, description="Training set size (0.1-0.9)")
    random_state: Optional[int] = Field(42, description="Random seed for reproducibility")
    hyperparameters: Optional[Dict[str, Any]] = Field(None, description="Algorithm-specific hyperparameters")
    description: Optional[str] = Field(None, description="Model description")
    
    @validator('train_size')
    def validate_train_size(cls, v):
        if not (0.1 <= v <= 0.9):
            raise ValueError("train_size must be between 0.1 and 0.9")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "model_name": "House Price Predictor v1",
                "algorithm": "random_forest",
                "target_column": "price",
                "feature_columns": None,
                "train_size": 0.8,
                "random_state": 42,
                "hyperparameters": {
                    "n_estimators": 100,
                    "max_depth": 10
                },
                "description": "Random Forest model for predicting house prices"
            }
        }


class ModelTrainingResponse(BaseModel):
    """Response after training a model"""
    status: str
    model_id: UUID
    model_name: str
    model_type: str
    algorithm: str
    training_rows: int
    test_rows: int
    performance_metrics: Dict[str, float]
    training_duration_seconds: float
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "model_id": "model-123",
                "model_name": "House Price Predictor v1",
                "model_type": "regression",
                "algorithm": "random_forest",
                "training_rows": 800,
                "test_rows": 200,
                "performance_metrics": {
                    "r2_score": 0.85,
                    "mse": 1250.45,
                    "mae": 28.32
                },
                "training_duration_seconds": 5.23,
                "message": "Model trained successfully"
            }
        }


# =====================================================
# MODEL LISTING & DETAILS
# =====================================================

class MLModelSummary(BaseModel):
    """Summary of a trained ML model"""
    id: UUID
    model_name: str
    model_type: str
    algorithm: str
    target_column: Optional[str]
    training_rows: int
    test_rows: int
    performance_metrics: Dict[str, float]
    status: str
    created_at: datetime
    preprocessed_file_id: Optional[UUID]
    
    class Config:
        from_attributes = True


class MLModelListResponse(BaseModel):
    """List of user's ML models"""
    total: int
    models: List[MLModelSummary]


class MLModelDetailResponse(BaseModel):
    """Detailed information about a specific ML model"""
    id: UUID
    model_name: str
    model_type: str
    algorithm: str
    target_column: Optional[str]
    feature_columns: List[str]
    train_size: float
    test_size: float
    random_state: Optional[int]
    hyperparameters: Optional[Dict[str, Any]]
    training_rows: int
    test_rows: int
    performance_metrics: Dict[str, float]
    column_schema: Dict[str, Any]
    preprocessing_config: Optional[Dict[str, Any]]
    description: Optional[str]
    status: str
    training_duration_seconds: Optional[float]
    created_at: datetime
    updated_at: datetime
    preprocessed_file_id: Optional[UUID]
    model_file_size: Optional[int]
    
    class Config:
        from_attributes = True


# =====================================================
# PREDICTION
# =====================================================

class PredictionRequest(BaseModel):
    """Request to make predictions on new data"""
    # User uploads CSV file via multipart/form-data
    # This schema is for additional parameters if needed
    pass


class PredictionValidationResponse(BaseModel):
    """Response after validating uploaded data for prediction"""
    is_valid: bool
    message: str
    errors: Optional[List[str]] = None
    warnings: Optional[List[str]] = None
    uploaded_columns: List[str]
    expected_columns: List[str]
    missing_columns: Optional[List[str]] = None
    extra_columns: Optional[List[str]] = None
    total_rows: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "is_valid": True,
                "message": "Data is valid for prediction",
                "errors": None,
                "warnings": None,
                "uploaded_columns": ["age", "salary", "city_encoded"],
                "expected_columns": ["age", "salary", "city_encoded"],
                "missing_columns": None,
                "extra_columns": None,
                "total_rows": 100
            }
        }


class PredictionResponse(BaseModel):
    """Response with predictions"""
    status: str
    model_id: UUID
    model_name: str
    predictions_file_path: str
    predictions_file_name: str
    total_predictions: int
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "model_id": "model-123",
                "model_name": "House Price Predictor v1",
                "predictions_file_path": "/path/to/predictions.csv",
                "predictions_file_name": "predictions_2025-10-30.csv",
                "total_predictions": 100,
                "message": "Predictions completed successfully"
            }
        }


# =====================================================
# SUPPORTED ALGORITHMS
# =====================================================

class SupportedAlgorithmsResponse(BaseModel):
    """List of supported ML algorithms"""
    regression: List[Dict[str, str]]
    binary_classification: List[Dict[str, str]]
    multiclass_classification: List[Dict[str, str]]
    clustering: List[Dict[str, str]]
    
    class Config:
        json_schema_extra = {
            "example": {
                "regression": [
                    {"value": "random_forest", "label": "Random Forest Regressor"},
                    {"value": "linear_regression", "label": "Linear Regression"},
                    {"value": "xgboost", "label": "XGBoost Regressor"}
                ],
                "binary_classification": [
                    {"value": "random_forest", "label": "Random Forest Classifier"},
                    {"value": "logistic_regression", "label": "Logistic Regression"},
                    {"value": "svm", "label": "Support Vector Machine"}
                ],
                "multiclass_classification": [
                    {"value": "random_forest", "label": "Random Forest Classifier"},
                    {"value": "xgboost", "label": "XGBoost Classifier"}
                ],
                "clustering": [
                    {"value": "kmeans", "label": "K-Means Clustering"},
                    {"value": "dbscan", "label": "DBSCAN"}
                ]
            }
        }

