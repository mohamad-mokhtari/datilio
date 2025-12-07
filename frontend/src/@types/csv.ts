// Define shared interfaces for CSV data structures

// Interface for basic column info
export interface ColumnInfo {
  name: string;
  type: string;
}

// Interface for a collection of column information
export interface ColumnSummaryInfo {
  [key: string]: ColumnInfo;
}

// Interface for detailed column information
export interface DetailedColumnInfo {
  name: string;
  dtype: string;
  num_unique_values: number;
  most_frequent?: string;
  max_length?: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std_dev?: number;
  unique_values: any[];
  missing_ratio?: number; // Ratio of missing values (0.0 to 1.0)
  earliest?: string; // For date/time columns - earliest value
  latest?: string; // For date/time columns - latest value
}

// Interface for dataframe data (array of objects)
export interface DataFrameRow {
  [key: string]: any;
}

// Interface for tabular dataframe response
export interface DataFrameResponse {
  columns: string[];
  data: any[][];
}

// Interface for query builder field
export interface QueryField {
  name: string;
  label: string;
  type: string;
}

// Interface for react-select options
export interface SelectOption {
  value: string;
  label: string;
}

// Interface for input configuration in plot config
export interface InputConfig {
  label: string;
  type: 'simple_select' | 'multi_select' | 'text';
  values_type?: string | string[]; // Support both single type and array of types
}

// Interface for the plot configuration from JSON
export interface PlotConfigItem {
  plot_type: string;
  inputs: InputConfig[];
}

// Interface for chart data returned from API
export interface ChartData {
  // Define the structure of your chart data here
  title?: string;
  data?: any[];
  labels?: string[];
  // Add other properties as needed
}

// Props for the PlotCard component
export interface PlotCardProps {
  userId: string;
  file_id: string;
  columns: ColumnInfo[];
}

// Type mapping for column type categories
export const TYPE_MAPPINGS = {
  numeric: ['integer', 'float', 'number', 'numeric', 'decimal'],
  string: ['string', 'text', 'varchar', 'char', 'unknown'], // Added 'string' as alias for 'text'
  text: ['string', 'text', 'varchar', 'char', 'unknown'],
  date: ['date'],
  datetime: ['datetime', 'timestamp'],
  time: ['time'],
  boolean: ['boolean', 'bool']
};

// Function to check if a column type belongs to a category
export function isTypeInCategory(columnType: string, category: 'numeric' | 'text' | 'string' | 'date' | 'datetime' | 'time' | 'boolean' | 'any'): boolean {
  if (category === 'any') {
    return true; // 'any' accepts all column types
  }
  return TYPE_MAPPINGS[category]?.includes(columnType) || columnType === category;
}

// Function to check if a column type matches any of the allowed types
export function isTypeInCategories(columnType: string, categories: string | string[]): boolean {
  // If single string, convert to array
  const categoryArray = Array.isArray(categories) ? categories : [categories];
  
  // Check if column type matches any of the categories
  return categoryArray.some(category => isTypeInCategory(columnType, category as any));
}