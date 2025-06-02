-- Change alert_threshold_percent from INTEGER to NUMERIC to support decimal values
ALTER TABLE community_settings
ALTER COLUMN alert_threshold_percent TYPE NUMERIC USING alert_threshold_percent::NUMERIC;

-- Update the default value to match (0.80 = 80%)
ALTER TABLE community_settings
ALTER COLUMN alert_threshold_percent SET DEFAULT 0.80;