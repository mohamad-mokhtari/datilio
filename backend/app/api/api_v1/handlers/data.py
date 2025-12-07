import shutil
from fastapi import APIRouter, HTTPException, UploadFile, Depends, File
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import os
import json
import gzip
import pandas as pd
from enum import Enum

from app.models.user_model import User
from app.api.deps.user_deps import get_current_user
from app.core.db_setup import get_db
from app.core.config import settings
from app.helpers import data_helpers
from app.helpers.storage_helpers import StorageManager
from app.services.data_service import DataService
from app.models.user_data_model import FileType, UserData, DataSource
from app.workers import data_worker
from app.services.usage_service import UsageService
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)

data_router = APIRouter()

# Note: File storage is now handled by StorageManager in storage_helpers.py
# This provides a unified, portable storage system for all user data files

@data_router.post("/users/upload-file")
async def upload_file(
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Security: Validate file size (max 100MB)
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB in bytes
    if file.size and file.size > MAX_FILE_SIZE:
        raise bad_request_error(
            error_code="FILE_TOO_LARGE",
            message=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024 * 1024):.0f}MB.",
            extra={"max_size_mb": MAX_FILE_SIZE / (1024 * 1024), "file_size_mb": round(file.size / (1024 * 1024), 2)}
        )
    
    # Determine file type based on extension
    file_extension = file.filename.split('.')[-1].lower()
    file_type = None
    
    # Security: Validate content type
    allowed_content_types = {
        'csv': ['text/csv', 'application/csv', 'text/plain'],
        'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'xls': ['application/vnd.ms-excel'],
        'json': ['application/json', 'text/json']
    }
    
    if file_extension == 'csv':
        file_type = FileType.CSV
    elif file_extension in ['xlsx', 'xls']:
        file_type = FileType.EXCEL
    elif file_extension == 'json':
        file_type = FileType.JSON
    else:
        raise bad_request_error(
            error_code="INVALID_FILE_TYPE",
            message="Only CSV, Excel, and JSON files are allowed.",
            extra={"allowed_types": ["csv", "xlsx", "xls", "json"]}
        )
    
    # Security: Validate content type matches file extension
    if file_extension in allowed_content_types:
        if file.content_type not in allowed_content_types[file_extension] and file.content_type != 'application/octet-stream':
            raise bad_request_error(
                error_code="CONTENT_TYPE_MISMATCH",
                message=f"File content type '{file.content_type}' does not match extension '{file_extension}'.",
                extra={"expected_types": allowed_content_types[file_extension], "received_type": file.content_type}
            )
    
    # Calculate file size in MB for usage tracking
    file_size_mb = file.size / (1024 * 1024) if file.size else 0
    
    # Check usage limits before processing
    if not UsageService.check_usage_limit(db, str(current_user.id), "file_storage_mb", file_size_mb):
        # Get current usage to show user helpful info
        usage_summary = UsageService.get_usage_summary(db, str(current_user.id))
        current_usage_mb = usage_summary.current_month.get("file_storage_mb", 0)
        limit_mb = usage_summary.limits.get("file_storage_mb", 0)
        remaining_mb = max(0, limit_mb - current_usage_mb)
        
        raise bad_request_error(
            error_code="QUOTA_EXCEEDED",
            message=f"Storage limit exceeded. This file is {file_size_mb:.2f} MB, but you only have {remaining_mb:.2f} MB remaining this month (used {current_usage_mb:.2f} MB of {limit_mb:.2f} MB). Please upgrade your plan or purchase additional storage.",
            extra={
                "file_size_mb": round(file_size_mb, 2),
                "limit_type": "file_storage_mb",
                "current_usage_mb": round(current_usage_mb, 2),
                "monthly_limit_mb": round(limit_mb, 2),
                "remaining_mb": round(remaining_mb, 2)
            }
        )
    
    # Use the new unified storage system
    file_location = StorageManager.get_file_path(
        user_email=current_user.email,
        filename=file.filename,
        file_type=file_extension,
        is_synthetic=False
    )

    try:    
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Clean CSV files: remove quotes from columns and values
        if file_type == FileType.CSV:
            data_helpers.clean_csv_quotes(file_location)

        # Get actual file size
        actual_file_size = os.path.getsize(file_location)
        actual_file_size_mb = actual_file_size / (1024 * 1024)

        # Create data record
        data = await DataService.create_data(
            user_id=current_user.id,
            file_name=file.filename,
            file_type=file_type,
            file_path=file_location,
            file_size=actual_file_size,
            source=DataSource.UPLOADED,
            db=db
        )

        # Track usage after successful upload
        UsageService.track_usage(
            db=db,
            user_id=str(current_user.id),
            feature="file_storage_mb",
            amount=actual_file_size_mb,
            description=f"Uploaded {file.filename}"
        )

        # Prepare response
        response = {
            "filename": file.filename, 
            "location": file_location, 
            "size": actual_file_size,
            "file_id": str(data.id)
        }

        # Check if file size is between 500KB and 5MB for index DB storage
        # Only process if IndexedDB storage is enabled via environment variable
        file_size_kb = actual_file_size / 1024
        if settings.INDEXEDDB_STORE_FOR_SPEED_AND_OFFLINE and 500 <= file_size_kb <= 5000:  # 500KB to 5MB
            try:
                # Load data as DataFrame
                df = await DataService.get_data_as_dataframe(str(current_user.id), str(data.id), db)
                
                # Convert to list of dictionaries
                data_list = df.to_dict(orient='records')
                
                # Calculate compressed size
                json_str = json.dumps(data_list)
                compressed = gzip.compress(json_str.encode())
                compressed_size_kb = len(compressed) / 1024
                
                # Clean the data
                cleaned_data = data_helpers.clean_data(data_list)
                
                # Add data to response for index DB storage
                response["data"] = cleaned_data
                response["compressed_size_kb"] = compressed_size_kb
                response["columns"] = df.columns.tolist()
                response["row_count"] = len(df)
                
            except Exception as e:
                # If data processing fails, still return successful upload but without data
                print(f"Warning: Could not process data for index DB: {str(e)}")
                response["data_error"] = "Could not process data for index DB storage"

        return response
    except IntegrityError as e:
        db.rollback()
        if 'duplicate key' in str(e.orig) or 'unique constraint' in str(e.orig):
            raise conflict_error(
                error_code="DUPLICATE_FILE_NAME",
                message="A file with this name already exists. Please choose a different name.",
                extra={"error_details": "Duplicate file name", "file_name": file.filename}
            )
        else:
            raise bad_request_error(
                error_code="DATABASE_CONSTRAINT_VIOLATION",
                message="Failed to save file due to a database constraint. Please try again.",
                extra={"error_details": str(e)}
            )
    except Exception as e:
        raise internal_server_error(
            message="Failed to upload file. Please try again later.",
            extra={"error_details": str(e)}
        )

