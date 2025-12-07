# IndexedDB Chart Integration

## Overview

This implementation adds IndexedDB caching to the chart components for improved performance. When files between 512KB and 5MB are uploaded, the backend returns the data which is automatically cached in IndexedDB. Chart components now check IndexedDB first before making backend requests.

## Key Features

### 🚀 Automatic Caching
- Files between 512KB-5MB are automatically cached in IndexedDB during upload
- Cached data includes: file data, columns, row count, and metadata
- No user intervention required

### 📊 Smart Chart Data Loading
- Chart components automatically check IndexedDB first
- Falls back to backend API if cached data is not available
- Significant performance improvement for large datasets

### 🔍 Transparent Operation
- Users see faster chart loading without any changes to workflow
- Console logs show data source (IndexedDB vs Backend)
- Graceful fallback ensures charts always work

## Implementation Details

### Files Modified/Created

1. **`src/utils/chartDataUtils.ts`** (NEW)
   - Utility functions for IndexedDB data operations
   - `hasIndexedDBData()` - Check if data exists in cache
   - `transformIndexedDBDataToChartResponse()` - Transform cached data to chart format
   - `getFileNameFromFileId()` - Map file IDs to file names

2. **`src/services/ChartDataService.ts`** (MODIFIED)
   - Enhanced to check IndexedDB first
   - Falls back to backend API if cache miss
   - Added detailed logging for debugging

3. **`src/components/charts/BarHistogramComponent.tsx`** (MODIFIED)
   - Updated to use unified ChartDataService
   - Now benefits from IndexedDB caching

4. **`src/components/data/IndexedDBDataDemo.tsx`** (NEW)
   - Demo component to show cached files
   - Test cached data access
   - Cache management utilities

### Data Flow

```
1. User uploads file (512KB-5MB)
   ↓
2. Backend processes and returns data
   ↓
3. UploadData.tsx stores data in IndexedDB
   ↓
4. User creates chart
   ↓
5. ChartDataService checks IndexedDB first
   ↓
6. If found: Use cached data (FAST)
   ↓
7. If not found: Fetch from backend (FALLBACK)
```

### IndexedDB Schema

```typescript
interface FileData {
  file_name: string;        // Primary key
  file_id: string;          // Unique identifier
  data: any[];             // Array of row objects
  columns: string[];       // Column names
  row_count: number;       // Number of rows
  compressed_size_kb: number; // File size
  uploaded_at: string;     // Timestamp
  file_type: string;       // csv, json, excel
}
```

## Usage

### For Chart Components
Chart components automatically benefit from this caching. No changes needed:

```typescript
// This now checks IndexedDB first automatically
const response = await ChartDataService.fetchChartData({
  file_id: fileId,
  columns: [column1, column2]
});
```

### For Testing/Debugging
Use the demo component to see cached files and test access:

```typescript
import IndexedDBDataDemo from '@/components/data/IndexedDBDataDemo';

// Add to your routes or test pages
<IndexedDBDataDemo />
```

## Benefits

### Performance
- **Faster Loading**: Cached data loads instantly vs network requests
- **Reduced Server Load**: Fewer backend requests for large files
- **Better UX**: Charts appear immediately for cached data

### Reliability
- **Offline Capability**: Cached charts work without internet
- **Graceful Fallback**: Always works even if cache fails
- **Data Consistency**: Same data format as backend API

### Developer Experience
- **Transparent**: No changes needed to existing chart components
- **Debuggable**: Clear console logs show data source
- **Testable**: Demo component for testing and validation

## Console Output

When charts load, you'll see helpful console messages:

```
🔍 Checking for chart data with params: {file_id: "...", columns: [...]}
✅ Using cached data from IndexedDB: {data: [...], columns: [...]}
📊 Chart Data Source: INDEXEDDB
📁 File ID: cad6283b-0989-40e3-9598-28e0108c857b
📋 Columns: PassengerId, Survived
✅ Using cached data from IndexedDB - faster loading!
```

Or for backend fallback:

```
⚠️ IndexedDB not available: File not found in IndexedDB
🌐 Fetching data from backend API...
📊 Chart Data Source: BACKEND
📡 Backend data received: {data: [...], columns: [...]}
```

## Future Enhancements

1. **Cache Invalidation**: Automatic cache updates when files change
2. **Cache Size Management**: Limit total cache size with LRU eviction
3. **Column-Specific Caching**: Cache individual columns separately
4. **Background Sync**: Pre-load commonly used chart combinations
5. **Cache Analytics**: Track cache hit rates and performance metrics
