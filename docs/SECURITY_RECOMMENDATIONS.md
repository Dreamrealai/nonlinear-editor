# Security Implementation Recommendations

This document provides actionable steps to implement the security improvements identified in the security audit.

---

## Priority 1: CSRF Protection (IMMEDIATE)

### Implementation: SameSite Cookie Attribute

**File:** `lib/api/withAuth.ts` or `middleware.ts`

Add SameSite attribute to authentication cookies:

```typescript
// In middleware.ts or createServerSupabaseClient
response.cookies.set({
  name: 'sb-auth-token',
  value: token,
  sameSite: 'lax', // Prevents CSRF attacks
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  httpOnly: true, // Prevents XSS
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
});
```

**Testing:**

```bash
# Verify SameSite cookie is set
curl -I https://your-app.com/api/projects
# Should see: Set-Cookie: ...SameSite=Lax
```

**Alternative: CSRF Token Implementation**

If SameSite cookies don't work for your use case:

```typescript
// lib/csrf.ts
import { randomBytes } from 'crypto';

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export function validateCSRFToken(request: NextRequest): { valid: boolean; error?: string } {
  const headerToken = request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get('csrf-token')?.value;

  if (!headerToken || !cookieToken) {
    return { valid: false, error: 'Missing CSRF token' };
  }

  if (headerToken !== cookieToken) {
    return { valid: false, error: 'Invalid CSRF token' };
  }

  return { valid: true };
}

// In withAuth middleware, add CSRF validation for state-changing methods
if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
  const csrfValidation = validateCSRFToken(request);
  if (!csrfValidation.valid) {
    return NextResponse.json({ error: csrfValidation.error }, { status: 403 });
  }
}
```

---

## Priority 2: Security Headers (IMMEDIATE)

**File:** `next.config.ts`

Add comprehensive security headers:

```typescript
const securityHeaders = [
  // Prevent DNS prefetch to avoid privacy leaks
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  // Force HTTPS
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  // Prevent MIME sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // XSS Protection (legacy but still useful)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Restrict feature access
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  // Content Security Policy (start restrictive, loosen as needed)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Allow scripts from self and Stripe
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
      // Allow styles from self (inline styles common in Next.js)
      "style-src 'self' 'unsafe-inline'",
      // Allow images from various sources
      "img-src 'self' data: https: blob:",
      // Allow fonts
      "font-src 'self' data:",
      // Allow connections to APIs
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.googleapis.com https://fal.ai https://api.elevenlabs.io",
      // Allow Stripe iframes
      'frame-src https://js.stripe.com https://hooks.stripe.com',
      // Block all object embeds
      "object-src 'none'",
      // Restrict base URI
      "base-uri 'self'",
      // Restrict form submissions
      "form-action 'self'",
      // Prevent being framed
      "frame-ancestors 'none'",
      // Upgrade insecure requests
      'upgrade-insecure-requests',
    ].join('; '),
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

**Testing CSP:**

1. Deploy headers
2. Open browser DevTools Console
3. Look for CSP violation errors
4. Adjust CSP directives as needed

**CSP Reporting (Optional):**

```typescript
// Add to CSP header
'report-uri /api/csp-report; report-to csp-endpoint';

// Create reporting endpoint
// app/api/csp-report/route.ts
export async function POST(request: Request) {
  const report = await request.json();
  serverLogger.warn(
    {
      event: 'security.csp_violation',
      report,
    },
    'CSP violation detected'
  );
  return new Response('OK', { status: 200 });
}
```

---

## Priority 3: Refactor API Routes to Use withAuth (IMMEDIATE)

### Routes Needing Refactoring

1. **app/api/video/generate/route.ts**
2. Any other routes with manual authentication

**Before:**

```typescript
export const POST = withErrorHandling(async (req: NextRequest) => {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedResponse();
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(`video-gen:${user.id}`, RATE_LIMITS.tier2_resource_creation);
  if (!rateLimitResult.success) {
    return rateLimitResponse(...);
  }

  // Business logic
});
```

**After:**

```typescript
async function handleVideoGenerate(
  request: NextRequest,
  context: AuthContext
): Promise<NextResponse> {
  const { user, supabase } = context;

  // Business logic only - auth and rate limiting handled by middleware
  const body = await request.json();
  // ... validation and processing
}

