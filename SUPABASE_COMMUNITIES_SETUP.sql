-- SUPABASE SQL SETUP FOR COMMUNITIES MANAGEMENT PAGE
-- Run this SQL in your Supabase SQL Editor

-- First, let's check the current structure and add any missing columns
-- Add monthly_deposit and current_balance columns to communities table if they don't exist

-- Add monthly_deposit column (for the monthly deposit amount)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'communities' AND column_name = 'monthly_deposit') THEN
        ALTER TABLE communities ADD COLUMN monthly_deposit DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

-- Add current_balance column (for the current reserve balance)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'communities' AND column_name = 'current_balance') THEN
        ALTER TABLE communities ADD COLUMN current_balance DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

-- Update existing communities with sample data to match the React component
-- Update Presbyterian Homes Main (assuming it exists)
UPDATE communities 
SET 
    unit_count = 209,
    monthly_deposit = 35243.00,
    current_balance = 2327915.00
WHERE name ILIKE '%presbyterian%homes%main%' OR name ILIKE '%presbyterian%homes%florida%';

-- If Presbyterian Homes Main doesn't exist, insert it
INSERT INTO communities (name, unit_count, monthly_deposit, current_balance)
SELECT 'Presbyterian Homes Main', 209, 35243.00, 2327915.00
WHERE NOT EXISTS (
    SELECT 1 FROM communities 
    WHERE name ILIKE '%presbyterian%homes%main%' OR name ILIKE '%presbyterian%homes%florida%'
);

-- Insert Community North if it doesn't exist
INSERT INTO communities (name, unit_count, monthly_deposit, current_balance)
SELECT 'Community North', 150, 25000.00, 1500000.00
WHERE NOT EXISTS (SELECT 1 FROM communities WHERE name = 'Community North');

-- Insert Community South if it doesn't exist
INSERT INTO communities (name, unit_count, monthly_deposit, current_balance)
SELECT 'Community South', 180, 30000.00, 1800000.00
WHERE NOT EXISTS (SELECT 1 FROM communities WHERE name = 'Community South');

-- Create a view for easy community management that combines communities and community_settings
CREATE OR REPLACE VIEW community_management_view AS
SELECT 
    c.id,
    c.name,
    c.unit_count,
    c.monthly_deposit,
    c.current_balance,
    CASE 
        WHEN c.unit_count > 0 AND c.monthly_deposit IS NOT NULL 
        THEN c.monthly_deposit / c.unit_count 
        ELSE 0 
    END as per_unit_monthly,
    cs.annual_deposit,
    cs.investment_rate,
    cs.inflation_rate,
    cs.forecast_years,
    cs.initial_reserve_balance,
    cs.target_reserve_balance,
    cs.alert_threshold_percent,
    c.created_at,
    c.updated_at
FROM communities c
LEFT JOIN community_settings cs ON c.id = cs.community_id
ORDER BY c.name;

-- Create a function to automatically create default community_settings when a community is added
CREATE OR REPLACE FUNCTION create_default_community_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default community settings for the new community
    INSERT INTO community_settings (
        community_id,
        annual_deposit,
        monthly_per_unit,
        investment_rate,
        inflation_rate,
        forecast_years,
        initial_reserve_balance,
        target_reserve_balance,
        alert_threshold_percent
    ) VALUES (
        NEW.id,
        COALESCE(NEW.monthly_deposit * 12, 0), -- annual_deposit = monthly_deposit * 12
        CASE 
            WHEN NEW.unit_count > 0 AND NEW.monthly_deposit IS NOT NULL 
            THEN NEW.monthly_deposit / NEW.unit_count 
            ELSE 0 
        END, -- monthly_per_unit calculation
        0.005, -- default 0.5% investment rate
        0.02,  -- default 2% inflation rate
        15,    -- default 15 year forecast
        COALESCE(NEW.current_balance, 0), -- initial_reserve_balance = current_balance
        COALESCE(NEW.current_balance * 1.5, 0), -- target 150% of current balance
        0.75   -- default 75% alert threshold
    )
    ON CONFLICT (community_id) DO UPDATE SET
        annual_deposit = EXCLUDED.annual_deposit,
        monthly_per_unit = EXCLUDED.monthly_per_unit,
        initial_reserve_balance = EXCLUDED.initial_reserve_balance;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create community_settings when a community is added
DROP TRIGGER IF EXISTS trigger_create_community_settings ON communities;
CREATE TRIGGER trigger_create_community_settings
    AFTER INSERT OR UPDATE ON communities
    FOR EACH ROW
    EXECUTE FUNCTION create_default_community_settings();

-- Create a function to update community_settings when communities table is updated
CREATE OR REPLACE FUNCTION update_community_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Update existing community_settings with calculated values
    UPDATE community_settings 
    SET 
        annual_deposit = COALESCE(NEW.monthly_deposit * 12, OLD.monthly_deposit * 12, 0),
        monthly_per_unit = CASE 
            WHEN NEW.unit_count > 0 AND NEW.monthly_deposit IS NOT NULL 
            THEN NEW.monthly_deposit / NEW.unit_count 
            ELSE 0 
        END,
        initial_reserve_balance = COALESCE(NEW.current_balance, OLD.current_balance, 0)
    WHERE community_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the update trigger
DROP TRIGGER IF EXISTS trigger_update_community_settings ON communities;
CREATE TRIGGER trigger_update_community_settings
    AFTER UPDATE ON communities
    FOR EACH ROW
    EXECUTE FUNCTION update_community_settings();

-- Create RLS policies for communities table (if not already enabled)
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read all communities
CREATE POLICY IF NOT EXISTS "Users can view all communities" ON communities
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for authenticated users to insert communities
CREATE POLICY IF NOT EXISTS "Users can insert communities" ON communities
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for authenticated users to update communities
CREATE POLICY IF NOT EXISTS "Users can update communities" ON communities
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for authenticated users to delete communities
CREATE POLICY IF NOT EXISTS "Users can delete communities" ON communities
    FOR DELETE
    TO authenticated
    USING (true);

-- Update existing community_settings for the sample communities
UPDATE community_settings 
SET 
    annual_deposit = c.monthly_deposit * 12,
    monthly_per_unit = CASE 
        WHEN c.unit_count > 0 
        THEN c.monthly_deposit / c.unit_count 
        ELSE 0 
    END,
    initial_reserve_balance = c.current_balance
FROM communities c 
WHERE community_settings.community_id = c.id;

-- Show the final result
SELECT 
    'Setup Complete! Communities with settings:' as status,
    COUNT(*) as total_communities
FROM community_management_view;

-- Display all communities with their calculated values
SELECT * FROM community_management_view;