from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models.file_rules_model import Rule as RuleModel
from app.api.deps.user_deps import get_current_user
from app.core.db_setup import get_db
from app.models.user_data_model import UserData
from uuid import UUID
from app.models.user_model import User
from app.services.filter_services import FilterService
from app.schemas.filter_schemas import FilterIn
from app.schemas.rule_schemas import RuleCreate, RuleUpdate, Rule as RuleResponse
from app.services.usage_service import UsageService
import pandas as pd
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)


rule_router = APIRouter()

@rule_router.post("/users/files/{file_id}/rules", response_model=RuleResponse)
async def create_rule(file_id: UUID, rule: RuleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_file = db.query(UserData).filter(UserData.id == file_id, UserData.user_id == current_user.id).first()
    if not user_file:
        raise not_found_error(
            message="User file not found",
            extra={"file_id": str(file_id)}
        )

    # Check usage limits before creating rule
    if not UsageService.check_usage_limit(db, str(current_user.id), "rules_used", 1):
        # Get current usage to show user helpful info
        usage_summary = UsageService.get_usage_summary(db, str(current_user.id))
        current_usage = usage_summary.current_month.get("rules_used", 0)
        limit = usage_summary.limits.get("rules_used", 0)
        
        raise bad_request_error(
            error_code="QUOTA_EXCEEDED",
            message=f"Rule limit exceeded. You have {int(current_usage)} active rules and your plan allows {int(limit)}. Please upgrade your plan to create more rules.",
            extra={
                "limit_type": "rules_used",
                "current_usage": int(current_usage),
                "monthly_limit": int(limit),
                "remaining": 0
            }
        )

    new_rule = RuleModel(**rule.dict(), user_data_id=user_file.id)
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    
    # Track usage after successful rule creation
    UsageService.track_usage(
        db=db,
        user_id=str(current_user.id),
        feature="rules_used",
        amount=1,
        description=f"Created rule: {rule.rule_name}"
    )
    
    return new_rule

@rule_router.get("/users/files/{file_id}/rules", response_model=list[RuleResponse])
async def get_rules(file_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_file = db.query(UserData).filter(UserData.id == file_id, UserData.user_id == current_user.id).first()
    if not user_file:
        raise not_found_error(
            message="User file not found",
            extra={"file_id": str(file_id)}
        )

    rules = db.query(RuleModel).filter(RuleModel.user_data_id == user_file.id).all()
    return rules

@rule_router.put("/users/files/{file_id}/rules/{rule_id}", response_model=RuleResponse)
async def update_rule(file_id: UUID, rule_id: UUID, rule: RuleUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_file = db.query(UserData).filter(UserData.id == file_id, UserData.user_id == current_user.id).first()
    if not user_file:
        raise not_found_error(
            message="User file not found",
            extra={"file_id": str(file_id)}
        )

    existing_rule = db.query(RuleModel).filter(RuleModel.id == rule_id, RuleModel.user_data_id == user_file.id).first()
    if not existing_rule:
        raise not_found_error(
            message="Rule not found",
            extra={"rule_id": str(rule_id), "file_id": str(file_id)}
        )

    existing_rule.rule_name = rule.rule_name
    existing_rule.rule_definition = rule.rule_definition
    existing_rule.query = rule.query
    db.commit()
    db.refresh(existing_rule)
    return existing_rule

@rule_router.delete("/users/files/{file_id}/rules/{rule_id}")
async def delete_rule(file_id: UUID, rule_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_file = db.query(UserData).filter(UserData.id == file_id, UserData.user_id == current_user.id).first()
    if not user_file:
        raise not_found_error(
            message="User file not found",
            extra={"file_id": str(file_id)}
        )

    rule = db.query(RuleModel).filter(RuleModel.id == rule_id, RuleModel.user_data_id == user_file.id).first()
    if not rule:
        raise not_found_error(
            message="Rule not found",
            extra={"rule_id": str(rule_id), "file_id": str(file_id)}
        )

    db.delete(rule)
    db.commit()
    return {"detail": "Rule deleted successfully"}

@rule_router.post("/users/files/{file_id}/rules/apply")
async def apply_rules(
    file_id: UUID, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db),
    offset: int = 0,
    limit: int = 100
):
    rules = db.query(RuleModel).filter(RuleModel.user_data_id == file_id, RuleModel.is_active == True).all()
    user_file = db.query(UserData).filter(UserData.id == file_id, UserData.user_id == current_user.id).first()
    
    if not user_file:
        raise not_found_error(
            message="User file not found",
            extra={"file_id": str(file_id)}
        )
    
    if not rules:
        raise not_found_error(
            message="No active rules found",
            extra={"file_id": str(file_id)}
        )
    
    results = []
    total_records = 0
    
    for rule in rules:
        try:
            # Create a filter input based on the rule's query with pagination
            filter_in_data = FilterIn(
                pseudo_query=rule.query['pseudo_query'], 
                file_id=file_id,
                offset=offset,
                limit=limit
            )
            df_res = await FilterService.filter_data_2(data=filter_in_data, user_id=current_user.id, db=db)
            
            # Check if the rule was successfully applied
            if len(df_res['data']) > 0:
                # Get the actual DataFrame from the result
                df_data = df_res['data']
                
                # Clean the DataFrame to make it JSON serializable
                # Replace all problematic float values with None
                df_data = df_data.replace([float('inf'), float('-inf'), pd.NA], None)
                df_data = df_data.where(pd.notnull(df_data), None)
                
                # Convert to dict and clean any remaining non-serializable values
                data_dict = df_data.to_dict(orient='records')
                
                # Additional cleaning for any remaining non-JSON-serializable values
                def clean_value(value):
                    if pd.isna(value) or value in [float('inf'), float('-inf')]:
                        return None
                    elif isinstance(value, (int, float)) and (value != value):  # Check for NaN
                        return None
                    return value
                
                # Apply cleaning to all values in the data
                cleaned_data = []
                for record in data_dict:
                    cleaned_record = {k: clean_value(v) for k, v in record.items()}
                    cleaned_data.append(cleaned_record)
                
                # Update total records count
                total_records += len(df_data)
                
                results.append({
                    "rule_name": rule.rule_name,
                    "status": "success",
                    "applied_records": len(df_data),
                    "total_matching_records": df_res.get('total_count', len(df_data)),
                    "has_more": df_res.get('has_more', False),
                    "filtered_data": cleaned_data
                })
            else:
                results.append({
                    "rule_name": rule.rule_name,
                    "status": "no_records",
                    "message": "No records matched the rule.",
                    "applied_records": 0,
                    "total_matching_records": 0,
                    "has_more": False
                })
        except Exception as e:
            results.append({
                "rule_name": rule.rule_name,
                "status": "error",
                "message": str(e),
                "applied_records": 0,
                "total_matching_records": 0,
                "has_more": False
            })

    # Calculate overall pagination info
    has_more_overall = any(result.get('has_more', False) for result in results)
    
    return {
        "detail": "Rules applied successfully",
        "results": results,
        "pagination": {
            "total_records": total_records,
            "offset": offset,
            "limit": limit,
            "has_more": has_more_overall
        }
    }

@rule_router.get("/users/files/{file_id}/rules/{rule_id}/apply_per_rule")
async def apply_per_rule(
    file_id: UUID,
    rule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    offset: int = 0,
    limit: int = 100
):
    """
    Apply a specific rule and return only the data for that rule with pagination.
    """
    # Verify the user owns the file
    user_file = db.query(UserData).filter(UserData.id == file_id, UserData.user_id == current_user.id).first()
    if not user_file:
        raise not_found_error(
            message="User file not found",
            extra={"file_id": str(file_id)}
        )
    
    # Get the specific rule
    rule = db.query(RuleModel).filter(
        RuleModel.id == rule_id, 
        RuleModel.user_data_id == user_file.id
    ).first()
    
    if not rule:
        raise not_found_error(
            message="Rule not found",
            extra={"rule_id": str(rule_id), "file_id": str(file_id)}
        )
    
    # Check if rule is active
    if not rule.is_active:
        raise bad_request_error(
            error_code="RULE_INACTIVE",
            message="Rule is not active. Please activate the rule before applying it.",
            extra={"rule_id": str(rule_id), "is_active": rule.is_active}
        )
    
    try:
        # Create a filter input based on the rule's query with pagination
        filter_in_data = FilterIn(
            pseudo_query=rule.query['pseudo_query'], 
            file_id=file_id,
            offset=offset,
            limit=limit
        )
        df_res = await FilterService.filter_data_2(data=filter_in_data, user_id=current_user.id, db=db)
        
        # Check if the rule was successfully applied
        if len(df_res['data']) > 0:
            # Get the actual DataFrame from the result
            df_data = df_res['data']
            
            # Clean the DataFrame to make it JSON serializable
            # Replace all problematic float values with None
            df_data = df_data.replace([float('inf'), float('-inf'), pd.NA], None)
            df_data = df_data.where(pd.notnull(df_data), None)
            
            # Convert to dict and clean any remaining non-serializable values
            data_dict = df_data.to_dict(orient='records')
            
            # Additional cleaning for any remaining non-JSON-serializable values
            def clean_value(value):
                if pd.isna(value) or value in [float('inf'), float('-inf')]:
                    return None
                elif isinstance(value, (int, float)) and (value != value):  # Check for NaN
                    return None
                return value
            
            # Apply cleaning to all values in the data
            cleaned_data = []
            for record in data_dict:
                cleaned_record = {k: clean_value(v) for k, v in record.items()}
                cleaned_data.append(cleaned_record)
            
            return {
                "detail": "Rule applied successfully",
                "rule_info": {
                    "rule_id": str(rule.id),
                    "rule_name": rule.rule_name,
                    "rule_definition": rule.rule_definition,
                    "is_active": rule.is_active
                },
                "data": cleaned_data,
                "pagination": {
                    "total_records": df_res.get('total_count', len(df_data)),
                    "returned_records": len(df_data),
                    "offset": offset,
                    "limit": limit,
                    "has_more": df_res.get('has_more', False)
                }
            }
        else:
            return {
                "detail": "Rule applied successfully but no records matched",
                "rule_info": {
                    "rule_id": str(rule.id),
                    "rule_name": rule.rule_name,
                    "rule_definition": rule.rule_definition,
                    "is_active": rule.is_active
                },
                "data": [],
                "pagination": {
                    "total_records": 0,
                    "returned_records": 0,
                    "offset": offset,
                    "limit": limit,
                    "has_more": False
                },
                "message": "No records matched the rule criteria."
            }
            
    except Exception as e:
        raise internal_server_error(
            message="Failed to apply rule. Please try again later.",
            extra={
                "rule_id": str(rule_id),
                "file_id": str(file_id),
                "error_details": str(e)
            }
        )

@rule_router.patch("/users/files/{file_id}/rules/{rule_id}/activate")
async def activate_rule(file_id: UUID, rule_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_file = db.query(UserData).filter(UserData.id == file_id, UserData.user_id == current_user.id).first()
    if not user_file:
        raise not_found_error(
            message="User file not found",
            extra={"file_id": str(file_id)}
        )

    rule = db.query(RuleModel).filter(RuleModel.id == rule_id, RuleModel.user_data_id == user_file.id).first()
    if not rule:
        raise not_found_error(
            message="Rule not found",
            extra={"rule_id": str(rule_id), "file_id": str(file_id)}
        )

    # Toggle the active status
    rule.is_active = not rule.is_active
    db.commit()
    db.refresh(rule)

    return {
        "detail": "Rule activation status updated successfully",
        "rule_id": rule.id,
        "is_active": rule.is_active
    }
