import React, { useState, useEffect } from 'react';
import { Dialog, Button, Table, Spinner, Alert, Select } from '@/components/ui';
import { ChevronLeft, ChevronRight, Download, Eye } from 'lucide-react';
import PreprocessingService, { PreprocessedFileDataResponse } from '@/services/PreprocessingService';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useConfig } from '@/components/ui/ConfigProvider';

const { Tr, Th, Td, THead, TBody } = Table;

interface PreprocessedFileDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  preprocessedFile: {
    id: string;
    file_name: string;
  };
}

const PreprocessedFileDataModal: React.FC<PreprocessedFileDataModalProps> = ({
  isOpen,
  onClose,
  preprocessedFile,
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
  const [data, setData] = useState<PreprocessedFileDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [formatNumbers, setFormatNumbers] = useState(false);

  const pageSizeOptions = [
    { value: 50, label: '50 rows' },
    { value: 100, label: '100 rows' },
    { value: 200, label: '200 rows' },
    { value: 500, label: '500 rows' },
  ];

  useEffect(() => {
    if (isOpen && preprocessedFile?.id) {
      fetchData();
    }
  }, [isOpen, preprocessedFile?.id, currentPage, pageSize]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await PreprocessingService.getPreprocessedFileData(
        preprocessedFile.id,
        currentPage,
        pageSize
      );
      setData(response);
    } catch (err: any) {
      console.error('Error fetching preprocessed file data:', err);
      const errorMessage = err?.response?.data?.detail?.message || err.message || 'Failed to load file data';
      setError(errorMessage);
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleDownload = async () => {
    try {
      // Show loading state
      toast.push(
        <Notification title="Downloading" type="info">
          Preparing download for {preprocessedFile.file_name}...
        </Notification>
      );

      // Download the file
      const blob = await PreprocessingService.downloadPreprocessedFile(preprocessedFile.id);
      
      // Validate that we received a proper blob
      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Invalid file data received from server');
      }

      // Check if blob is empty
      if (blob.size === 0) {
        throw new Error('Empty file received from server');
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = preprocessedFile.file_name || 'preprocessed_file.csv';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.push(
        <Notification title="Download Complete" type="success">
          Successfully downloaded {preprocessedFile.file_name}
        </Notification>
      );
    } catch (err: any) {
      const errorMessage = err?.response?.data?.detail?.message || err.message || 'Failed to download file';
      toast.push(
        <Notification title="Download Failed" type="danger">
          {errorMessage}
        </Notification>
      );
    }
  };

  const formatValue = (value: any, dtype: string) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>;
    }
    
    if (dtype === 'bool') {
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'True' : 'False'}
        </span>
      );
    }
    
    if (dtype === 'float64' || dtype === 'float32') {
      return typeof value === 'number' ? value.toFixed(4) : value;
    }
    
    if (dtype === 'int64' || dtype === 'int32') {
      return formatNumbers ? value.toLocaleString() : String(value);
    }
    
    return String(value);
  };

  const getDtypeColor = (dtype: string) => {
    const colors: Record<string, string> = {
      'int64': 'bg-blue-100 text-blue-800',
      'int32': 'bg-blue-100 text-blue-800',
      'float64': 'bg-green-100 text-green-800',
      'float32': 'bg-green-100 text-green-800',
      'bool': 'bg-purple-100 text-purple-800',
      'object': 'bg-orange-100 text-orange-800',
    };
    return colors[dtype] || 'bg-gray-100 text-gray-800';
  };

  const renderPaginationButtons = () => {
    if (!data) return null;

    const buttons = [];
    const totalPages = data.pagination.total_pages;
    const currentPage = data.pagination.current_page;

    // Previous button
    buttons.push(
      <Button
        key="prev"
        variant="twoTone"
        size="sm"
        icon={<ChevronLeft />}
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={!data.pagination.has_previous_page}
        className="pagination-button"
      >
        Previous
      </Button>
    );

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          variant={i === currentPage ? "solid" : "twoTone"}
          size="sm"
          onClick={() => handlePageChange(i)}
          className="pagination-button"
        >
          {i}
        </Button>
      );
    }

    // Next button
    buttons.push(
      <Button
        key="next"
        variant="twoTone"
        size="sm"
        icon={<ChevronRight />}
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={!data.pagination.has_next_page}
        className="pagination-button"
      >
        Next
      </Button>
    );

    return buttons;
  };

  return (
    <Dialog
      key="preprocessed-data-modal"
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
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Preprocessed File Data</h2>
            <p className="text-white/80 text-xs">{preprocessedFile.file_name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="twoTone"
            size="sm"
            icon={<Download />}
            onClick={handleDownload}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            Download
          </Button>
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
      </div>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Loading file data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Alert type="danger" showIcon>
              <h3>Error Loading File Data</h3>
              <p>{error}</p>
              <Button onClick={fetchData} className="mt-4">
                Try Again
              </Button>
            </Alert>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* File Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Rows</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.pagination.total_rows.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Columns</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.total_columns}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Page</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.pagination.current_page} of {data.pagination.total_pages}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rows in Page</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.pagination.rows_in_current_page}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rows per page:</label>
                  <Select
                    value={pageSize}
                    onChange={(value) => handlePageSizeChange(Number(value))}
                    className="min-w-[120px]"
                  >
                    {pageSizeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="formatNumbers"
                    checked={formatNumbers}
                    onChange={(e) => setFormatNumbers(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    title="Enable to format numbers with commas (e.g., 1,234). Disable for years or IDs (e.g., 2023)"
                  />
                  <label htmlFor="formatNumbers" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Format numbers with commas
                  </label>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="overflow-x-auto max-h-[60vh] relative">
                {/* Horizontal scroll indicators */}
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none z-10"></div>
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none z-10"></div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" style={{ minWidth: '800px' }}>
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {data.columns.map((column) => (
                      <th key={column.name} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-800 min-w-[150px]">
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{column.name}</div>
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getDtypeColor(column.dtype)}`}>
                            {column.dtype}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {data.data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {data.columns.map((column) => (
                        <td key={column.name} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap min-w-[150px]">
                          {formatValue(row[column.name], column.dtype)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {((data.pagination.current_page - 1) * data.pagination.page_size) + 1} to{' '}
                {Math.min(data.pagination.current_page * data.pagination.page_size, data.pagination.total_rows)} of{' '}
                {data.pagination.total_rows.toLocaleString()} rows
              </div>
              <div className="flex items-center space-x-1">
                {renderPaginationButtons()}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg flex-shrink-0">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {data && (
            <span>
              {data.pagination.rows_in_current_page} rows shown • {data.total_columns} columns • Page {data.pagination.current_page} of {data.pagination.total_pages}
            </span>
          )}
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="default" 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
          >
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default PreprocessedFileDataModal;
