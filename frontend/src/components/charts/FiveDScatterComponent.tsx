// src/components/charts/FiveDScatterComponent.tsx
import React, { useState, useMemo, useEffect } from "react";
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts';
import 'echarts-gl';    // <-- this registers scatter3D, grid3D, etc.
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface FiveDScatterComponentProps {
  userId: string;
  fileId: string;
  firstColumnName: string;
  secondColumnName: string;
  thirdColumnName: string;
  fourthColumnName: string;
  fifthColumnName: string;
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string; // Optional filter code snippet
  samplingConfig?: { max_points: number; sampling_method: 'systematic' | 'random'; reason: string };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

interface FiveDData {
  data: number[];
  column_name: string;
}

const FiveDScatterComponent: React.FC<FiveDScatterComponentProps> = ({
  userId,
  fileId,
  firstColumnName,
  secondColumnName,
  thirdColumnName,
  fourthColumnName,
  fifthColumnName,
  visible_plot_extra_info,
  pythonCodeSnippet,
  samplingConfig,
  onSamplingMetadataReceived
}) => {
  // State for backend data
  const [backendData, setBackendData] = useState<FiveDData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('5D Scatter Plot');

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      // Validate required props
      if (!userId || !fileId || !firstColumnName || !secondColumnName || !thirdColumnName || !fourthColumnName || !fifthColumnName) {
        setError('Missing required parameters for 5D scatter plot generation');
        setIsLoading(false);
        return;
      }

      // Validate that all columns are different
      const columns = [firstColumnName, secondColumnName, thirdColumnName, fourthColumnName, fifthColumnName];
      const uniqueColumns = [...new Set(columns)];
      if (uniqueColumns.length !== 5) {
        setError('Please select 5 different columns for 5D scatter plot');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching 5D scatter data with unified endpoint:', {
          file_id: fileId,
          columns: columns,
        });

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

        console.log('5D Scatter unified data received:', response);
        
        if (onSamplingMetadataReceived && response.sampling) {
          onSamplingMetadataReceived(response.sampling);
        }

        if (response && response.data && Array.isArray(response.data)) {
          // Transform unified data to 5D format
          const fiveDData: FiveDData[] = columns.map(columnName => {
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

          setBackendData(fiveDData);
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching 5D scatter data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load 5D scatter data. Please try again later.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, firstColumnName, secondColumnName, thirdColumnName, fourthColumnName, fifthColumnName, pythonCodeSnippet]);

  // Create field indices mapping from backend data
  const fieldIndices = useMemo(() => {
    const indices: { [key: string]: number } = {};
    backendData.forEach((group, index) => {
      indices[group.column_name] = index;
    });
    return indices;
  }, [backendData]);

  // Get field names from backend data
  const fieldNames = useMemo(() => {
    return backendData.map(group => group.column_name);
  }, [backendData]);

  // Validate that all config fields exist in fieldIndices
  const validateConfig = (config: any) => {
    const validFields = Object.keys(fieldIndices);
    const defaultFields = fieldNames.length >= 5 ? fieldNames.slice(0, 5) : ['field1', 'field2', 'field3', 'field4', 'field5'];
    return {
      xAxis3D: validFields.includes(config.xAxis3D) ? config.xAxis3D : defaultFields[0],
      yAxis3D: validFields.includes(config.yAxis3D) ? config.yAxis3D : defaultFields[1],
      zAxis3D: validFields.includes(config.zAxis3D) ? config.zAxis3D : defaultFields[2],
      color: validFields.includes(config.color) ? config.color : defaultFields[3],
      symbolSize: validFields.includes(config.symbolSize) ? config.symbolSize : defaultFields[4]
    };
  };

  // Configuration state
  const [config, setConfig] = useState(() => {
    const initialConfig = {
      xAxis3D: firstColumnName || 'field1',
      yAxis3D: secondColumnName || 'field2',
      zAxis3D: thirdColumnName || 'field3',
      color: fourthColumnName || 'field4',
      symbolSize: fifthColumnName || 'field5'
    };
    return validateConfig(initialConfig);
  });

  // Update config when backend data changes
  useEffect(() => {
    if (fieldNames.length >= 5) {
      setConfig(prevConfig => validateConfig(prevConfig));
    }
  }, [fieldNames, fieldIndices]);

  // Transform backend data to 5D format
  const transformedData = useMemo(() => {
    if (backendData.length < 5) return [];

    // Get the maximum length of data arrays
    const maxLength = Math.max(...backendData.map(group => group.data.length));

    // Create 5D data points
    const data = [];
    for (let i = 0; i < maxLength; i++) {
      const xVal = backendData[fieldIndices[config.xAxis3D]]?.data[i] || 0;
      const yVal = backendData[fieldIndices[config.yAxis3D]]?.data[i] || 0;
      const zVal = backendData[fieldIndices[config.zAxis3D]]?.data[i] || 0;
      const colorVal = backendData[fieldIndices[config.color]]?.data[i] || 0;
      const sizeVal = backendData[fieldIndices[config.symbolSize]]?.data[i] || 0;

      data.push([
        typeof xVal === 'number' ? xVal : 0,
        typeof yVal === 'number' ? yVal : 0,
        typeof zVal === 'number' ? zVal : 0,
        typeof colorVal === 'number' ? colorVal : 0,
        typeof sizeVal === 'number' ? sizeVal : 0
      ]);
    }

    return data;
  }, [backendData, fieldIndices, config]);

  // Get max values for visual mapping
  const getMaxOnExtent = (data: any[]) => {
    let colorMax = -Infinity;
    let symbolSizeMax = -Infinity;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const colorVal = item[3]; // 4th dimension (color)
      const symbolSizeVal = item[4]; // 5th dimension (size)

      // Ensure values are valid numbers
      if (typeof colorVal === 'number' && !isNaN(colorVal)) {
        colorMax = Math.max(colorVal, colorMax);
      }
      if (typeof symbolSizeVal === 'number' && !isNaN(symbolSizeVal)) {
        symbolSizeMax = Math.max(symbolSizeVal, symbolSizeMax);
      }
    }

    // Ensure we have valid max values
    return {
      color: colorMax === -Infinity ? 100 : colorMax,
      symbolSize: symbolSizeMax === -Infinity ? 100 : symbolSizeMax
    };
  };

  const max = getMaxOnExtent(transformedData);

  // Debug: Log data structure
  console.log('5D Scatter Data:', {
    backendDataLength: backendData.length,
    transformedDataLength: transformedData.length,
    sampleTransformedData: transformedData[0],
    fieldIndices,
    fieldNames,
    config,
    max
  });

  // Simple fallback option if 3D fails
  const fallbackOption = useMemo(() => ({
    title: {
      text: title + ' (Fallback Mode)',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151'
      }
    },
    tooltip: {
      trigger: 'item'
    },
    toolbox: {
      feature: {
        saveAsImage: {}
      }
    },
    xAxis: {
      type: 'value',
      name: config.xAxis3D
    },
    yAxis: {
      type: 'value',
      name: config.yAxis3D
    },
    series: [{
      type: 'scatter',
      data: transformedData.map((item) => [
        item[0], // x
        item[1], // y
        item[3]  // color
      ]),
      symbolSize: function (data: any) {
        const sizeVal = data[2] || 0;
        return Math.max(8, Math.min(30, sizeVal / 10));
      },
      itemStyle: {
        color: function (params: any) {
          const colorVal = params.data[2] || 0;
          const intensity = Math.min(1, colorVal / max.color);
          return `hsl(${intensity * 240}, 70%, 50%)`;
        }
      }
    }]
  }), [transformedData, config, max]);

  // Chart option with fallback
  const option = useMemo(() => {
    // Try to create the 3D option, fallback to 2D if it fails
    try {
      console.log('Using transformed data for 3D chart:', transformedData);

      return {
        title: {
          text: title,
          left: 'center',
          textStyle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#ffffff'
          }
        },
        tooltip: {
          formatter: function (params: any) {
            const data = params.data;
            const dataIndex = params.dataIndex;
            return `
              <strong>Data Point ${dataIndex + 1}</strong><br/>
              ${config.xAxis3D}: ${data[0].toFixed(2)}<br/>
              ${config.yAxis3D}: ${data[1].toFixed(2)}<br/>
              ${config.zAxis3D}: ${data[2].toFixed(2)}<br/>
              ${config.color}: ${data[3].toFixed(2)}<br/>
              ${config.symbolSize}: ${data[4].toFixed(2)}
            `;
          }
        },
        visualMap: [
          {
            top: 10,
            left: 10,
            calculable: true,
            dimension: 3,
            max: max.color,
            inRange: {
              color: [
                '#1710c0',
                '#0b9df0',
                '#00fea8',
                '#00ff0d',
                '#f5f811',
                '#f09a09',
                '#fe0300'
              ]
            },
            textStyle: {
              color: '#fff'
            },
            formatter: function (value: number) {
              return `${config.color}: ${value.toFixed(1)}`;
            }
          },
          {
            bottom: 10,
            left: 10,
            calculable: true,
            dimension: 4,
            max: max.symbolSize,
            inRange: {
              symbolSize: [8, 30]
            },
            textStyle: {
              color: '#fff'
            },
            formatter: function (value: number) {
              return `${config.symbolSize}: ${value.toFixed(1)}`;
            }
          }
        ],
        toolbox: {
          feature: {
            saveAsImage: {}
          }
        },
        xAxis3D: {
          name: config.xAxis3D,
          type: 'value',
          nameTextStyle: {
            color: '#ffffff'
          },
          axisLabel: {
            color: '#ffffff'
          }
        },
        yAxis3D: {
          name: config.yAxis3D,
          type: 'value',
          nameTextStyle: {
            color: '#ffffff'
          },
          axisLabel: {
            color: '#ffffff'
          }
        },
        zAxis3D: {
          name: config.zAxis3D,
          type: 'value',
          nameTextStyle: {
            color: '#ffffff'
          },
          axisLabel: {
            color: '#ffffff'
          }
        },
        grid3D: {
          axisLine: {
            lineStyle: {
              color: '#ffffff'
            }
          },
          axisPointer: {
            lineStyle: {
              color: '#3B82F6'
            }
          },
          viewControl: {
            // autoRotate: true,
            // projection: 'orthographic'
          },
          environment: '#000000',
          backgroundColor: '#000000'
        },
        series: [
          {
            type: 'scatter3D',
            dimensions: [
              config.xAxis3D,
              config.yAxis3D,
              config.zAxis3D,
              config.color,
              config.symbolSize
            ],
            data: transformedData,
            symbolSize: 12,
            itemStyle: {
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.8)'
            },
            emphasis: {
              itemStyle: {
                color: '#fff'
              }
            }
          }
        ]
      };
    } catch (error) {
      console.warn('3D chart option failed, using fallback:', error);
      return fallbackOption;
    }
  }, [transformedData, config, max, fallbackOption]);

  // Add error boundary for chart rendering
  const [chartError, setChartError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-lg font-medium text-gray-500">Loading 5D scatter plot data...</div>
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">5D Scatter Plot Visualization</h3>

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

          {/* Configuration Controls */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Dimension Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">X Axis (3D)</label>
                <select
                  value={config.xAxis3D}
                  onChange={(e) => setConfig({ ...config, xAxis3D: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {fieldNames.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Y Axis (3D)</label>
                <select
                  value={config.yAxis3D}
                  onChange={(e) => setConfig({ ...config, yAxis3D: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {fieldNames.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Z Axis (3D)</label>
                <select
                  value={config.zAxis3D}
                  onChange={(e) => setConfig({ ...config, zAxis3D: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {fieldNames.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Color (4th Dimension)</label>
                <select
                  value={config.color}
                  onChange={(e) => setConfig({ ...config, color: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {fieldNames.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Size (5th Dimension)</label>
                <select
                  value={config.symbolSize}
                  onChange={(e) => setConfig({ ...config, symbolSize: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {fieldNames.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Data Information */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Data Information:</h4>
            <div className="text-xs text-blue-700">
              <p><strong>Data Points:</strong> {transformedData.length} points from backend</p>
              <p><strong>Columns:</strong> {fieldNames.join(', ')}</p>
              <p><strong>Dimensions:</strong> 5D (3D position + color + size)</p>
              <p><strong>Current Mapping:</strong></p>
              <ul className="ml-4 list-disc">
                <li>X: {config.xAxis3D}</li>
                <li>Y: {config.yAxis3D}</li>
                <li>Z: {config.zAxis3D}</li>
                <li>Color: {config.color}</li>
                <li>Size: {config.symbolSize}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      <div className="datilito-chart border border-gray-200 rounded-lg p-4 bg-gray-50">
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          style={{ height: 600, width: '100%' }}
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

export default FiveDScatterComponent;