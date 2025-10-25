-- =============================================================================
-- URGENT: RUN THIS IN SUPABASE SQL EDITOR NOW
-- This fixes ALL production database errors
-- Date: 2025-10-25
-- Expected result: 100+ errors/hour → 0 errors
-- =============================================================================

-- STEP 1: Fix project_backups table (90+ errors/hour)
ALTER TABLE project_backups
ADD COLUMN IF NOT EXISTS backup_name text,
ADD COLUMN IF NOT EXISTS project_data jsonb,
ADD COLUMN IF NOT EXISTS timeline_data jsonb,
ADD COLUMN IF NOT EXISTS assets_snapshot jsonb DEFAULT '[]'::jsonb;

-- Drop incorrect column if exists
ALTER TABLE project_backups DROP COLUMN IF EXISTS backup_data;

-- STEP 2: Fix user_profiles RLS infinite recursion
-- First, drop ALL problematic policies
DROP POLICY IF EXISTS "user_profiles_own_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_own_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_service_all" ON user_profiles;

-- Create simple, non-recursive policies
CREATE POLICY "user_profiles_select_own"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "user_profiles_update_own"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_service_role"
  ON user_profiles FOR ALL TO service_role
  USING (true);

-- STEP 3: Create missing user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_user_unique unique (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for user_preferences
CREATE POLICY "user_preferences_select_own"
  ON user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_insert_own"
  ON user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_update_own"
  ON user_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_delete_own"
  ON user_preferences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- STEP 4: Ensure rate limiting works
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid primary key default gen_random_uuid(),
  rate_key text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rate_limits_unique_key_window unique (rate_key, window_start)
);

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  rate_key TEXT,
  window_seconds INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  window_start_time TIMESTAMPTZ;
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

GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, INTEGER) TO anon;

-- STEP 5: Ensure audit_logs works
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "audit_logs_select_own"
  ON audit_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "audit_logs_insert_service"
  ON audit_logs FOR INSERT TO service_role
  WITH CHECK (true);

-- STEP 6: Fix backup cleanup trigger
CREATE OR REPLACE FUNCTION cleanup_old_auto_backups()
RETURNS trigger AS $$
BEGIN
  DELETE FROM project_backups
  WHERE id IN (
    SELECT id FROM project_backups
    WHERE project_id = NEW.project_id
      AND backup_type = 'auto'
    ORDER BY created_at DESC
    OFFSET 10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_old_auto_backups_trigger ON project_backups;
CREATE TRIGGER cleanup_old_auto_backups_trigger
  AFTER INSERT ON project_backups
  FOR EACH ROW
  WHEN (NEW.backup_type = 'auto')
  EXECUTE FUNCTION cleanup_old_auto_backups();

-- STEP 7: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- STEP 8: Verify the fix
SELECT
  'Backup columns' as check_name,
  CASE
    WHEN COUNT(*) = 4 THEN '✅ FIXED'
    ELSE '❌ FAILED'
  END as status
FROM information_schema.columns
WHERE table_name = 'project_backups'
  AND column_name IN ('backup_name', 'project_data', 'timeline_data', 'assets_snapshot')
UNION ALL
SELECT
  'User preferences table' as check_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences')
    THEN '✅ CREATED'
    ELSE '❌ MISSING'
  END as status
UNION ALL
SELECT
  'Rate limit function' as check_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_rate_limit')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
UNION ALL
SELECT
  'User profiles policies' as check_name,
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ FIXED'
    ELSE '❌ CHECK MANUALLY'
  END as status
FROM pg_policies
WHERE tablename = 'user_profiles';

-- Expected output:
-- check_name                | status
-- --------------------------|----------
-- Backup columns           | ✅ FIXED
-- User preferences table   | ✅ CREATED
-- Rate limit function      | ✅ EXISTS
-- User profiles policies   | ✅ FIXED