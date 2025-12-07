# IndexedDB Implementation for File Data Caching

This document explains the IndexedDB implementation that provides better user experience when working with large files by caching data locally in the browser.

## Overview

The system automatically caches file data for files between 500KB - 5MB when uploaded, storing the data in IndexedDB for fast access during plotting, analysis, and other operations.

## Architecture

### 1. IndexedDB Service (`src/services/IndexedDBService.ts`)
- Core service for IndexedDB operations
- Handles database initialization, data storage, and retrieval
- Provides methods for CRUD operations on cached file data

### 2. Utility Functions (`src/utils/indexedDBUtils.ts`)
- Convenient wrapper functions for common operations
- Functions for plotting data, pagination, search, and storage management
- Error handling and validation utilities

### 3. React Hooks (`src/hooks/useCachedData.ts`)
- Custom hooks for reactive data management
- Hooks for plotting data, paginated data, search, and storage info
- State management with loading and error states

### 4. Components
- **UploadData**: Updated to handle data caching during upload
- **DataVisualization**: Component for testing and using cached data
- **IndexedDBTest**: Test component for verifying functionality

## How It Works

### 1. File Upload Process
```typescript
// When a file is uploaded, the backend checks if it's between 500KB-5MB
// If yes, it includes the processed data in the response
const response = await ApiService2.post('/data/users/upload-file', formData);

// Frontend checks if data is included and stores it in IndexedDB
if (response.data && response.data.data && response.data.columns) {
    const fileData: FileData = {
        file_name: response.data.filename,
        file_id: response.data.file_id,
        data: response.data.data,
        columns: response.data.columns,
        row_count: response.data.row_count || 0,
        compressed_size_kb: response.data.compressed_size_kb || 0,
        uploaded_at: new Date().toISOString(),
        file_type: activeTab
    };
    
    await indexedDBService.storeFileData(fileData);
}
```

### 2. Data Retrieval
```typescript
// Check if data exists
const exists = await indexedDBService.fileDataExists(fileName);

// Get cached data
const result = await indexedDBService.getFileData(fileName);
if (result.success) {
    const data = result.data;
    // Use data for plotting, analysis, etc.
}
```

### 3. Using React Hooks
```typescript
// For plotting data
const { plottingData, loading, loadPlottingData } = usePlottingData();
await loadPlottingData(fileName);

// For paginated data
const { paginatedData, loadPage, nextPage, previousPage } = usePaginatedData(10);
await loadPage(fileName, 0);

// For search
const { searchResults, search } = useSearchData();
await search(fileName, searchTerm, columns);
```

## API Reference

### IndexedDBService Methods

#### `storeFileData(fileData: FileData): Promise<IndexedDBResponse>`
Stores file data in IndexedDB.

#### `getFileData(fileName: string): Promise<IndexedDBResponse>`
Retrieves file data by file name.

#### `fileDataExists(fileName: string): Promise<boolean>`
Checks if file data exists in IndexedDB.

#### `getAllFileNames(): Promise<string[]>`
Gets all cached file names.

#### `deleteFileData(fileName: string): Promise<IndexedDBResponse>`
Deletes file data from IndexedDB.

#### `clearAllData(): Promise<IndexedDBResponse>`
Clears all cached data.

#### `getStorageInfo(): Promise<{fileCount: number; totalSize: number}>`
Gets storage usage information.

### Utility Functions

#### `getCachedFileData(fileName: string): Promise<FileData | null>`
Gets cached data for a specific file.

#### `getDataForPlotting(fileName: string): Promise<{data: any[]; columns: string[]; rowCount: number} | null>`
Gets data formatted for plotting.

#### `getCachedDataPaginated(fileName: string, page: number, pageSize: number): Promise<PaginatedData | null>`
Gets paginated data.

#### `searchCachedData(fileName: string, searchTerm: string, columns?: string[]): Promise<any[] | null>`
Searches within cached data.

### React Hooks

#### `useCachedData()`
Hook for managing cached file data.

#### `usePlottingData()`
Hook for managing plotting data.

