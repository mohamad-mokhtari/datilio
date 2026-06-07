#!/usr/bin/env python3
"""
Bootstrap the backend on first run or after updates.

Runs in order:
  1. Alembic migrations (upgrade head)
  2. Plans sync from startup/plans_and_add_on.csv
  3. First admin user (skip if one already exists)
  4. Assign MVP plan to any user without an active plan

Safe to re-run: existing migrations, admin, and unchanged plans are skipped.

Usage (Docker):
  docker compose -f docker-compose.local.yml exec backend python startup/bootstrap.py
  docker compose -f docker-compose.prod.yml exec backend python startup/bootstrap.py
"""

from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import app.models  # noqa: F401 — register SQLAlchemy models

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine

from app.core.config import settings
from app.core.db_setup import SessionLocal
from app.core.security import get_password
from app.models.user_model import Role, User
from app.services.plan_seeder import DEFAULT_PLANS_CSV, PlanSeeder
from app.services.user_plan_service import UserPlanService

DEFAULT_ADMIN_EMAIL = "admin@datilio.com"
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "Admin@123"


def _alembic_config() -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", settings.POSTGRESQL_CONNECTION_STRING)
    return cfg


def run_migrations() -> None:
    print("\n" + "=" * 70)
    print("1. DATABASE MIGRATIONS")
    print("=" * 70)

    cfg = _alembic_config()
    engine = create_engine(settings.POSTGRESQL_CONNECTION_STRING)

    with engine.connect() as connection:
        context = MigrationContext.configure(connection)
        current = context.get_current_revision()

    script = ScriptDirectory.from_config(cfg)
    head = script.get_current_head()

    if current == head:
        print(f"   Alembic already up to date (revision: {current or 'none'})")
        return

    print(f"   Current revision: {current or 'none'}")
    print(f"   Target revision:  {head}")
    print("   Running alembic upgrade head...")
    command.upgrade(cfg, "head")
    print("   Migrations applied successfully.")


def ensure_admin_user() -> None:
    print("\n" + "=" * 70)
    print("3. ADMIN USER")
    print("=" * 70)

    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.role == Role.ADMIN).first()

        if admin_user:
            print("   Admin user already exists:")
            print(f"      Email:    {admin_user.email}")
            print(f"      Username: {admin_user.username}")
            print(f"      Verified: {admin_user.email_verified}")

            if not admin_user.email_verified:
                admin_user.email_verified = True
                db.commit()
                print("   Updated email_verified to True.")

            UserPlanService.ensure_user_has_mvp_plan(db, admin_user.id)
            return

        admin_user = User(
            id=uuid.uuid4(),
            username=DEFAULT_ADMIN_USERNAME,
            email=DEFAULT_ADMIN_EMAIL,
            hashed_password=get_password(DEFAULT_ADMIN_PASSWORD),
            first_name="Admin",
            last_name="User",
            role=Role.ADMIN,
            disabled=False,
            email_verified=True,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        UserPlanService.ensure_user_has_mvp_plan(db, admin_user.id)

        print("   Admin user created:")
        print(f"      Email:    {DEFAULT_ADMIN_EMAIL}")
        print(f"      Username: {DEFAULT_ADMIN_USERNAME}")
        print(f"      Password: {DEFAULT_ADMIN_PASSWORD}")
        print("   Change the password after first login.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def sync_plans() -> None:
    print("\n" + "=" * 70)
    print("2. PLANS (CSV SYNC)")
    print("=" * 70)
    print(f"   CSV: {DEFAULT_PLANS_CSV}")

    db = SessionLocal()
    try:
        result = PlanSeeder.sync_plans_from_csv(db, DEFAULT_PLANS_CSV)

        if not result.changed and result.unchanged == result.total_in_csv:
            print(
                f"   Plans already up to date ({result.unchanged} plan(s) match CSV)."
            )
            return

        print(f"   CSV plans:     {result.total_in_csv}")
        print(f"   Added:         {result.added}")
        print(f"   Updated:       {result.updated}")
        print(f"   Unchanged:     {result.unchanged}")
        print(f"   Deactivated:   {result.deactivated}")
    except FileNotFoundError as exc:
        print(f"   ERROR: {exc}")
        raise
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def assign_mvp_plans() -> None:
    print("\n" + "=" * 70)
    print("4. MVP PLAN ASSIGNMENTS")
    print("=" * 70)

    db = SessionLocal()
    try:
        assigned, skipped = UserPlanService.ensure_all_users_without_plan_have_mvp(db)
        print(f"   Users already on a plan: {skipped}")
        print(f"   MVP plan assigned:       {assigned}")
        if assigned == 0 and skipped == 0:
            print("   No users found, or MVP plan missing from database.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    print("=" * 70)
    print("DATILIO BACKEND BOOTSTRAP")
    print("=" * 70)

    try:
        run_migrations()
        sync_plans()
        ensure_admin_user()
        assign_mvp_plans()
    except Exception as exc:
        print("\n" + "=" * 70)
        print(f"BOOTSTRAP FAILED: {exc}")
        print("=" * 70)
        import traceback

        traceback.print_exc()
        sys.exit(1)

    print("\n" + "=" * 70)
    print("BOOTSTRAP COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
