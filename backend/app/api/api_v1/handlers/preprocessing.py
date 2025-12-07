"""
Data Preprocessing Endpoints
=============================

API endpoints for applying data preprocessing transformations.
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
import os
import logging
import pandas as pd

from app.models.user_model import User
from app.models.user_data_model import UserData, FileType, DataSource
from app.models.preprocessed_data_model import PreprocessedData
from app.api.deps.user_deps import get_current_user
from app.core.db_setup import get_db
from app.services.data_service import DataService
from app.services.preprocessing_service import PreprocessingService
from app.schemas.preprocessing_schemas import PreprocessingRequest, PreprocessingResponse
from app.helpers.storage_helpers import StorageManager
from app.utils.http_exceptions import (
    not_found_error,
    bad_request_error,
    internal_server_error
)
from app.workers import data_worker

logger = logging.getLogger(__name__)

preprocessing_router = APIRouter()


@preprocessing_router.get(
    "/users/files/{file_id}/preprocessed-versions",
    summary="Get All Preprocessed Versions of a File",
    description="Get list of all preprocessed versions created from this original file"
)
async def get_preprocessed_versions(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all preprocessed versions of a specific file"""
    try:
        # Verify original file exists and user owns it
        original_file = await DataService.get_data_by_ids(
            user_id=str(current_user.id),
            file_id=str(file_id),
            db=db
        )
        
        if not original_file:
            raise not_found_error(
                message="Original file not found",
                extra={"file_id": str(file_id)}
            )
        
        # Get all preprocessed versions
        preprocessed_versions = db.query(PreprocessedData).filter(
            PreprocessedData.original_file_id == file_id,
            PreprocessedData.user_id == current_user.id
        ).order_by(PreprocessedData.created_at.desc()).all()
        
        return {
            "original_file_id": str(file_id),
            "original_filename": original_file.file_name,
            "total_versions": len(preprocessed_versions),
            "versions": [version.to_dict() for version in preprocessed_versions]
        }
        
    except Exception as e:
        from fastapi import HTTPException
        if isinstance(e, HTTPException):
            raise
        raise internal_server_error(
            message="Failed to retrieve preprocessed versions",
            extra={"error_details": str(e)}
        )


@preprocessing_router.get(
    "/users/preprocessed-files",
    summary="Get All User's Preprocessed Files",
    description="Get list of all preprocessed files created by the user"
)
async def get_all_preprocessed_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all preprocessed files for current user"""
    try:
        preprocessed_files = db.query(PreprocessedData).filter(
            PreprocessedData.user_id == current_user.id
        ).order_by(PreprocessedData.created_at.desc()).all()
        
        return {
            "total": len(preprocessed_files),
            "preprocessed_files": [pf.to_dict() for pf in preprocessed_files]
        }
        
    except Exception as e:
        raise internal_server_error(
            message="Failed to retrieve preprocessed files",
            extra={"error_details": str(e)}
        )


@preprocessing_router.get(
    "/users/preprocessed-files/ml-ready",
    summary="Get ML-Ready Preprocessed Files",
    description="""
    Get list of preprocessed files that are ready for ML model training.
    
    **ML-Ready Criteria:**
    - All columns must be numeric (int, float)
    - No text, categorical, or mixed type columns
    - Ready for direct use in ML algorithms
    
    **Use Cases:**
    - ML model creation wizard (file selection step)
    - Training models without additional preprocessing
    - Feature engineering validation
    
    **Note:** Files where `is_ml_ready = true` are automatically detected during preprocessing.
    """
)
async def get_ml_ready_preprocessed_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get only preprocessed files that are ML-ready (all columns numeric).
    
    This endpoint filters preprocessed files to return only those suitable
    for ML model training without additional preprocessing.
    """
    try:
        ml_ready_files = db.query(PreprocessedData).filter(
            PreprocessedData.user_id == current_user.id,
            PreprocessedData.is_ml_ready == True
        ).order_by(PreprocessedData.created_at.desc()).all()
        
        logger.info(
            f"User {current_user.email} retrieved {len(ml_ready_files)} ML-ready files "
            f"out of total preprocessed files"
        )
        
        return {
            "total": len(ml_ready_files),
            "ml_ready_files": [pf.to_dict() for pf in ml_ready_files],
            "message": "Only files with all numeric columns are returned (ML-ready)"
        }
        
    except Exception as e:
        logger.error(f"Failed to retrieve ML-ready files: {str(e)}", exc_info=True)
        raise internal_server_error(
            message="Failed to retrieve ML-ready preprocessed files",
            extra={"error_details": str(e)}
        )


