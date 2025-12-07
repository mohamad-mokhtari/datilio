import pandas as pd
import os
from datetime import datetime
import math
import re
from typing import Tuple, Optional


# Define your expected date formats
date_formats = [
    '%Y-%m-%d %H:%M:%S.%f',
    '%Y-%m-%d %H:%M:%S',
    '%Y-%m-%d'
]

# Comprehensive datetime formats
DATETIME_FORMATS = [
    # ISO 8601 with timezone
    '%Y-%m-%dT%H:%M:%SZ',
    '%Y-%m-%dT%H:%M:%S%z',
    '%Y-%m-%dT%H:%M:%S.%fZ',
    '%Y-%m-%dT%H:%M:%S.%f%z',
    # ISO 8601 without timezone
    '%Y-%m-%dT%H:%M:%S',
    '%Y-%m-%dT%H:%M:%S.%f',
    # Standard datetime formats
    '%Y-%m-%d %H:%M:%S',
    '%Y-%m-%d %H:%M:%S.%f',
    '%Y/%m/%d %H:%M:%S',
    '%Y/%m/%d %H:%M',
    # US format with time
    '%m/%d/%Y %I:%M:%S %p',
    '%m/%d/%Y %I:%M %p',
    '%m/%d/%Y %H:%M:%S',
    '%m/%d/%Y %H:%M',
    # European format with time
    '%d/%m/%Y %H:%M:%S',
    '%d/%m/%Y %H:%M',
    '%d/%m/%Y %I:%M:%S %p',
    '%d/%m/%Y %I:%M %p',
    # Short formats with time
    '%m-%d-%y %H:%M',
    '%m-%d-%y %H:%M:%S',
    '%d-%m-%y %H:%M',
    '%d-%m-%y %H:%M:%S',
]

# Date-only formats
DATE_FORMATS = [
    # ISO 8601
    '%Y-%m-%d',
    '%Y/%m/%d',
    # US format
    '%m/%d/%Y',
    '%m-%d-%Y',
    # European format
    '%d/%m/%Y',
    '%d-%m-%Y',
    # Short formats
    '%m-%d-%y',
    '%d-%m-%y',
    '%m/%d/%y',
    '%d/%m/%y',
    # Long formats
    '%A, %B %d, %Y',
    '%a, %d %b %Y',
    '%B %d, %Y',
    '%d %B %Y',
]

# Time-only formats
TIME_FORMATS = [
    # 24-hour format
    '%H:%M:%S',
    '%H:%M:%S.%f',
    '%H:%M',
    # 12-hour format
    '%I:%M:%S %p',
    '%I:%M %p',
]


