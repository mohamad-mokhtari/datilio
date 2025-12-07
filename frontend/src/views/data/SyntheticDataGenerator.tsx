import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPanelExpand, useAppSelector, useAppDispatch } from '@/store'
import { DataFile, fetchSyntheticFiles } from '@/store/slices/lists/listsSlice';
import ApiService2 from '@/services/ApiService2';
import { Select, Button, Input, Spinner, Alert, Table, Card } from '@/components/ui';

const { Tr, Th, Td, THead, TBody } = Table;
import type { RootState } from '@/store';
import FieldCard from '@/components/csv/FieldCard';
import { Plus, X, Trash, ChevronDown, ChevronUp, Maximize2, Minimize2, HelpCircle } from 'lucide-react';
import type { EnumResponse } from '@/store/slices/enum/enumSlice';
import useThemeClass from '@/utils/hooks/useThemeClass';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { parseBackendError } from '@/utils/errorParser';
import SimpleDataPreviewModal from '@/components/csv/SimpleDataPreviewModal';
import HelpModal from '@/components/csv/HelpModal';
import { DataFrameRow, ColumnInfo } from '@/@types/csv';
import { FailedTasksList } from '@/components/synthetic';
import '@/components/synthetic/FailedTasks.css';
import { AlertTriangle } from 'lucide-react';

interface Category {
  value: string;
  label: string;
  type?: 'mimesis' | 'list';
}

interface FieldInfo {
  return_type: string;
  params: Array<{
    [key: string]: string;
  }>;
}

interface SelectedField {
  id: string;
  category: string;
  field: string;
  params: Record<string, string | number | boolean>;
  columnName: string;
  tempColumnName?: string;
  isList?: boolean;
  listItems?: string[];
}

type ParamValue = Record<string, string | number | boolean>;

// Async task interfaces
interface TaskResponse {
  status: string;
  message: string;
  task_id: string;
  task_name: string;
  estimated_time_seconds?: number;
  progress_url?: string;
}

interface TaskResult {
  status: string;
  filename: string;
  filepath?: string;
  data_id?: string;
  file_size?: number;
  file_size_mb?: number;
  rows_generated: number;
  message: string;
}

interface TaskStatus {
  task_id: string;
  task_name: string;
  status: 'pending' | 'processing' | 'success' | 'failure';
  progress: number;
  message: string;
  current_step?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  estimated_time_seconds?: number;
  result?: TaskResult;
  error?: string;
}

interface ActiveTask {
  taskId: string;
  taskName: string;
  status: TaskStatus | null;
  pollingInterval: NodeJS.Timeout | null;
}

