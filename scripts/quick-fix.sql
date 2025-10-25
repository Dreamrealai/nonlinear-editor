-- Quick fix for critical production error
-- Adds missing assets_snapshot column to project_backups table

ALTER TABLE project_backups
ADD COLUMN IF NOT EXISTS assets_snapshot jsonb DEFAULT '[]'::jsonb;

-- Verify the column was added
SELECT
  'assets_snapshot column' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'project_backups' AND column_name = 'assets_snapshot'
    )
    THEN '✅ FIXED'
    ELSE '❌ FAILED'
  END as status;
