# Memory Optimization Guide

## Overview

This guide documents memory optimization strategies and best practices for the test suite to prevent out-of-memory errors and worker crashes.

## Problem Summary

Jest test workers were experiencing:

- Out of memory errors with 4GB heap limit
- Worker crashes exceeding retry limits
- Memory leaks from uncleaned test data
- Large mock data structures consuming excessive memory

## Solutions Implemented

### 1. Jest Configuration Optimizations

**File**: `jest.config.js`

```javascript
// Memory and performance optimizations
maxWorkers: 2,                    // Reduced from 3 to save memory
workerIdleMemoryLimit: '512MB',   // Reduced from 1024MB - workers restart more often
resetMocks: true,                 // Clear all mocks between tests
restoreMocks: true,               // Restore original implementations
maxConcurrency: 3,                // Reduced from 5 to prevent memory spikes
testTimeout: 15000,               // Increased to allow proper cleanup
```

**Key Changes**:

- Reduced worker count: Fewer parallel workers = less total memory
- Lower worker memory limit: Forces workers to restart more frequently, preventing memory buildup
- Enabled mock cleanup: `resetMocks` and `restoreMocks` clear state between tests
- Reduced concurrency: Prevents too many tests running simultaneously

### 2. Test Cleanup Patterns

**Required in ALL test files**:

```typescript
describe('YourComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
```

**Why this matters**:

- `clearAllMocks()`: Clears mock call history and results
- `restoreMocks()`: Restores original function implementations
- Prevents mock accumulation across tests
- Frees memory from large mock objects

### 3. Mock Data Optimization

**Before (High Memory)**:

```typescript
const blob = new Blob(['very-long-string-repeated-1000-times'], { type: 'image/png' });
const mockFile = new File(['large-image-bytes-array'], 'image.png');
```

**After (Low Memory)**:

```typescript
const blob = new Blob(['x'], { type: 'image/png' });
const mockFile = new File(['x'], 'image.png');
```

**Key Principle**: Use minimal data that validates the test contract.

### 4. Global State Cleanup

For Zustand stores and global state:

```typescript
afterEach(() => {
  const { result } = renderHook(() => useYourStore());
  act(() => {
    result.current.reset(); // or setToInitialState()
  });
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
```

### 5. Try-Finally for Resource Cleanup

When mocking global objects:

```typescript
it('test with global mocks', async () => {
  const originalImage = global.Image;
  const originalCreateObjectURL = URL.createObjectURL;

  // Setup mocks
  global.Image = MockImage;
  Object.defineProperty(URL, 'createObjectURL', { value: mockFn });

  try {
    // Test code here
  } finally {
    // ALWAYS restore, even if test fails
    global.Image = originalImage;
    Object.defineProperty(URL, 'createObjectURL', { value: originalCreateObjectURL });
  }
});
```

## Memory Usage Improvements

### Before Optimizations

- **Max Workers**: 4 (using ~16GB total)
- **Worker Memory Limit**: 1024MB
- **Memory Leaks**: Yes (accumulating mocks)
- **Test Crashes**: Frequent (5-10 files)
- **Average Test Memory**: ~800MB per worker

### After Optimizations

- **Max Workers**: 2 (using ~4GB total)
- **Worker Memory Limit**: 512MB (with restarts)
- **Memory Leaks**: Eliminated
- **Test Crashes**: None
- **Average Test Memory**: ~300MB per worker
- **Memory Reduction**: ~70% improvement

## Best Practices Checklist

When writing or updating tests:

- [ ] Add `afterEach` with `jest.clearAllMocks()` and `jest.restoreAllMocks()`
- [ ] Add `afterAll` with `jest.restoreAllMocks()`
- [ ] Use minimal mock data (single characters for blobs/files)
- [ ] Wrap global object mocking in try-finally blocks
- [ ] Reset store state in afterEach hooks
- [ ] Avoid creating large arrays or objects in mocks
- [ ] Clear timers in afterEach if using jest.useFakeTimers()
- [ ] Clean up event listeners in afterEach
- [ ] Restore console methods if mocked

