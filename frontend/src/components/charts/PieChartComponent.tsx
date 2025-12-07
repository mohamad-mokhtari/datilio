// src/components/charts/PieChartComponent.tsx
import React, { useState, useMemo, useEffect } from "react";
import ReactECharts from 'echarts-for-react';
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface PieChartComponentProps {
  userId: string;
  fileId: string;
  columnName: string;
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string; // Optional filter code snippet
  samplingConfig?: { max_points: number; sampling_method: 'systematic' | 'random'; reason: string };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

interface PieChartData {
  value: number;
  name: string;
}

// BackendResponse interface is now handled by ChartDataService

const PieChartComponent: React.FC<PieChartComponentProps> = ({
  userId,
  fileId,
  columnName,
  visible_plot_extra_info,
  pythonCodeSnippet,
  samplingConfig,
  onSamplingMetadataReceived
}) => {
  // State for backend data
  const [pieData, setPieData] = useState<PieChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('Pie Chart');
  const [legendPosition, setLegendPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      // Validate required props
      if (!userId || !fileId || !columnName) {
        setError('Missing required parameters for pie chart generation');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching pie chart data with unified endpoint:', {
          file_id: fileId,
          columns: [columnName],
        });

        const response = pythonCodeSnippet && pythonCodeSnippet.trim() !== ''
          ? await ChartDataService.fetchFilteredChartData({
              file_id: fileId,
              python_code_snippet: pythonCodeSnippet,
              columns: [columnName],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            })
          : await ChartDataService.fetchChartData({
              file_id: fileId,
              columns: [columnName],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            });

        console.log('Pie Chart unified data received:', response);
        
        if (onSamplingMetadataReceived && response.sampling) {
          onSamplingMetadataReceived(response.sampling);
        }

        if (response && response.data && Array.isArray(response.data)) {
          // Transform unified data to pie chart format
          // Count occurrences of each value in the column
          const valueCounts: { [key: string]: number } = {};
          response.data.forEach(row => {
            const value = row[columnName];
            if (value !== null && value !== undefined) {
              const key = String(value);
              valueCounts[key] = (valueCounts[key] || 0) + 1;
            }
          });

          // Convert to pie chart format
          const pieChartData: PieChartData[] = Object.entries(valueCounts).map(([name, value]) => ({
            name,
            value
          }));

          setPieData(pieChartData);
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching pie chart data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load pie chart data. Please try again later.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, columnName, pythonCodeSnippet]);

  // Debug: Log data structure
  console.log('Pie Chart Data:', {
    pieDataLength: pieData.length,
    sampleData: pieData[0],
    columnName
  });

  // Helper function for legend positioning
  const getLegendConfig = () => {
    const baseConfig = {
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
        return { ...baseConfig, top: '5%', left: 'center' };
    }
  };

  // Chart option
  const option = useMemo(() => {
    if (pieData.length === 0) {
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
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: getLegendConfig(),
      toolbox: {
        feature: {
          saveAsImage: {}
        }
      },
      series: [
        {
          name: columnName,
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: 'bold',
              color: '#374151'
            }
          },
          labelLine: {
            show: false
          },
          data: pieData
        }
      ]
    };
  }, [pieData, columnName, title, legendPosition]);

  // Add error boundary for chart rendering
  const [chartError, setChartError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-lg font-medium text-gray-500">Loading pie chart data...</div>
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">Pie Chart Visualization</h3>

          {/* Data Information */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Data Information:</h4>
            <div className="text-xs text-blue-700">
              <p><strong>Column:</strong> {columnName}</p>
              <p><strong>Categories:</strong> {pieData.length} unique values</p>
              <p><strong>Total Count:</strong> {pieData.reduce((sum, item) => sum + item.value, 0)}</p>
              <p><strong>Categories:</strong></p>
              <ul className="ml-4 list-disc">
                {pieData.map((item, index) => (
                  <li key={index}>{item.name}: {item.value} ({((item.value / pieData.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(1)}%)</li>
                ))}
              </ul>
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

export default PieChartComponent;
