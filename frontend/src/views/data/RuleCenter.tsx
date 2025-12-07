import { useState, useEffect, useRef, useMemo } from "react";
import Container from "@/components/shared/Container";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import ApiService2 from "@/services/ApiService2";
import { useAppSelector, useAppDispatch } from "@/store/hook";
import { DataFile, fetchUserFiles } from "@/store/slices/lists/listsSlice";
import { RuleGroupType } from 'react-querybuilder';
import DataPreviewModal from '@/components/csv/DataPreviewModal';
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
import FilterModal from '@/components/csv/FilterModal';
import { HiOutlineFilter, HiOutlineDocumentText } from 'react-icons/hi';
import { ChevronDown, ChevronUp } from 'lucide-react';
import RulesModal from '@/components/csv/RulesModal';
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

interface FilterResponse<T> {
  result: T[];
  total_count: number;
  has_more: boolean;
  offset: number;
  limit: number;
  python_code_snippet?: string;
}

const ShowData = () => {
  const dispatch = useAppDispatch();
  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
  const [fields, setFields] = useState<QueryField[]>([]);
  const [columnsSummaryInfo, setColumnsSummaryInfo] = useState<ColumnInfo[]>([]);
  const [activeTab, setActiveTab] = useState<FileType>('csv');
  
  // Sort state
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortField, setSortField] = useState<'date' | 'size'>('date');

  // New states for data preview
  const [isDataPreviewOpen, setIsDataPreviewOpen] = useState(false);
  const [dataFrameData, setDataFrameData] = useState<DataFrameRow[]>([]);
  const [loadingDataFrame, setLoadingDataFrame] = useState(false);
  const [filterQuery, setFilterQuery] = useState<RuleGroupType>({ combinator: 'and', rules: [] });
  const [pagination, setPagination] = useState<PaginatedResponse<DataFrameRow>['pagination'] | null>(null);
  const [columnsInfo, setColumnsInfo] = useState<DetailedColumnInfo[]>([]);
  const [loadingColumnInfo, setLoadingColumnInfo] = useState(false);
  const [pythonCodeSnippet, setPythonCodeSnippet] = useState<string | undefined>(undefined);

  const filterCardRef = useRef<HTMLDivElement | null>(null);
  
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

  const convertFilterQueryToString = (query: RuleGroupType): string => {
    const processRules = (rules: any[]): string[] => {
      return rules.map(rule => {
        if (rule.rules) {
          const nestedRules = processRules(rule.rules);
          return `(${nestedRules.join(` ${rule.combinator} `)})`;
        } else {
          return `#{${rule.field}} ${rule.operator} {${rule.value}}`;
        }
      });
    };

    const ruleStrings = processRules(query.rules);
    return ruleStrings.join(` ${query.combinator} `);
  };

  const handleFilteredDataPreview = () => {
    if (selectedFile) {
      setIsFilterModalOpen(false);
      setIsDataPreviewOpen(true);
      sendFilterQueryToBackend(filterQuery, userId, selectedFile.file_id, 0, 50);
    }
  };

  const closeDataPreviewModal = () => {
    setIsDataPreviewOpen(false);
    setDataFrameData([]);
    // Reopen the FilterModal when DataPreviewModal is closed
    setIsFilterModalOpen(true);
  };

  const handlePageChange = (page: number) => {
    if (selectedFile && filterQuery) {
      const offset = (page - 1) * 50; // 50 is the page size
      sendFilterQueryToBackend(filterQuery, userId, selectedFile.file_id, offset, 50);
    }
  };

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

  const fetchDataFrameData = (fileId: string) => {
    setLoadingDataFrame(true);

    ApiService2.get<PaginatedResponse<DataFrameRow>>(`/data/users/files/${fileId}/data?page=1&page_size=50`)
      .then(response => {
        console.log('Dataframe data:', response.data);
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
    // Reset filter query and related states when opening modal for a new file
    setFilterQuery({ combinator: 'and', rules: [] });
    setColumnsInfo([]); // Clear previous column info
    setFields([]); // Clear previous fields
    fetchColumns(file.file_id);
    fetchColumnInfo(file.file_id);
  };

  const handleFilterChange = (query: RuleGroupType) => {
    setFilterQuery(query);
    console.log('Filter query: ', query);
    console.log('stringFilterQuery: ', convertFilterQueryToString(query));
  };

  const sendFilterQueryToBackend = async (filterQuery: RuleGroupType, userId: string, fileId: string, offset: number = 0, limit: number = 50) => {
    setLoadingDataFrame(true);
    const pseudoQuery = convertFilterQueryToString(filterQuery);
    console.log('pseudoQuery: \n ', pseudoQuery);
    const requestBody = {
      pseudo_query: { query: pseudoQuery }, 
      file_id: fileId,
      offset: offset,
      limit: limit
    };

    try {
      const response = await ApiService2.post<FilterResponse<DataFrameRow>>('/filtering/simple-filter', requestBody);

      if (!response.ok) {
        throw new Error('Failed to fetch filtered data');
      }

      const data = response.data;
      if (data && data.result && Array.isArray(data.result)) {
        setDataFrameData(data.result);
        
        // Store the python_code_snippet from the response
        setPythonCodeSnippet(data.python_code_snippet);
        console.log('Python code snippet received:', data.python_code_snippet);
        
        // Convert the new response format to pagination format
        const currentPage = Math.floor(offset / limit) + 1;
        const totalPages = Math.ceil(data.total_count / limit);
        
        setPagination({
          total_rows: data.total_count,
          total_pages: totalPages,
          current_page: currentPage,
          page_size: limit,
          has_next: data.has_more
        });
      } else {
        console.error('Invalid data format received:', data);
        setDataFrameData([]);
        setPagination(null);
        setPythonCodeSnippet(undefined);
      }
    } catch (error: any) {
      console.error('Error:', error);
      setDataFrameData([]);
      setPagination(null);
      setPythonCodeSnippet(undefined);
      
      // Parse error using the utility function
      const parsedError = parseBackendError(error);
      
      toast.push(
        <Notification title={parsedError.title} type="danger">
          {parsedError.message}
        </Notification>
      );
    } finally {
      setLoadingDataFrame(false);
    }
  };

  const transformedFields = fields.map(field => ({
    name: field.name,
    label: field.label,
    type: field.type,
    [field.name]: field.name
  }));



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
    // Reset filter query and related states when closing modal
    setFilterQuery({ combinator: 'and', rules: [] });
    setColumnsInfo([]); // Clear column info
    setFields([]); // Clear fields
    setPythonCodeSnippet(undefined); // Clear python code snippet
  };

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const renderActionButtons = (file: DataFile) => (
    <div className="flex items-center space-x-2">
      <Button
        size="sm"
        variant="twoTone"
        icon={<HiOutlineFilter className="text-lg" />}
        onClick={() => handleRowClick(file)}
        className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
      >
        Filter & Rule Creator
      </Button>
      <Button
        size="sm"
        variant="twoTone"
        icon={<HiOutlineDocumentText className="text-lg" />}
        onClick={() => {
          setSelectedFile(file);
          setIsRulesModalOpen(true);
        }}
        className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
      >
        Rules
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
            {import.meta.env.VITE_ENV === 'development'&& (
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
                <div className="overflow-x-auto">
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
            
            {error && (
              <div className="text-center text-danger mb-3">{error}</div>
            )}
            
            {loadingFiles ? (
              <div className="text-center">Loading files...</div>
            ) : 
            sortedFiles.length > 0 ? (
              <div className="relative">
                <div className="overflow-x-auto">
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
            
            {error && (
              <div className="text-center text-danger mb-3">{error}</div>
            )}
            
            {loadingFiles ? (
              <div className="text-center">Loading files...</div>
            ) : 
            sortedFiles.length > 0 ? (
              <div className="relative">
                <div className="overflow-x-auto">
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

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={closeFilterModal}
        fields={transformedFields}
        filterQuery={filterQuery}
        onFilterChange={handleFilterChange}
        onRunFilter={handleFilteredDataPreview}
        columnsInfo={columnsInfo}
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
        showRuleForm={true}
        filterQuery={filterQuery}
        onPageChange={handlePageChange}
        pythonCodeSnippet={pythonCodeSnippet}
      />

      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => {
          setIsRulesModalOpen(false);
          setSelectedFile(null);
        }}
        fileId={selectedFile?.file_id || ''}
      />
    </Container>
  );
};

export default ShowData; 