@preprocessing_router.delete(
    "/users/preprocessed-files/{preprocessed_id}",
    summary="Delete Preprocessed File",
    description="""
    Delete a preprocessed file (both database record and physical file).
    
    **What gets deleted:**
    - Database record in preprocessed_data table
    - Physical CSV file from disk
    
    **Original file:** NOT deleted (remains safe)
    
    **Use cases:**
    - Remove unwanted preprocessing results
    - Clean up storage space
    - Delete incorrect preprocessing attempts
    
    **Warning:** This action cannot be undone!
    """
)
async def delete_preprocessed_file(
    preprocessed_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a preprocessed file from database and disk.
    
    Args:
        preprocessed_id: UUID of the preprocessed file to delete
        
    Returns:
        Success message with deletion details
    """
    try:
        # 1. Get preprocessed file record
        preprocessed_file = db.query(PreprocessedData).filter(
            PreprocessedData.id == preprocessed_id,
            PreprocessedData.user_id == current_user.id
        ).first()
        
        if not preprocessed_file:
            raise not_found_error(
                message="Preprocessed file not found or you don't have permission to delete it",
                extra={"preprocessed_id": str(preprocessed_id)}
            )
        
        # Store info for response
        filename = preprocessed_file.file_name
        file_path = preprocessed_file.file_path
        original_file_id = str(preprocessed_file.original_file_id)
        
        # 2. Delete physical file from disk
        file_deleted = False
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                file_deleted = True
                logger.info(f"Deleted physical file: {file_path}")
            except Exception as delete_error:
                logger.warning(f"Failed to delete physical file {file_path}: {str(delete_error)}")
                # Continue anyway - we'll delete the DB record
        else:
            logger.warning(f"Physical file not found (already deleted?): {file_path}")
        
        # 3. Delete database record
        db.delete(preprocessed_file)
        db.commit()
        
        logger.info(
            f"Deleted preprocessed file: {filename} (ID: {preprocessed_id}), "
            f"User: {current_user.email}"
        )
        
        # 4. Return success response
        return {
            "success": True,
            "message": f"Preprocessed file '{filename}' deleted successfully",
            "deleted": {
                "preprocessed_id": str(preprocessed_id),
                "filename": filename,
                "file_path": file_path,
                "file_deleted_from_disk": file_deleted,
                "original_file_id": original_file_id
            },
            "note": "Original file was not affected and remains safe"
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete preprocessed file: {str(e)}", exc_info=True)
        
        # Re-raise HTTP exceptions
        from fastapi import HTTPException
        if isinstance(e, HTTPException):
            raise
        
        raise internal_server_error(
            message="Failed to delete preprocessed file",
            extra={"error_details": str(e)}
        )


@preprocessing_router.get(
    "/users/preprocessed-files/{preprocessed_id}/download",
    summary="Download Preprocessed File (CSV)",
    description="""
    Download a preprocessed CSV file.
    
    **What you get:**
    - Complete preprocessed CSV file
    - Original filename preserved
    - Ready to use in Excel, Python, R, etc.
    
    **Format:** CSV only (preprocessed files are always CSV)
    
    **Use cases:**
    - Download preprocessed data for analysis
    - Use in machine learning models
    - Share with colleagues
    - Import into other tools
    
    **Note:** File downloads directly (not JSON response)
    """
)
async def download_preprocessed_file(
    preprocessed_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download a preprocessed CSV file.
    
    Args:
        preprocessed_id: UUID of the preprocessed file to download
        
    Returns:
        FileResponse with the CSV file
    """
    try:
        # 1. Get preprocessed file record
        preprocessed_file = db.query(PreprocessedData).filter(
            PreprocessedData.id == preprocessed_id,
            PreprocessedData.user_id == current_user.id
        ).first()
        
        if not preprocessed_file:
            raise not_found_error(
                message="Preprocessed file not found or you don't have permission to download it",
                extra={"preprocessed_id": str(preprocessed_id)}
            )
        
        # 2. Check if file exists on disk
        if not os.path.exists(preprocessed_file.file_path):
            raise not_found_error(
                message="Preprocessed file not found on disk",
                extra={
                    "preprocessed_id": str(preprocessed_id),
                    "file_path": preprocessed_file.file_path
                }
            )
        
        # 3. Return file for download
        logger.info(
            f"User {current_user.email} downloading preprocessed file: {preprocessed_file.file_name}"
        )
        
        return FileResponse(
            path=preprocessed_file.file_path,
            filename=preprocessed_file.file_name,
            media_type="text/csv"
        )
        
    except Exception as e:
        logger.error(f"Failed to download preprocessed file: {str(e)}", exc_info=True)
        
        # Re-raise HTTP exceptions
        from fastapi import HTTPException
        if isinstance(e, HTTPException):
            raise
        
        raise internal_server_error(
            message="Failed to download preprocessed file",
            extra={"error_details": str(e)}
        )


@preprocessing_router.get(
    "/users/preprocessed-files/{preprocessed_id}/metadata",
    summary="Get Preprocessed File Metadata",
    description="""
    Get comprehensive metadata about a preprocessed file for UI usage.
    
    **Returns:**
    - File information (name, size, creation date)
    - Column names and types
    - Row/column counts
    - Sample data (first 5 rows)
    - Preprocessing configuration applied
    - Transformations summary
    
    **Use Cases:**
    - Display file info in UI
    - Populate feature/target selection dropdowns for ML
    - Show data preview
    - Display preprocessing history
    """
)
async def get_preprocessed_file_metadata(
    preprocessed_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive metadata about a preprocessed file"""
    try:
        # 1. Get preprocessed file record
        preprocessed_file = db.query(PreprocessedData).filter(
            PreprocessedData.id == preprocessed_id,
            PreprocessedData.user_id == current_user.id
        ).first()
        
        if not preprocessed_file:
            raise not_found_error(
                message="Preprocessed file not found",
                extra={"preprocessed_id": str(preprocessed_id)}
            )
        
        # 2. Check if file exists on disk
        if not os.path.exists(preprocessed_file.file_path):
            raise not_found_error(
                message="Preprocessed file not found on disk",
                extra={
                    "preprocessed_id": str(preprocessed_id),
                    "file_path": preprocessed_file.file_path
                }
            )
        
        # 3. Load CSV to get column info
        df = pd.read_csv(preprocessed_file.file_path)
        
        # 4. Get column information
        columns_info = []
        for col in df.columns:
            col_info = {
                "name": col,
                "dtype": str(df[col].dtype),
                "non_null_count": int(df[col].count()),
                "null_count": int(df[col].isnull().sum()),
                "unique_count": int(df[col].nunique()),
                "is_numeric": pd.api.types.is_numeric_dtype(df[col]),
                "is_categorical": df[col].dtype == 'object' or df[col].dtype.name == 'category',
            }
            
            # Add stats for numeric columns
            if col_info["is_numeric"]:
                col_info["min"] = float(df[col].min()) if pd.notna(df[col].min()) else None
                col_info["max"] = float(df[col].max()) if pd.notna(df[col].max()) else None
                col_info["mean"] = float(df[col].mean()) if pd.notna(df[col].mean()) else None
                col_info["median"] = float(df[col].median()) if pd.notna(df[col].median()) else None
            
            # Add sample unique values for categorical
            if col_info["is_categorical"] and col_info["unique_count"] <= 20:
                unique_vals = df[col].dropna().unique()[:10].tolist()
                col_info["sample_values"] = unique_vals
            
            columns_info.append(col_info)
        
        # 5. Get sample data (first 5 rows)
        sample_data = df.head(5)
        # Replace NaN, inf, -inf with None for JSON serialization
        sample_data_clean = sample_data.replace([float('inf'), float('-inf')], None)
        sample_data_clean = sample_data_clean.where(pd.notnull(sample_data_clean), None)
        sample_records = sample_data_clean.to_dict(orient='records')
        
        # 6. Build response
        return {
            "preprocessed_id": str(preprocessed_file.id),
            "file_info": {
                "file_name": preprocessed_file.file_name,
                "file_size": preprocessed_file.file_size,
                "file_size_mb": round(preprocessed_file.file_size / (1024 * 1024), 2) if preprocessed_file.file_size else 0,
                "file_path": preprocessed_file.file_path,
                "created_at": preprocessed_file.created_at.isoformat() if preprocessed_file.created_at else None,
            },
            "dimensions": {
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "rows_before_preprocessing": preprocessed_file.rows_before,
                "rows_after_preprocessing": preprocessed_file.rows_after,
                "columns_before_preprocessing": preprocessed_file.columns_before,
                "columns_after_preprocessing": preprocessed_file.columns_after,
            },
            "columns": columns_info,
            "column_names": df.columns.tolist(),
            "numeric_columns": [col for col in df.columns if pd.api.types.is_numeric_dtype(df[col])],
            "categorical_columns": [col for col in df.columns if df[col].dtype == 'object' or df[col].dtype.name == 'category'],
            "sample_data": sample_records,
            "preprocessing": {
                "mode": preprocessed_file.mode,
                "config": preprocessed_file.preprocessing_config,
                "transformations_applied": preprocessed_file.transformations_applied,
                "warnings": preprocessed_file.warnings,
            },
            "original_file_id": str(preprocessed_file.original_file_id) if preprocessed_file.original_file_id else None,
        }
    
    except Exception as e:
        logger.error(f"Failed to get preprocessed file metadata: {e}", exc_info=True)
        raise internal_server_error(
            message="Failed to retrieve file metadata",
            extra={"error_details": str(e)}
        )


@preprocessing_router.get(
    "/users/preprocessed-files/{preprocessed_id}/data",
    summary="Get Preprocessed File Data (Paginated)",
    description="""
    Retrieve the actual CSV data from a preprocessed file with pagination.
    
    **Pagination:**
    - `page`: Page number (starts from 1)
    - `page_size`: Number of rows per page (10-1000, default 100)
    
    **Returns:**
    - Paginated data as JSON
    - Column names and types
    - Total rows and pages
    - Current page info
    
    **Use cases:**
    - Display preprocessed data in UI table
    - Preview transformations applied
    - Download specific pages of data
    """
)
async def get_preprocessed_file_data(
    preprocessed_id: UUID,
    page: int = Query(1, ge=1, description="Page number (starting from 1)"),
    page_size: int = Query(100, ge=10, le=1000, description="Number of rows per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get paginated data from a preprocessed CSV file.
    
    Args:
        preprocessed_id: UUID of the preprocessed file
        page: Page number (1-based)
        page_size: Rows per page
        
    Returns:
        JSON with paginated data, metadata, and column info
    """
    try:
        # 1. Get preprocessed file record
        preprocessed_file = db.query(PreprocessedData).filter(
            PreprocessedData.id == preprocessed_id,
            PreprocessedData.user_id == current_user.id
        ).first()
        
        if not preprocessed_file:
            raise not_found_error(
                message="Preprocessed file not found or you don't have permission to access it",
                extra={"preprocessed_id": str(preprocessed_id)}
            )
        
        # 2. Check if file exists on disk
        if not os.path.exists(preprocessed_file.file_path):
            raise not_found_error(
                message="Preprocessed file not found on disk",
                extra={
                    "preprocessed_id": str(preprocessed_id),
                    "file_path": preprocessed_file.file_path
                }
            )
        
        # 3. Load CSV file
        try:
            df = pd.read_csv(preprocessed_file.file_path)
        except Exception as read_error:
            raise internal_server_error(
                message="Failed to read preprocessed file",
                extra={"error_details": str(read_error)}
            )
        
        # 4. Calculate pagination
        total_rows = len(df)
        total_pages = (total_rows + page_size - 1) // page_size  # Ceiling division
        
        # Validate page number
        if page > total_pages and total_rows > 0:
            raise bad_request_error(
                error_code="INVALID_PAGE",
                message=f"Page {page} does not exist. Total pages: {total_pages}",
                extra={
                    "requested_page": page,
                    "total_pages": total_pages,
                    "total_rows": total_rows
                }
            )
        
        # 5. Get paginated data
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        df_page = df.iloc[start_idx:end_idx]
        
        # 6. Convert to JSON-friendly format
        # Replace NaN, inf, -inf with None (JSON null) to avoid serialization errors
        df_page_clean = df_page.replace([float('inf'), float('-inf')], None)
        df_page_clean = df_page_clean.where(pd.notnull(df_page_clean), None)
        data_records = df_page_clean.to_dict(orient='records')
        
        # 7. Get column info
        columns_info = []
        for col in df.columns:
            # Get sample values and convert NaN/inf to None
            sample_values = df[col].head(3).replace([float('inf'), float('-inf')], None)
            sample_values = sample_values.where(pd.notnull(sample_values), None).tolist()
            
            col_info = {
                "name": str(col),
                "dtype": str(df[col].dtype),
                "sample_values": sample_values
            }
            columns_info.append(col_info)
        
        # 8. Return response
        return {
            "preprocessed_id": str(preprocessed_id),
            "filename": preprocessed_file.file_name,
            "original_file_id": str(preprocessed_file.original_file_id),
            
            # Pagination info
            "pagination": {
                "current_page": page,
                "page_size": page_size,
                "total_rows": total_rows,
                "total_pages": total_pages,
                "has_next_page": page < total_pages,
                "has_previous_page": page > 1,
                "rows_in_current_page": len(df_page)
            },
            
            # Column info
            "columns": columns_info,
            "total_columns": len(df.columns),
            
            # Actual data
            "data": data_records,
            
            # Metadata
            "preprocessing_info": {
                "mode": preprocessed_file.mode,
                "rows_before": preprocessed_file.rows_before,
                "rows_after": preprocessed_file.rows_after,
                "columns_before": preprocessed_file.columns_before,
                "columns_after": preprocessed_file.columns_after,
                "transformations_applied": preprocessed_file.transformations_applied,
                "warnings": preprocessed_file.warnings,
                "created_at": preprocessed_file.created_at.isoformat() if preprocessed_file.created_at else None
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get preprocessed file data: {str(e)}", exc_info=True)
        
        # Re-raise HTTP exceptions
        from fastapi import HTTPException
        if isinstance(e, HTTPException):
            raise
        
        raise internal_server_error(
            message="Failed to retrieve preprocessed file data",
            extra={"error_details": str(e)}
        )


@preprocessing_router.post(
    "/users/files/{file_id}/preprocess",
    response_model=PreprocessingResponse,
    summary="Preprocess Data File",
    description="""
    Apply preprocessing transformations to a data file and create a new preprocessed version.
    
    **How it works:**
    - Takes an original file (uploaded or synthetic)
    - Applies preprocessing transformations
    - Saves as a NEW preprocessed file (original stays unchanged)
    - Creates record in preprocessed_data table (linked to original file)
    
    **Supports:**
    - Numeric: Scaling, outlier removal, binning, missing value handling
    - Categorical: Encoding (one-hot, label, frequency), rare category merging
    - Text: Stopword removal, stemming, lemmatization, cleaning
    - Datetime: Feature extraction (year, month, day), timezone conversion
    - Boolean: Convert to 0/1, handle missing values
    - Identifier: Drop or hash encode
    
    **Modes:**
    - Simple: Apply global settings to all columns of a type
    - Advanced: Apply per-column settings for fine-grained control
    
    **Returns:** Metadata about the new preprocessed file and transformations applied
    """
)
async def preprocess_file(
    file_id: UUID,
    request: PreprocessingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Apply preprocessing transformations to a file.
    
    Flow:
    1. Load original file
    2. Detect column types
    3. Apply preprocessing transformations
    4. Save as new file
    5. Create database record
    6. Return metadata
    """
    try:
        logger.info(f"Starting preprocessing for file {file_id}, user {current_user.id}")
        
        # 1. Get original file
        user_file = await DataService.get_data_by_ids(
            user_id=str(current_user.id),
            file_id=str(file_id),
            db=db
        )
        
        if not user_file:
            raise not_found_error(
                message="File not found",
                extra={"file_id": str(file_id)}
            )
        
        # 2. Load DataFrame
        df = await DataService.get_data_as_dataframe(
            user_id=str(current_user.id),
            file_id=str(file_id),
            db=db
        )
        
        if df.empty:
            raise bad_request_error(
                error_code="EMPTY_FILE",
                message="Cannot preprocess an empty file",
                extra={"file_id": str(file_id)}
            )
        
        # 3. Get column types with preprocessing_data_type
        df_type_infer, column_types = await DataService.get_columns_type(
            user_id=str(current_user.id),
            file_id=str(file_id),
            db=db
        )
        
        # Get column details which includes preprocessing_data_type
        column_details = await data_worker.get_columns_details(df_type_infer, column_types)
        
        # Create a mapping of column_name to preprocessing_data_type
        # This is what the preprocessing service needs!
        preprocessing_type_map = {
            col['name']: col['preprocessing_data_type'] 
            for col in column_details
        }
        
        logger.info(f"Preprocessing type mapping: {preprocessing_type_map}")
        
        # Track original dimensions
        rows_before = len(df)
        columns_before = len(df.columns)
        
        logger.info(f"Original file: {rows_before} rows, {columns_before} columns")
        
        # 4. Apply preprocessing
        result = await PreprocessingService.apply_preprocessing(
            df=df,
            column_types=preprocessing_type_map,  # Pass preprocessing_data_type map
            config=request.preprocessing,
            mode=request.mode
        )
        
        df_processed = result['dataframe']
        transformations = result['transformations']
        warnings = result['warnings']
        
        # 5. Generate output filename
        if request.output_filename:
            output_filename = request.output_filename
            if not output_filename.lower().endswith('.csv'):
                output_filename += '.csv'
        else:
            original_name = user_file.file_name.replace('.csv', '').replace('.CSV', '')
            output_filename = f"{original_name}_preprocessed.csv"
        
        # Check if filename already exists in preprocessed_data table
        existing_preprocessed = db.query(PreprocessedData).filter(
            PreprocessedData.user_id == current_user.id,
            PreprocessedData.file_name == output_filename
        ).first()
        
        if existing_preprocessed:
            raise bad_request_error(
                error_code="FILENAME_EXISTS",
                message=f"A preprocessed file with the name '{output_filename}' already exists. Please choose a different filename.",
                extra={
                    "existing_filename": output_filename,
                    "suggestion": f"{output_filename.replace('.csv', '')}_v2.csv"
                }
            )
        
        # 6. Save processed file
        file_path = StorageManager.save_preprocessed_file(
            user_email=current_user.email,
            filename=output_filename,
            dataframe=df_processed
        )
        
        # 7. Check if all columns are numeric (ML-ready)
        is_ml_ready = all(
            pd.api.types.is_numeric_dtype(df_processed[col]) 
            for col in df_processed.columns
        )
        
        logger.info(
            f"ML Readiness Check: is_ml_ready={is_ml_ready}. "
            f"Numeric columns: {sum(pd.api.types.is_numeric_dtype(df_processed[col]) for col in df_processed.columns)}/{len(df_processed.columns)}"
        )
        
        # 8. Create database record in preprocessed_data table (NOT user_data!)
        file_size = os.path.getsize(file_path)
        
        preprocessed_record = PreprocessedData(
            user_id=current_user.id,
            original_file_id=file_id,  # Link to original file in user_data table
            file_name=output_filename,
            file_path=file_path,
            file_size=file_size,
            preprocessing_config=request.dict()['preprocessing'],  # Store full config as dict
            mode=request.mode,
            transformations_applied=transformations,  # Store what was actually applied
            warnings=warnings,
            rows_before=rows_before,
            rows_after=len(df_processed),
            columns_before=columns_before,
            columns_after=len(df_processed.columns),
            is_ml_ready=is_ml_ready  # Set ML readiness flag
        )
        
        db.add(preprocessed_record)
        db.commit()
        db.refresh(preprocessed_record)
        
        logger.info(
            f"Preprocessing complete. Original: {user_file.file_name}, "
            f"Preprocessed: {output_filename}, "
            f"{len(df_processed)} rows, {len(df_processed.columns)} columns, "
            f"ML-ready: {is_ml_ready}"
        )
        
        # 9. Return response
        return PreprocessingResponse(
            status="success",
            file_id=str(preprocessed_record.id),
            filename=output_filename,
            file_size_mb=round(file_size / (1024 * 1024), 2),
            rows_before=rows_before,
            rows_after=len(df_processed),
            columns_before=columns_before,
            columns_after=len(df_processed.columns),
            transformations_applied=transformations,
            warnings=warnings
        )
        
    except Exception as e:
        logger.error(f"Preprocessing failed: {str(e)}", exc_info=True)
        
        # Re-raise HTTP exceptions
        from fastapi import HTTPException
        if isinstance(e, HTTPException):
            raise
        
        # Log and return internal server error for other exceptions
        raise internal_server_error(
            message="Preprocessing failed. Please check your configuration and try again.",
            extra={"error_details": str(e)}
        )


@preprocessing_router.get(
    "/preprocessing-options",
    summary="Get Available Preprocessing Options",
    description="""
    Returns all available preprocessing options for each data type.
    
    Frontend should:
    1. Call GET /columns-info to get columns with their preprocessing_data_type
    2. Call this endpoint to get available options for each type
    3. Build UI dynamically based on preprocessing_data_type
    4. Send preprocessing config to POST /preprocess
    """
)
async def get_preprocessing_options():
    """
    Get complete list of preprocessing options available for each data type.
    
    This maps directly to the preprocessing_data_type field returned by columns-info endpoint.
    """
    return {
        "numeric": {
            "drop_column": {
                "type": "boolean",
                "default": False,
                "description": "Remove this column from the dataset"
            },
            "missing": {
                "type": "select",
                "options": ["drop", "fill_mean", "fill_median", "fill_zero"],
                "default": "drop",
                "description": "How to handle missing values"
            },
            "scaling": {
                "type": "select",
                "options": ["none", "normalize", "standardize", "min_max"],
                "default": "none",
                "description": "Scaling method to apply"
            },
            "remove_outliers": {
                "type": "boolean",
                "default": False,
                "description": "Remove outliers using IQR method"
            },
            "log_transform": {
                "type": "boolean",
                "default": False,
                "description": "Apply logarithmic transformation"
            },
            "binning": {
                "type": "object",
                "optional": True,
                "description": "Discretize into bins",
                "schema": {
                    "bins": "integer (5, 10) or array of bin edges"
                }
            }
        },
        "categorical": {
            "drop_column": {
                "type": "boolean",
                "default": False,
                "description": "Remove this column from the dataset"
            },
            "missing": {
                "type": "select",
                "options": ["drop", "fill_unknown"],
                "default": "drop",
                "description": "How to handle missing values"
            },
            "encoding": {
                "type": "select",
                "options": ["one_hot", "label_encode", "frequency_encode"],
                "default": "one_hot",
                "description": "Encoding method"
            },
            "merge_rare": {
                "type": "object",
                "optional": True,
                "description": "Merge categories below threshold into 'Other'",
                "schema": {
                    "threshold": "float (0.01 = 1%)"
                }
            },
            "top_n_categories": {
                "type": "integer",
                "optional": True,
                "description": "Keep only top N categories, rest become 'Other'"
            }
        },
        "text": {
            "drop_column": {
                "type": "boolean",
                "default": False,
                "description": "Remove this column from the dataset"
            },
            "lowercase": {
                "type": "boolean",
                "default": False,
                "description": "Convert text to lowercase"
            },
            "remove_stopwords": {
                "type": "boolean",
                "default": False,
                "description": "Remove common stopwords (requires NLTK)"
            },
            "stem_or_lemma": {
                "type": "select",
                "options": ["none", "stem", "lemma"],
                "default": "none",
                "description": "Apply stemming or lemmatization"
            },
            "remove_punctuation": {
                "type": "boolean",
                "default": False,
                "description": "Remove punctuation marks"
            },
            "remove_numbers": {
                "type": "boolean",
                "default": False,
                "description": "Remove numeric characters"
            },
            "truncate_length": {
                "type": "integer",
                "optional": True,
                "description": "Truncate text to maximum length"
            },
            "tokenize": {
                "type": "boolean",
                "default": False,
                "description": "Split text into tokens (words)"
            },
            "vectorization": {
                "type": "select",
                "options": [
                    {"value": "none", "label": "None (Keep as Text)"},
                    {"value": "tfidf", "label": "TF-IDF (Recommended for ML)"},
                    {"value": "count", "label": "Count Vectorizer (Bag of Words)"},
                    {"value": "sentence_transformer", "label": "Sentence Embeddings (Deep Learning)"}
                ],
                "default": "none",
                "description": "Convert text to numeric vectors for ML models"
            },
            "max_features": {
                "type": "integer",
                "default": 100,
                "optional": True,
                "description": "Maximum number of features for vectorization (TF-IDF/Count)"
            },
            "drop_original": {
                "type": "boolean",
                "default": True,
                "description": "Drop original text column after vectorization"
            }
        },
        "datetime": {
            "drop_column": {
                "type": "boolean",
                "default": False,
                "description": "Remove this column from the dataset"
            },
            "missing": {
                "type": "select",
                "options": ["drop", "fill_earliest", "fill_latest", "fill_default"],
                "default": "drop",
                "description": "How to handle missing values"
            },
            "extract": {
                "type": "multiselect",
                "options": ["year", "month", "day", "hour", "minute", "second", "weekday"],
                "default": [],
                "description": "Extract datetime components as new columns"
            },
            "round": {
                "type": "select",
                "options": ["none", "day", "hour", "minute"],
                "default": "none",
                "description": "Round datetime to nearest unit"
            },
            "convert_timezone": {
                "type": "text",
                "optional": True,
                "description": "Convert to timezone (e.g., 'UTC', 'US/Eastern')"
            },
            "drop_original": {
                "type": "boolean",
                "default": False,
                "description": "Drop original datetime column after extraction"
            }
        },
        "boolean": {
            "drop_column": {
                "type": "boolean",
                "default": False,
                "description": "Remove this column from the dataset"
            },
            "missing": {
                "type": "select",
                "options": ["drop", "fill_true", "fill_false"],
                "default": "drop",
                "description": "How to handle missing values"
            },
            "encode": {
                "type": "select",
                "options": ["keep_boolean", "0_1"],
                "default": "keep_boolean",
                "description": "Encoding format"
            }
        },
        "identifier": {
            "drop": {
                "type": "boolean",
                "default": False,
                "description": "Remove identifier column"
            },
            "hash_encode": {
                "type": "boolean",
                "default": False,
                "description": "Hash encode for privacy"
            }
        },
        "mixed": {
            "convert_to": {
                "type": "select",
                "options": ["keep_as_string", "numeric", "datetime", "string"],
                "default": "keep_as_string",
                "description": "Try to convert to specific type"
            },
            "fill_missing": {
                "type": "select",
                "options": ["drop", "fill_default"],
                "default": "drop",
                "description": "How to handle missing/failed conversions"
            },
            "drop": {
                "type": "boolean",
                "default": False,
                "description": "Drop this messy column entirely"
            }
        }
    }

