-- =============================================================================
-- Deprecate timeline_state_jsonb Column
-- =============================================================================
-- Migration: 20251025100000_deprecate_timeline_state_jsonb
-- Date: 2025-10-25
-- Issue: NEW-MED-004
--
-- Purpose:
--   Deprecate the timeline_state_jsonb column in the projects table.
--   This column is no longer used as of 2025-10-23. All timeline data is now
--   stored in the dedicated timelines table for better separation of concerns.
--
-- Background:
--   - Double writes to this column were removed on 2025-10-23
--   - All read operations now use the timelines table exclusively
--   - Code analysis confirmed no active usage of this column
--   - Column is retained for backward compatibility only
--
-- Migration Strategy:
--   - Add deprecation comment to the column
--   - DO NOT drop the column (retained for true backward compatibility)
--   - Create trigger to prevent accidental writes
--   - Document migration path for any legacy code
--
-- Related Files:
--   - /lib/saveLoad.ts - Timeline save/load logic
--   - /docs/migrations/TIMELINE_STATE_DEPRECATION.md - Migration documentation
-- =============================================================================

-- Add deprecation comment to the column
COMMENT ON COLUMN projects.timeline_state_jsonb IS
  'DEPRECATED as of 2025-10-23: This column is no longer used. All timeline data is now stored in the timelines table for better data separation and query performance. This column is retained for backward compatibility only. DO NOT USE in new code. See /docs/migrations/TIMELINE_STATE_DEPRECATION.md for migration details.';

-- Create a trigger function to log warnings when this column is updated
-- This helps catch any legacy code that might still be writing to this column
CREATE OR REPLACE FUNCTION warn_timeline_state_jsonb_deprecated()
RETURNS TRIGGER AS $$
BEGIN
  -- Only raise notice if the column is being explicitly updated
  -- (Allow default value on INSERT to pass through)
  IF TG_OP = 'UPDATE' AND (NEW.timeline_state_jsonb IS DISTINCT FROM OLD.timeline_state_jsonb) THEN
    RAISE NOTICE 'DEPRECATION WARNING: timeline_state_jsonb column is deprecated. Use timelines table instead. Project ID: %', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to warn on updates to the deprecated column
DROP TRIGGER IF EXISTS warn_deprecated_timeline_state ON projects;
CREATE TRIGGER warn_deprecated_timeline_state
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION warn_timeline_state_jsonb_deprecated();

-- Add index comment to mark the default value index as deprecated
COMMENT ON TABLE projects IS
  'Core projects table. Note: timeline_state_jsonb column is deprecated - use timelines table for timeline data.';

-- =============================================================================
-- Migration Notes
-- =============================================================================
--
-- For developers:
--   - Use the timelines table for all timeline operations
--   - Read: SELECT timeline_data FROM timelines WHERE project_id = ?
--   - Write: UPSERT INTO timelines (project_id, timeline_data, updated_at)
--   - See /lib/saveLoad.ts for reference implementation
--
-- Rollback:
--   If you need to rollback this migration, run:
--   DROP TRIGGER IF EXISTS warn_deprecated_timeline_state ON projects;
--   DROP FUNCTION IF EXISTS warn_timeline_state_jsonb_deprecated();
--   COMMENT ON COLUMN projects.timeline_state_jsonb IS NULL;
--   COMMENT ON TABLE projects IS NULL;
--
-- Future removal:
--   This column may be removed in a future major version after confirming
--   no production systems depend on it. Before removal:
--   1. Monitor trigger warnings for 90+ days
--   2. Verify no external integrations use this column
--   3. Confirm all legacy code has been migrated
--   4. Create data export for historical records
-- =============================================================================
