#!/usr/bin/env python3
"""
Create an admin user with email pre-verified (login works without SMTP).

Usage (Docker):
  docker compose -f docker-compose.local.yml exec backend python create_admin_user.py
  docker compose -f docker-compose.prod.yml exec backend python create_admin_user.py
"""

import os
import sys
import uuid

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.db_setup import SessionLocal
from app.core.security import get_password
from app.models.user_model import Role, User

import app.models  # noqa: F401 — register all models for SQLAlchemy relationships

DEFAULT_EMAIL = "admin@datilio.com"
DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "Admin@123"


def main() -> None:
    print("=" * 70)
    print("CREATE ADMIN USER (email pre-verified)")
    print("=" * 70)

    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.role == Role.ADMIN).first()

        if admin_user:
            print("\nAdmin user already exists:")
            print(f"   Email: {admin_user.email}")
            print(f"   Username: {admin_user.username}")
            print(f"   Role: {admin_user.role}")
            print(f"   Email verified: {admin_user.email_verified}")

            if not admin_user.email_verified:
                print("\nUpdating email_verified to True...")
                admin_user.email_verified = True
                db.commit()
                print("   Done — user can log in without email verification.")

            return

        print("\nNo admin user found. Creating one...")

        admin_user = User(
            id=uuid.uuid4(),
            username=DEFAULT_USERNAME,
            email=DEFAULT_EMAIL,
            hashed_password=get_password(DEFAULT_PASSWORD),
            first_name="Admin",
            last_name="User",
            role=Role.ADMIN,
            disabled=False,
            email_verified=True,
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("\n" + "=" * 70)
        print("ADMIN USER CREATED")
        print("=" * 70)
        print(f"   Email:    {admin_user.email}")
        print(f"   Username: {admin_user.username}")
        print(f"   Password: {DEFAULT_PASSWORD}")
        print(f"   Role:     {admin_user.role}")
        print("\nChange the password after first login.")
        print("=" * 70)

    except Exception as e:
        print(f"\nError: {e}")
        import traceback

        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
