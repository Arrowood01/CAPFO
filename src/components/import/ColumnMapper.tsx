'use client';

import React, { useState, useEffect, useCallback } from 'react';

// Type definitions for sheet data
type RawRowData = (string | number | null)[];
type RawSheetData = RawRowData[];

interface ColumnMapperProps {
  dataPreview: RawSheetData; // First 5 rows of data (original rows 10-14)
  allUploadedData: RawSheetData; // All data from row 10 onwards
  onMappingConfirm: (mappings: Record<number, string>, allData: RawSheetData) => void;
  onReset: () => void;
}

const MAPPING_OPTIONS = [
  { value: '', label: 'Select Field...' },
  { value: 'Make', label: 'Make' },
  { value: 'Model', label: 'Model' },
  { value: 'Serial Number', label: 'Serial Number' },
  { value: 'Unit Number', label: 'Unit Number' },
  { value: 'Purchase Price', label: 'Purchase Price' },
  { value: 'Category', label: 'Category' },
  { value: 'Install Date', label: 'Install Date' },
  { value: 'Ignore', label: 'Ignore' },
];

const REQUIRED_FIELDS_GROUP = ['Model', 'Unit Number']; // At least one of these must be mapped

const ColumnMapper = ({
  dataPreview,
  allUploadedData,
  onMappingConfirm,
  onReset,
}: ColumnMapperProps) => {
  const [mappings, setMappings] = useState<Record<number, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const numColumns = dataPreview.length > 0 ? dataPreview[0].length : 0;

  useEffect(() => {
    // Initialize mappings with "Ignore" for all columns or empty if no columns
    if (numColumns > 0) {
      const initialMappings: Record<number, string> = {};
      for (let i = 0; i < numColumns; i++) {
        initialMappings[i] = ''; // Default to "Select Field..."
      }
      setMappings(initialMappings);
    } else {
      setMappings({});
    }
  }, [numColumns]);

  const handleMappingChange = (columnIndex: number, value: string) => {
    setMappings((prevMappings) => ({
      ...prevMappings,
      [columnIndex]: value,
    }));
    setValidationError(null); // Clear error on change
  };

  const validateMappings = useCallback(() => {
    const selectedValues = Object.values(mappings);
    const uniqueSelectedValues = new Set<string>();
    let requiredFieldMapped = false;

    for (const value of selectedValues) {
      if (value && value !== 'Ignore') {
        if (uniqueSelectedValues.has(value)) {
          setValidationError(`Duplicate mapping: "${value}" is selected for multiple columns.`);
          return false;
        }
        uniqueSelectedValues.add(value);
      }
      if (REQUIRED_FIELDS_GROUP.includes(value)) {
        requiredFieldMapped = true;
      }
    }

    if (Object.values(mappings).every(val => val === '' || val === 'Ignore')) {
        setValidationError('Please map at least one column (other than "Ignore").');
        return false;
    }

    if (!requiredFieldMapped) {
      setValidationError(`At least one of "${REQUIRED_FIELDS_GROUP.join('" or "')}" must be mapped.`);
      return false;
    }
    
    setValidationError(null);
    return true;
  }, [mappings]);

  const handleConfirm = () => {
    if (validateMappings()) {
      // Pass the raw mappings object; transformData will handle "Ignore" and empty strings.
      onMappingConfirm(mappings, allUploadedData);
    }
  };

  if (!dataPreview || dataPreview.length === 0) {
    return (
      <div> {/* Outer card styling removed */}
        <p>No data available for mapping. Please upload a file first.</p>
        <button
            onClick={onReset}
            className="mt-4 bg-primary text-white font-medium py-2 px-4 rounded hover:bg-primary-dark transition"
        >
            Upload New File
        </button>
      </div>
    );
  }

  return (
    <div> {/* Outer card styling removed */}
      {/* h2 title removed */}
      <p className="text-sm text-gray-700 mb-1">
        Preview of the first 5 data rows (starting from row 10 of your file).
      </p>
      <p className="text-sm text-gray-700 mb-4">
        Select the corresponding field for each column from your uploaded sheet.
      </p>

      {validationError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
          <p>{validationError}</p>
        </div>
      )}

      <div className="overflow-x-auto mb-6">
        <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              {Array.from({ length: numColumns }).map((_, colIndex) => (
                <th key={colIndex} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                  <select
                    value={mappings[colIndex] || ''}
                    onChange={(e) => handleMappingChange(colIndex, e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary text-sm block w-full"
                  >
                    {MAPPING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {dataPreview.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 truncate max-w-xs">
                    {String(cell !== null && cell !== undefined ? cell : '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={onReset}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
        >
          Back to Upload
        </button>
        <button
          onClick={handleConfirm}
          className="bg-primary text-white font-medium py-2 px-4 rounded hover:bg-primary-dark transition"
        >
          Confirm Mappings
        </button>
      </div>
    </div>
  );
};

export default ColumnMapper;