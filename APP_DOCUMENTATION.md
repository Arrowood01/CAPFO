# Capital Asset Forecasting Tool - Documentation

## Overview
The Capital Asset Forecasting Tool (CAPFO) is a Next.js application designed to help organizations manage and forecast capital asset replacements. It provides comprehensive asset tracking, financial forecasting, and data visualization capabilities.

## Core Features

### 1. Asset Management
- **Import Assets**: Bulk import assets from Excel/CSV files
- **Asset Tracking**: Track assets by community, category, unit number, and installation date
- **Category Management**: Automatic category creation during import
- **Asset Details**: Store purchase price, serial numbers, notes, and replacement history

### 2. Financial Forecasting
- **Replacement Forecasting**: Calculate when assets need replacement based on lifespan
- **Cost Projections**: Project future replacement costs with inflation
- **Reserve Analysis**: Track reserve balances and investment returns
- **Community-Specific Settings**: Different inflation rates, investment rates, and deposits per community

### 3. Dashboard Analytics
- **Visual Charts**: 
  - Forecasted costs by year (bar chart)
  - Cost breakdown by category (progress bars)
  - Cost per unit by community (horizontal bar chart)
- **Key Metrics**:
  - Total assets in forecast period
  - Total communities
  - Total forecast cost
  - Average cost per unit per year
- **Health Alerts**: Warnings for overdue assets, underfunding, and low reserves

### 4. Data Import System
- **File Upload**: Support for XLSX files
- **Column Mapping**: Flexible mapping of Excel columns to database fields
- **Data Transformation**: 
  - Date parsing (including MMDD/YYYY format)
  - Price parsing and formatting
  - Category name standardization
- **Batch Processing**: Handles large imports (2000+ rows) in batches of 50
- **Progress Tracking**: Real-time import progress indicator

## Technical Architecture

### Frontend Stack
- **Framework**: Next.js 15.3.2 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Authentication**: Supabase Auth

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with email/password
- **File Processing**: XLSX library for Excel parsing

### Key Components

#### Pages
1. **`/` (Home)**: Landing page with login prompt
2. **`/login`**: Authentication page
3. **`/dashboard`**: Main analytics and forecasting dashboard
4. **`/import`**: Asset import wizard
5. **`/settings`**: Global and community-specific settings

#### Core Components
- **Navigation**: Top navigation bar with user menu
- **AuthGuard**: Protects routes requiring authentication
- **StatCard**: Displays key metrics with gradients
- **HealthAlertBanner**: Shows system warnings
- **ModernForecastChart**: Bar chart for yearly forecasts
- **CategoryBreakdown**: Progress bars for category costs
- **VisualSeparator**: Decorative dividers

#### Import Components
- **FileUpload**: Handles XLSX file uploads
- **ColumnMapper**: Maps Excel columns to database fields
- **TransformedDataPreview**: Shows processed data before import

### Database Schema

#### Tables
1. **assets**
   - id, unit_number, serial_number, model, make
   - install_date, purchase_price, notes
   - category_id (FK), community_id (FK)
   - created_at, prior_replace

2. **categories**
   - id, name
   - lifespan (years)
   - avg_replacement_cost

3. **communities**
   - id, name
   - unit_count

4. **community_settings**
   - community_id (FK)
   - inflation_rate, investment_rate
   - forecast_years, annual_deposit
   - initial_reserve_balance, target_reserve_balance

5. **settings**
   - key, value (for global settings)

## Current Limitations & Known Issues

### 1. Asset Display Logic
- **Issue**: Dashboard only shows assets due for replacement within forecast period
- **Impact**: If 2109 assets exist but only 724 shown, the rest are either:
  - Overdue (replacement year in the past)
  - Due beyond forecast period (>15 years out)
- **"Total Assets" is misleading** - actually shows "Assets in Forecast Period"

### 2. Overdue Asset Handling
- Overdue assets are identified but not included in forecasts
- No mechanism to show immediate replacement needs
- May lead to underestimating capital requirements

### 3. Import Limitations
- All assets must have a category (rows without categories are skipped)
- Date parsing may fail for non-standard formats
- No validation for duplicate assets

### 4. Filtering Constraints
- Dashboard requires at least one filter (community or category) to show data
- Cannot view all assets across all communities without selection
- No search functionality for specific assets

## Configuration & Settings

### Global Settings
- **Inflation Rate**: Default annual inflation percentage
- **Investment Rate**: Default return on reserves
- **Forecast Years**: Default forecast period

### Community-Specific Settings
- Override global rates per community
- Set annual deposits and reserve targets
- Configure initial reserve balances

### Category Configuration
- **Lifespan**: Expected years until replacement
- **Average Replacement Cost**: Baseline cost for forecasting

## User Workflows

### 1. Initial Setup
1. Create communities in settings
2. Import assets via Excel upload
3. Configure inflation and investment rates
4. Set reserve balances and targets

### 2. Asset Import Process
1. Upload XLSX file (data starts at row 10)
2. Map columns to fields:
   - Required: Model or Unit Number
   - Optional: Make, Serial Number, Purchase Price, Install Date, Notes, Prior Replace
3. Select target community
4. Review transformed data
5. Confirm import (processes in batches)

### 3. Forecasting Workflow
1. Select forecast range (1, 5, 10, or 15 years)
2. Choose communities to analyze
3. Filter by category if needed
4. View charts and financial projections
5. Export results to CSV

### 4. Asset Review
1. Filter to show at-risk assets only
2. View life usage indicators (color-coded)
3. Export asset list for maintenance planning

## Data Processing Rules

### Date Handling
- Accepts Excel date numbers
- Parses standard date strings
- Special handling for MMDD/YYYY format
- Invalid dates retained as strings

### Category Management
- Auto-creates new categories during import
- Case-insensitive matching
- Preserves original capitalization

### Financial Calculations
- Compounds inflation annually
- Applies investment returns to reserves
- Tracks deposits and expenses by year
- Maintains running reserve balances

## Security & Access Control
- Email/password authentication via Supabase
- Protected routes with AuthGuard
- User context available throughout app
- Logout functionality in navigation

## Future Enhancement Opportunities
1. Include overdue assets in forecasts
2. Add asset search and filtering
3. Implement asset status tracking (active/inactive)
4. Create maintenance scheduling features
5. Add photo upload capabilities
6. Generate PDF reports
7. Implement role-based access control
8. Add audit trails for changes
9. Create mobile-responsive views
10. Add bulk edit capabilities