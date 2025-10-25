-- Migration: Fix Critical Production Errors
-- Purpose: Apply missing tables that are causing 500 errors
-- Date: 2025-10-25

-- =============================================================================
-- 1. Ensure processing_jobs table exists (for export queue)
-- =============================================================================
CREATE TABLE IF NOT EXISTS processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  job_type text not null,
  status text not null default 'pending',
  progress integer not null default 0,
  error_message text,
  result_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_project_id ON processing_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON processing_jobs(created_at DESC);

ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'processing_jobs'
    AND policyname = 'Users can view their own jobs'
  ) THEN
    CREATE POLICY "Users can view their own jobs"
      ON processing_jobs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =============================================================================
-- 2. Ensure project_backups table exists with CORRECT schema
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_backups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  backup_name text not null,
  backup_type text check (backup_type in ('auto', 'manual')) not null default 'auto',
  project_data jsonb not null,
  timeline_data jsonb not null,
  assets_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_project_backups_project_id ON project_backups(project_id);
CREATE INDEX IF NOT EXISTS idx_project_backups_user_id ON project_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_project_backups_created_at ON project_backups(created_at DESC);

ALTER TABLE project_backups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'project_backups'
    AND policyname = 'Users can view backups of their projects'
  ) THEN
    CREATE POLICY "Users can view backups of their projects"
      ON project_backups FOR SELECT
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = project_backups.project_id
          AND projects.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'project_backups'
    AND policyname = 'Users can create backups of their projects'
  ) THEN
    CREATE POLICY "Users can create backups of their projects"
      ON project_backups FOR INSERT
      WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = project_backups.project_id
          AND projects.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Function to clean up old auto backups (keep only last 10 per project)
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

-- Trigger to auto-cleanup after insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'cleanup_old_auto_backups_trigger'
  ) THEN
    CREATE TRIGGER cleanup_old_auto_backups_trigger
      AFTER INSERT ON project_backups
      FOR EACH ROW
      WHEN (NEW.backup_type = 'auto')
      EXECUTE FUNCTION cleanup_old_auto_backups();
  END IF;
END $$;

-- =============================================================================
-- 3. Ensure export_presets table exists with seed data
-- =============================================================================
CREATE TABLE IF NOT EXISTS export_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text,
  width integer not null,
  height integer not null,
  fps integer not null,
  bitrate_kbps integer,
  codec text,
  format text not null,
  is_custom boolean not null default false,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  
  constraint export_presets_check check (
    (is_custom = false and user_id is null) or
    (is_custom = true and user_id is not null)
  )
);

CREATE INDEX IF NOT EXISTS idx_export_presets_user_id ON export_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_export_presets_platform ON export_presets(platform);

ALTER TABLE export_presets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'export_presets'
    AND policyname = 'Anyone can view platform presets'
  ) THEN
    CREATE POLICY "Anyone can view platform presets"
      ON export_presets FOR SELECT
      USING (is_custom = false OR user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'export_presets'
    AND policyname = 'Users can create custom presets'
  ) THEN
    CREATE POLICY "Users can create custom presets"
      ON export_presets FOR INSERT
      WITH CHECK (is_custom = true AND user_id = auth.uid());
  END IF;
END $$;

-- Seed platform presets if none exist
INSERT INTO export_presets (name, platform, width, height, fps, bitrate_kbps, codec, format, is_custom)
SELECT * FROM (VALUES
  ('YouTube 1080p', 'youtube', 1920, 1080, 30, 8000, 'h264', 'mp4', false),
  ('YouTube 4K', 'youtube', 3840, 2160, 30, 45000, 'h264', 'mp4', false),
  ('Instagram Post', 'instagram', 1080, 1080, 30, 5000, 'h264', 'mp4', false),
  ('Instagram Story', 'instagram', 1080, 1920, 30, 5000, 'h264', 'mp4', false),
  ('TikTok', 'tiktok', 1080, 1920, 30, 5000, 'h264', 'mp4', false),
  ('Twitter/X', 'twitter', 1280, 720, 30, 5000, 'h264', 'mp4', false)
) AS v(name, platform, width, height, fps, bitrate_kbps, codec, format, is_custom)
WHERE NOT EXISTS (SELECT 1 FROM export_presets WHERE is_custom = false LIMIT 1);

COMMENT ON TABLE export_presets IS 'Video export presets for different platforms and custom user presets';
COMMENT ON TABLE project_backups IS 'Project backup storage for manual and automatic backups';
COMMENT ON TABLE processing_jobs IS 'Background job queue for video exports and processing';

-- =============================================================================
-- 4. Ensure rate limiting function exists
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

COMMENT ON FUNCTION public.increment_rate_limit IS 'Increments rate limit counter for a given key and returns current count';

-- =============================================================================
-- 5. Ensure audit_logs table exists
-- =============================================================================
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin users can view all logs, regular users can view their own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'audit_logs'
    AND policyname = 'Users can view their own audit logs'
  ) THEN
    CREATE POLICY "Users can view their own audit logs"
      ON audit_logs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'audit_logs'
    AND policyname = 'Service role can insert audit logs'
  ) THEN
    CREATE POLICY "Service role can insert audit logs"
      ON audit_logs FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE audit_logs IS 'Audit trail for user actions and system events';
