'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Doughnut, Pie, Bar } from 'react-chartjs-2';
import StatCard from '@/components/StatCard'; // Import StatCard
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'; // Removed unused ChartOptions
import Papa from 'papaparse';
import {
  generateForecast,
  calculatePerUnitCost,
  type Asset as ForecastingAsset,
  type ForecastResult, // Added
  // type CommunitySpecificSettings // This was removed from forecastingUtils as params are direct
} from '@/lib/forecastingUtils';

// Re-define CommunitySpecificSettings here if needed for state, or use a more generic Record type
interface CommunitySpecificSettingsInDashboard {
  inflation_rate?: number;
  investment_rate?: number;
  forecast_years?: number;
  annual_deposit?: number;
  initial_reserve_balance?: number; // Added for health check
  target_reserve_balance?: number; // Added for health check
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
  const [defaultGlobalInvestmentRate] = useState<number>(0.005); // Example default
  const [defaultGlobalAnnualDeposit] = useState<number>(0); // Example default

  const [forecastedAssets, setForecastedAssets] = useState<ForecastedAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State for Forecast Health Check
  const [forecastAnalysisDetails, setForecastAnalysisDetails] = useState<ForecastResult | null>(null);
  const [overdueAssetsCount, setOverdueAssetsCount] = useState<number>(0);
  const [isYebBelowTarget, setIsYebBelowTarget] = useState<boolean>(false);
  const [isUnderfunded, setIsUnderfunded] = useState<boolean>(false);
  const [suggestedMonthlyDepositPerUnit, setSuggestedMonthlyDepositPerUnit] = useState<number>(0);


  // State for displaying active forecast settings
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
             initial_reserve_balance: s.initial_reserve_balance,
             target_reserve_balance: s.target_reserve_balance,
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
      const initialReserveBalance = effectiveCommunitySettings?.initial_reserve_balance ?? 0; // Default to 0
      const targetYEB = effectiveCommunitySettings?.target_reserve_balance ?? 0; // Default to 0, will be set by user

      // Update active settings for display
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

      // Populate forecastedAssets for charts and tables (existing logic)
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

      // Calculate Health Check Metrics
      setOverdueAssetsCount(forecastResult.detailedAssets.filter(a => a.isOverdue).length);
      setIsYebBelowTarget(forecastResult.finalReserveBalance < targetYEB);
      // Assuming "underfunded" means total deposits don't cover total expenses in the period
      setIsUnderfunded(forecastResult.totalDepositsInForecastPeriod < forecastResult.totalExpensesInForecastPeriod);

