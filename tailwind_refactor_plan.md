# Tailwind CSS Refactoring Plan

This document outlines the plan to refactor the Dashboard, Settings, and Import pages to achieve a consistent "clean card-like design" with improved spacing and structure using Tailwind CSS.

## I. General Styling Principles

1.  **Standard Page Wrapper**:
    *   Apply `className="p-6 max-w-7xl mx-auto space-y-8"` to the outermost `div` of each page. This standardizes padding, maximum width, centers the content, and provides consistent vertical spacing between major sections.

2.  **Consistent Card Styling**:
    *   Wrap major content sections (e.g., forms, data displays, logical groups of controls) in:
        ```html
        <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
          {/* Card content goes here */}
        </div>
        ```
    *   This provides a uniform look for distinct sections with a white background, medium shadow, larger border radius, padding, and a light gray border.

3.  **Standardized Headings**:
    *   Page Titles (`<h1>`): `className="text-3xl font-bold mb-6"` (adjust `mb-X` as needed for spacing below the title).
    *   Section Card Titles (`<h2>`): `className="text-xl font-semibold mb-4"` (for titles within cards).
    *   Sub-section Titles (`<h3>`): `className="text-lg font-semibold mb-2"` (if needed within cards).
    *   Text color should be inherited from global styles (typically dark gray or black).

4.  **Uniform Form Inputs**:
    *   Wrap each label-input pair (or a small group of related inputs) in:
        ```html
        <div className="flex flex-col gap-2">
          {/* Label and Input */}
        </div>
        ```
    *   Labels (`<label>`): `className="text-sm font-medium"`.
    *   Inputs (`<input>`, `<select>`, `<textarea>`): `className="p-2 rounded border border-gray-300"`. This provides consistent padding, border radius, and border style.

5.  **Consistent Button Styling**:
    *   **Primary Action Buttons** (e.g., Save, Confirm, Add):
        `className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"`
    *   **Secondary Action Buttons** (e.g., Cancel, Start Over):
        `className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"`
    *   **Warning/Destructive Buttons** (e.g., Delete):
        `className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"`
    *   **Small/Action Buttons** (e.g., Edit in a table, specific toggle-like buttons): Adapt above styles with smaller padding if needed (e.g., `px-3 py-1 text-xs`). Consider context for color (e.g., edit could be yellow or primary blue).
    *   Ensure `disabled:` states are handled (e.g., `disabled:bg-gray-400 disabled:cursor-not-allowed`).

6.  **Grid/Flexbox for Layouts**:
    *   Continue using Tailwind's grid (`grid grid-cols-X gap-Y`) and flexbox (`flex gap-Y`) utilities for arranging elements within cards.
    *   Ensure consistent `gap-X` usage (e.g., `gap-4` or `gap-6` for most layouts).

7.  **Child Component Refactoring**:
    *   Note: Child components imported into these pages (e.g., `FileUpload`, `ColumnMapper`, `TransformedDataPreview` on the Import page) will likely require their own internal refactoring to align their elements (inputs, buttons, tables, etc.) with these new standards. This plan primarily addresses the top-level page structure.

## II. Page-Specific Refinements

### A. `src/app/dashboard/page.tsx`

*   **Main Page Wrapper**: Apply standard page wrapper.
*   **Card Styling**:
    *   Update existing card-like sections (`bg-white shadow-md rounded-lg p-6`) to the new standard: `className="bg-white shadow-md rounded-xl p-6 border border-gray-200"`. This applies to:
        *   Forecast Health Check
        *   Suggested Monthly Deposit
        *   Filters & Settings
        *   Forecasted Costs by Year (Doughnut chart)
        *   Cost by Category (Pie chart)
        *   Cost Per Unit by Community (Bar chart)
        *   Forecasted Assets Table
    *   Ensure `<h2>` titles within these cards use `className="text-xl font-semibold mb-4"`.
*   **Spacing**:
    *   Chart grid: Change `gap-8` to `gap-6`.
    *   Maintain consistent `mb-8` or `space-y-8` between cards.
*   **Form Inputs (in Filters & Settings card)**:
    *   **Community Select**: Apply standard form group, label, and select styles. Retain `h-24` for multi-select visibility if appropriate.
    *   **Category Select**: Apply standard form group, label, and select styles.
    *   **Status Select**: Apply standard form group, label, and select styles.
    *   **"Show At-Risk Only" Checkbox**: Existing styling is likely acceptable.
