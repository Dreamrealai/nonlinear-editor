-- =============================================================================
-- EMERGENCY PRODUCTION FIX - Run this in Supabase SQL Editor
-- Date: 2025-10-25
-- Purpose: Fix critical production errors affecting 4,800+ errors/day
-- =============================================================================

-- Check if backup table exists and has correct schema
DO $$
BEGIN
    -- Check if assets_snapshot column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'project_backups'
        AND column_name = 'assets_snapshot'
    ) THEN
        -- Add missing columns if they don't exist
        ALTER TABLE project_backups
        ADD COLUMN IF NOT EXISTS backup_name text,
        ADD COLUMN IF NOT EXISTS project_data jsonb,
        ADD COLUMN IF NOT EXISTS timeline_data jsonb,
        ADD COLUMN IF NOT EXISTS assets_snapshot jsonb DEFAULT '[]'::jsonb;

        -- Drop the incorrect backup_data column if it exists
        ALTER TABLE project_backups
        DROP COLUMN IF EXISTS backup_data;

        RAISE NOTICE 'Fixed project_backups table schema';
    ELSE
        RAISE NOTICE 'project_backups table schema is already correct';
    END IF;
END $$;

-- Ensure rate limiting function exists
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  rate_key TEXT,
  window_seconds INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  window_start_time TIMESTAMPTZ;
  current_count INTEGER;
  result_count INTEGER;
BEGIN
  window_start_time := DATE_TRUNC('second', NOW() - INTERVAL '1 second' * (EXTRACT(EPOCH FROM NOW())::INTEGER % window_seconds));

  INSERT INTO rate_limits (rate_key, window_start, request_count, updated_at)
  VALUES (increment_rate_limit.rate_key, window_start_time, 1, NOW())
  ON CONFLICT (rate_key, window_start)
  DO UPDATE SET
    request_count = rate_limits.request_count + 1,
    updated_at = NOW()
  RETURNING request_count INTO result_count;

  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';

  RETURN result_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, INTEGER) TO anon;

-- Refresh schema cache (this will happen automatically, but we can trigger it)
NOTIFY pgrst, 'reload schema';

-- Verify the fix
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'project_backups'
ORDER BY ordinal_position;