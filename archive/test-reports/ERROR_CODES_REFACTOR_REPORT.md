# Error Code Enums Refactor Report

## Executive Summary

This report documents the creation of a centralized error code system to eliminate magic strings throughout the codebase. The refactor improves type safety, code maintainability, and developer experience.

## Overview

### Problem Statement
The codebase contained numerous magic strings for:
- HTTP status codes (400, 401, 403, 404, 429, 500, etc.)
- PostgreSQL/PostgREST error codes ('PGRST116', etc.)
- Stripe event codes ('stripe.checkout.error', etc.)
- Application-level error codes

These magic strings led to:
- Type safety issues
- Hard-to-maintain code
- Inconsistent error handling
- Poor IDE autocomplete support

### Solution
Created a comprehensive error code enum system in `/lib/errors/errorCodes.ts` with:
- PostgreSQL error code enums
- HTTP status code enums
- Stripe event code enums
- Database event code enums
- Google Cloud error code enums
- Application error code enums
- Helper functions for common checks

## Files Created

### New File: `/lib/errors/errorCodes.ts`

**Total Lines:** 300+

**Key Enums:**

1. **PostgresErrorCode**
   - `NOT_FOUND = 'PGRST116'`
   - `INVALID_REQUEST = 'PGRST100'`
   - `INVALID_RANGE = 'PGRST103'`
   - `SCHEMA_CACHE_OUTDATED = 'PGRST200'`
   - `AMBIGUOUS_EMBED = 'PGRST201'`
   - `INVALID_BODY = 'PGRST102'`
   - `JWT_INVALID = 'PGRST301'`

2. **HttpStatusCode**
   - Success: `OK = 200`, `CREATED = 201`, `ACCEPTED = 202`, `NO_CONTENT = 204`
   - Client Errors: `BAD_REQUEST = 400`, `UNAUTHORIZED = 401`, `FORBIDDEN = 403`, `NOT_FOUND = 404`, `METHOD_NOT_ALLOWED = 405`, `CONFLICT = 409`, `RATE_LIMITED = 429`
   - Server Errors: `INTERNAL_SERVER_ERROR = 500`, `SERVICE_UNAVAILABLE = 503`, `GATEWAY_TIMEOUT = 504`

3. **StripeEventCode** (59 events)
   - Checkout events (15)
   - Portal events (8)
   - Subscription events (14)
   - Webhook events (9)
   - Customer events (1)

4. **DatabaseEventCode**
   - Query operations
   - Connection events
   - Transaction events

5. **GoogleCloudErrorCode**
   - Common Google Cloud API errors
   - Storage errors

6. **AppErrorCode**
   - Application-specific error codes
   - Business logic errors

**Helper Functions:**
- `isClientError(statusCode: number): boolean` - Check if status is 4xx
- `isServerError(statusCode: number): boolean` - Check if status is 5xx
- `isSuccessStatus(statusCode: number): boolean` - Check if status is 2xx
- `isPostgresNotFound(error: { code?: string }): boolean` - Check for PGRST116
- `shouldRetryOnStatus(statusCode: number): boolean` - Determine if status should trigger retry

## Files Modified

### Core Infrastructure (6 files)

#### 1. `/lib/services/projectService.ts`
**Changes:**
- Added import: `import { PostgresErrorCode, isPostgresNotFound } from '../errors/errorCodes';`
- Replaced 2 occurrences of `error.code === 'PGRST116'` with `isPostgresNotFound(error)`

**Before:**
```typescript
if (dbError.code === 'PGRST116') {
  // Not found
  return null;
}
```

**After:**
```typescript
if (isPostgresNotFound(dbError)) {
  // Not found
  return null;
}
```

#### 2. `/components/SubscriptionManager.tsx`
**Changes:**
- Added import: `import { isPostgresNotFound } from '@/lib/errors/errorCodes';`
- Replaced 1 occurrence of `error.code !== 'PGRST116'` with `!isPostgresNotFound(error)`

**Before:**
```typescript
if (error.code !== 'PGRST116' && !error.message.includes('404')) {
  toast.error('Failed to load subscription data');
}
```

