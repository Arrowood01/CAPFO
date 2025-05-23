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

export interface AssetWithAge extends Asset {
  age: number;
  isOverdue: boolean;
}

export interface YearlyFinancialSummaryItem {
  year: number;
  startingReserveBalance: number;
  totalExpensesThisYear: number;
  depositsThisYear: number;
  interestEarnedThisYear: number;
  endOfYearReserveBalance: number;
}

export interface ForecastResult {
  forecastedReplacements: ForecastedReplacement[];
  detailedAssets: AssetWithAge[];
  yearlyFinancialSummary: YearlyFinancialSummaryItem[];
  finalReserveBalance: number;
  totalExpensesInForecastPeriod: number;
  totalDepositsInForecastPeriod: number;
}

// CommunitySpecificSettings can be removed if parameters are passed directly
// export interface CommunitySpecificSettings {
//   inflation_rate?: number; // decimal
//   investment_rate?: number; // decimal
//   forecast_years?: number;
//   annual_deposit?: number;
// }

export interface GenerateForecastParams {
  assets: Asset[];
  inflationRate: number; // Effective inflation rate, pre-calculated by the caller
  investmentRate: number; // Effective investment rate, pre-calculated by the caller
  forecastYears: number; // Effective forecast years, pre-calculated by the caller
  annualDeposit: number; // Effective annual deposit, pre-calculated by the caller
  initialReserveBalance?: number; // Optional: starting reserve balance
}

/**
 * Calculates future asset replacement costs based on inflation and category lifespan.
 * The necessary parameters like inflationRate and forecastYears are expected to be
 * pre-calculated and passed directly.
 *
 * @param params - The input parameters for the forecasting calculation, including assets and effective rates/years.
 * @returns An array of forecasted replacements.
 */
export const generateForecast = (
  params: GenerateForecastParams
): ForecastResult => {
  const {
    assets,
    inflationRate,
    investmentRate,
    forecastYears,
    annualDeposit,
    initialReserveBalance = 0, // Default to 0 if not provided
  } = params;

  const forecastedReplacements: ForecastedReplacement[] = [];
  const detailedAssets: AssetWithAge[] = [];
  const yearlyFinancialSummary: YearlyFinancialSummaryItem[] = [];
  
  const currentYear = new Date().getFullYear();
  const endForecastYear = currentYear + forecastYears -1; // Adjust to be inclusive of forecastYears

  let currentReserveBalance = initialReserveBalance;
  let totalExpensesInForecastPeriod = 0;
  let totalDepositsInForecastPeriod = 0;

  // Calculate age and overdue status for all assets
  assets.forEach((asset) => {
    if (!asset || typeof asset.install_date !== 'string' || typeof asset.category?.lifespan !== 'number') {
      console.warn('Skipping asset for age calculation due to invalid data:', asset);
      detailedAssets.push({ ...asset, age: 0, isOverdue: false }); // Add with default age/overdue if problematic
      return;
    }
    const installDate = new Date(asset.install_date);
    if (isNaN(installDate.getTime())) {
      console.warn(`Invalid install_date format for age calculation: ${asset.install_date}`, asset);
      detailedAssets.push({ ...asset, age: 0, isOverdue: false });
      return;
    }
    const installYear = installDate.getFullYear();
    const age = currentYear - installYear;
    const isOverdue = asset.category.lifespan > 0 ? age > asset.category.lifespan : false;
    detailedAssets.push({ ...asset, age, isOverdue });
  });


  // Main forecast loop for financial summary and replacements
  for (let yearOffset = 0; yearOffset < forecastYears; yearOffset++) {
    const loopYear = currentYear + yearOffset;
    let expensesThisYear = 0;

    detailedAssets.forEach((detailedAsset) => {
      // Skip if asset data is incomplete for replacement calculation
      if (!detailedAsset.install_date || !detailedAsset.category?.lifespan || detailedAsset.category.lifespan <= 0) {
        return;
      }
      const installDate = new Date(detailedAsset.install_date);
      const installYear = installDate.getFullYear();
      const replacementYear = installYear + detailedAsset.category.lifespan;

      if (replacementYear === loopYear) {
        let futureCost = detailedAsset.category.avg_replacement_cost ?? 0;
        if (typeof futureCost !== 'number' || isNaN(futureCost) || futureCost < 0) {
            futureCost = 0;
        }
        const yearsToInflate = replacementYear - currentYear; // Inflate from current year to replacement year
        
        let inflatedCost = futureCost;
        if (yearsToInflate > 0) {
          for (let i = 0; i < yearsToInflate; i++) {
            inflatedCost *= (1 + inflationRate);
          }
        }
        
        const finalCost = parseFloat(inflatedCost.toFixed(2));
        expensesThisYear += finalCost;

        // Add to forecastedReplacements only if it falls within the overall forecast period
        // This check might seem redundant given the loopYear, but good for clarity
        if (replacementYear >= currentYear && replacementYear <= endForecastYear) {
            forecastedReplacements.push({
                year: replacementYear,
                cost: finalCost,
                category: detailedAsset.category.name,
                community: detailedAsset.community,
                asset: detailedAsset, // The original asset, now AssetWithAge
            });
        }
      }
    });

    const interestEarnedThisYear = parseFloat((currentReserveBalance * investmentRate).toFixed(2));
    const depositsThisYear = annualDeposit; // Assuming fixed annual deposit for now

    const startingReserveBalanceForYear = currentReserveBalance;
    currentReserveBalance += depositsThisYear + interestEarnedThisYear - expensesThisYear;
    currentReserveBalance = parseFloat(currentReserveBalance.toFixed(2)); // Keep precision

    yearlyFinancialSummary.push({
      year: loopYear,
      startingReserveBalance: parseFloat(startingReserveBalanceForYear.toFixed(2)),
      totalExpensesThisYear: parseFloat(expensesThisYear.toFixed(2)),
      depositsThisYear: parseFloat(depositsThisYear.toFixed(2)),
      interestEarnedThisYear: interestEarnedThisYear,
      endOfYearReserveBalance: currentReserveBalance,
    });

    totalExpensesInForecastPeriod += expensesThisYear;
    totalDepositsInForecastPeriod += depositsThisYear;
  }
  
  totalExpensesInForecastPeriod = parseFloat(totalExpensesInForecastPeriod.toFixed(2));
  totalDepositsInForecastPeriod = parseFloat(totalDepositsInForecastPeriod.toFixed(2));

  return {
    forecastedReplacements: forecastedReplacements.sort((a, b) => a.year - b.year),
    detailedAssets,
    yearlyFinancialSummary,
    finalReserveBalance: currentReserveBalance,
    totalExpensesInForecastPeriod,
    totalDepositsInForecastPeriod,
  };
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