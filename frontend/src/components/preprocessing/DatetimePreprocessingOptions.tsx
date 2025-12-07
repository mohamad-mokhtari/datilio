import React, { useState, useEffect } from 'react';
import { Select, Checkbox } from '@/components/ui';
import { Calendar } from 'lucide-react';
import type { ColumnInfo, PreprocessingOptions } from '@/services/PreprocessingService';

interface DatetimePreprocessingOptionsProps {
  column: ColumnInfo;
  options?: PreprocessingOptions | null;
  isMLReady?: boolean;
  onUpdate: (options: any) => void;
}

const DatetimePreprocessingOptions: React.FC<DatetimePreprocessingOptionsProps> = ({
  column,
  options: apiOptions,
  isMLReady = false,
  onUpdate
}) => {
  const [selectedOptions, setSelectedOptions] = useState({
    missing: apiOptions?.datetime?.missing?.default || 'drop',
    extract: [] as string[],
    round: null as any,
    convert_timezone: null as any,
    drop_original: apiOptions?.datetime?.drop_original?.default || (isMLReady ? true : false)
  });

  // Determine column type based on data characteristics (used in useEffect)
  const isDateOnly = () => {
    const name = column.name.toLowerCase();
    return name.includes('date') && !name.includes('time') && !name.includes('datetime');
  };

  const isTimeOnly = () => {
    const name = column.name.toLowerCase();
    return name.includes('time') && !name.includes('date') && !name.includes('datetime');
  };

  // In ML-Ready mode, ensure drop_original is true (required and disabled) and select first extraction option
  useEffect(() => {
    if (isMLReady) {
      setSelectedOptions(prev => {
        let updated = { ...prev };
        
        // Ensure drop_original is true
        if (!prev.drop_original) {
          updated.drop_original = true;
        }
        
        // If no extraction options are selected, select the first one based on column type
        if (prev.extract.length === 0) {
          let firstOption: string;
          if (isDateOnly()) {
            // For date-only columns, first option is 'year'
            firstOption = 'year';
          } else if (isTimeOnly()) {
            // For time-only columns, first option is 'hour'
            firstOption = 'hour';
          } else {
            // For full datetime columns, first option is 'year'
            firstOption = 'year';
          }
          updated.extract = [firstOption];
        }
        
        return updated;
      });
    }
  }, [isMLReady]);

  // In ML-Ready mode, if extract becomes empty, automatically select the first option
  useEffect(() => {
    if (isMLReady && selectedOptions.extract.length === 0) {
      let firstOption: string;
      if (isDateOnly()) {
        firstOption = 'year';
      } else if (isTimeOnly()) {
        firstOption = 'hour';
      } else {
        firstOption = 'year';
      }
      setSelectedOptions(prev => ({ ...prev, extract: [firstOption] }));
    }
  }, [isMLReady, selectedOptions.extract.length]);

  useEffect(() => {
    onUpdate(selectedOptions);
  }, [selectedOptions]); // Remove onUpdate from dependencies to prevent infinite loop

  const handleChange = (key: string, value: any) => {
    setSelectedOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleExtractChange = (component: string, checked: boolean) => {
    setSelectedOptions(prev => ({
      ...prev,
      extract: checked 
        ? [...prev.extract, component]
        : prev.extract.filter(c => c !== component)
    }));
  };

  const handleRoundChange = (enabled: boolean) => {
    if (enabled) {
      // Set default rounding unit based on column type
      const defaultUnit = isTimeOnly() ? 'minute' : 'day';
      setSelectedOptions(prev => ({
        ...prev,
        round: { unit: defaultUnit }
      }));
    } else {
      setSelectedOptions(prev => ({
        ...prev,
        round: null
      }));
    }
  };

  const handleTimezoneChange = (enabled: boolean) => {
    if (enabled) {
      setSelectedOptions(prev => ({
        ...prev,
        convert_timezone: { timezone: 'UTC' }
      }));
    } else {
      setSelectedOptions(prev => ({
        ...prev,
        convert_timezone: null
      }));
    }
  };

  // Get options from API or use defaults
  const getMissingOptions = () => {
    if (apiOptions?.datetime?.missing?.options) {
      return apiOptions.datetime.missing.options.map(option => ({
        value: option,
        label: option === 'drop' ? 'Drop rows with missing' :
               option === 'fill_earliest' ? 'Fill with earliest date' :
               option === 'fill_latest' ? 'Fill with latest date' :
               option === 'fill_default' ? 'Fill with default date' : option
      }));
    }
    return [
      { value: 'drop', label: 'Drop rows with missing' },
      { value: 'fill_earliest', label: 'Fill with earliest date' },
      { value: 'fill_latest', label: 'Fill with latest date' },
      { value: 'fill_default', label: 'Fill with default date' }
    ];
  };

  const getApiRoundOptions = () => {
    if (apiOptions?.datetime?.round?.options) {
      return apiOptions.datetime.round.options.map(option => ({
        value: option,
        label: option === 'none' ? 'No rounding' :
               option === 'day' ? 'Round to day' :
               option === 'hour' ? 'Round to hour' :
               option === 'minute' ? 'Round to minute' : option
      }));
    }
    return [
      { value: 'none', label: 'No rounding' },
      { value: 'day', label: 'Round to day' },
      { value: 'hour', label: 'Round to hour' },
      { value: 'minute', label: 'Round to minute' }
    ];
  };

  const toggleExtract = (feature: string) => {
    const newExtract = selectedOptions.extract.includes(feature)
      ? selectedOptions.extract.filter(f => f !== feature)
      : [...selectedOptions.extract, feature];
    handleChange('extract', newExtract);
  };

  const getExtractOptions = () => {
    if (isDateOnly()) {
      // For date-only columns, only show date-related options
      return [
        { value: 'year', label: 'Year' },
        { value: 'month', label: 'Month' },
        { value: 'day', label: 'Day' },
        { value: 'weekday', label: 'Weekday' }
      ];
    } else if (isTimeOnly()) {
      // For time-only columns, only show time-related options
      return [
        { value: 'hour', label: 'Hour' },
        { value: 'minute', label: 'Minute' },
        { value: 'second', label: 'Second' }
      ];
    } else {
      // For full datetime columns, show all options
      return [
        { value: 'year', label: 'Year' },
        { value: 'month', label: 'Month' },
        { value: 'day', label: 'Day' },
        { value: 'hour', label: 'Hour' },
        { value: 'minute', label: 'Minute' },
        { value: 'second', label: 'Second' },
        { value: 'weekday', label: 'Weekday' }
      ];
    }
  };

  const extractOptions = getExtractOptions();

  const getRoundOptions = () => {
    if (isDateOnly()) {
      // For date-only columns, only show day rounding
      return [
        { value: 'day', label: 'Day' }
      ];
    } else if (isTimeOnly()) {
      // For time-only columns, only show time-related rounding
      return [
        { value: 'hour', label: 'Hour' },
        { value: 'minute', label: 'Minute' }
      ];
    } else {
      // For full datetime columns, show all rounding options
      return [
        { value: 'day', label: 'Day' },
        { value: 'hour', label: 'Hour' },
        { value: 'minute', label: 'Minute' }
      ];
    }
  };

  const roundOptions = getRoundOptions();

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'US/Eastern', label: 'US/Eastern' },
    { value: 'US/Pacific', label: 'US/Pacific' },
    { value: 'Europe/London', label: 'Europe/London' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo' }
  ];

  return (
    <div className="preprocessing-section datetime">
      <div className="section-header">
        <span className="icon">📅</span>
        <h3>{column.name}</h3>
        <span className="badge datetime">
          {isDateOnly() ? 'Date Only' : isTimeOnly() ? 'Time Only' : 'Datetime / Date'}
        </span>
      </div>
      
      <div className="section-stats">
        {column.earliest && (
          <div className="stat">
            <span className="stat-label">Earliest:</span>
            <span className="stat-value">{column.earliest}</span>
          </div>
        )}
        {column.latest && (
          <div className="stat">
            <span className="stat-label">Latest:</span>
            <span className="stat-value">{column.latest}</span>
          </div>
        )}
        {column.missing_ratio !== undefined && (
          <div className="stat">
            <span className="stat-label">Missing:</span>
            <span className="stat-value">{(column.missing_ratio * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      {isMLReady && (
        <div style={{ padding: '12px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', marginBottom: '16px' }}>
          <strong>ML-Ready Mode:</strong> Only extraction options are shown (converts datetime components to numeric columns). At least one feature must be extracted.
        </div>
      )}
      
      <div className="options-grid">
        {!isMLReady && (
          <>
            {/* Missing Values */}
            <div className="option-group">
              <label>Missing Values:</label>
              <select
                value={selectedOptions.missing}
                onChange={(e) => handleChange('missing', e.target.value)}
                className="option-select"
              >
                {getMissingOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="help-text">
                How to handle missing datetime values
              </p>
            </div>
          </>
        )}
        
        {/* Extract Features - Required in ML-Ready mode */}
        <div className="option-group" style={isMLReady ? { border: '2px solid #1890ff', padding: '12px', borderRadius: '6px', backgroundColor: '#e6f7ff' } : {}}>
          <label style={isMLReady ? { fontWeight: 600, color: '#1890ff' } : {}}>
            {isMLReady ? 'Extract Features (Required):' : 'Extract Features:'}
          </label>
          <div className="checkbox-group">
            {extractOptions.map(option => (
              <label key={option.value} className="checkbox-item">
                <Checkbox
                  checked={selectedOptions.extract.includes(option.value)}
                  onChange={() => handleExtractChange(option.value, !selectedOptions.extract.includes(option.value))}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <p className="help-text">
            {isMLReady && 'At least one feature must be extracted to convert datetime to numeric columns.'}
            {!isMLReady && isDateOnly() && 'Extract specific components from date values'}
            {!isMLReady && isTimeOnly() && 'Extract specific components from time values'}
            {!isMLReady && !isDateOnly() && !isTimeOnly() && 'Extract specific components from datetime values'}
          </p>
        </div>
        
        {!isMLReady && (
          <>
            {/* Rounding */}
            <div className="option-group">
              <label className="checkbox-label">
                <Checkbox
                  checked={selectedOptions.round !== null}
                  onChange={handleRoundChange}
                />
                <span>Round datetime values</span>
              </label>
              {selectedOptions.round && (
                <div className="round-controls">
                  <label>Round to:</label>
                  <select
                    value={selectedOptions.round?.unit || 'day'}
                    onChange={(e) => handleChange('round', { unit: e.target.value })}
                    className="round-select"
                  >
                    {roundOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p className="help-text">
                {isDateOnly() && 'Round date to specified precision'}
                {isTimeOnly() && 'Round time to specified precision'}
                {!isDateOnly() && !isTimeOnly() && 'Round datetime to specified precision'}
              </p>
            </div>
            
            {/* Timezone Conversion */}
            <div className="option-group">
              <label className="checkbox-label">
                <Checkbox
                  checked={selectedOptions.convert_timezone !== null}
                  onChange={handleTimezoneChange}
                />
                <span>Convert timezone</span>
              </label>
              {selectedOptions.convert_timezone && (
                <div className="timezone-controls">
                  <label>Convert to:</label>
                  <select
                    value={selectedOptions.convert_timezone}
                    onChange={(e) => handleChange('convert_timezone', e.target.value)}
                    className="timezone-select"
                  >
                    <option value="UTC">UTC</option>
                    <option value="US/Eastern">US/Eastern</option>
                    <option value="US/Pacific">US/Pacific</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>
              )}
              <p className="help-text">
                Convert datetime to specified timezone
              </p>
            </div>
          </>
        )}
        
        {/* Drop Original */}
        {(selectedOptions.extract.length > 0 || isMLReady) && (
          <div className="option-group">
            <label className="checkbox-label">
              <Checkbox
                checked={selectedOptions.drop_original}
                onChange={(checked) => handleChange('drop_original', checked)}
                disabled={isMLReady}
              />
              <span>Drop original column after extraction</span>
              {isMLReady && <span style={{ marginLeft: '8px', color: '#1890ff', fontSize: '12px' }}>(Required in ML-Ready Mode)</span>}
            </label>
            <p className="help-text">
              {isMLReady ? 'In ML-Ready mode, original datetime columns must be dropped after extraction to ensure all columns are numeric.' : 'Remove the original datetime column after extracting features'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatetimePreprocessingOptions;
