# Security Best Practices Guide

**Last Updated:** 2025-10-24
**Version:** 1.0.0

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Input Validation & Sanitization](#input-validation--sanitization)
4. [Rate Limiting](#rate-limiting)
5. [OWASP Top 10 Mitigations](#owasp-top-10-mitigations)
6. [API Security](#api-security)
7. [Database Security](#database-security)
8. [Error Handling & Logging](#error-handling--logging)
9. [Security Checklist](#security-checklist)
10. [Resources](#resources)

## Overview

This guide provides comprehensive security best practices for the Non-Linear Video Editor project. Following these guidelines helps protect against common vulnerabilities and ensures secure implementation of features.

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Grant minimum necessary permissions
3. **Fail Securely**: Default to denying access on errors
4. **Secure by Default**: Security should not be optional
5. **Never Trust User Input**: Validate and sanitize everything

## Authentication & Authorization

### Authentication Patterns

#### API Route Authentication

**Always** use the `withAuth` middleware for API routes that require authentication:

```typescript
// app/api/projects/route.ts
import { withAuth } from '@/lib/api/withAuth';

export const POST = withAuth(async (req, { user, supabase }) => {
  // user is guaranteed to be authenticated
  // supabase client is pre-configured with user context

  const body = await req.json();

  // Your business logic here
  const { data, error } = await supabase.from('projects').insert({
    ...body,
    user_id: user.id, // Always use authenticated user ID
  });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return successResponse(data);
});
```

#### Admin-Only Routes

Use `withAdminAuth` for administrative operations:

```typescript
// app/api/admin/users/route.ts
import { withAdminAuth } from '@/lib/api/withAuth';

export const DELETE = withAdminAuth(async (req, { user, supabase }) => {
  // user is guaranteed to be an admin

  const { userId } = await req.json();

  // Prevent self-deletion
  if (userId === user.id) {
    return errorResponse('Cannot delete your own account', 400);
  }

  // Your admin logic here
  const { error } = await supabase.from('users').delete().eq('id', userId);

  if (error) {
    return errorResponse(error.message, 500);
  }

  // Log admin action
  await logAdminAction(supabase, user.id, userId, 'delete_user', {
    reason: 'Admin deletion',
  });

  return successResponse({ deleted: true });
});
```

#### Client-Side Authentication

For client components, use Supabase auth hooks:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export function ProtectedComponent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClientSupabaseClient();

    // Check initial auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please sign in</div>;
  }

  return <div>Protected content for {user.email}</div>;
}
```

### Authorization Patterns

#### Resource Ownership Verification

**Always** verify the user owns the resource before allowing operations:

```typescript
export const DELETE = withAuth(async (req, { user, supabase }) => {
  const { projectId } = await req.json();

  // Verify ownership BEFORE deleting
  const { data: project, error } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (error) {
    return errorResponse('Project not found', 404);
  }

  if (project.user_id !== user.id) {
    return errorResponse('Unauthorized', 403);
  }

  // Now safe to delete
  await supabase.from('projects').delete().eq('id', projectId);

  return successResponse({ deleted: true });
});
```

#### Row Level Security (RLS)

Supabase RLS policies provide database-level security:

```sql
-- Projects table RLS policy
CREATE POLICY "Users can only access their own projects"
  ON projects
  FOR ALL
  USING (auth.uid() = user_id);

-- Assets table RLS policy
CREATE POLICY "Users can only access their project assets"
  ON assets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = assets.project_id
      AND projects.user_id = auth.uid()
    )
  );
```

**Benefits:**

- Enforced at database level (not just application)
- Prevents data leaks even if application code has bugs
- Works with all Supabase client queries

## Input Validation & Sanitization

### Validation Principles

1. **Validate all input** - Never trust user data
2. **Use assertion functions** - Type-safe validation
3. **Validate early** - Check at API boundary
4. **Provide clear errors** - Help users fix invalid input

### Validation Patterns

#### Request Body Validation

```typescript
import { assertDefined, assertString, assertNumber } from '@/lib/api/assertions';

export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await req.json();

  // Validate required fields
  assertDefined(body.name, 'Project name is required');
  assertString(body.name, 'Project name must be a string');

  // Validate optional fields
  if (body.description !== undefined) {
    assertString(body.description, 'Description must be a string');
  }

  // Validate numbers
  if (body.duration !== undefined) {
    assertNumber(body.duration, 'Duration must be a number');

    if (body.duration < 0 || body.duration > 3600) {
      return errorResponse('Duration must be between 0 and 3600 seconds', 400);
    }
  }

  // Sanitize strings
  const sanitizedName = body.name.trim().slice(0, 100);

  // Proceed with sanitized data
  const { data, error } = await supabase.from('projects').insert({
    name: sanitizedName,
    user_id: user.id,
  });

  return successResponse(data);
});
```

#### Custom Assertion Functions

Create reusable validation functions:

```typescript
// lib/api/assertions.ts

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function assertDefined<T>(value: T | undefined | null, message: string): asserts value is T {
  if (value === undefined || value === null) {
    throw new ValidationError(message);
  }
}

export function assertString(value: unknown, message: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new ValidationError(message);
  }
}

export function assertNumber(value: unknown, message: string): asserts value is number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(message);
  }
}

