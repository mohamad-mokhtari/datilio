from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.schemas.filter_schemas import FilterIn, FilterOut
from app.services.filter_services import FilterService
from app.models.user_model import User
from app.api.deps.user_deps import get_current_user
from app.core.db_setup import get_db
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)


filter_router = APIRouter()


@filter_router.post("/simple-filter", summary="Filter data", response_model=FilterOut)
async def filter_data(data: FilterIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        filter_result = await FilterService.filter_data(data=data, user_id=current_user.id, db=db)
        
        # Convert DataFrame to dictionary
        result_dict = filter_result['data'].to_dict(orient="records")
        
        # Return the result wrapped in the Pydantic model with pagination metadata
        return FilterOut(
            result=result_dict,
            total_count=filter_result['total_count'],
            has_more=filter_result['has_more'],
            offset=data.offset,
            limit=data.limit,
            python_code_snippet=filter_result['python_code_snippet']
        )
    except Exception as e:
        raise bad_request_error(
            error_code="FILTER_ERROR",
            message="Failed to filter data. Please check your query and try again.",
            extra={"error_details": str(e)}
        )