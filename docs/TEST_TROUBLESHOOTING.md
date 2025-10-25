# Test Troubleshooting Guide

**Quick reference for diagnosing and fixing common test failures.**

Last Updated: 2025-10-24
Maintained by: Engineering Team

---

## Table of Contents

1. [Overview](#overview)
2. [withAuth Mock Issues](#withauth-mock-issues)
3. [Async/Timing Issues](#asynctiming-issues)
4. [Component Test Failures](#component-test-failures)
5. [Integration Test Failures](#integration-test-failures)
6. [Mock Configuration Issues](#mock-configuration-issues)
7. [Import/Module Issues](#importmodule-issues)
8. [Environment Issues](#environment-issues)
9. [Performance Issues](#performance-issues)
10. [Quick Fixes](#quick-fixes)

---

## Overview

This guide provides quick solutions to common test errors. Each section includes:
- Error message examples
- Root cause explanation
- Step-by-step fix
- Prevention tips

**Quick Navigation:**
- Timeout errors → [withAuth Mock Issues](#withauth-mock-issues) or [Async/Timing Issues](#asynctiming-issues)
- Import errors → [Import/Module Issues](#importmodule-issues)
- Mock not called → [Mock Configuration Issues](#mock-configuration-issues)
- Flaky tests → [Async/Timing Issues](#asynctiming-issues)
- Component errors → [Component Test Failures](#component-test-failures)

---

## withAuth Mock Issues

### Error 1: Test Timeout (5000ms)

**Error Message:**
```
Timeout - Async callback was not invoked within the timeout period of 5000ms
```

**Root Cause:**
- withAuth mock not properly configured
- Mock factory accessing external variables (not allowed)
- Missing or incorrect parameter handling

**Fix:**

```typescript
// ✅ CORRECT PATTERN - Use this for ALL authenticated routes

// 1. Mock withAuth BEFORE importing route
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => async (req: any, context: any) => {
    // IMPORTANT: Use require() inside factory
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
      });
    }

    const authContext = { user, supabase };

    // Handle both 2-param and 3-param handlers
    if (context?.params !== undefined) {
      // Dynamic route: /api/projects/[projectId]
      return handler(req, authContext, { params: context.params });
    } else {
      // Static route: /api/projects
      return handler(req, authContext);
    }
  },
}));

// 2. Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

// 3. Mock logger
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// 4. Import AFTER mocks
import { GET, POST } from '@/app/api/projects/route';

describe('API Route', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Supabase
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    // Configure mock
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  it('should work', async () => {
    const request = new NextRequest('http://localhost/api/projects');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

**Prevention:**
- Always use the correct withAuth pattern
- Never reference external variables in jest.mock() factories
- Check parameter handling for dynamic routes

**Reference:** [TESTING_BEST_PRACTICES.md - withAuth Pattern](./TESTING_BEST_PRACTICES.md#the-withauth-mock-pattern-critical)

### Error 2: Unauthorized (401) When Should Be Authenticated

**Error Message:**
```
Expected status: 200
Received status: 401
```

**Root Cause:**
- Mock user not configured
- getUser() returning null

**Fix:**

```typescript
beforeEach(() => {
  // ✅ Configure authenticated user
  mockSupabase.auth = {
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user',
          email: 'test@example.com',
          // Add other required fields
        }
      },
      error: null,
    }),
  };
});

// For unauthenticated tests
it('should reject unauthenticated', async () => {
  // ✅ Configure unauthenticated user
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });

  const response = await GET(request);
  expect(response.status).toBe(401);
});
```

**Prevention:**
- Always configure auth in beforeEach
- Reset mocks between tests
- Verify user object has required fields

### Error 3: Mock Factory Scope Error

**Error Message:**
```
ReferenceError: mockSupabase is not defined
```

**Root Cause:**
- Trying to access external variable in jest.mock() factory

**Fix:**

```typescript
// ❌ WRONG - Cannot access external variable
const mockSupabase = createMockSupabaseClient();

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn().mockResolvedValue(mockSupabase), // ❌
}));

// ✅ CORRECT - Define inline, configure in test
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(), // ✅ No external reference
}));

describe('Test', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();

    // ✅ Configure here
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });
});
```

**Prevention:**
- Never reference variables outside jest.mock()
- Use require() inside factories
- Configure mocks in beforeEach

---

## Async/Timing Issues

### Error 1: Element Not Found

**Error Message:**
```
TestingLibraryElementError: Unable to find an element with the text: Expected Text
```

**Root Cause:**
- Element hasn't rendered yet
- Async operation not complete
- Wrong query selector

**Fix:**

```typescript
// ❌ WRONG - Synchronous query
test('loads data', () => {
  render(<MyComponent />);
  expect(screen.getByText('Loaded')).toBeInTheDocument(); // ❌ Fails
});

