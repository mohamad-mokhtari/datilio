/**
 * IndexedDB Service for storing and retrieving file data
 * Provides better user experience for large files by caching data locally
 */

export interface FileData {
    file_name: string;
    file_id: string;
    data: any[];
    columns: string[];
    row_count: number;
    compressed_size_kb: number;
    uploaded_at: string;
    file_type: string;
}

export interface IndexedDBResponse {
    success: boolean;
    data?: FileData;
    error?: string;
}

class IndexedDBService {
    private dbName = 'FileDataDB';
    private dbVersion = 1;
    private storeName = 'fileData';
    private db: IDBDatabase | null = null;

    /**
     * Initialize IndexedDB connection
     */
    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                
                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'file_name' });
                    
                    // Create indexes for better querying
                    store.createIndex('file_id', 'file_id', { unique: true });
                    store.createIndex('file_type', 'file_type', { unique: false });
                    store.createIndex('uploaded_at', 'uploaded_at', { unique: false });
                }
            };
        });
    }

    /**
     * Ensure database is initialized
     */
    private async ensureDB(): Promise<void> {
        if (!this.db) {
            await this.init();
        }
    }

    /**
     * Store file data in IndexedDB
     * @param fileData - The file data to store
     */
    async storeFileData(fileData: FileData): Promise<IndexedDBResponse> {
        try {
            await this.ensureDB();
            
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                
                // Add uploaded_at timestamp if not present
                const dataToStore = {
                    ...fileData,
                    uploaded_at: fileData.uploaded_at || new Date().toISOString()
                };

                const request = store.put(dataToStore);

                request.onsuccess = () => {
                    console.log(`File data stored successfully: ${fileData.file_name}`);
                    resolve({ success: true, data: dataToStore });
                };

                request.onerror = () => {
                    reject(new Error(`Failed to store file data: ${fileData.file_name}`));
                };
            });
        } catch (error) {
            console.error('Error storing file data:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Retrieve file data by file name
     * @param fileName - The name of the file to retrieve
     */
    async getFileData(fileName: string): Promise<IndexedDBResponse> {
        try {
            await this.ensureDB();
            
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(fileName);

                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        console.log(`File data retrieved successfully: ${fileName}`);
                        resolve({ success: true, data: result });
                    } else {
                        resolve({ success: false, error: `File data not found: ${fileName}` });
                    }
                };

                request.onerror = () => {
                    reject(new Error(`Failed to retrieve file data: ${fileName}`));
                };
            });
        } catch (error) {
            console.error('Error retrieving file data:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Check if file data exists in IndexedDB
     * @param fileName - The name of the file to check
     */
    async fileDataExists(fileName: string): Promise<boolean> {
        try {
            const result = await this.getFileData(fileName);
            return result.success;
        } catch (error) {
            console.error('Error checking file data existence:', error);
            return false;
        }
    }

    /**
     * Get all stored file names
     */
    async getAllFileNames(): Promise<string[]> {
        try {
            await this.ensureDB();
            
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.getAllKeys();

                request.onsuccess = () => {
                    const fileNames = request.result as string[];
                    resolve(fileNames);
                };

                request.onerror = () => {
                    reject(new Error('Failed to get file names'));
                };
            });
        } catch (error) {
            console.error('Error getting file names:', error);
            return [];
        }
    }

    /**
     * Delete file data from IndexedDB
     * @param fileName - The name of the file to delete
     */
    async deleteFileData(fileName: string): Promise<IndexedDBResponse> {
        try {
            await this.ensureDB();
            
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete(fileName);

                request.onsuccess = () => {
                    console.log(`File data deleted successfully: ${fileName}`);
                    resolve({ success: true });
                };

                request.onerror = () => {
                    reject(new Error(`Failed to delete file data: ${fileName}`));
                };
            });
        } catch (error) {
            console.error('Error deleting file data:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Clear all file data from IndexedDB
     */
    async clearAllData(): Promise<IndexedDBResponse> {
        try {
            await this.ensureDB();
            
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.clear();

                request.onsuccess = () => {
                    console.log('All file data cleared successfully');
                    resolve({ success: true });
                };

                request.onerror = () => {
                    reject(new Error('Failed to clear all file data'));
                };
            });
        } catch (error) {
            console.error('Error clearing all file data:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Get storage usage information
     */
    async getStorageInfo(): Promise<{ fileCount: number; totalSize: number }> {
        try {
            const fileNames = await this.getAllFileNames();
            let totalSize = 0;

            for (const fileName of fileNames) {
                const result = await this.getFileData(fileName);
                if (result.success && result.data) {
                    totalSize += result.data.compressed_size_kb || 0;
                }
            }

            return {
                fileCount: fileNames.length,
                totalSize: totalSize
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return { fileCount: 0, totalSize: 0 };
        }
    }
}

// Create and export a singleton instance
const indexedDBService = new IndexedDBService();
export default indexedDBService;