export const POST = withAuth(handleVideoGenerate, {
  route: '/api/video/generate',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});
```

**Benefits:**

- Consistent authentication
- Automatic rate limiting
- Audit logging
- Error handling
- Less boilerplate

---

## Priority 4: Dependency Vulnerability Scanning (SHORT-TERM)

### GitHub Dependabot Setup

**File:** `.github/dependabot.yml`

```yaml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '09:00'
    open-pull-requests-limit: 10
    labels:
      - 'dependencies'
      - 'security'
    reviewers:
      - 'your-team'
    assignees:
      - 'security-lead'
    commit-message:
      prefix: 'deps'
      include: 'scope'
    # Auto-merge minor and patch updates
    ignore:
      - dependency-name: '*'
        update-types: ['version-update:semver-major']

  # GitHub Actions
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
    labels:
      - 'dependencies'
      - 'github-actions'
```

### npm audit

Add to CI/CD pipeline:

```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run npm audit
        run: |
          npm audit --audit-level=moderate
          npm audit --json > audit-report.json

      - name: Upload audit report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: npm-audit-report
          path: audit-report.json
```

---

## Priority 5: Log Sanitization (SHORT-TERM)

**File:** `lib/logging/sanitization.ts`

```typescript
/**
 * Sanitizes sensitive data from logs
 */