export function assertEmail(value: string): asserts value is string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    throw new ValidationError('Invalid email format');
  }
}

export function assertUrl(value: string): asserts value is string {
  try {
    new URL(value);
  } catch {
    throw new ValidationError('Invalid URL format');
  }
}

export function assertEnum<T extends string>(
  value: string,
  validValues: T[],
  fieldName: string
): asserts value is T {
  if (!validValues.includes(value as T)) {
    throw new ValidationError(`${fieldName} must be one of: ${validValues.join(', ')}`);
  }
}
```

#### File Upload Validation

```typescript
export const POST = withAuth(async (req, { user, supabase }) => {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  // Validate file exists
  assertDefined(file, 'File is required');

  // Validate file size (10MB max)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return errorResponse('File size must be less than 10MB', 400);
  }

  // Validate file type
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return errorResponse('File type must be JPEG, PNG, or WebP', 400);
  }

  // Validate filename (prevent directory traversal)
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);

  // Upload file
  const { data, error } = await supabase.storage
    .from('assets')
    .upload(`${user.id}/${sanitizedFilename}`, file);

  return successResponse(data);
});
```

### Sanitization Patterns

#### SQL Injection Prevention

Supabase and Postgres use parameterized queries, which prevent SQL injection:

```typescript
// SAFE - Uses parameterized query
const { data } = await supabase.from('users').select('*').eq('email', userInput); // Automatically escaped

// UNSAFE - Raw SQL (avoid unless necessary)
const { data } = await supabase.rpc('custom_query', {
  user_email: userInput, // Still parameterized via RPC
});
```

#### XSS Prevention

React automatically escapes content, but be careful with `dangerouslySetInnerHTML`:

```typescript
// SAFE - React escapes by default
<div>{userInput}</div>

// UNSAFE - HTML injection possible
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// SAFER - Sanitize HTML first
import DOMPurify from 'isomorphic-dompurify';

