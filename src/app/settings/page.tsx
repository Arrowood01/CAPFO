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

interface Community {
  id: string; // Assuming UUID or similar from Supabase
  name: string;
  // user_id: string; // If communities are user-specific
}

interface AssetCategory {
  id: string; // Assuming UUID or similar
  name: string;
  lifespan: number; // Matches DB
  avg_replacement_cost: number; // Matches DB (after you add it)
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
  const [settingsId, setSettingsId] = useState<string | null>(null); // DB ID is UUID (string)
  const [loadingInflation, setLoadingInflation] = useState(true);

  const [communities, setCommunities] = useState<Community[]>([]);
  const [editingCommunityId, setEditingCommunityId] = useState<string | null>(null);
  const [editingCommunityName, setEditingCommunityName] = useState('');
  const [newCommunityName, setNewCommunityName] = useState('');
  const [loadingCommunities, setLoadingCommunities] = useState(true);

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
        setSettingsId(data.id);
      } else {
        setInflationRate(0);
        setInitialInflationRate(0);
        setSettingsId(null);
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
      setSettingsId(null);
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
    try {
      if (settingsId) { // If ID exists, update
        const { error: updateError } = await supabase
          .from('settings')
          .update({ value: (rateValue / 100).toString() }) // Update the 'value' column
          .eq('id', settingsId);
        if (updateError) throw updateError;
        setInitialInflationRate(rateValue);
        showToast('Inflation rate updated successfully!', 'success');
      } else { // No ID, so try to insert
        const { data: insertData, error: insertError } = await supabase
          .from('settings')
          .insert({ key: 'inflation_rate', value: (rateValue / 100).toString() }) // Insert key and value
          .select('id')
          .single();
        if (insertError) throw insertError;
        if (insertData) {
          setSettingsId(insertData.id);
          setInitialInflationRate(rateValue);
          showToast('Inflation rate created successfully!', 'success');
        }
      }
    } catch (error: unknown) {
      console.error('Error saving inflation rate:', error);
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


  // --- Communities ---
  const fetchCommunities = useCallback(async () => {
    setLoadingCommunities(true);
    try {
      const { data, error } = await supabase.from('communities').select('*').order('name');
      if (error) throw error;
      setCommunities(data || []);
    } catch (error: unknown) {
      console.error('Error fetching communities:', error);
      if (error instanceof Error) {
        showToast(`Error fetching communities: ${error.message}`, 'error');
      } else {
        showToast('An unexpected error occurred while fetching communities.', 'error');
      }
    } finally {
      setLoadingCommunities(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const handleAddCommunity = async () => {
    if (!newCommunityName.trim()) {
      showToast('Community name cannot be empty.', 'error');
      return;
    }
    const sessionData = await supabase.auth.getSession();
    console.log('Current user session for add community:', sessionData);
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user for add community:', user);
    try {
      const { data, error } = await supabase
        .from('communities')
        .insert([{ name: newCommunityName.trim() }])
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setCommunities([...communities, data]);
        setNewCommunityName('');
        showToast('Community added successfully!', 'success');
      }
    } catch (error: unknown) {
      console.error('Error adding community:', error);
      if (error instanceof Error) {
        showToast(`Error adding community: ${error.message}`, 'error');
      } else {
        showToast('An unexpected error occurred while adding community.', 'error');
      }
    }
  };

  const handleEditCommunity = (community: Community) => {
    setEditingCommunityId(community.id);
    setEditingCommunityName(community.name);
  };

  const handleSaveCommunityName = async (id: string) => {
    if (!editingCommunityName.trim()) {
      showToast('Community name cannot be empty.', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('communities')
        .update({ name: editingCommunityName.trim() })
        .eq('id', id);
      if (error) throw error;
      setCommunities(communities.map(c => c.id === id ? { ...c, name: editingCommunityName.trim() } : c));
      setEditingCommunityId(null);
      showToast('Community updated successfully!', 'success');
    } catch (error: unknown) {
      console.error('Error updating community:', error);
      if (error instanceof Error) {
        showToast(`Error updating community: ${error.message}`, 'error');
      } else {
        showToast('An unexpected error occurred while updating community.', 'error');
      }
    }
  };

  const handleDeleteCommunity = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this community?')) {
      try {
        const { error } = await supabase.from('communities').delete().eq('id', id);
        if (error) throw error;
        setCommunities(communities.filter(c => c.id !== id));
        showToast('Community deleted successfully!', 'success');
      } catch (error: unknown) {
        console.error('Error deleting community:', error);
        if (error instanceof Error) {
          showToast(`Error deleting community: ${error.message}`, 'error');
        } else {
          showToast('An unexpected error occurred while deleting community.', 'error');
        }
      }
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
      const { error } = await supabase
        .from('categories') // Corrected table name
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
      setAssetCategories(assetCategories.map(cat => cat.id === id ? { ...cat, ...updateData, id: cat.id } : cat));
      setEditingCategoryId(null);
      setEditingCategory({});
      showToast('Asset category updated successfully!', 'success');
    } catch (error: unknown) {
      console.error('Error updating asset category:', error);
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
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">Settings</h1>

      {/* Global Inflation Rate Section */}
      <section className="p-6 bg-white shadow-lg rounded-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Global Inflation Rate</h2>
        {loadingInflation ? (
          <p>Loading inflation rate...</p>
        ) : (
          <div className="flex items-center space-x-3">
            <input
              type="number"
              value={inflationRate}
              onChange={handleInflationRateChange}
              min="0"
              step="0.01"
              className="mt-1 block w-40 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., 2.5"
            />
            <span className="text-gray-600">%</span>
            <button
              onClick={updateInflationRate}
              disabled={loadingInflation || String(inflationRate) === String(initialInflationRate)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300"
            >
              {loadingInflation ? 'Saving...' : 'Save Rate'}
            </button>
          </div>
        )}
        <p className="mt-2 text-sm text-gray-500">
          Set the global annual inflation rate. This will be used in forecasts.
        </p>
      </section>

      {/* Manage Communities Section */}
      <section className="p-6 bg-white shadow-lg rounded-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Manage Communities</h2>
        <div className="mb-4 flex space-x-2">
          <input
            type="text"
            value={newCommunityName}
            onChange={(e) => setNewCommunityName(e.target.value)}
            placeholder="New community name"
            className="flex-grow mt-1 block px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <button
            onClick={handleAddCommunity}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add Community
          </button>
        </div>
        {loadingCommunities ? <p>Loading communities...</p> : (
          <ul className="space-y-2">
            {communities.map((community) => (
              <li key={community.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-md">
                {editingCommunityId === community.id ? (
                  <input
                    type="text"
                    value={editingCommunityName}
                    onChange={(e) => setEditingCommunityName(e.target.value)}
                    onBlur={() => handleSaveCommunityName(community.id)}
                    autoFocus
                    className="flex-grow mr-2 px-2 py-1 border border-gray-300 rounded-md"
                  />
                ) : (
                  <span className="text-gray-800">{community.name}</span>
                )}
                <div className="space-x-2">
                  {editingCommunityId === community.id ? (
                    <button onClick={() => handleSaveCommunityName(community.id)} className="text-sm text-green-600 hover:text-green-800">Save</button>
                  ) : (
                    <button onClick={() => handleEditCommunity(community)} className="text-sm text-indigo-600 hover:text-indigo-800">Edit</button>
                  )}
                  <button onClick={() => handleDeleteCommunity(community.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                </div>
              </li>
            ))}
            {communities.length === 0 && !loadingCommunities && <p className="text-gray-500">No communities found. Add one above.</p>}
          </ul>
        )}
      </section>

      {/* Manage Asset Categories Section */}
      <section className="p-6 bg-white shadow-lg rounded-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Manage Asset Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 border border-gray-200 rounded-md">
          <input
            type="text"
            name="name"
            value={newCategory.name || ''}
            onChange={handleNewCategoryChange}
            placeholder="Category Name"
            className="md:col-span-2 mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <input
            type="number"
            name="lifespan_years" // Corresponds to AssetCategoryFormState
            value={newCategory.lifespan_years || ''}
            onChange={handleNewCategoryChange}
            placeholder="Lifespan (Years)"
            min="0"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <input
            type="number"
            name="avg_replacement_cost"
            value={newCategory.avg_replacement_cost || ''}
            onChange={handleNewCategoryChange}
            placeholder="Avg. Replacement Cost"
            min="0"
            step="0.01"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <button
            onClick={handleAddAssetCategory}
            className="md:col-span-4 mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 w-full"
          >
            Add Category
          </button>
        </div>

        {loadingCategories ? <p>Loading categories...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lifespan (Years)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Replacement Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assetCategories.map((category) => (
                  <tr key={category.id}>
                    {editingCategoryId === category.id ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="text" name="name" value={editingCategory.name || ''} onChange={handleEditingCategoryChange} className="w-full px-2 py-1 border border-gray-300 rounded-md"/>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="number" name="lifespan_years" value={editingCategory.lifespan_years || ''} onChange={handleEditingCategoryChange} min="0" className="w-full px-2 py-1 border border-gray-300 rounded-md"/>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="number" name="avg_replacement_cost" value={editingCategory.avg_replacement_cost || ''} onChange={handleEditingCategoryChange} min="0" step="0.01" className="w-full px-2 py-1 border border-gray-300 rounded-md"/>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button onClick={() => handleSaveCategory(category.id)} className="text-green-600 hover:text-green-800">Save</button>
                          <button onClick={() => setEditingCategoryId(null)} className="text-gray-600 hover:text-gray-800">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{category.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{category.lifespan}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${category.avg_replacement_cost.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button onClick={() => handleEditCategory(category)} className="text-indigo-600 hover:text-indigo-800">Edit</button>
                          <button onClick={() => handleDeleteAssetCategory(category.id)} className="text-red-600 hover:text-red-800">Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {assetCategories.length === 0 && !loadingCategories && <p className="text-center py-4 text-gray-500">No asset categories found. Add one above.</p>}
          </div>
        )}
      </section>
    </div>
  );
};

export default SettingsPage;
