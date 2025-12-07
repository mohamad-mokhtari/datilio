import ApiService2 from './ApiService2';

export interface ColumnInfo {
  name: string;
  dtype: string;
  preprocessing_data_type: 'Numeric' | 'Categorical' | 'Text' | 'Datetime / Date' | 'Boolean' | 'ID / Unique Identifier' | 'Mixed / Unknown / Dirty Data';
  num_unique_values?: number;
  missing_ratio?: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  unique_values?: string[];
  max_length?: number;
  earliest?: string;
  latest?: string;
  num_true?: number;
  num_false?: number;
}

export interface ColumnsInfoResponse {
  columns: ColumnInfo[];
}

export interface PreprocessingOptions {
  [key: string]: {
    [option: string]: {
      type: 'select' | 'boolean' | 'number' | 'array';
      options?: string[];
      default: any;
    };
  };
}

export interface PreprocessingConfig {
  mode: 'simple' | 'advanced';
  preprocessing: {
    numeric: {
      global: any;
      per_column: { [key: string]: any };
    };
    categorical: {
      global: any;
      per_column: { [key: string]: any };
    };
    text: {
      global: any;
      per_column: { [key: string]: any };
    };
    datetime: {
      global: any;
      per_column: { [key: string]: any };
    };
    boolean: {
      global: any;
      per_column: { [key: string]: any };
    };
    identifier: {
      global: any;
      per_column: { [key: string]: any };
    };
    mixed: {
      global: any;
      per_column: { [key: string]: any };
    };
  };
  output_filename?: string;
}

export interface PreprocessingResult {
  status: string;
  file_id: string;
  filename: string;
  file_size_mb: number;
  rows_before: number;
  rows_after: number;
  columns_before: number;
  columns_after: number;
  transformations_applied: Record<string, string[]>;
  warnings: string[];
}

export interface PreprocessedFile {
  id: string;
  original_file_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_size_mb: number;
  preprocessing_config: any;
  mode: string;
  transformations_applied: any;
  warnings: string[];
  rows_before: number;
  rows_after: number;
  columns_before: number;
  columns_after: number;
  is_ml_ready?: boolean; // True if ALL columns are numeric (ready for ML training without further processing)
  created_at: string;
  updated_at: string;
}

export interface PreprocessedFileMetadata {
  preprocessed_id: string;
  file_info: {
    file_name: string;
    file_size: number;
    file_size_mb: number;
    file_path: string;
    created_at: string;
  };
  dimensions: {
    total_rows: number;
    total_columns: number;
    rows_before_preprocessing: number;
    rows_after_preprocessing: number;
    columns_before_preprocessing: number;
    columns_after_preprocessing: number;
  };
  columns: Array<{
    name: string;
    dtype: string;
    non_null_count: number;
    null_count: number;
    unique_count: number;
    is_numeric: boolean;
    is_categorical: boolean;
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    sample_values?: string[];
  }>;
  column_names: string[];
  numeric_columns: string[];
  categorical_columns: string[];
  sample_data: Array<Record<string, any>>;
  preprocessing: {
    mode: string;
    config: any;
    transformations_applied: Record<string, string[]>;
    warnings: string[];
  };
  original_file_id: string;
}

export interface PreprocessedFileDataResponse {
  preprocessed_id: string;
  filename: string;
  original_file_id: string;
  pagination: {
    current_page: number;
    page_size: number;
    total_rows: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
    rows_in_current_page: number;
  };
  columns: Array<{
    name: string;
    dtype: string;
    sample_values: any[];
  }>;
  total_columns: number;
  data: Array<Record<string, any>>;
}

class PreprocessingService {
  /**
   * Get column information with preprocessing types for a file
   */
  static async getColumnsInfo(fileId: string): Promise<ColumnsInfoResponse> {
    try {
      // The API returns the columns array directly, not wrapped in an object
      const response = await ApiService2.get<ColumnInfo[]>(`/data/users/files/${fileId}/columns-info`);
      console.log('Raw API response:', response.data);
      
      // Transform the direct array response to match our expected structure
      return {
        columns: response.data
      };
    } catch (error) {
      console.error('Error fetching columns info:', error);
      throw error;
    }
  }

  /**
   * Get available preprocessing options for each data type
   */
  static async getPreprocessingOptions(): Promise<PreprocessingOptions> {
    try {
      const response = await ApiService2.get<PreprocessingOptions>('/preprocessing/preprocessing-options');
      return response.data;
    } catch (error) {
      console.error('Error fetching preprocessing options:', error);
      throw error;
    }
  }

