/**
 * Comprehensive Audit Logging System
 *
 * Tracks all critical user and system actions for security, compliance, and debugging.
 * Audit logs are immutable and stored in the database with full context.
 *
 * Features:
 * - User authentication events (login, logout, failed attempts)
 * - Project operations (create, update, delete, export)
 * - Asset operations (upload, delete)
 * - Admin operations (tier changes, user deletions)
 * - API key usage
 * - Rate limit violations
 * - IP address and user agent tracking
 * - Structured metadata for each event
 *
 * Usage:
 * ```typescript
 * import { auditLog, AuditAction } from '@/lib/auditLog';
 *
 * // In API routes with request context
 * await auditLog({
 *   userId: user.id,
 *   action: AuditAction.PROJECT_CREATE,
 *   resourceType: 'project',
 *   resourceId: project.id,
 *   metadata: { title: project.title },
 *   request,
 * });
 *
 * // For admin operations
 * await auditLog({
 *   userId: admin.id,
 *   action: AuditAction.ADMIN_TIER_CHANGE,
 *   resourceType: 'user',
 *   resourceId: targetUserId,
 *   metadata: { oldTier: 'free', newTier: 'premium' },
 *   request,
 * });
 * ```
 */

import { serverLogger } from '@/lib/serverLogger';
import { createServiceSupabaseClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import type { NextRequest } from 'next/server';
import type { Json } from '@/types/supabase';

/**
 * Comprehensive list of all auditable actions in the system
 */
export enum AuditAction {
  // Authentication Events
  AUTH_LOGIN_SUCCESS = 'auth.login.success',
  AUTH_LOGIN_FAILED = 'auth.login.failed',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_SIGNUP = 'auth.signup',
  AUTH_PASSWORD_RESET_REQUEST = 'auth.password_reset.request',
  AUTH_PASSWORD_RESET_COMPLETE = 'auth.password_reset.complete',
  AUTH_PASSWORD_CHANGE = 'auth.password_change',
  AUTH_SESSION_REFRESH = 'auth.session.refresh',

  // Project Operations
  PROJECT_CREATE = 'project.create',
  PROJECT_UPDATE = 'project.update',
  PROJECT_DELETE = 'project.delete',
  PROJECT_EXPORT = 'project.export',
  PROJECT_SHARE = 'project.share',
  PROJECT_DUPLICATE = 'project.duplicate',

  // Asset Operations
  ASSET_UPLOAD = 'asset.upload',
  ASSET_DELETE = 'asset.delete',
  ASSET_UPDATE = 'asset.update',
  ASSET_DOWNLOAD = 'asset.download',

  // Admin Operations
  ADMIN_TIER_CHANGE = 'admin.tier_change',
  ADMIN_USER_DELETE = 'admin.user_delete',
  ADMIN_USER_SUSPEND = 'admin.user_suspend',
  ADMIN_USER_RESTORE = 'admin.user_restore',
  ADMIN_CACHE_CLEAR = 'admin.cache_clear',
  ADMIN_SETTINGS_UPDATE = 'admin.settings_update',

  // API Key Operations
  API_KEY_CREATE = 'api_key.create',
  API_KEY_DELETE = 'api_key.delete',
  API_KEY_USED = 'api_key.used',
  API_KEY_REVOKE = 'api_key.revoke',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'rate_limit.exceeded',
  RATE_LIMIT_WARNING = 'rate_limit.warning',

  // Payment Operations
  PAYMENT_SUBSCRIPTION_CREATE = 'payment.subscription.create',
  PAYMENT_SUBSCRIPTION_CANCEL = 'payment.subscription.cancel',
  PAYMENT_SUBSCRIPTION_UPDATE = 'payment.subscription.update',
  PAYMENT_CHECKOUT_SUCCESS = 'payment.checkout.success',
  PAYMENT_CHECKOUT_FAILED = 'payment.checkout.failed',

  // User Account Operations
  USER_ACCOUNT_DELETE = 'user.account.delete',
  USER_PROFILE_UPDATE = 'user.profile.update',
  USER_SETTINGS_UPDATE = 'user.settings.update',

  // Video/Media Processing
  VIDEO_GENERATE_REQUEST = 'video.generate.request',
  VIDEO_GENERATE_COMPLETE = 'video.generate.complete',
  VIDEO_GENERATE_FAILED = 'video.generate.failed',
  IMAGE_GENERATE_REQUEST = 'image.generate.request',
  AUDIO_GENERATE_REQUEST = 'audio.generate.request',

  // Frame Operations
  FRAME_EDIT_REQUEST = 'frame.edit.request',
  FRAME_EDIT_COMPLETE = 'frame.edit.complete',
  FRAME_EDIT_FAILED = 'frame.edit.failed',
  FRAME_EDIT_UNAUTHORIZED = 'frame.edit.unauthorized',

  // Security Events
  SECURITY_UNAUTHORIZED_ACCESS = 'security.unauthorized_access',
  SECURITY_CSRF_BLOCKED = 'security.csrf_blocked',
  SECURITY_INVALID_TOKEN = 'security.invalid_token',
  SECURITY_SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
}

/**
 * Resource types that can be audited
 */
export type AuditResourceType =
  | 'user'
  | 'project'
  | 'asset'
  | 'api_key'
  | 'subscription'
  | 'payment'
  | 'export_job'
  | 'video'
  | 'image'
  | 'audio'
  | 'frame'
  | 'settings'
  | 'cache';

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  /** User ID who performed the action (null for system actions) */
  userId: string | null;

  /** Action performed */
  action: AuditAction | string;

  /** Type of resource affected (optional) */
  resourceType?: AuditResourceType | string;

  /** ID of the resource affected (optional) */
  resourceId?: string;

  /** Additional structured metadata about the action */
  metadata?: Record<string, unknown>;

  /** HTTP request object for extracting IP and user agent */
  request?: NextRequest | Request;

  /** IP address (extracted from request or provided manually) */
  ipAddress?: string;

  /** User agent (extracted from request or provided manually) */
  userAgent?: string;

  /** HTTP method (extracted from request or provided manually) */
  httpMethod?: string;

  /** Request path (extracted from request or provided manually) */
  requestPath?: string;

  /** Status code of the operation (200, 400, 500, etc.) */
  statusCode?: number;

  /** Error message if the operation failed */
  errorMessage?: string;

  /** Duration of the operation in milliseconds */
  durationMs?: number;
}

