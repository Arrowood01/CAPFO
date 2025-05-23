'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Doughnut, Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'; // Removed unused ChartOptions
import Papa from 'papaparse';
import {
  generateForecast,
  calculatePerUnitCost,
  type Asset as ForecastingAsset,
  type ForecastedReplacement,
  // type CommunitySpecificSettings // This was removed from forecastingUtils as params are direct
} from '@/lib/forecastingUtils';

// Re-define CommunitySpecificSettings here if needed for state, or use a more generic Record type
interface CommunitySpecificSettingsInDashboard {
  inflation_rate?: number;
  investment_rate?: number;
  forecast_years?: number;
  annual_deposit?: number;
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// Color Palette
const CHART_COLORS = {
  primary: '#5A3FFF',
  tints: ['#7C6BFF', '#9D94FF', '#BEBEFF', '#DFDFFF'],
};

// Dashboard's representation of an asset (after fetching)
interface DashboardAsset {
  id: string;
  unit_number?: string;
  install_date?: string;
  description?: string; // For asset name
  purchase_price?: number;
  categories?: { id: string; name: string; lifespan: number | null; avg_replacement_cost: number | null };
  communities?: { id: string; name: string };
}

interface ForecastedAsset extends DashboardAsset { // Extended with forecast-specific fields
  replacement_year: number;
  projected_cost: number;
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

// Define a type for Chart.js data structure
interface ChartJsData {
  labels: string[];
  datasets: Array<{
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

const DashboardPage: React.FC = () => {
  const [forecastRange, setForecastRange] = useState<number>(5);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [globalInflationRate, setGlobalInflationRate] = useState<number>(0.02); // Renamed for clarity
  const [allCommunitySettings, setAllCommunitySettings] = useState<Record<string, CommunitySpecificSettingsInDashboard>>({});
  // Add default values for other new global settings if they are intended to be configurable globally
  const [defaultGlobalInvestmentRate, setDefaultGlobalInvestmentRate] = useState<number>(0.005); // Example default
  const [defaultGlobalAnnualDeposit, setDefaultGlobalAnnualDeposit] = useState<number>(0); // Example default

  const [forecastedAssets, setForecastedAssets] = useState<ForecastedAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State for displaying active forecast settings
  const [activeInflationRate, setActiveInflationRate] = useState<number>(globalInflationRate);
  const [activeInvestmentRate, setActiveInvestmentRate] = useState<number>(defaultGlobalInvestmentRate);
  const [activeForecastYears, setActiveForecastYears] = useState<number>(forecastRange);
  const [activeAnnualDeposit, setActiveAnnualDeposit] = useState<number>(defaultGlobalAnnualDeposit);


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
        if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116: no row found, ok
          console.error('Error fetching global inflation rate:', settingsError);
          // Keep default globalInflationRate
        } else if (settingsData) {
          setGlobalInflationRate(parseFloat(settingsData.value) || 0.02);
        } else {
          console.warn('Global inflation rate not found in settings, using default.');
          // Keep default globalInflationRate
        }

       // Fetch all community settings
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
           };
         });
         setAllCommunitySettings(settingsMap);
       }
       // Potentially fetch global investment_rate and annual_deposit if they are stored in 'settings' table
       // For now, using local defaults: defaultGlobalInvestmentRate, defaultGlobalAnnualDeposit
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
        // Condition to prevent running forecast if no filters are selected initially or explicitly cleared
        // setForecastedAssets([]); // Optionally clear assets or show a message
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
        ? supabaseAssetsData.filter((item: { id?: string; error?: unknown; [key: string]: any }) => item && !item.error && item.id)
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

      // Determine community settings for the *first* selected community if multiple are selected.
      // Or, decide on a strategy for multiple selections (e.g., average, or run forecast per community).
      // For now, let's assume if multiple communities are selected, we use global/defaults,
      // or if only one is selected, we use its specific settings.
      let effectiveCommunitySettings: CommunitySpecificSettingsInDashboard | undefined = undefined;
      if (selectedCommunities.length === 1) {
        effectiveCommunitySettings = allCommunitySettings[selectedCommunities[0]];
      }
      
      // Prepare variables for the new generateForecast call structure
      const inflation = effectiveCommunitySettings?.inflation_rate ?? globalInflationRate;
      const investmentRate = effectiveCommunitySettings?.investment_rate ?? defaultGlobalInvestmentRate;
      const forecastYears = effectiveCommunitySettings?.forecast_years ?? forecastRange;
      const annualDeposit = effectiveCommunitySettings?.annual_deposit ?? defaultGlobalAnnualDeposit;

      // Update active settings for display
      setActiveInflationRate(inflation);
      setActiveInvestmentRate(investmentRate);
      setActiveForecastYears(forecastYears);
      setActiveAnnualDeposit(annualDeposit);

      const rawForecastResults: ForecastedReplacement[] = generateForecast({
        assets: assetsForForecast, // Now passing the assets
        inflationRate: inflation,
        investmentRate,
        forecastYears,
        annualDeposit,
      });

      const finalForecastedAssets: ForecastedAsset[] = rawForecastResults.map(fr => {
        const originalDashboardAsset = assetsData.find((a: DashboardAsset) => a.id === fr.asset.id);
        if (!originalDashboardAsset) {
          return {
            id: fr.asset.id,
            description: fr.asset.name,
            purchase_price: fr.asset.purchase_price,
            install_date: fr.asset.install_date,
            categories: { name: fr.category, id: 'unknown', lifespan: fr.asset.category.lifespan, avg_replacement_cost: fr.asset.category.avg_replacement_cost },
            communities: { name: fr.community, id: 'unknown' },
            replacement_year: fr.year,
            projected_cost: fr.cost,
          } as ForecastedAsset;
        }
        return {
          ...originalDashboardAsset,
          replacement_year: fr.year,
          projected_cost: fr.cost,
        };
      });
      setForecastedAssets(finalForecastedAssets);
    } catch (err) {
      console.error("Error running forecast:", err);
      setError('Failed to run forecast.');
      setForecastedAssets([]);
    } finally {
      setLoading(false);
    }
  }, [forecastRange, selectedCommunities, selectedCategory, globalInflationRate, allCommunitySettings]);

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
         setGlobalInflationRate(0.02); // Fallback if not found
      }

     // Re-fetch all community settings on manual refresh
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
         };
       });
       setAllCommunitySettings(settingsMap);
     }
     // Also re-fetch global investment/annual deposit if they become configurable

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

  const barChartLabels = forecastedAssets.reduce((acc: string[], asset: ForecastedAsset) => {
    if (!acc.includes(asset.replacement_year.toString())) {
      acc.push(asset.replacement_year.toString());
    }
    return acc;
  }, [] as string[]).sort();

  const barChartBackgroundColors = barChartLabels.map((_: string, index: number) => CHART_COLORS.tints[index % CHART_COLORS.tints.length]);

  const barChartData: ChartJsData = {
    labels: barChartLabels,
    datasets: [
      {
        label: 'Total Forecasted Cost',
        data: [], 
        backgroundColor: barChartBackgroundColors,
      },
    ],
  };
  if (barChartData.datasets.length > 0) {
    barChartData.datasets[0].data = barChartLabels.map((year: string) =>
      forecastedAssets
        .filter((asset: ForecastedAsset) => asset.replacement_year.toString() === year)
        .reduce((sum: number, asset: ForecastedAsset) => sum + asset.projected_cost, 0)
    );
  }

  const pieChartLabels = allCategories
    .filter((cat: Category) => forecastedAssets.some((asset: ForecastedAsset) => asset.categories?.id === cat.id))
    .map((cat: Category) => cat.name);

  const pieChartBackgroundColors = pieChartLabels.map((_: string, index: number) => CHART_COLORS.tints[index % CHART_COLORS.tints.length]);

  const pieChartData: ChartJsData = {
    labels: pieChartLabels,
    datasets: [
      {
        data: [], 
        backgroundColor: pieChartBackgroundColors,
      },
    ],
  };
  if (pieChartData.datasets.length > 0) {
    pieChartData.datasets[0].data = pieChartLabels
      .map((label: string) => {
        const category = allCategories.find((cat: Category) => cat.name === label);
        if (!category) return 0;
        return forecastedAssets
          .filter((asset: ForecastedAsset) => asset.categories?.id === category.id)
          .reduce((sum: number, asset: ForecastedAsset) => sum + asset.projected_cost, 0);
      }
    );
  }

  const [costPerUnitChartData, setCostPerUnitChartData] = useState<ChartJsData>({ labels: [], datasets: [] });

  useEffect(() => {
    if (forecastedAssets.length > 0 && allCommunities.length > 0) {
      const perUnitCosts: { communityName: string; costPerUnit: number }[] = allCommunities
        .map((community: Community) => {
          if ((community.unit_count ?? 0) > 0) {
            const communityAssets = forecastedAssets.filter(
              (asset: ForecastedAsset) => asset.communities?.id === community.id || asset.communities?.name === community.name
            );
            const totalCommunityForecastCost = communityAssets.reduce(
              (sum: number, asset: ForecastedAsset) => sum + asset.projected_cost,
              0
            );
            const costPerUnit = calculatePerUnitCost(totalCommunityForecastCost, community.unit_count!);
            return { communityName: community.name, costPerUnit };
          }
          return null;
        })
        .filter(item => item !== null) as { communityName: string; costPerUnit: number }[];

      perUnitCosts.sort((a, b) => b.costPerUnit - a.costPerUnit);

      setCostPerUnitChartData({
        labels: perUnitCosts.map(item => item.communityName),
        datasets: [
          {
            label: 'Cost Per Unit ($)',
            data: perUnitCosts.map(item => item.costPerUnit),
            backgroundColor: CHART_COLORS.primary,
            borderColor: CHART_COLORS.primary,
            borderWidth: 1,
          },
        ],
      });
    } else {
      setCostPerUnitChartData({ labels: [], datasets: [] });
    }
  }, [forecastedAssets, allCommunities]);

  const doughnutChartPlugins = [{
    id: 'doughnutText',
    beforeDraw(chart: ChartJS) {
      const {width, height, ctx} = chart;
      ctx.save(); 
      const fontSize = (height / 160).toFixed(2);
      ctx.font = `var(--font-inter), ${fontSize}em sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';

      let total = 0;
      if (chart.data.datasets.length > 0 && chart.data.datasets[0].data) {
        const datasetData = chart.data.datasets[0].data;
        const numericData = Array.isArray(datasetData) 
          ? datasetData.filter((value: unknown): value is number => typeof value === 'number' && isFinite(value)) 
          : [];

        if (numericData.length > 0) {
          total = numericData.reduce((a: number, b: number) => a + b, 0);
        }
      }
      
      const text = `$${total.toLocaleString()}`;
      const textX = Math.round((width - ctx.measureText(text).width) / 2);
      const textY = height / 2;

      const titleText = "Total Sales"; 
      const titleFontSize = (height / 200).toFixed(2);
      ctx.font = `bold ${titleFontSize}em var(--font-inter), bold ${titleFontSize}em sans-serif`;
      const titleX = Math.round((width - ctx.measureText(titleText).width) / 2);
      const titleY = height / 2 - parseFloat(fontSize) * 16; 

      const subtitleText = "Accumulated Earnings"; 
      const subtitleFontSize = (height / 260).toFixed(2);
      ctx.font = `${subtitleFontSize}em var(--font-inter), ${subtitleFontSize}em sans-serif`;
      const subtitleX = Math.round((width - ctx.measureText(subtitleText).width) / 2);
      const subtitleY = height / 2 + parseFloat(fontSize) * 13; 
      
      ctx.fillText(titleText, titleX, titleY);
      ctx.fillText(text, textX, textY);
      ctx.fillText(subtitleText, subtitleX, subtitleY);
      ctx.restore(); 
    }
  }];

  const pieChartPlugins = [{
    id: 'pieText',
    beforeDraw(chart: ChartJS) { 
      const {width, height, ctx} = chart;
      ctx.save(); 
      const fontSize = (height / 160).toFixed(2);
      ctx.font = `var(--font-inter), ${fontSize}em sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';

      let total = 0;
      if (chart.data.datasets.length > 0 && chart.data.datasets[0].data) {
        const datasetData = chart.data.datasets[0].data;
        const numericData = Array.isArray(datasetData) 
          ? datasetData.filter((value: unknown): value is number => typeof value === 'number' && isFinite(value)) 
          : [];

        if (numericData.length > 0) {
          total = numericData.reduce((a: number, b: number) => a + b, 0);
        }
      }
      
      const text = `$${total.toLocaleString()}`;
      const textX = Math.round((width - ctx.measureText(text).width) / 2);
      const textY = height / 2;

      const titleText = "Total Net Worth"; 
      const titleFontSize = (height / 200).toFixed(2);
      ctx.font = `bold ${titleFontSize}em var(--font-inter), bold ${titleFontSize}em sans-serif`;
      const titleX = Math.round((width - ctx.measureText(titleText).width) / 2);
      const titleY = height / 2 - parseFloat(fontSize) * 16; 

      const subtitleText = "Accumulated Net Worth"; 
      const subtitleFontSize = (height / 260).toFixed(2);
      ctx.font = `${subtitleFontSize}em var(--font-inter), ${subtitleFontSize}em sans-serif`;
      const subtitleX = Math.round((width - ctx.measureText(subtitleText).width) / 2);
      const subtitleY = height / 2 + parseFloat(fontSize) * 13; 
      
      ctx.fillText(titleText, titleX, titleY);
      ctx.fillText(text, textX, textY);
      ctx.fillText(subtitleText, subtitleX, subtitleY);
      ctx.restore(); 
    }
  }];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Capital Asset Forecast</h1>

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
                  className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                    ${forecastRange === year ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
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
          <div className="p-6 border rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-2 text-center">Total Sales</h2>
            <Doughnut 
              data={barChartData} 
              options={{ 
                responsive: true, 
                cutout: '70%', 
                plugins: { 
                  legend: { display: true, position: 'top' as const }, 
                  title: { display: false }, 
                  tooltip: { enabled: true } 
                } 
              }} 
              plugins={doughnutChartPlugins} 
            />
          </div>
          <div className="p-6 border rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-2 text-center">Total Net Worth</h2>
            <Pie 
              data={pieChartData} 
              options={{ 
                responsive: true, 
                plugins: { 
                  legend: { display: true, position: 'top' as const }, 
                  title: { display: false }, 
                  tooltip: { enabled: true } 
                } 
              }}
              plugins={pieChartPlugins} 
            />
          </div>
          {costPerUnitChartData.labels && costPerUnitChartData.labels.length > 0 && (
            <div className="p-6 border rounded-xl shadow-lg lg:col-span-2">
              <h2 className="text-xl font-semibold mb-2">Cost Per Unit by Community</h2>
              <Bar 
                data={costPerUnitChartData} 
                options={{ 
                  responsive: true, 
                  indexAxis: 'y' as const, 
                  plugins: { 
                    legend: { display: false }, 
                    title: { display: true, text: 'Cost Per Unit by Community' } 
                  }, 
                  scales: { 
                    x: { beginAtZero: true, grid: { display: false } }, 
                    y: { grid: { display: true } } 
                  } 
                }} 
              />
            </div>
          )}
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
            <button
              onClick={handleExportToCSV}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              Export to CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Community</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Replacement Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projected Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {forecastedAssets.map(asset => (
                  <tr key={asset.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.unit_number || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.communities?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.categories?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.replacement_year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${asset.projected_cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;