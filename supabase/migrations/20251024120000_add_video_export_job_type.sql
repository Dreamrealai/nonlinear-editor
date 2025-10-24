-- =============================================================================
-- Add video-export job type to processing_jobs
-- =============================================================================
-- Migration to add 'video-export' job type and priority field
-- =============================================================================

-- Add video-export to job_type enum
do $$
begin
  alter type job_type add value if not exists 'video-export';
exception
  when duplicate_object then null;
end$$;

-- Add priority column to processing_jobs table
do $$
begin
  alter table processing_jobs add column if not exists priority integer default 0;
exception
  when duplicate_column then null;
end$$;

-- Add index on priority for queue ordering
create index if not exists processing_jobs_priority_idx on processing_jobs(priority desc, created_at asc)
  where status in ('pending', 'processing');

-- Comment on new column
comment on column processing_jobs.priority is 'Job priority (higher number = higher priority, default 0)';

-- =============================================================================
-- End of Migration
-- =============================================================================
