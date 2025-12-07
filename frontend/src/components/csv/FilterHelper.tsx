/**
 * Filter Helper Component
 * Provides helpful hints and suggestions for the current filter being built
 */

import React, { useState, useEffect } from 'react';
import { RuleGroupType } from 'react-querybuilder';
import { DetailedColumnInfo } from '@/@types/csv';
import { useAppSelector } from '@/store/hook';

interface FilterHelperProps {
  filterQuery: RuleGroupType;
  columnsInfo: DetailedColumnInfo[];
  fields: any[];
  selectedRuleIndex?: number; // Index of the currently selected rule
}

const FilterHelper: React.FC<FilterHelperProps> = ({
  filterQuery,
  columnsInfo,
  fields,
  selectedRuleIndex
}) => {
  const [currentField, setCurrentField] = useState<string>('');
  const [currentOperator, setCurrentOperator] = useState<string>('');
  const [showHelper, setShowHelper] = useState<boolean>(true);

  // Get user lists from Redux store (fetched by parent FilterModal)
  const { userLists } = useAppSelector((state) => state.lists.lists);

  // Function to get all rules with their paths (including nested ones)
  const getAllRulesWithPaths = (rules: any[], currentPath: number[] = []): Array<{rule: any, path: number[]}> => {
    const result: Array<{rule: any, path: number[]}> = [];
    
    rules.forEach((rule, index) => {
      const newPath = [...currentPath, index];
      
      if (rule.rules) {
        // This is a group, recursively get rules from it
        result.push(...getAllRulesWithPaths(rule.rules, newPath));
      } else {
        // This is a regular rule
        result.push({ rule, path: newPath });
      }
    });
    
    return result;
  };

  // Monitor the filter query to detect changes
  useEffect(() => {
    if (filterQuery && filterQuery.rules && filterQuery.rules.length > 0) {
      // Get all rules including nested ones
      const allRulesWithPaths = getAllRulesWithPaths(filterQuery.rules);
      
      if (allRulesWithPaths.length > 0) {
        // Use selected rule index if provided, otherwise use the last rule
        const ruleIndex = selectedRuleIndex !== undefined ? selectedRuleIndex : allRulesWithPaths.length - 1;
        const targetRuleData = allRulesWithPaths[ruleIndex];
        
        if (targetRuleData && targetRuleData.rule && typeof targetRuleData.rule === 'object' && 'field' in targetRuleData.rule) {
          setCurrentField(targetRuleData.rule.field);
          setCurrentOperator(targetRuleData.rule.operator || '');
        }
      }
    }
  }, [filterQuery, selectedRuleIndex]);

  // Get column info for the current field
  const columnInfo = columnsInfo.find(col => col.name === currentField);

  // Get helpful hints based on column and operator
  const getHelpfulHints = (): string[] => {
    if (!columnInfo || !currentField) return [];

    const hints: string[] = [];
    
    // General column info
    hints.push(`Column "${columnInfo.name}" has ${columnInfo.num_unique_values} unique values`);

    // Operator-specific hints
    switch (currentOperator) {
      case 'in':
      case 'notIn':
        hints.push(`Enter values manually separated by commas (e.g., "male, female" or "1, 2, 3")`);
        hints.push(`For saved user lists, use "In User List" or "Not In User List" operators instead`);
        break;
      case 'inUserList':
      case 'notInUserList':
        hints.push(`Select from your saved lists in the dropdown above`);
        if (userLists.length > 0) {
          hints.push(`You have ${userLists.length} saved list${userLists.length === 1 ? '' : 's'} available`);
        } else {
          hints.push(`No saved lists found. Create a list first to use this operator`);
        }
        break;
      case 'between':
      case 'notBetween':
        if (['integer', 'float', 'number', 'numeric'].includes(columnInfo.dtype)) {
          hints.push(`Enter two numbers separated by comma (e.g., "18, 65")`);
        } else if (columnInfo.dtype === 'date') {
          hints.push(`Enter two dates separated by comma (e.g., "2023-01-01, 2023-12-31")`);
          if (columnInfo.earliest && columnInfo.latest) {
            hints.push(`Available range: ${columnInfo.earliest} to ${columnInfo.latest}`);
          }
        } else if (columnInfo.dtype === 'time') {
          hints.push(`Enter two times separated by comma (e.g., "09:00:00, 17:00:00")`);
        } else if (['datetime', 'timestamp'].includes(columnInfo.dtype)) {
          hints.push(`Enter two dates separated by comma (e.g., "2023-01-01, 2023-12-31")`);
          if (columnInfo.earliest && columnInfo.latest) {
            hints.push(`Available range: ${columnInfo.earliest} to ${columnInfo.latest}`);
          }
        } else {
          hints.push(`Enter two values separated by comma`);
        }
        break;
      case 'null':
        hints.push(`This operator checks for null/empty values in the column`);
        hints.push(`No value input required - automatically set to "null"`);
        break;
      case 'notNull':
        hints.push(`This operator checks for non-null/non-empty values in the column`);
        hints.push(`No value input required - automatically set to "null"`);
        break;
      case 'contains':
      case 'doesNotContain':
        hints.push(`Enter text to search within values`);
        break;
      case 'regex':
        hints.push(`Enter a regular expression pattern`);
        break;
      default:
        if (['integer', 'float', 'number', 'numeric'].includes(columnInfo.dtype)) {
          hints.push(`Enter a number`);
        } else if (columnInfo.dtype === 'date') {
          hints.push(`Select a date from the picker or enter in YYYY-MM-DD format`);
          if (columnInfo.earliest && columnInfo.latest) {
            hints.push(`Available range: ${columnInfo.earliest} to ${columnInfo.latest}`);
          }
        } else if (columnInfo.dtype === 'time') {
          hints.push(`Select a time from the picker or enter in HH:MM:SS format (24-hour)`);
        } else if (['datetime', 'timestamp'].includes(columnInfo.dtype)) {
          hints.push(`Select a date from the picker or enter in YYYY-MM-DD format`);
          if (columnInfo.earliest && columnInfo.latest) {
            hints.push(`Available range: ${columnInfo.earliest} to ${columnInfo.latest}`);
          }
        } else if (['boolean', 'bool'].includes(columnInfo.dtype)) {
          hints.push(`Enter true or false`);
        } else if (columnInfo.dtype === 'unknown') {
          hints.push(`⚠️ Column type is unknown - treating as text. Enter a text value`);
        } else {
          hints.push(`Enter a text value`);
        }
    }

    // Add unique value info if available and not too many
    if (columnInfo.unique_values && columnInfo.unique_values.length <= 10) {
      const uniqueValues = columnInfo.unique_values.map(v => String(v)).join(', ');
      hints.push(`Available values: ${uniqueValues}`);
    } else if (columnInfo.unique_values && columnInfo.unique_values.length > 10) {
      hints.push(`First few values: ${columnInfo.unique_values.slice(0, 5).map(v => String(v)).join(', ')}...`);
    }

    return hints;
  };

  const hints = getHelpfulHints();

  if (!currentField || !columnInfo) {
    // Show a helpful message when no rule is selected
    if (filterQuery && filterQuery.rules && filterQuery.rules.length > 0) {
      // Check if there are any rules (including nested ones)
      const allRulesWithPaths = getAllRulesWithPaths(filterQuery.rules);
      if (allRulesWithPaths.length > 0) {
        return (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-center text-gray-600">
              <div className="text-sm">
                💡 <strong>Click on any filter rule above</strong> to see helpful hints and suggestions for that specific condition
              </div>
            </div>
          </div>
        );
      }
    }
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span className="text-sm font-semibold text-blue-800">
              💡 Helper for "{currentField}" column
              {selectedRuleIndex !== undefined && (
                <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  Condition {selectedRuleIndex + 1}
                </span>
              )}
            </span>
            <button
              onClick={() => setShowHelper(!showHelper)}
              className="ml-2 text-blue-500 hover:text-blue-700 text-xs"
            >
              {showHelper ? 'Hide' : 'Show'}
            </button>
          </div>

          {showHelper && (
            <div className="space-y-3">
              {/* Helpful hints */}
              {hints.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-blue-700 mb-1">Helpful hints:</div>
                  <ul className="text-xs text-blue-600 space-y-1">
                    {hints.map((hint, index) => (
                      <li key={index}>• {hint}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Column statistics */}
              <div className="text-xs text-blue-600">
                <div><strong>Data type:</strong> {columnInfo.dtype}{columnInfo.dtype === 'unknown' && ' ⚠️'}</div>
                <div><strong>Unique values:</strong> {columnInfo.num_unique_values}</div>
                {columnInfo.most_frequent && (
                  <div><strong>Most frequent:</strong> {columnInfo.most_frequent}</div>
                )}
                {(columnInfo.dtype === 'date' || columnInfo.dtype === 'time' || columnInfo.dtype === 'datetime' || columnInfo.dtype === 'timestamp') && columnInfo.earliest && columnInfo.latest && (
                  <div><strong>Range:</strong> {columnInfo.earliest} to {columnInfo.latest}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterHelper;
