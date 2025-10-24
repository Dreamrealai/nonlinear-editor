# Audit Log Integration Examples

This document provides examples of how to integrate the comprehensive audit logging system into various API routes.

## Overview

The audit logging system tracks:

- User authentication events (login, logout, failed attempts)
- Project operations (create, update, delete, export)
- Asset operations (upload, delete)
- Admin operations (tier changes, user deletions)
- API key usage
- Rate limit violations
- Security events

## Basic Usage

```typescript
import { auditLog, AuditAction } from '@/lib/auditLog';

// Log a simple action
await auditLog({
  userId: user.id,
  action: AuditAction.PROJECT_CREATE,
  resourceType: 'project',
  resourceId: project.id,
  metadata: { title: project.title },
  request,
});
```

## Integration Examples

### 1. Authentication Routes

#### Example: `/app/api/auth/signout/route.ts`

```typescript
import { auditAuthEvent, AuditAction } from '@/lib/auditLog';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now();
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  const { error } = await supabase.auth.signOut();

  if (error) {
    // Audit log: Failed logout
    await auditAuthEvent(AuditAction.AUTH_LOGOUT, userId || null, request, {
      success: false,
      error: error.message,
    });
    return internalServerError(error.message);
  }

  const duration = Date.now() - startTime;

  // Audit log: Successful logout
  await auditAuthEvent(AuditAction.AUTH_LOGOUT, userId || null, request, {
    success: true,
    durationMs: duration,
  });

  return successResponse(null, 'Signed out successfully');
});
```

#### Example: Login Route (if you have one)

```typescript
// After successful login
await auditAuthEvent(AuditAction.AUTH_LOGIN_SUCCESS, user.id, request, {
  method: 'password', // or 'oauth', 'magic_link', etc.
  durationMs: Date.now() - startTime,
});

// After failed login
await auditAuthEvent(
  AuditAction.AUTH_LOGIN_FAILED,
  null, // no user ID since login failed
  request,
  {
    email: email, // sanitized email
    reason: 'invalid_credentials',
  }
);
```

### 2. Project Operations

#### Example: `/app/api/projects/route.ts` (POST - Create)

```typescript
import { auditProjectOperation, AuditAction } from '@/lib/auditLog';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const title = body.title || 'Untitled Project';

  const { ProjectService } = await import('@/lib/services/projectService');
  const projectService = new ProjectService(supabase);

  const project = await projectService.createProject(user.id, { title });

  // Audit log: Project created
  await auditProjectOperation(AuditAction.PROJECT_CREATE, user.id, project.id, request, {
    title: project.title,
    durationMs: Date.now() - startTime,
  });

  return successResponse(project);
});
```

#### Example: Project Delete

```typescript
// In DELETE endpoint
await auditProjectOperation(AuditAction.PROJECT_DELETE, user.id, projectId, request, {
  title: project.title,
  assetCount: project.asset_count,
});
```

#### Example: Project Export

```typescript
// In export endpoint
await auditProjectOperation(AuditAction.PROJECT_EXPORT, user.id, projectId, request, {
  format: body.outputSpec.format,
  resolution: `${body.outputSpec.width}x${body.outputSpec.height}`,
  clipCount: body.timeline.clips.length,
});
```

### 3. Asset Operations

#### Example: `/app/api/assets/upload/route.ts`

```typescript
import { auditAssetOperation, AuditAction } from '@/lib/auditLog';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now();
  // ... authentication and upload logic ...

  // After successful upload
  await auditAssetOperation(AuditAction.ASSET_UPLOAD, user.id, assetId, request, {
    projectId,
    assetType: type,
    fileSize: file.size,
    fileName: file.name,
    mimeType: file.type,
    durationMs: Date.now() - startTime,
  });

  return successResponse({ assetId, storageUrl, publicUrl });
});
```

#### Example: Asset Delete

```typescript
await auditAssetOperation(AuditAction.ASSET_DELETE, user.id, assetId, request, {
  projectId: asset.project_id,
  assetType: asset.type,
  fileName: asset.metadata?.filename,
});
```

### 4. Admin Operations

#### Example: `/app/api/admin/change-tier/route.ts`

```typescript
import { auditAdminAction, AuditAction } from '@/lib/auditLog';

async function handleChangeTier(request: NextRequest, context: AdminAuthContext) {
  const { user } = context;
  const { userId, tier } = await request.json();

  // ... validation and tier change logic ...

  const oldTier = targetProfile?.tier || 'unknown';
  await userService.updateUserTier(userId, tier);

  // Audit log: Admin tier change
  await auditAdminAction(user.id, AuditAction.ADMIN_TIER_CHANGE, userId, request, {
    oldTier,
    newTier: tier,
    adminEmail: user.email,
  });

  return successResponse(null, `User tier changed to ${tier}`);
}
```

#### Example: Admin User Delete

```typescript
await auditAdminAction(adminId, AuditAction.ADMIN_USER_DELETE, targetUserId, request, {
  targetEmail: targetUser.email,
  reason: body.reason,
  projectCount: targetUser.project_count,
});
```

### 5. Rate Limit Violations

#### Example: In `lib/rateLimit.ts` or rate limit middleware

```typescript
import { auditRateLimitViolation } from '@/lib/auditLog';

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // ... rate limit logic ...

  if (!rateLimitResult.success) {
    // Extract user ID from identifier if available
    const userId = identifier.startsWith('user:') ? identifier.replace('user:', '') : null;

    // Audit log: Rate limit exceeded
    await auditRateLimitViolation(userId, request, identifier, {
      limit: config.max,
      windowMs: config.windowMs,
      currentCount: rateLimitResult.remaining,
    });
  }

  return rateLimitResult;
}
```

#### Example: In API route with rate limiting