/**
 * Extract IP address from request headers
 */
function extractIpAddress(request: NextRequest | Request): string {
  // Try various headers commonly used by proxies and load balancers
  const headers = request.headers;

  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    headers.get('x-client-ip') ||
    headers.get('x-cluster-client-ip') ||
    'unknown'
  );
}

/**
 * Extract user agent from request headers
 */
function extractUserAgent(request: NextRequest | Request): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Extract HTTP method from request
 */
function extractHttpMethod(request: NextRequest | Request): string {
  return request.method || 'unknown';
}

/**
 * Extract request path from request
 */
function extractRequestPath(request: NextRequest | Request): string {
  if ('nextUrl' in request) {
    // NextRequest
    return request.nextUrl.pathname;
  }
  // Standard Request
  try {
    const url = new URL(request.url);
    return url.pathname;
  } catch {
    return 'unknown';
  }
}

/**
 * Main audit logging function
 *
 * Logs an audit entry to the database. This is non-blocking and will not throw errors
 * to avoid disrupting the main application flow.
 *
 * @param entry - Audit log entry
 * @returns Promise that resolves when log is written (or fails silently)
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Check if Supabase is configured
    if (!isSupabaseServiceConfigured()) {
      serverLogger.warn(
        {
          event: 'audit.log.supabase_unavailable',
          action: entry.action,
          userId: entry.userId,
        },
        'Supabase not configured, audit log not persisted'
      );

      // Log to server logger as fallback
      serverLogger.info(
        {
          event: 'audit.log.fallback',
          ...entry,
        },
        `Audit: ${entry.action}`
      );
      return;
    }

    // Extract request context if provided
    let ipAddress = entry.ipAddress || 'unknown';
    let userAgent = entry.userAgent || 'unknown';
    let httpMethod = entry.httpMethod;
    let requestPath = entry.requestPath;

    if (entry.request) {
      ipAddress = extractIpAddress(entry.request);
      userAgent = extractUserAgent(entry.request);
      httpMethod = httpMethod || extractHttpMethod(entry.request);
      requestPath = requestPath || extractRequestPath(entry.request);
    }

    // Create service client (needs service role for audit table)
    const supabase = createServiceSupabaseClient();

    // Prepare audit log record
    const auditRecord = {
      user_id: entry.userId,
      action: entry.action,
      resource_type: entry.resourceType || null,
      resource_id: entry.resourceId || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      http_method: httpMethod || null,
      request_path: requestPath || null,
      status_code: entry.statusCode || null,
      error_message: entry.errorMessage || null,
      duration_ms: entry.durationMs || null,
      metadata: (entry.metadata || {}) as Json,
      created_at: new Date().toISOString(),
    };

    // Insert audit log with retry logic (non-blocking, fire-and-forget)
    let retryCount = 0;
    const maxRetries = 3; // Increased from 2 to 3
    let lastError = null;

    while (retryCount <= maxRetries) {
      const { error } = await supabase.from('audit_logs').insert(auditRecord);

      if (!error) {
        // Success
        serverLogger.debug(
          {
            event: 'audit.log.success',
            action: entry.action,
            userId: entry.userId,
            resourceType: entry.resourceType,
            resourceId: entry.resourceId,
            retries: retryCount,
          },
          `Audit log recorded: ${entry.action}`
        );
        return;
      }

      lastError = error;
      retryCount++;

      // Log retry attempt
      serverLogger.warn(
        {
          event: 'audit.log.retry_attempt',
          action: entry.action,
          userId: entry.userId,
          attempt: retryCount,
          maxRetries,
          error: error.message,
          code: error.code,
        },
        `Audit log insert failed, retry ${retryCount}/${maxRetries}`
      );

      // If this is a schema/permission error, don't retry
      if (
        error.code === '42501' || // insufficient_privilege
        error.code === '42P01' || // undefined_table
        error.code === '23502' || // not_null_violation
        error.code === '23503' || // foreign_key_violation
        error.code === '22P02' || // invalid_text_representation
        error.code === '23505' // unique_violation
      ) {
        serverLogger.error(
          {
            event: 'audit.log.non_retryable_error',
            action: entry.action,
            userId: entry.userId,
            error: error.message,
            code: error.code,
            hint: error.hint,
          },
          'Non-retryable error in audit log insert'
        );
        break;
      }

      // Wait before retry (exponential backoff: 200ms, 400ms, 800ms)
      if (retryCount <= maxRetries) {
        const delay = 200 * Math.pow(2, retryCount - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Log error after all retries failed
    serverLogger.error(
      {
        event: 'audit.log.insert_failed',
        action: entry.action,
        userId: entry.userId,
        error: lastError?.message,
        code: lastError?.code,
        hint: lastError?.hint,
        details: lastError?.details,
        retries: retryCount - 1,
        auditRecord: JSON.stringify(auditRecord).substring(0, 200), // Log first 200 chars
      },
      'Failed to insert audit log after retries'
    );
  } catch (error) {
    // Catch-all to prevent audit logging from breaking the application
    serverLogger.error(
      {
        event: 'audit.log.exception',
        action: entry.action,
        userId: entry.userId,
        error,
      },
      'Exception in audit logging'
    );
  }
}

/**
 * Helper function to log authentication events
 */
