# Test Reliability Guide

**Purpose:** Eliminate flaky tests, prevent timeouts, and ensure consistent test execution.

**Success Metrics:**

- Flaky test rate: <1%
- Zero timeout failures
- Test suite can run 10x consecutively without failures

---

## 🎯 Quick Reference

### Common Issues and Solutions

| Issue                                     | Solution                       | Utility to Use                         |
| ----------------------------------------- | ------------------------------ | -------------------------------------- |
| Test timeout after 10-15s                 | Tests are too slow or hanging  | `withTimeout()`, optimize test         |
| Flaky tests (pass/fail randomly)          | Race conditions, timing issues | `waitForAsync()`, `withFakeTimers()`   |
| State pollution (tests affect each other) | Stores not reset               | `resetAllStores()` (auto in afterEach) |
| Memory leaks                              | Resources not cleaned up       | `ResourceTracker`                      |
| Slow async operations                     | Not using fake timers          | `withFakeTimers()`                     |
| Intermittent failures                     | Insufficient wait time         | `waitForAsync()` instead of `wait()`   |

---

## 📚 Best Practices

### 1. Always Use Fake Timers for Time-Based Code

**AVOID:**

```ts
// ❌ FLAKY: Real timers cause race conditions
it('should debounce input', async () => {
  const fn = jest.fn();
  const debounced = debounce(fn, 500);

  debounced('test');
  await new Promise((resolve) => setTimeout(resolve, 500)); // Real timer!

  expect(fn).toHaveBeenCalledWith('test');
});
```

**PREFER:**

```ts
// ✅ RELIABLE: Fake timers are deterministic
it('should debounce input', async () => {
  const timers = withFakeTimers();

  const fn = jest.fn();
  const debounced = debounce(fn, 500);

  debounced('test');
  await timers.advance(500);

  expect(fn).toHaveBeenCalledWith('test');
});
```

### 2. Wait for Conditions, Not Time

**AVOID:**

```ts
// ❌ FLAKY: Fixed wait time might be too short or too long
it('should load data', async () => {
  render(<DataComponent />);
  await wait(1000); // Might not be enough on slow CI

  expect(screen.getByText(/data loaded/i)).toBeInTheDocument();
});
```

**PREFER:**

```ts
// ✅ RELIABLE: Wait for actual condition
it('should load data', async () => {
  render(<DataComponent />);

  await waitForAsync(() => {
    expect(screen.getByText(/data loaded/i)).toBeInTheDocument();
  });
});
```

### 3. Track and Clean Up Resources

**AVOID:**

```ts
// ❌ MEMORY LEAK: Timer not cleaned up
it('should poll for updates', () => {
  const timerId = setInterval(() => {
    checkForUpdates();
  }, 5000);

  // Test code
  // timerId is never cleared!
});
```

**PREFER:**

```ts
// ✅ CLEAN: Resource tracked and cleaned up
it('should poll for updates', async () => {
  const tracker = new ResourceTracker();

  const timerId = setInterval(() => {
    checkForUpdates();
  }, 5000);
  tracker.trackTimer(timerId, 'update polling');

  // Test code

  await tracker.cleanup(); // Automatically clears timer
});
```

### 4. Reset State Between Tests

**AVOID:**

```ts
// ❌ STATE POLLUTION: Store state carries over to next test
it('test 1', () => {
  useTimelineStore.getState().setTimeline(mockTimeline);
  // ... test code
  // Store is not reset!
});

it('test 2', () => {
  // This test starts with mockTimeline from test 1!
  const timeline = useTimelineStore.getState().timeline;
  expect(timeline).toBeNull(); // ❌ FAILS
});
```

**PREFER:**

```ts
// ✅ CLEAN: State reset automatically
beforeEach(() => {
  // resetAllStores() is called automatically in jest.setup-after-env.js
  // But you can call it manually if needed:
  resetAllStores();
});

it('test 1', () => {
  useTimelineStore.getState().setTimeline(mockTimeline);
  // ... test code
});

it('test 2', () => {
  // Store is reset before this test
  const timeline = useTimelineStore.getState().timeline;
  expect(timeline).toBeNull(); // ✅ PASSES
});
```

### 5. Handle Async Operations Properly

**AVOID:**

```ts
// ❌ RACE CONDITION: Not waiting for state update
it('should update state', () => {
  const { result } = renderHook(() => useMyHook());

  act(() => {
    result.current.updateValue('test');
  });

  // ❌ State might not be updated yet!
  expect(result.current.value).toBe('test');
});
```

**PREFER:**

```ts
// ✅ PROPER: Wait for state update
it('should update state', async () => {
  const { result } = renderHook(() => useMyHook());

  await act(async () => {
    result.current.updateValue('test');
    await flushPromises(); // Wait for all promises to resolve
  });

  expect(result.current.value).toBe('test');
});
```

### 6. Add Timeout Guards for Long Operations

**AVOID:**

```ts
// ❌ NO TIMEOUT: Might hang forever
it('should complete API call', async () => {
  const result = await slowApiCall(); // Might hang
  expect(result).toBeDefined();
});
```

**PREFER:**

```ts
// ✅ TIMEOUT: Fails fast with clear message
it('should complete API call', async () => {
  const result = await withTimeout(() => slowApiCall(), 5000, 'API call took longer than 5s');
  expect(result).toBeDefined();
});
```

---

## 🛠️ Test Reliability Utilities

### ResourceTracker

Track and validate cleanup of timers, listeners, and other resources.

