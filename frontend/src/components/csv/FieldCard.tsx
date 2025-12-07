import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Select, Button, Input, Checkbox, Switcher } from '@/components/ui';
import { X, Info, AlertCircle } from 'lucide-react';
import { useAppSelector } from '@/store';
import type { RootState } from '@/store';
import fieldParamsHelp from '@/configs/field-params-help.json';

interface FieldOption {
  value: string;
  label: string;
}

interface ParamValue {
  [key: string]: string | number | boolean;
}

// Add blacklist of parameter keys - these parameters should never be shown to users
const PARAM_BLACKLIST = [
  '**kwargs',  // Python **kwargs syntax
  'kwargs',    // Plain kwargs (used in formatted_date, formatted_datetime)
  '**kwds',    // Alternative Python syntax
  'kwds',      // Plain kwds
  '*args',     // Python *args
  'args'       // Plain args
];

// Common date format options
const DATE_FORMAT_OPTIONS = [
  { value: '', label: 'Default (Locale Format)' },
  { value: '%Y-%m-%d', label: '%Y-%m-%d (2024-04-12) - ISO Format' },
  { value: '%d/%m/%Y', label: '%d/%m/%Y (12/04/2024) - European' },
  { value: '%m/%d/%Y', label: '%m/%d/%Y (04/12/2024) - US' },
  { value: '%B %d, %Y', label: '%B %d, %Y (April 12, 2024) - Full Month' },
  { value: '%b %d, %Y', label: '%b %d, %Y (Apr 12, 2024) - Short Month' },
  { value: '%d-%b-%Y', label: '%d-%b-%Y (12-Apr-2024)' },
  { value: '%A, %B %d, %Y', label: '%A, %B %d, %Y (Monday, April 12, 2024) - Full' },
  { value: '%Y/%m/%d', label: '%Y/%m/%d (2024/04/12)' },
  { value: '%d.%m.%Y', label: '%d.%m.%Y (12.04.2024) - German' },
];

// Common datetime format options
const DATETIME_FORMAT_OPTIONS = [
  { value: '', label: 'Default (Locale Format)' },
  { value: '%Y-%m-%d %H:%M:%S', label: '%Y-%m-%d %H:%M:%S (2024-04-12 14:30:00) - ISO' },
  { value: '%Y-%m-%d %I:%M:%S %p', label: '%Y-%m-%d %I:%M:%S %p (2024-04-12 02:30:00 PM) - 12hr' },
  { value: '%d/%m/%Y %H:%M:%S', label: '%d/%m/%Y %H:%M:%S (12/04/2024 14:30:00) - European' },
  { value: '%m/%d/%Y %I:%M %p', label: '%m/%d/%Y %I:%M %p (04/12/2024 02:30 PM) - US' },
  { value: '%B %d, %Y %I:%M %p', label: '%B %d, %Y %I:%M %p (April 12, 2024 02:30 PM)' },
  { value: '%A, %B %d, %Y %H:%M:%S', label: '%A, %B %d, %Y %H:%M:%S (Monday, April 12, 2024 14:30:00)' },
  { value: '%Y-%m-%dT%H:%M:%S', label: '%Y-%m-%dT%H:%M:%S (2024-04-12T14:30:00) - ISO 8601' },
  { value: '%d.%m.%Y %H:%M', label: '%d.%m.%Y %H:%M (12.04.2024 14:30) - German' },
];

// Common time format options
const TIME_FORMAT_OPTIONS = [
  { value: '', label: 'Default (Locale Format)' },
  { value: '%H:%M:%S', label: '%H:%M:%S (14:30:00) - 24-hour' },
  { value: '%I:%M:%S %p', label: '%I:%M:%S %p (02:30:00 PM) - 12-hour' },
  { value: '%H:%M', label: '%H:%M (14:30) - 24-hour short' },
  { value: '%I:%M %p', label: '%I:%M %p (02:30 PM) - 12-hour short' },
];

// Common timezone options
const TIMEZONE_OPTIONS = [
  { value: '', label: 'None (use default)' },
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  // Americas
  { value: 'America/New_York', label: 'America/New_York (US Eastern)' },
  { value: 'America/Chicago', label: 'America/Chicago (US Central)' },
  { value: 'America/Denver', label: 'America/Denver (US Mountain)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (US Pacific)' },
  { value: 'America/Anchorage', label: 'America/Anchorage (Alaska)' },
  { value: 'America/Toronto', label: 'America/Toronto (Canada Eastern)' },
  { value: 'America/Vancouver', label: 'America/Vancouver (Canada Pacific)' },
  { value: 'America/Mexico_City', label: 'America/Mexico_City (Mexico)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (Brazil)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'America/Argentina/Buenos_Aires (Argentina)' },
  // Europe
  { value: 'Europe/London', label: 'Europe/London (UK)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (France)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (Germany)' },
  { value: 'Europe/Rome', label: 'Europe/Rome (Italy)' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid (Spain)' },
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (Netherlands)' },
  { value: 'Europe/Brussels', label: 'Europe/Brussels (Belgium)' },
  { value: 'Europe/Vienna', label: 'Europe/Vienna (Austria)' },
  { value: 'Europe/Stockholm', label: 'Europe/Stockholm (Sweden)' },
  { value: 'Europe/Moscow', label: 'Europe/Moscow (Russia)' },
  { value: 'Europe/Istanbul', label: 'Europe/Istanbul (Turkey)' },
  // Asia
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UAE)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (India)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (Thailand)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (Singapore)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (Hong Kong)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (China)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (Japan)' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (South Korea)' },
  { value: 'Asia/Manila', label: 'Asia/Manila (Philippines)' },
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta (Indonesia)' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (Pakistan)' },
  // Pacific
  { value: 'Australia/Sydney', label: 'Australia/Sydney (Australia Eastern)' },
  { value: 'Australia/Melbourne', label: 'Australia/Melbourne (Australia Eastern)' },
  { value: 'Australia/Brisbane', label: 'Australia/Brisbane (Australia Eastern)' },
  { value: 'Australia/Perth', label: 'Australia/Perth (Australia Western)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (New Zealand)' },
  { value: 'Pacific/Fiji', label: 'Pacific/Fiji (Fiji)' },
  { value: 'Pacific/Honolulu', label: 'Pacific/Honolulu (Hawaii)' },
  // Africa
  { value: 'Africa/Cairo', label: 'Africa/Cairo (Egypt)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (South Africa)' },
  { value: 'Africa/Lagos', label: 'Africa/Lagos (Nigeria)' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (Kenya)' },
  // Middle East
  { value: 'Asia/Jerusalem', label: 'Asia/Jerusalem (Israel)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (Saudi Arabia)' },
];

