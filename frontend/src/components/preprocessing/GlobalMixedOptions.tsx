import React, { useState, useEffect } from 'react';
import { Select, Checkbox } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';

interface GlobalMixedOptionsProps {
  options?: any;
  isMLReady?: boolean;
  onUpdate: (options: any) => void;
}

const GlobalMixedOptions: React.FC<GlobalMixedOptionsProps> = ({ options: apiOptions, isMLReady = false, onUpdate }) => {
  const [selectedOptions, setSelectedOptions] = useState({
    convert_to: apiOptions?.mixed?.convert_to?.default || 'keep_as_string',
    fill_missing: apiOptions?.mixed?.fill_missing?.default || 'drop',
    drop: apiOptions?.mixed?.drop?.default || true
  });

  // In ML-Ready mode, ensure conversion to numeric is selected and drop is true (checked and disabled)
  useEffect(() => {
    if (isMLReady) {
      if (selectedOptions.convert_to !== 'numeric') {
        setSelectedOptions(prev => ({ ...prev, convert_to: 'numeric' }));
      }
      // In ML-Ready mode, drop must be checked (true) and disabled
      if (!selectedOptions.drop) {
        setSelectedOptions(prev => ({ ...prev, drop: true }));
      }
    }
  }, [isMLReady]);

  useEffect(() => {
    onUpdate(selectedOptions);
  }, [selectedOptions]); // Remove onUpdate from dependencies to prevent infinite loop

  const handleChange = (key: string, value: any) => {
    setSelectedOptions(prev => ({ ...prev, [key]: value }));
  };

  const getConvertToOptions = () => {
    let options: any[] = [];
    if (apiOptions?.mixed?.convert_to?.options) {
      options = apiOptions.mixed.convert_to.options.map(option => ({
        value: option,
        label: option === 'keep_as_string' ? 'Keep as string' :
               option === 'numeric' ? 'Convert to numeric' :
               option === 'datetime' ? 'Convert to datetime' :
               option === 'string' ? 'Convert to string' : option
      }));
    } else {
      options = [
        { value: 'keep_as_string', label: 'Keep as string' },
        { value: 'numeric', label: 'Convert to numeric' },
        { value: 'datetime', label: 'Convert to datetime' },
        { value: 'string', label: 'Convert to string' }
      ];
    }
    
    // In ML-Ready mode, only show numeric conversion
    if (isMLReady) {
      return options.filter(opt => opt.value === 'numeric');
    }
    return options;
  };

  const getFillMissingOptions = () => {
    if (apiOptions?.mixed?.fill_missing?.options) {
      return apiOptions.mixed.fill_missing.options.map(option => ({
        value: option,
        label: option === 'drop' ? 'Drop rows with missing' :
               option === 'fill_default' ? 'Fill with default' : option
      }));
    }
    return [
      { value: 'drop', label: 'Drop rows with missing' },
      { value: 'fill_default', label: 'Fill with default' }
    ];
  };

  return (
    <div className="global-options-card mixed">
      <div className="card-header">
        <span className="icon">⚠️</span>
        <h3>All Mixed/Dirty Data Columns</h3>
        <span className="badge mixed">Global Settings</span>
      </div>
      
      <div className="warning-box">
        <p>⚠️ Mixed data columns contain unclassified or dirty data</p>
        <p>This usually indicates data quality issues that need attention.</p>
        <p>Recommended: Drop these columns unless you have specific cleaning needs.</p>
      </div>
      
      {isMLReady && !selectedOptions.drop && (
        <div style={{ padding: '12px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', marginBottom: '16px' }}>
          <strong>ML-Ready Mode:</strong> Only numeric conversion is available. All mixed columns will be converted to numeric type.
        </div>
      )}
      
      <div className="options-grid">
        {/* Drop Column */}
        <div className="option-group">
          <label className="checkbox-label">
            <Checkbox
              checked={selectedOptions.drop}
              onChange={(checked) => handleChange('drop', checked)}
              disabled={isMLReady}
            />
            <span>Drop ALL mixed/dirty data columns (safest option)</span>
            {isMLReady && <span style={{ marginLeft: '8px', color: '#1890ff', fontSize: '12px' }}>(Required in ML-Ready Mode)</span>}
          </label>
          <p className="help-text">
            {isMLReady ? 'In ML-Ready mode, mixed/dirty data columns must be dropped as they cannot be reliably converted to numeric.' : 'Mixed data often causes issues in analysis and should be removed'}
          </p>
        </div>
        
        {!selectedOptions.drop && (
          <>
            {/* Convert To - Required to be numeric in ML-Ready mode */}
            <div className="option-group" style={isMLReady ? { border: '2px solid #1890ff', padding: '12px', borderRadius: '6px', backgroundColor: '#e6f7ff' } : {}}>
              <label style={isMLReady ? { fontWeight: 600, color: '#1890ff' } : {}}>
                {isMLReady ? 'Convert to (Required):' : 'Try to convert ALL mixed columns to:'}
              </label>
              <select
                value={selectedOptions.convert_to}
                onChange={(e) => handleChange('convert_to', e.target.value)}
                className="option-select"
                disabled={isMLReady}
              >
                {getConvertToOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="help-text">
                {selectedOptions.convert_to === 'numeric' && 'Attempts to convert to numbers, failed conversions become NaN'}
                {selectedOptions.convert_to === 'keep_as_string' && 'No conversion applied to mixed columns'}
                {selectedOptions.convert_to === 'datetime' && 'Attempts to parse as datetime, invalid values become NaN'}
                {selectedOptions.convert_to === 'string' && 'Converts all values to string format'}
                {isMLReady && ' Only numeric conversion is allowed in ML-Ready mode.'}
              </p>
            </div>
            
            {!isMLReady && (
              <>
                {/* Fill Missing */}
                <div className="option-group">
                  <label>Handle failed conversions:</label>
                  <select
                    value={selectedOptions.fill_missing}
                    onChange={(e) => handleChange('fill_missing', e.target.value)}
                    className="option-select"
                  >
                    {getFillMissingOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="help-text">
                    {selectedOptions.fill_missing === 'drop' && 'Removes rows where conversion failed'}
                    {selectedOptions.fill_missing === 'fill_default' && 'Replaces failed conversions with default values'}
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GlobalMixedOptions;