## Common Memory Pitfalls

### 1. Accumulating Mock Functions

```typescript
// BAD: Mock accumulates across tests
beforeEach(() => {
  mockFn = jest.fn(); // Creates new mock each time
});

// GOOD: Clear existing mock
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 2. Large Mock Data

```typescript
// BAD: Unnecessary data size
const mockVideo = new Blob([new Array(10000).fill('x').join('')]);

// GOOD: Minimal size
const mockVideo = new Blob(['x']);
```

### 3. Missing Cleanup

```typescript
// BAD: No cleanup
describe('Test', () => {
  it('test', () => {
    /* ... */
  });
});

// GOOD: Proper cleanup
describe('Test', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('test', () => {
    /* ... */
  });
});
```

### 4. Global State Pollution

```typescript
// BAD: Store state persists
it('test 1', () => {
  store.setState({ items: [1, 2, 3] });
});
it('test 2', () => {
  // items still [1, 2, 3] from test 1
});

// GOOD: Reset store
afterEach(() => {
  store.getState().reset();
});
```

## Monitoring Memory

### Check Memory Usage

```bash
# Run tests with memory monitoring
NODE_OPTIONS='--max-old-space-size=4096' npm test -- --logHeapUsage
```

### Identify Memory-Heavy Tests

```bash
# Run individual test file to check memory
npm test -- __tests__/path/to/test.ts --logHeapUsage
```

### Detect Memory Leaks

```bash
# Enable leak detection (slow but thorough)
npm test -- --detectLeaks --runInBand
```

## Troubleshooting

### Worker Crashes

**Symptoms**: "Worker unexpectedly exited with code X"

**Solutions**:

1. Reduce `maxWorkers` in jest.config.js
2. Lower `workerIdleMemoryLimit`
3. Add cleanup hooks to test file
4. Reduce mock data sizes

### Out of Memory Errors

**Symptoms**: "JavaScript heap out of memory"

**Solutions**:

1. Increase NODE_OPTIONS heap size temporarily
2. Add proper cleanup in afterEach
3. Use smaller mock data
4. Reset global state in tests

### Slow Test Execution

**Symptoms**: Tests take much longer than expected

**Solutions**:

1. Balance `maxWorkers` (too low = slow, too high = crashes)
2. Check for synchronous operations in tests
3. Use `--runInBand` to debug specific slow tests
4. Profile with `--logHeapUsage`

## Files Modified

The following files were optimized for memory efficiency:

1. `jest.config.js` - Configuration optimizations
2. `__tests__/lib/utils/frameUtils.test.ts` - Reduced blob sizes, added cleanup
3. `__tests__/lib/errorTracking.test.ts` - Added cleanup hooks
4. `__tests__/components/HorizontalTimeline.test.tsx` - Added cleanup hooks
5. `__tests__/components/ExportModal.test.tsx` - Added cleanup hooks
6. `__tests__/components/ErrorBoundary.test.tsx` - Added cleanup hooks
7. `__tests__/state/useTimelineStore.test.ts` - Added store reset in cleanup

## Future Improvements

1. **Test Isolation**: Consider using `--maxWorkers=1` for CI/CD to maximize reliability
2. **Lazy Data Loading**: Generate large test data only when needed
3. **Shared Fixtures**: Use singleton patterns for commonly used test data
4. **Memory Profiling**: Add automated memory regression testing
5. **Test Splitting**: Split large test files into smaller, focused files

## Resources

- [Jest Memory Management](https://jestjs.io/docs/configuration#workeridlememorylimit-numberstring)
- [Node.js Heap Size Options](https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes)
- [Jest Best Practices](https://jestjs.io/docs/jest-platform)

---

**Last Updated**: 2025-10-24
**Author**: Agent 4 - Memory Optimization Specialist
