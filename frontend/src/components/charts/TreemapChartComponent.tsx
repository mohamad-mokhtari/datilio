import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import Select from 'react-select';
import ChartDataService, { SamplingMetadata } from '@/services/ChartDataService';

interface TreemapChartComponentProps {
  userId: string;
  fileId: string;
  labelColumn: string; // Column for labels/names
  valueColumn: string; // Column for values/sizes
  categoryColumn?: string; // Optional: column for categories/groups
  visible_plot_extra_info: boolean;
  pythonCodeSnippet?: string;
  samplingConfig?: {
    max_points: number;
    sampling_method: 'systematic' | 'random';
    reason: string;
  };
  onSamplingMetadataReceived?: (metadata: SamplingMetadata) => void;
}

const colorSchemes = [
  { value: 'default', label: 'Default Palette', colors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'] },
  { value: 'warm', label: 'Warm Colors', colors: ['#c1232b', '#fe8463', '#f1a42b', '#fcce10', '#e87c25', '#b5c334'] },
  { value: 'cool', label: 'Cool Colors', colors: ['#1890ff', '#2fc25b', '#facc14', '#223273', '#8543e0', '#13c2c2'] },
  { value: 'pastel', label: 'Pastel', colors: ['#ffd1dc', '#b4e7ce', '#c7ceea', '#ffb6b9', '#b5ead7', '#c7ceea'] },
];

const TreemapChartComponent: React.FC<TreemapChartComponentProps> = ({
  userId,
  fileId,
  labelColumn,
  valueColumn,
  categoryColumn,
  visible_plot_extra_info,
  pythonCodeSnippet,
  samplingConfig,
  onSamplingMetadataReceived
}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Chart customization
  const [colorScheme, setColorScheme] = useState(colorSchemes[0]);
  const [showLabel, setShowLabel] = useState<boolean>(true);
  const [showBreadcrumb, setShowBreadcrumb] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('Treemap');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      if (!userId || !fileId || !labelColumn || !valueColumn) {
        setError('Label and Value columns are required for treemap chart');
        setIsLoading(false);
        return;
      }

      try {
        const columns = categoryColumn 
          ? [labelColumn, valueColumn, categoryColumn]
          : [labelColumn, valueColumn];

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

        if (response && response.data && Array.isArray(response.data)) {
          setChartData(response.data);
          
          if (onSamplingMetadataReceived && response.sampling) {
            onSamplingMetadataReceived(response.sampling);
          }
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching treemap chart data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, fileId, labelColumn, valueColumn, categoryColumn, pythonCodeSnippet]);

  const getOption = () => {
    if (!chartData || chartData.length === 0) return {};

    let treeData;

    if (categoryColumn) {
      // Group by category
      const grouped = chartData.reduce((acc: any, row) => {
        const category = String(row[categoryColumn]) || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          name: String(row[labelColumn]),
          value: parseFloat(row[valueColumn]) || 0
        });
        return acc;
      }, {});

      // Convert to tree structure
      treeData = Object.entries(grouped).map(([category, children]: [string, any]) => ({
        name: category,
        children: children
      }));

    } else {
      // Flat structure
      treeData = chartData.map(row => ({
        name: String(row[labelColumn]),
        value: parseFloat(row[valueColumn]) || 0
      }));
    }

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      toolbox: {
        feature: {
          saveAsImage: {
            title: 'Download',
            name: 'treemap_chart',
            backgroundColor: 'white'
          }
        },
        right: 20,
        top: 10
      },
      tooltip: {
        formatter: (info: any) => {
          const value = info.value;
          const name = info.name;
          if (!value) return name;
          return `<strong>${name}</strong><br/>Value: ${value.toLocaleString()}`;
        }
      },
      color: colorScheme.colors,
      series: [
        {
          type: 'treemap',
          data: categoryColumn ? treeData : [{ children: treeData }],
          roam: false,
          nodeClick: 'zoomToNode',
          breadcrumb: {
            show: showBreadcrumb,
            itemStyle: {
              color: 'rgba(0,0,0,0.7)',
              borderColor: 'rgba(0,0,0,0.7)',
              borderWidth: 1,
              shadowBlur: 3,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            },
            emphasis: {
              itemStyle: {
                color: 'rgba(0,0,0,0.9)'
              }
            }
          },
          label: {
            show: showLabel,
            formatter: (params: any) => {
              const name = params.name;
              const value = params.value;
              return value ? `${name}\n${value.toLocaleString()}` : name;
            },
            fontSize: 12,
            fontWeight: 'bold',
            color: '#fff',
            textShadowBlur: 2,
            textShadowColor: 'rgba(0, 0, 0, 0.5)'
          },
          upperLabel: {
            show: true,
            height: 30,
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 14
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
            gapWidth: 2
          },
          levels: [
            {
              itemStyle: {
                borderWidth: 3,
                borderColor: '#333',
                gapWidth: 3
              }
            },
            {
              colorSaturation: [0.35, 0.5],
              itemStyle: {
                borderWidth: 5,
                gapWidth: 1,
                borderColorSaturation: 0.6
              }
            }
          ]
        }
      ]
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

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-lg font-medium text-gray-500">No data available to display</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      {visible_plot_extra_info && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Treemap Chart Configuration</h3>
          
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900">Label Column</p>
              <p className="text-sm text-blue-700">{labelColumn}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-sm font-semibold text-green-900">Value Column</p>
              <p className="text-sm text-green-700">{valueColumn}</p>
            </div>
            {categoryColumn && (
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <p className="text-sm font-semibold text-purple-900">Category</p>
                <p className="text-sm text-purple-700">{categoryColumn}</p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Chart Customization</h4>
            <div className="flex flex-col space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
              {/* Color Scheme */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
                <Select
                  value={colorScheme}
                  onChange={(option) => setColorScheme(option || colorSchemes[0])}
                  options={colorSchemes}
                  className="text-sm"
                  formatOptionLabel={(option) => (
                    <div className="flex items-center">
                      <div className="flex space-x-1 mr-2">
                        {option.colors.slice(0, 4).map((color, idx) => (
                          <div
                            key={idx}
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      {option.label}
                    </div>
                  )}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '38px',
                      borderColor: '#e2e8f0',
                    }),
                  }}
                />
              </div>

              {/* Show Label */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Show Labels</label>
                <div className="flex items-center">
                  <button
                    onClick={() => setShowLabel(!showLabel)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showLabel ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showLabel ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">{showLabel ? 'On' : 'Off'}</span>
                </div>
              </div>

              {/* Show Breadcrumb */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Show Breadcrumb</label>
                <div className="flex items-center">
                  <button
                    onClick={() => setShowBreadcrumb(!showBreadcrumb)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showBreadcrumb ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showBreadcrumb ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">{showBreadcrumb ? 'On' : 'Off'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-4">
            <p className="text-xs text-yellow-800">
              <strong>Tip:</strong> Click on a segment to zoom in. Use breadcrumb navigation to zoom out.
            </p>
          </div>
        </div>
      )}
      
      <div className="datilito-chart border border-gray-200 rounded-lg p-4 bg-gray-50">
        <ReactECharts
          option={getOption()}
          style={{ height: 500, width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
};

export default TreemapChartComponent;

