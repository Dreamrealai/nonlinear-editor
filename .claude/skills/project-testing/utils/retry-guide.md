# Retry Logic Guide for Testing Agents

## Pattern: Exponential Backoff with Jitter

### When to Retry

**Retry (max 3 attempts):**

- Network errors (ECONNREFUSED, ETIMEDOUT, ENOTFOUND)
- Timeout errors (request timeout, operation timeout)
- 5xx errors (500, 502, 503, 504)
- 429 Rate limit errors (with longer backoff)

**DO NOT Retry:**

- 4xx errors except 429 (400, 401, 403, 404, 422)
- Authentication failures (invalid credentials)
- Not found errors (resource doesn't exist)
- Validation errors (bad request)

### Retry Delays

**Standard backoff:**

- Attempt 1: 2000ms (2s)
- Attempt 2: 4000ms (4s)
- Attempt 3: 8000ms (8s)

**With jitter (±10%):**

- Attempt 1: 1800-2200ms
- Attempt 2: 3600-4400ms
- Attempt 3: 7200-8800ms

**Rate limit (429) backoff:**

- Attempt 1: 10000ms (10s)
- Attempt 2: 30000ms (30s)
- Attempt 3: 60000ms (60s)

### Implementation Example

```typescript
async function retryOperation<T>(operation: () => Promise<T>, maxAttempts: number = 3): Promise<T> {
  const baseDelay = 2000;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryable(error)) {
        throw error;
      }

      // Don't delay after last attempt
      if (attempt === maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const baseDelayMs = error.message.includes('429') ? 10000 : baseDelay;
      let delay = baseDelayMs * Math.pow(2, attempt - 1);

      // Add jitter (±10%)
      const jitterFactor = 0.1;
      delay = delay * (1 + (Math.random() - 0.5) * jitterFactor);

      console.log(`Retry attempt ${attempt}/${maxAttempts} after ${Math.round(delay)}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

function isRetryable(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused')
  ) {
    return true;
  }

  // 5xx server errors
  if (message.match(/5\d{2}/)) {
    return true;
  }

  // Rate limit
  if (message.includes('429') || message.includes('rate limit')) {
    return true;
  }

  // 4xx errors (except 429) are NOT retryable
  if (message.match(/4\d{2}/) && !message.includes('429')) {
    return false;
  }

  // Default: not retryable
  return false;
}
```

### Agent Instructions

When using Chrome DevTools MCP or Axiom MCP:

```markdown
Wrap all operations in retry logic:

1. Navigate to page:
   retryOperation(() => mcp**chrome_devtools**navigate_page({url}), 3)

2. Click element:
   retryOperation(() => mcp**chrome_devtools**click({uid}), 3)

3. Query Axiom:
   retryOperation(() => mcp**axiom**queryApl({query}), 3)

4. Log retry attempts:
   "Retry {attempt}/3 after {delay}ms due to {error}"

5. Report final status:
   - Success: "Operation succeeded after {attempts} attempts"
   - Failure: "Operation failed after 3 attempts: {error}"
```

### Error Handling Examples

**Network Timeout:**

```
Error: Navigation timeout after 30s
→ Retry 1/3 after 2s
→ Retry 2/3 after 4s
→ Success on attempt 3
```

**Authentication Error:**

```
Error: 401 Unauthorized
→ DO NOT RETRY (permanent error)
→ Report immediately
```

**Rate Limit:**

```
Error: 429 Too Many Requests
→ Retry 1/3 after 10s (longer backoff)
→ Success on attempt 2
```

### Best Practices

1. **Always log retry attempts** - helps debugging
2. **Use appropriate timeouts** - don't retry forever
3. **Classify errors correctly** - avoid wasting time
4. **Add jitter** - prevents synchronized retry storms
5. **Respect rate limits** - use longer backoff for 429s

### Testing

To test retry logic:

1. Simulate network failure
2. Verify 3 retry attempts with correct delays
3. Confirm jitter is applied
4. Verify permanent errors fail immediately
