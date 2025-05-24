'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Papa from 'papaparse';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie as RechartsPie, Cell
} from 'recharts'; // Renamed Pie to RechartsPie, removed LabelList
import {
  generateForecast,
  calculatePerUnitCost,
  type Asset as ForecastingAsset,
  type ForecastResult,
} from '@/lib/forecastingUtils';

interface CommunitySpecificSettingsInDashboard {
  inflation_rate?: number;
  investment_rate?: number;
  forecast_years?: number;
  annual_deposit?: number;
  initial_reserve_balance?: number;
  target_reserve_balance?: number;
}

// Color Palette for Recharts (can be adapted or new ones defined)
const RECHARTS_COLORS = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6c757d'];

interface DashboardAsset {
  id: string;
  unit_number?: string;
  install_date?: string;
  description?: string;
  purchase_price?: number;
  categories?: { id: string; name: string; lifespan: number | null; avg_replacement_cost: number | null };
  communities?: { id: string; name: string };
}

interface ForecastedAsset extends DashboardAsset {
  replacement_year: number;
  projected_cost: number;
  isOverdue?: boolean;
  lifespan?: number | null;
}

interface Community {
  id: string;
  name: string;
  unit_count?: number | null;
}

interface Category {
  id: string;
  name: string;
  lifespan: number;
}

