#!/usr/bin/env python3
"""
Setup script to initialize plans and user limits system.
This script will:
1. Run database migrations
2. Seed plans from CSV
"""

import sys
import os
import subprocess

def run_command(command, description):
    """Run a shell command and handle errors"""
    print(f"\n{'=' * 60}")
    print(f"🔄 {description}...")
    print(f"{'=' * 60}")
    
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        print(f"✅ {description} completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error during {description}:")
        print(e.stdout)
        print(e.stderr)
        return False

def main():
    """Main setup function"""
    print("\n" + "=" * 60)
    print("🚀 Plans and User Limits Setup")
    print("=" * 60)
    
    # Step 1: Run database migration
    success = run_command(
        "alembic upgrade head",
        "Running database migrations"
    )
    
    if not success:
        print("\n❌ Migration failed. Please check the error above.")
        sys.exit(1)
    
    # Step 2: Seed plans from CSV
    success = run_command(
        "python seed_plans.py",
        "Seeding plans from CSV"
    )
    
    if not success:
        print("\n❌ Plan seeding failed. Please check the error above.")
        sys.exit(1)
    
    # Success message
    print("\n" + "=" * 60)
    print("🎉 Setup completed successfully!")
    print("=" * 60)
    print("\n✅ Database migrations applied")
    print("✅ Plans seeded from CSV")
    print("\n📚 Next Steps:")
    print("  1. Start your FastAPI server: uvicorn main:app --reload")
    print("  2. Test admin endpoints at: http://localhost:8000/docs")
    print("  3. Read ADMIN_USER_LIMITS_GUIDE.md for API documentation")
    print("\n" + "=" * 60 + "\n")

if __name__ == "__main__":
    main()

