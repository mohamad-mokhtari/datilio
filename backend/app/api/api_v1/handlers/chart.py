from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
import gzip
import json

from app.schemas.chart_schemas import (
    UnifiedDataIn,
    UnifiedDataOut,
    FilteredDataIn,
    FilteredDataOut
)
from app.services.data_service import DataService
from app.models.user_model import User
from app.api.deps.user_deps import get_current_user
from app.core.db_setup import get_db
from app.helpers import data_helpers
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)


chart_router = APIRouter()


@chart_router.post("/unified-data", summary="Unified Data Endpoint", response_model=UnifiedDataOut)
async def get_unified_data(
    data: UnifiedDataIn, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unified data endpoint that returns specified columns data.
    User must specify which columns they want.
    Automatically samples data if it exceeds max_points to ensure optimal frontend performance.
    """
    try:
        # 1️⃣ Load raw data
        df = await DataService.get_data_as_dataframe(str(current_user.id), str(data.file_id), db)
        
        # 2️⃣ Validate requested columns exist
        missing_columns = [col for col in data.columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(status_code=400, detail=f"Columns not found in data: {', '.join(missing_columns)}")
        
        # 3️⃣ Filter to requested columns only
        df_filtered = df[data.columns]
        
        # 4️⃣ Apply intelligent sampling if needed
        df_sampled, sampling_metadata = data_helpers.sample_dataframe_for_plotting(
            df_filtered, 
            max_points=data.max_points,
            method=data.sampling_method,
            drop_empty_rows=data.drop_empty_rows
        )
        
        # 5️⃣ Convert to list of dictionaries
        data_list = df_sampled.to_dict(orient='records')
        
        # 6️⃣ Calculate compressed size
        json_str = json.dumps(data_list)
        compressed = gzip.compress(json_str.encode())
        size_kb = len(compressed) / 1024
        
        # 7️⃣ Clean and return data
        cleaned_data = data_helpers.clean_data(data_list)
        return UnifiedDataOut(
            data=cleaned_data,
            columns=data.columns,
            size_kb=size_kb,
            sampling=sampling_metadata
        )
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Data file not found")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@chart_router.post("/filtered-data", summary="Filtered Data Endpoint", response_model=FilteredDataOut)
async def get_filtered_data(
    data: FilteredDataIn, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Filtered data endpoint that applies a python code snippet filter and returns specified columns data.
    The python_code_snippet should come from the filter_worker.execute_query() method.
    User must specify which columns they want.
    Automatically samples data if it exceeds max_points to ensure optimal frontend performance.
    """
    try:
        # 1️⃣ Load raw data
        df = await DataService.get_data_as_dataframe(str(current_user.id), str(data.file_id), db)
        
        # 2️⃣ Validate requested columns exist
        missing_columns = [col for col in data.columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(status_code=400, detail=f"Columns not found in data: {', '.join(missing_columns)}")
        
        # 3️⃣ Apply the filter using the python code snippet
        # The python_code_snippet should be something like: "self.df[self.df['column'] > 10]"
        # We need to replace 'self.df' with our actual dataframe variable name
        filtered_expression = data.python_code_snippet.replace('self.df', 'df')
        
        # 4️⃣ Execute the filter
        filtered_df = eval(filtered_expression)
        
        # 5️⃣ Get total count of filtered records (before sampling)
        total_filtered_records = len(filtered_df)
        
        # 6️⃣ Filter to requested columns only
        df_filtered = filtered_df[data.columns]
        
        # 7️⃣ Apply intelligent sampling if needed
        df_sampled, sampling_metadata = data_helpers.sample_dataframe_for_plotting(
            df_filtered, 
            max_points=data.max_points,
            method=data.sampling_method,
            drop_empty_rows=data.drop_empty_rows
        )
        
        # 8️⃣ Convert to list of dictionaries
        data_list = df_sampled.to_dict(orient='records')
        
        # 9️⃣ Calculate compressed size
        json_str = json.dumps(data_list)
        compressed = gzip.compress(json_str.encode())
        size_kb = len(compressed) / 1024
        
        # 🔟 Clean and return data
        cleaned_data = data_helpers.clean_data(data_list)
        return FilteredDataOut(
            data=cleaned_data,
            columns=data.columns,
            size_kb=size_kb,
            total_filtered_records=total_filtered_records,
            sampling=sampling_metadata
        )
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Data file not found")
    except NameError as e:
        raise HTTPException(status_code=400, detail=f"Invalid python code snippet: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
