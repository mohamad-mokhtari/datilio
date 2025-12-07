import ApiService2 from './ApiService2';
import { hasIndexedDBData, logDataSourceInfo, ChartDataResult } from '@/utils/chartDataUtils';

// Sampling metadata returned from backend
export interface SamplingMetadata {
  is_sampled: boolean;           // Whether data was sampled
  total_rows: number;            // Original dataset size
  returned_rows: number;         // Actual rows returned
  sampling_method: string | null; // "systematic", "random", or null
  sampling_interval: number | null; // Interval used (systematic only)
  sampling_ratio: number;        // Percentage as decimal (0.0 - 1.0)
}

export interface UnifiedChartDataResponse {
  data: Array<{ [key: string]: any }>;
  columns: string[];
  size_kb: number;
  sampling: SamplingMetadata;    // Sampling information
}

export interface UnifiedChartDataRequest {
  file_id: string;
  columns: string[];
  max_points?: number;           // Optional: maximum data points to return
  sampling_method?: 'systematic' | 'random'; // Optional: sampling method
  drop_empty_rows?: boolean;     // Optional: remove fully empty rows
}

export interface FilteredChartDataRequest {
  file_id: string;
  python_code_snippet: string;
  columns: string[];
  max_points?: number;           // Optional: maximum data points to return
  sampling_method?: 'systematic' | 'random'; // Optional: sampling method
  drop_empty_rows?: boolean;     // Optional: remove fully empty rows
}

export interface FilteredChartDataResponse extends UnifiedChartDataResponse {
  total_filtered_records: number; // Total records after filter (before sampling)
}

/**
 * Unified Chart Data Service
 * All chart components now use this single endpoint for data fetching
 * Now includes IndexedDB caching for improved performance
 */
export const ChartDataService = {
  /**
   * Fetch chart data with IndexedDB caching
   * First checks IndexedDB for cached data, falls back to backend if not available
   * @param request - Request parameters containing file_id and columns
   * @returns Promise with unified chart data response
   */
  async fetchChartData(request: UnifiedChartDataRequest): Promise<UnifiedChartDataResponse> {
    try {
      console.log('🔍 Checking for chart data with params:', request);
      
      // First, try to get data from IndexedDB
      const indexedDBResult: ChartDataResult = await hasIndexedDBData(request.file_id, request.columns);
      
      if (indexedDBResult.success && indexedDBResult.data) {
        logDataSourceInfo('indexeddb', request.file_id, request.columns);
        console.log('✅ Using cached data from IndexedDB:', indexedDBResult.data);
        return indexedDBResult.data;
      }
      
      // Log why IndexedDB wasn't used
      if (indexedDBResult.error) {
        console.log('⚠️ IndexedDB not available:', indexedDBResult.error);
      }
      
      // Fallback to backend API
      logDataSourceInfo('backend', request.file_id, request.columns);
      console.log('🌐 Fetching data from backend API...');
      
      const response = await ApiService2.post<UnifiedChartDataResponse>(
        "/chart/unified-data",
        request
      );

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status} - ${response.statusText}`);
      }

      console.log('📡 Backend data received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching chart data:', error);
      throw error;
    }
  },

  /**
   * Fetch filtered chart data using the new filtered-data endpoint
   * This method is used when filters are applied to show only filtered data in charts
   * @param request - Request parameters containing file_id, python_code_snippet, and columns
   * @returns Promise with unified chart data response
   */
  async fetchFilteredChartData(request: FilteredChartDataRequest): Promise<FilteredChartDataResponse> {
    try {
      console.log('🔍 Fetching filtered chart data with params:', request);
      
      // For filtered data, we don't use IndexedDB caching since the data is dynamic based on filters
      logDataSourceInfo('backend', request.file_id, request.columns);
      console.log('🌐 Fetching filtered data from backend API...');
      
      const response = await ApiService2.post<FilteredChartDataResponse>(
        "/chart/filtered-data",
        request
      );

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status} - ${response.statusText}`);
      }

      console.log('📡 Filtered backend data received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching filtered chart data:', error);
      throw error;
    }
  }
};

export default ChartDataService;
