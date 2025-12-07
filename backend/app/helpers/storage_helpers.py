import os
import hashlib
from pathlib import Path
from typing import Optional
from app.models.user_model import User


class StorageManager:
    """
    Unified storage manager for all user data files.
    Handles both uploaded files and synthetic data files with consistent directory structure.
    """
    
    # Base directory for all user data files
    BASE_DIR = "users_data_files"
    
    @staticmethod
    def get_base_directory() -> str:
        """Get the base directory for all user data files"""
        base_path = Path.cwd() / StorageManager.BASE_DIR
        base_path.mkdir(exist_ok=True)
        return str(base_path)
    
    @staticmethod
    def get_user_directory(user_email: str) -> str:
        """
        Get the user's directory path based on their email.
        Creates the directory if it doesn't exist.
        """
        base_dir = StorageManager.get_base_directory()
        # Sanitize email for filesystem (replace @ with _at_ and remove invalid chars)
        safe_email = StorageManager._sanitize_filename(user_email)
        user_dir = Path(base_dir) / safe_email
        user_dir.mkdir(exist_ok=True)
        return str(user_dir)
    
    @staticmethod
    def get_uploaded_files_directory(user_email: str) -> str:
        """Get the uploaded files directory for a user"""
        user_dir = StorageManager.get_user_directory(user_email)
        uploaded_dir = Path(user_dir) / "uploaded"
        uploaded_dir.mkdir(exist_ok=True)
        return str(uploaded_dir)
    
    @staticmethod
    def get_synthetic_files_directory(user_email: str) -> str:
        """Get the synthetic files directory for a user"""
        user_dir = StorageManager.get_user_directory(user_email)
        synthetic_dir = Path(user_dir) / "synthetic"
        synthetic_dir.mkdir(exist_ok=True)
        return str(synthetic_dir)
    
    @staticmethod
    def get_file_type_directory(user_email: str, file_type: str, is_synthetic: bool = False) -> str:
        """
        Get the specific file type directory (csvs, jsons, excels) for a user.
        
        Args:
            user_email: User's email address
            file_type: Type of file ('csv', 'json', 'excel')
            is_synthetic: Whether this is for synthetic files or uploaded files
        """
        if is_synthetic:
            base_dir = StorageManager.get_synthetic_files_directory(user_email)
        else:
            base_dir = StorageManager.get_uploaded_files_directory(user_email)
        
        # Map file types to directory names
        type_mapping = {
            'csv': 'csvs',
            'json': 'jsons', 
            'excel': 'excels',
            'xlsx': 'excels',
            'xls': 'excels'
        }
        
        dir_name = type_mapping.get(file_type.lower(), 'others')
        type_dir = Path(base_dir) / dir_name
        type_dir.mkdir(exist_ok=True)
        return str(type_dir)
    
    @staticmethod
    def get_file_path(user_email: str, filename: str, file_type: str, is_synthetic: bool = False) -> str:
        """
        Get the full file path for storing a file.
        
        Args:
            user_email: User's email address
            filename: Original filename
            file_type: Type of file ('csv', 'json', 'excel')
            is_synthetic: Whether this is for synthetic files or uploaded files
        """
        type_dir = StorageManager.get_file_type_directory(user_email, file_type, is_synthetic)
        
        # Generate unique filename to avoid conflicts
        safe_filename = StorageManager._sanitize_filename(filename)
        file_path = Path(type_dir) / safe_filename
        
        # If file already exists, add a counter
        counter = 1
        original_path = file_path
        while file_path.exists():
            stem = original_path.stem
            suffix = original_path.suffix
            file_path = original_path.parent / f"{stem}_{counter}{suffix}"
            counter += 1
        
        return str(file_path)
    
    @staticmethod
    def get_file_path_by_user_data(user_data, user_email: str) -> str:
        """
        Get the file path for an existing UserData record.
        This is used for backward compatibility and file retrieval.
        """
        if user_data.file_path and os.path.exists(user_data.file_path):
            return user_data.file_path
        
        # If the old path doesn't exist, try to reconstruct the new path
        file_type = user_data.file_type.value if hasattr(user_data.file_type, 'value') else str(user_data.file_type)
        return StorageManager.get_file_path(user_email, user_data.file_name, file_type)
    
    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        """
        Sanitize filename for filesystem compatibility.
        Removes or replaces invalid characters.
        """
        # Replace invalid characters with underscores
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            filename = filename.replace(char, '_')
        
        # Replace @ with _at_ for email addresses
        filename = filename.replace('@', '_at_')
        
        # Remove leading/trailing spaces and dots
        filename = filename.strip(' .')
        
        # Ensure filename is not empty
        if not filename:
            filename = 'unnamed_file'
        
        return filename
    
    @staticmethod
    def get_preprocessed_files_directory(user_email: str) -> str:
        """Get the preprocessed files directory for a user"""
        user_dir = StorageManager.get_user_directory(user_email)
        preprocessed_dir = Path(user_dir) / "preprocessed" / "csvs"
        preprocessed_dir.mkdir(parents=True, exist_ok=True)
        return str(preprocessed_dir)
    
    @staticmethod
    def save_preprocessed_file(user_email: str, filename: str, dataframe) -> str:
        """
        Save a preprocessed DataFrame as CSV file.
        
        Args:
            user_email: User's email address
            filename: Name for the file
            dataframe: pandas DataFrame to save
        
        Returns:
            Full path to the saved file
        """
        preprocessed_dir = StorageManager.get_preprocessed_files_directory(user_email)
        safe_filename = StorageManager._sanitize_filename(filename)
        
        # Ensure .csv extension
        if not safe_filename.lower().endswith('.csv'):
            safe_filename += '.csv'
        
        file_path = Path(preprocessed_dir) / safe_filename
        
        # If file exists, add counter (safety - though endpoint also checks)
        counter = 1
        base_path = file_path
        while file_path.exists():
            stem = base_path.stem
            suffix = base_path.suffix
            file_path = base_path.parent / f"{stem}_{counter}{suffix}"
            counter += 1
        
        # Clean datetime columns before saving
        # Convert datetime columns that are actually time-only back to time strings
        import pandas as pd
        df_to_save = dataframe.copy()
        
        for col in df_to_save.columns:
            if pd.api.types.is_datetime64_any_dtype(df_to_save[col]):
                # Check if all dates are the same (indicating time-only data)
                non_null_values = df_to_save[col].dropna()
                if len(non_null_values) > 0:
                    dates = non_null_values.dt.date
                    unique_dates = dates.unique()
                    
                    # If all rows have the same date, it's likely time-only data
                    if len(unique_dates) == 1:
                        # Convert to time-only format (HH:MM:SS)
                        df_to_save[col] = non_null_values.dt.strftime('%H:%M:%S')
        
        # Save DataFrame to CSV
        df_to_save.to_csv(file_path, index=False)
        
        return str(file_path)
    
    @staticmethod
    def ensure_all_directories_exist(user_email: str):
        """Ensure all necessary directories exist for a user"""
        # Create all directory structure
        StorageManager.get_user_directory(user_email)
        StorageManager.get_uploaded_files_directory(user_email)
        StorageManager.get_synthetic_files_directory(user_email)
        StorageManager.get_preprocessed_files_directory(user_email)
        
        # Create type-specific directories
        for file_type in ['csv', 'json', 'excel']:
            StorageManager.get_file_type_directory(user_email, file_type, is_synthetic=False)
            StorageManager.get_file_type_directory(user_email, file_type, is_synthetic=True)
    
    @staticmethod
    def get_relative_path(absolute_path: str) -> str:
        """Convert absolute path to relative path from base directory"""
        base_dir = StorageManager.get_base_directory()
        try:
            return os.path.relpath(absolute_path, base_dir)
        except ValueError:
            # If paths are on different drives (Windows), return the absolute path
            return absolute_path
    
    @staticmethod
    def get_absolute_path(relative_path: str) -> str:
        """Convert relative path to absolute path"""
        base_dir = StorageManager.get_base_directory()
        return os.path.join(base_dir, relative_path)


def get_user_file_path(user_email: str, filename: str, file_type: str, is_synthetic: bool = False) -> str:
    """
    Convenience function to get file path for a user.
    This maintains backward compatibility with existing code.
    """
    return StorageManager.get_file_path(user_email, filename, file_type, is_synthetic)


def get_upload_directory(user_email: str) -> str:
    """
    Convenience function to get upload directory for a user.
    This maintains backward compatibility with existing code.
    """
    return StorageManager.get_uploaded_files_directory(user_email)
