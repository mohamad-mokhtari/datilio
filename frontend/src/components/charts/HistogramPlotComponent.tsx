// src/components/charts/HistogramPlotComponent.tsx
import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface HistogramPlotComponentProps {
  userId: string;
  fileId: string;
  columnName: string;
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string; // Optional filter code snippet
  samplingConfig?: { max_points: number; sampling_method: 'systematic' | 'random'; reason: string };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

interface HistogramData {
  bin: number;
  count: number;
}

const HistogramPlotComponent: React.FC<HistogramPlotComponentProps> = ({
  userId,
  fileId,
  columnName,
  visible_plot_extra_info,
  pythonCodeSnippet,
  samplingConfig,
  onSamplingMetadataReceived
}) => {
  const [data, setData] = useState<HistogramData[]>([]);
  const [columnLabel, setColumnLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart customization controls
  const [bins, setBins] = useState<number>(10);
  const [fillColor, setFillColor] = useState<string>('#3B82F6');
  const [title, setTitle] = useState<string>('Histogram');

  const binOptions = [
    { value: 5, label: '5 bins' },
    { value: 10, label: '10 bins' },
    { value: 15, label: '15 bins' },
    { value: 20, label: '20 bins' },
    { value: 25, label: '25 bins' },
    { value: 30, label: '30 bins' },
  ];

  const colorOptions = [
    { value: '#3B82F6', label: 'Blue', color: '#3B82F6' },
    { value: '#10B981', label: 'Green', color: '#10B981' },
    { value: '#F59E0B', label: 'Yellow', color: '#F59E0B' },
    { value: '#EF4444', label: 'Red', color: '#EF4444' },
    { value: '#8B5CF6', label: 'Purple', color: '#8B5CF6' },
    { value: '#06B6D4', label: 'Cyan', color: '#06B6D4' },
    { value: '#F97316', label: 'Orange', color: '#F97316' },
    { value: '#84CC16', label: 'Lime', color: '#84CC16' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      // Validate required props
      if (!userId || !fileId || !columnName) {
        setError('Missing required parameters for histogram generation');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching histogram data with unified endpoint:', {
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

        console.log('Histogram unified data received:', response);
        
        if (onSamplingMetadataReceived && response.sampling) {
          onSamplingMetadataReceived(response.sampling);
        }

        if (response && response.data && Array.isArray(response.data)) {
          // Create histogram data from the unified response
          const values = response.data
            .map(row => row[columnName])
            .filter(val => val !== null && val !== undefined)
            .map(val => Number(val))
            .filter(val => !isNaN(val));

          if (values.length === 0) {
            throw new Error('No valid numeric data found in the column');
          }

          // Calculate histogram bins
          const min = Math.min(...values);
          const max = Math.max(...values);
          const binWidth = (max - min) / bins;
          
          const histogramData: HistogramData[] = [];
          for (let i = 0; i < bins; i++) {
            const binStart = min + i * binWidth;
            const binEnd = min + (i + 1) * binWidth;
            const count = values.filter(val => val >= binStart && (i === bins - 1 ? val <= binEnd : val < binEnd)).length;
            
            histogramData.push({
              bin: Number(((binStart + binEnd) / 2).toFixed(2)),
              count
            });
          }

          setData(histogramData);
          setColumnLabel(columnName);
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching histogram data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load histogram data. Please try again later.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, columnName, bins, pythonCodeSnippet]);

  // Transform data for ECharts - this will update when data changes
  const histogramData = data.map(item => ({
    name: item.bin.toFixed(2),
    value: item.count
  }));

  // Create chart option that updates when data, columnLabel, or fillColor changes
  const option = React.useMemo(() => ({
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
        type: 'shadow'
      },
      formatter: function (params: any) {
        const data = params[0];
        return `Bin: ${data.name}<br/>Count: ${data.value}`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    toolbox: {
      feature: {
        saveAsImage: {}
      }
    },
    xAxis: {
      type: "category",
      data: histogramData.map(item => item.name),
      name: columnLabel,
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: {
        color: '#6B7280',
        rotate: 45
      },
      axisLine: {
        lineStyle: {
          color: '#D1D5DB'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: 'Frequency',
      nameLocation: 'middle',
      nameGap: 50,
      axisLabel: {
        color: '#6B7280'
      },
      axisLine: {
        lineStyle: {
          color: '#D1D5DB'
        }
      }
    },
    series: {
      type: "bar",
      data: histogramData,
      itemStyle: {
        color: fillColor,
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        itemStyle: {
          color: fillColor,
          opacity: 0.8
        }
      }
    }
  }), [histogramData, columnLabel, fillColor]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-lg font-medium text-gray-500">Loading histogram data...</div>
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">Histogram Visualization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Column: <span className="font-semibold">{columnLabel}</span>
              </label>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bins: <span className="font-semibold">{bins}</span>
              </label>
            </div>
          </div>

          {/* Debug Info */}
          {data.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Data Structure Preview:</h4>
              <div className="text-xs text-blue-700">
                <p><strong>Sample data point:</strong> {JSON.stringify(data[0], null, 2)}</p>
                <p><strong>Data length:</strong> {data.length} bins</p>
                <p><strong>Column:</strong> {columnLabel}</p>
                <p><strong>Total data points:</strong> {data.reduce((sum, item) => sum + item.count, 0)}</p>
              </div>
            </div>
          )}

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

            <div className="flex flex-col space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              {/* Number of Bins */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Bins</label>
                <Select
                  value={binOptions.find(option => option.value === bins)}
                  onChange={(option) => setBins(option?.value || 10)}
                  options={binOptions}
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

              {/* Fill Color */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Bar Color</label>
                <Select
                  value={colorOptions.find(option => option.value === fillColor)}
                  onChange={(option) => setFillColor(option?.value || '#3B82F6')}
                  options={colorOptions}
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
            </div>
          </div>
        </div>
      )}
      <div className="datilito-chart border border-gray-200 rounded-lg p-4 bg-gray-50">
        <ReactECharts
          option={option}
          style={{ height: 400, width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
};

export default HistogramPlotComponent;
