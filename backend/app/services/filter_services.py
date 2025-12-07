from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session

from app.schemas.filter_schemas import FilterIn, FilterOut
from app.schemas.user_schemas import UserAuth
from app.models.user_model import User
from app.core.security import get_password, verify_password
from app.workers.filter_worker import FilterWorker


class FilterService:
    @staticmethod
    async def filter_data(data: FilterIn, user_id: UUID, db: Session):

        filter_worker_obj = FilterWorker(
            pseudo_query=data.pseudo_query, 
            user_id=user_id, 
            file_id=data.file_id, 
            db=db,
            offset=data.offset,
            limit=data.limit
        )

        res = await filter_worker_obj.execute_query()
        return res

    @staticmethod
    async def filter_data_2(data: FilterIn, user_id: UUID, db: Session):

        filter_worker_obj = FilterWorker(
            pseudo_query=data.pseudo_query, 
            user_id=user_id, 
            file_id=data.file_id, 
            db=db,
            offset=data.offset,
            limit=data.limit
        )

        res = await filter_worker_obj.execute_query_2()
        return res


    # @staticmethod
    # async def get_user_by_email(email: str, db: Session) -> Optional[User]:
    #     return db.query(User).filter(User.email == email).first()

    # @staticmethod
    # async def get_user_by_id(id: UUID, db: Session) -> Optional[User]:
    #     return db.query(User).filter(User.id == id).first()

    # @staticmethod
    # async def authenticate(email: str, password: str, db: Session) -> Optional[User]:
    #     user = await UserService.get_user_by_email(email, db)
    #     if not user or not verify_password(password=password, hashed_pass=user.hashed_password):
    #         return None
    #     return user