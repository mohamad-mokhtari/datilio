"""
ML Models API Handlers
======================

Endpoints for ML model training, management, and prediction.

Workflow:
1. User selects preprocessed file → /ml/analyze-target → Get problem type & suggested models
2. User configures model → /ml/train → Train model & save to database
3. User lists models → /ml/models → View all trained models
4. User downloads model → /ml/models/{id}/download → Get pickled model file
5. User makes predictions → /ml/models/{id}/predict → Upload CSV & get predictions
"""

from fastapi import APIRouter, Depends, File, UploadFile, Query, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional
import pandas as pd
import os
import logging
from datetime import datetime

from app.models.user_model import User
from app.models.preprocessed_data_model import PreprocessedData
from app.models.ml_model_model import MLModel
from app.api.deps.user_deps import get_current_user
from app.core.db_setup import get_db
from app.services.ml_service import MLService
from app.services.data_service import DataService
from app.schemas.ml_model_schemas import (
    TargetAnalysisRequest,
    TargetAnalysisResponse,
    ModelTrainingRequest,
    ModelTrainingResponse,
    MLModelListResponse,
    MLModelDetailResponse,
    MLModelSummary,
    PredictionValidationResponse,
    PredictionResponse,
    SupportedAlgorithmsResponse
)
from app.utils.http_exceptions import (
    not_found_error,
    bad_request_error,
    internal_server_error
)
from app.helpers.storage_helpers import StorageManager

logger = logging.getLogger(__name__)

ml_router = APIRouter()


# =====================================================
# TARGET ANALYSIS
# =====================================================

