'use client';

import React from 'react';

// Assuming TransformedSheetData is defined elsewhere (e.g., in a types file or passed down)
// For now, let's define it here if not already globally available.
// If it's in types.ts or similar: import { TransformedSheetData } from '@/types';
type TransformedRow = Record<string, string | number | null | undefined>; // Updated to allow undefined
type TransformedSheetData = TransformedRow[];

interface TransformedDataPreviewProps {
  transformedData: TransformedSheetData;
  onStartOver: () => void;
  communityId: string; // Stays
  // categoryId: string;  // Removed
  onImport: () => Promise<void>; // Stays
}

const TransformedDataPreview = ({
  transformedData,
  onStartOver,
  communityId,
  // categoryId, // Removed
  onImport
}: TransformedDataPreviewProps) => {
  const [isImporting, setIsImporting] = React.useState(false);

  if (!transformedData || transformedData.length === 0) {
    // This case should ideally not be reached if navigation to this step is controlled
    return (
      <div> {/* Outer card styling removed */}
        <p>No data to display or import has been completed. Please complete the mapping and assignment process first.</p>
        <button
            onClick={onStartOver}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
            Start Over
        </button>
      </div>
    );
  }
  
  if (!communityId) { // Removed categoryId check
    return (
       <div> {/* Outer card styling removed */}
        <p>Community not assigned. Please go back and assign it.</p>
         <button
            onClick={onStartOver} // Or a more specific "go back to assignment" handler if available
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
            Start Over
        </button>
      </div>
    )
  }

  const handleImportClick = async () => {
    setIsImporting(true);
    try {
      await onImport();
      // Success is handled by the parent (clearing data, showing toast)
    } catch (error) {
      console.error("Import failed in preview component:", error);
      // Error is handled by the parent (showing toast)
    } finally {
      setIsImporting(false);
    }
  };

  const headers = Object.keys(transformedData[0] || {});

  // Reorder headers to a more logical sequence if possible
  const preferredHeaderOrder = ['make', 'model', 'category_name', 'install_date', 'unit_number', 'serial_number', 'purchase_price']; // Added install_date
  const sortedHeaders = headers.sort((a, b) => {
    const indexA = preferredHeaderOrder.indexOf(a);
    const indexB = preferredHeaderOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b); // both not in preferred, sort alphabetically
    if (indexA === -1) return 1; // a not in preferred, b is, so b comes first
    if (indexB === -1) return -1; // b not in preferred, a is, so a comes first
    return indexA - indexB; // both in preferred, sort by preferred order
  });


  return (
    <div> {/* Outer card styling removed */}
      {/* h2 title removed */}
      <p className="text-sm text-gray-700 mb-4">
        This is a preview of your data after applying the column mappings.
      </p>
      
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              {sortedHeaders.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                >
                  {header.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {transformedData.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                {sortedHeaders.map((header) => (
                  <td key={header} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {String(row[header] !== null && row[header] !== undefined ? row[header] : '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
        <button
          type="button"
          onClick={onStartOver}
          disabled={isImporting}
          className="w-full sm:w-auto bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition disabled:opacity-50"
        >
          Start Over
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          disabled={isImporting || !communityId} // Removed categoryId from condition
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isImporting ? 'Importing...' : `Import ${transformedData.length} Assets`}
        </button>
      </div>
    </div>
  );
};

export default TransformedDataPreview;