-- Migration: Add admin_audit_log table
-- Purpose: Track all admin actions for compliance and security auditing
-- Critical: Referenced by lib/api/withAuth.ts but table was missing

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_resource_type TEXT,
  target_resource_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user_id ON admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- Add composite index for filtering by admin and date range
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_created ON admin_audit_log(admin_user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
  ON admin_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Only admins can insert audit logs (system will use service role)
CREATE POLICY "Admins can insert audit logs"
  ON admin_audit_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Audit logs cannot be updated or deleted (immutable for compliance)
-- No UPDATE or DELETE policies means these operations are denied by default

-- Add comment to table
COMMENT ON TABLE admin_audit_log IS 'Immutable audit trail of all administrative actions performed in the system';
COMMENT ON COLUMN admin_audit_log.admin_user_id IS 'ID of the admin user who performed the action';
COMMENT ON COLUMN admin_audit_log.action IS 'Type of action performed (e.g., user_update, user_delete, role_change)';
COMMENT ON COLUMN admin_audit_log.target_user_id IS 'ID of the user affected by the action (if applicable)';
COMMENT ON COLUMN admin_audit_log.target_resource_type IS 'Type of resource affected (e.g., user, project, asset)';
COMMENT ON COLUMN admin_audit_log.target_resource_id IS 'ID of the resource affected';
COMMENT ON COLUMN admin_audit_log.metadata IS 'Additional context about the action (changes made, reason, etc.)';
COMMENT ON COLUMN admin_audit_log.ip_address IS 'IP address from which the action was performed';
COMMENT ON COLUMN admin_audit_log.user_agent IS 'User agent string of the client that performed the action';
