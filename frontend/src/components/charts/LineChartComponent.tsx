import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface LineChartComponentProps {
  userId: string;
  fileId: string;
  firstColumnName: string;
  secondColumnName: string;
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string; // Optional filter code snippet
  // ✨ NEW: Sampling configuration
  samplingConfig?: {
    max_points: number;
    sampling_method: 'systematic' | 'random';
    reason: string;
  };
  // ✨ NEW: Callback for sampling metadata
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
];

const LineChartComponent: React.FC<LineChartComponentProps> = ({ 
  userId, 
  fileId, 
  firstColumnName, 
  secondColumnName, 
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
  const [lineColor, setLineColor] = useState<string>('#4C51BF');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('Line Chart');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      // Validate required props
      if (!userId || !fileId || !firstColumnName || !secondColumnName) {
        setError('Missing required parameters for chart generation');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching line chart data with unified endpoint:', {
          file_id: fileId,
          columns: [firstColumnName, secondColumnName],
        });

        const response = pythonCodeSnippet && pythonCodeSnippet.trim() !== ''
          ? await ChartDataService.fetchFilteredChartData({
              file_id: fileId,
              python_code_snippet: pythonCodeSnippet,
              columns: [firstColumnName, secondColumnName],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            })
          : await ChartDataService.fetchChartData({
              file_id: fileId,
              columns: [firstColumnName, secondColumnName],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            });

        console.log('Line chart unified data received:', response);

        if (response && response.data && Array.isArray(response.data)) {
          // Transform the unified data
          const transformedData = response.data.map(row => ({
            x: row[firstColumnName],
            y: row[secondColumnName]
          })).filter(point => 
            point.x !== null && point.x !== undefined && 
            point.y !== null && point.y !== undefined
          );

          console.log('Transformed line chart data:', transformedData);
          setChartData(transformedData);
          setOriginalData(transformedData);
          
          // ✨ NEW: Notify parent component about sampling metadata
          if (onSamplingMetadataReceived && response.sampling) {
            console.log('Sending sampling metadata to parent:', response.sampling);
            onSamplingMetadataReceived(response.sampling);
          }
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
  }, [userId, fileId, firstColumnName, secondColumnName, pythonCodeSnippet]);

  // Helper function to apply sorting to data
  const applySorting = (data: any[], sortOption: SortOption): any[] => {
    let sortedData = [...data];

    switch (sortOption.value) {
      case 'asc':
        sortedData.sort((a, b) => a.x - b.x);
        break;
      case 'desc':
        sortedData.sort((a, b) => b.x - a.x);
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
        processedData = processedData.filter(d => d.x !== null && d.y !== null);
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

  // Detect if x-axis should be categorical (for dates, times, or strings)
  const isXAxisCategorical = () => {
    if (chartData.length === 0) return false;
    
    // Get a sample value
    const sampleX = chartData[0]?.x;
    
    // Check if it's a string (including date/time strings)
    if (typeof sampleX === 'string') return true;
    
    // Check if it's a Date object
    if (sampleX instanceof Date) return true;
    
    // Otherwise assume numeric
    return false;
  };

  // ECharts option configuration
  const getChartOption = () => {
    const isCategorical = isXAxisCategorical();
    
    // For categorical data, extract x values as categories
    const xAxisData = isCategorical ? chartData.map(d => d.x) : undefined;
    
    // For categorical x-axis, series data should only contain y values
    // For numeric x-axis, series data should contain [x, y] pairs
    const seriesData = isCategorical 
      ? chartData.map(d => d.y)
      : chartData.map(d => [d.x, d.y]);

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
      grid: {
        left: '10%',
        right: '5%',
        bottom: '15%',
        top: '10%',
        containLabel: true
      },
      toolbox: {
        feature: {
          saveAsImage: {
            title: 'Download',
            name: `line_chart_${firstColumnName}_${secondColumnName}`,
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
        },
        formatter: (params: any) => {
          if (Array.isArray(params) && params.length > 0) {
            const point = params[0];
            if (isCategorical) {
              return `${firstColumnName}: ${point.name}<br/>${secondColumnName}: ${point.value}`;
            } else {
              return `${firstColumnName}: ${point.data[0]}<br/>${secondColumnName}: ${point.data[1]}`;
            }
          }
          return '';
        }
      },
      xAxis: {
        type: isCategorical ? 'category' : 'value',
        data: xAxisData, // Only used for categorical
        name: firstColumnName,
        nameLocation: 'middle',
        nameGap: isCategorical ? 60 : 30,
        nameTextStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        },
        axisLabel: isCategorical ? {
          rotate: 45,
          fontSize: 10
        } : undefined,
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
        name: secondColumnName,
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
      series: [{
        name: secondColumnName,
        type: 'line',
        data: seriesData,
        lineStyle: {
          color: lineColor,
          width: lineWidth
        },
        itemStyle: {
          color: lineColor
        },
        symbol: 'circle',
        symbolSize: 0,
        smooth: false,
        connectNulls: false
      }]
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">Line Chart Visualization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                X-Axis: <span className="font-semibold">{firstColumnName}</span>
              </label>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Y-Axis: <span className="font-semibold">{secondColumnName}</span>
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

            <div className="flex flex-col space-y-4 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
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

              {/* Line Color Control */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Line Color</label>
                <Select
                  value={colorOptions.find(option => option.value === lineColor)}
                  onChange={(option) => setLineColor(option?.value || '#4C51BF')}
                  options={colorOptions}
                  placeholder="Select Color"
                  className="text-sm"
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

export default LineChartComponent;
