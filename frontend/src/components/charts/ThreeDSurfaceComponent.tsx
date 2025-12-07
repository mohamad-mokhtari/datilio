// src/components/charts/ThreeDSurfaceComponent.tsx
import React, { useState, useMemo, useEffect } from "react";
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts';
import 'echarts-gl';    // <-- this registers surface3D, grid3D, etc.
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';


interface ThreeDSurfaceComponentProps {
  userId: string;
  fileId: string;
  firstColumnName: string;
  secondColumnName: string;
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string; // Optional filter code snippet
  samplingConfig?: { max_points: number; sampling_method: 'systematic' | 'random'; reason: string };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

interface SurfaceData {
  data: number[];
  column_name: string;
}

const ThreeDSurfaceComponent: React.FC<ThreeDSurfaceComponentProps> = ({
  userId,
  fileId,
  firstColumnName,
  secondColumnName,
  visible_plot_extra_info,
  pythonCodeSnippet,
  samplingConfig,
  onSamplingMetadataReceived
}) => {
  // State for backend data
  const [backendData, setBackendData] = useState<SurfaceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('3D Surface Plot');

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      // Validate required props
      if (!userId || !fileId || !firstColumnName || !secondColumnName) {
        setError('Missing required parameters for 3D surface plot generation');
        setIsLoading(false);
        return;
      }

      // Validate that columns are different
      if (firstColumnName === secondColumnName) {
        setError('Please select 2 different columns for 3D surface plot');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching 3D surface data with unified endpoint:', {
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

        console.log('3D Surface unified data received:', response);
        
        if (onSamplingMetadataReceived && response.sampling) {
          onSamplingMetadataReceived(response.sampling);
        }

        if (response && response.data && Array.isArray(response.data)) {
          // Transform unified data to surface format
          const surfaceData: SurfaceData[] = [firstColumnName, secondColumnName].map(columnName => {
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

          setBackendData(surfaceData);
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching 3D surface data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load 3D surface data. Please try again later.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, firstColumnName, secondColumnName, pythonCodeSnippet]);

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

  // Function types for Z calculation
  const functionTypes = [
    { value: 'sine', label: 'Sine Wave' },
    { value: 'cosine', label: 'Cosine Wave' },
    { value: 'gaussian', label: 'Gaussian' },
    { value: 'parabolic', label: 'Parabolic' },
    { value: 'exponential', label: 'Exponential' },
    { value: 'logarithmic', label: 'Logarithmic' }
  ];

  // Configuration state
  const [config, setConfig] = useState(() => {
    const initialConfig = {
      xAxis: firstColumnName || 'field1',
      yAxis: secondColumnName || 'field2',
      functionType: 'sine'
    };
    return initialConfig;
  });

  // Update config when backend data changes
  useEffect(() => {
    if (fieldNames.length >= 2) {
      setConfig({
        xAxis: firstColumnName || fieldNames[0],
        yAxis: secondColumnName || fieldNames[1],
        functionType: config.functionType
      });
    }
  }, [fieldNames, firstColumnName, secondColumnName, config.functionType]);

  // Get data ranges for surface equation
  const getDataRanges = () => {
    if (backendData.length < 2) return { xRange: [0, 10], yRange: [0, 10] };

    const xData = backendData[fieldIndices[config.xAxis]]?.data || [];
    const yData = backendData[fieldIndices[config.yAxis]]?.data || [];

    const xRange = [Math.min(...xData), Math.max(...xData)];
    const yRange = [Math.min(...yData), Math.max(...yData)];

    return { xRange, yRange };
  };

  const dataRanges = getDataRanges();

  // Mathematical functions for Z calculation
  const getZFunction = (functionType: string) => {
    const { xRange, yRange } = dataRanges;
    const xCenter = (xRange[0] + xRange[1]) / 2;
    const yCenter = (yRange[0] + yRange[1]) / 2;
    const xScale = (xRange[1] - xRange[0]) / 4;
    const yScale = (yRange[1] - yRange[0]) / 4;

    switch (functionType) {
      case 'sine':
        return (x: number, y: number) => {
          const xNorm = (x - xRange[0]) / (xRange[1] - xRange[0]);
          const yNorm = (y - yRange[0]) / (yRange[1] - yRange[0]);
          return Math.sin(xNorm * Math.PI * 2) * Math.sin(yNorm * Math.PI * 2);
        };

      case 'cosine':
        return (x: number, y: number) => {
          const xNorm = (x - xRange[0]) / (xRange[1] - xRange[0]);
          const yNorm = (y - yRange[0]) / (yRange[1] - yRange[0]);
          return Math.cos(xNorm * Math.PI * 2) * Math.cos(yNorm * Math.PI * 2);
        };

      case 'gaussian':
        return (x: number, y: number) => {
          const dx = (x - xCenter) / xScale;
          const dy = (y - yCenter) / yScale;
          return Math.exp(-(dx * dx + dy * dy) / 2);
        };

      case 'parabolic':
        return (x: number, y: number) => {
          const xNorm = (x - xCenter) / xScale;
          const yNorm = (y - yCenter) / yScale;
          return -(xNorm * xNorm + yNorm * yNorm) / 4;
        };

      case 'exponential':
        return (x: number, y: number) => {
          const xNorm = (x - xRange[0]) / (xRange[1] - xRange[0]);
          const yNorm = (y - yRange[0]) / (yRange[1] - yRange[0]);
          return Math.exp(-(xNorm + yNorm));
        };

      case 'logarithmic':
        return (x: number, y: number) => {
          const xNorm = Math.max(0.1, (x - xRange[0]) / (xRange[1] - xRange[0]));
          const yNorm = Math.max(0.1, (y - yRange[0]) / (yRange[1] - yRange[0]));
          return Math.log(xNorm * yNorm);
        };

      default:
        return (x: number, y: number) => 0;
    }
  };

  // Generate surface data grid
  const surfaceData = useMemo(() => {
    if (backendData.length < 2) return [];

    const { xRange, yRange } = dataRanges;
    const xs = 30; // Grid resolution
    const ys = 30;
    const surfacePoints: number[][] = [];
    const zFunc = getZFunction(config.functionType);

    for (let i = 0; i < xs; i++) {
      const x = xRange[0] + (xRange[1] - xRange[0]) * i / (xs - 1);
      for (let j = 0; j < ys; j++) {
        const y = yRange[0] + (yRange[1] - yRange[0]) * j / (ys - 1);
        const z = zFunc(x, y);
        surfacePoints.push([x, y, z]);
      }
    }

    return surfacePoints;
  }, [backendData, dataRanges, config.functionType]);

  // Debug: Log data structure
  console.log('3D Surface Data:', {
    backendDataLength: backendData.length,
    surfaceDataLength: surfaceData.length,
    sampleSurfaceData: surfaceData[0],
    fieldIndices,
    fieldNames,
    config,
    dataRanges
  });

  // Chart option
  const option = useMemo(() => {
    if (backendData.length < 2 || surfaceData.length === 0) {
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
        formatter: function (params: any) {
          const data = params.data;
          return `
            <strong>Surface Point</strong><br/>
            ${config.xAxis}: ${data[0].toFixed(2)}<br/>
            ${config.yAxis}: ${data[1].toFixed(2)}<br/>
            Z: ${data[2].toFixed(2)}
          `;
        }
      },
      backgroundColor: '#fff',
      visualMap: {
        show: false,
        dimension: 2,
        min: -1,
        max: 1,
        inRange: {
          color: [
            '#313695',
            '#4575b4',
            '#74add1',
            '#abd9e9',
            '#e0f3f8',
            '#ffffbf',
            '#fee090',
            '#fdae61',
            '#f46d43',
            '#d73027',
            '#a50026'
          ]
        }
      },
      toolbox: {
        feature: {
          saveAsImage: {}
        }
      },
      xAxis3D: {
        type: 'value',
        name: config.xAxis,
        nameTextStyle: {
          color: '#374151'
        },
        axisLabel: {
          color: '#374151'
        }
      },
      yAxis3D: {
        type: 'value',
        name: config.yAxis,
        nameTextStyle: {
          color: '#374151'
        },
        axisLabel: {
          color: '#374151'
        }
      },
      zAxis3D: {
        type: 'value',
        name: 'Z (Function)',
        nameTextStyle: {
          color: '#374151'
        },
        axisLabel: {
          color: '#374151'
        }
      },
      grid3D: {
        viewControl: {
          // projection: 'orthographic'
        },
        axisLine: {
          lineStyle: {
            color: '#374151'
          }
        },
        axisPointer: {
          lineStyle: {
            color: '#3B82F6'
          }
        }
      },
      series: [
        {
          type: 'surface',
          data: surfaceData,
          wireframe: {
            show: true,
            lineStyle: {
              color: '#666',
              opacity: 0.3
            }
          },
          itemStyle: {
            opacity: 0.8
          }
        }
      ]
    };
  }, [backendData, surfaceData, config, functionTypes]);

  // Add error boundary for chart rendering
  const [chartError, setChartError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-lg font-medium text-gray-500">Loading 3D surface plot data...</div>
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">3D Surface Plot Visualization</h3>

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
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Surface Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">X Axis</label>
                <select
                  value={config.xAxis}
                  onChange={(e) => setConfig({ ...config, xAxis: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {fieldNames.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Y Axis</label>
                <select
                  value={config.yAxis}
                  onChange={(e) => setConfig({ ...config, yAxis: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {fieldNames.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Z Function</label>
                <select
                  value={config.functionType}
                  onChange={(e) => setConfig({ ...config, functionType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {functionTypes.map(func => (
                    <option key={func.value} value={func.value}>{func.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Data Information */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Data Information:</h4>
            <div className="text-xs text-blue-700">
              <p><strong>Columns:</strong> {fieldNames.join(', ')}</p>
              <p><strong>X Range:</strong> {dataRanges.xRange[0].toFixed(2)} to {dataRanges.xRange[1].toFixed(2)}</p>
              <p><strong>Y Range:</strong> {dataRanges.yRange[0].toFixed(2)} to {dataRanges.yRange[1].toFixed(2)}</p>
              <p><strong>Current Mapping:</strong></p>
              <ul className="ml-4 list-disc">
                <li>X: {config.xAxis}</li>
                <li>Y: {config.yAxis}</li>
                <li>Z: {functionTypes.find(f => f.value === config.functionType)?.label}</li>
              </ul>
              <p><strong>Surface Type:</strong> Mathematical function based on X,Y data ranges</p>
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

export default ThreeDSurfaceComponent;
