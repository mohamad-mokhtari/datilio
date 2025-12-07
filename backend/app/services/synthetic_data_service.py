from typing import Dict, Any, List
import pandas as pd
import numpy as np
import os
import random
from datetime import datetime
from mimesis import (Person, Address, Finance, Datetime, Food, Text, 
                    Code, Cryptographic, Development, File, Hardware,
                    Internet, Numeric, Path, Payment, Transport,
                    Science)
from mimesis.enums import (TitleType, TimestampFormat, TimezoneRegion, 
                         DurationUnit, EmojyCategory, EANFormat, 
                         ISBNFormat, Algorithm, FileType, MimeType,
                         DSNType, TLDType, URLScheme, PortRange,
                         CardType, MeasureUnit, MetricPrefixSign, Locale as enumLocal,
                         AudioFile, CompressedFile, CountryCode, DocumentFile,
                         IPv4Purpose, ImageFile, NumType, VideoFile, Gender)
from mimesis.locales import Locale
from enum import Enum
from app.lists.synthethic_categories import ALL_DATA, MIMESIS_PROVIDERS
from app.core.db_setup import get_db
from app.models.user_lists import UserList, ListItem
from app.helpers.storage_helpers import StorageManager


class SyntheticDataService:
    # Note: File storage is now handled by StorageManager in storage_helpers.py
    # This provides a unified, portable storage system for all user data files

    # Mapping of all categorical enum types for "mix" feature
    ENUM_TYPES = {
        'Gender': Gender,
        'TitleType': TitleType,
        'EmojyCategory': EmojyCategory,
        'FileType': FileType,
        'MimeType': MimeType,
        'AudioFile': AudioFile,
        'VideoFile': VideoFile,
        'ImageFile': ImageFile,
        'DocumentFile': DocumentFile,
        'CompressedFile': CompressedFile,
        'CardType': CardType,
        'Algorithm': Algorithm,
        'TimestampFormat': TimestampFormat,
        'TimezoneRegion': TimezoneRegion,
        'DurationUnit': DurationUnit,
        'EANFormat': EANFormat,
        'ISBNFormat': ISBNFormat,
        'TLDType': TLDType,
        'URLScheme': URLScheme,
        'MetricPrefixSign': MetricPrefixSign,
        'CountryCode': CountryCode,
        'NumType': NumType,
        'Locale': enumLocal,
        'DSNType': DSNType,
        'PortRange': PortRange,
        # Note: IPv4Purpose, MeasureUnit have tuple values, handled differently
    }

    @staticmethod
    def get_random_enum_value(enum_class):
        """Get a random value from an enum class"""
        return random.choice(list(enum_class))

    @staticmethod
    def get_provider_and_method(category: str, field: str, locale: Locale):
        """
        Get the appropriate provider and method based on category.
        
        Args:
            category: The category of data (e.g., 'mimesis_person', 'mimesis_address')
            field: The field name to generate
            locale: The locale to use for the provider
            
        Returns:
            Tuple of (provider instance, method)
        """
        if category == 'mimesis_person':
            provider = Person(locale=locale)
        elif category == 'mimesis_address':
            provider = Address(locale=locale)
        elif category == 'mimesis_finance':
            provider = Finance(locale=locale)
        elif category == 'mimesis_datetime':
            provider = Datetime(locale=locale)
        elif category == 'mimesis_food':
            provider = Food(locale=locale)
        elif category == 'mimesis_text':
            provider = Text(locale=locale)
        elif category == 'mimesis_code':
            provider = Code()  # Code provider doesn't need locale
        elif category == 'mimesis_cryptographic':
            provider = Cryptographic()  # Cryptographic provider doesn't need locale
        elif category == 'mimesis_development':
            provider = Development()  # Development provider doesn't need locale
        elif category == 'mimesis_file':
            provider = File()  # File provider doesn't need locale
        elif category == 'mimesis_hardware':
            provider = Hardware()  # Hardware provider doesn't need locale
        elif category == 'mimesis_internet':
            provider = Internet()  # Internet provider doesn't need locale
        elif category == 'mimesis_numeric':
            provider = Numeric()  # Numeric provider doesn't need locale
        elif category == 'mimesis_path':
            provider = Path()  # Path provider doesn't need locale
        elif category == 'mimesis_payment':
            provider = Payment()  # Payment provider doesn't need locale
        elif category == 'mimesis_transport':
            provider = Transport()  # Transport provider doesn't need locale
        elif category == 'mimesis_science':
            provider = Science()  # Science provider doesn't need locale
        elif category == 'numpy_distribution':
            return np.random, field  # Return numpy.random module and distribution name
        else:
            raise ValueError(f"Unsupported category: {category}")
        
        return provider, getattr(provider, field)

    @staticmethod
    def process_special_params(param_value: Any) -> Any:
        """Process special parameter values that need conversion"""
        if not isinstance(param_value, str):
            return param_value
        
        # Handle empty strings - return a special marker to exclude this param
        if param_value.strip() == '':
            return '__EMPTY_PARAM__'

        # Handle boolean strings (must be checked before numeric conversion)
        if param_value.lower() in ('true', 'false'):
            return param_value.lower() == 'true'

        # Try to convert numeric strings to actual numbers
        try:
            # Check if it's an integer
            if param_value.isdigit() or (param_value.startswith('-') and param_value[1:].isdigit()):
                return int(param_value)
            # Check if it's a float
            if '.' in param_value:
                try:
                    return float(param_value)
                except ValueError:
                    pass
        except (ValueError, AttributeError):
            pass

        # Handle different types of special parameters
        # Check if it's a mimesis enum parameter
        if param_value.startswith('mimesis.'):
            parts = param_value.split('.')
            if len(parts) >= 3:  # e.g., mimesis.Gender.MALE
                enum_type = parts[1]  # e.g., "Gender"
                enum_value = parts[2]  # e.g., "MALE" or "RANDOM" or "MIX"
                
                # Special handling for MIX/RANDOM - return marker for later processing
                if enum_value.upper() in ('MIX', 'RANDOM'):
                    return f'__MIX__{enum_type}__'
                
                # Map enum type to its class and get the value
                enum_class_map = {
                    'Gender': Gender,
                    'TitleType': TitleType,
                    'TimestampFormat': TimestampFormat,
                    'TimezoneRegion': TimezoneRegion,
                    'DurationUnit': DurationUnit,
                    'EmojyCategory': EmojyCategory,
                    'EANFormat': EANFormat,
                    'ISBNFormat': ISBNFormat,
                    'Algorithm': Algorithm,
                    'FileType': FileType,
                    'MimeType': MimeType,
                    'DSNType': DSNType,
                    'TLDType': TLDType,
                    'URLScheme': URLScheme,
                    'PortRange': PortRange,
                    'CardType': CardType,
                    'MeasureUnit': MeasureUnit,
                    'MetricPrefixSign': MetricPrefixSign,
                    'Locale': enumLocal,
                    'AudioFile': AudioFile,
                    'CompressedFile': CompressedFile,
                    'CountryCode': CountryCode,
                    'DocumentFile': DocumentFile,
                    'IPv4Purpose': IPv4Purpose,
                    'ImageFile': ImageFile,
                    'NumType': NumType,
                    'VideoFile': VideoFile,
                }
                
                if enum_type in enum_class_map:
                    return getattr(enum_class_map[enum_type], enum_value)
        
        # Handle simple string "mix" or "random" values
        if param_value.lower() in ('mix', 'random'):
            return 'mix'
        elif param_value == 'request.row_number':
            # This will be replaced with actual row number in create_synthetic_data
            return 'ROW_NUMBER_PLACEHOLDER'
        elif param_value.startswith("'") and param_value.endswith("'"):
            return param_value.strip("'")
        elif param_value.startswith('datetime('):
            # Handle datetime parameters
            try:
                # Extract parameters from datetime string
                params = param_value.replace('datetime(', '').replace(')', '').split(',')
                params = [int(p.strip()) for p in params]
                return datetime(*params)
            except Exception as e:
                print(f"Error parsing datetime parameter: {e}")
                return param_value
        elif param_value.startswith('[') and param_value.endswith(']'):
            # Handle list parameters (like subdomains)
            try:
                # Convert string representation of list to actual list
                items = param_value.strip('[]').split(',')
                return [item.strip().strip("'\"") for item in items]
            except Exception as e:
                print(f"Error parsing list parameter: {e}")
                return param_value
        elif param_value.startswith('(') and param_value.endswith(')'):
            # Handle tuple parameters (like drange for username)
            try:
                # Convert string representation of tuple to actual tuple
                items = param_value.strip('()').split(',')
                # Try to convert items to integers (for ranges like drange)
                try:
                    return tuple(int(item.strip()) for item in items if item.strip())
                except ValueError:
                    # If not integers, keep as strings
                    return tuple(item.strip().strip("'\"") for item in items if item.strip())
            except Exception as e:
                print(f"Error parsing tuple parameter: {e}")
                return param_value
        
        return param_value

    @staticmethod
    def apply_sticked_methods(value: Any, sticked_methods: List[str]) -> Any:
        """Apply additional methods to the generated value"""
        if not sticked_methods:
            return value
        
        result = value
        for method in sticked_methods:
            if method.startswith('.'):
                method = method[1:]  # Remove the leading dot
                if hasattr(result, method):
                    result = getattr(result, method)()
        return result

    @staticmethod
    def create_synthetic_data(columns_info: Dict[str, Any], num_rows: int = 3) -> pd.DataFrame:
        """
        Create synthetic data based on the provided columns_info.
        """
        # Initialize the data dictionary
        data: Dict[str, List] = {col_name: [] for col_name in columns_info['columns'].keys()}
        
        # Get database session for user_list category if needed
        db_session = None
        if any(col_config['category'].startswith('list_') for col_config in columns_info['columns'].values()):
            db_session = next(get_db())
        
        # Handle numpy distributions first
        for col_name, col_config in columns_info['columns'].items():
            if col_config['category'] == 'numpy_distribution':
                try:
                    provider, field_method = SyntheticDataService.get_provider_and_method(
                        category=col_config['category'],
                        field=col_config['field'],
                        locale=Locale.EN
                    )
                    
                    # Process parameters
                    params = col_config.get('params', {})
                    processed_params = {
                        param_name: SyntheticDataService.process_special_params(param_value)
                        for param_name, param_value in params.items()
                    }
                    
                    # Remove empty parameters
                    processed_params = {k: v for k, v in processed_params.items() if v != '__EMPTY_PARAM__'}
                    
                    # Replace ROW_NUMBER_PLACEHOLDER with actual num_rows
                    for key, value in processed_params.items():
                        if value == 'ROW_NUMBER_PLACEHOLDER':
                            processed_params[key] = num_rows
                    
                    # Generate values using numpy distribution
                    values = getattr(provider, field_method)(**processed_params)
                    data[col_name] = list(values)  # Convert numpy array to list
                except Exception as e:
                    print(f"Error generating {col_name}: {str(e)}")
                    data[col_name] = [None] * num_rows
        
        # Cache for user lists to avoid repeated database queries
        user_lists_cache = {}
        
        # Cache for providers to maintain state across rows (e.g., for increment())
        # Key: (category, locale) -> Value: provider instance
        provider_cache = {}
        
        # Generate data for non-numpy providers
        for _ in range(num_rows):
            for col_name, col_config in columns_info['columns'].items():
                # Skip columns already handled by numpy
                if col_config['category'] == 'numpy_distribution':
                    continue
                
                category = col_config['category']
                field = col_config['field']
                
                try:
                    # Handle user_list category (new format: list_{UUID})
                    if category.startswith('list_'):
                        # Extract UUID from category (format: list_{UUID})
                        list_uuid = category.replace('list_', '')
                        
                        # Use cached list items if available
                        if list_uuid not in user_lists_cache and db_session:
                            user_list = db_session.query(UserList).filter(UserList.id == list_uuid).first()
                            if user_list:
                                list_items = db_session.query(ListItem).filter(ListItem.list_id == user_list.id).all()
                                user_lists_cache[list_uuid] = [item.value for item in list_items]
                            else:
                                user_lists_cache[list_uuid] = []
                        
                        # Randomly select an item from the list
                        if list_uuid in user_lists_cache and user_lists_cache[list_uuid]:
                            value = random.choice(user_lists_cache[list_uuid])
                        else:
                            value = None
                            print(f"Warning: No items found for list with UUID '{list_uuid}'")
                        
                        data[col_name].append(value)
                    else:
                        # First, process parameters to check for locale
                        params = col_config.get('params', {})
                        processed_params = {
                            param_name: SyntheticDataService.process_special_params(param_value)
                            for param_name, param_value in params.items()
                        }
                        
                        # Determine the locale to use for provider creation
                        provider_locale = Locale.EN  # Default
                        if 'locale' in processed_params:
                            locale_param = processed_params['locale']
                            # Check if it's a MIX marker for Locale
                            if isinstance(locale_param, str) and locale_param == '__MIX__Locale__':
                                # Pick a random locale
                                provider_locale = SyntheticDataService.get_random_enum_value(enumLocal)
                                # Update processed_params with the chosen locale
                                processed_params['locale'] = provider_locale
                            elif hasattr(locale_param, 'value'):
                                # It's already a Locale enum
                                provider_locale = locale_param
                            # If it's neither, keep default Locale.EN
                        
                        # Get or create cached provider instance (to maintain state for methods like increment())
                        cache_key = (category, str(provider_locale))
                        if cache_key not in provider_cache:
                            provider, _ = SyntheticDataService.get_provider_and_method(
                                category=category,
                                field=field,
                                locale=provider_locale
                            )
                            provider_cache[cache_key] = provider
                        else:
                            provider = provider_cache[cache_key]
                        
                        # Get the method for this specific field
                        field_method = getattr(provider, field)
                        
                        # Handle MIX/RANDOM for all enum parameters (must create new dict to avoid iteration issues)
                        final_params = {}
                        for param_name, param_value in processed_params.items():
                            # Skip empty parameters - don't pass them to the method
                            if param_value == '__EMPTY_PARAM__':
                                continue
                            
                            # Check if this is a mix marker (format: __MIX__EnumType__)
                            if isinstance(param_value, str) and param_value.startswith('__MIX__') and param_value.endswith('__'):
                                enum_type = param_value.replace('__MIX__', '').replace('__', '')
                                if enum_type in SyntheticDataService.ENUM_TYPES:
                                    # Randomly select a value from this enum type
                                    final_params[param_name] = SyntheticDataService.get_random_enum_value(
                                        SyntheticDataService.ENUM_TYPES[enum_type]
                                    )
                                else:
                                    final_params[param_name] = param_value
                            # Handle simple "mix" or "random" strings
                            elif param_value == 'mix' or param_value == 'random':
                                # Try to infer the enum type from parameter name
                                if param_name == 'gender':
                                    final_params[param_name] = random.choice([Gender.MALE, Gender.FEMALE])
                                elif param_name == 'locale':
                                    final_params[param_name] = random.choice(list(enumLocal))
                                elif param_name == 'title_type':
                                    final_params[param_name] = random.choice(list(TitleType))
                                elif param_name == 'category' and category == 'mimesis_text':  # emoji category
                                    final_params[param_name] = random.choice(list(EmojyCategory))
                                elif param_name == 'file_type':
                                    final_params[param_name] = random.choice(list(FileType))
                                elif param_name == 'card_type':
                                    final_params[param_name] = random.choice(list(CardType))
                                elif param_name == 'algorithm':
                                    final_params[param_name] = random.choice(list(Algorithm))
                                elif param_name == 'code':  # country_code parameter
                                    final_params[param_name] = random.choice(list(CountryCode))
                                elif param_name == 'region':  # timezone region
                                    final_params[param_name] = random.choice(list(TimezoneRegion))
                                elif param_name == 'dsn_type':  # DSN type parameter
                                    final_params[param_name] = random.choice(list(DSNType))
                                elif param_name == 'port_range':  # port range parameter
                                    final_params[param_name] = random.choice(list(PortRange))
                                elif param_name == 'scheme':  # URL scheme parameter
                                    final_params[param_name] = random.choice(list(URLScheme))
                                elif param_name == 'tld_type':  # TLD type parameter
                                    final_params[param_name] = random.choice(list(TLDType))
                                elif param_name == 'fmt':  # format parameter (ISBN, EAN, timestamp)
                                    # Try to infer based on category/field
                                    if category == 'mimesis_code' and field == 'isbn':
                                        final_params[param_name] = random.choice(list(ISBNFormat))
                                    elif category == 'mimesis_code' and field == 'ean':
                                        final_params[param_name] = random.choice(list(EANFormat))
                                    elif category == 'mimesis_datetime' and field == 'timestamp':
                                        final_params[param_name] = random.choice(list(TimestampFormat))
                                    else:
                                        final_params[param_name] = param_value
                                else:
                                    final_params[param_name] = param_value
                            else:
                                final_params[param_name] = param_value
                        
                        processed_params = final_params
                        
                        # Handle automatic random gender for name fields when no gender specified
                        # Note: username() does NOT accept gender parameter, only name-related fields do
                        if category == 'mimesis_person' and field in ['name', 'first_name', 'last_name', 'full_name', 'title']:
                            if 'gender' not in processed_params:
                                # Randomly choose gender for name-related fields when not specified
                                processed_params['gender'] = random.choice([Gender.MALE, Gender.FEMALE])
                        
                        # Generate value using the field method with processed parameters
                        value = field_method(**processed_params)
                        
                        # Apply any sticked methods (like .hex())
                        if 'sticked_methods' in col_config:
                            value = SyntheticDataService.apply_sticked_methods(
                                value, col_config['sticked_methods']
                            )
                        
                        data[col_name].append(value)
                except Exception as e:
                    # If there's an error, append None and log the error
                    print(f"Error generating {col_name} (category: {category}, field: {field}): {str(e)}")
                    data[col_name].append(None)
        
        # Close the database session if it was created
        if db_session:
            db_session.close()
        
        # Create DataFrame from the generated data
        df = pd.DataFrame(data)
        return df

    @staticmethod
    def generate_and_save_csv_data_sync(
        columns_info: Dict[str, Any], 
        num_rows: int = 3, 
        csv_file_name: str = None,
        user_email: str = None
    ) -> Dict[str, str]:
        """
        Generate CSV data based on the columns_info and save it to a file (Synchronous version).
        
        Args:
            columns_info: Dictionary containing column configurations
            num_rows: Number of rows to generate
            csv_file_name: Optional custom file name
            user_email: User's email for proper file organization
            
        Returns:
            Dictionary containing the file path and CSV content
        """
        # Generate the DataFrame
        df = SyntheticDataService.create_synthetic_data(columns_info, num_rows)

        # Use provided file name or generate one
        if csv_file_name:
            filename = csv_file_name
            if not filename.endswith('.csv'):
                filename += '.csv'
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"synthetic_data_{timestamp}.csv"

        # Use the new unified storage system
        if user_email:
            filepath = StorageManager.get_file_path(
                user_email=user_email,
                filename=filename,
                file_type='csv',
                is_synthetic=True
            )
        else:
            # Fallback to old system for backward compatibility
            fallback_dir = "app/all_synthetic_csv_data"
            os.makedirs(fallback_dir, exist_ok=True)
            filepath = os.path.join(fallback_dir, filename)

        # Save the DataFrame to CSV
        df.to_csv(filepath, index=False)
        csv_content = df.to_csv(index=False)

        return {
            "filepath": filepath,
            "csv_content": csv_content,
            "filename": filename
        }
    
    @staticmethod
    async def generate_and_save_csv_data(
        columns_info: Dict[str, Any], 
        num_rows: int = 3, 
        csv_file_name: str = None,
        user_email: str = None
    ) -> Dict[str, str]:
        """
        Generate CSV data based on the columns_info and save it to a file (Async wrapper).
        
        Args:
            columns_info: Dictionary containing column configurations
            num_rows: Number of rows to generate
            csv_file_name: Optional custom file name
            user_email: User's email for proper file organization
            
        Returns:
            Dictionary containing the file path and CSV content
        """
        # Call the synchronous version
        return SyntheticDataService.generate_and_save_csv_data_sync(
            columns_info=columns_info,
            num_rows=num_rows,
            csv_file_name=csv_file_name,
            user_email=user_email
        )
    
    @staticmethod
    def get_provider(category: str) -> Any:
        """
        Get a provider instance for the specified category.
        
        Args:
            category: The category name (e.g., 'mimesis_person')
            
        Returns:
            An instance of the appropriate provider
        """
        if category in MIMESIS_PROVIDERS:
            return MIMESIS_PROVIDERS[category]()
        raise ValueError(f"Unknown category: {category}")

    @staticmethod
    def get_field_info(category: str, field_name: str) -> Dict[str, Any]:
        """
        Get information about a specific field.
        
        Args:
            category: The category name (e.g., 'mimesis_person')
            field_name: The name of the field
            
        Returns:
            Dictionary with field information including return type and parameters
        """
        if category not in ALL_DATA:
            raise ValueError(f"Unknown category: {category}")
        
        for field_dict in ALL_DATA[category]:
            if field_name in field_dict:
                return field_dict[field_name]
        
        raise ValueError(f"Unknown field {field_name} in category {category}")

    @staticmethod
    def get_all_fields_for_category(category: str) -> List[str]:
        """
        Get a list of all field names for a given category.
        
        Args:
            category: The category name (e.g., 'mimesis_person')
            
        Returns:
            List of field names
        """
        if category not in ALL_DATA:
            raise ValueError(f"Unknown category: {category}")
        
        return [list(field.keys())[0] for field in ALL_DATA[category]]