// Define this function outside the component to avoid the initialization error
const formatCategoryLabel = (category: string): string => {
  // Special handling for numpy_distribution - show as "Statistical Distribution"
  if (category === 'numpy_distribution') {
    return 'Statistical Distribution';
  }
  
  // Remove "mimesis" prefix if it exists
  const cleanCategory = category.replace(/^mimesis_/i, '');
  
  return cleanCategory
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper function to generate unique IDs
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

const temp_user_id = "44ab6b6f-72c4-450a-96dc-1a73bba94420"

const SyntheticDataGenerator: React.FC = () => {
  const dispatch = useAppDispatch();

  // Update the selector to use the enum slice with proper typing
  const {
    enumData,
    loading: enumsLoading,
    error: enumsError
  } = useAppSelector((state: RootState) => state.enum.enums);

  const { userLists } = useAppSelector((state: RootState) => state.lists.lists);

  const themeColor = useAppSelector((state) => state.theme.themeColor);
  const { bgTheme, textTheme, borderTheme } = useThemeClass();

  const [selectedFields, setSelectedFields] = useState<SelectedField[]>([]);
  const [rowCount, setRowCount] = useState<number>(100);
  const [rowCountInput, setRowCountInput] = useState<string>('100');
  const [fileName, setFileName] = useState<string>('synthetic_data');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // State for synthetic files table
  const [syntheticFiles, setSyntheticFiles] = useState<DataFile[]>([]);
  const [loadingSyntheticFiles, setLoadingSyntheticFiles] = useState(false);
  const [refreshingTable, setRefreshingTable] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
  const [dataFrameData, setDataFrameData] = useState<DataFrameRow[]>([]);
  const [loadingDataFrame, setLoadingDataFrame] = useState(false);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [requestData, setRequestData] = useState<any>(null);
  const [listItems, setListItems] = useState<Record<string, string[]>>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // Default to newest first
  const [sortField, setSortField] = useState<'date' | 'size'>('date'); // Track which column to sort by

  // Add state to track collapsed fields
  const [collapsedFields, setCollapsedFields] = useState<Record<string, boolean>>({});

  // Add state to track real-time column name changes
  const [tempColumnNames, setTempColumnNames] = useState<Record<string, string>>({});

  // State for async task tracking
  const [activeTasks, setActiveTasks] = useState<Map<string, ActiveTask>>(new Map());
  const activeTasksRef = useRef<Map<string, ActiveTask>>(new Map());

  // Ref for scrolling to synthetic files table
  const syntheticFilesTableRef = useRef<HTMLDivElement>(null);
  
  // Ref for scrolling to failed tasks section
  const failedTasksSectionRef = useRef<HTMLDivElement>(null);

  // State for help modal
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [showFailedTasks, setShowFailedTasks] = useState(true);
  const [refreshFailedTasks, setRefreshFailedTasks] = useState(0);

  // Function to organize categories and fields for help modal
  const getOrganizedCategories = () => {
    if (!enumData?.categories?.synthethic_categories || !enumData?.all_fields?.fields) {
      return [];
    }

    return enumData.categories.synthethic_categories.map(category => {
      const categoryFields = enumData.all_fields.fields[category] || [];
      const fieldKeys = categoryFields.map((fieldObj: any) => Object.keys(fieldObj)[0]);
      
      return {
        category: formatCategoryLabel(category),
        categoryKey: category,
        fields: categoryFields.map((fieldObj: any) => {
          const fieldKey = Object.keys(fieldObj)[0];
          const fieldInfo = fieldObj[fieldKey];
          return {
            key: fieldKey,
            name: fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            info: fieldInfo,
            returnType: fieldInfo?.return_type || 'string',
            params: fieldInfo?.params || []
          };
        })
      };
    });
  };

  // Transform categories from enumData to Select options format
  const categoryOptions: Category[] = React.useMemo(() => {
    const mimesisCategories = enumData?.categories?.synthethic_categories
      ? enumData.categories.synthethic_categories
        .map((category: string) => ({
          value: category,
          label: formatCategoryLabel(category),
          type: 'mimesis' as const
        }))
        .sort((a: Category, b: Category) => a.label.localeCompare(b.label))
      : [];

    const listCategories = userLists
      ? userLists.map(list => ({
        value: `list_${list.id}`,
        label: list.name,
        type: 'list' as const
      }))
      : [];

    return [
      ...mimesisCategories,
      { value: 'divider', label: '------- Your Custom Lists -------', isDisabled: true, isFixed: true },
      ...listCategories
    ];
  }, [enumData, userLists]);

  const handleAddField = () => {
    const newField = {
      id: generateId(),
      category: '',
      field: '',
      params: {},
      columnName: ''
    };
    setSelectedFields([...selectedFields, newField]);
  };

  const handleRemoveField = (fieldId: string) => {
    // Create a new array without the field with the specified ID
    const updatedFields = selectedFields.filter(field => field.id !== fieldId);

    // Update the selected fields state
    setSelectedFields(updatedFields);

    // Update the request data with the new fields
    const columnsInfo = {
      columns: updatedFields.reduce((acc, field) => {
        const transformedParams = Object.entries(field.params).reduce((paramsAcc, [key, value]) => {
          // Skip kwargs/args parameters
          const SKIP_PARAMS = ['**kwargs', 'kwargs', '**kwds', 'kwds', '*args', 'args'];
          if (SKIP_PARAMS.includes(key)) {
            return paramsAcc;
          }
          // Skip size parameter for numpy_distribution - it will be added automatically
          if (field.category === 'numpy_distribution' && key === 'size') {
            return paramsAcc;
          }
          // Fix backend API schema bug: username parameter is 'drang' in schema but 'drange' in Mimesis
          const actualKey = (key === 'drang' && field.field === 'username') ? 'drange' : key;
          paramsAcc[actualKey] = transformParamValue(key, value, field.field);
          return paramsAcc;
        }, {} as Record<string, string>);

        // Automatically add size parameter for numpy_distribution fields
        if (field.category === 'numpy_distribution') {
          transformedParams['size'] = String(rowCount);
        }

        acc[field.columnName] = {
          category: field.category,
          field: field.field,
          params: transformedParams
        };
        return acc;
      }, {} as Record<string, { category: string; field: string; params: Record<string, string> }>)
    };

    const newRequestData = {
      user_id: temp_user_id,
      num_rows: rowCount,
      csv_file_name: fileName,
      columns_info: columnsInfo
    };

    setRequestData(newRequestData);
  };

  const findKeyPath = (
    obj: Record<string, any>,
    targetKey: string,
    path: string[] = []
  ): string[] | null => {
    for (const [key, value] of Object.entries(obj)) {
      if (key === targetKey) return [...path, key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const result = findKeyPath(value, targetKey, [...path, key]);
        if (result) return result;
      }
    }

    return null;
  };

  const resolveMimesisPath = (targetKey: string): string | null => {
    if (!enumData?.enums?.mimesis) return null;
    const path = findKeyPath(enumData.enums.mimesis, targetKey);
    return path ? `mimesis.${path.join('.')}` : null;
  };

  // Update requestData when num_rows, csv_file_name, or columnName changes
  useEffect(() => {
    const columnsInfo = {
      columns: selectedFields.reduce((acc, field) => {
        const transformedParams = Object.entries(field.params).reduce((paramsAcc, [key, value]) => {
          // Skip kwargs/args parameters
          const SKIP_PARAMS = ['**kwargs', 'kwargs', '**kwds', 'kwds', '*args', 'args'];
          if (SKIP_PARAMS.includes(key)) {
            return paramsAcc;
          }
          // Skip size parameter for numpy_distribution - it will be added automatically
          if (field.category === 'numpy_distribution' && key === 'size') {
            return paramsAcc;
          }
          // Fix backend API schema bug: username parameter is 'drang' in schema but 'drange' in Mimesis
          const actualKey = (key === 'drang' && field.field === 'username') ? 'drange' : key;
          paramsAcc[actualKey] = transformParamValue(key, value, field.field);
          return paramsAcc;
        }, {} as Record<string, string>);

        // Automatically add size parameter for numpy_distribution fields
        if (field.category === 'numpy_distribution') {
          transformedParams['size'] = String(rowCount);
        }

        acc[field.columnName] = {
          category: field.category,
          field: field.field,
          params: transformedParams
        };
        return acc;
      }, {} as Record<string, { category: string; field: string; params: Record<string, string> }>)
    };

    const newRequestData = {
      user_id: temp_user_id,
      num_rows: rowCount,
      csv_file_name: fileName,
      columns_info: columnsInfo
    };

    setRequestData(newRequestData);
  }, [selectedFields, rowCount, fileName]); // Add dependencies here

  // Function to fetch list items
  const fetchListItems = async (listId: string) => {
    try {
      const response = await ApiService2.get<{ value: string }[]>(`/lists/users/lists/${listId}/items/`);
      return response.data.map((item) => item.value);
    } catch (error: any) {
      console.error('Failed to fetch list items:', error);

      // Parse error using the utility function
      const parsedError = parseBackendError(error);

      toast.push(
        <Notification title={parsedError.title} type="danger">
          {parsedError.message}
        </Notification>
      );

      return [];
    }
  };

  // Update the handleFieldChange function to match FieldCard's expected type
  const handleFieldChange = (
    fieldId: string,
    category: string,
    field: string,
    params?: ParamValue,
    columnName?: string
  ) => {
    const fieldIndex = selectedFields.findIndex(field => field.id === fieldId);
    if (fieldIndex === -1) return;

    const newFields = [...selectedFields];
    newFields[fieldIndex] = {
      ...newFields[fieldIndex],
      category,
      field,
      params: params || {},
      columnName: columnName || field,
    };
    setSelectedFields(newFields);
  };

  const handleRowCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty input for typing
    setRowCountInput(inputValue);
    
    // Update rowCount if valid number
    const numValue = parseInt(inputValue);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 10000) {
      setRowCount(numValue);
    }
  };

  const handleRowCountBlur = () => {
    const numValue = parseInt(rowCountInput);
    
    // Validate on blur
    if (isNaN(numValue) || numValue < 1) {
      // Reset to minimum
      setRowCountInput('1');
      setRowCount(1);
    } else if (numValue > 10000) {
      // Cap at maximum
      setRowCountInput('10000');
      setRowCount(10000);
    } else {
      // Ensure input matches the valid number
      setRowCountInput(numValue.toString());
      setRowCount(numValue);
    }
  };

  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.value);
  };

  const transformParamValue = (paramKey: string, paramValue: string | number | boolean, fieldName?: string): string => {
    // Handle boolean values - convert JavaScript boolean to Python-style True/False
    if (typeof paramValue === 'boolean') {
      return paramValue ? 'True' : 'False';
    }
    
    // Convert numbers to strings
    if (typeof paramValue === 'number') {
      return String(paramValue);
    }
    
    // Now we know paramValue is a string
    const stringValue = String(paramValue);
    
    // Map parameter keys to their corresponding enum names based on backend expectations
    const enumMapping: Record<string, string> = {
      // Format-related (default mappings)
      'isbn_format': 'ISBNFormat',
      'timestamp_format': 'TimestampFormat',
      
      // Gender and Person
      'gender': 'Gender',
      'title_type': 'TitleType',
      
      // Location and Time
      'timezone_region': 'TimezoneRegion',
      'country_code': 'CountryCode',
      
      // Duration
      'duration_unit': 'DurationUnit',
      
      // Text and Emoji - IMPORTANT: handle generic "category" parameter
      'emoji_category': 'EmojyCategory',
      'category': 'EmojyCategory', // Generic category parameter - try EmojyCategory first
      
      // Internet and Cryptography
      'algorithm': 'Algorithm',
      'dsn_type': 'DSNType',
      'tld_type': 'TLDType',
      'url_scheme': 'URLScheme',
      'port_range': 'PortRange',
      'mime_type': 'MimeType',
      
      // Files
      'file_type': 'FileType',
      'audio_file': 'AudioFile',
      'video_file': 'VideoFile',
      'document_file': 'DocumentFile',
      'image_file': 'ImageFile',
      'compressed_file': 'CompressedFile',
      'type_': 'MimeType', // Handle type_ parameter for mime_type field
      
      // Finance
      'card_type': 'CardType',
      
      // Science
      'measure_unit': 'MeasureUnit',
      'metric_prefix_sign': 'MetricPrefixSign',
      
      // Other
      'locale': 'Locale',
      'num_type': 'NumType',
      'ipv4_purpose': 'IPv4Purpose'
    };

    // Get the enum name for this parameter key
    let enumName = enumMapping[paramKey];
    
    // Special handling for generic "fmt" parameter - determine based on field name
    if (paramKey === 'fmt' && fieldName) {
      const fmtFieldToEnumMap: Record<string, string> = {
        'ean': 'EANFormat',
        'isbn': 'ISBNFormat',
        'timestamp': 'TimestampFormat',
      };
      
      if (fmtFieldToEnumMap[fieldName]) {
        enumName = fmtFieldToEnumMap[fieldName];
      }
    }
    
    // Special handling for generic "name" parameter in science fields
    if (paramKey === 'name' && fieldName === 'measure_unit') {
      enumName = 'MeasureUnit';
    }
    
    // Special handling for generic "sign" parameter in science fields
    if (paramKey === 'sign' && fieldName === 'metric_prefix') {
      enumName = 'MetricPrefixSign';
    }
    
    // Universal MIX feature - handle MIX/RANDOM for ALL enum types
    // Check if value is MIX or RANDOM (case-insensitive)
    if (stringValue && (stringValue.toUpperCase() === 'MIX' || stringValue.toUpperCase() === 'RANDOM')) {
      // If we have an enum name, return the MIX variant
      if (enumName) {
        return `mimesis.${enumName}.MIX`;
      }
    }
    
    // Special handling for generic "category" parameter
    // Determine the correct enum based on field name and value
    if (paramKey === 'category' && fieldName) {
      // Map field names to their corresponding enum types
      const fieldToEnumMap: Record<string, string> = {
        'emoji': 'EmojyCategory',
        // Add more field-specific mappings here if needed
      };
      
      // Check if this field has a specific enum mapping
      if (fieldToEnumMap[fieldName]) {
        enumName = fieldToEnumMap[fieldName];
      } else {
        // Try to detect based on value
        const emojyCategoryValues = ['ACTIVITIES', 'ANIMALS_AND_NATURE', 'DEFAULT', 'FLAGS', 
                                      'FOOD_AND_DRINK', 'OBJECTS', 'PEOPLE_AND_BODY', 
                                      'SMILEYS_AND_EMOTION', 'SYMBOLS', 'TRAVEL_AND_PLACES'];
        if (emojyCategoryValues.includes(stringValue.toUpperCase())) {
          enumName = 'EmojyCategory';
        }
      }
    }
    
    if (enumName && enumData?.enums?.mimesis && enumData.enums.mimesis[enumName]) {
      const enumValues = enumData.enums.mimesis[enumName];
      // Check if the value exists in the enum (case-insensitive)
      const matchingKey = Object.keys(enumValues).find(
        key => key.toLowerCase() === stringValue.toLowerCase()
      );

      if (matchingKey) {
        return `mimesis.${enumName}.${matchingKey}`;
      }
    }
    
    // Fallback: If no specific enum was found, try to find the value in any available enum
    // This handles cases where the parameter name doesn't match our mapping
    if (!enumName && enumData?.enums?.mimesis) {
      // Search through all enums to find a match
      for (const [enumTypeName, enumValues] of Object.entries(enumData.enums.mimesis)) {
        if (typeof enumValues === 'object' && enumValues !== null) {
          const matchingKey = Object.keys(enumValues).find(
            key => key.toLowerCase() === stringValue.toLowerCase()
          );
          
          if (matchingKey) {
            console.log(`🔍 Auto-detected enum: ${paramKey}=${stringValue} → mimesis.${enumTypeName}.${matchingKey}`);
            return `mimesis.${enumTypeName}.${matchingKey}`;
          }
        }
      }
    }
    
    // Handle special cases
    if (stringValue === 'request.row_number') {
      return 'ROW_NUMBER_PLACEHOLDER';
    }
    
    // Handle quoted strings
    if (stringValue.startsWith("'") && stringValue.endsWith("'")) {
      return stringValue.slice(1, -1);
    }
    
    // Handle datetime parameters
    if (stringValue.startsWith('datetime(')) {
      return stringValue; // Let backend handle datetime parsing
    }
    
    // Handle list parameters
    if (stringValue.startsWith('[') && stringValue.endsWith(']')) {
      return stringValue; // Let backend handle list parsing
    }
    
    return stringValue;
  };

  // Function to poll task status with 5-second intervals
  const pollTaskStatus = async (taskId: string, taskName: string) => {
    const checkStatus = async () => {
      try {
        const response = await ApiService2.get<TaskStatus>(`/synthetic/task-status/${taskId}`);
        const status = response.data;
        
        // Update the task status in active tasks
        setActiveTasks(prev => {
          const newMap = new Map(prev);
          const task = newMap.get(taskId);
          if (task) {
            task.status = status;
            newMap.set(taskId, task);
          }
          return newMap;
        });
        
        activeTasksRef.current.set(taskId, {
          ...activeTasksRef.current.get(taskId)!,
          status
        });
        
        // Handle task completion
        if (status.status === 'success') {
          // Stop polling
          const task = activeTasksRef.current.get(taskId);
          if (task?.pollingInterval) {
            clearInterval(task.pollingInterval);
          }
          
          // Remove from active tasks
          setActiveTasks(prev => {
            const newMap = new Map(prev);
            newMap.delete(taskId);
            return newMap;
          });
          activeTasksRef.current.delete(taskId);
          
          // Show success notification
          toast.push(
            <Notification title="Data Generated Successfully" type="success">
              Successfully generated {status.result?.rows_generated} rows as "{status.result?.filename}"!
            </Notification>
          );
          
          // Refresh the files table
          fetchSyntheticFilesData(true);
          
          // If this is a retry task, also refresh the failed tasks section
          if (taskName === 'Retry Task') {
            setRefreshFailedTasks(prev => prev + 1);
          }
          
        } else if (status.status === 'failure') {
          // Stop polling
          const task = activeTasksRef.current.get(taskId);
          if (task?.pollingInterval) {
            clearInterval(task.pollingInterval);
          }
          
          // Remove from active tasks
          setActiveTasks(prev => {
            const newMap = new Map(prev);
            newMap.delete(taskId);
            return newMap;
          });
          activeTasksRef.current.delete(taskId);
          
          // Trigger refresh of failed tasks section
          setRefreshFailedTasks(prev => prev + 1);
          
          // Auto-scroll to failed tasks section after a short delay to allow refresh
          setTimeout(() => {
            if (failedTasksSectionRef.current) {
              failedTasksSectionRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
            }
          }, 500); // Small delay to allow the refresh to complete
          
          // Show error notification
          toast.push(
            <Notification title="Generation Failed" type="danger">
              {status.error || 'Failed to generate synthetic data'}
            </Notification>
          );
        }
        
      } catch (error: any) {
        console.error('Failed to fetch task status:', error);
        
        // On error, stop polling for this task
        const task = activeTasksRef.current.get(taskId);
        if (task?.pollingInterval) {
          clearInterval(task.pollingInterval);
        }
        
        setActiveTasks(prev => {
          const newMap = new Map(prev);
          newMap.delete(taskId);
          return newMap;
        });
        activeTasksRef.current.delete(taskId);
      }
    };
    
    // Start polling every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    
    // Store the interval and initial check
    const newTask: ActiveTask = {
      taskId,
      taskName,
      status: null,
      pollingInterval: interval
    };
    
    setActiveTasks(prev => {
      const newMap = new Map(prev);
      newMap.set(taskId, newTask);
      return newMap;
    });
    activeTasksRef.current.set(taskId, newTask);
    
    // Do first check immediately
    checkStatus();
  };
  
  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      // Clear all polling intervals when component unmounts
      activeTasksRef.current.forEach(task => {
        if (task.pollingInterval) {
          clearInterval(task.pollingInterval);
        }
      });
    };
  }, []);

  // Modified generateData to handle list fields and async tasks
  const generateData = async () => {
    if (selectedFields.length === 0) {
      setError('Please add at least one field');
      return;
    }

    const missingColumnNames = selectedFields.filter(field => !field.columnName);
    if (missingColumnNames.length > 0) {
      setError('Please provide column names for all fields');
      return;
    }

    // Validate file name
    if (!fileName || fileName.trim() === '') {
      setError('Please provide a valid file name');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const columnsInfo = {
        columns: selectedFields.reduce((acc, field) => {
          if (field.isList) {
            acc[field.columnName] = {
              category: 'user_list', // Set category to user_list
              field: field.field, // This will be the list name
              params: {}
            };
          } else {
            const transformedParams = Object.entries(field.params).reduce((paramsAcc, [key, value]) => {
              // Skip kwargs/args parameters that should never be sent to backend
              const SKIP_PARAMS = ['**kwargs', 'kwargs', '**kwds', 'kwds', '*args', 'args'];
              if (SKIP_PARAMS.includes(key)) {
                return paramsAcc;
              }
              // Skip size parameter for numpy_distribution - it will be added automatically
              if (field.category === 'numpy_distribution' && key === 'size') {
                return paramsAcc;
              }
              // Fix backend API schema bug: username parameter is 'drang' in schema but 'drange' in Mimesis
              const actualKey = (key === 'drang' && field.field === 'username') ? 'drange' : key;
              paramsAcc[actualKey] = transformParamValue(key, value, field.field);
              return paramsAcc;
            }, {} as Record<string, string>);

            // Automatically add size parameter for numpy_distribution fields
            if (field.category === 'numpy_distribution') {
              transformedParams['size'] = String(rowCount);
            }

            acc[field.columnName] = {
              category: field.category,
              field: field.field,
              params: transformedParams
            };
          }
          return acc;
        }, {} as Record<string, { category: string; field: string; params: Record<string, string> }>)
      };

      // Ensure file name has .csv extension
      const fileNameWithExtension = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;

      const response = await ApiService2.post<TaskResponse>('/synthetic/generate-synthetic-data', {
        user_id: temp_user_id,
        num_rows: rowCount,
        csv_file_name: fileNameWithExtension,
        columns_info: columnsInfo
      });

      // Handle async task response
      const taskResponse = response.data as any;
      
      if (taskResponse.task_id) {
        // Async task created successfully
        toast.push(
          <Notification title="Generation Started" type="info">
            Generating {rowCount} rows as "{fileNameWithExtension}". This may take a few moments...
          </Notification>
        );
        
        // Start polling for task status
        pollTaskStatus(taskResponse.task_id, taskResponse.task_name || fileNameWithExtension);
        
        // Scroll to synthetic files table to show progress
        setTimeout(() => {
          if (syntheticFilesTableRef.current) {
            syntheticFilesTableRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 300);
        
      } else if (taskResponse.status === 'success') {
        // Fallback: synchronous response (old behavior)
        setSuccess(`Successfully generated ${rowCount} rows of data as "${fileNameWithExtension}"!`);

        toast.push(
          <Notification title="Data Generated Successfully" type="success">
            Successfully generated {rowCount} rows of data as "{fileNameWithExtension}"!
          </Notification>
        );

        setTimeout(() => {
          if (syntheticFilesTableRef.current) {
            syntheticFilesTableRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
          fetchSyntheticFilesData(true);
        }, 500);
      } else {
        throw new Error('Failed to generate data');
      }
    } catch (err: any) {
      console.error('Failed to generate synthetic data:', err);

      // Parse error using the utility function
      const parsedError = parseBackendError(err);

      setError(parsedError.message);

      toast.push(
        <Notification title={parsedError.title} type="danger">
          {parsedError.message}
        </Notification>
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to toggle collapse state for a specific field
  const toggleFieldCollapse = (fieldId: string) => {
    setCollapsedFields(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  // Function to expand all fields
  const expandAllFields = () => {
    const allExpanded = selectedFields.reduce((acc, field) => {
      acc[field.id] = false;
      return acc;
    }, {} as Record<string, boolean>);

    setCollapsedFields(allExpanded);
  };

  // Function to collapse all fields
  const collapseAllFields = () => {
    const allCollapsed = selectedFields.reduce((acc, field) => {
      acc[field.id] = true;
      return acc;
    }, {} as Record<string, boolean>);

    setCollapsedFields(allCollapsed);
  };

  // Function to update temporary column name as user types
  const handleTempColumnNameChange = (fieldId: string, value: string) => {
    setTempColumnNames(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  // Function to toggle sort order
  const toggleSortOrder = (field: 'date' | 'size') => {
    if (sortField === field) {
      // Toggle order if clicking the same column
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Memoized sorted files
  const sortedSyntheticFiles = React.useMemo(() => {
    return [...syntheticFiles].sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.updated_at).getTime();
        const dateB = new Date(b.updated_at).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        // Sort by size
        const sizeA = a.file_size;
        const sizeB = b.file_size;
        return sortOrder === 'desc' ? sizeB - sizeA : sizeA - sizeB;
      }
    });
  }, [syntheticFiles, sortOrder, sortField]);

  // Function to fetch synthetic files
  const fetchSyntheticFilesData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshingTable(true);
      } else {
        setLoadingSyntheticFiles(true);
      }
      
      const response = await dispatch(fetchSyntheticFiles());
      if (fetchSyntheticFiles.fulfilled.match(response)) {
        setSyntheticFiles(response.payload);
      }
    } catch (error: any) {
      console.error('Failed to fetch synthetic files:', error);
      const parsedError = parseBackendError(error);
      toast.push(
        <Notification title={parsedError.title} type="danger">
          {parsedError.message}
        </Notification>
      );
    } finally {
      setLoadingSyntheticFiles(false);
      setRefreshingTable(false);
    }
  };

  // Function to handle data preview
  const handlePreviewData = async (file: DataFile) => {
    try {
      setSelectedFile(file);
      setLoadingDataFrame(true);
      setPreviewModalOpen(true);

      // Fetch columns info
      const columnsResponse = await ApiService2.get<ColumnInfo[]>(`/data/users/files/${file.file_id}/columns`);
      setColumns(columnsResponse.data);

      // Fetch data using the same endpoint structure as UploadData
      const dataResponse = await ApiService2.get<{
        data: DataFrameRow[];
        pagination: {
          total_rows: number;
          total_pages: number;
          current_page: number;
          page_size: number;
          has_next: boolean;
        };
      }>(`/data/users/files/${file.file_id}/data?page=1&page_size=50`);
      
      if (dataResponse.data && dataResponse.data.data && Array.isArray(dataResponse.data.data)) {
        setDataFrameData(dataResponse.data.data);
      } else {
        console.error('Invalid data format received:', dataResponse.data);
        setDataFrameData([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      const parsedError = parseBackendError(error);
      toast.push(
        <Notification title={parsedError.title} type="danger">
          {parsedError.message}
        </Notification>
      );
    } finally {
      setLoadingDataFrame(false);
    }
  };

  // Show error notification when enum loading fails
  useEffect(() => {
    if (enumsError) {
      toast.push(
        <Notification title="Error Loading Data" type="danger">
          {enumsError}
        </Notification>
      );
    }
  }, [enumsError]);

  // Fetch synthetic files on component mount
  useEffect(() => {
    fetchSyntheticFilesData();
  }, []);

  // Refresh synthetic files after successful generation
  useEffect(() => {
    if (success) {
      fetchSyntheticFilesData(true);
    }
  }, [success]);

  if (enumsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Generate Synthetic Data</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500"></span>
            <div className={`w-4 h-4 rounded-full ${themeColor}`} />
          </div>
        </div>

        {(error || enumsError) && (
          <Alert className="mb-6 bg-red-50 text-red-800 border-red-200 rounded-lg">
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error || enumsError}
            </span>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 text-green-800 border-green-200 rounded-lg">
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </span>
          </Alert>
        )}

        <div className="space-y-8">
          <div className={`grid gap-6 ${import.meta.env.VITE_ENV === 'development' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Generation Settings</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Rows
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={rowCountInput}
                    onChange={handleRowCountChange}
                    onBlur={handleRowCountBlur}
                    disabled={isGenerating}
                    className="w-full"
                    placeholder="Enter number of rows (1-10000)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Max 10,000 rows
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File Name
                  </label>
                  <Input
                    type="text"
                    value={fileName}
                    onChange={handleFileNameChange}
                    disabled={isGenerating}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    CSV file name
                  </p>
                </div>
              </div>
            </div>

            {import.meta.env.VITE_ENV === 'development' && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Request Preview</h2>
                <div className="bg-gray-800 rounded-lg p-3">
                  <pre className="text-gray-200 text-xs overflow-auto max-h-[300px]">
                    {JSON.stringify(requestData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Fields Configuration</h2>
              <div className="flex items-center space-x-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                  onClick={() => setHelpModalOpen(true)}
                  title="View all available categories and fields"
                >
                  <HelpCircle className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Help</span>
                </Button>
                <div className="hidden lg:flex space-x-2">
                <Button
                  variant="default"
                  size="sm"
                  className={`flex items-center bg-${themeColor}-50 text-${themeColor}-600 border-${themeColor}-200 hover:bg-${themeColor}-100`}
                  onClick={expandAllFields}
                >
                  <Maximize2 className="w-4 h-4 mr-1" />
                  <span>Expand All</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className={`flex items-center bg-${themeColor}-50 text-${themeColor}-600 border-${themeColor}-200 hover:bg-${themeColor}-100`}
                  onClick={collapseAllFields}
                >
                  <Minimize2 className="w-4 h-4 mr-1" />
                  <span>Collapse All</span>
                </Button>
                </div>
              </div>
            </div>

            {selectedFields.map((field) => (
              <div
                key={field.id}
                className={`mb-4 border border-gray-200 rounded-lg overflow-visible bg-white hover:border-${themeColor}-200 transition-colors duration-200`}
                style={{ position: 'relative' }}
              >
                <div
                  className={`flex items-center justify-between py-2 px-4 cursor-pointer bg-gray-50 hover:bg-${themeColor}-50 transition-colors duration-200`}
                  onClick={() => toggleFieldCollapse(field.id)}
                >
                  <div className="font-medium text-gray-800 flex items-center">
                    {collapsedFields[field.id] ?
                      <ChevronDown className={`h-4 w-4 text-${themeColor}-500 mr-2`} /> :
                      <ChevronUp className={`h-4 w-4 text-${themeColor}-500 mr-2`} />
                    }
                    <span className="text-base">{tempColumnNames[field.id] || field.columnName || "Unnamed Field"}</span>
                  </div>
                  <Button
                    variant="default"
                    size="xs"
                    className="bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 border border-gray-300 hover:border-red-300 focus:ring-0 rounded-md transition-colors duration-200 py-1 px-2 text-xs font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveField(field.id);
                    }}
                    title="Remove field"
                  >
                    Remove
                  </Button>
                </div>

                {/* Always render the FieldCard but hide it with CSS when collapsed */}
                <div
                  className={`p-4 ${collapsedFields[field.id] ? 'hidden' : 'block'}`}
                  style={{
                    position: 'relative',
                    zIndex: selectedFields.length - selectedFields.indexOf(field) // Higher index for earlier fields
                  }}
                >
                  <FieldCard
                    fieldId={field.id}
                    index={selectedFields.indexOf(field)}
                    rowCount={rowCount}
                    categoryOptions={categoryOptions}
                    availableFields={enumData?.all_fields?.fields || {}}
                    onRemove={handleRemoveField}
                    onChange={handleFieldChange}
                    onColumnNameChange={handleTempColumnNameChange}
                    hideRemoveButton={true}
                    initialValues={field}
                  />
                </div>
              </div>
            ))}

            <Button
              onClick={handleAddField}
              variant="solid"
              className="mt-4 w-full sm:w-auto flex items-center justify-center content-center"
            >
              <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>Add Field</span>
            </Button>
          </div>



          <div className="flex justify-end">
            <Button
              onClick={generateData}
              variant="solid"
              disabled={isGenerating || selectedFields.length === 0}
              className="w-full sm:w-auto flex items-center justify-center content-center"
            >
              {isGenerating ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Generating...
                </>
              ) : (
                'Generate Data'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Failed Tasks Section */}
      {showFailedTasks ? (
        <div ref={failedTasksSectionRef} className="mt-8">
          <FailedTasksList
            onRetrySuccess={(newTaskId) => {
              // Start polling for the retry task
              pollTaskStatus(newTaskId, 'Retry Task');
              
              // Show success message
              toast.push(
                <Notification
                  title="Retry Initiated"
                  type="success"
                  duration={3000}
                >
                  Task retry has been initiated. Tracking progress...
                </Notification>
              );
            }}
            onViewData={(dataId) => {
              // Handle viewing data from successful retry
              console.log('View data for ID:', dataId);
              // You can implement navigation to data view here
            }}
            onEndpointNotAvailable={() => {
              // Hide the failed tasks section when endpoint is not available
              setShowFailedTasks(false);
            }}
            refreshTrigger={refreshFailedTasks}
          />
        </div>
      ) : (
        <div ref={failedTasksSectionRef} className="mt-8">
          <Card header="Failed Tasks" headerBorder>
            <div className="text-center py-8">
              <div className="text-blue-600 dark:text-blue-400 mb-4">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                <p className="font-medium">Feature Coming Soon</p>
                <p className="text-sm">Failed tasks management is currently being developed</p>
                <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">
                  This feature will allow you to view and retry failed data generation tasks.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Synthetic Files Table */}
      <div ref={syntheticFilesTableRef} className="mt-8">
        <Card header="Your Synthetic Files" headerBorder>
          {import.meta.env.VITE_ENV === 'development' && (
            <div className="mb-3">
              <Button
                size="sm"
                onClick={() => fetchSyntheticFilesData(true)}
                loading={loadingSyntheticFiles || refreshingTable}
                variant="solid"
              >
                Refresh
              </Button>
            </div>
          )}
          
          {loadingSyntheticFiles ? (
            <div className="text-center py-8">
              <Spinner size="lg" />
              <p className="mt-2 text-gray-600">Loading synthetic files...</p>
            </div>
          ) : (
            <div className="relative">
              {refreshingTable && (
                <div className="absolute top-0 left-0 right-0 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 z-10">
                  <div className="flex items-center justify-center">
                    <Spinner size="sm" className="mr-2" />
                    <span className="text-blue-700 text-sm font-medium">
                      Refreshing table with new data...
                    </span>
                  </div>
                </div>
              )}
              
              {sortedSyntheticFiles.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <Tr>
                    <Th>File Name</Th>
                    <Th>
                      <button 
                        onClick={() => toggleSortOrder('date')}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                        title={`Sort by date (${sortField === 'date' && sortOrder === 'desc' ? 'newest first' : 'oldest first'})`}
                      >
                        <span>Created Date</span>
                        {sortField === 'date' && (
                          sortOrder === 'desc' ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )
                        )}
                      </button>
                    </Th>
                    <Th>
                      <button 
                        onClick={() => toggleSortOrder('size')}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                        title={`Sort by size (${sortField === 'size' && sortOrder === 'desc' ? 'largest first' : 'smallest first'})`}
                      >
                        <span>Size</span>
                        {sortField === 'size' && (
                          sortOrder === 'desc' ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )
                        )}
                      </button>
                    </Th>
                    <Th>Source</Th>
                    <Th>Actions</Th>
                  </Tr>
                </THead>
                <TBody>
                  {/* Show active tasks first with progress bars */}
                  {Array.from(activeTasks.values()).map((task) => (
                    <Tr key={task.taskId} className="bg-blue-50">
                      <Td>
                        <div className="flex items-center gap-2">
                          <Spinner size="sm" className="text-blue-600" />
                          <span className="font-medium text-gray-900">{task.taskName}</span>
                        </div>
                      </Td>
                      <Td>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                              {task.status?.status || 'pending'}
                            </span>
                            {task.status?.estimated_time_seconds && (
                              <span className="text-xs text-gray-600">
                                ~{Math.ceil(task.status.estimated_time_seconds / 60)} min
                              </span>
                            )}
                          </div>
                          {task.status?.current_step && (
                            <div className="text-xs text-gray-700">
                              {task.status.current_step}
                            </div>
                          )}
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-300 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${task.status?.progress || 0}%` }}
                            />
                          </div>
                          <div className="text-xs font-medium text-blue-700">
                            {task.status?.progress?.toFixed(1) || 0}% complete
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-gray-400 text-sm">Processing...</span>
                      </Td>
                      <Td>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                          generating
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-gray-500">Please wait...</span>
                      </Td>
                    </Tr>
                  ))}
                  
                  {/* Show completed files */}
                  {sortedSyntheticFiles.map((file) => (
                    <Tr key={file.file_id}>
                      <Td>{file.file_name}</Td>
                      <Td>{new Date(file.updated_at).toLocaleString()}</Td>
                      <Td>{file.file_size/1000} Kb</Td>
                      <Td>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {file.source || 'synthetic'}
                        </span>
                      </Td>
                      <Td>
                        <Button
                          size="sm"
                          variant="solid"
                          color="blue"
                          onClick={() => handlePreviewData(file)}
                          loading={loadingDataFrame && selectedFile?.file_id === file.file_id}
                        >
                          View Data
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No synthetic files found. Generate some data to see them here!
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Data Preview Modal */}
      <SimpleDataPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        dataFrameData={dataFrameData}
        loadingDataFrame={loadingDataFrame}
        fileName={selectedFile?.file_name || ''}
        columns={columns}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        organizedCategories={getOrganizedCategories()}
        userLists={userLists || []}
      />
    </div>
  );
};

export default SyntheticDataGenerator; 