// Comprehensive MIME type options organized by category
const MIME_TYPE_OPTIONS = [
  { value: 'MIX', label: '🎲 Mix All (Random) - Diverse MIME types' },
  
  // APPLICATION types (most common for APIs and documents)
  { value: 'APPLICATION', label: '📦 APPLICATION (Category) - All application types' },
  { value: 'application/json', label: 'application/json - JSON data' },
  { value: 'application/xml', label: 'application/xml - XML data' },
  { value: 'application/pdf', label: 'application/pdf - PDF documents' },
  { value: 'application/zip', label: 'application/zip - ZIP archives' },
  { value: 'application/gzip', label: 'application/gzip - GZIP compression' },
  { value: 'application/x-tar', label: 'application/x-tar - TAR archives' },
  { value: 'application/msword', label: 'application/msword - Microsoft Word' },
  { value: 'application/vnd.ms-excel', label: 'application/vnd.ms-excel - Microsoft Excel' },
  { value: 'application/vnd.ms-powerpoint', label: 'application/vnd.ms-powerpoint - Microsoft PowerPoint' },
  { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'application/vnd...document - Word (DOCX)' },
  { value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'application/vnd...sheet - Excel (XLSX)' },
  { value: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'application/vnd...presentation - PowerPoint (PPTX)' },
  { value: 'application/javascript', label: 'application/javascript - JavaScript code' },
  { value: 'application/x-www-form-urlencoded', label: 'application/x-www-form-urlencoded - Form data' },
  { value: 'application/octet-stream', label: 'application/octet-stream - Binary data' },
  { value: 'application/graphql', label: 'application/graphql - GraphQL queries' },
  { value: 'application/ld+json', label: 'application/ld+json - JSON-LD' },
  { value: 'application/x-sh', label: 'application/x-sh - Shell scripts' },
  { value: 'application/x-sqlite3', label: 'application/x-sqlite3 - SQLite database' },
  
  // TEXT types (for web and documents)
  { value: 'TEXT', label: '📄 TEXT (Category) - All text types' },
  { value: 'text/plain', label: 'text/plain - Plain text' },
  { value: 'text/html', label: 'text/html - HTML documents' },
  { value: 'text/css', label: 'text/css - CSS stylesheets' },
  { value: 'text/javascript', label: 'text/javascript - JavaScript' },
  { value: 'text/csv', label: 'text/csv - CSV data' },
  { value: 'text/xml', label: 'text/xml - XML documents' },
  { value: 'text/markdown', label: 'text/markdown - Markdown' },
  { value: 'text/calendar', label: 'text/calendar - iCalendar' },
  { value: 'text/x-python', label: 'text/x-python - Python code' },
  { value: 'text/x-java-source', label: 'text/x-java-source - Java code' },
  { value: 'text/x-c', label: 'text/x-c - C code' },
  { value: 'text/x-yaml', label: 'text/x-yaml - YAML data' },
  
  // IMAGE types (graphics and photos)
  { value: 'IMAGE', label: '🖼️ IMAGE (Category) - All image types' },
  { value: 'image/jpeg', label: 'image/jpeg - JPEG images' },
  { value: 'image/png', label: 'image/png - PNG images' },
  { value: 'image/gif', label: 'image/gif - GIF images' },
  { value: 'image/webp', label: 'image/webp - WebP images' },
  { value: 'image/svg+xml', label: 'image/svg+xml - SVG graphics' },
  { value: 'image/bmp', label: 'image/bmp - BMP images' },
  { value: 'image/tiff', label: 'image/tiff - TIFF images' },
  { value: 'image/x-icon', label: 'image/x-icon - ICO favicons' },
  { value: 'image/vnd.microsoft.icon', label: 'image/vnd.microsoft.icon - Microsoft icons' },
  { value: 'image/heic', label: 'image/heic - HEIC images (Apple)' },
  { value: 'image/avif', label: 'image/avif - AVIF images' },
  
  // AUDIO types (music and sound)
  { value: 'AUDIO', label: '🎵 AUDIO (Category) - All audio types' },
  { value: 'audio/mpeg', label: 'audio/mpeg - MP3 audio' },
  { value: 'audio/wav', label: 'audio/wav - WAV audio' },
  { value: 'audio/ogg', label: 'audio/ogg - OGG audio' },
  { value: 'audio/webm', label: 'audio/webm - WebM audio' },
  { value: 'audio/aac', label: 'audio/aac - AAC audio' },
  { value: 'audio/flac', label: 'audio/flac - FLAC audio' },
  { value: 'audio/mp4', label: 'audio/mp4 - MP4 audio' },
  { value: 'audio/x-m4a', label: 'audio/x-m4a - M4A audio' },
  { value: 'audio/midi', label: 'audio/midi - MIDI audio' },
  { value: 'audio/x-wav', label: 'audio/x-wav - WAV audio (alt)' },
  
  // VIDEO types (movies and streams)
  { value: 'VIDEO', label: '🎬 VIDEO (Category) - All video types' },
  { value: 'video/mp4', label: 'video/mp4 - MP4 videos' },
  { value: 'video/webm', label: 'video/webm - WebM videos' },
  { value: 'video/ogg', label: 'video/ogg - OGG videos' },
  { value: 'video/x-msvideo', label: 'video/x-msvideo - AVI videos' },
  { value: 'video/mpeg', label: 'video/mpeg - MPEG videos' },
  { value: 'video/quicktime', label: 'video/quicktime - QuickTime (MOV)' },
  { value: 'video/x-matroska', label: 'video/x-matroska - MKV videos' },
  { value: 'video/x-flv', label: 'video/x-flv - Flash videos' },
  { value: 'video/3gpp', label: 'video/3gpp - 3GP videos' },
  { value: 'video/x-ms-wmv', label: 'video/x-ms-wmv - WMV videos' },
  
  // MESSAGE types (email and communication)
  { value: 'MESSAGE', label: '✉️ MESSAGE (Category) - All message types' },
  { value: 'message/rfc822', label: 'message/rfc822 - Email messages' },
  { value: 'message/partial', label: 'message/partial - Partial messages' },
  { value: 'message/external-body', label: 'message/external-body - External body' },
  { value: 'message/http', label: 'message/http - HTTP messages' },
];

