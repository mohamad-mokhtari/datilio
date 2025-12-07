import React, { useState, useEffect } from 'react';
import { Select, Input, Checkbox } from '@/components/ui';
import { FileText, HelpCircle } from 'lucide-react';
import type { ColumnInfo, PreprocessingOptions } from '@/services/PreprocessingService';
import { isRequiredMissing } from './preprocessingCompatibility';

interface TextPreprocessingOptionsProps {
  column: ColumnInfo;
  options?: PreprocessingOptions | null;
  isMLReady?: boolean;
  onUpdate: (options: any) => void;
  onShowHelp?: () => void;
}

const TextPreprocessingOptions: React.FC<TextPreprocessingOptionsProps> = ({
  column,
  options: apiOptions,
  isMLReady = false,
  onUpdate,
  onShowHelp
}) => {
  const [selectedOptions, setSelectedOptions] = useState({
    lowercase: apiOptions?.text?.lowercase?.default || false,
    remove_stopwords: apiOptions?.text?.remove_stopwords?.default || false,
    stem_or_lemma: apiOptions?.text?.stem_or_lemma?.default || 'none',
    remove_punctuation: apiOptions?.text?.remove_punctuation?.default || false,
    remove_numbers: apiOptions?.text?.remove_numbers?.default || false,
    truncate_length: null as any,
    tokenize: apiOptions?.text?.tokenize?.default || false,
    // New ML/vectorization fields
    vectorization: isMLReady ? (apiOptions?.text?.vectorization?.default || 'tfidf') : (apiOptions?.text?.vectorization?.default || 'none'),
    max_features: null as number | null,
    drop_original: apiOptions?.text?.drop_original?.default ?? true,
  });

  // When ML-Ready mode is enabled, ensure vectorization is set and drop_original is true
  useEffect(() => {
    if (isMLReady) {
      if (!selectedOptions.vectorization || selectedOptions.vectorization === 'none') {
        setSelectedOptions(prev => ({ ...prev, vectorization: 'tfidf' }));
      }
      // Ensure drop_original is true in ML-Ready mode
      if (!selectedOptions.drop_original) {
        setSelectedOptions(prev => ({ ...prev, drop_original: true }));
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
  const getStemOrLemmaOptions = () => {
    if (apiOptions?.text?.stem_or_lemma?.options) {
      return apiOptions.text.stem_or_lemma.options.map(option => ({
        value: option,
        label: option === 'none' ? 'No stemming/lemmatization' :
               option === 'stem' ? 'Stemming' :
               option === 'lemma' ? 'Lemmatization' : option
      }));
    }
    return [
      { value: 'none', label: 'No stemming/lemmatization' },
      { value: 'stem', label: 'Stemming' },
      { value: 'lemma', label: 'Lemmatization' }
    ];
  };

  const getVectorizationOptions = () => {
    let options: any[] = [];
    if (apiOptions?.text?.vectorization?.options) {
      options = apiOptions.text.vectorization.options.map((opt: any) => ({
        value: opt.value ?? opt,
        label: opt.label ?? String(opt)
      }));
    } else {
      options = [
        { value: 'none', label: 'None (Keep as Text)' },
        { value: 'tfidf', label: 'TF-IDF (Recommended for ML)' },
        { value: 'count', label: 'Count Vectorizer' },
        { value: 'sentence_transformer', label: 'Sentence Embeddings' },
      ];
    }
    
    // In ML-Ready mode, filter out 'none' option
    if (isMLReady) {
      return options.filter(opt => opt.value !== 'none');
    }
    return options;
  };

  const handleTruncateChange = (enabled: boolean) => {
    if (enabled) {
      setSelectedOptions(prev => ({
        ...prev,
        truncate_length: 50
      }));
    } else {
      setSelectedOptions(prev => ({
        ...prev,
        truncate_length: null
      }));
    }
  };

  const handleTruncateValueChange = (value: number) => {
    setSelectedOptions(prev => ({
      ...prev,
      truncate_length: value
    }));
  };

  const showMaxFeatures = selectedOptions.vectorization === 'tfidf' || selectedOptions.vectorization === 'count';
  const maxFeaturesDisabled = isRequiredMissing('text', 'max_features', selectedOptions);

  return (
    <div className="preprocessing-section text">
      <div className="section-header">
        <span className="icon">📝</span>
        <h3>{column.name}</h3>
        <span className="badge text">Text</span>
        {onShowHelp && (
          <button
            onClick={onShowHelp}
            className="help-button"
            title="Get help for text preprocessing"
          >
            <HelpCircle size={18} />
          </button>
        )}
      </div>
      
      <div className="section-stats">
        {column.max_length !== undefined && (
          <div className="stat">
            <span className="stat-label">Max Length:</span>
            <span className="stat-value">{column.max_length} characters</span>
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
          <strong>ML-Ready Mode:</strong> Only vectorization options are shown. This column will be converted to numeric features.
        </div>
      )}
      
      <div className="options-grid">
        {!isMLReady && (
          <>
            {/* Lowercase */}
            <div className="option-group">
              <label className="checkbox-label">
                <Checkbox
                  checked={selectedOptions.lowercase}
                  onChange={(checked) => handleChange('lowercase', checked)}
                />
                <span>Convert to lowercase</span>
              </label>
              <p className="help-text">
                Converts all text to lowercase for consistency
              </p>
            </div>
            
            {/* Remove Stopwords */}
            <div className="option-group">
              <label className="checkbox-label">
                <Checkbox
                  checked={selectedOptions.remove_stopwords}
                  onChange={(checked) => handleChange('remove_stopwords', checked)}
                />
                <span>Remove stopwords</span>
              </label>
              <p className="help-text">
                Removes common words like "the", "is", "at", "which", "on"
              </p>
            </div>
            
            {/* Stemming/Lemmatization */}
            <div className="option-group">
              <label>Stemming/Lemmatization:</label>
              <select
                value={selectedOptions.stem_or_lemma}
                onChange={(e) => handleChange('stem_or_lemma', e.target.value)}
                className="option-select"
              >
                {getStemOrLemmaOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="help-text">
                {selectedOptions.stem_or_lemma === 'stem' && 'Reduces words to their root form (running → run)'}
                {selectedOptions.stem_or_lemma === 'lemma' && 'Reduces words to their dictionary form (better → good)'}
                {selectedOptions.stem_or_lemma === 'none' && 'Keep original word forms'}
              </p>
            </div>
            
            {/* Remove Punctuation */}
            <div className="option-group">
              <label className="checkbox-label">
                <Checkbox
                  checked={selectedOptions.remove_punctuation}
                  onChange={(checked) => handleChange('remove_punctuation', checked)}
                />
                <span>Remove punctuation</span>
              </label>
              <p className="help-text">
                Removes punctuation marks like .,!?;:()[]{}
              </p>
            </div>
            
            {/* Remove Numbers */}
            <div className="option-group">
              <label className="checkbox-label">
                <Checkbox
                  checked={selectedOptions.remove_numbers}
                  onChange={(checked) => handleChange('remove_numbers', checked)}
                />
                <span>Remove numbers</span>
              </label>
              <p className="help-text">
                Removes all numeric characters (0-9)
              </p>
            </div>
            
            {/* Truncate Length */}
            <div className="option-group">
              <label className="checkbox-label">
                <Checkbox
                  checked={selectedOptions.truncate_length !== null}
                  onChange={handleTruncateChange}
                />
                <span>Truncate to maximum length</span>
              </label>
              {selectedOptions.truncate_length && (
                <div className="truncate-controls">
                  <label>Maximum length:</label>
                  <Input
                    type="number"
                    min="10"
                    max="1000"
                    value={selectedOptions.truncate_length}
                    onChange={(e) => handleTruncateValueChange(parseInt(e.target.value) || 50)}
                    className="truncate-input"
                  />
                </div>
              )}
              <p className="help-text">
                Truncates text to specified character length
              </p>
            </div>
            
            {/* Tokenize */}
            <div className="option-group">
              <label className="checkbox-label">
                <Checkbox
                  checked={selectedOptions.tokenize}
                  onChange={(checked) => handleChange('tokenize', checked)}
                />
                <span>Tokenize text</span>
              </label>
              <p className="help-text">
                Splits text into individual words/tokens
              </p>
            </div>
          </>
        )}

        {/* Vectorization (ML) - Always shown, required in ML-Ready mode */}
        <div className="option-group" style={isMLReady ? { border: '2px solid #1890ff', padding: '12px', borderRadius: '6px', backgroundColor: '#e6f7ff' } : {}}>
          <label style={isMLReady ? { fontWeight: 600, color: '#1890ff' } : {}}>
            {isMLReady ? 'Vectorization (Required):' : 'Vectorization (Convert to Numbers for ML):'}
          </label>
          <select
            value={selectedOptions.vectorization}
            onChange={(e) => handleChange('vectorization', e.target.value)}
            className="option-select"
            required={isMLReady}
          >
            {getVectorizationOptions().map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="help-text">
            {isMLReady 
              ? 'REQUIRED: ML models require numeric input. Text must be vectorized to convert to numeric features.'
              : 'ML models require numeric input. Text must be vectorized.'
            }
          </p>
        </div>

        {/* Max Features (conditional) */}
        {showMaxFeatures && (
          <div className="option-group">
            <label>Max Features</label>
            <Input
              type="number"
              min="10"
              max="1000"
              value={selectedOptions.max_features ?? (apiOptions?.text?.max_features?.default ?? 100)}
              onChange={(e) => handleChange('max_features', parseInt(e.target.value) || (apiOptions?.text?.max_features?.default ?? 100))}
              className="truncate-input"
            />
            <p className="help-text">
              Limit number of features created (controls output columns)
            </p>
          </div>
        )}

        {/* Drop Original */}
        <div className="option-group">
          <label className="checkbox-label">
            <Checkbox
              checked={!!selectedOptions.drop_original}
              onChange={(checked) => handleChange('drop_original', checked)}
              disabled={isMLReady}
            />
            <span>Remove original text column after vectorization</span>
            {isMLReady && <span style={{ marginLeft: '8px', color: '#1890ff', fontSize: '12px' }}>(Required in ML-Ready Mode)</span>}
          </label>
          <p className="help-text">
            {isMLReady ? 'Original text columns must be removed to keep only numeric features for ML training.' : 'Recommended: Keep only numeric features for ML'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TextPreprocessingOptions;
