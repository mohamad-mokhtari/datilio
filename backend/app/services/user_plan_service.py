from __future__ import annotations

from datetime import datetime
from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.plan_model import Plan
from app.models.user_model import User
from app.models.user_plan_model import UserPlan


class UserPlanService:
    """Assign and resolve the default MVP plan for users."""

    MVP_PLAN_NAME = "MVP"

    @staticmethod
    def get_mvp_plan(db: Session) -> Optional[Plan]:
        return (
            db.query(Plan)
            .filter(
                Plan.name == UserPlanService.MVP_PLAN_NAME,
                Plan.is_active == True,
                Plan.is_addon == False,
            )
            .first()
        )

    @staticmethod
    def get_active_user_plan(db: Session, user_id: UUID) -> Optional[UserPlan]:
        return (
            db.query(UserPlan)
            .filter(UserPlan.user_id == user_id, UserPlan.is_active == True)
            .first()
        )

    @staticmethod
    def ensure_user_has_mvp_plan(db: Session, user_id: UUID) -> Optional[UserPlan]:
        """Ensure the user has an active MVP plan; create one if missing."""
        active_plan = UserPlanService.get_active_user_plan(db, user_id)
        if active_plan:
            return active_plan

        mvp_plan = UserPlanService.get_mvp_plan(db)
        if not mvp_plan:
            return None

        user_plan = UserPlan(
            user_id=user_id,
            plan_id=mvp_plan.id,
            start_date=datetime.utcnow(),
            end_date=None,
            is_active=True,
        )
        db.add(user_plan)
        db.commit()
        db.refresh(user_plan)
        return user_plan

    @staticmethod
    def ensure_all_users_without_plan_have_mvp(db: Session) -> Tuple[int, int]:
        """Assign MVP to every user without an active plan. Returns (assigned, skipped)."""
        mvp_plan = UserPlanService.get_mvp_plan(db)
        if not mvp_plan:
            return 0, 0

        assigned = 0
        skipped = 0

        users = db.query(User).all()
        for user in users:
            if UserPlanService.get_active_user_plan(db, user.id):
                skipped += 1
                continue

            user_plan = UserPlan(
                user_id=user.id,
                plan_id=mvp_plan.id,
                start_date=datetime.utcnow(),
                end_date=None,
                is_active=True,
            )
            db.add(user_plan)
            assigned += 1

        if assigned:
            db.commit()

        return assigned, skipped

    @staticmethod
    def get_effective_plan_for_user(db: Session, user_id: UUID) -> Tuple[Optional[UserPlan], Optional[Plan]]:
        """
        Return the user's active plan assignment and plan record.
        Creates an MVP assignment if the user has none.
        """
        user_plan = UserPlanService.ensure_user_has_mvp_plan(db, user_id)
        if user_plan:
            return user_plan, user_plan.plan

        mvp_plan = UserPlanService.get_mvp_plan(db)
        return None, mvp_plan
