// src/components/csv/CSVTable.tsx
import React from 'react';
import { DataFile } from "@/store/slices/lists/listsSlice";
import { Table, Button } from '@/components/ui';

const { Tr, Th, Td, THead, TBody } = Table;

interface CSVTableProps {
  csvFiles: DataFile[];
  onRowClick: (csvFile: DataFile) => void;
  onDetailsClick: (csvFile: DataFile) => void;
  onPreviewClick: (csvFile: DataFile) => void;
}

const CSVTable: React.FC<CSVTableProps> = ({ 
  csvFiles, 
  onRowClick, 
  onDetailsClick, 
  onPreviewClick 
}) => (
  <Table hoverable>
    <THead>
      <Tr>
        <Th>File Name</Th>
        <Th>File ID</Th>
        <Th>File Status</Th>
        <Th>Details</Th>
        <Th>Preview</Th>
      </Tr>
    </THead>
    <TBody>
      {csvFiles.map((csvFile) => (
        <Tr 
          key={csvFile.file_id} 
          onClick={() => onRowClick(csvFile)} 
          className="cursor-pointer"
        >
          <Td>{csvFile.file_name}</Td>
          <Td>{csvFile.file_id}</Td>
          <Td>
            <span className={`badge ${csvFile.file_path_exists ? 'bg-success' : 'bg-danger'}`}>
              {csvFile.file_path_exists ? 'Available' : 'Missing'}
            </span>
          </Td>
          <Td>
            <Button
              size="sm"
              variant="solid"
              onClick={(e) => { 
                e.stopPropagation(); 
                onDetailsClick(csvFile); 
              }}
              disabled={!csvFile.file_path_exists}
            >
              View Details
            </Button>
          </Td>
          <Td>
            <Button
              size="sm"
              variant="solid"
              color="cyan"
              onClick={(e) => { 
                e.stopPropagation(); 
                onPreviewClick(csvFile); 
              }}
              disabled={!csvFile.file_path_exists}
            >
              Data Preview
            </Button>
          </Td>
        </Tr>
      ))}
    </TBody>
  </Table>
);

export default CSVTable;