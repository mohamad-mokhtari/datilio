from fastapi import HTTPException
import pandas as pd

from app.schemas.statistical_schemas import NumericColumnStats, ColumnStats, StringColumnStats
from app.workers import data_worker
from app.services.data_service import DataService
from app.helpers import data_helpers
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)


class StatisticalWorker():

    def __init__(self, dataframe, column_name, user_id, file_id, db):
            self.dataframe = dataframe
            self.column_name = column_name
            self.user_id = user_id
            self.file_id = file_id
            self.db = db

    async def get_statistical_analysis_data(self):
        df_type_infer, column_types =await DataService.get_columns_type(user_id= self.user_id, file_id= self.file_id, db=self.db)
        column_details = await data_worker.get_columns_details(df_type_infer, column_types)
        cleaned_data:list = data_helpers.clean_data(column_details)

        column_data = self.dataframe[self.column_name]

        if any(item['name'] == self.column_name and item['dtype'] in ['integer', 'float'] for item in cleaned_data):
            numeric_stats = NumericColumnStats(
                column=self.column_name,
                mean=column_data.mean(),
                median=column_data.median(),
                std_dev=column_data.std(),
                variance=column_data.var(),
                skewness=column_data.skew(),
                kurtosis=column_data.kurt(),
                min=column_data.min(),
                max=column_data.max(),
                percentiles=column_data.quantile([0.25, 0.5, 0.75]).to_dict()
            )
            return ColumnStats(numeric_stats=numeric_stats)
        
        elif any(item['name'] == self.column_name and item['dtype'] in ['string'] for item in cleaned_data):
            string_stats = StringColumnStats(
                column=self.column_name,
                unique_values=column_data.nunique(),
                most_frequent=column_data.mode().iloc[0],
                frequency=column_data.value_counts().to_dict()
            )
            return ColumnStats(string_stats=string_stats)
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported column data type")