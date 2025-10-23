# Database Migrations

This directory contains SQL migrations for the Supabase database schema.

## Applying Migrations

### Option 1: Supabase Dashboard (Production)

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Migrations**
3. Click **New Migration**
4. Copy and paste the SQL from the migration file
5. Click **Run** to apply the migration

### Option 2: Supabase CLI (Local Development)

If you have Supabase CLI installed and running locally:

```bash
# Apply all pending migrations
supabase db push

# Or apply migrations by starting local dev
supabase start
```

### Option 3: SQL Editor (Production)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the SQL from the migration file
5. Click **Run** to execute

## Migration Files

### `20250101000000_init_schema.sql`
Initial database schema including:
- Core tables (projects, assets, scenes, timelines)
- Keyframe editor tables (scene_frames, frame_edits)
- Chat assistant tables
- Storage buckets and RLS policies

### `20251022000000_fix_projects_rls.sql`
Fixes for Row Level Security policies on projects table.

### `20250123000000_add_processing_jobs.sql`
**NEW** - Processing jobs table for tracking async operations:
- Tracks video generation, upscaling, audio generation, etc.
- Job status tracking (pending, processing, completed, failed)
- Provider integration (Google Veo, fal.ai, ElevenLabs, Suno)
- Progress monitoring and error handling
- Helper functions and views

**IMPORTANT**: This migration must be applied before using the video-to-audio feature.

## Migration Order

Migrations should be applied in chronological order (by filename timestamp):
1. `20250101000000_init_schema.sql`
2. `20251022000000_fix_projects_rls.sql`
3. `20250123000000_add_processing_jobs.sql`

## Verifying Migrations

After applying migrations, verify they were successful:

```sql
-- Check if processing_jobs table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'processing_jobs';

-- Check enum types
SELECT typname
FROM pg_type
WHERE typname IN ('job_status', 'job_type');

-- View table structure
\d processing_jobs
```

## Rollback

To rollback a migration, you'll need to manually write the reverse SQL. For `processing_jobs`:

```sql
-- Drop table and related objects
DROP TABLE IF EXISTS processing_jobs CASCADE;
DROP VIEW IF EXISTS active_processing_jobs;
DROP VIEW IF EXISTS recent_completed_jobs;
DROP FUNCTION IF EXISTS get_job_by_provider_id(text, text);
DROP FUNCTION IF EXISTS update_job_status(uuid, job_status, integer, text, jsonb);
DROP FUNCTION IF EXISTS set_processing_jobs_started_at();
DROP FUNCTION IF EXISTS update_processing_jobs_updated_at();
DROP TYPE IF EXISTS job_status CASCADE;
DROP TYPE IF EXISTS job_type CASCADE;
```

## Notes

- All migrations include RLS (Row Level Security) policies
- Migrations are idempotent where possible (use `IF NOT EXISTS`, `ON CONFLICT`, etc.)
- Always backup your database before applying migrations to production
