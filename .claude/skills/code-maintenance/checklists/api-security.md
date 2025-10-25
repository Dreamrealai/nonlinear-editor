# API Security Checklist

## Authentication & Authorization

### Middleware Protection
- [ ] All mutating endpoints (POST/PUT/DELETE/PATCH) use `withAuth` middleware
- [ ] Public endpoints explicitly documented with `// Public endpoint` comment
- [ ] `withAuth` configured with `{ requireAuth: true }` for protected routes
- [ ] User object available in handler: `(req, { user }) => {}`

### Ownership Verification
- [ ] Resource ownership verified before mutations
- [ ] User ID from auth matches resource owner
- [ ] Proper 403 response for unauthorized access
- [ ] Database query filters by user ID: `.eq('user_id', user.id)`

### Rate Limiting
- [ ] All endpoints have rate limiting configured
- [ ] Public endpoints use `'strict'` tier (10 req/min)
- [ ] Authenticated reads use `'standard'` tier (100 req/min)
- [ ] Heavy operations use `'strict'` tier (5 req/min)
- [ ] Rate limit tier appropriate for operation cost

## Input Validation

### Request Validation
- [ ] All request bodies validated before use
- [ ] Assertion functions used: `assertValidVideoRequest(body)`
- [ ] File uploads validate size and type
- [ ] Query parameters validated and sanitized
- [ ] Path parameters validated (IDs are valid format)

### SQL Injection Prevention
- [ ] All Supabase queries use parameterized queries
- [ ] No string interpolation in queries
- [ ] User input never directly in `.rpc()` calls without validation
- [ ] Raw SQL avoided (use query builder)

### XSS Prevention
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] User-generated content escaped before rendering
- [ ] HTML entities encoded in responses
- [ ] Content-Type headers set correctly

## Data Security

### Row Level Security (RLS)
- [ ] All tables have RLS enabled
- [ ] RLS policies created for SELECT, INSERT, UPDATE, DELETE
- [ ] Policies verify user ownership
- [ ] Service role only used in trusted server code
- [ ] Anonymous access properly restricted

### Sensitive Data
- [ ] Passwords never returned in API responses
- [ ] API keys/secrets never in responses
- [ ] Error messages don't expose sensitive data
- [ ] Stack traces not sent to client
- [ ] User emails only returned to authorized users

### Data Exposure
- [ ] API responses whitelist fields (not returning everything)
- [ ] Select specific columns from database (not SELECT *)
- [ ] Pagination limits prevent huge data dumps
- [ ] Soft-deleted data not accessible
- [ ] Related data properly filtered

## Error Handling

### Secure Error Responses
- [ ] Use `errorResponse()` helper for consistency
- [ ] Generic error messages to client
- [ ] Detailed errors logged server-side only
- [ ] No stack traces in production responses
- [ ] Appropriate HTTP status codes

### Error Context
- [ ] Errors tracked with `trackError(error, context)`
- [ ] Context includes user ID (if authenticated)
- [ ] Context includes request path and method
- [ ] Context includes relevant IDs (project, asset, etc.)
- [ ] Sensitive data redacted from error logs

## File Upload Security

### Upload Validation
- [ ] File size limits enforced (max 1GB)
- [ ] File type validation (whitelist, not blacklist)
- [ ] MIME type checked, not just extension
- [ ] Malicious file names sanitized
- [ ] Upload directory not directly accessible

### Storage Security
- [ ] Files stored in Supabase storage with policies
- [ ] Storage bucket has size limits
- [ ] Public URLs use signed URLs when appropriate
- [ ] File access controlled by RLS
- [ ] Old/unused files cleaned up

## Environment Security

### Secrets Management
- [ ] No hardcoded secrets in source code
- [ ] All secrets in environment variables
- [ ] `.env` in `.gitignore`
- [ ] `.env.example` has placeholder values only
- [ ] Production secrets use Vercel/Supabase secret storage

### Environment Checks
- [ ] Auth bypass only in development: `process.env.NODE_ENV === 'development'`
- [ ] Debug logs only in development
- [ ] Development endpoints not accessible in production
- [ ] Feature flags properly gated

## Session & CSRF

### Session Security
- [ ] Sessions use secure, HTTP-only cookies
- [ ] Session timeout configured
- [ ] Sessions invalidated on logout
- [ ] Refresh token rotation implemented

### CSRF Protection
- [ ] Next.js built-in CSRF protection enabled
- [ ] State changes require POST/PUT/DELETE (not GET)
- [ ] Origin headers validated for mutations
- [ ] SameSite cookie attribute set

## Project-Specific Checks

### Supabase Security
- [ ] RLS enabled on: users, projects, assets, clips, exports tables
- [ ] Service role key only used in API routes (never client)
- [ ] Anon key used in client with RLS protection
- [ ] Migration files don't contain real data/secrets

### Video Processing Security
- [ ] User can't access other users' videos
- [ ] Video generation has rate limiting
- [ ] Processing queue jobs verify ownership
- [ ] Export URLs expire after time limit

### Asset Management
- [ ] Asset upload requires authentication
- [ ] Asset URLs use signed URLs
- [ ] Asset deletion verifies ownership
- [ ] Asset metadata sanitized

## Compliance

### Data Privacy
- [ ] User data deletion implemented
- [ ] User can export their data
- [ ] PII properly protected
- [ ] Audit logs for sensitive operations

### Security Headers
- [ ] Content-Security-Policy configured
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set
- [ ] Strict-Transport-Security set (HTTPS)
