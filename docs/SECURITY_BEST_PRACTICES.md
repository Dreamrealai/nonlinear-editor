# Security Best Practices Guide

**Last Updated:** 2025-10-24
**Status:** Complete
**Audience:** Developers working on the non-linear video editor project

This comprehensive guide covers security best practices, patterns, and examples used in this codebase. Follow these guidelines when implementing new features or reviewing security-sensitive code.

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Input Validation](#input-validation)
3. [Rate Limiting](#rate-limiting)
4. [SQL Injection Prevention](#sql-injection-prevention)
5. [XSS Prevention](#xss-prevention)
6. [CSRF Protection](#csrf-protection)
7. [Content Security Policy](#content-security-policy)
8. [Secure Password Handling](#secure-password-handling)
9. [API Key Management](#api-key-management)
10. [Audit Logging](#audit-logging)
11. [Security Checklist](#security-checklist)

---

## Authentication & Authorization

### Using withAuth Middleware

All authenticated API routes **MUST** use the `withAuth` middleware wrapper. This ensures consistent authentication, authorization, logging, and error handling.

#### Basic Authentication Pattern

```typescript
import { withAuth } from '@/lib/api/withAuth';
import { successResponse } from '@/lib/api/response';
import { RATE_LIMITS } from '@/lib/rateLimit';

export const POST = withAuth(
  async (request, { user, supabase }) => {
    // user: Authenticated user object from Supabase
    // supabase: Supabase client with user session

    // Your authenticated route logic here
    const data = { userId: user.id };

    return successResponse(data);
  },
  {
    route: '/api/projects',
    rateLimit: RATE_LIMITS.tier2_resource_creation, // Optional rate limiting
  }
);
```

**What withAuth provides:**
- ✅ User authentication verification
- ✅ Automatic error handling and logging
- ✅ Request timing and performance tracking
- ✅ Optional rate limiting integration
- ✅ Structured logging with user context
- ✅ Audit trail for unauthorized access attempts

#### Admin Authentication Pattern

For admin-only routes, use `withAdminAuth` middleware:

```typescript
import { withAdminAuth } from '@/lib/api/withAuth';
import { successResponse } from '@/lib/api/response';

export const POST = withAdminAuth(
  async (request, { user, adminProfile, supabase }) => {
    // adminProfile.tier === 'admin' is guaranteed

    // Perform admin operations
    const result = await performAdminAction();

    return successResponse(result);
  },
  {
    route: '/api/admin/change-tier',
    rateLimit: RATE_LIMITS.tier1_auth_payment, // Strict rate limit for admin ops
  }
);
```

**Example from codebase:** `/app/api/admin/change-tier/route.ts`

### Row Level Security (RLS) in Supabase

All database tables **MUST** have Row Level Security (RLS) enabled. This prevents unauthorized data access even if application logic fails.

#### Example RLS Policy

```sql
-- Projects table: Users can only access their own projects
CREATE POLICY "Users can only view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);
```

#### Verifying Ownership in API Routes

Even with RLS, always verify ownership explicitly in code:

```typescript
export const DELETE = withAuth(
  async (request, { user, supabase }, routeContext) => {
    const { projectId } = await routeContext!.params;

    // Verify ownership before operation
    const { data: project, error } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return notFoundResponse('Project');
    }

    if (project.user_id !== user.id) {
      return forbiddenResponse('You do not have permission to delete this project');
    }

    // Proceed with deletion
    await supabase.from('projects').delete().eq('id', projectId);

    return successResponse(null, 'Project deleted');
  },
  { route: '/api/projects/[projectId]' }
);
```

**Example from codebase:** `/app/api/projects/[projectId]/route.ts`

### User Context and Session Management

The `withAuth` middleware injects user and Supabase client into your handler:

```typescript
interface AuthContext {
  user: User;           // Authenticated user from Supabase
  supabase: SupabaseClient; // Supabase client with user session
}
```

**Important:** Never trust user IDs from request bodies. Always use `user.id` from AuthContext:

```typescript
// ❌ WRONG - Trusts client input
const userId = body.userId;
await supabase.from('projects').insert({ user_id: userId });

// ✅ CORRECT - Uses authenticated user ID
await supabase.from('projects').insert({ user_id: user.id });
```

---

## Input Validation

### Using Assertion Functions

All API inputs **MUST** be validated using assertion functions from `/lib/validation.ts`. These functions throw `ValidationError` on invalid input, which withAuth automatically converts to proper error responses.

#### Basic Validation Example

```typescript
import { validateUUID, validateStringLength, validateRequired } from '@/lib/validation';

export const POST = withAuth(
  async (request, { user, supabase }) => {
    const body = await request.json();

    // Validate required fields (throws ValidationError if invalid)
    validateRequired(body.prompt, 'Prompt');
    validateStringLength(body.prompt, 'Prompt', 3, 1000);

    validateRequired(body.projectId, 'Project ID');
    validateUUID(body.projectId, 'Project ID');

    // Body is now validated, safe to use
    const { prompt, projectId } = body;

    // ... continue with logic
  },
  { route: '/api/image/generate' }
);
```

#### Available Validation Functions

```typescript
// UUID validation
validateUUID(value: unknown, fieldName: string): asserts value is string

// String validation
validateStringLength(value: unknown, fieldName: string, minLength: number, maxLength: number): asserts value is string
validateString(value: unknown, fieldName: string, options?: { required?: boolean; minLength?: number; maxLength?: number }): void

// Number validation
validateNumber(value: unknown, fieldName: string, min?: number, max?: number): asserts value is number
validateInteger(value: unknown, fieldName: string, options?: { required?: boolean; min?: number; max?: number }): asserts value is number
validateIntegerRange(value: unknown, fieldName: string, min: number, max: number): asserts value is number

// Enum validation
validateEnum<T extends string>(value: unknown, fieldName: string, allowedValues: readonly T[]): asserts value is T

// Required field validation
validateRequired<T>(value: T | null | undefined, fieldName: string): asserts value is T

// URL validation
validateUrl(value: unknown, fieldName: string, options?: { httpsOnly?: boolean; maxLength?: number }): asserts value is string

// Boolean validation
validateBoolean(value: unknown, fieldName: string): asserts value is boolean

// File validation
validateMimeType(mimeType: string, allowedTypes: string[], fieldName?: string): void
validateFileSize(size: number, maxSize: number, fieldName?: string): void
```

#### Domain-Specific Validation

```typescript
import {
  validateAspectRatio,
  validateDuration,
  validateSeed,
  validateSampleCount,
  validateSafetyFilterLevel,
  validatePersonGeneration,
} from '@/lib/validation';

// Video/image generation validation
validateAspectRatio(body.aspectRatio); // '16:9', '9:16', '1:1', '4:3', '3:4'
validateDuration(body.duration);       // 4, 5, 6, 8, 10 seconds
validateSeed(body.seed);               // 0-4294967295
validateSampleCount(body.sampleCount, 8); // 1-8 for images, 1-4 for videos
validateSafetyFilterLevel(body.safetyFilterLevel); // 'block_none', 'block_few', etc.
validatePersonGeneration(body.personGeneration); // 'dont_allow', 'allow_adult', 'allow_all'
```

#### Batch Validation Pattern

```typescript
import { validateAll } from '@/lib/validation';

export const POST = withAuth(
  async (request, { user, supabase }) => {
    const body = await request.json();

    // Validate all fields at once (throws on first error)
    validateAll(() => {
      validateString(body.prompt, 'Prompt', { minLength: 3, maxLength: 1000 });
      validateUUID(body.projectId, 'Project ID');
      validateAspectRatio(body.aspectRatio);
      validateInteger(body.sampleCount, 'Sample count', { min: 1, max: 8 });
    });

    // All validations passed
  },
  { route: '/api/image/generate' }
);
```

**Example from codebase:** `/app/api/export/route.ts`

### Query Parameter Validation

Validate query parameters from `request.nextUrl.searchParams`:

```typescript
export const GET = withAuth(
  async (request, { user, supabase }) => {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query parameters
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');

    // Validate with default values
    let pageNum = 0;
    let pageSizeNum = 50;

    if (page !== null) {
      validateInteger(parseInt(page), 'Page', { min: 0 });
      pageNum = parseInt(page);
    }

    if (pageSize !== null) {
      validateInteger(parseInt(pageSize), 'Page size', { min: 1, max: 100 });
      pageSizeNum = parseInt(pageSize);
    }

    // Use validated parameters
  },
  { route: '/api/assets' }
);
```

### File Upload Validation

Validate file uploads before processing:

```typescript
import { validateFileSize, validateMimeType } from '@/lib/validation';

export const POST = withAuth(
  async (request, { user, supabase }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return validationError('File is required', 'file');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    validateMimeType(file.type, allowedTypes, 'File type');

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    validateFileSize(file.size, maxSize, 'File size');

    // File is validated, proceed with upload
  },
  { route: '/api/assets/upload' }
);
```

**Example from codebase:** `/app/api/assets/upload/route.ts`

---

## Rate Limiting

### Rate Limiting Tiers

The application uses a tiered rate limiting system based on operation cost:

```typescript
export const RATE_LIMITS = {
  // TIER 1: 5 requests per minute - Authentication, payment, admin operations
  tier1_auth_payment: { max: 5, windowMs: 60 * 1000 },

  // TIER 2: 10 requests per minute - Expensive resource creation
  tier2_resource_creation: { max: 10, windowMs: 60 * 1000 },

  // TIER 3: 30 requests per minute - Status checks and read operations
  tier3_status_read: { max: 30, windowMs: 60 * 1000 },

  // TIER 4: 60 requests per minute - General API operations
  tier4_general: { max: 60, windowMs: 60 * 1000 },
};
```

### Applying Rate Limits

Rate limits are applied via the `withAuth` middleware configuration:

```typescript
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';

// TIER 1: Authentication/Payment operations
export const POST = withAuth(
  async (request, { user, supabase }) => {
    // Stripe checkout, admin operations, etc.
  },
  {
    route: '/api/stripe/checkout',
    rateLimit: RATE_LIMITS.tier1_auth_payment, // 5/min
  }
);

// TIER 2: Resource creation operations
export const POST = withAuth(
  async (request, { user, supabase }) => {
    // Video generation, asset upload, etc.
  },
  {
    route: '/api/video/generate',
    rateLimit: RATE_LIMITS.tier2_resource_creation, // 10/min
  }
);

// TIER 3: Status/Read operations
export const GET = withAuth(
  async (request, { user, supabase }) => {
    // Check video generation status
  },
  {
    route: '/api/video/status',
    rateLimit: RATE_LIMITS.tier3_status_read, // 30/min
  }
);

// TIER 4: General operations
export const GET = withAuth(
  async (request, { user, supabase }) => {
    // List projects, get assets, etc.
  },
  {
    route: '/api/projects',
    rateLimit: RATE_LIMITS.tier4_general, // 60/min
  }
);
```

### Tier Selection Guidelines

**TIER 1 (5/min)** - Use for:
- Payment operations (`/api/stripe/*`)
- Admin operations (`/api/admin/*`)
- Account deletion (`/api/user/delete-account`)
- Authentication endpoints

**TIER 2 (10/min)** - Use for:
- AI generation (video, image, audio)
- Asset uploads
- Project creation
- Expensive compute operations

**TIER 3 (30/min)** - Use for:
- Status polling
- Read-only operations with external API calls
- History queries
- Asset listings with pagination

**TIER 4 (60/min)** - Use for:
- Standard CRUD operations
- Project listings
- User profile updates
- General API operations

### Custom Rate Limiting

For custom rate limit configuration:

```typescript
export const POST = withAuth(
  async (request, { user, supabase }) => {
    // Your route logic
  },
  {
    route: '/api/custom',
    rateLimit: {
      max: 20,           // Max 20 requests
      windowMs: 60000,   // Per 60 seconds
    },
  }
);
```

### Rate Limit Response

When rate limit is exceeded, `withAuth` automatically returns:

```json
{
  "error": "Rate limit exceeded",
  "limit": 10,
  "remaining": 0,
  "resetAt": 1729776000000
}
```

**Response Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: ISO timestamp when limit resets

**Example from codebase:** `/lib/rateLimit.ts`

### Cost-Based Rate Limiting

For operations with variable costs (e.g., generating 1 image vs. 8 images):

```typescript
export const POST = withAuth(
  async (request, { user, supabase }) => {
    const body = await request.json();
    const sampleCount = body.sampleCount || 1;

    // Check if user has enough quota
    // Rate limiter prevents spam, quota system handles cost

    // Generate images
    const results = await generateImages(sampleCount);

    return successResponse(results);
  },
  {
    route: '/api/image/generate',
    rateLimit: RATE_LIMITS.tier2_resource_creation, // Prevents rapid API calls
  }
);
```

---

## SQL Injection Prevention

### Using Supabase Parameterized Queries

Supabase automatically prevents SQL injection through parameterized queries. **Never** concatenate user input into raw SQL.

#### Safe Pattern (Parameterized)

```typescript
// ✅ SAFE - Supabase uses parameterized queries
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', userId)  // Automatically parameterized
  .ilike('title', `%${searchTerm}%`);  // Safely escaped
```

#### Unsafe Pattern (String Concatenation)

```typescript
// ❌ DANGEROUS - Never do this!
const { data, error } = await supabase.rpc('raw_sql', {
  query: `SELECT * FROM projects WHERE title = '${userInput}'`
});
```

### Supabase Query Builders

Use Supabase's query builder methods:

```typescript
// Filtering
.eq('column', value)          // Equals
.neq('column', value)         // Not equals
.gt('column', value)          // Greater than
.gte('column', value)         // Greater than or equal
.lt('column', value)          // Less than
.lte('column', value)         // Less than or equal
.like('column', pattern)      // SQL LIKE (case-sensitive)
.ilike('column', pattern)     // SQL LIKE (case-insensitive)
.in('column', [val1, val2])   // IN clause
.is('column', null)           // IS NULL

// All values are automatically parameterized
```

### Using RPC Functions Safely

When using Supabase RPC functions, pass user input as parameters:

```typescript
// ✅ SAFE - Parameters are escaped
const { data, error } = await supabase.rpc('search_projects', {
  search_term: userSearchTerm,  // Passed as parameter
  user_id: userId,
});
```

**Database Function Example:**

```sql
CREATE OR REPLACE FUNCTION search_projects(
  search_term TEXT,
  user_id UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with function owner's privileges
AS $$
BEGIN
  -- Parameters are automatically escaped by PostgreSQL
  RETURN QUERY
  SELECT p.id, p.title, p.created_at
  FROM projects p
  WHERE p.user_id = search_projects.user_id
    AND p.title ILIKE '%' || search_term || '%';
END;
$$;
```

### JSONB Queries

Supabase safely handles JSONB queries:

```typescript
// ✅ SAFE - Parameterized JSONB query
const { data, error } = await supabase
  .from('timelines')
  .select('*')
  .eq('project_id', projectId)
  .contains('timeline_data', { track: 'video' });
```

---

## XSS Prevention

### React's Built-in Protection

React automatically escapes values rendered in JSX, preventing most XSS attacks:

```tsx
// ✅ SAFE - React escapes malicious content
function ProjectCard({ title }) {
  return <h2>{title}</h2>;  // Malicious scripts are escaped
}
```

### Dangerous Patterns to Avoid

**Never use `dangerouslySetInnerHTML` with user input:**

```tsx
// ❌ DANGEROUS - Allows XSS
function UnsafeComponent({ userContent }) {
  return <div dangerouslySetInnerHTML={{ __html: userContent }} />;
}
```

If you must render HTML, sanitize it first:

```tsx
import DOMPurify from 'isomorphic-dompurify';

// ✅ SAFER - Sanitized HTML
function SafeComponent({ userContent }) {
  const sanitized = DOMPurify.sanitize(userContent);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### URL Safety

Validate URLs before using them in links or redirects:

```typescript
import { validateUrl } from '@/lib/validation';

function ProfileLink({ url }) {
  try {
    validateUrl(url, 'Profile URL', { httpsOnly: true });
    return <a href={url}>Visit Profile</a>;
  } catch (error) {
    return <span>Invalid URL</span>;
  }
}
```

### Content Security Policy (CSP)

The application enforces a strict CSP that prevents inline scripts (see [Content Security Policy](#content-security-policy) section).

### Sanitizing User-Generated Content

For user-generated text content:

```typescript
// Trim whitespace and limit length
function sanitizeUserText(input: string, maxLength: number = 1000): string {
  return input.trim().slice(0, maxLength);
}

// Remove dangerous characters from filenames
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Replace special chars
    .slice(0, 255);                     // Limit length
}
```

---

## CSRF Protection

### Supabase Auth CSRF Protection

Supabase automatically provides CSRF protection for authentication operations:

1. **Session Cookies:** Supabase uses httpOnly cookies with SameSite=Lax
2. **Token Verification:** Every request validates the session token
3. **Origin Checking:** Supabase validates request origin headers

### API Route Protection

For API routes, `withAuth` middleware provides CSRF protection:

```typescript
export const POST = withAuth(
  async (request, { user, supabase }) => {
    // withAuth verifies:
    // 1. Valid session cookie
    // 2. Request origin matches allowed domains
    // 3. User session is not expired

    // Proceed with operation
  },
  { route: '/api/projects' }
);
```

### State-Changing Operations

**Always use POST, PUT, DELETE for state-changing operations:**

```typescript
// ❌ WRONG - GET should not change state
export const GET = withAuth(
  async (request, { user, supabase }) => {
    await supabase.from('projects').delete().eq('id', projectId);
  },
  { route: '/api/projects/[projectId]' }
);

// ✅ CORRECT - Use DELETE for destructive operations
export const DELETE = withAuth(
  async (request, { user, supabase }) => {
    await supabase.from('projects').delete().eq('id', projectId);
  },
  { route: '/api/projects/[projectId]' }
);
```

### CORS Configuration

Configure CORS in `next.config.ts` to restrict allowed origins:

```typescript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Access-Control-Allow-Origin',
          value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        },
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET, POST, PUT, DELETE, OPTIONS',
        },
        {
          key: 'Access-Control-Allow-Headers',
          value: 'Content-Type, Authorization',
        },
      ],
    },
  ];
}
```

---

## Content Security Policy

### CSP Implementation

The application uses a strict Content Security Policy configured in `/next.config.ts` and `/lib/security/csp.ts`.

#### CSP Directives

```typescript
const cspDirectives = [
  "default-src 'self'",                    // Only same-origin by default
  "script-src 'self' 'wasm-unsafe-eval'",  // Scripts from self + WASM support
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",  // Tailwind CSS
  "img-src 'self' data: blob: https://*.supabase.co",  // Images + Supabase storage
  "media-src 'self' blob: https://*.supabase.co",      // Video/audio assets
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://queue.fal.run https://fal.run https://generativelanguage.googleapis.com",  // API endpoints
  "font-src 'self' data: https://fonts.gstatic.com",   // Google Fonts
  "object-src 'none'",                     // Block plugins (Flash, etc.)
  "base-uri 'self'",                       // Prevent base tag hijacking
  "form-action 'self'",                    // Forms only submit to same origin
  "frame-ancestors 'none'",                // Prevent all framing (clickjacking)
  "upgrade-insecure-requests",             // Force HTTPS in production
];
```

#### Why wasm-unsafe-eval?

Next.js uses a Rust-based compiler (SWC) compiled to WebAssembly. `wasm-unsafe-eval` allows WebAssembly compilation but **NOT** arbitrary JavaScript `eval()`, making it much safer than `unsafe-eval`.

#### Nonce-Based Script Loading

For inline scripts that must run (Next.js hydration), use nonce-based CSP:

```typescript
import { generateNonce, buildCSPHeader } from '@/lib/security/csp';

// Generate nonce for this request
const nonce = generateNonce();

// Build CSP header with nonce
const cspHeader = buildCSPHeader({
  nonce,
  isDevelopment: process.env.NODE_ENV === 'development'
});

// Set CSP header
response.headers.set('Content-Security-Policy', cspHeader);
```

**Example from codebase:** `/lib/security/csp.ts`

### Testing CSP

Use browser DevTools to verify CSP:

1. Open DevTools Console
2. Look for CSP violation warnings
3. Verify no `unsafe-inline` or `unsafe-eval` in production

**Common CSP Violations:**
- Inline event handlers (`<button onclick="...">`)
- Inline scripts (`<script>alert('xss')</script>`)
- External scripts from non-whitelisted domains

---

## Secure Password Handling

### Supabase Auth Password Requirements

Supabase Auth handles password hashing and validation. Enforce strong passwords:

```typescript
// Supabase automatically enforces:
// - Minimum 6 characters
// - Passwords are hashed with bcrypt
// - Passwords are never stored in plaintext

// In sign-up form validation:
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain an uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain a lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain a number' };
  }

  return { valid: true };
}
```

### Password Reset Flow

Supabase provides secure password reset:

```typescript
import { createBrowserSupabaseClient } from '@/lib/supabase';

async function requestPasswordReset(email: string) {
  const supabase = createBrowserSupabaseClient();

  // Supabase sends password reset email with secure token
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    throw error;
  }
}

