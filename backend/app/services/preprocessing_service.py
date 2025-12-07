"""
Data Preprocessing Service
===========================

Handles all data preprocessing operations including:
- Numeric preprocessing (scaling, outliers, binning)
- Categorical preprocessing (encoding, rare categories)
- Text preprocessing (stopwords, stemming, lemmatization)
- Datetime preprocessing (feature extraction, timezone)
- Boolean preprocessing (encoding)
- Identifier preprocessing (drop, hash)
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from sklearn.preprocessing import MinMaxScaler, StandardScaler, LabelEncoder
import hashlib
import logging

logger = logging.getLogger(__name__)


class PreprocessingService:
    """Service for applying preprocessing transformations to DataFrames"""
    
    @staticmethod
    async def apply_preprocessing(
        df: pd.DataFrame,
        column_types: Dict[str, str],  # column_name -> preprocessing_data_type
        config: Dict[str, Any],
        mode: str
    ) -> Dict[str, Any]:
        """
        Apply preprocessing transformations to DataFrame based on configuration.
        
        Args:
            df: Input DataFrame
            column_types: Dictionary mapping column names to preprocessing_data_type
                         e.g., {'age': 'Numeric', 'country': 'Categorical'}
            config: Preprocessing configuration from frontend
            mode: "simple" or "advanced"
        
        Returns:
            {
                'dataframe': processed DataFrame,
                'transformations': dict of transformations applied per column,
                'warnings': list of warning messages
            }
        """
        transformations_log = {}
        warnings = []
        
        # Work on a copy to avoid modifying original
        df_processed = df.copy()
        
        # Process each data type category
        for data_type, type_config in config.items():
            if not type_config:
                continue
            
            global_options = type_config.get('global')
            per_column_options = type_config.get('per_column', {})
            
            # Determine columns to process based on mode
            if mode == "simple" and global_options:
                # SIMPLE MODE: Find all columns matching this preprocessing type
                # Convert data_type key to match preprocessing_data_type format
                type_mapping = {
                    'numeric': 'Numeric',
                    'categorical': 'Categorical',
                    'text': 'Text',
                    'datetime': 'Datetime / Date',
                    'boolean': 'Boolean',
                    'identifier': 'ID / Unique Identifier',
                    'mixed': 'Mixed / Unknown / Dirty Data'
                }
                
                target_type = type_mapping.get(data_type)
                if target_type:
                    # Find all columns with this preprocessing_data_type
                    columns_to_process = [
                        col_name for col_name, col_type in column_types.items()
                        if col_type == target_type
                    ]
                    logger.info(f"Simple mode - Processing {len(columns_to_process)} columns of type '{target_type}': {columns_to_process}")
                else:
                    columns_to_process = []
            else:
                # ADVANCED MODE: Only process columns explicitly listed in per_column
                columns_to_process = list(per_column_options.keys())
            
            for column in columns_to_process:
                if column not in df_processed.columns:
                    warnings.append(f"Column '{column}' not found in dataset")
                    continue
                
                # Get options
                if mode == "simple":
                    # Use global options for all columns
                    options = global_options
                else:
                    # Use per-column options (can fall back to global)
                    options = per_column_options.get(column, {})
                    if not options and global_options:
                        options = global_options
                
                if not options:
                    continue
                
                # Check if column should be dropped
                # Note: In simple mode with global options, don't allow drop_column
                # (to prevent accidentally dropping ALL columns of a type)
                should_drop = False
                if mode == "advanced" or (mode == "simple" and column in per_column_options):
                    # Only allow drop_column in advanced mode or when explicitly set per-column
                    should_drop = options.get('drop_column', False) or options.get('drop', False)
                
                if should_drop:
                    # Drop the column
                    df_processed = df_processed.drop(columns=[column])
                    transformations_log[column] = ['column_dropped']
                    logger.info(f"Dropped column: {column}")
                    continue
                
                # Apply preprocessing based on type
                try:
                    if data_type == 'numeric':
                        df_processed, applied = PreprocessingService.preprocess_numeric(
                            df_processed, column, options
                        )
                        transformations_log[column] = applied
                    
                    elif data_type == 'categorical':
                        df_processed, applied = PreprocessingService.preprocess_categorical(
                            df_processed, column, options
                        )
                        transformations_log[column] = applied
                    
                    elif data_type == 'text':
                        df_processed, applied = PreprocessingService.preprocess_text(
                            df_processed, column, options
                        )
                        transformations_log[column] = applied
                    
                    elif data_type == 'datetime':
                        df_processed, applied = PreprocessingService.preprocess_datetime(
                            df_processed, column, options
                        )
                        transformations_log[column] = applied
                    
                    elif data_type == 'boolean':
                        df_processed, applied = PreprocessingService.preprocess_boolean(
                            df_processed, column, options
                        )
                        transformations_log[column] = applied
                    
                    elif data_type == 'identifier':
                        df_processed, applied = PreprocessingService.preprocess_identifier(
                            df_processed, column, options
                        )
                        transformations_log[column] = applied
                    
                    elif data_type == 'mixed':
                        df_processed, applied = PreprocessingService.preprocess_mixed(
                            df_processed, column, options
                        )
                        transformations_log[column] = applied
                
                except Exception as e:
                    logger.error(f"Failed to preprocess column '{column}': {str(e)}")
                    warnings.append(f"Failed to preprocess '{column}': {str(e)}")
        
        return {
            'dataframe': df_processed,
            'transformations': transformations_log,
            'warnings': warnings
        }
    
    @staticmethod
    def preprocess_numeric(df: pd.DataFrame, column: str, options: Dict[str, Any]) -> tuple:
        """
        Apply numeric preprocessing to a column.
        
        Returns:
            (processed DataFrame, list of transformations applied)
        """
        applied_transformations = []
        
        # 1. Handle missing values
        missing_strategy = options.get('missing', 'drop')
        
        if missing_strategy == 'drop':
            initial_rows = len(df)
            df = df.dropna(subset=[column])
            if len(df) < initial_rows:
                applied_transformations.append(f'dropped_{initial_rows - len(df)}_missing_rows')
        
        elif missing_strategy == 'fill_mean':
            if df[column].isnull().any():
                mean_value = df[column].mean()
                df[column].fillna(mean_value, inplace=True)
                applied_transformations.append(f'filled_missing_with_mean_{mean_value:.2f}')
        
        elif missing_strategy == 'fill_median':
            if df[column].isnull().any():
                median_value = df[column].median()
                df[column].fillna(median_value, inplace=True)
                applied_transformations.append(f'filled_missing_with_median_{median_value:.2f}')
        
        elif missing_strategy == 'fill_zero':
            if df[column].isnull().any():
                df[column].fillna(0, inplace=True)
                applied_transformations.append('filled_missing_with_zero')
        
        # 2. Remove outliers (using IQR method)
        if options.get('remove_outliers', False):
            initial_rows = len(df)
            Q1 = df[column].quantile(0.25)
            Q3 = df[column].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            df = df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]
            outliers_removed = initial_rows - len(df)
            if outliers_removed > 0:
                applied_transformations.append(f'removed_{outliers_removed}_outliers')
        
        # 3. Log transform
        if options.get('log_transform', False):
            df[column] = np.log1p(df[column].clip(lower=0))  # Ensure non-negative
            applied_transformations.append('log_transform')
        
        # 4. Scaling
        scaling = options.get('scaling', 'none')
        
        if scaling == 'normalize' or scaling == 'min_max':
            scaler = MinMaxScaler()
            df[column] = scaler.fit_transform(df[[column]])
            applied_transformations.append('min_max_scaling')
        
        elif scaling == 'standardize':
            scaler = StandardScaler()
            df[column] = scaler.fit_transform(df[[column]])
            applied_transformations.append('standardization')
        
        # 5. Binning
        binning = options.get('binning')
        if binning:
            bins = binning.get('bins', 5)
            try:
                if isinstance(bins, int):
                    df[f'{column}_binned'] = pd.cut(df[column], bins=bins, labels=False)
                elif isinstance(bins, list):
                    df[f'{column}_binned'] = pd.cut(df[column], bins=bins, labels=False)
                applied_transformations.append(f'binning_{bins}')
            except Exception as e:
                logger.warning(f"Binning failed for {column}: {e}")
        
        return df, applied_transformations
    
    @staticmethod
    def preprocess_categorical(df: pd.DataFrame, column: str, options: Dict[str, Any]) -> tuple:
        """
        Apply categorical preprocessing to a column.
        
        Returns:
            (processed DataFrame, list of transformations applied)
        """
        applied_transformations = []
        
        # 1. Handle missing values
        missing_strategy = options.get('missing', 'drop')
        
        if missing_strategy == 'drop':
            initial_rows = len(df)
            df = df.dropna(subset=[column])
            if len(df) < initial_rows:
                applied_transformations.append(f'dropped_{initial_rows - len(df)}_missing_rows')
        
        elif missing_strategy == 'fill_unknown':
            if df[column].isnull().any():
                df[column].fillna('Unknown', inplace=True)
                applied_transformations.append('filled_missing_with_unknown')
        
        # 2. Merge rare categories
        merge_rare = options.get('merge_rare')
        if merge_rare:
            threshold = merge_rare.get('threshold', 0.01)
            value_counts = df[column].value_counts(normalize=True)
            rare_categories = value_counts[value_counts < threshold].index.tolist()
            if rare_categories:
                df[column] = df[column].replace(rare_categories, 'Other')
                applied_transformations.append(f'merged_{len(rare_categories)}_rare_categories')
        
        # 3. Keep only top N categories
        top_n = options.get('top_n_categories')
        if top_n:
            top_categories = df[column].value_counts().head(top_n).index.tolist()
            df[column] = df[column].apply(lambda x: x if x in top_categories else 'Other')
            applied_transformations.append(f'kept_top_{top_n}_categories')
        
        # 4. Encoding
        encoding = options.get('encoding', 'one_hot')
        
        if encoding == 'one_hot':
            dummies = pd.get_dummies(df[column], prefix=column, drop_first=False)
            df = pd.concat([df, dummies], axis=1)
            df.drop(column, axis=1, inplace=True)
            applied_transformations.append(f'one_hot_encoding_{len(dummies.columns)}_columns')
        
        elif encoding == 'label_encode':
            le = LabelEncoder()
            df[column] = le.fit_transform(df[column].astype(str))
            applied_transformations.append('label_encoding')
        
        elif encoding == 'frequency_encode':
            freq_map = df[column].value_counts(normalize=True).to_dict()
            df[column] = df[column].map(freq_map)
            applied_transformations.append('frequency_encoding')
        
        return df, applied_transformations
    
    @staticmethod
    def preprocess_text(df: pd.DataFrame, column: str, options: Dict[str, Any]) -> tuple:
        """
        Apply text preprocessing to a column.
        
        Returns:
            (processed DataFrame, list of transformations applied)
        """
        applied_transformations = []
        
        # Ensure column is string type
        df[column] = df[column].astype(str)
        
        # 1. Lowercase
        if options.get('lowercase', False):
            df[column] = df[column].str.lower()
            applied_transformations.append('lowercase')
        
        # 2. Remove punctuation
        if options.get('remove_punctuation', False):
            df[column] = df[column].str.replace(r'[^\w\s]', '', regex=True)
            applied_transformations.append('remove_punctuation')
        
        # 3. Remove numbers
        if options.get('remove_numbers', False):
            df[column] = df[column].str.replace(r'\d+', '', regex=True)
            applied_transformations.append('remove_numbers')
        
        # 4. Remove extra spaces (always good to do)
        df[column] = df[column].str.replace(r'\s+', ' ', regex=True).str.strip()
        
        # 5. Remove stopwords
        if options.get('remove_stopwords', False):
            try:
                from nltk.corpus import stopwords
                stop_words = set(stopwords.words('english'))
                df[column] = df[column].apply(
                    lambda text: ' '.join([word for word in text.split() if word.lower() not in stop_words])
                )
                applied_transformations.append('remove_stopwords')
            except Exception as e:
                logger.warning(f"Stopwords removal failed: {e}. NLTK may not be installed.")
        
        # 6. Stemming or Lemmatization
        stem_or_lemma = options.get('stem_or_lemma', 'none')
        
        if stem_or_lemma == 'stem':
            try:
                from nltk.stem import PorterStemmer
                stemmer = PorterStemmer()
                df[column] = df[column].apply(
                    lambda text: ' '.join([stemmer.stem(word) for word in text.split()])
                )
                applied_transformations.append('stemming')
            except Exception as e:
                logger.warning(f"Stemming failed: {e}")
        
        elif stem_or_lemma == 'lemma':
            try:
                from nltk.stem import WordNetLemmatizer
                lemmatizer = WordNetLemmatizer()
                df[column] = df[column].apply(
                    lambda text: ' '.join([lemmatizer.lemmatize(word) for word in text.split()])
                )
                applied_transformations.append('lemmatization')
            except Exception as e:
                logger.warning(f"Lemmatization failed: {e}")
        
        # 7. Truncate to max length
        truncate_length = options.get('truncate_length')
        if truncate_length:
            df[column] = df[column].str[:truncate_length]
            applied_transformations.append(f'truncate_to_{truncate_length}_chars')
        
        # 8. Tokenize (returns list of words)
        if options.get('tokenize', False):
            df[f'{column}_tokens'] = df[column].str.split()
            applied_transformations.append('tokenization')
        
        # 9. Vectorization (convert text to numeric for ML models)
        vectorization = options.get('vectorization', 'none')
        
        if vectorization == 'tfidf':
            try:
                from sklearn.feature_extraction.text import TfidfVectorizer
                
                max_features = options.get('max_features', 100)  # Limit dimensions
                
                vectorizer = TfidfVectorizer(
                    max_features=max_features,
                    lowercase=False,  # Already done if user selected it
                    ngram_range=(1, 1)  # Unigrams only (can be extended)
                )
                
                # Fit and transform
                tfidf_matrix = vectorizer.fit_transform(df[column].fillna(''))
                feature_names = vectorizer.get_feature_names_out()
                
                # Convert to DataFrame
                tfidf_df = pd.DataFrame(
                    tfidf_matrix.toarray(),
                    columns=[f'{column}_tfidf_{name}' for name in feature_names],
                    index=df.index
                )
                
                # Add to original DataFrame
                df = pd.concat([df, tfidf_df], axis=1)
                applied_transformations.append(f'tfidf_vectorization_{len(feature_names)}_features')
                
                # Optionally drop original text column if specified
                if options.get('drop_original', True):
                    df = df.drop(columns=[column])
                    applied_transformations.append(f'dropped_original_text_column')
                
            except Exception as e:
                logger.warning(f"TF-IDF vectorization failed: {e}")
        
        elif vectorization == 'count':
            try:
                from sklearn.feature_extraction.text import CountVectorizer
                
                max_features = options.get('max_features', 100)
                
                vectorizer = CountVectorizer(
                    max_features=max_features,
                    lowercase=False
                )
                
                count_matrix = vectorizer.fit_transform(df[column].fillna(''))
                feature_names = vectorizer.get_feature_names_out()
                
                count_df = pd.DataFrame(
                    count_matrix.toarray(),
                    columns=[f'{column}_count_{name}' for name in feature_names],
                    index=df.index
                )
                
                df = pd.concat([df, count_df], axis=1)
                applied_transformations.append(f'count_vectorization_{len(feature_names)}_features')
                
                if options.get('drop_original', True):
                    df = df.drop(columns=[column])
                    applied_transformations.append(f'dropped_original_text_column')
                
            except Exception as e:
                logger.warning(f"Count vectorization failed: {e}")
        
        elif vectorization == 'sentence_transformer':
            try:
                from sentence_transformers import SentenceTransformer
                
                model_name = options.get('model', 'all-MiniLM-L6-v2')
                model = SentenceTransformer(model_name)
                
                # Generate embeddings
                embeddings = model.encode(df[column].fillna('').tolist(), show_progress_bar=False)
                
                # Create embedding columns
                embedding_df = pd.DataFrame(
                    embeddings,
                    columns=[f'{column}_emb_{i}' for i in range(embeddings.shape[1])],
                    index=df.index
                )
                
                df = pd.concat([df, embedding_df], axis=1)
                applied_transformations.append(f'sentence_transformer_{embeddings.shape[1]}_dim')
                
                if options.get('drop_original', True):
                    df = df.drop(columns=[column])
                    applied_transformations.append(f'dropped_original_text_column')
                
            except Exception as e:
                logger.warning(f"Sentence transformer failed: {e}. Install: pip install sentence-transformers")
        
        return df, applied_transformations
    
    @staticmethod
    def preprocess_datetime(df: pd.DataFrame, column: str, options: Dict[str, Any]) -> tuple:
        """
        Apply datetime preprocessing to a column.
        
        Returns:
            (processed DataFrame, list of transformations applied)
        """
        applied_transformations = []
        
        # Ensure column is datetime type
        if df[column].dtype != 'datetime64[ns]':
            df[column] = pd.to_datetime(df[column], errors='coerce')
        
        # 1. Handle missing values
        missing_strategy = options.get('missing', 'drop')
        
        if missing_strategy == 'drop':
            initial_rows = len(df)
            df = df.dropna(subset=[column])
            if len(df) < initial_rows:
                applied_transformations.append(f'dropped_{initial_rows - len(df)}_missing_rows')
        
        elif missing_strategy == 'fill_earliest':
            if df[column].isnull().any():
                earliest = df[column].min()
                df[column].fillna(earliest, inplace=True)
                applied_transformations.append('filled_missing_with_earliest')
        
        elif missing_strategy == 'fill_latest':
            if df[column].isnull().any():
                latest = df[column].max()
                df[column].fillna(latest, inplace=True)
                applied_transformations.append('filled_missing_with_latest')
        
        elif missing_strategy == 'fill_default':
            if df[column].isnull().any():
                df[column].fillna(pd.Timestamp('2000-01-01'), inplace=True)
                applied_transformations.append('filled_missing_with_default_2000-01-01')
        
        # 2. Round datetime
        round_to = options.get('round')
        if round_to == 'day':
            df[column] = df[column].dt.floor('D')
            applied_transformations.append('rounded_to_day')
        elif round_to == 'hour':
            df[column] = df[column].dt.floor('H')
            applied_transformations.append('rounded_to_hour')
        elif round_to == 'minute':
            df[column] = df[column].dt.floor('T')
            applied_transformations.append('rounded_to_minute')
        
        # 3. Convert timezone
        timezone = options.get('convert_timezone')
        if timezone:
            try:
                if df[column].dt.tz is None:
                    df[column] = df[column].dt.tz_localize('UTC')
                df[column] = df[column].dt.tz_convert(timezone)
                applied_transformations.append(f'converted_to_{timezone}')
            except Exception as e:
                logger.warning(f"Timezone conversion failed: {e}")
        
        # 4. Extract datetime features
        extract_features = options.get('extract', [])
        
        for feature in extract_features:
            if feature == 'year':
                df[f'{column}_year'] = df[column].dt.year
                applied_transformations.append('extracted_year')
            elif feature == 'month':
                df[f'{column}_month'] = df[column].dt.month
                applied_transformations.append('extracted_month')
            elif feature == 'day':
                df[f'{column}_day'] = df[column].dt.day
                applied_transformations.append('extracted_day')
            elif feature == 'hour':
                df[f'{column}_hour'] = df[column].dt.hour
                applied_transformations.append('extracted_hour')
            elif feature == 'minute':
                df[f'{column}_minute'] = df[column].dt.minute
                applied_transformations.append('extracted_minute')
            elif feature == 'second':
                df[f'{column}_second'] = df[column].dt.second
                applied_transformations.append('extracted_second')
            elif feature == 'weekday':
                df[f'{column}_weekday'] = df[column].dt.dayofweek
                applied_transformations.append('extracted_weekday')
        
        # 5. Drop original column if requested
        if options.get('drop_original', False) and extract_features:
            df.drop(column, axis=1, inplace=True)
            applied_transformations.append('dropped_original_column')
        
        return df, applied_transformations
    
    @staticmethod
    def preprocess_boolean(df: pd.DataFrame, column: str, options: Dict[str, Any]) -> tuple:
        """
        Apply boolean preprocessing to a column.
        
        Returns:
            (processed DataFrame, list of transformations applied)
        """
        applied_transformations = []
        
        # 1. Handle missing values
        missing_strategy = options.get('missing', 'drop')
        
        if missing_strategy == 'drop':
            initial_rows = len(df)
            df = df.dropna(subset=[column])
            if len(df) < initial_rows:
                applied_transformations.append(f'dropped_{initial_rows - len(df)}_missing_rows')
        
        elif missing_strategy == 'fill_true':
            if df[column].isnull().any():
                df[column].fillna(True, inplace=True)
                applied_transformations.append('filled_missing_with_true')
        
        elif missing_strategy == 'fill_false':
            if df[column].isnull().any():
                df[column].fillna(False, inplace=True)
                applied_transformations.append('filled_missing_with_false')
        
        # 2. Encoding
        encode = options.get('encode', 'keep_boolean')
        
        if encode == '0_1':
            df[column] = df[column].astype(int)
            applied_transformations.append('encoded_to_0_1')
        # else: keep as boolean
        
        return df, applied_transformations
    
    @staticmethod
    def preprocess_identifier(df: pd.DataFrame, column: str, options: Dict[str, Any]) -> tuple:
        """
        Apply identifier preprocessing to a column.
        
        Returns:
            (processed DataFrame, list of transformations applied)
        """
        applied_transformations = []
        
        # 1. Drop column
        if options.get('drop', False):
            df.drop(column, axis=1, inplace=True)
            applied_transformations.append('dropped_column')
            return df, applied_transformations
        
        # 2. Hash encoding
        if options.get('hash_encode', False):
            df[column] = df[column].apply(
                lambda x: hashlib.md5(str(x).encode()).hexdigest()[:8] if pd.notnull(x) else None
            )
            applied_transformations.append('hash_encoded')
        
        return df, applied_transformations
    
    @staticmethod
    def preprocess_mixed(df: pd.DataFrame, column: str, options: Dict[str, Any]) -> tuple:
        """
        Apply preprocessing to mixed/unknown/dirty data columns.
        
        Options:
        - convert_to: Try to convert to specific type ("numeric", "string", "datetime")
        - drop: Drop the column if too messy
        - fill_missing: How to handle missing values
        - keep_as_string: Keep as string without conversion
        
        Returns:
            (processed DataFrame, list of transformations applied)
        """
        applied_transformations = []
        
        # 1. Drop column if requested
        if options.get('drop', False):
            df.drop(column, axis=1, inplace=True)
            applied_transformations.append('dropped_messy_column')
            return df, applied_transformations
        
        # 2. Try to convert to specific type
        convert_to = options.get('convert_to', 'keep_as_string')
        
        if convert_to == 'numeric':
            # Try to convert to numeric
            original_type = df[column].dtype
            df[column] = pd.to_numeric(df[column], errors='coerce')
            converted_count = df[column].notnull().sum()
            applied_transformations.append(f'converted_to_numeric_{converted_count}_values')
        
        elif convert_to == 'datetime':
            # Try to convert to datetime
            df[column] = pd.to_datetime(df[column], errors='coerce')
            converted_count = df[column].notnull().sum()
            applied_transformations.append(f'converted_to_datetime_{converted_count}_values')
        
        elif convert_to == 'string':
            # Convert to string
            df[column] = df[column].astype(str)
            applied_transformations.append('converted_to_string')
        
        # 3. Handle missing values (after conversion, may have more NaNs)
        fill_missing = options.get('fill_missing', 'drop')
        
        if fill_missing == 'drop':
            initial_rows = len(df)
            df = df.dropna(subset=[column])
            if len(df) < initial_rows:
                applied_transformations.append(f'dropped_{initial_rows - len(df)}_rows_with_missing')
        
        elif fill_missing == 'fill_default':
            # Fill with a default value based on the target type
            if df[column].isnull().any():
                if convert_to == 'numeric':
                    df[column].fillna(0, inplace=True)
                    applied_transformations.append('filled_missing_with_0')
                elif convert_to == 'string' or convert_to == 'keep_as_string':
                    df[column].fillna('Unknown', inplace=True)
                    applied_transformations.append('filled_missing_with_Unknown')
        
        return df, applied_transformations

