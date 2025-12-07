import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Spinner, Alert, Select, Switcher } from '@/components/ui';
import { Wrench, Play, Download, ArrowLeft, HelpCircle, Zap, Cog, Sparkles } from 'lucide-react';
import PreprocessingService, { ColumnInfo, PreprocessingConfig, PreprocessingResult, PreprocessingOptions } from '@/services/PreprocessingService';
import NumericPreprocessingOptions from './NumericPreprocessingOptions';
import CategoricalPreprocessingOptions from './CategoricalPreprocessingOptions';
import TextPreprocessingOptions from './TextPreprocessingOptions';
import DatetimePreprocessingOptions from './DatetimePreprocessingOptions';
import BooleanPreprocessingOptions from './BooleanPreprocessingOptions';
import IdentifierPreprocessingOptions from './IdentifierPreprocessingOptions';
import MixedDataPreprocessingOptions from './MixedDataPreprocessingOptions';
import GlobalNumericOptions from './GlobalNumericOptions';
import GlobalCategoricalOptions from './GlobalCategoricalOptions';
import GlobalTextOptions from './GlobalTextOptions';
import GlobalDatetimeOptions from './GlobalDatetimeOptions';
import GlobalBooleanOptions from './GlobalBooleanOptions';
import GlobalIdentifierOptions from './GlobalIdentifierOptions';
import GlobalMixedOptions from './GlobalMixedOptions';
import PreprocessingHelp from './PreprocessingHelp';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { FEATURES } from '@/configs/version.config';
import './PreprocessingPage.css';

interface PreprocessingPageProps {
  fileId?: string;
}

