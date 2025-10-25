# Test Reliability Guide

**Last Updated:** 2025-10-25

## Overview

This guide provides best practices for writing stable, reliable, non-flaky tests. Flaky tests reduce confidence in the test suite and waste developer time investigating false failures.

## Table of Contents

- [Common Causes of Flaky Tests](#common-causes-of-flaky-tests)
- [Best Practices](#best-practices)
- [Async Testing](#async-testing)
- [Resource Management](#resource-management)
- [State Isolation](#state-isolation)
- [Mock Management](#mock-management)
- [Troubleshooting](#troubleshooting)

---

## Common Causes of Flaky Tests

### 1. Timing Issues

**Problem:** Tests depend on arbitrary timeouts or race conditions.

```typescript
// BAD: Arbitrary timeout
await new Promise(r => setTimeout(r, 1000));
expect(element).toBeInTheDocument();

// GOOD: Wait for specific condition
await waitFor(() => {
  expect(element).toBeInTheDocument();
});
```

### 2. State Pollution

**Problem:** Tests affect each other through shared state.

```typescript
// BAD: Global state not cleaned up
let sharedData = [];

it('test 1', () => {
  sharedData.push('value');
  expect(sharedData).toHaveLength(1);
});

it('test 2', () => {
  expect(sharedData).toHaveLength(0); // Fails if test 1 ran first!
});

// GOOD: Isolated state
beforeEach(() => {
  sharedData = [];
});
```

### 3. Resource Leaks

**Problem:** Timers, intervals, or subscriptions not cleaned up.

```typescript
// BAD: Interval not cleared
it('should update every second', () => {
  const interval = setInterval(() => {
    // ... update logic
  }, 1000);
  // Test ends, interval still running!
});

// GOOD: Cleanup in afterEach
let interval: NodeJS.Timeout;

afterEach(() => {
  if (interval) clearInterval(interval);
});

it('should update every second', () => {
  interval = setInterval(() => {
    // ... update logic
  }, 1000);
});
```

### 4. Race Conditions

**Problem:** Async operations complete in unpredictable order.

```typescript
// BAD: Assuming order
const promise1 = fetchData1();
const promise2 = fetchData2();
await promise1;
await promise2; // Might complete before promise1!

// GOOD: Explicit ordering
const data1 = await fetchData1();
const data2 = await fetchData2();
```

### 5. Mock Leakage

**Problem:** Mocks from one test affect other tests.

```typescript
// BAD: Mock not cleared
it('test 1', () => {
  jest.spyOn(module, 'function').mockReturnValue('value1');
  // Mock persists to next test!
});

// GOOD: Clear mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
```

---

## Best Practices

### 1. Use Explicit Waits

Always wait for specific conditions, never use arbitrary timeouts.

```typescript
import { waitFor, screen } from '@testing-library/react';

// GOOD: Wait for specific condition
await waitFor(() => {
  expect(screen.getByText('Loading complete')).toBeInTheDocument();
}, {
  timeout: 5000, // Max wait time
  interval: 100, // Check every 100ms
});
```

### 2. Clean Up After Each Test

Use `afterEach` to reset state, clear mocks, and cleanup resources.

```typescript
afterEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
  jest.restoreAllMocks();

  // Clear all timers
  jest.clearAllTimers();

  // Cleanup React Testing Library
  cleanup();

  // Reset Zustand stores
  useTimelineStore.getState().reset();
  usePlaybackStore.getState().reset();

  // Cleanup any test-specific resources
  await cleanupTestResources();
});
```

### 3. Isolate Test State

Each test should start with a clean slate.

```typescript
beforeEach(() => {
  // Reset stores to initial state
  useTimelineStore.setState({
    clips: [],
    tracks: [],
    selectedClipIds: [],
  });

  // Reset mocks to default behavior
  mockSupabase.from.mockReturnValue(createMockQueryBuilder());
});
```

### 4. Use Deterministic Data

Avoid random or time-dependent data in tests.

```typescript
// BAD: Random data
const testId = Math.random().toString();
const timestamp = Date.now();

// GOOD: Deterministic data
const testId = 'test-id-123';
const timestamp = 1640000000000; // Fixed timestamp
```

### 5. Handle Async Properly

Always use `async/await` or return promises from tests.

```typescript
// BAD: Not awaiting async operation
it('should fetch data', () => {
  fetchData(); // Returns promise, not awaited!
  expect(data).toBeDefined(); // Runs before fetch completes
});

// GOOD: Await async operation
it('should fetch data', async () => {
  await fetchData();
  expect(data).toBeDefined();
});
```

---

## Async Testing

### React Testing Library

Use `waitFor` for elements that appear asynchronously:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should show success message after save', async () => {
  render(<SaveButton />);

  await userEvent.click(screen.getByRole('button', { name: /save/i }));

  await waitFor(() => {
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });
});
```

### Hook Testing

Use `waitFor` in `renderHook` for async state updates:

```typescript
import { renderHook, waitFor } from '@testing-library/react';

it('should fetch data on mount', async () => {
  const { result } = renderHook(() => useDataFetch());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeDefined();
  });
});
```

### API Route Testing

Always await responses in API tests:

```typescript
it('should return 200 for valid request', async () => {
  const request = new NextRequest('http://localhost/api/test');
  const response = await GET(request);

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data).toEqual({ success: true });
});
```

---

## Resource Management

### Timer Management

Use Jest's timer mocks for tests involving timers:

```typescript
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

it('should debounce input', () => {
  const callback = jest.fn();
  const debounced = debounce(callback, 500);

  debounced('test');
  expect(callback).not.toHaveBeenCalled();

  jest.advanceTimersByTime(500);
  expect(callback).toHaveBeenCalledWith('test');
});
```

### Event Listener Cleanup

Track and remove event listeners:

```typescript
let listeners: Array<{ element: Element; event: string; handler: Function }> = [];

afterEach(() => {
  // Cleanup all registered listeners
  listeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler as EventListener);
  });
  listeners = [];
});

