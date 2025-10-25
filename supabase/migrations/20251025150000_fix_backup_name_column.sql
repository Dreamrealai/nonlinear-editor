-- =============================================================================
-- Fix project_backups table - Add missing backup_name column
-- =============================================================================
-- This migration adds the backup_name column if it's missing from production
-- Safe to run multiple times (uses IF NOT EXISTS equivalent)
-- =============================================================================

-- Check if column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'project_backups'
        AND column_name = 'backup_name'
    ) THEN
        ALTER TABLE project_backups
        ADD COLUMN backup_name text NOT NULL DEFAULT 'Untitled Backup';

        RAISE NOTICE 'Added backup_name column to project_backups table';
    ELSE
        RAISE NOTICE 'backup_name column already exists in project_backups table';
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN project_backups.backup_name IS 'Human-readable name for the backup';
