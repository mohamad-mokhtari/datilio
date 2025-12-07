// src/components/csv/PlotCard.tsx
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Button, Card } from '@/components/ui';
import { useConfig } from '@/components/ui/ConfigProvider';
import plotConfig from '../../../plot_json.json';
import { getSamplingConfig } from '@/configs/sampling.config';
import type { SamplingMetadata } from '@/services/ChartDataService';
import { 
  ColumnInfo, 
  DetailedColumnInfo,
  PlotConfigItem, 
  SelectOption,
  InputConfig,
  ChartData,
  isTypeInCategory,
  isTypeInCategories
} from '../../@types/csv';
import LineChartComponent from '../charts/LineChartComponent';
import SimpleBarChartComponent from '../charts/SimpleBarChartComponent';
import MultiLineChartComponent from '../charts/MultiLineChartComponent';
import SimpleScatterChartComponent from '../charts/SimpleScatterChartComponent';
import Simple3DScatterChartComponent from '../charts/Simple3DScatterChartComponent';
import HistogramPlotComponent from '../charts/HistogramPlotComponent';
import BoxPlotComponent from '../charts/BoxPlotComponent';
import BarHistogramComponent from '../charts/BarHistogramComponent';
import FiveDScatterComponent from '../charts/FiveDScatterComponent';
import ThreeDSurfaceComponent from '../charts/ThreeDSurfaceComponent';
import PieChartComponent from '../charts/PieChartComponent';
import StackedAreaChartComponent from '../charts/StackedAreaChartComponent';
// ✨ NEW CHARTS
import RadarChartComponent from '../charts/RadarChartComponent';
import HeatmapChartComponent from '../charts/HeatmapChartComponent';
import FunnelChartComponent from '../charts/FunnelChartComponent';
import CandlestickChartComponent from '../charts/CandlestickChartComponent';
import TreemapChartComponent from '../charts/TreemapChartComponent';
import GaugeChartComponent from '../charts/GaugeChartComponent';

interface PlotCardProps {
  visible_plot_extra_info: boolean | undefined;
  userId: string;
  file_id: string;
  columns: ColumnInfo[];
  detailedColumns?: DetailedColumnInfo[]; // Optional detailed column info for filtering
  plotConfig?: {
    plotType: string;
    inputs: { [key: string]: string };
  };
  onPlotGenerated?: (config: { plotType: string; inputs: { [key: string]: string } }) => void;
  pythonCodeSnippet?: string; // Optional filter code snippet for filtered data
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void; // Callback for sampling metadata
}

