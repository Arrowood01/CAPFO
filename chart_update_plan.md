# Plan: Update Dashboard Chart Styles & Filters

This plan outlines the steps to update the visual style of the charts on the dashboard page ([`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx)) and revise the timeframe filtering mechanism.

**Aesthetics:**
*   **Color Palette (Monochromatic Blues/Purples):**
    *   Primary: `#5A3FFF`
    *   Tints: `#7C6BFF`, `#9D94FF`, `#BEBEFF`, `#DFDFFF`
*   **Font:** `Inter` (fallback to `sans-serif`)

**Mermaid Diagram of the Plan:**

```mermaid
graph TD
    A[Start: Update Dashboard Chart Styles & Filters] --> B[Phase 1: Visual Styling Implementation];
    B --> B1[Setup Global Styles];
    B1 --> B1a[Define Color Palette in JS/CSS (e.g., #5A3FFF & tints)];
    B1 --> B1b[Ensure 'Inter' Font is Available (e.g., import in globals.css or layout.tsx)];
    
    B --> B2[Style Chart Containers in `src/app/dashboard/page.tsx`];
    B2 --> B2a[Apply Tailwind CSS: Rounded Corners (e.g., rounded-xl), Padding (e.g., p-6), Shadow (e.g., shadow-lg)];
    
    B --> B3[Update "Forecasted Costs by Year" Chart (Lines ~310-330, 501)];
    B3 --> B3a[Change Chart Type: Bar to Doughnut (react-chartjs-2 import and component)];
    B3 --> B3b[Data: Update `barChartData.datasets[0].backgroundColor` with new color palette array];
    B3 --> B3c[Options: Set `cutout` (e.g., '70%'), legend display, tooltips];
    B3 --> B3d[Style Title: "Forecasted Costs by Year" with 'Inter' font];

    B --> B4[Update "Cost by Category" Chart (Lines ~333-358, 505)];
    B4 --> B4a[Data: Update `pieChartData.datasets[0].backgroundColor` with new color palette array];
    B4 --> B4b[Options: Update legend display, tooltips];
    B4 --> B4c[Style Title: "Cost by Category" with 'Inter' font];

    B --> B5[Update "Cost Per Unit by Community" Chart (Lines ~373-411, 510)];
    B5 --> B5a[Data: Update `costPerUnitChartData.datasets[0].backgroundColor` with primary new color];
    B5 --> B5b[Options: Style grid lines, axis labels with 'Inter' font];
    B5 --> B5c[Style Title: "Cost Per Unit by Community" with 'Inter' font];

    A --> C[Phase 2: Timeframe Filter Implementation];
    C --> C1[In `src/app/dashboard/page.tsx`, Remove "Forecast Range (Years)" Dropdown (Lines ~421-431)];
    C --> C2[Add New Timeframe Buttons UI: "1 Year", "5 Years", "10 Years", "15 Years"];
    C2 --> C2a[Style buttons: Rounded, active state styling];
    C --> C3[State Management: Rename/reuse `forecastRange` state (type `number`) to store selected years];
    C3 --> C3a[Update `onClick` for buttons to set `forecastRange` (1, 5, 10, 15)];
    C --> C4[Adapt `runForecast` Function (Line ~93)];
    C4 --> C4a[Ensure `forecastRange` state is correctly passed to `calculateFutureAssetCosts` as `forecastRangeInYears`];

    A --> D[Phase 3: Enhanced Text & Value Display (As per image)];
    D --> D1[For Donut Chart ("Forecasted Costs by Year")];
    D1 --> D1a[Calculate Total Value (e.g., sum of `barChartData.datasets[0].data`)];
    D1 --> D1b[Implement Centered Text: "Total Sales" (static), "Accumulated Earnings" (static), and dynamic total value. Use Chart.js plugin or positioned HTML];
    
    D --> D2[For Pie Chart ("Cost by Category")];
    D2 --> D2a[Calculate Total Value (e.g., sum of `pieChartData.datasets[0].data`)];
    D2 --> D2b[Implement Text Display: "Total Net Worth" (static), "Accumulated Net Worth" (static), and dynamic total value. Similar method to Donut];

    B5 --> E;
    C4a --> E;
    D2b --> E[End Phases: Technical Implementation Plan Complete];
```

**Detailed Steps:**

**Phase 1: Visual Styling Implementation**
1.  **Setup Global Styles:**
    *   Define the suggested color palette (Primary: `#5A3FFF`, Tints: `#7C6BFF`, `#9D94FF`, `#BEBEFF`, `#DFDFFF`) in a readily accessible way (e.g., as constants in the JS file or as CSS custom properties if preferred).
    *   Ensure the `Inter` font is available. If not already part of the project, import it (e.g., via Google Fonts in [`src/app/globals.css`](src/app/globals.css) or [`src/app/layout.tsx`](src/app/layout.tsx)).
2.  **Style Chart Containers in [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx):**
    *   For each of the three chart divs (around lines 499, 503, 508), update Tailwind CSS classes to achieve:
        *   Rounded corners (e.g., `rounded-xl` or `rounded-2xl`).
        *   Appropriate padding (e.g., `p-6`).
        *   A subtle shadow (e.g., `shadow-lg` or `shadow-md`).
3.  **Update "Forecasted Costs by Year" Chart (Currently Bar Chart):**
    *   **Change Chart Type:** Modify the import from `react-chartjs-2` to use `Doughnut` instead of `Bar`. Update the component usage from `<Bar ... />` to `<Doughnut ... />`.
    *   **Data:** In `barChartData.datasets[0]`, update `backgroundColor` to be an array of the new palette colors.
    *   **Options:**
        *   Set `cutout: '70%'` (or similar) in the chart options to create the doughnut hole.
        *   Adjust legend display as needed (the example image has a minimal or no legend for the donut).
        *   Configure tooltips for the new style.
    *   **Title:** Ensure the title "Forecasted Costs by Year" uses the `Inter` font. This might be handled by global font settings or specific chart title font options.
4.  **Update "Cost by Category" Chart (Pie Chart):**
    *   **Data:** In `pieChartData.datasets[0]`, update `backgroundColor` to be an array of the new palette colors.
    *   **Options:** Adjust legend display and tooltips for the new style.
    *   **Title:** Ensure the title "Cost by Category" uses the `Inter` font.
5.  **Update "Cost Per Unit by Community" Chart (Bar Chart):**
    *   **Data:** In `costPerUnitChartData.datasets[0]`, update `backgroundColor` to use the primary color from the new palette (e.g., `#5A3FFF`).
    *   **Options:** Style grid lines and axis labels (ticks, titles) to use the `Inter` font and potentially adjust colors for better harmony with the new theme.
    *   **Title:** Ensure the title "Cost Per Unit by Community" uses the `Inter` font.

**Phase 2: Timeframe Filter Implementation**
1.  **Remove Old Dropdown:** In [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx), delete the JSX for the "Forecast Range (Years)" select dropdown (around lines 421-431).
2.  **Add New Timeframe Buttons UI:**
    *   Create a new div to hold the buttons: "1 Year", "5 Years", "10 Years", "15 Years".
    *   Style these buttons using Tailwind CSS for a modern look (e.g., rounded, appropriate padding, hover effects, and distinct styling for the active button).
3.  **State Management:**
    *   The existing `forecastRange` state (`useState<5 | 10 | 15>(5)`) can be reused. Its type might need to be adjusted if it was strictly `5 | 10 | 15` to `number` to accommodate `1`.
    *   Implement `onClick` handlers for each new button to call `setForecastRange` with the corresponding value (1, 5, 10, or 15).
4.  **Adapt `runForecast` Function:**
    *   The `runForecast` function (around line 93) already depends on `forecastRange`. Ensure this state is correctly used and passed as `forecastRangeInYears` to the `calculateFutureAssetCosts` utility. No major changes should be needed here if `forecastRange` state is updated correctly by the new buttons.

**Phase 3: Enhanced Text & Value Display (Matching Image)**
1.  **For Donut Chart ("Forecasted Costs by Year" - to be styled as "Total Sales"):**
    *   **Calculate Total Value:** Sum the values in `barChartData.datasets[0].data`.
    *   **Implement Centered Text:**
        *   Display the static text "Total Sales" (as the main title, replacing "Forecasted Costs by Year" visually if desired, or as a prominent label).
        *   Display the static sub-text "Accumulated Earnings".
        *   Display the dynamic calculated total value prominently.
        *   This can be achieved using a Chart.js plugin that draws text in the center of the doughnut chart or by absolutely positioning HTML elements over the chart canvas.
2.  **For Pie Chart ("Cost by Category" - to be styled as "Total Net Worth"):**
    *   **Calculate Total Value:** Sum the values in `pieChartData.datasets[0].data`.
    *   **Implement Text Display:**
        *   Display the static text "Total Net Worth" (as the main title, replacing "Cost by Category" visually if desired, or as a prominent label).
        *   Display the static sub-text "Accumulated Net Worth".
        *   Display the dynamic calculated total value prominently.
        *   Use a similar method as for the Donut chart (Chart.js plugin or positioned HTML).

This plan provides a comprehensive guide for the required changes.