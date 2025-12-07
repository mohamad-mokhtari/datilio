"""
Cleanup Orphaned Task Records

This script removes orphaned task records that were created when Redis was down.
These are records with empty celery_task_id that violate the unique constraint.

Run this ONCE after deploying the fix to clean up existing orphaned records.
"""

from app.core.database import SessionLocal
from app.models.task_model import Task
from sqlalchemy import or_

def cleanup_orphaned_tasks():
    """Remove orphaned task records with empty or NULL celery_task_id"""
    
    print("\n" + "=" * 70)
    print("🧹 Cleaning Up Orphaned Task Records")
    print("=" * 70)
    
    db = SessionLocal()
    
    try:
        # Find all orphaned tasks (empty string or NULL celery_task_id)
        orphaned_tasks = db.query(Task).filter(
            or_(
                Task.celery_task_id == "",
                Task.celery_task_id == None
            )
        ).all()
        
        if not orphaned_tasks:
            print("\n✅ No orphaned tasks found! Database is clean.")
            print("=" * 70)
            return
        
        print(f"\n🔍 Found {len(orphaned_tasks)} orphaned task(s):")
        print()
        
        for task in orphaned_tasks:
            print(f"   • ID: {task.id}")
            print(f"     Task Name: {task.task_name}")
            print(f"     User ID: {task.user_id}")
            print(f"     Status: {task.status}")
            print(f"     Created: {task.created_at}")
            print(f"     Celery Task ID: '{task.celery_task_id}'")
            print()
        
        # Ask for confirmation
        response = input("\n⚠️  Delete these orphaned tasks? (yes/no): ").strip().lower()
        
        if response in ['yes', 'y']:
            # Delete orphaned tasks
            deleted_count = db.query(Task).filter(
                or_(
                    Task.celery_task_id == "",
                    Task.celery_task_id == None
                )
            ).delete(synchronize_session=False)
            
            db.commit()
            
            print("\n" + "=" * 70)
            print(f"✅ Successfully deleted {deleted_count} orphaned task(s)")
            print("=" * 70)
            print("\n💡 Your database is now clean!")
            print("   The duplicate key error should be resolved.")
            print()
        else:
            print("\n❌ Cleanup cancelled. No tasks were deleted.")
            print()
    
    except Exception as e:
        print(f"\n❌ Error during cleanup: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("⚠️  IMPORTANT: This script will delete orphaned task records!")
    print("=" * 70)
    print("\nOrphaned tasks are records with empty celery_task_id that were")
    print("created when Redis was down, causing duplicate key errors.")
    print()
    print("This is a ONE-TIME cleanup after deploying the fix.")
    print()
    
    response = input("Continue? (yes/no): ").strip().lower()
    
    if response in ['yes', 'y']:
        cleanup_orphaned_tasks()
    else:
        print("\n❌ Cleanup cancelled.")

