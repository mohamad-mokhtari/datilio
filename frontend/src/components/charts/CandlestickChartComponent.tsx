import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface CandlestickChartComponentProps {
  userId: string;
  fileId: string;
  dateColumn: string; // Column for date/time/category
  openColumn: string; // Opening value
  closeColumn: string; // Closing value
  highColumn: string; // Highest value
  lowColumn: string; // Lowest value
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
  { value: 'classic', label: 'Classic (Red/Green)', upColor: '#00da3c', downColor: '#ec0000', upBorderColor: '#008f28', downBorderColor: '#8a0000' },
  { value: 'blue', label: 'Blue Theme', upColor: '#1890ff', downColor: '#ff4d4f', upBorderColor: '#096dd9', downBorderColor: '#cf1322' },
  { value: 'purple', label: 'Purple Theme', upColor: '#9254de', downColor: '#ff7a45', upBorderColor: '#531dab', downBorderColor: '#d4380d' },
];

const CandlestickChartComponent: React.FC<CandlestickChartComponentProps> = ({
  userId,
  fileId,
  dateColumn,
  openColumn,
  closeColumn,
  highColumn,
  lowColumn,
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
  const [showDataZoom, setShowDataZoom] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('Candlestick Chart');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      if (!userId || !fileId || !dateColumn || !openColumn || !closeColumn || !highColumn || !lowColumn) {
        setError('All columns (Date, Open, Close, High, Low) are required for candlestick chart');
        setIsLoading(false);
        return;
      }

      try {
        const response = pythonCodeSnippet && pythonCodeSnippet.trim() !== ''
          ? await ChartDataService.fetchFilteredChartData({
              file_id: fileId,
              python_code_snippet: pythonCodeSnippet,
              columns: [dateColumn, openColumn, closeColumn, highColumn, lowColumn],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            })
          : await ChartDataService.fetchChartData({
              file_id: fileId,
              columns: [dateColumn, openColumn, closeColumn, highColumn, lowColumn],
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
        console.error('Error fetching candlestick chart data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, dateColumn, openColumn, closeColumn, highColumn, lowColumn, pythonCodeSnippet]);

  const getOption = () => {
    if (!chartData || chartData.length === 0) return {};

    // Prepare data: [open, close, low, high]
    const candlestickData = chartData.map(row => [
      parseFloat(row[openColumn]) || 0,
      parseFloat(row[closeColumn]) || 0,
      parseFloat(row[lowColumn]) || 0,
      parseFloat(row[highColumn]) || 0
    ]);

    const categories = chartData.map(row => String(row[dateColumn]));

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
            name: 'candlestick_chart',
            backgroundColor: 'white'
          }
        },
        right: 20,
        top: 10
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params: any) => {
          const data = params[0];
          const [open, close, low, high] = data.data;
          return `
            <strong>${data.name}</strong><br/>
            Open: ${open.toFixed(2)}<br/>
            Close: ${close.toFixed(2)}<br/>
            Low: ${low.toFixed(2)}<br/>
            High: ${high.toFixed(2)}
          `;
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: showDataZoom ? '20%' : '10%',
        top: '15%'
      },
      xAxis: {
        type: 'category',
        data: categories,
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
        axisLabel: {
          fontSize: 11,
          rotate: categories.length > 20 ? 45 : 0
        }
      },
      yAxis: {
        scale: true,
        splitArea: {
          show: true
        },
        axisLabel: {
          fontSize: 11
        }
      },
      dataZoom: showDataZoom ? [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          show: true,
          type: 'slider',
          top: '90%',
          start: 0,
          end: 100
        }
      ] : [],
      series: [
        {
          type: 'candlestick',
          data: candlestickData,
          itemStyle: {
            color: colorScheme.upColor,
            color0: colorScheme.downColor,
            borderColor: colorScheme.upBorderColor,
            borderColor0: colorScheme.downBorderColor
          },
          emphasis: {
            itemStyle: {
              borderWidth: 2
            }
          }
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">Candlestick Chart Configuration</h3>
          
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

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-900">Date/Time</p>
              <p className="text-sm text-blue-700">{dateColumn}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-green-900">Open</p>
              <p className="text-sm text-green-700">{openColumn}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <p className="text-xs font-semibold text-purple-900">Close</p>
              <p className="text-sm text-purple-700">{closeColumn}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <p className="text-xs font-semibold text-orange-900">High</p>
              <p className="text-sm text-orange-700">{highColumn}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <p className="text-xs font-semibold text-red-900">Low</p>
              <p className="text-sm text-red-700">{lowColumn}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '38px',
                      borderColor: '#e2e8f0',
                    }),
                  }}
                />
              </div>

              {/* Show Data Zoom */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Enable Zoom/Pan</label>
                <div className="flex items-center">
                  <button
                    onClick={() => setShowDataZoom(!showDataZoom)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showDataZoom ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showDataZoom ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">{showDataZoom ? 'On' : 'Off'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="datilito-chart border border-gray-200 rounded-lg p-4 bg-gray-50">
        <ReactECharts
          option={getOption()}
          style={{ height: 450, width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
};

export default CandlestickChartComponent;

