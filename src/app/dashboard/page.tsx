'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Assuming supabase client is here
import { Bar, Pie } from 'react-chartjs-2'; // Or Recharts
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import Papa from 'papaparse'; // For CSV export
import { calculateFutureAssetCosts, type Asset as ForecastingAsset, type ForecastedReplacement } from '@/lib/forecastingUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// Dashboard's representation of an asset (after fetching)
interface DashboardAsset {
  id: string;
  unit_number?: string;
  install_date?: string;
  description?: string; // For asset name
  purchase_price?: number;
  categories?: { id: string; name: string; lifespan: number | null }; // Changed to object, matches typical Supabase FK response, allows null lifespan
  communities?: { id: string; name: string }; // Changed to object
}

interface ForecastedAsset extends DashboardAsset { // Extended with forecast-specific fields
  replacement_year: number;
  projected_cost: number;
}

interface Community {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  lifespan: number;
}

const DashboardPage: React.FC = () => {
  const [forecastRange, setForecastRange] = useState<5 | 10 | 15>(5);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null); // Optional filter

  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [inflationRate, setInflationRate] = useState<number>(0.02); // Default inflation rate

  const [forecastedAssets, setForecastedAssets] = useState<ForecastedAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data for filters (communities, categories) and settings (inflation)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: communitiesData, error: communitiesError } = await supabase
          .from('communities')
          .select('id, name');
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
        if (settingsError) {
          console.warn('Inflation rate not found in settings, using default.');
        } else if (settingsData) {
          setInflationRate(parseFloat(settingsData.value) || 0.02);
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

  // Fetch assets and run forecast when filters change
  const runForecast = useCallback(async () => {
    if (!selectedCommunities.length || !selectedCategory) {
      // Or handle this more gracefully, e.g., show all if none selected
      // setForecastedAssets([]);
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
          categories (id, name, lifespan),
          communities (id, name)
        `);

      if (selectedCommunities.length > 0) {
        query = query.in('community_id', selectedCommunities);
      }
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }
      // Add status filter if implemented
      // if (selectedStatus) {
      //   query = query.eq('status', selectedStatus);
      // }

      const { data: supabaseAssetsData, error: assetsError } = await query;
      if (assetsError) throw assetsError;

      // DEBUG LOG: Inspect fetched asset data, especially category lifespans
      if (supabaseAssetsData && supabaseAssetsData.length > 0) {
        console.log("DEBUG: Fetched supabaseAssetsData in runForecast (sample):", JSON.stringify(supabaseAssetsData.slice(0, 2), null, 2));
        supabaseAssetsData.forEach((asset: any) => { // Use 'any' for asset here just for logging robustness
          if (asset && asset.id) {
            const categoryData = asset.categories; // Supabase might return it as 'categories' (plural) based on table name
            if (categoryData && typeof categoryData === 'object' && !Array.isArray(categoryData)) {
              console.log(`DEBUG: Asset ID ${asset.id}, Category: ${categoryData.name}, Fetched Lifespan: ${categoryData.lifespan}`);
            } else if (asset.category && typeof asset.category === 'object' && !Array.isArray(asset.category)) {
              // Fallback if the key was singular 'category' from an older select or different interpretation
              console.log(`DEBUG: Asset ID ${asset.id}, Category (using .category): ${asset.category.name}, Fetched Lifespan: ${asset.category.lifespan}`);
            } else {
              console.log(`DEBUG: Asset ID ${asset.id} has no valid category object or it's an array. Category data:`, categoryData);
            }
          } else {
            console.log("DEBUG: Encountered an asset without an ID or a null/undefined asset in supabaseAssetsData:", asset);
          }
        });
      }

      if (!supabaseAssetsData || supabaseAssetsData.length === 0) {
        setForecastedAssets([]);
        setError("No assets found matching your criteria.");
        return;
      }
      
      // Filter out potential error objects and ensure it's an array
      const validAssetsData = Array.isArray(supabaseAssetsData)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? supabaseAssetsData.filter((item: any) => item && !item.error && item.id)
        : [];

      if (validAssetsData.length === 0 && supabaseAssetsData && supabaseAssetsData.length > 0) {
        // This means all items were filtered out, likely all were errors or malformed
        console.warn("Supabase returned data, but it was malformed or contained only errors:", supabaseAssetsData);
        setError("Received malformed data from the server.");
        setForecastedAssets([]);
        setLoading(false);
        return;
      }
      
      const assetsData = validAssetsData as unknown as DashboardAsset[]; // Type assertion on filtered data
 
      // Prepare assets for the forecasting utility
      const assetsForForecast: ForecastingAsset[] = assetsData.map((asset: DashboardAsset) => ({
        id: asset.id,
        name: asset.description || 'N/A', // Use description or a default
        install_date: asset.install_date || new Date().toISOString(), // Ensure valid date string
        purchase_price: asset.purchase_price || 0,
        category: {
          name: asset.categories?.name || 'Unknown Category', // Use corrected field name 'categories' and direct property access
          lifespan: asset.categories?.lifespan ?? 10, // Use nullish coalescing for default lifespan
        },
        community: asset.communities?.name || 'Unknown Community', // Use corrected field name 'communities'
      }));

      const forecastInput = {
        assets: assetsForForecast,
        globalInflationRate: inflationRate,
        forecastRangeInYears: forecastRange,
      };

      const rawForecastResults: ForecastedReplacement[] = calculateFutureAssetCosts(forecastInput);

      // Map results back to the dashboard's ForecastedAsset structure
      const finalForecastedAssets: ForecastedAsset[] = rawForecastResults.map(fr => {
        // Find the original dashboard asset to retain all its properties
        const originalDashboardAsset = assetsData.find((a: DashboardAsset) => a.id === fr.asset.id);
        if (!originalDashboardAsset) {
          console.warn(`Could not find original asset for forecasted ID: ${fr.asset.id}`);
          // Decide how to handle this - skip, or create a partial object
          // For now, let's create a partial object based on forecast data if original is missing
          return {
            id: fr.asset.id,
            description: fr.asset.name,
            purchase_price: fr.asset.purchase_price,
            install_date: fr.asset.install_date,
            category: [{ name: fr.category, id: 'unknown', lifespan: 0 }], // Minimal data
            community: [{ name: fr.community, id: 'unknown' }], // Minimal data
            replacement_year: fr.year,
            projected_cost: fr.cost,
          } as ForecastedAsset; // Cast to ForecastedAsset
        }
        return {
          ...originalDashboardAsset, // Spread original details
          id: fr.asset.id,
          description: fr.asset.name,
          purchase_price: fr.asset.purchase_price,
          // categories and communities objects are already on originalDashboardAsset
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
  }, [forecastRange, selectedCommunities, selectedCategory, inflationRate]); // Removed selectedStatus

  useEffect(() => {
    // Initial forecast run when component mounts or dependencies of runForecast change
    runForecast();
  }, [runForecast]); // runForecast itself has dependencies like forecastRange, selectedCommunities, selectedCategory, inflationRate

  const handleRefreshForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Re-fetch inflation rate
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'inflation_rate')
        .single();
      if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116: "Searched item was not found"
        console.warn('Error re-fetching inflation rate, using current value.');
      } else if (settingsData) {
        setInflationRate(parseFloat(settingsData.value) || 0.02);
      } else {
         setInflationRate(0.02); // Default if not found
      }

      // Re-fetch categories for pie chart and potentially other UI elements (runForecast fetches its own asset.categories.lifespan)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, lifespan');
      if (categoriesError) {
          console.warn('Error re-fetching categories.');
      } else {
          setAllCategories(categoriesData || []);
      }
      
      // Now that inflationRate state (and allCategories if needed by UI elements directly) is updated,
      // runForecast will be triggered by its own useEffect if inflationRate is a dependency,
      // or we can call it explicitly. Since runForecast's dependencies include inflationRate,
      // just updating the state should be enough.
      // For explicitness and immediate effect if runForecast's deps are complex:
      await runForecast();

    } catch (err) {
      console.error("Error during manual refresh:", err);
      setError('Failed to refresh forecast data.');
    } finally {
      setLoading(false);
    }
  }, [runForecast]); // Add supabase if it were not stable, but it is. runForecast will be recreated if its own deps change.


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

  // Placeholder for chart data - adapt based on your charting library
  const barChartData = {
    labels: forecastedAssets.reduce((acc, asset) => {
      if (!acc.includes(asset.replacement_year.toString())) {
        acc.push(asset.replacement_year.toString());
      }
      return acc;
    }, [] as string[]).sort(),
    datasets: [
      {
        label: 'Total Forecasted Cost',
        data: [] as number[], // To be populated
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };
  // Populate bar chart data
  barChartData.datasets[0].data = barChartData.labels.map(year =>
    forecastedAssets
      .filter(asset => asset.replacement_year.toString() === year)
      .reduce((sum, asset) => sum + asset.projected_cost, 0)
  );


  const pieChartData = {
    labels: allCategories
        .filter(cat => forecastedAssets.some(asset => asset.categories?.id === cat.id)) // Use corrected field name
        .map(cat => cat.name),
    datasets: [
      {
        data: [] as number[], // To be populated
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
      },
    ],
  };
  // Populate pie chart data
  pieChartData.datasets[0].data = allCategories
    .filter(cat => forecastedAssets.some(asset => asset.categories?.id === cat.id)) // Use corrected field name
    .map(cat =>
        forecastedAssets
            .filter(asset => asset.categories?.id === cat.id) // Use corrected field name
            .reduce((sum, asset) => sum + asset.projected_cost, 0)
  );


  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Capital Asset Forecast</h1>

      {/* Filters Section */}
      <div className="mb-6 p-4 border rounded shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="forecastRange" className="block text-sm font-medium text-gray-700">Forecast Range (Years)</label>
          <select
            id="forecastRange"
            value={forecastRange}
            onChange={(e) => setForecastRange(Number(e.target.value) as 5 | 10 | 15)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {([5, 10, 15] as const).map(year => <option key={year} value={year}>{year} Years</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="community" className="block text-sm font-medium text-gray-700">Community</label>
          {/* Replace with a proper multi-select component */}
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
            {/* Populate with actual statuses if this filter is used */}
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

      {/* Charts Section */}
      {!loading && !error && forecastedAssets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="p-4 border rounded shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Forecasted Costs by Year</h2>
            <Bar data={barChartData} options={{ responsive: true, plugins: { legend: { position: 'top' as const }, title: { display: true, text: 'Yearly Costs' } } }} />
            {/* <p className="text-center text-gray-500">(Bar Chart Placeholder - Install and configure Chart.js or Recharts)</p> */}
          </div>
          <div className="p-4 border rounded shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Cost by Category</h2>
            <Pie data={pieChartData} options={{ responsive: true, plugins: { legend: { position: 'top' as const }, title: { display: true, text: 'Category Costs' } } }} />
            {/* <p className="text-center text-gray-500">(Pie Chart Placeholder - Install and configure Chart.js or Recharts)</p> */}
          </div>
        </div>
      )}
      {!loading && !error && forecastedAssets.length === 0 && !selectedCategory && !selectedCommunities.length && (
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