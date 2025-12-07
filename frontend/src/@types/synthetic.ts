export interface SyntheticDataRequest {
  num_rows: number;
  columns_info: {
    columns: Record<string, {
      field: string;
      params: Record<string, any>;
      category: string;
    }>;
  };
  csv_file_name: string;
}

export interface SyntheticDataResponse {
  task_id: string;
  message: string;
  status: string;
}
