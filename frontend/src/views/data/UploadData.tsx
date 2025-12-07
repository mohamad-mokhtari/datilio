import { useState, useEffect, useMemo } from "react";
import Upload from "@/components/ui/Upload";
import Container from "@/components/shared/Container";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import ApiService2 from "@/services/ApiService2";
import indexedDBService, { FileData } from "@/services/IndexedDBService";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { DataFile } from "@/store/slices/lists/listsSlice";
import { fetchUserFiles } from "@/store/slices/lists/listsSlice";
import Tabs from "@/components/ui/Tabs";
import TabList from "@/components/ui/Tabs/TabList";
import TabNav from "@/components/ui/Tabs/TabNav";
import TabContent from "@/components/ui/Tabs/TabContent";
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { parseBackendError } from '@/utils/errorParser';
import SimpleDataPreviewModal from '@/components/csv/SimpleDataPreviewModal';
import { DataFrameRow, ColumnInfo } from '@/@types/csv';
import { ChevronDown, ChevronUp } from 'lucide-react';

const { Tr, Th, Td, THead, TBody } = Table;

type FileType = 'csv' | 'json' | 'excel';

const maxFileSize = 5000000;   // 5MB

interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total_rows: number;
        total_pages: number;
        current_page: number;
        page_size: number;
        has_next: boolean;
    };
}

