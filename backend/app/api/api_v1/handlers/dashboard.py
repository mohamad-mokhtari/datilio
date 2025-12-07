from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
import calendar
import math

from app.models.user_model import User
from app.models.user_data_model import UserData, FileType
from app.models.file_qa_model import FileQA, GPTModelType
from app.models.usage_tracking_model import UsageTracking
from app.models.user_plan_model import UserPlan
from app.models.plan_model import Plan
from app.models.feedback_model import Feedback
from app.api.deps.user_deps import get_current_user
from app.core.db_setup import get_db
from app.services.usage_service import UsageService
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)

dashboard_router = APIRouter()

def clean_float_value(value: Any) -> Any:
    """
    Clean float values to ensure JSON compliance.
    Converts inf, -inf, and NaN to None or appropriate values.
    """
    if isinstance(value, float):
        if math.isnan(value):
            return None
        elif math.isinf(value):
            return None
        else:
            return value
    return value

def clean_dashboard_data(data: Any) -> Any:
    """
    Recursively clean dashboard data to ensure JSON compliance.
    """
    if isinstance(data, dict):
        return {key: clean_dashboard_data(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [clean_dashboard_data(item) for item in data]
    elif isinstance(data, float):
        return clean_float_value(data)
    else:
        return data

@dashboard_router.get("/dashboard")
async def get_user_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive dashboard data for the user.
    This endpoint provides all the data needed for the frontend dashboard
    including charts, tables, and reports.
    """
    try:
        # Get current date info
        today = date.today()
        start_of_month = date(today.year, today.month, 1)
        start_of_week = today - timedelta(days=today.weekday())
        
        # 1. USER PROFILE SUMMARY
        user_profile = {
            "id": str(current_user.id),
            "username": current_user.username,
            "email": current_user.email,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "email_verified": current_user.email_verified,
            "role": current_user.role.value,
            "created_at": current_user.created_at,
            "last_login": current_user.updated_at  # Using updated_at as proxy for last activity
        }
        
        # 2. CURRENT PLAN INFORMATION
        current_plan = db.query(UserPlan).filter(
            UserPlan.user_id == current_user.id,
            UserPlan.is_active == True
        ).first()
        
        plan_info = {
            "has_active_plan": current_plan is not None,
            "plan_name": current_plan.plan.name if current_plan else "Free Plan",
            "plan_id": str(current_plan.plan.id) if current_plan else None,
            "start_date": current_plan.start_date if current_plan else None,
            "end_date": current_plan.end_date if current_plan else None,
            "features": {
                "storage_limit_gb": clean_float_value(current_plan.plan.storage_limit_gb if current_plan else 0.005),  # 5MB free
                "ai_tokens_per_month": clean_float_value(current_plan.plan.ai_tokens_per_month if current_plan else 50000),
                "synthetic_rows_per_month": clean_float_value(current_plan.plan.synthetic_rows_per_month if current_plan else 500),
                "rules_limit": clean_float_value(current_plan.plan.rules_limit if current_plan else 1),
                "custom_lists_limit": clean_float_value(current_plan.plan.custom_lists_limit if current_plan else 1)
            }
        }
        
        # 3. USAGE SUMMARY & ANALYTICS
        try:
            usage_summary = UsageService.get_usage_summary(db, str(current_user.id))
            usage_breakdown = UsageService.get_usage_breakdown(db, str(current_user.id))
        except Exception as e:
            # Fallback to empty usage data if service fails
            print(f"Warning: Usage service failed: {e}")
            usage_summary = type('UsageSummary', (), {
                'current_month': {},
                'limits': {},
                'percentages': {}
            })()
            usage_breakdown = {}
        
        # Clean usage data to handle potential invalid floats
        if hasattr(usage_summary, 'current_month') and usage_summary.current_month:
            usage_summary.current_month = {k: clean_float_value(v) for k, v in usage_summary.current_month.items()}
        if hasattr(usage_summary, 'limits') and usage_summary.limits:
            usage_summary.limits = {k: clean_float_value(v) for k, v in usage_summary.limits.items()}
        if hasattr(usage_summary, 'percentages') and usage_summary.percentages:
            usage_summary.percentages = {k: clean_float_value(v) for k, v in usage_summary.percentages.items()}
        
        # Clean usage breakdown
        if usage_breakdown:
            for feature, breakdown in usage_breakdown.items():
                if isinstance(breakdown, dict):
                    for key, value in breakdown.items():
                        breakdown[key] = clean_float_value(value)
        
        # 4. FILE STATISTICS
        total_files = db.query(UserData).filter(UserData.user_id == current_user.id).count()
        
        # Files by type
        files_by_type = db.query(
            UserData.file_type,
            func.count(UserData.id).label('count'),
            func.sum(UserData.file_size).label('total_size')
        ).filter(UserData.user_id == current_user.id).group_by(UserData.file_type).all()
        
        file_type_stats = {
            "total_files": total_files,
            "by_type": {
                row.file_type.value: {
                    "count": row.count,
                    "total_size_mb": clean_float_value(round((row.total_size or 0) / (1024 * 1024), 2))
                }
                for row in files_by_type
            }
        }
        
        # Recent files (last 10)
        recent_files = db.query(UserData).filter(
            UserData.user_id == current_user.id
        ).order_by(desc(UserData.created_at)).limit(10).all()
        
        recent_files_data = [
            {
                "id": str(file.id),
                "name": file.file_name,
                "type": file.file_type.value,
                "size_mb": clean_float_value(round((file.file_size or 0) / (1024 * 1024), 2)),
                "created_at": file.created_at,
                "exists": file.file_path_exists
            }
            for file in recent_files
        ]
        
        # 5. AI INTERACTION STATISTICS
        total_qa_interactions = db.query(FileQA).filter(FileQA.user_id == current_user.id).count()
        
        # Q&A by model
        qa_by_model = db.query(
            FileQA.gpt_model,
            func.count(FileQA.id).label('count'),
            func.sum(FileQA.tokens_used).label('total_tokens'),
            func.avg(FileQA.processing_time).label('avg_processing_time')
        ).filter(FileQA.user_id == current_user.id).group_by(FileQA.gpt_model).all()
        
        ai_stats = {
            "total_interactions": total_qa_interactions,
            "by_model": {
                row.gpt_model.value: {
                    "count": row.count,
                    "total_tokens": clean_float_value(row.total_tokens or 0),
                    "avg_processing_time": clean_float_value(round(row.avg_processing_time or 0, 2))
                }
                for row in qa_by_model
            }
        }
        
        # Recent Q&A interactions (last 10)
        recent_qa = db.query(FileQA).filter(
            FileQA.user_id == current_user.id
        ).order_by(desc(FileQA.created_at)).limit(10).all()
        
        recent_qa_data = [
            {
                "id": str(qa.id),
                "question": qa.question[:100] + "..." if len(qa.question) > 100 else qa.question,
                "model": qa.gpt_model.value,
                "tokens_used": clean_float_value(qa.tokens_used),
                "processing_time": clean_float_value(qa.processing_time),
                "feedback_score": clean_float_value(qa.feedback_score),
                "created_at": qa.created_at
            }
            for qa in recent_qa
        ]
        
        # 6. USAGE TRENDS (Last 30 days)
        usage_trends = {}
        for feature in ["file_storage_mb", "openai_tokens", "synthetic_rows"]:
            try:
                trends = UsageService.get_feature_usage_history(db, str(current_user.id), feature, 30)
                # Clean the trends data
                cleaned_trends = []
                for trend in trends:
                    cleaned_trend = {
                        "date": trend["date"],
                        "amount": clean_float_value(trend["amount"])
                    }
                    cleaned_trends.append(cleaned_trend)
                usage_trends[feature] = cleaned_trends
            except Exception as e:
                print(f"Warning: Failed to get usage trends for {feature}: {e}")
                usage_trends[feature] = []
        
        # 7. MONTHLY ACTIVITY SUMMARY
        # Current month activity - Q&A interactions
        current_month_qa = db.query(
            func.count(FileQA.id).label('qa_count'),
            func.sum(FileQA.tokens_used).label('tokens_used')
        ).filter(
            and_(
                FileQA.user_id == current_user.id,
                FileQA.created_at >= start_of_month
            )
        ).first()
        
        # Current month activity - File uploads
        current_month_files = db.query(
            func.count(UserData.id).label('files_uploaded')
        ).filter(
            and_(
                UserData.user_id == current_user.id,
                UserData.created_at >= start_of_month
            )
        ).first()
        
        # Previous month for comparison
        prev_month_start = date(today.year, today.month - 1, 1) if today.month > 1 else date(today.year - 1, 12, 1)
        prev_month_end = start_of_month - timedelta(days=1)
        
        # Previous month Q&A
        prev_month_qa = db.query(
            func.count(FileQA.id).label('qa_count'),
            func.sum(FileQA.tokens_used).label('tokens_used')
        ).filter(
            and_(
                FileQA.user_id == current_user.id,
                FileQA.created_at >= prev_month_start,
                FileQA.created_at <= prev_month_end
            )
        ).first()
        
        # Previous month files
        prev_month_files = db.query(
            func.count(UserData.id).label('files_uploaded')
        ).filter(
            and_(
                UserData.user_id == current_user.id,
                UserData.created_at >= prev_month_start,
                UserData.created_at <= prev_month_end
            )
        ).first()
        
        activity_summary = {
            "current_month": {
                "qa_interactions": current_month_qa.qa_count or 0,
                "files_uploaded": current_month_files.files_uploaded or 0,
                "tokens_used": clean_float_value(current_month_qa.tokens_used or 0)
            },
            "previous_month": {
                "qa_interactions": prev_month_qa.qa_count or 0,
                "files_uploaded": prev_month_files.files_uploaded or 0,
                "tokens_used": clean_float_value(prev_month_qa.tokens_used or 0)
            }
        }
        
        # Calculate growth percentages
        for key in activity_summary["current_month"]:
            current = activity_summary["current_month"][key]
            previous = activity_summary["previous_month"][key]
            if previous > 0:
                growth = ((current - previous) / previous) * 100
                activity_summary["growth_percentages"] = activity_summary.get("growth_percentages", {})
                activity_summary["growth_percentages"][key] = clean_float_value(round(growth, 1))
            else:
                activity_summary["growth_percentages"] = activity_summary.get("growth_percentages", {})
                activity_summary["growth_percentages"][key] = clean_float_value(100.0 if current > 0 else 0.0)
        
        # 8. FEEDBACK STATISTICS
        # Get feedback conversations count
        feedback_conversations = db.query(Feedback).filter(Feedback.user_id == current_user.id).count()
        
        # Get Q&A feedback ratings (from FileQA model)
        qa_feedback_stats = db.query(
            func.count(FileQA.id).label('total_qa_with_feedback'),
            func.avg(FileQA.feedback_score).label('avg_rating')
        ).filter(
            and_(
                FileQA.user_id == current_user.id,
                FileQA.feedback_score.isnot(None)
            )
        ).first()
        
        feedback_summary = {
            "feedback_conversations": feedback_conversations,
            "qa_feedback": {
                "total_rated_interactions": qa_feedback_stats.total_qa_with_feedback or 0,
                "average_rating": clean_float_value(round(qa_feedback_stats.avg_rating or 0, 1))
            }
        }
        
        # 9. QUICK ACTIONS & RECOMMENDATIONS
        recommendations = []
        
        # Check if user is close to limits
        for feature, breakdown in usage_breakdown.items():
            if isinstance(breakdown, dict) and "percentage" in breakdown:
                percentage = breakdown["percentage"]
                if percentage is not None and percentage > 80:
                    recommendations.append({
                        "type": "warning",
                        "message": f"You're using {percentage:.1f}% of your {feature.replace('_', ' ')} limit",
                        "action": "Consider upgrading your plan"
                    })
        
        # Check if user has no recent activity
        if total_qa_interactions == 0:
            recommendations.append({
                "type": "info",
                "message": "You haven't asked any questions yet. Try uploading a file and asking questions about your data!",
                "action": "Upload a file and start exploring"
            })
        
        # Check if user has unverified email
        if not current_user.email_verified:
            recommendations.append({
                "type": "warning",
                "message": "Your email is not verified. Verify your email to access all features.",
                "action": "Check your email for verification link"
            })
        
        # 10. SYSTEM STATUS & HEALTH
        system_status = {
            "database_connected": True,  # If we got this far, DB is working
            "api_version": "1.0",
            "last_updated": datetime.utcnow()
        }
        
        # Compile the complete dashboard response
        dashboard_data = {
            "user_profile": user_profile,
            "plan_info": plan_info,
            "usage_summary": {
                "current_month": usage_summary.current_month,
                "limits": usage_summary.limits,
                "percentages": usage_summary.percentages
            },
            "usage_breakdown": usage_breakdown,
            "file_statistics": file_type_stats,
            "recent_files": recent_files_data,
            "ai_statistics": ai_stats,
            "recent_qa_interactions": recent_qa_data,
            "usage_trends": usage_trends,
            "activity_summary": activity_summary,
            "feedback_summary": feedback_summary,
            "recommendations": recommendations,
            "system_status": system_status,
            "generated_at": datetime.utcnow()
        }
        
        # Clean the data to ensure JSON compliance
        cleaned_dashboard_data = clean_dashboard_data(dashboard_data)
        return cleaned_dashboard_data
        
    except Exception as e:
        raise internal_server_error(
            message="Failed to generate dashboard data. Please try again later.",
            extra={"error_details": str(e)}
        )


@dashboard_router.get("/dashboard/analytics")
async def get_dashboard_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = 30
):
    """
    Get detailed analytics data for charts and graphs.
    This endpoint provides time-series data for various metrics.
    """
    try:
        if days > 365:  # Limit to 1 year max
            days = 365
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # 1. DAILY USAGE TRENDS
        try:
            daily_usage = db.query(
                UsageTracking.date,
                UsageTracking.feature,
                func.sum(UsageTracking.amount).label('daily_total')
            ).filter(
                and_(
                    UsageTracking.user_id == current_user.id,
                    UsageTracking.date >= start_date
                )
            ).group_by(UsageTracking.date, UsageTracking.feature).order_by(UsageTracking.date).all()
        except Exception as e:
            print(f"Warning: Failed to get daily usage trends: {e}")
            daily_usage = []
        
        # Organize by feature
        usage_by_feature = {}
        for row in daily_usage:
            if row.feature not in usage_by_feature:
                usage_by_feature[row.feature] = []
            usage_by_feature[row.feature].append({
                "date": str(row.date),
                "amount": clean_float_value(float(row.daily_total))
            })
        
        # 2. AI INTERACTION TRENDS
        try:
            daily_qa = db.query(
                func.date(FileQA.created_at).label('date'),
                func.count(FileQA.id).label('interactions'),
                func.sum(FileQA.tokens_used).label('tokens'),
                func.avg(FileQA.processing_time).label('avg_time')
            ).filter(
                and_(
                    FileQA.user_id == current_user.id,
                    func.date(FileQA.created_at) >= start_date
                )
            ).group_by(func.date(FileQA.created_at)).order_by(func.date(FileQA.created_at)).all()
        except Exception as e:
            print(f"Warning: Failed to get AI interaction trends: {e}")
            daily_qa = []
        
        ai_trends = [
            {
                "date": str(row.date),
                "interactions": row.interactions,
                "tokens_used": clean_float_value(row.tokens or 0),
                "avg_processing_time": clean_float_value(round(row.avg_time or 0, 2))
            }
            for row in daily_qa
        ]
        
        # 3. FILE UPLOAD TRENDS
        try:
            daily_uploads = db.query(
                func.date(UserData.created_at).label('date'),
                func.count(UserData.id).label('uploads'),
                func.sum(UserData.file_size).label('total_size')
            ).filter(
                and_(
                    UserData.user_id == current_user.id,
                    func.date(UserData.created_at) >= start_date
                )
            ).group_by(func.date(UserData.created_at)).order_by(func.date(UserData.created_at)).all()
        except Exception as e:
            print(f"Warning: Failed to get file upload trends: {e}")
            daily_uploads = []
        
        upload_trends = [
            {
                "date": str(row.date),
                "uploads": row.uploads,
                "total_size_mb": clean_float_value(round((row.total_size or 0) / (1024 * 1024), 2))
            }
            for row in daily_uploads
        ]
        
        # 4. MODEL USAGE DISTRIBUTION
        try:
            model_usage = db.query(
                FileQA.gpt_model,
                func.count(FileQA.id).label('count'),
                func.sum(FileQA.tokens_used).label('total_tokens')
            ).filter(FileQA.user_id == current_user.id).group_by(FileQA.gpt_model).all()
        except Exception as e:
            print(f"Warning: Failed to get model usage distribution: {e}")
            model_usage = []
        
        model_distribution = [
            {
                "model": row.gpt_model.value,
                "interactions": row.count,
                "total_tokens": clean_float_value(row.total_tokens or 0),
                "percentage": 0  # Will calculate below
            }
            for row in model_usage
        ]
        
        # Calculate percentages
        total_interactions = sum(item["interactions"] for item in model_distribution)
        for item in model_distribution:
            if total_interactions > 0:
                item["percentage"] = clean_float_value(round((item["interactions"] / total_interactions) * 100, 1))
        
        # 5. FILE TYPE DISTRIBUTION
        try:
            file_type_distribution = db.query(
                UserData.file_type,
                func.count(UserData.id).label('count'),
                func.sum(UserData.file_size).label('total_size')
            ).filter(UserData.user_id == current_user.id).group_by(UserData.file_type).all()
        except Exception as e:
            print(f"Warning: Failed to get file type distribution: {e}")
            file_type_distribution = []
        
        file_distribution = [
            {
                "type": row.file_type.value,
                "count": row.count,
                "total_size_mb": clean_float_value(round((row.total_size or 0) / (1024 * 1024), 2)),
                "percentage": 0  # Will calculate below
            }
            for row in file_type_distribution
        ]
        
        # Calculate percentages
        total_files = sum(item["count"] for item in file_distribution)
        for item in file_distribution:
            if total_files > 0:
                item["percentage"] = clean_float_value(round((item["count"] / total_files) * 100, 1))
        
        analytics_data = {
            "period": {
                "start_date": str(start_date),
                "end_date": str(end_date),
                "days": days
            },
            "usage_trends": usage_by_feature,
            "ai_interaction_trends": ai_trends,
            "file_upload_trends": upload_trends,
            "model_usage_distribution": model_distribution,
            "file_type_distribution": file_distribution,
            "generated_at": datetime.utcnow()
        }
        
        # Clean the data to ensure JSON compliance
        cleaned_analytics_data = clean_dashboard_data(analytics_data)
        return cleaned_analytics_data
        
    except Exception as e:
        raise internal_server_error(
            message="Failed to generate analytics data. Please try again later.",
            extra={"error_details": str(e)}
        )


@dashboard_router.get("/dashboard/quick-stats")
async def get_quick_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get quick statistics for dashboard widgets.
    This is a lightweight endpoint for real-time updates.
    """
    try:
        today = date.today()
        start_of_month = date(today.year, today.month, 1)
        
        # Quick stats
        total_files = db.query(UserData).filter(UserData.user_id == current_user.id).count()
        total_qa = db.query(FileQA).filter(FileQA.user_id == current_user.id).count()
        
        # This month
        monthly_files = db.query(UserData).filter(
            and_(
                UserData.user_id == current_user.id,
                UserData.created_at >= start_of_month
            )
        ).count()
        
        monthly_qa = db.query(FileQA).filter(
            and_(
                FileQA.user_id == current_user.id,
                FileQA.created_at >= start_of_month
            )
        ).count()
        
        # Usage summary
        usage_summary = UsageService.get_usage_summary(db, str(current_user.id))
        
        quick_stats_data = {
            "total_files": total_files,
            "total_qa_interactions": total_qa,
            "monthly_files": monthly_files,
            "monthly_qa_interactions": monthly_qa,
            "usage_percentages": usage_summary.percentages,
            "last_updated": datetime.utcnow()
        }
        
        # Clean the data to ensure JSON compliance
        cleaned_quick_stats = clean_dashboard_data(quick_stats_data)
        return cleaned_quick_stats
        
    except Exception as e:
        raise internal_server_error(
            message="Failed to get quick stats. Please try again later.",
            extra={"error_details": str(e)}
        )
