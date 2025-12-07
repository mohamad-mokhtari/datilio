from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models.usage_tracking_model import UsageTracking
from app.models.user_plan_model import UserPlan
from app.models.plan_model import Plan
from app.schemas.pricing_schemas import UsageSummaryOut
from typing import Dict, Optional, List
from datetime import datetime, date
import calendar

class UsageService:
    """Service to handle usage tracking and limits"""
    
    @staticmethod
    def track_usage(
        db: Session, 
        user_id: str, 
        feature: str, 
        amount: float, 
        description: Optional[str] = None
    ) -> UsageTracking:
        """Track usage for a specific feature"""
        usage = UsageTracking(
            user_id=user_id,
            feature=feature,
            amount=amount,
            description=description
        )
        db.add(usage)
        db.commit()
        db.refresh(usage)
        return usage
    
    @staticmethod
    def get_current_month_usage(db: Session, user_id: str) -> Dict[str, float]:
        """Get current month usage for all features"""
        today = date.today()
        start_of_month = date(today.year, today.month, 1)
        
        usage_data = db.query(
            UsageTracking.feature,
            func.sum(UsageTracking.amount).label('total_amount')
        ).filter(
            and_(
                UsageTracking.user_id == user_id,
                UsageTracking.date >= start_of_month
            )
        ).group_by(UsageTracking.feature).all()
        
        return {row.feature: float(row.total_amount) for row in usage_data}
    
    @staticmethod
    def get_user_plan_limits(db: Session, user_id: str) -> Dict[str, float]:
        """
        Get current plan limits for user.
        Uses custom overrides if set, otherwise uses plan defaults.
        This is how the custom limits feature works in practice!
        """
        user_plan = db.query(UserPlan).filter(
            UserPlan.user_id == user_id,
            UserPlan.is_active == True
        ).first()
        
        if not user_plan:
            # Return free plan limits
            return {
                "file_storage_mb": 5.0,
                "rules_used": 1,
                "openai_tokens": 50000,
                "ai_prompts": 100,
                "synthetic_rows": 500,
                "custom_lists": 1
            }
        
        # Get effective limits (uses custom overrides if set, otherwise plan defaults)
        effective_limits = user_plan.get_effective_limits()
        
        return {
            "file_storage_mb": effective_limits['storage_limit_gb'] * 1024,  # Convert GB to MB
            "rules_used": float(effective_limits['rules_limit']),
            "openai_tokens": float(effective_limits['ai_tokens_per_month']),
            "ai_prompts": float(effective_limits['ai_prompts_per_month']),
            "synthetic_rows": float(effective_limits['synthetic_rows_per_month']),
            "custom_lists": float(effective_limits['custom_lists_limit']) if effective_limits['custom_lists_limit'] > 0 else float('inf')
        }
    
    @staticmethod
    def get_usage_summary(db: Session, user_id: str) -> UsageSummaryOut:
        """Get comprehensive usage summary for user"""
        current_usage = UsageService.get_current_month_usage(db, user_id)
        limits = UsageService.get_user_plan_limits(db, user_id)
        
        # Calculate percentages
        percentages = {}
        for feature, limit in limits.items():
            usage = current_usage.get(feature, 0.0)
            if limit > 0:
                percentages[feature] = min((usage / limit) * 100, 100.0)
            else:
                percentages[feature] = 0.0
        
        return UsageSummaryOut(
            user_id=user_id,
            current_month=current_usage,
            limits=limits,
            percentages=percentages
        )
    
    @staticmethod
    def check_usage_limit(
        db: Session, 
        user_id: str, 
        feature: str, 
        amount: float = 1.0
    ) -> bool:
        """Check if user can use a feature based on their current usage and limits"""
        summary = UsageService.get_usage_summary(db, user_id)
        
        current_usage = summary.current_month.get(feature, 0.0)
        limit = summary.limits.get(feature, 0.0)
        
        # Check if adding the amount would exceed the limit
        if limit > 0:  # 0 or negative means unlimited
            return (current_usage + amount) <= limit
        
        return True  # Unlimited
    
    @staticmethod
    def get_feature_usage_history(
        db: Session, 
        user_id: str, 
        feature: str, 
        days: int = 30
    ) -> List[Dict]:
        """Get usage history for a specific feature over the last N days"""
        from datetime import timedelta
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        usage_data = db.query(
            UsageTracking.date,
            func.sum(UsageTracking.amount).label('daily_total')
        ).filter(
            and_(
                UsageTracking.user_id == user_id,
                UsageTracking.feature == feature,
                UsageTracking.date >= start_date
            )
        ).group_by(UsageTracking.date).order_by(UsageTracking.date).all()
        
        return [
            {
                "date": str(row.date),
                "amount": float(row.daily_total)
            }
            for row in usage_data
        ]
    
    @staticmethod
    def reset_monthly_usage(db: Session, user_id: str) -> None:
        """Reset monthly usage (typically called by a scheduled task)"""
        # This would typically be called by a cron job or scheduled task
        # For now, we'll just track usage by month in the tracking table
        pass
    
    @staticmethod
    def get_usage_breakdown(db: Session, user_id: str) -> Dict[str, Dict]:
        """Get detailed usage breakdown by feature"""
        summary = UsageService.get_usage_summary(db, user_id)
        
        breakdown = {}
        for feature in summary.current_month.keys():
            breakdown[feature] = {
                "current": summary.current_month[feature],
                "limit": summary.limits.get(feature, 0),
                "percentage": summary.percentages.get(feature, 0),
                "remaining": max(0, summary.limits.get(feature, 0) - summary.current_month.get(feature, 0))
            }
        
        return breakdown