async function updatePassword(newPassword: string) {
  const supabase = createBrowserSupabaseClient();

  // Verify token and update password
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }
}
```

### Avoiding Password Exposure

**Never log passwords:**

```typescript
// ❌ WRONG - Logs sensitive data
serverLogger.info({ email, password }, 'User signing up');

// ✅ CORRECT - Only log non-sensitive data
serverLogger.info({ email }, 'User signing up');
```

**Never return passwords in API responses:**

```typescript
// ❌ WRONG - Exposes sensitive data
const user = await getUserFromDatabase(userId);
return successResponse(user); // Contains password hash

// ✅ CORRECT - Select only needed fields
const user = await supabase
  .from('user_profiles')
  .select('id, email, tier, created_at')  // No password field
  .eq('id', userId)
  .single();

return successResponse(user);
```

---

## API Key Management

### Environment Variables

**All API keys MUST be stored in environment variables:**

```bash
# .env.local (NEVER commit to git)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # Server-side only, never expose to client
FAL_KEY=xxx                     # AI generation API key
GEMINI_API_KEY=xxx              # Google Gemini API key
```

### Accessing API Keys

**Server-side (API routes):**

```typescript
// ✅ CORRECT - Server-side access
const falApiKey = process.env.FAL_KEY;
if (!falApiKey) {
  throw new Error('FAL_KEY not configured');
}
```

**Client-side (React components):**

```typescript
// Only use NEXT_PUBLIC_ prefixed keys in client-side code
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ❌ WRONG - Exposes secret key to client
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;  // Undefined in browser
```

### Validating API Keys

Validate API keys on startup:

```typescript
// lib/config/index.ts
export function validateConfig() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'FAL_KEY',
  ];

  const missing = requiredEnvVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

