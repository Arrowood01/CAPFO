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
      <div className="p-4 border rounded-lg shadow-sm bg-white text-black border-[var(--border-blue)]"> {/* White bg, black text, blue border */}
        <p>No data to display or import has been completed. Please complete the mapping and assignment process first.</p>
        <button
            onClick={onStartOver}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[var(--primary-blue)] rounded-md hover:bg-[var(--primary-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-blue)]" /* Blue button */
        >
            Start Over
        </button>
      </div>
    );
  }
  
  if (!communityId) { // Removed categoryId check
    return (
       <div className="p-4 border rounded-lg shadow-sm bg-white text-black border-[var(--border-blue)]"> {/* White bg, black text, blue border */}
        <p>Community not assigned. Please go back and assign it.</p> {/* Updated message */}
         <button
            onClick={onStartOver} // Or a more specific "go back to assignment" handler if available
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[var(--primary-blue)] rounded-md hover:bg-[var(--primary-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-blue)]" /* Blue button */
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
    <div className="p-4 border rounded-lg shadow-sm bg-white border-[var(--border-blue)]"> {/* White bg, blue border */}
      <h2 className="text-xl font-semibold mb-4 text-black">Preview Transformed Data</h2> {/* Black text */}
      <p className="text-sm text-gray-700 mb-4"> {/* Lighter black text */}
        This is a preview of your data after applying the column mappings.
      </p>
      
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full divide-y divide-gray-300 border border-gray-300"> {/* Adjusted border color */}
          <thead className="bg-gray-100"> {/* Lighter gray for table head */}
            <tr>
              {sortedHeaders.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider" /* Black text for header */
                >
                  {header.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transformedData.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}> {/* Alternating row colors */}
                {sortedHeaders.map((header) => (
                  <td key={header} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700"> {/* Lighter black for cell text */}
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
          className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-black hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-blue)] disabled:opacity-50" /* Black text, light gray hover, blue focus */
        >
          Start Over
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          disabled={isImporting || !communityId} // Removed categoryId from condition
          className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-blue)] disabled:bg-gray-400 disabled:cursor-not-allowed" /* Blue button */
        >
          {isImporting ? 'Importing...' : `Import ${transformedData.length} Assets`}
        </button>
      </div>
    </div>
  );
};

export default TransformedDataPreview;