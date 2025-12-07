import React, { useState, useEffect } from 'react';
import { Select, Checkbox } from '@/components/ui';
import { Calendar } from 'lucide-react';

interface GlobalDatetimeOptionsProps {
  options?: any;
  isMLReady?: boolean;
  onUpdate: (options: any) => void;
}

const GlobalDatetimeOptions: React.FC<GlobalDatetimeOptionsProps> = ({ options: apiOptions, isMLReady = false, onUpdate }) => {
  const [selectedOptions, setSelectedOptions] = useState({
    missing: apiOptions?.datetime?.missing?.default || 'drop',
    extract: [] as string[],
    round: null as any,
    convert_timezone: null as any,
    drop_original: apiOptions?.datetime?.drop_original?.default || (isMLReady ? true : false)
  });

  // In ML-Ready mode, ensure drop_original is true (required and disabled) and select first extraction option
  useEffect(() => {
    if (isMLReady) {
      setSelectedOptions(prev => {
        let updated = { ...prev };
        
        // Ensure drop_original is true
        if (!prev.drop_original) {
          updated.drop_original = true;
        }
        
        // If no extraction options are selected, select the first one (year for datetime/date)
        if (prev.extract.length === 0) {
          updated.extract = ['year'];
        }
        
        return updated;
      });
    }
  }, [isMLReady]);

  // In ML-Ready mode, if extract becomes empty, automatically select the first option (year)
  useEffect(() => {
    if (isMLReady && selectedOptions.extract.length === 0) {
      setSelectedOptions(prev => ({ ...prev, extract: ['year'] }));
    }
  }, [isMLReady, selectedOptions.extract.length]);

  useEffect(() => {
    onUpdate(selectedOptions);
  }, [selectedOptions]); // Remove onUpdate from dependencies to prevent infinite loop

  const handleChange = (key: string, value: any) => {
    setSelectedOptions(prev => ({ ...prev, [key]: value }));
  };

  const toggleExtract = (feature: string) => {
    const newExtract = selectedOptions.extract.includes(feature)
      ? selectedOptions.extract.filter(f => f !== feature)
      : [...selectedOptions.extract, feature];
    handleChange('extract', newExtract);
  };

  const handleRoundChange = (enabled: boolean) => {
    if (enabled) {
      setSelectedOptions(prev => ({
        ...prev,
        round: 'day'
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
        convert_timezone: 'UTC'
      }));
    } else {
      setSelectedOptions(prev => ({
        ...prev,
        convert_timezone: null
      }));
    }
  };

  const extractOptions = [
    { value: 'year', label: 'Year' },
    { value: 'month', label: 'Month' },
    { value: 'day', label: 'Day' },
    { value: 'hour', label: 'Hour' },
    { value: 'minute', label: 'Minute' },
    { value: 'second', label: 'Second' },
    { value: 'weekday', label: 'Weekday' }
  ];

  const roundOptions = [
    { value: 'day', label: 'Day' },
    { value: 'hour', label: 'Hour' },
    { value: 'minute', label: 'Minute' }
  ];

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'US/Eastern', label: 'US/Eastern' },
    { value: 'US/Pacific', label: 'US/Pacific' },
    { value: 'Europe/London', label: 'Europe/London' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo' }
  ];

  const getMissingOptions = () => {
    if (apiOptions?.datetime?.missing?.options) {
      return apiOptions.datetime.missing.options.map(option => ({
        value: option,
        label: option === 'drop' ? 'Drop rows with missing' :
               option === 'fill_earliest' ? 'Fill with earliest date' :
               option === 'fill_latest' ? 'Fill with latest date' :
               option === 'fill_default' ? 'Fill with default (1970-01-01)' : option
      }));
    }
    return [
      { value: 'drop', label: 'Drop rows with missing' },
      { value: 'fill_earliest', label: 'Fill with earliest date' },
      { value: 'fill_latest', label: 'Fill with latest date' },
      { value: 'fill_default', label: 'Fill with default (1970-01-01)' }
    ];
  };

  const getRoundOptions = () => {
    if (apiOptions?.datetime?.round?.options) {
      return apiOptions.datetime.round.options.map(option => ({
        value: option,
        label: option === 'day' ? 'Day' :
               option === 'hour' ? 'Hour' :
               option === 'minute' ? 'Minute' : option
      }));
    }
    return roundOptions;
  };

  return (
    <div className="global-options-card datetime">
      <div className="card-header">
        <span className="icon">📅</span>
        <h3>All Datetime Columns</h3>
        <span className="badge datetime">Global Settings</span>
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
                Applies to all datetime columns in your dataset
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
                  onChange={() => toggleExtract(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <p className="help-text">
            {isMLReady && 'At least one feature must be extracted to convert datetime to numeric columns.'}
            {!isMLReady && 'Extract specific components from all datetime values'}
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
                    value={selectedOptions.round}
                    onChange={(e) => handleChange('round', e.target.value)}
                    className="round-select"
                  >
                    {getRoundOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p className="help-text">
                Round all datetime columns to specified precision
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
                    {timezoneOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p className="help-text">
                Convert all datetime columns to specified timezone
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
              <span>Drop original columns after extraction</span>
              {isMLReady && <span style={{ marginLeft: '8px', color: '#1890ff', fontSize: '12px' }}>(Required in ML-Ready Mode)</span>}
            </label>
            <p className="help-text">
              {isMLReady ? 'In ML-Ready mode, original datetime columns must be dropped after extraction to ensure all columns are numeric.' : 'Remove the original datetime columns after extracting features'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalDatetimeOptions;
