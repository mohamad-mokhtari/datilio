#!/usr/bin/env python3
"""
Create Admin User with Email Pre-Verified
==========================================

This script creates an admin user that can log in immediately without email verification.
Useful for development and testing when SMTP is not configured.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.db_setup import SessionLocal
from app.models.user_model import User, Role
from app.core.security import get_password
import uuid

def main():
    """Create admin user with email already verified"""
    print("=" * 70)
    print("CREATE ADMIN USER (Email Pre-Verified)")
    print("=" * 70)
    
    db = SessionLocal()
    try:
        # Check if admin user exists
        admin_user = db.query(User).filter(User.role == Role.ADMIN).first()
        
        if admin_user:
            print(f"\n✅ Admin user already exists:")
            print(f"   Email: {admin_user.email}")
            print(f"   Username: {admin_user.username}")
            print(f"   Role: {admin_user.role}")
            print(f"   Email Verified: {admin_user.email_verified}")
            
            # Update email_verified if it's False
            if not admin_user.email_verified:
                print(f"\n📝 Updating email_verified to True...")
                admin_user.email_verified = True
                db.commit()
                print(f"   ✅ Email verification bypassed!")
            
            return
        
        print("\n❌ No admin user found. Creating one...")
        
        # Create admin user with email already verified
        admin_user = User(
            id=uuid.uuid4(),
            username="admin",
            email="admin@datilio.com",
            hashed_password=get_password("Admin@123"),
            first_name="Admin",
            last_name="User",
            role=Role.ADMIN,
            disabled=False,
            email_verified=True  # ⭐ Email already verified - can log in immediately!
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("\n" + "=" * 70)
        print("✅ ADMIN USER CREATED SUCCESSFULLY!")
        print("=" * 70)
        print(f"\n📧 Email:    {admin_user.email}")
        print(f"👤 Username: {admin_user.username}")
        print(f"🔑 Password: Admin@123")
        print(f"👑 Role:     {admin_user.role}")
        print(f"✅ Email Verified: {admin_user.email_verified}")
        print("\n" + "=" * 70)
        print("⚠️  SECURITY NOTE: Change the password after first login!")
        print("=" * 70)
        print("\nYou can now log in with:")
        print(f"  Email: {admin_user.email}")
        print(f"  Password: Admin@123")
        print()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print(f"\nDetails: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

