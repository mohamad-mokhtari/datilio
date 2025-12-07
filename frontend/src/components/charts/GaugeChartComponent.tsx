import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface GaugeChartComponentProps {
  userId: string;
  fileId: string;
  valueColumn: string; // Column with the metric value
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string;
  samplingConfig?: {
    max_points: number;
    sampling_method: 'systematic' | 'random';
    reason: string;
  };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

const colorThemes = [
  { value: 'default', label: 'Default (Green-Yellow-Red)', colors: [[0.2, '#5cb85c'], [0.8, '#f0ad4e'], [1, '#d9534f']] },
  { value: 'blue', label: 'Blue Scale', colors: [[0.2, '#91d5ff'], [0.8, '#1890ff'], [1, '#0050b3']] },
  { value: 'green', label: 'Green Scale', colors: [[0.2, '#b7eb8f'], [0.8, '#52c41a'], [1, '#237804']] },
  { value: 'purple', label: 'Purple Scale', colors: [[0.2, '#d3adf7'], [0.8, '#9254de'], [1, '#531dab']] },
  { value: 'orange', label: 'Orange Scale', colors: [[0.2, '#ffd591'], [0.8, '#fa8c16'], [1, '#ad4e00']] },
];

const GaugeChartComponent: React.FC<GaugeChartComponentProps> = ({
  userId,
  fileId,
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
  const [colorTheme, setColorTheme] = useState(colorThemes[0]);
  const [minValue, setMinValue] = useState<number>(0);
  const [maxValue, setMaxValue] = useState<number>(100);
  const [showDetail, setShowDetail] = useState<boolean>(true);
  const [gaugeTitle, setGaugeTitle] = useState<string>('Metric');
  const [title, setTitle] = useState<string>('Gauge Chart');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      if (!userId || !fileId || !valueColumn) {
        setError('Missing required parameters for gauge chart');
        setIsLoading(false);
        return;
      }

      try {
        const response = pythonCodeSnippet && pythonCodeSnippet.trim() !== ''
          ? await ChartDataService.fetchFilteredChartData({
              file_id: fileId,
              python_code_snippet: pythonCodeSnippet,
              columns: [valueColumn],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            })
          : await ChartDataService.fetchChartData({
              file_id: fileId,
              columns: [valueColumn],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            });

        if (response && response.data && Array.isArray(response.data)) {
          setChartData(response.data);
          
          // Auto-calculate min/max if data exists
          if (response.data.length > 0) {
            const values = response.data.map(row => parseFloat(row[valueColumn]) || 0);
            const dataMin = Math.min(...values);
            const dataMax = Math.max(...values);
            setMinValue(Math.floor(dataMin * 0.9)); // 10% below minimum
            setMaxValue(Math.ceil(dataMax * 1.1)); // 10% above maximum
          }
          
          if (onSamplingMetadataReceived && response.sampling) {
            onSamplingMetadataReceived(response.sampling);
          }
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching gauge chart data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, valueColumn, pythonCodeSnippet]);

  const getOption = () => {
    if (!chartData || chartData.length === 0) return {};

    // Use the latest value or average
    const value = chartData.length > 0 
      ? parseFloat(chartData[chartData.length - 1][valueColumn]) || 0
      : 0;

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
      toolbox: {
        feature: {
          saveAsImage: {
            title: 'Download',
            name: 'gauge_chart',
            backgroundColor: 'white'
          }
        },
        right: 20,
        top: 10
      },
      series: [
        {
          type: 'gauge',
          min: minValue,
          max: maxValue,
          startAngle: 200,
          endAngle: -20,
          splitNumber: 10,
          itemStyle: {
            color: '#1890ff'
          },
          progress: {
            show: true,
            width: 18
          },
          pointer: {
            length: '70%',
            width: 6,
            offsetCenter: [0, '5%']
          },
          axisLine: {
            lineStyle: {
              width: 18,
              color: colorTheme.colors
            }
          },
          axisTick: {
            distance: -20,
            splitNumber: 5,
            lineStyle: {
              width: 2,
              color: '#999'
            }
          },
          splitLine: {
            distance: -25,
            length: 12,
            lineStyle: {
              width: 3,
              color: '#999'
            }
          },
          axisLabel: {
            distance: -35,
            color: '#666',
            fontSize: 14,
            formatter: (value: number) => {
              if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'k';
              }
              return value.toFixed(0);
            }
          },
          anchor: {
            show: true,
            showAbove: true,
            size: 18,
            itemStyle: {
              borderWidth: 8,
              borderColor: '#1890ff'
            }
          },
          title: {
            show: true,
            offsetCenter: [0, '80%'],
            fontSize: 16,
            fontWeight: 'bold',
            color: '#464646'
          },
          detail: {
            show: showDetail,
            valueAnimation: true,
            offsetCenter: [0, '50%'],
            fontSize: 32,
            fontWeight: 'bold',
            color: 'auto',
            formatter: (value: number) => {
              return value.toFixed(2);
            }
          },
          data: [
            {
              value: value,
              name: gaugeTitle
            }
          ]
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

  const currentValue = chartData.length > 0 
    ? parseFloat(chartData[chartData.length - 1][valueColumn]) || 0
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      {visible_plot_extra_info && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Gauge Chart Configuration</h3>
          
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

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
            <p className="text-sm text-blue-900">
              <strong>Metric:</strong> {valueColumn} • 
              <strong> Current Value:</strong> {currentValue.toLocaleString()} •
              <strong> Range:</strong> {minValue} - {maxValue}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Chart Customization</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gauge Title */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Gauge Title</label>
                <input
                  type="text"
                  value={gaugeTitle}
                  onChange={(e) => setGaugeTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter gauge title"
                />
              </div>

              {/* Color Theme */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Theme</label>
                <Select
                  value={colorTheme}
                  onChange={(option) => setColorTheme(option || colorThemes[0])}
                  options={colorThemes}
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

              {/* Min Value */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Value</label>
                <input
                  type="number"
                  value={minValue}
                  onChange={(e) => setMinValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Max Value */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Value</label>
                <input
                  type="number"
                  value={maxValue}
                  onChange={(e) => setMaxValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Show Detail */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Show Value</label>
                <div className="flex items-center">
                  <button
                    onClick={() => setShowDetail(!showDetail)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showDetail ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showDetail ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">{showDetail ? 'On' : 'Off'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="datilito-chart border border-gray-200 rounded-lg p-4 bg-gray-50">
        <ReactECharts
          option={getOption()}
          style={{ height: 400, width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
};

export default GaugeChartComponent;