def detect_temporal_type(series: pd.Series, threshold: float = 0.5) -> Optional[str]:
    """
    Detect if a pandas Series contains datetime, date, or time values.
    
    Args:
        series: Pandas Series to analyze
        threshold: Minimum ratio of successfully parsed values (default 0.5 = 50%)
    
    Returns:
        'datetime', 'date', 'time', or None if no temporal pattern detected
    """
    # Skip if series is already a datetime type
    if pd.api.types.is_datetime64_any_dtype(series):
        return 'datetime'
    
    # Only check object/string columns
    if series.dtype != 'object':
        return None
    
    # Remove null values for analysis
    non_null_series = series.dropna()
    if len(non_null_series) == 0:
        return None
    
    # Sample size for testing (max 1000 rows for performance)
    sample_size = min(len(non_null_series), 1000)
    sample = non_null_series.head(sample_size)
    
    # Convert to string
    sample_str = sample.astype(str).str.strip()
    
    # Check for Unix timestamp (numeric only)
    try:
        numeric_sample = pd.to_numeric(sample_str, errors='coerce')
        numeric_ratio = numeric_sample.notnull().sum() / len(sample_str)
        
        if numeric_ratio > threshold:
            # CRITICAL FIX: Only consider Unix timestamps if ALL values are in valid range
            # This prevents small integers (like 2400, 2210) from being detected as dates
            
            # Unix timestamps in seconds: 946684800 (2000-01-01) to 4102444800 (2100-01-01)
            # Unix timestamps in milliseconds: 946684800000 to 4102444800000
            
            # Check if values are in valid Unix timestamp range
            valid_seconds = ((numeric_sample >= 946684800) & (numeric_sample <= 4102444800))
            valid_milliseconds = ((numeric_sample >= 946684800000) & (numeric_sample <= 4102444800000))
            
            valid_timestamp_ratio = (valid_seconds | valid_milliseconds).sum() / len(numeric_sample.dropna())
            
            # STRICTER CHECK: Need at least 90% to be in valid timestamp range
            # This prevents regular numbers like 2400 from being detected as dates
            if valid_timestamp_ratio > 0.9:
                return 'datetime'
    except:
        pass
    
    # Check for RFC 2822 format (contains day name and timezone)
    rfc_pattern = r'^[A-Za-z]{3},\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+[+-]\d{4}$'
    rfc_matches = sample_str.str.match(rfc_pattern, na=False).sum()
    if rfc_matches / len(sample_str) > threshold:
        return 'datetime'
    
    # Check with simple time patterns first (HH:MM or HH:MM:SS)
    # This prevents time-only values from being detected as datetime
    time_pattern = r'^\d{1,2}:\d{2}(:\d{2})?(\s*[AP]M)?$'
    time_matches = sample_str.str.match(time_pattern, na=False, flags=re.IGNORECASE).sum()
    if time_matches / len(sample_str) > threshold:
        return 'time'
    
    # Try time-only formats
    time_success_count = 0
    for fmt in TIME_FORMATS:
        try:
            # For time-only parsing, try to parse as time strings
            parsed = pd.to_datetime(sample_str, format=fmt, errors='coerce')
            success_count = parsed.notnull().sum()
            time_success_count = max(time_success_count, success_count)
            if success_count / len(sample_str) > threshold:
                return 'time'
        except:
            continue
    
    # Try datetime formats
    datetime_success_count = 0
    for fmt in DATETIME_FORMATS:
        try:
            parsed = pd.to_datetime(sample_str, format=fmt, errors='coerce')
            success_count = parsed.notnull().sum()
            datetime_success_count = max(datetime_success_count, success_count)
            if success_count / len(sample_str) > threshold:
                return 'datetime'
        except:
            continue
    
    # Try date-only formats
    date_success_count = 0
    for fmt in DATE_FORMATS:
        try:
            parsed = pd.to_datetime(sample_str, format=fmt, errors='coerce')
            success_count = parsed.notnull().sum()
            date_success_count = max(date_success_count, success_count)
            if success_count / len(sample_str) > threshold:
                return 'date'
        except:
            continue
    
    # Try flexible datetime parsing as last resort (handles many formats including long dates)
    # CRITICAL: Skip this check if sample contains only numeric values
    # This prevents integers like 2400, 2210 from being interpreted as dates
    try:
        # First check if all values are purely numeric (no date-like characters)
        numeric_sample = pd.to_numeric(sample_str, errors='coerce')
        if numeric_sample.notnull().sum() / len(sample_str) > threshold:
            # If most values are numeric, don't try datetime parsing
            # This prevents small integers from being misdetected as dates
            return None
        
        # Only try datetime parsing if values contain date-like characters
        parsed = pd.to_datetime(sample_str, errors='coerce')
        success_count = parsed.notnull().sum()
        if success_count / len(sample_str) > threshold:
            # Check if values have time component
            time_components = parsed.dropna().apply(lambda x: x.hour != 0 or x.minute != 0 or x.second != 0)
            if time_components.sum() > len(time_components) * 0.1:  # At least 10% have time
                return 'datetime'
            # If no time component, check if it's date
            return 'date'
    except:
        pass
    
    return None


def detect_column_types(df: pd.DataFrame, threshold: float = 0.5) -> dict:
    """
    Detect column types including datetime, date, and time.
    
    Args:
        df: DataFrame to analyze
        threshold: Minimum ratio for temporal type detection (default 0.5)
    
    Returns:
        Dictionary mapping column names to their detected types
    """
    dtype_mapping = {
        'object': 'string',
        'int64': 'integer',
        'int32': 'integer',
        'int16': 'integer',
        'int8': 'integer',
        'float64': 'float',
        'float32': 'float',
        'float16': 'float',
        'bool': 'boolean',
        'datetime64[ns]': 'datetime',
        'datetime64[ns, UTC]': 'datetime',
    }
    
    column_types = {}
    
    for column_name in df.columns:
        dtype_str = str(df[column_name].dtype)
        
        # Check for datetime variants first
        if 'datetime64' in dtype_str:
            column_types[column_name] = 'datetime'
        # Check if it's a known type in the mapping
        elif dtype_str in dtype_mapping:
            base_type = dtype_mapping[dtype_str]
            # For object/string types, check if it's temporal
            if base_type == 'string':
                temporal_type = detect_temporal_type(df[column_name], threshold)
                column_types[column_name] = temporal_type if temporal_type else 'string'
            # For integer types, check if they might be Unix timestamps
            # CRITICAL FIX: Only check integers > 100000 for timestamp detection
            # This prevents small integers like 2400, 2210 from being misdetected as dates
            elif base_type == 'integer':
                # Only check if values are large enough to be timestamps
                min_val = df[column_name].min()
                max_val = df[column_name].max()
                
                # Unix timestamps are typically > 946684800 (year 2000)
                # If max value is less than this, it's definitely not a timestamp
                if max_val >= 946684800:
                    temporal_type = detect_temporal_type(df[column_name].astype(str), threshold)
                    column_types[column_name] = temporal_type if temporal_type else 'integer'
                else:
                    # Small integers - definitely not timestamps
                    column_types[column_name] = 'integer'
            else:
                column_types[column_name] = base_type
        # Check for other integer types that might be timestamps
        elif 'int' in dtype_str.lower():
            # CRITICAL FIX: Only check large integers for timestamp detection
            min_val = df[column_name].min()
            max_val = df[column_name].max()
            
            # Only check for timestamps if values are large enough
            if max_val >= 946684800:
                temporal_type = detect_temporal_type(df[column_name].astype(str), threshold)
                column_types[column_name] = temporal_type if temporal_type else 'integer'
            else:
                # Small integers - definitely not timestamps
                column_types[column_name] = 'integer'
        else:
            column_types[column_name] = 'unknown'
    
    return column_types


