'use client';

import React, { useState, useCallback, useEffect } from 'react';
import FileUpload from '@/components/import/FileUpload';
import ColumnMapper from '@/components/import/ColumnMapper';
import TransformedDataPreview from '@/components/import/TransformedDataPreview';
import { supabase } from '@/lib/supabaseClient'; // Corrected path

// Type definitions for sheet data
type RawRowData = (string | number | null)[];
type RawSheetData = RawRowData[];
type TransformedRow = Record<string, string | number | null | undefined>; // Allow undefined for category_name initially
type TransformedSheetData = TransformedRow[];

type ImportStep = 'upload' | 'map' | 'preview' | 'assign'; // Added 'assign' step

interface Community {
  id: string;
  name: string;
  // Add other community fields if needed
}

interface Category {
  id: string;
  name: string;
  // Add other category fields if needed
}

// Utility function to transform data based on mappings - will be moved into ImportPage component

const ImportPage = () => {
  const [rawSheetData, setRawSheetData] = useState<RawSheetData | null>(null);
  const [transformedData, setTransformedData] = useState<TransformedSheetData | null>(null);
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [receivedMappingsDebug, setReceivedMappingsDebug] = useState<Record<number, string> | null>(null);
  const [transformDataLog, setTransformDataLog] = useState<string[]>([]); // New state for UI logging

  const transformData = useCallback((data: RawSheetData, mappings: Record<number, string>): TransformedSheetData => {
    const newLog: string[] = [];
    newLog.push("transformData called. Mappings: " + JSON.stringify(mappings));

    const outputKeys: Record<string, string> = {
      'Make': 'make',
      'Model': 'model',
      'Serial Number': 'serial_number',
      'Unit Number': 'unit_number',
      'Purchase Price': 'purchase_price',
      'Category': 'category_name',
      'Install Date': 'install_date',
    };

    const processedData = data.map((row, rowIndex) => {
      const transformedRow: TransformedRow = {};
      newLog.push(`\nProcessing Excel Row ${rowIndex + 10}: [${row.join(', ')}]`);

      for (let currentColumnIndex = 0; currentColumnIndex < row.length; currentColumnIndex++) {
        const userSelectedFieldForThisColumn = mappings[currentColumnIndex];
        const rawValueFromCell = row[currentColumnIndex];

        if (!userSelectedFieldForThisColumn || userSelectedFieldForThisColumn === 'Ignore' || userSelectedFieldForThisColumn === '') {
          if (userSelectedFieldForThisColumn === 'Ignore') {
            newLog.push(`  [Col ${currentColumnIndex}]: Mapped to 'Ignore'. Raw data: "${rawValueFromCell}". SKIPPED.`);
          } else if (userSelectedFieldForThisColumn === '') {
            newLog.push(`  [Col ${currentColumnIndex}]: Not mapped (Select Field...). Raw data: "${rawValueFromCell}". SKIPPED.`);
          }
          continue;
        }

        const internalFieldName = outputKeys[userSelectedFieldForThisColumn];

        if (internalFieldName && rawValueFromCell !== undefined && rawValueFromCell !== null) {
          let cellValue: string | number | null | Date = rawValueFromCell;
          let processingNotes = "";

          if (internalFieldName === 'purchase_price') {
            const numValue = parseFloat(String(cellValue).replace(/[^0-9.-]+/g, ""));
            cellValue = isNaN(numValue) ? String(cellValue) : numValue;
            processingNotes = ` (parsed as number: ${cellValue})`;
          } else if (internalFieldName === 'install_date') {
            if (typeof cellValue === 'number') {
              const excelEpoch = new Date(1899, 11, 30);
              const dateObj = new Date(excelEpoch.getTime() + cellValue * 24 * 60 * 60 * 1000);
              if (!isNaN(dateObj.getTime())) {
                cellValue = dateObj.toISOString().split('T')[0];
                processingNotes = ` (parsed Excel date number to: ${cellValue})`;
              } else {
                processingNotes = ` (FAILED to parse Excel date number: ${rawValueFromCell})`;
                cellValue = String(rawValueFromCell);
              }
            } else {
              const dateObj = new Date(String(cellValue));
              if (!isNaN(dateObj.getTime())) {
                cellValue = dateObj.toISOString().split('T')[0];
                processingNotes = ` (parsed date string to: ${cellValue})`;
              } else {
                processingNotes = ` (FAILED to parse date string: "${rawValueFromCell}")`;
                cellValue = String(rawValueFromCell);
              }
            }
          } else if (internalFieldName === 'category_name') {
            cellValue = String(cellValue);
            processingNotes = ` (ensured as string)`;
          }
          
          newLog.push(
              `  [Col ${currentColumnIndex}]: Mapped as "${userSelectedFieldForThisColumn}" -> internalKey "${internalFieldName}". Raw: "${rawValueFromCell}". Processed: "${cellValue}"${processingNotes}. ASSIGNED.`
          );
          transformedRow[internalFieldName] = cellValue as string | number | null;

        } else if (!internalFieldName && userSelectedFieldForThisColumn) {
          newLog.push(`  [Col ${currentColumnIndex}]: Mapped as "${userSelectedFieldForThisColumn}". No internalKey defined. Raw: "${rawValueFromCell}". SKIPPED.`);
        } else {
          newLog.push(`  [Col ${currentColumnIndex}]: Mapped as "${userSelectedFieldForThisColumn}". Raw: "${rawValueFromCell}". SKIPPED (null/undefined or no outputKey).`);
        }
      }
      if(Object.keys(transformedRow).length > 0) {
        newLog.push(`  End of Excel Row ${rowIndex + 10}. TransformedRow: ${JSON.stringify(transformedRow)}`);
      } else {
        newLog.push(`  End of Excel Row ${rowIndex + 10}. TransformedRow is EMPTY.`);
      }
      return transformedRow;
    }).filter(obj => Object.keys(obj).length > 0);
    
    setTransformDataLog(newLog);
    return processedData;
  }, [setTransformDataLog]); // Dependency for useCallback

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: communitiesData, error: communitiesError } = await supabase
          .from('communities')
          .select('id, name');
        if (communitiesError) throw communitiesError;
        setCommunities(communitiesData || []);

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name');
        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Error fetching communities or categories:', error);
        // Handle error (e.g., show a toast message)
      }
    };
    fetchData();
  }, []);

  const handleFileProcessed = useCallback((data: RawSheetData) => {
    setRawSheetData(data);
    setTransformedData(null); // Clear previous transformed data
    setCurrentStep('map');
  }, []);

  const handleMappingConfirm = useCallback(
    (mappings: Record<number, string>, allData: RawSheetData) => {
      setReceivedMappingsDebug(mappings); // Store mappings for display
      const transformed = transformData(allData, mappings);
      setTransformedData(transformed);
      setCurrentStep('assign'); // Change to 'assign' step after mapping
    },
    [transformData] // Added transformData to dependency array
  );

  const handleAssignConfirm = useCallback(() => {
    if (transformedData && selectedCommunityId) { // Removed selectedCategoryId
      // Proceed to actual import (will be implemented in TransformedDataPreview or a new function)
      console.log('Proceeding to preview with:', { selectedCommunityId, transformedData }); // Updated log
      setCurrentStep('preview'); // Or directly to import and then show success
    } else {
      // This case should ideally be prevented by disabling the button
      console.warn('Community not selected'); // Updated log
    }
  }, [transformedData, selectedCommunityId]); // Removed selectedCategoryId from dependencies


  const handleReset = useCallback(() => {
    setRawSheetData(null);
    setTransformedData(null);
    setSelectedCommunityId(null);
    // setSelectedCategoryId(null); // Removed
    setCurrentStep('upload');
  }, []);


  const handleActualImport = async () => {
    if (!transformedData || !selectedCommunityId) { // Removed selectedCategoryId check
      console.error("Missing data for import (community ID or transformed data)");
      // Show error toast/message
      return;
    }

    // Fetch current categories again to ensure we have the latest list before processing
    // This is important if multiple imports happen or categories are managed elsewhere
    let currentCategories: Category[] = [...categories];
    try {
        const { data: freshCategories, error: fetchError } = await supabase
            .from('categories')
            .select('id, name');
        if (fetchError) throw fetchError;
        if (freshCategories) currentCategories = freshCategories;
    } catch (error) {
        console.error('Error re-fetching categories before import:', error);
        // Show error toast
        return;
    }
    
    const assetsToInsert = [];
    const newCategoriesToCreate: { name: string }[] = [];
    const categoryNameToIdMap = new Map(currentCategories.map(cat => [cat.name.toLowerCase(), cat.id]));

    for (const row of transformedData) {
      if (!row.category_name) {
        console.warn('Skipping row due to missing category_name:', row);
        // Optionally, add to an errors list to show to the user
        continue;
      }
      const categoryName = String(row.category_name).trim();
      const categoryNameLower = categoryName.toLowerCase();
      const categoryId = categoryNameToIdMap.get(categoryNameLower); // Changed to const

      if (!categoryId) {
        // Check if we've already queued this new category for creation
        const existingNewCategory = newCategoriesToCreate.find(nc => nc.name.toLowerCase() === categoryNameLower);
        if (!existingNewCategory) {
          newCategoriesToCreate.push({ name: categoryName });
        }
        // We'll get the ID after creation, for now, mark it or handle it post-creation
      }
    }

    // Create new categories if any
    if (newCategoriesToCreate.length > 0) {
      try {
        const { data: createdCategories, error: createError } = await supabase
          .from('categories')
          .insert(newCategoriesToCreate)
          .select('id, name');
        if (createError) throw createError;
        
        if (createdCategories) {
          createdCategories.forEach(cat => {
            categoryNameToIdMap.set(cat.name.toLowerCase(), cat.id);
            // Update the main categories state as well
            setCategories(prev => [...prev, ...createdCategories].filter((c, i, self) => i === self.findIndex(t => t.id === c.id)));
          });
        }
      } catch (error) {
        console.error('Error creating new categories:', error);
        // Show error toast, potentially stop the import or let user decide
        return;
      }
    }

    // Now, map assets with correct category_id
    for (const row of transformedData) {
      if (!row.category_name) continue; // Already handled warning above

      const categoryName = String(row.category_name).trim();
      const categoryId = categoryNameToIdMap.get(categoryName.toLowerCase());

      if (!categoryId) {
        console.error(`Category ID for "${categoryName}" not found even after creation attempt. Skipping row.`, row);
        // Add to an errors list
        continue;
      }
      
      // Remove category_name from the row before inserting, as DB expects category_id
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { category_name, ...assetData } = row;

      assetsToInsert.push({
        ...assetData,
        community_id: selectedCommunityId,
        category_id: categoryId,
        install_date: assetData.install_date || null, // Add install_date, ensure it's null if not present
        created_at: new Date().toISOString(),
      });
    }

    if (assetsToInsert.length === 0 && transformedData.length > 0) {
        console.warn("No assets were prepared for import, possibly due to category issues for all rows.");
        // Show appropriate message to user
        return;
    }
    if (assetsToInsert.length === 0) {
        console.log("No assets to import.");
        setCurrentStep('upload');
        return;
    }

    try {
      const { error } = await supabase.from('assets').insert(assetsToInsert);
      if (error) throw error;
      
      console.log('Successfully imported assets!');
      // Show success toast
      setTransformedData(null); // Clear preview data
      setSelectedCommunityId(null);
      // setSelectedCategoryId(null); // Removed
      setCurrentStep('upload'); // Or a success step
    } catch (error) {
      console.error('Error importing assets:', error);
      // Show error toast
    }
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import Equipment Data</h1>
        <p className="text-base mb-6">
          Upload an XLSX file, map the columns, and preview your data before final import.
        </p>
      </header>

      <div className="space-y-8">
        {currentStep === 'upload' && (
          <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Step 1: Upload File</h2>
            <FileUpload onFileProcessed={handleFileProcessed} onReset={handleReset} />
          </div>
        )}

        {currentStep === 'map' && rawSheetData && (
          <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Step 2: Map Columns</h2>
            <ColumnMapper
              dataPreview={rawSheetData.slice(0, 5)} // Preview first 5 data rows (original rows 10-14)
              allUploadedData={rawSheetData}
              onMappingConfirm={handleMappingConfirm}
              onReset={handleReset}
            />
          </div>
        )}

        {/* Debug Display for Mappings */}
        {(currentStep === 'assign' || currentStep === 'preview') && receivedMappingsDebug && (
          <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-2">Debug: Received Mappings from ColumnMapper</h3>
            <pre className="text-xs text-yellow-800 whitespace-pre-wrap break-all">
              {JSON.stringify(receivedMappingsDebug, null, 2)}
            </pre>
          </div>
        )}

        {/* New Debug Display for TransformData Log */}
        {(currentStep === 'assign' || currentStep === 'preview') && transformDataLog.length > 0 && (
          <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-2">Debug: TransformData Execution Log</h3>
            <pre className="text-xs text-cyan-800 whitespace-pre-wrap break-all" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {transformDataLog.join('\n')}
            </pre>
          </div>
        )}

        {currentStep === 'assign' && transformedData && (
          <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Step 3: Assign Community</h2>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="community-select" className="text-sm font-medium">
                  Assign to Community
                </label>
                <select
                  id="community-select"
                  value={selectedCommunityId || ''}
                  onChange={(e) => setSelectedCommunityId(e.target.value)}
                  className="p-2 rounded border border-gray-300"
                >
                  <option value="" disabled>Select a community</option>
                  {communities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Category dropdown removed from here */}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleReset}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
              >
                Start Over
              </button>
              <button
                type="button"
                onClick={handleAssignConfirm}
                disabled={!selectedCommunityId} // Only depends on selectedCommunityId now
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                Confirm Assignment & Preview
              </button>
            </div>
          </div>
        )}

        {currentStep === 'preview' && transformedData && selectedCommunityId && ( // Removed selectedCategoryId
          <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Step 4: Preview & Import</h2>
            <TransformedDataPreview
              transformedData={transformedData} // This will now contain category_name
              onStartOver={handleReset}
              communityId={selectedCommunityId} // communityId is still needed
              // categoryId prop removed
              onImport={handleActualImport}
              // The import button inside TransformedDataPreview will call this onImport
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportPage;