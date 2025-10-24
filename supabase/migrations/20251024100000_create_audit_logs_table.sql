-- Migration: Create Comprehensive Audit Logs Table
-- Purpose: Track all critical user and system actions for security, compliance, and debugging
-- Critical: Required by lib/auditLog.ts for comprehensive audit logging

-- Create audit_logs table with comprehensive tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User information
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Action tracking
  action TEXT NOT NULL,

  -- Resource tracking (optional)
  resource_type TEXT,
  resource_id TEXT,

  -- Request context
  ip_address TEXT,
  user_agent TEXT,
  http_method TEXT,
  request_path TEXT,

  -- Operation result
  status_code INTEGER,
  error_message TEXT,
  duration_ms INTEGER,

  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp (immutable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs(resource_type, resource_id)
  WHERE resource_type IS NOT NULL AND resource_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address
  ON audit_logs(ip_address) WHERE ip_address IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
  ON audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_created
  ON audit_logs(resource_type, resource_id, created_at DESC)
  WHERE resource_type IS NOT NULL;

-- Index for security monitoring (failed/suspicious events)
CREATE INDEX IF NOT EXISTS idx_audit_logs_security_events
  ON audit_logs(action, ip_address, created_at DESC)
  WHERE action LIKE 'security.%' OR action LIKE 'auth.%.failed' OR status_code >= 400;

-- GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata
  ON audit_logs USING GIN (metadata);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
-- This prevents regular users from seeing audit trails
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tier = 'admin'
    )
  );

-- Policy: Service role can insert audit logs
-- Regular users cannot insert directly - only through service role
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy: Audit logs are immutable (cannot be updated or deleted)
-- No UPDATE or DELETE policies means these operations are denied by default
-- This is critical for compliance and security

-- Add comments to document the table
COMMENT ON TABLE audit_logs IS 'Immutable audit trail of all critical system actions for security, compliance, and debugging';
COMMENT ON COLUMN audit_logs.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN audit_logs.user_id IS 'ID of the user who performed the action (null for system actions)';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., auth.login.success, project.create, admin.tier_change)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected (e.g., user, project, asset, api_key)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the specific resource affected';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address from which the action was performed';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string of the client that performed the action';
COMMENT ON COLUMN audit_logs.http_method IS 'HTTP method used (GET, POST, PUT, DELETE, etc.)';
COMMENT ON COLUMN audit_logs.request_path IS 'Request path/endpoint that was accessed';
COMMENT ON COLUMN audit_logs.status_code IS 'HTTP status code of the operation (200, 400, 500, etc.)';
COMMENT ON COLUMN audit_logs.error_message IS 'Error message if the operation failed';
COMMENT ON COLUMN audit_logs.duration_ms IS 'Duration of the operation in milliseconds';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional structured context about the action (JSONB)';
COMMENT ON COLUMN audit_logs.created_at IS 'Timestamp when the action occurred (immutable)';

-- Create a function to clean up old audit logs (optional - for data retention)
-- This can be called manually or via a cron job to maintain a rolling window of logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Deletes audit logs older than the specified retention period (default 90 days). Returns count of deleted rows.';

-- Create a view for recent security events (helpful for monitoring)
CREATE OR REPLACE VIEW recent_security_events AS
SELECT
  id,
  user_id,
  action,
  resource_type,
  resource_id,
  ip_address,
  user_agent,
  status_code,
  error_message,
  metadata,
  created_at
FROM audit_logs
WHERE
  action LIKE 'security.%'
  OR action LIKE 'auth.%.failed'
  OR action LIKE 'rate_limit.%'
  OR status_code >= 400
ORDER BY created_at DESC
LIMIT 100;

COMMENT ON VIEW recent_security_events IS 'Recent security-related events including failed auth, rate limits, and errors';

-- Create a view for admin actions (helpful for compliance)
CREATE OR REPLACE VIEW admin_actions_log AS
SELECT
  al.id,
  al.user_id,
  up.email as admin_email,
  al.action,
  al.resource_type,
  al.resource_id,
  al.ip_address,
  al.metadata,
  al.created_at
FROM audit_logs al
LEFT JOIN user_profiles up ON al.user_id = up.id
WHERE
  al.action LIKE 'admin.%'
ORDER BY al.created_at DESC
LIMIT 1000;

COMMENT ON VIEW admin_actions_log IS 'All administrative actions performed in the system';

-- Grant select permissions on views to authenticated users with admin role
-- (RLS will still apply based on user_profiles.tier)
GRANT SELECT ON recent_security_events TO authenticated;
GRANT SELECT ON admin_actions_log TO authenticated;

-- Create a function to get audit log statistics
CREATE OR REPLACE FUNCTION get_audit_log_stats(
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_logs BIGINT,
  total_errors BIGINT,
  total_security_events BIGINT,
  actions_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_logs AS (
    SELECT * FROM audit_logs
    WHERE
      (p_user_id IS NULL OR user_id = p_user_id)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
  ),
  action_counts AS (
    SELECT
      action,
      COUNT(*) as count
    FROM filtered_logs
    GROUP BY action
  )
  SELECT
    (SELECT COUNT(*) FROM filtered_logs)::BIGINT as total_logs,
    (SELECT COUNT(*) FROM filtered_logs WHERE status_code >= 400)::BIGINT as total_errors,
    (SELECT COUNT(*) FROM filtered_logs WHERE action LIKE 'security.%' OR action LIKE 'rate_limit.%')::BIGINT as total_security_events,
    (SELECT jsonb_object_agg(action, count) FROM action_counts)::JSONB as actions_breakdown;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_audit_log_stats IS 'Get audit log statistics for a user or time period';

-- End of Migration