function SafeHTML({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

## Rate Limiting

### Rate Limiting Tiers

The application uses Redis-based rate limiting with different tiers:

```typescript
// lib/api/rateLimit.ts

export enum RateLimitTier {
  /** 10 requests/minute - For expensive operations */
  STRICT = 'strict',
  /** 30 requests/minute - For standard API calls */
  STANDARD = 'standard',
  /** 60 requests/minute - For lightweight operations */
  RELAXED = 'relaxed',
  /** 100 requests/minute - For high-frequency operations */
  HIGH = 'high',
}
```

### Applying Rate Limits

#### Per-Route Rate Limiting

```typescript
// Low rate limit for expensive AI operations
export const POST = withAuth(
  async (req, { user, supabase }) => {
    // Generate video
    const result = await generateVideo(params);
    return successResponse(result);
  },
  {
    rateLimit: RateLimitTier.STRICT, // 10 req/min
  }
);
```

#### Multiple Rate Limit Checks

```typescript
export const POST = withAuth(async (req, { user, supabase }) => {
  const { operation } = await req.json();

  // Apply different rate limits based on operation
  if (operation === 'generate') {
    const limited = await checkRateLimit(`generate:${user.id}`, RateLimitTier.STRICT);

    if (limited) {
      return errorResponse('Rate limit exceeded for generation', 429, {
        retryAfter: 60,
      });
    }
  }

  // Process operation
  return successResponse({ success: true });
});
```

### Rate Limit Best Practices

1. **Tier by cost**: More expensive operations = stricter limits
2. **User-specific keys**: Prevent one user from blocking others
3. **Clear error messages**: Tell users when they can retry
4. **Monitor abuse**: Track rate limit violations
5. **Adjust based on usage**: Review and tune limits regularly

## OWASP Top 10 Mitigations

### 1. Broken Access Control

**Risk:** Users accessing resources they shouldn't

**Mitigation:**

- ✅ Always use `withAuth` middleware for authenticated routes
- ✅ Verify resource ownership before operations
- ✅ Implement Row Level Security (RLS) policies
- ✅ Use admin-only middleware for privileged operations
- ✅ Never trust client-side access control

**Example:**

```typescript
// Verify ownership before deletion
const { data: project } = await supabase
  .from('projects')
  .select('user_id')
  .eq('id', projectId)
  .single();

if (project.user_id !== user.id) {
  return errorResponse('Unauthorized', 403);
}
```

### 2. Cryptographic Failures

**Risk:** Exposure of sensitive data due to weak encryption

**Mitigation:**

- ✅ Use Supabase authentication (handles password hashing)
- ✅ Store API keys in environment variables
- ✅ Use HTTPS for all communications (enforced by Vercel)
- ✅ Never log sensitive data (passwords, tokens, API keys)
- ✅ Use secure session management (Supabase JWT)

**Example:**

```typescript
// NEVER log sensitive data
serverLogger.error({ error }, 'Auth failed'); // ❌ Don't log password
serverLogger.error({ userId: user.id }, 'Auth failed'); // ✅ Log user ID only

// Use environment variables for secrets
const apiKey = process.env.OPENAI_API_KEY; // ✅
// const apiKey = "sk-..."; // ❌ NEVER hardcode
```

### 3. Injection

**Risk:** SQL, NoSQL, or command injection attacks

**Mitigation:**

- ✅ Use parameterized queries (Supabase does this automatically)
- ✅ Validate and sanitize all user input
- ✅ Use assertion functions for type safety
- ✅ Avoid raw SQL queries when possible
- ✅ Sanitize file names and paths

**Example:**

```typescript
// SAFE - Parameterized query
const { data } = await supabase.from('projects').select('*').eq('name', userInput);

// UNSAFE - String concatenation (don't do this)
// const query = `SELECT * FROM projects WHERE name = '${userInput}'`;
```

### 4. Insecure Design

**Risk:** Fundamental flaws in application architecture

**Mitigation:**

- ✅ Follow security best practices from the start
- ✅ Use defense in depth (multiple security layers)
- ✅ Implement proper error handling
- ✅ Design with least privilege principle
- ✅ Conduct security reviews

**Example:**

```typescript
// Defense in depth - Multiple security checks
export const DELETE = withAuth(async (req, { user, supabase }) => {
  const { projectId } = await req.json();

  // Layer 1: Authentication (withAuth)
  // Layer 2: Input validation
  assertDefined(projectId, 'Project ID required');

  // Layer 3: Ownership check
  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (!project || project.user_id !== user.id) {
    return errorResponse('Unauthorized', 403);
  }

  // Layer 4: RLS policy (enforced at database level)
  await supabase.from('projects').delete().eq('id', projectId);

  return successResponse({ deleted: true });
});
```

### 5. Security Misconfiguration

**Risk:** Insecure default configurations or exposed debug info

**Mitigation:**

- ✅ Disable debug mode in production
- ✅ Use secure HTTP headers (see CORS documentation)
- ✅ Keep dependencies updated
- ✅ Remove unused features and endpoints
- ✅ Configure proper CORS policies

**Example:**

```typescript
// next.config.ts - Security headers
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];
```

### 6. Vulnerable and Outdated Components

**Risk:** Using libraries with known vulnerabilities

**Mitigation:**

- ✅ Run `npm audit` regularly
- ✅ Update dependencies frequently
- ✅ Use Dependabot for automated updates
- ✅ Review security advisories
- ✅ Remove unused dependencies

**Commands:**

```bash
# Check for vulnerabilities
npm audit

# Fix automatically fixable issues
npm audit fix

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

### 7. Identification and Authentication Failures

**Risk:** Weak authentication allowing account takeover

**Mitigation:**

- ✅ Use Supabase authentication (battle-tested)
- ✅ Enforce strong password requirements
- ✅ Implement rate limiting on auth endpoints
- ✅ Use secure session management (JWT)
- ✅ Log authentication attempts

**Example:**

```typescript
// Monitor failed auth attempts
export const POST = async (req: NextRequest) => {
  const { email, password } = await req.json();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Log failed attempt
    serverLogger.warn({ email, error: error.message }, 'Failed authentication attempt');

    // Track for rate limiting/blocking
    await trackFailedAttempt(email);

    return errorResponse('Invalid credentials', 401);
  }

  return successResponse(data);
};
```

### 8. Software and Data Integrity Failures

**Risk:** Unsigned or unverified software updates, insecure CI/CD

**Mitigation:**

- ✅ Use package-lock.json for dependency integrity
- ✅ Verify external API responses
- ✅ Use Vercel's secure deployment pipeline
- ✅ Validate uploaded file integrity
- ✅ Implement audit logging

**Example:**

```typescript
// Validate external API responses
async function fetchExternalData(url: string) {
  const response = await fetch(url);
  const data = await response.json();

  // Validate structure before use
  assertDefined(data.result, 'Invalid API response');
  assertString(data.result.id, 'Missing ID in response');

  return data;
}
```

### 9. Security Logging and Monitoring Failures

**Risk:** Insufficient logging preventing detection of breaches

**Mitigation:**

- ✅ Log all authentication events
- ✅ Log authorization failures
- ✅ Log admin actions to audit table
- ✅ Use Axiom for centralized logging
- ✅ Set up alerts for suspicious activity

**Example:**

```typescript
// Comprehensive error logging
try {
  await deleteProject(projectId);
} catch (error) {
  trackError(error, {
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.HIGH,
    userId: user.id,
    context: { projectId },
  });
  throw error;
}

// Admin action logging
await logAdminAction(supabase, adminId, targetUserId, 'delete_user', {
  reason: 'Violation of terms',
  ip: req.headers.get('x-forwarded-for'),
});
```

### 10. Server-Side Request Forgery (SSRF)

**Risk:** Attacker making server request arbitrary URLs

**Mitigation:**

- ✅ Validate and sanitize all URLs
- ✅ Use allowlist for external services
- ✅ Avoid user-provided URLs when possible
- ✅ Use proxy services for user content
- ✅ Implement timeout and size limits

**Example:**

```typescript
// Allowlist for external services
const ALLOWED_DOMAINS = [
  'api.openai.com',
  'api.fal.ai',
  'api.elevenlabs.io',
  'storage.googleapis.com',
];

function validateExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Check protocol
    if (!['https:'].includes(parsed.protocol)) {
      return false;
    }

    // Check domain allowlist
    return ALLOWED_DOMAINS.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// Use in API route
export const POST = withAuth(async (req, { user }) => {
  const { webhookUrl } = await req.json();

  if (!validateExternalUrl(webhookUrl)) {
    return errorResponse('Invalid webhook URL', 400);
  }

  // Safe to use
  await fetch(webhookUrl, { method: 'POST', body: data });
});
```

## API Security

### Secure API Design

#### 1. Use HTTPS Only

All API endpoints must use HTTPS (enforced by Vercel):

```typescript
// next.config.ts
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};
```

#### 2. API Versioning

Version APIs to allow safe updates:

```typescript
// app/api/v1/projects/route.ts
export const GET = withAuth(async (req, { user, supabase }) => {
  // v1 implementation
});