**Example from codebase:** `/lib/config/index.ts`

### API Key Rotation

When rotating API keys:

1. Update environment variables in hosting platform
2. Redeploy application
3. Verify old key is no longer used
4. Revoke old key in API provider dashboard

### Third-Party API Key Security

**Restrict API key permissions:**
- Only grant necessary permissions
- Set IP restrictions if possible
- Enable rate limiting
- Monitor API usage for anomalies

---

## Audit Logging

### Security Event Logging

All security-sensitive operations are logged for audit trails:

```typescript
import { auditSecurityEvent, AuditAction } from '@/lib/auditLog';

// Unauthorized access attempt
await auditSecurityEvent(
  AuditAction.SECURITY_UNAUTHORIZED_ACCESS,
  null,  // No user (unauthorized)
  request,
  {
    route: '/api/admin/delete-user',
    method: 'POST',
    error: 'Missing authentication token',
  }
);

// Admin action
await auditSecurityEvent(
  AuditAction.ADMIN_DELETE_USER,
  adminUser.id,
  request,
  {
    targetUserId: deletedUserId,
    reason: 'Terms of service violation',
  }
);

// Rate limit violation
await auditRateLimitViolation(
  user.id,
  request,
  identifier,
  {
    route: '/api/video/generate',
    limit: 10,
    remaining: 0,
    resetAt: Date.now() + 60000,
  }
);
```

