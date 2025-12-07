// src/components/charts/Simple3DScatterChartComponent.tsx
import React, { useEffect, useState } from "react";
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts';
import 'echarts-gl';
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface Simple3DScatterChartComponentProps {
  userId: string;
  fileId: string;
  firstColumnName: string;
  secondColumnName: string;
  thirdColumnName: string;
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string; // Optional filter code snippet
  samplingConfig?: { max_points: number; sampling_method: 'systematic' | 'random'; reason: string };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

const colorOptions = [
  { value: '#8884d8', label: 'Purple', color: '#8884d8' },
  { value: '#4C51BF', label: 'Indigo', color: '#4C51BF' },
  { value: '#DC2626', label: 'Red', color: '#DC2626' },
  { value: '#059669', label: 'Green', color: '#059669' },
  { value: '#D97706', label: 'Orange', color: '#D97706' },
  { value: '#7C3AED', label: 'Purple', color: '#7C3AED' },
  { value: '#0891B2', label: 'Cyan', color: '#0891B2' },
  { value: '#BE185D', label: 'Pink', color: '#BE185D' },
  { value: '#65A30D', label: 'Lime', color: '#65A30D' },
  { value: '#F59E0B', label: 'Amber', color: '#F59E0B' },
];

const Simple3DScatterChartComponent: React.FC<Simple3DScatterChartComponentProps> = ({
  userId,
  fileId,
  firstColumnName,
  secondColumnName,
  thirdColumnName,
  visible_plot_extra_info,
  pythonCodeSnippet,
  samplingConfig,
  onSamplingMetadataReceived
}) => {
  const [data, setData] = useState<{ x: number; y: number; z: number }[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [xLabel, setXLabel] = useState<string>('');
  const [yLabel, setYLabel] = useState<string>('');
  const [zLabel, setZLabel] = useState<string>('');
  const [xUnit, setXUnit] = useState<string>('');
  const [yUnit, setYUnit] = useState<string>('');
  const [zUnit, setZUnit] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart customization controls
  const [fillColor, setFillColor] = useState<string>('#8884d8');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('3D Scatter Plot');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      // Validate required props
      if (!userId || !fileId || !firstColumnName || !secondColumnName || !thirdColumnName) {
        setError('Missing required parameters for 3D scatter chart generation');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching 3D scatter chart data with unified endpoint:', {
          file_id: fileId,
          columns: [firstColumnName, secondColumnName, thirdColumnName],
        });

        const response = pythonCodeSnippet && pythonCodeSnippet.trim() !== ''
          ? await ChartDataService.fetchFilteredChartData({
              file_id: fileId,
              python_code_snippet: pythonCodeSnippet,
              columns: [firstColumnName, secondColumnName, thirdColumnName],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            })
          : await ChartDataService.fetchChartData({
              file_id: fileId,
              columns: [firstColumnName, secondColumnName, thirdColumnName],
              max_points: samplingConfig?.max_points,
              sampling_method: samplingConfig?.sampling_method,
              drop_empty_rows: true
            });

        console.log('3D Scatter chart unified data received:', response);
        
        if (onSamplingMetadataReceived && response.sampling) {
          onSamplingMetadataReceived(response.sampling);
        }

        if (response && response.data && Array.isArray(response.data)) {
          // Transform the unified data
          const scatterData = response.data.map(row => ({
            x: row[firstColumnName],
            y: row[secondColumnName],
            z: row[thirdColumnName]
          })).filter(point => 
            point.x !== null && point.x !== undefined && 
            point.y !== null && point.y !== undefined &&
            point.z !== null && point.z !== undefined
          );

          setData(scatterData);
          setLabels([firstColumnName, secondColumnName, thirdColumnName]);
          setXLabel(firstColumnName);
          setYLabel(secondColumnName);
          setZLabel(thirdColumnName);
          setXUnit('');
          setYUnit('');
          setZUnit('');
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching 3D scatter chart data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load 3D scatter chart data. Please try again later.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, firstColumnName, secondColumnName, thirdColumnName, pythonCodeSnippet]);

  // ECharts option configuration for true 3D scatter
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
      toolbox: {
        feature: {
          saveAsImage: {
            title: 'Download',
            name: `3d_scatter_${xLabel}_${yLabel}_${zLabel}`,
            backgroundColor: 'white'
          }
        },
        right: 20,
        top: 10
      },
      tooltip: {
        formatter: (params: any) => {
          const value = params.value;
          return `${xLabel}: ${value[0]}<br/>${yLabel}: ${value[1]}<br/>${zLabel}: ${value[2]}`;
        }
      },
      grid3D: {
        boxWidth: 100,
        boxHeight: 100,
        boxDepth: 100,
        viewControl: {
          projection: 'perspective',
          autoRotate: false,
          distance: 200,
          alpha: 30,
          beta: 40
        },
        axisPointer: {
          show: true,
          lineStyle: {
            color: '#000',
            width: 2
          }
        }
      },
      xAxis3D: {
        name: xLabel,
        type: 'value',
        nameTextStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        },
        axisLine: {
          lineStyle: {
            color: '#718096'
          }
        },
        splitLine: {
          show: showGrid,
          lineStyle: {
            color: '#e2e8f0'
          }
        }
      },
      yAxis3D: {
        name: yLabel,
        type: 'value',
        nameTextStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        },
        axisLine: {
          lineStyle: {
            color: '#718096'
          }
        },
        splitLine: {
          show: showGrid,
          lineStyle: {
            color: '#e2e8f0'
          }
        }
      },
      zAxis3D: {
        name: zLabel,
        type: 'value',
        nameTextStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        },
        axisLine: {
          lineStyle: {
            color: '#718096'
          }
        },
        splitLine: {
          show: showGrid,
          lineStyle: {
            color: '#e2e8f0'
          }
        }
      },
      series: [{
        type: 'scatter3D',
        data: data.map(d => [d.x, d.y, d.z]),
        itemStyle: {
          color: fillColor,
          opacity: 0.8
        },
        symbolSize: 8,
        emphasis: {
          itemStyle: {
            color: '#FFD700',
            borderColor: '#E74C3C',
            borderWidth: 2
          }
        }
      }]
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-lg font-medium text-gray-500">Loading 3D scatter chart data...</div>
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">3D Scatter Plot Visualization</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                X-Axis: <span className="font-semibold">{xLabel}</span>
                {xUnit && <span className="text-gray-500"> ({xUnit})</span>}
              </label>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Y-Axis: <span className="font-semibold">{yLabel}</span>
                {yUnit && <span className="text-gray-500"> ({yUnit})</span>}
              </label>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Z-Axis: <span className="font-semibold">{zLabel}</span>
                {zUnit && <span className="text-gray-500"> ({zUnit})</span>}
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
                <p><strong>Labels:</strong> {labels.join(', ')}</p>
                <p><strong>X-axis:</strong> {xLabel} {xUnit && `(${xUnit})`}</p>
                <p><strong>Y-axis:</strong> {yLabel} {yUnit && `(${yUnit})`}</p>
                <p><strong>Z-axis:</strong> {zLabel} {zUnit && `(${zUnit})`}</p>
                <p className="mt-2 text-blue-600"><strong>💡 Tip:</strong> Click and drag to rotate the 3D view!</p>
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
              {/* Fill Color */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Point Color</label>
                <Select
                  value={colorOptions.find(option => option.value === fillColor)}
                  onChange={(option) => setFillColor(option?.value || '#8884d8')}
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
        <ReactEChartsCore
          echarts={echarts}
          option={getChartOption()}
          style={{ height: '500px', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>
    </div>
  );
};

export default Simple3DScatterChartComponent;
