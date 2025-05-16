# Plan: Update Import Functionality and UI Styling

This document outlines the plan to update the application to support importing a "Category" field from a spreadsheet and to improve the UI styling with a light theme.

## Phase 1: Implement Category Import Functionality

1.  **Update Column Mapping ([`src/components/import/ColumnMapper.tsx`](src/components/import/ColumnMapper.tsx)):**
    *   Add "Category" as an option in the `MAPPING_OPTIONS` array. This will allow users to map a column from their spreadsheet to the "Category" field.

2.  **Update Import Logic ([`src/app/import/page.tsx`](src/app/import/page.tsx)):**
    *   **Data Transformation (`transformData` function):**
        *   Modify this function to recognize the newly mapped "Category" field and include the category name (e.g., "Refrigerator", "Microwave") in the `transformedRow` data. The key for this in the `transformedRow` should be `category_name`.
    *   **"Assign" Step UI & Logic:**
        *   The current "Assign Community & Category" step will be modified.
        *   The "Assign to Category" dropdown will be removed from this step.
        *   The step will be renamed to "Assign Community".
        *   The `selectedCategoryId` state and related logic will be removed from this page component.
    *   **Category Data Handling (`handleActualImport` function):**
        *   Fetch the existing list of categories from the database (as it currently does).
        *   When preparing data for submission (`assetsToInsert`):
            *   For each row in `transformedData`:
                *   Extract the `category_name` (e.g., "Microwave") from the row.
                *   Check if this `category_name` exists in the fetched list of categories.
                *   **If the category exists:** Use its `id` as `category_id` for the asset.
                *   **If the category does not exist:**
                    *   Insert the new category name into the `categories` table in the database.
                    *   Retrieve the `id` of this newly created category.
                    *   Use this new `id` as `category_id` for the asset.
                *   Include this `category_id` when inserting the asset into the `assets` table.
    *   **`TransformedDataPreview` Component ([`src/components/import/TransformedDataPreview.tsx`](src/components/import/TransformedDataPreview.tsx)):**
        *   This component will need to be updated to display the `category_name` for each row of data (which will be part of the `transformedData` objects). The prop passing a single `categoryId` for the whole batch will be removed.

## Phase 2: UI Styling Improvements

1.  **Global Styles ([`src/app/globals.css`](src/app/globals.css)):**
    *   **Light Theme Enforcement:**
        *   Set the default background to white (`#ffffff`) and default foreground (text) to black (`#000000` or a very dark gray like `#171717`).
        *   Define primary blue color variables (e.g., `--primary-blue: #007bff; --primary-blue-hover: #0056b3;`).
        *   Remove or comment out the `@media (prefers-color-scheme: dark)` block.
    *   **Text Field Styling:**
        *   Ensure all text input fields, select dropdowns, and text areas use black (or very dark gray) font for the entered text.

2.  **Component-Specific Styling Review:**
    *   Review and update Tailwind CSS classes across relevant components to align with the new white and blue color palette. This includes:
        *   [`src/app/import/page.tsx`](src/app/import/page.tsx)
        *   [`src/components/import/ColumnMapper.tsx`](src/components/import/ColumnMapper.tsx)
        *   [`src/components/import/FileUpload.tsx`](src/components/import/FileUpload.tsx)
        *   [`src/components/import/TransformedDataPreview.tsx`](src/components/import/TransformedDataPreview.tsx)
        *   [`src/components/Navigation.tsx`](src/components/Navigation.tsx)
        *   Other pages and layout files (e.g., [`src/app/layout.tsx`](src/app/layout.tsx), [`login/page.tsx`](src/app/login/page.tsx)).
    *   This involves replacing dark backgrounds with light ones, adjusting text colors, and updating button styles to use shades of blue.

## Visual Plan (Import Flow)

```mermaid
graph TD
    A[Upload XLSX File] --> B(Map Spreadsheet Columns);
    B -- User maps a column to 'Category' --> B;
    B --> C(Assign Community for Batch);
    C --> D(Preview Data with Per-Row Categories);
    D --> E(Confirm and Import);
    E -- Each asset saved with its own category_id (new categories created if needed) --> F[Import Successful];