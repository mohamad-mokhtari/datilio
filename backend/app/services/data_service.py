from typing import Optional, List, Tuple, Dict
from sqlalchemy.orm import Session
import pandas as pd
import json
from fastapi import HTTPException

from app.models.user_data_model import UserData, FileType, DataSource
from app.models.user_model import User
from app.models.user_lists import UserList, ListItem
from app.helpers import data_helpers
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)


class DataService:
    @staticmethod
    async def get_data_by_ids(user_id: str, file_id: str, db: Session) -> Optional[UserData]:
        data = db.query(UserData).filter(
            UserData.user_id == user_id,
            UserData.id == file_id
        ).first()
        if not data:
            raise HTTPException(status_code=404, detail=f"{data.file_type.value.upper()} file not found")
        return data

    @staticmethod
    async def get_all_user_data(user_id: str, db: Session) -> List[UserData]:
        return db.query(UserData).filter(UserData.user_id == user_id).all()

    @staticmethod
    async def get_data_by_type(user_id: str, file_type: FileType, db: Session) -> List[UserData]:
        return db.query(UserData).filter(
            UserData.user_id == user_id,
            UserData.file_type == file_type
        ).all()

    @staticmethod
    async def get_data_by_source(user_id: str, source: DataSource, db: Session) -> List[UserData]:
        return db.query(UserData).filter(
            UserData.user_id == user_id,
            UserData.source == source
        ).all()

    @staticmethod
    async def create_data(
        user_id: str,
        file_name: str,
        file_type: FileType,
        file_path: str,
        file_size: Optional[int] = None,
        source: DataSource = DataSource.UPLOADED,
        db: Session = None
    ) -> UserData:
        data = UserData(
            user_id=user_id,
            file_name=file_name,
            file_type=file_type,
            file_path=file_path,
            file_size=file_size,
            source=source
        )
        db.add(data)
        db.commit()
        db.refresh(data)
        return data

    @staticmethod
    async def delete_data(user_id: str, file_id: str, db: Session) -> bool:
        data = await DataService.get_data_by_ids(user_id, file_id, db)
        if data:
            db.delete(data)
            db.commit()
            return True
        return False

    @staticmethod
    async def update_file_path_exists(user_id: str, file_id: str, exists: bool, db: Session) -> Optional[UserData]:
        data = await DataService.get_data_by_ids(user_id, file_id, db)
        if data:
            data.file_path_exists = exists
            db.commit()
            db.refresh(data)
            return data
        return None

    @staticmethod
    async def get_data_as_dataframe(user_id: str, file_id: str, db: Session) -> pd.DataFrame:
        """Get data as pandas DataFrame based on file type"""
        data = await DataService.get_data_by_ids(user_id, file_id, db)
        
        if data.file_type == FileType.CSV:
            return pd.read_csv(data.file_path)
        elif data.file_type == FileType.EXCEL:
            return pd.read_excel(data.file_path)
        elif data.file_type == FileType.JSON:
            with open(data.file_path, 'r') as f:
                json_data = json.load(f)
            if isinstance(json_data, list):
                return pd.DataFrame(json_data)
            elif isinstance(json_data, dict):
                return pd.DataFrame([json_data])
            else:
                raise HTTPException(status_code=400, detail="Invalid JSON structure")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")

    @staticmethod
    async def get_columns_type(user_id: str, file_id: str, db: Session) -> Tuple[pd.DataFrame, Dict[str, str]]:
        """Get column types for the data file with enhanced datetime/date/time detection"""
        data = await DataService.get_data_by_ids(user_id, file_id, db)

        # Get DataFrame based on file type
        if data.file_type == FileType.CSV:
            df_type_infer = pd.read_csv(data.file_path)
        elif data.file_type == FileType.EXCEL:
            df_type_infer = pd.read_excel(data.file_path)
        elif data.file_type == FileType.JSON:
            with open(data.file_path, 'r') as f:
                json_data = json.load(f)
            if isinstance(json_data, list):
                df_type_infer = pd.DataFrame(json_data)
            elif isinstance(json_data, dict):
                df_type_infer = pd.DataFrame([json_data])
            else:
                raise HTTPException(status_code=400, detail="Invalid JSON structure")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")

        # Use a sample for type inference (max 1000 rows for performance)
        sample_size = min(len(df_type_infer), 1000)
        df_sample = df_type_infer.head(sample_size)

        # Detect column types using the enhanced detection function
        column_types = data_helpers.detect_column_types(df_sample, threshold=0.5)

        return df_type_infer, column_types

    @staticmethod
    async def get_columns(user_id: str, file_id: str, db: Session) -> List[Dict[str, str]]:
        """Get columns with their types for the data file"""
        data = await DataService.get_data_by_ids(user_id, file_id, db)
        
        # Get the columns and their types
        df_type_infer, column_types = await DataService.get_columns_type(user_id, file_id, db)
        
        # Get the columns names
        columns_names = df_type_infer.columns.tolist()

        # Get the columns types
        columns_types = [column_types[column_name] for column_name in columns_names]
        
        # Create a list of dictionaries with column names and types
        return [{"name": column_name, "type": column_type} 
                for column_name, column_type in zip(columns_names, columns_types)]

    @staticmethod
    async def get_user_list_items(user_id: str, list_name: str, db: Session) -> List[str]:
        """
        Get items from a user's list by list name
        """
        # Find the user list by name and user_id
        user_list = db.query(UserList).filter(
            UserList.user_id == user_id,
            UserList.name == list_name
        ).first()
        
        if not user_list:
            raise HTTPException(
                status_code=404, 
                detail=f"List '{list_name}' not found in your lists"
            )
        
        # Get all items from the list
        items = db.query(ListItem).filter(
            ListItem.list_id == user_list.id
        ).all()
        
        # Extract the values
        return [item.value for item in items] 