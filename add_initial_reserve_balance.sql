-- Add initial_reserve_balance column to community_settings table
ALTER TABLE community_settings
ADD COLUMN IF NOT EXISTS initial_reserve_balance NUMERIC DEFAULT 0;

-- Optional: Add a comment to describe the column
COMMENT ON COLUMN community_settings.initial_reserve_balance IS 'Starting reserve balance for the community';