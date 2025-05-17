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
            
            // If all columns were filtered out (e.g., sheet was truly empty or only empty columns had data)
            if (filteredJsonData.length > 0 && filteredJsonData[0].length === 0 && jsonData[0].length > 0) {
                 setError('All columns appear to be empty in the first 20 data rows. Please check your file.');
                 setFileName(null);
                 event.target.value = '';
                 return;
            }
            if (filteredJsonData.length === 0 && jsonData.length > 0) { // Should not happen if jsonData.length > 0
                 setError('No data rows found after attempting to filter empty columns.');
                 setFileName(null);
                 event.target.value = '';
                 return;
            }

            jsonData = filteredJsonData; // Use the filtered data
          }
          
          // After filtering, if jsonData itself became empty (e.g. only one row which was all empty columns)
          // or if the first row has no columns (meaning all columns were filtered out)
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
    // Reset the input field value
    const input = document.getElementById('file-upload-input') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
    onReset();
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white border-[var(--border-blue)]"> {/* White bg, blue border */}
      <h2 className="text-xl font-semibold mb-4 text-black">Upload Excel File</h2> {/* Black text */}
      
      <div className="mb-4">
        <label
          htmlFor="file-upload-input"
          className="block w-full px-4 py-3 text-center text-sm font-medium text-white bg-[var(--primary-blue)] border border-transparent rounded-md cursor-pointer hover:bg-[var(--primary-blue-hover)] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[var(--primary-blue)]" /* Blue button style for label */
        >
          {fileName ? `Selected: ${fileName}` : 'Choose .xlsx File'}
        </label>
        <input
          id="file-upload-input"
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          className="sr-only" // Hidden, styled by label
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md"> {/* Error messages remain red */}
          <p>{error}</p>
        </div>
      )}

      {fileName && !error && (
        <p className="mb-4 text-sm text-green-700"> {/* Darker green for success text on white */}
          File &quot;{fileName}&quot; selected. Ready for mapping.
        </p>
      )}
      
      {(fileName || error) && ( /* Show reset button only if a file is selected or an error occurred */
        <button
          onClick={handleResetClick}
          className="w-full mt-2 px-4 py-2 text-sm font-medium text-black bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-blue)] disabled:opacity-50" /* Gray button for reset */
        >
          Reset Upload
        </button>
      )}
    </div>
  );
};

export default FileUpload;