**Example from codebase:** `/lib/api/withAuth.ts`

### Admin Audit Log

Admin operations are logged to the database:

```typescript
import { logAdminAction } from '@/lib/api/withAuth';

export const POST = withAdminAuth(
  async (request, { user, adminProfile, supabase }) => {
    const { targetUserId, newTier } = await request.json();

    // Perform admin operation
    await supabase
      .from('user_profiles')
      .update({ tier: newTier })
      .eq('id', targetUserId);

    // Log admin action
    await logAdminAction(
      supabase,
      'CHANGE_USER_TIER',
      user.id,
      targetUserId,
      {
        oldTier: currentTier,
        newTier: newTier,
      }
    );

    return successResponse({ success: true });
  },
  { route: '/api/admin/change-tier' }
);
```

**Database Schema:**

```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying admin actions
CREATE INDEX admin_audit_log_admin_id_idx ON admin_audit_log(admin_id);
CREATE INDEX admin_audit_log_target_user_id_idx ON admin_audit_log(target_user_id);
CREATE INDEX admin_audit_log_created_at_idx ON admin_audit_log(created_at DESC);
```

### Structured Logging

Use structured logging for security events:

```typescript
import { serverLogger } from '@/lib/serverLogger';

// ✅ GOOD - Structured logging with context
serverLogger.warn(
  {
    event: 'api.forbidden',
    route: '/api/projects/delete',
    userId: user.id,
    projectId: projectId,
    ownerId: project.user_id,
  },
  'User attempted to delete project they do not own'
);

// ❌ BAD - Unstructured logging
console.log(`User ${user.id} tried to delete project ${projectId} but failed`);
```

