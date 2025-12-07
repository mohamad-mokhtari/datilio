import React, { useState, useEffect } from 'react';
import { Select } from '@/components/ui';
import { CheckSquare } from 'lucide-react';
import type { ColumnInfo, PreprocessingOptions } from '@/services/PreprocessingService';

interface BooleanPreprocessingOptionsProps {
  column: ColumnInfo;
  options?: PreprocessingOptions | null;
  isMLReady?: boolean;
  onUpdate: (options: any) => void;
}

const BooleanPreprocessingOptions: React.FC<BooleanPreprocessingOptionsProps> = ({
  column,
  options: apiOptions,
  isMLReady = false,
  onUpdate
}) => {
  const [selectedOptions, setSelectedOptions] = useState({
    missing: apiOptions?.boolean?.missing?.default || 'drop',
    encode: isMLReady ? '0_1' : (apiOptions?.boolean?.encode?.default || 'keep_boolean')
  });

  // In ML-Ready mode, ensure encode is set to 0_1 and missing is not fill_true/fill_false
  useEffect(() => {
    if (isMLReady) {
      if (selectedOptions.encode !== '0_1') {
        setSelectedOptions(prev => ({ ...prev, encode: '0_1' }));
      }
      // In ML-Ready mode, fill_true and fill_false are not allowed (keep boolean values)
      if (selectedOptions.missing === 'fill_true' || selectedOptions.missing === 'fill_false') {
        setSelectedOptions(prev => ({ ...prev, missing: 'drop' }));
      }
    }
  }, [isMLReady]);

  useEffect(() => {
    onUpdate(selectedOptions);
  }, [selectedOptions]); // Remove onUpdate from dependencies to prevent infinite loop

  const handleChange = (key: string, value: any) => {
    setSelectedOptions(prev => ({ ...prev, [key]: value }));
  };

  // Get options from API or use defaults
  const getMissingOptions = () => {
    let options: any[] = [];
    if (apiOptions?.boolean?.missing?.options) {
      options = apiOptions.boolean.missing.options.map(option => ({
        value: option,
        label: option === 'drop' ? 'Drop rows with missing' :
               option === 'fill_true' ? 'Fill with true' :
               option === 'fill_false' ? 'Fill with false' : option
      }));
    } else {
      options = [
        { value: 'drop', label: 'Drop rows with missing' },
        { value: 'fill_true', label: 'Fill with true' },
        { value: 'fill_false', label: 'Fill with false' }
      ];
    }
    
    // In ML-Ready mode, filter out 'fill_true' and 'fill_false' (keep boolean values, not numeric)
    if (isMLReady) {
      return options.filter(opt => opt.value !== 'fill_true' && opt.value !== 'fill_false');
    }
    return options;
  };

  const getEncodeOptions = () => {
    let options: any[] = [];
    if (apiOptions?.boolean?.encode?.options) {
      options = apiOptions.boolean.encode.options.map(option => ({
        value: option,
        label: option === 'keep_boolean' ? 'Keep as boolean' :
               option === '0_1' ? 'Convert to 0/1' : option
      }));
    } else {
      options = [
        { value: 'keep_boolean', label: 'Keep as boolean' },
        { value: '0_1', label: 'Convert to 0/1' }
      ];
    }
    
    // In ML-Ready mode, filter out 'keep_boolean' option
    if (isMLReady) {
      return options.filter(opt => opt.value !== 'keep_boolean');
    }
    return options;
  };

  return (
    <div className="preprocessing-section boolean">
      <div className="section-header">
        <span className="icon">✓</span>
        <h3>{column.name}</h3>
        <span className="badge boolean">Boolean</span>
      </div>
      
      <div className="section-stats">
        {column.num_true !== undefined && (
          <div className="stat">
            <span className="stat-label">True Values:</span>
            <span className="stat-value">{column.num_true}</span>
          </div>
        )}
        {column.num_false !== undefined && (
          <div className="stat">
            <span className="stat-label">False Values:</span>
            <span className="stat-value">{column.num_false}</span>
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
          <strong>ML-Ready Mode:</strong> Boolean columns must be converted to 0/1 for ML training.
        </div>
      )}
      
      <div className="options-grid">
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
            How to handle missing boolean values
            {isMLReady && ' "Fill with True" and "Fill with False" are not available in ML-Ready mode as they keep boolean values.'}
          </p>
        </div>
        
        {/* Encoding - Required in ML-Ready mode */}
        <div className="option-group" style={isMLReady ? { border: '2px solid #1890ff', padding: '12px', borderRadius: '6px', backgroundColor: '#e6f7ff' } : {}}>
          <label style={isMLReady ? { fontWeight: 600, color: '#1890ff' } : {}}>
            {isMLReady ? 'Encoding (Required):' : 'Encoding:'}
          </label>
          <select
            value={selectedOptions.encode}
            onChange={(e) => handleChange('encode', e.target.value)}
            className="option-select"
            required={isMLReady}
          >
            {getEncodeOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="help-text">
            {selectedOptions.encode === 'keep_boolean' && 'Maintains True/False values'}
            {selectedOptions.encode === '0_1' && 'Converts True to 1, False to 0 - numeric'}
            {isMLReady && ' REQUIRED: Must convert to 0/1 for ML training.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BooleanPreprocessingOptions;
