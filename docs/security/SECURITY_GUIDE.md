# Security Guide

**Comprehensive security documentation for the Non-Linear Video Editor.**

Last Updated: 2025-10-25

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [CORS Configuration](#cors-configuration)
6. [Best Practices](#best-practices)
7. [Security Testing](#security-testing)

---

## Security Overview

### Security Layers

1. **Authentication** - Supabase Auth with JWT tokens
2. **Authorization** - Row Level Security (RLS) policies
3. **API Protection** - withAuth middleware, rate limiting
4. **Data Encryption** - TLS in transit, encryption at rest
5. **Input Validation** - Server-side validation for all inputs
6. **CORS** - Strict origin policies

---

## Authentication & Authorization

### Supabase Auth

All authentication is handled by Supabase Auth:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase';

const supabase = await createServerSupabaseClient();
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
  });
}
```

### withAuth Middleware

All API routes use withAuth middleware for authentication:

```typescript
import { withAuth } from '@/lib/api/withAuth';

export const GET = withAuth(async (request, { user, supabase }) => {
  // User is authenticated
  // Access user.id, user.email
  return NextResponse.json({ data: user });
});
```

### Row Level Security (RLS)

Database policies ensure users can only access their own data:

```sql
-- Projects policy
CREATE POLICY "Users can only see their own projects"
ON projects FOR SELECT
USING (auth.uid() = user_id);

-- Assets policy
CREATE POLICY "Users can only access their own assets"
ON assets FOR SELECT
USING (auth.uid() = user_id);
```

---

## Data Protection

### Encryption

- **In Transit:** TLS 1.3 for all connections
- **At Rest:** AES-256 encryption via Supabase
- **Tokens:** JWT tokens with 1-hour expiry

### Sensitive Data Handling

```typescript
// ❌ NEVER log sensitive data
console.log(user.email, user.password);

// ✅ Log only non-sensitive identifiers
serverLogger.info('User action', { userId: user.id });

// ❌ NEVER store plaintext passwords
await db.insert({ password: 'plaintext' });

// ✅ Use Supabase Auth (handles hashing)
await supabase.auth.signUp({ email, password });
```

### Secret Management

```bash
# Store secrets in environment variables
SUPABASE_SERVICE_ROLE_KEY=secret
STRIPE_SECRET_KEY=secret

# Never commit secrets to git
# Add to .gitignore:
.env.local
.env.production
```

---

## API Security

### Rate Limiting

All API routes have rate limits based on subscription tier:

```typescript
import { checkRateLimit } from '@/lib/rateLimit';

export const GET = withAuth(async (request, { user }) => {
  const rateLimit = await checkRateLimit(user.id, 'tier2_read');

  if (!rateLimit.success) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimit.resetAt.toString(),
      },
    });
  }

  // Process request
});
```

### Input Validation

Always validate inputs on the server:

```typescript
function validateProjectTitle(title: unknown): asserts title is string {
  if (typeof title !== 'string') {
    throw new ValidationError('Title must be a string');
  }

  if (title.length === 0) {
    throw new ValidationError('Title cannot be empty');
  }

  if (title.length > 100) {
    throw new ValidationError('Title too long (max 100 characters)');
  }
}

// Usage
try {
  validateProjectTitle(request.body.title);
} catch (error) {
  return NextResponse.json({ error: error.message }, { status: 400 });
}
```

### SQL Injection Prevention

Always use parameterized queries via Supabase client:

```typescript
// ✅ SAFE - Parameterized query
const { data } = await supabase.from('projects').select('*').eq('user_id', userId);

// ❌ NEVER construct raw SQL with user input
const query = `SELECT * FROM projects WHERE user_id = '${userId}'`;
```

---

## CORS Configuration

### Allowed Origins

CORS is configured to allow requests only from authorized origins:

```typescript
// middleware.ts
const allowedOrigins = [
  'https://nonlinearvideoeditor.com',
  'https://www.nonlinearvideoeditor.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
].filter(Boolean);

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (origin && allowedOrigins.includes(origin)) {
    return NextResponse.next({
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  return NextResponse.next();
}
```

---

## Best Practices

### 1. Never Trust Client Input

```typescript
// ❌ BAD - Trusting client data
const userId = request.headers.get('X-User-Id');

// ✅ GOOD - Using authenticated user
const { user } = await supabase.auth.getUser();
const userId = user.id;
```

### 2. Verify Ownership

```typescript
// ✅ Always verify user owns the resource
const { data: project } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .eq('user_id', user.id) // Verify ownership
  .single();

if (!project) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

### 3. Use HTTPS Only

```typescript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production' && request.url.startsWith('http:')) {
  return NextResponse.redirect(request.url.replace('http:', 'https:'));
}
```

### 4. Sanitize User Content

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize HTML content
const cleanHtml = DOMPurify.sanitize(userProvidedHtml);
```

### 5. Log Security Events

```typescript
import { serverLogger } from '@/lib/serverLogger';

// Log authentication failures
serverLogger.warn('Authentication failed', {
  ip: request.ip,
  userAgent: request.headers.get('user-agent'),
});

// Log suspicious activity
serverLogger.error('Rate limit exceeded multiple times', {
  userId: user.id,
  endpoint: request.url,
});
```

---

## Security Testing

### Testing Authentication

```typescript
describe('API Security', () => {
  it('should reject unauthenticated requests', async () => {
    const response = await fetch('/api/projects');
    expect(response.status).toBe(401);
  });

  it('should reject expired tokens', async () => {
    const expiredToken = generateExpiredToken();
    const response = await fetch('/api/projects', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    expect(response.status).toBe(401);
  });
});
```

### Testing Authorization

```typescript
it('should prevent access to other users data', async () => {
  const user1Token = await getTokenForUser('user1');
  const user2ProjectId = 'user2-project-id';

  const response = await fetch(`/api/projects/${user2ProjectId}`, {
    headers: { Authorization: `Bearer ${user1Token}` },
  });

  expect(response.status).toBe(404); // Not 403, to avoid leaking existence
});
```

### Testing Rate Limits

```typescript
it('should enforce rate limits', async () => {
  const token = await getTokenForUser('user');

  // Make requests up to limit
  for (let i = 0; i < 30; i++) {
    await fetch('/api/projects', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Next request should be rate limited
  const response = await fetch('/api/projects', {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(response.status).toBe(429);
});
```

---

## Additional Resources

- **[Security Deployment Guide](/docs/security/SECURITY_DEPLOYMENT_GUIDE.md)** - Production deployment security
- **[Security Test Coverage](/docs/security/SECURITY_TEST_COVERAGE.md)** - Security testing details
- **[Rate Limiting](/docs/RATE_LIMITING.md)** - Rate limit implementation
- **[Supabase Setup](/docs/SUPABASE_SETUP.md)** - Database security configuration

---

**Last Updated:** 2025-10-25
**Consolidation:** Merged SECURITY.md and SECURITY_BEST_PRACTICES.md
