import React, { useEffect, useState, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import Table from '@/components/ui/Table';
import Spinner from '@/components/ui/Spinner';
import ApiService2 from '@/services/ApiService2';
import Button from '@/components/ui/Button';
import { HiOutlineTrash, HiOutlineExclamationCircle, HiOutlineCheckCircle, HiOutlineSearch, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineChartBar, HiOutlineTable } from 'react-icons/hi';
import Input from '@/components/ui/Input';
import { useConfig } from '@/components/ui/ConfigProvider';
import PlotCard from './PlotCard';
import { ColumnInfo } from '@/@types/csv';

const { Tr, Th, Td, THead, TBody } = Table;

interface Rule {
  rule_name: string;
  rule_definition: string;
  query: {
    pseudo_query?: {
      query: string;
    };
  };
  id: string;
  user_data_id: string;
}

interface RuleResult {
  rule_name: string;
  status: string;
  applied_records: number;
  filtered_data: any[];
}

interface RuleDataResponse {
  detail: string;
  rule_info: {
    rule_id: string;
    rule_name: string;
    rule_definition: string;
    is_active: boolean;
  };
  data: any[];
  pagination: {
    total_records: number;
    returned_records: number;
    offset: number;
    limit: number;
    has_more: boolean;
  };
}

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
}

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  ruleName: string;
  loading: boolean;
}

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ruleData: any[];
  ruleInfo: {
    rule_id: string;
    rule_name: string;
    rule_definition: string;
    is_active: boolean;
  } | null;
  pagination: {
    total_records: number;
    returned_records: number;
    offset: number;
    limit: number;
    has_more: boolean;
  } | null;
  onPageChange: (page: number) => void;
  loading: boolean;
  fileId: string;
  userId: string;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  ruleName,
  loading,
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

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      width={400}
      height="auto"
      contentClassName="p-0 my-0 flex flex-col"
      closable={false}
      style={{
        content: {
          top: '20vh',
          left: '50%',
          transform: 'translate(-50%, 0)',
          margin: 0,
          position: 'fixed'
        }
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-3 text-white rounded-t-lg flex-shrink-0"
        style={{
          background: `linear-gradient(to right, #dc2626, ${primaryColor})`
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <HiOutlineExclamationCircle className="text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Delete Rule</h2>
            <p className="text-white/80 text-xs">This action cannot be undone</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors duration-200 group"
          aria-label="Close modal"
          disabled={loading}
        >
          <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
            <HiOutlineExclamationCircle className="text-3xl text-red-500" />
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete the rule <strong>"{ruleName}"</strong>? This action cannot be undone.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg flex-shrink-0 space-x-3">
        <button
          className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-colors duration-200"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </Dialog>
  );
};

const RULES_PER_PAGE = 6;

const ResultsModal: React.FC<ResultsModalProps> = ({
  isOpen,
  onClose,
  ruleData,
  ruleInfo,
  pagination,
  onPageChange,
  loading,
  fileId,
  userId,
}) => {
  const { themeColor, primaryColorLevel } = useConfig();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'data' | 'plot'>('data');
  
  // Generate columns from rule data for plotting
  const columns: ColumnInfo[] = useMemo(() => {
    if (!ruleData || ruleData.length === 0) return [];
    
    const firstRow = ruleData[0];
    return Object.keys(firstRow).map((key, index) => ({
      id: index,
      name: key,
      type: typeof firstRow[key] === 'number' ? 'numeric' : 'categorical',
      nullable: firstRow[key] === null || firstRow[key] === undefined
    }));
  }, [ruleData]);
  
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
  
  const currentPage = pagination ? Math.floor(pagination.offset / pagination.limit) + 1 : 1;
  const totalPages = pagination ? Math.ceil(pagination.total_records / pagination.limit) : 1;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      width={1000}
      height="80vh"
      contentClassName="p-0 my-0 flex flex-col"
      closable={false}
      style={{
        content: {
          top: '5vh',
          left: '50%',
          transform: 'translate(-50%, 0)',
          margin: 0,
          position: 'fixed'
        }
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-3 text-white rounded-t-lg flex-shrink-0"
        style={{
          background: `linear-gradient(to right, #16a34a, ${primaryColor})`
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Rule Data Results</h2>
            <p className="text-white/80 text-xs">
              {ruleInfo ? `Viewing data for rule: ${ruleInfo.rule_name}` : 'View rule data results'}
            </p>
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

      {/* Tab Navigation */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <button
          onClick={() => setActiveTab('data')}
          className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
            activeTab === 'data'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-gray-700'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <HiOutlineTable className="w-4 h-4" />
          <span>Data View</span>
        </button>
        <button
          onClick={() => setActiveTab('plot')}
          className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
            activeTab === 'plot'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-gray-700'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <HiOutlineChartBar className="w-4 h-4" />
          <span>Plot View</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {ruleInfo && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">{ruleInfo.rule_name}</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">{ruleInfo.rule_definition}</p>
                  <div className="flex items-center space-x-4 text-xs text-blue-600 dark:text-blue-400">
                    <span>Rule ID: {ruleInfo.rule_id}</span>
                    <span className={`px-2 py-1 rounded-full ${
                      ruleInfo.is_active 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {ruleInfo.is_active ? 'Active' : 'Inactive'}
                    </span>
            </div>
              </div>
            </div>
          </div>
          )}

          {/* Tab Content */}
          {activeTab === 'data' ? (
            <>

        {pagination && (
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
              Showing {pagination.returned_records} of {pagination.total_records} records (Page {currentPage} of {totalPages})
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="plain"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              icon={<HiOutlineChevronLeft />}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="plain"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              icon={<HiOutlineChevronRight />}
            >
              Next
            </Button>
          </div>
        </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Spinner size={24} />
            <span className="ml-2 text-gray-500">Loading rule data...</span>
          </div>
        )}

        {ruleData && ruleData.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
                  <tr>
                    {Object.keys(ruleData[0]).map((column, index) => (
                      <th key={index} className="bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-300 px-4 py-3 text-left">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ruleData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {Object.values(row).map((value, colIndex) => (
                        <td key={colIndex} className="border-b border-gray-100 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">
                          {value !== null && value !== undefined ? String(value) : 'N/A'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
        ) : !loading && (
          <div className="text-center text-gray-500 py-8">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
              <p className="text-lg font-medium mb-2">No data available</p>
              <p className="text-sm">No records found for this rule</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Plot Tab Content */
            <div className="space-y-6">
              {columns.length > 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-800">Data Visualization</h4>
                    <div className="text-sm text-gray-500">
                      {ruleData.length} records available for plotting
                    </div>
                  </div>
                  
                  <PlotCard 
                    userId={userId} 
                    file_id={fileId} 
                    columns={columns}
                    visible_plot_extra_info={true}
                    pythonCodeSnippet={undefined} // We don't need filtering since this is already filtered rule data
                  />
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-lg font-medium mb-2">No data available for plotting</p>
                    <p className="text-sm">No records found for this rule</p>
            </div>
                </div>
              )}
          </div>
        )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg flex-shrink-0">
        <div className="text-sm text-gray-500">
          {ruleInfo ? (
            <span>Viewing {activeTab === 'data' ? 'data' : 'plots'} for rule "{ruleInfo.rule_name}"</span>
          ) : (
            <span>Click on a rule to view its data</span>
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

const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  fileId,
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
  
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    ruleId: string;
    ruleName: string;
  } | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [ruleData, setRuleData] = useState<any[]>([]);
  const [ruleInfo, setRuleInfo] = useState<{
    rule_id: string;
    rule_name: string;
    rule_definition: string;
    is_active: boolean;
  } | null>(null);
  const [pagination, setPagination] = useState<{
    total_records: number;
    returned_records: number;
    offset: number;
    limit: number;
    has_more: boolean;
  } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [loadingRuleData, setLoadingRuleData] = useState(false);
  const [pageSize] = useState(10); // Results per page

  useEffect(() => {
    if (isOpen && fileId) {
      fetchRules();
    } else if (!isOpen) {
      // Reset state when modal is closed
      setSelectedRuleId(null);
      setRuleData([]);
      setRuleInfo(null);
      setPagination(null);
      setShowResults(false);
    }
  }, [isOpen, fileId]);

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiService2.get<Rule[]>(`/rules/users/files/${fileId}/rules`);
      if (!response.ok) {
        throw new Error('Failed to fetch rules');
      }
      setRules(response.data);
    } catch (error) {
      console.error('Error fetching rules:', error);
      setError('Failed to load rules. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (rule: Rule) => {
    setDeleteConfirmation({
      isOpen: true,
      ruleId: rule.id,
      ruleName: rule.rule_name,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation) return;

    setDeletingRuleId(deleteConfirmation.ruleId);
    try {
      const response = await ApiService2.delete(`/rules/users/files/${fileId}/rules/${deleteConfirmation.ruleId}`);
      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }
      setRules(rules.filter(rule => rule.id !== deleteConfirmation.ruleId));
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting rule:', error);
      setError('Failed to delete rule. Please try again.');
    } finally {
      setDeletingRuleId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation(null);
  };

  const handleViewRuleData = async (ruleId: string, page: number = 1) => {
    setLoadingRuleData(true);
    setError(null);
    try {
      const offset = (page - 1) * pageSize;
      const response = await ApiService2.get<RuleDataResponse>(
        `/rules/users/files/${fileId}/rules/${ruleId}/apply_per_rule?offset=${offset}&limit=${pageSize}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch rule data');
      }
      setRuleData(response.data.data);
      setRuleInfo(response.data.rule_info);
      setPagination(response.data.pagination);
      setSelectedRuleId(ruleId);
      setShowResults(true);
    } catch (error) {
      console.error('Error fetching rule data:', error);
      setError('Failed to fetch rule data. Please try again.');
    } finally {
      setLoadingRuleData(false);
    }
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        width={900}
        height="80vh"
        contentClassName="p-0 my-0 flex flex-col"
        closable={false}
        style={{
          content: {
            top: '5vh',
            left: '50%',
            transform: 'translate(-50%, 0)',
            margin: 0,
            position: 'fixed'
          }
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-3 text-white rounded-t-lg flex-shrink-0"
          style={{
            background: `linear-gradient(to right, #9333ea, ${primaryColor})`
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          <div>
            <h2 className="text-lg font-bold text-white">File Rules</h2>
            <p className="text-white/80 text-xs">View and manage rules for this file</p>
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Manage your data processing rules
              </div>
              <div className="text-sm text-gray-500">
                Click "View Data" on any rule to see its results
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <Spinner size={40} />
                <p className="mt-3 text-gray-500">Loading rules...</p>
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">No rules found</p>
                  <p className="text-sm">Create rules to process your data automatically</p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <Table>
                  <THead>
                    <Tr>
                      <Th>Rule Name</Th>
                      <Th>Definition</Th>
                      <Th>Query</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {rules.map((rule) => (
                      <Tr key={rule.id}>
                        <Td className="font-medium">{rule.rule_name}</Td>
                        <Td className="text-sm text-gray-600">{rule.rule_definition}</Td>
                        <Td className="text-sm text-gray-500 font-mono">
                          {rule.query.pseudo_query?.query || 'No query'}
                        </Td>
                        <Td>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="solid"
                              color="blue"
                              onClick={() => handleViewRuleData(rule.id)}
                              loading={loadingRuleData && selectedRuleId === rule.id}
                              disabled={loadingRuleData}
                            >
                              View Data
                            </Button>
                          <Button
                            size="sm"
                            variant="plain"
                            color="red-500"
                            icon={<HiOutlineTrash className="text-lg" />}
                            onClick={() => handleDeleteClick(rule)}
                            loading={deletingRuleId === rule.id}
                            disabled={deletingRuleId === rule.id}
                            className="hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Delete
                          </Button>
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg flex-shrink-0">
          <div className="text-sm text-gray-500">
            {rules.length > 0 ? (
              <span>{rules.length} rule{rules.length !== 1 ? 's' : ''} configured</span>
            ) : (
              <span>No rules configured for this file</span>
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

      {deleteConfirmation && (
        <DeleteConfirmationDialog
          isOpen={deleteConfirmation.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          ruleName={deleteConfirmation.ruleName}
          loading={deletingRuleId === deleteConfirmation.ruleId}
        />
      )}

      <ResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        ruleData={ruleData}
        ruleInfo={ruleInfo}
        pagination={pagination}
        onPageChange={(page) => selectedRuleId && handleViewRuleData(selectedRuleId, page)}
        loading={loadingRuleData}
        fileId={fileId}
        userId="current-user" // You might want to get this from props or context
      />
    </>
  );
};

export default RulesModal; 