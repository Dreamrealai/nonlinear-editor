# Test Maintenance Runbook

**Operational guide for diagnosing, fixing, and maintaining test health.**

Last Updated: 2025-10-24
Maintained by: Engineering Team

---

## Table of Contents

1. [Overview](#overview)
2. [Daily Maintenance](#daily-maintenance)
3. [Diagnosing Failing Tests](#diagnosing-failing-tests)
4. [Common Test Failure Patterns](#common-test-failure-patterns)
5. [When to Skip vs Fix Tests](#when-to-skip-vs-fix-tests)
6. [Test Health Monitoring](#test-health-monitoring)
7. [Preventing Regressions](#preventing-regressions)
8. [Test Refactoring Guide](#test-refactoring-guide)
9. [Emergency Procedures](#emergency-procedures)

---

## Overview

This runbook provides step-by-step procedures for maintaining test health, diagnosing failures, and preventing regressions. It's based on lessons learned from extensive testing efforts in Round 3.

**Key Metrics:**

- Target pass rate: ≥95%
- Target coverage: ≥70% services, ≥50% overall
- Max acceptable flaky rate: <1%
- Max test execution time: <5s per test

---

## Daily Maintenance

### Morning Health Check (5 minutes)

```bash
# 1. Pull latest changes
git pull origin main

# 2. Run full test suite
npm test

# 3. Check pass rate
# Target: ≥95%

# 4. Review any failures
# If failures found, follow "Diagnosing Failing Tests" section
```

### Pre-Commit Checklist

Before committing code:

```bash
# 1. Run tests for files you changed
npm test -- --onlyChanged

# 2. Verify all tests pass
# If any fail, fix before committing

# 3. Run build to catch type errors
npm run build

# 4. Check coverage didn't decrease
npm test -- --coverage --onlyChanged
```

### Pre-Push Checklist

Before pushing to remote:

```bash
# 1. Run full test suite
npm test

# 2. Verify pass rate ≥95%

# 3. Run build
npm run build

# 4. Check for new warnings
# Review and address any new warnings
```

---

## Diagnosing Failing Tests

### Step 1: Reproduce the Failure

```bash
# Run the specific test file
npm test -- path/to/failing-test.test.ts

# Run only the failing test
npm test -- path/to/failing-test.test.ts -t "test name"

# Run in watch mode for faster iteration
npm test -- path/to/failing-test.test.ts --watch
```

### Step 2: Read the Error Message

**Look for:**

1. **Assertion failure** - What was expected vs what was received?
2. **Timeout** - Is an async operation not resolving?
3. **Import error** - Is a module missing or misconfigured?
4. **Mock error** - Is a mock not being called or returning wrong value?

**Example error analysis:**

```
Expected: 200
Received: 401
```

→ **Diagnosis:** Authentication issue, check mock user setup

```
Timeout - Async callback was not invoked within 5000ms
```

→ **Diagnosis:** Promise not resolving, check mocks or waitFor

```
Cannot find module '@/lib/someModule'
```

→ **Diagnosis:** Import path issue or missing mock

### Step 3: Check Recent Changes

```bash
# View recent commits affecting this test
git log -p -- path/to/failing-test.test.ts

# View recent changes to file under test
git log -p -- path/to/source-file.ts

# Check if test was passing before
git checkout HEAD~1
npm test -- path/to/failing-test.test.ts
git checkout -
```

### Step 4: Run Test in Isolation

```bash
# Run only this test file
npm test -- path/to/failing-test.test.ts --runInBand

# Disable other test files to eliminate interference
npm test -- --testPathPattern="failing-test.test.ts"
```

### Step 5: Add Debug Output

```typescript
// Add console.log to understand flow
it('should do something', async () => {
  console.log('1. Starting test');
  const result = await someFunction();
  console.log('2. Result:', result);
  expect(result).toBe(expected);
  console.log('3. Assertion passed');
});

// Use debug from testing-library
import { screen, render } from '@testing-library/react';

render(<MyComponent />);
screen.debug(); // Prints current DOM
```

### Step 6: Check Mock Configuration

```typescript
// Verify mocks are being called
expect(mockFunction).toHaveBeenCalled();
console.log('Mock calls:', mockFunction.mock.calls);

// Check mock return values
console.log('Mock results:', mockFunction.mock.results);

// Verify mock was configured before use
beforeEach(() => {
  jest.clearAllMocks();
  mockFunction.mockResolvedValue({ data: 'test' });
  console.log('Mock configured');
});
```

---

## Common Test Failure Patterns

### Pattern 1: withAuth Mock Timeout

**Symptom:**

```
Timeout - Async callback was not invoked within 5000ms
```

**Diagnosis:** withAuth mock not properly configured

**Fix:**

```typescript
// Ensure you're using the correct pattern
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => async (req: any, context: any) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    const authContext = { user, supabase };

    if (context?.params !== undefined) {
      return handler(req, authContext, { params: context.params });
    } else {
      return handler(req, authContext);
    }
  },
}));

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));
```

**Reference:** [TESTING_BEST_PRACTICES.md - withAuth Pattern](./TESTING_BEST_PRACTICES.md#the-withauth-mock-pattern-critical)

### Pattern 2: Component Test Timeout

**Symptom:**

```
Timeout waiting for element with text "Expected Text"
```

**Diagnosis:** Component not rendering expected content

**Fix:**

```typescript
// Check if async data is being loaded
await waitFor(
  () => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  },
  { timeout: 10000 }
);

// Then check for expected content
expect(screen.getByText('Expected Text')).toBeInTheDocument();

// Verify mock data is configured
console.log('Mock data:', mockSupabase.mock.results);
```

### Pattern 3: Import/Module Not Found

**Symptom:**

```
Cannot find module '@/lib/someModule' from 'test.ts'
```

**Diagnosis:** Module path issue or missing mock

**Fix:**

```typescript
// Option 1: Verify path is correct
// Check tsconfig.json paths

// Option 2: Add mock if module has side effects
jest.mock('@/lib/someModule', () => ({
  someFunction: jest.fn(),
}));

// Option 3: Use dynamic import for problematic modules
let SomeModule: any;
beforeAll(async () => {
  const module = await import('@/lib/someModule');
  SomeModule = module.SomeModule;
});
```

### Pattern 4: Flaky Test (Passes/Fails Intermittently)

**Symptom:** Test passes sometimes, fails other times

**Diagnosis:** Race condition, timing issue, or shared state

**Fix:**

```typescript
// 1. Add proper waitFor with timeout
await waitFor(() => {
  expect(element).toBeInTheDocument();
}, { timeout: 10000 });

// 2. Reset state between tests
afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});

// 3. Use fake timers for deterministic timing
jest.useFakeTimers();
act(() => {
  jest.advanceTimersByTime(1000);
});
jest.useRealTimers();

// 4. Run test multiple times to verify fix
for i in {1..20}; do npm test -- failing-test.test.ts; done
```

### Pattern 5: Memory Leak

**Symptom:** Tests slow down over time, process crashes

**Diagnosis:** Resources not cleaned up

**Fix:**

```typescript
afterEach(() => {
  // Clear mocks
  jest.clearAllMocks();
  jest.restoreAllMocks();

  // Clean up React components
  cleanup();

  // Clear timers
  if (jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers();
    jest.useRealTimers();
  }

  // Remove event listeners
  // (if you added any manually)
});
```

### Pattern 6: HTML Validation Error

**Symptom:**

```
Warning: validateDOMNesting(...): <button> cannot appear as a descendant of <button>
```

**Diagnosis:** Invalid HTML structure

**Fix:**

```typescript
// ❌ WRONG - Nested buttons
<button>
  <button>Click</button>
</button>

// ✅ CORRECT - Use div with button role
<div role="button" tabIndex={0} onKeyDown={handleKeyDown}>
  <button>Click</button>
</div>
```

**Reference:** [TESTING_BEST_PRACTICES.md - HTML Validation](./TESTING_BEST_PRACTICES.md#html-validation-patterns)

### Pattern 7: Query Selector Ambiguity

**Symptom:**

```
TestingLibraryElementError: Found multiple elements with the role "button"
```

**Diagnosis:** Query matches too many elements

**Fix:**

```typescript
// ❌ WRONG - Too broad
screen.getByRole('button');

// ✅ CORRECT - More specific
screen.getByRole('button', { name: 'Submit' });

// ✅ CORRECT - Use data-testid
screen.getByTestId('submit-button');

// ✅ CORRECT - Use within
const form = screen.getByRole('form');
within(form).getByRole('button', { name: 'Submit' });
```

### Pattern 8: Async State Update Warning

**Symptom:**

```
Warning: An update to Component inside a test was not wrapped in act(...)
```

**Diagnosis:** State update after test completion

**Fix:**

```typescript
// ❌ WRONG - Not wrapped in act
await user.click(button);

// ✅ CORRECT - Use user-event (automatically wrapped)
import userEvent from '@testing-library/user-event';
const user = userEvent.setup();
await user.click(button);

// ✅ CORRECT - Wrap in act for manual updates
import { act } from '@testing-library/react';
act(() => {
  // trigger state update
});
```

---

## When to Skip vs Fix Tests

### Decision Matrix

| Situation                    | Action                         | Example                     |
| ---------------------------- | ------------------------------ | --------------------------- |
| **Test reveals real bug**    | Fix the bug                    | Validation not working      |
| **Test is outdated**         | Update or delete test          | Feature was removed         |
| **Test is flaky**            | Fix timing/race condition      | Intermittent failures       |
| **Test blocks deployment**   | Skip temporarily, create issue | P0 blocker, fix in progress |
| **Test is too slow**         | Optimize or move to E2E        | >10s execution time         |
| **Test is trivial**          | Delete test                    | Testing framework behavior  |
| **Test duplicates coverage** | Delete duplicate               | Same thing tested twice     |

### How to Skip Tests

#### Temporary Skip (with TODO)

```typescript
it.skip('should handle edge case', () => {
  // TODO: Fix after auth refactor (Issue #123)
  // Currently fails due to withAuth changes
  expect(result).toBe(expected);
});

// Or skip entire suite
describe.skip('Legacy API Routes', () => {
  // TODO: Migrate to new API structure (Issue #456)
});
```

#### Conditional Skip

```typescript
const isCI = process.env.CI === 'true';

it.skipIf(isCI)('should run only locally', () => {
  // This test requires local database
});

it.skipIf(!process.env.STRIPE_KEY)('should process payment', () => {
  // Requires Stripe credentials
});
```

#### Skip with Issue Tracking

```typescript
/**
 * SKIPPED - Issue #123: withAuth mock timeout
 *
 * This test is skipped due to P0 infrastructure issue.
 * Will be re-enabled after fix is merged.
 *
 * Expected fix: Sprint 4 (2025-10-30)
 * Owner: @engineering-team
 */
it.skip('should create project with auth', async () => {
  // Test code
});
```

### How to Fix Tests

#### 1. Incremental Fix Strategy

```bash
# 1. Run failing test
npm test -- failing-test.test.ts

# 2. Make smallest change to fix one assertion
# 3. Run test again
# 4. Repeat until all assertions pass

# 5. Run full suite to ensure no regressions
npm test
```

#### 2. Test Update Workflow

```typescript
// Old test (failing)
it('should return projects', async () => {
  mockSupabase.mockResolvedValue({ data: [] });
  const result = await service.getProjects();
  expect(result).toEqual([]); // ❌ Fails - API changed
});

// Updated test (passing)
it('should return projects', async () => {
  mockSupabase.mockResolvedValue({
    data: [{ id: '1', title: 'Project' }],
    error: null,
  });
  const result = await service.getProjects();
  expect(result).toEqual({
    projects: [{ id: '1', title: 'Project' }],
    total: 1,
  }); // ✅ Matches new API response format
});
```

#### 3. Batch Fix Strategy

For multiple related test failures:

```bash
# 1. Group related failures
npm test -- --testNamePattern="API Routes" --listTests

# 2. Fix common issue (e.g., withAuth mock)
# Update pattern in one file

# 3. Apply fix to all related files
# Use search/replace or script

# 4. Verify all fixed
npm test -- --testNamePattern="API Routes"
```

---

## Test Health Monitoring

### Daily Metrics

Check these metrics daily:

```bash
# 1. Pass rate
npm test -- --passWithNoTests
# Target: ≥95%

# 2. Coverage
npm test -- --coverage
# Target: Services ≥70%, Overall ≥50%

# 3. Execution time
npm test -- --verbose
# Target: Total <2 minutes, individual tests <5s

# 4. Flaky tests
# Run suite multiple times
for i in {1..5}; do npm test; done
# Check for inconsistent results
```

### Weekly Review

Perform weekly test health review:

1. **Review failed tests**
   - Any tests failing for >1 week?
   - Create issues for persistent failures

2. **Review skipped tests**
   - Any skipped for >2 weeks?
   - Either fix or delete

3. **Review coverage trends**
   - Coverage increasing or decreasing?
   - Identify areas needing coverage

4. **Review execution time**
   - Any tests >5s?
   - Optimize or move to E2E suite

5. **Review flaky tests**
   - Identify tests with intermittent failures
   - Fix or delete flaky tests

### Health Report Template

```markdown
# Test Health Report - Week of [Date]

## Summary

- Pass Rate: X%
- Total Tests: X
- Coverage: X%
- Avg Execution Time: Xs

## Issues

- [ ] X tests failing (>1 week)
- [ ] X tests skipped (>2 weeks)
- [ ] X flaky tests identified
- [ ] X slow tests (>5s)

## Actions

1. Fix failing test in file X (Owner: @name)
2. Delete obsolete skipped test Y
3. Optimize slow test Z
4. Investigate flaky test W

## Trends

- Coverage: +2% from last week
- Pass rate: Stable at 95%
- Execution time: -10s from last week
```

---

## Preventing Regressions

### 1. Enforce Pass Rate Threshold

Add to CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test -- --coverage

- name: Check pass rate
  run: |
    PASS_RATE=$(npm test -- --json | jq '.numPassedTests / .numTotalTests * 100')
    if (( $(echo "$PASS_RATE < 95" | bc -l) )); then
      echo "Pass rate $PASS_RATE% below threshold 95%"
      exit 1
    fi
```

### 2. Require Tests for New Features

PR checklist:

- [ ] Tests added for new functionality
- [ ] Tests pass locally
- [ ] Coverage maintained or improved
- [ ] No new flaky tests introduced

### 3. Block Merges on Test Failures

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test
# This will fail the workflow if tests fail
```

### 4. Monitor Coverage Trends

```bash
# Generate coverage report
npm test -- --coverage

# Compare with previous coverage
# Fail if coverage decreased by >2%
```

### 5. Run Nightly Flaky Test Detection

```yaml
# .github/workflows/nightly-flaky-detection.yml
name: Flaky Test Detection
on:
  schedule:
    - cron: '0 2 * * *' # 2 AM daily

jobs:
  detect-flaky:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests 10 times
        run: |
          for i in {1..10}; do
            npm test -- --json > test-results-$i.json || true
          done
      - name: Analyze results
        run: node scripts/detect-flaky-tests.js
```

---

## Test Refactoring Guide

### When to Refactor Tests

Refactor when:

- Tests are hard to understand
- Tests have duplicated setup code
- Tests are brittle (break on refactors)
- Tests are slow
- Tests use outdated patterns

### Refactoring Workflow

1. **Ensure tests pass first**

   ```bash
   npm test -- test-to-refactor.test.ts
   ```

2. **Extract common setup**

   ```typescript
   // Before
   it('test 1', () => {
     const mockSupabase = createMockSupabaseClient();
     const user = mockAuthenticatedUser(mockSupabase);
     // 20 lines of setup
   });

   it('test 2', () => {
     const mockSupabase = createMockSupabaseClient();
     const user = mockAuthenticatedUser(mockSupabase);
     // Same 20 lines of setup
   });

   // After
   function createTestEnv() {
     const mockSupabase = createMockSupabaseClient();
     const user = mockAuthenticatedUser(mockSupabase);
     // 20 lines of setup
     return { mockSupabase, user };
   }

   it('test 1', () => {
     const { mockSupabase, user } = createTestEnv();
   });

   it('test 2', () => {
     const { mockSupabase, user } = createTestEnv();
   });
   ```

3. **Replace outdated patterns**

   ```typescript
   // Before - Old withAuth pattern
   jest.mock('@/lib/api/withAuth', () => ({
     withAuth: jest.fn((handler) => handler), // ❌ Wrong
   }));

   // After - Correct withAuth pattern
   jest.mock('@/lib/api/withAuth', () => ({
     withAuth: (handler: any) => async (req: any, context: any) => {
       // ✅ Correct implementation
     },
   }));
   ```

4. **Verify tests still pass**

   ```bash
   npm test -- test-to-refactor.test.ts
   ```

5. **Run full suite**
   ```bash
   npm test
   ```

### Refactoring Checklist

- [ ] Tests pass before refactoring
- [ ] Extract common setup to helpers
- [ ] Remove duplicated code
- [ ] Update to latest patterns
- [ ] Tests still pass after refactoring
- [ ] Tests are more readable
- [ ] Tests run faster (if applicable)

---

## Emergency Procedures

### Critical Test Failure in Production

**Scenario:** Tests start failing in CI after merge to main

**Steps:**

1. **Assess impact**

   ```bash
   # How many tests failing?
   npm test -- --json | jq '.numFailedTests'

   # Which tests?
   npm test | grep FAIL
   ```

2. **Check recent changes**

   ```bash
   # What was merged?
   git log --oneline -10

   # Identify suspect commit
   git show <commit-hash>
   ```

3. **Immediate actions**

   **Option A: Revert (if recent merge)**

   ```bash
   git revert <commit-hash>
   git push origin main
   ```

   **Option B: Hot fix (if simple)**

   ```bash
   # Fix the test
   # Push directly to main (emergency only)
   git commit -m "Fix: Emergency test fix for <issue>"
   git push origin main
   ```

   **Option C: Skip temporarily (if complex)**

   ```typescript
   // In failing test file
   describe.skip('Temporarily disabled', () => {
     // Tests that are failing
   });

   // Create P0 issue to fix
   ```

4. **Post-incident**
   - Document what happened
   - Create issue to prevent recurrence
   - Update runbook if needed

### Mass Test Failure

**Scenario:** >20% of tests failing suddenly

**Steps:**

1. **Don't panic - systematic approach**

2. **Check environment**

   ```bash
   # Node version
   node --version

   # Dependencies installed?
   npm ci

   # Environment variables set?
   env | grep NEXT_PUBLIC
   ```

3. **Identify pattern**

   ```bash
   # All API tests?
   npm test __tests__/api/

   # All component tests?
   npm test __tests__/components/

   # Specific pattern?
   npm test -- --testNamePattern="withAuth"
   ```

4. **Check for infrastructure issue**
   - withAuth mock broken?
   - Supabase mock broken?
   - Common utility changed?

5. **Fix root cause**
   - Usually one change broke many tests
   - Fix the common dependency
   - All tests should pass

6. **Verify fix**
   ```bash
   npm test
   # Should be back to ≥95% pass rate
   ```

### Complete Test Suite Hanging

**Scenario:** npm test never completes

**Steps:**

1. **Kill process**

   ```bash
   Ctrl+C
   ```

2. **Run single test**

   ```bash
   npm test -- __tests__/simple.test.ts
   # Does any test work?
   ```

3. **Check for infinite loops**

   ```bash
   # Run with timeout
   npm test -- --testTimeout=10000
   ```

4. **Run in band (no parallelization)**

   ```bash
   npm test -- --runInBand
   # Easier to identify hanging test
   ```

5. **Binary search for problematic test**

   ```bash
   # Test half the files
   npm test __tests__/api/
   # If hangs, problem is in API tests
   # If works, problem is elsewhere

   # Keep narrowing down
   ```

6. **Fix hanging test**
   - Usually unresolved promise
   - Missing mock
   - Infinite loop

---

## Quick Reference

### Common Commands

```bash
# Run all tests
npm test

# Run specific file
npm test -- path/to/test.test.ts

# Run with pattern
npm test -- -t "test name pattern"

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run in band (serial)
npm test -- --runInBand

# Update snapshots
npm test -- -u

# Verbose output
npm test -- --verbose

# Clear cache
npm test -- --clearCache
```

### Health Check Commands

```bash
# Pass rate
npm test 2>&1 | grep "Tests:"

# Coverage
npm test -- --coverage --collectCoverageFrom="lib/services/**"

# Slow tests
npm test -- --verbose | grep -E "\([0-9]{4,} ms\)"

# Flaky detection
for i in {1..10}; do npm test; done
```

### Emergency Commands

```bash
# Revert last commit
git revert HEAD

# Skip all failing tests temporarily
find __tests__ -name "*.test.ts" -exec sed -i '' 's/describe(/describe.skip(/g' {} \;

# Restore after emergency
git checkout -- __tests__/
```

---

## Additional Resources

- [TESTING_BEST_PRACTICES.md](./TESTING_BEST_PRACTICES.md) - Comprehensive testing guide
- [TEST_TROUBLESHOOTING.md](./TEST_TROUBLESHOOTING.md) - Detailed troubleshooting
- [REGRESSION_PREVENTION.md](./REGRESSION_PREVENTION.md) - CI/CD and monitoring
- [TESTING_UTILITIES.md](./TESTING_UTILITIES.md) - Utility reference

---

**Questions or issues?** Create an issue with the `testing` label or consult the engineering team.
