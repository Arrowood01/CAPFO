'use client';

import React, { useState, useCallback, useEffect } from 'react';
import FileUpload from '@/components/import/FileUpload';
import ColumnMapper from '@/components/import/ColumnMapper';
import TransformedDataPreview from '@/components/import/TransformedDataPreview';
import { supabase } from '@/lib/supabaseClient'; // Corrected path

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
  data: any[][],
  mappings: Record<number, string>
): Record<string, any>[] => {
  const outputKeys: Record<string, string> = {
    'Make': 'make',
    'Model': 'model',
    'Serial Number': 'serial_number',
    'Unit Number': 'unit_number',
    'Purchase Price': 'purchase_price',
  };

  return data.map((row) => {
    const transformedRow: Record<string, any> = {};
    for (const colIndexStr in mappings) {
      const colIndex = parseInt(colIndexStr, 10);
      const mappingKey = mappings[colIndex]; // e.g., "Make"
      const outputKey = outputKeys[mappingKey]; // e.g., "make"
      
      if (outputKey && row[colIndex] !== undefined && row[colIndex] !== null) {
        let value = row[colIndex];
        // Attempt to convert purchase_price to number
        if (outputKey === 'purchase_price') {
          const numValue = parseFloat(String(value).replace(/[^0-9.-]+/g,""));
          value = isNaN(numValue) ? String(value) : numValue;
        }
        transformedRow[outputKey] = value;
      }
    }
    return transformedRow;
  }).filter(obj => Object.keys(obj).length > 0); // Remove empty objects if a row had no mapped data
};


const ImportPage = (): React.JSX.Element => {
  const [rawSheetData, setRawSheetData] = useState<any[][] | null>(null);
  const [transformedData, setTransformedData] = useState<Record<string, any>[] | null>(null);
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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

  const handleFileProcessed = useCallback((data: any[][]) => {
    setRawSheetData(data);
    setTransformedData(null); // Clear previous transformed data
    setCurrentStep('map');
  }, []);

  const handleMappingConfirm = useCallback(
    (mappings: Record<number, string>, allData: any[][]) => {
      const transformed = transformData(allData, mappings);
      setTransformedData(transformed);
      setCurrentStep('assign'); // Change to 'assign' step after mapping
    },
    []
  );

  const handleAssignConfirm = useCallback(() => {
    if (transformedData && selectedCommunityId && selectedCategoryId) {
      // Proceed to actual import (will be implemented in TransformedDataPreview or a new function)
      console.log('Proceeding to import with:', { selectedCommunityId, selectedCategoryId, transformedData });
      setCurrentStep('preview'); // Or directly to import and then show success
    } else {
      // This case should ideally be prevented by disabling the button
      console.warn('Community or Category not selected');
    }
  }, [transformedData, selectedCommunityId, selectedCategoryId]);


  const handleReset = useCallback(() => {
    setRawSheetData(null);
    setTransformedData(null);
    setSelectedCommunityId(null);
    setSelectedCategoryId(null);
    setCurrentStep('upload');
  }, []);


  const handleActualImport = async () => {
    if (!transformedData || !selectedCommunityId || !selectedCategoryId) {
      console.error("Missing data for import");
      // Show error toast/message
      return;
    }

    const assetsToInsert = transformedData.map(row => ({
      ...row,
      community_id: selectedCommunityId,
      category_id: selectedCategoryId,
      created_at: new Date().toISOString(),
    }));

    try {
      const { error } = await supabase.from('assets').insert(assetsToInsert);
      if (error) throw error;
      
      // After upload, clear the table and show a success toast/message
      console.log('Successfully imported assets!');
      // Show success toast
      setTransformedData(null); // Clear preview data
      setSelectedCommunityId(null);
      setSelectedCategoryId(null);
      // Optionally, navigate away or reset to 'upload' step
      setCurrentStep('upload'); // Or a success step
    } catch (error) {
      console.error('Error importing assets:', error);
      // Show error toast
    }
  };


  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Import Equipment Data</h1>
        <p className="mt-2 text-gray-600">
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
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-6 text-gray-700">Assign Community & Category</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="community-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Community
                </label>
                <select
                  id="community-select"
                  value={selectedCommunityId || ''}
                  onChange={(e) => setSelectedCommunityId(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                >
                  <option value="" disabled>Select a community</option>
                  {communities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Category
                </label>
                <select
                  id="category-select"
                  value={selectedCategoryId || ''}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Start Over
              </button>
              <button
                type="button"
                onClick={handleAssignConfirm}
                disabled={!selectedCommunityId || !selectedCategoryId}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Confirm Assignment & Preview
              </button>
            </div>
          </div>
        )}

        {currentStep === 'preview' && transformedData && selectedCommunityId && selectedCategoryId && (
          <TransformedDataPreview
            transformedData={transformedData}
            onStartOver={handleReset}
            // Pass down the selected IDs and the actual import function
            communityId={selectedCommunityId}
            categoryId={selectedCategoryId}
            onImport={handleActualImport} // This will be the new prop
            // The import button inside TransformedDataPreview will call this onImport
          />
        )}
      </div>
    </div>
  );
};

export default ImportPage;