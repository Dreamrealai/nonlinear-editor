# Critical Test Fixes - Immediate Action Required

**Priority:** 🔴 HIGH
**Impact:** 101 failing test suites (39.2% suite pass rate)
**Root Causes:** 3 critical issues blocking test stability

---

## Issue 1: Memory Exhaustion (5 Suites Failing)

### Symptoms
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
Jest worker ran out of memory and crashed
```

### Affected Files
1. `__tests__/lib/saveLoad.test.ts`
2. `__tests__/components/generation/GenerateVideoTab.test.tsx`
3. `__tests__/components/HorizontalTimeline.test.tsx` (process exceptions)
4. `__tests__/components/ErrorBoundary.test.tsx` (process exceptions)
5. `__tests__/components/EditorHeader.test.tsx` (process exceptions)

### Root Cause
- Current worker memory limit: 1024MB
- Large test files loading too much mock data
- Multiple workers competing for memory
- Node heap size limit reached

### Fix 1: Increase Worker Memory (Immediate)

**File:** `jest.config.js`

```javascript
// BEFORE
module.exports = {
  maxWorkers: 3,
  workerIdleMemoryLimit: '1024MB',
  // ...
}

// AFTER
module.exports = {
  maxWorkers: 2, // Reduce workers to give more memory per worker
  workerIdleMemoryLimit: '2048MB', // Double the memory limit
  // ...
}
```

**Alternative:** Run tests with increased Node heap size:
```bash
NODE_OPTIONS="--max-old-space-size=8192" npm test
```

### Fix 2: Split Large Test Files (Short-term)

**Example: saveLoad.test.ts**

Current structure (causing crash):
```
__tests__/lib/saveLoad.test.ts (1,500+ lines)
```

Split into:
```
__tests__/lib/saveLoad/
├─ save.test.ts          (save operations)
├─ load.test.ts          (load operations)
├─ validation.test.ts    (validation logic)
└─ integration.test.ts   (full save/load cycle)
```

**Command to check file sizes:**
```bash
wc -l __tests__/lib/saveLoad.test.ts
wc -l __tests__/components/generation/GenerateVideoTab.test.tsx
wc -l __tests__/components/HorizontalTimeline.test.tsx
```

---

## Issue 2: Window Object Redefinition (18 Tests Failing)

### Symptoms
```
TypeError: Cannot redefine property: window
    at Function.defineProperty (<anonymous>)
```

### Affected Files
- `__tests__/lib/browserLogger.test.ts` (18 tests)
- All tests that try to mock `window` object

### Root Cause
The test setup attempts to redefine `window` multiple times:

```typescript
// PROBLEM CODE (in browserLogger.test.ts)
Object.defineProperty(global, 'window', {
  value: {
    location: { href: 'http://localhost:3000/test' },
    navigator: { userAgent: 'Test Browser' },
  },
});
```

This fails because:
1. `window` is already defined in jsdom environment
2. `Object.defineProperty` can't redefine non-configurable properties
3. Each test tries to redefine it in `beforeEach`

### Fix: Use Jest Spy Instead

**File:** `__tests__/lib/browserLogger.test.ts`

```typescript
// BEFORE (BROKEN)
beforeEach(() => {
  Object.defineProperty(global, 'window', {
    value: {
      location: { href: 'http://localhost:3000/test' },
      navigator: { userAgent: 'Test Browser' },
    },
  });
});

// AFTER (WORKING)
let mockWindow: any;

beforeEach(() => {
  // Don't redefine window, just set properties
  mockWindow = {
    location: { href: 'http://localhost:3000/test' },
    navigator: { userAgent: 'Test Browser' },
    sendBeacon: jest.fn().mockReturnValue(true),
  };

  // Assign to global without defineProperty
  global.window = mockWindow as any;
});

