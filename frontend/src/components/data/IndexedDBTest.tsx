/**
 * Test Component for IndexedDB functionality
 * Demonstrates the complete flow of data storage and retrieval
 */

import React, { useState, useEffect } from 'react';
import { useStorageInfo } from '@/hooks/useCachedData';
import { getCachedFileNames, clearAllCachedData } from '@/utils/indexedDBUtils';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

const IndexedDBTest: React.FC = () => {
    const [cachedFiles, setCachedFiles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const { storageInfo, refreshStorageInfo } = useStorageInfo();

    useEffect(() => {
        loadCachedFiles();
    }, []);

    const loadCachedFiles = async () => {
        try {
            const files = await getCachedFileNames();
            setCachedFiles(files);
        } catch (error) {
            console.error('Error loading cached files:', error);
        }
    };

    const handleClearAllData = async () => {
        setLoading(true);
        try {
            const success = await clearAllCachedData();
            if (success) {
                toast.push(
                    <Notification title="Success" type="success">
                        All cached data cleared successfully!
                    </Notification>
                );
                await loadCachedFiles();
                await refreshStorageInfo();
            } else {
                toast.push(
                    <Notification title="Error" type="danger">
                        Failed to clear cached data.
                    </Notification>
                );
            }
        } catch (error) {
            console.error('Error clearing data:', error);
            toast.push(
                <Notification title="Error" type="danger">
                    Error clearing cached data.
                </Notification>
            );
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setLoading(true);
        try {
            await loadCachedFiles();
            await refreshStorageInfo();
            toast.push(
                <Notification title="Success" type="success">
                    Data refreshed successfully!
                </Notification>
            );
        } catch (error) {
            console.error('Error refreshing data:', error);
            toast.push(
                <Notification title="Error" type="danger">
                    Error refreshing data.
                </Notification>
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <Card header="IndexedDB Storage Test">
                <div className="space-y-4">
                    {/* Storage Information */}
                    <div>
                        <h4 className="font-medium mb-3">Storage Information</h4>
                        {storageInfo ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 p-3 rounded">
                                    <div className="text-sm text-blue-600">Cached Files</div>
                                    <div className="text-lg font-semibold">{storageInfo.fileCount}</div>
                                </div>
                                <div className="bg-green-50 p-3 rounded">
                                    <div className="text-sm text-green-600">Total Size (KB)</div>
                                    <div className="text-lg font-semibold">{storageInfo.totalSizeKB.toFixed(2)}</div>
                                </div>
                                <div className="bg-purple-50 p-3 rounded">
                                    <div className="text-sm text-purple-600">Total Size (MB)</div>
                                    <div className="text-lg font-semibold">{storageInfo.totalSizeMB.toFixed(2)}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-4">
                                Loading storage information...
                            </div>
                        )}
                    </div>

                    {/* Cached Files List */}
                    <div>
                        <h4 className="font-medium mb-3">Cached Files ({cachedFiles.length})</h4>
                        {cachedFiles.length > 0 ? (
                            <div className="space-y-2">
                                {cachedFiles.map((fileName, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-sm font-medium">{fileName}</span>
                                        <span className="text-xs text-gray-500">Cached</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-4">
                                No cached files found. Upload some files to see them here.
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant="solid"
                            onClick={handleRefresh}
                            loading={loading}
                        >
                            Refresh Data
                        </Button>
                        <Button
                            variant="plain"
                            onClick={handleClearAllData}
                            loading={loading}
                            disabled={cachedFiles.length === 0}
                        >
                            Clear All Cached Data
                        </Button>
                    </div>

                    {/* Instructions */}
                    <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">How to Test:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                            <li>Go to the Upload Data page</li>
                            <li>Upload a file between 500KB - 5MB</li>
                            <li>Check if the file appears in the cached files list above</li>
                            <li>Use the "View Data" button in the file list to test data retrieval</li>
                            <li>Use the Data Visualization component to test plotting functionality</li>
                        </ol>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default IndexedDBTest;
