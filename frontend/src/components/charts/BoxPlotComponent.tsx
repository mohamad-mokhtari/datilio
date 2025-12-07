// src/components/charts/BoxPlotComponent.tsx
import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface BoxPlotComponentProps {
  userId: string;
  fileId: string;
  columnNames: string[];
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string; // Optional filter code snippet
  samplingConfig?: { max_points: number; sampling_method: 'systematic' | 'random'; reason: string };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

interface BoxPlotData {
  data: number[];
  column_name: string;
}

const BoxPlotComponent: React.FC<BoxPlotComponentProps> = ({
  userId,
  fileId,
  columnNames,
  visible_plot_extra_info,
  pythonCodeSnippet,
  samplingConfig,
  onSamplingMetadataReceived
}) => {
  const [data, setData] = useState<BoxPlotData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Create stable string from columnNames array to use in dependency
  const columnNamesKey = JSON.stringify(columnNames);

  // Fetch data when component mounts with valid props (triggered by PlotCard "Generate Chart")
  useEffect(() => {
    const fetchDataOnMount = async () => {
      setIsLoading(true);
      setError(null);

      // Validate required props
      if (!userId || !fileId || !columnNames || !Array.isArray(columnNames) || columnNames.length === 0) {
        setError('Missing required parameters for box plot generation');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching box plot data with unified endpoint:', {
          file_id: fileId,
          columns: columnNames,
        });

        const response = pythonCodeSnippet && pythonCodeSnippet.trim() !== ''
          ? await ChartDataService.fetchFilteredChartData({
              file_id: fileId,
              python_code_snippet: pythonCodeSnippet,
              columns: columnNames,
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            })
          : await ChartDataService.fetchChartData({
              file_id: fileId,
              columns: columnNames,
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            });

        console.log('Box Plot unified data received:', response);
        
        if (onSamplingMetadataReceived && response.sampling) {
          onSamplingMetadataReceived(response.sampling);
        }

        if (response && response.data && Array.isArray(response.data)) {
          // Transform unified data to box plot format
          const boxPlotData: BoxPlotData[] = columnNames.map(columnName => {
            const columnData = response.data
              .map(row => row[columnName])
              .filter(val => val !== null && val !== undefined)
              .map(val => Number(val))
              .filter(val => !isNaN(val));

            return {
              data: columnData,
              column_name: columnName
            };
          });

          setData(boxPlotData);
          setHasGenerated(true);
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching box plot data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load box plot data. Please try again later.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, fileId, columnNamesKey, pythonCodeSnippet]);

  // Chart customization controls
  const [boxColor, setBoxColor] = useState<string>('#3B82F6');
  const [outlierColor, setOutlierColor] = useState<string>('#EF4444');
  const [showOutliers, setShowOutliers] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [boxWidth, setBoxWidth] = useState<number>(50);
  const [title, setTitle] = useState<string>('Box Plot Visualization');

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

  const boxWidthOptions = [
    { value: 30, label: 'Narrow (30%)' },
    { value: 50, label: 'Medium (50%)' },
    { value: 70, label: 'Wide (70%)' },
    { value: 90, label: 'Very Wide (90%)' },
  ];


  // Transform data for ECharts dataset format
  const columnLabels = data.map(group => group.column_name);
  const sourceData = data.map(group => group.data);

  // Create chart option that updates when data or customization options change
  const option = React.useMemo(() => {
    return {
      title: [
        {
          text: title,
          left: 'center',
          textStyle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#374151'
          }
        },
        {
          text: 'upper: Q3 + 1.5 * IQR \nlower: Q1 - 1.5 * IQR',
          borderColor: '#999',
          borderWidth: 1,
          textStyle: {
            fontWeight: 'normal',
            fontSize: 14,
            lineHeight: 20,
            color: '#6B7280'
          },
          left: '10%',
          top: '90%'
        }
      ],
      dataset: [
        {
          source: sourceData
        },
        {
          transform: {
            type: 'boxplot',
            config: {
              itemNameFormatter: (params: any) => {
                const index = params.value;
                return columnLabels[index] || `Column ${index + 1}`;
              }
            }
          }
        },
        {
          fromDatasetIndex: 1,
          fromTransformResult: 1
        }
      ],
      tooltip: {
        trigger: 'item',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function (params: any) {
          if (params.seriesName === 'boxplot') {
            const data = params.data;
            const columnName = columnLabels[data[0]] || `Column ${data[0] + 1}`;
            return `
              <div style="padding: 8px;">
                <strong style="color: #374151; font-size: 14px;">${columnName}</strong><br/>
                <div style="margin-top: 4px; font-size: 12px; color: #6B7280;">
                  <div><strong>Min:</strong> ${data[1]}</div>
                  <div><strong>Q1:</strong> ${data[2]}</div>
                  <div><strong>Median:</strong> ${data[3]}</div>
                  <div><strong>Q3:</strong> ${data[4]}</div>
                  <div><strong>Max:</strong> ${data[5]}</div>
                </div>
              </div>
            `;
          } else if (params.seriesName === 'outlier') {
            const data = params.data;
            const columnName = columnLabels[data[0]] || `Column ${data[0] + 1}`;
            return `
              <div style="padding: 8px;">
                <strong style="color: #374151; font-size: 14px;">${columnName}</strong><br/>
                <div style="margin-top: 4px; font-size: 12px; color: #6B7280;">
                  <strong>Outlier:</strong> ${data[1]}
                </div>
              </div>
            `;
          }
          return '';
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%'
      },
      toolbox: {
        feature: {
          saveAsImage: {}
        }
      },
      xAxis: {
        type: 'category',
        boundaryGap: true,
        nameGap: 30,
        axisLabel: {
          color: '#6B7280',
          rotate: 45
        },
        axisLine: {
          lineStyle: {
            color: '#D1D5DB'
          }
        },
        splitArea: {
          show: false
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: 'Values',
        nameLocation: 'middle',
        nameGap: 50,
        axisLabel: {
          color: '#6B7280'
        },
        axisLine: {
          lineStyle: {
            color: '#D1D5DB'
          }
        },
        splitArea: {
          show: showGrid
        },
        splitLine: {
          show: showGrid,
          lineStyle: {
            color: '#E5E7EB'
          }
        }
      },
      series: [
        {
          name: 'boxplot',
          type: 'boxplot',
          datasetIndex: 1,
          itemStyle: {
            color: boxColor,
            borderColor: boxColor,
            borderWidth: 2
          },
          boxWidth: `${boxWidth}%`,
          emphasis: {
            itemStyle: {
              color: boxColor,
              borderColor: boxColor,
              borderWidth: 3
            }
          }
        },
        ...(showOutliers ? [{
          name: 'outlier',
          type: 'scatter',
          datasetIndex: 2,
          itemStyle: {
            color: outlierColor,
            borderColor: outlierColor,
            borderWidth: 1
          },
          symbolSize: 6,
          emphasis: {
            itemStyle: {
              color: outlierColor,
              borderColor: outlierColor,
              borderWidth: 2
            }
          }
        }] : [])
      ]
    };
  }, [sourceData, boxColor, outlierColor, showOutliers, showGrid, boxWidth, title]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-lg font-medium text-gray-500">Loading box plot data...</div>
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">Box Plot Visualization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Columns: <span className="font-semibold">{Array.isArray(columnNames) ? columnNames.join(', ') : 'No columns selected'}</span>
              </label>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Groups: <span className="font-semibold">{data.length}</span>
              </label>
            </div>
          </div>

          {/* Debug Info */}
          {data.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Data Structure Preview:</h4>
              <div className="text-xs text-blue-700">
                <p><strong>Sample group:</strong> {JSON.stringify(data[0], null, 2)}</p>
                <p><strong>Number of groups:</strong> {data.length}</p>
                <p><strong>Column names:</strong> {columnLabels.join(', ')}</p>
                <p><strong>Total data points:</strong> {data.reduce((sum, group) => sum + group.data.length, 0)}</p>
                <p><strong>Dataset source format:</strong> {JSON.stringify(sourceData.slice(0, 2), null, 2)}</p>
              </div>
            </div>
          )}

          {/* Chart Customization Controls */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Chart Customization</h4>
            <div className="flex flex-col space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
              {/* Chart Title */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Chart Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter chart title"
                />
              </div>

              {/* Box Color */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Box Color</label>
                <Select
                  value={colorOptions.find(option => option.value === boxColor)}
                  onChange={(option) => setBoxColor(option?.value || '#3B82F6')}
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

              {/* Outlier Color */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Outlier Color</label>
                <Select
                  value={colorOptions.find(option => option.value === outlierColor)}
                  onChange={(option) => setOutlierColor(option?.value || '#EF4444')}
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

              {/* Box Width */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Box Width</label>
                <Select
                  value={boxWidthOptions.find(option => option.value === boxWidth)}
                  onChange={(option) => setBoxWidth(option?.value || 50)}
                  options={boxWidthOptions}
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

              {/* Show Outliers */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Show Outliers</label>
                <div className="flex items-center">
                  <button
                    onClick={() => setShowOutliers(!showOutliers)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${showOutliers ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showOutliers ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">
                    {showOutliers ? 'On' : 'Off'}
                  </span>
                </div>
              </div>

              {/* Show Grid */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Show Grid</label>
                <div className="flex items-center">
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${showGrid ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showGrid ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">
                    {showGrid ? 'On' : 'Off'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="datilito-chart border border-gray-200 rounded-lg p-4 bg-gray-50">
        <ReactECharts
          option={option}
          style={{ height: 500, width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
};

export default BoxPlotComponent;