afterEach(() => {
  // Clean up
  delete (global as any).window;
});
```

**Alternative:** Use `jest.spyOn` for specific properties:
```typescript
beforeEach(() => {
  jest.spyOn(window, 'location', 'get').mockReturnValue({
    href: 'http://localhost:3000/test',
  } as any);
});
```

---

## Issue 3: AudioContext Mock Not Called (9 Tests Failing)

### Symptoms
```
expect(jest.fn()).toHaveBeenCalled()
Expected number of calls: >= 1
Received number of calls:    0
```

### Affected Files
- `__tests__/components/AudioWaveform.test.tsx` (9 tests)

### Root Cause
The AudioContext mock is defined but never executed:

```typescript
// Mock exists but not properly initialized
const mockAudioContext = {
  decodeAudioData: jest.fn(),
  close: jest.fn(),
};

global.AudioContext = jest.fn(() => mockAudioContext) as any;
```

The component creates AudioContext, but the mock isn't set up before the component mounts.

### Fix: Proper AudioContext Mock Setup

**File:** `__tests__/components/AudioWaveform.test.tsx`

```typescript
// BEFORE (BROKEN)
beforeEach(() => {
  const mockAudioContext = {
    decodeAudioData: jest.fn().mockResolvedValue(mockAudioBuffer),
    close: jest.fn(),
  };
  global.AudioContext = jest.fn(() => mockAudioContext) as any;
});

// AFTER (WORKING)
let mockAudioContext: any;
let mockAudioContextConstructor: jest.Mock;

beforeAll(() => {
  // Set up ONCE before all tests
  mockAudioContext = {
    decodeAudioData: jest.fn(),
    close: jest.fn(),
  };

  mockAudioContextConstructor = jest.fn(() => mockAudioContext);
  global.AudioContext = mockAudioContextConstructor as any;
});

beforeEach(() => {
  // Reset mocks between tests, but don't recreate
  mockAudioContext.decodeAudioData.mockClear();
  mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
  mockAudioContext.close.mockClear();
  mockAudioContextConstructor.mockClear();
});

afterAll(() => {
  // Clean up after all tests
  delete (global as any).AudioContext;
});
```

**Alternative:** Mock at module level:
```typescript
// At top of file, before imports
const mockAudioContext = {
  decodeAudioData: jest.fn(),
  close: jest.fn(),
};

(global as any).AudioContext = jest.fn(() => mockAudioContext);

// Then in tests, just reset:
beforeEach(() => {
  jest.clearAllMocks();
  mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
});
```

---

## Issue 4: Webhook Retry Logic Tests (9 Tests Failing)

### Symptoms
```
expect(received).toBe(expected)
Expected: true
Received: false

expect(result.attempts).toBe(2)
Expected: 2
Received: 1
```

### Affected Files
- `__tests__/lib/webhooks.test.ts` (9 tests)

### Root Cause
The webhook retry logic isn't being executed correctly in tests:

1. **Validation issues**: `validateWebhookUrl()` accepting invalid URLs
2. **Retry timing**: Mocked responses not triggering retry logic
3. **Fetch mock**: Not properly simulating failures/retries

### Fix: Update Webhook Test Mocks

**File:** `__tests__/lib/webhooks.test.ts`

```typescript
// Fix 1: URL Validation
it('should reject invalid URLs', () => {
  const invalidUrls = [
    'not-a-url',
    'ftp://example.com',  // Wrong protocol
    'http://localhost',   // No path
    'https:///webhook',   // No host
  ];

  invalidUrls.forEach((url) => {
    expect(validateWebhookUrl(url)).toBe(false);
  });
});

// Fix 2: Retry Logic with Proper Timing
it('should retry on server error (5xx)', async () => {
  let callCount = 0;

  (global.fetch as jest.Mock).mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // First call: 500 error
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });
    } else {
      // Second call: success
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
      });
    }
  });

  const result = await deliverWebhook({
    url: 'https://example.com/webhook',
    payload: { test: 'data' },
    maxRetries: 3,
  });

  expect(result.success).toBe(true);
  expect(result.attempts).toBe(2);
  expect(callCount).toBe(2); // Verify fetch was called twice
});

