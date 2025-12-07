import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface FunnelChartComponentProps {
  userId: string;
  fileId: string;
  labelColumn: string; // Column for stage names
  valueColumn: string; // Column for values
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string;
  samplingConfig?: {
    max_points: number;
    sampling_method: 'systematic' | 'random';
    reason: string;
  };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

const colorSchemes = [
  { value: 'gradient', label: 'Gradient (Blue)', colors: ['#5470c6', '#91cc75', '#fac858', '#ee6666'] },
  { value: 'warm', label: 'Warm (Red-Orange)', colors: ['#e15b64', '#f47373', '#f8b500', '#ffd700'] },
  { value: 'cool', label: 'Cool (Blue-Green)', colors: ['#1e88e5', '#26c6da', '#66bb6a', '#9ccc65'] },
  { value: 'purple', label: 'Purple Gradient', colors: ['#9c27b0', '#ba68c8', '#ce93d8', '#e1bee7'] },
  { value: 'rainbow', label: 'Rainbow', colors: ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0'] },
];

const sortOptions = [
  { value: 'descending', label: 'Descending (Largest First)' },
  { value: 'ascending', label: 'Ascending (Smallest First)' },
  { value: 'none', label: 'Original Order' },
];

const FunnelChartComponent: React.FC<FunnelChartComponentProps> = ({
  userId,
  fileId,
  labelColumn,
  valueColumn,
  visible_plot_extra_info,
  pythonCodeSnippet,
  samplingConfig,
  onSamplingMetadataReceived
}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Chart customization
  const [colorScheme, setColorScheme] = useState(colorSchemes[0]);
  const [sortType, setSortType] = useState(sortOptions[0]);
  const [showLabel, setShowLabel] = useState<boolean>(true);
  const [showPercentage, setShowPercentage] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('Funnel Chart');
  const [legendPosition, setLegendPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      if (!userId || !fileId || !labelColumn || !valueColumn) {
        setError('Missing required parameters for funnel chart');
        setIsLoading(false);
        return;
      }

      try {
        const response = pythonCodeSnippet && pythonCodeSnippet.trim() !== ''
          ? await ChartDataService.fetchFilteredChartData({
              file_id: fileId,
              python_code_snippet: pythonCodeSnippet,
              columns: [labelColumn, valueColumn],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            })
          : await ChartDataService.fetchChartData({
              file_id: fileId,
              columns: [labelColumn, valueColumn],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            });

        if (response && response.data && Array.isArray(response.data)) {
          setChartData(response.data);
          
          if (onSamplingMetadataReceived && response.sampling) {
            onSamplingMetadataReceived(response.sampling);
          }
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching funnel chart data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, labelColumn, valueColumn, pythonCodeSnippet]);

  const getOption = () => {
    if (!chartData || chartData.length === 0) return {};

    // Prepare data
    let funnelData = chartData.map(row => ({
      name: String(row[labelColumn]),
      value: parseFloat(row[valueColumn]) || 0
    }));

    // Apply sorting
    if (sortType.value === 'descending') {
      funnelData = funnelData.sort((a, b) => b.value - a.value);
    } else if (sortType.value === 'ascending') {
      funnelData = funnelData.sort((a, b) => a.value - b.value);
    }

    // Calculate total for percentage
    const total = funnelData.reduce((sum, item) => sum + item.value, 0);

    // Get legend configuration based on position
    const getLegendConfig = () => {
      const baseConfig = {
        data: funnelData.map(d => d.name)
      };

      switch (legendPosition) {
        case 'top':
          return { ...baseConfig, top: 10, left: 'center' };
        case 'bottom':
          return { ...baseConfig, bottom: 10, left: 'center' };
        case 'left':
          return { ...baseConfig, left: 10, top: 'center', orient: 'vertical' as const };
        case 'right':
          return { ...baseConfig, right: 10, top: 'center', orient: 'vertical' as const };
        default:
          return { ...baseConfig, bottom: 10 };
      }
    };

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      toolbox: {
        feature: {
          saveAsImage: {
            title: 'Download',
            name: 'funnel_chart',
            backgroundColor: 'white'
          }
        },
        right: 20,
        top: 10
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const percentage = ((params.value / total) * 100).toFixed(2);
          return `<strong>${params.name}</strong><br/>Value: ${params.value.toLocaleString()}<br/>Percentage: ${percentage}%`;
        }
      },
      legend: getLegendConfig(),
      color: colorScheme.colors,
      series: [
        {
          name: valueColumn,
          type: 'funnel',
          left: '10%',
          top: 60,
          bottom: 60,
          width: '80%',
          min: 0,
          max: Math.max(...funnelData.map(d => d.value)),
          minSize: '0%',
          maxSize: '100%',
          sort: sortType.value,
          gap: 2,
          label: {
            show: showLabel,
            position: 'inside',
            formatter: (params: any) => {
              if (showPercentage) {
                const percentage = ((params.value / total) * 100).toFixed(1);
                return `${params.name}\n${percentage}%`;
              }
              return `${params.name}\n${params.value.toLocaleString()}`;
            },
            fontSize: 14,
            color: '#fff',
            fontWeight: 'bold'
          },
          labelLine: {
            length: 10,
            lineStyle: {
              width: 1,
              type: 'solid'
            }
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1
          },
          emphasis: {
            label: {
              fontSize: 16
            }
          },
          data: funnelData
        }
      ]
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
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Funnel Chart Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900">Label Column</p>
              <p className="text-sm text-blue-700">{labelColumn}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-sm font-semibold text-green-900">Value Column</p>
              <p className="text-sm text-green-700">{valueColumn}</p>
            </div>
          </div>

          {/* Chart Title */}
          <div className="w-full mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chart Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter chart title"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Chart Customization</h4>
            <div className="flex flex-col space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
              {/* Color Scheme */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
                <Select
                  value={colorScheme}
                  onChange={(option) => setColorScheme(option || colorSchemes[0])}
                  options={colorSchemes}
                  className="text-sm"
                  formatOptionLabel={(option) => (
                    <div className="flex items-center">
                      <div className="flex space-x-1 mr-2">
                        {option.colors.slice(0, 4).map((color, idx) => (
                          <div
                            key={idx}
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      {option.label}
                    </div>
                  )}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '38px',
                      borderColor: '#e2e8f0',
                    }),
                  }}
                />
              </div>

              {/* Sort Order */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
                <Select
                  value={sortType}
                  onChange={(option) => setSortType(option || sortOptions[0])}
                  options={sortOptions}
                  className="text-sm"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '38px',
                      borderColor: '#e2e8f0',
                    }),
                  }}
                />
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
                    }),
                  }}
                />
              </div>

              {/* Show Labels */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Show Labels</label>
                <div className="flex items-center">
                  <button
                    onClick={() => setShowLabel(!showLabel)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showLabel ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showLabel ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">{showLabel ? 'On' : 'Off'}</span>
                </div>
              </div>

              {/* Show Percentage */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Show as Percentage</label>
                <div className="flex items-center">
                  <button
                    onClick={() => setShowPercentage(!showPercentage)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showPercentage ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showPercentage ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">{showPercentage ? 'On' : 'Off'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="datilito-chart border border-gray-200 rounded-lg p-4 bg-gray-50">
        <ReactECharts
          option={getOption()}
          style={{ height: 500, width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
};

export default FunnelChartComponent;