  /**
   * Apply preprocessing to a file
   */
  static async preprocessFile(fileId: string, config: PreprocessingConfig): Promise<PreprocessingResult> {
    try {
      const response = await ApiService2.post<PreprocessingResult>(
        `/preprocessing/users/files/${fileId}/preprocess`,
        config
      );
      return response.data;
    } catch (error) {
      console.error('Error preprocessing file:', error);
      throw error;
    }
  }

  /**
   * Get all preprocessed versions of a specific file
   */
  static async getPreprocessedVersions(fileId: string): Promise<PreprocessedFile[]> {
    try {
      const response = await ApiService2.get<PreprocessedFile[]>(`/preprocessing/users/files/${fileId}/preprocessed-versions`);
      return response.data;
    } catch (error) {
      console.error('Error fetching preprocessed versions:', error);
      throw error;
    }
  }

  /**
   * Get all user's preprocessed files
   */
  static async getUserPreprocessedFiles(): Promise<{ total: number; preprocessed_files: PreprocessedFile[] }> {
    try {
      const response = await ApiService2.get<{ total: number; preprocessed_files: PreprocessedFile[] }>('/preprocessing/users/preprocessed-files');
      return response.data;
    } catch (error) {
      console.error('Error fetching user preprocessed files:', error);
      throw error;
    }
  }

  /**
   * Get all user's ML-ready preprocessed files
   * ML-ready files are files where all columns are numeric and suitable for ML model training
   */
  static async getMLReadyPreprocessedFiles(): Promise<{ total: number; ml_ready_files: PreprocessedFile[]; message?: string }> {
    try {
      const response = await ApiService2.get<{ total: number; ml_ready_files: PreprocessedFile[]; message?: string }>('/preprocessing/users/preprocessed-files/ml-ready');
      return response.data;
    } catch (error) {
      console.error('Error fetching ML-ready preprocessed files:', error);
      throw error;
    }
  }

  /**
   * Get preprocessed file data with pagination
   */
  static async getPreprocessedFileData(
    preprocessedId: string, 
    page: number = 1, 
    pageSize: number = 100
  ): Promise<PreprocessedFileDataResponse> {
    try {
      const response = await ApiService2.get<PreprocessedFileDataResponse>(
        `/preprocessing/users/preprocessed-files/${preprocessedId}/data?page=${page}&page_size=${pageSize}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching preprocessed file data:', error);
      throw error;
    }
  }

  /**
   * Delete a preprocessed file
   */
  static async deletePreprocessedFile(preprocessedId: string): Promise<{
    success: boolean;
    message: string;
    deleted: {
      preprocessed_id: string;
      filename: string;
      file_path: string;
      file_deleted_from_disk: boolean;
      original_file_id: string;
    };
    note: string;
  }> {
    try {
      const response = await ApiService2.delete<{
        success: boolean;
        message: string;
        deleted: {
          preprocessed_id: string;
          filename: string;
          file_path: string;
          file_deleted_from_disk: boolean;
          original_file_id: string;
        };
        note: string;
      }>(`/preprocessing/users/preprocessed-files/${preprocessedId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting preprocessed file:', error);
      throw error;
    }
  }

  /**
   * Get preprocessed file metadata
   */
  static async getPreprocessedFileMetadata(preprocessedId: string): Promise<PreprocessedFileMetadata> {
    try {
      const response = await ApiService2.get<PreprocessedFileMetadata>(
        `/preprocessing/users/preprocessed-files/${preprocessedId}/metadata`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching preprocessed file metadata:', error);
      throw error;
    }
  }

  /**
   * Download a preprocessed file
   */
  static async downloadPreprocessedFile(preprocessedId: string): Promise<Blob> {
    try {
      const response = await ApiService2.get<Blob>(
        `/preprocessing/users/preprocessed-files/${preprocessedId}/download`
      );
      
      console.log('Download response:', response);
      console.log('Response data type:', typeof response.data);
      console.log('Response data constructor:', response.data?.constructor?.name);
      console.log('Is Blob:', response.data instanceof Blob);
      
      // Check if the response is actually a Blob (binary data)
      if (response.data instanceof Blob) {
        console.log('Blob size:', response.data.size);
        return response.data;
      } else {
        // If it's not a Blob, the server might be returning text data
        console.warn('Preprocessed file response is not a Blob, converting text to Blob');
        console.log('Response data:', response.data);
        
        // Convert text response to Blob
        const textData = typeof response.data === 'string' ? response.data : String(response.data);
        return new Blob([textData], { type: 'text/csv' });
      }
    } catch (error) {
      console.error('Error downloading preprocessed file:', error);
      throw error;
    }
  }
}

export default PreprocessingService;
