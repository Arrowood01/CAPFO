-- Fix community_settings table to match the application code

-- 1. Add the missing initial_reserve_balance column
ALTER TABLE community_settings
ADD COLUMN IF NOT EXISTS initial_reserve_balance NUMERIC DEFAULT 0;

-- 2. Rename target_yeb to target_reserve_balance
ALTER TABLE community_settings
RENAME COLUMN target_yeb TO target_reserve_balance;

-- 3. Add comments for clarity
COMMENT ON COLUMN community_settings.initial_reserve_balance IS 'Starting reserve balance for the community';
COMMENT ON COLUMN community_settings.target_reserve_balance IS 'Target reserve balance goal for the community';