---

## Security Checklist

Use this checklist when implementing new features:

### Authentication & Authorization
- [ ] Uses `withAuth` or `withAdminAuth` middleware
- [ ] Verifies ownership before operations on user data
- [ ] Uses `user.id` from AuthContext (not request body)
- [ ] Admin routes protected with `withAdminAuth`
- [ ] RLS policies enabled on all database tables

### Input Validation
- [ ] All inputs validated with assertion functions
- [ ] UUIDs validated with `validateUUID`
- [ ] Strings validated with min/max length
- [ ] Numbers validated with min/max range
- [ ] Enum values validated against allowed values
- [ ] File uploads validated (MIME type, size)

### Rate Limiting
- [ ] Appropriate rate limit tier selected
- [ ] Expensive operations use TIER 1 or TIER 2
- [ ] Read operations use TIER 3 or TIER 4
- [ ] Custom rate limits justified and documented

### SQL Injection Prevention
- [ ] Uses Supabase query builders (`.eq()`, `.select()`, etc.)
- [ ] No raw SQL string concatenation
- [ ] RPC functions use parameters, not string interpolation

### XSS Prevention
- [ ] No `dangerouslySetInnerHTML` with user input
- [ ] User input escaped in JSX
- [ ] URLs validated before rendering in `<a>` tags
- [ ] CSP headers enforced

