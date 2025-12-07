/**
 * Data Visualization Component
 * Demonstrates how to use cached data for plotting and analysis
 */

import React, { useState, useEffect } from 'react';
import { usePlottingData, usePaginatedData, useSearchData } from '@/hooks/useCachedData';
import { getCachedFileNames, getCachedColumns } from '@/utils/indexedDBUtils';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

const { Tr, Th, Td, THead, TBody } = Table;

interface DataVisualizationProps {
    className?: string;
}

const DataVisualization: React.FC<DataVisualizationProps> = ({ className }) => {
    const [availableFiles, setAvailableFiles] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);

    // Hooks for different data operations
    const { plottingData, loading: plottingLoading, loadPlottingData } = usePlottingData();
    const { paginatedData, loading: paginatedLoading, loadPage, nextPage, previousPage } = usePaginatedData(10);
    const { searchResults, loading: searchLoading, search, clearResults } = useSearchData();

    // Load available files on component mount
    useEffect(() => {
        loadAvailableFiles();
    }, []);

    // Load columns when file is selected
    useEffect(() => {
        if (selectedFile) {
            loadColumns();
        }
    }, [selectedFile]);

    const loadAvailableFiles = async () => {
        try {
            const files = await getCachedFileNames();
            setAvailableFiles(files);
        } catch (error) {
            console.error('Error loading available files:', error);
            toast.push(
                <Notification title="Error" type="danger">
                    Failed to load available files.
                </Notification>
            );
        }
    };

    const loadColumns = async () => {
        try {
            const columns = await getCachedColumns(selectedFile);
            setAvailableColumns(columns);
            setSelectedColumns([]);
        } catch (error) {
            console.error('Error loading columns:', error);
        }
    };

    const handleFileSelect = (fileName: string) => {
        setSelectedFile(fileName);
        setSearchTerm('');
        clearResults();
    };

    const handleLoadPlottingData = async () => {
        if (!selectedFile) return;
        
        try {
            await loadPlottingData(selectedFile);
            if (plottingData) {
                toast.push(
                    <Notification title="Success" type="success">
                        Plotting data loaded! {plottingData.rowCount} rows, {plottingData.columns.length} columns.
                    </Notification>
                );
            }
        } catch (error) {
            console.error('Error loading plotting data:', error);
        }
    };

    const handleLoadPage = async (page: number = 0) => {
        if (!selectedFile) return;
        await loadPage(selectedFile, page);
    };

    const handleSearch = async () => {
        if (!selectedFile || !searchTerm.trim()) return;
        
        try {
            await search(selectedFile, searchTerm, selectedColumns.length > 0 ? selectedColumns : undefined);
            if (searchResults) {
                toast.push(
                    <Notification title="Search Complete" type="success">
                        Found {searchResults.length} results.
                    </Notification>
                );
            }
        } catch (error) {
            console.error('Error searching data:', error);
        }
    };

    const handleColumnToggle = (column: string) => {
        setSelectedColumns(prev => 
            prev.includes(column) 
                ? prev.filter(c => c !== column)
                : [...prev, column]
        );
    };

    const renderDataPreview = (data: any[], title: string) => {
        if (!data || data.length === 0) return null;

        const columns = Object.keys(data[0] || {});
        const previewData = data.slice(0, 5); // Show first 5 rows

        return (
            <Card header={title} className="mt-4">
                <Table>
                    <THead>
                        <Tr>
                            {columns.map(column => (
                                <Th key={column}>{column}</Th>
                            ))}
                        </Tr>
                    </THead>
                    <TBody>
                        {previewData.map((row, index) => (
                            <Tr key={index}>
                                {columns.map(column => (
                                    <Td key={column}>
                                        {row[column] !== null && row[column] !== undefined 
                                            ? String(row[column]) 
                                            : '-'
                                        }
                                    </Td>
                                ))}
                            </Tr>
                        ))}
                    </TBody>
                </Table>
                {data.length > 5 && (
                    <div className="mt-2 text-sm text-gray-500">
                        Showing first 5 rows of {data.length} total rows
                    </div>
                )}
            </Card>
        );
    };

    return (
        <div className={className}>
            <Card header="Data Visualization & Analysis">
                <div className="space-y-4">
                    {/* File Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Select Cached File:
                        </label>
                        <Select
                            value={selectedFile}
                            onChange={handleFileSelect}
                            placeholder="Choose a file..."
                        >
                            {availableFiles.map(file => (
                                <option key={file} value={file}>
                                    {file}
                                </option>
                            ))}
                        </Select>
                    </div>

                    {selectedFile && (
                        <>
                            {/* Action Buttons */}
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    variant="solid"
                                    onClick={handleLoadPlottingData}
                                    loading={plottingLoading}
                                >
                                    Load for Plotting
                                </Button>
                                <Button
                                    variant="plain"
                                    onClick={() => handleLoadPage(0)}
                                    loading={paginatedLoading}
                                >
                                    Load Paginated View
                                </Button>
                                <Button
                                    variant="plain"
                                    onClick={loadAvailableFiles}
                                >
                                    Refresh Files
                                </Button>
                            </div>

                            {/* Search Section */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-3">Search Data</h4>
                                <div className="flex gap-2 mb-3">
                                    <Input
                                        placeholder="Enter search term..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="solid"
                                        onClick={handleSearch}
                                        loading={searchLoading}
                                        disabled={!searchTerm.trim()}
                                    >
                                        Search
                                    </Button>
                                </div>

                                {/* Column Selection for Search */}
                                {availableColumns.length > 0 && (
                                    <div className="mb-3">
                                        <label className="block text-sm font-medium mb-2">
                                            Search in specific columns (optional):
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {availableColumns.map(column => (
                                                <Button
                                                    key={column}
                                                    size="sm"
                                                    variant={selectedColumns.includes(column) ? "solid" : "plain"}
                                                    onClick={() => handleColumnToggle(column)}
                                                >
                                                    {column}
                                                </Button>
                                            ))}
                                        </div>
                                        {selectedColumns.length > 0 && (
                                            <div className="mt-2 text-sm text-gray-500">
                                                Searching in: {selectedColumns.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Plotting Data Display */}
                            {plottingData && (
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3">Plotting Data</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div className="bg-blue-50 p-3 rounded">
                                            <div className="text-sm text-blue-600">Total Rows</div>
                                            <div className="text-lg font-semibold">{plottingData.rowCount}</div>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded">
                                            <div className="text-sm text-green-600">Columns</div>
                                            <div className="text-lg font-semibold">{plottingData.columns.length}</div>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded">
                                            <div className="text-sm text-purple-600">File</div>
                                            <div className="text-sm font-semibold truncate">{selectedFile}</div>
                                        </div>
                                    </div>
                                    {renderDataPreview(plottingData.data, "Plotting Data Preview")}
                                </div>
                            )}

                            {/* Paginated Data Display */}
                            {paginatedData && (
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3">Paginated Data</h4>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="text-sm text-gray-600">
                                            Page {paginatedData.currentPage + 1} of {paginatedData.totalPages} 
                                            ({paginatedData.totalRows} total rows)
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="plain"
                                                onClick={previousPage}
                                                disabled={!paginatedData.hasPreviousPage}
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="plain"
                                                onClick={nextPage}
                                                disabled={!paginatedData.hasNextPage}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                    {renderDataPreview(paginatedData.data, "Current Page Data")}
                                </div>
                            )}

                            {/* Search Results Display */}
                            {searchResults && (
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3">Search Results</h4>
                                    {searchResults.length > 0 ? (
                                        renderDataPreview(searchResults, `Search Results (${searchResults.length} found)`)
                                    ) : (
                                        <div className="text-center text-gray-500 py-4">
                                            No results found for "{searchTerm}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {availableFiles.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            No cached files available. Upload some files first to see them here.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default DataVisualization;
