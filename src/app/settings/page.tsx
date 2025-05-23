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
  unit_count?: number | null; // Number of units in the community
  // user_id: string; // If communities are user-specific
}

interface AssetCategory {
  id: string; // Assuming UUID or similar
  name: string;
  lifespan: number | null; // Matches DB, can be null
  avg_replacement_cost: number | null; // Matches DB, can be null
  // user_id: string; // If categories are user-specific
}

type CommunitySettings = {
  community_id: string;
  annual_deposit: number;
  monthly_per_unit: number;
  investment_rate: number;
  inflation_rate: number;
  forecast_years: number;
  target_yeb: number;
  alert_threshold_percent: number;
};

// Type for managing form state for community forecast settings, allowing strings for number inputs
type CommunitySettingsFormState = {
  community_id?: string;
  annual_deposit?: string | number;
  monthly_per_unit?: string | number;
  investment_rate?: string | number;
  inflation_rate?: string | number;
  forecast_years?: string | number;
  target_yeb?: string | number;
  alert_threshold_percent?: string | number;
};
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

  const [communities, setCommunities] = useState<Community[]>([]);
  const [editingCommunityId, setEditingCommunityId] = useState<string | null>(null);
  // State for editing a community, now an object
  const [editingCommunityData, setEditingCommunityData] = useState<{ name: string; unit_count: string | number | null }>({ name: '', unit_count: '' });
  // State for a new community, now an object
  const [newCommunityData, setNewCommunityData] = useState<{ name: string; unit_count: string | number }>({ name: '', unit_count: '' });
  const [loadingCommunities, setLoadingCommunities] = useState(true);

  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<AssetCategoryFormState>({});
  const [newCategory, setNewCategory] = useState<AssetCategoryFormState>({ name: '', lifespan_years: '', avg_replacement_cost: '' });
  const [loadingCategories, setLoadingCategories] = useState(true);

  // --- Community Forecast Settings ---
  const [allCommunitySettings, setAllCommunitySettings] = useState<Record<string, CommunitySettingsFormState>>({}); // Changed to CommunitySettingsFormState for direct form binding
  // const [editingCommunitySettingsId, setEditingCommunitySettingsId] = useState<string | null>(null); // No longer needed
  // const [editingCommunitySettingsData, setEditingCommunitySettingsData] = useState<CommunitySettingsFormState>({}); // No longer needed
  const [loadingCommunitySettings, setLoadingCommunitySettings] = useState(false); // Used for initial load and individual saves


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


  // --- Communities ---
  const fetchCommunities = useCallback(async () => {
    setLoadingCommunities(true);
    try {
      // Fetch unit_count along with other community data
      const { data, error } = await supabase.from('communities').select('id, name, unit_count').order('name');
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

  useEffect(() => {
    const fetchAllCommunitySettings = async () => {
      setLoadingCommunitySettings(true); // Use the existing loading state or a new one
      try {
        const { data, error } = await supabase.from('community_settings').select('*');
        if (error) {
          console.error('Error fetching all community settings:', error);
          showToast(`Error fetching all community settings: ${error.message}`, 'error');
          return;
        }

        const settingsByCommunity: Record<string, CommunitySettings> = {};
        if (data) {
          for (const row of data) {
            settingsByCommunity[row.community_id] = row;
          }
        }
        setAllCommunitySettings(settingsByCommunity);
      } catch (e) {
        // Redundant catch if supabase client handles it, but good for other errors
        console.error('Unexpected error fetching all community settings:', e);
        if (e instanceof Error) {
          showToast(`Unexpected error: ${e.message}`, 'error');
        } else {
          showToast('An unexpected error occurred.', 'error');
        }
      } finally {
        setLoadingCommunitySettings(false);
      }
    };

    fetchAllCommunitySettings();
  }, []); // Empty dependency array to run once on mount

  const handleAddCommunity = async () => {
    const name = newCommunityData.name.trim();
    const unitCountStr = String(newCommunityData.unit_count).trim();

    if (!name) {
      showToast('Community name cannot be empty.', 'error');
      return;
    }

    let unit_count: number | null = null;
    if (unitCountStr !== '') {
      const parsedUnits = parseInt(unitCountStr, 10);
      if (isNaN(parsedUnits) || parsedUnits < 0) {
        showToast('Number of units must be a non-negative integer.', 'error');
        return;
      }
      unit_count = parsedUnits;
    }

    // const sessionData = await supabase.auth.getSession(); // Not strictly needed for this operation if RLS handles auth
    // console.log('Current user session for add community:', sessionData);
    // const { data: { user } } = await supabase.auth.getUser(); // Not strictly needed
    // console.log('Current user for add community:', user);

    try {
      const communityPayload: { name: string; unit_count?: number | null } = { name };
      if (unit_count !== null) {
        communityPayload.unit_count = unit_count;
      }

      const { data, error } = await supabase
        .from('communities')
        .insert([communityPayload])
        .select('id, name, unit_count') // Ensure unit_count is selected back
        .single();

      if (error) throw error;
      if (data) {
        setCommunities([...communities, data]);
        setNewCommunityData({ name: '', unit_count: '' }); // Reset form
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
    setEditingCommunityData({ name: community.name, unit_count: community.unit_count ?? '' });
  };

  // Renamed from handleSaveCommunityName to handleSaveCommunity
  const handleSaveCommunity = async (id: string) => {
    const name = editingCommunityData.name.trim();
    const unitCountStr = String(editingCommunityData.unit_count).trim();

    if (!name) {
      showToast('Community name cannot be empty.', 'error');
      return;
    }

    let unit_count: number | null = null;
    if (unitCountStr !== '') {
      const parsedUnits = parseInt(unitCountStr, 10);
      if (isNaN(parsedUnits) || parsedUnits < 0) {
        showToast('Number of units must be a non-negative integer.', 'error');
        return;
      }
      unit_count = parsedUnits;
    }
    
    try {
      const communityPayload: { name: string; unit_count?: number | null } = { name };
      // Only include unit_count in the payload if it's explicitly set or changed to null
      // If unitCountStr is empty, it means user wants to set it to null (if field was previously populated)
      // or keep it null (if field was already null/empty)
      if (unitCountStr === '' || unit_count !== null) {
         communityPayload.unit_count = unit_count;
      }


      const { data: updatedCommunity, error } = await supabase
        .from('communities')
        .update(communityPayload)
        .eq('id', id)
        .select('id, name, unit_count') // Select back the updated data
        .single();

      if (error) throw error;

      if (updatedCommunity) {
        setCommunities(communities.map(c => c.id === id ? updatedCommunity : c));
        setEditingCommunityId(null);
        setEditingCommunityData({ name: '', unit_count: '' }); // Reset edit form
        showToast('Community updated successfully!', 'success');
      } else {
        showToast('Failed to get updated community data.', 'error');
      }
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

  // --- Community Forecast Settings ---
  // fetchCommunitySettings (for single community) is no longer strictly needed if all are loaded initially,
  // but can be kept for targeted re-fetching if desired. For now, we rely on the initial bulk load.
  // const fetchCommunitySettings = useCallback(async (communityId: string) => { ... });

  // handleEditCommunitySettings is no longer needed as editing is inline.
  // const handleEditCommunitySettings = (communityId: string) => { ... };

  // handleCommunitySettingsChange is replaced by direct updates in the JSX.

  const handleSaveCommunitySettings = async (communityId: string) => {
    const settings = allCommunitySettings[communityId];
    if (!settings) {
      showToast('Settings not found for this community.', 'error');
      return;
    }

    // Validate and parse numbers from form state (string | number) to number for DB
    const parseAndValidate = (value: string | number | undefined, fieldName: string, isRate: boolean = false): number | undefined => {
      if (value === undefined || value === null || String(value).trim() === '') {
        showToast(`${fieldName} is required.`, 'error');
        return undefined;
      }
      const num = parseFloat(String(value));
      if (isNaN(num)) {
        showToast(`${fieldName} must be a valid number.`, 'error');
        return undefined;
      }
      // Add more specific validations if needed (e.g., non-negative)
      if (num < 0 && !fieldName.toLowerCase().includes('rate') && fieldName !== 'Target YEB' && fieldName !== 'Annual Deposit') { // Allow negative for specific fields if necessary
         // For example, target_yeb could potentially be negative if it's a deficit target
         // showToast(`${fieldName} must be non-negative.`, 'error');
         // return undefined;
      }
      return isRate ? num / 100 : num;
    };

    const validatedSettings: Partial<CommunitySettings> = { community_id: communityId };
    let validationOk = true;

    const fields: Array<{ key: keyof CommunitySettingsFormState, dbKey: keyof CommunitySettings, name: string, isRate?: boolean }> = [
      { key: 'annual_deposit', dbKey: 'annual_deposit', name: 'Annual Deposit' },
      { key: 'monthly_per_unit', dbKey: 'monthly_per_unit', name: 'Monthly Per Unit Contribution' },
      { key: 'investment_rate', dbKey: 'investment_rate', name: 'Investment Rate (%)', isRate: true },
      { key: 'inflation_rate', dbKey: 'inflation_rate', name: 'Inflation Rate (%)', isRate: true },
      { key: 'forecast_years', dbKey: 'forecast_years', name: 'Forecast Years' },
      { key: 'target_yeb', dbKey: 'target_yeb', name: 'Target YEB' },
      { key: 'alert_threshold_percent', dbKey: 'alert_threshold_percent', name: 'Alert Threshold Percent (%)', isRate: true },
    ];

    for (const field of fields) {
      const parsedValue = parseAndValidate(settings[field.key], field.name, field.isRate);
      if (parsedValue === undefined) {
        validationOk = false;
        break;
      }
      (validatedSettings as Record<keyof CommunitySettings, unknown>)[field.dbKey] = parsedValue;
    }

    if (!validationOk) {
      showToast('Please correct the input values.', 'error');
      return;
    }
    
    setLoadingCommunitySettings(true);
    try {
      const { error } = await supabase
        .from('community_settings')
        .upsert(validatedSettings as CommunitySettings, { onConflict: 'community_id' }); // Cast to CommunitySettings

      if (error) {
        console.error('Error saving community settings:', error);
        showToast(`Failed to save settings: ${error.message}`, 'error');
      } else {
        showToast('Settings saved successfully!', 'success');
        // Update the allCommunitySettings state with the (potentially) parsed values if needed,
        // or re-fetch to ensure consistency. For now, assume form values are fine.
        // If Supabase returned the saved object, it would be ideal to update the state with that.
        // Example: setAllCommunitySettings(prev => ({...prev, [communityId]: {...prev[communityId], ...validatedSettings}}));
        // However, validatedSettings are numbers, form might expect strings for rates.
        // So, it's often better to re-fetch or trust the form's direct binding for display.
      }
    } catch (e: unknown) {
      console.error('Unexpected error saving community settings:', e);
      if (e instanceof Error) {
        showToast(`An unexpected error occurred: ${e.message}`, 'error');
      } else {
        showToast('An unexpected error occurred while saving settings.', 'error');
      }
    } finally {
      setLoadingCommunitySettings(false);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {/* Global Inflation Rate Section */}
      <section className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Global Inflation Rate</h2>
        {loadingInflation ? (
          <p>Loading inflation rate...</p>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="inflationRateInput" className="text-sm font-medium sr-only">Inflation Rate</label>
              <input
                id="inflationRateInput"
                type="number"
                value={inflationRate}
                onChange={handleInflationRateChange}
                min="0"
                step="0.01"
                className="p-2 rounded border border-gray-300 w-40"
                placeholder="e.g., 2.5"
              />
            </div>
            <span>%</span>
            <button
              onClick={updateInflationRate}
              disabled={loadingInflation || String(inflationRate) === String(initialInflationRate)}
              className="bg-primary text-white font-medium py-2 px-4 rounded hover:bg-primary-dark transition disabled:bg-gray-400"
            >
              {loadingInflation ? 'Saving...' : 'Save Rate'}
            </button>
          </div>
        )}
        <p className="mt-2 text-sm text-gray-700">
          Set the global annual inflation rate. This will be used in forecasts.
        </p>
      </section>

      {/* Manage Communities Section */}
      <section className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Manage Communities</h2>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="flex flex-col gap-2">
            <label htmlFor="newCommunityName" className="text-sm font-medium">New Community Name</label>
            <input
              id="newCommunityName"
              type="text"
              value={newCommunityData.name}
              onChange={(e) => setNewCommunityData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Community name"
              className="p-2 rounded border border-gray-300"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="newCommunityUnits" className="text-sm font-medium">Number of Units (Optional)</label>
            <input
              id="newCommunityUnits"
              type="number"
              value={newCommunityData.unit_count}
              onChange={(e) => setNewCommunityData(prev => ({ ...prev, unit_count: e.target.value === '' ? '' : parseInt(e.target.value, 10) }))}
              placeholder="Units"
              min="0"
              className="p-2 rounded border border-gray-300"
            />
          </div>
          <button
            onClick={handleAddCommunity}
            className="bg-primary text-white font-medium py-2 px-4 rounded hover:bg-primary-dark transition md:col-span-1 self-end"
          >
            Add Community
          </button>
        </div>
        {loadingCommunities ? <p>Loading communities...</p> : (
          <ul className="space-y-2">
            {communities.map((community) => (
              <li key={community.id} className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                {editingCommunityId === community.id ? (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2">
                      <label htmlFor={`editCommName-${community.id}`} className="text-sm font-medium">Community Name</label>
                      <input
                        id={`editCommName-${community.id}`}
                        type="text"
                        value={editingCommunityData.name}
                        onChange={(e) => setEditingCommunityData(prev => ({ ...prev, name: e.target.value }))}
                        className="p-2 rounded border border-gray-300 w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label htmlFor={`editCommUnits-${community.id}`} className="text-sm font-medium">Number of Units (Optional)</label>
                      <input
                        id={`editCommUnits-${community.id}`}
                        type="number"
                        value={editingCommunityData.unit_count ?? ''}
                        onChange={(e) => setEditingCommunityData(prev => ({ ...prev, unit_count: e.target.value === '' ? null : parseInt(e.target.value, 10) }))}
                        placeholder="Units"
                        min="0"
                        className="p-2 rounded border border-gray-300 w-full"
                      />
                    </div>
                    <div className="flex space-x-2 justify-end">
                      <button onClick={() => handleSaveCommunity(community.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition">Save Name/Units</button>
                      <button onClick={() => setEditingCommunityId(null)} className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300 transition">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{community.name}</span>
                      {community.unit_count !== null && community.unit_count !== undefined && (
                        <span className="text-sm text-gray-600 ml-2">({community.unit_count} units)</span>
                      )}
                    </div>
                    <div className="space-x-2">
                      <button onClick={() => handleEditCommunity(community)} className="bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600 transition">Edit Name/Units</button>
                      <button onClick={() => handleDeleteCommunity(community.id)} className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition">Delete</button>
                    </div>
                  </div>
                )}

                <details className="mt-2 p-3 bg-white border rounded-md">
                  <summary className="font-semibold text-gray-700 cursor-pointer">Forecast Settings</summary>
                  {['annual_deposit', 'monthly_per_unit', 'investment_rate', 'inflation_rate', 'forecast_years', 'target_yeb', 'alert_threshold_percent'].map((key) => (
                    <div key={key} className="flex flex-col gap-2 mt-2">
                      <label htmlFor={`commSetting-${community.id}-${key}`} className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</label>
                      <input
                        id={`commSetting-${community.id}-${key}`}
                        type="number"
                        name={key}
                        value={(allCommunitySettings[community.id]?.[key as keyof CommunitySettingsFormState] as string | number) ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAllCommunitySettings((prev) => ({
                            ...prev,
                            [community.id]: {
                              ...prev[community.id],
                              community_id: community.id,
                              [key]: value === '' ? '' : parseFloat(value),
                            } as CommunitySettingsFormState,
                          }));
                        }}
                        className="p-2 rounded border border-gray-300 w-full"
                        step="0.01"
                        placeholder={key.includes('rate') || key.includes('percent') ? 'e.g., 5 for 5%' : 'Enter value'}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => handleSaveCommunitySettings(community.id)}
                    disabled={loadingCommunitySettings}
                    className="bg-primary text-white font-medium py-2 px-4 rounded hover:bg-primary-dark transition mt-4 disabled:bg-gray-400"
                  >
                    {loadingCommunitySettings ? 'Saving...' : 'Save Forecast Settings'}
                  </button>
                </details>
              </li>
            ))}
            {communities.length === 0 && !loadingCommunities && <p className="text-gray-700">No communities found. Add one above.</p>}
          </ul>
        )}
      </section>

      {/* Manage Asset Categories Section */}
      <section className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Manage Asset Categories</h2>
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Add New Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label htmlFor="newCatName" className="text-sm font-medium">Category Name</label>
              <input
                id="newCatName"
                type="text"
                name="name"
                value={newCategory.name || ''}
                onChange={handleNewCategoryChange}
                placeholder="Category Name"
                className="p-2 rounded border border-gray-300"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="newCatLifespan" className="text-sm font-medium">Lifespan (Years)</label>
              <input
                id="newCatLifespan"
                type="number"
                name="lifespan_years"
                value={newCategory.lifespan_years || ''}
                onChange={handleNewCategoryChange}
                placeholder="Lifespan (Years)"
                min="0"
                className="p-2 rounded border border-gray-300"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="newCatCost" className="text-sm font-medium">Avg. Replacement Cost ($)</label>
              <input
                id="newCatCost"
                type="number"
                name="avg_replacement_cost"
                value={newCategory.avg_replacement_cost || ''}
                onChange={handleNewCategoryChange}
                placeholder="Avg. Replacement Cost ($)"
                min="0"
                step="0.01"
                className="p-2 rounded border border-gray-300"
              />
            </div>
            <button
              onClick={handleAddAssetCategory}
              className="bg-primary text-white font-medium py-2 px-4 rounded hover:bg-primary-dark transition self-end"
            >
              Add Category
            </button>
          </div>
        </div>

        {loadingCategories ? <p>Loading asset categories...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Lifespan (Yrs)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Avg. Cost ($)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {assetCategories.map((category, idx) => (
                  <tr key={category.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    {editingCategoryId === category.id ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="text" name="name" value={editingCategory.name || ''} onChange={handleEditingCategoryChange} className="p-2 rounded border border-gray-300 w-full"/>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="number" name="lifespan_years" value={editingCategory.lifespan_years || ''} onChange={handleEditingCategoryChange} min="0" className="p-2 rounded border border-gray-300 w-full"/>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="number" name="avg_replacement_cost" value={editingCategory.avg_replacement_cost || ''} onChange={handleEditingCategoryChange} min="0" step="0.01" className="p-2 rounded border border-gray-300 w-full"/>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button onClick={() => handleSaveCategory(category.id)} className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition">Save</button>
                          <button onClick={() => setEditingCategoryId(null)} className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300 transition">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{category.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{category.lifespan ?? 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{category.avg_replacement_cost?.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) ?? 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button onClick={() => handleEditCategory(category)} className="bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600 transition">Edit</button>
                          <button onClick={() => handleDeleteAssetCategory(category.id)} className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition">Delete</button>
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
