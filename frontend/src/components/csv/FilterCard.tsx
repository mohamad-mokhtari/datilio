// src/components/FilterCard.tsx
import React, { useState, useEffect } from 'react';
import { QueryBuilder, RuleGroupType, Field, formatQuery, Operator } from 'react-querybuilder';
import { Button } from '@/components/ui';
import { isTypeInCategory, DetailedColumnInfo } from '@/@types/csv';
import FilterHelper from './FilterHelper';
import EnhancedValueInput from './EnhancedValueInput';

// Define operators for different data types
const OPERATORS_BY_TYPE: Record<string, Operator[]> = {
  // Numeric operators
  numeric: [
    { name: '=', label: 'Equals' },
    { name: '!=', label: 'Not Equals' },
    { name: '<', label: 'Less Than' },
    { name: '<=', label: 'Less Than or Equal' },
    { name: '>', label: 'Greater Than' },
    { name: '>=', label: 'Greater Than or Equal' },
    { name: 'between', label: 'Between' },
    { name: 'notBetween', label: 'Not Between' },
    { name: 'in', label: 'In List' },
    { name: 'notIn', label: 'Not In List' },
    { name: 'inUserList', label: 'In User List' },
    { name: 'notInUserList', label: 'Not In User List' },
    { name: 'null', label: 'Is Null' },
    { name: 'notNull', label: 'Is Not Null' }
  ],
  // Text operators
  text: [
    { name: '=', label: 'Equals' },
    { name: '!=', label: 'Not Equals' },
    { name: 'contains', label: 'Contains' },
    { name: 'doesNotContain', label: 'Does Not Contain' },
    { name: 'beginsWith', label: 'Begins With' },
    { name: 'endsWith', label: 'Ends With' },
    { name: 'in', label: 'In List' },
    { name: 'notIn', label: 'Not In List' },
    { name: 'inUserList', label: 'In User List' },
    { name: 'notInUserList', label: 'Not In User List' },
    { name: 'null', label: 'Is Null' },
    { name: 'notNull', label: 'Is Not Null' }
  ],
  // Date operators (datetime, timestamp)
  date: [
    { name: '=', label: 'Equals' },
    { name: '!=', label: 'Not Equals' },
    { name: '<', label: 'Before' },
    { name: '<=', label: 'Before or Equal' },
    { name: '>', label: 'After' },
    { name: '>=', label: 'After or Equal' },
    { name: 'between', label: 'Between' },
    { name: 'notBetween', label: 'Not Between' },
    { name: 'in', label: 'In List' },
    { name: 'notIn', label: 'Not In List' },
    { name: 'null', label: 'Is Null' },
    { name: 'notNull', label: 'Is Not Null' }
  ],
  // Time operators (time-only columns - NEW)
  time: [
    { name: '=', label: 'Equals' },
    { name: '!=', label: 'Not Equals' },
    { name: '<', label: 'Before' },
    { name: '<=', label: 'Before or Equal' },
    { name: '>', label: 'After' },
    { name: '>=', label: 'After or Equal' },
    { name: 'between', label: 'Between' },
    { name: 'notBetween', label: 'Not Between' },
    { name: 'in', label: 'In List' },
    { name: 'notIn', label: 'Not In List' },
    { name: 'null', label: 'Is Null' },
    { name: 'notNull', label: 'Is Not Null' }
  ],
  // Boolean operators
  boolean: [
    { name: '=', label: 'Equals' },
    { name: '!=', label: 'Not Equals' },
    { name: 'null', label: 'Is Null' },
    { name: 'notNull', label: 'Is Not Null' }
  ],
  // Unknown type operators (NEW)
  unknown: [
    { name: '=', label: 'Equals' },
    { name: '!=', label: 'Not Equals' },
    { name: 'contains', label: 'Contains' },
    { name: 'doesNotContain', label: 'Does Not Contain' },
    { name: 'beginsWith', label: 'Begins With' },
    { name: 'endsWith', label: 'Ends With' },
    { name: 'in', label: 'In List' },
    { name: 'notIn', label: 'Not In List' },
    { name: 'null', label: 'Is Null' },
    { name: 'notNull', label: 'Is Not Null' }
  ],
  // Default operators for other types
  default: [
    { name: '=', label: 'Equals' },
    { name: '!=', label: 'Not Equals' },
    { name: 'null', label: 'Is Null' },
    { name: 'notNull', label: 'Is Not Null' }
  ]
};