it('should handle click', () => {
  const handler = jest.fn();
  element.addEventListener('click', handler);
  listeners.push({ element, event: 'click', handler });

  element.click();
  expect(handler).toHaveBeenCalled();
});
```

### Network Request Cleanup

Cancel pending requests in cleanup:

```typescript
let abortController: AbortController;

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(() => {
  abortController.abort();
});

it('should fetch data', async () => {
  await fetch('/api/data', { signal: abortController.signal });
});
```

---

## State Isolation

### Zustand Store Reset

Reset stores between tests:

```typescript
import { useTimelineStore } from '@/lib/state/slices/timeline';

afterEach(() => {
  // Option 1: Reset to initial state
  useTimelineStore.setState({
    clips: [],
    tracks: [],
    selectedClipIds: [],
  });

  // Option 2: If store has reset method
  useTimelineStore.getState().reset();
});
```

### React Component Cleanup

Use Testing Library's cleanup:

```typescript
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup(); // Unmounts React components
});
```

### Database Mock Reset

Reset database mocks to clean state:

```typescript
import { createMockSupabaseClient } from '@/test-utils';

beforeEach(() => {
  const mockSupabase = createMockSupabaseClient();

  // Configure default successful responses
  mockSupabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  });
});
```

---

## Mock Management

### Mock Best Practices

1. **Define mocks at module level**
```typescript
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => handler,
}));
```

2. **Configure in beforeEach**
```typescript
beforeEach(() => {
  const { createServerSupabaseClient } = require('@/lib/supabase');
  createServerSupabaseClient.mockResolvedValue(mockSupabase);
});
```

3. **Clear after each test**
```typescript
afterEach(() => {
  jest.clearAllMocks(); // Clears call history
  jest.restoreAllMocks(); // Restores original implementation
});
```

### Mock Type Annotations

Avoid type annotations in jest.fn() mocks:

```typescript
// BAD: Type annotations cause parser errors
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
    // Parser error! ^
  }),
}));

// GOOD: Use 'any' type
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => async (req: any, context: any) => {
    return handler(req, context);
  },
}));
```

### Mock Return Values

Set up different return values per test:

```typescript
beforeEach(() => {
  mockFunction.mockResolvedValue({ success: true });
});

it('should handle error', async () => {
  mockFunction.mockRejectedValueOnce(new Error('Test error'));
  // Test error handling
});

it('should handle success', async () => {
  // Uses default mockResolvedValue from beforeEach
});
```

---

## Troubleshooting

### Debugging Flaky Tests

1. **Run test multiple times**
```bash
# Run test 100 times to catch intermittent failures
for i in {1..100}; do npm test -- path/to/test.test.ts || break; done
```

2. **Increase verbosity**
```bash
npm test -- --verbose --no-coverage path/to/test.test.ts
```

3. **Check for unresolved promises**
```typescript
it('test', async () => {
  // Add this at the end
  await new Promise(resolve => setImmediate(resolve));
});
```

4. **Use --detectOpenHandles**
```bash
npm test -- --detectOpenHandles path/to/test.test.ts
```

### Common Issues and Solutions

#### Issue: Test times out

**Solution:** Increase timeout or find hanging promise
```typescript
it('test', async () => {
  // ... test code
}, 10000); // 10 second timeout

// Or find the hanging promise
await waitFor(() => {
  expect(condition).toBe(true);
}, { timeout: 5000 });
```

#### Issue: Act() warnings

**Solution:** Wrap state updates in act()
```typescript
import { act } from '@testing-library/react';

it('should update state', () => {
  const { result } = renderHook(() => useMyHook());

  act(() => {
    result.current.updateValue('new value');
  });

  expect(result.current.value).toBe('new value');
});
```

#### Issue: Mock not being called

**Solution:** Verify mock is hoisted
```typescript
// Mocks must be defined at module level BEFORE imports
jest.mock('@/lib/module');

// Then import
import { functionToTest } from '@/lib/module';
```

#### Issue: Tests pass individually but fail together

**Solution:** State pollution - add cleanup
```typescript
afterEach(() => {
  // Reset all shared state
  jest.clearAllMocks();
  cleanup();
  // Reset stores
  useStore.setState(initialState);
});
```

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library - Best Practices](https://testing-library.com/docs/react-testing-library/intro/)
- [Common Mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [TEST_ARCHITECTURE.md](/docs/TEST_ARCHITECTURE.md) - Test infrastructure documentation
- [COMMON_TEST_PATTERNS.md](./COMMON_TEST_PATTERNS.md) - Reusable test patterns

---

**For questions or issues with test reliability, refer to this guide or consult the team.**