const UploadData = () => {
    const [file, setFile] = useState<File | null>(null);
    const [fileList, setFileList] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<FileType>('csv');
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    
    // New states for data preview modal
    const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
    const [dataFrameData, setDataFrameData] = useState<DataFrameRow[]>([]);
    const [loadingDataFrame, setLoadingDataFrame] = useState(false);
    const [columns, setColumns] = useState<ColumnInfo[]>([]);
    const [pagination, setPagination] = useState<PaginatedResponse<DataFrameRow>['pagination'] | null>(null);
    
    // Sort state
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [sortField, setSortField] = useState<'date' | 'size'>('date');
    
    const dispatch = useAppDispatch();
    const { 
        userFiles,
        loading: loadingFiles, 
        error 
    } = useAppSelector((state) => state.lists.lists);
    
    const maxUpload = 1;
    
    // Helper function to format file size
    const formatFileSize = (sizeInBytes: number) => {
        const sizeInKB = sizeInBytes / 1024;
        const sizeInMB = sizeInKB / 1024;
        return {
            kb: sizeInKB.toFixed(2),
            mb: sizeInMB.toFixed(5)
        };
    };
    
    useEffect(() => {
        fetchFilesData();
    }, []);

    useEffect(() => {
        if (userFiles) {
            return;
        }
        fetchFilesData();
    }, [activeTab]);

    const fetchFilesData = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
        }
        
        if (loadingFiles) return;
        try {
            console.log('Fetching all user files...');
            const result = await dispatch(fetchUserFiles()).unwrap();
            console.log('Files fetched successfully:', result?.length || 0, 'files');
        } catch (error) {
            console.error('Failed to fetch files:', error);
        }
    };

    const onChange = (files: File[], fileList: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setFileList(fileList);
        }
    }

    const onFileRemove = (files: File[]) => {
        setFileList(files);
        setFile(files.length > 0 ? files[0] : null);
    }

    const handleUpload = async () => {
        if (!file) return;
        if (loading) return;
    
        setLoading(true);
        console.log('Uploading file...');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_type', activeTab);
        
        try {
            const response = await ApiService2.post<{
                file: DataFile;
                filename: string;
                location: string;
                size: number;
                file_id: string;
                data?: any[];
                compressed_size_kb?: number;
                columns?: string[];
                row_count?: number;
                data_error?: string;
            }>('/data/users/upload-file', formData);
            
            console.log('Upload response received:', response);
            
            // Check if data is included in response (for files between 500KB-5MB)
            if (response.data && response.data.data && response.data.columns) {
                console.log('File data received, storing in IndexedDB...');
                
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
                
                const storeResult = await indexedDBService.storeFileData(fileData);
                
                if (storeResult.success) {
                    console.log('File data stored successfully in IndexedDB');
                    toast.push(
                        <Notification title="Success" type="success">
                            File uploaded and cached successfully! Data is now available for fast access.
                        </Notification>
                    );
                } else {
                    console.warn('Failed to store file data in IndexedDB:', storeResult.error);
                    toast.push(
                        <Notification title="Warning" type="warning">
                            File uploaded successfully, but data caching failed. Some features may be slower.
                        </Notification>
                    );
                }
            } else if (response.data?.data_error) {
                console.warn('Data processing warning:', response.data.data_error);
                toast.push(
                    <Notification title="Success" type="success">
                        File uploaded successfully! Note: Data processing for caching was skipped.
                    </Notification>
                );
            } else {
                console.log('File uploaded but no data included (likely outside 500KB-5MB range)');
                toast.push(
                    <Notification title="Success" type="success">
                        File uploaded successfully!
                    </Notification>
                );
            }
            
            onFileRemove([]);
            
            // Small delay to ensure backend has processed the file
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Fetch updated file list
            await fetchFilesData();
            
        } catch (error: any) {
            console.error('Upload failed:', error);
            
            // Parse error using the utility function
            const parsedError = parseBackendError(error);
            
            toast.push(
                <Notification title={parsedError.title} type="danger">
                    {parsedError.message}
                </Notification>
            );
        } finally {
            console.log('Upload finally block reached');
            setLoading(false);
        }
    };
    
    const beforeUpload = (files: FileList | null, fileList: File[]) => {
        let valid: string | boolean = true

        const allowedFileTypes = {
            csv: ['text/csv'],
            json: ['application/json'],
            excel: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
        };

        

        if (fileList.length >= maxUpload) {
            return `You can only upload ${maxUpload} file(s)`
        }

        if (files) {
            for (const f of files) {
                console.log(f.type)
                if (!allowedFileTypes[activeTab].includes(f.type)) {
                    valid = `Please upload a ${activeTab.toUpperCase()} file!`
                }

                console.log(f.size)
                if (f.size >= maxFileSize) {
                    valid = `Upload file cannot more then ${maxFileSize / 1000000}MB!`
                }
            }
        }

        return valid
    }

    const getFileTypeIcon = () => {
        switch (activeTab) {
            case 'csv':
                return 'fa-file-csv';
            case 'json':
                return 'fa-file-code';
            case 'excel':
                return 'fa-file-excel';
            default:
                return 'fa-file';
        }
    };

    const getFileRequirements = () => {
        switch (activeTab) {
            case 'csv':
                return [
                    'File must be in CSV format',
                    `File size must be less than ${maxFileSize / 1000000}MB`,
                    'First row must contain column headers',
                    'Column names should not contain special characters'
                ];
            case 'json':
                return [
                    'File must be in JSON format',
                    `File size must be less than ${maxFileSize / 1000000}MB`,
                    'JSON must be properly formatted',
                    'Must contain an array of objects or a single object'
                ];
            case 'excel':
                return [
                    'File must be in Excel format (.xlsx or .xls)',
                    `File size must be less than ${maxFileSize / 1000000}MB`,
                    'First row must contain column headers',
                    'Data should be properly formatted in a single sheet'
                ];
            default:
                return [];
        }
    };

    const getFilesForCurrentTab = () => {
        if (!userFiles) {
            console.log('No user files in Redux state');
            return [];
        }
        const filteredFiles = userFiles.filter(file => 
            file.file_type === activeTab && 
            (file.source === 'uploaded' || !file.source) // Only show uploaded files
        );
        console.log(`Files for ${activeTab} tab:`, filteredFiles.length, filteredFiles);
        return filteredFiles;
    };

    // Toggle sort order
    const toggleSortOrder = (field: 'date' | 'size') => {
        if (sortField === field) {
            // Toggle order if clicking the same column
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new field and default to descending
            setSortField(field);
            setSortOrder('desc');
        }
    };

    // Memoized sorted files
    const sortedFiles = useMemo(() => {
        const files = getFilesForCurrentTab();
        return [...files].sort((a, b) => {
            if (sortField === 'date') {
                const dateA = new Date(a.updated_at).getTime();
                const dateB = new Date(b.updated_at).getTime();
                return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            } else {
                // Sort by size
                const sizeA = a.file_size;
                const sizeB = b.file_size;
                return sortOrder === 'desc' ? sizeB - sizeA : sizeA - sizeB;
            }
        });
    }, [userFiles, activeTab, sortOrder, sortField]);

    const fetchColumns = (fileId: string) => {
        ApiService2.get<ColumnInfo[]>(`/data/users/files/${fileId}/columns`)
            .then(response => {
                setColumns(response.data);
            })
            .catch(error => {
                console.error('Failed to fetch fields:', error);
            });
    };

    const fetchDataFrameData = (fileId: string, page: number = 1) => {
        setLoadingDataFrame(true);

        ApiService2.get<PaginatedResponse<DataFrameRow>>(`/data/users/files/${fileId}/data?page=${page}&page_size=50`)
            .then(response => {
                if (response.data && response.data.data && Array.isArray(response.data.data)) {
                    setDataFrameData(response.data.data);
                    setPagination(response.data.pagination);
                } else {
                    console.error('Invalid data format received:', response.data);
                    setDataFrameData([]);
                    setPagination(null);
                }
            })
            .catch(error => {
                console.error('Failed to fetch dataframe data:', error);
                setDataFrameData([]);
                setPagination(null);
            })
            .finally(() => {
                setLoadingDataFrame(false);
            });
    };

    const handlePageChange = (page: number) => {
        if (selectedFile) {
            fetchDataFrameData(selectedFile.file_id, page);
        }
    };

    const handlePreviewData = (file: DataFile) => {
        setSelectedFile(file);
        setPreviewModalOpen(true);
        fetchColumns(file.file_id);
        fetchDataFrameData(file.file_id);
    };

    const closePreviewModal = () => {
        setPreviewModalOpen(false);
        setSelectedFile(null);
        setDataFrameData([]);
        setColumns([]);
        setPagination(null);
    };

    const renderActionButtons = (file: DataFile) => {
        return (
            <Button 
                size="sm" 
                variant="solid"
                onClick={() => handlePreviewData(file)}
            >
                Preview Data
            </Button>
        );
    };

    return (
        <Container>
            <Tabs
                value={activeTab}
                onChange={(value) => setActiveTab(value as FileType)}
            >
                <TabList>
                    <TabNav value="csv">CSV</TabNav>
                    <TabNav value="json">JSON</TabNav>
                    <TabNav value="excel">Excel</TabNav>
                </TabList>
                <TabContent value="csv">
                    <Card header="Upload CSV File">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <h5 className="mb-4">Upload your CSV file</h5>
                                <Upload
                                    draggable
                                    uploadLimit={maxUpload}
                                    beforeUpload={beforeUpload}
                                    onChange={onChange}
                                    onFileRemove={onFileRemove}
                                    showList={true}
                                    multiple={false}
                                    fileList={fileList}
                                >
                                    <div className="my-16 text-center">
                                        <div className="text-6xl mb-4 flex justify-center">
                                            <i className={`fa ${getFileTypeIcon()}`} />
                                        </div>
                                        <p className="font-semibold">
                                            <span className="text-gray-800 dark:text-white">
                                                Drop your CSV file here, or{' '}
                                            </span>
                                            <span className="text-blue-500">browse</span>
                                        </p>
                                        <p className="mt-1 opacity-60 dark:text-white">
                                            Support: CSV
                                        </p>
                                    </div>
                                </Upload>
                                <div className="text-right mt-2">
                                    <Button 
                                        variant="solid" 
                                        onClick={handleUpload} 
                                        loading={loading}
                                        disabled={!file}
                                    >
                                        Upload
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <h5 className="mb-4">CSV File Requirements</h5>
                                <ul className="list-disc pl-5">
                                    {getFileRequirements().map((req, index) => (
                                        <li key={index}>{req}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Card>
                    
                    <Card
                        className="mt-4"
                        header="Your CSV Files"
                        headerBorder={true}
                        footerBorder={false}
                    >
                        {import.meta.env.VITE_ENV === 'development' && (
                            <div className="mb-3">
                                <Button 
                                    size="sm" 
                                    onClick={fetchFilesData} 
                                    loading={loadingFiles}
                                    variant="solid"
                                >
                                    Refresh
                                </Button>
                            </div>
                        )}
                        
                        {error && (
                            <div className="text-center text-danger mb-3">{error}</div>
                        )}
                        
                        {loadingFiles ? (
                            <div className="text-center">Loading files...</div>
                        ) : 
                        sortedFiles.length > 0 ? (
                            <Table>
                                <THead>
                                    <Tr>
                                        <Th>File Name</Th>
                                        <Th>
                                            <button 
                                                onClick={() => toggleSortOrder('date')}
                                                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                                                title={`Sort by date (${sortField === 'date' && sortOrder === 'desc' ? 'newest first' : 'oldest first'})`}
                                            >
                                                <span>Upload Date</span>
                                                {sortField === 'date' && (
                                                    sortOrder === 'desc' ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronUp className="h-4 w-4" />
                                                    )
                                                )}
                                            </button>
                                        </Th>
                                        <Th>
                                            <button 
                                                onClick={() => toggleSortOrder('size')}
                                                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                                                title={`Sort by size (${sortField === 'size' && sortOrder === 'desc' ? 'largest first' : 'smallest first'})`}
                                            >
                                                <span>Size</span>
                                                {sortField === 'size' && (
                                                    sortOrder === 'desc' ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronUp className="h-4 w-4" />
                                                    )
                                                )}
                                            </button>
                                        </Th>
                                        <Th>Source</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {sortedFiles.map((file) => {
                                        const size = formatFileSize(file.file_size);
                                        return (
                                            <Tr key={file.file_id}>
                                                <Td>{file.file_name}</Td>
                                                <Td>{new Date(file.updated_at).toLocaleString()}</Td>
                                                <Td>
                                                    <Tooltip title={`${size.mb} MB`}>
                                                        <span className="cursor-help">{size.kb} KB</span>
                                                    </Tooltip>
                                                </Td>
                                                <Td>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                      file.source === 'synthetic' 
                                                        ? 'bg-purple-100 text-purple-800' 
                                                        : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                      {file.source || 'uploaded'}
                                                    </span>
                                                </Td>
                                                <Td>
                                                    {renderActionButtons(file)}
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </TBody>
                            </Table>
                        ) : (
                            <div className="text-center">No CSV files found. Upload your first file!</div>
                        )}
                    </Card>
                </TabContent>
                <TabContent value="json">
                    <Card header="Upload JSON File">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <h5 className="mb-4">Upload your JSON file</h5>
                                <Upload
                                    draggable
                                    uploadLimit={maxUpload}
                                    beforeUpload={beforeUpload}
                                    onChange={onChange}
                                    onFileRemove={onFileRemove}
                                    showList={true}
                                    multiple={false}
                                    fileList={fileList}
                                >
                                    <div className="my-16 text-center">
                                        <div className="text-6xl mb-4 flex justify-center">
                                            <i className={`fa ${getFileTypeIcon()}`} />
                                        </div>
                                        <p className="font-semibold">
                                            <span className="text-gray-800 dark:text-white">
                                                Drop your JSON file here, or{' '}
                                            </span>
                                            <span className="text-blue-500">browse</span>
                                        </p>
                                        <p className="mt-1 opacity-60 dark:text-white">
                                            Support: JSON
                                        </p>
                                    </div>
                                </Upload>
                                <div className="text-right mt-2">
                                    <Button 
                                        variant="solid" 
                                        onClick={handleUpload} 
                                        loading={loading}
                                        disabled={!file}
                                    >
                                        Upload
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <h5 className="mb-4">JSON File Requirements</h5>
                                <ul className="list-disc pl-5">
                                    {getFileRequirements().map((req, index) => (
                                        <li key={index}>{req}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Card>
                    
                    <Card
                        className="mt-4"
                        header="Your JSON Files"
                        headerBorder={true}
                        footerBorder={false}
                    >
                        {import.meta.env.VITE_ENV === 'development' && (
                            <div className="mb-3">
                                <Button 
                                    size="sm" 
                                    onClick={fetchFilesData} 
                                    loading={loadingFiles}
                                    variant="solid"
                                >
                                    Refresh
                                </Button>
                            </div>
                        )}
                        {loadingFiles ? (
                            <div className="text-center">Loading files...</div>
                        ) : 
                        sortedFiles.length > 0 ? (
                            <Table>
                                <THead>
                                    <Tr>
                                        <Th>File Name</Th>
                                        <Th>
                                            <button 
                                                onClick={() => toggleSortOrder('date')}
                                                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                                                title={`Sort by date (${sortField === 'date' && sortOrder === 'desc' ? 'newest first' : 'oldest first'})`}
                                            >
                                                <span>Upload Date</span>
                                                {sortField === 'date' && (
                                                    sortOrder === 'desc' ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronUp className="h-4 w-4" />
                                                    )
                                                )}
                                            </button>
                                        </Th>
                                        <Th>
                                            <button 
                                                onClick={() => toggleSortOrder('size')}
                                                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                                                title={`Sort by size (${sortField === 'size' && sortOrder === 'desc' ? 'largest first' : 'smallest first'})`}
                                            >
                                                <span>Size</span>
                                                {sortField === 'size' && (
                                                    sortOrder === 'desc' ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronUp className="h-4 w-4" />
                                                    )
                                                )}
                                            </button>
                                        </Th>
                                        <Th>Source</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {sortedFiles.map((file) => {
                                        const size = formatFileSize(file.file_size);
                                        return (
                                            <Tr key={file.file_id}>
                                                <Td>{file.file_name}</Td>
                                                <Td>{new Date(file.updated_at).toLocaleString()}</Td>
                                                <Td>
                                                    <Tooltip title={`${size.mb} MB`}>
                                                        <span className="cursor-help">{size.kb} KB</span>
                                                    </Tooltip>
                                                </Td>
                                                <Td>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                      file.source === 'synthetic' 
                                                        ? 'bg-purple-100 text-purple-800' 
                                                        : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                      {file.source || 'uploaded'}
                                                    </span>
                                                </Td>
                                                <Td>
                                                    {renderActionButtons(file)}
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </TBody>
                            </Table>
                        ) : (
                            <div className="text-center">No JSON files found. Upload your first file!</div>
                        )}
                    </Card>
                </TabContent>
                <TabContent value="excel">
                    <Card header="Upload Excel File">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <h5 className="mb-4">Upload your Excel file</h5>
                                <Upload
                                    draggable
                                    uploadLimit={maxUpload}
                                    beforeUpload={beforeUpload}
                                    onChange={onChange}
                                    onFileRemove={onFileRemove}
                                    showList={true}
                                    multiple={false}
                                    fileList={fileList}
                                >
                                    <div className="my-16 text-center">
                                        <div className="text-6xl mb-4 flex justify-center">
                                            <i className={`fa ${getFileTypeIcon()}`} />
                                        </div>
                                        <p className="font-semibold">
                                            <span className="text-gray-800 dark:text-white">
                                                Drop your Excel file here, or{' '}
                                            </span>
                                            <span className="text-blue-500">browse</span>
                                        </p>
                                        <p className="mt-1 opacity-60 dark:text-white">
                                            Support: Excel
                                        </p>
                                    </div>
                                </Upload>
                                <div className="text-right mt-2">
                                    <Button 
                                        variant="solid" 
                                        onClick={handleUpload} 
                                        loading={loading}
                                        disabled={!file}
                                    >
                                        Upload
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <h5 className="mb-4">Excel File Requirements</h5>
                                <ul className="list-disc pl-5">
                                    {getFileRequirements().map((req, index) => (
                                        <li key={index}>{req}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Card>
                    
                    <Card
                        className="mt-4"
                        header="Your Excel Files"
                        headerBorder={true}
                        footerBorder={false}
                    >
                        {import.meta.env.VITE_ENV === 'development' && (
                            <div className="mb-3">
                                <Button 
                                    size="sm" 
                                    onClick={fetchFilesData} 
                                    loading={loadingFiles}
                                    variant="solid"
                                >
                                    Refresh
                                </Button>
                            </div>
                        )}
                        {loadingFiles ? (
                            <div className="text-center">Loading files...</div>
                        ) : 
                        sortedFiles.length > 0 ? (
                            <Table>
                                <THead>
                                    <Tr>
                                        <Th>File Name</Th>
                                        <Th>
                                            <button 
                                                onClick={() => toggleSortOrder('date')}
                                                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                                                title={`Sort by date (${sortField === 'date' && sortOrder === 'desc' ? 'newest first' : 'oldest first'})`}
                                            >
                                                <span>Upload Date</span>
                                                {sortField === 'date' && (
                                                    sortOrder === 'desc' ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronUp className="h-4 w-4" />
                                                    )
                                                )}
                                            </button>
                                        </Th>
                                        <Th>
                                            <button 
                                                onClick={() => toggleSortOrder('size')}
                                                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                                                title={`Sort by size (${sortField === 'size' && sortOrder === 'desc' ? 'largest first' : 'smallest first'})`}
                                            >
                                                <span>Size</span>
                                                {sortField === 'size' && (
                                                    sortOrder === 'desc' ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronUp className="h-4 w-4" />
                                                    )
                                                )}
                                            </button>
                                        </Th>
                                        <Th>Source</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {sortedFiles.map((file) => {
                                        const size = formatFileSize(file.file_size);
                                        return (
                                            <Tr key={file.file_id}>
                                                <Td>{file.file_name}</Td>
                                                <Td>{new Date(file.updated_at).toLocaleString()}</Td>
                                                <Td>
                                                    <Tooltip title={`${size.mb} MB`}>
                                                        <span className="cursor-help">{size.kb} KB</span>
                                                    </Tooltip>
                                                </Td>
                                                <Td>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                      file.source === 'synthetic' 
                                                        ? 'bg-purple-100 text-purple-800' 
                                                        : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                      {file.source || 'uploaded'}
                                                    </span>
                                                </Td>
                                                <Td>
                                                    {renderActionButtons(file)}
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </TBody>
                            </Table>
                        ) : (
                            <div className="text-center">No Excel files found. Upload your first file!</div>
                        )}
                    </Card>
                </TabContent>
            </Tabs>
            
            {/* Simple Data Preview Modal */}
            <SimpleDataPreviewModal
                isOpen={previewModalOpen}
                onClose={closePreviewModal}
                dataFrameData={dataFrameData}
                loadingDataFrame={loadingDataFrame}
                fileName={selectedFile?.file_name || ''}
                columns={columns}
                pagination={pagination}
                onPageChange={handlePageChange}
            />
        </Container>
    );
};

export default UploadData; 