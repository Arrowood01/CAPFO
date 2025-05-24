# Visual Overhaul Plan to Match Reference Image

**Overall Goal:** Transform the application's UI to closely match the provided reference image, focusing on layout, color scheme, typography, and component styling to create a clean, modern SaaS feel.

**User Feedback Incorporated:**
*   The current `primary` blue in `tailwind.config.ts` will be **replaced** with the new vibrant blue (`#0D69FF`) and its corresponding dark/light variants.
*   The sidebar's top-left branding will be the text "**ek**".
*   The main dashboard chart will use "Cost Per Unit by Community" data, presented as a vertical bar chart, styled with the new blue color scheme.

---

**Phase 1: Setup & Base Styling**

1.  **Update Tailwind Configuration (`tailwind.config.ts`)**:
    *   **Primary Color Update:**
        *   Change `theme.extend.colors.primary.DEFAULT` to `#0D69FF`.
        *   Define `theme.extend.colors.primary.dark` (e.g., `#0052CC`).
        *   Define `theme.extend.colors.primary.light` (e.g., `#3C82F6`).
    *   **Add New Theme Colors:**
        *   `contentBg: '#F4F7FE'`
        *   `statCardBlueBg: '#E7F0FF'`
        *   `statCardRedBg: '#FFEAEA'`
        *   `statCardIconBlue: '#0D69FF'`
        *   `statCardIconRed: '#FF6B6B'`
        *   `statCardTextBlue: '#0D69FF'`
        *   `statCardTextRed: '#D9534F'`
        *   `sidebarTextActive: '#FFFFFF'`
        *   `sidebarTextInactive: '#A7BCFF'`
        *   `sidebarActiveBg: '#2575FF'`
        *   `tableHeaderBg: '#FFFFFF'`
        *   `tableHeaderText: '#A0AEC0'`
        *   `tableRowHoverBg: '#F9FAFB'`
        *   `tableDivider`: '#E2E8F0'`
        *   `searchText`: `#A0AEC0'`
        *   `iconGray`: `#A0AEC0'`
        *   `whiteCardBg`: `#FFFFFF'`
        *   `defaultText`: `'#374151'` (Tailwind's `gray-700`)
        *   `titleText`: `'#1F2937'` (Tailwind's `gray-800`)
    *   Ensure `Inter` font is correctly configured.

2.  **Update Global Styles (`src/app/globals.css`)**:
    *   Set `body` background to `bg-contentBg`.
    *   Update base text color to `text-defaultText`.
    *   Ensure Inter font (400, 700 weights) is imported.
    *   Keep existing sticky table header `th` styles.
    *   Remove/adjust any conflicting global styles.

---

**Phase 2: Layout Overhaul (`src/app/layout.tsx` and New Components)**

1.  **Create `Sidebar.tsx` Component (`src/components/Sidebar.tsx`)**:
    *   **Styling:** Fixed position, full height, `w-64`, `bg-primary`, `px-6 py-8`.
    *   **Content:**
        *   Top: "ek" text logo (`text-white text-2xl font-bold mb-10`).
        *   Navigation Links: Next.js `<Link>`, `flex items-center gap-3 px-4 py-3 rounded-lg text-sidebarTextInactive hover:bg-sidebarActiveBg hover:text-sidebarTextActive transition-colors duration-150`. Active state: `bg-sidebarActiveBg text-sidebarTextActive`.
        *   Icons (`lucide-react`): `HomeIcon`, `Briefcase`, `BarChart3`, `Settings`.

2.  **Create `TopBar.tsx` Component (`src/components/TopBar.tsx`)**:
    *   **Styling:** `bg-whiteCardBg`, `px-6 py-4`, `border-b border-tableDivider` or `shadow-sm`.
    *   **Content (Flex layout):**
        *   Left: Page Title (`<h1 className="text-2xl font-semibold text-titleText">Dashboard</h1>` - dynamic).
        *   Right:
            *   Search Bar: `<input type="search" placeholder="Search..." className="bg-gray-100 text-sm rounded-lg px-4 py-2 w-64 focus:ring-primary focus:border-primary placeholder-searchText" />` + Search icon.
            *   Icon Group (placeholders): Bookmark, Notification Bell, User Avatar (`text-iconGray`).

3.  **Update Root Layout (`src/app/layout.tsx`)**:
    *   Remove old `aside`. Add `<Sidebar />`.
    *   Main content wrapper (`div className="flex-1 flex flex-col ml-64"`):
        *   Add `<TopBar />` at the top.
        *   `main` element: `bg-contentBg`, `p-6` or `p-8`.
    *   Review footer.

---

**Phase 3: Dashboard Page Overhaul (`src/app/dashboard/page.tsx`)**

*   **Mermaid Diagram of Target Dashboard Layout:**
    ```mermaid
    graph TD
        DashboardPage[Dashboard Page: bg-contentBg, p-6/8] --> PageTitleHeader[H1: "Capital Asset Forecast" (Styled: text-2xl font-semibold text-titleText mb-6/8)]
        DashboardPage --> MainContentGrid[Main Content Area: Grid/Flex Layout]

        MainContentGrid --> LeftColumn[Left Column: space-y-6/8]
        LeftColumn --> StatCardsRow[Stat Cards Row: grid grid-cols-1 md:grid-cols-3 gap-6]
        StatCardsRow --> StatCardTotalSales["StatCard: At-Risk Assets (Primary BG, White Text, Icon)"]
        StatCardsRow --> StatCardTotalCheckout["StatCard: Reserve Balance (Light Blue BG, Blue Text, Icon)"]
        StatCardsRow --> StatCardAddToCart["StatCard: Forecasted Cost (Light Red BG, Red Text, Icon)"]

        LeftColumn --> MainChartCard[Card: Cost Per Unit by Community]
        MainChartCard --> MainChartTitle["H2: Cost Per Unit by Community (text-lg font-semibold text-titleText)"]
        MainChartCard --> MainChartDropdown["Dropdown: Weekly (Optional)"]
        MainChartCard --> MainVerticalBarChart["Vertical Bar Chart Component (Cost Per Unit)"]

        LeftColumn --> OrdersTableCard[Card: Forecasted Assets Table]
        OrdersTableCard --> OrdersTitle["H2: Forecasted Assets (text-lg font-semibold text-titleText)"]
        OrdersTableCard --> OrdersTable["Table Component"]

        MainContentGrid --> RightColumn[Right Column: space-y-6/8, w-1/3 or fixed width]
        RightColumn --> TopSalesCard[Card: Cost by Category]
        TopSalesCard --> TopSalesTitle["H2: Cost by Category (text-lg font-semibold text-titleText)"]
        TopSalesCard --> TopSalesDoughnutChart["Doughnut Chart Component"]

        RightColumn --> RecentTransactionsCard[Card: Recent Transactions (Placeholder/Simplified)]
        RecentTransactionsCard --> TransactionsTitle["H2: Recent Transactions (text-lg font-semibold text-titleText)"]
        RecentTransactionsCard --> TransactionsList["List of Transactions"]

        subgraph Card Styling
            direction LR
            CardBase["Base: bg-whiteCardBg rounded-xl shadow-md p-6 border border-tableDivider"]
        end
    ```

1.  **Update Main Container:** Root `div` with `className="space-y-8"`. `h1` "Capital Asset Forecast" styled: `text-2xl font-semibold text-titleText mb-6`.

2.  **Implement Stat Cards Section:**
    *   `div` with `className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"`.
    *   **Modify `StatCard.tsx`:** Props: `title`, `value`, `icon`, `bgColorClass`, `textColorClass`, `iconColorClass?`, `valueTextColorClass?`.
    *   **Instantiate `StatCard`s:**
        *   "At-Risk Assets": `value={overdueAssetsCount}`, `bgColorClass="bg-primary"`, `textColorClass="text-white"`, `icon`: `ShieldAlert` (or similar) `text-white`.
        *   "Reserve Balance": `value={formattedReserveBalance}`, `bgColorClass="bg-statCardBlueBg"`, `textColorClass="text-statCardTextBlue"`, `valueTextColorClass="text-titleText"`, `icon`: `Landmark` (or similar) `text-statCardIconBlue`.
        *   "Forecasted Cost": `value={formattedForecastedCost}`, `bgColorClass="bg-statCardRedBg"`, `textColorClass="text-statCardTextRed"`, `valueTextColorClass="text-titleText"`, `icon`: `TrendingUp` (or similar) `text-statCardIconRed`.

3.  **Implement Main Dashboard Area (Two-Column Layout):** `div` with `className="grid grid-cols-1 lg:grid-cols-3 gap-6"`.

4.  **Left Column Content (`lg:col-span-2 space-y-6`):**
    *   **Main Chart Card (Cost Per Unit by Community):**
        *   Container `div`: `className="bg-whiteCardBg rounded-xl shadow-md p-6 border border-tableDivider"`.
        *   Title `h2`: `className="text-lg font-semibold text-titleText mb-4"`. Text: "Cost Per Unit by Community".
        *   Chart: Adapt existing `costPerUnitChartData` to a **vertical bar chart**. Style with new blue color scheme.
    *   **Forecasted Assets Table Card:**
        *   Container `div`: `className="bg-whiteCardBg rounded-xl shadow-md p-6 border border-tableDivider"`.
        *   Title `h2`: `className="text-lg font-semibold text-titleText mb-4"`.
        *   Table Styling:
            *   `<table>`: `className="min-w-full bg-white text-sm"`.
            *   `<thead>`: `className="bg-tableHeaderBg text-left text-xs font-medium text-tableHeaderText uppercase"`.
            *   `<th>`: `className="px-4 py-3"`.
            *   `<tbody>`: `className="divide-y divide-tableDivider"`.
            *   `<tr>`: `className={finalRowClass + " hover:bg-tableRowHoverBg"}`.
            *   `<td>`: `className="px-4 py-2 whitespace-nowrap text-defaultText"`.

5.  **Right Column Content (`lg:col-span-1 space-y-6`):**
    *   **Cost by Category Chart Card:**
        *   Container `div`: `className="bg-whiteCardBg rounded-xl shadow-md p-6 border border-tableDivider"`.
        *   Title `h2`: `className="text-lg font-semibold text-titleText mb-4"`. Text: "Cost by Category".
        *   Chart: Existing Pie/Doughnut chart (`pieChartData`). Style colors to match reference.
    *   **Recent Transactions Card (Placeholder):**
        *   Container `div`: `className="bg-whiteCardBg rounded-xl shadow-md p-6 border border-tableDivider"`.
        *   Title `h2`: `className="text-lg font-semibold text-titleText mb-4"`. Text: "Recent Transactions".
        *   Content: Placeholder message.

---

**Phase 4: Styling Other Pages (Settings, Import, etc.)**

*   Wrap main content sections in cards: `bg-whiteCardBg rounded-xl shadow-md p-6 border border-tableDivider`.
*   Apply new table styling to any tables on these pages.
*   Ensure primary buttons use the updated `bg-primary`.

---

**Phase 5: Review and Refine**

*   Test responsiveness.
*   Review text contrasts, font sizes.
*   Adjust spacing, shadows for polish.

---