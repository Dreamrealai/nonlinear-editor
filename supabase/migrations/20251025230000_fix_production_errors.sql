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
-- 2. Ensure project_backups table exists
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_backups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  backup_type text not null check (backup_type in ('manual', 'auto')),
  backup_data jsonb not null,
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
