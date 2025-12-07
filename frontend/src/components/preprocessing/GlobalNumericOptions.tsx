import React, { useState, useEffect } from 'react';
import { Select, Input, Checkbox } from '@/components/ui';
import { Hash } from 'lucide-react';
import type { PreprocessingOptions } from '@/services/PreprocessingService';

interface GlobalNumericOptionsProps {
  options?: PreprocessingOptions | null;
  isMLReady?: boolean;
  onUpdate: (options: any) => void;
}

const GlobalNumericOptions: React.FC<GlobalNumericOptionsProps> = ({ options: apiOptions, isMLReady = false, onUpdate }) => {
  const [selectedOptions, setSelectedOptions] = useState({
    missing: apiOptions?.numeric?.missing?.default || 'drop',
    scaling: isMLReady ? (apiOptions?.numeric?.scaling?.default || 'standardize') : (apiOptions?.numeric?.scaling?.default || 'none'),
    remove_outliers: apiOptions?.numeric?.remove_outliers?.default || false,
    log_transform: apiOptions?.numeric?.log_transform?.default || false,
    binning: null as any
  });

  // In ML-Ready mode, ensure scaling is set to 'standardize' (default for ML models)
  useEffect(() => {
    if (isMLReady && selectedOptions.scaling === 'none') {
      setSelectedOptions(prev => ({ ...prev, scaling: 'standardize' }));
    }
  }, [isMLReady]);

  useEffect(() => {
    onUpdate(selectedOptions);
  }, [selectedOptions]); // Remove onUpdate from dependencies to prevent infinite loop

  const handleChange = (key: string, value: any) => {
    setSelectedOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleBinningChange = (enabled: boolean) => {
    if (enabled) {
      setSelectedOptions(prev => ({
        ...prev,
        binning: { bins: 5 }
      }));
    } else {
      setSelectedOptions(prev => ({
        ...prev,
        binning: null
      }));
    }
  };

  const handleBinsChange = (bins: number) => {
    setSelectedOptions(prev => ({
      ...prev,
      binning: { bins }
    }));
  };

  // Get options from API or use defaults
  const getMissingOptions = () => {
    if (apiOptions?.numeric?.missing?.options) {
      return apiOptions.numeric.missing.options.map(option => ({
        value: option,
        label: option === 'fill_mean' ? 'Fill with mean' :
               option === 'fill_median' ? 'Fill with median' :
               option === 'fill_zero' ? 'Fill with zero' :
               option === 'drop' ? 'Drop rows with missing' : option
      }));
    }
    return [
      { value: 'drop', label: 'Drop rows with missing' },
      { value: 'fill_mean', label: 'Fill with mean' },
      { value: 'fill_median', label: 'Fill with median' },
      { value: 'fill_zero', label: 'Fill with zero' }
    ];
  };

  const getScalingOptions = () => {
    if (apiOptions?.numeric?.scaling?.options) {
      return apiOptions.numeric.scaling.options.map(option => ({
        value: option,
        label: option === 'min_max' ? 'Min-Max (0 to 1)' :
               option === 'standardize' ? 'Standardize (Z-score)' :
               option === 'normalize' ? 'Normalize (L2 norm)' :
               option === 'none' ? 'No scaling' : option
      }));
    }
    return [
      { value: 'none', label: 'No scaling' },
      { value: 'min_max', label: 'Min-Max (0 to 1)' },
      { value: 'standardize', label: 'Standardize (Z-score)' },
      { value: 'normalize', label: 'Normalize (L2 norm)' }
    ];
  };

  return (
    <div className="global-options-card numeric">
      <div className="card-header">
        <span className="icon">🔢</span>
        <h3>All Numeric Columns</h3>
        <span className="badge numeric">Global Settings</span>
      </div>
      
      <div className="options-grid">
        {/* Missing Values */}
        <div className="option-group">
          <label>Missing Valudes:</label>
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
            Applies to all numeric columns in your dataset
          </p>
        </div>
        
        {/* Scaling */}
        <div className="option-group">
          <label>Scaling:</label>
          <select
            value={selectedOptions.scaling}
            onChange={(e) => handleChange('scaling', e.target.value)}
            className="option-select"
          >
            {getScalingOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="help-text">
            {selectedOptions.scaling === 'min_max' && 'Scales all numeric columns to range [0, 1]'}
            {selectedOptions.scaling === 'standardize' && 'Centers all numeric columns around 0 with unit variance'}
            {selectedOptions.scaling === 'normalize' && 'Scales all numeric columns to unit norm'}
            {selectedOptions.scaling === 'none' && 'Keep original values for all numeric columns'}
          </p>
        </div>
        
        {/* Outliers */}
        <div className="option-group">
          <label className="checkbox-label">
            <Checkbox
              checked={selectedOptions.remove_outliers}
              onChange={(checked) => handleChange('remove_outliers', checked)}
            />
            <span>Remove outliers from ALL numeric columns</span>
          </label>
          <p className="help-text">
            Removes outliers using IQR method from all numeric columns
          </p>
        </div>
        
        {/* Log Transform */}
        <div className="option-group">
          <label className="checkbox-label">
            <Checkbox
              checked={selectedOptions.log_transform}
              onChange={(checked) => handleChange('log_transform', checked)}
            />
            <span>Apply log transformation to ALL numeric columns</span>
          </label>
          <p className="help-text">
            Applies log(1 + x) transformation to all numeric columns
          </p>
        </div>
        
        {/* Binning */}
        <div className="option-group">
          <label className="checkbox-label">
            <Checkbox
              checked={selectedOptions.binning !== null}
              onChange={handleBinningChange}
            />
            <span>Create bins for ALL numeric columns</span>
          </label>
          {selectedOptions.binning && (
            <div className="binning-controls">
              <label>Number of bins:</label>
              <Input
                type="number"
                min="2"
                max="20"
                value={selectedOptions.binning.bins}
                onChange={(e) => handleBinsChange(parseInt(e.target.value) || 5)}
                className="bins-input"
              />
            </div>
          )}
          <p className="help-text">
            Converts all numeric columns to categorical bins
          </p>
        </div>
      </div>
    </div>
  );
};

export default GlobalNumericOptions;
