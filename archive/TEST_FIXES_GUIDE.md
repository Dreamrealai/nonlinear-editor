# Test Stability Fixes Guide

## Overview

This document describes the test failures identified and the solutions to fix them.

## Primary Issue: API Response Mock Pattern

### Problem

Many API route tests are failing with `TypeError: Cannot read properties of undefined (reading 'status')` because they mock the `@/lib/api/response` module incorrectly.

**Root Cause**: Tests were mocking individual response functions (like `unauthorizedResponse`, `validationError`, etc.) to return basic `Response` objects instead of `NextResponse` objects. When routes use `withErrorHandling` wrapper, the actual implementation needs to return proper `NextResponse` objects.

### Solution

Instead of manually mocking each response function, use the actual implementations from the module:

**BEFORE (Incorrect)**:

```typescript
jest.mock('@/lib/api/response', () => ({
  unauthorizedResponse: jest.fn(
    () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  ),
  validationError: jest.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  errorResponse: jest.fn((msg, status) => new Response(JSON.stringify({ error: msg }), { status })),
  successResponse: jest.fn((data) => new Response(JSON.stringify(data), { status: 200 })),
  withErrorHandling: jest.fn((handler) => handler),
}));
```

**AFTER (Correct)**:

```typescript
jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    withErrorHandling: jest.fn((handler) => handler),
  };
});
```

### Files That Need This Fix

Based on test analysis, the following API test files need the response mock fix:

1. `__tests__/api/image/generate.test.ts` ✅ Pattern identified
2. `__tests__/api/video/generate.test.ts` ✅ Pattern identified
3. `__tests__/api/video/upscale.test.ts` ✅ Pattern identified
4. `__tests__/api/ai/chat.test.ts` (uses auto-mock - needs fix)
5. `__tests__/api/video/status.test.ts` (uses auto-mock - needs fix)
6. Other failing API tests with similar patterns

### Auto-Mock Pattern Issue

Some tests use `jest.mock('@/lib/api/response');` without any implementation, which auto-mocks all exports. This also needs to be fixed:

**BEFORE**:

```typescript
jest.mock('@/lib/api/response');
```

**AFTER**:

```typescript
jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return actual;
});
```

## Secondary Issue: Supabase Mock Setup

### Problem

Some tests like `video/generate.test.ts` call `jest.clearAllMocks()` in `beforeEach`, which clears the `createServerSupabaseClient.mockResolvedValue()` setup. This causes the route to receive `undefined` when calling `await createServerSupabaseClient()`.

### Solution

Re-setup the Supabase mock after `jest.clearAllMocks()`:

```typescript
beforeEach(() => {
  jest.clearAllMocks();

  const { __getMockClient, createServerSupabaseClient } = require('@/lib/supabase');
  mockSupabase = __getMockClient();

  // IMPORTANT: Re-setup the mock after clearAllMocks
  createServerSupabaseClient.mockResolvedValue(mockSupabase);

  // Setup other mocks...
});
```

## Component Test Issues

### React Act Warnings

Many component tests show warnings:

```
An update to [Component] inside a test was not wrapped in act(...)
```

**Common Causes**:

1. State updates in useEffect hooks
2. Async operations completing after test assertions
3. setTimeout/setInterval not cleaned up

**Solutions**:

1. **Wrap async operations in act()**:

```typescript
await act(async () => {
  render(<Component />);
});
```

2. **Wait for async updates**:

```typescript
await waitFor(() => {
  expect(screen.getByText('...')).toBeInTheDocument();
});
```

3. **Mock timers properly**:

```typescript
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});
```

### Timeout Issues

Tests timing out (especially file upload tests in `ai/chat.test.ts`):

**Solution**:

1. Increase timeout for specific tests: `it('test name', async () => { ... }, 30000);`
2. Mock file reading operations to return immediately
3. Check for infinite loops or missing mock responses

## Test Utility Created

A new utility has been created to help with proper mock setup:

```typescript
// test-utils/mockApiResponse.ts
export function mockApiResponse() {
  jest.mock('@/lib/api/response', () => {
    const actual = jest.requireActual('@/lib/api/response');
    return {
      ...actual,
      withErrorHandling: jest.fn((handler) => handler),
    };
  });
}
```

**Usage** (future tests):

```typescript
import { mockApiResponse } from '@/test-utils/mockApiResponse';
mockApiResponse();
```

## Test Statistics

**Initial State** (from issue log):

- Total tests: 1785
- Passing: 1703 (95.3%)
- Failing: 82 (4.6%)
- Failing test suites: 22

**Actual State** (discovered during fix):

- Total tests: 3421
- Passing: 2745
- Failing: 674 (19.7%)
- Skipped: 2
- Failing test suites: 73

**After Response Mock Fix Applied to export.test.ts**:

- export.test.ts: 56/56 passing ✅

## Action Items for Complete Fix

### High Priority (API Routes)

1. Apply response mock fix to all API route tests with old pattern
2. Fix Supabase mock setup in tests using `jest.clearAllMocks()`
3. Fix auto-mock pattern in remaining API tests

### Medium Priority (Components)

1. Fix React act() warnings in component tests
2. Increase timeouts for slow integration tests
3. Fix async/await patterns in component tests

### Low Priority (Documentation)

1. Update test writing guidelines
2. Add examples of proper mock setup
3. Document common pitfalls

## Verification Steps

After applying fixes:

1. Run specific test suite: `npm test -- __tests__/api/[name].test.ts`
2. Clear Jest cache if seeing stale results: `npx jest --clearCache`
3. Run full API test suite: `npm test -- __tests__/api/`
4. Run full test suite: `npm test`

## Expected Outcome

With all fixes applied:

- API route tests should have 98%+ pass rate
- Component tests should have minimal React act() warnings
- Overall test pass rate should exceed 98%
- Test execution should complete without timeouts

## Notes

- The response mock fix is critical because routes depend on proper `NextResponse` objects
- Simply changing `Response` to `NextResponse` in mocks won't work - need actual implementations
- The `withErrorHandling` wrapper must still be mocked to avoid error handling overhead in tests
- Tests should use actual implementations when possible, only mock what's necessary
