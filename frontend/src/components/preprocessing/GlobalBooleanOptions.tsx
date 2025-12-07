import React, { useState, useEffect } from 'react';
import { Select } from '@/components/ui';
import { CheckSquare } from 'lucide-react';

interface GlobalBooleanOptionsProps {
  options?: any;
  isMLReady?: boolean;
  onUpdate: (options: any) => void;
}

const GlobalBooleanOptions: React.FC<GlobalBooleanOptionsProps> = ({ options: apiOptions, isMLReady = false, onUpdate }) => {
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

  const getMissingOptions = () => {
    let options: any[] = [];
    if (apiOptions?.boolean?.missing?.options) {
      options = apiOptions.boolean.missing.options.map(option => ({
        value: option,
        label: option === 'drop' ? 'Drop rows with missing' :
               option === 'fill_true' ? 'Fill with True' :
               option === 'fill_false' ? 'Fill with False' : option
      }));
    } else {
      options = [
        { value: 'drop', label: 'Drop rows with missing' },
        { value: 'fill_true', label: 'Fill with True' },
        { value: 'fill_false', label: 'Fill with False' }
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
        label: option === 'keep_boolean' ? 'Keep as True/False' :
               option === '0_1' ? 'Convert to 0/1' : option
      }));
    } else {
      options = [
        { value: 'keep_boolean', label: 'Keep as True/False' },
        { value: '0_1', label: 'Convert to 0/1' }
      ];
    }
    
    if (isMLReady) {
      return options.filter(opt => opt.value !== 'keep_boolean');
    }
    return options;
  };

  return (
    <div className="global-options-card boolean">
      <div className="card-header">
        <span className="icon">✓</span>
        <h3>All Boolean Columns</h3>
        <span className="badge boolean">Global Settings</span>
      </div>
      
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
            Applies to all boolean columns in your dataset
            {isMLReady && ' "Fill with True" and "Fill with False" are not available in ML-Ready mode as they keep boolean values.'}
          </p>
        </div>
        
        {/* Encoding */}
        <div className="option-group">
          <label>Encoding:</label>
          <select
            value={selectedOptions.encode}
            onChange={(e) => handleChange('encode', e.target.value)}
            className="option-select"
          >
            {getEncodeOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="help-text">
            {selectedOptions.encode === 'keep_boolean' && 'Maintains True/False values for all boolean columns'}
            {selectedOptions.encode === '0_1' && 'Converts True to 1, False to 0 for all boolean columns'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GlobalBooleanOptions;
