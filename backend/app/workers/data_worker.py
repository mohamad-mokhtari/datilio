import pandas as pd
import numpy as np


def determine_preprocessing_type(column_name: str, dtype: str, num_unique: int, total_rows: int, 
                                 max_length: float = None, has_mixed_content: bool = False) -> str:
    """
    Determine preprocessing data type based on column characteristics.
    
    Returns one of:
    - Numeric
    - Categorical
    - Text
    - Datetime / Date
    - Boolean
    - ID / Unique Identifier
    - Mixed / Unknown / Dirty Data
    """
    # ID / Unique Identifier detection
    # Check if column name suggests it's an ID
    id_patterns = ['id', 'uuid', 'key', 'identifier']
    column_lower = column_name.lower()
    is_likely_id = any(pattern in column_lower for pattern in id_patterns)
    
    # Calculate uniqueness ratio
    uniqueness_ratio = num_unique / total_rows if total_rows > 0 else 0
    
    # ID detection: high uniqueness + ID-like name
    if is_likely_id and uniqueness_ratio > 0.95:
        return "ID / Unique Identifier"
    
    # Boolean
    if dtype == "boolean":
        return "Boolean"
    
    # Numeric (integer or float)
    if dtype in ["integer", "float"]:
        return "Numeric"
    
    # Datetime / Date / Time
    if dtype in ["datetime", "date", "time"]:
        return "Datetime / Date"
    
    # String types - differentiate between Categorical, Text, and Mixed
    if dtype == "string":
        # Check for mixed/dirty data indicators
        if has_mixed_content or 'mixed' in column_lower or 'dirty' in column_lower:
            return "Mixed / Unknown / Dirty Data"
        
        # Categorical vs Text decision:
        # Use MULTIPLE signals for accurate classification
        
        # Signal 1: Check column name for text indicators
        text_indicators = ['text', 'description', 'comment', 'note', 'bio', 'message', 'content', 'body']
        is_text_name = any(indicator in column_lower for indicator in text_indicators)
        
        # Signal 2: Check for high uniqueness (most values are unique)
        is_high_uniqueness = uniqueness_ratio > 0.7
        
        # Signal 3: Check for very high uniqueness (almost all unique)
        is_very_high_uniqueness = uniqueness_ratio >= 0.95
        
        # Signal 4: Check for long text (avg length > 30 chars)
        is_long_text = max_length and max_length > 30
        
        # RULE 1: If column name suggests text AND (high uniqueness OR long text) → Text
        # This catches text_description, bio, comment, etc.
        if is_text_name and (is_high_uniqueness or is_long_text):
            return "Text"
        
        # RULE 2: If almost all values unique (≥95%) AND length > 20 → Text
        # Example: 5 unique descriptions in 5 rows with avg 47 chars → Text
        if is_very_high_uniqueness and max_length and max_length > 20:
            return "Text"
        
        # RULE 3: If average text length > 50 chars → Text (regardless of uniqueness)
        if max_length and max_length > 50:
            return "Text"
        
        # RULE 4: If very few unique values (≤10) BUT column name suggests category → Categorical
        # Example: 4 cities → Categorical, but NOT if name is "text_something"
        if num_unique <= 10 and not is_text_name:
            return "Categorical"
        
        # RULE 5: If few unique (11-20) but LOW uniqueness (<50%) → Categorical
        # Example: 15 unique countries in 1000 rows = 1.5% → Categorical
        if num_unique <= 20 and uniqueness_ratio < 0.5:
            return "Categorical"
        
        # RULE 6: If many unique (>20) but very LOW ratio (<10%) → Categorical
        # Example: 100 unique cities in 10,000 rows = 1% → Categorical
        if uniqueness_ratio < 0.1:
            return "Categorical"
        
        # RULE 7: Medium uniqueness (10-70%) → Likely Categorical
        if uniqueness_ratio < 0.7:
            return "Categorical"
        
        # RULE 8: High uniqueness (>70%) → Text
        # Example: 450 unique descriptions in 500 rows → Text
        if uniqueness_ratio > 0.7:
            return "Text"
        
        # Default for strings: Categorical
        return "Categorical"
    
    # Unknown or mixed types
    if dtype == "unknown":
        return "Mixed / Unknown / Dirty Data"
    
    # Default fallback
    return "Mixed / Unknown / Dirty Data"


