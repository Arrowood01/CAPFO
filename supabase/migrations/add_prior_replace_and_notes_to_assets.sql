-- Add Prior Replace and Notes fields to assets table
-- Migration: add_prior_replace_and_notes_to_assets.sql

-- Add prior_replace column to track previous replacement date
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS prior_replace DATE;

-- Add notes column for additional information
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN assets.prior_replace IS 'Date of the most recent replacement for this asset';
COMMENT ON COLUMN assets.notes IS 'Additional notes or comments about the asset';

-- Optional: Create an index on prior_replace for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_assets_prior_replace ON assets(prior_replace);

-- Optional: Update RLS policies if needed (uncomment if using Row Level Security)
-- No changes needed to existing RLS policies for these columns