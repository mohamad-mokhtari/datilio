from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.schemas.statistical_schemas import StatAnlysisPerColIn, StatAnlysisPerColOut
from app.services.statistical_services import StatitisicalService
from app.models.user_model import User
from app.api.deps.user_deps import get_current_user
from app.core.db_setup import get_db


statistical_router = APIRouter()


@statistical_router.post("/stat_analysis_per_col", summary="Statistical analysis per column data", response_model=StatAnlysisPerColOut)
async def stat_analysis_per_col(data: StatAnlysisPerColIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        res = await StatitisicalService.stat_analysis_per_col_service(data= data, user_id= current_user.id, db= db)
        
        # Return the result wrapped in the Pydantic model
        return StatAnlysisPerColOut(result=res)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))