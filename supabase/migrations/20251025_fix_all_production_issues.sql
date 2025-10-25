-- =============================================================================
-- COMPREHENSIVE PRODUCTION FIX - Run this in Supabase SQL Editor
-- Date: 2025-10-25
-- Purpose: Fix ALL critical production errors
-- =============================================================================

-- =============================================================================
-- 1. Fix project_backups table schema (Critical - 90+ errors/hour)
-- =============================================================================
DO $$
BEGIN
    -- Check if table exists and has correct columns
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'project_backups'
    ) THEN
        -- Add missing columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'project_backups' AND column_name = 'backup_name'
        ) THEN
            ALTER TABLE project_backups ADD COLUMN backup_name text;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'project_backups' AND column_name = 'project_data'
        ) THEN
            ALTER TABLE project_backups ADD COLUMN project_data jsonb;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'project_backups' AND column_name = 'timeline_data'
        ) THEN
            ALTER TABLE project_backups ADD COLUMN timeline_data jsonb;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'project_backups' AND column_name = 'assets_snapshot'
        ) THEN
            ALTER TABLE project_backups ADD COLUMN assets_snapshot jsonb DEFAULT '[]'::jsonb;
        END IF;

        -- Drop incorrect columns if they exist
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'project_backups' AND column_name = 'backup_data'
        ) THEN
            ALTER TABLE project_backups DROP COLUMN IF EXISTS backup_data;
        END IF;

        RAISE NOTICE 'Fixed project_backups table schema';
    END IF;
END $$;

-- =============================================================================
-- 2. Fix user_profiles RLS infinite recursion (Critical - Settings page broken)
-- =============================================================================

-- Drop ALL existing policies on user_profiles first
DROP POLICY IF EXISTS "user_profiles_own_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_own_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_service_all" ON user_profiles;

-- Create a materialized view for admin status to avoid recursion
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_users AS
SELECT id FROM user_profiles WHERE tier = 'admin';

-- Create index for performance
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_id_idx ON admin_users(id);

-- Recreate policies WITHOUT circular references
CREATE POLICY "user_profiles_own_select"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "user_profiles_own_update"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin policy using the materialized view (no recursion!)
CREATE POLICY "user_profiles_admin_select"
  ON user_profiles FOR SELECT TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

CREATE POLICY "user_profiles_admin_update"
  ON user_profiles FOR UPDATE TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Service role has full access
CREATE POLICY "user_profiles_service_all"
  ON user_profiles FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Refresh the admin users view
REFRESH MATERIALIZED VIEW admin_users;

-- =============================================================================
-- 3. Create missing user_preferences table
-- =============================================================================
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

-- Users can only access their own preferences
CREATE POLICY "user_preferences_own_select"
  ON user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_own_insert"
  ON user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_own_update"
  ON user_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_own_delete"
  ON user_preferences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- 4. Fix audit_logs table policies (prevent recursion)
-- =============================================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "audit_logs_admin_select" ON audit_logs;

-- Recreate admin policy using the materialized view
CREATE POLICY "audit_logs_admin_select"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- =============================================================================
-- 5. Create subscription_status table for subscription data
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscription_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'inactive',
  plan text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subscription_status_user_unique unique (user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_status_user_id ON subscription_status(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status_stripe_id ON subscription_status(stripe_subscription_id);

ALTER TABLE subscription_status ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscription
CREATE POLICY "subscription_status_own_select"
  ON subscription_status FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage subscriptions
CREATE POLICY "subscription_status_service_all"
  ON subscription_status FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 6. Create function to refresh admin users view
-- =============================================================================
CREATE OR REPLACE FUNCTION refresh_admin_users()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_users;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh on user_profiles changes
CREATE OR REPLACE FUNCTION trigger_refresh_admin_users()
RETURNS trigger AS $$
BEGIN
  -- Only refresh if tier changed to/from admin
  IF (OLD.tier = 'admin' OR NEW.tier = 'admin') AND OLD.tier != NEW.tier THEN
    PERFORM refresh_admin_users();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_admin_users_on_tier_change ON user_profiles;
CREATE TRIGGER refresh_admin_users_on_tier_change
  AFTER UPDATE OF tier ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_admin_users();

-- =============================================================================
-- 7. Ensure rate limiting function exists
-- =============================================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid primary key default gen_random_uuid(),
  rate_key text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rate_limits_unique_key_window unique (rate_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window ON rate_limits(rate_key, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

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

GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, INTEGER) TO anon;

-- =============================================================================
-- 8. Fix cleanup trigger for auto backups
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_auto_backups()
RETURNS trigger AS $$
BEGIN
  DELETE FROM project_backups
  WHERE id IN (
    SELECT id
    FROM project_backups
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

-- =============================================================================
-- 9. Refresh schema cache
-- =============================================================================
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- 10. Verify fixes
-- =============================================================================
DO $$
DECLARE
  backup_cols_ok BOOLEAN;
  user_prefs_ok BOOLEAN;
  admin_view_ok BOOLEAN;
  rate_limit_ok BOOLEAN;
BEGIN
  -- Check project_backups columns
  SELECT COUNT(*) = 4 INTO backup_cols_ok
  FROM information_schema.columns
  WHERE table_name = 'project_backups'
    AND column_name IN ('backup_name', 'project_data', 'timeline_data', 'assets_snapshot');

  -- Check user_preferences table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_preferences'
  ) INTO user_prefs_ok;

  -- Check admin_users materialized view
  SELECT EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE matviewname = 'admin_users'
  ) INTO admin_view_ok;

  -- Check rate limit function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'increment_rate_limit'
  ) INTO rate_limit_ok;

  RAISE NOTICE '=== VERIFICATION RESULTS ===';
  RAISE NOTICE 'Backup columns fixed: %', backup_cols_ok;
  RAISE NOTICE 'User preferences table created: %', user_prefs_ok;
  RAISE NOTICE 'Admin users view created: %', admin_view_ok;
  RAISE NOTICE 'Rate limit function exists: %', rate_limit_ok;

  IF backup_cols_ok AND user_prefs_ok AND admin_view_ok AND rate_limit_ok THEN
    RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
  ELSE
    RAISE NOTICE '⚠️ Some fixes may not have applied correctly. Please review.';
  END IF;
END $$;