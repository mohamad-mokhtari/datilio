import React, { useState, useEffect } from 'react';
import { Select, Input, Checkbox } from '@/components/ui';
import { Tag } from 'lucide-react';

interface GlobalCategoricalOptionsProps {
  options?: any;
  isMLReady?: boolean;
  onUpdate: (options: any) => void;
}

const GlobalCategoricalOptions: React.FC<GlobalCategoricalOptionsProps> = ({ options: apiOptions, isMLReady = false, onUpdate }) => {
  const [selectedOptions, setSelectedOptions] = useState({
    missing: apiOptions?.categorical?.missing?.default || 'drop',
    encoding: apiOptions?.categorical?.encoding?.default || 'one_hot',
    merge_rare: null as any,
    top_n_categories: null as any
  });

  // In ML-Ready mode, ensure encoding is set and missing is not 'fill_unknown'
  useEffect(() => {
    if (isMLReady) {
      if (!selectedOptions.encoding) {
        setSelectedOptions(prev => ({ ...prev, encoding: 'one_hot' }));
      }
      if (selectedOptions.missing === 'fill_unknown') {
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

  const handleMergeRareChange = (enabled: boolean) => {
    if (enabled) {
      setSelectedOptions(prev => ({
        ...prev,
        merge_rare: { threshold: 0.05 }
      }));
    } else {
      setSelectedOptions(prev => ({
        ...prev,
        merge_rare: null
      }));
    }
  };

  const handleTopNChange = (enabled: boolean) => {
    if (enabled) {
      setSelectedOptions(prev => ({
        ...prev,
        top_n_categories: 10
      }));
    } else {
      setSelectedOptions(prev => ({
        ...prev,
        top_n_categories: null
      }));
    }
  };

  const handleThresholdChange = (threshold: number) => {
    setSelectedOptions(prev => ({
      ...prev,
      merge_rare: { threshold }
    }));
  };

  const handleTopNValueChange = (value: number) => {
    setSelectedOptions(prev => ({
      ...prev,
      top_n_categories: value
    }));
  };

  const getMissingOptions = () => {
    let options: any[] = [];
    if (apiOptions?.categorical?.missing?.options) {
      options = apiOptions.categorical.missing.options.map(option => ({
        value: option,
        label: option === 'drop' ? 'Drop rows with missing' :
               option === 'fill_unknown' ? 'Fill with "Unknown"' : option
      }));
    } else {
      options = [
        { value: 'drop', label: 'Drop rows with missing' },
        { value: 'fill_unknown', label: 'Fill with "Unknown"' }
      ];
    }
    
    // In ML-Ready mode, filter out 'fill_unknown' option (keeps text as text, not numeric)
    if (isMLReady) {
      return options.filter(opt => opt.value !== 'fill_unknown');
    }
    return options;
  };

  const getEncodingOptions = () => {
    if (apiOptions?.categorical?.encoding?.options) {
      return apiOptions.categorical.encoding.options.map(option => ({
        value: option,
        label: option === 'one_hot' ? 'One-Hot Encoding' :
               option === 'label_encode' ? 'Label Encoding' :
               option === 'frequency_encode' ? 'Frequency Encoding' : option
      }));
    }
    return [
      { value: 'one_hot', label: 'One-Hot Encoding' },
      { value: 'label_encode', label: 'Label Encoding' },
      { value: 'frequency_encode', label: 'Frequency Encoding' }
    ];
  };

  return (
    <div className="global-options-card categorical">
      <div className="card-header">
        <span className="icon">🏷️</span>
        <h3>All Categorical Columns</h3>
        <span className="badge categorical">Global Settings</span>
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
            Applies to all categorical columns in your dataset
            {isMLReady && ' "Fill with Unknown" is not available in ML-Ready mode as it keeps text values.'}
          </p>
        </div>
        
        {/* Encoding */}
        <div className="option-group">
          <label>Encoding Method:</label>
          <select
            value={selectedOptions.encoding}
            onChange={(e) => handleChange('encoding', e.target.value)}
            className="option-select"
          >
            {getEncodingOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="help-text">
            {selectedOptions.encoding === 'one_hot' && 'Creates binary columns for each category value'}
            {selectedOptions.encoding === 'label_encode' && 'Converts categories to integer labels (0, 1, 2, ...)'}
            {selectedOptions.encoding === 'frequency_encode' && 'Replaces categories with their frequency in the dataset'}
          </p>
        </div>
        
        {/* Merge Rare Categories */}
        <div className="option-group">
          <label className="checkbox-label">
            <Checkbox
              checked={selectedOptions.merge_rare !== null}
              onChange={handleMergeRareChange}
            />
            <span>Merge rare categories in ALL categorical columns</span>
          </label>
          {selectedOptions.merge_rare && (
            <div className="merge-rare-controls">
              <label>Threshold:</label>
              <div className="threshold-input">
                <Input
                  type="number"
                  min="0.001"
                  max="0.5"
                  step="0.001"
                  value={selectedOptions.merge_rare.threshold}
                  onChange={(e) => handleThresholdChange(parseFloat(e.target.value) || 0.05)}
                  className="threshold-field"
                />
                <span className="threshold-label">(5% = 0.05)</span>
              </div>
            </div>
          )}
          <p className="help-text">
            Categories with frequency below threshold will be merged into "Other"
          </p>
        </div>
        
        {/* Top N Categories */}
        <div className="option-group">
          <label className="checkbox-label">
            <Checkbox
              checked={selectedOptions.top_n_categories !== null}
              onChange={handleTopNChange}
            />
            <span>Keep only top N categories in ALL categorical columns</span>
          </label>
          {selectedOptions.top_n_categories && (
            <div className="top-n-controls">
              <label>Number of categories:</label>
              <Input
                type="number"
                min="1"
                max="50"
                value={selectedOptions.top_n_categories}
                onChange={(e) => handleTopNValueChange(parseInt(e.target.value) || 10)}
                className="top-n-input"
              />
            </div>
          )}
          <p className="help-text">
            Keep only the most frequent categories, others become "Other"
          </p>
        </div>
      </div>
    </div>
  );
};

export default GlobalCategoricalOptions;