```typescript
const rateLimitResult = await checkRateLimit(
  `assets-upload:${user.id}`,
  RATE_LIMITS.tier2_resource_creation
);

if (!rateLimitResult.success) {
  // Audit log: Rate limit violation
  await auditRateLimitViolation(user.id, request, 'assets-upload', {
    limit: rateLimitResult.limit,
    remaining: rateLimitResult.remaining,
    resetAt: rateLimitResult.resetAt,
  });

  return rateLimitResponse(/* ... */);
}
```

### 6. Payment Operations

#### Example: Stripe Webhook Handler

```typescript
import { auditPaymentOperation, AuditAction } from '@/lib/auditLog';

// After successful subscription creation
await auditPaymentOperation(AuditAction.PAYMENT_SUBSCRIPTION_CREATE, userId, request, {
  stripeCustomerId: customer.id,
  stripeSubscriptionId: subscription.id,
  priceId: subscription.items.data[0]?.price.id,
  amount: subscription.items.data[0]?.price.unit_amount,
});

// After subscription cancellation
await auditPaymentOperation(AuditAction.PAYMENT_SUBSCRIPTION_CANCEL, userId, request, {
  stripeSubscriptionId: subscription.id,
  canceledAt: new Date().toISOString(),
});
```

### 7. Security Events

#### Example: CSRF Protection

```typescript
import { auditSecurityEvent, AuditAction } from '@/lib/auditLog';

if (origin && !allowedOrigins.includes(origin)) {
  // Audit log: CSRF blocked
  await auditSecurityEvent(AuditAction.SECURITY_CSRF_BLOCKED, null, request, {
    origin,
    allowedOrigins,
    endpoint: request.url,
  });

  return forbiddenResponse('Invalid origin');
}
```

#### Example: Unauthorized Access

```typescript
if (!user) {
  // Audit log: Unauthorized access attempt
  await auditSecurityEvent(AuditAction.SECURITY_UNAUTHORIZED_ACCESS, null, request, {
    endpoint: request.url,
    method: request.method,
  });

  return unauthorizedResponse();
}
```

### 8. Video/Media Generation

#### Example: Video Generation Request

```typescript
// Before starting video generation
await auditLog({
  userId: user.id,
  action: AuditAction.VIDEO_GENERATE_REQUEST,
  resourceType: 'video',
  metadata: {
    prompt: body.prompt,
    model: body.model,
    aspectRatio: body.aspectRatio,
  },
  request,
});

// After completion or failure
await auditLog({
  userId: user.id,
  action:
    job.status === 'completed'
      ? AuditAction.VIDEO_GENERATE_COMPLETE
      : AuditAction.VIDEO_GENERATE_FAILED,
  resourceType: 'video',
  resourceId: job.id,
  metadata: {
    durationSec: videoMetadata.duration,
    fileSize: videoMetadata.size,
    error: job.error_message,
  },
  request,
});
```

## Updating `withAuth` Middleware

You can also integrate audit logging into the `withAuth` middleware for automatic logging:

```typescript
// In lib/api/withAuth.ts

export function withAuth<TParams = Record<string, never>>(
  handler: AuthenticatedHandler<TParams>,
  options: AuthOptions
) {
  return async (request: NextRequest, context: { params: Promise<TParams> }) => {
    const startTime = Date.now();
    const { route } = options;

    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        // Audit log: Unauthorized access
        await auditSecurityEvent(AuditAction.SECURITY_UNAUTHORIZED_ACCESS, null, request, {
          route,
          error: authError?.message,
        });

        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: HttpStatusCode.UNAUTHORIZED }
        );
      }

      // ... rest of authentication logic ...

      const response = await handler(request, context);
      const duration = Date.now() - startTime;

      // You could optionally audit all API calls here, but that may be too verbose
      // Better to audit specific critical operations within each handler

      return response;
    } catch (error) {
      // ... error handling ...
    }
  };
}
```

## Querying Audit Logs

### Admin Dashboard Example

```typescript
import { queryAuditLogs, getAuditLogStats } from '@/lib/auditLog';

// Get recent security events
const securityEvents = await queryAuditLogs({
  action: 'security.%', // PostgreSQL LIKE pattern
  limit: 50,
});

// Get user activity
const userActivity = await queryAuditLogs({
  userId: 'user-uuid',
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  limit: 100,
});

// Get statistics
const stats = await getAuditLogStats('user-uuid');
console.log(`Total logs: ${stats.totalLogs}`);
console.log('Action breakdown:', stats.actionBreakdown);
```

## Best Practices

1. **Always audit critical operations**: Authentication, authorization, data modifications, admin actions
2. **Include context**: Add relevant metadata to help with debugging and compliance
3. **Don't audit read operations excessively**: Focus on writes and critical reads
4. **Sanitize sensitive data**: Don't log passwords, full credit card numbers, etc.
5. **Use appropriate action types**: Use the predefined AuditAction enums for consistency
6. **Don't block on audit logs**: Audit logging is async and won't throw errors to the main flow
7. **Set up retention policies**: Use the `cleanup_old_audit_logs()` function to maintain rolling windows

## Database Queries

### View recent security events

```sql
SELECT * FROM recent_security_events LIMIT 50;
```

### View admin actions

```sql
SELECT * FROM admin_actions_log LIMIT 100;
```

### Get user's audit trail

```sql
SELECT * FROM audit_logs
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 100;
```

### Get failed login attempts by IP

```sql
SELECT ip_address, COUNT(*) as failed_attempts
FROM audit_logs
WHERE action = 'auth.login.failed'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;
```

### Clean up old logs (run via cron or manually)

```sql
SELECT cleanup_old_audit_logs(90); -- Delete logs older than 90 days
```
