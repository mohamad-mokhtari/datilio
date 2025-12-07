import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface MultiLineChartComponentProps {
  userId: string;
  fileId: string;
  columnNames: string; // comma-separated numeric columns
  nameColumn: string; // name column for grouping
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string; // Optional filter code snippet
  samplingConfig?: { max_points: number; sampling_method: 'systematic' | 'random'; reason: string };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

type SortOption = {
  value: 'asc' | 'desc' | 'none';
  label: string;
};

type NullHandlingOption = {
  value: 'keep' | 'interpolate' | 'median' | 'mean' | 'mode' | 'remove';
  label: string;
};

const sortOptions: SortOption[] = [
  { value: 'none', label: 'Original Order' },
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

const nullHandlingOptions: NullHandlingOption[] = [
  { value: 'keep', label: 'Keep Nulls' },
  { value: 'remove', label: 'Remove Nulls' },
];

const colorOptions = [
  { value: '#4C51BF', label: 'Indigo', color: '#4C51BF' },
  { value: '#DC2626', label: 'Red', color: '#DC2626' },
  { value: '#059669', label: 'Green', color: '#059669' },
  { value: '#D97706', label: 'Orange', color: '#D97706' },
  { value: '#7C3AED', label: 'Purple', color: '#7C3AED' },
  { value: '#0891B2', label: 'Cyan', color: '#0891B2' },
  { value: '#BE185D', label: 'Pink', color: '#BE185D' },
  { value: '#65A30D', label: 'Lime', color: '#65A30D' },
  { value: '#F59E0B', label: 'Amber', color: '#F59E0B' },
  { value: '#EF4444', label: 'Rose', color: '#EF4444' },
];

const MultiLineChartComponent: React.FC<MultiLineChartComponentProps> = ({
  userId,
  fileId,
  columnNames,
  nameColumn,
  visible_plot_extra_info,
  pythonCodeSnippet,
  samplingConfig,
  onSamplingMetadataReceived
}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [sortType, setSortType] = useState<SortOption>(sortOptions[0]);
  const [nullHandlingType, setNullHandlingType] = useState<NullHandlingOption>(nullHandlingOptions[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart customization controls
  const [lineWidth, setLineWidth] = useState<number>(2);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [lineColors, setLineColors] = useState<{ [key: string]: string }>({});
  const [visibleLines, setVisibleLines] = useState<{ [key: string]: boolean }>({});
  const [connectNulls, setConnectNulls] = useState<boolean>(false);
  const [dashedLines, setDashedLines] = useState<{ [key: string]: boolean }>({});
  const [title, setTitle] = useState<string>('Multi-Line Chart');
  const [legendPosition, setLegendPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');

  // Reference line controls
  const [showReferenceLines, setShowReferenceLines] = useState<boolean>(false);
  const [referenceXValue, setReferenceXValue] = useState<string>('');
  const [referenceYValue, setReferenceYValue] = useState<string>('');
  const [referenceXLabel, setReferenceXLabel] = useState<string>('Reference X');
  const [referenceYLabel, setReferenceYLabel] = useState<string>('Reference Y');

  // Parse column names
  const numericColumns = columnNames ? columnNames.split(',').map(col => col.trim()) : [];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      // Validate required props
      if (!userId || !fileId || !columnNames || !nameColumn) {
        setError('Missing required parameters for chart generation');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching multi-line chart data with unified endpoint:', {
          file_id: fileId,
          columns: [nameColumn, ...numericColumns],
        });

        const response = pythonCodeSnippet && pythonCodeSnippet.trim() !== ''
          ? await ChartDataService.fetchFilteredChartData({
              file_id: fileId,
              python_code_snippet: pythonCodeSnippet,
              columns: [nameColumn, ...numericColumns],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            })
          : await ChartDataService.fetchChartData({
              file_id: fileId,
              columns: [nameColumn, ...numericColumns],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            });

        console.log('Multi-line chart unified data received:', response);
        
        if (onSamplingMetadataReceived && response.sampling) {
          onSamplingMetadataReceived(response.sampling);
        }

        if (response && response.data && Array.isArray(response.data)) {
          setChartData(response.data);
          setOriginalData(response.data);

          // Initialize colors for each numeric column
          const initialColors: { [key: string]: string } = {};
          const initialVisibility: { [key: string]: boolean } = {};
          const initialDashed: { [key: string]: boolean } = {};
          numericColumns.forEach((col, index) => {
            initialColors[col] = colorOptions[index % colorOptions.length].value;
            initialVisibility[col] = true; // All lines visible by default
            initialDashed[col] = false; // All lines solid by default
          });
          setLineColors(initialColors);
          setVisibleLines(initialVisibility);
          setDashedLines(initialDashed);
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load chart data. Please try again later.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, columnNames, nameColumn, pythonCodeSnippet]);

  // Helper function to apply sorting to data
  const applySorting = (data: any[], sortOption: SortOption): any[] => {
    let sortedData = [...data];

    switch (sortOption.value) {
      case 'asc':
        sortedData.sort((a, b) => {
          const aVal = a[nameColumn] || '';
          const bVal = b[nameColumn] || '';
          return aVal.toString().localeCompare(bVal.toString());
        });
        break;
      case 'desc':
        sortedData.sort((a, b) => {
          const aVal = a[nameColumn] || '';
          const bVal = b[nameColumn] || '';
          return bVal.toString().localeCompare(aVal.toString());
        });
        break;
      case 'none':
        // Keep original order
        break;
    }

    return sortedData;
  };

  // Helper function to apply null handling to data
  const applyNullHandling = (data: any[], nullOption: NullHandlingOption): any[] => {
    let processedData = [...data];

    switch (nullOption.value) {
      case 'keep':
        // Keep all data
        break;
      case 'remove':
        processedData = processedData.filter(d => {
          // Check if any of the numeric columns have null values
          return numericColumns.every(col => d[col] !== null && d[col] !== undefined);
        });
        break;
    }

    return processedData;
  };

  // Apply both null handling and sorting
  const updateChartData = (nullOption: NullHandlingOption, sortOption: SortOption) => {
    // First apply null handling
    let processedData = applyNullHandling(originalData, nullOption);
    // Then apply sorting
    processedData = applySorting(processedData, sortOption);
    setChartData(processedData);
  };

  const handleSortChange = (selectedOption: SortOption | null) => {
    if (!selectedOption) return;
    setSortType(selectedOption);
    updateChartData(nullHandlingType, selectedOption);
  };

  const handleNullHandlingChange = (selectedOption: NullHandlingOption | null) => {
    if (!selectedOption) return;
    setNullHandlingType(selectedOption);
    updateChartData(selectedOption, sortType);
  };

  const handleColorChange = (columnName: string, color: string) => {
    setLineColors(prev => ({
      ...prev,
      [columnName]: color
    }));
  };

  const handleLineVisibilityChange = (columnName: string, isVisible: boolean) => {
    setVisibleLines(prev => ({
      ...prev,
      [columnName]: isVisible
    }));
  };

  const handleDashedLineChange = (columnName: string, isDashed: boolean) => {
    setDashedLines(prev => ({
      ...prev,
      [columnName]: isDashed
    }));
  };

  // ECharts option configuration
  const getChartOption = () => {
    // Get X-axis categories
    const xAxisData = chartData.map(d => d[nameColumn]);

    // Prepare markLine data for reference lines
    const markLineData: any[] = [];
    if (showReferenceLines) {
      if (referenceYValue) {
        markLineData.push({
          yAxis: parseFloat(referenceYValue),
          name: referenceYLabel,
          label: {
            formatter: referenceYLabel
          },
          lineStyle: {
            color: 'red',
            type: 'dashed'
          }
        });
      }
      if (referenceXValue) {
        markLineData.push({
          xAxis: referenceXValue,
          name: referenceXLabel,
          label: {
            formatter: referenceXLabel
          },
          lineStyle: {
            color: 'red',
            type: 'dashed'
          }
        });
      }
    }

    // Create series for each numeric column
    const series = numericColumns
      .filter(col => visibleLines[col])
      .map((col, index) => {
        const baseSeries: any = {
          name: col,
          type: 'line' as const,
          data: chartData.map(d => d[col]),
          lineStyle: {
            color: lineColors[col] || colorOptions[0].value,
            width: lineWidth,
            type: dashedLines[col] ? 'dashed' as const : 'solid' as const
          },
          itemStyle: {
            color: lineColors[col] || colorOptions[0].value
          },
          symbol: 'circle',
          symbolSize: 0,
          connectNulls: connectNulls,
          smooth: false
        };

        // Add markLine to the first series
        if (index === 0 && markLineData.length > 0) {
          baseSeries.markLine = {
            data: markLineData,
            symbol: 'none',
            label: {
              position: 'end',
              formatter: '{b}'
            }
          };
        }

        return baseSeries;
      });

    // Adjust grid margins based on legend position
    const getGridMargins = () => {
      switch (legendPosition) {
        case 'top':
          return { left: '10%', right: '5%', bottom: '20%', top: '20%', containLabel: true };
        case 'bottom':
          return { left: '10%', right: '5%', bottom: '25%', top: '10%', containLabel: true };
        case 'left':
          return { left: '20%', right: '5%', bottom: '20%', top: '10%', containLabel: true };
        case 'right':
          return { left: '10%', right: '20%', bottom: '20%', top: '10%', containLabel: true };
        default:
          return { left: '10%', right: '5%', bottom: '20%', top: '15%', containLabel: true };
      }
    };

    // Get legend configuration based on position
    const getLegendConfig = () => {
      const baseConfig = {
        data: numericColumns.filter(col => visibleLines[col])
      };

      switch (legendPosition) {
        case 'top':
          return { ...baseConfig, top: '5%', left: 'center' };
        case 'bottom':
          return { ...baseConfig, bottom: '5%', left: 'center' };
        case 'left':
          return { ...baseConfig, left: '2%', top: 'center', orient: 'vertical' as const };
        case 'right':
          return { ...baseConfig, right: '2%', top: 'center', orient: 'vertical' as const };
        default:
          return { ...baseConfig, top: '5%', left: 'center' };
      }
    };

    return {
      title: {
        text: title,
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#374151'
        }
      },
      grid: getGridMargins(),
      toolbox: {
        feature: {
          saveAsImage: {
            title: 'Download',
            name: `multi_line_chart_${nameColumn}`,
            backgroundColor: 'white'
          }
        },
        right: 20,
        top: 10
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        }
      },
      legend: getLegendConfig(),
      xAxis: {
        type: 'category',
        data: xAxisData,
        name: nameColumn,
        nameLocation: 'middle',
        nameGap: 60,
        nameTextStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        },
        axisLabel: {
          rotate: 45,
          fontSize: 10
        },
        splitLine: {
          show: showGrid,
          lineStyle: {
            color: '#e2e8f0',
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: 'Values',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        },
        splitLine: {
          show: showGrid,
          lineStyle: {
            color: '#e2e8f0',
            type: 'dashed'
          }
        }
      },
      series: series
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-lg font-medium text-gray-500">Loading chart data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-lg font-medium text-red-500">{error}</div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-lg font-medium text-gray-500">No data available to display</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      {visible_plot_extra_info && (
        <div className="flex flex-col mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Multi-Line Chart Visualization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                X-Axis: <span className="font-semibold">{nameColumn}</span>
              </label>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Y-Axis: <span className="font-semibold">{numericColumns.join(', ')}</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort Data</label>
              <Select
                value={sortType}
                onChange={(option) => handleSortChange(option as SortOption)}
                options={sortOptions}
                placeholder="Sort X Values"
                className="text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '38px',
                    borderColor: '#e2e8f0',
                    boxShadow: 'none',
                    '&:hover': {
                      borderColor: '#cbd5e0',
                    },
                  }),
                  menu: (provided) => ({
                    ...provided,
                    zIndex: 9999,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  }),
                }}
              />
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Handle Null Values</label>
              <Select
                value={nullHandlingType}
                onChange={(option) => handleNullHandlingChange(option as NullHandlingOption)}
                options={nullHandlingOptions}
                placeholder="Handle Nulls"
                className="text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '38px',
                    borderColor: '#e2e8f0',
                    boxShadow: 'none',
                    '&:hover': {
                      borderColor: '#cbd5e0',
                    },
                  }),
                  menu: (provided) => ({
                    ...provided,
                    zIndex: 9999,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  }),
                }}
              />
            </div>
          </div>

          {/* Chart Customization Controls */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Chart Customization</h4>
            
            {/* Chart Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Chart Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter chart title"
              />
            </div>

            <div className="flex flex-col space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0 mb-4">
              {/* Line Width Control */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Line Width: {lineWidth}px
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={lineWidth}
                  onChange={(e) => {
                    const newWidth = Number(e.target.value);
                    setLineWidth(newWidth);
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #4C51BF 0%, #4C51BF ${((lineWidth - 1) / 4) * 100}%, #e5e7eb ${((lineWidth - 1) / 4) * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>

              {/* Grid Toggle */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Show Grid</label>
                <div className="flex items-center">
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${showGrid ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showGrid ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">
                    {showGrid ? 'On' : 'Off'}
                  </span>
                </div>
              </div>

              {/* Legend Position */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Legend Position</label>
                <Select
                  value={{ value: legendPosition, label: legendPosition.charAt(0).toUpperCase() + legendPosition.slice(1) }}
                  onChange={(option) => setLegendPosition(option?.value as 'top' | 'bottom' | 'left' | 'right')}
                  options={[
                    { value: 'top', label: 'Top' },
                    { value: 'bottom', label: 'Bottom' },
                    { value: 'left', label: 'Left' },
                    { value: 'right', label: 'Right' }
                  ]}
                  className="text-sm"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '38px',
                      borderColor: '#e2e8f0',
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: '#cbd5e0',
                      },
                    }),
                    menu: (provided) => ({
                      ...provided,
                      zIndex: 9999,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    }),
                  }}
                />
              </div>
            </div>

            {/* Connect Nulls */}
            <div className="mt-4">
              <h5 className="text-md font-semibold text-gray-700 mb-3">Connect Nulls</h5>
              <div className="flex items-center">
                <button
                  onClick={() => setConnectNulls(!connectNulls)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${connectNulls ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${connectNulls ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">Connect null values</p>
                  <p className="text-xs text-gray-500">Draw lines through missing data points</p>
                </div>
              </div>
            </div>

            {/* Line Visibility */}
            <div className="mt-4">
              <h5 className="text-md font-semibold text-gray-700 mb-3">Show/Hide Lines</h5>
              <div className="flex flex-col space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                {numericColumns.map((columnName) => (
                  <div key={columnName} className="flex items-center space-x-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`visibility-${columnName}`}
                        checked={visibleLines[columnName] || false}
                        onChange={(e) => handleLineVisibilityChange(columnName, e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`visibility-${columnName}`} className="ml-2 text-sm font-medium text-gray-700">
                        {columnName}
                      </label>
                    </div>
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: lineColors[columnName] || '#4C51BF' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Dashed Lines */}
            <div className="mt-4">
              <h5 className="text-md font-semibold text-gray-700 mb-3">Dashed Lines</h5>
              <div className="flex flex-col space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                {numericColumns.map((columnName) => (
                  <div key={columnName} className="flex items-center space-x-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`dashed-${columnName}`}
                        checked={dashedLines[columnName] || false}
                        onChange={(e) => handleDashedLineChange(columnName, e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`dashed-${columnName}`} className="ml-2 text-sm font-medium text-gray-700">
                        {columnName}
                      </label>
                    </div>
                    <div
                      className="w-4 h-4 border border-gray-300 flex-shrink-0"
                      style={{
                        backgroundColor: lineColors[columnName] || '#4C51BF',
                        borderStyle: dashedLines[columnName] ? 'dashed' : 'solid'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Reference Lines */}
            <div className="mt-4">
              <h5 className="text-md font-semibold text-gray-700 mb-3">Reference Lines</h5>
              <div className="space-y-4">
                {/* Enable Reference Lines Toggle */}
                <div className="flex items-center">
                  <button
                    onClick={() => setShowReferenceLines(!showReferenceLines)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${showReferenceLines ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showReferenceLines ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700">Show reference lines</p>
                    <p className="text-xs text-gray-500">Add vertical and horizontal reference lines</p>
                  </div>
                </div>

                {/* Reference Line Controls */}
                {showReferenceLines && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-gray-200">
                    {/* X-Axis Reference Line */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">X-Axis Reference</label>
                      <input
                        type="text"
                        value={referenceXValue}
                        onChange={(e) => setReferenceXValue(e.target.value)}
                        placeholder="Enter X value"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                      <input
                        type="text"
                        value={referenceXLabel}
                        onChange={(e) => setReferenceXLabel(e.target.value)}
                        placeholder="Label"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                    </div>

                    {/* Y-Axis Reference Line */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Y-Axis Reference</label>
                      <input
                        type="number"
                        value={referenceYValue}
                        onChange={(e) => setReferenceYValue(e.target.value)}
                        placeholder="Enter Y value"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                      <input
                        type="text"
                        value={referenceYLabel}
                        onChange={(e) => setReferenceYLabel(e.target.value)}
                        placeholder="Label"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Line Colors */}
            <div className="mt-4">
              <h5 className="text-md font-semibold text-gray-700 mb-3">Line Colors</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {numericColumns.map((columnName) => (
                  <div key={columnName} className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700 min-w-0 flex-shrink-0">
                      {columnName}:
                    </label>
                    <Select
                      value={colorOptions.find(option => option.value === lineColors[columnName])}
                      onChange={(option) => handleColorChange(columnName, option?.value || '#4C51BF')}
                      options={colorOptions}
                      className="text-sm flex-1"
                      formatOptionLabel={(option) => (
                        <div className="flex items-center">
                          <div
                            className="w-4 h-4 rounded-full mr-2 border border-gray-300"
                            style={{ backgroundColor: option.color }}
                          />
                          {option.label}
                        </div>
                      )}
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '32px',
                          borderColor: '#e2e8f0',
                          boxShadow: 'none',
                          '&:hover': {
                            borderColor: '#cbd5e0',
                          },
                        }),
                        menu: (provided) => ({
                          ...provided,
                          zIndex: 9999,
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        }),
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="datilito-chart border border-gray-200 rounded-lg p-4 bg-gray-50">
        <ReactECharts
          option={getChartOption()}
          style={{ height: '400px', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>
    </div>
  );
};

export default MultiLineChartComponent;