**After:**
```typescript
if (!isPostgresNotFound(error) && !error.message.includes('404')) {
  toast.error('Failed to load subscription data');
}
```

#### 3. `/lib/fetchWithTimeout.ts`
**Changes:**
- Added import: `import { HttpStatusCode, shouldRetryOnStatus } from './errors/errorCodes';`
- Replaced `response.status === 429` with `HttpStatusCode.RATE_LIMITED`
- Replaced `response.status >= 500` with `shouldRetryOnStatus(response.status)`

**Before:**
```typescript
if (response.status === 429) {
  // Handle rate limiting
}
if (response.status >= 500 && attempt < maxRetries - 1) {
  // Retry server errors
}
```

**After:**
```typescript
if (response.status === HttpStatusCode.RATE_LIMITED) {
  // Handle rate limiting
}
if (shouldRetryOnStatus(response.status) && attempt < maxRetries - 1) {
  // Retry server errors
}
```

#### 4. `/lib/api/response.ts`
**Changes:**
- Added import: `import { HttpStatusCode } from '../errors/errorCodes';`
- Replaced 11 magic number status codes with enum values

**Replacements:**
- Default status `500` → `HttpStatusCode.INTERNAL_SERVER_ERROR`
- Default status `200` → `HttpStatusCode.OK`
- `401` → `HttpStatusCode.UNAUTHORIZED`
- `403` → `HttpStatusCode.FORBIDDEN`
- `404` → `HttpStatusCode.NOT_FOUND`
- `400` → `HttpStatusCode.BAD_REQUEST`
- `429` → `HttpStatusCode.RATE_LIMITED`
- `409` → `HttpStatusCode.CONFLICT`

**Before:**
```typescript
export function errorResponse(
  message: string,
  status: number = 500,
  field?: string,
  details?: unknown
): NextResponse<ErrorResponse>

export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse<ErrorResponse> {
  return errorResponse(message, 401);
}
```

**After:**
```typescript
export function errorResponse(
  message: string,
  status: number = HttpStatusCode.INTERNAL_SERVER_ERROR,
  field?: string,
  details?: unknown
): NextResponse<ErrorResponse>

export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse<ErrorResponse> {
  return errorResponse(message, HttpStatusCode.UNAUTHORIZED);
}
```

#### 5. `/lib/api/withAuth.ts`
**Changes:**
- Added import: `import { HttpStatusCode, isClientError, isServerError } from '../errors/errorCodes';`
- Replaced 5 magic number status codes
- Replaced 2 status range checks with helper functions

**Before:**
```typescript
return NextResponse.json(
  { error: 'Unauthorized' },
  { status: 401 }
);

if (status >= 500) {
  logger.error(...);
} else if (status >= 400) {
  logger.warn(...);
}
```

**After:**
```typescript
return NextResponse.json(
  { error: 'Unauthorized' },
  { status: HttpStatusCode.UNAUTHORIZED }
);

if (isServerError(status)) {
  logger.error(...);
} else if (isClientError(status)) {
  logger.warn(...);
}
```

#### 6. `/lib/middleware/apiLogger.ts`
**Changes:**
- Added import: `import { isClientError, isServerError } from '../errors/errorCodes';`
- Replaced 2 status range checks with helper functions

**Before:**
```typescript
if (status >= 500) {
  logger.error(responseContext, `${method} ${route} failed with ${status} (${duration}ms)`);
} else if (status >= 400) {
  logger.warn(responseContext, `${method} ${route} returned ${status} (${duration}ms)`);
}
```

**After:**
```typescript
if (isServerError(status)) {
  logger.error(responseContext, `${method} ${route} failed with ${status} (${duration}ms)`);
} else if (isClientError(status)) {
  logger.warn(responseContext, `${method} ${route} returned ${status} (${duration}ms)`);
}
```

## Statistics

