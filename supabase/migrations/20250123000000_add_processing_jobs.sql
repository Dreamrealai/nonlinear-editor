-- =============================================================================
-- Processing Jobs Table
-- =============================================================================
-- Tracks long-running async operations (video generation, upscaling, audio gen, etc.)
-- Enables server-side job tracking, status monitoring, and recovery
-- =============================================================================

-- Job status enum
do $$
begin
  create type job_status as enum ('pending', 'processing', 'completed', 'failed', 'cancelled');
exception
  when duplicate_object then null;
end$$;

-- Job type enum
do $$
begin
  create type job_type as enum (
    'video-generation',
    'video-upscale',
    'video-to-audio',
    'audio-generation',
    'scene-detection',
    'audio-extraction',
    'frame-extraction',
    'frame-edit'
  );
exception
  when duplicate_object then null;
end$$;

-- Processing Jobs: Track all async operations
create table if not exists processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  asset_id uuid references assets(id) on delete set null,

  -- Job details
  job_type job_type not null,
  status job_status not null default 'pending',

  -- Provider information
  provider text not null, -- 'google-veo', 'fal.ai', 'elevenlabs', 'suno', etc.
  provider_job_id text, -- External API's operation/request ID

  -- Job configuration
  config jsonb, -- Job-specific parameters
  metadata jsonb, -- Additional metadata (model, settings, etc.)

  -- Results
  result_asset_id uuid references assets(id) on delete set null,
  result_data jsonb, -- API response data
  error_message text,

  -- Progress tracking
  progress_percentage integer default 0 check (progress_percentage >= 0 and progress_percentage <= 100),

  -- Timestamps
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz default now()
);

-- Indexes for efficient queries
create index if not exists processing_jobs_user_idx on processing_jobs(user_id);
create index if not exists processing_jobs_project_idx on processing_jobs(project_id);
create index if not exists processing_jobs_asset_idx on processing_jobs(asset_id);
create index if not exists processing_jobs_status_idx on processing_jobs(status);
create index if not exists processing_jobs_provider_job_idx on processing_jobs(provider_job_id);
create index if not exists processing_jobs_type_status_idx on processing_jobs(job_type, status);
create index if not exists processing_jobs_created_idx on processing_jobs(created_at desc);

-- Unique constraint on provider job ID (prevent duplicate tracking)
create unique index if not exists processing_jobs_provider_job_unique
  on processing_jobs(provider, provider_job_id)
  where provider_job_id is not null;

-- Enable RLS
alter table processing_jobs enable row level security;

-- RLS Policies
create policy "processing_jobs_owner_select"
  on processing_jobs for select to authenticated
  using (user_id = auth.uid());

create policy "processing_jobs_owner_insert"
  on processing_jobs for insert to authenticated
  with check (user_id = auth.uid());

create policy "processing_jobs_owner_update"
  on processing_jobs for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "processing_jobs_owner_delete"
  on processing_jobs for delete to authenticated
  using (user_id = auth.uid());

-- Function to automatically update updated_at timestamp
create or replace function update_processing_jobs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
drop trigger if exists processing_jobs_updated_at on processing_jobs;
create trigger processing_jobs_updated_at
  before update on processing_jobs
  for each row
  execute function update_processing_jobs_updated_at();

-- Function to auto-set started_at when status changes to processing
create or replace function set_processing_jobs_started_at()
returns trigger as $$
begin
  if new.status = 'processing' and old.status != 'processing' and new.started_at is null then
    new.started_at = now();
  end if;

  if (new.status = 'completed' or new.status = 'failed' or new.status = 'cancelled')
     and old.status not in ('completed', 'failed', 'cancelled')
     and new.completed_at is null then
    new.completed_at = now();
  end if;

  return new;
end;
$$ language plpgsql;

-- Trigger to auto-set timestamps
drop trigger if exists processing_jobs_auto_timestamps on processing_jobs;
create trigger processing_jobs_auto_timestamps
  before update on processing_jobs
  for each row
  execute function set_processing_jobs_started_at();

-- View for active jobs (pending or processing)
create or replace view active_processing_jobs as
select * from processing_jobs
where status in ('pending', 'processing')
order by created_at desc;

-- View for recent completed jobs (last 7 days)
create or replace view recent_completed_jobs as
select * from processing_jobs
where status in ('completed', 'failed', 'cancelled')
  and completed_at > now() - interval '7 days'
order by completed_at desc;

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function to get job by provider job ID
create or replace function get_job_by_provider_id(
  p_provider text,
  p_provider_job_id text
)
returns processing_jobs as $$
  select * from processing_jobs
  where provider = p_provider
    and provider_job_id = p_provider_job_id
  limit 1;
$$ language sql stable;

-- Function to update job status
create or replace function update_job_status(
  p_job_id uuid,
  p_status job_status,
  p_progress integer default null,
  p_error_message text default null,
  p_result_data jsonb default null
)
returns processing_jobs as $$
declare
  v_job processing_jobs;
begin
  update processing_jobs
  set
    status = p_status,
    progress_percentage = coalesce(p_progress, progress_percentage),
    error_message = coalesce(p_error_message, error_message),
    result_data = coalesce(p_result_data, result_data)
  where id = p_job_id
  returning * into v_job;

  return v_job;
end;
$$ language plpgsql;

-- =============================================================================
-- Comments
-- =============================================================================

comment on table processing_jobs is 'Tracks all long-running async operations (video gen, upscale, audio gen, etc.)';
comment on column processing_jobs.provider is 'External service provider (e.g., google-veo, fal.ai, elevenlabs, suno)';
comment on column processing_jobs.provider_job_id is 'External API operation/request/task ID for polling';
comment on column processing_jobs.config is 'Job-specific parameters (prompt, model, settings, etc.)';
comment on column processing_jobs.metadata is 'Additional metadata about the job';
comment on column processing_jobs.result_asset_id is 'Reference to the generated asset (if applicable)';
comment on column processing_jobs.result_data is 'Raw API response data';

-- =============================================================================
-- End of Migration
-- =============================================================================
