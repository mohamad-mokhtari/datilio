import React, { useState, useEffect } from 'react';
import { Select, Input, Checkbox } from '@/components/ui';
import { Hash, HelpCircle } from 'lucide-react';
import type { ColumnInfo, PreprocessingOptions } from '@/services/PreprocessingService';

interface NumericPreprocessingOptionsProps {
  column: ColumnInfo;
  options?: PreprocessingOptions | null;
  isMLReady?: boolean;
  onUpdate: (options: any) => void;
  onShowHelp?: () => void;
}

const NumericPreprocessingOptions: React.FC<NumericPreprocessingOptionsProps> = ({
  column,
  options: apiOptions,
  isMLReady = false,
  onUpdate,
  onShowHelp
}) => {
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
        label: option === 'fill_mean' ? `Fill with mean ${column.mean !== undefined ? `(${column.mean.toFixed(1)})` : ''}` :
               option === 'fill_median' ? `Fill with median ${column.median !== undefined ? `(${column.median})` : ''}` :
               option === 'fill_zero' ? 'Fill with zero' :
               option === 'drop' ? 'Drop rows with missing' : option
      }));
    }
    return [
      { value: 'drop', label: 'Drop rows with missing' },
      { value: 'fill_mean', label: `Fill with mean ${column.mean !== undefined ? `(${column.mean.toFixed(1)})` : ''}` },
      { value: 'fill_median', label: `Fill with median ${column.median !== undefined ? `(${column.median})` : ''}` },
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
    <div className="preprocessing-section numeric">
      <div className="section-header">
        <span className="icon">🔢</span>
        <h3>{column.name}</h3>
        <span className="badge numeric">Numeric</span>
        {onShowHelp && (
          <button
            onClick={onShowHelp}
            className="help-button"
            title="Get help for numeric preprocessing"
          >
            <HelpCircle size={18} />
          </button>
        )}
      </div>
      
      <div className="section-stats">
        <div className="stat">
          <span className="stat-label">Range:</span>
          <span className="stat-value">
            {column.min !== undefined && column.max !== undefined 
              ? `${column.min} - ${column.max}` 
              : 'N/A'
            }
          </span>
        </div>
        {column.mean !== undefined && (
          <div className="stat">
            <span className="stat-label">Mean:</span>
            <span className="stat-value">{column.mean.toFixed(2)}</span>
          </div>
        )}
        {column.missing_ratio !== undefined && (
          <div className="stat">
            <span className="stat-label">Missing:</span>
            <span className="stat-value">{(column.missing_ratio * 100).toFixed(1)}%</span>
          </div>
        )}
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
            How to handle missing values in this column
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
            {selectedOptions.scaling === 'min_max' && 'Scales values to range [0, 1]'}
            {selectedOptions.scaling === 'standardize' && 'Centers around 0 with unit variance'}
            {selectedOptions.scaling === 'normalize' && 'Scales to unit norm'}
            {selectedOptions.scaling === 'none' && 'Keep original values'}
          </p>
        </div>
        
        {/* Outliers */}
        <div className="option-group">
          <label className="checkbox-label">
            <Checkbox
              checked={selectedOptions.remove_outliers}
              onChange={(checked) => handleChange('remove_outliers', checked)}
            />
            <span>Remove outliers (IQR method)</span>
          </label>
          <p className="help-text">
            Removes values outside 1.5 × IQR from Q1 and Q3
          </p>
        </div>
        
        {/* Log Transform */}
        <div className="option-group">
          <label className="checkbox-label">
            <Checkbox
              checked={selectedOptions.log_transform}
              onChange={(checked) => handleChange('log_transform', checked)}
            />
            <span>Apply log transformation</span>
          </label>
          <p className="help-text">
            Applies log(1 + x) transformation (handles zeros)
          </p>
        </div>
        
        {/* Binning */}
        <div className="option-group">
          <label className="checkbox-label">
            <Checkbox
              checked={selectedOptions.binning !== null}
              onChange={handleBinningChange}
            />
            <span>Create bins</span>
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
            Converts continuous values to categorical bins
          </p>
        </div>
      </div>
    </div>
  );
};

export default NumericPreprocessingOptions;
