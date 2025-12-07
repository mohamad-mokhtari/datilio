// src/components/charts/StackedAreaChartComponent.tsx
import React, { useState, useMemo, useEffect } from "react";
import ReactECharts from 'echarts-for-react';
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface StackedAreaChartComponentProps {
  userId: string;
  fileId: string;
  xAxisColumn: string;
  yAxisColumns: string[];
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string; // Optional filter code snippet
  samplingConfig?: { max_points: number; sampling_method: 'systematic' | 'random'; reason: string };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

// BackendResponse interface is now handled by ChartDataService

const StackedAreaChartComponent: React.FC<StackedAreaChartComponentProps> = ({
  userId,
  fileId,
  xAxisColumn,
  yAxisColumns,
  visible_plot_extra_info,
  pythonCodeSnippet,
  samplingConfig,
  onSamplingMetadataReceived
}) => {
  // State for backend data
  const [backendData, setBackendData] = useState<Array<{ [key: string]: any }>>([]);
  const [xAxisLabel, setXAxisLabel] = useState<string>('');
  const [yAxisLabels, setYAxisLabels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('Stacked Area Chart');
  const [legendPosition, setLegendPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  
  // Create stable string from yAxisColumns array to use in dependency
  const yAxisColumnsKey = JSON.stringify(yAxisColumns);

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      // Validate required props
      if (!userId || !fileId || !xAxisColumn || !yAxisColumns || yAxisColumns.length === 0) {
        setError('Missing required parameters for stacked area chart generation');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching stacked area chart data with unified endpoint:', {
          file_id: fileId,
          columns: [xAxisColumn, ...yAxisColumns],
        });

        const response = pythonCodeSnippet && pythonCodeSnippet.trim() !== ''
          ? await ChartDataService.fetchFilteredChartData({
              file_id: fileId,
              python_code_snippet: pythonCodeSnippet,
              columns: [xAxisColumn, ...yAxisColumns],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            })
          : await ChartDataService.fetchChartData({
              file_id: fileId,
              columns: [xAxisColumn, ...yAxisColumns],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            });

        console.log('Stacked Area Chart unified data received:', response);
        
        if (onSamplingMetadataReceived && response.sampling) {
          onSamplingMetadataReceived(response.sampling);
        }

        if (response && response.data && Array.isArray(response.data)) {
          setBackendData(response.data);
          setXAxisLabel(xAxisColumn);
          setYAxisLabels(yAxisColumns);
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching stacked area chart data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load stacked area chart data. Please try again later.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, fileId, xAxisColumn, yAxisColumnsKey, pythonCodeSnippet]);

  // Transform data for ECharts
  const chartData = useMemo(() => {
    if (backendData.length === 0) return { xAxisData: [], seriesData: [] };

    // Get unique X-axis values
    const xAxisData = [...new Set(backendData.map(item => item[xAxisLabel]))];

    // Create series data for each Y-axis column
    const seriesData = yAxisLabels.map(yLabel => {
      const data = xAxisData.map(xValue => {
        const item = backendData.find(d => d[xAxisLabel] === xValue);
        return item ? (item[yLabel] || 0) : 0;
      });

      return {
        name: yLabel,
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        emphasis: {
          focus: 'series'
        },
        data: data
      };
    });

    return { xAxisData, seriesData };
  }, [backendData, xAxisLabel, yAxisLabels]);

  // Debug: Log data structure
  console.log('Stacked Area Chart Data:', {
    backendDataLength: backendData.length,
    xAxisData: chartData.xAxisData,
    seriesDataLength: chartData.seriesData.length,
    xAxisLabel,
    yAxisLabels
  });

  // Helper functions for legend positioning
  const getGridMargins = () => {
    switch (legendPosition) {
      case 'top':
        return { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true };
      case 'bottom':
        return { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true };
      case 'left':
        return { left: '15%', right: '4%', bottom: '3%', top: '5%', containLabel: true };
      case 'right':
        return { left: '3%', right: '15%', bottom: '3%', top: '5%', containLabel: true };
      default:
        return { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true };
    }
  };

  const getLegendConfig = () => {
    const baseConfig = {
      data: yAxisLabels,
      textStyle: { color: '#374151' }
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
        return { ...baseConfig, bottom: 0 };
    }
  };

  // Chart option
  const option = useMemo(() => {
    if (backendData.length === 0) {
      return {
        title: {
          text: 'No Data Available',
          left: 'center',
          textStyle: { color: '#374151' }
        }
      };
    }

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#374151'
        }
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
      toolbox: {
        feature: {
          saveAsImage: {}
        }
      },
      xAxis: [
        {
          type: 'category',
          boundaryGap: false,
          data: chartData.xAxisData,
          name: xAxisLabel,
          nameTextStyle: {
            color: '#374151'
          },
          axisLabel: {
            color: '#374151'
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: 'Value',
          nameTextStyle: {
            color: '#374151'
          },
          axisLabel: {
            color: '#374151'
          }
        }
      ],
      series: chartData.seriesData
    };
  }, [backendData, chartData, xAxisLabel, yAxisLabels, title, legendPosition]);

  // Add error boundary for chart rendering
  const [chartError, setChartError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-lg font-medium text-gray-500">Loading stacked area chart data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-lg font-medium text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (chartError) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-lg font-medium text-red-500">
            Chart Error: {chartError}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      {visible_plot_extra_info && (
        <div className="flex flex-col mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Stacked Area Chart Visualization</h3>

          {/* Data Information */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Data Information:</h4>
            <div className="text-xs text-blue-700">
              <p><strong>X Axis:</strong> {xAxisLabel}</p>
              <p><strong>Y Axes:</strong> {yAxisLabels.join(', ')}</p>
              <p><strong>Data Points:</strong> {backendData.length}</p>
              <p><strong>X Categories:</strong> {chartData.xAxisData.length}</p>
              <p><strong>Series:</strong> {chartData.seriesData.length}</p>
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

          {/* Legend Position */}
          <div className="w-full mb-4">
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
      )}
      <div className="datilito-chart border border-gray-200 rounded-lg p-4 bg-gray-50">
        <ReactECharts
          option={option}
          style={{ height: 500, width: '100%' }}
          opts={{ renderer: 'canvas' }}
          onEvents={{
            'error': (error: any) => {
              console.error('ECharts error:', error);
              setChartError('Failed to render chart. Please check the console for details.');
            }
          }}
        />
      </div>
    </div>
  );
};

export default StackedAreaChartComponent;
