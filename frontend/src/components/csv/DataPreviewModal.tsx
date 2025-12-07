// src/components/csv/DataPreviewModal.tsx
import React, { useEffect, useState, ChangeEvent, useRef } from 'react';
import Dialog from '@/components/ui/Dialog';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import PlotCard from '@/components/csv/PlotCard';
import { DataFrameRow, ColumnInfo, DetailedColumnInfo } from '@/@types/csv';
import Input from '@/components/ui/Input';
import ApiService2 from '@/services/ApiService2';
import { RuleGroupType } from 'react-querybuilder';
import { useConfig } from '@/components/ui/ConfigProvider';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';

const { Tr, Th, Td, THead, TBody } = Table;

interface PaginationInfo {
  total_rows: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  has_next: boolean;
}

interface DataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataFrameData: DataFrameRow[];
  loadingDataFrame: boolean;
  userId: string;
  file_id: string;
  columns: ColumnInfo[];
  detailedColumns?: DetailedColumnInfo[];
  pagination?: PaginationInfo | null;
  showRuleForm?: boolean;
  filterQuery?: RuleGroupType;
  onPageChange?: (page: number) => void;
  pythonCodeSnippet?: string; // Python code snippet from filter response
}

const DataPreviewModal: React.FC<DataPreviewModalProps> = ({
  isOpen,
  onClose,
  dataFrameData,
  loadingDataFrame,
  userId,
  file_id,
  columns,
  detailedColumns,
  pagination,
  showRuleForm = false,
  filterQuery,
  onPageChange,
  pythonCodeSnippet,
}) => {
  const { themeColor, primaryColorLevel } = useConfig();
  
  // Get CSS color values for the theme
  const getThemeColors = () => {
    const colorMap: Record<string, Record<number, string>> = {
      red: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
      orange: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
      amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
      yellow: { 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
      lime: { 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#365314', 900: '#1a2e05' },
      green: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
      emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
      teal: { 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
      cyan: { 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63' },
      sky: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
      blue: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
      indigo: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
      violet: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
      purple: { 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87' },
      fuchsia: { 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75' },
      pink: { 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
      rose: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' }
    };
    
    const primaryColor = colorMap[themeColor]?.[primaryColorLevel] || '#4f46e5'; // fallback to indigo-600
    const lightColor = colorMap[themeColor]?.[Math.max(primaryColorLevel - 100, 100) as number] || '#6366f1'; // fallback to indigo-500
    
    return { primaryColor, lightColor };
  };

  const { primaryColor, lightColor } = getThemeColors();
  
  const [ruleName, setRuleName] = useState('');
  const [ruleDefinition, setRuleDefinition] = useState('');
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [createRuleError, setCreateRuleError] = useState<string | null>(null);
  
  // State for multiple plots
  const [plots, setPlots] = useState<Array<{ 
    id: string; 
    title: string; 
    config?: { plotType: string; inputs: { [key: string]: string } };
  }>>([
    { id: 'plot-1', title: 'Plot 1' }
  ]);
  const [nextPlotId, setNextPlotId] = useState(2);
  
  // State for comparison modal
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  
  // State for PDF generation
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Ref for rule form section
  const ruleFormRef = useRef<HTMLDivElement>(null);
  
  // Function to scroll to rule form
  const scrollToRuleForm = () => {
    ruleFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    console.log('DataPreviewModal - dataFrameData:', dataFrameData);
    console.log('DataPreviewModal - columns:', columns);
    console.log('DataPreviewModal - pagination:', pagination);
  }, [dataFrameData, columns, pagination]);

  // Reset plots state when modal is opened (only on initial open, not on data changes)
  useEffect(() => {
    if (isOpen) {
      setPlots([{ id: 'plot-1', title: 'Plot 1' }]);
      setNextPlotId(2);
      setIsCompareModalOpen(false);
    }
  }, [isOpen]);


  // Convert filter query to user-friendly format
  const formatFilterForDisplay = (query: RuleGroupType): string[] => {
    if (!query || !query.rules || query.rules.length === 0) {
      return [];
    }

    const processRules = (rules: any[]): string[] => {
      return rules.map(rule => {
        if (rule.rules) {
          const nestedRules = processRules(rule.rules);
          const combinator = rule.combinator === 'and' ? 'AND' : 'OR';
          return `(${nestedRules.join(` ${combinator} `)})`;
        } else {
          const operatorMap: { [key: string]: string } = {
            '=': 'equals',
            '!=': 'does not equal',
            '<': 'is less than',
            '<=': 'is less than or equal to',
            '>': 'is greater than',
            '>=': 'is greater than or equal to',
            'contains': 'contains',
            'doesNotContain': 'does not contain',
            'beginsWith': 'begins with',
            'endsWith': 'ends with',
            'in': 'is in',
            'notIn': 'is not in',
            'inUserList': 'is in user list',
            'notInUserList': 'is not in user list',
            'between': 'is between',
            'notBetween': 'is not between',
            'null': 'is null',
            'notNull': 'is not null',
            'regex': 'matches pattern'
          };

          const operatorText = operatorMap[rule.operator] || rule.operator;
          const fieldName = rule.field || 'Unknown field';
          
          // Format the value based on the operator
          let valueText = '';
          if (rule.operator === 'in' || rule.operator === 'notIn') {
            // For 'in' operators, show as comma-separated list
            const values = Array.isArray(rule.value) ? rule.value : [rule.value];
            valueText = `[${values.join(', ')}]`;
          } else if (rule.operator === 'between' || rule.operator === 'notBetween') {
            // For 'between' operators, show as range
            const values = Array.isArray(rule.value) ? rule.value : [rule.value];
            valueText = `${values[0]} and ${values[1] || '?'}`;
          } else if (rule.operator === 'inUserList' || rule.operator === 'notInUserList') {
            // For user list operators, show the list name
            valueText = `"${rule.value}"`;
          } else {
            // For single value operators
            valueText = `"${rule.value}"`;
          }

          return `${fieldName} ${operatorText} ${valueText}`;
        }
      });
    };

    const ruleStrings = processRules(query.rules);
    const combinator = query.combinator === 'and' ? 'AND' : 'OR';
    return ruleStrings.map(rule => rule).join(` ${combinator} `).split(` ${combinator} `);
  };

  const handleCreateRule = async () => {
    if (!ruleName.trim() || !ruleDefinition.trim()) {
      const errorMessage = 'Please fill in all fields';
      setCreateRuleError(errorMessage);
      
      // Show validation error notification
      toast.push(
        <Notification title="Validation Error" type="warning">
          {errorMessage}
        </Notification>
      );
      return;
    }

    setIsCreatingRule(true);
    setCreateRuleError(null);

    try {
      const pseudoQuery = pythonCodeSnippet || '';
      const response = await ApiService2.post(`/rules/users/files/${file_id}/rules`, {
        rule_name: ruleName,
        rule_definition: ruleDefinition,
        query: {
          pseudo_query: { query: pseudoQuery }
        }
      });

      if (!response.ok) {
        throw new Error('Failed to create rule');
      }

      // Show success notification
      toast.push(
        <Notification title="Rule Created Successfully" type="success">
          The rule "{ruleName}" has been created successfully.
        </Notification>
      );

      // Reset form
      setRuleName('');
      setRuleDefinition('');
      setCreateRuleError(null);
    } catch (error) {
      console.error('Error creating rule:', error);
      const errorMessage = 'Failed to create rule. Please try again.';
      setCreateRuleError(errorMessage);
      
      // Show error notification
      toast.push(
        <Notification title="Rule Creation Failed" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setIsCreatingRule(false);
    }
  };

  // Plot management functions
  const addPlot = () => {
    const newPlot = {
      id: `plot-${nextPlotId}`,
      title: `Plot ${nextPlotId}`
    };
    setPlots(prev => [...prev, newPlot]);
    setNextPlotId(prev => prev + 1);
  };

  const removePlot = (plotId: string) => {
    if (plots.length > 1) {
      setPlots(prev => prev.filter(plot => plot.id !== plotId));
    }
  };

  const updatePlotTitle = (plotId: string, newTitle: string) => {
    setPlots(prev => prev.map(plot => 
      plot.id === plotId ? { ...plot, title: newTitle } : plot
    ));
  };

  const handlePlotGenerated = (plotId: string, config: { plotType: string; inputs: { [key: string]: string } }) => {
    setPlots(prev => prev.map(plot => 
      plot.id === plotId ? { ...plot, config } : plot
    ));
  };

  const generatePDFReport = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // Small delay to ensure all charts are fully rendered
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Helper function to add text with word wrap
      const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * fontSize * 0.4);
      };

      // Helper function to check if we need a new page
      const checkNewPage = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
          return true;
        }
        return false;
      };

      // Title
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Data Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Subtitle
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Comprehensive Data Insights & Visualizations', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Add a line separator
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;

      // Data Overview Section
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Data Overview', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      const dataOverview = [
        `Total Rows: ${pagination?.total_rows !== undefined ? pagination.total_rows : dataFrameData.length}`,
        `Total Columns: ${columns.length}`,
        `Data Types: ${columns.map(col => col.type).join(', ')}`,
        `Sample Size: ${dataFrameData.length} rows`
      ];

      // Add detailed statistics if available
      if (detailedColumns && detailedColumns.length > 0) {
        const numericColumns = detailedColumns.filter(col => 
          ['integer', 'float', 'number'].includes(col.dtype) && 
          col.min !== undefined && col.min !== null && 
          col.max !== undefined && col.max !== null
        );
        
        if (numericColumns.length > 0) {
          dataOverview.push(`Numeric Columns: ${numericColumns.length}`);
        }
        
        const textColumns = detailedColumns.filter(col => 
          col.dtype === 'string' && col.max_length !== undefined && col.max_length !== null
        );
        
        if (textColumns.length > 0) {
          dataOverview.push(`Text Columns: ${textColumns.length}`);
        }
      }

      dataOverview.forEach(line => {
        yPosition = addText(line, 20, yPosition, pageWidth - 40);
        yPosition += 3;
      });

      yPosition += 10;

      // Column Details Section
      checkNewPage(50);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detailed Column Analysis', 20, yPosition);
      yPosition += 10;

      // Use detailed columns if available, otherwise fall back to basic columns
      const columnsToAnalyze = detailedColumns && detailedColumns.length > 0 ? detailedColumns : columns.map(col => ({
        name: col.name,
        dtype: col.type,
        num_unique_values: 0,
        unique_values: []
      }));

      columnsToAnalyze.forEach((column, index) => {
        checkNewPage(30);
        
        // Column header
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        const columnHeader = `${index + 1}. ${column.name} (${column.dtype})`;
        yPosition = addText(columnHeader, 20, yPosition, pageWidth - 40, 12);
        yPosition += 5;

        // Column statistics
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const stats = [];
        stats.push(`Unique Values: ${column.num_unique_values || 0}`);
        
        if ('min' in column && column.min !== undefined && column.min !== null) {
          stats.push(`Min: ${column.min}`);
        }
        if ('max' in column && column.max !== undefined && column.max !== null) {
          stats.push(`Max: ${column.max}`);
        }
        if ('mean' in column && column.mean !== undefined && column.mean !== null) {
          stats.push(`Mean: ${column.mean.toFixed(2)}`);
        }
        if ('median' in column && column.median !== undefined && column.median !== null) {
          stats.push(`Median: ${column.median}`);
        }
        if ('std_dev' in column && column.std_dev !== undefined && column.std_dev !== null) {
          stats.push(`Std Dev: ${column.std_dev.toFixed(2)}`);
        }
        if ('most_frequent' in column && column.most_frequent !== undefined && column.most_frequent !== null) {
          stats.push(`Most Frequent: ${column.most_frequent}`);
        }
        if ('max_length' in column && column.max_length !== undefined && column.max_length !== null) {
          stats.push(`Max Length: ${column.max_length}`);
        }

        // Add statistics
        stats.forEach(stat => {
          yPosition = addText(stat, 25, yPosition, pageWidth - 50, 10);
          yPosition += 2;
        });

        // Add sample unique values if available
        if (column.unique_values && Array.isArray(column.unique_values) && column.unique_values.length > 0) {
          yPosition += 2;
          pdf.setFont('helvetica', 'bold');
          yPosition = addText('Sample Values:', 25, yPosition, pageWidth - 50, 10);
          yPosition += 2;
          
          pdf.setFont('helvetica', 'normal');
          const sampleValues = column.unique_values.slice(0, 5).map(val => String(val));
          const valuesText = sampleValues.join(', ');
          yPosition = addText(valuesText, 25, yPosition, pageWidth - 50, 9);
          if (column.unique_values.length > 5) {
            yPosition = addText('...', 25, yPosition, pageWidth - 50, 9);
          }
        }

        yPosition += 8;
      });

      yPosition += 10;

      // Sample Data Section
      if (dataFrameData.length > 0) {
        checkNewPage(50);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Sample Data (First 10 Rows)', 20, yPosition);
        yPosition += 10;

        // Create a simple table for sample data
        const sampleData = dataFrameData.slice(0, 10);
        const columnNames = Object.keys(sampleData[0]);
        
        // Table headers
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        let xPosition = 20;
        const colWidth = (pageWidth - 40) / Math.min(columnNames.length, 4); // Limit to 4 columns for readability
        
        columnNames.slice(0, 4).forEach((colName, index) => {
          pdf.text(colName.substring(0, 15), xPosition + (index * colWidth), yPosition);
        });
        yPosition += 5;

        // Table rows
        pdf.setFont('helvetica', 'normal');
        sampleData.forEach((row, rowIndex) => {
          checkNewPage(10);
          columnNames.slice(0, 4).forEach((colName, colIndex) => {
            const cellValue = row[colName];
            const value = String(cellValue !== null && cellValue !== undefined ? cellValue : '').substring(0, 15);
            pdf.text(value, xPosition + (colIndex * colWidth), yPosition);
          });
          yPosition += 4;
        });

        yPosition += 10;
      }

      // Plots Section
      const generatedPlots = plots.filter(plot => plot.config);
      if (generatedPlots.length > 0) {
        checkNewPage(30);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Data Visualizations', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Generated ${generatedPlots.length} plot(s) for data analysis`, 20, yPosition);
        yPosition += 15;

        // Capture and add plot images
        for (let i = 0; i < generatedPlots.length; i++) {
          const plot = generatedPlots[i];
          
          try {
            // Find the plot element by its ID
            const plotElement = document.querySelector(`[data-plot-id="${plot.id}"] .datilito-chart`);
            
            if (plotElement) {
              // Capture the plot as an image
              const canvas = await html2canvas(plotElement as HTMLElement, {
                backgroundColor: '#ffffff',
                scale: 2, // Higher quality
                useCORS: true,
                allowTaint: true,
                width: plotElement.clientWidth,
                height: plotElement.clientHeight
              });

              // Convert canvas to image data
              const imgData = canvas.toDataURL('image/png');
              
              // Calculate image dimensions to fit on page
              const maxWidth = pageWidth - 40; // 20mm margin on each side
              const maxHeight = 120; // Maximum height for plot images
              
              let imgWidth = canvas.width * 0.264583; // Convert pixels to mm (96 DPI)
              let imgHeight = canvas.height * 0.264583;
              
              // Scale down if too large
              if (imgWidth > maxWidth) {
                const scale = maxWidth / imgWidth;
                imgWidth = maxWidth;
                imgHeight = imgHeight * scale;
              }
              
              if (imgHeight > maxHeight) {
                const scale = maxHeight / imgHeight;
                imgHeight = maxHeight;
                imgWidth = imgWidth * scale;
              }

              // Check if we need a new page for the image
              checkNewPage(imgHeight + 20);

              // Add plot title
              pdf.setFontSize(12);
              pdf.setFont('helvetica', 'bold');
              pdf.text(`${i + 1}. ${plot.title}`, 20, yPosition);
              yPosition += 8;

              // Add plot type
              if (plot.config) {
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`Type: ${plot.config.plotType}`, 20, yPosition);
                yPosition += 5;
              }

              // Add the plot image
              pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 15;

            } else {
              // Fallback: just add plot information if element not found
              checkNewPage(15);
              pdf.setFontSize(10);
              pdf.setFont('helvetica', 'bold');
              pdf.text(`${i + 1}. ${plot.title}`, 20, yPosition);
              yPosition += 5;
              
              pdf.setFont('helvetica', 'normal');
              if (plot.config) {
                const plotInfo = `Type: ${plot.config.plotType}`;
                yPosition = addText(plotInfo, 20, yPosition, pageWidth - 40, 10);
                yPosition += 3;
              }
            }
          } catch (error) {
            console.error(`Error capturing plot ${plot.title}:`, error);
            // Fallback: just add plot information
            checkNewPage(15);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${i + 1}. ${plot.title}`, 20, yPosition);
            yPosition += 5;
            
            pdf.setFont('helvetica', 'normal');
            if (plot.config) {
              const plotInfo = `Type: ${plot.config.plotType}`;
              yPosition = addText(plotInfo, 20, yPosition, pageWidth - 40, 10);
              yPosition += 3;
            }
          }
        }
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Generated by Data Analysis Tool', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save the PDF
      const fileName = `data_analysis_report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      // Show success notification
      toast.push(
        <Notification title="PDF Generated Successfully" type="success">
          Your data analysis report has been downloaded as {fileName}
        </Notification>
      );

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.push(
        <Notification title="PDF Generation Failed" type="danger">
          Failed to generate PDF report. Please try again.
        </Notification>
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const renderFilterSummary = () => {
    if (!filterQuery || !filterQuery.rules || filterQuery.rules.length === 0) {
      return null;
    }

    const filterStrings = formatFilterForDisplay(filterQuery);
    const combinator = filterQuery.combinator === 'and' ? 'AND' : 'OR';

    return (
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1.5 bg-blue-500 rounded-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Applied Filters</h3>
            </div>
            
            <div className="space-y-2">
              {filterStrings.map((filter, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {index > 0 && (
                    <div className="flex items-center">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                        {combinator}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 p-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{filter}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-blue-600 dark:text-blue-400">
                <span className="font-medium">Result:</span> Showing filtered data based on the above conditions
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!dataFrameData || dataFrameData.length === 0) {
      return (
        <div className="text-center py-4">No data available for preview.</div>
      );
    }

    const firstRow = dataFrameData[0];
    const columnNames = Object.keys(firstRow);

    return (
      <div className="max-h-[60vh] overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
            <tr>
              {columnNames.map((column, index) => (
                <th key={index} className="bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-300 px-4 py-3 text-left">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataFrameData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {columnNames.map((column, colIndex) => (
                  <td key={colIndex} className="border-b border-gray-100 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">
                    {row[column] !== null && row[column] !== undefined ? String(row[column]) : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPaginationInfo = () => {
    if (!pagination) return null;

    const handlePageChange = (page: number) => {
      if (onPageChange && page >= 1 && page <= pagination.total_pages && !loadingDataFrame) {
        onPageChange(page);
      }
    };

    const renderPaginationButtons = () => {
      const buttons = [];
      const currentPage = pagination.current_page;
      const totalPages = pagination.total_pages;

      // Previous button
      buttons.push(
        <button
          key="prev"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loadingDataFrame}
          className="px-1.5 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      );

      // Page numbers
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);

      // First page if not in range
      if (startPage > 1) {
        buttons.push(
          <button
            key="first"
            onClick={() => handlePageChange(1)}
            disabled={loadingDataFrame}
            className="px-1.5 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            1
          </button>
        );
        if (startPage > 2) {
          buttons.push(
            <span key="ellipsis1" className="px-0.5 py-0.5 text-gray-400 text-xs">
              ...
            </span>
          );
        }
      }

      // Page numbers in range
      for (let i = startPage; i <= endPage; i++) {
        buttons.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            disabled={loadingDataFrame}
            className={`px-1.5 py-0.5 text-xs border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${
              i === currentPage 
                ? 'text-white' 
                : 'border-gray-300 text-gray-700'
            }`}
            style={i === currentPage ? {
              backgroundColor: primaryColor,
              borderColor: primaryColor
            } : {}}
          >
            {i}
          </button>
        );
      }

      // Last page if not in range
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          buttons.push(
            <span key="ellipsis2" className="px-0.5 py-0.5 text-gray-400 text-xs">
              ...
            </span>
          );
        }
        buttons.push(
          <button
            key="last"
            onClick={() => handlePageChange(totalPages)}
            disabled={loadingDataFrame}
            className="px-1.5 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {totalPages}
          </button>
        );
      }

      // Next button
      buttons.push(
        <button
          key="next"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loadingDataFrame}
          className="px-1.5 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      );

      return buttons;
    };

    return (
      <div className="mt-1 space-y-1">
        <div className="text-xs text-gray-600 flex items-center justify-between">
          <span>
            Showing {dataFrameData.length} of {pagination.total_rows} rows
            {pagination.total_pages > 1 && ` (Page ${pagination.current_page} of ${pagination.total_pages})`}
          </span>
          {loadingDataFrame && (
            <div 
              className="flex items-center space-x-1"
              style={{ color: primaryColor }}
            >
              <Spinner size={10} />
              <span className="text-xs">Loading...</span>
            </div>
          )}
        </div>
        
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-center space-x-0.5">
            {renderPaginationButtons()}
          </div>
        )}
      </div>
    );
  };

  const renderPlotsSection = () => (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-800">Data Visualization</h4>
      </div>
      
      <div className="space-y-6">
        {plots.map((plot, index) => (
          <div key={plot.id} className="bg-white rounded-lg border border-gray-200 p-4" data-plot-id={plot.id}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Input
                  value={plot.title}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updatePlotTitle(plot.id, e.target.value)}
                  className="text-lg font-semibold border-none bg-transparent p-0 focus:ring-0"
                  placeholder="Plot Title"
                />
              </div>
              {plots.length > 1 && (
                <Button
                  variant="default"
                  color="red"
                  onClick={() => removePlot(plot.id)}
                  className="p-2"
                  title="Remove Plot"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              )}
            </div>
            <PlotCard 
              userId={userId} 
              file_id={file_id} 
              columns={columns}
              detailedColumns={detailedColumns}
              key={`${plot.id}-${index}`} // Force re-render when plot changes
              onPlotGenerated={(config) => handlePlotGenerated(plot.id, config)}
              visible_plot_extra_info={true}
              pythonCodeSnippet={pythonCodeSnippet}
            />
          </div>
        ))}
      </div>
      
      {/* Add Plot Button - Moved to bottom */}
      <div className="mt-6 flex justify-center">
        <Button
          variant="solid"
          color="blue"
          onClick={addPlot}
          className="flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Plot</span>
        </Button>
      </div>
      
      {/* Compare Button */}
      {plots.length > 1 && plots.length <= 4 && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="solid"
            color="green"
            onClick={() => setIsCompareModalOpen(true)}
            className="flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Compare All Plots</span>
          </Button>
        </div>
      )}
      
      {/* Warning for too many plots */}
      {plots.length > 4 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm text-yellow-800">
              Comparison view is limited to 4 plots maximum. You currently have {plots.length} plots.
            </span>
          </div>
        </div>
      )}
      
      {/* PDF Report Button */}
      <div className="mt-6 flex justify-center">
        <Button
          variant="solid"
          color="purple"
          onClick={generatePDFReport}
          loading={isGeneratingPDF}
          disabled={isGeneratingPDF}
          className="flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{isGeneratingPDF ? 'Generating PDF...' : 'Generate PDF Report'}</span>
        </Button>
      </div>
    </div>
  );

  const renderComparisonModal = () => {
    const getGridLayout = (plotCount: number) => {
      switch (plotCount) {
        case 1:
          return 'grid-cols-1';
        case 2:
          return 'grid-cols-1 lg:grid-cols-2'; // Left and Right
        case 3:
          return 'grid-cols-1 lg:grid-cols-2'; // Top-left, Top-right, Bottom-left (2x2 grid with empty bottom-right)
        case 4:
          return 'grid-cols-1 lg:grid-cols-2'; // Top-left, Top-right, Bottom-left, Bottom-right (2x2 grid)
        default:
          return 'grid-cols-1';
      }
    };

    return (
      <Dialog
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        width="90vw"
        height="85vh"
        contentClassName="p-0 flex flex-col h-full"
        closable={false}
        style={{
          content: {
            left: '50%',
            transform: 'translate(-50%, 0)',
            margin: 0,
            position: 'fixed',
            maxWidth: '90vw',
            height: '85vh'
          }
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 text-white rounded-t-lg flex-shrink-0"
          style={{
            background: `linear-gradient(to right, #16a34a, ${primaryColor})`
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Plot Comparison</h2>
              <p className="text-white/80 text-sm">Compare {plots.length} plot{plots.length !== 1 ? 's' : ''} side by side</p>
            </div>
          </div>
          <button
            onClick={() => setIsCompareModalOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors duration-200 group"
            aria-label="Close comparison modal"
          >
            <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto bg-gray-50 min-h-0">
          <div className={`grid ${getGridLayout(plots.length)} gap-6`}>
            {plots.map((plot, index) => (
              <div key={plot.id} className="bg-white rounded-lg border border-gray-200 p-4 h-inherit">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 text-center border-b border-gray-200 pb-2">
                    {plot.title}
                  </h3>
                </div>
                <div className="min-h-[400px] datilio-chart-keeper">
                  {plot.config ? (
                     <PlotCard 
                       userId={userId} 
                       file_id={file_id} 
                       columns={columns}
                       detailedColumns={detailedColumns}
                       plotConfig={plot.config}
                       key={`compare-${plot.id}-${index}`}
                       visible_plot_extra_info={false}
                       pythonCodeSnippet={pythonCodeSnippet}
                     />
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-gray-500 text-sm">No chart generated yet</p>
                        <p className="text-gray-400 text-xs">Generate a chart in the main view to see it here</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex-shrink-0">
          <div className="text-sm text-gray-500">
            <span>Comparing {plots.length} plot{plots.length !== 1 ? 's' : ''} • Use scroll to navigate</span>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="default" 
              onClick={() => setIsCompareModalOpen(false)}
              className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
            >
              Close Comparison
            </Button>
          </div>
        </div>
      </Dialog>
    );
  };

  const renderRuleForm = () => (
    <div ref={ruleFormRef} className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-blue-300 shadow-lg mt-6">
      {/* Header with Icon */}
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b-2 border-blue-200">
        <div 
          className="p-3 rounded-xl shadow-md"
          style={{ backgroundColor: primaryColor }}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <div>
          <h4 className="text-xl font-bold text-gray-800">Create New Rule</h4>
          <p className="text-sm text-gray-600">Save your current filter as a reusable rule</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Rule Name Input */}
        <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
          <label className="flex items-center text-sm font-bold text-gray-800 mb-3">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Rule Name
            <span className="ml-1 text-red-500">*</span>
          </label>
          <Input
            value={ruleName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setRuleName(e.target.value)}
            placeholder="e.g., High Value Customers"
            className="w-full text-base"
          />
          <p className="text-xs text-gray-500 mt-2">Choose a descriptive name for your rule</p>
        </div>

        {/* Rule Definition Input */}
        <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
          <label className="flex items-center text-sm font-bold text-gray-800 mb-3">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Rule Definition
            <span className="ml-1 text-red-500">*</span>
          </label>
          <textarea
            value={ruleDefinition}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRuleDefinition(e.target.value)}
            placeholder="Describe what this rule does..."
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            rows={4}
          />
          <p className="text-xs text-gray-500 mt-2">Explain the purpose and logic of this rule</p>
        </div>

        {/* Error Message */}
        {createRuleError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 text-sm font-medium">{createRuleError}</span>
            </div>
          </div>
        )}

        {/* Create Button */}
        <div className="pt-2">
          <Button
            variant="solid"
            className="w-full py-3 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            onClick={handleCreateRule}
            loading={isCreatingRule}
            disabled={isCreatingRule}
            style={{
              backgroundColor: primaryColor,
              borderColor: primaryColor
            }}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{isCreatingRule ? 'Creating Rule...' : 'Create Rule'}</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog
      key="data-preview-modal"
      isOpen={isOpen}
      onClose={onClose}
      width="90vw"
      height="85vh"
      contentClassName="p-0 flex flex-col h-full"
      closable={false}
      style={{
        content: {
          left: '50%',
          transform: 'translate(-50%, 0)',
          margin: 0,
          position: 'fixed',
          maxWidth: '90vw',
          height: '85vh'
        }
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-3 text-white rounded-t-lg flex-shrink-0"
        style={{
          background: `linear-gradient(to right, #4f46e5, ${primaryColor})`
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Data Preview</h2>
            <p className="text-white/80 text-xs">Explore and visualize your data</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors duration-200 group"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto min-h-0">
        <div className="space-y-6">
           {/* Create Rule Button - Only show when showRuleForm is true */}
           {showRuleForm && dataFrameData && dataFrameData.length > 0 && (
            <div className="flex justify-center">
              <button
                onClick={scrollToRuleForm}
                className="group relative px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${lightColor} 100%)`
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-base font-bold">Save as Rule</div>
                    <div className="text-xs text-white/90">Click to create a reusable rule from your filter</div>
                  </div>
                  <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </button>
            </div>
          )}

          {/* Filter Summary */}
          {renderFilterSummary()}
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
            {/* Loading overlay for table area only */}
            {loadingDataFrame && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                <div className="text-center">
                  <div 
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-2"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <Spinner size={20} />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Loading page data...</p>
                </div>
              </div>
            )}
            
            {/* Table content - always rendered to maintain size */}
            {dataFrameData && dataFrameData.length > 0 ? (
              <>
                {renderTable()}
                {renderPaginationInfo()}
              </>
            ) : !loadingDataFrame ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">No data available</h4>
                <p className="text-xs text-gray-500">No data to display for preview</p>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Spinner size={24} />
                  <p className="text-sm text-gray-600 mt-2">Loading initial data...</p>
                </div>
              </div>
            )}
          </div>

          {dataFrameData && dataFrameData.length > 0 && (
            <>
              {renderPlotsSection()}
              {showRuleForm && renderRuleForm()}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg flex-shrink-0">
        <div className="text-sm text-gray-500">
          {dataFrameData && dataFrameData.length > 0 && (
            <span>
              {dataFrameData.length} rows loaded • {plots.length} plot{plots.length !== 1 ? 's' : ''} created
              {filterQuery && filterQuery.rules && filterQuery.rules.length > 0 && (
                <span className="ml-2 text-blue-600">• Filters applied</span>
              )}
            </span>
          )}
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="default" 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          >
            Close
          </Button>
        </div>
      </div>
      
      {/* Comparison Modal */}
      {renderComparisonModal()}
    </Dialog>
  );
};

export default DataPreviewModal;