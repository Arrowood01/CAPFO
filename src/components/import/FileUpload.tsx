'use client';

import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

// Type definitions for sheet data
type RawRowData = (string | number | null)[];
type RawSheetData = RawRowData[];

interface FileUploadProps {
  onFileProcessed: (data: RawSheetData) => void;
  onReset: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileProcessed, onReset }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setFileName(null);
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      if (!file.name.endsWith('.xlsx')) {
        setError('Invalid file type. Please upload a .xlsx file.');
        event.target.value = ''; // Reset file input
        return;
      }

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            setError('Could not read file data.');
            return;
          }
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Parse sheet to array of arrays, skipping first 9 rows
          let jsonData: RawSheetData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            range: 9, // Start reading from the 10th row (0-indexed 9)
            defval: null, // Ensure empty cells are consistently null
          }) as RawSheetData;

          if (jsonData.length === 0) {
            setError('The uploaded file is empty or has no data starting from row 10.');
            setFileName(null);
            event.target.value = '';
            return;
          }

          // Pre-filter entirely empty columns based on a sample of rows (e.g., first 20 data rows)
          if (jsonData.length > 0) {
            const numPreviewRowsToCheck = Math.min(jsonData.length, 20);
            const sampleRows = jsonData.slice(0, numPreviewRowsToCheck);
            const numOriginalColumns = sampleRows[0]?.length || 0;
            const columnsToKeep: boolean[] = new Array(numOriginalColumns).fill(false);

            for (let colIdx = 0; colIdx < numOriginalColumns; colIdx++) {
              for (let rowIdx = 0; rowIdx < sampleRows.length; rowIdx++) {
                const cellValue = sampleRows[rowIdx][colIdx];
                if (cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
                  columnsToKeep[colIdx] = true; // Mark column to keep if any cell in sample has data
                  break;
                }
              }
            }

            const filteredJsonData = jsonData.map(row => {
              return row.filter((_, colIdx) => columnsToKeep[colIdx]);
            });
            
            if (filteredJsonData.length > 0 && filteredJsonData[0].length === 0 && jsonData[0].length > 0) {
                 setError('All columns appear to be empty in the first 20 data rows. Please check your file.');
                 setFileName(null);
                 event.target.value = '';
                 return;
            }
            if (filteredJsonData.length === 0 && jsonData.length > 0) { 
                 setError('No data rows found after attempting to filter empty columns.');
                 setFileName(null);
                 event.target.value = '';
                 return;
            }

            jsonData = filteredJsonData; 
          }
          
          if (jsonData.length === 0 || (jsonData[0] && jsonData[0].length === 0) ) {
             setError('The file contains no data in any columns after filtering empty ones, or all columns were empty.');
             setFileName(null);
             event.target.value = '';
             return;
          }

          onFileProcessed(jsonData);
        } catch (err) {
          console.error('Error processing file:', err);
          setError('Error processing XLSX file. Please ensure it is a valid .xlsx file.');
          setFileName(null);
          event.target.value = ''; // Reset file input
        }
      };
      reader.onerror = () => {
        setError('Failed to read the file.');
        setFileName(null);
        event.target.value = ''; // Reset file input
      };
      reader.readAsArrayBuffer(file);
    },
    [onFileProcessed]
  );

  const handleResetClick = () => {
    setFileName(null);
    setError(null);
    const input = document.getElementById('file-upload-input') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
    onReset();
  };

  return (
    <div> {/* Outer card styling removed; will be handled by parent ImportPage */}
      {/* h2 title removed; will be part of the card in ImportPage */}
      
      <div className="mb-4">
        <label
          htmlFor="file-upload-input"
          className="block w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-center cursor-pointer"
        >
          {fileName ? `Selected: ${fileName}` : 'Choose .xlsx File'}
        </label>
        <input
          id="file-upload-input"
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          className="sr-only"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
          <p>{error}</p>
        </div>
      )}

      {fileName && !error && (
        <p className="mb-4 text-sm text-green-700">
          File &quot;{fileName}&quot; selected. Ready for mapping.
        </p>
      )}
      
      {(fileName || error) && (
        <button
          onClick={handleResetClick}
          className="w-full mt-2 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition disabled:opacity-50"
        >
          Reset Upload
        </button>
      )}
    </div>
  );
};

export default FileUpload;