// Interface for parameter help
interface ParamHelp {
  text: string;
  example?: string;
  type: 'info' | 'warning';
}

// Type for the help JSON structure
type FieldParamsHelpType = Record<string, Record<string, ParamHelp>>;

// Helper function to get parameter help
const getParamHelp = (fieldName: string, paramName: string): ParamHelp | null => {
  const helpData = fieldParamsHelp as FieldParamsHelpType;
  return helpData[fieldName]?.[paramName] || null;
};

interface FieldCardProps {
  fieldId: string;
  index: number;
  rowCount: number;
  categoryOptions: FieldOption[];
  availableFields: { [key: string]: any };
  onRemove: (fieldId: string) => void;
  onChange: (fieldId: string, category: string, field: string, params?: ParamValue, columnName?: string) => void;
  onColumnNameChange?: (fieldId: string, columnName: string) => void;
  hideRemoveButton?: boolean;
  initialValues?: {
    category: string;
    field: string;
    params: Record<string, string | number | boolean>;
    columnName: string;
  };
}

const FieldCard: React.FC<FieldCardProps> = ({
  fieldId,
  index,
  rowCount,
  categoryOptions,
  availableFields,
  onRemove,
  onChange,
  onColumnNameChange,
  hideRemoveButton = false,
  initialValues,
}) => {
  // Update the selector to use the correct path for enum data
  const { enumData } = useAppSelector((state: RootState) => state.enum.enums);
  
  const [selectedCategory, setSelectedCategory] = useState<FieldOption | null>(null);
  const [selectedField, setSelectedField] = useState<FieldOption | null>(null);
  const [fieldData, setFieldData] = useState<any>(null);
  const [paramValues, setParamValues] = useState<ParamValue>({});
  const [columnName, setColumnName] = useState<string>('');
  const [requestData, setRequestData] = useState<any>(null);

  // Memoize frequently used functions to prevent recreation on each render
  const parseEnumType = useCallback((paramType: string): { isEnum: boolean, enumName: string } => {
    if (paramType.includes('mimesis.enums.')) {
      const enumName = paramType.replace('mimesis.enums.', '').replace('Optional[', '').replace(']', '');
      return { isEnum: true, enumName };
    }
    return { isEnum: false, enumName: '' };
  }, []);

  const getEnumOptions = useCallback((enumName: string, paramName?: string): FieldOption[] => {
    if (!enumData?.enums?.mimesis || !enumData.enums.mimesis[enumName]) {
      return [];
    }

    const options = Object.entries(enumData.enums.mimesis[enumName])
      .map(([key, value]) => ({
        value: key,
        label: typeof value === 'string' ? value : key
      }))
      .sort((a: FieldOption, b: FieldOption) => a.label.localeCompare(b.label)); // Sort alphabetically by label
    
    // Universal MIX feature - add MIX option to ALL enum types for diverse data
    // This allows users to get random values from the enum for each row
    const mixLabel = enumName === 'Gender' 
      ? '🎲 Mixed (Random) - Recommended'
      : `🎲 Mix All (Random)`;
    
    options.unshift({
      value: 'MIX',
      label: mixLabel
    });
    
    return options;
  }, [enumData]);

  const fieldOptions = React.useMemo(() => {
    if (!selectedCategory || !availableFields[selectedCategory.value]) return [];
    
    return availableFields[selectedCategory.value]
      .map((field: any) => {
        const fieldName = Object.keys(field)[0];
        return {
          value: fieldName,
          label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' ')
        };
      })
      .sort((a: FieldOption, b: FieldOption) => a.label.localeCompare(b.label)); // Sort alphabetically by label
  }, [selectedCategory, availableFields]);

  // Track whether we've initialized parameters to avoid infinite loops
  const initializeFieldParams = useCallback(() => {
    if (!selectedCategory || !selectedField || !availableFields[selectedCategory.value]) {
      return;
    }

    const fieldObj = availableFields[selectedCategory.value].find(
      (f: any) => Object.keys(f)[0] === selectedField.value
    );
    
    if (!fieldObj) {
      return;
    }

    setFieldData(fieldObj[selectedField.value]);
    
    // Initialize param values
    const initialParams: ParamValue = {};
    if (fieldObj[selectedField.value].params) {
      fieldObj[selectedField.value].params.forEach((param: any) => {
        // Handle multiple parameters in one object (e.g., {start: "int", end: "int"})
        const paramKeys = Object.keys(param);
        
        paramKeys.forEach((paramName) => {
        const paramType = param[paramName];
        
        // Check if parameter is an enum
        const { isEnum, enumName } = parseEnumType(paramType);
        
        // Set default values based on type
        if (paramType.includes('bool')) {
          initialParams[paramName] = false;
        } else if (paramType.includes('int')) {
          // Special handling for birthdate field parameters
          if (selectedField.value === 'birthdate') {
            if (paramName === 'min_year') {
              initialParams[paramName] = 1950; // Default to 1950 (safe value >= 1900)
            } else if (paramName === 'max_year') {
              initialParams[paramName] = new Date().getFullYear(); // Default to current year
            } else {
              initialParams[paramName] = paramType.includes('=') 
                ? parseInt(paramType.split('=')[1]) 
                : 0;
            }
            } else if (selectedField.value === 'date' || selectedField.value === 'datetime') {
              // Special handling for date/datetime field parameters
              if (paramName === 'start') {
                initialParams[paramName] = 1900; // Default start year
              } else if (paramName === 'end') {
                initialParams[paramName] = new Date().getFullYear(); // Default to current year
              } else {
                initialParams[paramName] = paramType.includes('=') 
                  ? parseInt(paramType.split('=')[1]) 
                  : 0;
              }
            } else if (selectedField.value === 'duration') {
              // Special handling for duration field parameters
              if (paramName === 'min_duration') {
                initialParams[paramName] = 1; // Default min duration
              } else if (paramName === 'max_duration') {
                initialParams[paramName] = 100; // Default max duration
              } else {
                initialParams[paramName] = paramType.includes('=') 
                  ? parseInt(paramType.split('=')[1]) 
                  : 0;
              }
            } else if (selectedField.value === 'week_date') {
              // Special handling for week_date field parameters
              if (paramName === 'start') {
                initialParams[paramName] = 2017; // Default start year
              } else if (paramName === 'end') {
                initialParams[paramName] = new Date().getFullYear(); // Default to current year
              } else {
                initialParams[paramName] = paramType.includes('=') 
                  ? parseInt(paramType.split('=')[1]) 
                  : 0;
              }
            } else if (selectedField.value === 'year') {
              // Special handling for year field parameters
              if (paramName === 'minimum') {
                initialParams[paramName] = 1990; // Default minimum year
              } else if (paramName === 'maximum') {
                initialParams[paramName] = new Date().getFullYear(); // Default to current year
              } else {
                initialParams[paramName] = paramType.includes('=') 
                  ? parseInt(paramType.split('=')[1]) 
                  : 0;
              }
            } else if (selectedField.value === 'price') {
              // Special handling for price field parameters
              if (paramName === 'minimum') {
                initialParams[paramName] = 500; // Default minimum price
              } else if (paramName === 'maximum') {
                initialParams[paramName] = 1500; // Default maximum price
              } else {
                initialParams[paramName] = paramType.includes('=') 
                  ? parseFloat(paramType.split('=')[1]) 
                  : 0;
              }
            } else if (selectedField.value === 'price_in_btc') {
              // Special handling for price_in_btc field parameters
              if (paramName === 'minimum') {
                initialParams[paramName] = 0; // Default minimum BTC price
              } else if (paramName === 'maximum') {
                initialParams[paramName] = 2; // Default maximum BTC price
              } else {
                initialParams[paramName] = paramType.includes('=') 
                  ? parseFloat(paramType.split('=')[1]) 
                  : 0;
              }
            } else if (selectedField.value === 'size') {
              // Special handling for size field parameters
              if (paramName === 'minimum') {
                initialParams[paramName] = 1; // Default minimum file size
              } else if (paramName === 'maximum') {
                initialParams[paramName] = 100; // Default maximum file size
              } else {
                initialParams[paramName] = paramType.includes('=') 
                  ? parseInt(paramType.split('=')[1]) 
                  : 0;
              }
            } else if (selectedCategory?.value === 'numpy_distribution' && paramName === 'size') {
              // Skip size parameter for numpy_distribution - don't initialize it, it will be added automatically in the request
              // Don't add to initialParams - just skip this parameter
            } else if (selectedField.value === 'weight') {
              // Special handling for weight field parameters
              if (paramName === 'minimum') {
                initialParams[paramName] = 50; // Default minimum weight (kg)
              } else if (paramName === 'maximum') {
                initialParams[paramName] = 100; // Default maximum weight (kg)
              } else {
                initialParams[paramName] = paramType.includes('=') 
                  ? parseInt(paramType.split('=')[1]) 
                  : 0;
              }
            } else {
              initialParams[paramName] = paramType.includes('=') 
                ? parseInt(paramType.split('=')[1]) 
                : 0;
            }
        } else if (paramType.includes('float')) {
          initialParams[paramName] = paramType.includes('=') 
            ? parseFloat(paramType.split('=')[1]) 
            : 0.0;
        } else if (isEnum) {
          // For enum types, default to MIX for diverse data (recommended)
          const enumOptions = getEnumOptions(enumName, paramName);
          // The MIX option is always first (added by getEnumOptions), so use it as default
          initialParams[paramName] = enumOptions.length > 0 ? enumOptions[0].value : '';
        } else if (paramName === 'drang' && selectedField.value === 'username') {
          // Special handling for drang (tuple) parameter - set default range
          initialParams[paramName] = '(1800, 2100)';
        } else {
          initialParams[paramName] = '';
        }
        });
      });
    }
    
    setParamValues(initialParams);
  }, [selectedCategory, selectedField, availableFields, parseEnumType, getEnumOptions]);

  // Initialize field parameters when selection changes
  useEffect(() => {
    initializeFieldParams();
  }, [initializeFieldParams]);

  // New code - add a ref to track if values actually changed:
  const prevValuesRef = useRef({ 
    category: '',
    field: '',
    params: {} as ParamValue
  });

  useEffect(() => {
    if (selectedCategory && selectedField) {
      // Only call onChange if something actually changed
      const prevValues = prevValuesRef.current;
      const categoryValue = selectedCategory.value;
      const fieldValue = selectedField.value;
      
      // Use paramValues directly - size parameter is not stored in state for numpy_distribution
      const updatedParams = { ...paramValues };
      
      if (prevValues.category !== categoryValue || 
          prevValues.field !== fieldValue ||
          JSON.stringify(prevValues.params) !== JSON.stringify(updatedParams)) {
        
        // Update ref with current values
        prevValuesRef.current = {
          category: categoryValue,
          field: fieldValue,
          params: {...updatedParams}
        };
        
        // Notify parent
        onChange(fieldId, categoryValue, fieldValue, updatedParams, columnName);
      }
    }
  }, [fieldId, onChange, paramValues, selectedCategory, selectedField, columnName, rowCount, fieldData]);

  const handleCategoryChange = (option: FieldOption | null) => {
    setSelectedCategory(option);
    setSelectedField(null);
    setFieldData(null);
    setParamValues({});
    if (option) {
      onChange(fieldId, option.value, '', {}, columnName);
    }
  };

  const handleFieldChange = (option: FieldOption | null) => {
    setSelectedField(option);
    setFieldData(null);
    setParamValues({});
    if (option && selectedCategory) {
      onChange(fieldId, selectedCategory.value, option.value, {}, columnName);
    }
  };

  const handleParamChange = (paramName: string, value: string | number | boolean) => {
    setParamValues(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleColumnNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColumnName = e.target.value;
    setColumnName(newColumnName);
    
    // Notify parent for real-time updates to the collapse title
    if (onColumnNameChange) {
      onColumnNameChange(fieldId, newColumnName);
    }
    
    // Also trigger the regular onChange for the actual state update
    if (selectedCategory && selectedField) {
      onChange(fieldId, selectedCategory.value, selectedField.value, paramValues, newColumnName);
    }
  };

  // Helper component to render parameter help text
  const renderParamHelp = (fieldName: string, paramName: string) => {
    const help = getParamHelp(fieldName, paramName);
    if (!help) return null;

    const IconComponent = help.type === 'warning' ? AlertCircle : Info;
    const colorClass = help.type === 'warning' 
      ? 'bg-amber-50 border-amber-200 text-amber-800' 
      : 'bg-blue-50 border-blue-200 text-blue-800';
    const iconColor = help.type === 'warning' ? 'text-amber-600' : 'text-blue-600';

    return (
      <div className={`mt-2 p-2 rounded-md border ${colorClass} text-xs`}>
        <div className="flex items-start gap-2">
          <IconComponent className={`h-4 w-4 flex-shrink-0 mt-0.5 ${iconColor}`} />
          <div className="flex-1">
            <p className="font-medium">{help.text}</p>
            {help.example && (
              <p className="mt-1 font-mono bg-white bg-opacity-50 px-2 py-1 rounded">
                Example: {help.example}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderParamInput = (param: any, idx: number) => {
    // Handle multiple parameters in one object (e.g., {start: "int", end: "int"})
    const paramKeys = Object.keys(param);
    
    // If multiple keys, render each parameter separately
    if (paramKeys.length > 1) {
      return (
        <React.Fragment key={idx}>
          {paramKeys.map((key, subIdx) => renderSingleParam(key, param[key], `${idx}-${subIdx}`))}
        </React.Fragment>
      );
    }
    
    // Single parameter - render it
    const paramName = paramKeys[0];
    const paramType = param[paramName];
    return renderSingleParam(paramName, paramType, idx);
  };

  const renderSingleParam = (paramName: string, paramType: string, key: any) => {
    // Special handling for 'drang' parameter - display as 'Drange' to match Mimesis docs
    let paramLabel = paramName === 'drang' ? 'Drange' : paramName.charAt(0).toUpperCase() + paramName.slice(1).replace(/_/g, ' ');
    
    // Skip rendering if parameter is in blacklist
    if (PARAM_BLACKLIST.includes(paramName)) {
      return null;
    }
    
    // Skip rendering size parameter for numpy_distribution - it will be auto-filled in the request
    if (selectedCategory?.value === 'numpy_distribution' && paramName === 'size') {
      return null;
    }
    
    // Special handling for timezone parameter - render as dropdown
    if (paramName === 'timezone') {
      return (
        <div key={key} className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {paramLabel}
          </label>
          <Select
            value={TIMEZONE_OPTIONS.find(opt => opt.value === paramValues[paramName]) || TIMEZONE_OPTIONS[0]}
            onChange={(option) => option && handleParamChange(paramName, option.value)}
            options={TIMEZONE_OPTIONS}
            placeholder="Select timezone"
            className="w-full"
            menuPlacement="auto"
            menuPosition="fixed"
            menuPortalTarget={document.body}
            styles={{ 
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              control: (base) => ({ ...base, zIndex: 2 })
            }}
          />
          {selectedField && renderParamHelp(selectedField.value, paramName)}
        </div>
      );
    }
    
    // Special handling for fmt parameter in date/datetime/time fields - render as dropdown
    if (paramName === 'fmt' && selectedField) {
      let formatOptions: FieldOption[] = [];
      
      if (selectedField.value === 'formatted_date') {
        formatOptions = DATE_FORMAT_OPTIONS;
      } else if (selectedField.value === 'formatted_datetime') {
        formatOptions = DATETIME_FORMAT_OPTIONS;
      } else if (selectedField.value === 'formatted_time') {
        formatOptions = TIME_FORMAT_OPTIONS;
      }
      
      // Only render dropdown if we have format options for this field
      if (formatOptions.length > 0) {
        return (
          <div key={key} className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {paramLabel}
            </label>
            <Select
              value={formatOptions.find(opt => opt.value === paramValues[paramName]) || formatOptions[0]}
              onChange={(option) => option && handleParamChange(paramName, option.value)}
              options={formatOptions}
              placeholder="Select format"
              className="w-full"
              menuPlacement="auto"
              menuPosition="fixed"
              menuPortalTarget={document.body}
              styles={{ 
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                control: (base) => ({ ...base, zIndex: 2 })
              }}
            />
            {selectedField && renderParamHelp(selectedField.value, paramName)}
          </div>
        );
      }
    }
    
    // Special handling for type_ and mime_type parameters - render as dropdown with all MIME types
    if ((paramName === 'type_' || paramName === 'mime_type') && selectedField && (selectedField.value === 'mime_type' || selectedField.value === 'content_type')) {
      return (
        <div key={key} className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {selectedField.value === 'mime_type' ? 'MIME Type' : 'Content Type'}
          </label>
          <Select
            value={MIME_TYPE_OPTIONS.find(opt => opt.value === paramValues[paramName]) || MIME_TYPE_OPTIONS[0]}
            onChange={(option) => option && handleParamChange(paramName, option.value)}
            options={MIME_TYPE_OPTIONS}
            placeholder="Select MIME type"
            className="w-full"
            menuPlacement="auto"
            menuPosition="fixed"
            menuPortalTarget={document.body}
            styles={{ 
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              control: (base) => ({ ...base, zIndex: 2 })
            }}
          />
          {selectedField && renderParamHelp(selectedField.value, paramName)}
        </div>
      );
    }
    
    // Special handling for drang parameter - render as text input for tuple format
    if (paramName === 'drang') {
      return (
        <div key={key} className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {paramLabel}
            <span className="ml-1 text-xs text-gray-500">(tuple format)</span>
          </label>
          <Input
            type="text"
            value={String(paramValues[paramName] || '')}
            onChange={(e) => handleParamChange(paramName, e.target.value)}
            placeholder="(1800, 2100)"
            className="w-full"
          />
          {selectedField && renderParamHelp(selectedField.value, paramName)}
        </div>
      );
    }
    
    // Check if parameter is an enum
    const { isEnum, enumName } = parseEnumType(paramType);
    
    if (isEnum) {
      const enumOptions = getEnumOptions(enumName, paramName);
      
      return (
        <div key={key} className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {paramLabel} <span className="text-xs text-gray-500">({enumName})</span>
          </label>
          <Select
            value={enumOptions.find(opt => opt.value === paramValues[paramName]) || null}
            onChange={(option) => option && handleParamChange(paramName, option.value)}
            options={enumOptions}
            placeholder={`Select ${enumName}`}
            className="w-full"
          />
          {selectedField && renderParamHelp(selectedField.value, paramName)}
        </div>
      );
    }
    
    // Handle boolean type parameters
    if (paramType.includes('bool')) {
      const help = selectedField ? getParamHelp(selectedField.value, paramName) : null;
      const hasHelp = !!help;
      
      return (
        <div key={key} className="mb-3">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-800">
                {paramLabel}
              </label>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-medium transition-colors ${paramValues[paramName] ? 'text-gray-400' : 'text-green-600'}`}>
                  OFF
                </span>
                <Switcher
                  checked={!!paramValues[paramName]}
                  onChange={(checked, e) => {
                    // Use the event target's checked property to get the NEW value
                    // The Switcher component has a bug where it passes the old value when controlled
                    const newValue = e.target.checked;
                    handleParamChange(paramName, newValue);
                  }}
                />
                <span className={`text-xs font-medium transition-colors ${paramValues[paramName] ? 'text-green-600' : 'text-gray-400'}`}>
                  ON
                </span>
              </div>
            </div>
            
            {/* Enhanced help display for boolean parameters */}
            {hasHelp && help && (
              <div className="mt-2 space-y-1">
                <div className="flex items-start gap-2 text-xs text-gray-700">
                  <Info className="h-3 w-3 flex-shrink-0 mt-0.5 text-blue-500" />
                  <span>{help.text}</span>
                </div>
                {help.example && help.example.includes('|') && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {help.example.split('|').map((part, i) => {
                      const [label, value] = part.trim().split(':').map(s => s.trim());
                      const isActive = (i === 0 && !paramValues[paramName]) || (i === 1 && paramValues[paramName]);
                      return (
                        <div 
                          key={i} 
                          className={`p-2 rounded border text-xs transition-all ${
                            isActive 
                              ? 'bg-green-50 border-green-300 shadow-sm' 
                              : 'bg-gray-50 border-gray-200 opacity-60'
                          }`}
                        >
                          <div className={`font-semibold mb-1 ${isActive ? 'text-green-700' : 'text-gray-600'}`}>
                            {label}
                          </div>
                          <div className={`font-mono ${isActive ? 'text-green-900' : 'text-gray-700'}`}>
                            {value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {help.example && !help.example.includes('|') && (
                  <div className="mt-1 font-mono text-xs bg-white bg-opacity-70 px-2 py-1 rounded border border-blue-100">
                    💡 {help.example}
                  </div>
                )}
              </div>
            )}
            
            {/* Fallback help for boolean parameters without specific help */}
            {!hasHelp && (
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <span className={`font-medium ${!paramValues[paramName] ? 'text-gray-700' : 'text-gray-500'}`}>
                  OFF (False)
                </span>
                <span>•</span>
                <span className={`font-medium ${paramValues[paramName] ? 'text-gray-700' : 'text-gray-500'}`}>
                  ON (True)
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Handle numeric parameters
    if (paramType.includes('int') || paramType.includes('float')) {
      // Determine min/max constraints for specific parameters
      let minValue: number | undefined = undefined;
      let maxValue: number | undefined = undefined;
      let helpText: string | undefined = undefined;
      
      // Special validation for birthdate min_year
      if (paramName === 'min_year' && selectedField?.value === 'birthdate') {
        minValue = 1900;
        maxValue = new Date().getFullYear();
        helpText = 'Must be between 1900 and current year';
      }
      
      // Special validation for birthdate max_year
      if (paramName === 'max_year' && selectedField?.value === 'birthdate') {
        minValue = 1900;
        maxValue = new Date().getFullYear();
        helpText = 'Must be between 1900 and current year';
      }
      
      // Special validation for entropy parameter (cryptographic fields)
      if (paramName === 'entropy') {
        minValue = 0;
        helpText = 'Must be a positive number (0 or greater)';
      }
      
      // Special validation for duration parameters
      if (paramName === 'min_duration' && selectedField?.value === 'duration') {
        minValue = 0;
        // Check if max_duration exists and is set
        const maxDuration = paramValues['max_duration'];
        if (maxDuration !== undefined && maxDuration !== null && maxDuration !== '') {
          maxValue = Number(maxDuration) - 1;
          helpText = `Must be 0 or greater and less than max duration (${maxDuration})`;
        } else {
          helpText = 'Must be 0 or greater and less than max duration';
        }
      }
      
      if (paramName === 'max_duration' && selectedField?.value === 'duration') {
        // Check if min_duration exists and is set
        const minDuration = paramValues['min_duration'];
        if (minDuration !== undefined && minDuration !== null && minDuration !== '') {
          minValue = Number(minDuration) + 1;
          helpText = `Must be greater than min duration (${minDuration})`;
        } else {
          minValue = 1;
          helpText = 'Must be greater than min duration';
        }
      }
      
      // Special validation for week_date parameters
      if (paramName === 'start' && selectedField?.value === 'week_date') {
        minValue = 1;
        // Check if end exists and is set
        const endYear = paramValues['end'];
        if (endYear !== undefined && endYear !== null && endYear !== '') {
          maxValue = Number(endYear);
          helpText = `Starting year (must be less than or equal to end year: ${endYear})`;
        } else {
          helpText = 'Starting year (must be positive)';
        }
      }
      
      if (paramName === 'end' && selectedField?.value === 'week_date') {
        // Check if start exists and is set
        const startYear = paramValues['start'];
        if (startYear !== undefined && startYear !== null && startYear !== '') {
          minValue = Number(startYear);
          helpText = `Ending year (must be greater than or equal to start year: ${startYear})`;
        } else {
          minValue = 1;
          helpText = 'Ending year (must be positive)';
        }
      }
      
      // Special validation for year field parameters
      if (paramName === 'minimum' && selectedField?.value === 'year') {
        minValue = 1;
        // Check if maximum exists and is set
        const maxYear = paramValues['maximum'];
        if (maxYear !== undefined && maxYear !== null && maxYear !== '') {
          maxValue = Number(maxYear);
          helpText = `Minimum year (must be less than or equal to maximum: ${maxYear})`;
        } else {
          helpText = 'Minimum year (must be positive)';
        }
      }
      
      if (paramName === 'maximum' && selectedField?.value === 'year') {
        // Check if minimum exists and is set
        const minYear = paramValues['minimum'];
        if (minYear !== undefined && minYear !== null && minYear !== '') {
          minValue = Number(minYear);
          helpText = `Maximum year (must be greater than or equal to minimum: ${minYear})`;
        } else {
          minValue = 1;
          helpText = 'Maximum year (must be positive)';
        }
      }
      
      // Special validation for price field parameters
      if (paramName === 'minimum' && selectedField?.value === 'price') {
        minValue = 0;
        // Check if maximum exists and is set
        const maxPrice = paramValues['maximum'];
        if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
          maxValue = Number(maxPrice);
          helpText = `Minimum price (must be 0 or greater and less than maximum: ${maxPrice})`;
        } else {
          helpText = 'Minimum price (must be 0 or greater)';
        }
      }
      
      if (paramName === 'maximum' && selectedField?.value === 'price') {
        // Check if minimum exists and is set
        const minPrice = paramValues['minimum'];
        if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
          minValue = Number(minPrice);
          helpText = `Maximum price (must be greater than minimum: ${minPrice})`;
        } else {
          minValue = 0.01;
          helpText = 'Maximum price (must be greater than 0)';
        }
      }
      
      // Special validation for price_in_btc field parameters
      if (paramName === 'minimum' && selectedField?.value === 'price_in_btc') {
        minValue = 0;
        // Check if maximum exists and is set
        const maxBtc = paramValues['maximum'];
        if (maxBtc !== undefined && maxBtc !== null && maxBtc !== '') {
          maxValue = Number(maxBtc);
          helpText = `Minimum BTC price (must be 0 or greater and less than maximum: ${maxBtc})`;
        } else {
          helpText = 'Minimum BTC price (must be 0 or greater)';
        }
      }
      
      if (paramName === 'maximum' && selectedField?.value === 'price_in_btc') {
        // Check if minimum exists and is set
        const minBtc = paramValues['minimum'];
        if (minBtc !== undefined && minBtc !== null && minBtc !== '') {
          minValue = Number(minBtc);
          helpText = `Maximum BTC price (must be greater than minimum: ${minBtc})`;
        } else {
          minValue = 0.001;
          helpText = 'Maximum BTC price (must be greater than 0)';
        }
      }
      
      // Special validation for size field parameters
      if (paramName === 'minimum' && selectedField?.value === 'size') {
        minValue = 1;
        // Check if maximum exists and is set
        const maxSize = paramValues['maximum'];
        if (maxSize !== undefined && maxSize !== null && maxSize !== '') {
          maxValue = Number(maxSize);
          helpText = `Minimum file size (must be 1 or greater and less than maximum: ${maxSize})`;
        } else {
          helpText = 'Minimum file size (must be 1 or greater)';
        }
      }
      
      if (paramName === 'maximum' && selectedField?.value === 'size') {
        // Check if minimum exists and is set
        const minSize = paramValues['minimum'];
        if (minSize !== undefined && minSize !== null && minSize !== '') {
          minValue = Number(minSize);
          helpText = `Maximum file size (must be greater than minimum: ${minSize})`;
        } else {
          minValue = 1;
          helpText = 'Maximum file size (must be greater than 0)';
        }
      }
      
      // Special validation for weight field parameters
      if (paramName === 'minimum' && selectedField?.value === 'weight') {
        minValue = 1;
        // Check if maximum exists and is set
        const maxWeight = paramValues['maximum'];
        if (maxWeight !== undefined && maxWeight !== null && maxWeight !== '') {
          maxValue = Number(maxWeight);
          helpText = `Minimum weight in kg (must be 1 or greater and less than maximum: ${maxWeight})`;
        } else {
          helpText = 'Minimum weight in kg (must be 1 or greater)';
        }
      }
      
      if (paramName === 'maximum' && selectedField?.value === 'weight') {
        // Check if minimum exists and is set
        const minWeight = paramValues['minimum'];
        if (minWeight !== undefined && minWeight !== null && minWeight !== '') {
          minValue = Number(minWeight);
          helpText = `Maximum weight in kg (must be greater than minimum: ${minWeight})`;
        } else {
          minValue = 1;
          helpText = 'Maximum weight in kg (must be greater than 0)';
        }
      }
      
      return (
        <div key={key} className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {paramLabel}
            {helpText && (
              <span className="ml-1 text-xs text-blue-600">({helpText})</span>
            )}
          </label>
          <Input
            type="number"
            value={String(paramValues[paramName] || '')}
            onChange={(e) => {
              // Allow empty string for intermediate typing
              if (e.target.value === '') {
                handleParamChange(paramName, '');
                return;
              }
              
              const value = paramType.includes('float') 
                ? parseFloat(e.target.value) 
                : parseInt(e.target.value);
              
              // Only validate if we have a valid number
              if (!isNaN(value)) {
                // Allow intermediate values during typing - only validate on blur
                handleParamChange(paramName, value);
              } else {
                // Allow non-numeric input for intermediate typing (like typing "1" when you want "1500")
                handleParamChange(paramName, e.target.value);
              }
            }}
            onBlur={(e) => {
              // Validate and auto-correct on blur (when user finishes typing)
              const value = paramType.includes('float') 
                ? parseFloat(e.target.value) 
                : parseInt(e.target.value);
              
              if (!isNaN(value)) {
                let correctedValue = value;
                
                // Auto-correct to min/max bounds on blur
                if (minValue !== undefined && value < minValue) {
                  correctedValue = minValue;
                }
                if (maxValue !== undefined && value > maxValue) {
                  correctedValue = maxValue;
                }
                
                if (correctedValue !== value) {
                  handleParamChange(paramName, correctedValue);
                }
              } else if (e.target.value !== '') {
                // If invalid input, reset to previous valid value or default
                const currentValue = paramValues[paramName];
                if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
                  handleParamChange(paramName, currentValue);
                } else {
                  handleParamChange(paramName, minValue || 0);
                }
              }
            }}
            placeholder={paramType}
            className="w-full"
            step={paramType.includes('float') ? "0.01" : "1"}
            min={minValue}
            max={maxValue}
          />
          {minValue !== undefined && maxValue !== undefined && (
            <p className="mt-1 text-xs text-gray-500">
              Valid range: {minValue} - {maxValue}
            </p>
          )}
          {minValue !== undefined && maxValue === undefined && (
            <p className="mt-1 text-xs text-gray-500">
              Minimum value: {minValue}
            </p>
          )}
          {selectedField && renderParamHelp(selectedField.value, paramName)}
        </div>
      );
    }
    
    // Handle string and other parameters
    return (
      <div key={key} className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {paramLabel}
        </label>
        <Input
          type="text"
          value={String(paramValues[paramName] || '')}
          onChange={(e) => handleParamChange(paramName, e.target.value)}
          placeholder={paramType}
          className="w-full"
        />
        {selectedField && renderParamHelp(selectedField.value, paramName)}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-4 relative border border-gray-200 hover:border-blue-200 transition-colors duration-200">
      {!hideRemoveButton && (
        <Button
          variant="default"
          size="sm"
          className="absolute top-3 right-3 text-gray-400 hover:text-red-500 hover:bg-red-50"
          onClick={() => onRemove(fieldId)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Column Name
          </label>
          <Input
            type="text"
            value={columnName}
            onChange={handleColumnNameChange}
            placeholder="Enter column name"
            className="w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <Select
              value={selectedCategory}
              onChange={handleCategoryChange}
              options={categoryOptions}
              placeholder="Select a category"
              className="w-full"
              menuPlacement="auto"
              menuPosition="fixed"
              menuPortalTarget={document.body}
              styles={{ 
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                control: (base) => ({ ...base, zIndex: 2 })
              }}
            />
          </div>

          {selectedCategory && !selectedCategory.value.startsWith('list_') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field
              </label>
              <Select
                value={selectedField}
                onChange={handleFieldChange}
                options={fieldOptions}
                placeholder="Select a field"
                className="w-full"
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={document.body}
                styles={{ 
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  control: (base) => ({ ...base, zIndex: 2 })
                }}
              />
            </div>
          )}
        </div>

        {fieldData && !selectedCategory?.value.startsWith('list_') && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">
                Return Type: <span className="font-medium text-gray-700">{fieldData.return_type}</span>
              </div>
            </div>
            
            {fieldData.params && fieldData.params.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-700">Parameters:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fieldData.params.map((param: any, idx: number) => renderParamInput(param, idx))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldCard; 