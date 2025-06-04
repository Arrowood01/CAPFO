// Minor change for commit
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Assuming this is the correct path

// Basic toast notification (replace with a proper library like react-toastify if available)
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  // In a real app, you'd use a toast library.
  // For now, we'll just log to console and maybe alert.
  console.log(`Toast (${type}): ${message}`);
  if (typeof window !== 'undefined') {
    alert(`${type.toUpperCase()}: ${message}`);
  }
};


interface AssetCategory {
  id: string; // Assuming UUID or similar
  name: string;
  lifespan: number | null; // Matches DB, can be null
  avg_replacement_cost: number | null; // Matches DB, can be null
  // user_id: string; // If categories are user-specific
}

// Type for managing form state for asset categories, allowing strings for number inputs
interface AssetCategoryFormState {
  id?: string;
  name?: string;
  lifespan_years?: string | number; // Form uses lifespan_years, will map to DB 'lifespan'
  avg_replacement_cost?: string | number;
}

const SettingsPage = () => {
  const [inflationRate, setInflationRate] = useState<number | string>('');
  const [initialInflationRate, setInitialInflationRate] = useState<number | null>(null);
  // const [settingsId, setSettingsId] = useState<string | null>(null); // No longer needed with upsert
  const [loadingInflation, setLoadingInflation] = useState(true);


  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<AssetCategoryFormState>({});
  const [newCategory, setNewCategory] = useState<AssetCategoryFormState>({ name: '', lifespan_years: '', avg_replacement_cost: '' });
  const [loadingCategories, setLoadingCategories] = useState(true);



  // Fetch initial settings (inflation rate)
  const fetchInflationRate = useCallback(async () => {
    setLoadingInflation(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('id, value') // Select 'value' which holds the rate, not inflation_rate column
        .eq('key', 'inflation_rate') // Filter for the 'inflation_rate' key
        .limit(1)
        .single();

      // PGRST116: "Searched item was not found" - this is okay if settings row doesn't exist yet
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const rate = parseFloat(data.value);
        setInflationRate(isNaN(rate) ? 0 : rate * 100);
        setInitialInflationRate(isNaN(rate) ? 0 : rate * 100);
        // setSettingsId(data.id); // ID is not directly used for upsert logic by 'key'
      } else {
        setInflationRate(0);
        setInitialInflationRate(0);
        // setSettingsId(null);
        console.log('No global inflation rate setting found in DB. User can create one.');
        // showToast('No global inflation rate found. Please set one.', 'error'); // Optional: prompt user
      }
    } catch (error: unknown) {
      console.error('Error fetching inflation rate:', error);
      if (error instanceof Error) {
        showToast(`Error fetching inflation rate: ${error.message}`, 'error');
      } else {
        showToast('An unexpected error occurred while fetching inflation rate.', 'error');
      }
      setInflationRate(0);
      setInitialInflationRate(0);
      // setSettingsId(null);
    } finally {
      setLoadingInflation(false);
    }
  }, []);

  useEffect(() => {
    fetchInflationRate();
  }, [fetchInflationRate]);

  const handleInflationRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInflationRate(value);
  };

  const updateInflationRate = async () => {
    const rateValue = parseFloat(String(inflationRate));
    if (isNaN(rateValue) || rateValue < 0) {
      showToast('Inflation rate must be a non-negative number.', 'error');
      setInflationRate(initialInflationRate ?? 0);
      return;
    }

    setLoadingInflation(true);
    const valueToSave = (rateValue / 100).toString();
    console.log(`[SETTINGS_INFLATION_SAVE] Attempting to upsert inflation. Value to save (decimal string): ${valueToSave}`);

    try {
      const { data: upsertedData, error: upsertError } = await supabase
        .from('settings')
        .upsert({ key: 'inflation_rate', value: valueToSave }, { onConflict: 'key' })
        .select('id, value')
        .single();

      if (upsertError) {
        console.error('[SETTINGS_INFLATION_SAVE] Supabase error upserting inflation rate:', JSON.stringify(upsertError));
        throw upsertError;
      }

      console.log('[SETTINGS_INFLATION_SAVE] Supabase response from inflation upsert:', JSON.stringify(upsertedData));

      if (upsertedData) {
        // setSettingsId(upsertedData.id); // ID from upsert is available if needed, but not for this logic
        setInitialInflationRate(rateValue); // rateValue is already in percentage form for UI
        showToast('Inflation rate saved successfully!', 'success');
      } else {
        // This case should ideally not happen if .single() is used and RLS allows select,
        // or if the upsert itself failed (which would be caught by upsertError).
        // However, if it does, it means the upsert might have happened but data wasn't returned.
        console.warn('[SETTINGS_INFLATION_SAVE] Inflation rate upsert did not return data. Check RLS or if the key "inflation_rate" is valid.');
        showToast('Inflation rate operation processed (check DB).', 'success'); // Optimistic
        setInitialInflationRate(rateValue); // Optimistic update to UI
      }
    } catch (error: unknown) {
      console.error('[SETTINGS_INFLATION_SAVE] Error in updateInflationRate catch block:', error);
      if (error instanceof Error) {
        showToast(`Error saving inflation rate: ${error.message}`, 'error');
      } else {
        showToast('An unexpected error occurred while saving inflation rate.', 'error');
      }
      setInflationRate(initialInflationRate ?? 0);
    } finally {
      setLoadingInflation(false);
    }
  };




  // --- Asset Categories ---
  const fetchAssetCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      setAssetCategories(data || []);
    } catch (error: unknown) {
      console.error('Error fetching asset categories:', error);
      if (error instanceof Error) {
        showToast(`Error fetching asset categories: ${error.message}`, 'error');
      } else {
        showToast('An unexpected error occurred while fetching asset categories.', 'error');
      }
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchAssetCategories();
  }, [fetchAssetCategories]);

  const handleNewCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCategory(prev => ({ ...prev, [name]: value }));
  };

  const handleAddAssetCategory = async () => {
    const name = newCategory.name?.trim();
    const lifespanStr = String(newCategory.lifespan_years).trim();
    const costStr = String(newCategory.avg_replacement_cost).trim();

    if (!name || lifespanStr === '' || costStr === '') {
      showToast('All category fields are required.', 'error');
      return;
    }

    const lifespan_val = parseFloat(lifespanStr);
    const avg_replacement_cost_val = parseFloat(costStr);

    if (isNaN(lifespan_val) || lifespan_val <= 0 || isNaN(avg_replacement_cost_val) || avg_replacement_cost_val < 0) {
      showToast('Lifespan must be a positive number. Cost must be a non-negative number.', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('categories') // Corrected table name
        .insert([{
          name: name,
          lifespan: lifespan_val, // Map form's lifespan_years to DB 'lifespan'
          avg_replacement_cost: avg_replacement_cost_val,
        }])
        .select()
        .single();
      if (error) throw error;
      if (data) {
         const newCatData: AssetCategory = { // Ensure type consistency
            id: data.id,
            name: data.name,
            lifespan: data.lifespan,
            avg_replacement_cost: data.avg_replacement_cost
        };
        setAssetCategories([...assetCategories, newCatData]);
        setNewCategory({ name: '', lifespan_years: '', avg_replacement_cost: '' });
        showToast('Asset category added successfully!', 'success');
      }
    } catch (error: unknown) {
      console.error('Error adding asset category:', error);
      if (error instanceof Error) {
        showToast(`Error adding asset category: ${error.message}`, 'error');
      } else {
        showToast('An unexpected error occurred while adding asset category.', 'error');
      }
    }
  };

  const handleEditCategory = (category: AssetCategory) => {
    setEditingCategoryId(category.id);
    setEditingCategory({
      id: category.id,
      name: category.name,
      lifespan_years: String(category.lifespan), // Map DB 'lifespan' to form 'lifespan_years'
      avg_replacement_cost: String(category.avg_replacement_cost),
    });
  };

  const handleEditingCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingCategory(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveCategory = async (id: string) => {
    const name = editingCategory.name?.trim();
    const lifespanStr = String(editingCategory.lifespan_years).trim();
    const costStr = String(editingCategory.avg_replacement_cost).trim();

    if (!name || lifespanStr === '' || costStr === '') {
      showToast('All category fields are required.', 'error');
      return;
    }

    const lifespan_val = parseFloat(lifespanStr);
    const avg_replacement_cost_val = parseFloat(costStr);

    if (isNaN(lifespan_val) || lifespan_val <= 0 || isNaN(avg_replacement_cost_val) || avg_replacement_cost_val < 0) {
      showToast('Lifespan must be a positive number. Cost must be a non-negative number.', 'error');
      return;
    }

    try {
      const updateData = {
        name: name,
        lifespan: lifespan_val, // Map form's lifespan_years to DB 'lifespan'
        avg_replacement_cost: avg_replacement_cost_val,
      };
      console.log(`[SETTINGS_SAVE_CATEGORY] Attempting to update category ID: ${id} with data:`, JSON.stringify(updateData));
      const { data: updatedDataResult, error: updateError } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', id)
        .select();

      if (updateError) {
        console.error('[SETTINGS_SAVE_CATEGORY] Supabase error during category update:', JSON.stringify(updateError));
        showToast(`Error updating category: ${updateError.message}`, 'error');
        // Do not update local state if DB update failed
        return; // Stop further processing in this function
      }
      
      console.log('[SETTINGS_SAVE_CATEGORY] Supabase response from category update (data):', JSON.stringify(updatedDataResult));

      if (updatedDataResult && updatedDataResult.length > 0) {
        console.log('[SETTINGS_SAVE_CATEGORY] Update successful, returned data:', JSON.stringify(updatedDataResult[0]));
        // Update local state with the confirmed data from the database
        setAssetCategories(prevCategories =>
          prevCategories.map(cat =>
            cat.id === id ? { ...cat, ...updatedDataResult[0] } : cat
          )
        );
        showToast('Asset category updated successfully!', 'success');
      } else {
        console.warn('[SETTINGS_SAVE_CATEGORY] Category update did not return data. This could mean the ID was not found, or RLS prevented the update/select. No rows were updated in the database. Update object was:', JSON.stringify(updateData));
        showToast('Category not found or update prevented (possibly RLS). Data not saved to DB.', 'error');
        // Optionally, re-fetch categories to ensure UI consistency if concerned about optimistic updates
        // fetchAssetCategories();
      }
      
      setEditingCategoryId(null);
      setEditingCategory({});
    } catch (error: unknown) { // This catch block might not be reached if Supabase client doesn't throw for RLS "0 rows updated"
      console.error('[SETTINGS_SAVE_CATEGORY] Unexpected error in handleSaveCategory catch block:', error);
      if (error instanceof Error) {
        showToast(`Error updating asset category: ${error.message}`, 'error');
      } else {
        showToast('An unexpected error occurred while updating asset category.', 'error');
      }
    }
  };

  const handleDeleteAssetCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this asset category?')) {
      try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        setAssetCategories(assetCategories.filter(cat => cat.id !== id));
        showToast('Asset category deleted successfully!', 'success');
      } catch (error: unknown) {
        console.error('Error deleting asset category:', error);
        if (error instanceof Error) {
          showToast(`Error deleting asset category: ${error.message}`, 'error');
        } else {
          showToast('An unexpected error occurred while deleting asset category.', 'error');
        }
      }
    }
  };


  return (
    <div className="p-6 space-y-8 bg-white text-black min-h-screen"> {/* White bg, black text */}
      <h1 className="text-3xl font-bold text-black">Settings</h1> {/* Black text */}

      {/* Global Inflation Rate Section */}
      <section className="p-6 bg-white shadow-lg rounded-lg border border-[var(--border-blue)]"> {/* Blue border */}
        <h2 className="text-xl font-semibold text-black mb-4">Global Inflation Rate</h2> {/* Black text */}
        {loadingInflation ? (
          <p className="text-black">Loading inflation rate...</p>
        ) : (
          <div className="flex items-center space-x-3">
            <input
              type="number"
              value={inflationRate}
              onChange={handleInflationRateChange}
              min="0"
              step="0.01"
              className="mt-1 block w-40 px-3 py-2 text-black bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-blue)] focus:border-[var(--primary-blue)] sm:text-sm" /* Black text, blue focus */
              placeholder="e.g., 2.5"
            />
            <span className="text-black">%</span> {/* Black text */}
            <button
              onClick={updateInflationRate}
              disabled={loadingInflation || String(inflationRate) === String(initialInflationRate)}
              className="px-4 py-2 bg-[var(--primary-blue)] text-white rounded-md hover:bg-[var(--primary-blue-hover)] disabled:bg-gray-400" /* Blue button */
            >
              {loadingInflation ? 'Saving...' : 'Save Rate'}
            </button>
          </div>
        )}
        <p className="mt-2 text-sm text-gray-700"> {/* Lighter black text */}
          Set the global annual inflation rate. This will be used in forecasts.
        </p>
      </section>


      {/* Manage Asset Categories Section */}
      <section className="p-6 bg-white shadow-lg rounded-lg border border-[var(--border-blue)]"> {/* Blue border */}
        <h2 className="text-xl font-semibold text-black mb-4">Manage Asset Categories</h2> {/* Black text */}
        {/* Add New Category Form */}
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium text-black mb-2">Add New Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <input
              type="text"
              name="name"
              value={newCategory.name || ''}
              onChange={handleNewCategoryChange}
              placeholder="Category Name"
              className="mt-1 block w-full px-3 py-2 text-black bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-blue)] focus:border-[var(--primary-blue)] sm:text-sm"
            />
            <input
              type="number"
              name="lifespan_years"
              value={newCategory.lifespan_years || ''}
              onChange={handleNewCategoryChange}
              placeholder="Lifespan (Years)"
              min="0"
              className="mt-1 block w-full px-3 py-2 text-black bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-blue)] focus:border-[var(--primary-blue)] sm:text-sm"
            />
            <input
              type="number"
              name="avg_replacement_cost"
              value={newCategory.avg_replacement_cost || ''}
              onChange={handleNewCategoryChange}
              placeholder="Avg. Replacement Cost ($)"
              min="0"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 text-black bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-blue)] focus:border-[var(--primary-blue)] sm:text-sm"
            />
            <button
              onClick={handleAddAssetCategory}
              className="px-4 py-2 bg-[var(--primary-blue)] text-white rounded-md hover:bg-[var(--primary-blue-hover)]"
            >
              Add Category
            </button>
          </div>
        </div>

        {/* Categories List/Table */}
        {loadingCategories ? <p className="text-black">Loading asset categories...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 border border-gray-300"> {/* Adjusted border color */}
              <thead className="bg-gray-100"> {/* Lighter gray for table head */}
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Lifespan (Yrs)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Avg. Cost ($)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assetCategories.map((category) => (
                  <tr key={category.id}>
                    {editingCategoryId === category.id ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="text" name="name" value={editingCategory.name || ''} onChange={handleEditingCategoryChange} className="w-full px-2 py-1 text-black bg-white border border-gray-300 rounded-md focus:ring-[var(--primary-blue)] focus:border-[var(--primary-blue)]"/>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="number" name="lifespan_years" value={editingCategory.lifespan_years || ''} onChange={handleEditingCategoryChange} min="0" className="w-full px-2 py-1 text-black bg-white border border-gray-300 rounded-md focus:ring-[var(--primary-blue)] focus:border-[var(--primary-blue)]"/>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="number" name="avg_replacement_cost" value={editingCategory.avg_replacement_cost || ''} onChange={handleEditingCategoryChange} min="0" step="0.01" className="w-full px-2 py-1 text-black bg-white border border-gray-300 rounded-md focus:ring-[var(--primary-blue)] focus:border-[var(--primary-blue)]"/>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button onClick={() => handleSaveCategory(category.id)} className="text-green-600 hover:text-green-800">Save</button>
                          <button onClick={() => setEditingCategoryId(null)} className="text-gray-600 hover:text-gray-800">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{category.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{category.lifespan ?? 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{category.avg_replacement_cost?.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) ?? 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button onClick={() => handleEditCategory(category)} className="text-yellow-600 hover:text-yellow-800">Edit</button>
                          <button onClick={() => handleDeleteAssetCategory(category.id)} className="text-red-600 hover:text-red-800">Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {assetCategories.length === 0 && !loadingCategories && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No asset categories found. Add one above.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default SettingsPage;