@data_router.get("/users/files")
async def list_user_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    files = await DataService.get_all_user_data(user_id=current_user.id, db=db)

    if not files:
        return []

    file_list = []
    for file in files:
        file_exists = os.path.isfile(file.file_path)

        # Update the file_path_exists field
        file.file_path_exists = file_exists
        db.add(file)

        file_list.append({
            "updated_at": file.updated_at,
            "file_id": file.id,
            "file_name": file.file_name,
            "file_path": file.file_path,
            "file_exists": file_exists,
            "file_size": file.file_size,
            "file_type": file.file_type.value,
            "source": file.source.value
        })

    db.commit()
    return file_list

@data_router.get("/users/files/by-source/{source}")
async def list_user_files_by_source(
    source: DataSource,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user files filtered by source type (uploaded or synthetic).
    
    Args:
        source: The data source type ('uploaded' or 'synthetic')
        current_user: The authenticated user
        db: Database session
    
    Returns:
        List of files with the specified source type
    """
    try:
        files = await DataService.get_data_by_source(user_id=current_user.id, source=source, db=db)

        if not files:
            return []

        file_list = []
        for file in files:
            file_exists = os.path.isfile(file.file_path)

            # Update the file_path_exists field
            file.file_path_exists = file_exists
            db.add(file)

            file_list.append({
                "updated_at": file.updated_at,
                "file_id": file.id,
                "file_name": file.file_name,
                "file_path": file.file_path,
                "file_exists": file_exists,
                "file_size": file.file_size,
                "file_type": file.file_type.value,
                "source": file.source.value
            })

        db.commit()
        return file_list
        
    except Exception as e:
        raise internal_server_error(
            message="Failed to retrieve files by source. Please try again later.",
            extra={"error_details": str(e), "source": source.value}
        )

@data_router.get("/users/files/{file_id}/data")
async def get_file_data(
    file_id: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: int = 100
):
    try:
        data = await DataService.get_data_as_dataframe(user_id=current_user.id, file_id=file_id, db=db)

        # Calculate total rows and pages
        total_rows = len(data)
        total_pages = (total_rows + page_size - 1) // page_size

        # Validate page number
        if page < 1:
            page = 1
        elif page > total_pages and total_pages > 0:
            page = total_pages

        # Calculate start and end indices for pagination
        start_idx = (page - 1) * page_size
        end_idx = min(start_idx + page_size, total_rows)

        # Get the paginated data
        paginated_data = data.iloc[start_idx:end_idx]

        # Convert the DataFrame to JSON
        json_data = paginated_data.to_json(orient='records')
        parsed_json = json.loads(json_data)

        # Create response with pagination metadata
        response = {
            "data": parsed_json,
            "pagination": {
                "total_rows": total_rows,
                "total_pages": total_pages,
                "current_page": page,
                "page_size": page_size,
                "has_next": page < total_pages,
                "has_previous": page > 1
            }
        }

        return JSONResponse(content=response)
    except Exception as e:
        raise internal_server_error(
            message="Failed to retrieve file data. Please try again later."
        )

@data_router.get("/users/files/{file_id}/columns-info")
async def get_file_columns_info(
    file_id: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        df_type_infer, column_types = await DataService.get_columns_type(user_id=current_user.id, file_id=file_id, db=db)
        column_details = await data_worker.get_columns_details(df_type_infer, column_types)

        cleaned_data = data_helpers.clean_data(column_details)
        return JSONResponse(content=cleaned_data)

    except HTTPException:
        raise
    except Exception as e:
        # Log the actual error for debugging (but don't expose to user)
        import traceback
        print(f"Error in get_file_columns_info: {str(e)}")
        print(traceback.format_exc())
        raise internal_server_error(
            message="Failed to retrieve column information. Please try again later."
        )

@data_router.get("/users/files/{file_id}/columns")
async def get_file_columns(
    file_id: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        columns = await DataService.get_columns(user_id=current_user.id, file_id=file_id, db=db)
        return JSONResponse(content=columns)
    except Exception as e:
        raise internal_server_error(
            message="Failed to retrieve file columns. Please try again later."
        )

@data_router.get("/users/files/{file_id}/data-info")
async def get_file_data_info(
    file_id: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive data information including statistics, data quality metrics,
    and overview information for the dataset.
    """
    try:
        # Get the DataFrame
        df = await DataService.get_data_as_dataframe(user_id=current_user.id, file_id=file_id, db=db)
        
        # Basic dataset information
        total_rows = len(df)
        total_columns = len(df.columns)
        
        # Memory usage estimation
        memory_usage = df.memory_usage(deep=True).sum()
        memory_usage_mb = memory_usage / (1024 * 1024)
        
        # Data types summary
        dtype_counts = df.dtypes.value_counts().to_dict()
        dtype_summary = {str(k): int(v) for k, v in dtype_counts.items()}
        
        # Missing data analysis
        missing_data = df.isnull().sum()
        missing_percentage = (missing_data / total_rows * 100).round(2)
        
        missing_summary = {
            "total_missing_values": int(missing_data.sum()),
            "columns_with_missing": int((missing_data > 0).sum()),
            "missing_percentage": round((missing_data.sum() / (total_rows * total_columns) * 100), 2),
            "columns": {}
        }
        
        # Add missing data per column
        for col in df.columns:
            if missing_data[col] > 0:
                missing_summary["columns"][col] = {
                    "missing_count": int(missing_data[col]),
                    "missing_percentage": float(missing_percentage[col])
                }
        
        # Duplicate rows analysis
        duplicate_rows = df.duplicated().sum()
        duplicate_percentage = round((duplicate_rows / total_rows * 100), 2) if total_rows > 0 else 0
        
        # Statistical summary for numeric columns
        numeric_columns = df.select_dtypes(include=['number']).columns.tolist()
        numeric_summary = {}
        
        if numeric_columns:
            numeric_stats = df[numeric_columns].describe()
            for col in numeric_columns:
                numeric_summary[col] = {
                    "count": int(numeric_stats.loc['count', col]),
                    "mean": round(float(numeric_stats.loc['mean', col]), 4),
                    "std": round(float(numeric_stats.loc['std', col]), 4),
                    "min": round(float(numeric_stats.loc['min', col]), 4),
                    "max": round(float(numeric_stats.loc['max', col]), 4),
                    "median": round(float(df[col].median()), 4),
                    "q25": round(float(numeric_stats.loc['25%', col]), 4),
                    "q75": round(float(numeric_stats.loc['75%', col]), 4)
                }
        
        # Categorical columns analysis
        categorical_columns = df.select_dtypes(include=['object', 'category']).columns.tolist()
        categorical_summary = {}
        
        for col in categorical_columns:
            unique_count = df[col].nunique()
            most_common = df[col].mode()
            most_common_value = most_common.iloc[0] if len(most_common) > 0 else None
            most_common_count = int(df[col].value_counts().iloc[0]) if len(df[col].value_counts()) > 0 else 0
            
            categorical_summary[col] = {
                "unique_count": int(unique_count),
                "most_common_value": most_common_value,
                "most_common_count": most_common_count,
                "most_common_percentage": round((most_common_count / total_rows * 100), 2) if total_rows > 0 else 0
            }
        
        # Date columns analysis
        date_columns = df.select_dtypes(include=['datetime64']).columns.tolist()
        date_summary = {}
        
        for col in date_columns:
            date_min = df[col].min()
            date_max = df[col].max()
            date_range_days = (date_max - date_min).days if pd.notna(date_min) and pd.notna(date_max) else None
            
            date_summary[col] = {
                "earliest_date": date_min.isoformat() if pd.notna(date_min) else None,
                "latest_date": date_max.isoformat() if pd.notna(date_max) else None,
                "date_range_days": date_range_days
            }
        
        # Data quality score (simple heuristic)
        quality_score = 100
        quality_score -= missing_summary["missing_percentage"]  # Deduct for missing data
        quality_score -= duplicate_percentage  # Deduct for duplicates
        quality_score = max(0, min(100, quality_score))  # Keep between 0-100
        
        # Prepare comprehensive response
        data_info = {
            "dataset_overview": {
                "total_rows": total_rows,
                "total_columns": total_columns,
                "memory_usage_mb": round(memory_usage_mb, 2),
                "data_quality_score": round(quality_score, 1)
            },
            "data_types": {
                "summary": dtype_summary,
                "numeric_columns": numeric_columns,
                "categorical_columns": categorical_columns,
                "date_columns": date_columns
            },
            "missing_data": missing_summary,
            "duplicates": {
                "duplicate_rows": int(duplicate_rows),
                "duplicate_percentage": duplicate_percentage
            },
            "statistics": {
                "numeric_summary": numeric_summary,
                "categorical_summary": categorical_summary,
                "date_summary": date_summary
            },
            "column_names": df.columns.tolist()
        }
        
        # Clean the data to handle NaN, inf values
        cleaned_data_info = data_helpers.clean_data(data_info)
        
        return JSONResponse(content=cleaned_data_info)
        
    except Exception as e:
        raise internal_server_error(
            message="Failed to retrieve data information. Please try again later."
        )

@data_router.put("/users/files/{file_id}")
async def update_file(
    file_id: str, 
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Security: Validate file size (max 100MB)
        MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB in bytes
        if file.size and file.size > MAX_FILE_SIZE:
            raise bad_request_error(
                error_code="FILE_TOO_LARGE",
                message=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024 * 1024):.0f}MB.",
                extra={"max_size_mb": MAX_FILE_SIZE / (1024 * 1024), "file_size_mb": round(file.size / (1024 * 1024), 2)}
            )
        
        # Security: Validate file type
        file_extension = file.filename.split('.')[-1].lower()
        allowed_extensions = ['csv', 'xlsx', 'xls', 'json']
        
        if file_extension not in allowed_extensions:
            raise bad_request_error(
                error_code="INVALID_FILE_TYPE",
                message="Only CSV, Excel, and JSON files are allowed.",
                extra={"allowed_types": allowed_extensions}
            )
            
        user_file = await DataService.get_data_by_ids(user_id=current_user.id, file_id=file_id, db=db)

        if not user_file:
            raise not_found_error(
                message="File not found",
                extra={"file_id": file_id}
            )
        
        old_file_path = user_file.file_path
        
        # Try to delete the old physical file if it exists
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except OSError as e:
                # Log the error but continue with the update
                print(f"Warning: Could not delete old file {old_file_path}: {e}")

        # Use the new unified storage system
        new_file_location = StorageManager.get_file_path(
            user_email=current_user.email,
            filename=file.filename,
            file_type=file_extension,
            is_synthetic=False
        )
    
        with open(new_file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        user_file.file_path = new_file_location
        db.commit()

        return {"status": "success", "message": "File updated", "filename": file.filename, "new_location": new_file_location}
    except HTTPException:
        raise
    except Exception as e:
        raise internal_server_error(
            message="Failed to update file. Please try again later."
        )

@data_router.delete("/users/files/{file_id}")
async def delete_file(
    file_id: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:    
        user_file = await DataService.get_data_by_ids(user_id=current_user.id, file_id=file_id, db=db)

        if not user_file:
            raise not_found_error(
                message="File not found",
                extra={"file_id": file_id}
            )
        
        old_file_path = user_file.file_path
        
        # Try to delete the physical file if it exists
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except OSError as e:
                # Log the error but continue with database cleanup
                print(f"Warning: Could not delete physical file {old_file_path}: {e}")
        
        # Always remove from database, regardless of whether physical file exists
        # This handles cases where files were manually deleted from disk
        db.delete(user_file)
        db.commit()
        
        return {
            "status": "success", 
            "message": "File deleted from database" + 
                      (" and disk" if os.path.exists(old_file_path) else " (file was already missing from disk)")
        }
    except Exception as e:
        raise internal_server_error(
            message="Failed to delete file. Please try again later."
        )

@data_router.delete("/users/files-not-exists")
async def delete_files_not_exist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:    
        files = await DataService.get_all_user_data(user_id=current_user.id, db=db)
        files_to_delete = [f for f in files if not os.path.exists(f.file_path)]

        if not files_to_delete:
            raise not_found_error(
                message="No files with missing paths found."
            )
        
        for file in files_to_delete:
            db.delete(file)
        
        db.commit()
        return {"status": "success", "message": "Files with missing paths deleted"}
    except Exception as e:
        raise internal_server_error(
            message="Failed to delete files with missing paths. Please try again later."
        )

class DownloadFormat(str, Enum):
    CSV = "csv"
    EXCEL = "excel"
    JSON = "json"

@data_router.get("/users/files/{file_id}/download")
async def download_file(
    file_id: str,
    format: DownloadFormat,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Try to get the file by ID first (UUID)
        try:
            user_file = await DataService.get_data_by_ids(user_id=current_user.id, file_id=file_id, db=db)
        except:
            # If that fails, try to get by filename
            user_file = db.query(UserData).filter(
                UserData.user_id == current_user.id,
                UserData.file_name == file_id
            ).first()
            
        if not user_file:
            raise not_found_error(
                message="File not found",
                extra={"file_id": file_id}
            )
        
        # Get the data as DataFrame
        df = await DataService.get_data_as_dataframe(user_id=current_user.id, file_id=str(user_file.id), db=db)
        
        # Create a temporary file with the new format
        base_filename = os.path.splitext(user_file.file_name)[0]
        temp_dir = StorageManager.get_uploaded_files_directory(current_user.email)
        temp_file_path = os.path.join(temp_dir, f"temp_{current_user.id}")
        
        if format == DownloadFormat.CSV:
            output_path = f"{temp_file_path}.csv"
            df.to_csv(output_path, index=False)
            media_type = "text/csv"
            filename = f"{base_filename}.csv"
        elif format == DownloadFormat.EXCEL:
            output_path = f"{temp_file_path}.xlsx"
            df.to_excel(output_path, index=False)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"{base_filename}.xlsx"
        elif format == DownloadFormat.JSON:
            output_path = f"{temp_file_path}.json"
            df.to_json(output_path, orient="records", indent=2)
            media_type = "application/json"
            filename = f"{base_filename}.json"
        
        # Return the file
        response = FileResponse(
            path=output_path,
            filename=filename,
            media_type=media_type
        )
        
        # Add cleanup callback to remove the temporary file after sending
        def cleanup():
            try:
                if os.path.exists(output_path):
                    os.remove(output_path)
            except Exception as e:
                print(f"Error cleaning up temporary file: {e}")
        
        response.background = cleanup
        return response
        
    except Exception as e:
        raise internal_server_error(
            message="Failed to download file. Please try again later."
        ) 