const PreprocessingPage: React.FC<PreprocessingPageProps> = ({ fileId: propFileId }) => {
  const { fileId: paramFileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  
  const fileId = propFileId || paramFileId;
  
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [mode, setMode] = useState<'simple' | 'advanced'>('advanced');
  const [isMLReady, setIsMLReady] = useState(FEATURES.ML_READY_CHECKBOX_ENABLED ? false : false);
  const [preprocessingConfig, setPreprocessingConfig] = useState<PreprocessingConfig['preprocessing']>({
    numeric: { global: null, per_column: {} },
    categorical: { global: null, per_column: {} },
    text: { global: null, per_column: {} },
    datetime: { global: null, per_column: {} },
    boolean: { global: null, per_column: {} },
    identifier: { global: null, per_column: {} },
    mixed: { global: null, per_column: {} }
  });
  const [preprocessingOptions, setPreprocessingOptions] = useState<PreprocessingOptions | null>(null);
  const [outputFilename, setOutputFilename] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreprocessingResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpColumnType, setHelpColumnType] = useState<string | undefined>(undefined);
  const resultsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fileId) {
      fetchColumnInfo();
      fetchPreprocessingOptions();
    }
  }, [fileId]);

  // Auto-scroll to results section when preprocessing completes
  useEffect(() => {
    if (result && resultsSectionRef.current) {
      // Small delay to ensure the DOM has updated
      setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [result]);

  const fetchColumnInfo = async () => {
    if (!fileId) return;
    
    setLoadingColumns(true);
    setError(null);
    setColumns([]); // Ensure columns is always an array
    
    try {
      const data = await PreprocessingService.getColumnsInfo(fileId);
      console.log('Columns data received:', data); // Debug log
      
      // The service now returns { columns: [...] } structure
      if (data && data.columns && Array.isArray(data.columns)) {
        console.log('Setting columns:', data.columns);
        setColumns(data.columns);
      } else {
        console.warn('Invalid columns data structure:', data);
        setColumns([]);
      }
      
      // Generate default filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      setOutputFilename(`preprocessed_${timestamp}.csv`);
    } catch (err: any) {
      console.error('Error fetching columns info:', err);
      const errorMessage = err?.response?.data?.detail?.message || err.message || 'Failed to load column information';
      setError(errorMessage);
      setColumns([]); // Ensure columns is empty array on error
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setLoadingColumns(false);
    }
  };

  const fetchPreprocessingOptions = async () => {
    setLoadingOptions(true);
    setError(null);
    
    try {
      const options = await PreprocessingService.getPreprocessingOptions();
      console.log('Preprocessing options received:', options);
      setPreprocessingOptions(options);
    } catch (err: any) {
      console.error('Error fetching preprocessing options:', err);
      const errorMessage = err?.response?.data?.detail?.message || err.message || 'Failed to load preprocessing options';
      setError(errorMessage);
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  const validateMLReady = (): { valid: boolean; errors: string[] } => {
    if (!isMLReady) return { valid: true, errors: [] };
    
    const errors: string[] = [];
    
    // Check text columns - must have vectorization selected
    columns.forEach(col => {
      if (col.preprocessing_data_type === 'Text') {
        const textConfig = mode === 'simple' 
          ? preprocessingConfig.text.global 
          : preprocessingConfig.text.per_column[col.name];
        
        if (!textConfig || !textConfig.vectorization || textConfig.vectorization === 'none') {
          errors.push(`Text column "${col.name}" must have vectorization selected in ML-Ready mode`);
        }
      } else if (col.preprocessing_data_type === 'Boolean') {
        const boolConfig = mode === 'simple'
          ? preprocessingConfig.boolean.global
          : preprocessingConfig.boolean.per_column[col.name];
        
        if (!boolConfig || boolConfig.encode !== '0_1') {
          errors.push(`Boolean column "${col.name}" must be converted to 0/1 in ML-Ready mode`);
        }
      } else if (col.preprocessing_data_type === 'Categorical') {
        const catConfig = mode === 'simple'
          ? preprocessingConfig.categorical.global
          : preprocessingConfig.categorical.per_column[col.name];
        
        if (!catConfig || !catConfig.encoding) {
          errors.push(`Categorical column "${col.name}" must have encoding selected in ML-Ready mode`);
        }
      } else if (col.preprocessing_data_type === 'Datetime / Date') {
        const datetimeConfig = mode === 'simple'
          ? preprocessingConfig.datetime.global
          : preprocessingConfig.datetime.per_column[col.name];
        
        if (!datetimeConfig || !datetimeConfig.extract || !Array.isArray(datetimeConfig.extract) || datetimeConfig.extract.length === 0) {
          errors.push(`Datetime column "${col.name}" must have at least one feature extracted in ML-Ready mode`);
        }
      } else if (col.preprocessing_data_type === 'Mixed / Unknown / Dirty Data') {
        const mixedConfig = mode === 'simple'
          ? preprocessingConfig.mixed.global
          : preprocessingConfig.mixed.per_column[col.name];
        
        // Only validate if column is not dropped
        if (mixedConfig && !mixedConfig.drop) {
          if (!mixedConfig.convert_to || mixedConfig.convert_to !== 'numeric') {
            errors.push(`Mixed column "${col.name}" must be converted to numeric in ML-Ready mode (or dropped)`);
          }
        }
      }
    });
    
    return { valid: errors.length === 0, errors };
  };

  const handlePreprocess = async () => {
    if (!fileId) return;
    
    // Validate ML-Ready mode requirements (only if feature is enabled)
    if (FEATURES.ML_READY_CHECKBOX_ENABLED && isMLReady) {
      const validation = validateMLReady();
      if (!validation.valid) {
        setError(validation.errors.join('\n'));
        toast.push(
          <Notification title="ML-Ready Validation Failed" type="danger">
            {validation.errors.map((err, i) => <div key={i}>{err}</div>)}
          </Notification>
        );
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const config: PreprocessingConfig = {
        mode,
        preprocessing: preprocessingConfig,
        output_filename: outputFilename || undefined
      };
      
      const result = await PreprocessingService.preprocessFile(fileId, config);
      console.log('Preprocessing result received:', result); // Debug log
      setResult(result);
      
      toast.push(
        <Notification title="Preprocessing Complete" type="success" duration={5000}>
          Successfully processed {result.rows_after || 0} rows (from {result.rows_before || 0}) with {result.columns_after || 0} columns!
        </Notification>
      );
    } catch (err: any) {
      const errorMessage = err?.response?.data?.detail?.message || err.message || 'Preprocessing failed';
      setError(errorMessage);
      toast.push(
        <Notification title="Preprocessing Failed" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setLoading(false);
    }
  };

  const updateColumnConfig = (columnName: string, preprocessingType: string, options: any) => {
    const typeKey = getTypeKey(preprocessingType) as keyof typeof preprocessingConfig;
    
    setPreprocessingConfig(prev => ({
      ...prev,
      [typeKey]: {
        ...prev[typeKey],
        per_column: {
          ...prev[typeKey].per_column,
          [columnName]: options
        }
      }
    }));
  };

  const updateGlobalConfig = (typeKey: string, options: any) => {
    const key = typeKey as keyof typeof preprocessingConfig;
    setPreprocessingConfig(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        global: options,
        per_column: {} // Clear per-column settings in simple mode
      }
    }));
  };

  const getTypeKey = (preprocessingType: string): string => {
    const mapping: { [key: string]: string } = {
      'Numeric': 'numeric',
      'Categorical': 'categorical',
      'Text': 'text',
      'Datetime / Date': 'datetime',
      'Boolean': 'boolean',
      'ID / Unique Identifier': 'identifier',
      'Mixed / Unknown / Dirty Data': 'mixed'
    };
    return mapping[preprocessingType] || 'numeric';
  };

  const renderColumnOptions = (column: ColumnInfo) => {
    const commonProps = {
      column,
      options: preprocessingOptions,
      isMLReady,
      onUpdate: (opts: any) => updateColumnConfig(column.name, column.preprocessing_data_type, opts),
      onShowHelp: () => {
        setHelpColumnType(column.preprocessing_data_type);
        setShowHelp(true);
      }
    };

    switch (column.preprocessing_data_type) {
      case 'Numeric':
        return <NumericPreprocessingOptions {...commonProps} />;
      case 'Categorical':
        return <CategoricalPreprocessingOptions {...commonProps} />;
      case 'Text':
        return <TextPreprocessingOptions {...commonProps} />;
      case 'Datetime / Date':
        return <DatetimePreprocessingOptions {...commonProps} />;
      case 'Boolean':
        return <BooleanPreprocessingOptions {...commonProps} />;
      case 'ID / Unique Identifier':
        return <IdentifierPreprocessingOptions {...commonProps} />;
      case 'Mixed / Unknown / Dirty Data':
        return <MixedDataPreprocessingOptions {...commonProps} />;
      default:
        return null;
    }
  };

  const renderGlobalOptions = () => {
    return (
      <div className="global-settings">
        <h2>Global Settings</h2>
        <p className="global-description">
          These settings will apply to all columns of each type
        </p>
        
        <div className="global-options-grid">
          <GlobalNumericOptions isMLReady={isMLReady} onUpdate={(opts) => updateGlobalConfig('numeric', opts)} />
          <GlobalCategoricalOptions isMLReady={isMLReady} options={preprocessingOptions} onUpdate={(opts) => updateGlobalConfig('categorical', opts)} />
          <GlobalTextOptions isMLReady={isMLReady} options={preprocessingOptions} onUpdate={(opts) => updateGlobalConfig('text', opts)} />
          <GlobalDatetimeOptions isMLReady={isMLReady} options={preprocessingOptions} onUpdate={(opts) => updateGlobalConfig('datetime', opts)} />
          <GlobalBooleanOptions isMLReady={isMLReady} options={preprocessingOptions} onUpdate={(opts) => updateGlobalConfig('boolean', opts)} />
          <GlobalIdentifierOptions isMLReady={isMLReady} options={preprocessingOptions} onUpdate={(opts) => updateGlobalConfig('identifier', opts)} />
          <GlobalMixedOptions isMLReady={isMLReady} options={preprocessingOptions} onUpdate={(opts) => updateGlobalConfig('mixed', opts)} />
        </div>
      </div>
    );
  };

  const getColumnsByType = (type: string) => {
    return (columns || []).filter(col => col.preprocessing_data_type === type);
  };

  if (loadingColumns) {
    return (
      <div className="preprocessing-page">
        <div className="loading-container">
          <Spinner size="lg" />
          <p>Loading column information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="preprocessing-page">
        <div className="error-container">
          <Alert type="danger" showIcon>
            <h3>Error Loading Data</h3>
            <p>{error}</p>
            <Button onClick={fetchColumnInfo} className="mt-4">
              Try Again
            </Button>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="preprocessing-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <Button
              variant="plain"
              icon={<ArrowLeft />}
              onClick={() => navigate(-1)}
              className="back-button"
            >
              Back
            </Button>
            <div className="title-section">
              <h1>Data Preprocessing</h1>
              <p>Configure preprocessing options for each column based on its detected type</p>
            </div>
          </div>
          <div className="header-right">
            <Button
              variant="plain"
              icon={<HelpCircle />}
              onClick={() => {
                setHelpColumnType(undefined);
                setShowHelp(true);
              }}
            >
              Help
            </Button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <label>Preprocessing Mode:</label>
          <div className="toggle-buttons">
            <button
              className={`mode-button ${mode === 'simple' ? 'active' : ''}`}
              onClick={() => setMode('simple')}
            >
              <Zap className="mode-icon" />
              <div className="mode-content">
                <span className="mode-title">Simple</span>
                <span className="mode-hint">Global settings for all columns</span>
              </div>
            </button>
            <button
              className={`mode-button ${mode === 'advanced' ? 'active' : ''}`}
              onClick={() => setMode('advanced')}
            >
              <Cog className="mode-icon" />
              <div className="mode-content">
                <span className="mode-title">Advanced</span>
                <span className="mode-hint">Per-column custom settings</span>
              </div>
            </button>
          </div>
        </div>

        {/* ML-Ready Toggle - Hidden in version 1.0 */}
        {FEATURES.ML_READY_CHECKBOX_ENABLED && (
          <div className="ml-ready-toggle" style={{ marginTop: '16px', padding: '12px', backgroundColor: isMLReady ? '#e6f7ff' : '#f5f5f5', borderRadius: '8px', border: isMLReady ? '2px solid #1890ff' : '2px solid #d9d9d9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Switcher
                checked={isMLReady}
                onChange={(checked, e) => {
                  // Use e.target.checked because Switcher has a bug where it passes old value when controlled
                  setIsMLReady(e.target.checked);
                }}
                checkedContent={<Sparkles size={16} />}
                unCheckedContent={null}
              />
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 600, fontSize: '14px', cursor: 'pointer' }} onClick={() => setIsMLReady(!isMLReady)}>
                  ML-Ready Mode
                </label>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                  {isMLReady 
                    ? 'Only options that convert columns to numeric are shown. Text, categorical, and boolean columns must be converted to numeric for ML training.'
                    : 'Enable to show only preprocessing options that convert columns to numeric (required for ML model training).'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="page-content">
        {mode === 'simple' ? (
          renderGlobalOptions()
        ) : (
          <div className="columns-list">
            <div className="columns-header">
              <h2>Column Configuration</h2>
              <p>Configure preprocessing options for each column individually</p>
            </div>
            
            {(columns || []).length === 0 ? (
              <div className="no-columns">
                <p>No columns found in this file.</p>
              </div>
            ) : (
              <div className="columns-grid">
                {(columns || []).map(column => (
                  <div key={column.name} className="column-card">
                    {renderColumnOptions(column)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Output Configuration */}
        <Card className="output-section">
          <div className="output-header">
            <Wrench className="output-icon" />
            <h3>Output Configuration</h3>
          </div>
          <div className="output-content">
            <div className="filename-group">
              <label>Output Filename:</label>
              <Input
                value={outputFilename}
                onChange={(e) => setOutputFilename(e.target.value)}
                placeholder="processed_data.csv"
                className="filename-input"
              />
            </div>
            <p className="output-hint">
              The processed file will be saved to your data files
            </p>
          </div>
        </Card>

        {/* Actions */}
        <div className="actions">
          <Button
            onClick={handlePreprocess}
            disabled={loading || (columns || []).length === 0}
            loading={loading}
            icon={<Play />}
            className="process-button"
          >
            {loading ? 'Processing...' : 'Apply Preprocessing'}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <Card className="results-section" ref={resultsSectionRef}>
            <div className="results-header">
              <Download className="results-icon" />
              <h3>Preprocessing Complete!</h3>
              <Button
                variant="twoTone"
                size="sm"
                onClick={() => window.location.href = '/preprocessing'}
                className="view-all-button"
              >
                View All Preprocessed Files
              </Button>
            </div>
            <div className="results-content">
              <div className="results-stats">
                <div className="stat">
                  <span className="stat-label">File:</span>
                  <span className="stat-value">{result.filename || 'Unknown'}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Rows:</span>
                  <span className="stat-value">
                    {(result.rows_after || 0).toLocaleString()}
                    {result.rows_before && result.rows_before !== result.rows_after && (
                      <span className="change-indicator">
                        (from {(result.rows_before || 0).toLocaleString()})
                      </span>
                    )}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Columns:</span>
                  <span className="stat-value">
                    {result.columns_after || 0}
                    {result.columns_before && result.columns_before !== result.columns_after && (
                      <span className="change-indicator">
                        (from {result.columns_before || 0})
                      </span>
                    )}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">File Size:</span>
                  <span className="stat-value">{(result.file_size_mb || 0).toFixed(2)} MB</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Status:</span>
                  <span className="stat-value capitalize">{result.status || 'Unknown'}</span>
                </div>
              </div>
              
              {result.transformations_applied && Object.keys(result.transformations_applied).length > 0 && (
                <div className="transformations">
                  <h4>Transformations Applied:</h4>
                  <div className="transformations-list">
                    {Object.entries(result.transformations_applied).map(([columnType, transformations]) => (
                      <div key={columnType} className="transformation-group">
                        <h5 className="column-type">{columnType.replace(/_/g, ' ').toUpperCase()}:</h5>
                        <ul>
                          {transformations.map((transformation, index) => (
                            <li key={index}>{transformation}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="results-actions">
                <Button
                  onClick={async () => {
                    if (!result?.file_id) return;
                    
                    try {
                      // Show loading state
                      toast.push(
                        <Notification title="Downloading" type="info">
                          Preparing download for {result.filename}...
                        </Notification>
                      );

                      // Download the file
                      const blob = await PreprocessingService.downloadPreprocessedFile(result.file_id);
                      
                      // Validate that we received a proper blob
                      if (!blob || !(blob instanceof Blob)) {
                        throw new Error('Invalid file data received from server');
                      }

                      // Check if blob is empty
                      if (blob.size === 0) {
                        throw new Error('Empty file received from server');
                      }
                      
                      // Create download link
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = result.filename || 'preprocessed_file.csv';
                      
                      // Trigger download
                      document.body.appendChild(link);
                      link.click();
                      
                      // Cleanup
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);

                      toast.push(
                        <Notification title="Download Complete" type="success">
                          Successfully downloaded {result.filename}
                        </Notification>
                      );
                    } catch (err: any) {
                      const errorMessage = err?.response?.data?.detail?.message || err.message || 'Failed to download file';
                      toast.push(
                        <Notification title="Download Failed" type="danger">
                          {errorMessage}
                        </Notification>
                      );
                    }
                  }}
                  icon={<Download />}
                >
                  Download Processed File
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Help Modal */}
      <PreprocessingHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        columnType={helpColumnType}
      />
    </div>
  );
};

export default PreprocessingPage;
