from pydantic import BaseModel, validator
from typing import List, Union, Literal

# Define supported list types
ListType = Literal["numeric", "string"]

class ListItemCreate(BaseModel):
    value: str

class UserListCreate(BaseModel):
    name: str
    items: List[Union[str, float]]  # Allow both strings and numerics

    @validator("items", each_item=True)
    def validate_items(cls, item):
        if not isinstance(item, (int, float, str)):
            raise ValueError(f"Invalid item value: {item}")
        return item