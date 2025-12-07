#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.db_setup import SessionLocal
from app.services.usage_service import UsageService
from app.models.user_model import User
import uuid

def test_usage_tracking_directly():
    """Test usage tracking directly in the database"""
    print("🧪 Testing Usage Tracking Directly...")
    
    db = SessionLocal()
    try:
        # Get admin user
        from app.models.user_model import Role
        admin_user = db.query(User).filter(User.role == Role.ADMIN).first()
        if not admin_user:
            print("❌ No admin user found")
            return
        
        user_id = str(admin_user.id)
        print(f"✅ Using admin user: {admin_user.email}")
        
        # Test 1: Check initial usage
        print("\n1. Checking initial usage...")
        summary = UsageService.get_usage_summary(db, user_id)
        print(f"   Current usage: {summary.current_month}")
        print(f"   Limits: {summary.limits}")
        print(f"   Percentages: {summary.percentages}")
        
        # Test 2: Track some usage
        print("\n2. Tracking usage...")
        
        # Track file storage
        UsageService.track_usage(db, user_id, "file_storage_mb", 2.5, "Test file upload")
        print("   ✅ Tracked file storage: 2.5 MB")
        
        # Track AI tokens
        UsageService.track_usage(db, user_id, "openai_tokens", 1500, "Test AI request")
        print("   ✅ Tracked AI tokens: 1500")
        
        # Track synthetic data
        UsageService.track_usage(db, user_id, "synthetic_rows", 100, "Test synthetic data")
        print("   ✅ Tracked synthetic rows: 100")
        
        # Track rules
        UsageService.track_usage(db, user_id, "rules_used", 1, "Test rule creation")
        print("   ✅ Tracked rules: 1")
        
        # Track custom lists
        UsageService.track_usage(db, user_id, "custom_lists", 1, "Test custom list")
        print("   ✅ Tracked custom lists: 1")
        
        # Test 3: Check updated usage
        print("\n3. Checking updated usage...")
        summary = UsageService.get_usage_summary(db, user_id)
        print(f"   Current usage: {summary.current_month}")
        print(f"   Usage percentages: {summary.percentages}")
        
        # Test 4: Test usage limit checking
        print("\n4. Testing usage limit checking...")
        
        # Test file storage limit
        can_upload = UsageService.check_usage_limit(db, user_id, "file_storage_mb", 5.0)
        print(f"   Can upload 5MB file: {can_upload}")
        
        # Test AI token limit
        can_use_ai = UsageService.check_usage_limit(db, user_id, "openai_tokens", 1000)
        print(f"   Can use 1000 AI tokens: {can_use_ai}")
        
        # Test 5: Get usage history
        print("\n5. Getting usage history...")
        history = UsageService.get_feature_usage_history(db, user_id, "file_storage_mb", 30)
        print(f"   File storage history: {len(history)} records")
        for record in history:
            print(f"     - {record['date']}: {record['amount']} MB")
        
        print("\n🎉 Usage tracking test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_usage_tracking_directly()