*   **Buttons**:
    *   **Forecast Range Buttons**: Clarify if these should conform to the primary button style or retain their toggle-like appearance. If conforming, apply primary style, otherwise, ensure their existing styling is clean and consistent.
    *   **Refresh Forecast Button**: Apply primary button style.
    *   **Export to CSV Button**: Apply primary button style (currently green).

### B. `src/app/settings/page.tsx`

*   **Main Page Wrapper**: Apply standard page wrapper (replacing `bg-white text-black min-h-screen`).
*   **Card Styling**:
    *   Update existing `<section>` elements (lines 663, 694, 806) from `border-[var(--border-blue)]` to the new standard: `className="bg-white shadow-md rounded-xl p-6 border border-gray-200"`.
*   **Headings**:
    *   `<h1>`: `className="text-3xl font-bold mb-6"`.
    *   `<h2>`: `className="text-xl font-semibold mb-4"`.
*   **Form Inputs**: Apply standard form group, label, and input styles to:
    *   Global Inflation input.
    *   New Community name and unit count inputs.
    *   Editing Community name and unit count inputs.
    *   Community Forecast Settings inputs (dynamically generated within `<details>`).
    *   New Asset Category inputs (name, lifespan, cost).
    *   Editing Asset Category inputs (in table).
*   **Buttons**:
    *   "Save Rate": Primary style.
    *   "Add Community": Primary style.
    *   "Save Name/Units" (Community edit): Primary style.
    *   "Cancel" (Community edit): Secondary style.
    *   "Edit Name/Units": Primary or distinct small edit button style.
    *   "Delete" (Community): Warning/Destructive style.
    *   "Save Forecast Settings": Primary style.
    *   "Add Category": Primary style.
    *   Table action buttons ("Save", "Cancel", "Edit", "Delete" for categories): Convert text links to small styled buttons (e.g., Save: green/blue, Cancel: gray, Edit: yellow/blue, Delete: red).

### C. `src/app/import/page.tsx`

*   **Main Page Wrapper**: Apply standard page wrapper.
*   **Header**:
    *   `<h1>`: `className="text-3xl font-bold mb-2"`.
    *   `<p>`: `className="text-base mb-6"`.
*   **Step Content Sections (Card Styling)**:
    *   Wrap each step's content in a standard card: `<div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">`.
    *   Add a standard `<h2>` title to each card:
        *   "Step 1: Upload File" (for `FileUpload` component)
        *   "Step 2: Map Columns" (for `ColumnMapper` component)
        *   "Step 3: Assign Community" (for the assign community JSX block)
        *   "Step 4: Preview & Import" (for `TransformedDataPreview` component)
*   **Debug Displays**: Wrap these in standard cards as well, with `<h3 className="text-lg font-semibold mb-2">` titles.
*   **Form Inputs (Assign Community step)**:
    *   **Community Select**: Apply standard form group, label, and select styles.
*   **Buttons (Assign Community step)**:
    *   "Start Over": Secondary button style.
    *   "Confirm Assignment & Preview": Primary button style.
*   **Child Components (`FileUpload`, `ColumnMapper`, `TransformedDataPreview`)**: These will need internal refactoring to align their elements with the new styling standards.

## III. Conceptual Page Structure (Mermaid Diagram)

```mermaid
graph TD
    A[Page: Root Div (`p-6 max-w-7xl mx-auto space-y-8`)] --> B{Page Title (`h1`)};
    A --> C1[Section Card 1 (`bg-white shadow-md rounded-xl p-6 border border-gray-200`)];
    A --> C2[Section Card 2 (...)];
    A --> CX[...More Section Cards...];

    C1 --> D1[Section Title (`h2`)];
    C1 --> E1[Content Block 1];
    C1 --> E2[Content Block 2: Form];

    E2 --> F1[Form Group (`flex flex-col gap-2`)];
    F1 --> G1[Label (`text-sm font-medium`)];
    F1 --> H1[Input/Select (`p-2 rounded border border-gray-300`)];
    E2 --> F2[Form Group (...)];
    E2 --> I1[Primary Button (`bg-blue-600 ...`)];
    E2 --> I2[Secondary Button (`bg-gray-200 ...`)];

    subgraph "Example: Dashboard Chart Section"
        C_Chart[Chart Card] --> H_Chart_Title[Chart Title (`h2`)]
        C_Chart --> Grid_Charts[Chart Grid (`grid grid-cols-1 lg:grid-cols-2 gap-6`)]
        Grid_Charts --> Chart_Wrapper1[Chart Element 1 Wrapper]
        Grid_Charts --> Chart_Wrapper2[Chart Element 2 Wrapper]
    end