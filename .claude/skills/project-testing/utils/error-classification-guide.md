# Error Classification System

## Overview

Classifies errors to make intelligent retry decisions and prioritize fixes.

## Error Types

### Transient Errors (Retryable)

**Network Errors:**

- ECONNREFUSED - Connection refused
- ETIMEDOUT - Request timeout
- ENOTFOUND - DNS lookup failed
- Network disconnected
- Socket hang up

**Server Errors (5xx):**

- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout

**Rate Limiting:**

- 429 Too Many Requests (longer backoff)

**Timeout Errors:**

- Navigation timeout
- Element wait timeout
- Screenshot timeout
- Operation timeout

**Action:** Retry 2-3 times with exponential backoff

---

### Permanent Errors (Not Retryable)

**Client Errors (4xx except 429):**

- 400 Bad Request - Invalid input
- 401 Unauthorized - Authentication failed
- 403 Forbidden - No permission
- 404 Not Found - Resource doesn't exist
- 422 Unprocessable Entity - Validation failed

**Authentication Errors:**

- Invalid credentials
- Expired token (unless session expired)
- Missing authorization header
- Invalid API key

**Validation Errors:**

- Required field missing
- Invalid format (email, URL, etc.)
- Schema validation failed
- Type mismatch

**Action:** Report immediately, don't waste time retrying

---

### Ambiguous Errors (Retry Once)

**Unknown Errors:**

- Generic "Error" message
- No error code provided
- Unrecognized error type
- Third-party service error

**Browser Errors:**

- Element not found (could be timing)
- Stale element reference
- JavaScript error in page

**Action:** Retry once, then report if still fails

---

## Classification Function

```typescript
enum ErrorType {
  TRANSIENT = 'transient',
  PERMANENT = 'permanent',
  AMBIGUOUS = 'ambiguous',
}

enum ErrorCategory {
  NETWORK = 'network',
  SERVER = 'server',
  CLIENT = 'client',
  AUTH = 'auth',
  TIMEOUT = 'timeout',
  VALIDATION = 'validation',
  BROWSER = 'browser',
  UNKNOWN = 'unknown',
}

interface ClassifiedError {
  type: ErrorType;
  category: ErrorCategory;
  retryable: boolean;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  message: string;
  suggestedBackoffMs?: number;
}

function classifyError(error: Error): ClassifiedError {
  const message = error.message.toLowerCase();

  // Network errors - TRANSIENT
  if (
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('network') ||
    message.includes('socket')
  ) {
    return {
      type: ErrorType.TRANSIENT,
      category: ErrorCategory.NETWORK,
      retryable: true,
      priority: 'P2',
      message: error.message,
    };
  }

  // Timeout errors - TRANSIENT
  if (message.includes('timeout')) {
    return {
      type: ErrorType.TRANSIENT,
      category: ErrorCategory.TIMEOUT,
      retryable: true,
      priority: 'P1',
      message: error.message,
    };
  }

  // 5xx errors - TRANSIENT
  if (message.match(/5\d{2}/)) {
    return {
      type: ErrorType.TRANSIENT,
      category: ErrorCategory.SERVER,
      retryable: true,
      priority: 'P1',
      message: error.message,
    };
  }

  // 429 Rate limit - TRANSIENT (longer backoff)
  if (message.includes('429') || message.includes('rate limit')) {
    return {
      type: ErrorType.TRANSIENT,
      category: ErrorCategory.SERVER,
      retryable: true,
      priority: 'P1',
      message: error.message,
      suggestedBackoffMs: 10000, // 10 seconds
    };
  }

  // 4xx errors (except 429) - PERMANENT
  if (message.match(/4\d{2}/) && !message.includes('429')) {
    return {
      type: ErrorType.PERMANENT,
      category: ErrorCategory.CLIENT,
      retryable: false,
      priority: 'P0',
      message: error.message,
    };
  }

  // Authentication errors - PERMANENT (unless session expired)
  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('authentication')
  ) {
    const isSessionExpired = message.includes('session') || message.includes('expired');
    return {
      type: isSessionExpired ? ErrorType.TRANSIENT : ErrorType.PERMANENT,
      category: ErrorCategory.AUTH,
      retryable: isSessionExpired,
      priority: isSessionExpired ? 'P1' : 'P0',
      message: error.message,
    };
  }

  // Validation errors - PERMANENT
  if (
    message.includes('validation') ||
    message.includes('required') ||
    message.includes('invalid')
  ) {
    return {
      type: ErrorType.PERMANENT,
      category: ErrorCategory.VALIDATION,
      retryable: false,
      priority: 'P2',
      message: error.message,
    };
  }

  // Browser errors - AMBIGUOUS
  if (
    message.includes('element not found') ||
    message.includes('stale element') ||
    message.includes('javascript error')
  ) {
    return {
      type: ErrorType.AMBIGUOUS,
      category: ErrorCategory.BROWSER,
      retryable: true, // Retry once
      priority: 'P2',
      message: error.message,
    };
  }

  // Default - AMBIGUOUS
  return {
    type: ErrorType.AMBIGUOUS,
    category: ErrorCategory.UNKNOWN,
    retryable: true, // Retry once
    priority: 'P3',
    message: error.message,
  };
}
```

