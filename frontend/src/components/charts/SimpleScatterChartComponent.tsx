// src/components/charts/SimpleScatterChartComponent.tsx
import React, { useEffect, useState } from "react";
import ReactECharts from 'echarts-for-react';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface SimpleScatterChartComponentProps {
  userId: string;
  fileId: string;
  firstColumnName: string;
  secondColumnName: string;
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string; // Optional filter code snippet
  samplingConfig?: {
    max_points: number;
    sampling_method: 'systematic' | 'random';
    reason: string;
  };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

const SimpleScatterChartComponent: React.FC<SimpleScatterChartComponentProps> = ({
  userId,
  fileId,
  firstColumnName,
  secondColumnName,
  visible_plot_extra_info,
  pythonCodeSnippet,
  samplingConfig,
  onSamplingMetadataReceived
}) => {
  const [data, setData] = useState<{ x: number; y: number }[]>([]);
  const [xLabel, setXLabel] = useState<string>('');
  const [yLabel, setYLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('Scatter Plot');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      // Validate required props
      if (!userId || !fileId || !firstColumnName || !secondColumnName) {
        setError('Missing required parameters for scatter chart generation');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching scatter chart data with unified endpoint:', {
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

        console.log('Scatter chart unified data received:', response);

        if (response && response.data && Array.isArray(response.data)) {
          // Transform the unified data
          const scatterData = response.data.map(row => ({
            x: row[firstColumnName],
            y: row[secondColumnName]
          })).filter(point => 
            point.x !== null && point.x !== undefined && 
            point.y !== null && point.y !== undefined
          );

          setData(scatterData);
          setXLabel(firstColumnName);
          setYLabel(secondColumnName);
          
          if (onSamplingMetadataReceived && response.sampling) {
            onSamplingMetadataReceived(response.sampling);
          }
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching scatter chart data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load scatter chart data. Please try again later.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, firstColumnName, secondColumnName, pythonCodeSnippet]);

  // ECharts option configuration
  const getChartOption = () => {
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
            name: `scatter_chart_${xLabel}_${yLabel}`,
            backgroundColor: 'white'
          }
        },
        right: 20,
        top: 10
      },
      tooltip: {
        trigger: 'item',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params: any) => {
          const data = params.data;
          return `${xLabel}: ${data[0]}<br/>${yLabel}: ${data[1]}`;
        }
      },
      xAxis: {
        type: 'value',
        name: xLabel,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#e2e8f0',
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: yLabel,
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#e2e8f0',
            type: 'dashed'
          }
        }
      },
      series: [{
        name: `${xLabel} vs ${yLabel}`,
        type: 'scatter',
        data: data.map(d => [d.x, d.y]),
        itemStyle: {
          color: '#8884d8'
        },
        symbolSize: 8,
        emphasis: {
          itemStyle: {
            color: '#FFD700',
            borderColor: '#E74C3C',
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }]
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-lg font-medium text-gray-500">Loading scatter chart data...</div>
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

  if (!data || data.length === 0) {
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">Scatter Plot Visualization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                X-Axis: <span className="font-semibold">{xLabel}</span>
              </label>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Y-Axis: <span className="font-semibold">{yLabel}</span>
              </label>
            </div>
          </div>

          {/* Debug Info */}
          {data.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Data Structure Preview:</h4>
              <div className="text-xs text-blue-700">
                <p><strong>Sample data point:</strong> {JSON.stringify(data[0], null, 2)}</p>
                <p><strong>Data length:</strong> {data.length} points</p>
                <p><strong>X-axis label:</strong> {xLabel}</p>
                <p><strong>Y-axis label:</strong> {yLabel}</p>
              </div>
            </div>
          )}

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

export default SimpleScatterChartComponent;