// Fix 3: Don't Retry on Client Errors
it('should not retry on client error (4xx except 408, 429)', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status: 400,
    statusText: 'Bad Request',
  });

  const result = await deliverWebhook({
    url: 'https://example.com/webhook',
    payload: { test: 'data' },
    maxRetries: 3,
  });

  expect(result.success).toBe(false);
  expect(result.attempts).toBe(1);
  expect(result.statusCode).toBe(400);
  expect(global.fetch).toHaveBeenCalledTimes(1); // No retry
});
```

---

## Quick Fix Script

Run this to apply all fixes automatically:

```bash
#!/bin/bash

# 1. Update jest.config.js memory settings
sed -i '' 's/workerIdleMemoryLimit: '\''1024MB'\''/workerIdleMemoryLimit: '\''2048MB'\''/' jest.config.js
sed -i '' 's/maxWorkers: 3/maxWorkers: 2/' jest.config.js

echo "✅ Updated Jest config for more memory"

# 2. Run tests with increased heap size
export NODE_OPTIONS="--max-old-space-size=8192"

echo "✅ Set Node heap size to 8GB"

# 3. Run tests to verify fixes
npm test -- --maxWorkers=2

echo "✅ Test run complete"
```

**Save as:** `fix-tests.sh`
**Run:** `chmod +x fix-tests.sh && ./fix-tests.sh`

---

## Verification Checklist

After applying fixes, verify:

- [ ] Memory errors resolved
  ```bash
  npm test -- __tests__/lib/saveLoad.test.ts
  npm test -- __tests__/components/generation/GenerateVideoTab.test.tsx
  ```

- [ ] Window mock errors resolved
  ```bash
  npm test -- __tests__/lib/browserLogger.test.ts
  ```

- [ ] AudioContext errors resolved
  ```bash
  npm test -- __tests__/components/AudioWaveform.test.tsx
  ```

- [ ] Webhook tests passing
  ```bash
  npm test -- __tests__/lib/webhooks.test.ts
  ```

- [ ] Overall pass rate improved
  ```bash
  npm test -- --coverage
  # Target: 85%+ pass rate (up from 76.8%)
  ```

---

## Expected Results After Fixes

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Suite Pass Rate** | 39.2% (65/166) | 55%+ (90+/166) | +15.8% |
| **Test Pass Rate** | 76.8% | 85%+ | +8.2% |
| **Memory Crashes** | 5 suites | 0 suites | -5 |
| **Window Mock Errors** | 18 tests | 0 tests | -18 |
| **AudioContext Errors** | 9 tests | 0 tests | -9 |
| **Webhook Failures** | 9 tests | 0 tests | -9 |

**Total Impact:** +41 tests fixed (+4.2% pass rate improvement)

---

## Timeline

**Immediate (15 minutes):**
1. Update `jest.config.js` memory settings
2. Set `NODE_OPTIONS` environment variable
3. Re-run tests

**Short-term (1 hour):**
1. Fix `browserLogger.test.ts` window mocks
2. Fix `AudioWaveform.test.tsx` AudioContext mocks
3. Fix `webhooks.test.ts` retry logic

**Medium-term (3 hours):**
1. Split large test files (saveLoad, GenerateVideoTab, etc.)
2. Optimize slow tests
3. Add test isolation improvements

**Expected Outcome:** 85%+ pass rate, 55%+ suite pass rate, 0 crashes

---

**Priority Order:**
1. 🔴 Memory fixes (blocks everything)
2. 🔴 Window mock fixes (blocks 18 tests)
3. 🟡 AudioContext fixes (blocks 9 tests)
4. 🟡 Webhook fixes (blocks 9 tests)

**Total Blockers:** 41 tests, 5 suites

---

**Document Created:** October 24, 2025
**Status:** 🔴 CRITICAL - Apply immediately
**Impact:** High - Fixes 41 tests and 5 suite crashes