## Agent Usage

### Example 1: Navigate with Classification

```typescript
try {
  await mcp__chrome_devtools__navigate_page({ url: productionUrl });
} catch (error) {
  const classified = classifyError(error);

  console.log(`Error Type: ${classified.type}`);
  console.log(`Category: ${classified.category}`);
  console.log(`Retryable: ${classified.retryable}`);
  console.log(`Priority: ${classified.priority}`);

  if (classified.retryable) {
    // Retry with appropriate backoff
    const backoff = classified.suggestedBackoffMs || 2000;
    await sleep(backoff);
    // Retry operation...
  } else {
    // Report permanent error immediately
    throw new Error(`Permanent error (${classified.category}): ${classified.message}`);
  }
}
```

### Example 2: Batch Error Classification

```typescript
const errors: Error[] = collectAllErrors();
const classified = errors.map(classifyError);

// Group by type
const transient = classified.filter((e) => e.type === ErrorType.TRANSIENT);
const permanent = classified.filter((e) => e.type === ErrorType.PERMANENT);
const ambiguous = classified.filter((e) => e.type === ErrorType.AMBIGUOUS);

console.log(`Transient (will retry): ${transient.length}`);
console.log(`Permanent (won't retry): ${permanent.length}`);
console.log(`Ambiguous (retry once): ${ambiguous.length}`);

// Prioritize fixes by priority
const p0Errors = permanent.filter((e) => e.priority === 'P0');
const p1Errors = classified.filter((e) => e.priority === 'P1');
// ...
```

## Priority Assignment

**P0 (Critical - Blocks Core Functionality):**

- Authentication failures (permanent)
- 404 Not Found (resource doesn't exist)
- 403 Forbidden (no permission)
- Database errors

**P1 (High - Major Features Broken):**

- Timeouts (transient, but indicates problem)
- 5xx errors (server issues)
- Rate limiting (temporary)
- Session expired

**P2 (Medium - Minor Issues):**

- Network errors (transient)
- Validation errors (fix and retry)
- Browser element timing issues

**P3 (Low - Non-blocking):**

- Unknown errors (ambiguous)
- Warnings
- Deprecation notices

## Reporting

### Error Summary Report

```markdown
## Error Classification Summary

**Total Errors:** 15

### By Type

- Transient: 8 (53%) - Will retry
- Permanent: 5 (33%) - Won't retry
- Ambiguous: 2 (13%) - Retry once

### By Category

- Network: 4
- Server (5xx): 3
- Client (4xx): 3
- Authentication: 2
- Timeout: 2
- Unknown: 1

### By Priority

- P0 (Critical): 3 errors
- P1 (High): 7 errors
- P2 (Medium): 4 errors
- P3 (Low): 1 error

### Fix Strategy

1. Fix P0 permanent errors immediately (auth, 404)
2. Retry P1 transient errors (timeouts, 5xx)
3. Investigate P2 errors if retries fail
4. Monitor P3 errors
```

## Benefits

1. **Faster Resolution:**
   - Skip retry for permanent errors (60% time savings)
   - Prioritize critical fixes first
   - Don't waste iterations on non-issues

2. **Better Reporting:**
   - Clear error categorization
   - Priority-based fix ordering
   - Expected fix effort visible

3. **Smarter Retry Logic:**
   - Appropriate backoff for each type
   - Rate limit handled specially
   - Session expiry auto-recovery
