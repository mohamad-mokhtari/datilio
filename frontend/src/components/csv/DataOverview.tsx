import React from 'react';
import { DataInfo } from '@/@types/dataInfo';
import { 
  HiChartBar, 
  HiDatabase, 
  HiExclamation, 
  HiCheckCircle,
  HiInformationCircle,
  HiTrendingUp
} from 'react-icons/hi';

interface DataOverviewProps {
  dataInfo: DataInfo;
  primaryColor: string;
}

const DataOverview: React.FC<DataOverviewProps> = ({ dataInfo, primaryColor }) => {
  // Helper function to get quality score color
  const getQualityScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return 'text-gray-600 bg-gray-50';
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Helper function to get quality score icon
  const getQualityScoreIcon = (score: number | null) => {
    if (score === null || score === undefined) return <HiInformationCircle className="w-5 h-5" />;
    if (score >= 90) return <HiCheckCircle className="w-5 h-5" />;
    if (score >= 70) return <HiExclamation className="w-5 h-5" />;
    return <HiExclamation className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Dataset Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Rows</p>
              <p className="text-xl font-bold text-blue-900">{dataInfo.dataset_overview.total_rows !== null && dataInfo.dataset_overview.total_rows !== undefined ? dataInfo.dataset_overview.total_rows.toLocaleString() : 'N/A'}</p>
            </div>
            <div className="p-2 bg-blue-500 rounded-lg">
              <HiDatabase className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Total Columns</p>
              <p className="text-xl font-bold text-green-900">{dataInfo.dataset_overview.total_columns !== null && dataInfo.dataset_overview.total_columns !== undefined ? dataInfo.dataset_overview.total_columns : 'N/A'}</p>
            </div>
            <div className="p-2 bg-green-500 rounded-lg">
              <HiChartBar className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Memory Usage</p>
              <p className="text-xl font-bold text-purple-900">{dataInfo.dataset_overview.memory_usage_mb !== null && dataInfo.dataset_overview.memory_usage_mb !== undefined ? dataInfo.dataset_overview.memory_usage_mb : 'N/A'} MB</p>
            </div>
            <div className="p-2 bg-purple-500 rounded-lg">
              <HiInformationCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${getQualityScoreColor(dataInfo.dataset_overview.data_quality_score)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Data Quality</p>
              <p className="text-xl font-bold">{dataInfo.dataset_overview.data_quality_score !== null && dataInfo.dataset_overview.data_quality_score !== undefined ? dataInfo.dataset_overview.data_quality_score : 'N/A'}%</p>
            </div>
            <div className="p-2 rounded-lg bg-white/50">
              {getQualityScoreIcon(dataInfo.dataset_overview.data_quality_score)}
            </div>
          </div>
        </div>
      </div>

      {/* Data Types Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <HiChartBar className="w-5 h-5 mr-2 text-blue-500" />
          Data Types Distribution
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{dataInfo.data_types.summary.int64 !== null && dataInfo.data_types.summary.int64 !== undefined ? dataInfo.data_types.summary.int64 : 'N/A'}</div>
            <p className="text-sm text-gray-600">Integer Columns</p>
            <div className="mt-1 text-xs text-gray-500">
              {dataInfo.data_types.numeric_columns.slice(0, 3).join(', ')}
              {dataInfo.data_types.numeric_columns.length > 3 && '...'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{dataInfo.data_types.summary.object !== null && dataInfo.data_types.summary.object !== undefined ? dataInfo.data_types.summary.object : 'N/A'}</div>
            <p className="text-sm text-gray-600">Text Columns</p>
            <div className="mt-1 text-xs text-gray-500">
              {dataInfo.data_types.categorical_columns.slice(0, 3).join(', ')}
              {dataInfo.data_types.categorical_columns.length > 3 && '...'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">{dataInfo.data_types.summary.float64 !== null && dataInfo.data_types.summary.float64 !== undefined ? dataInfo.data_types.summary.float64 : 'N/A'}</div>
            <p className="text-sm text-gray-600">Float Columns</p>
          </div>
        </div>
      </div>

      {/* Missing Data & Quality Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <HiExclamation className="w-5 h-5 mr-2 text-orange-500" />
            Missing Data Analysis
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Missing Values</span>
              <span className="font-semibold text-gray-900">{dataInfo.missing_data.total_missing_values !== null && dataInfo.missing_data.total_missing_values !== undefined ? dataInfo.missing_data.total_missing_values : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Columns with Missing Data</span>
              <span className="font-semibold text-gray-900">{dataInfo.missing_data.columns_with_missing !== null && dataInfo.missing_data.columns_with_missing !== undefined ? dataInfo.missing_data.columns_with_missing : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Missing Percentage</span>
              <span className={`font-semibold ${dataInfo.missing_data.missing_percentage !== null && dataInfo.missing_data.missing_percentage !== undefined && dataInfo.missing_data.missing_percentage > 10 ? 'text-red-600' : 'text-green-600'}`}>
                {dataInfo.missing_data.missing_percentage !== null && dataInfo.missing_data.missing_percentage !== undefined ? dataInfo.missing_data.missing_percentage.toFixed(1) : 'N/A'}%
              </span>
            </div>
            {Object.keys(dataInfo.missing_data.columns).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Columns with Missing Data:</p>
                <div className="space-y-2">
                  {Object.entries(dataInfo.missing_data.columns).map(([column, info]) => (
                    <div key={column} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{column}</span>
                      <span className={`font-medium ${info.missing_percentage !== null && info.missing_percentage !== undefined && info.missing_percentage > 50 ? 'text-red-600' : info.missing_percentage !== null && info.missing_percentage !== undefined && info.missing_percentage > 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {info.missing_count !== null && info.missing_count !== undefined ? info.missing_count : 'N/A'} ({info.missing_percentage !== null && info.missing_percentage !== undefined ? info.missing_percentage : 'N/A'}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <HiCheckCircle className="w-5 h-5 mr-2 text-green-500" />
            Data Quality Metrics
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Duplicate Rows</span>
              <span className="font-semibold text-gray-900">{dataInfo.duplicates.duplicate_rows !== null && dataInfo.duplicates.duplicate_rows !== undefined ? dataInfo.duplicates.duplicate_rows : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Duplicate Percentage</span>
              <span className={`font-semibold ${dataInfo.duplicates.duplicate_percentage !== null && dataInfo.duplicates.duplicate_percentage !== undefined && dataInfo.duplicates.duplicate_percentage > 5 ? 'text-red-600' : 'text-green-600'}`}>
                {dataInfo.duplicates.duplicate_percentage !== null && dataInfo.duplicates.duplicate_percentage !== undefined ? dataInfo.duplicates.duplicate_percentage.toFixed(1) : 'N/A'}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Unique Columns</span>
              <span className="font-semibold text-gray-900">{dataInfo.column_names.length}</span>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overall Quality Score</span>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getQualityScoreColor(dataInfo.dataset_overview.data_quality_score)}`}>
                  {dataInfo.dataset_overview.data_quality_score}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Preview */}
      {(Object.keys(dataInfo.statistics.numeric_summary).length > 0 || Object.keys(dataInfo.statistics.categorical_summary).length > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <HiTrendingUp className="w-5 h-5 mr-2 text-blue-500" />
            Statistical Summary
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.keys(dataInfo.statistics.numeric_summary).length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Numeric Columns</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {Object.entries(dataInfo.statistics.numeric_summary).slice(0, 3).map(([column, stats]) => (
                    <div key={column} className="text-sm p-2 bg-gray-50 rounded">
                      <div className="font-medium text-gray-900">{column}</div>
                      <div className="text-gray-600">
                        Mean: {stats.mean !== null && stats.mean !== undefined ? stats.mean.toFixed(2) : 'N/A'} | 
                        Range: {stats.min !== null && stats.min !== undefined ? stats.min : 'N/A'} - {stats.max !== null && stats.max !== undefined ? stats.max : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(dataInfo.statistics.categorical_summary).length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Categorical Columns</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {Object.entries(dataInfo.statistics.categorical_summary).slice(0, 3).map(([column, stats]) => (
                    <div key={column} className="text-sm p-2 bg-gray-50 rounded">
                      <div className="font-medium text-gray-900">{column}</div>
                      <div className="text-gray-600">
                        Unique: {stats.unique_count !== null && stats.unique_count !== undefined ? stats.unique_count : 'N/A'} | 
                        Most common: {stats.most_common_value || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataOverview;