// ✅ CORRECT - Wait for async operation
test('loads data', async () => {
  render(<MyComponent />);

  // Option 1: Use findBy (waits automatically)
  expect(await screen.findByText('Loaded')).toBeInTheDocument();

  // Option 2: Use waitFor
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });

  // Option 3: Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

**Prevention:**
- Use findBy for elements that appear asynchronously
- Use waitFor for complex assertions
- Always wait for loading states to finish

### Error 2: Act Warning

**Error Message:**
```
Warning: An update to Component inside a test was not wrapped in act(...)
```

**Root Cause:**
- State update after component rendered
- Async operation not awaited

**Fix:**

```typescript
// ❌ WRONG - Not awaited
test('clicks button', () => {
  const { user } = render(<MyComponent />);
  user.click(screen.getByRole('button')); // ❌ Not awaited
  expect(screen.getByText('Clicked')).toBeInTheDocument();
});

// ✅ CORRECT - Await user interactions
test('clicks button', async () => {
  const { user } = render(<MyComponent />);
  await user.click(screen.getByRole('button')); // ✅

  await waitFor(() => {
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});

// ✅ CORRECT - Manual act wrapper
test('updates state', async () => {
  const { result } = renderHook(() => useMyHook());

  await act(async () => {
    await result.current.updateState();
  });

  expect(result.current.value).toBe(expected);
});
```

**Prevention:**
- Always await user-event actions
- Wrap state updates in act()
- Use waitFor for assertions after state changes

### Error 3: Flaky Test (Intermittent Failures)

**Error Message:**
Test passes sometimes, fails other times

**Root Cause:**
- Race condition
- Timing dependency
- Shared state between tests

**Fix:**

```typescript
// ❌ WRONG - Race condition
test('loads data', async () => {
  render(<MyComponent />);
  await new Promise(resolve => setTimeout(resolve, 100)); // ❌ Arbitrary delay
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// ✅ CORRECT - Wait for condition
test('loads data', async () => {
  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  }, { timeout: 5000 }); // ✅ Waits until condition met
});

// ✅ CORRECT - Reset state between tests
afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});

// ✅ CORRECT - Use fake timers
test('delays action', () => {
  jest.useFakeTimers();

  render(<MyComponent />);

  act(() => {
    jest.advanceTimersByTime(1000);
  });

  expect(screen.getByText('After Delay')).toBeInTheDocument();

  jest.useRealTimers();
});
```

**Prevention:**
- Never use arbitrary setTimeout in tests
- Always use waitFor with conditions
- Reset mocks and state between tests
- Use fake timers for time-based tests

---

## Component Test Failures

### Error 1: Invalid HTML Nesting

**Error Message:**
```
Warning: validateDOMNesting(...): <button> cannot appear as a descendant of <button>
Error: Uncaught [Error: Hydration failed]
```

**Root Cause:**
- Nested interactive elements (invalid HTML)

**Fix:**

```typescript
// ❌ WRONG - Nested buttons
<button onClick={handleOuter}>
  Click here or{' '}
  <button onClick={handleInner}>click here</button>
</button>

// ✅ CORRECT - Use div with button role for outer element
<div
  role="button"
  tabIndex={disabled ? -1 : 0}
  onClick={() => !disabled && handleOuter()}
  onKeyDown={(e) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleOuter();
    }
  }}
  aria-disabled={disabled}
  aria-label="Upload or select"
>
  Click here or{' '}
  <button onClick={handleInner}>click here</button>
</div>
```

