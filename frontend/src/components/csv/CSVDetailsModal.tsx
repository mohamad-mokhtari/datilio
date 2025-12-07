// src/components/CSVDetailsModal.tsx
import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { DetailedColumnInfo } from '@/@types/csv';
import { DataInfo } from '@/@types/dataInfo';
import { useConfig } from '@/components/ui/ConfigProvider';
import DataOverview from './DataOverview';
import { 
  HiChartBar, 
  HiDatabase, 
  HiExclamation, 
  HiCheckCircle,
  HiInformationCircle,
  HiTrendingUp,
  HiTrendingDown,
  HiMinus
} from 'react-icons/hi';

interface CSVDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnsInfo: DetailedColumnInfo[];
  loadingColumnInfo: boolean;
  selectedCsv: { file_name: string; file_id: string } | null;
  renderColumnDetails: (column: DetailedColumnInfo, index: number) => JSX.Element;
  dataInfo: DataInfo | null;
  loadingDataInfo: boolean;
  dataInfoError: string | null;
}

const CSVDetailsModal: React.FC<CSVDetailsModalProps> = ({
  isOpen,
  onClose,
  columnsInfo,
  loadingColumnInfo,
  selectedCsv,
  renderColumnDetails,
  dataInfo,
  loadingDataInfo,
  dataInfoError,
}) => {
  const { themeColor, primaryColorLevel } = useConfig();
  const [activeTab, setActiveTab] = useState<'overview' | 'columns'>('overview');
  
  // Get CSS color values for the theme
  const getThemeColors = () => {
    const colorMap: Record<string, Record<number, string>> = {
      red: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
      orange: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
      amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
      yellow: { 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
      lime: { 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#365314', 900: '#1a2e05' },
      green: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
      emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
      teal: { 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
      cyan: { 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63' },
      sky: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
      blue: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
      indigo: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
      violet: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
      purple: { 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87' },
      fuchsia: { 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75' },
      pink: { 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
      rose: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' }
    };
    
    const primaryColor = colorMap[themeColor]?.[primaryColorLevel] || '#4f46e5'; // fallback to indigo-600
    const lightColor = colorMap[themeColor]?.[Math.max(primaryColorLevel - 100, 100) as number] || '#6366f1'; // fallback to indigo-500
    
    return { primaryColor, lightColor };
  };

  const { primaryColor, lightColor } = getThemeColors();

  // Reset tab when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('overview');
    }
  }, [isOpen]);

  // Helper function to get quality score color
  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Helper function to get quality score icon
  const getQualityScoreIcon = (score: number) => {
    if (score >= 90) return <HiCheckCircle className="w-5 h-5" />;
    if (score >= 70) return <HiExclamation className="w-5 h-5" />;
    return <HiExclamation className="w-5 h-5" />;
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      width={1000}
      height="85vh"
      contentClassName="p-0 flex flex-col h-full"
      closable={false}
      style={{
        content: {
          left: '50%',
          transform: 'translate(-50%, 0)',
          margin: 0,
          position: 'fixed',
          height: '85vh'
        }
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-3 text-white rounded-t-lg flex-shrink-0"
        style={{
          background: `linear-gradient(to right, #4f46e5, ${primaryColor})`
        }}
      >
      <div className="flex items-center space-x-3">
        <div className="p-1.5 bg-white/20 rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{selectedCsv?.file_name || 'CSV Details'}</h2>
          <p className="text-white/80 text-xs">Column information and data preview</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors duration-200 group"
        aria-label="Close modal"
      >
        <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white flex-shrink-0">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <HiChartBar className="w-4 h-4" />
                <span>Data Overview</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('columns')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'columns'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <HiDatabase className="w-4 h-4" />
                <span>Column Details</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {activeTab === 'overview' ? (
            <>
              {/* Loading State */}
              {loadingDataInfo ? (
                <div className="text-center py-12">
                  <div 
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <Spinner size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Data Analysis</h3>
                  <p className="text-gray-600">Please wait while we analyze your dataset...</p>
                </div>
              ) : dataInfoError ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-red-50">
                    <HiExclamation className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
                  <p className="text-gray-600 mb-4">{dataInfoError}</p>
                  <div className="text-xs text-gray-500">
                    File ID: {selectedCsv?.file_id}
                  </div>
                </div>
              ) : dataInfo ? (
                <DataOverview dataInfo={dataInfo} primaryColor={primaryColor} />
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-gray-100">
                    <HiInformationCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
                  <p className="text-gray-600 mb-4">Data analysis information is not available for this file.</p>
                  <div className="text-xs text-gray-500 mt-2">
                    File ID: {selectedCsv?.file_id}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Column Details Tab */
            <div className="space-y-6">
              {loadingColumnInfo ? (
                <div className="text-center py-12">
                  <div 
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <Spinner size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Column Information</h3>
                  <p className="text-gray-600">Please wait while we analyze your data...</p>
                </div>
              ) : columnsInfo.length > 0 ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <HiDatabase className="w-5 h-5 mr-2 text-blue-500" />
                      Column Overview
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{columnsInfo.length}</div>
                        <p className="text-sm text-gray-600">Total Columns</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{[...new Set(columnsInfo.map(col => col.dtype))].length}</div>
                        <p className="text-sm text-gray-600">Data Types</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {columnsInfo.filter(col => (col as any).null_count > 0).length}
                        </div>
                        <p className="text-sm text-gray-600">Columns with Nulls</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Column Information</h3>
                    <div className="max-h-96 overflow-y-auto pr-2 border-t pt-4">
                      {columnsInfo.map((column, index) => renderColumnDetails(column, index))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-gray-100">
                    <HiDatabase className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Column Information</h3>
                  <p className="text-gray-600">Column information is not available for this file.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg flex-shrink-0">
        <div className="text-sm text-gray-500">
          {activeTab === 'overview' && dataInfo ? (
            <span>
              {dataInfo.dataset_overview.total_rows !== null && dataInfo.dataset_overview.total_rows !== undefined ? dataInfo.dataset_overview.total_rows.toLocaleString() : 'N/A'} rows • 
              {dataInfo.dataset_overview.total_columns !== null && dataInfo.dataset_overview.total_columns !== undefined ? dataInfo.dataset_overview.total_columns : 'N/A'} columns • 
              {dataInfo.dataset_overview.data_quality_score !== null && dataInfo.dataset_overview.data_quality_score !== undefined ? dataInfo.dataset_overview.data_quality_score : 'N/A'}% quality
            </span>
          ) : columnsInfo.length > 0 ? (
            <span>{columnsInfo.length} columns analyzed</span>
          ) : (
            <span>No data available</span>
          )}
        </div>
        <div className="flex space-x-3">
          <button 
            className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-colors duration-200"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default CSVDetailsModal;