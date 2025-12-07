// src/components/charts/SimpleBarChartComponent.tsx
import React, { useEffect, useState } from "react";
import ReactECharts from 'echarts-for-react';
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface SimpleBarChartComponentProps {
  userId: string;
  fileId: string;
  columnNames: string;
  xAxisName: string;
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string; // Optional filter code snippet
  samplingConfig?: { max_points: number; sampling_method: 'systematic' | 'random'; reason: string };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

type SortOption = {
  value: 'asc' | 'desc' | 'none';
  label: string;
};

const sortOptions: SortOption[] = [
  { value: 'none', label: 'Original Order' },
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

const SimpleBarChartComponent: React.FC<SimpleBarChartComponentProps> = ({ 
  userId, 
  fileId, 
  columnNames, 
  xAxisName, 
  visible_plot_extra_info, 
  pythonCodeSnippet, 
  samplingConfig, 
  onSamplingMetadataReceived 
}) => {
  const [data, setData] = useState<any[]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [sortType, setSortType] = useState<SortOption>(sortOptions[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('Bar Chart');
  const [legendPosition, setLegendPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');

  // Split the comma-separated list of column names
  const columnNamesArray = columnNames ? columnNames.split(',') : [];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Include x_axis_name in column_names array if it's not already included
        const allColumns = xAxisName && !columnNamesArray.includes(xAxisName)
          ? [...columnNamesArray, xAxisName]
          : columnNamesArray;

        console.log('Sending to unified backend:', {
          file_id: fileId,
          columns: allColumns,
        });

        const response = pythonCodeSnippet && pythonCodeSnippet.trim() !== ''
          ? await ChartDataService.fetchFilteredChartData({
              file_id: fileId,
              python_code_snippet: pythonCodeSnippet,
              columns: allColumns,
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            })
          : await ChartDataService.fetchChartData({
              file_id: fileId,
              columns: allColumns,
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            });

        console.log('Bar chart data received:', response);
        
        if (onSamplingMetadataReceived && response.sampling) {
          onSamplingMetadataReceived(response.sampling);
        }
        if (response && response.data) {
          console.log('Bar chart result data:', response.data);
          setData(response.data);
          setOriginalData(response.data);

          // Filter out the xAxisName column from the columns array since it's used for X-axis labels, not bars
          const barColumns = (response.columns || []).filter(col => col !== xAxisName);
          setColumns(barColumns);
          console.log('Bar columns (excluding X-axis):', barColumns);
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
        setError('Failed to load chart data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, columnNames, xAxisName, pythonCodeSnippet]);

  const handleSortChange = (selectedOption: SortOption | null) => {
    if (!selectedOption) return;
    setSortType(selectedOption);

    let sortedData = [...originalData];

    switch (selectedOption.value) {
      case 'asc':
        sortedData.sort((a, b) => {
          const aValue = a[xAxisName];
          const bValue = b[xAxisName];
          
          // Handle null/undefined
          if (aValue === null || aValue === undefined) return 1;
          if (bValue === null || bValue === undefined) return -1;
          
          // String comparison
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return aValue.localeCompare(bValue);
          }
          
          // Numeric comparison
          return Number(aValue) - Number(bValue);
        });
        break;
      case 'desc':
        sortedData.sort((a, b) => {
          const aValue = a[xAxisName];
          const bValue = b[xAxisName];
          
          // Handle null/undefined
          if (aValue === null || aValue === undefined) return 1;
          if (bValue === null || bValue === undefined) return -1;
          
          // String comparison
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return bValue.localeCompare(aValue);
          }
          
          // Numeric comparison
          return Number(bValue) - Number(aValue);
        });
        break;
      case 'none':
        sortedData = [...originalData];
        break;
    }

    setData(sortedData);
  };

  // Generate consistent colors for bars
  const getBarColors = (numColors: number) => {
    const colors = [
      '#4C51BF', '#ED64A6', '#38B2AC', '#4299E1', '#667EEA',
      '#9F7AEA', '#ED8936', '#48BB78', '#F56565', '#ECC94B'
    ];

    return Array(numColors).fill(0).map((_, i) => colors[i % colors.length]);
  };

  const barColors = getBarColors(columns.length);

  // ECharts option configuration
  const getChartOption = () => {
    // Get X-axis categories
    const xAxisData = data.map(d => d[xAxisName]);

    // Create series for each bar column
    const series = columns.map((col, index) => ({
      name: col,
      type: 'bar' as const,
      data: data.map(d => d[col]),
      itemStyle: {
        color: barColors[index],
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        itemStyle: {
          color: '#FFD700',
          borderColor: '#E74C3C',
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      }
    }));

    // Adjust grid margins based on legend position
    const getGridMargins = () => {
      switch (legendPosition) {
        case 'top':
          return { left: '10%', right: '5%', bottom: '20%', top: '20%', containLabel: true };
        case 'bottom':
          return { left: '10%', right: '5%', bottom: '25%', top: '10%', containLabel: true };
        case 'left':
          return { left: '20%', right: '5%', bottom: '20%', top: '10%', containLabel: true };
        case 'right':
          return { left: '10%', right: '20%', bottom: '20%', top: '10%', containLabel: true };
        default:
          return { left: '10%', right: '5%', bottom: '20%', top: '15%', containLabel: true };
      }
    };

    // Get legend configuration based on position
    const getLegendConfig = () => {
      const baseConfig = { data: columns };

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
      grid: getGridMargins(),
      toolbox: {
        feature: {
          saveAsImage: {
            title: 'Download',
            name: `bar_chart_${xAxisName}`,
            backgroundColor: 'white'
          }
        },
        right: 20,
        top: 10
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: getLegendConfig(),
      xAxis: {
        type: 'category',
        data: xAxisData,
        name: xAxisName || 'Categories',
        nameLocation: 'middle',
        nameGap: 60,
        nameTextStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        },
        axisLabel: {
          rotate: 45,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        name: 'Values',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      series: series
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">Bar Chart Visualization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Axis: <span className="font-semibold">{xAxisName}</span>
              </label>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bar Columns: <span className="font-semibold">{columns.join(', ')}</span>
              </label>
            </div>
          </div>
          {/* Debug Info */}
          {data.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Data Structure Preview:</h4>
              <div className="text-xs text-blue-700">
                <p><strong>Sample data point:</strong> {JSON.stringify(data[0], null, 2)}</p>
                <p><strong>Bar columns (for rendering):</strong> {columns.join(', ')}</p>
                <p><strong>X-axis column:</strong> {xAxisName || 'Not specified'}</p>
                <p><strong>Data length:</strong> {data.length} items</p>
                <p><strong>All data keys:</strong> {Object.keys(data[0] || {}).join(', ')}</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort Data</label>
            <Select
              value={sortType}
              onChange={(option) => handleSortChange(option as SortOption)}
              options={sortOptions}
              placeholder="Sort Categories"
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

export default SimpleBarChartComponent;
