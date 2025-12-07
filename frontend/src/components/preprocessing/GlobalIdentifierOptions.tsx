import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui';
import { Key } from 'lucide-react';

interface GlobalIdentifierOptionsProps {
  options?: any;
  isMLReady?: boolean;
  onUpdate: (options: any) => void;
}

const GlobalIdentifierOptions: React.FC<GlobalIdentifierOptionsProps> = ({ options: apiOptions, isMLReady = false, onUpdate }) => {
  const [selectedOptions, setSelectedOptions] = useState({
    drop: apiOptions?.identifier?.drop?.default || true,
    hash_encode: apiOptions?.identifier?.hash_encode?.default || false
  });

  // In ML-Ready mode, ensure drop is true (checked and disabled) and hash_encode is false (hidden)
  useEffect(() => {
    if (isMLReady) {
      // In ML-Ready mode, drop must be checked (true) and disabled
      if (!selectedOptions.drop) {
        setSelectedOptions(prev => ({ ...prev, drop: true }));
      }
      // Hash encode is not available in ML-Ready mode
      if (selectedOptions.hash_encode) {
        setSelectedOptions(prev => ({ ...prev, hash_encode: false }));
      }
    }
  }, [isMLReady]);

  useEffect(() => {
    onUpdate(selectedOptions);
  }, [selectedOptions]); // Remove onUpdate from dependencies to prevent infinite loop

  const handleChange = (key: string, value: any) => {
    setSelectedOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="global-options-card identifier">
      <div className="card-header">
        <span className="icon">🔑</span>
        <h3>All ID/Identifier Columns</h3>
        <span className="badge identifier">Global Settings</span>
      </div>
      
      <div className="warning-box">
        <p>⚠️ ID columns contain unique identifiers (IDs, emails, etc.)</p>
        <p>These are typically not useful for machine learning models and should be dropped.</p>
      </div>
      
      <div className="options-grid">
        {/* Drop Column */}
        <div className="option-group">
          <label className="checkbox-label">
            <Checkbox
              checked={selectedOptions.drop}
              onChange={(checked) => handleChange('drop', checked)}
              disabled={isMLReady}
            />
            <span>Drop ALL ID/identifier columns (recommended for ML models)</span>
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
                checked={selectedOptions.hash_encode}
                onChange={(checked) => handleChange('hash_encode', checked)}
                disabled={selectedOptions.drop}
              />
              <span>Hash encode ALL ID/identifier columns for privacy</span>
            </label>
            <p className="help-text">
              {selectedOptions.drop 
                ? 'Cannot hash encode when columns are dropped'
                : 'Converts all identifiers to hashed values for privacy protection'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalIdentifierOptions;
