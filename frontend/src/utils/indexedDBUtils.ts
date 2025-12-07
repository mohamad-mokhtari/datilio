/**
 * Utility functions for IndexedDB operations
 * Provides convenient methods for common data operations
 */

import indexedDBService, { FileData } from '@/services/IndexedDBService';

/**
 * Get cached data for a specific file
 * @param fileName - The name of the file
 * @returns Promise with the cached data or null if not found
 */
export const getCachedFileData = async (fileName: string): Promise<FileData | null> => {
    try {
        const result = await indexedDBService.getFileData(fileName);
        return result.success ? result.data || null : null;
    } catch (error) {
        console.error(`Error getting cached data for ${fileName}:`, error);
        return null;
    }
};

/**
 * Check if a file has cached data
 * @param fileName - The name of the file
 * @returns Promise<boolean> - True if cached data exists
 */
export const hasCachedData = async (fileName: string): Promise<boolean> => {
    try {
        return await indexedDBService.fileDataExists(fileName);
    } catch (error) {
        console.error(`Error checking cached data for ${fileName}:`, error);
        return false;
    }
};

/**
 * Get all cached file names
 * @returns Promise<string[]> - Array of cached file names
 */
export const getCachedFileNames = async (): Promise<string[]> => {
    try {
        return await indexedDBService.getAllFileNames();
    } catch (error) {
        console.error('Error getting cached file names:', error);
        return [];
    }
};

/**
 * Get cached data for plotting
 * @param fileName - The name of the file
 * @returns Promise with data suitable for plotting or null
 */
export const getDataForPlotting = async (fileName: string): Promise<{
    data: any[];
    columns: string[];
    rowCount: number;
} | null> => {
    try {
        const cachedData = await getCachedFileData(fileName);
        if (!cachedData) {
            return null;
        }

        return {
            data: cachedData.data,
            columns: cachedData.columns,
            rowCount: cachedData.row_count
        };
    } catch (error) {
        console.error(`Error getting data for plotting for ${fileName}:`, error);
        return null;
    }
};

/**
 * Get column information for a cached file
 * @param fileName - The name of the file
 * @returns Promise<string[]> - Array of column names or empty array
 */
export const getCachedColumns = async (fileName: string): Promise<string[]> => {
    try {
        const cachedData = await getCachedFileData(fileName);
        return cachedData?.columns || [];
    } catch (error) {
        console.error(`Error getting columns for ${fileName}:`, error);
        return [];
    }
};

/**
 * Get row count for a cached file
 * @param fileName - The name of the file
 * @returns Promise<number> - Number of rows or 0
 */
export const getCachedRowCount = async (fileName: string): Promise<number> => {
    try {
        const cachedData = await getCachedFileData(fileName);
        return cachedData?.row_count || 0;
    } catch (error) {
        console.error(`Error getting row count for ${fileName}:`, error);
        return 0;
    }
};

/**
 * Get cached data with pagination
 * @param fileName - The name of the file
 * @param page - Page number (0-based)
 * @param pageSize - Number of items per page
 * @returns Promise with paginated data or null
 */
export const getCachedDataPaginated = async (
    fileName: string, 
    page: number = 0, 
    pageSize: number = 100
): Promise<{
    data: any[];
    totalRows: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
} | null> => {
    try {
        const cachedData = await getCachedFileData(fileName);
        if (!cachedData) {
            return null;
        }

        const totalRows = cachedData.row_count;
        const totalPages = Math.ceil(totalRows / pageSize);
        const startIndex = page * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalRows);
        
        const paginatedData = cachedData.data.slice(startIndex, endIndex);

        return {
            data: paginatedData,
            totalRows,
            totalPages,
            currentPage: page,
            hasNextPage: page < totalPages - 1,
            hasPreviousPage: page > 0
        };
    } catch (error) {
        console.error(`Error getting paginated data for ${fileName}:`, error);
        return null;
    }
};

/**
 * Search within cached data
 * @param fileName - The name of the file
 * @param searchTerm - Term to search for
 * @param columns - Specific columns to search in (optional)
 * @returns Promise with filtered data or null
 */
export const searchCachedData = async (
    fileName: string,
    searchTerm: string,
    columns?: string[]
): Promise<any[] | null> => {
    try {
        const cachedData = await getCachedFileData(fileName);
        if (!cachedData) {
            return null;
        }

        const searchLower = searchTerm.toLowerCase();
        const searchColumns = columns || cachedData.columns;

        const filteredData = cachedData.data.filter(row => {
            return searchColumns.some(column => {
                const value = row[column];
                if (value === null || value === undefined) {
                    return false;
                }
                return String(value).toLowerCase().includes(searchLower);
            });
        });

        return filteredData;
    } catch (error) {
        console.error(`Error searching cached data for ${fileName}:`, error);
        return null;
    }
};

/**
 * Get storage information
 * @returns Promise with storage usage info
 */
export const getStorageInfo = async (): Promise<{
    fileCount: number;
    totalSizeKB: number;
    totalSizeMB: number;
}> => {
    try {
        const info = await indexedDBService.getStorageInfo();
        return {
            fileCount: info.fileCount,
            totalSizeKB: info.totalSize,
            totalSizeMB: info.totalSize / 1024
        };
    } catch (error) {
        console.error('Error getting storage info:', error);
        return {
            fileCount: 0,
            totalSizeKB: 0,
            totalSizeMB: 0
        };
    }
};

/**
 * Clear all cached data
 * @returns Promise<boolean> - True if successful
 */
export const clearAllCachedData = async (): Promise<boolean> => {
    try {
        const result = await indexedDBService.clearAllData();
        return result.success;
    } catch (error) {
        console.error('Error clearing all cached data:', error);
        return false;
    }
};

/**
 * Remove cached data for a specific file
 * @param fileName - The name of the file
 * @returns Promise<boolean> - True if successful
 */
export const removeCachedData = async (fileName: string): Promise<boolean> => {
    try {
        const result = await indexedDBService.deleteFileData(fileName);
        return result.success;
    } catch (error) {
        console.error(`Error removing cached data for ${fileName}:`, error);
        return false;
    }
};

/**
 * Get cached files by type
 * @param fileType - The type of files to filter by
 * @returns Promise<FileData[]> - Array of cached files of the specified type
 */
export const getCachedFilesByType = async (fileType: string): Promise<FileData[]> => {
    try {
        const fileNames = await getCachedFileNames();
        const files: FileData[] = [];

        for (const fileName of fileNames) {
            const data = await getCachedFileData(fileName);
            if (data && data.file_type === fileType) {
                files.push(data);
            }
        }

        return files;
    } catch (error) {
        console.error(`Error getting cached files by type ${fileType}:`, error);
        return [];
    }
};

/**
 * Validate cached data integrity
 * @param fileName - The name of the file
 * @returns Promise<boolean> - True if data is valid
 */
export const validateCachedData = async (fileName: string): Promise<boolean> => {
    try {
        const cachedData = await getCachedFileData(fileName);
        if (!cachedData) {
            return false;
        }

        // Basic validation checks
        const isValid = (
            cachedData.file_name &&
            cachedData.file_id &&
            Array.isArray(cachedData.data) &&
            Array.isArray(cachedData.columns) &&
            typeof cachedData.row_count === 'number' &&
            cachedData.row_count >= 0
        );

        return isValid;
    } catch (error) {
        console.error(`Error validating cached data for ${fileName}:`, error);
        return false;
    }
};