#### `usePaginatedData(pageSize?: number)`
Hook for managing paginated data.

#### `useSearchData()`
Hook for managing search functionality.

#### `useStorageInfo()`
Hook for managing storage information.

## Data Structure

### FileData Interface
```typescript
interface FileData {
    file_name: string;           // Unique identifier
    file_id: string;            // Backend file ID
    data: any[];                // Actual data rows
    columns: string[];          // Column names
    row_count: number;          // Total number of rows
    compressed_size_kb: number; // Compressed size in KB
    uploaded_at: string;        // Upload timestamp
    file_type: string;          // File type (csv, json, excel)
}
```

## Usage Examples

### 1. Basic Data Retrieval
```typescript
import { getCachedFileData } from '@/utils/indexedDBUtils';

const data = await getCachedFileData('myfile.csv');
if (data) {
    console.log(`Found ${data.row_count} rows with columns:`, data.columns);
    // Use data.data for plotting or analysis
}
```

### 2. Plotting Data
```typescript
import { usePlottingData } from '@/hooks/useCachedData';

const { plottingData, loading, loadPlottingData } = usePlottingData();

// Load data for plotting
await loadPlottingData('myfile.csv');

if (plottingData) {
    // Use plottingData.data, plottingData.columns, plottingData.rowCount
    // for creating charts or visualizations
}
```

### 3. Paginated Data Display
```typescript
import { usePaginatedData } from '@/hooks/useCachedData';

const { paginatedData, loadPage, nextPage, previousPage } = usePaginatedData(20);

// Load first page
await loadPage('myfile.csv', 0);

// Navigate pages
nextPage();
previousPage();
```

### 4. Search Functionality
```typescript
import { useSearchData } from '@/hooks/useCachedData';

const { searchResults, search } = useSearchData();

// Search in all columns
await search('myfile.csv', 'search term');

// Search in specific columns
await search('myfile.csv', 'search term', ['column1', 'column2']);
```

## Testing

### 1. Upload Test Files
- Upload files between 500KB - 5MB
- Check if they appear in the cached files list
- Verify data is stored correctly

### 2. Data Retrieval Test
- Use the "View Data" button in the file list
- Check console logs for data retrieval
- Verify data structure and content

### 3. Visualization Test
- Use the DataVisualization component
- Test plotting data loading
- Test pagination and search functionality

### 4. Storage Management Test
- Use the IndexedDBTest component
- Check storage information
- Test clearing cached data

## Browser Compatibility

IndexedDB is supported in all modern browsers:
- Chrome 24+
- Firefox 16+
- Safari 10+
- Edge 12+

## Performance Considerations

### Storage Limits
- IndexedDB storage is limited by available disk space
- Typical limits: 50MB - 1GB depending on browser and device
- Monitor storage usage with `getStorageInfo()`

### Data Size
- Only files between 500KB - 5MB are cached
- Larger files are not cached to avoid storage issues
- Smaller files are not cached as they load quickly anyway

### Memory Usage
- Data is stored compressed in IndexedDB
- Decompression happens when data is retrieved
- Consider pagination for very large datasets

## Error Handling

The system includes comprehensive error handling:
- Database initialization errors
- Storage quota exceeded errors
- Data corruption detection
- Network connectivity issues

All operations return success/error status with descriptive messages.

## Future Enhancements

1. **Data Compression**: Implement additional compression algorithms
2. **Background Sync**: Sync cached data with server changes
3. **Data Versioning**: Handle file updates and version conflicts
4. **Advanced Search**: Full-text search with indexing
5. **Data Analytics**: Usage statistics and performance metrics

## Troubleshooting

### Common Issues

1. **Data not caching**: Check file size (must be 500KB-5MB)
2. **Storage errors**: Clear browser data or increase storage quota
3. **Data not found**: Verify file name matches exactly
4. **Performance issues**: Use pagination for large datasets

### Debug Tools

- Browser DevTools → Application → IndexedDB
- Console logs for all operations
- Storage info display in test components
