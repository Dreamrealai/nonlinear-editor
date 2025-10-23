-- Create rate_limits table for distributed rate limiting across server instances
-- This replaces the in-memory rate limiting with PostgreSQL-backed storage

CREATE TABLE IF NOT EXISTS public.rate_limits (
  -- Composite key: combination of identifier (IP/user) and route
  key TEXT PRIMARY KEY,

  -- Number of requests made in current window
  count INTEGER NOT NULL DEFAULT 0,

  -- When the current rate limit window resets
  reset_at TIMESTAMPTZ NOT NULL,

  -- Track when record was created for cleanup
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Track last update for monitoring
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- Index for monitoring and analytics
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON public.rate_limits(created_at);

-- Enable Row Level Security
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access rate limits (API calls from server)
-- Regular users should not be able to query or modify rate limits
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every update
CREATE TRIGGER update_rate_limits_updated_at_trigger
  BEFORE UPDATE ON public.rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rate_limits_updated_at();

-- Function to clean up expired rate limit entries
-- Run this periodically via pg_cron or scheduled task
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE reset_at < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() TO service_role;

-- Function to increment rate limit counter atomically
-- Returns the new count after increment
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  rate_key TEXT,
  window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE(current_count INTEGER, reset_time TIMESTAMPTZ) AS $$
DECLARE
  new_count INTEGER;
  reset_time TIMESTAMPTZ;
BEGIN
  -- Try to increment existing record
  UPDATE public.rate_limits
  SET count = count + 1,
      updated_at = NOW()
  WHERE key = rate_key
    AND reset_at > NOW()
  RETURNING count, reset_at INTO new_count, reset_time;

  -- If no active record exists, create a new one
  IF NOT FOUND THEN
    reset_time := NOW() + (window_seconds || ' seconds')::INTERVAL;
    INSERT INTO public.rate_limits (key, count, reset_at)
    VALUES (rate_key, 1, reset_time)
    ON CONFLICT (key) DO UPDATE
    SET count = 1,
        reset_at = reset_time,
        updated_at = NOW()
    RETURNING count, reset_at INTO new_count, reset_time;
  END IF;

  RETURN QUERY SELECT new_count, reset_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, INTEGER) TO service_role;

-- Function to check current rate limit without incrementing
CREATE OR REPLACE FUNCTION public.check_rate_limit(rate_key TEXT)
RETURNS TABLE(current_count INTEGER, reset_time TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT count, reset_at
  FROM public.rate_limits
  WHERE key = rate_key
    AND reset_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT) TO service_role;

-- Add comment for documentation
COMMENT ON TABLE public.rate_limits IS
  'Distributed rate limiting table. Stores request counts per key (IP/user + route) with automatic expiration.';

COMMENT ON COLUMN public.rate_limits.key IS
  'Composite key format: {identifier}:{route} e.g., "192.168.1.1:/api/generate" or "user-123:/api/export"';

COMMENT ON COLUMN public.rate_limits.count IS
  'Number of requests made in the current time window';

COMMENT ON COLUMN public.rate_limits.reset_at IS
  'Timestamp when the rate limit counter resets. Records with reset_at < NOW() are expired.';

COMMENT ON FUNCTION public.increment_rate_limit IS
  'Atomically increment rate limit counter. Creates new record if none exists or previous window expired.';

COMMENT ON FUNCTION public.check_rate_limit IS
  'Check current rate limit count without incrementing. Returns NULL if no active limit exists.';

COMMENT ON FUNCTION public.cleanup_expired_rate_limits IS
  'Cleanup expired rate limit entries. Should be run periodically (e.g., hourly) via cron job.';
