/**
 * IndexedDB Data Demo Component
 * Demonstrates how chart data is now automatically cached and retrieved from IndexedDB
 */

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Container from '@/components/shared/Container';
import indexedDBService from '@/services/IndexedDBService';
import { hasIndexedDBData } from '@/utils/chartDataUtils';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

interface CachedFileInfo {
  fileName: string;
  fileId: string;
  columns: string[];
  rowCount: number;
  sizeKB: number;
  uploadedAt: string;
}

const IndexedDBDataDemo: React.FC = () => {
  const [cachedFiles, setCachedFiles] = useState<CachedFileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<CachedFileInfo | null>(null);
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    loadCachedFiles();
  }, []);

  const loadCachedFiles = async () => {
    setLoading(true);
    try {
      const fileNames = await indexedDBService.getAllFileNames();
      const filesInfo: CachedFileInfo[] = [];

      for (const fileName of fileNames) {
        const result = await indexedDBService.getFileData(fileName);
        if (result.success && result.data) {
          filesInfo.push({
            fileName: result.data.file_name,
            fileId: result.data.file_id,
            columns: result.data.columns,
            rowCount: result.data.row_count,
            sizeKB: result.data.compressed_size_kb,
            uploadedAt: result.data.uploaded_at
          });
        }
      }

      setCachedFiles(filesInfo);
    } catch (error) {
      console.error('Error loading cached files:', error);
      toast.push(
        <Notification title="Error" type="danger">
          Failed to load cached files information.
        </Notification>
      );
    } finally {
      setLoading(false);
    }
  };

  const testChartDataAccess = async (fileInfo: CachedFileInfo) => {
    setSelectedFile(fileInfo);
    setTestResult('Testing...');
    
    try {
      // Test with first two columns
      const testColumns = fileInfo.columns.slice(0, 2);
      
      const result = await hasIndexedDBData(fileInfo.fileId, testColumns);
      
      if (result.success && result.data) {
        setTestResult(`✅ SUCCESS: Found cached data for columns [${testColumns.join(', ')}]\n` +
          `📊 Data points: ${result.data.data.length}\n` +
          `📋 Columns: ${result.data.columns.join(', ')}\n` +
          `💾 Size: ${result.data.size_kb.toFixed(2)} KB\n` +
          `🚀 Source: ${result.source.toUpperCase()}`);
        
        toast.push(
          <Notification title="Test Success" type="success">
            Cached data found! Charts will load faster for this file.
          </Notification>
        );
      } else {
        setTestResult(`❌ FAILED: ${result.error || 'Unknown error'}`);
        
        toast.push(
          <Notification title="Test Failed" type="warning">
            No cached data found for this file.
          </Notification>
        );
      }
    } catch (error) {
      setTestResult(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      toast.push(
        <Notification title="Test Error" type="danger">
          Error testing cached data access.
        </Notification>
      );
    }
  };

  const clearAllCache = async () => {
    if (window.confirm('Are you sure you want to clear all cached data? This will make charts load slower.')) {
      try {
        const result = await indexedDBService.clearAllData();
        if (result.success) {
          setCachedFiles([]);
          setSelectedFile(null);
          setTestResult('');
          
          toast.push(
            <Notification title="Cache Cleared" type="success">
              All cached data has been cleared.
            </Notification>
          );
        } else {
          throw new Error(result.error || 'Failed to clear cache');
        }
      } catch (error) {
        console.error('Error clearing cache:', error);
        toast.push(
          <Notification title="Error" type="danger">
            Failed to clear cached data.
          </Notification>
        );
      }
    }
  };

  return (
    <Container>
      <Card header="IndexedDB Data Cache Demo">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              🚀 Chart Data Caching System
            </h3>
            <p className="text-blue-700 text-sm">
              Files between 512KB and 5MB are automatically cached in IndexedDB for faster chart loading. 
              This demo shows which files are cached and allows you to test the caching system.
            </p>
          </div>

          {/* Cache Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800">Cached Files</h4>
              <p className="text-2xl font-bold text-green-600">{cachedFiles.length}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-800">Total Size</h4>
              <p className="text-2xl font-bold text-purple-600">
                {cachedFiles.reduce((sum, file) => sum + file.sizeKB, 0).toFixed(1)} KB
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-800">Total Rows</h4>
              <p className="text-2xl font-bold text-orange-600">
                {cachedFiles.reduce((sum, file) => sum + file.rowCount, 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={loadCachedFiles}
              loading={loading}
              variant="solid"
            >
              🔄 Refresh Cache Info
            </Button>
            <Button 
              onClick={clearAllCache}
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              🗑️ Clear All Cache
            </Button>
          </div>

          {/* Cached Files List */}
          {cachedFiles.length > 0 ? (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800">Cached Files</h4>
              <div className="grid gap-4">
                {cachedFiles.map((file, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-800">{file.fileName}</h5>
                        <p className="text-sm text-gray-600 mb-2">ID: {file.fileId}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Rows:</span> {file.rowCount.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Size:</span> {file.sizeKB.toFixed(1)} KB
                          </div>
                          <div>
                            <span className="font-medium">Columns:</span> {file.columns.length}
                          </div>
                          <div>
                            <span className="font-medium">Uploaded:</span> {new Date(file.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-sm text-gray-600">
                            <span className="font-medium">Columns:</span> {file.columns.join(', ')}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => testChartDataAccess(file)}
                        className="ml-4"
                      >
                        🧪 Test Access
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">No cached files found</p>
              <p className="text-sm">Upload files between 512KB-5MB to see them cached here</p>
            </div>
          )}

          {/* Test Results */}
          {testResult && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-800 mb-2">
                Test Results {selectedFile && `for ${selectedFile.fileName}`}
              </h4>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
                {testResult}
              </pre>
            </div>
          )}
        </div>
      </Card>
    </Container>
  );
};

export default IndexedDBDataDemo;