def get_file_path(user_id: str, original_filename: str, upload_directory:str) -> str:
    # Create a timestamp string to append to the filename
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    # Generate a safe filename by removing any unsafe characters
    safe_filename = "".join(char for char in original_filename if char.isalnum() or char in "._-")
    # Construct the user's directory path
    user_directory = os.path.join(upload_directory, user_id)
    # Ensure the user's directory exists
    os.makedirs(user_directory, exist_ok=True)
    # Construct the full file path within the user's directory
    file_path = os.path.join(user_directory, f"{timestamp}__{safe_filename}")
    return file_path

def convert_to_datetime_if_majority_matches(df, threshold=0.5):
    for column in df.columns:
        # Only attempt to convert columns of type 'object' which may contain string representations of dates
        if df[column].dtype == 'object':
            summation = 0
            for date_format in date_formats:
                # Try to convert the column to datetime with the given format
                df_temp = pd.to_datetime(df[column], format=date_format, errors='coerce')
                summation += df_temp.notnull().sum()

            # Calculate the ratio of non-NaT entries to the total number of non-missing (non-null) entries
            valid_dates_ratio = summation / df[column].notnull().sum()
            # If more than 50% of the non-missing values were successfully parsed as dates
            if valid_dates_ratio > threshold:
                # Conversion successful - update the original DataFrame column
                df[column] = df_temp
            # If no date formats succeeded with the majority of values, the column remains unchanged

    return df

def clean_data(data):
    if isinstance(data, list):
        return [clean_data(item) for item in data]
    elif isinstance(data, dict):
        return {key: clean_data(value) for key, value in data.items()}
    elif isinstance(data, float) and (math.isnan(data) or math.isinf(data)):
        return None
    else:
        return data


def clean_csv_quotes(file_path: str) -> None:
    """
    Clean CSV file by removing quotes from column names and string values.
    Overwrites the original file with cleaned version.
    
    Args:
        file_path: Path to the CSV file to clean
    """
    try:
        # Read CSV with proper quote handling
        df = pd.read_csv(
            file_path,
            quotechar='"',
            skipinitialspace=True
        )
        
        # Strip quotes from column names
        df.columns = [str(col).strip().strip('"') for col in df.columns]
        
        # Strip quotes from string values in each column
        for col in df.columns:
            if df[col].dtype == 'object':  # Only process string columns
                df[col] = df[col].astype(str).str.strip().str.strip('"')
        
        # Save cleaned CSV back to the same file
        df.to_csv(file_path, index=False, quoting=1)  # quoting=1 means QUOTE_MINIMAL
        
    except Exception as e:
        # If cleaning fails, leave the file as is
        print(f"Warning: Could not clean CSV quotes: {str(e)}")


def sample_dataframe_for_plotting(df: pd.DataFrame, max_points: int = 10000, method: str = "systematic", drop_empty_rows: bool = True):
    """
    Intelligently sample a DataFrame for plotting to improve frontend performance.
    
    Args:
        df: DataFrame to sample
        max_points: Maximum number of data points to return (default: 10000)
        method: Sampling method - "systematic" or "random" (default: "systematic")
            - systematic: Every nth row, preserves temporal/sequential patterns
            - random: Random selection, better for avoiding pattern bias in scatter plots
        drop_empty_rows: Whether to drop rows where all values are NaN before sampling (default: True)
    
    Returns:
        tuple: (sampled_df, sampling_metadata)
            - sampled_df: The sampled DataFrame
            - sampling_metadata: Dict with sampling information
    """
    # Drop fully empty rows if requested
    if drop_empty_rows:
        df = df.dropna(how='all')
    
    total_rows = len(df)
    
    # If data is within limit, return as-is
    if total_rows <= max_points:
        return df, {
            "is_sampled": False,
            "total_rows": total_rows,
            "returned_rows": total_rows,
            "sampling_method": None,
            "sampling_interval": None,
            "sampling_ratio": 1.0
        }
    
    # Apply sampling based on selected method
    if method == "random":
        # Random sampling with fixed seed for reproducibility
        sampled_df = df.sample(n=max_points, random_state=42).sort_index()
        sampling_interval = None
        sampling_method = "random"
    else:
        # Systematic sampling (every nth row)
        # This preserves the temporal/sequential nature of data
        sampling_interval = total_rows / max_points
        
        # Calculate indices with safety bounds to prevent index out of range
        indices = [min(int(i * sampling_interval), total_rows - 1) for i in range(max_points)]
        sampled_df = df.iloc[indices].copy()
        sampling_method = "systematic"
    
    return sampled_df, {
        "is_sampled": True,
        "total_rows": total_rows,
        "returned_rows": len(sampled_df),
        "sampling_method": sampling_method,
        "sampling_interval": round(sampling_interval, 2) if sampling_interval else None,
        "sampling_ratio": round(len(sampled_df) / total_rows, 4)
    }