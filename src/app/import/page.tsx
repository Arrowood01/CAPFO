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

// Utility function to transform data based on mappings
const transformData = (
  data: RawSheetData,
  mappings: Record<number, string>
): TransformedSheetData => {
  const outputKeys: Record<string, string> = {
    'Make': 'make',
    'Model': 'model',
    'Serial Number': 'serial_number',
    'Unit Number': 'unit_number',
    'Purchase Price': 'purchase_price',
    'Category': 'category_name',
    'Install Date': 'install_date', // Added Install Date
  };

  return data.map((row) => {
    const transformedRow: TransformedRow = {};
    for (const colIndexStr in mappings) {
      const colIndex = parseInt(colIndexStr, 10);
      const mappingKey = mappings[colIndex]; // e.g., "Make", "Category", "Install Date"
      
      if (mappingKey === 'Ignore' || mappingKey === '') {
        continue; // Skip ignored or unselected columns
      }

      const outputKey = outputKeys[mappingKey]; // e.g., "make", "category_name", "install_date"
      
      if (outputKey && row[colIndex] !== undefined && row[colIndex] !== null) { // Ensure outputKey exists for the mappingKey
        let value: string | number | null | Date = row[colIndex];

        // Apply specific transformations based on the outputKey
        if (outputKey === 'purchase_price') {
          const numValue = parseFloat(String(value).replace(/[^0-9.-]+/g,""));
          value = isNaN(numValue) ? String(value) : numValue;
        } else if (outputKey === 'install_date') {
          if (typeof value === 'number') { // Excel date serial number
            const excelEpoch = new Date(1899, 11, 30);
            const dateObj = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
            if (!isNaN(dateObj.getTime())) {
              value = dateObj.toISOString().split('T')[0];
            } else {
              console.warn(`Could not parse Excel date number: ${row[colIndex]} for ${mappingKey}`);
              value = String(row[colIndex]);
            }
          } else { // String date
            const dateObj = new Date(String(value));
            if (!isNaN(dateObj.getTime())) {
              value = dateObj.toISOString().split('T')[0];
            } else {
              console.warn(`Could not parse date string: ${row[colIndex]} for ${mappingKey}`);
              value = String(row[colIndex]); // Keep original string if parsing fails
            }
          }
        } else if (outputKey === 'category_name') {
            value = String(value); // Ensure category_name is a string
        }
        // For other keys like 'make', 'model', 'serial_number', 'unit_number', no special transformation is needed here beyond String() if necessary.
        // The value is already assigned from row[colIndex].
        
        transformedRow[outputKey] = value as string | number | null;
      } else if (!outputKey && mappingKey) {
        // This case handles if a mappingKey exists (e.g., "Laundry" from user dropdown)
        // but it's not defined in our outputKeys object.
        console.warn(`No outputKey defined for mappingKey: "${mappingKey}" from column index ${colIndex}. This column's data will be skipped.`);
      }
    }
    return transformedRow;
  }).filter(obj => Object.keys(obj).length > 0);
};


const ImportPage = () => {
  const [rawSheetData, setRawSheetData] = useState<RawSheetData | null>(null);
  const [transformedData, setTransformedData] = useState<TransformedSheetData | null>(null);
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  // const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null); // Removed

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
      const transformed = transformData(allData, mappings);
      setTransformedData(transformed);
      setCurrentStep('assign'); // Change to 'assign' step after mapping
    },
    []
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
    <div className="container mx-auto p-4 md:p-8 bg-white text-black"> {/* Enforce white background and black text */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-black">Import Equipment Data</h1> {/* Black text */}
        <p className="mt-2 text-gray-700"> {/* Slightly lighter black for subtext if desired, or use text-black */}
          Upload an XLSX file, map the columns, and preview your data before final import.
        </p>
      </header>

      <div className="space-y-8">
        {currentStep === 'upload' && (
          <FileUpload onFileProcessed={handleFileProcessed} onReset={handleReset} />
        )}

        {currentStep === 'map' && rawSheetData && (
          <ColumnMapper
            dataPreview={rawSheetData.slice(0, 5)} // Preview first 5 data rows (original rows 10-14)
            allUploadedData={rawSheetData}
            onMappingConfirm={handleMappingConfirm}
            onReset={handleReset}
          />
        )}

        {currentStep === 'assign' && transformedData && (
          <div className="bg-white p-6 rounded-lg shadow-md border border-[var(--border-blue)]"> {/* White bg, blue border */}
            <h2 className="text-2xl font-semibold mb-6 text-black">Assign Community</h2> {/* Black text */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
              <div>
                <label htmlFor="community-select" className="block text-sm font-medium text-black mb-1"> {/* Black text */}
                  Assign to Community
                </label>
                <select
                  id="community-select"
                  value={selectedCommunityId || ''}
                  onChange={(e) => setSelectedCommunityId(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base text-black border-gray-300 focus:outline-none focus:ring-[var(--primary-blue)] focus:border-[var(--primary-blue)] sm:text-sm rounded-md shadow-sm" /* Black text for select, blue focus */
                >
                  <option value="" disabled>Select a community</option>
                  {communities.map((community) => (
                    <option key={community.id} value={community.id} className="text-black"> {/* Ensure option text is black */}
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
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-black hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-blue)]" /* Black text, light gray hover, blue focus */
              >
                Start Over
              </button>
              <button
                type="button"
                onClick={handleAssignConfirm}
                disabled={!selectedCommunityId} // Only depends on selectedCommunityId now
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-blue)] disabled:bg-gray-400 disabled:cursor-not-allowed" /* Blue background, white text */
              >
                Confirm Assignment & Preview
              </button>
            </div>
          </div>
        )}

        {currentStep === 'preview' && transformedData && selectedCommunityId && ( // Removed selectedCategoryId
          <TransformedDataPreview
            transformedData={transformedData} // This will now contain category_name
            onStartOver={handleReset}
            communityId={selectedCommunityId} // communityId is still needed
            // categoryId prop removed
            onImport={handleActualImport}
            // The import button inside TransformedDataPreview will call this onImport
          />
        )}
      </div>
    </div>
  );
};

export default ImportPage;