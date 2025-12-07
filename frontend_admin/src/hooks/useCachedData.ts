/**
 * Custom hook for managing cached data operations
 * Provides reactive state management for IndexedDB operations
 */

import { useState, useEffect, useCallback } from 'react';
import { 
    getCachedFileData, 
    hasCachedData, 
    getDataForPlotting,
    getCachedDataPaginated,
    searchCachedData,
    getStorageInfo,
    FileData 
} from '@/utils/indexedDBUtils';

interface UseCachedDataReturn {
    // Data state
    data: FileData | null;
    loading: boolean;
    error: string | null;
    
    // Operations
    loadData: (fileName: string) => Promise<void>;
    checkDataExists: (fileName: string) => Promise<boolean>;
    clearError: () => void;
}

interface UsePlottingDataReturn {
    // Plotting data state
    plottingData: {
        data: any[];
        columns: string[];
        rowCount: number;
    } | null;
    loading: boolean;
    error: string | null;
    
    // Operations
    loadPlottingData: (fileName: string) => Promise<void>;
    clearError: () => void;
}

interface UsePaginatedDataReturn {
    // Paginated data state
    paginatedData: {
        data: any[];
        totalRows: number;
        totalPages: number;
        currentPage: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    } | null;
    loading: boolean;
    error: string | null;
    
    // Operations
    loadPage: (fileName: string, page: number, pageSize?: number) => Promise<void>;
    nextPage: () => void;
    previousPage: () => void;
    clearError: () => void;
}

interface UseSearchDataReturn {
    // Search data state
    searchResults: any[] | null;
    loading: boolean;
    error: string | null;
    
    // Operations
    search: (fileName: string, searchTerm: string, columns?: string[]) => Promise<void>;
    clearResults: () => void;
    clearError: () => void;
}

interface UseStorageInfoReturn {
    // Storage info state
    storageInfo: {
        fileCount: number;
        totalSizeKB: number;
        totalSizeMB: number;
    } | null;
    loading: boolean;
    error: string | null;
    
    // Operations
    refreshStorageInfo: () => Promise<void>;
    clearError: () => void;
}

/**
 * Hook for managing cached file data
 */
export const useCachedData = (): UseCachedDataReturn => {
    const [data, setData] = useState<FileData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async (fileName: string) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await getCachedFileData(fileName);
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    const checkDataExists = useCallback(async (fileName: string): Promise<boolean> => {
        try {
            return await hasCachedData(fileName);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to check data existence');
            return false;
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        data,
        loading,
        error,
        loadData,
        checkDataExists,
        clearError
    };
};

/**
 * Hook for managing plotting data
 */
export const usePlottingData = (): UsePlottingDataReturn => {
    const [plottingData, setPlottingData] = useState<{
        data: any[];
        columns: string[];
        rowCount: number;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadPlottingData = useCallback(async (fileName: string) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await getDataForPlotting(fileName);
            setPlottingData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load plotting data');
        } finally {
            setLoading(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        plottingData,
        loading,
        error,
        loadPlottingData,
        clearError
    };
};

/**
 * Hook for managing paginated data
 */
export const usePaginatedData = (pageSize: number = 100): UsePaginatedDataReturn => {
    const [paginatedData, setPaginatedData] = useState<{
        data: any[];
        totalRows: number;
        totalPages: number;
        currentPage: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentFileName, setCurrentFileName] = useState<string>('');

    const loadPage = useCallback(async (fileName: string, page: number, customPageSize?: number) => {
        setLoading(true);
        setError(null);
        setCurrentFileName(fileName);
        
        try {
            const result = await getCachedDataPaginated(fileName, page, customPageSize || pageSize);
            setPaginatedData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load page data');
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    const nextPage = useCallback(() => {
        if (paginatedData?.hasNextPage) {
            loadPage(currentFileName, paginatedData.currentPage + 1);
        }
    }, [paginatedData, currentFileName, loadPage]);

    const previousPage = useCallback(() => {
        if (paginatedData?.hasPreviousPage) {
            loadPage(currentFileName, paginatedData.currentPage - 1);
        }
    }, [paginatedData, currentFileName, loadPage]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        paginatedData,
        loading,
        error,
        loadPage,
        nextPage,
        previousPage,
        clearError
    };
};

/**
 * Hook for managing search functionality
 */
export const useSearchData = (): UseSearchDataReturn => {
    const [searchResults, setSearchResults] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const search = useCallback(async (fileName: string, searchTerm: string, columns?: string[]) => {
        setLoading(true);
        setError(null);
        
        try {
            const results = await searchCachedData(fileName, searchTerm, columns);
            setSearchResults(results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to search data');
        } finally {
            setLoading(false);
        }
    }, []);

    const clearResults = useCallback(() => {
        setSearchResults(null);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        searchResults,
        loading,
        error,
        search,
        clearResults,
        clearError
    };
};

/**
 * Hook for managing storage information
 */
export const useStorageInfo = (): UseStorageInfoReturn => {
    const [storageInfo, setStorageInfo] = useState<{
        fileCount: number;
        totalSizeKB: number;
        totalSizeMB: number;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshStorageInfo = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const info = await getStorageInfo();
            setStorageInfo(info);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load storage info');
        } finally {
            setLoading(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Load storage info on mount
    useEffect(() => {
        refreshStorageInfo();
    }, [refreshStorageInfo]);

    return {
        storageInfo,
        loading,
        error,
        refreshStorageInfo,
        clearError
    };
};
