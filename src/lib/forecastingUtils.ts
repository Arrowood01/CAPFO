// capital-forecast-app/src/lib/forecastingUtils.ts

export interface Asset {
  id: string; // Assuming an ID for each asset
  name: string; // Assuming a name for the asset
  install_date: string; // ISO date string, e.g., "2020-01-15"
  purchase_price: number;
  category: {
    name: string; // e.g., "HVAC", "Roofing"
    lifespan: number; // in years
  };
  community: string; // e.g., "Greenwood Apts"
  // Add any other relevant asset properties here
}

export interface ForecastedReplacement {
  year: number;
  cost: number;
  category: string;
  community: string;
  asset: Asset; // Include the original asset for reference
}

export interface ForecastingInput {
  assets: Asset[];
  globalInflationRate: number; // e.g., 0.02 for 2%
  forecastRangeInYears: 5 | 10 | 15;
}

/**
 * Calculates future asset replacement costs based on inflation and category lifespan.
 *
 * @param input - The input parameters for the forecasting calculation.
 * @returns An array of forecasted replacements.
 */
export const calculateFutureAssetCosts = (
  input: ForecastingInput
): ForecastedReplacement[] => {
  const { assets, globalInflationRate, forecastRangeInYears } = input;
  const forecastedReplacements: ForecastedReplacement[] = [];
  const currentYear = new Date().getFullYear();
  const endForecastYear = currentYear + forecastRangeInYears;

  assets.forEach((asset) => {
    const installDate = new Date(asset.install_date);
    const installYear = installDate.getFullYear();
    const replacementYear = installYear + asset.category.lifespan;

    // Only include assets whose replacement falls within the forecast range
    if (replacementYear >= currentYear && replacementYear <= endForecastYear) {
      // const yearsToReplacement = replacementYear - currentYear; // Unused
      
      // Simplified inflation calculation: Cost_future = Cost_present * (1 + r)^n
      // A more precise calculation would compound inflation from purchase to replacement.
      // For this, we'll calculate inflation from purchase year to replacement year.
      // const yearsSincePurchaseToReplacement = replacementYear - installYear; // Unused, and is equivalent to asset.category.lifespan
      
      // Calculate inflated cost from original purchase price to the replacement year
      let inflatedCost = asset.purchase_price;
      for (let i = 0; i < asset.category.lifespan; i++) {
        inflatedCost *= (1 + globalInflationRate);
      }
      
      // If we want to inflate from "today" to "replacementYear" for an item replaced in the future:
      // This interpretation seems more aligned with "future cost from today's perspective"
      // However, the formula "install_date + lifespan" implies the replacement is at that fixed future point,
      // and its cost should be the original cost inflated over its lifespan.
      // Let's stick to inflating the original purchase_price over its lifespan.

      forecastedReplacements.push({
        year: replacementYear,
        cost: parseFloat(inflatedCost.toFixed(2)), // Round to 2 decimal places
        category: asset.category.name,
        community: asset.community,
        asset: asset,
      });
    }
  });

  return forecastedReplacements.sort((a, b) => a.year - b.year); // Sort by year
};

// Grouping functions

export const groupForecastByYear = (
  forecasts: ForecastedReplacement[]
): Record<number, { totalCost: number; items: ForecastedReplacement[] }> => {
  return forecasts.reduce((acc, forecast) => {
    if (!acc[forecast.year]) {
      acc[forecast.year] = { totalCost: 0, items: [] };
    }
    acc[forecast.year].totalCost += forecast.cost;
    acc[forecast.year].items.push(forecast);
    // Round totalCost at the end if necessary, or ensure individual costs are rounded
    acc[forecast.year].totalCost = parseFloat(acc[forecast.year].totalCost.toFixed(2));
    return acc;
  }, {} as Record<number, { totalCost: number; items: ForecastedReplacement[] }>);
};

export const groupForecastByCategory = (
  forecasts: ForecastedReplacement[]
): Record<string, { totalCost: number; items: ForecastedReplacement[] }> => {
  return forecasts.reduce((acc, forecast) => {
    if (!acc[forecast.category]) {
      acc[forecast.category] = { totalCost: 0, items: [] };
    }
    acc[forecast.category].totalCost += forecast.cost;
    acc[forecast.category].items.push(forecast);
    acc[forecast.category].totalCost = parseFloat(acc[forecast.category].totalCost.toFixed(2));
    return acc;
  }, {} as Record<string, { totalCost: number; items: ForecastedReplacement[] }>);
};

export const groupForecastByCommunity = (
  forecasts: ForecastedReplacement[]
): Record<string, { totalCost: number; items: ForecastedReplacement[] }> => {
  return forecasts.reduce((acc, forecast) => {
    if (!acc[forecast.community]) {
      acc[forecast.community] = { totalCost: 0, items: [] };
    }
    acc[forecast.community].totalCost += forecast.cost;
    acc[forecast.community].items.push(forecast);
    acc[forecast.community].totalCost = parseFloat(acc[forecast.community].totalCost.toFixed(2));
    return acc;
  }, {} as Record<string, { totalCost: number; items: ForecastedReplacement[] }>);
};

// Example Usage (can be removed or kept for testing)
/*
const sampleAssets: Asset[] = [
  {
    id: '1',
    name: 'AC Unit 1',
    install_date: '2015-06-01', // Replaced in 2015 + 10 = 2025
    purchase_price: 5000,
    category: { name: 'HVAC', lifespan: 10 },
    community: 'Greenwood Apts',
  },
  {
    id: '2',
    name: 'Roof Section A',
    install_date: '2010-01-01', // Replaced in 2010 + 20 = 2030
    purchase_price: 25000,
    category: { name: 'Roofing', lifespan: 20 },
    community: 'Greenwood Apts',
  },
  {
    id: '3',
    name: 'Water Heater B',
    install_date: '2022-01-01', // Replaced in 2022 + 7 = 2029
    purchase_price: 800,
    category: { name: 'Plumbing', lifespan: 7 },
    community: 'Oak Valley Homes',
  },
  {
    id: '4',
    name: 'AC Unit 2',
    install_date: '2023-07-01', // Replaced in 2023 + 10 = 2033
    purchase_price: 5500,
    category: { name: 'HVAC', lifespan: 10 },
    community: 'Greenwood Apts',
  },
];

const forecastInput: ForecastingInput = {
  assets: sampleAssets,
  globalInflationRate: 0.03, // 3%
  forecastRangeInYears: 10, // Forecast for the next 10 years from current year
};

// const results = calculateFutureAssetCosts(forecastInput);
// console.log('Forecasted Replacements:', results);

// const byYear = groupForecastByYear(results);
// console.log('\\nGrouped by Year:', byYear);

// const byCategory = groupForecastByCategory(results);
// console.log('\\nGrouped by Category:', byCategory);

// const byCommunity = groupForecastByCommunity(results);
// console.log('\\nGrouped by Community:', byCommunity);
*/