### CSRF Protection
- [ ] State-changing operations use POST/PUT/DELETE
- [ ] GET requests do not modify data
- [ ] `withAuth` middleware used for all state-changing endpoints

### Data Exposure
- [ ] No passwords in API responses
- [ ] No API keys in client-side code
- [ ] No sensitive data in logs
- [ ] RLS prevents unauthorized data access

### Audit Logging
- [ ] Security events logged with `auditSecurityEvent`
- [ ] Admin actions logged to `admin_audit_log`
- [ ] Rate limit violations logged
- [ ] Unauthorized access attempts logged

### Error Handling
- [ ] Error messages don't expose sensitive details
- [ ] Stack traces not exposed in production
- [ ] Validation errors use `ValidationError` class
- [ ] Errors logged with structured context

### API Keys & Secrets
- [ ] API keys stored in environment variables
- [ ] Server-side keys not exposed to client
- [ ] API key validation on startup
- [ ] Keys rotated regularly

---

## Additional Resources

### Documentation
- [Rate Limiting Guide](/docs/RATE_LIMITING.md)
- [Architecture Overview](/docs/ARCHITECTURE_OVERVIEW.md)
- [Coding Best Practices](/docs/CODING_BEST_PRACTICES.md)
- [API Documentation](/docs/api/)

### Code Examples
- Authentication: `/lib/api/withAuth.ts`
- Validation: `/lib/validation.ts`
- Rate Limiting: `/lib/rateLimit.ts`
- CSP: `/lib/security/csp.ts`

### External References
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

## Contact

For security concerns or to report vulnerabilities:
- Email: security@example.com (update with actual contact)
- Create a private security advisory on GitHub

**Do not report security issues in public GitHub issues.**
