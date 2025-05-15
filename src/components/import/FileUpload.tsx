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
          const jsonData: RawSheetData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            range: 9, // Start reading from the 10th row (0-indexed 9)
          }) as RawSheetData; // Cast to ensure type compatibility

          if (jsonData.length === 0) {
            setError('The uploaded file is empty or has no data starting from row 10.');
            setFileName(null);
            event.target.value = ''; // Reset file input
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
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Upload Excel File</h2>
      
      <div className="mb-4">
        <label
          htmlFor="file-upload-input"
          className="block w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
        >
          {fileName ? `Selected: ${fileName}` : 'Choose .xlsx file'}
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
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
          <p>{error}</p>
        </div>
      )}

      {fileName && !error && (
        <p className="mb-4 text-sm text-green-600">
          File &quot;{fileName}&quot; selected. Ready for mapping.
        </p>
      )}
      
      <button
        onClick={handleResetClick}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        disabled={!fileName && !error}
      >
        Reset Upload
      </button>
    </div>
  );
};

export default FileUpload;