/**
 * Enhanced Value Input Component
 * Provides user-friendly value input with column-specific options and hints
 */

import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { DetailedColumnInfo } from '@/@types/csv';
import DatePicker from '@/components/ui/DatePicker';
import SimpleTimePicker from './SimpleTimePicker';
import { useAppSelector } from '@/store/hook';

interface EnhancedValueInputProps {
  field: string;
  operator: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  columnsInfo: DetailedColumnInfo[];
  className?: string;
}

interface SelectOption {
  value: string;
  label: string;
}

const EnhancedValueInput: React.FC<EnhancedValueInputProps> = ({
  field,
  operator,
  value,
  onChange,
  columnsInfo,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [selectOptions, setSelectOptions] = useState<SelectOption[]>([]);
  const [freeInputMode, setFreeInputMode] = useState<boolean>(false); // Toggle for free input
  const [betweenValue1, setBetweenValue1] = useState<string>(''); // First value for between
  const [betweenValue2, setBetweenValue2] = useState<string>(''); // Second value for between

  // Get user lists from Redux store (fetched by parent FilterModal)
  const { userLists } = useAppSelector((state) => state.lists.lists);

  // Find the column info for the selected field
  const columnInfo = columnsInfo.find(col => col.name === field);
  
  // Debug logging
  useEffect(() => {
    if (field) {
      console.log('🔍 EnhancedValueInput Debug:', {
        field,
        operator,
        columnInfo,
        dtype: columnInfo?.dtype,
        allColumns: columnsInfo.map(c => ({ name: c.name, dtype: c.dtype }))
      });
    }
  }, [field, operator, columnInfo, columnsInfo]);

  // Reset free input mode when field changes
  useEffect(() => {
    setFreeInputMode(false); // Default to constrained mode for new field
  }, [field]);

  useEffect(() => {
    // Handle null operators - automatically set value to "null"
    if (operator === 'null' || operator === 'notNull') {
      setInputValue('null');
      onChange('null');
      setFreeInputMode(false); // Reset for null operators
      return;
    }

    // Handle between/notBetween operators - split into two values
    if ((operator === 'between' || operator === 'notBetween') && Array.isArray(value)) {
      setBetweenValue1(value[0] || '');
      setBetweenValue2(value[1] || '');
      // Don't return here - continue to generate select options below
    } else {
      // Initialize input value for non-between operators
      if (Array.isArray(value)) {
        setInputValue(value.join(', '));
      } else {
        setInputValue(value || '');
      }
    }

    // Generate select options from user lists for inUserList/notInUserList operators
    if (operator === 'inUserList' || operator === 'notInUserList') {
      const options: SelectOption[] = userLists
        .map(list => ({
          value: list.name,
          label: `${list.name}`
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      setSelectOptions(options);
    } 
    // Generate select options from unique values (for all other operators including between)
    else if (columnInfo && columnInfo.unique_values && columnInfo.unique_values.length > 0) {
      const options: SelectOption[] = columnInfo.unique_values
        .filter(val => val !== null && val !== undefined)
        .map(val => ({
          value: String(val),
          label: String(val)
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      setSelectOptions(options);
    } else {
      setSelectOptions([]);
    }
  }, [field, value, columnInfo, operator, userLists]);

  // Handle input change
  const handleInputChange = (newValue: string) => {
    // Don't allow changes for null operators
    if (operator === 'null' || operator === 'notNull') {
      return;
    }

    setInputValue(newValue);
    
    // Handle different operators
    if (operator === 'in' || operator === 'notIn') {
      // For 'in' operators, split by comma (manual values)
      const values = newValue.split(',').map(v => v.trim()).filter(v => v);
      onChange(values);
    } else if (operator === 'inUserList' || operator === 'notInUserList') {
      // For 'inUserList' operators, treat as single list name
      onChange(newValue.trim());
    } else if (operator === 'between' || operator === 'notBetween') {
      // For 'between' operators, split by comma or dash
      const values = newValue.split(/[,;|-]/).map(v => v.trim()).filter(v => v);
      onChange(values);
    } else {
      // For single value operators
      onChange(newValue);
    }
  };

  // Handle select change
  const handleSelectChange = (selectedOptions: any) => {
    if (selectedOptions) {
      if (Array.isArray(selectedOptions)) {
        const values = selectedOptions.map((opt: any) => opt.value);
        setInputValue(values.join(', '));
        onChange(values);
      } else {
        setInputValue(selectedOptions.value);
        onChange(selectedOptions.value);
      }
    } else {
      // Handle clearing the selection
      setInputValue('');
      onChange('');
    }
  };

  // Get column type category for styling
  const getColumnTypeCategory = (dtype: string): string => {
    if (['integer', 'float', 'number', 'numeric'].includes(dtype)) {
      return 'numeric';
    } else if (['string', 'text', 'varchar', 'char'].includes(dtype)) {
      return 'text';
    } else if (dtype === 'date') {
      return 'date'; // Date only (no time)
    } else if (dtype === 'time') {
      return 'time'; // Time only (no date)
    } else if (['datetime', 'timestamp'].includes(dtype)) {
      return 'datetime'; // Date and time
    } else if (['boolean', 'bool'].includes(dtype)) {
      return 'boolean';
    } else if (dtype === 'unknown') {
      return 'unknown'; // Unknown type - treat as text
    }
    return 'default';
  };

  // Determine input type based on column type and operator
  const getInputType = (): 'text' | 'number' | 'date' | 'time' | 'datetime' | 'select' | 'datepicker' | 'timepicker' | 'between' => {
    // For user list operators, use dropdown if lists are available, otherwise text input
    if (['inUserList', 'notInUserList'].includes(operator)) {
      return userLists.length > 0 ? 'select' : 'text';
    }

    if (!columnInfo) return 'text';

    const typeCategory = getColumnTypeCategory(columnInfo.dtype);

    // For between/notBetween operators, return special 'between' type
    if (['between', 'notBetween'].includes(operator)) {
      return 'between';
    }

    // PRIORITY 1: Check temporal types FIRST (date/datetime/time always use pickers)
    // Note: Free input mode for temporal types still uses pickers, just without constraints
    if (typeCategory === 'date' || typeCategory === 'datetime') {
      return 'datepicker'; // Use DatePicker for date/datetime columns (with or without constraints)
    }
    
    if (typeCategory === 'time') {
      return 'timepicker'; // Use TimeInput for time columns (with or without constraints)
    }

    // PRIORITY 2: For non-temporal types, free input mode uses text
    if (freeInputMode) {
      return 'text'; // Free mode for non-temporal: plain text input
    }

    // PRIORITY 3: For non-temporal types, check if dropdown is appropriate
    if (['=', '!=', 'in', 'notIn'].includes(operator) && 
        columnInfo.unique_values && 
        columnInfo.unique_values.length <= 20) {
      return 'select'; // Use dropdown for columns with few unique values
    }

    // PRIORITY 4: Default type-specific inputs
    switch (typeCategory) {
      case 'numeric':
        return 'number';
      case 'unknown':
        return 'text'; // Treat unknown as text
      default:
        return 'text';
    }
  };

  const inputType = getInputType();

  // Helper to format date for backend (YYYY-MM-DD)
  const formatDateForBackend = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to format time for backend (HH:MM:SS)
  const formatTimeForBackend = (date: Date | null): string => {
    if (!date) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Handle date picker change
  const handleDatePickerChange = (date: Date | null) => {
    const formattedDate = formatDateForBackend(date);
    setInputValue(formattedDate);
    onChange(formattedDate);
  };

  // Handle time picker change (receives formatted string from SimpleTimePicker)
  const handleTimePickerChange = (time: string) => {
    setInputValue(time);
    onChange(time);
  };

  // Parse date string to Date object (for DatePicker)
  const parseDateValue = (val: string | string[]): Date | null => {
    if (!val || Array.isArray(val)) return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  };

  // Parse time string to Date object (for TimeInput)
  const parseTimeValue = (val: string | string[]): Date | null => {
    if (!val || Array.isArray(val)) return null;
    // Time is in format HH:MM:SS or HH:MM
    const timeParts = val.split(':');
    if (timeParts.length < 2) return null;
    
    const now = new Date();
    now.setHours(parseInt(timeParts[0]) || 0);
    now.setMinutes(parseInt(timeParts[1]) || 0);
    now.setSeconds(parseInt(timeParts[2]) || 0);
    
    return now;
  };

  // Handle between operator value changes
  const handleBetweenChange = (index: 1 | 2, newValue: string) => {
    if (index === 1) {
      setBetweenValue1(newValue);
      onChange([newValue, betweenValue2]);
    } else {
      setBetweenValue2(newValue);
      onChange([betweenValue1, newValue]);
    }
  };

  // Handle between operator date picker changes
  const handleBetweenDateChange = (index: 1 | 2, date: Date | null) => {
    const formattedDate = formatDateForBackend(date);
    handleBetweenChange(index, formattedDate);
  };

  // Handle between operator time picker changes (receives formatted string)
  const handleBetweenTimeChange = (index: 1 | 2, time: string): void => {
    handleBetweenChange(index, time);
  };

  // Determine if free input toggle should be shown
  const shouldShowFreeInputToggle = () => {
    if (!columnInfo) return false;
    const typeCategory = getColumnTypeCategory(columnInfo.dtype);
    
    // Show toggle ONLY for date/datetime (DatePicker) - NOT for time
    // This includes between/notBetween operators for date/datetime columns
    if (['date', 'datetime'].includes(typeCategory)) {
      return true;
    }
    
    // Show toggle for columns with select dropdown (limited unique values)
    // But NOT for temporal types
    if (!['date', 'datetime', 'time'].includes(typeCategory) &&
        columnInfo.unique_values && 
        columnInfo.unique_values.length > 0 && 
        columnInfo.unique_values.length <= 20) {
      return true; // Show for both regular operators AND between operators
    }
    
    return false;
  };

  return (
    <div className={`${className}`}>
      {/* Debug info (only in development) */}
      {import.meta.env.VITE_ENV === 'development' && columnInfo && (
        <div className="text-xs bg-yellow-50 border border-yellow-200 rounded px-2 py-1 mb-1">
          <strong>Debug:</strong> dtype={columnInfo.dtype}, inputType={inputType}, freeMode={freeInputMode}
        </div>
      )}
      
      {/* Value Input with inline Free Mode Toggle */}
      <div className="relative w-full flex items-start gap-2">
        {/* Main Input Area */}
        <div className="flex-1">
        {operator === 'null' || operator === 'notNull' ? (
          // Special display for null operators
          <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm flex items-center justify-between">
            <span>null</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              Auto-set
            </span>
          </div>
        ) : inputType === 'datepicker' ? (
          // DatePicker for date-only columns
          <DatePicker
            value={parseDateValue(value)}
            onChange={handleDatePickerChange}
            placeholder="Select date..."
            inputFormat="YYYY-MM-DD"
            minDate={freeInputMode ? undefined : (columnInfo?.earliest ? new Date(columnInfo.earliest) : undefined)}
            maxDate={freeInputMode ? undefined : (columnInfo?.latest ? new Date(columnInfo.latest) : undefined)}
            className="w-full"
            size="sm"
          />
        ) : inputType === 'timepicker' ? (
          // SimpleTimePicker for time-only columns (user-friendly scrollable picker)
          <SimpleTimePicker
            value={typeof value === 'string' ? value : ''}
            onChange={handleTimePickerChange}
            placeholder="Select time..."
            size="sm"
            className="w-full"
          />
        ) : inputType === 'between' ? (
          // Between/NotBetween operators - two inputs (will be handled separately with lock button in middle)
          (() => {
            const typeCategory = columnInfo ? getColumnTypeCategory(columnInfo.dtype) : 'default';
            
            // For date/datetime columns - two DatePickers
            if (typeCategory === 'date' || typeCategory === 'datetime') {
              return (
                <div className="flex flex-col space-y-2 w-full">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-medium text-gray-600 w-12 flex-shrink-0">From:</label>
                    <DatePicker
                      value={parseDateValue(betweenValue1)}
                      onChange={(date) => handleBetweenDateChange(1, date)}
                      placeholder="Start date..."
                      inputFormat="YYYY-MM-DD"
                      minDate={freeInputMode ? undefined : (columnInfo?.earliest ? new Date(columnInfo.earliest) : undefined)}
                      maxDate={freeInputMode ? undefined : (columnInfo?.latest ? new Date(columnInfo.latest) : undefined)}
                      className="flex-1"
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-medium text-gray-600 w-12 flex-shrink-0">To:</label>
                    <DatePicker
                      value={parseDateValue(betweenValue2)}
                      onChange={(date) => handleBetweenDateChange(2, date)}
                      placeholder="End date..."
                      inputFormat="YYYY-MM-DD"
                      minDate={freeInputMode ? undefined : (columnInfo?.earliest ? new Date(columnInfo.earliest) : undefined)}
                      maxDate={freeInputMode ? undefined : (columnInfo?.latest ? new Date(columnInfo.latest) : undefined)}
                      className="flex-1"
                      size="sm"
                    />
                  </div>
                </div>
              );
            }
            
            // For time columns - two SimpleTimePickers
            if (typeCategory === 'time') {
              return (
                <div className="flex flex-col space-y-2 w-full">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-medium text-gray-600 w-12 flex-shrink-0">From:</label>
                    <SimpleTimePicker
                      value={betweenValue1}
                      onChange={(time) => handleBetweenTimeChange(1, time)}
                      placeholder="Start time..."
                      size="sm"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-medium text-gray-600 w-12 flex-shrink-0">To:</label>
                    <SimpleTimePicker
                      value={betweenValue2}
                      onChange={(time) => handleBetweenTimeChange(2, time)}
                      placeholder="End time..."
                      size="sm"
                      className="flex-1"
                    />
                  </div>
                </div>
              );
            }
            
            // For other columns - check if dropdown should be used
            const shouldUseDropdownForBetween = !freeInputMode && 
                                                 columnInfo?.unique_values && 
                                                 columnInfo.unique_values.length > 0 && 
                                                 columnInfo.unique_values.length <= 20;
            
            if (shouldUseDropdownForBetween) {
              // Use two Select dropdowns for constrained mode
              return (
                <div className="flex flex-col space-y-2 w-full">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-medium text-gray-600 w-12 flex-shrink-0">From:</label>
                    <Select
                      value={betweenValue1 ? { value: betweenValue1, label: betweenValue1 } : null}
                      onChange={(option: any) => handleBetweenChange(1, option?.value || '')}
                      options={selectOptions}
                      placeholder="Select start..."
                      className="flex-1 text-sm"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '38px',
                          borderColor: '#d1d5db',
                          boxShadow: 'none',
                          '&:hover': { borderColor: '#9ca3af' },
                        }),
                        menu: (provided) => ({ ...provided, zIndex: 9999 }),
                      }}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-medium text-gray-600 w-12 flex-shrink-0">To:</label>
                    <Select
                      value={betweenValue2 ? { value: betweenValue2, label: betweenValue2 } : null}
                      onChange={(option: any) => handleBetweenChange(2, option?.value || '')}
                      options={selectOptions}
                      placeholder="Select end..."
                      className="flex-1 text-sm"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '38px',
                          borderColor: '#d1d5db',
                          boxShadow: 'none',
                          '&:hover': { borderColor: '#9ca3af' },
                        }),
                        menu: (provided) => ({ ...provided, zIndex: 9999 }),
                      }}
                    />
                  </div>
                </div>
              );
            } else {
              // Use two text/number inputs for free mode or columns with many values
              const inputTypeForBetween = typeCategory === 'numeric' ? 'number' : 'text';
              return (
                <div className="flex flex-col space-y-2 w-full">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-medium text-gray-600 w-12 flex-shrink-0">From:</label>
                    <input
                      type={inputTypeForBetween}
                      value={betweenValue1}
                      onChange={(e) => handleBetweenChange(1, e.target.value)}
                      placeholder={`Start ${typeCategory === 'numeric' ? 'value' : 'value'}...`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-medium text-gray-600 w-12 flex-shrink-0">To:</label>
                    <input
                      type={inputTypeForBetween}
                      value={betweenValue2}
                      onChange={(e) => handleBetweenChange(2, e.target.value)}
                      placeholder={`End ${typeCategory === 'numeric' ? 'value' : 'value'}...`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              );
            }
          })()
        ) : inputType === 'select' ? (
          <Select
            isMulti={operator === 'in' || operator === 'notIn'}
            value={
              // For user list operators - single selection
              (operator === 'inUserList' || operator === 'notInUserList') 
                ? (value ? { value: value as string, label: value as string } : null)
                // For multi-select operators (in/notIn)
                : Array.isArray(value) 
                  ? value.map(v => ({ value: v, label: v }))
                  // For single-select operators
                  : value ? { value: value as string, label: value as string } : null
            }
            onChange={handleSelectChange}
            options={selectOptions}
            placeholder={
              (operator === 'inUserList' || operator === 'notInUserList') 
                ? 'Select a user list...'
                : `Select ${operator === 'in' || operator === 'notIn' ? 'values' : 'value'}...`
            }
            className="text-sm"
            isClearable={true}
            styles={{
              control: (base) => ({
                ...base,
                minHeight: '38px',
                borderColor: '#d1d5db',
                boxShadow: 'none',
                '&:hover': {
                  borderColor: '#9ca3af',
                },
              }),
              menu: (provided) => ({
                ...provided,
                zIndex: 9999,
              }),
            }}
          />
        ) : (
          <input
            type={inputType === 'number' ? 'number' : (inputType === 'date' || inputType === 'datetime') ? 'date' : inputType === 'time' ? 'time' : 'text'}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={`Enter ${operator === 'in' || operator === 'notIn' ? 'values' : operator === 'inUserList' || operator === 'notInUserList' ? 'list name' : 'value'}...`}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${className}`}
          />
        )}
        </div>
        
        {/* Free Input Mode Toggle Button - Inline (centered for between operator) */}
        {shouldShowFreeInputToggle() && operator !== 'null' && operator !== 'notNull' && (
          <div className={`flex-shrink-0 flex ${inputType === 'between' ? 'items-center' : 'items-start'}`}>
            <button
              type="button"
              onClick={() => setFreeInputMode(!freeInputMode)}
              className={`p-2 rounded-lg border transition-all duration-200 ${
                freeInputMode 
                  ? 'bg-green-50 border-green-500 text-green-700 hover:bg-green-100' 
                  : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
              title={freeInputMode ? 'Free mode: No constraints' : 'Constrained mode: Has limits'}
            >
              {freeInputMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedValueInput;
