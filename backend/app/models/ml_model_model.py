"""
ML Models Model
===============

Database model for storing trained machine learning models.

This table tracks:
- Model metadata (name, type, algorithm)
- Training configuration (train/test split, target column)
- Model file path (pickled model)
- Preprocessing pipeline used
- Performance metrics
- Column schema for validation
"""

import uuid
from sqlalchemy import Column, String, Integer, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSON, ARRAY
from sqlalchemy.orm import relationship
from app.core.db_setup import Base
from .mixins import Timestamp


class MLModel(Timestamp, Base):
    """
    Machine Learning Model Storage
    
    Stores trained ML models with all necessary metadata for:
    - Model inference/prediction
    - Model download
    - Schema validation (ensuring new data matches training data)
    """
    __tablename__ = "ml_models"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    
    # User & File References
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete="CASCADE"), nullable=False, index=True)
    preprocessed_file_id = Column(UUID(as_uuid=True), ForeignKey('preprocessed_data.id', ondelete="SET NULL"), nullable=True)
    
    # Model Identity
    model_name = Column(String, nullable=False)  # User-defined name
    model_type = Column(String, nullable=False)  # "regression", "binary_classification", "multiclass_classification", "clustering"
    algorithm = Column(String, nullable=False)   # "random_forest", "logistic_regression", "svm", "xgboost", etc.
    
    # Training Configuration
    target_column = Column(String, nullable=True)  # None for unsupervised
    feature_columns = Column(JSON, nullable=False)  # List of feature column names
    train_size = Column(Float, nullable=False)  # 0.0-1.0 (e.g., 0.8 for 80% train)
    test_size = Column(Float, nullable=False)   # 0.0-1.0 (e.g., 0.2 for 20% test)
    random_state = Column(Integer, nullable=True)
    
    # Model Hyperparameters (stored as JSON)
    hyperparameters = Column(JSON, nullable=True)
    
    # File Storage
    model_file_path = Column(String, nullable=False)  # Path to pickled model
    model_file_size = Column(Integer, nullable=True)  # Size in bytes
    
    # Training Results
    training_rows = Column(Integer, nullable=True)
    test_rows = Column(Integer, nullable=True)
    
    # Performance Metrics (JSON - flexible for different model types)
    # Regression: {"r2_score": 0.85, "mse": 0.15, "mae": 0.12}
    # Classification: {"accuracy": 0.92, "precision": 0.90, "recall": 0.88, "f1_score": 0.89}
    # Clustering: {"silhouette_score": 0.65, "inertia": 123.45}
    performance_metrics = Column(JSON, nullable=True)
    
    # Schema Validation (critical for prediction)
    # Stores column names, types, and expected structure
    # Used to validate new data before prediction
    column_schema = Column(JSON, nullable=False)
    # Example: {
    #   "feature_columns": ["age", "salary", "city_encoded"],
    #   "column_types": {"age": "float64", "salary": "float64", "city_encoded": "int64"},
    #   "categorical_mappings": {"city": {"NYC": 0, "LA": 1, "Chicago": 2}},
    #   "scaler_params": {...}  # If scaling was applied
    # }
    
    # Preprocessing Info (to reproduce pipeline)
    preprocessing_config = Column(JSON, nullable=True)  # Same config used to preprocess the training data
    
    # Model Description
    description = Column(Text, nullable=True)
    
    # Status
    status = Column(String, nullable=False, default="ready")  # "training", "ready", "failed"
    error_message = Column(Text, nullable=True)
    
    # Training Time
    training_duration_seconds = Column(Float, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="ml_models")
    preprocessed_file = relationship("PreprocessedData", back_populates="ml_models")
    
    def __repr__(self):
        return f"<MLModel {self.model_name} ({self.model_type})>"