```ts
import { ResourceTracker } from '@/__tests__/helpers';

describe('MyComponent', () => {
  let tracker: ResourceTracker;

  beforeEach(() => {
    tracker = new ResourceTracker();
  });

  afterEach(async () => {
    await tracker.cleanup();
    tracker.validate(); // Warns if resources weren't cleaned up
  });

  it('should cleanup polling', () => {
    const timerId = setInterval(() => poll(), 1000);
    tracker.trackTimer(timerId, 'polling timer');

    // Test code - cleanup happens automatically
  });
});
```

### withFakeTimers()

Simplify using fake timers in tests.

```ts
import { withFakeTimers } from '@/__tests__/helpers';

it('should handle debounce', async () => {
  const timers = withFakeTimers();

  const fn = jest.fn();
  const debounced = debounce(fn, 500);

  debounced('a');
  debounced('b');
  debounced('c');

  await timers.advance(500);

  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenCalledWith('c');
});
```

### waitForAsync()

Wait for async operations with better defaults.

```ts
import { waitForAsync } from '@/__tests__/helpers';

it('should load data', async () => {
  render(<DataLoader />);

  await waitForAsync(() => {
    expect(screen.getByText(/loaded/i)).toBeInTheDocument();
  }, {
    timeout: 5000, // 5s default (vs 1s in waitFor)
    interval: 50,  // Check every 50ms
  });
});
```

### AsyncTracker

Track async operations to ensure they complete.

```ts
import { AsyncTracker } from '@/__tests__/helpers';

it('should complete all operations', async () => {
  const tracker = new AsyncTracker();

  tracker.track(operation1());
  tracker.track(operation2());
  tracker.track(operation3());

  // Ensures all operations complete within 10s
  await tracker.waitForAll(10000);

  expect(tracker.isComplete()).toBe(true);
});
```

### retryAssertion()

Retry flaky assertions with backoff.

```ts
import { retryAssertion } from '@/__tests__/helpers';

it('should eventually succeed', async () => {
  // For assertions that might fail temporarily
  await retryAssertion(() => expect(getValue()).toBe(expected), { attempts: 3, delay: 100 });
});
```

---

## 🐛 Debugging Flaky Tests

### Step 1: Run Test Multiple Times

```bash
# Run a specific test 10 times
for i in {1..10}; do npm test -- path/to/test.test.ts; done

# Or use the flakiness measurement utility
```

```ts
import { measureFlakiness } from '@/__tests__/helpers';

const result = await measureFlakiness(
  () => {
    // Test code
  },
  { runs: 10 }
);

console.log(`Success rate: ${result.successRate}%`);
if (result.successRate < 100) {
  console.log('Errors:', result.errors);
}
```

### Step 2: Check for Common Issues

1. **Timing Issues**: Use fake timers
2. **Race Conditions**: Wait for conditions, not time
3. **State Pollution**: Check if other tests modify shared state
4. **Resource Leaks**: Use ResourceTracker
5. **Async Issues**: Ensure all promises are awaited

### Step 3: Add Logging

```ts
it('debug flaky test', async () => {
  console.log('State before:', getState());

  // Test code

  console.log('State after:', getState());
});
```

### Step 4: Isolate the Test

Run the test file in isolation to rule out interference from other tests:

```bash
npm test -- path/to/test.test.ts --runInBand
```

---

## 📊 Monitoring Test Reliability

### CI/CD Integration

Monitor flakiness in CI:

```yaml
# .github/workflows/test.yml
- name: Run tests with retry
  uses: nick-invision/retry@v2
  with:
    timeout_minutes: 10
    max_attempts: 3
    command: npm test
```

### Local Monitoring

```bash
# Run all tests 5 times and report flakiness
npm run test:flaky

# Or manually
for i in {1..5}; do npm test 2>&1 | tee test-run-$i.log; done
grep -h "FAIL" test-run-*.log | sort | uniq -c
```

---

## ✅ Pre-Commit Checklist

Before committing new tests:

- [ ] All async operations use `await` or fake timers
- [ ] No hardcoded `setTimeout` waits (use `waitForAsync` instead)
- [ ] Resources are tracked with `ResourceTracker` or cleaned up in `afterEach`
- [ ] No shared state between tests (use `resetAllStores` or `beforeEach`)
- [ ] Test runs successfully 3 times in a row locally
- [ ] No console warnings about uncleaned resources
- [ ] Test completes within timeout (default 15s)

---

## 🎓 Additional Resources

- [Jest Timer Mocks](https://jestjs.io/docs/timer-mocks)
- [Testing Library Async Utilities](https://testing-library.com/docs/dom-testing-library/api-async/)
- [React Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Zustand Testing Guide](https://docs.pmnd.rs/zustand/guides/testing)

---

## 📝 Summary

**Key Principles:**

1. **Deterministic**: Use fake timers, not real ones
2. **Conditional**: Wait for conditions, not time
3. **Clean**: Track and cleanup all resources
4. **Isolated**: Reset state between tests
5. **Fast**: Optimize for speed without sacrificing reliability

**When in doubt:**

- Use `withFakeTimers()` for time-based code
- Use `waitForAsync()` instead of fixed waits
- Use `ResourceTracker` to validate cleanup
- Reset stores in `beforeEach`
- Add timeouts to prevent hanging

**Zero tolerance for:**

- Flaky tests (must fix, not skip)
- Timeout failures (must optimize or increase limit)
- State pollution (must isolate)
- Resource leaks (must cleanup)