// Function to get operators for a specific field type
const getOperatorsForType = (fieldType: string): Operator[] => {
  if (isTypeInCategory(fieldType, 'numeric')) {
    return OPERATORS_BY_TYPE.numeric;
  } else if (isTypeInCategory(fieldType, 'text')) {
    return OPERATORS_BY_TYPE.text;
  } else if (isTypeInCategory(fieldType, 'date')) {
    return OPERATORS_BY_TYPE.date;
  } else if (isTypeInCategory(fieldType, 'time')) {
    return OPERATORS_BY_TYPE.time;
  } else if (isTypeInCategory(fieldType, 'boolean')) {
    return OPERATORS_BY_TYPE.boolean;
  } else if (fieldType === 'unknown') {
    return OPERATORS_BY_TYPE.unknown;
  }
  return OPERATORS_BY_TYPE.default;
};

interface FilterCardProps {
    fields: Field[];
    filterQuery: RuleGroupType;
    onFilterChange: (query: RuleGroupType) => void;
    onRunFilter: () => void;
    columnsInfo?: DetailedColumnInfo[];
}

const FilterCard: React.FC<FilterCardProps> = ({ fields, filterQuery, onFilterChange, onRunFilter, columnsInfo = [] }) => {
    const [selectedRuleIndex, setSelectedRuleIndex] = useState<number | undefined>(undefined);

    // Custom value editor component
    const CustomValueEditor = (props: any) => {
        const { field, operator, value, handleOnChange } = props;
        
        return (
            <EnhancedValueInput
                field={field}
                operator={operator}
                value={value}
                onChange={handleOnChange}
                columnsInfo={columnsInfo}
            />
        );
    };

    // Handle query changes and automatically set null values for null operators
    const handleQueryChange = (query: RuleGroupType) => {
        const processRules = (rules: any[]): any[] => {
            return rules.map(rule => {
                if (rule.rules) {
                    // Recursively process nested rules
                    return {
                        ...rule,
                        rules: processRules(rule.rules)
                    };
                } else if (rule.operator === 'null' || rule.operator === 'notNull') {
                    // Automatically set value to "null" for null operators
                    return {
                        ...rule,
                        value: 'null'
                    };
                }
                return rule;
            });
        };

        const processedQuery = {
            ...query,
            rules: processRules(query.rules)
        };

        console.log('Processed query with null values:', processedQuery);
        onFilterChange(processedQuery);
    };

    // Function to find rule by path in nested structure
    const findRuleByPath = (rules: any[], path: number[]): any => {
        if (path.length === 1) {
            return rules[path[0]];
        }
        const currentRule = rules[path[0]];
        if (currentRule && currentRule.rules) {
            return findRuleByPath(currentRule.rules, path.slice(1));
        }
        return null;
    };

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

    // Add click listener to detect rule clicks and update visual selection
    useEffect(() => {
        const handleRuleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            
            // Check if the click is on a rule element
            const ruleElement = target.closest('.rule');
            if (ruleElement) {
                // Find all rule elements to determine the index
                const allRules = document.querySelectorAll('.rule');
                const ruleIndex = Array.from(allRules).indexOf(ruleElement);
                
                if (ruleIndex !== -1) {
                    setSelectedRuleIndex(ruleIndex);
                }
            }
        };

        // Add click listener to the document
        document.addEventListener('click', handleRuleClick);

        // Cleanup
        return () => {
            document.removeEventListener('click', handleRuleClick);
        };
    }, [filterQuery]); // Re-add listener when filter query changes

    // Update visual selection of rules
    useEffect(() => {
        // Remove selected class from all rules
        const allRules = document.querySelectorAll('.rule');
        allRules.forEach(rule => rule.classList.remove('selected'));

        // Add selected class to the currently selected rule
        if (selectedRuleIndex !== undefined) {
            const targetRule = document.querySelectorAll('.rule')[selectedRuleIndex];
            if (targetRule) {
                targetRule.classList.add('selected');
            }
        }
    }, [selectedRuleIndex, filterQuery]);


    return (
    <>
        <style>{`
            /* Closed select box */
            .ruleGroup-combinators {
              width: 220px;
              padding: 10px 12px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              background: linear-gradient(to right, #f9fafb, #f1f5f9);
              color: #334155;
              font-size: 16px;
              font-weight: 500;
              cursor: pointer;
              transition: border-color 0.2s ease, box-shadow 0.2s ease;
            }

            .ruleGroup-combinators:focus {
              outline: none;
              border-color: #3b82f6; /* blue border on focus */
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
            }

            /* Dropdown list items */
            .ruleGroup-combinators option {
              background-color: #ffffff;
              color: #334155;
              padding: 10px 12px;      /* works in most browsers */
              font-size: 15px;
              font-weight: 500;
              cursor: pointer;
            }

            /* Hover/selected states – supported in most modern browsers */
            .ruleGroup-combinators option:hover {
              background-color: #e0f2fe;  /* light blue hover */
              color: #1e40af;
            }

            .ruleGroup-combinators option:checked {
              background-color: #bfdbfe;  /* slightly darker for selected */
              color: #1e3a8a;
            }


            .ruleGroup-header{
                display: flex;
                flex-wrap: wrap;
                justify-content: flex-start;
                flex-direction: row;
                align-items: baseline;
                gap: 12px;
              }

            .query-builder-enhanced .rule {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr auto;
                gap: 16px;
                align-items: center;
                padding: 16px;
                background: white;
                border-radius: 12px;
                border: 1px solid #e5e7eb;
                margin-bottom: 12px;
                transition: all 0.2s ease;
                position: relative;
            }
            
            .query-builder-enhanced .rule::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                border-radius: 12px 12px 0 0;
            }
            
            .query-builder-enhanced .rule:hover {
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                border-color: #3b82f6;
            }
            
            .query-builder-enhanced .rule .rule-fields {
                min-width: 180px;
                max-width: 300px;
            }
            
            .query-builder-enhanced .rule .rule-fields::before {
                content: 'Field';
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #6b7280;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .query-builder-enhanced .rule .rule-operators {
                min-width: 160px;
                max-width: 300px;
            }
            
            .query-builder-enhanced .rule .rule-operators::before {
                content: 'Operator';
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #6b7280;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .query-builder-enhanced .rule .rule-value {
                min-width: 150px;
                max-width: 300px;
            }
            
            .query-builder-enhanced .rule .rule-value::before {
                content: 'Value';
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #6b7280;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .query-builder-enhanced .rule .rule-remove {
                width: 40px;
                height: 40px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .query-builder-enhanced .ruleGroup {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
            }
            
            .query-builder-enhanced .ruleGroup-addGroup {
                margin-top: 12px;
            }
            
            .query-builder-enhanced .combinators {
                margin-bottom: 16px;
            }
            
            /* Enhanced Dropdown Styling */
            .query-builder-enhanced select,
            .query-builder-enhanced .rule select {
                appearance: none;
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
                background-position: right 12px center;
                background-repeat: no-repeat;
                background-size: 16px;
                padding-right: 40px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .query-builder-enhanced select:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            .query-builder-enhanced select:hover {
                border-color: #9ca3af;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }
            
            /* Custom Select Options Styling */
            .query-builder-enhanced select option {
                padding: 12px 16px;
                background: white;
                color: #374151;
                font-weight: 500;
                border: none;
            }
            
            .query-builder-enhanced select option:hover {
                background: #f3f4f6;
                color: #1f2937;
            }
            
            .query-builder-enhanced select option:checked {
                background: #3b82f6;
                color: white;
                font-weight: 600;
            }
            
            /* Input Field Styling */
            .query-builder-enhanced input[type="text"],
            .query-builder-enhanced input[type="number"],
            .query-builder-enhanced input[type="date"] {
                transition: all 0.2s ease;
            }
            
            .query-builder-enhanced input[type="text"]:focus,
            .query-builder-enhanced input[type="number"]:focus,
            .query-builder-enhanced input[type="date"]:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            .query-builder-enhanced input[type="text"]:hover,
            .query-builder-enhanced input[type="number"]:hover,
            .query-builder-enhanced input[type="date"]:hover {
                border-color: #9ca3af;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }
            
            /* Remove Button Styling */
            .query-builder-enhanced .rule-remove {
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 8px;
                color: #dc2626;
                transition: all 0.2s ease;
            }
            
            .query-builder-enhanced .rule-remove:hover {
                background: #fee2e2;
                border-color: #fca5a5;
                color: #b91c1c;
                transform: scale(1.05);
            }
            
            .query-builder-enhanced .rule-remove:active {
                transform: scale(0.95);
            }
            
            /* React QueryBuilder Specific Styling */
            .query-builder-enhanced .rule .rule-fields select,
            .query-builder-enhanced .rule .rule-operators select {
                font-size: 14px;
                font-weight: 500;
                line-height: 1.5;
            }
            
            .query-builder-enhanced .rule .rule-value input {
                font-size: 14px;
                font-weight: 500;
                line-height: 1.5;
            }
            
            /* Enhanced Focus States */
            .query-builder-enhanced .rule .rule-fields:focus-within,
            .query-builder-enhanced .rule .rule-operators:focus-within,
            .query-builder-enhanced .rule .rule-value:focus-within {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
            }
            
            /* Smooth Transitions for All Interactive Elements */
            .query-builder-enhanced .rule .rule-fields,
            .query-builder-enhanced .rule .rule-operators,
            .query-builder-enhanced .rule .rule-value {
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Dark Mode Support */
            @media (prefers-color-scheme: dark) {
                .query-builder-enhanced select option {
                    background: #374151;
                    color: #f9fafb;
                }
                
                .query-builder-enhanced select option:hover {
                    background: #4b5563;
                }
                
                .query-builder-enhanced select option:checked {
                    background: #3b82f6;
                    color: white;
                }
                
                .query-builder-enhanced .rule-remove {
                    background: #7f1d1d;
                    border-color: #991b1b;
                    color: #fca5a5;
                }
                
                .query-builder-enhanced .rule-remove:hover {
                    background: #991b1b;
                    border-color: #b91c1c;
                    color: #fecaca;
                }
            }
            
            @media (max-width: 768px) {
                .query-builder-enhanced .rule {
                    grid-template-columns: 1fr;
                    gap: 8px;
                }
                
                .query-builder-enhanced .rule .rule-fields,
                .query-builder-enhanced .rule .rule-operators,
                .query-builder-enhanced .rule .rule-value {
                    min-width: unset;
                    max-width: unset;
                }
                
                .query-builder-enhanced .rule .rule-remove {
                    margin-top: 0;
                    align-self: center;
                    justify-self: center;
                }
                
                /* Selected rule highlighting */
                .query-builder-enhanced .rule.selected {
                    border: 2px solid #3b82f6 !important;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
                }
                
                .query-builder-enhanced .rule.selected .rule-fields,
                .query-builder-enhanced .rule.selected .rule-operators,
                .query-builder-enhanced .rule.selected .rule-value {
                    border-color: #3b82f6 !important;
                }
            }
        `}</style>
        <div className="query-builder-enhanced">
            <QueryBuilder
                fields={fields}
                query={filterQuery}
                onQueryChange={handleQueryChange}
                getOperators={(field) => {
                    // Find the field type from our fields array
                    const fieldInfo = fields.find(f => f.name === field);
                    const fieldType = (fieldInfo as any)?.type || 'default';
                    return getOperatorsForType(fieldType);
                }}
                controlElements={{
                    valueEditor: CustomValueEditor
                }}
                controlClassnames={{
                    queryBuilder: 'rounded-xl bg-gradient-to-br from-white to-gray-50 shadow-xl p-6 space-y-6 border border-gray-200',
                    ruleGroup: 'ruleGroup',
                    combinators: 'combinators text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-4 py-2 font-medium shadow-sm hover:shadow-md transition-shadow duration-200',
                    addRule: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg px-4 py-2 shadow-lg hover:from-blue-600 hover:to-blue-700 font-medium transition-all duration-200 transform hover:scale-105',
                    addGroup: 'ruleGroup-addGroup bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg px-4 py-2 shadow-lg hover:from-green-600 hover:to-green-700 font-medium transition-all duration-200 transform hover:scale-105',
                    fields: 'rule-fields bg-white text-gray-800 border border-gray-300 rounded-lg px-4 py-3 shadow-sm hover:shadow-md font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    operators: 'rule-operators bg-white text-gray-800 border border-gray-300 rounded-lg px-4 py-3 shadow-sm hover:shadow-md font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    value: 'rule-value bg-white text-gray-800 border border-gray-300 rounded-lg px-4 py-3 shadow-sm hover:shadow-md font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    removeGroup: 'text-red-500 p-3 ml-auto hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 transform hover:scale-110',
                    removeRule: 'rule-remove',
                }}
            />
        </div>

        {/* Filter Helper */}
        <FilterHelper
            filterQuery={filterQuery}
            columnsInfo={columnsInfo}
            fields={fields}
            selectedRuleIndex={selectedRuleIndex}
        />

        {/* <div className="flex justify-end">
            <Button
                size="md"
                variant="solid"
                color="blue"
                onClick={onRunFilter}
                className="m-4"
            >
                Run Filter
            </Button>
        </div> */}

        {import.meta.env.VITE_ENV === 'development'&& (
            <>
                <h4>Query</h4>
                <pre>
                    <code>{formatQuery(filterQuery, 'json')}</code>
                </pre>
            </>
        )}
    </>
);
};

export default FilterCard;