export async function auditAuthEvent(
  action: AuditAction,
  userId: string | null,
  request: NextRequest | Request,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLog({
    userId,
    action,
    resourceType: 'user',
    resourceId: userId || undefined,
    metadata,
    request,
  });
}

/**
 * Helper function to log rate limit violations
 */
export async function auditRateLimitViolation(
  userId: string | null,
  request: NextRequest | Request,
  limitType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLog({
    userId,
    action: AuditAction.RATE_LIMIT_EXCEEDED,
    metadata: {
      limitType,
      ...metadata,
    },
    request,
    statusCode: 429,
  });
}

/**
 * Helper function to log admin actions
 */
export async function auditAdminAction(
  adminId: string,
  action: AuditAction,
  targetUserId: string | null,
  request: NextRequest | Request,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLog({
    userId: adminId,
    action,
    resourceType: 'user',
    resourceId: targetUserId || undefined,
    metadata: {
      isAdminAction: true,
      ...metadata,
    },
    request,
  });
}

/**
 * Helper function to log project operations
 */
export async function auditProjectOperation(
  action: AuditAction,
  userId: string,
  projectId: string,
  request: NextRequest | Request,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLog({
    userId,
    action,
    resourceType: 'project',
    resourceId: projectId,
    metadata,
    request,
  });
}