// app/api/v2/projects/route.ts
export const GET = withAuth(async (req, { user, supabase }) => {
  // v2 implementation with new features
});
```

#### 3. Request Validation

Validate all request parameters:

```typescript
export const GET = withAuth(async (req, { user, supabase }) => {
  const { searchParams } = new URL(req.url);

  // Validate query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (page < 1 || page > 1000) {
    return errorResponse('Page must be between 1 and 1000', 400);
  }

  if (limit < 1 || limit > 100) {
    return errorResponse('Limit must be between 1 and 100', 400);
  }

  // Safe to use
  const { data } = await supabase
    .from('projects')
    .select('*')
    .range((page - 1) * limit, page * limit - 1);

  return successResponse(data);
});
```

#### 4. Response Sanitization

Don't expose internal details in responses:

```typescript
// BAD - Exposes internal IDs and structure
return Response.json({
  error: error.message,
  stack: error.stack, // ❌ Never expose stack traces
  query: sqlQuery, // ❌ Never expose queries
  internalId: dbId, // ❌ Don't expose internal IDs
});

// GOOD - Safe error response
return errorResponse('Failed to process request', 500, {
  code: 'PROCESSING_ERROR',
  retryable: true,
});
```

### API Documentation

Document all APIs with:

- Authentication requirements
- Request/response schemas
- Error codes
- Rate limits
- Examples

Example API doc format:

````markdown
### POST /api/projects

Create a new project.

**Authentication:** Required (Bearer token)

**Rate Limit:** 30 requests/minute

**Request Body:**

```json
{
  "name": "string (required, max 100 chars)",
  "description": "string (optional, max 500 chars)",
  "settings": {
    "fps": "number (optional, default 30)",
    "resolution": "string (optional, default '1920x1080')"
  }
}
```
````

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "created_at": "timestamp"
  }
}
```