      // Calculate Suggested Monthly Deposit
      let totalUnitsInSelection = 0;
      if (selectedCommunities.length > 0) {
        totalUnitsInSelection = selectedCommunities.reduce((acc, communityId) => {
          const community = allCommunities.find(c => c.id === communityId);
          return acc + (community?.unit_count || 0);
        }, 0);
      } else { // If no specific communities selected, consider all communities
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
      setForecastAnalysisDetails(null); // Clear analysis on error
      setSuggestedMonthlyDepositPerUnit(0); // Clear on error
    } finally {
      setLoading(false);
    }
  }, [
    forecastRange,
    selectedCommunities,
    selectedCategory,
    globalInflationRate,
    allCommunitySettings,
    defaultGlobalInvestmentRate,
    defaultGlobalAnnualDeposit,
    activeForecastYears, // Added missing dependency
    allCommunities, // Added missing dependency
    // supabase, // supabase client is stable, typically not needed in deps
    // setLoading, setError, setForecastedAssets, setActiveInflationRate, etc. are stable setters from useState
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
           initial_reserve_balance: s.initial_reserve_balance,
           target_reserve_balance: s.target_reserve_balance,
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

      const titleText = "Overall Total";
      const titleFontSize = (height / 200).toFixed(2);
      ctx.font = `bold ${titleFontSize}em var(--font-inter), bold ${titleFontSize}em sans-serif`;
      const titleX = Math.round((width - ctx.measureText(titleText).width) / 2);
      const titleY = height / 2 - parseFloat(fontSize) * 16; 

      const subtitleText = "Sum of Yearly Costs";
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
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-3xl font-bold">Capital Asset Forecast</h1>

      {/* StatCard grid */}
      {forecastAnalysisDetails && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="At-Risk Assets"
            value={overdueAssetsCount}
            color="red"
          />
          <StatCard
            title="Reserve Balance"
            value={`$${forecastAnalysisDetails.finalReserveBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
            color={forecastAnalysisDetails.finalReserveBalance < 0 ? "yellow" : "green"}
          />
          <StatCard
            title="Forecasted Cost (Next ${activeForecastYears} Yrs)"
            value={`$${forecastAnalysisDetails.totalExpensesInForecastPeriod.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
            color="green"
          />
        </div>
      )}

      {/* Forecast Health Check Section */}
      {forecastAnalysisDetails && !loading && (
        <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold mb-4">Forecast Health Check</h2>
          {(overdueAssetsCount > 0 || isYebBelowTarget || isUnderfunded) ? (
            <ul className="list-disc pl-5 space-y-2">
              {overdueAssetsCount > 0 && (
                <li className="text-sm text-red-600 leading-relaxed">
                  <span className="font-semibold">{overdueAssetsCount}</span> asset(s) are beyond their expected lifespan.
                </li>
              )}
              {isYebBelowTarget && (
                <li className="text-sm text-yellow-600 leading-relaxed">
                  Projected Year-End Reserve Balance (
                  <span className="font-semibold">${forecastAnalysisDetails.finalReserveBalance.toLocaleString()}</span>
                  ) may fall below the target.
                </li>
              )}
              {isUnderfunded && (
                <li className="text-sm text-yellow-600 leading-relaxed">
                  Annual deposits (Total: <span className="font-semibold">${forecastAnalysisDetails.totalDepositsInForecastPeriod.toLocaleString()}</span>)
                  may be insufficient to match future expenses (Total: <span className="font-semibold">${forecastAnalysisDetails.totalExpensesInForecastPeriod.toLocaleString()}</span>)
                  over the forecast period.
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-green-600 leading-relaxed">Forecast health looks good based on current parameters!</p>
          )}
        </div>
      )}

      {/* Suggested Monthly Deposit Section */}
      {forecastAnalysisDetails && !loading && suggestedMonthlyDepositPerUnit > 0 && (
        <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold mb-3">Suggested Monthly Deposit</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">
            Based on your current forecast, we suggest a per-unit monthly deposit of:
          </p>
          <p className="text-3xl font-bold text-green-600">
            ${suggestedMonthlyDepositPerUnit.toFixed(2)} / unit
          </p>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold mb-4">Filters & Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="text-sm font-medium">Forecast Range</label>
            <div className="flex space-x-2">
              {[1, 5, 10, 15].map((year) => (
                <button
                  key={year}
                  onClick={() => setForecastRange(year)}
                  className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150
                    ${forecastRange === year ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`}
                >
                  {year} Year{year > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

{/* Active Settings Display */}
        <div className="bg-gray-800 text-white rounded-lg p-4 shadow-md md:col-span-2 lg:col-span-1"> {/* Adjusted styling for active settings */}
          <p className="text-md font-semibold text-indigo-300 mb-2">Active Forecast Settings:</p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Inflation: <span className="font-medium text-indigo-400">{(activeInflationRate * 100).toFixed(2)}%</span></li>
            <li>Investment: <span className="font-medium text-indigo-400">{(activeInvestmentRate * 100).toFixed(2)}%</span></li>
            <li>Range: <span className="font-medium text-indigo-400">{activeForecastYears} yrs</span></li>
            <li>Annual Deposit: <span className="font-medium text-indigo-400">${activeAnnualDeposit.toLocaleString()}</span></li>
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="community" className="text-sm font-medium">Community</label>
          <select
            id="community"
            multiple
            value={selectedCommunities}
            onChange={(e) => setSelectedCommunities(Array.from(e.target.selectedOptions, option => option.value))}
            className="rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary text-sm h-24"
          >
            {allCommunities.map(comm => <option key={comm.id} value={comm.id}>{comm.name}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="category" className="text-sm font-medium">Category</label>
          <select
            id="category"
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary text-sm"
          >
            <option value="">All Categories</option>
            {allCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="status" className="text-sm font-medium">Status (Optional)</label>
          <select
            id="status"
            value={selectedStatus || ''}
            onChange={(e) => setSelectedStatus(e.target.value || null)}
            className="rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary text-sm"
          >
            <option value="">Any Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
          <button
            onClick={handleRefreshForecast}
            className="bg-primary text-white font-medium py-2 px-4 rounded hover:bg-primary-dark transition disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Forecast'}
          </button>
        </div>
      </div>


      {loading && (
        <div className="flex justify-center items-center my-10">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-indigo-500"></div>
          <p className="ml-6 text-xl text-gray-700">Loading forecast data...</p>
        </div>
      )}
      {error && <p className="text-red-600 bg-red-100 p-4 rounded-md mb-6 shadow text-center">{error}</p>}

      {!loading && !error && forecastedAssets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"> {/* Consistent gap */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200"> {/* Reverted to previous card style as per plan, new one is for StatCard */}
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Forecasted Costs by Year</h2> {/* Kept h2 style from feedback */}
            <Doughnut
              data={barChartData}
              options={{
                responsive: true,
                cutout: '70%',
                plugins: {
                  legend: { display: true, position: 'bottom' as const, labels: { padding: 20 } },
                  title: { display: false },
                  tooltip: { enabled: true, bodyFont: { size: 14 }, titleFont: {size: 16} }
                }
              }}
              plugins={doughnutChartPlugins}
            />
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200"> {/* Reverted to previous card style */}
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Cost By Category</h2> {/* Kept h2 style, corrected "By" */}
            <Pie
              data={pieChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: true, position: 'bottom' as const, labels: { padding: 20 } },
                  title: { display: false },
                  tooltip: { enabled: true, bodyFont: { size: 14 }, titleFont: {size: 16} }
                }
              }}
              plugins={pieChartPlugins}
            />
          </div>
          {costPerUnitChartData.labels && costPerUnitChartData.labels.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 lg:col-span-2"> {/* Reverted to previous card style */}
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Cost Per Unit by Community</h2> {/* Kept h2 style */}
              <Bar
                data={costPerUnitChartData}
                options={{
                  responsive: true,
                  indexAxis: 'y' as const,
                  plugins: {
                    legend: { display: false },
                    title: { display: false } // Removed title from options, using h2 above
                  },
                  scales: {
                    x: { beginAtZero: true, grid: { display: false }, ticks: { font: {size: 12}}},
                    y: { grid: { display: true }, ticks: { font: {size: 12}} }
                  }
                }}
              />
            </div>
          )}
        </div>
      )}
      {!loading && !error && forecastedAssets.length === 0 && (selectedCategory || selectedCommunities.length > 0) && (
         <p className="text-center text-gray-600 my-10 text-lg leading-relaxed">No assets found for the selected criteria. Try adjusting your filters.</p>
      )}
       {!loading && !error && forecastedAssets.length === 0 && !selectedCategory && selectedCommunities.length === 0 && (
         <p className="text-center text-gray-600 my-10 text-lg leading-relaxed">Please select filters to view the forecast.</p>
      )}


      {/* Table Section */}
      {!loading && forecastedAssets.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200"> {/* This is the table's card container, already styled well */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Forecasted Assets</h2> {/* Updated h2 style */}
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
                className="bg-primary text-white font-medium py-2 px-4 rounded hover:bg-primary-dark transition"
              >
                Export to CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white text-sm border rounded overflow-hidden">
              <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Unit #</th>
                  <th className="px-4 py-3">Community</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Lifespan (Yrs)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Replacement Year</th>
                  <th className="px-4 py-3">Projected Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
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
                  .map((asset, idx) => {
                    let lifeUsed = -1; // Default to a value indicating data not available or not applicable
                    if (asset.lifespan && asset.install_date) {
                      const installYear = new Date(asset.install_date).getFullYear();
                      const currentYear = new Date().getFullYear();
                      if (asset.lifespan > 0) {
                         lifeUsed = (currentYear - installYear) / asset.lifespan;
                      }
                    }

                    const riskClass = lifeUsed >= 1 ? "bg-red-100" : lifeUsed >= 0.75 ? "bg-yellow-100" : "";
                    // The striping from feedback: className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                    // Combining with riskClass:
                    const baseStripeClass = idx % 2 === 0 ? 'bg-gray-50' : 'bg-white';
                    const finalRowClass = riskClass ? `${riskClass} hover:bg-opacity-75` : `${baseStripeClass} hover:bg-gray-50`;


                    return (
                      <tr key={asset.id} className={finalRowClass}>
                        <td className="px-4 py-2 whitespace-nowrap">{asset.unit_number || 'N/A'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{asset.communities?.name || 'N/A'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{asset.categories?.name || 'N/A'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{asset.lifespan ?? 'N/A'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {lifeUsed >= 1 && <span className="inline-block text-xs px-2 py-1 rounded-full bg-red-100 text-red-600">Overdue</span>}
                          {lifeUsed >= 0.75 && lifeUsed < 1 && <span className="inline-block text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-600">Warning</span>}
                          {lifeUsed < 0.75 && lifeUsed >= 0 && <span className="inline-block text-xs px-2 py-1 rounded-full bg-green-100 text-green-600">OK</span>}
                          {lifeUsed < 0 && <span className="text-xs text-gray-500">N/A</span>}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">{asset.replacement_year}</td>
                        <td className="px-4 py-2 whitespace-nowrap">${asset.projected_cost.toFixed(2)}</td>
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