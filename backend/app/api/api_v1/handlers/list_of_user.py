from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from sqlalchemy.orm import Session
from app.schemas.list_schemas import UserListCreate
from app.models.user_lists import UserList, ListItem
from app.core.db_setup import get_db
from app.models.user_model import User
from app.api.deps.user_deps import get_current_user
from app.services.usage_service import UsageService
from datetime import date, datetime
from typing import Union
import csv
import io
import json
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)

list_router = APIRouter()


@list_router.post("/users/lists/")
async def create_user_list(
    list_data: UserListCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing_list = (
        db.query(UserList)
        .filter(UserList.user_id == current_user.id, UserList.name == list_data.name)
        .first()
    )
    if existing_list:
        raise HTTPException(
            status_code=400, detail="List with this name already exists for the user"
        )

    # Check usage limits before creating list
    if not UsageService.check_usage_limit(db, str(current_user.id), "custom_lists", 1):
        # Get current usage to show user helpful info
        from app.services.usage_service import UsageService
        usage_summary = UsageService.get_usage_summary(db, str(current_user.id))
        current_usage = usage_summary.current_month.get("custom_lists", 0)
        limit = usage_summary.limits.get("custom_lists", 0)
        
        raise HTTPException(
            status_code=400,
            detail=f"Custom list limit exceeded. You have {int(current_usage)} custom lists and your plan allows {int(limit)}. Please upgrade your plan to create more lists."
        )

    user_list = UserList(
        user_id=current_user.id, name=list_data.name
    )
    db.add(user_list)
    db.commit()
    db.refresh(user_list)

    for item_value in list_data.items:
        list_item = ListItem(list_id=user_list.id, value=item_value)
        db.add(list_item)

    db.commit()

    # Track usage after successful list creation
    UsageService.track_usage(
        db=db,
        user_id=str(current_user.id),
        feature="custom_lists",
        amount=1,
        description=f"Created custom list: {list_data.name}"
    )

    return {"status": "success", "list_id": user_list.id}


@list_router.post(
    "/users/lists/upload/",
    summary="Upload a list from CSV or JSON file",
    description="Upload a CSV or JSON file containing a list of items. CSV must have a header row with list name."
)
async def upload_user_list(
    file: UploadFile = File(..., description="CSV or JSON file containing list data"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content_type = file.content_type
    file_content = await file.read()
    
    if content_type == 'application/json':
        try:
            data = json.loads(file_content.decode('utf-8'))
            
            # Check for unexpected fields in JSON
            allowed_fields = {"list_name", "values"}
            unexpected_fields = set(data.keys()) - allowed_fields
            if unexpected_fields:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unexpected fields in JSON: {', '.join(unexpected_fields)}. Only 'list_name' and 'values' are allowed."
                )
            
            list_name = data.get("list_name")
            if not list_name:
                raise HTTPException(status_code=400, detail="Missing list_name in JSON file")
            values = data.get("values", [])
            if not values or not isinstance(values, list):
                raise HTTPException(status_code=400, detail="Values must be a non-empty list")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON file")
    
    elif content_type == 'text/csv':
        try:
            csv_reader = csv.reader(io.StringIO(file_content.decode('utf-8')))
            rows = list(csv_reader)
            if len(rows) < 2:
                raise HTTPException(status_code=400, detail="CSV must have at least two rows (header and one value)")
            
            # Check if first row contains only one column
            if len(rows[0]) != 1:
                raise HTTPException(status_code=400, detail="CSV header must have only one column for list name")
            
            list_name = rows[0][0]
            
            # Extract values from subsequent rows (first column only)
            values = []
            for row in rows[1:]:
                if len(row) > 0:  # Only add non-empty rows
                    values.append(row[0])
            
            if not values:
                raise HTTPException(status_code=400, detail="CSV must contain at least one value")
                
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing CSV file: {str(e)}")
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a JSON or CSV file")

    # Check if a list with this name already exists for the user
    existing_list = (
        db.query(UserList)
        .filter(UserList.user_id == current_user.id, UserList.name == list_name)
        .first()
    )
    if existing_list:
        raise HTTPException(
            status_code=400, detail="List with this name already exists for the user"
        )

    # Create the new list
    user_list = UserList(
        user_id=current_user.id, name=list_name
    )
    db.add(user_list)
    db.commit()
    db.refresh(user_list)

    # Add items to the list
    for item_value in values:
        list_item = ListItem(list_id=user_list.id, value=item_value)
        db.add(list_item)

    db.commit()

    return {"status": "success", "list_id": user_list.id, "item_count": len(values)}


@list_router.get("/users/lists/")
async def get_user_lists(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    user_lists = db.query(UserList).filter(UserList.user_id == current_user.id).all()
    return user_lists


@list_router.get("/users/lists/{list_id}/items/")
async def get_list_items(
    list_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_list = (
        db.query(UserList)
        .filter(UserList.id == list_id, UserList.user_id == current_user.id)
        .first()
    )
    if not user_list:
        raise HTTPException(status_code=404, detail="List not found")

    items = db.query(ListItem).filter(ListItem.list_id == list_id).all()
    return items


@list_router.post("/users/lists/{list_id}/items/")
async def add_item_to_list(
    list_id: str,
    item_value: Union[str, float],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_list = (
        db.query(UserList)
        .filter(UserList.id == list_id, UserList.user_id == current_user.id)
        .first()
    )
    if not user_list:
        raise HTTPException(status_code=404, detail="List not found")

    list_item = ListItem(list_id=list_id, value=item_value)
    db.add(list_item)
    db.commit()

    return {"status": "success", "item_id": list_item.id}


@list_router.delete("/users/lists/{list_id}/items/{item_id}/")
async def remove_item_from_list(
    list_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_list = (
        db.query(UserList)
        .filter(UserList.id == list_id, UserList.user_id == current_user.id)
        .first()
    )
    if not user_list:
        raise HTTPException(status_code=404, detail="List not found")

    list_item = (
        db.query(ListItem)
        .filter(ListItem.id == item_id, ListItem.list_id == list_id)
        .first()
    )
    if not list_item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(list_item)
    db.commit()

    return {"status": "success", "message": "Item removed"}


@list_router.delete("/users/lists/{list_id}/")
async def remove_user_list(
    list_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_list = (
        db.query(UserList)
        .filter(UserList.id == list_id, UserList.user_id == current_user.id)
        .first()
    )
    if not user_list:
        raise HTTPException(status_code=404, detail="List not found")

    db.delete(user_list)
    db.commit()

    return {"status": "success", "message": "List removed"}