**Errors:**

- `400` - Invalid input
- `401` - Unauthorized
- `429` - Rate limit exceeded
- `500` - Server error

````

## Database Security

### Row Level Security (RLS)

Enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own projects
CREATE POLICY "Users own projects"
  ON projects
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert with their own user_id
CREATE POLICY "Users create own projects"
  ON projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own projects
CREATE POLICY "Users update own projects"
  ON projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own projects
CREATE POLICY "Users delete own projects"
  ON projects
  FOR DELETE
  USING (auth.uid() = user_id);
````

### Connection Security

Use connection pooling for performance and security:

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';

export function createServerSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Secure cookie configuration
        get(name) {
          return getCookie(name);
        },
        set(name, value, options) {
          setCookie(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          });
        },
        remove(name, options) {
          setCookie(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
}
```

### Sensitive Data Handling

Never store sensitive data in plain text:

```sql
-- Use Postgres built-in encryption for sensitive data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Store encrypted data
INSERT INTO secure_data (user_id, encrypted_value)
VALUES (
  '123',
  pgp_sym_encrypt('sensitive data', current_setting('app.encryption_key'))
);

-- Retrieve encrypted data
SELECT
  user_id,
  pgp_sym_decrypt(encrypted_value, current_setting('app.encryption_key')) AS value
FROM secure_data
WHERE user_id = '123';
```

## Error Handling & Logging

### Error Response Patterns

Use consistent error responses:

```typescript
// lib/api/response.ts

export function errorResponse(
  message: string,
  status: number = 500,
  details?: Record<string, unknown>
) {
  return Response.json(
    {
      success: false,
      error: {
        message,
        code: getErrorCode(status),
        ...(details && { details }),
      },
    },
    { status }
  );
}

export function successResponse<T>(data: T, metadata?: Record<string, unknown>) {
  return Response.json({
    success: true,
    data,
    ...(metadata && { metadata }),
  });
}
```

### Safe Error Logging

Log errors without exposing sensitive data:

```typescript
import { serverLogger } from '@/lib/serverLogger';
import { trackError, ErrorCategory } from '@/lib/errorTracking';

try {
  const result = await riskyOperation();
  return successResponse(result);
} catch (error) {
  // Log with context (no sensitive data)
  trackError(error, {
    category: ErrorCategory.DATABASE,
    userId: user.id,
    context: {
      operation: 'create_project',
      timestamp: new Date().toISOString(),
    },
  });

  // Return safe error to client
  return errorResponse('Failed to create project', 500);
}
```

### Error Classification

Classify errors for better monitoring:

```typescript
export enum ErrorCategory {
  CLIENT = 'client', // React, browser errors
  API = 'api', // API route errors
  EXTERNAL_SERVICE = 'external_service', // Third-party APIs
  DATABASE = 'database', // Supabase/Postgres
  AUTH = 'auth', // Authentication/authorization
  VALIDATION = 'validation', // Input validation
  NETWORK = 'network', // Network/timeout
  UNKNOWN = 'unknown', // Uncategorized
}

export enum ErrorSeverity {
  CRITICAL = 'critical', // Breaks core functionality
  HIGH = 'high', // Impacts user experience
  MEDIUM = 'medium', // Recoverable errors
  LOW = 'low', // Minor errors, warnings
}
```

## Security Checklist

Use this checklist before deploying new features:

### Authentication & Authorization

- [ ] All API routes use `withAuth` or `withAdminAuth`
- [ ] Resource ownership is verified before operations
- [ ] RLS policies are enabled on all tables
- [ ] Admin operations prevent self-modification

### Input Validation

- [ ] All user input is validated
- [ ] File uploads are validated (type, size, name)
- [ ] URLs are sanitized and validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (no unsafe HTML)

### Rate Limiting

- [ ] Appropriate rate limits applied per endpoint
- [ ] Rate limits based on operation cost
- [ ] Clear error messages for rate limit violations

### Error Handling

- [ ] Errors are logged with proper context
- [ ] Sensitive data is not logged
- [ ] Error responses don't expose internals
- [ ] Errors are tracked in Axiom/Sentry

### Security Headers

- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Security headers set (see CORS documentation)
- [ ] Cookie security enabled (httpOnly, secure, sameSite)

### Secrets Management

- [ ] No hardcoded secrets
- [ ] API keys in environment variables
- [ ] .env.local not committed
- [ ] Vercel environment variables configured

### Logging & Monitoring

- [ ] Authentication events logged
- [ ] Authorization failures logged
- [ ] Admin actions logged to audit table
- [ ] Error tracking configured

### Code Quality

- [ ] Dependencies up to date (`npm audit`)
- [ ] No console.log in production code
- [ ] TypeScript strict mode passes
- [ ] Security review completed

## Resources

### Documentation

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Supabase Security Guide](https://supabase.com/docs/guides/platform/going-into-prod)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)

### Internal Documentation

- [Authentication Guide](./SECURITY_AUDIT.md)
- [CORS Security](./CORS_SECURITY_IMPLEMENTATION_SUMMARY.md)
- [Rate Limiting](../RATE_LIMITING.md)
- [Error Tracking](../guides/ERROR_TRACKING.md)

### Tools

- `npm audit` - Check for vulnerabilities
- [Snyk](https://snyk.io/) - Continuous security scanning
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing
- [Dependabot](https://github.com/dependabot) - Automated dependency updates

---

**Remember:** Security is not a one-time task. Regularly review and update security practices as the application evolves and new threats emerge.