**Prevention:**
- Never nest buttons, links, or other interactive elements
- Use div with proper ARIA attributes
- Add keyboard support (Enter/Space)
- Test for HTML validation errors

### Error 2: Query Selector Ambiguity

**Error Message:**
```
TestingLibraryElementError: Found multiple elements with the role "button"
```

**Root Cause:**
- Query matches multiple elements
- Not specific enough

**Fix:**

```typescript
// ❌ WRONG - Too broad
screen.getByRole('button'); // Multiple buttons on page
screen.getByText(/submit/i); // Matches multiple elements

// ✅ CORRECT - Be specific
screen.getByRole('button', { name: 'Submit Form' }); // Exact button
screen.getByTestId('submit-button'); // Unique identifier

// ✅ CORRECT - Use within
const form = screen.getByRole('form', { name: 'Login' });
within(form).getByRole('button', { name: 'Submit' });

// ✅ CORRECT - Use getAllBy and index (last resort)
const buttons = screen.getAllByRole('button');
expect(buttons[0]).toHaveTextContent('Cancel');
expect(buttons[1]).toHaveTextContent('Submit');
```

**Prevention:**
- Use data-testid for disambiguation
- Use within to scope queries
- Make button labels unique and descriptive
- Prefer getByRole with name option

### Error 3: Missing Mock for API Call

**Error Message:**
```
TypeError: Cannot read property 'json' of undefined
Error: Network request failed
```

**Root Cause:**
- fetch() or API call not mocked

**Fix:**

```typescript
// ✅ Mock fetch globally
beforeEach(() => {
  global.fetch = jest.fn();
});

// ✅ Configure response
test('loads data', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ data: 'test' }),
  });

  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});

// ✅ Mock error
test('handles error', async () => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(
    new Error('Network error')
  );

  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

**Prevention:**
- Mock fetch in beforeEach
- Mock all endpoints component calls
- Test both success and error paths

### Error 4: Incomplete API Flow Mocking

**Error Message:**
```
TypeError: Cannot read property 'done' of undefined
```

**Root Cause:**
- Only mocked initial request, missing polling/subsequent requests

**Fix:**

```typescript
// ❌ WRONG - Only mocks first call
beforeEach(() => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ operationName: 'op-123' }),
  });
});

// ✅ CORRECT - Mock all calls in flow
beforeEach(() => {
  // First call: Start operation
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ operationName: 'op-123' }),
  });

  // Polling calls: Check status (called multiple times)
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ done: false, progress: 50 }),
  });

  // Final call: Operation complete
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ done: true, result: 'success' }),
  });
});
```

**Prevention:**
- Map out entire API flow before writing test
- Mock initial, polling, and completion endpoints
- Use mockResolvedValueOnce for sequential calls
- Use mockResolvedValue for repeated calls (polling)

---

## Integration Test Failures

### Error 1: Database State Pollution

**Error Message:**
```
Expected 0 items, received 5 items from previous test
```

**Root Cause:**
- Database not reset between tests
- Shared state

**Fix:**

```typescript
// ✅ Reset database before each test
beforeEach(async () => {
  // Option 1: Clear tables
  await mockSupabase.from('projects').delete().neq('id', '');
  await mockSupabase.from('assets').delete().neq('id', '');

  // Option 2: Recreate mock client
  mockSupabase = createMockSupabaseClient();
});

// ✅ Use isolated test data
test('creates project', async () => {
  const uniqueId = `test-${Date.now()}`;
  const project = await service.createProject(uniqueId, { title: 'Test' });

  expect(project.title).toBe('Test');
});
```

**Prevention:**
- Always reset database in beforeEach
- Use unique identifiers for test data
- Clean up after tests in afterEach

### Error 2: Service Dependencies Not Mocked

**Error Message:**
```
Error: Stripe is not defined
Error: Google Cloud credentials not found
```

**Root Cause:**
- External service not mocked

**Fix:**

```typescript
// ✅ Mock external services
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn().mockResolvedValue({
    createPaymentMethod: jest.fn().mockResolvedValue({
      paymentMethod: { id: 'pm_test' },
    }),
  }),
}));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue(undefined),
        download: jest.fn().mockResolvedValue(['file content']),
      }),
    }),
  })),
}));
```

**Prevention:**
- Mock all external services (Stripe, Google Cloud, AI APIs)
- Use real implementations for internal code
- Document which services need mocking

---

## Mock Configuration Issues

### Error 1: Mock Not Called

**Error Message:**
```
Expected mock function to have been called, but it was not called.
```

**Root Cause:**
- Mock defined after import
- Mock not configured properly
- Code path not executed

**Fix:**

```typescript
// ❌ WRONG - Mock after import
import { GET } from '@/app/api/route';
jest.mock('@/lib/supabase'); // ❌ Too late

