import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui';
import { Key } from 'lucide-react';
import type { ColumnInfo } from '@/services/PreprocessingService';

interface IdentifierPreprocessingOptionsProps {
  column: ColumnInfo;
  isMLReady?: boolean;
  onUpdate: (options: any) => void;
}

const IdentifierPreprocessingOptions: React.FC<IdentifierPreprocessingOptionsProps> = ({
  column,
  isMLReady = false,
  onUpdate
}) => {
  const [options, setOptions] = useState({
    drop: false,
    hash_encode: false
  });

  // In ML-Ready mode, ensure drop is true (checked and disabled) and hash_encode is false (hidden)
  useEffect(() => {
    if (isMLReady) {
      // In ML-Ready mode, drop must be checked (true) and disabled
      if (!options.drop) {
        setOptions(prev => ({ ...prev, drop: true }));
      }
      // Hash encode is not available in ML-Ready mode
      if (options.hash_encode) {
        setOptions(prev => ({ ...prev, hash_encode: false }));
      }
    }
  }, [isMLReady]);

  useEffect(() => {
    onUpdate(options);
  }, [options]); // Remove onUpdate from dependencies to prevent infinite loop

  const handleChange = (key: string, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="preprocessing-section identifier">
      <div className="section-header">
        <span className="icon">🔑</span>
        <h3>{column.name}</h3>
        <span className="badge identifier">ID / Unique Identifier</span>
      </div>
      
      <div className="section-stats">
        <div className="stat">
          <span className="stat-label">Unique Values:</span>
          <span className="stat-value">{column.num_unique_values || 'N/A'}</span>
        </div>
        {column.missing_ratio !== undefined && (
          <div className="stat">
            <span className="stat-label">Missing:</span>
            <span className="stat-value">{(column.missing_ratio * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div className="warning-box">
        <p>⚠️ This column contains unique identifiers (IDs, emails, etc.)</p>
        <p>These are typically not useful for machine learning models and should be dropped.</p>
      </div>
      
      <div className="options-grid">
        {/* Drop Column */}
        <div className="option-group">
          <label className="checkbox-label">
            <Checkbox
              checked={options.drop}
              onChange={(checked) => handleChange('drop', checked)}
              disabled={isMLReady}
            />
            <span>Drop this column (recommended for ML models)</span>
            {isMLReady && <span style={{ marginLeft: '8px', color: '#1890ff', fontSize: '12px' }}>(Required in ML-Ready Mode)</span>}
          </label>
          <p className="help-text">
            {isMLReady ? 'In ML-Ready mode, ID/identifier columns must be dropped as they cannot be converted to numeric.' : 'Unique identifiers usually don\'t provide predictive value and should be removed'}
          </p>
        </div>
        
        {/* Hash Encode - Hidden in ML-Ready mode */}
        {!isMLReady && (
          <div className="option-group">
            <label className="checkbox-label">
              <Checkbox
                checked={options.hash_encode}
                onChange={(checked) => handleChange('hash_encode', checked)}
                disabled={options.drop}
              />
              <span>Hash encode for privacy</span>
            </label>
            <p className="help-text">
              {options.drop 
                ? 'Cannot hash encode when column is dropped'
                : 'Converts identifiers to hashed values for privacy protection'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdentifierPreprocessingOptions;
