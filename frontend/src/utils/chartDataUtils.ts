/**
 * Chart Data Utilities
 * Provides utilities for working with chart data from both IndexedDB and backend
 */

import indexedDBService, { FileData } from '@/services/IndexedDBService';
import { UnifiedChartDataResponse } from '@/services/ChartDataService';

export interface ChartDataResult {
  success: boolean;
  data?: UnifiedChartDataResponse;
  source: 'indexeddb' | 'backend';
  error?: string;
}

/**
 * Get file name from file ID by checking user files
 * This is a helper function to map file IDs to file names for IndexedDB lookup
 */
export const getFileNameFromFileId = async (fileId: string): Promise<string | null> => {
  try {
    // Get all stored file names from IndexedDB
    const fileNames = await indexedDBService.getAllFileNames();
    
    // For now, we'll need to check each file to see if it matches the file ID
    // In a real implementation, you might want to store file_id as an index in IndexedDB
    for (const fileName of fileNames) {
      const result = await indexedDBService.getFileData(fileName);
      if (result.success && result.data && result.data.file_id === fileId) {
        return fileName;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting file name from file ID:', error);
    return null;
  }
};

/**
 * Transform IndexedDB file data to UnifiedChartDataResponse format
 */
export const transformIndexedDBDataToChartResponse = (
  fileData: FileData,
  requestedColumns: string[]
): UnifiedChartDataResponse => {
  // Filter data to only include requested columns
  const filteredData = fileData.data.map(row => {
    const filteredRow: { [key: string]: any } = {};
    requestedColumns.forEach(column => {
      if (row.hasOwnProperty(column)) {
        filteredRow[column] = row[column];
      }
    });
    return filteredRow;
  });

  // Calculate size in KB (approximate)
  const sizeKB = JSON.stringify(filteredData).length / 1024;

  return {
    data: filteredData,
    columns: requestedColumns.filter(col => fileData.columns.includes(col)),
    size_kb: sizeKB,
    // IndexedDB data is not sampled (all data is already cached)
    sampling: {
      is_sampled: false,
      total_rows: filteredData.length,
      returned_rows: filteredData.length,
      sampling_method: null,
      sampling_interval: null,
      sampling_ratio: 1.0
    }
  };
};

/**
 * Check if IndexedDB has data for the given file and columns
 */
export const hasIndexedDBData = async (
  fileId: string,
  requestedColumns: string[]
): Promise<ChartDataResult> => {
  try {
    // First, try to find the file name from the file ID
    const fileName = await getFileNameFromFileId(fileId);
    
    if (!fileName) {
      return {
        success: false,
        source: 'indexeddb',
        error: 'File not found in IndexedDB'
      };
    }

    // Get the file data from IndexedDB
    const result = await indexedDBService.getFileData(fileName);
    
    if (!result.success || !result.data) {
      return {
        success: false,
        source: 'indexeddb',
        error: 'File data not found in IndexedDB'
      };
    }

    const fileData = result.data;

    // Check if all requested columns exist in the cached data
    const missingColumns = requestedColumns.filter(col => !fileData.columns.includes(col));
    
    if (missingColumns.length > 0) {
      return {
        success: false,
        source: 'indexeddb',
        error: `Missing columns in cached data: ${missingColumns.join(', ')}`
      };
    }

    // Transform the data to the expected format
    const chartResponse = transformIndexedDBDataToChartResponse(fileData, requestedColumns);

    return {
      success: true,
      data: chartResponse,
      source: 'indexeddb'
    };

  } catch (error) {
    console.error('Error checking IndexedDB data:', error);
    return {
      success: false,
      source: 'indexeddb',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Log data source information for debugging
 */
export const logDataSourceInfo = (source: 'indexeddb' | 'backend', fileId: string, columns: string[]) => {
  console.log(`📊 Chart Data Source: ${source.toUpperCase()}`);
  console.log(`📁 File ID: ${fileId}`);
  console.log(`📋 Columns: ${columns.join(', ')}`);
  
  if (source === 'indexeddb') {
    console.log('✅ Using cached data from IndexedDB - faster loading!');
  } else {
    console.log('🌐 Using backend API - data will be fetched from server');
  }
};
