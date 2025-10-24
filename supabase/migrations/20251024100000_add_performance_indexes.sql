-- =============================================================================
-- Performance Optimization: Additional Database Indexes
-- =============================================================================
-- Adds missing indexes to improve query performance for common access patterns
-- =============================================================================

-- Projects table indexes
-- Index for user_id lookups (most common query pattern)
create index if not exists projects_user_id_created_idx
  on projects(user_id, created_at desc);

-- Index for updated_at sorting (for recent projects)
create index if not exists projects_updated_at_idx
  on projects(updated_at desc);

-- Assets table indexes
-- Composite index for project_id + type queries
create index if not exists assets_project_type_idx
  on assets(project_id, type);

-- Index for created_at sorting within project
create index if not exists assets_project_created_idx
  on assets(project_id, created_at desc);

-- Index for user_id lookups (for user quota checks)
create index if not exists assets_user_id_idx
  on assets(user_id);

-- Index for source type filtering
create index if not exists assets_source_idx
  on assets(source);

-- Scenes table indexes
-- Composite index for asset_id lookups with time ordering
create index if not exists scenes_asset_time_idx
  on scenes(asset_id, start_ms);

-- Index for project_id (for bulk operations)
create index if not exists scenes_project_idx
  on scenes(project_id);

-- Chat messages indexes (already has project_id and created_at indexes)
-- Add composite index for efficient pagination
create index if not exists chat_messages_project_created_idx
  on chat_messages(project_id, created_at desc);

-- Processing jobs additional indexes
-- Index for user + status queries (dashboard views)
create index if not exists processing_jobs_user_status_idx
  on processing_jobs(user_id, status);

-- Index for recent jobs per project
create index if not exists processing_jobs_project_created_idx
  on processing_jobs(project_id, created_at desc);

-- =============================================================================
-- Partial Indexes for Active/Pending Jobs
-- =============================================================================
-- These partial indexes make queries for active jobs extremely fast

-- Index for active jobs (pending or processing)
create index if not exists processing_jobs_active_idx
  on processing_jobs(created_at desc)
  where status in ('pending', 'processing');

-- Index for failed jobs (for error monitoring)
create index if not exists processing_jobs_failed_idx
  on processing_jobs(created_at desc)
  where status = 'failed';

-- =============================================================================
-- Comments
-- =============================================================================

comment on index projects_user_id_created_idx is 'Optimizes project listing by user with sort';
comment on index assets_project_type_idx is 'Optimizes asset filtering by project and type';
comment on index assets_project_created_idx is 'Optimizes asset pagination within projects';
comment on index scenes_asset_time_idx is 'Optimizes scene lookups with time-based ordering';
comment on index chat_messages_project_created_idx is 'Optimizes chat message pagination';
comment on index processing_jobs_user_status_idx is 'Optimizes job status queries per user';
comment on index processing_jobs_active_idx is 'Partial index for active jobs only';

-- =============================================================================
-- End of Migration
-- =============================================================================
