-- =============================================================================
-- Add Webhook Support to Processing Jobs
-- =============================================================================
-- Adds webhook_url column to processing_jobs table to support
-- webhook notifications when long-running operations complete
-- =============================================================================

-- Add webhook_url column
alter table processing_jobs
  add column if not exists webhook_url text;

-- Add webhook delivery status tracking
alter table processing_jobs
  add column if not exists webhook_delivered_at timestamptz,
  add column if not exists webhook_attempts integer default 0,
  add column if not exists webhook_last_error text;

-- Add index for jobs with pending webhooks
create index if not exists processing_jobs_webhook_pending_idx
  on processing_jobs(status, webhook_url)
  where webhook_url is not null
    and status in ('completed', 'failed')
    and webhook_delivered_at is null;

-- =============================================================================
-- Comments
-- =============================================================================

comment on column processing_jobs.webhook_url is 'HTTPS URL to receive webhook notification when job completes or fails';
comment on column processing_jobs.webhook_delivered_at is 'Timestamp when webhook was successfully delivered';
comment on column processing_jobs.webhook_attempts is 'Number of webhook delivery attempts';
comment on column processing_jobs.webhook_last_error is 'Last webhook delivery error message';

-- =============================================================================
-- End of Migration
-- =============================================================================
