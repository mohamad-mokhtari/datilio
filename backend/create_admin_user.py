#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.db_setup import SessionLocal
# Import all models to ensure relationships are properly initialized
import app.models  # This imports all models via __init__.py
from app.models.user_model import User, Role
from app.core.security import get_password
import uuid

def main():
    """Check for admin users and create one if needed"""
    print("🔍 Checking for admin users...")
    db = SessionLocal()
    try:
        # Check if admin user exists
        admin_user = db.query(User).filter(User.role == Role.ADMIN).first()
        
        if admin_user:
            print(f"✅ Admin user found: {admin_user.email}")
            print(f"   Username: {admin_user.username}")
            print(f"   Role: {admin_user.role}")
            return
        
        print("❌ No admin user found. Creating one...")
        
        # Create admin user
        admin_user = User(
            id=uuid.uuid4(),
            username="admin",
            email="admin@example.com",
            hashed_password=get_password("admin123"),
            first_name="Admin",
            last_name="User",
            role=Role.ADMIN,
            disabled=False,
            email_verified=True  # Admin users created via script don't need email verification
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("✅ Admin user created successfully!")
        print(f"   Email: {admin_user.email}")
        print(f"   Username: {admin_user.username}")
        print(f"   Password: admin123")
        print(f"   Role: {admin_user.role}")
        print("\n⚠️  Please change the password after first login!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