@ml_router.post(
    "/analyze-target/{preprocessed_file_id}",
    response_model=TargetAnalysisResponse,
    summary="Analyze Target Column",
    description="""
    Analyze a target column to determine the ML problem type.
    
    **Determines:**
    - Regression (numeric target with many unique values)
    - Binary Classification (2 unique classes)
    - Multi-class Classification (3-20 unique classes)
    - Clustering (no target column)
    
    **Returns:** Problem type and suggested ML algorithms
    """
)
async def analyze_target(
    preprocessed_file_id: UUID,
    request: TargetAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze target column to determine problem type"""
    try:
        # Get preprocessed file
        preprocessed_file = db.query(PreprocessedData).filter(
            PreprocessedData.id == preprocessed_file_id,
            PreprocessedData.user_id == current_user.id
        ).first()
        
        if not preprocessed_file:
            raise not_found_error(
                message="Preprocessed file not found",
                extra={"preprocessed_file_id": str(preprocessed_file_id)}
            )
        
        # Load data
        if not os.path.exists(preprocessed_file.file_path):
            raise not_found_error(message="File not found on disk")
        
        df = pd.read_csv(preprocessed_file.file_path)
        
        # Analyze target
        analysis = MLService.analyze_target(df, request.target_column)
        
        return TargetAnalysisResponse(
            preprocessed_file_id=preprocessed_file_id,
            target_column=request.target_column,
            **analysis
        )
    
    except ValueError as e:
        raise bad_request_error(
            error_code="INVALID_TARGET",
            message=str(e)
        )
    except Exception as e:
        logger.error(f"Target analysis failed: {e}")
        raise internal_server_error(message=f"Target analysis failed: {str(e)}")


# =====================================================
# MODEL TRAINING
# =====================================================

@ml_router.post(
    "/train/{preprocessed_file_id}",
    response_model=ModelTrainingResponse,
    summary="Train ML Model",
    description="""
    Train a machine learning model on preprocessed data.
    
    **Steps:**
    1. Loads preprocessed data
    2. Splits into train/test sets
    3. Trains selected algorithm
    4. Evaluates performance
    5. Saves model to disk
    6. Stores metadata in database
    
    **Supports:**
    - Regression: Random Forest, Linear Regression, XGBoost, etc.
    - Binary Classification: Logistic Regression, SVM, Random Forest, etc.
    - Multi-class Classification: Random Forest, XGBoost, etc.
    - Clustering: K-Means, DBSCAN
    """
)
async def train_model(
    preprocessed_file_id: UUID,
    request: ModelTrainingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Train a new ML model"""
    try:
        logger.info(f"Starting model training for user {current_user.id}, file {preprocessed_file_id}")
        
        # 1. Get preprocessed file
        preprocessed_file = db.query(PreprocessedData).filter(
            PreprocessedData.id == preprocessed_file_id,
            PreprocessedData.user_id == current_user.id
        ).first()
        
        if not preprocessed_file:
            raise not_found_error(message="Preprocessed file not found")
        
        # 2. Load data
        if not os.path.exists(preprocessed_file.file_path):
            raise not_found_error(message="File not found on disk")
        
        df = pd.read_csv(preprocessed_file.file_path)
        
        # 3. Analyze target to determine model type
        analysis = MLService.analyze_target(df, request.target_column)
        model_type = analysis['problem_type']
        
        logger.info(f"Model type: {model_type}, Algorithm: {request.algorithm}")
        
        # 4. Train model
        training_result = MLService.train_model(
            df=df,
            model_type=model_type,
            algorithm=request.algorithm,
            target_column=request.target_column,
            feature_columns=request.feature_columns,
            train_size=request.train_size,
            random_state=request.random_state,
            hyperparameters=request.hyperparameters
        )
        
        # 5. Save model to disk
        models_dir = StorageManager.get_user_directory(
            email=current_user.email,
            subdir="ml_models"
        )
        os.makedirs(models_dir, exist_ok=True)
        
        model_filename = f"model_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pkl"
        model_file_path = os.path.join(models_dir, model_filename)
        
        model_file_size = MLService.save_model(training_result['model'], model_file_path)
        
        logger.info(f"Model saved to {model_file_path} ({model_file_size} bytes)")
        
        # 6. Create database record
        ml_model = MLModel(
            user_id=current_user.id,
            preprocessed_file_id=preprocessed_file_id,
            model_name=request.model_name,
            model_type=model_type,
            algorithm=request.algorithm,
            target_column=request.target_column,
            feature_columns=training_result['feature_columns'],
            train_size=request.train_size,
            test_size=1 - request.train_size,
            random_state=request.random_state,
            hyperparameters=request.hyperparameters,
            model_file_path=model_file_path,
            model_file_size=model_file_size,
            training_rows=training_result['training_rows'],
            test_rows=training_result['test_rows'],
            performance_metrics=training_result['performance_metrics'],
            column_schema=training_result['column_schema'],
            preprocessing_config=preprocessed_file.preprocessing_config,
            description=request.description,
            status="ready",
            training_duration_seconds=training_result['training_duration_seconds']
        )
        
        db.add(ml_model)
        db.commit()
        db.refresh(ml_model)
        
        logger.info(f"Model saved to database with ID: {ml_model.id}")
        
        return ModelTrainingResponse(
            status="success",
            model_id=ml_model.id,
            model_name=ml_model.model_name,
            model_type=ml_model.model_type,
            algorithm=ml_model.algorithm,
            training_rows=ml_model.training_rows,
            test_rows=ml_model.test_rows,
            performance_metrics=ml_model.performance_metrics,
            training_duration_seconds=ml_model.training_duration_seconds,
            message=f"Model '{ml_model.model_name}' trained successfully"
        )
    
    except ValueError as e:
        logger.error(f"Training validation error: {e}")
        raise bad_request_error(
            error_code="TRAINING_ERROR",
            message=str(e)
        )
    except Exception as e:
        logger.error(f"Model training failed: {e}", exc_info=True)
        raise internal_server_error(message=f"Model training failed: {str(e)}")


# =====================================================
# MODEL LISTING & DETAILS
# =====================================================

@ml_router.get(
    "/models",
    response_model=MLModelListResponse,
    summary="List ML Models",
    description="Get list of all trained models for the current user"
)
async def list_models(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all ML models for current user"""
    try:
        models = db.query(MLModel).filter(
            MLModel.user_id == current_user.id
        ).order_by(MLModel.created_at.desc()).all()
        
        return MLModelListResponse(
            total=len(models),
            models=[MLModelSummary.from_orm(m) for m in models]
        )
    
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise internal_server_error(message="Failed to retrieve models")


@ml_router.get(
    "/models/{model_id}",
    response_model=MLModelDetailResponse,
    summary="Get Model Details",
    description="Get detailed information about a specific ML model"
)
async def get_model_details(
    model_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed model information"""
    try:
        model = db.query(MLModel).filter(
            MLModel.id == model_id,
            MLModel.user_id == current_user.id
        ).first()
        
        if not model:
            raise not_found_error(message="Model not found")
        
        return MLModelDetailResponse.from_orm(model)
    
    except Exception as e:
        logger.error(f"Failed to get model details: {e}")
        raise internal_server_error(message="Failed to retrieve model details")


# =====================================================
# MODEL DELETE
# =====================================================

@ml_router.delete(
    "/models/{model_id}",
    summary="Delete ML Model",
    description="Delete a trained ML model (removes from database and disk)"
)
async def delete_model(
    model_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an ML model"""
    try:
        model = db.query(MLModel).filter(
            MLModel.id == model_id,
            MLModel.user_id == current_user.id
        ).first()
        
        if not model:
            raise not_found_error(message="Model not found")
        
        # Delete file from disk
        if os.path.exists(model.model_file_path):
            os.remove(model.model_file_path)
            logger.info(f"Deleted model file: {model.model_file_path}")
        
        # Delete from database
        db.delete(model)
        db.commit()
        
        return {
            "status": "success",
            "message": f"Model '{model.model_name}' deleted successfully"
        }
    
    except Exception as e:
        logger.error(f"Failed to delete model: {e}")
        raise internal_server_error(message="Failed to delete model")


# =====================================================
# MODEL DOWNLOAD
# =====================================================

@ml_router.get(
    "/models/{model_id}/download",
    summary="Download ML Model",
    description="Download the trained model file (pickled .pkl file)"
)
async def download_model(
    model_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download trained model file"""
    try:
        model = db.query(MLModel).filter(
            MLModel.id == model_id,
            MLModel.user_id == current_user.id
        ).first()
        
        if not model:
            raise not_found_error(message="Model not found")
        
        if not os.path.exists(model.model_file_path):
            raise not_found_error(message="Model file not found on disk")
        
        # Generate download filename
        safe_name = model.model_name.replace(' ', '_').replace('/', '_')
        download_filename = f"{safe_name}_{model.algorithm}.pkl"
        
        return FileResponse(
            path=model.model_file_path,
            filename=download_filename,
            media_type="application/octet-stream"
        )
    
    except Exception as e:
        logger.error(f"Failed to download model: {e}")
        raise internal_server_error(message="Failed to download model")


# =====================================================
# PREDICTION
# =====================================================

@ml_router.post(
    "/models/{model_id}/predict",
    response_model=PredictionResponse,
    summary="Make Predictions",
    description="""
    Upload a CSV file and make predictions using a trained model.
    
    **Critical:** The uploaded data MUST match the training data schema:
    - Same column names
    - Same column types
    - Same column count
    
    **Flow:**
    1. Upload CSV file
    2. Backend validates schema
    3. If valid → applies preprocessing (if any)
    4. Makes predictions
    5. Returns predictions as downloadable CSV
    """
)
async def make_predictions(
    model_id: UUID,
    file: UploadFile = File(..., description="CSV file with data to predict"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Make predictions on new data"""
    try:
        logger.info(f"Prediction request for model {model_id}, file: {file.filename}")
        
        # 1. Get model
        model_record = db.query(MLModel).filter(
            MLModel.id == model_id,
            MLModel.user_id == current_user.id
        ).first()
        
        if not model_record:
            raise not_found_error(message="Model not found")
        
        # 2. Load uploaded CSV
        df = pd.read_csv(file.file)
        logger.info(f"Uploaded CSV: {len(df)} rows, {len(df.columns)} columns")
        
        # 3. Validate schema
        is_valid, errors, warnings = MLService.validate_prediction_data(
            df, model_record.column_schema
        )
        
        if not is_valid:
            raise bad_request_error(
                error_code="SCHEMA_MISMATCH",
                message="Uploaded data does not match model schema",
                extra={
                    "errors": errors,
                    "warnings": warnings,
                    "expected_columns": model_record.column_schema['feature_columns'],
                    "uploaded_columns": df.columns.tolist()
                }
            )
        
        if warnings:
            logger.warning(f"Prediction warnings: {warnings}")
        
        # 4. Load model
        trained_model = MLService.load_model(model_record.model_file_path)
        
        # 5. Make predictions
        predictions = MLService.predict(
            model=trained_model,
            df=df,
            feature_columns=model_record.feature_columns,
            model_type=model_record.model_type
        )
        
        logger.info(f"Generated {len(predictions)} predictions")
        
        # 6. Create output DataFrame
        result_df = df.copy()
        result_df['prediction'] = predictions
        
        # 7. Save predictions to file
        predictions_dir = StorageManager.get_user_directory(
            email=current_user.email,
            subdir="predictions"
        )
        os.makedirs(predictions_dir, exist_ok=True)
        
        predictions_filename = f"predictions_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        predictions_path = os.path.join(predictions_dir, predictions_filename)
        
        result_df.to_csv(predictions_path, index=False)
        
        logger.info(f"Predictions saved to {predictions_path}")
        
        return PredictionResponse(
            status="success",
            model_id=model_id,
            model_name=model_record.model_name,
            predictions_file_path=predictions_path,
            predictions_file_name=predictions_filename,
            total_predictions=len(predictions),
            message=f"Successfully generated {len(predictions)} predictions"
        )
    
    except ValueError as e:
        logger.error(f"Prediction validation error: {e}")
        raise bad_request_error(
            error_code="PREDICTION_ERROR",
            message=str(e)
        )
    except Exception as e:
        logger.error(f"Prediction failed: {e}", exc_info=True)
        raise internal_server_error(message=f"Prediction failed: {str(e)}")


@ml_router.get(
    "/predictions/{prediction_filename}/download",
    summary="Download Predictions",
    description="Download a predictions CSV file"
)
async def download_predictions(
    prediction_filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download predictions file"""
    try:
        predictions_dir = StorageManager.get_user_directory(
            email=current_user.email,
            subdir="predictions"
        )
        
        file_path = os.path.join(predictions_dir, prediction_filename)
        
        if not os.path.exists(file_path):
            raise not_found_error(message="Predictions file not found")
        
        return FileResponse(
            path=file_path,
            filename=prediction_filename,
            media_type="text/csv"
        )
    
    except Exception as e:
        logger.error(f"Failed to download predictions: {e}")
        raise internal_server_error(message="Failed to download predictions")


# =====================================================
# SUPPORTED ALGORITHMS
# =====================================================

@ml_router.get(
    "/supported-algorithms",
    response_model=SupportedAlgorithmsResponse,
    summary="Get Supported Algorithms",
    description="Get list of all supported ML algorithms by problem type"
)
async def get_supported_algorithms():
    """Get list of supported ML algorithms"""
    try:
        algorithms = MLService.get_supported_algorithms()
        return SupportedAlgorithmsResponse(**algorithms)
    
    except Exception as e:
        logger.error(f"Failed to get algorithms: {e}")
        raise internal_server_error(message="Failed to retrieve algorithms")

