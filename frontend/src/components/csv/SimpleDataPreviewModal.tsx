import React from 'react';
import Dialog from '@/components/ui/Dialog';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import { DataFrameRow, ColumnInfo } from '@/@types/csv';
import { useConfig } from '@/components/ui/ConfigProvider';

const { Tr, Th, Td, THead, TBody } = Table;

interface PaginationInfo {
  total_rows: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  has_next: boolean;
}

interface SimpleDataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataFrameData: DataFrameRow[];
  loadingDataFrame: boolean;
  fileName: string;
  columns?: ColumnInfo[];
  pagination?: PaginationInfo | null;
  onPageChange?: (page: number) => void;
}

const SimpleDataPreviewModal: React.FC<SimpleDataPreviewModalProps> = ({
  isOpen,
  onClose,
  dataFrameData,
  loadingDataFrame,
  fileName,
  columns,
  pagination,
  onPageChange,
}) => {
  const { themeColor, primaryColorLevel } = useConfig();
  
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
      purple: { 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7c3aed', 800: '#6b21a8', 900: '#581c87' },
      fuchsia: { 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75' },
      pink: { 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
      rose: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
    };
    return colorMap[themeColor] || colorMap.blue;
  };

  const colors = getThemeColors();
  const primaryColor = colors[primaryColorLevel] || colors[500];

  const renderTable = () => {
    if (!dataFrameData || dataFrameData.length === 0) {
      return (
        <div className="text-center py-4">No data available for preview.</div>
      );
    }

    const firstRow = dataFrameData[0];
    const columnNames = Object.keys(firstRow);

    return (
      <div className="max-h-[60vh] overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
            <tr>
              {columnNames.map((column, index) => (
                <th key={index} className="bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-300 px-4 py-3 text-left">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataFrameData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {columnNames.map((column, colIndex) => (
                  <td key={colIndex} className="border-b border-gray-100 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">
                    {row[column] !== null && row[column] !== undefined ? String(row[column]) : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPaginationInfo = () => {
    if (!pagination) return null;

    const handlePageChange = (page: number) => {
      if (onPageChange && page >= 1 && page <= pagination.total_pages && !loadingDataFrame) {
        onPageChange(page);
      }
    };

    const renderPaginationButtons = () => {
      const buttons = [];
      const currentPage = pagination.current_page;
      const totalPages = pagination.total_pages;

      // Previous button
      buttons.push(
        <button
          key="prev"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loadingDataFrame}
          className="px-3 py-1 text-sm border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
      );

      // Page numbers
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);

      for (let i = startPage; i <= endPage; i++) {
        buttons.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            disabled={loadingDataFrame}
            className={`px-3 py-1 text-sm border-t border-b border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed ${
              i === currentPage
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700'
            }`}
          >
            {i}
          </button>
        );
      }

      // Next button
      buttons.push(
        <button
          key="next"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loadingDataFrame}
          className="px-3 py-1 text-sm border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      );

      return buttons;
    };

    return (
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Showing {((pagination.current_page - 1) * pagination.page_size) + 1} to{' '}
          {Math.min(pagination.current_page * pagination.page_size, pagination.total_rows)} of{' '}
          {pagination.total_rows} rows
        </div>
        <div className="flex items-center space-x-1">
          {renderPaginationButtons()}
        </div>
      </div>
    );
  };

  return (
    <Dialog
      key="simple-data-preview-modal"
      isOpen={isOpen}
      onClose={onClose}
      width="90vw"
      height="85vh"
      contentClassName="p-0 flex flex-col h-full"
      closable={false}
      style={{
        content: {
          left: '50%',
          transform: 'translate(-50%, 0)',
          margin: 0,
          position: 'fixed',
          maxWidth: '90vw',
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Data Preview</h2>
            <p className="text-white/80 text-xs">{fileName}</p>
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
      <div className="p-6 flex-1 overflow-y-auto min-h-0">
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
            {/* Loading overlay for table area only */}
            {loadingDataFrame && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                <div className="text-center">
                  <div 
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-2"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <Spinner size={20} />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Loading page data...</p>
                </div>
              </div>
            )}
            
            {/* Table content - always rendered to maintain size */}
            {dataFrameData && dataFrameData.length > 0 ? (
              <>
                {renderTable()}
                {renderPaginationInfo()}
              </>
            ) : !loadingDataFrame ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">No data available</h4>
                <p className="text-xs text-gray-500">No data to display for preview</p>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Spinner size={24} />
                  <p className="text-sm text-gray-600 mt-2">Loading initial data...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg flex-shrink-0">
        <div className="text-sm text-gray-500">
          {dataFrameData && dataFrameData.length > 0 && (
            <span>
              {dataFrameData.length} rows loaded
              {pagination && (
                <span> • Page {pagination.current_page} of {pagination.total_pages}</span>
              )}
            </span>
          )}
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="default" 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          >
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default SimpleDataPreviewModal;