// ✅ CORRECT - Mock before import
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

import { GET } from '@/app/api/route';

describe('Test', () => {
  beforeEach(() => {
    // ✅ Configure mock
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  it('calls mock', async () => {
    await GET(request);

    const { createServerSupabaseClient } = require('@/lib/supabase');
    expect(createServerSupabaseClient).toHaveBeenCalled(); // ✅ Now called
  });
});
```

**Prevention:**
- Always mock before importing
- Verify mock is on code path
- Check mock configuration in beforeEach

### Error 2: Chainable Mock Returns Undefined

**Error Message:**
```
TypeError: Cannot read property 'select' of undefined
```

**Root Cause:**
- Supabase query chain not properly mocked

**Fix:**

```typescript
// ❌ WRONG - Chain breaks
mockSupabase.from = jest.fn().mockResolvedValue({ data: [] });
// from().select() fails - select is undefined

// ✅ CORRECT - Proper chain
mockSupabase.from = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: '1' },
        error: null,
      }),
    }),
  }),
});

// ✅ BETTER - Use test utility
import { createMockSupabaseClient } from '@/test-utils';

const mockSupabase = createMockSupabaseClient();
mockSupabase.mockResolvedValue({
  data: { id: '1' },
  error: null,
});

// Works with any chain
await mockSupabase.from('table').select('*').eq('id', '1').single();
```

**Prevention:**
- Use createMockSupabaseClient utility
- Understand return vs resolved value
- Test query chains

### Error 3: Mock Reset Issues

**Error Message:**
```
Mock called 3 times, expected 1 time
```

**Root Cause:**
- Mocks not reset between tests
- State bleeding between tests

**Fix:**

```typescript
// ✅ Reset mocks
beforeEach(() => {
  jest.clearAllMocks(); // Clears call history
  jest.resetAllMocks(); // Clears + resets implementation
});

// ✅ Or reset individually
beforeEach(() => {
  mockFunction.mockClear();
});

// ✅ Restore original
afterEach(() => {
  jest.restoreAllMocks();
});
```

**Prevention:**
- Always clear mocks in beforeEach
- Use isolated test data
- Verify mock state before assertions

---

## Import/Module Issues

### Error 1: Cannot Find Module

**Error Message:**
```
Cannot find module '@/lib/someModule' from 'test.ts'
```

**Root Cause:**
- Module path incorrect
- Module not mocked (has side effects)
- TypeScript path not resolved

**Fix:**

```typescript
// ✅ Option 1: Verify path in tsconfig.json
// Check that "@/*" maps to correct directory

// ✅ Option 2: Mock module if it has side effects
jest.mock('@/lib/someModule', () => ({
  someFunction: jest.fn(),
  SomeClass: jest.fn(),
}));

// ✅ Option 3: Use dynamic import
let SomeModule: any;

beforeAll(async () => {
  const module = await import('@/lib/someModule');
  SomeModule = module.SomeModule;
});
```

**Prevention:**
- Verify tsconfig.json paths
- Mock modules with side effects
- Use dynamic imports for problematic modules

### Error 2: Module Initialization Error

**Error Message:**
```
Error: Cannot initialize Sentry in test environment
ReferenceError: window is not defined
```

**Root Cause:**
- Module has initialization code that runs on import
- Module expects browser environment

**Fix:**

```typescript
// ✅ Mock the entire module
jest.mock('@/lib/services/sentryService', () => ({
  SentryService: jest.fn().mockImplementation(() => ({
    captureError: jest.fn(),
    captureMessage: jest.fn(),
  })),
}));

// ✅ Or use dynamic import
let SentryService: any;

