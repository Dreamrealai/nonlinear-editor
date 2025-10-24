-- =============================================================================
-- Fix MED-022: Database Schema Redundancy - Consolidate Duration Columns
-- =============================================================================
-- Issue: The assets table has TWO duration columns:
--   1. duration_seconds (line 43) - CANONICAL, used throughout application
--   2. duration_sec (line 48) - REDUNDANT, only used in 2 places
--
-- Solution:
--   1. Copy any data from duration_sec to duration_seconds (if not already set)
--   2. Drop the redundant duration_sec column
--   3. Application code already uses duration_seconds consistently
-- =============================================================================

-- Step 1: Ensure duration_seconds has data from duration_sec if needed
-- This is a safety measure in case any records only have duration_sec populated
UPDATE assets
SET duration_seconds = duration_sec
WHERE duration_seconds IS NULL
  AND duration_sec IS NOT NULL;

-- Step 2: Drop the redundant duration_sec column
ALTER TABLE assets DROP COLUMN IF EXISTS duration_sec;

-- Step 3: Add comment to document the canonical column
COMMENT ON COLUMN assets.duration_seconds IS 'Duration of media in seconds (canonical duration field)';

-- =============================================================================
-- Verification Query (run manually after migration):
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'assets' AND column_name LIKE '%duration%';
--
-- Expected result: Only 'duration_seconds' column should exist
-- =============================================================================
