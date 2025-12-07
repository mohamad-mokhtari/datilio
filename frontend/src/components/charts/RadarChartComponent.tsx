import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface RadarChartComponentProps {
  userId: string;
  fileId: string;
  columns: string[]; // Multiple columns for radar
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string;
  samplingConfig?: {
    max_points: number;
    sampling_method: 'systematic' | 'random';
    reason: string;
  };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

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

const RadarChartComponent: React.FC<RadarChartComponentProps> = ({
  userId,
  fileId,
  columns,
  visible_plot_extra_info,
  pythonCodeSnippet,
  samplingConfig,
  onSamplingMetadataReceived
}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Chart customization
  const [fillColor, setFillColor] = useState<string>('#4C51BF');
  const [showArea, setShowArea] = useState<boolean>(true);
  const [shape, setShape] = useState<'polygon' | 'circle'>('polygon');
  const [title, setTitle] = useState<string>('Radar Chart');
  const [legendPosition, setLegendPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      if (!userId || !fileId || !columns || columns.length < 3) {
        setError('At least 3 columns are required for radar chart');
        setIsLoading(false);
        return;
      }

      try {
        const response = pythonCodeSnippet && pythonCodeSnippet.trim() !== ''
          ? await ChartDataService.fetchFilteredChartData({
              file_id: fileId,
              python_code_snippet: pythonCodeSnippet,
              columns: columns,
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            })
          : await ChartDataService.fetchChartData({
              file_id: fileId,
              columns: columns,
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
        console.error('Error fetching radar chart data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, JSON.stringify(columns), pythonCodeSnippet]);

  const getOption = () => {
    if (!chartData || chartData.length === 0) return {};

    // Calculate max values for each dimension
    const maxValues = columns.map(col => {
      const values = chartData.map(row => parseFloat(row[col]) || 0);
      return Math.max(...values);
    });

    // Create indicator (axes) configuration
    const indicator = columns.map((col, index) => ({
      name: col,
      max: maxValues[index] * 1.2 // Add 20% padding
    }));

    // Prepare series data (take first 5 rows for comparison)
    const seriesData = chartData.slice(0, 5).map((row, index) => ({
      name: `Data ${index + 1}`,
      value: columns.map(col => parseFloat(row[col]) || 0),
      itemStyle: {
        color: colorOptions[index % colorOptions.length].value
      },
      areaStyle: showArea ? {
        opacity: 0.3
      } : undefined
    }));

    // Get legend configuration based on position
    const getLegendConfig = () => {
      const baseConfig = {
        data: seriesData.map(s => s.name)
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
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          let result = `<strong>${params.name}</strong><br/>`;
          params.value.forEach((val: number, idx: number) => {
            result += `${columns[idx]}: ${val.toFixed(2)}<br/>`;
          });
          return result;
        }
      },
      toolbox: {
        feature: {
          saveAsImage: {
            title: 'Download',
            name: 'radar_chart',
            backgroundColor: 'white'
          }
        },
        right: 20,
        top: 10
      },
      legend: getLegendConfig(),
      radar: {
        indicator: indicator,
        shape: shape,
        splitNumber: 5,
        name: {
          textStyle: {
            fontSize: 12,
            fontWeight: 'bold'
          }
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(114, 172, 209, 0.1)', 'rgba(114, 172, 209, 0.2)']
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(0, 0, 0, 0.2)'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0, 0, 0, 0.2)'
          }
        }
      },
      series: [{
        type: 'radar',
        data: seriesData,
        emphasis: {
          lineStyle: {
            width: 4
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">Radar Chart Configuration</h3>
          
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
            <div className="flex flex-col space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
              {/* Shape Control */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Radar Shape</label>
                <Select
                  value={{ value: shape, label: shape === 'polygon' ? 'Polygon' : 'Circle' }}
                  onChange={(option) => setShape(option?.value as 'polygon' | 'circle' || 'polygon')}
                  options={[
                    { value: 'polygon', label: 'Polygon' },
                    { value: 'circle', label: 'Circle' }
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

              {/* Show Area Toggle */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Show Area Fill</label>
                <div className="flex items-center">
                  <button
                    onClick={() => setShowArea(!showArea)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showArea ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showArea ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">{showArea ? 'On' : 'Off'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Dimensions:</strong> {columns.join(', ')} • 
              <strong> Showing:</strong> {Math.min(5, chartData.length)} data points
            </p>
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

export default RadarChartComponent;