export function sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };

  // Email addresses - keep domain, mask local part
  if (sanitized.email && typeof sanitized.email === 'string') {
    const [local, domain] = sanitized.email.split('@');
    sanitized.email = `${local?.substring(0, 2)}***@${domain}`;
  }

  if (sanitized.userEmail && typeof sanitized.userEmail === 'string') {
    const [local, domain] = sanitized.userEmail.split('@');
    sanitized.userEmail = `${local?.substring(0, 2)}***@${domain}`;
  }

  // IP addresses - mask last octet
  if (sanitized.ip && typeof sanitized.ip === 'string') {
    const parts = sanitized.ip.split('.');
    if (parts.length === 4) {
      sanitized.ip = `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
  }

  // API keys and tokens - show prefix only
  if (sanitized.apiKey && typeof sanitized.apiKey === 'string') {
    sanitized.apiKey = `${sanitized.apiKey.substring(0, 8)}***`;
  }

  if (sanitized.token && typeof sanitized.token === 'string') {
    sanitized.token = `${sanitized.token.substring(0, 8)}***`;
  }

  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeLogData(value as Record<string, unknown>);
    }
  }

  return sanitized;
}

// Update serverLogger.ts to use sanitization
import { sanitizeLogData } from './logging/sanitization';

const logger = pino({
  // ... existing config
  serializers: {
    ...pino.stdSerializers,
    // Custom serializer for sanitization
    req: (req) => ({
      ...pino.stdSerializers.req(req),
      headers: sanitizeHeaders(req.headers),
    }),
  },
  // Add hook to sanitize all log data
  hooks: {
    logMethod(args, method) {
      if (args.length >= 1 && typeof args[0] === 'object') {
        args[0] = sanitizeLogData(args[0]);
      }
      return method.apply(this, args);
    },
  },
});
```

---

## Priority 6: Enhanced Rate Limiting (SHORT-TERM)

**File:** `lib/rateLimit.ts`

Add request fingerprinting:

```typescript
import { createHash } from 'crypto';

/**
 * Generate request fingerprint for rate limiting
 * Combines multiple factors to identify unique clients
 */
export function generateRequestFingerprint(request: NextRequest): string {
  const factors = [
    request.headers.get('user-agent') || '',
    request.headers.get('accept-language') || '',
    request.headers.get('accept-encoding') || '',
    // Include IP if available
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  ];

  const fingerprint = factors.join('|');
  return createHash('sha256').update(fingerprint).digest('hex').substring(0, 16);
}

/**
 * Enhanced rate limiting with fingerprinting
 */
export async function checkRateLimitEnhanced(
  identifier: string,
  config: RateLimitConfig,
  request: NextRequest
): Promise<RateLimitResult> {
  // Check primary rate limit (user or IP)
  const primaryResult = await checkRateLimit(identifier, config);

  if (!primaryResult.success) {
    return primaryResult;
  }

  // Additional check by fingerprint for unauthenticated requests
  if (identifier.startsWith('ip:')) {
    const fingerprint = generateRequestFingerprint(request);
    const fingerprintResult = await checkRateLimit(
      `fingerprint:${fingerprint}`,
      { ...config, max: Math.floor(config.max * 1.5) } // Slightly higher limit
    );

    if (!fingerprintResult.success) {
      serverLogger.warn(
        {
          event: 'rateLimit.fingerprint_exceeded',
          fingerprint,
          identifier,
        },
        'Fingerprint-based rate limit exceeded'
      );

      return fingerprintResult;
    }
  }

  return primaryResult;
}

/**
 * Exponential backoff for repeated violations
 */
export async function trackRateLimitViolations(identifier: string): Promise<number> {
  const key = `violations:${identifier}`;
  const violations = (await cache.get<number>(key)) || 0;

  // Increment violation count
  await cache.set(key, violations + 1, 3600000); // 1 hour TTL

  // Calculate backoff time (exponential)
  // 0 violations = 0s, 1 = 30s, 2 = 60s, 3 = 120s, etc.
  return Math.min(Math.pow(2, violations) * 30, 3600); // Max 1 hour
}
```

---

## Priority 7: Automated Security Testing (LONG-TERM)

### OWASP ZAP Integration

**File:** `.github/workflows/security-scan.yml`

```yaml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM
  workflow_dispatch:

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start application
        run: |
          docker-compose up -d
          sleep 30 # Wait for app to start

      - name: Run ZAP baseline scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

      - name: Upload ZAP report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: zap-report
          path: report_html.html
```

### Security Test Cases

**File:** `__tests__/security/security.test.ts`

```typescript
describe('Security Tests', () => {
  describe('SQL Injection Protection', () => {
    it('should reject SQL injection attempts in projectId', async () => {
      const maliciousId = "'; DROP TABLE projects; --";
      const response = await fetch(`/api/projects/${maliciousId}`, {
        headers: { cookie: authCookie },
      });
      expect(response.status).toBe(400);
    });
  });

  describe('XSS Protection', () => {
    it('should sanitize user input in project titles', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: authCookie,
        },
        body: JSON.stringify({ title: xssPayload }),
      });

      const project = await response.json();
      expect(project.title).not.toContain('<script>');
    });
  });

  describe('CSRF Protection', () => {
    it('should reject requests without CSRF token', async () => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: authCookie,
        },
        body: JSON.stringify({ title: 'Test' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array(11)
        .fill(null)
        .map(() =>
          fetch('/api/projects', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              cookie: authCookie,
            },
            body: JSON.stringify({ title: 'Test' }),
          })
        );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
```

---

## Deployment Checklist

Before deploying to production:

### Infrastructure

- [ ] Enable HTTPS/TLS (Let's Encrypt or CloudFlare)
- [ ] Configure firewall rules
- [ ] Set up DDoS protection
- [ ] Enable database backups
- [ ] Configure log retention

### Application

- [ ] Use production environment variables
- [ ] Enable CSRF protection
- [ ] Configure security headers
- [ ] Enable rate limiting
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure log aggregation (Axiom, DataDog, etc.)

### Monitoring

- [ ] Set up uptime monitoring
- [ ] Configure security alerts
- [ ] Enable audit log monitoring
- [ ] Set up performance monitoring
- [ ] Configure automated backups

### Documentation

- [ ] Document incident response plan
- [ ] Document security contact information
- [ ] Create security disclosure policy
- [ ] Document data retention policies

---

## Ongoing Security Maintenance

### Weekly

- Review Dependabot PRs
- Check security alerts
- Review audit logs for anomalies

### Monthly

- Run security scan (OWASP ZAP)
- Review and update dependencies
- Check for new CVEs
- Review access logs

### Quarterly

- Full security audit
- Review and update security policies
- Security training for team
- Penetration testing

### Annually

- Third-party security audit
- Disaster recovery testing
- Review compliance requirements
- Update security documentation

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Stripe Security](https://stripe.com/docs/security/guide)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
