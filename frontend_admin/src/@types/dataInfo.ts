export interface DatasetOverview {
  total_rows: number | null;
  total_columns: number | null;
  memory_usage_mb: number | null;
  data_quality_score: number | null;
}

export interface DataTypesSummary {
  summary: {
    int64: number | null;
    object: number | null;
    float64: number | null;
  };
  numeric_columns: string[];
  categorical_columns: string[];
  date_columns: string[];
}

export interface MissingDataColumn {
  missing_count: number | null;
  missing_percentage: number | null;
}

export interface MissingData {
  total_missing_values: number | null;
  columns_with_missing: number | null;
  missing_percentage: number | null;
  columns: Record<string, MissingDataColumn>;
}

export interface Duplicates {
  duplicate_rows: number | null;
  duplicate_percentage: number | null;
}

export interface NumericSummary {
  count: number | null;
  mean: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
  median: number | null;
  q25: number | null;
  q75: number | null;
}

export interface CategoricalSummary {
  unique_count: number | null;
  most_common_value: string | null;
  most_common_count: number | null;
  most_common_percentage: number | null;
}

export interface Statistics {
  numeric_summary: Record<string, NumericSummary>;
  categorical_summary: Record<string, CategoricalSummary>;
  date_summary: Record<string, any>;
}

export interface DataInfo {
  dataset_overview: DatasetOverview;
  data_types: DataTypesSummary;
  missing_data: MissingData;
  duplicates: Duplicates;
  statistics: Statistics;
  column_names: string[];
}
