from sqlalchemy.orm import Session
import pandas as pd
from uuid import UUID

from app.schemas.statistical_schemas import StatAnlysisPerColIn, StatAnlysisPerColOut
from app.workers.filter_worker import FilterWorker
from app.workers.statistical_worker import StatisticalWorker
from app.services.data_service import DataService


class StatitisicalService:
    @staticmethod
    async def stat_analysis_per_col_service(data: StatAnlysisPerColIn, user_id: UUID, db: Session):
        df = pd.DataFrame
        if data.pseudo_query and data.pseudo_query['query']:
            filter_worker_obj = FilterWorker(pseudo_query= data.pseudo_query, user_id= user_id, file_id= data.file_id, db=db)
            df = await filter_worker_obj.execute_query()
        else:
            df = await DataService.get_data_as_dataframe(user_id= str(user_id), file_id= str(data.file_id), db= db)

        statistical_worker_obj = StatisticalWorker(dataframe= df, column_name=data.column_name, user_id= user_id, file_id= data.file_id, db=db)
        res = await statistical_worker_obj.get_statistical_analysis_data()

        return res