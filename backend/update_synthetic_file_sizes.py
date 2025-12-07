#!/usr/bin/env python3
"""
Script to update file_size for existing synthetic data files that have null file_size values.
This script should be run once to fix existing data after implementing file size tracking.
"""

import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent))

from app.core.db_setup import get_db
from app.models.user_data_model import UserData, FileType
from sqlalchemy.orm import Session


def update_synthetic_file_sizes():
    """Update file_size for synthetic data files that have null file_size values"""
    
    db: Session = next(get_db())
    
    try:
        # Find all synthetic data files with null file_size
        # We can identify synthetic files by checking if they're CSV files
        # and their file_path contains 'synthetic' or they're in the synthetic directory
        synthetic_files = db.query(UserData).filter(
            UserData.file_type == FileType.CSV,
            UserData.file_size.is_(None)
        ).all()
        
        print(f"Found {len(synthetic_files)} synthetic data files with null file_size")
        
        updated_count = 0
        error_count = 0
        
        for file_record in synthetic_files:
            try:
                # Check if the file exists on disk
                if os.path.exists(file_record.file_path):
                    # Get the actual file size
                    file_size = os.path.getsize(file_record.file_path)
                    
                    # Update the record
                    file_record.file_size = file_size
                    db.add(file_record)
                    
                    print(f"Updated {file_record.file_name}: {file_size} bytes")
                    updated_count += 1
                else:
                    print(f"File not found: {file_record.file_path}")
                    error_count += 1
                    
            except Exception as e:
                print(f"Error updating {file_record.file_name}: {str(e)}")
                error_count += 1
        
        # Commit all changes
        db.commit()
        
        print(f"\nUpdate completed:")
        print(f"- Updated: {updated_count} files")
        print(f"- Errors: {error_count} files")
        
    except Exception as e:
        print(f"Error during update: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Updating file sizes for existing synthetic data files...")
    update_synthetic_file_sizes()
    print("Done!")