### Magic Strings Found (Before Refactor)
- **HTTP Status Codes in API Routes:** ~163 occurrences
- **PostgreSQL Error Codes (PGRST116):** 10 occurrences
- **Stripe Event Codes:** 59 occurrences
- **Total Magic Strings:** ~232 occurrences

### Files Modified
- **New Files Created:** 1 (`lib/errors/errorCodes.ts`)
- **Files Updated:** 6 core infrastructure files
- **Lines of Code Added:** ~300 (new enum file)
- **Magic Strings Replaced:** 23 in core files (Phase 1)

### Remaining Work
The following files still contain magic status codes and should be updated in future phases:
- `app/api/stripe/checkout/route.ts` - 6 status codes
- `app/api/stripe/portal/route.ts` - 4 status codes
- `app/api/stripe/webhook/route.ts` - 6 status codes
- `app/api/assets/upload/route.ts` - 12 status codes
- `app/api/export/route.ts` - 25+ status codes
- `app/api/video/**/*.ts` - Multiple files
- `app/api/frames/**/*.ts` - Multiple files
- Other API routes - ~100+ remaining occurrences

## Benefits

### 1. Type Safety
- TypeScript can now autocomplete error codes
- Compiler catches typos in error codes
- Refactoring error codes is now safe and IDE-assisted

### 2. Code Readability
**Before:**
```typescript
if (error.code !== 'PGRST116') { }
if (response.status === 429) { }
return NextResponse.json(error, { status: 500 });
```

**After:**
```typescript
if (!isPostgresNotFound(error)) { }
if (response.status === HttpStatusCode.RATE_LIMITED) { }
return NextResponse.json(error, { status: HttpStatusCode.INTERNAL_SERVER_ERROR });
```

### 3. Maintainability
- Single source of truth for all error codes
- JSDoc documentation for each error code
- Easy to add new error codes
- Centralized error handling logic

### 4. Developer Experience
- IDE autocomplete for error codes
- Quick navigation to error code definitions
- Self-documenting code
- Reduced cognitive load

## Code Examples

### Example 1: PostgreSQL Error Handling
**Before:**
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .single();

if (error) {
  if (error.code === 'PGRST116') {
    return null; // Not found
  }
  throw new Error(error.message);
}
```

**After:**
```typescript
import { isPostgresNotFound } from '@/lib/errors/errorCodes';

const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .single();

if (error) {
  if (isPostgresNotFound(error)) {
    return null; // Not found
  }
  throw new Error(error.message);
}
```

### Example 2: HTTP Status Codes
**Before:**
```typescript
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
return NextResponse.json({ error: 'Not found' }, { status: 404 });
return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
return NextResponse.json({ error: 'Internal error' }, { status: 500 });
```

**After:**
```typescript
import { HttpStatusCode } from '@/lib/errors/errorCodes';

return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatusCode.UNAUTHORIZED });
return NextResponse.json({ error: 'Not found' }, { status: HttpStatusCode.NOT_FOUND });
return NextResponse.json({ error: 'Rate limited' }, { status: HttpStatusCode.RATE_LIMITED });
return NextResponse.json({ error: 'Internal error' }, { status: HttpStatusCode.INTERNAL_SERVER_ERROR });
```

### Example 3: Status Code Checks
**Before:**
```typescript
if (response.status >= 500) {
  logger.error('Server error');
} else if (response.status >= 400) {
  logger.warn('Client error');
}

if (response.status === 429 || response.status >= 500) {
  // Retry logic
}
```

**After:**
```typescript
import { isServerError, isClientError, shouldRetryOnStatus } from '@/lib/errors/errorCodes';

if (isServerError(response.status)) {
  logger.error('Server error');
} else if (isClientError(response.status)) {
  logger.warn('Client error');
}

if (shouldRetryOnStatus(response.status)) {
  // Retry logic
}
```

### Example 4: Stripe Events (Future Use)
**Before:**
```typescript
serverLogger.info({
  event: 'stripe.checkout.session_created',
  sessionId: session.id
});

serverLogger.error({
  event: 'stripe.webhook.verification_failed',
  error: err.message
});
```

**After:**
```typescript
import { StripeEventCode } from '@/lib/errors/errorCodes';

