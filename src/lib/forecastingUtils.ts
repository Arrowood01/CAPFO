// capital-forecast-app/src/lib/forecastingUtils.ts

export interface Asset {
  id: string; // Assuming an ID for each asset
  name: string; // Assuming a name for the asset
  install_date: string; // ISO date string, e.g., "2020-01-15"
  purchase_price: number;
  category: {
    name: string;
    lifespan: number; // in years
    avg_replacement_cost: number; // Added from settings
  };
  community: string;
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
    if (!asset || typeof asset.install_date !== 'string' || typeof asset.category?.lifespan !== 'number' || asset.category.lifespan <= 0) {
      console.warn('Skipping asset due to invalid install_date, lifespan, or missing category:', asset);
      return; // Skip this asset
    }

    const installDate = new Date(asset.install_date);
    if (isNaN(installDate.getTime())) {
      console.warn(`Skipping asset due to invalid install_date format: ${asset.install_date}`, asset);
      return; // Skip this asset
    }
    
    const installYear = installDate.getFullYear();
    // Ensure lifespan is a positive number before calculation
    if (asset.category.lifespan <= 0) {
        console.warn(`Skipping asset due to non-positive lifespan: ${asset.category.lifespan}`, asset);
        return;
    }
    const replacementYear = installYear + asset.category.lifespan;

    // Only include assets whose replacement falls within the forecast range
    // and ensure replacementYear is a valid number
    if (!isNaN(replacementYear) && replacementYear >= currentYear && replacementYear <= endForecastYear) {
      // Use category's average replacement cost as the base.
      // This is assumed to be its replacement cost if replaced *today*.
      let futureCost = asset.category.avg_replacement_cost;

      // Ensure avg_replacement_cost is a valid number
      if (typeof futureCost !== 'number' || isNaN(futureCost) || futureCost < 0) {
          console.warn(`Invalid avg_replacement_cost for category ${asset.category.name} (asset ${asset.id}): ${asset.category.avg_replacement_cost}. Defaulting to 0 for cost calculation.`);
          futureCost = 0;
      }

      // Calculate how many years from currentYear to replacementYear to inflate.
      const yearsToInflate = replacementYear - currentYear;

      if (yearsToInflate > 0) {
        for (let i = 0; i < yearsToInflate; i++) {
          futureCost *= (1 + globalInflationRate);
        }
      }
      // If yearsToInflate is 0 (replacement is current year), futureCost remains asset.category.avg_replacement_cost.
      
      forecastedReplacements.push({
        year: replacementYear,
        cost: parseFloat(futureCost.toFixed(2)),
        category: asset.category.name,
        community: asset.community,
        asset: asset, // asset still contains original purchase_price, category.lifespan, etc. for reference
      });
    } else if (isNaN(replacementYear)) {
        console.warn(`Skipping asset due to NaN replacementYear (likely from invalid install_date or lifespan). Asset ID: ${asset.id}, Install Date: ${asset.install_date}, Lifespan: ${asset.category.lifespan}`);
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

/**
 * Calculates the per-unit cost.
 *
 * @param totalCost - The total cost.
 * @param unitCount - The number of units.
 * @returns The per-unit cost rounded to 2 decimal places, or 0 if unitCount is not greater than 0.
 */
export const calculatePerUnitCost = (totalCost: number, unitCount: number): number => {
  if (unitCount > 0) {
    const perUnitCost = totalCost / unitCount;
    // Round to 2 decimal places
    return parseFloat(perUnitCost.toFixed(2));
  }
  return 0;
};