def convert_to_python_type(val):
    """Convert numpy/pandas types to native Python types for JSON serialization"""
    if pd.isna(val):
        return None
    elif isinstance(val, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(val)
    elif isinstance(val, (np.floating, np.float64, np.float32, np.float16)):
        return float(val)
    elif isinstance(val, np.bool_):
        return bool(val)
    elif isinstance(val, np.ndarray):
        return [convert_to_python_type(v) for v in val]
    elif isinstance(val, (pd.Timestamp, pd.DatetimeTZDtype)):
        return val.isoformat()
    else:
        return val


async def get_columns_details(df_type_infer, column_types):
    column_details = []
    total_rows = len(df_type_infer)
    
    for name, d_type in column_types.items():
        item={}
        item["name"] = str(name)
        item["dtype"] = str(d_type)
        
        num_unique = int(df_type_infer[name].nunique())
        item["num_unique_values"] = num_unique
        
        # Calculate missing ratio
        total_count = len(df_type_infer[name])
        missing_count = df_type_infer[name].isnull().sum()
        item["missing_ratio"] = float(missing_count / total_count) if total_count > 0 else 0.0
        unique_values = df_type_infer[name].unique()
        
        # For string columns, calculate max_length and check for mixed content BEFORE determining preprocessing type
        max_length = None
        has_mixed_content = False
        
        if d_type == "string":
            # Calculate max length
            max_length = float(df_type_infer[name].map(lambda x: len(str(x)) if pd.notnull(x) else 0).max())
            
            # Check for mixed content (has both numeric and text values)
            sample_values = df_type_infer[name].dropna().head(min(50, len(df_type_infer[name])))
            if len(sample_values) > 0:
                sample_values_str = sample_values.astype(str)
                numeric_count = pd.to_numeric(sample_values_str, errors='coerce').notnull().sum()
                # If some values are numeric and some are not, it's mixed
                if 0 < numeric_count < len(sample_values):
                    has_mixed_content = True
        
        # Determine preprocessing data type
        item["preprocessing_data_type"] = determine_preprocessing_type(
            column_name=str(name),
            dtype=str(d_type),
            num_unique=num_unique,
            total_rows=total_rows,
            max_length=max_length,
            has_mixed_content=has_mixed_content
        )
        
        if d_type == "string":
            mode_val = df_type_infer[name].mode()
            item["most_frequent"] = convert_to_python_type(mode_val.iloc[0]) if not mode_val.empty else None
            item["max_length"] = max_length  # Already calculated above
            if len(unique_values) <= 10:
                item["unique_values"] = [convert_to_python_type(v) for v in unique_values]

        elif d_type == "integer":
            item["min"] = float(df_type_infer[name].min())
            item["max"] = float(df_type_infer[name].max())
            item["mean"] = float(df_type_infer[name].mean()) 
            item["median"] = float(df_type_infer[name].median()) 
            item["std_dev"] = float(df_type_infer[name].std()) 
            if len(unique_values) <= 10:
                item["unique_values"] = [convert_to_python_type(v) for v in unique_values]

        elif d_type == "float":
            item["min"] = float(df_type_infer[name].min())
            item["max"] = float(df_type_infer[name].max())
            item["mean"] = float(df_type_infer[name].mean())
            item["median"] = float(df_type_infer[name].median())
            item["std_dev"] = float(df_type_infer[name].std())
            if len(unique_values) <= 10:
                item["unique_values"] = [convert_to_python_type(v) for v in unique_values]

        elif d_type == "datetime":
            # Handle datetime columns (might already be datetime64 or string)
            try:
                if df_type_infer[name].dtype == 'object':
                    # Convert to datetime for processing if still string
                    temp_series = pd.to_datetime(df_type_infer[name], errors='coerce')
                    item["earliest"] = temp_series.min().isoformat() if pd.notnull(temp_series.min()) else None
                    item["latest"] = temp_series.max().isoformat() if pd.notnull(temp_series.max()) else None
                    if len(unique_values) <= 10:
                        item["unique_values"] = [pd.to_datetime(val, errors='coerce').isoformat() if pd.notnull(pd.to_datetime(val, errors='coerce')) else str(val) for val in unique_values if pd.notnull(val)]
                else:
                    item["earliest"] = df_type_infer[name].min().isoformat() if pd.notnull(df_type_infer[name].min()) else None
                    item["latest"] = df_type_infer[name].max().isoformat() if pd.notnull(df_type_infer[name].max()) else None
                    if len(unique_values) <= 10:
                        item["unique_values"] = [val.isoformat() for val in unique_values if pd.notnull(val)]
            except:
                # Fallback to string handling if datetime conversion fails
                item["sample_values"] = [convert_to_python_type(v) for v in df_type_infer[name].dropna().head(5)]

        elif d_type == "date":
            # Handle date-only columns (usually stored as strings)
            try:
                temp_series = pd.to_datetime(df_type_infer[name], errors='coerce')
                item["earliest"] = temp_series.min().date().isoformat() if pd.notnull(temp_series.min()) else None
                item["latest"] = temp_series.max().date().isoformat() if pd.notnull(temp_series.max()) else None
                if len(unique_values) <= 10:
                    item["unique_values"] = [convert_to_python_type(v) for v in unique_values]
            except:
                # Fallback to showing sample values
                item["sample_values"] = [convert_to_python_type(v) for v in df_type_infer[name].dropna().head(5)]

        elif d_type == "time":
            # Handle time-only columns (usually stored as strings)
            mode_val = df_type_infer[name].mode()
            item["most_frequent"] = convert_to_python_type(mode_val.iloc[0]) if not mode_val.empty else None
            if len(unique_values) <= 10:
                item["unique_values"] = [convert_to_python_type(v) for v in unique_values]
            else:
                item["sample_values"] = [convert_to_python_type(v) for v in df_type_infer[name].dropna().head(5)]

        elif d_type == "boolean":
            item["num_true"] = int(df_type_infer[name].sum())
            item["num_false"] = int(len(df_type_infer[name]) - df_type_infer[name].sum())
            item["unique_values"] = [convert_to_python_type(v) for v in unique_values]
        
        else:
            # Handle unknown types gracefully
            mode_val = df_type_infer[name].mode()
            item["most_frequent"] = convert_to_python_type(mode_val.iloc[0]) if not mode_val.empty else None
            if len(unique_values) <= 10:
                item["unique_values"] = [convert_to_python_type(v) for v in unique_values]
            else:
                item["sample_values"] = [convert_to_python_type(v) for v in df_type_infer[name].dropna().head(5)]

        column_details.append(item)
    
    return column_details


    