serverLogger.info({
  event: StripeEventCode.CHECKOUT_SESSION_CREATED,
  sessionId: session.id
});

serverLogger.error({
  event: StripeEventCode.WEBHOOK_VERIFICATION_FAILED,
  error: err.message
});
```

## Testing Recommendations

### Unit Tests to Add
1. Test `isPostgresNotFound()` with various error objects
2. Test `isClientError()`, `isServerError()`, `isSuccessStatus()` with edge cases
3. Test `shouldRetryOnStatus()` with different status codes
4. Verify enum values match expected strings/numbers

### Integration Tests
1. Test API routes return correct status codes
2. Test error handling with PostgreSQL errors
3. Test retry logic with different status codes
4. Test Stripe webhook event logging

## Migration Guide

### For Future Developers

When adding new error codes:

1. **HTTP Status Codes:** Use `HttpStatusCode` enum
   ```typescript
   import { HttpStatusCode } from '@/lib/errors/errorCodes';
   return NextResponse.json(data, { status: HttpStatusCode.CREATED });
   ```

2. **PostgreSQL Errors:** Use helper functions or enum
   ```typescript
   import { isPostgresNotFound, PostgresErrorCode } from '@/lib/errors/errorCodes';
   if (isPostgresNotFound(error)) { /* handle */ }
   if (error.code === PostgresErrorCode.JWT_INVALID) { /* handle */ }
   ```

3. **Stripe Events:** Use `StripeEventCode` enum
   ```typescript
   import { StripeEventCode } from '@/lib/errors/errorCodes';
   logger.info({ event: StripeEventCode.CHECKOUT_COMPLETED });
   ```

4. **Custom App Errors:** Use `AppErrorCode` enum
   ```typescript
   import { AppErrorCode } from '@/lib/errors/errorCodes';
   throw new AppError(AppErrorCode.QUOTA_EXCEEDED, 'User quota exceeded');
   ```

### Migration Checklist for Remaining Files

For each API route file:

- [ ] Import relevant enums from `@/lib/errors/errorCodes`
- [ ] Replace `{ status: 400 }` with `{ status: HttpStatusCode.BAD_REQUEST }`
- [ ] Replace `{ status: 401 }` with `{ status: HttpStatusCode.UNAUTHORIZED }`
- [ ] Replace `{ status: 403 }` with `{ status: HttpStatusCode.FORBIDDEN }`
- [ ] Replace `{ status: 404 }` with `{ status: HttpStatusCode.NOT_FOUND }`
- [ ] Replace `{ status: 429 }` with `{ status: HttpStatusCode.RATE_LIMITED }`
- [ ] Replace `{ status: 500 }` with `{ status: HttpStatusCode.INTERNAL_SERVER_ERROR }`
- [ ] Replace `{ status: 503 }` with `{ status: HttpStatusCode.SERVICE_UNAVAILABLE }`
- [ ] Replace status comparisons (`>= 400`, `>= 500`) with helper functions
- [ ] Replace `error.code === 'PGRST116'` with `isPostgresNotFound(error)`
- [ ] Replace Stripe event strings with `StripeEventCode` enum values

## Conclusion

This refactor establishes a strong foundation for type-safe error handling across the application. The centralized error code system improves:
- Code quality and maintainability
- Developer productivity
- Type safety and IDE support
- Error handling consistency

### Phase 1 Complete ✓
- Created comprehensive error code enum system
- Updated 6 core infrastructure files
- Replaced 23 magic strings in critical paths
- Established patterns for future migrations

### Next Steps (Phase 2+)
1. Update API route files (30+ files, ~140 occurrences)
2. Update test files to use enums
3. Add unit tests for error code utilities
4. Create linting rules to prevent new magic strings
5. Document error handling patterns in team wiki

### Metrics
- **Code Quality:** Improved type safety and readability
- **Maintainability:** Single source of truth for error codes
- **Developer Experience:** Better autocomplete and documentation
- **Test Coverage:** Foundation for improved error handling tests
