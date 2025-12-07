import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface HeatmapChartComponentProps {
  userId: string;
  fileId: string;
  xColumn: string;
  yColumn: string;
  valueColumn: string;
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
  { value: 'viridis', label: 'Viridis (Blue-Green-Yellow)', colors: ['#440154', '#31688e', '#35b779', '#fde724'] },
  { value: 'heat', label: 'Heat (Blue-Red)', colors: ['#313695', '#4575b4', '#abd9e9', '#fee090', '#f46d43', '#a50026'] },
  { value: 'cool', label: 'Cool (Green-Blue)', colors: ['#4575b4', '#91bfdb', '#e0f3f8', '#fee090', '#fc8d59', '#d73027'] },
  { value: 'red', label: 'Red Scale', colors: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#de2d26'] },
  { value: 'green', label: 'Green Scale', colors: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#238b45'] },
  { value: 'blue', label: 'Blue Scale', colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#2171b5'] },
];

const HeatmapChartComponent: React.FC<HeatmapChartComponentProps> = ({
  userId,
  fileId,
  xColumn,
  yColumn,
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
  const [showLabel, setShowLabel] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('Heatmap');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      if (!userId || !fileId || !xColumn || !yColumn || !valueColumn) {
        setError('Missing required parameters for heatmap');
        setIsLoading(false);
        return;
      }

      try {
        const response = pythonCodeSnippet && pythonCodeSnippet.trim() !== ''
          ? await ChartDataService.fetchFilteredChartData({
              file_id: fileId,
              python_code_snippet: pythonCodeSnippet,
              columns: [xColumn, yColumn, valueColumn],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            })
          : await ChartDataService.fetchChartData({
              file_id: fileId,
              columns: [xColumn, yColumn, valueColumn],
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
        console.error('Error fetching heatmap data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, xColumn, yColumn, valueColumn, pythonCodeSnippet]);

  const getOption = () => {
    if (!chartData || chartData.length === 0) return {};

    // Get unique values for x and y axes
    const xValues = [...new Set(chartData.map(row => row[xColumn]))].sort();
    const yValues = [...new Set(chartData.map(row => row[yColumn]))].sort();

    // Create data matrix [xIndex, yIndex, value]
    const heatmapData = chartData.map(row => {
      const xIndex = xValues.indexOf(row[xColumn]);
      const yIndex = yValues.indexOf(row[yColumn]);
      const value = parseFloat(row[valueColumn]) || 0;
      return [xIndex, yIndex, value];
    });

    // Get min and max values for color scale
    const values = heatmapData.map(d => d[2]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

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
            name: 'heatmap',
            backgroundColor: 'white'
          }
        },
        right: 20,
        top: 10
      },
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const [xIdx, yIdx, value] = params.data;
          return `${xColumn}: ${xValues[xIdx]}<br/>${yColumn}: ${yValues[yIdx]}<br/>${valueColumn}: ${value.toFixed(2)}`;
        }
      },
      grid: {
        height: '60%',
        top: '15%',
        left: '15%'
      },
      xAxis: {
        type: 'category',
        data: xValues,
        splitArea: {
          show: true
        },
        axisLabel: {
          fontSize: 11,
          rotate: xValues.length > 10 ? 45 : 0
        },
        name: xColumn,
        nameLocation: 'middle',
        nameGap: xValues.length > 10 ? 50 : 30,
        nameTextStyle: {
          fontWeight: 'bold',
          fontSize: 13
        }
      },
      yAxis: {
        type: 'category',
        data: yValues,
        splitArea: {
          show: true
        },
        axisLabel: {
          fontSize: 11
        },
        name: yColumn,
        nameLocation: 'middle',
        nameGap: 60,
        nameTextStyle: {
          fontWeight: 'bold',
          fontSize: 13
        }
      },
      visualMap: {
        min: minValue,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '5%',
        inRange: {
          color: colorScheme.colors
        },
        text: ['High', 'Low'],
        textStyle: {
          fontSize: 12
        }
      },
      series: [{
        name: valueColumn,
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: showLabel,
          fontSize: 10,
          formatter: (params: any) => params.data[2].toFixed(1)
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
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
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Heatmap Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900">X-Axis</p>
              <p className="text-sm text-blue-700">{xColumn}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-sm font-semibold text-green-900">Y-Axis</p>
              <p className="text-sm text-green-700">{yColumn}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <p className="text-sm font-semibold text-purple-900">Value</p>
              <p className="text-sm text-purple-700">{valueColumn}</p>
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

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Chart Customization</h4>
            <div className="flex flex-col space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
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

              {/* Show Labels Toggle */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Show Value Labels</label>
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

export default HeatmapChartComponent;