beforeAll(async () => {
  const module = await import('@/lib/services/sentryService');
  SentryService = module.SentryService;
});
```

**Prevention:**
- Avoid module-level side effects
- Use dynamic imports in tests
- Mock modules with initialization code

---

## Environment Issues

### Error 1: Environment Variables Not Set

**Error Message:**
```
Error: NEXT_PUBLIC_SUPABASE_URL is required
```

**Root Cause:**
- Environment variables not set in test environment

**Fix:**

```typescript
// ✅ Set in beforeAll
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
});

// ✅ Or use test utility
import { setTestEnv } from '@/test-utils';

beforeAll(() => {
  setTestEnv(); // Sets all common test env vars
});

// ✅ Or create .env.test file
// Jest automatically loads .env.test
```

**Prevention:**
- Create .env.test file
- Use setTestEnv utility
- Document required env vars

### Error 2: Port Already in Use

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Root Cause:**
- Test server port in use
- Previous test didn't clean up

**Fix:**

```bash
# ✅ Kill process on port
lsof -ti:3000 | xargs kill -9

# ✅ Or use different port for tests
TEST_PORT=3001 npm test
```

**Prevention:**
- Use random ports for test servers
- Clean up servers in afterAll
- Don't run multiple test processes

---

## Performance Issues

### Error 1: Tests Taking Too Long

**Symptom:**
Test suite takes >5 minutes

**Root Cause:**
- Slow tests
- Not parallelized
- Too many integration tests

**Fix:**

```bash
# ✅ Run in parallel (default)
npm test

# ✅ Skip slow tests in development
npm test -- --testPathIgnorePatterns=integration

# ✅ Use test.concurrent for independent tests
test.concurrent('test 1', async () => {
  // Runs in parallel with other concurrent tests
});

# ✅ Profile slow tests
npm test -- --verbose | grep -E "\([0-9]{4,} ms\)"
```

**Prevention:**
- Keep tests under 5s each
- Use fake timers
- Minimize setup/teardown
- Run integration tests separately

### Error 2: Memory Leaks

**Symptom:**
Tests slow down over time, process crashes

**Root Cause:**
- Resources not cleaned up
- Event listeners not removed
- Timers not cleared

**Fix:**

```typescript
// ✅ Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  cleanup(); // React Testing Library

  if (jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});

// ✅ Remove event listeners
afterEach(() => {
  window.removeEventListener('resize', handler);
  document.removeEventListener('click', handler);
});
```

**Prevention:**
- Always clean up in afterEach
- Use cleanup() from testing-library
- Clear timers and mocks
- Remove event listeners

---

## Quick Fixes

### Test Timeout
```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // ...
}, 10000); // 10 seconds
```

### Element Not Found
```typescript
// Wait for element
expect(await screen.findByText('Text')).toBeInTheDocument();
```

### Mock Not Called
```typescript
// Mock BEFORE import
jest.mock('@/lib/module');
import { function } from '@/app/route';
```

### Act Warning
```typescript
// Await user interactions
await user.click(button);
```

### Flaky Test
```typescript
// Use waitFor
await waitFor(() => {
  expect(condition).toBe(true);
});
```

### Import Error
```typescript
// Use dynamic import
beforeAll(async () => {
  const module = await import('@/lib/module');
});
```

### Environment Variable Missing
```typescript
// Set in beforeAll
beforeAll(() => {
  process.env.VAR_NAME = 'value';
});
```

### HTML Validation Error
```tsx
// Use div with button role
<div role="button" tabIndex={0} onKeyDown={handleKey}>
  <button>Inner</button>
</div>
```

---

## Additional Resources

- [TESTING_BEST_PRACTICES.md](./TESTING_BEST_PRACTICES.md) - Comprehensive guide
- [TEST_MAINTENANCE_RUNBOOK.md](./TEST_MAINTENANCE_RUNBOOK.md) - Maintenance procedures
- [TESTING_UTILITIES.md](./TESTING_UTILITIES.md) - Test utilities reference
- [INTEGRATION_TESTING_GUIDE.md](./INTEGRATION_TESTING_GUIDE.md) - Integration patterns

---

**Still stuck?** Search the codebase for similar tests or consult the engineering team.
