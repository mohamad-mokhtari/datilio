import React, { useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import FilterCard from '@/components/csv/FilterCard';
import { RuleGroupType, Field } from 'react-querybuilder';
import { HiOutlineInformationCircle } from 'react-icons/hi';
import { DetailedColumnInfo } from '@/@types/csv';
import { useConfig } from '@/components/ui/ConfigProvider';
import { useAppSelector, useAppDispatch } from '@/store/hook';
import { fetchUserLists } from '@/store/slices/lists/listsSlice';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields: Field[];
  filterQuery: RuleGroupType;
  onFilterChange: (query: RuleGroupType) => void;
  onRunFilter: () => void;
  columnsInfo?: DetailedColumnInfo[];
}

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  fields,
  filterQuery,
  onFilterChange,
  onRunFilter,
  columnsInfo = [],
}) => {
  const { themeColor, primaryColorLevel } = useConfig();
  
  // Get user lists from Redux store and fetch them once when modal opens
  const dispatch = useAppDispatch();
  const { userLists } = useAppSelector((state) => state.lists.lists);
  
  // Fetch user lists once when modal opens
  useEffect(() => {
    if (isOpen && userLists.length === 0) {
      dispatch(fetchUserLists());
    }
  }, [isOpen, dispatch, userLists.length]);
  
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
          background: `linear-gradient(to right, #4f46e5, ${primaryColor})`
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Filter Data</h2>
            <p className="text-white/80 text-xs">Create custom filters to analyze your data</p>
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
          <div className="flex items-center space-x-3 text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <HiOutlineInformationCircle className="text-xl flex-shrink-0" />
            <span className="text-sm font-medium">
              Click the <span className="font-bold text-blue-700">+ Add Rule</span> button to create your first filter condition
            </span>
          </div>

          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
            <FilterCard
              fields={fields}
              filterQuery={filterQuery}
              onFilterChange={onFilterChange}
              onRunFilter={onRunFilter}
              columnsInfo={columnsInfo}
            />
          </div>

          <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg flex-shrink-0">
                <HiOutlineInformationCircle className="text-blue-600 dark:text-blue-400 text-xl" />
              </div>
              <div className="flex-1">
                <h5 className="text-blue-800 dark:text-blue-200 font-semibold mb-3 text-lg">💡 Filter Tips & Best Practices</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-semibold text-blue-800 dark:text-blue-200">🎯 Smart Layout:</span> All inputs are aligned in consistent columns for better readability
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-semibold text-blue-800 dark:text-blue-200">🔗 Combine Conditions:</span> Use AND/OR operators to create complex filters
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-semibold text-blue-800 dark:text-blue-200">📊 Smart Operators:</span> Available operators change based on field type
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-semibold text-blue-800 dark:text-blue-200">💡 Auto-complete:</span> Dropdown suggestions for columns with limited values
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-semibold text-blue-800 dark:text-blue-200">📝 Multiple Values:</span> For "In List" operators, separate values with commas
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-semibold text-blue-800 dark:text-blue-200">🎨 Visual Feedback:</span> Hover effects and color coding for better UX
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg flex-shrink-0">
        <div className="text-sm text-gray-500">
          <span>Create custom filters to analyze your data</span>
        </div>
        <div className="flex space-x-3">
          <button
            className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-colors duration-200"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-white rounded-lg transition-colors duration-200"
            style={{
              backgroundColor: primaryColor
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = lightColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = primaryColor;
            }}
            onClick={onRunFilter}
          >
            Apply Filter
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default FilterModal; 