/**
 * Helper function to log asset operations
 */
export async function auditAssetOperation(
  action: AuditAction,
  userId: string,
  assetId: string,
  request: NextRequest | Request,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLog({
    userId,
    action,
    resourceType: 'asset',
    resourceId: assetId,
    metadata,
    request,
  });
}

/**
 * Helper function to log payment operations
 */
export async function auditPaymentOperation(
  action: AuditAction,
  userId: string,
  request: NextRequest | Request,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLog({
    userId,
    action,
    resourceType: 'payment',
    metadata,
    request,
  });
}

/**
 * Helper function to log security events
 */
export async function auditSecurityEvent(
  action: AuditAction,
  userId: string | null,
  request: NextRequest | Request,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLog({
    userId,
    action,
    metadata: {
      securityEvent: true,
      ...metadata,
    },
    request,
    statusCode: 403,
  });
}

/**
 * Query audit logs (for admin/debugging)
 *
 * @param filters - Filters to apply to the query
 * @returns Array of audit log entries
 */
export async function queryAuditLogs(filters: {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<Array<Record<string, unknown>>> {
  try {
    if (!isSupabaseServiceConfigured()) {
      serverLogger.warn(
        {
          event: 'audit.query.supabase_unavailable',
        },
        'Supabase not configured, cannot query audit logs'
      );
      return [];
    }

    const supabase = createServiceSupabaseClient();
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters.limit || 100);

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }

    if (filters.resourceId) {
      query = query.eq('resource_id', filters.resourceId);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      serverLogger.error(
        {
          event: 'audit.query.failed',
          error: error.message,
        },
        'Failed to query audit logs'
      );
      return [];
    }

    return data || [];
  } catch (error) {
    serverLogger.error(
      {
        event: 'audit.query.exception',
        error,
      },
      'Exception querying audit logs'
    );
    return [];
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(userId?: string): Promise<{
  totalLogs: number;
  actionBreakdown: Record<string, number>;
  recentActivity: Array<Record<string, unknown>>;
}> {
  try {
    const logs = await queryAuditLogs({
      userId,
      limit: 1000,
    });

    const actionBreakdown: Record<string, number> = {};

    for (const log of logs) {
      const action = log.action as string;
      actionBreakdown[action] = (actionBreakdown[action] || 0) + 1;
    }

    return {
      totalLogs: logs.length,
      actionBreakdown,
      recentActivity: logs.slice(0, 10),
    };
  } catch (error) {
    serverLogger.error(
      {
        event: 'audit.stats.exception',
        error,
      },
      'Exception getting audit log stats'
    );
    return {
      totalLogs: 0,
      actionBreakdown: {},
      recentActivity: [],
    };
  }
}
