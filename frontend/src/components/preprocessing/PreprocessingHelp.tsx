import React, { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { HelpCircle, Book, CheckCircle, XCircle, Zap, Info, Lightbulb, AlertTriangle, ChevronRight, ChevronDown } from 'lucide-react';
import './PreprocessingHelp.css';

interface PreprocessingHelpProps {
  isOpen: boolean;
  onClose: () => void;
  columnType?: string;
}

const PreprocessingHelp: React.FC<PreprocessingHelpProps> = ({ isOpen, onClose, columnType }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'compatibility' | 'tips' | 'ml-ready'>('overview');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const helpContent = {
    numeric: {
      title: 'Numeric Data Preprocessing',
      description: 'Numbers like age, salary, temperature',
      features: [
        {
          name: 'Missing Values',
          description: 'Handle empty cells',
          options: [
            { value: 'drop', label: 'Drop rows', tip: 'Remove rows with missing values' },
            { value: 'fill_mean', label: 'Fill with average', tip: 'Use mean value' },
            { value: 'fill_median', label: 'Fill with median', tip: 'Use middle value' },
            { value: 'fill_zero', label: 'Fill with 0', tip: 'Use zero' }
          ],
          applied: 'FIRST (before other operations)',
          canCombine: ['scaling', 'remove_outliers', 'log_transform', 'binning']
        },
        {
          name: 'Remove Outliers',
          description: 'Remove extreme values using statistics',
          tip: 'Useful for salary, price data with unusual spikes',
          applied: 'AFTER missing, BEFORE scaling',
          canCombine: ['missing', 'scaling', 'log_transform', 'binning']
        },
        {
          name: 'Log Transform',
          description: 'Compress large numbers (good for salaries, populations)',
          tip: 'Makes wide ranges more manageable',
          applied: 'AFTER outliers, BEFORE scaling',
          canCombine: ['missing', 'remove_outliers', 'scaling', 'binning']
        },
        {
          name: 'Scaling',
          description: 'Change number range for ML',
          options: [
            { value: 'none', label: 'No scaling' },
            { value: 'normalize', label: 'Normalize (0-1 range)', tip: 'Best for neural networks' },
            { value: 'standardize', label: 'Standardize (mean=0, std=1)', tip: 'Best for most ML algorithms' }
          ],
          applied: 'AFTER log_transform, BEFORE binning',
          canCombine: ['missing', 'remove_outliers', 'log_transform', 'binning']
        },
        {
          name: 'Binning',
          description: 'Group numbers into categories (like age groups)',
          tip: 'Creates a NEW column, original is kept',
          applied: 'LAST (creates new column)',
          canCombine: ['ALL other operations']
        }
      ],
      mlReady: 'Apply scaling (standardize or normalize) for ML-ready data',
      example: {
        title: 'Recommended for ML:',
        config: {
          missing: 'fill_mean',
          remove_outliers: true,
          scaling: 'standardize'
        }
      }
    },
    categorical: {
      title: 'Categorical Data Preprocessing',
      description: 'Categories like country, gender, product_type',
      features: [
        {
          name: 'Missing Values',
          description: 'Handle empty cells',
          options: [
            { value: 'drop', label: 'Drop rows' },
            { value: 'fill_unknown', label: 'Fill with "Unknown"' }
          ],
          applied: 'FIRST',
          canCombine: ['encoding', 'merge_rare', 'top_n_categories']
        },
        {
          name: 'Merge Rare',
          description: 'Combine uncommon categories into "Other"',
          tip: 'Use when you have TOO MANY categories',
          applied: 'AFTER missing, BEFORE encoding',
          canCombine: ['missing', 'encoding'],
          conflicts: ['top_n_categories']
        },
        {
          name: 'Top N Categories',
          description: 'Keep only most common categories, rest → "Other"',
          tip: 'Use when you want to limit category count',
          applied: 'AFTER missing, BEFORE encoding',
          canCombine: ['missing', 'encoding'],
          conflicts: ['merge_rare']
        },
        {
          name: 'Encoding',
          description: 'Convert text categories to numbers (REQUIRED for ML!)',
          options: [
            { value: 'one_hot', label: 'One-Hot (RECOMMENDED)', tip: 'Creates binary columns for each category' },
            { value: 'label_encode', label: 'Label Encode', tip: 'Use when you have 50+ categories' },
            { value: 'frequency_encode', label: 'Frequency Encode', tip: 'Use category frequency as number' }
          ],
          applied: 'LAST',
          canCombine: ['missing', 'merge_rare OR top_n_categories'],
          conflicts: ['Multiple encodings - choose ONE!']
        }
      ],
      mlReady: 'MUST use encoding (one_hot recommended) for ML-ready data',
      example: {
        title: 'Recommended for ML:',
        config: {
          missing: 'fill_unknown',
          merge_rare: { threshold: 0.05 },
          encoding: 'one_hot'
        }
      }
    },
    text: {
      title: 'Text Data Preprocessing',
      description: 'Words and sentences like descriptions, reviews, comments',
      features: [
        {
          name: 'Cleaning Features',
          description: 'ALL cleaning features work together!',
          options: [
            { value: 'lowercase', label: 'Lowercase', tip: 'Convert to lowercase' },
            { value: 'remove_punctuation', label: 'Remove Punctuation', tip: 'Remove symbols' },
            { value: 'remove_numbers', label: 'Remove Numbers', tip: 'Remove digits' },
            { value: 'remove_stopwords', label: 'Remove Stopwords', tip: 'Remove common words (the, is, a, etc.)' },
            { value: 'truncate_length', label: 'Truncate Length', tip: 'Cut long text to specified length' }
          ],
          applied: 'FIRST (in order: lowercase → punctuation → numbers → stopwords → truncate)',
          canCombine: ['ALL cleaning features together']
        },
        {
          name: 'Stem or Lemma',
          description: 'Simplify words to root form',
          options: [
            { value: 'none', label: 'None' },
            { value: 'stem', label: 'Stemming', tip: 'Fast but rough (running → run)' },
            { value: 'lemma', label: 'Lemmatization (RECOMMENDED)', tip: 'Slow but accurate (better → good)' }
          ],
          applied: 'AFTER cleaning, BEFORE vectorization',
          canCombine: ['ALL cleaning features', 'vectorization'],
          conflicts: ['Can\'t use both stem AND lemma - choose ONE']
        },
        {
          name: 'Vectorization',
          description: 'Convert text to numbers (REQUIRED for ML!)',
          options: [
            { value: 'none', label: 'Keep as Text', tip: 'NOT ML-ready' },
            { value: 'tfidf', label: 'TF-IDF (RECOMMENDED)', tip: 'Best for most text ML tasks' },
            { value: 'count', label: 'Count Vectorization', tip: 'Simple word frequency' },
            { value: 'sentence_transformer', label: 'Sentence Transformer', tip: 'AI embeddings (384-768 features)' }
          ],
          applied: 'LAST (after all cleaning)',
          canCombine: ['ALL cleaning', 'stem_or_lemma'],
          conflicts: ['Can\'t use multiple vectorization methods - choose ONE!']
        },
        {
          name: 'Max Features',
          description: 'How many numeric columns to create (for TF-IDF and Count)',
          tip: 'Default: 100 (good balance)',
          canCombine: ['Only with tfidf or count vectorization']
        },
        {
          name: 'Drop Original',
          description: 'Remove original text column after vectorization',
          tip: 'Recommended: true for ML (don\'t need original text)',
          canCombine: ['With vectorization']
        }
      ],
      mlReady: 'MUST use vectorization (tfidf recommended) for ML-ready data',
      example: {
        title: 'Recommended for ML:',
        config: {
          lowercase: true,
          remove_punctuation: true,
          remove_stopwords: true,
          stem_or_lemma: 'lemma',
          vectorization: 'tfidf',
          max_features: 100,
          drop_original: true
        }
      }
    },
    datetime: {
      title: 'Datetime Data Preprocessing',
      description: 'Dates and times like created_at, birth_date',
      features: [
        {
          name: 'Missing Values',
          description: 'Handle empty dates',
          options: [
            { value: 'drop', label: 'Drop rows' },
            { value: 'fill_earliest', label: 'Fill with earliest date' },
            { value: 'fill_latest', label: 'Fill with latest date' },
            { value: 'fill_default', label: 'Fill with 2000-01-01' }
          ],
          applied: 'FIRST',
          canCombine: ['ALL other features']
        },
        {
          name: 'Round',
          description: 'Remove precision (round to day/hour/minute)',
          tip: 'Use when exact time doesn\'t matter',
          applied: 'AFTER missing, BEFORE extract',
          canCombine: ['ALL features']
        },
        {
          name: 'Extract',
          description: 'Create new columns from date parts (REQUIRED for ML!)',
          options: ['year', 'month', 'day', 'hour', 'minute', 'second', 'weekday'],
          tip: 'Extract multiple parts for ML-ready data',
          applied: 'AFTER round',
          canCombine: ['ALL features', 'extract MULTIPLE parts'],
          mlNote: 'MUST extract at least one feature for ML'
        },
        {
          name: 'Convert Timezone',
          description: 'Change timezone',
          tip: 'Use when data is from different timezones',
          applied: 'AFTER round, BEFORE extract',
          canCombine: ['ALL features']
        },
        {
          name: 'Drop Original',
          description: 'Remove original date column after extraction',
          tip: 'Recommended: true for ML (only need extracted features)',
          canCombine: ['With extract']
        }
      ],
      mlReady: 'MUST extract at least one feature (year, month, day, etc.) for ML-ready data',
      example: {
        title: 'Recommended for ML:',
        config: {
          missing: 'drop',
          extract: ['year', 'month', 'day', 'weekday'],
          drop_original: true
        }
      }
    },
    boolean: {
      title: 'Boolean Data Preprocessing',
      description: 'True/False values like is_active, verified',
      features: [
        {
          name: 'Missing Values',
          description: 'Handle empty values',
          options: [
            { value: 'drop', label: 'Drop rows' },
            { value: 'fill_true', label: 'Fill with True' },
            { value: 'fill_false', label: 'Fill with False' }
          ],
          applied: 'FIRST',
          canCombine: ['encode']
        },
        {
          name: 'Encode',
          description: 'Convert format',
          options: [
            { value: 'keep_boolean', label: 'Keep as True/False' },
            { value: '0_1', label: 'Convert to 0 and 1 (RECOMMENDED for ML)', tip: 'Better for ML algorithms' }
          ],
          applied: 'AFTER missing',
          canCombine: ['missing'],
          mlNote: 'MUST use 0_1 encoding for ML'
        }
      ],
      mlReady: 'MUST use 0_1 encoding for ML-ready data',
      example: {
        title: 'Recommended for ML:',
        config: {
          missing: 'fill_false',
          encode: '0_1'
        }
      }
    },
    identifier: {
      title: 'Identifier Data Preprocessing',
      description: 'IDs like user_id, transaction_id, UUID',
      features: [
        {
          name: 'Drop Column',
          description: 'Remove ID column (usually not useful for ML)',
          tip: 'Recommended: Usually drop IDs for ML',
          conflicts: ['hash_encode']
        },
        {
          name: 'Hash Encode',
          description: 'Anonymize IDs for privacy',
          tip: 'Use when you need IDs but want privacy',
          conflicts: ['drop_column']
        }
      ],
      mlReady: 'Usually drop IDs (not useful for ML)',
      example: {
        title: 'Recommended:',
        config: {
          drop_column: true
        }
      }
    },
    mixed: {
      title: 'Mixed Data Preprocessing',
      description: 'Messy data with mixed types or corrupted data',
      features: [
        {
          name: 'Drop Column',
          description: 'Remove messy column',
          tip: 'Recommended: Usually best to drop messy columns'
        },
        {
          name: 'Convert To',
          description: 'Try to fix and convert to specific type',
          options: [
            { value: 'keep_as_string', label: 'Keep as String' },
            { value: 'numeric', label: 'Convert to Numeric', tip: 'Required for ML' },
            { value: 'datetime', label: 'Convert to Datetime' },
            { value: 'string', label: 'Force to Text' }
          ],
          mlNote: 'MUST convert to numeric for ML'
        },
        {
          name: 'Fill Missing',
          description: 'Handle failed conversions',
          options: [
            { value: 'drop', label: 'Remove rows that failed' },
            { value: 'fill_default', label: 'Use default value' }
          ]
        }
      ],
      mlReady: 'MUST convert to numeric (or drop) for ML-ready data',
      example: {
        title: 'Recommended for ML:',
        config: {
          convert_to: 'numeric',
          fill_missing: 'drop'
        }
      }
    }
  };

  const getHelpContent = () => {
    if (columnType) {
      // Map column types to help content keys
      const typeMapping: { [key: string]: keyof typeof helpContent } = {
        'Numeric': 'numeric',
        'Categorical': 'categorical',
        'Text': 'text',
        'Datetime / Date': 'datetime',
        'Datetime': 'datetime',
        'Boolean': 'boolean',
        'ID / Unique Identifier': 'identifier',
        'Identifier': 'identifier',
        'Mixed / Unknown / Dirty Data': 'mixed',
        'Mixed': 'mixed'
      };
      
      const typeKey = typeMapping[columnType] || 'numeric';
      return helpContent[typeKey];
    }
    return null;
  };

  const content = getHelpContent();
  const showColumnSpecific = content && columnType;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      width="90vw"
      height="85vh"
      contentClassName="p-0 flex flex-col h-full"
      closable={false}
      style={{
        content: {
          left: '50%',
          transform: 'translate(-50%, 0)',
          margin: 0,
          position: 'fixed',
          maxWidth: '90vw',
          height: '85vh'
        }
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-3 text-white rounded-t-lg flex-shrink-0"
        style={{
          background: 'linear-gradient(to right, #667eea, #764ba2)'
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Preprocessing Help Guide</h2>
            {showColumnSpecific && (
              <p className="text-white/80 text-xs">{content.title} - {content.description}</p>
            )}
            {!showColumnSpecific && (
              <p className="text-white/80 text-xs">Learn about preprocessing features and compatibility</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors duration-200 group"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="preprocessing-help flex-1 flex flex-col min-h-0">

        <div className="help-tabs">
          <button
            className={`help-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Book size={16} />
            Overview
          </button>
          {showColumnSpecific && (
            <>
              <button
                className={`help-tab ${activeTab === 'compatibility' ? 'active' : ''}`}
                onClick={() => setActiveTab('compatibility')}
              >
                <CheckCircle size={16} />
                Compatibility
              </button>
              <button
                className={`help-tab ${activeTab === 'tips' ? 'active' : ''}`}
                onClick={() => setActiveTab('tips')}
              >
                <Lightbulb size={16} />
                Tips & Examples
              </button>
            </>
          )}
          <button
            className={`help-tab ${activeTab === 'ml-ready' ? 'active' : ''}`}
            onClick={() => setActiveTab('ml-ready')}
          >
            <Zap size={16} />
            ML-Ready Guide
          </button>
        </div>

        <div className="help-content">
          {activeTab === 'overview' && (
            <div className="help-section">
              <h3>Understanding Preprocessing</h3>
              <p>Data preprocessing prepares your data for analysis and machine learning by:</p>
              <ul>
                <li>Handling missing values</li>
                <li>Cleaning and transforming data</li>
                <li>Converting data to ML-ready formats</li>
                <li>Removing outliers and noise</li>
              </ul>

              <div className="mode-explanation">
                <h4>Simple vs Advanced Mode</h4>
                <div className="mode-cards">
                  <div className="mode-card">
                    <Zap size={20} />
                    <h5>Simple Mode</h5>
                    <p>Apply the same preprocessing settings to all columns of the same type. Perfect for quick preprocessing when all columns need the same treatment.</p>
                  </div>
                  <div className="mode-card">
                    <Zap size={20} />
                    <h5>Advanced Mode</h5>
                    <p>Configure each column individually. Perfect for fine-grained control when different columns need different preprocessing.</p>
                  </div>
                </div>
              </div>

              {showColumnSpecific && (
                <div className="column-features">
                  <h4>Available Features for {content.title}</h4>
                  {content.features.map((feature, idx) => (
                    <div key={idx} className="feature-card">
                      <div className="feature-header">
                        <h5>{feature.name}</h5>
                        {feature.description && <p className="feature-desc">{feature.description}</p>}
                      </div>
                      {feature.options && (
                        <div className="feature-options">
                          {feature.options.map((opt, optIdx) => (
                            <div key={optIdx} className="option-item">
                              <strong>{opt.label}</strong>
                              {opt.tip && <span className="option-tip">{opt.tip}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.tip && (
                        <div className="feature-tip">
                          <Info size={14} />
                          <span>{feature.tip}</span>
                        </div>
                      )}
                      {feature.applied && (
                        <div className="feature-applied">
                          <span className="applied-label">Applied:</span> {feature.applied}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'compatibility' && showColumnSpecific && (
            <div className="help-section">
              <h3>Feature Compatibility</h3>
              <p>Understanding which features work together and which conflict:</p>
              
              {content.features.map((feature, idx) => (
                <div
                  key={idx}
                  className={`compatibility-card ${expandedSection === `feature-${idx}` ? 'expanded' : ''}`}
                >
                  <div
                    className="compatibility-header"
                    onClick={() => toggleSection(`feature-${idx}`)}
                  >
                    <h4>{feature.name}</h4>
                    {expandedSection === `feature-${idx}` ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                  
                  {expandedSection === `feature-${idx}` && (
                    <div className="compatibility-content">
                      {feature.canCombine && feature.canCombine.length > 0 && (
                        <div className="compatibility-group">
                          <CheckCircle size={16} className="compat-icon success" />
                          <div>
                            <strong>Can combine with:</strong>
                            <ul>
                              {feature.canCombine.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      {feature.conflicts && feature.conflicts.length > 0 && (
                        <div className="compatibility-group">
                          <XCircle size={16} className="compat-icon error" />
                          <div>
                            <strong>Conflicts with:</strong>
                            <ul>
                              {feature.conflicts.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      {feature.applied && (
                        <div className="compatibility-group">
                          <Info size={16} className="compat-icon info" />
                          <div>
                            <strong>Processing order:</strong> {feature.applied}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tips' && showColumnSpecific && (
            <div className="help-section">
              <h3>Tips & Examples</h3>
              
              {content.example && (
                <div className="example-card">
                  <h4>{content.example.title}</h4>
                  <pre className="example-code">
                    {JSON.stringify(content.example.config, null, 2)}
                  </pre>
                  <p className="example-description">
                    This configuration will prepare your {content.title.toLowerCase()} data for machine learning.
                  </p>
                </div>
              )}

              <div className="tips-list">
                <h4>Quick Tips</h4>
                <ul>
                  {content.features.map((feature, idx) => {
                    if (feature.tip) {
                      return (
                        <li key={idx}>
                          <strong>{feature.name}:</strong> {feature.tip}
                        </li>
                      );
                    }
                    return null;
                  })}
                </ul>
              </div>

              {content.mlReady && (
                <div className="ml-ready-tip">
                  <Zap size={20} />
                  <div>
                    <strong>For ML-Ready Data:</strong>
                    <p>{content.mlReady}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ml-ready' && (
            <div className="help-section">
              <h3>ML-Ready Preprocessing Guide</h3>
              <p>Machine learning algorithms require <strong>numeric data only</strong>. Here's what you need for each column type:</p>
              
              <div className="ml-ready-checklist">
                <div className="checklist-item">
                  <CheckCircle size={20} className="check-icon" />
                  <div>
                    <h4>Numeric Columns</h4>
                    <p>Apply scaling (standardize or normalize) for ML-ready data</p>
                  </div>
                </div>
                
                <div className="checklist-item">
                  <CheckCircle size={20} className="check-icon" />
                  <div>
                    <h4>Categorical Columns</h4>
                    <p>MUST use encoding (one_hot recommended) to convert categories to numbers</p>
                  </div>
                </div>
                
                <div className="checklist-item">
                  <CheckCircle size={20} className="check-icon" />
                  <div>
                    <h4>Text Columns</h4>
                    <p>MUST use vectorization (tfidf recommended) to convert text to numbers</p>
                  </div>
                </div>
                
                <div className="checklist-item">
                  <CheckCircle size={20} className="check-icon" />
                  <div>
                    <h4>Datetime Columns</h4>
                    <p>MUST extract at least one feature (year, month, day, etc.) to convert to numbers</p>
                  </div>
                </div>
                
                <div className="checklist-item">
                  <CheckCircle size={20} className="check-icon" />
                  <div>
                    <h4>Boolean Columns</h4>
                    <p>MUST use 0_1 encoding to convert True/False to numbers</p>
                  </div>
                </div>
                
                <div className="checklist-item">
                  <CheckCircle size={20} className="check-icon" />
                  <div>
                    <h4>Identifier Columns</h4>
                    <p>Usually drop IDs (not useful for ML)</p>
                  </div>
                </div>
                
                <div className="checklist-item">
                  <CheckCircle size={20} className="check-icon" />
                  <div>
                    <h4>Mixed Columns</h4>
                    <p>MUST convert to numeric (or drop) for ML-ready data</p>
                  </div>
                </div>
              </div>

              <div className="ml-ready-warning">
                <AlertTriangle size={20} />
                <div>
                  <strong>Common Mistakes:</strong>
                  <ul>
                    <li>❌ Using vectorization = "none" but expecting ML-ready data</li>
                    <li>❌ Not extracting datetime features for ML</li>
                    <li>❌ Using multiple encodings or vectorizations (choose ONE!)</li>
                    <li>❌ Forgetting to encode boolean as 0/1</li>
                  </ul>
                </div>
              </div>

              <div className="ml-ready-example">
                <h4>Complete ML-Ready Example</h4>
                <pre className="example-code">
{`{
  "numeric": {
    "missing": "fill_mean",
    "scaling": "standardize"
  },
  "categorical": {
    "encoding": "one_hot"
  },
  "text": {
    "vectorization": "tfidf",
    "max_features": 100
  },
  "datetime": {
    "extract": ["year", "month", "day"],
    "drop_original": true
  },
  "boolean": {
    "encode": "0_1"
  },
  "identifier": {
    "drop_column": true
  }
}`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg flex-shrink-0">
        <div className="text-sm text-gray-500">
          {showColumnSpecific && (
            <span>Column Type: {content.title}</span>
          )}
          {!showColumnSpecific && (
            <span>Preprocessing Help Documentation</span>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default PreprocessingHelp;

