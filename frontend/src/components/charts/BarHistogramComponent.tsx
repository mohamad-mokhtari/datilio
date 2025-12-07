// src/components/charts/BarHistogramComponent.tsx
import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from 'echarts';
import * as ecStat from 'echarts-stat';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface BarHistogramComponentProps {
  userId: string;
  fileId: string;
  firstColumnName: string;
  secondColumnName: string;
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string; // Optional filter code snippet
  samplingConfig?: { max_points: number; sampling_method: 'systematic' | 'random'; reason: string };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

interface BarHistogramData {
  data: number[];
  column_name: string;
}

const BarHistogramComponent: React.FC<BarHistogramComponentProps> = ({
  userId,
  fileId,
  firstColumnName,
  secondColumnName,
  visible_plot_extra_info,
  pythonCodeSnippet,
  samplingConfig,
  onSamplingMetadataReceived
}) => {
  const [data, setData] = useState<BarHistogramData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('Bar Histogram');

  // Register ecStat transform
  useEffect(() => {
    echarts.registerTransform(ecStat.transform.histogram);
  }, []);

  // Fetch data when component mounts with valid props (triggered by PlotCard "Generate Chart")
  useEffect(() => {
    const fetchDataOnMount = async () => {
      setIsLoading(true);
      setError(null);

      // Validate required props
      if (!userId || !fileId || !firstColumnName || !secondColumnName) {
        setError('Missing required parameters for bar histogram generation');
        setIsLoading(false);
        return;
      }

      // Validate exactly 2 columns
      if (firstColumnName === secondColumnName) {
        setError('Please select two different columns for bar histogram');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching bar histogram data with params:', {
          user_id: userId,
          file_id: fileId,
          column_names: [firstColumnName, secondColumnName],
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

        console.log('Bar Histogram API Response:', response);
        
        if (onSamplingMetadataReceived && response.sampling) {
          onSamplingMetadataReceived(response.sampling);
        }

        if (response && response.data && Array.isArray(response.data)) {
          // Transform unified data to bar histogram format
          const firstColumnData = response.data.map(row => row[firstColumnName]).filter(val => val !== null && val !== undefined);
          const secondColumnData = response.data.map(row => row[secondColumnName]).filter(val => val !== null && val !== undefined);

          const barHistogramData: BarHistogramData[] = [
            {
              data: firstColumnData,
              column_name: firstColumnName
            },
            {
              data: secondColumnData,
              column_name: secondColumnName
            }
          ];

          console.log('Bar Histogram data transformed:', barHistogramData);
          setData(barHistogramData);
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching bar histogram data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load bar histogram data. Please try again later.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataOnMount();
  }, [userId, fileId, firstColumnName, secondColumnName, pythonCodeSnippet]);

  // Transform data to 2D source format for histogram
  const sourceData = React.useMemo(() => {
    if (data.length !== 2) return [];

    const firstColumnData = data.find(group => group.column_name === firstColumnName)?.data || [];
    const secondColumnData = data.find(group => group.column_name === secondColumnName)?.data || [];

    // Create 2D array: [[x1, y1], [x2, y2], ...]
    const maxLength = Math.max(firstColumnData.length, secondColumnData.length);
    const source: number[][] = [];

    for (let i = 0; i < maxLength; i++) {
      const x = firstColumnData[i] || 0;
      const y = secondColumnData[i] || 0;
      source.push([x, y]);
    }

    return source;
  }, [data, firstColumnName, secondColumnName]);

  // Create chart option that updates when data changes
  const option = React.useMemo(() => {
    if (sourceData.length === 0) {
      return {
        title: {
          text: 'No Data Available',
          left: 'center',
          textStyle: { color: '#6B7280' }
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
      dataset: [
        {
          source: sourceData
        },
        {
          transform: {
            type: 'ecStat:histogram',
            config: {}
          }
        },
        {
          transform: {
            type: 'ecStat:histogram',
            config: { dimensions: [1] }
          }
        }
      ],
      tooltip: {
        trigger: 'item',
        formatter: function (params: any) {
          if (params.seriesName === 'original scatter') {
            return `${firstColumnName}: ${params.data[0]}<br/>${secondColumnName}: ${params.data[1]}`;
          } else if (params.seriesName === 'histogram') {
            return `Range: ${params.data[0]}<br/>Count: ${params.data[1]}`;
          }
          return '';
        }
      },
      grid: [
        {
          top: '50%',
          right: '50%'
        },
        {
          bottom: '52%',
          right: '50%'
        },
        {
          top: '50%',
          left: '52%'
        }
      ],
      toolbox: {
        feature: {
          saveAsImage: {}
        }
      },
      xAxis: [
        {
          scale: true,
          gridIndex: 0,
          name: firstColumnName,
          nameLocation: 'middle',
          nameGap: 30,
          axisLabel: { color: '#6B7280' },
          axisLine: { lineStyle: { color: '#D1D5DB' } }
        },
        {
          type: 'category',
          scale: true,
          axisTick: { show: false },
          axisLabel: { show: false },
          axisLine: { show: false },
          gridIndex: 1
        },
        {
          scale: true,
          gridIndex: 2,
          name: firstColumnName,
          nameLocation: 'middle',
          nameGap: 30,
          axisLabel: { color: '#6B7280' },
          axisLine: { lineStyle: { color: '#D1D5DB' } }
        }
      ],
      yAxis: [
        {
          gridIndex: 0,
          name: secondColumnName,
          nameLocation: 'middle',
          nameGap: 50,
          axisLabel: { color: '#6B7280' },
          axisLine: { lineStyle: { color: '#D1D5DB' } }
        },
        {
          gridIndex: 1,
          name: 'Frequency',
          nameLocation: 'middle',
          nameGap: 30,
          axisLabel: { color: '#6B7280' },
          axisLine: { lineStyle: { color: '#D1D5DB' } }
        },
        {
          type: 'category',
          axisTick: { show: false },
          axisLabel: { show: false },
          axisLine: { show: false },
          gridIndex: 2
        }
      ],
      series: [
        {
          name: 'original scatter',
          type: 'scatter',
          xAxisIndex: 0,
          yAxisIndex: 0,
          encode: { tooltip: [0, 1] },
          datasetIndex: 0,
          itemStyle: {
            color: '#3B82F6',
            opacity: 0.6
          },
          symbolSize: 4
        },
        {
          name: 'histogram',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          barWidth: '99.3%',
          label: {
            show: true,
            position: 'top',
            fontSize: 10
          },
          encode: { x: 0, y: 1, itemName: 4 },
          datasetIndex: 1,
          itemStyle: {
            color: '#10B981',
            borderRadius: [2, 2, 0, 0]
          }
        },
        {
          name: 'histogram',
          type: 'bar',
          xAxisIndex: 2,
          yAxisIndex: 2,
          barWidth: '99.3%',
          label: {
            show: true,
            position: 'right',
            fontSize: 10
          },
          encode: { x: 1, y: 0, itemName: 4 },
          datasetIndex: 2,
          itemStyle: {
            color: '#F59E0B',
            borderRadius: [0, 2, 2, 0]
          }
        }
      ]
    };
  }, [sourceData, firstColumnName, secondColumnName]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-lg font-medium text-gray-500">Loading bar histogram data...</div>
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      {visible_plot_extra_info && (
        <div className="flex flex-col mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">2D Bar Histogram Visualization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Column: <span className="font-semibold">{firstColumnName}</span>
              </label>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Second Column: <span className="font-semibold">{secondColumnName}</span>
              </label>
            </div>
          </div>

          {/* Debug Info */}
          {data.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Data Structure Preview:</h4>
              <div className="text-xs text-blue-700">
                <p><strong>First column ({firstColumnName}):</strong> {data.find(g => g.column_name === firstColumnName)?.data.length || 0} values</p>
                <p><strong>Second column ({secondColumnName}):</strong> {data.find(g => g.column_name === secondColumnName)?.data.length || 0} values</p>
                <p><strong>Total data points:</strong> {sourceData.length}</p>
                <p><strong>Sample data:</strong> {JSON.stringify(sourceData.slice(0, 3), null, 2)}</p>
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
          option={option}
          style={{ height: 600, width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
};

export default BarHistogramComponent;
