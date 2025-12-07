import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Table, Spinner, Alert, Input, Dropdown } from '@/components/ui';
import { Database, FileText, Search, ArrowRight, Upload, Download, Eye, Trash2, Plus, FileSearch, MoreVertical } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchUserFiles } from '@/store/slices/lists/listsSlice';
import PreprocessingService, { PreprocessedFile } from '@/services/PreprocessingService';
import PreprocessedFileDataModal from '@/components/preprocessing/PreprocessedFileDataModal';
import SimpleDataPreviewModal from '@/components/csv/SimpleDataPreviewModal';
import DeletePreprocessedFileDialog from '@/components/preprocessing/DeletePreprocessedFileDialog';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import ApiService2 from '@/services/ApiService2';
import { DataFrameRow, ColumnInfo } from '@/@types/csv';

const { Tr, Th, Td, THead, TBody } = Table;

// Use DataFile from the Redux slice instead of defining our own
import type { DataFile } from '@/store/slices/lists/listsSlice';

const PreprocessingLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [preprocessedFiles, setPreprocessedFiles] = useState<PreprocessedFile[]>([]);
  const [loadingPreprocessed, setLoadingPreprocessed] = useState(false);
  const [preprocessedError, setPreprocessedError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ id: string; file_name: string } | null>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [originalFile, setOriginalFile] = useState<DataFile | null>(null);
  const [isOriginalModalOpen, setIsOriginalModalOpen] = useState(false);
  const [originalDataFrameData, setOriginalDataFrameData] = useState<DataFrameRow[]>([]);
  const [loadingOriginalData, setLoadingOriginalData] = useState(false);
  const [originalColumns, setOriginalColumns] = useState<ColumnInfo[]>([]);
  const [originalPagination, setOriginalPagination] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; file_name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const searchSectionRef = useRef<HTMLDivElement>(null);

  // Use Redux state instead of local state
  const {
    userFiles: files,
    loading,
    error
  } = useAppSelector((state) => state.lists.lists);

  useEffect(() => {
    // Fetch files using Redux action
    dispatch(fetchUserFiles());
    // Fetch preprocessed files
    fetchPreprocessedFiles();
  }, [dispatch]);

  const fetchPreprocessedFiles = async () => {
    setLoadingPreprocessed(true);
    setPreprocessedError(null);

    try {
      const response = await PreprocessingService.getUserPreprocessedFiles();
      console.log('Preprocessed files response:', response);
      // Handle the response structure: { total: number, preprocessed_files: PreprocessedFile[] }
      const files = response.preprocessed_files || [];
      console.log('Preprocessed files array:', files);
      if (files.length > 0) {
        console.log('First file structure:', files[0]);
      }
      setPreprocessedFiles(files);
    } catch (err: any) {
      console.error('Error fetching preprocessed files:', err);
      const errorMessage = err?.response?.data?.detail?.message || err.message || 'Failed to load preprocessed files';
      setPreprocessedError(errorMessage);
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setLoadingPreprocessed(false);
    }
  };

  const handlePreprocessFile = (fileId: string, fileName: string) => {
    navigate(`/preprocessing/${fileId}`);
  };

  const handleViewPreprocessedFile = (file: PreprocessedFile) => {
    setSelectedFile({
      id: file.id,
      file_name: file.file_name
    });
    setIsDataModalOpen(true);
  };

  const handleViewOriginalFile = async (file: PreprocessedFile) => {
    // Find the original file from the user files
    const originalFileData = files?.find(f => f.file_id === file.original_file_id);
    if (!originalFileData) {
      toast.push(
        <Notification title="Original File Not Found" type="warning">
          The original file for this preprocessed data could not be found.
        </Notification>
      );
      return;
    }

    setOriginalFile(originalFileData);
    setIsOriginalModalOpen(true);
    setLoadingOriginalData(true);

    try {
      // Fetch columns info
      const columnsResponse = await ApiService2.get<ColumnInfo[]>(`/data/users/files/${originalFileData.file_id}/columns`);
      setOriginalColumns(columnsResponse.data);

      // Fetch data using the correct endpoint
      const dataResponse = await ApiService2.get<{
        data: DataFrameRow[];
        pagination: {
          total_rows: number;
          total_pages: number;
          current_page: number;
          page_size: number;
          has_next: boolean;
        };
      }>(`/data/users/files/${originalFileData.file_id}/data?page=1&page_size=50`);
      
      if (dataResponse.data && dataResponse.data.data && Array.isArray(dataResponse.data.data)) {
        setOriginalDataFrameData(dataResponse.data.data);
        setOriginalPagination(dataResponse.data.pagination);
      } else {
        throw new Error('Invalid data format received from server');
      }
    } catch (err: any) {
      console.error('Error fetching original file data:', err);
      const errorMessage = err?.response?.data?.detail?.message || err.message || 'Failed to load original file data';
      toast.push(
        <Notification title="Error Loading Original File" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setLoadingOriginalData(false);
    }
  };

  const handleDownloadPreprocessedFile = async (file: PreprocessedFile) => {
    try {
      // Show loading state
      toast.push(
        <Notification title="Downloading" type="info">
          Preparing download for {file.file_name}...
        </Notification>
      );

      // Download the file
      const blob = await PreprocessingService.downloadPreprocessedFile(file.id);

      // Validate that we received a proper blob
      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Invalid file data received from server');
      }

      // Check if blob is empty
      if (blob.size === 0) {
        throw new Error('Empty file received from server');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_name || 'preprocessed_file.csv';

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.push(
        <Notification title="Download Complete" type="success">
          Successfully downloaded {file.file_name}
        </Notification>
      );
    } catch (err: any) {
      console.error('Download error details:', err);
      const errorMessage = err?.response?.data?.detail?.message || err.message || 'Failed to download file';
      toast.push(
        <Notification title="Download Failed" type="danger">
          {errorMessage}
        </Notification>
      );
    }
  };

  const handleCloseDataModal = () => {
    setIsDataModalOpen(false);
    setSelectedFile(null);
  };

  const handleCloseOriginalModal = () => {
    setIsOriginalModalOpen(false);
    setOriginalFile(null);
    setOriginalDataFrameData([]);
    setOriginalColumns([]);
    setOriginalPagination(null);
  };

  const handleOriginalPageChange = (page: number) => {
    if (originalFile) {
      fetchOriginalDataFrameData(originalFile.file_id, page);
    }
  };

  const fetchOriginalDataFrameData = (fileId: string, page: number = 1) => {
    setLoadingOriginalData(true);

    ApiService2.get<{
      data: DataFrameRow[];
      pagination: {
        total_rows: number;
        total_pages: number;
        current_page: number;
        page_size: number;
        has_next: boolean;
      };
    }>(`/data/users/files/${fileId}/data?page=${page}&page_size=50`)
      .then(response => {
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          setOriginalDataFrameData(response.data.data);
          setOriginalPagination(response.data.pagination);
        } else {
          console.error('Invalid data format received:', response.data);
          setOriginalDataFrameData([]);
          setOriginalPagination(null);
        }
      })
      .catch(error => {
        console.error('Failed to fetch original dataframe data:', error);
        setOriginalDataFrameData([]);
        setOriginalPagination(null);
      })
      .finally(() => {
        setLoadingOriginalData(false);
      });
  };

  const handleDeletePreprocessedFile = (file: PreprocessedFile) => {
    setFileToDelete({ id: file.id, file_name: file.file_name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;

    setDeleting(true);
    try {
      const result = await PreprocessingService.deletePreprocessedFile(fileToDelete.id);

      toast.push(
        <Notification title="File Deleted" type="success" duration={5000}>
          {result.message}
        </Notification>
      );

      // Refresh the preprocessed files list
      await fetchPreprocessedFiles();

      // Close dialog
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.detail?.message || err.message || 'Failed to delete file';
      toast.push(
        <Notification title="Delete Failed" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setFileToDelete(null);
  };

  const filteredFiles = (files || [])
    .filter(file =>
      file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isRecentlyProcessed = (dateString: string) => {
    const fileDate = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - fileDate.getTime()) / (1000 * 60 * 60);
    return diffInHours < 24; // Within last 24 hours
  };

  const scrollToSearchSection = () => {
    if (searchSectionRef.current) {
      const elementPosition = searchSectionRef.current.getBoundingClientRect().top + window.scrollY;
      const offset = 100; // pixels from the top
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  };

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

  if (loading) {
    return (
      <div className="preprocessing-landing">
        <div className="loading-container">
          <Spinner size="lg" />
          <p>Loading your files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="preprocessing-landing">
        <div className="error-container">
          <Alert type="danger" showIcon>
            <h3>Error Loading Files</h3>
            <p>{error}</p>
            <Button onClick={fetchUserFiles} className="mt-4">
              Try Again
            </Button>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="preprocessing-landing">
      <div className="page-header">
        <div className="header-content">
          <div className="title-section">
            <div>
              <h1>Data Preprocessing</h1>
              <p>Select a file to configure preprocessing options and clean your data</p>
            </div>
          </div>
          <div className="header-actions">
            <Button
              onClick={scrollToSearchSection}
              icon={<Plus />}
              className="start-preprocessing-button"
            >
              Start New Preprocessing
            </Button>
          </div>
        </div>
      </div>

      <div className="page-content">

        {/* Preprocessed Files Section - Moved to top for better UX */}
        <Card className="preprocessed-section">
          <div className="preprocessed-header">
            <div className="preprocessed-title">
              <h2>
                Your Preprocessed Files
                {preprocessedFiles.length > 0 && (
                  <span className="file-count-badge">{preprocessedFiles.length}</span>
                )}
              </h2>
              <p>Recent preprocessing history and processed files</p>
            </div>
            <Button
              variant="twoTone"
              size="sm"
              onClick={fetchPreprocessedFiles}
              icon={<Search />}
              className="refresh-button"
            >
              Refresh
            </Button>
          </div>

          {loadingPreprocessed ? (
            <div className="loading-container">
              <Spinner size="lg" />
              <p>Loading preprocessed files...</p>
            </div>
          ) : preprocessedError ? (
            <div className="error-container">
              <Alert type="danger" showIcon>
                <h3>Error Loading Preprocessed Files</h3>
                <p>{preprocessedError}</p>
                <Button onClick={fetchPreprocessedFiles} className="mt-4">
                  Try Again
                </Button>
              </Alert>
            </div>
          ) : preprocessedFiles.length === 0 ? (
            <div className="no-files">
              <FileText className="no-files-icon" />
              <h3>No Preprocessed Files Yet</h3>
              <p>Start by selecting a file below to begin preprocessing</p>
            </div>
          ) : (
            <div className="preprocessed-table">
              <Table>
                <THead>
                  <Tr>
                    <Th>File Name</Th>
                    <Th>Original File</Th>
                    <Th>Mode</Th>
                    <Th>Size</Th>
                    <Th>Rows</Th>
                    <Th>Columns</Th>
                    <Th>Processed</Th>
                    <Th>Actions</Th>
                  </Tr>
                </THead>
                <TBody>
                  {(preprocessedFiles || []).map((file) => (
                    <Tr key={file.id} className="file-row">
                      <Td>
                        <div className="file-info">
                          <FileText className="file-icon" />
                          <div className="file-name-container">
                            <span className="file-name">{file.file_name || 'Unknown'}</span>
                            {isRecentlyProcessed(file.created_at || file.updated_at || new Date().toISOString()) && (
                              <span className="new-badge">New</span>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="original-file-info">
                          <FileText className="original-file-icon" />
                          <span className="original-file-name">
                            {(() => {
                              const originalFile = files?.find(f => f.file_id === file.original_file_id);
                              return originalFile ? originalFile.file_name : 'Unknown';
                            })()}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span className={`mode-badge ${file.mode || 'simple'}`}>
                          {(file.mode || 'simple').charAt(0).toUpperCase() + (file.mode || 'simple').slice(1)}
                        </span>
                      </Td>
                      <Td>
                        <span className="file-size">{formatFileSize(file.file_size || 0)}</span>
                      </Td>
                      <Td>
                        <span className="file-stats">
                          {(file.rows_after || 0).toLocaleString()}
                          {file.rows_before && file.rows_before !== file.rows_after && (
                            <span className="change-indicator">
                              ({file.rows_before > file.rows_after ? '-' : '+'}{Math.abs(file.rows_after - file.rows_before)})
                            </span>
                          )}
                        </span>
                      </Td>
                      <Td>
                        <span className="file-stats">
                          {file.columns_after || 0}
                          {file.columns_before && file.columns_before !== file.columns_after && (
                            <span className="change-indicator">
                              ({file.columns_before > file.columns_after ? '-' : '+'}{Math.abs(file.columns_after - file.columns_before)})
                            </span>
                          )}
                        </span>
                      </Td>
                      <Td>
                        <span className="file-date">{formatDate(file.created_at || file.updated_at || new Date().toISOString())}</span>
                      </Td>
                      <Td>
                        <div className="action-cell">
                          <Dropdown
                            renderTitle={
                              <Button
                                size="sm"
                                variant="twoTone"
                                icon={<MoreVertical />}
                                className="action-toggle-button"
                              />
                            }
                            placement="bottom-end"
                          >
                            <Dropdown.Item
                              eventKey="view"
                              onClick={() => handleViewPreprocessedFile(file)}
                              className="action-menu-item"
                            >
                              <Eye className="menu-icon" />
                              <span>View Data</span>
                            </Dropdown.Item>
                            <Dropdown.Item
                              eventKey="original"
                              onClick={() => handleViewOriginalFile(file)}
                              className="action-menu-item"
                            >
                              <FileSearch className="menu-icon" />
                              <span>View Original</span>
                            </Dropdown.Item>
                            <Dropdown.Item
                              eventKey="download"
                              onClick={() => handleDownloadPreprocessedFile(file)}
                              className="action-menu-item"
                            >
                              <Download className="menu-icon" />
                              <span>Download</span>
                            </Dropdown.Item>
                            <Dropdown.Item
                              eventKey="delete"
                              onClick={() => handleDeletePreprocessedFile(file)}
                              className="action-menu-item delete-item"
                            >
                              <Trash2 className="menu-icon" />
                              <span>Delete</span>
                            </Dropdown.Item>
                          </Dropdown>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Search and Filter */}
        <Card className="search-section" ref={searchSectionRef}>
          <div className="search-content">
            <div className="search-input-group">
              <Search className="search-icon" />
              <Input
                placeholder="Search files by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="controls-group">
              <Button
                variant="twoTone"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                className="sort-button"
              >
                {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
              </Button>
              <div className="file-count">
                {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>
        </Card>

        {/* Files Table */}
        <Card className="files-section">
          <div className="files-header">
            <h2>Your Data Files</h2>
            <p>Select a file to start preprocessing</p>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="no-files">
              <FileText className="no-files-icon" />
              <h3>No Files Found</h3>
              <p>
                {searchTerm
                  ? `No files match "${searchTerm}"`
                  : "You don't have any data files yet"
                }
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => navigate('/upload-data')}
                  icon={<Upload />}
                  className="upload-button"
                >
                  Upload Your First File
                </Button>
              )}
            </div>
          ) : (
            <div className="files-table">
              <Table>
                <THead>
                  <Tr>
                    <Th>File Name</Th>
                    <Th>Type</Th>
                    <Th>Size</Th>
                    <Th>Source</Th>
                    <Th>Updated</Th>
                    <Th>Actions</Th>
                  </Tr>
                </THead>
                <TBody>
                  {filteredFiles.map((file) => (
                    <Tr key={file.file_id} className="file-row">
                      <Td>
                        <div className="file-info">
                          <FileText className="file-icon" />
                          <span className="file-name">{file.file_name}</span>
                        </div>
                      </Td>
                      <Td>
                        <span className="file-type">{file.file_type.toUpperCase()}</span>
                      </Td>
                      <Td>
                        <span className="file-size">{formatFileSize(file.file_size)}</span>
                      </Td>
                      <Td>
                        <span className="file-source">
                          {file.source ? file.source.charAt(0).toUpperCase() + file.source.slice(1) : 'Unknown'}
                        </span>
                      </Td>
                      <Td>
                        <span className="file-date">{formatDate(file.updated_at)}</span>
                      </Td>
                      <Td>
                        <Button
                          onClick={() => handlePreprocessFile(file.file_id, file.file_name)}
                          icon={<ArrowRight />}
                          className="preprocess-button"
                        >
                          Preprocess
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Help Section */}
        <Card className="help-section">
          <div className="help-content">
            <h3>What is Data Preprocessing?</h3>
            <div className="help-grid">
              <div className="help-item">
                <div className="help-icon">🔢</div>
                <h4>Numeric Data</h4>
                <p>Scale, normalize, handle outliers, and transform numerical columns</p>
              </div>
              <div className="help-item">
                <div className="help-icon">🏷️</div>
                <h4>Categorical Data</h4>
                <p>Encode categories, merge rare values, and handle missing data</p>
              </div>
              <div className="help-item">
                <div className="help-icon">📝</div>
                <h4>Text Data</h4>
                <p>Clean text, remove stopwords, and apply stemming or lemmatization</p>
              </div>
              <div className="help-item">
                <div className="help-icon">📅</div>
                <h4>Date/Time Data</h4>
                <p>Extract features, handle timezones, and convert to different formats</p>
              </div>
            </div>
            <div className="help-footer">
              <p>
                <strong>Simple Mode:</strong> Apply the same preprocessing to all columns of each type
              </p>
              <p>
                <strong>Advanced Mode:</strong> Configure each column individually for fine-grained control
              </p>
            </div>
          </div>
        </Card>

      </div>

      <style>{`
        .preprocessing-landing {
          /* Remove custom layout styling to use standard page layout */
        }

        .page-header {
          margin-bottom: 24px;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .start-preprocessing-button {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .start-preprocessing-button:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
          transform: translateY(-2px);
        }

        .start-preprocessing-button:active {
          transform: translateY(0);
        }

        .title-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: #eff6ff;
          border-radius: 8px;
          color: #3b82f6;
        }

        .title-section h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
        }

        .title-section p {
          margin: 0;
          color: #6b7280;
          font-size: 16px;
        }

        .page-content {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        /* Add visual separator between sections */
        .search-section {
          margin-top: 8px;
          padding: 20px;
        }

        .files-section {
          margin-top: 8px;
        }

        .search-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .controls-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .sort-button {
          white-space: nowrap;
          font-size: 14px;
          padding: 8px 16px;
        }

        .search-input-group {
          position: relative;
          flex: 1;
          max-width: 500px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #6b7280;
        }

        .search-input {
          padding-left: 40px;
        }

        .file-count {
          color: #6b7280;
          font-size: 14px;
        }

        .files-section {
          padding: 24px;
        }

        .files-header h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
        }

        .files-header p {
          margin: 0 0 24px 0;
          color: #6b7280;
          font-size: 16px;
        }

        .no-files {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .no-files-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 16px;
          color: #d1d5db;
        }

        .no-files h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: #374151;
        }

        .no-files p {
          margin: 0 0 24px 0;
          font-size: 16px;
        }

        .upload-button {
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
        }

        .files-table {
          overflow-x: auto;
        }

        .file-row {
          transition: background-color 0.2s ease;
        }

        .file-row:hover {
          background-color: #f8fafc;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .file-icon {
          width: 20px;
          height: 20px;
          color: #6b7280;
        }

        .file-name-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .file-name {
          font-weight: 500;
          color: #1f2937;
        }

        .original-file-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .original-file-icon {
          width: 16px;
          height: 16px;
          color: #9ca3af;
        }

        .original-file-name {
          font-weight: 400;
          color: #6b7280;
          font-size: 14px;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .new-badge {
          display: inline-flex;
          align-items: center;
          background: #10b981;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .file-type {
          padding: 4px 8px;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }

        .file-size,
        .file-rows,
        .file-columns,
        .file-date {
          color: #6b7280;
          font-size: 14px;
        }

        .preprocess-button {
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
        }

        .help-section {
          padding: 24px;
        }

        .help-content h3 {
          margin: 0 0 24px 0;
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          text-align: center;
        }

        .help-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 24px;
        }

        .help-item {
          text-align: center;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .help-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .help-item h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .help-item p {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
          line-height: 1.4;
        }

        .help-footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .help-footer p {
          margin: 8px 0;
          font-size: 14px;
          color: #6b7280;
        }

        .loading-container,
        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .loading-container p {
          margin-top: 16px;
          color: #6b7280;
          font-size: 16px;
        }

        /* Preprocessed Files Section - Now at the top */
        .preprocessed-section {
          border: 2px solid #e5e7eb;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          position: relative;
          overflow: hidden;
        }

        .preprocessed-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
          animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        .preprocessed-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding: 24px 24px 0 24px;
        }

        .preprocessed-title h2 {
          margin: 0 0 8px 0;
          color: #1f2937;
          font-size: 24px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .preprocessed-title h2::before {
          content: "📊";
          font-size: 20px;
        }

        .file-count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #3b82f6;
          color: white;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 12px;
          margin-left: 8px;
          min-width: 20px;
          height: 20px;
        }

        .preprocessed-title p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
        }

        .refresh-button {
          margin-left: 16px;
          background: #3b82f6;
          color: white;
          border: none;
        }

        .refresh-button:hover {
          background: #2563eb;
        }

        .preprocessed-table {
          padding: 0 24px 24px 24px;
        }

        .mode-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .mode-badge.simple {
          background-color: #dbeafe;
          color: #1e40af;
        }

        .mode-badge.advanced {
          background-color: #fef3c7;
          color: #d97706;
        }

        .file-stats {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .change-indicator {
          font-size: 11px;
          color: #6b7280;
          font-weight: 400;
        }

        .action-cell {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .action-toggle-button {
          padding: 8px;
          min-width: 36px;
          height: 36px;
          border-radius: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #64748b;
          transition: all 0.2s ease;
        }

        .action-toggle-button:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #475569;
        }

        .action-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          font-size: 14px;
          color: #374151;
          transition: background-color 0.2s ease;
          cursor: pointer;
        }

        .action-menu-item:hover {
          background-color: #f8fafc;
        }

        .action-menu-item.delete-item {
          color: #dc2626;
        }

        .action-menu-item.delete-item:hover {
          background-color: #fef2f2;
        }

        .menu-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .no-files {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .no-files-icon {
          width: 48px;
          height: 48px;
          color: #d1d5db;
          margin-bottom: 16px;
        }

        .no-files h3 {
          margin: 0 0 8px 0;
          color: #374151;
          font-size: 18px;
          font-weight: 600;
        }

        .no-files p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .header-actions {
            justify-content: center;
          }

          .start-preprocessing-button {
            width: 100%;
            justify-content: center;
          }

          .search-content {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .controls-group {
            justify-content: space-between;
          }

          .search-input-group {
            max-width: none;
          }

          .help-grid {
            grid-template-columns: 1fr;
          }

          .action-cell {
            justify-content: flex-start;
          }

          .action-toggle-button {
            min-width: 32px;
            height: 32px;
            padding: 6px;
          }

          .original-file-name {
            max-width: 150px;
            font-size: 12px;
          }
        }
      `}</style>

      {/* Preprocessed File Data Modal */}
      {selectedFile && (
        <PreprocessedFileDataModal
          isOpen={isDataModalOpen}
          onClose={handleCloseDataModal}
          preprocessedFile={selectedFile}
        />
      )}

      {/* Original File Data Modal */}
      {originalFile && (
        <SimpleDataPreviewModal
          isOpen={isOriginalModalOpen}
          onClose={handleCloseOriginalModal}
          dataFrameData={originalDataFrameData}
          loadingDataFrame={loadingOriginalData}
          fileName={originalFile.file_name || ''}
          columns={originalColumns}
          pagination={originalPagination}
          onPageChange={handleOriginalPageChange}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeletePreprocessedFileDialog
        isOpen={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        fileName={fileToDelete?.file_name || ''}
        loading={deleting}
      />
    </div>
  );
};

export default PreprocessingLandingPage;