const PlotCard: React.FC<PlotCardProps> = ({ 
  visible_plot_extra_info,
  userId, 
  file_id, 
  columns,
  detailedColumns,
  plotConfig: externalPlotConfig,
  onPlotGenerated,
  pythonCodeSnippet,
  onSamplingMetadataReceived
}) => {
  const { themeColor, primaryColorLevel } = useConfig();
  
  // Get CSS color values for the theme
  const getThemeColors = () => {
    const colorMap: Record<string, Record<number, string>> = {
      red: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
      orange: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
      amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
      yellow: { 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
      lime: { 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#365314', 900: '#1a2e05' },
      green: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
      emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
      teal: { 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
      cyan: { 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63' },
      sky: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
      blue: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
      indigo: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
      violet: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
      purple: { 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87' },
      fuchsia: { 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75' },
      pink: { 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
      rose: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' }
    };
    
    const primaryColor = colorMap[themeColor]?.[primaryColorLevel] || '#4f46e5'; // fallback to indigo-600
    const lightColor = colorMap[themeColor]?.[Math.max(primaryColorLevel - 100, 100) as number] || '#6366f1'; // fallback to indigo-500
    
    return { primaryColor, lightColor };
  };

  const { primaryColor, lightColor } = getThemeColors();
  
  // Identify columns with high missing ratio (>50%)
  const getColumnMissingRatio = (columnName: string): number => {
    if (!detailedColumns) return 0;
    const detailedInfo = detailedColumns.find(col => col.name === columnName);
    return detailedInfo?.missing_ratio ?? 0;
  };

  const isColumnPlottable = (columnName: string): boolean => {
    const missingRatio = getColumnMissingRatio(columnName);
    return missingRatio <= 0.5;
  };

  // Get list of non-plottable columns with their missing percentages
  const nonPlottableColumns = columns
    .filter(col => !isColumnPlottable(col.name))
    .map(col => ({
      name: col.name,
      missingPercentage: Math.round(getColumnMissingRatio(col.name) * 100)
    }));
  
  const typedPlotConfig = plotConfig as PlotConfigItem[];
  const plotTypes = typedPlotConfig.map(config => config.plot_type);
  
  // Use external config if provided, otherwise use internal state
  const [plotType, setPlotType] = useState(
    externalPlotConfig ? externalPlotConfig.plotType : (plotTypes[0] || '')
  );
  const [inputs, setInputs] = useState<{ [key: string]: string }>(
    externalPlotConfig ? externalPlotConfig.inputs : {}
  );
  const [showChart, setShowChart] = useState(!!externalPlotConfig);
  const [samplingMetadata, setSamplingMetadata] = useState<SamplingMetadata | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get sampling configuration for current plot type
  const samplingConfig = getSamplingConfig(plotType);

  // Chart type metadata with icons and descriptions
  const chartTypeMetadata: { [key: string]: { icon: string; description: string; category: string } } = {
    line: { icon: '📈', description: 'Show trends over continuous data', category: 'Trends' },
    multi_line: { icon: '📉', description: 'Compare multiple trends', category: 'Trends' },
    stacked_area_chart: { icon: '⛰️', description: 'Stacked cumulative trends', category: 'Trends' },
    bar: { icon: '📊', description: 'Compare categories side by side', category: 'Comparison' },
    bar_histogram: { icon: '📶', description: 'Dual-axis bar comparison', category: 'Comparison' },
    radar: { icon: '📡', description: 'Multi-dimensional comparison', category: 'Comparison' },
    scatter: { icon: '⚫', description: 'Show correlation between 2 variables', category: 'Correlation' },
    '3d_scatter': { icon: '🔮', description: '3D relationship visualization', category: 'Correlation' },
    '5d_scatter': { icon: '🌐', description: '5-dimensional data visualization', category: 'Correlation' },
    heatmap: { icon: '🔥', description: '2D pattern and correlation map', category: 'Correlation' },
    histogram: { icon: '📏', description: 'Show data distribution', category: 'Distribution' },
    box_plot: { icon: '📦', description: 'Statistical distribution summary', category: 'Distribution' },
    pie_chart: { icon: '🥧', description: 'Show proportional parts', category: 'Proportions' },
    funnel: { icon: '🔽', description: 'Track conversion rates', category: 'Proportions' },
    treemap: { icon: '🗺️', description: 'Hierarchical proportions', category: 'Proportions' },
    gauge: { icon: '⚡', description: 'Single metric KPI display', category: 'KPI' },
    candlestick: { icon: '🕯️', description: 'Financial OHLC data visualization', category: 'Advanced' },
    '3d_surface': { icon: '🏔️', description: '3D surface visualization', category: 'Advanced' },
  };

  const categories = ['All', 'Trends', 'Comparison', 'Correlation', 'Distribution', 'Proportions', 'KPI', 'Advanced'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    // Only reset inputs when plot type changes if no external config is provided
    if (!externalPlotConfig) {
      const plotConfigItem = typedPlotConfig.find(config => config.plot_type === plotType);
      if (plotConfigItem) {
        const initialInputs = plotConfigItem.inputs.reduce((acc, input, index) => {
          acc[`input_${index}`] = '';
          return acc;
        }, {} as { [key: string]: string });
        setInputs(initialInputs);
      }
      // Hide chart when plot type changes
      setShowChart(false);
    }
  }, [plotType, externalPlotConfig]);

  const renderInputs = () => {
    const plotConfigItem = typedPlotConfig.find(config => config.plot_type === plotType);
    if (!plotConfigItem) return null;
  
    return (
      <div className="space-y-4 mt-4">
        {plotConfigItem.inputs.map((inputConfig, index) => {
          const inputKey = `input_${index}`;
          
          if (inputConfig.type === 'text') {
            return (
              <div key={inputKey} className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {inputConfig.label}
                </label>
                <input
                  type="text"
                  value={inputs[inputKey] || ''}
                  onChange={(e) => setInputs({ ...inputs, [inputKey]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={`Enter ${inputConfig.label.toLowerCase()}`}
                />
              </div>
            );
          }

          const validColumns = inputConfig.values_type 
            ? columns.filter(col => {
                // First check if column is plottable (missing_ratio <= 0.5)
                if (!isColumnPlottable(col.name)) {
                  return false;
                }
                
                // Use new function that supports both single type and array of types
                return inputConfig.values_type ? isTypeInCategories(col.type, inputConfig.values_type) : true;
              })
            : columns.filter(col => isColumnPlottable(col.name));

          const isMultiSelect = inputConfig.type === 'multi_select';
          
          let currentValue = null;
          if (inputs[inputKey]) {
            if (isMultiSelect) {
              const selectedValues = inputs[inputKey].split(',').filter(Boolean);
              currentValue = selectedValues.map(val => ({
                value: val,
                label: val
              }));
            } else {
              currentValue = { value: inputs[inputKey], label: inputs[inputKey] };
            }
          }
      
          return (
            <div key={inputKey} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {inputConfig.label}
                {isMultiSelect && <span className="ml-1 text-xs text-gray-500">(multiple selection)</span>}
              </label>
              <Select<SelectOption, boolean>
                isMulti={isMultiSelect}
                value={currentValue}
                onChange={(selectedOption) => {
                  if (isMultiSelect) {
                    const values = Array.isArray(selectedOption) 
                      ? selectedOption.map(option => option.value).join(',')
                      : '';
                    setInputs({ ...inputs, [inputKey]: values });
                  } else {
                    const singleOption = selectedOption as SelectOption | null;
                    setInputs({ ...inputs, [inputKey]: singleOption?.value || '' });
                  }
                }}
                options={validColumns.map(col => ({ 
                  value: col.name, 
                  label: col.name 
                }))}
                placeholder={`Select ${inputConfig.label.toLowerCase()}`}
                className="text-sm"
                styles={{ 
                  control: (base) => ({ 
                    ...base, 
                    minHeight: '38px',
                    borderColor: '#e2e8f0',
                    boxShadow: 'none',
                    '&:hover': {
                      borderColor: '#cbd5e0',
                    }
                  }),
                  menu: (provided) => ({
                    ...provided,
                    zIndex: 9999,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  }),
                  container: (provided) => ({ 
                    ...provided, 
                    width: '100%'
                  }),
                  menuPortal: (provided) => ({
                    ...provided,
                    zIndex: 9999
                  })
                }}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
              {inputConfig.values_type && validColumns.length === 0 && (
                <p className="mt-1 text-xs text-red-500">
                  No columns of type "{Array.isArray(inputConfig.values_type) ? inputConfig.values_type.join(', ') : inputConfig.values_type}" available
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Map plot types to their respective components
  const plotComponents: { [key: string]: React.FC<any> } = {
    line: LineChartComponent,
    bar: SimpleBarChartComponent,
    multi_line: MultiLineChartComponent,
    scatter: SimpleScatterChartComponent,
    '3d_scatter': Simple3DScatterChartComponent,
    histogram: HistogramPlotComponent,
    box_plot: BoxPlotComponent,
    bar_histogram: BarHistogramComponent,
    '5d_scatter': FiveDScatterComponent,
    '3d_surface': ThreeDSurfaceComponent,
    pie_chart: PieChartComponent,
    stacked_area_chart: StackedAreaChartComponent,
    // ✨ NEW CHARTS
    radar: RadarChartComponent,
    heatmap: HeatmapChartComponent,
    funnel: FunnelChartComponent,
    candlestick: CandlestickChartComponent,
    treemap: TreemapChartComponent,
    gauge: GaugeChartComponent,
  };

  const SelectedPlotComponent = plotComponents[plotType];

  const handlePlot = () => {
    // Validation for bar_histogram: must have exactly 2 different columns
    if (plotType === 'bar_histogram') {
      const firstCol = inputs['input_0'];
      const secondCol = inputs['input_1'];
      
      if (!firstCol || !secondCol) {
        alert('Please select both first and second columns for bar histogram');
        return;
      }
      
      if (firstCol === secondCol) {
        alert('Please select two different columns for bar histogram');
        return;
      }
    }
    
    // Validation for 3d_surface: must have exactly 2 different columns
    if (plotType === '3d_surface') {
      const firstCol = inputs['input_0'];
      const secondCol = inputs['input_1'];
      
      if (!firstCol || !secondCol) {
        alert('Please select both columns for 3D surface plot');
        return;
      }
      
      if (firstCol === secondCol) {
        alert('Please select two different columns for 3D surface plot');
        return;
      }
    }
    
    // Validation for stacked_area_chart: must have x-axis column and at least one y-axis column
    if (plotType === 'stacked_area_chart') {
      const xAxisCol = inputs['input_0'];
      const yAxisCols = inputs['input_1'];
      
      if (!xAxisCol || !yAxisCols) {
        alert('Please select both X-axis column and Y-axis columns for stacked area chart');
        return;
      }
      
      const yAxisColumns = yAxisCols.split(',').filter(Boolean);
      if (yAxisColumns.length === 0) {
        alert('Please select at least one Y-axis column for stacked area chart');
        return;
      }
    }
    
    // Validation for radar: must have at least 3 columns
    if (plotType === 'radar') {
      const metricCols = inputs['input_0'];
      
      if (!metricCols) {
        alert('Please select metric columns for radar chart');
        return;
      }
      
      const metricColumns = metricCols.split(',').filter(Boolean);
      if (metricColumns.length < 3) {
        alert('Radar chart requires at least 3 metric columns for meaningful visualization');
        return;
      }
    }
    
    // Validation for heatmap: must have all 3 columns
    if (plotType === 'heatmap') {
      const xCol = inputs['input_0'];
      const yCol = inputs['input_1'];
      const valueCol = inputs['input_2'];
      
      if (!xCol || !yCol || !valueCol) {
        alert('Please select X-axis, Y-axis, and Value columns for heatmap');
        return;
      }
    }
    
    // Validation for candlestick: must have all 5 columns and they must be different
    if (plotType === 'candlestick') {
      const dateCol = inputs['input_0'];
      const openCol = inputs['input_1'];
      const closeCol = inputs['input_2'];
      const highCol = inputs['input_3'];
      const lowCol = inputs['input_4'];
      
      if (!dateCol || !openCol || !closeCol || !highCol || !lowCol) {
        alert('Please select all required columns (Date, Open, Close, High, Low) for candlestick chart');
        return;
      }
      
      const uniqueCols = new Set([openCol, closeCol, highCol, lowCol]);
      if (uniqueCols.size !== 4) {
        alert('Open, Close, High, and Low columns must be different');
        return;
      }
    }
    
    setShowChart(true);
    
    // Notify parent component about the generated plot
    if (onPlotGenerated) {
      onPlotGenerated({ plotType, inputs });
    }
  };

  const hasRequiredInputs = Object.values(inputs).every(value => value !== '');

  // Render sampling metadata information
  const renderSamplingInfo = () => {
    if (!samplingMetadata || !samplingMetadata.is_sampled) {
      return null;
    }

    const percentage = (samplingMetadata.sampling_ratio * 100).toFixed(1);
    
    return (
      <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Data Sampling Active
              </h3>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-200 text-xs font-medium rounded-full">
                {percentage}% Displayed
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center text-xs text-blue-700 dark:text-blue-300">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>
                  <span className="font-medium">{samplingMetadata.returned_rows.toLocaleString()}</span> of{' '}
                  <span className="font-medium">{samplingMetadata.total_rows.toLocaleString()}</span> data points
                </span>
              </div>
              <div className="flex items-center text-xs text-blue-700 dark:text-blue-300">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Method: <span className="font-medium capitalize">{samplingMetadata.sampling_method}</span>
                  {samplingMetadata.sampling_interval && (
                    <span className="ml-1">(every {samplingMetadata.sampling_interval.toFixed(1)} rows)</span>
                  )}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/30 rounded px-2 py-1.5">
              ⚡ Data has been sampled for optimal chart performance. The visualization represents the overall pattern of your dataset.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="mt-6">
      <div className="p-2 sm:p-4">
        {!externalPlotConfig && (
          <>
            {/* Alert banner for non-plottable columns */}
            {nonPlottableColumns.length > 0 && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                      {nonPlottableColumns.length === 1 ? 'Column Not Plottable' : 'Columns Not Plottable'}
                    </h3>
                    <div className="text-xs text-yellow-700 space-y-1">
                      {nonPlottableColumns.map((col, index) => (
                        <div key={index}>
                          <span className="font-medium">{col.name}</span> is not plottable because {col.missingPercentage}% of the data is empty.
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-yellow-600 mt-2">
                      These columns have been excluded from the plot selection options because more than 50% of their values are missing.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Select Chart Type</h3>
                {plotType && (
                  <button
                    onClick={() => {
                      setPlotType('');
                      setInputs({});
                      setShowChart(false);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search chart types..."
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((category) => {
                  const count = plotTypes.filter(type => 
                    selectedCategory === 'All' || chartTypeMetadata[type]?.category === category
                  ).length;
                  
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedCategory === category
                          ? 'text-white shadow-md transform scale-105'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                      style={selectedCategory === category ? {
                        backgroundColor: primaryColor
                      } : {}}
                    >
                      {category}
                      {category !== 'All' && (
                        <span className="ml-1 text-xs opacity-75">
                          ({plotTypes.filter(t => chartTypeMetadata[t]?.category === category).length})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Chart Type Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto overflow-x-hidden px-1 py-2">
                {plotTypes
                  .filter(type => {
                    // Filter by category
                    const matchesCategory = selectedCategory === 'All' || chartTypeMetadata[type]?.category === selectedCategory;
                    
                    // Filter by search term
                    const matchesSearch = !searchTerm || 
                      type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      chartTypeMetadata[type]?.description.toLowerCase().includes(searchTerm.toLowerCase());
                    
                    return matchesCategory && matchesSearch;
                  })
                  .map((type) => {
                    const metadata = chartTypeMetadata[type] || { icon: '📊', description: 'Chart visualization', category: 'Other' };
                    const isSelected = plotType === type;
                    
                    return (
                      <button
                        key={type}
                        onClick={() => setPlotType(type)}
                        className={`group relative p-4 rounded-xl text-left transition-all duration-200 hover:shadow-lg ${
                          isSelected
                            ? 'ring-2 shadow-lg'
                            : 'bg-white hover:bg-gray-50 border border-gray-200'
                        }`}
                        style={isSelected ? {
                          backgroundColor: `${primaryColor}10`,
                          borderColor: primaryColor
                        } : {}}
                      >
                        {/* Selected Indicator */}
                        {isSelected && (
                          <div 
                            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        
                        <div className="flex items-start space-x-3">
                          <div className="text-3xl flex-shrink-0 group-hover:scale-110 transition-transform">
                            {metadata.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-sm mb-1 ${isSelected ? 'text-gray-900' : 'text-gray-800'}`}>
                              {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </h4>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {metadata.description}
                            </p>
                            <span 
                              className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                isSelected ? 'text-white' : 'bg-gray-100 text-gray-600'
                              }`}
                              style={isSelected ? { backgroundColor: primaryColor } : {}}
                            >
                              {metadata.category}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* No Results Message */}
              {plotTypes.filter(type => {
                const matchesCategory = selectedCategory === 'All' || chartTypeMetadata[type]?.category === selectedCategory;
                const matchesSearch = !searchTerm || 
                  type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  chartTypeMetadata[type]?.description.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesCategory && matchesSearch;
              }).length === 0 && (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600 font-medium">No charts found</p>
                  <p className="text-sm text-gray-500 mt-1">Try adjusting your search or category filter</p>
                </div>
              )}
            </div>
            
            {/* Only show configuration section when a chart type is selected */}
            {plotType && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-700">Configure Chart Data</h3>
                  <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-gray-300">
                    <span className="text-2xl">{chartTypeMetadata[plotType]?.icon || '📊'}</span>
                    <span className="text-sm font-medium text-gray-700">
                      {plotType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  </div>
                </div>
                {renderInputs()}
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={handlePlot} 
                    disabled={!hasRequiredInputs}
                    className={
                      hasRequiredInputs 
                        ? "px-6 py-2.5 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                        : "px-6 py-2.5 bg-gray-200 text-gray-500 font-medium rounded-lg cursor-not-allowed"
                    }
                    style={hasRequiredInputs ? {
                      backgroundColor: primaryColor
                    } : {}}
                    onMouseEnter={(e) => {
                      if (hasRequiredInputs) {
                        e.currentTarget.style.backgroundColor = lightColor;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (hasRequiredInputs) {
                        e.currentTarget.style.backgroundColor = primaryColor;
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Generate Chart</span>
                    </div>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        
        {showChart && SelectedPlotComponent && (
          <div className="mt-6">
            {/* Sampling information banner - shows after user clicks "Generate Chart" */}
            {renderSamplingInfo()}
            
            <SelectedPlotComponent
              visible_plot_extra_info={visible_plot_extra_info}
              userId={userId}
              fileId={file_id}
              pythonCodeSnippet={pythonCodeSnippet}
              samplingConfig={samplingConfig}
              onSamplingMetadataReceived={(metadata: SamplingMetadata) => {
                setSamplingMetadata(metadata);
                if (onSamplingMetadataReceived) {
                  onSamplingMetadataReceived(metadata);
                }
              }}
              {...(plotType === 'line' ? {
                firstColumnName: inputs['input_0'],
                secondColumnName: inputs['input_1']
              } : plotType === 'multi_line' ? {
                columnNames: inputs['input_0'],
                nameColumn: inputs['input_1']
              } : plotType === 'scatter' ? {
                firstColumnName: inputs['input_0'],
                secondColumnName: inputs['input_1']
              } : plotType === '3d_scatter' ? {
                firstColumnName: inputs['input_0'],
                secondColumnName: inputs['input_1'],
                thirdColumnName: inputs['input_2']
              } : plotType === 'histogram' ? {
                columnName: inputs['input_0']
              } : plotType === 'box_plot' ? {
                columnNames: inputs['input_0'] ? inputs['input_0'].split(',').filter(Boolean) : []
              } : plotType === 'bar_histogram' ? {
                firstColumnName: inputs['input_0'],
                secondColumnName: inputs['input_1']
              } : plotType === '5d_scatter' ? {
                firstColumnName: inputs['input_0'],
                secondColumnName: inputs['input_1'],
                thirdColumnName: inputs['input_2'],
                fourthColumnName: inputs['input_3'],
                fifthColumnName: inputs['input_4']
              } : plotType === '3d_surface' ? {
                firstColumnName: inputs['input_0'],
                secondColumnName: inputs['input_1']
              } : plotType === 'pie_chart' ? {
                columnName: inputs['input_0']
              } : plotType === 'stacked_area_chart' ? {
                xAxisColumn: inputs['input_0'],
                yAxisColumns: inputs['input_1'] ? inputs['input_1'].split(',').filter(Boolean) : []
              } : plotType === 'radar' ? {
                columns: inputs['input_0'] ? inputs['input_0'].split(',').filter(Boolean) : []
              } : plotType === 'heatmap' ? {
                xColumn: inputs['input_0'],
                yColumn: inputs['input_1'],
                valueColumn: inputs['input_2']
              } : plotType === 'funnel' ? {
                labelColumn: inputs['input_0'],
                valueColumn: inputs['input_1']
              } : plotType === 'candlestick' ? {
                dateColumn: inputs['input_0'],
                openColumn: inputs['input_1'],
                closeColumn: inputs['input_2'],
                highColumn: inputs['input_3'],
                lowColumn: inputs['input_4']
              } : plotType === 'treemap' ? {
                labelColumn: inputs['input_0'],
                valueColumn: inputs['input_1'],
                categoryColumn: inputs['input_2'] || undefined
              } : plotType === 'gauge' ? {
                valueColumn: inputs['input_0']
              } : {
                columnNames: inputs['input_0'],
                xAxisName: inputs['input_1']
              })}
              {...Object.entries(inputs).reduce((acc, [key, value]) => {
                const inputIndex = key.split('_')[1];
                acc[`input${inputIndex}`] = value;
                return acc;
              }, {} as Record<string, string>)}
            />
          </div>
        )}
      </div>
    </Card>
  );
};

export default PlotCard;