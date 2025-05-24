'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Doughnut, Pie, Bar } from 'react-chartjs-2';
import StatCard from '@/components/StatCard';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import Papa from 'papaparse';
import { ShieldAlert, Landmark, TrendingUp, DollarSign, ListChecks, CalendarDays, FileText, MoreVertical } from 'lucide-react';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// Updated CHART_COLORS to match reference image more closely for doughnut/pie
const REFERENCE_CHART_COLORS = {
  orange: '#FF8C42', // Example orange
  blue1: '#0D69FF',  // Primary vibrant blue
  blue2: '#5AA9E6',  // Lighter blue
  lightGray: '#E2E8F0', // For unused segments or backgrounds
};

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

// More specific type for Bar chart datasets
interface BarDataset {
  label?: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  barThickness?: number;
  borderRadius?: number; // For rounded bars, often configured in options.elements.bar but can be dataset-specific in some setups
  // Add other bar-specific properties if needed
  [key: string]: any; // Keep flexible for other less common props
}

interface ChartJsData {
  labels: string[];
  datasets: Array<BarDataset | { // Use BarDataset or a generic one for other chart types
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    [key: string]: any;
  }>;
}

const DashboardPage: React.FC = () => {
  const [forecastRange, setForecastRange] = useState<number>(5);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // const [selectedStatus, setSelectedStatus] = useState<string | null>(null); // Keep if status filter is used

  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [globalInflationRate, setGlobalInflationRate] = useState<number>(0.02);
  const [allCommunitySettings, setAllCommunitySettings] = useState<Record<string, CommunitySpecificSettingsInDashboard>>({});
  const [defaultGlobalInvestmentRate] = useState<number>(0.005);
  const [defaultGlobalAnnualDeposit] = useState<number>(0);

  const [forecastedAssets, setForecastedAssets] = useState<ForecastedAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);

  const [forecastAnalysisDetails, setForecastAnalysisDetails] = useState<ForecastResult | null>(null);
  const [overdueAssetsCount, setOverdueAssetsCount] = useState<number>(0);
  // const [isYebBelowTarget, setIsYebBelowTarget] = useState<boolean>(false); // Can be derived from forecastAnalysisDetails
  // const [isUnderfunded, setIsUnderfunded] = useState<boolean>(false); // Can be derived
  // const [suggestedMonthlyDepositPerUnit, setSuggestedMonthlyDepositPerUnit] = useState<number>(0); // Can be derived

  const [activeInflationRate, setActiveInflationRate] = useState<number>(globalInflationRate);
  const [activeInvestmentRate, setActiveInvestmentRate] = useState<number>(defaultGlobalInvestmentRate);
  const [activeForecastYears, setActiveForecastYears] = useState<number>(forecastRange);
  const [activeAnnualDeposit, setActiveAnnualDeposit] = useState<number>(defaultGlobalAnnualDeposit);
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [communitiesRes, categoriesRes, settingsRes, communitySettingsRes] = await Promise.all([
        supabase.from('communities').select('id, name, unit_count'),
        supabase.from('categories').select('id, name, lifespan'),
        supabase.from('settings').select('value').eq('key', 'inflation_rate').single(),
        supabase.from('community_settings').select('*')
      ]);

      if (communitiesRes.error) throw communitiesRes.error;
      setAllCommunities(communitiesRes.data || []);

      if (categoriesRes.error) throw categoriesRes.error;
      setAllCategories(categoriesRes.data || []);

      if (settingsRes.error && settingsRes.error.code !== 'PGRST116') {
        console.error('Error fetching global inflation rate:', settingsRes.error);
      } else if (settingsRes.data) {
        setGlobalInflationRate(parseFloat(settingsRes.data.value) || 0.02);
      }

      if (communitySettingsRes.error) {
        console.error('Error fetching community settings:', communitySettingsRes.error);
      } else if (communitySettingsRes.data) {
        const settingsMap: Record<string, CommunitySpecificSettingsInDashboard> = {};
        communitySettingsRes.data.forEach(s => {
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
      // setLoading(false); // setLoading will be handled by runForecast
    }
  }, []); // Removed supabase from dependencies

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('assets')
        .select(`
          id, unit_number, install_date, description, purchase_price,
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
        setForecastAnalysisDetails(null);
        // setError("No assets found matching your criteria."); // Only set error if filters are applied
        setLoading(false);
        return;
      }
      
      const validAssetsData = Array.isArray(supabaseAssetsData)
        ? supabaseAssetsData.filter((item: any) => item && !item.error && item.id)
        : [];
      
      const assetsData = validAssetsData as unknown as DashboardAsset[];
 
      const assetsForForecast: ForecastingAsset[] = assetsData.map(asset => ({
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
      const yearsToForecast = effectiveCommunitySettings?.forecast_years ?? forecastRange; // Use consistent variable name
      const annualDep = effectiveCommunitySettings?.annual_deposit ?? defaultGlobalAnnualDeposit;
      const initialReserve = effectiveCommunitySettings?.initial_reserve_balance ?? 0;
      const targetYEB = effectiveCommunitySettings?.target_reserve_balance ?? 0;

      setActiveInflationRate(inflation);
      setActiveInvestmentRate(investmentRate);
      setActiveForecastYears(yearsToForecast);
      setActiveAnnualDeposit(annualDep);

      const forecastResultData: ForecastResult = generateForecast({
        assets: assetsForForecast,
        inflationRate: inflation,
        investmentRate,
        forecastYears: yearsToForecast,
        annualDeposit: annualDep,
        initialReserveBalance: initialReserve,
      });

      setForecastAnalysisDetails(forecastResultData);

      const finalForecastedAssets: ForecastedAsset[] = forecastResultData.forecastedReplacements.map(fr => {
        const originalAssetDetails = assetsData.find(a => a.id === fr.asset.id);
        const detailedAsset = forecastResultData.detailedAssets.find(da => da.id === fr.asset.id);
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
      setOverdueAssetsCount(forecastResultData.detailedAssets.filter(a => a.isOverdue).length);

    } catch (err) {
      console.error("Error running forecast:", err);
      setError('Failed to run forecast.');
      setForecastedAssets([]);
      setForecastAnalysisDetails(null);
    } finally {
      setLoading(false);
    }
  }, [
    forecastRange, selectedCommunities, selectedCategory, globalInflationRate,
    allCommunitySettings, defaultGlobalInvestmentRate, defaultGlobalAnnualDeposit, supabase
  ]);

  useEffect(() => {
    runForecast();
  }, [runForecast]);


  const handleRefreshForecast = useCallback(() => {
    // Re-fetch initial data then run forecast
    fetchData().then(() => runForecast());
  }, [fetchData, runForecast]);


  const handleExportToCSV = () => {
    const csvData = forecastedAssets.map(asset => ({
      'Unit #': asset.unit_number || 'N/A',
      'Community': asset.communities?.name || 'N/A',
      'Category': asset.categories?.name || 'N/A',
      'Replacement Year': asset.replacement_year,
      'Projected Cost': asset.projected_cost.toFixed(2),
      'Status': asset.isOverdue ? 'Overdue' : 'OK', // Example status
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

  // Chart Data Preparations
  const costPerUnitChartData: ChartJsData = {
    labels: allCommunities
        .filter(c => selectedCommunities.length === 0 || selectedCommunities.includes(c.id)) // Filter by selection or show all
        .map(c => c.name),
    datasets: [
      {
        label: 'Cost Per Unit ($)',
        data: allCommunities
            .filter(c => selectedCommunities.length === 0 || selectedCommunities.includes(c.id))
            .map(community => {
                if ((community.unit_count ?? 0) > 0 && forecastAnalysisDetails) {
                    const communityAssets = forecastedAssets.filter(
                    asset => asset.communities?.id === community.id
                    );
                    const totalCommunityForecastCost = communityAssets.reduce(
                    (sum, asset) => sum + asset.projected_cost,
                    0
                    );
                    return calculatePerUnitCost(totalCommunityForecastCost, community.unit_count!);
                }
                return 0;
            }),
        backgroundColor: '#0D69FF', // primary.DEFAULT
        borderColor: '#0D69FF',
        borderWidth: 1,
        barThickness: 20, // Correctly placed on the dataset
      },
    ],
  };
  
  const costByCategoryChartData: ChartJsData = {
    labels: allCategories
      .filter(cat => forecastedAssets.some(asset => asset.categories?.id === cat.id))
      .map(cat => cat.name),
    datasets: [
      {
        data: allCategories
          .filter(cat => forecastedAssets.some(asset => asset.categories?.id === cat.id))
          .map(category => 
            forecastedAssets
              .filter(asset => asset.categories?.id === category.id)
              .reduce((sum, asset) => sum + asset.projected_cost, 0)
          ),
        backgroundColor: [
          REFERENCE_CHART_COLORS.orange, 
          REFERENCE_CHART_COLORS.blue1, 
          REFERENCE_CHART_COLORS.blue2, 
          REFERENCE_CHART_COLORS.lightGray,
          // Add more colors if more categories
        ],
        borderColor: '#FFFFFF', // White border for segments
        borderWidth: 2,
      },
    ],
  };


  return (
    <div className="space-y-8"> {/* Main page container with spacing from layout.tsx */}
      {/* StatCards grid - Using new props from updated StatCard.tsx */}
      {!loading && forecastAnalysisDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard 
            title="At-Risk Assets"
            value={overdueAssetsCount} 
            bgColorClass="bg-primary" // Uses new primary blue
            textColorClass="text-white"
            valueTextColorClass="text-white text-3xl font-semibold"
            icon={<ShieldAlert className="w-8 h-8 text-white opacity-75" />}
          />
          <StatCard 
            title="Reserve Balance" 
            value={`$${forecastAnalysisDetails.finalReserveBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
            bgColorClass="bg-statCardBlueBg"
            textColorClass="text-statCardTextBlue font-medium" // Title text color
            valueTextColorClass="text-titleText text-3xl font-semibold" // Value text color
            icon={<Landmark className="w-8 h-8 text-statCardIconBlue" />}
          />
          <StatCard 
            title={`Forecasted Cost (${activeForecastYears} Yrs)`} 
            value={`$${forecastAnalysisDetails.totalExpensesInForecastPeriod.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
            bgColorClass="bg-statCardRedBg"
            textColorClass="text-statCardTextRed font-medium" // Title text color
            valueTextColorClass="text-titleText text-3xl font-semibold" // Value text color
            icon={<DollarSign className="w-8 h-8 text-statCardIconRed" />}
          />
        </div>
      )}

      {/* Main Content Grid: Left (Charts & Table) and Right (Info Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Chart Card (Cost Per Unit by Community - Vertical Bar) */}
          {!loading && costPerUnitChartData.labels && costPerUnitChartData.labels.length > 0 && (
            <div className="bg-whiteCardBg rounded-xl shadow-md p-6 border border-tableDivider">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-titleText">Cost Per Unit by Community</h2>
                {/* Placeholder for Weekly dropdown if needed 
                <select className="text-sm rounded-md border-gray-300 focus:ring-primary focus:border-primary"><option>Weekly</option></select>
                */}
              </div>
              <div style={{ height: '300px' }}> {/* Constrain chart height */}
                <Bar
                  data={costPerUnitChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'x' as const,
                    elements: {
                      bar: {
                        borderRadius: 6,
                      }
                    },
                    plugins: {
                      legend: { display: false },
                      title: { display: false }
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { font: {size: 10}, color: '#6b7280' } },
                      y: { beginAtZero: true, grid: { display: true, color: '#E2E8F0' }, ticks: { font: {size: 10}, color: '#6b7280', callback: value => `$${value}` } }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Forecasted Assets Table Card */}
          {!loading && forecastedAssets.length > 0 && (
            <div className="bg-whiteCardBg rounded-xl shadow-md p-6 border border-tableDivider">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-titleText">Forecasted Assets</h2>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={showAtRiskOnly}
                      onChange={() => setShowAtRiskOnly(!showAtRiskOnly)}
                      className="form-checkbox h-3.5 w-3.5 text-primary rounded-sm focus:ring-primary-light"
                    />
                    Show At-Risk Only
                  </label>
                  <button
                    onClick={handleExportToCSV}
                    className="bg-primary text-white font-medium py-1.5 px-3 rounded-md hover:bg-primary-dark transition text-xs"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white text-sm">
                  <thead className="bg-tableHeaderBg text-left text-xs font-medium text-tableHeaderText uppercase">
                    <tr>
                      <th className="px-4 py-3">Unit #</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Repl. Year</th>
                      <th className="px-4 py-3 text-right">Projected Cost</th>
                      {/* <th className="px-4 py-3 text-center">Action</th> */}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tableDivider">
                    {forecastedAssets
                      .filter(asset => {
                        if (!showAtRiskOnly) return true;
                        if (asset.lifespan && asset.install_date) {
                          const installYear = new Date(asset.install_date).getFullYear();
                          const currentYear = new Date().getFullYear();
                          if (asset.lifespan > 0) {
                            const lifeUsed = (currentYear - installYear) / asset.lifespan;
                            return lifeUsed >= 0.75;
                          }
                        }
                        return false;
                      })
                      .map((asset, idx) => {
                        let lifeUsed = -1;
                        if (asset.lifespan && asset.install_date) {
                          const installYear = new Date(asset.install_date).getFullYear();
                          const currentYear = new Date().getFullYear();
                          if (asset.lifespan > 0) {
                             lifeUsed = (currentYear - installYear) / asset.lifespan;
                          }
                        }
                        const baseStripeClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                        const riskClass = lifeUsed >= 1 ? "bg-red-50 text-red-700" : lifeUsed >= 0.75 ? "bg-yellow-50 text-yellow-700" : "text-defaultText";
                        const finalRowClass = riskClass.includes("bg-") ? `${riskClass} hover:bg-opacity-75` : `${baseStripeClass} ${riskClass} hover:bg-tableRowHoverBg`;

                        return (
                          <tr key={asset.id} className={finalRowClass}>
                            <td className="px-4 py-2 whitespace-nowrap">{asset.unit_number || 'N/A'}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{asset.categories?.name || 'N/A'}</td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {lifeUsed >= 1 && <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Overdue</span>}
                              {lifeUsed >= 0.75 && lifeUsed < 1 && <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600">Warning</span>}
                              {lifeUsed < 0.75 && lifeUsed >= 0 && <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">OK</span>}
                              {lifeUsed < 0 && <span className="text-xs text-gray-500">N/A</span>}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-center">{asset.replacement_year}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-right">${asset.projected_cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            {/* <td className="px-4 py-2 whitespace-nowrap text-center"><MoreVertical className="h-4 w-4 text-gray-400 cursor-pointer"/></td> */}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Cost by Category Doughnut Chart Card */}
          {!loading && !error && costByCategoryChartData.labels && costByCategoryChartData.labels.length > 0 && (
            <div className="bg-whiteCardBg rounded-xl shadow-md p-6 border border-tableDivider">
              <h2 className="text-lg font-semibold text-titleText mb-4">Cost by Category</h2>
              <div className="mx-auto w-full max-w-xs" style={{height: '250px'}}> {/* Constrain doughnut size */}
                <Doughnut
                  data={costByCategoryChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%', 
                    plugins: {
                      legend: { display: true, position: 'bottom' as const, labels: { padding: 10, boxWidth: 10, font: {size: 10} } },
                      title: { display: false },
                      tooltip: { enabled: true }
                    }
                  }}
                  // plugins={doughnutChartPlugins} // Custom text plugin can be re-added if needed
                />
              </div>
            </div>
          )}

          {/* Recent Transactions Card (Placeholder) */}
          <div className="bg-whiteCardBg rounded-xl shadow-md p-6 border border-tableDivider">
            <h2 className="text-lg font-semibold text-titleText mb-4">Recent Transactions</h2>
            <div className="space-y-4">
              {[
                { title: 'Electric bill payment', date: '10 Dec 2020', icon: DollarSign, iconBg: 'bg-statCardBlueBg', iconColor: 'text-statCardIconBlue' },
                { title: 'Transport bill...', date: '10 Dec 2020', icon: TrendingUp, iconBg: 'bg-green-100', iconColor: 'text-green-500' },
                { title: 'Inventory bill..', date: '10 Dec 2020', icon: ListChecks, iconBg: 'bg-yellow-100', iconColor: 'text-yellow-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-full ${item.iconBg}`}>
                    <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-defaultText font-medium">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters Section - To be integrated into the new design or removed */}
      {/* 
      <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold mb-4">Filters & Settings</h2>
        ... (original filter content) ...
      </div>
      */}
      
      {loading && (
        <div className="flex justify-center items-center my-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary"></div>
          <p className="ml-4 text-lg text-defaultText">Loading forecast data...</p>
        </div>
      )}
      {error && <p className="text-red-600 bg-red-100 p-4 rounded-md my-6 shadow text-center">{error}</p>}

      {!loading && !error && forecastedAssets.length === 0 && (selectedCategory || selectedCommunities.length > 0) && (
         <p className="text-center text-gray-600 my-10 text-lg leading-relaxed">No assets found for the selected criteria. Try adjusting your filters.</p>
      )}
       {!loading && !error && forecastedAssets.length === 0 && !selectedCategory && selectedCommunities.length === 0 && (
         <p className="text-center text-gray-600 my-10 text-lg leading-relaxed">Select filters from the main layout to view the forecast.</p>
      )}
    </div>
  );
};

export default DashboardPage;