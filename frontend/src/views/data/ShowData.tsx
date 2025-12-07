import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Container from "@/components/shared/Container";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import Dialog from '@/components/ui/Dialog';
import ApiService2 from "@/services/ApiService2";
import { useAppSelector, useAppDispatch } from "@/store/hook";
import { DataFile, fetchUserFiles } from "@/store/slices/lists/listsSlice";
import DataPreviewModal from '@/components/csv/DataPreviewModal';
import CSVDetailsModal from '@/components/csv/CSVDetailsModal';
import Tabs from "@/components/ui/Tabs";
import TabList from "@/components/ui/Tabs/TabList";
import TabNav from "@/components/ui/Tabs/TabNav";
import TabContent from "@/components/ui/Tabs/TabContent";
import { 
  DetailedColumnInfo, 
  DataFrameRow, 
  ColumnInfo,
  QueryField 
} from '@/@types/csv';
import { DataInfo } from '@/@types/dataInfo';
import { HiOutlineDocumentText, HiOutlineEye, HiOutlineTrash, HiOutlineDownload } from 'react-icons/hi';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { parseBackendError } from '@/utils/errorParser';

const { Tr, Th, Td, THead, TBody } = Table;

type FileType = 'csv' | 'json' | 'excel';

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

const ShowData = () => {
  const dispatch = useAppDispatch();
  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [columnsInfo, setColumnsInfo] = useState<DetailedColumnInfo[]>([]);
  const [loadingColumnInfo, setLoadingColumnInfo] = useState(false);
  const [fields, setFields] = useState<QueryField[]>([]);
  const [columnsSummaryInfo, setColumnsSummaryInfo] = useState<ColumnInfo[]>([]);
  const [activeTab, setActiveTab] = useState<FileType>('csv');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortField, setSortField] = useState<'date' | 'size'>('date');
  
  // Data info states
  const [dataInfo, setDataInfo] = useState<DataInfo | null>(null);
  const [loadingDataInfo, setLoadingDataInfo] = useState(false);
  const [dataInfoError, setDataInfoError] = useState<string | null>(null);

  // New states for data preview
  const [isDataPreviewOpen, setIsDataPreviewOpen] = useState(false);
  const [dataFrameData, setDataFrameData] = useState<DataFrameRow[]>([]);
  const [loadingDataFrame, setLoadingDataFrame] = useState(false);
  const [pagination, setPagination] = useState<PaginatedResponse<DataFrameRow>['pagination'] | null>(null);
  
  // Helper function to format file size
  const formatFileSize = (sizeInBytes: number) => {
    const sizeInKB = sizeInBytes / 1024;
    const sizeInMB = sizeInKB / 1024;
    return {
      kb: sizeInKB.toFixed(2),
      mb: sizeInMB.toFixed(5)
    };
  };


  // Use Redux state for files
  const { 
    userFiles,
    loading: loadingFiles, 
    error 
  } = useAppSelector((state) => state.lists.lists);

  const userId = '44ab6b6f-72c4-450a-96dc-1a73bba94420';

  const handleFileClick = (file: DataFile) => {
    setSelectedFile(file);
    setIsModalOpen(true);
    fetchColumnInfo(file.file_id);
    fetchDataInfo(file.file_id);
    fetchDataFrameData(file.file_id);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setColumnsInfo([]);
    setDataFrameData([]);
    setDataInfo(null);
    setDataInfoError(null);
  };

  const handleDataPreview = (file: DataFile) => {
    setSelectedFile(file);
    setIsDataPreviewOpen(true);
    fetchColumns(file.file_id);
    fetchColumnInfo(file.file_id);
    fetchDataFrameData(file.file_id);
  };

  const closeDataPreviewModal = useCallback(() => {
    setIsDataPreviewOpen(false);
    setDataFrameData([]);
    // Reopen the FilterModal when DataPreviewModal is closed (if FilterModal is being used)
    // setIsFilterModalOpen(true);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    if (selectedFile) {
      fetchDataFrameData(selectedFile.file_id, page);
    }
  }, [selectedFile]);

  const fetchColumnInfo = (fileId: string) => {
    setLoadingColumnInfo(true);

    ApiService2.get<DetailedColumnInfo[]>(`/data/users/files/${fileId}/columns-info`)
      .then(response => {
        console.log('Columns info:', response.data);
        setColumnsInfo(response.data);
      })
      .catch(error => {
        console.error('Failed to fetch column info:', error);
        
        // Parse error using the utility function
        const parsedError = parseBackendError(error);
        
        toast.push(
          <Notification title={parsedError.title} type="danger">
            {parsedError.message}
          </Notification>
        );
      })
      .finally(() => {
        setLoadingColumnInfo(false);
      });
  };

  const fetchColumns = (fileId: string) => {
    ApiService2.get<ColumnInfo[]>(`/data/users/files/${fileId}/columns`)
      .then(response => {
        setColumnsSummaryInfo(response.data);

        const transformedFields = response.data.map(field => ({
          name: field.name,
          label: field.name,
          type: field.type
        }));
        setFields(transformedFields);
      })
      .catch(error => {
        console.error('Failed to fetch fields:', error);
        
        // Parse error using the utility function
        const parsedError = parseBackendError(error);
        
        toast.push(
          <Notification title={parsedError.title} type="danger">
            {parsedError.message}
          </Notification>
        );
      });
  };

  const fetchDataInfo = (fileId: string) => {
    setLoadingDataInfo(true);
    setDataInfoError(null);

    ApiService2.get<DataInfo>(`/data/users/files/${fileId}/data-info`)
      .then(response => {
        console.log('Data-info received:', response.data);
        setDataInfo(response.data);
      })
      .catch(error => {
        console.error('Failed to fetch data info:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data information';
        setDataInfoError(errorMessage);
        
        // Parse error using the utility function
        const parsedError = parseBackendError(error);
        
        toast.push(
          <Notification title={parsedError.title} type="danger">
            {parsedError.message}
          </Notification>
        );
      })
      .finally(() => {
        setLoadingDataInfo(false);
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
          
          toast.push(
            <Notification title="Data Format Error" type="warning">
              Invalid data format received from server
            </Notification>
          );
        }
      })
      .catch(error => {
        console.error('Failed to fetch dataframe data:', error);
        setDataFrameData([]);
        setPagination(null);
        
        // Parse error using the utility function
        const parsedError = parseBackendError(error);
        
        toast.push(
          <Notification title={parsedError.title} type="danger">
            {parsedError.message}
          </Notification>
        );
      })
      .finally(() => {
        setLoadingDataFrame(false);
      });
  };

  const handleRowClick = (file: DataFile) => {
    setSelectedFile(file);
    setIsFilterModalOpen(true);
    fetchColumns(file.file_id);
    fetchColumnInfo(file.file_id);
  };

  const transformedFields = fields.map(field => ({
    name: field.name,
    label: field.label,
    [field.name]: field.name
  }));

  const renderColumnDetails = (column: DetailedColumnInfo, index: number) => {
    const uniqueValues = column.unique_values || [];

    return (
      <div className="mb-4" key={column.name}>
        <h6 className="font-medium">
          <span className="badge bg-primary text-white mr-2">{index + 1}</span>
          {column.name} ({column.dtype})
        </h6>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <p><span className="font-semibold">Unique Values:</span> {column.num_unique_values}</p>
            {column.dtype === 'string' && (
              <>
                <p><span className="font-semibold">Max Length:</span> {column.max_length}</p>
                <p><span className="font-semibold">Most Frequent:</span> {column.most_frequent}</p>
              </>
            )}
            {['integer', 'float', 'number'].includes(column.dtype) && (
              <>
                <p><span className="font-semibold">Min:</span> {column.min}</p>
                <p><span className="font-semibold">Max:</span> {column.max}</p>
                <p><span className="font-semibold">Mean:</span> {column.mean?.toFixed(2)}</p>
                <p><span className="font-semibold">Median:</span> {column.median}</p>
                <p><span className="font-semibold">Std Dev:</span> {column.std_dev?.toFixed(2)}</p>
              </>
            )}
          </div>
          {uniqueValues.length > 0 && (
            <div>
              <p className="font-semibold">Sample Values:</p>
              <ul className="list-disc list-inside">
                {uniqueValues.slice(0, 5).map((value, index) => (
                  <li key={index}>{value}</li>
                ))}
                {uniqueValues.length > 5 && <li>...</li>}
              </ul>
            </div>
          )}
        </div>
        <hr className="my-4 border-t border-gray-300" />
      </div>
    );
  };

  const getFilesForCurrentTab = () => {
    return userFiles.filter(file => file.file_type === activeTab);
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

  const fetchFilesData = async () => {
    try {
      await dispatch(fetchUserFiles());
    } catch (error: any) {
      console.error('Failed to fetch files:', error);
      
      // Parse error using the utility function
      const parsedError = parseBackendError(error);
      
      toast.push(
        <Notification title={parsedError.title} type="danger">
          {parsedError.message}
        </Notification>
      );
    }
  };

  useEffect(() => {
    fetchFilesData();
  }, [activeTab]); // Refetch when tab changes

  // Show error notification when file loading fails
  useEffect(() => {
    if (error) {
      toast.push(
        <Notification title="Error Loading Files" type="danger">
          {error}
        </Notification>
      );
    }
  }, [error]);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const closeFilterModal = () => {
    setIsFilterModalOpen(false);
    setSelectedFile(null);
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<DataFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (file: DataFile) => {
    setFileToDelete(file);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setFileToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    try {
      await ApiService2.delete(`/data/users/files/${fileToDelete.file_id}`);
      await fetchFilesData(); // Refresh the file list
      closeDeleteModal();
      
      // Show success notification
      toast.push(
        <Notification title="File Deleted" type="success">
          File "{fileToDelete.file_name}" has been deleted successfully.
        </Notification>
      );
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      
      // Parse error using the utility function
      const parsedError = parseBackendError(error);
      
      toast.push(
        <Notification title={parsedError.title} type="danger">
          {parsedError.message}
        </Notification>
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [fileToDownload, setFileToDownload] = useState<DataFile | null>(null);

  const handleDownloadClick = (file: DataFile) => {
    setFileToDownload(file);
    setIsDownloadModalOpen(true);
  };

  const closeDownloadModal = () => {
    setIsDownloadModalOpen(false);
    setFileToDownload(null);
  };

  const handlePreprocessClick = (file: DataFile) => {
    // Navigate to preprocessing page with file ID
    window.location.href = `/preprocessing/${file.file_id}`;
  };

  const handleDownload = async (file: DataFile, format: FileType) => {
    try {
      let response;
      let blobData;
      let mimeType;

      if (format === 'excel') {
        // For Excel files, we need binary data
        response = await ApiService2.get(
          `/data/users/files/${file.file_id}/download?format=${format}`,
          { 
            responseType: 'blob',
            headers: {
              'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
          }
        );
        
        // Debug: Check what we're actually receiving
        console.log('Excel download response:', {
          status: response.status,
          headers: response.headers,
          dataType: typeof response.data,
          dataSize: response.data?.size,
          dataConstructor: response.data?.constructor?.name
        });
        
        // Check if the blob starts with PK (Excel file signature)
        if (response.data instanceof Blob) {
          const firstBytes = await response.data.slice(0, 4).arrayBuffer();
          const firstBytesArray = new Uint8Array(firstBytes);
          const startsWithPK = firstBytesArray[0] === 0x50 && firstBytesArray[1] === 0x4B; // PK
          console.log('Excel file signature check:', {
            firstBytes: Array.from(firstBytesArray),
            startsWithPK,
            expected: 'Should start with [80, 75] (PK)'
          });
        }
        
        // Check if the response is actually a Blob (binary data)
        if (response.data instanceof Blob) {
          blobData = response.data;
        } else {
          // If it's not a Blob, the server might be returning JSON-wrapped data
          console.warn('Excel response is not a Blob, attempting to extract binary data');
          console.log('Response data:', response.data);
          
          // Try to extract the actual file data if it's wrapped in JSON
          if (response.data && typeof response.data === 'object') {
            // If the server returns {data: "base64string"} or similar
            if (response.data.data) {
              const binaryString = atob(response.data.data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              blobData = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            } else {
              throw new Error('Server returned non-binary data for Excel download');
            }
          } else {
            throw new Error('Server returned non-binary data for Excel download');
          }
        }
        
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (format === 'json') {
        // For JSON, get the data and convert to pretty JSON string
        response = await ApiService2.get(
          `/data/users/files/${file.file_id}/download?format=${format}`,
          { 
            headers: {
              'Accept': 'application/json'
            }
          }
        );
        // Convert the response data to a pretty JSON string
        const jsonString = JSON.stringify(response.data, null, 2);
        blobData = new Blob([jsonString], { type: 'application/json' });
        mimeType = 'application/json';
      } else {
        // For CSV files
        response = await ApiService2.get(
          `/data/users/files/${file.file_id}/download?format=${format}`,
          { 
            responseType: 'blob',
            headers: {
              'Accept': 'text/csv'
            }
          }
        );
        blobData = response.data;
        mimeType = 'text/csv';
      }

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Create a blob from the response data
      const blob = format === 'json' ? blobData : new Blob([blobData], { type: mimeType });

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      
      // Remove the original file extension and add the new format extension
      const baseFileName = file.file_name.replace(/\.[^/.]+$/, '');
      const fileExtension = format === 'excel' ? 'xlsx' : format;
      link.download = `${baseFileName}.${fileExtension}`;
      document.body.appendChild(link);

      // Trigger the download
      link.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      // Close the modal after successful download
      closeDownloadModal();
      
      // Show success notification
      toast.push(
        <Notification title="Download Started" type="success">
          File "{file.file_name}" download has started.
        </Notification>
      );
    } catch (error: any) {
      console.error('Failed to download file:', error);
      
      // Parse error using the utility function
      const parsedError = parseBackendError(error);
      
      toast.push(
        <Notification title={parsedError.title} type="danger">
          {parsedError.message}
        </Notification>
      );
    }
  };

  const renderActionButtons = (file: DataFile) => (
    <div className="flex items-center space-x-2">
      <Button
        size="sm"
        variant="twoTone"
        icon={<HiOutlineDocumentText className="text-lg" />}
        onClick={() => handleFileClick(file)}
        className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
      >
        Details
      </Button>
      <Button
        size="sm"
        variant="twoTone"
        onClick={() => handleDataPreview(file)}
        className="hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center space-x-1 px-3"
      >
        <HiOutlineEye className="w-4 h-4" />
        <span className="text-xs">Preview</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="text-xs">Plot</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h4" />
        </svg>
        <span className="text-xs">Report</span>
      </Button>
      <Button
        size="sm"
        variant="twoTone"
        icon={<Settings className="text-lg" />}
        onClick={() => handlePreprocessClick(file)}
        className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
      >
        Preprocess
      </Button>
      <Button
        size="sm"
        variant="twoTone"
        icon={<HiOutlineDownload className="text-lg" />}
        onClick={() => handleDownloadClick(file)}
        className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
      >
        Download
      </Button>
      <Button
        size="sm"
        variant="twoTone"
        icon={<HiOutlineTrash className="text-lg" />}
        onClick={() => handleDeleteClick(file)}
        className="hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        Delete
      </Button>
    </div>
  );

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
          <Card header="CSV Files">
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
              <div className="relative">
                <div className="overflow-x-auto overflow-y-visible">
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
                </div>
              </div>
            ) : (
              <div className="text-center">No {activeTab.toUpperCase()} files found. Upload your first file!</div>
            )}
          </Card>
        </TabContent>
        <TabContent value="json">
          <Card header="JSON Files">
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
              <div className="relative">
                <div className="overflow-x-auto overflow-y-visible">
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
                </div>
              </div>
            ) : (
              <div className="text-center">No {activeTab.toUpperCase()} files found. Upload your first file!</div>
            )}
          </Card>
        </TabContent>
        <TabContent value="excel">
          <Card header="Excel Files">
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
              <div className="relative">
                <div className="overflow-x-auto overflow-y-visible">
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
                </div>
              </div>
            ) : (
              <div className="text-center">No {activeTab.toUpperCase()} files found. Upload your first file!</div>
            )}
          </Card>
        </TabContent>
      </Tabs>

      <CSVDetailsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        columnsInfo={columnsInfo}
        loadingColumnInfo={loadingColumnInfo}
        selectedCsv={selectedFile}
        renderColumnDetails={renderColumnDetails}
        dataInfo={dataInfo}
        loadingDataInfo={loadingDataInfo}
        dataInfoError={dataInfoError}
      />

      <DataPreviewModal
        isOpen={isDataPreviewOpen}
        onClose={closeDataPreviewModal}
        dataFrameData={dataFrameData}
        loadingDataFrame={loadingDataFrame}
        userId={userId}
        file_id={selectedFile?.file_id || ''}
        columns={columnsSummaryInfo}
        detailedColumns={columnsInfo}
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      <Dialog
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        width={400}
      >
        <div className="p-6">
          <h4 className="mb-4">Delete File</h4>
          <p className="mb-6">
            Are you sure you want to delete "{fileToDelete?.file_name}"? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-2">
            <Button
              size="sm"
              variant="plain"
              onClick={closeDeleteModal}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="solid"
              onClick={handleDeleteConfirm}
              loading={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Download Modal */}
      <Dialog
        isOpen={isDownloadModalOpen}
        onClose={closeDownloadModal}
        width={500}
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <HiOutlineDownload className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                Download File
              </h3>
              <p className="text-sm text-gray-500">
                Choose the format for {fileToDownload?.file_name}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => fileToDownload && handleDownload(fileToDownload, 'csv')}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-semibold text-sm">CSV</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">CSV Format</p>
                  <p className="text-xs text-gray-500">Comma-separated values</p>
                </div>
              </div>
              <span className="text-xs text-gray-400">.csv</span>
            </button>

            <button
              onClick={() => fileToDownload && handleDownload(fileToDownload, 'json')}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">JSON</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">JSON Format</p>
                  <p className="text-xs text-gray-500">JavaScript Object Notation</p>
                </div>
              </div>
              <span className="text-xs text-gray-400">.json</span>
            </button>

            {/* Excel download temporarily disabled due to backend issues */}
            <button
              disabled
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed opacity-50"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 font-semibold text-sm">XLSX</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Excel Format</p>
                  <p className="text-xs text-gray-400">Temporarily unavailable</p>
                </div>
              </div>
              <span className="text-xs text-gray-300">.xlsx</span>
            </button>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="default"
              onClick={closeDownloadModal}
              className="px-4 py-2"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </Container>
  );
};

export default ShowData; 