const DashboardPage: React.FC = () => {
  const [forecastRange, setForecastRange] = useState<number>(5);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [globalInflationRate, setGlobalInflationRate] = useState<number>(0.02);
  const [allCommunitySettings, setAllCommunitySettings] = useState<Record<string, CommunitySpecificSettingsInDashboard>>({});
  const [defaultGlobalInvestmentRate] = useState<number>(0.005);
  const [defaultGlobalAnnualDeposit] = useState<number>(0);

  const [forecastedAssets, setForecastedAssets] = useState<ForecastedAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [forecastAnalysisDetails, setForecastAnalysisDetails] = useState<ForecastResult | null>(null);
  const [overdueAssetsCount, setOverdueAssetsCount] = useState<number>(0);
  const [isYebBelowTarget, setIsYebBelowTarget] = useState<boolean>(false);
  const [isUnderfunded, setIsUnderfunded] = useState<boolean>(false);
  const [suggestedMonthlyDepositPerUnit, setSuggestedMonthlyDepositPerUnit] = useState<number>(0);

  const [activeInflationRate, setActiveInflationRate] = useState<number>(globalInflationRate);
  const [activeInvestmentRate, setActiveInvestmentRate] = useState<number>(defaultGlobalInvestmentRate);
  const [activeForecastYears, setActiveForecastYears] = useState<number>(forecastRange);
  const [activeAnnualDeposit, setActiveAnnualDeposit] = useState<number>(defaultGlobalAnnualDeposit);
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: communitiesData, error: communitiesError } = await supabase
          .from('communities')
          .select('id, name, unit_count');
        if (communitiesError) throw communitiesError;
        setAllCommunities(communitiesData || []);

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name, lifespan');
        if (categoriesError) throw categoriesError;
        setAllCategories(categoriesData || []);

        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'inflation_rate')
          .single();
        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error('Error fetching global inflation rate:', settingsError);
        } else if (settingsData) {
          setGlobalInflationRate(parseFloat(settingsData.value) || 0.02);
        } else {
          console.warn('Global inflation rate not found in settings, using default.');
        }

       const { data: communitySettingsData, error: communitySettingsError } = await supabase
         .from('community_settings')
         .select('*');
       if (communitySettingsError) {
         console.error('Error fetching community settings:', communitySettingsError);
       } else if (communitySettingsData) {
         const settingsMap: Record<string, CommunitySpecificSettingsInDashboard> = {};
         communitySettingsData.forEach(s => {
           settingsMap[s.community_id] = {
             inflation_rate: s.inflation_rate,
             investment_rate: s.investment_rate,
             forecast_years: s.forecast_years,
             annual_deposit: s.annual_deposit,
             initial_reserve_balance: s.initial_reserve_balance,
             target_reserve_balance: s.target_reserve_balance,
           };
         });
         setAllCommunitySettings(settingsMap);
       }
     } catch (err) {
        console.error("Error fetching initial data:", err);
        setError('Failed to load initial filter data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const runForecast = useCallback(async () => {
    if (!selectedCommunities.length && !selectedCategory && selectedCommunities.length === 0 && selectedCategory === null) {
        // return;
    }
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('assets')
        .select(`
          id,
          unit_number,
          install_date,
          description,
          purchase_price,
          categories (id, name, lifespan, avg_replacement_cost),
          communities (id, name)
        `);

      if (selectedCommunities.length > 0) {
        query = query.in('community_id', selectedCommunities);
      }
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      const { data: supabaseAssetsData, error: assetsError } = await query;
      if (assetsError) throw assetsError;

      if (!supabaseAssetsData || supabaseAssetsData.length === 0) {
        setForecastedAssets([]);
        setError("No assets found matching your criteria.");
        setLoading(false);
        return;
      }
      
      const validAssetsData = Array.isArray(supabaseAssetsData)
        ? supabaseAssetsData.filter((item: { id?: string; error?: unknown; [key: string]: unknown }) => item && !item.error && item.id)
        : [];

      if (validAssetsData.length === 0 && supabaseAssetsData && supabaseAssetsData.length > 0) {
        console.warn("Supabase returned data, but it was malformed or contained only errors:", supabaseAssetsData);
        setError("Received malformed data from the server.");
        setForecastedAssets([]);
        setLoading(false);
        return;
      }
      
      const assetsData = validAssetsData as unknown as DashboardAsset[];
 
      const assetsForForecast: ForecastingAsset[] = assetsData.map((asset: DashboardAsset) => ({
        id: asset.id,
        name: asset.description || 'N/A',
        install_date: asset.install_date || new Date().toISOString(),
        purchase_price: asset.purchase_price || 0,
        category: {
          name: asset.categories?.name || 'Unknown Category',
          lifespan: asset.categories?.lifespan ?? 10,
          avg_replacement_cost: asset.categories?.avg_replacement_cost ?? 0,
        },
        community: asset.communities?.name || 'Unknown Community',
      }));

      let effectiveCommunitySettings: CommunitySpecificSettingsInDashboard | undefined = undefined;
      if (selectedCommunities.length === 1) {
        effectiveCommunitySettings = allCommunitySettings[selectedCommunities[0]];
      }
      
      const inflation = effectiveCommunitySettings?.inflation_rate ?? globalInflationRate;
      const investmentRate = effectiveCommunitySettings?.investment_rate ?? defaultGlobalInvestmentRate;
      const forecastYears = effectiveCommunitySettings?.forecast_years ?? forecastRange;
      const annualDeposit = effectiveCommunitySettings?.annual_deposit ?? defaultGlobalAnnualDeposit;
      const initialReserveBalance = effectiveCommunitySettings?.initial_reserve_balance ?? 0;
      const targetYEB = effectiveCommunitySettings?.target_reserve_balance ?? 0;

      setActiveInflationRate(inflation);
      setActiveInvestmentRate(investmentRate);
      setActiveForecastYears(forecastYears);
      setActiveAnnualDeposit(annualDeposit);

      const forecastResult: ForecastResult = generateForecast({
        assets: assetsForForecast,
        inflationRate: inflation,
        investmentRate,
        forecastYears,
        annualDeposit,
        initialReserveBalance,
      });

      setForecastAnalysisDetails(forecastResult);

      const finalForecastedAssets: ForecastedAsset[] = forecastResult.forecastedReplacements.map(fr => {
        const originalAssetDetails = assetsData.find((a: DashboardAsset) => a.id === fr.asset.id);
        const detailedAsset = forecastResult.detailedAssets.find(da => da.id === fr.asset.id);
        return {
          id: fr.asset.id,
          unit_number: originalAssetDetails?.unit_number,
          install_date: fr.asset.install_date,
          description: fr.asset.name,
          purchase_price: fr.asset.purchase_price,
          categories: originalAssetDetails?.categories,
          communities: originalAssetDetails?.communities,
          replacement_year: fr.year,
          projected_cost: fr.cost,
          isOverdue: detailedAsset?.isOverdue,
          lifespan: originalAssetDetails?.categories?.lifespan,
        };
      });
      setForecastedAssets(finalForecastedAssets);

      setOverdueAssetsCount(forecastResult.detailedAssets.filter(a => a.isOverdue).length);
      setIsYebBelowTarget(forecastResult.finalReserveBalance < targetYEB);
      setIsUnderfunded(forecastResult.totalDepositsInForecastPeriod < forecastResult.totalExpensesInForecastPeriod);

      let totalUnitsInSelection = 0;
      if (selectedCommunities.length > 0) {
        totalUnitsInSelection = selectedCommunities.reduce((acc, communityId) => {
          const community = allCommunities.find(c => c.id === communityId);
          return acc + (community?.unit_count || 0);
        }, 0);
      } else {
        totalUnitsInSelection = allCommunities.reduce((acc, community) => acc + (community.unit_count || 0), 0);
      }

      if (forecastResult.totalExpensesInForecastPeriod > 0 && activeForecastYears > 0 && totalUnitsInSelection > 0) {
        const suggestedDeposit = (forecastResult.totalExpensesInForecastPeriod / activeForecastYears / totalUnitsInSelection / 12);
        setSuggestedMonthlyDepositPerUnit(suggestedDeposit);
      } else {
        setSuggestedMonthlyDepositPerUnit(0);
      }

    } catch (err) {
      console.error("Error running forecast:", err);
      setError('Failed to run forecast.');
      setForecastedAssets([]);
      setForecastAnalysisDetails(null);
      setSuggestedMonthlyDepositPerUnit(0);
    } finally {
      setLoading(false);
    }
  }, [
    forecastRange, selectedCommunities, selectedCategory, globalInflationRate, allCommunitySettings,
    defaultGlobalInvestmentRate, defaultGlobalAnnualDeposit, activeForecastYears, allCommunities // Added missing dependencies
  ]);

  useEffect(() => {
    runForecast();
  }, [runForecast]);

  const handleRefreshForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'inflation_rate')
        .single();
      if (settingsError && settingsError.code !== 'PGRST116') {
        console.warn('Error re-fetching inflation rate, using current value.');
      } else if (settingsData) {
        setGlobalInflationRate(parseFloat(settingsData.value) || 0.02);
      } else {
         setGlobalInflationRate(0.02);
      }

     const { data: communitySettingsData, error: csError } = await supabase
       .from('community_settings')
       .select('*');
     if (csError) {
       console.error('Error re-fetching community settings:', csError);
     } else if (communitySettingsData) {
       const settingsMap: Record<string, CommunitySpecificSettingsInDashboard> = {};
       communitySettingsData.forEach(s => {
         settingsMap[s.community_id] = {
           inflation_rate: s.inflation_rate,
           investment_rate: s.investment_rate,
           forecast_years: s.forecast_years,
           annual_deposit: s.annual_deposit,
           initial_reserve_balance: s.initial_reserve_balance,
           target_reserve_balance: s.target_reserve_balance,
         };
       });
       setAllCommunitySettings(settingsMap);
     }

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, lifespan');
      if (categoriesError) {
          console.warn('Error re-fetching categories.');
      } else {
          setAllCategories(categoriesData || []);
      }
      
      await runForecast();
    } catch (err) {
      console.error("Error during manual refresh:", err);
      setError('Failed to refresh forecast data.');
    } finally {
      setLoading(false);
    }
  }, [runForecast]);


  const handleExportToCSV = () => {
    const csvData = forecastedAssets.map(asset => ({
      'Unit #': asset.unit_number || 'N/A',
      'Community': asset.communities?.name || 'N/A',
      'Category': asset.categories?.name || 'N/A',
      'Replacement Year': asset.replacement_year,
      'Projected Cost': asset.projected_cost.toFixed(2),
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'forecasted_assets.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // --- Recharts Data Transformation Functions ---

  // 1. Forecasted Costs by Year
  const getRechartsForecastByYearData = () => {
    if (!forecastedAssets || forecastedAssets.length === 0) return [];
    const costsByYear: Record<string, number> = forecastedAssets.reduce((acc, asset) => {
      const year = asset.replacement_year.toString();
      acc[year] = (acc[year] || 0) + asset.projected_cost;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(costsByYear)
      .map(([year, totalCost]) => ({
        name: year, // 'name' is conventional for Recharts XAxis dataKey
        totalCost,
      }))
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));
  };

  // 2. Cost by Category - Pie Chart
  const getRechartsPieData = () => {
    if (!forecastedAssets || forecastedAssets.length === 0 || !allCategories || allCategories.length === 0) return [];
    
    const costsByCategory: Record<string, number> = forecastedAssets.reduce((acc, asset) => {
      const categoryName = asset.categories?.name || 'Unknown Category';
      acc[categoryName] = (acc[categoryName] || 0) + asset.projected_cost;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(costsByCategory)
      .map(([name, value]) => ({
        name,
        value, // 'value' is conventional for Recharts Pie dataKey
      }))
      .filter(item => item.value > 0) // Only include categories with costs
      .sort((a, b) => b.value - a.value); // Optional: sort by value
  };

  // 3. Cost Per Unit by Community - Horizontal Bar Chart
  const getRechartsCostPerUnitData = () => {
    if (!forecastedAssets || forecastedAssets.length === 0 || !allCommunities || allCommunities.length === 0) return [];

    const perUnitCosts = allCommunities
      .map((community: Community) => {
        if ((community.unit_count ?? 0) > 0) {
          const communityAssets = forecastedAssets.filter(
            (asset: ForecastedAsset) => asset.communities?.id === community.id || asset.communities?.name === community.name // Match by ID or name
          );
          const totalCommunityForecastCost = communityAssets.reduce(
            (sum: number, asset: ForecastedAsset) => sum + asset.projected_cost,
            0
          );
          const costPerUnit = calculatePerUnitCost(totalCommunityForecastCost, community.unit_count!);
          return { name: community.name, costPerUnit }; // 'name' for Recharts YAxis dataKey
        }
        return null;
      })
      .filter(item => item !== null && typeof item.costPerUnit === 'number' && item.costPerUnit > 0) as { name: string; costPerUnit: number }[];
    
    return perUnitCosts.sort((a, b) => b.costPerUnit - a.costPerUnit);
  };

  // Placeholder for Recharts data transformation
  // Example:
  // const getRechartsBarData = () => {
  //   return forecastedAssets.reduce((acc, asset) => {
  //     const year = asset.replacement_year.toString();
  //     const existingYear = acc.find(item => item.name === year);
  //     if (existingYear) {
  //       existingYear.cost += asset.projected_cost;
  //     } else {
  //       acc.push({ name: year, cost: asset.projected_cost });
  //     }
  //     return acc;
  //   }, [] as { name: string; cost: number }[]).sort((a,b) => parseInt(a.name) - parseInt(b.name));
  // };

  // const getRechartsPieData = () => {
  //   const dataByCategory = forecastedAssets.reduce((acc, asset) => {
  //     const categoryName = asset.categories?.name || 'Unknown';
  //     acc[categoryName] = (acc[categoryName] || 0) + asset.projected_cost;
  //     return acc;
  //   }, {} as Record<string, number>);
  //   return Object.entries(dataByCategory).map(([name, value]) => ({ name, value }));
  // };
  
  // const getRechartsCostPerUnitData = () => {
  //    if (forecastedAssets.length > 0 && allCommunities.length > 0) {
  //     const perUnitCosts = allCommunities
  //       .map((community: Community) => {
  //         if ((community.unit_count ?? 0) > 0) {
  //           const communityAssets = forecastedAssets.filter(
  //             (asset: ForecastedAsset) => asset.communities?.id === community.id || asset.communities?.name === community.name
  //           );
  //           const totalCommunityForecastCost = communityAssets.reduce(
  //             (sum: number, asset: ForecastedAsset) => sum + asset.projected_cost,
  //             0
  //           );
  //           const costPerUnit = calculatePerUnitCost(totalCommunityForecastCost, community.unit_count!);
  //           return { name: community.name, costPerUnit }; // 'name' for Recharts dataKey
  //         }
  //         return null;
  //       })
  //       .filter(item => item !== null) as { name: string; costPerUnit: number }[];
  //     return perUnitCosts.sort((a, b) => b.costPerUnit - a.costPerUnit);
  //   }
  //   return [];
  // };

  const rechartsForecastByYearData = getRechartsForecastByYearData();
  const rechartsPieData = getRechartsPieData();
  const rechartsCostPerUnitData = getRechartsCostPerUnitData();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Capital Asset Forecast</h1>

      {/* Forecast Health Check Section */}
      {forecastAnalysisDetails && !loading && (
        <div className="mb-6 p-6 border rounded-xl shadow-lg bg-white">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">Forecast Health Check</h2>
          {(overdueAssetsCount > 0 || isYebBelowTarget || isUnderfunded) ? (
            <ul className="list-disc pl-5 space-y-1">
              {overdueAssetsCount > 0 && (
                <li className="text-sm text-red-600">
                  <span className="font-semibold">{overdueAssetsCount}</span> asset(s) are beyond their expected lifespan.
                </li>
              )}
              {isYebBelowTarget && (
                <li className="text-sm text-yellow-600">
                  Projected Year-End Reserve Balance (
                  <span className="font-semibold">${forecastAnalysisDetails?.finalReserveBalance.toLocaleString()}</span>
                  ) may fall below the target.
                </li>
              )}
              {isUnderfunded && (
                <li className="text-sm text-yellow-600">
                  Annual deposits (Total: <span className="font-semibold">${forecastAnalysisDetails?.totalDepositsInForecastPeriod.toLocaleString()}</span>)
                  may be insufficient to match future expenses (Total: <span className="font-semibold">${forecastAnalysisDetails?.totalExpensesInForecastPeriod.toLocaleString()}</span>)
                  over the forecast period.
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-green-600">Forecast health looks good based on current parameters!</p>
          )}
        </div>
      )}

      {/* Suggested Monthly Deposit Section */}
      {forecastAnalysisDetails && !loading && suggestedMonthlyDepositPerUnit > 0 && (
        <div className="p-4 bg-white rounded-md shadow-md mt-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Suggested Monthly Deposit</h2>
          <p className="text-sm text-gray-600">
            Based on your current forecast, we suggest a per-unit monthly deposit of:
          </p>
          <p className="text-2xl font-bold text-green-700 mt-2">
            ${suggestedMonthlyDepositPerUnit.toFixed(2)} / unit
          </p>
        </div>
      )}

      {/* Filters Section */}
      <div className="mb-6 p-6 border rounded-xl shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Range</label>
            <div className="flex space-x-2">
              {[1, 5, 10, 15].map((year) => (
                <button
                  key={year}
                  onClick={() => setForecastRange(year)}
                  className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${forecastRange === year ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
                >
                  {year} Year{year > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

{/* Active Settings Display */}
        <div className="p-4 bg-slate-800 rounded-xl shadow-lg mb-6 border border-indigo-700">
          <p className="text-md font-semibold text-indigo-300 mb-2">Active Forecast Settings:</p>
          <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
            <li>Inflation Rate: <span className="font-medium text-indigo-400">{(activeInflationRate * 100).toFixed(2)}%</span></li>
            <li>Investment Rate: <span className="font-medium text-indigo-400">{(activeInvestmentRate * 100).toFixed(2)}%</span></li>
            <li>Forecast Range: <span className="font-medium text-indigo-400">{activeForecastYears} years</span></li>
            <li>Annual Deposit: <span className="font-medium text-indigo-400">${activeAnnualDeposit.toLocaleString()}</span></li>
          </ul>
        </div>
        <div>
          <label htmlFor="community" className="block text-sm font-medium text-gray-700">Community</label>
          <select
            id="community"
            multiple
            value={selectedCommunities}
            onChange={(e) => setSelectedCommunities(Array.from(e.target.selectedOptions, option => option.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md h-24"
          >
            {allCommunities.map(comm => <option key={comm.id} value={comm.id}>{comm.name}</option>)}
          </select>
          <p className="text-xs text-gray-500">Hold Ctrl/Cmd to select multiple.</p>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
          <select
            id="category"
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">All Categories</option>
            {allCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status (Optional)</label>
          <select
            id="status"
            value={selectedStatus || ''}
            onChange={(e) => setSelectedStatus(e.target.value || null)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">Any Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
          <button
            onClick={handleRefreshForecast}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-300"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Forecast'}
          </button>
        </div>
      </div>


      {loading && (
        <div className="flex justify-center items-center my-8">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="ml-4 text-lg">Loading forecast data...</p>
        </div>
      )}
      {error && <p className="text-red-500 bg-red-100 p-3 rounded mb-4">{error}</p>}

      {!loading && !error && forecastedAssets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Forecasted Costs by Year - Bar Chart */}
          <div className="p-6 border rounded-xl shadow-lg bg-white">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Forecasted Costs by Year</h2>
            {rechartsForecastByYearData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rechartsForecastByYearData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Total Cost"]} />
                  <Legend wrapperStyle={{ fontSize: "14px" }} />
                  <Bar dataKey="totalCost" name="Total Cost" fill={RECHARTS_COLORS[0]}>
                    {rechartsForecastByYearData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RECHARTS_COLORS[index % RECHARTS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500">No data available for this chart.</p>
            )}
          </div>

          {/* Cost by Category - Pie Chart */}
          <div className="p-6 border rounded-xl shadow-lg bg-white">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Cost by Category</h2>
            {rechartsPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <RechartsPie
                    data={rechartsPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {rechartsPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RECHARTS_COLORS[index % RECHARTS_COLORS.length]} />
                    ))}
                  </RechartsPie>
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Cost"]} />
                  <Legend wrapperStyle={{ fontSize: "14px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500">No data available for this chart.</p>
            )}
          </div>

          {/* Cost Per Unit by Community - Horizontal Bar Chart */}
          <div className="p-6 border rounded-xl shadow-lg bg-white lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Cost Per Unit by Community</h2>
            {rechartsCostPerUnitData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300 + rechartsCostPerUnitData.length * 20}>
                {/* Ensure BarChart is the single direct child */}
                <BarChart
                  data={rechartsCostPerUnitData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis type="number" tickFormatter={(value) => `$${value.toLocaleString()}`} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Cost Per Unit"]} />
                  <Legend wrapperStyle={{ fontSize: "14px" }} />
                  <Bar dataKey="costPerUnit" name="Cost Per Unit" fill={RECHARTS_COLORS[2]}>
                    {rechartsCostPerUnitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RECHARTS_COLORS[index % RECHARTS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500">No data available for this chart.</p>
            )}
          </div>
        </div>
      )}
      {!loading && !error && forecastedAssets.length === 0 && (selectedCategory || selectedCommunities.length > 0) && (
         <p className="text-center text-gray-600 my-8">No assets found for the selected criteria. Try adjusting your filters.</p>
      )}
       {!loading && !error && forecastedAssets.length === 0 && !selectedCategory && selectedCommunities.length === 0 && (
         <p className="text-center text-gray-600 my-8">Please select filters to view the forecast.</p>
      )}


      {/* Table Section */}
      {!loading && forecastedAssets.length > 0 && (
        <div className="p-4 border rounded shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Forecasted Assets</h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showAtRiskOnly}
                  onChange={() => setShowAtRiskOnly(!showAtRiskOnly)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                Show At-Risk Only
              </label>
              <button
                onClick={handleExportToCSV}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
              >
                Export to CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Community</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lifespan (Yrs)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Replacement Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projected Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {forecastedAssets
                  .filter(asset => {
                    if (!showAtRiskOnly) return true;
                    if (asset.lifespan && asset.install_date) {
                      const installYear = new Date(asset.install_date).getFullYear();
                      const currentYear = new Date().getFullYear();
                      if (asset.lifespan > 0) { // Avoid division by zero
                        const lifeUsed = (currentYear - installYear) / asset.lifespan;
                        return lifeUsed >= 0.75;
                      }
                    }
                    return false; // Default to not showing if data is insufficient for calculation
                  })
                  .map(asset => {
                    let lifeUsed = -1; // Default to a value indicating data not available or not applicable
                    if (asset.lifespan && asset.install_date) {
                      const installYear = new Date(asset.install_date).getFullYear();
                      const currentYear = new Date().getFullYear();
                      if (asset.lifespan > 0) {
                         lifeUsed = (currentYear - installYear) / asset.lifespan;
                      }
                    }

                    const rowClass = lifeUsed >= 1 ? "bg-red-100" : lifeUsed >= 0.75 ? "bg-yellow-100" : "";

                    return (
                      <tr key={asset.id} className={rowClass}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.unit_number || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.communities?.name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.categories?.name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.lifespan ?? 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {lifeUsed >= 1 && <span className="text-xs text-red-700 bg-red-200 px-2 py-1 rounded-full">Overdue</span>}
                          {lifeUsed >= 0.75 && lifeUsed < 1 && <span className="text-xs text-yellow-700 bg-yellow-200 px-2 py-1 rounded-full">Warning</span>}
                          {lifeUsed < 0.75 && lifeUsed >= 0 && <span className="text-xs text-green-700 bg-green-200 px-2 py-1 rounded-full">OK</span>}
                          {lifeUsed < 0 && <span className="text-xs text-gray-500">N/A</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.replacement_year}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${asset.projected_cost.toFixed(2)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;