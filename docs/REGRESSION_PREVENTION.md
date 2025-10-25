# Regression Prevention System

This document describes the automated regression prevention system that protects test suite quality and prevents degradation over time.

## Overview

The regression prevention system consists of:

1. **Pass Rate Thresholds** - Minimum test pass rate enforcement
2. **Coverage Thresholds** - Minimum code coverage requirements
3. **Flaky Test Detection** - Automated detection of unreliable tests
4. **Test Performance Monitoring** - Execution time tracking and alerts
5. **PR Quality Gates** - Automated blocking of quality-degrading changes
6. **Test Health Reporting** - Comprehensive dashboards and metrics

## Components

### 1. Pass Rate Checking (`scripts/check-pass-rate.js`)

**Purpose**: Ensures test pass rate doesn't drop below acceptable levels.

**How it works**:

- Reads Jest test results JSON file
- Calculates pass rate: `(passed tests / active tests) * 100`
- Compares against threshold (default: 75%)
- Fails CI if below threshold

**Usage**:

```bash
# Run tests and check pass rate
npm run test:check-pass-rate

# Check with custom threshold
node scripts/check-pass-rate.js 80 /tmp/test-results.json

# In CI
npm test -- --json --outputFile=/tmp/test-results.json
node scripts/check-pass-rate.js 75 /tmp/test-results.json
```

**Current Threshold**: 75%

- This allows for some failing tests while maintaining quality
- Can be adjusted based on project maturity
- Recommended: Start at 70%, increase by 5% each sprint

**Output Example**:

```
═══════════════════════════════════════════
         Test Pass Rate Report
═══════════════════════════════════════════

  Total Tests:     1,774
  Passed:          1,450
  Failed:          324
  Pending/Skipped: 50
  Active Tests:    1,724

  Pass Rate: 84.11%

═══════════════════════════════════════════

✅ PASS: Test pass rate 84.11% meets threshold 75.00%
```

### 2. Coverage Thresholds (`jest.config.js`)

**Purpose**: Prevents code coverage from decreasing over time.

**Current Thresholds** (as of 2025-10-24):

```javascript
coverageThreshold: {
  global: {
    statements: 50,  // Current: ~32%, set conservative
    branches: 40,    // Current: ~25%, set conservative
    functions: 45,   // Current: ~30%, set conservative
    lines: 50,       // Current: ~32%, set conservative
  },
  './lib/services/': {
    statements: 60,  // Services have better coverage
    branches: 50,
    functions: 60,
    lines: 60,
  },
}
```

**Why These Numbers**:

- Set slightly above current baseline to prevent regression
- Not so high that they block all PRs
- Allow gradual improvement over time
- Higher for well-tested areas (services)

**Adjustment Strategy**:

1. Month 1: Establish baseline (current thresholds)
2. Month 2-3: Fix failing tests, increase to 55%
3. Month 4-6: Add new tests, increase to 60%
4. Month 7-12: Reach goal of 70%

**How to Update**:

```javascript
// In jest.config.js
coverageThreshold: {
  global: {
    statements: 55,  // Increase by 5%
    // ...
  }
}
```

### 3. Flaky Test Detection (`scripts/detect-flaky-tests.js`)

**Purpose**: Identifies tests that sometimes pass, sometimes fail with no code changes.

**How it works**:

- Runs test suite multiple times (default: 3)
- Tracks pass/fail status for each test
- Identifies tests with inconsistent results
- Generates report with flaky tests

**Usage**:

```bash
# Run with default 3 iterations
npm run test:detect-flaky

# Run with custom iterations
node scripts/detect-flaky-tests.js 5

# Run on specific pattern
node scripts/detect-flaky-tests.js 3 "api/**"
```

**When to Run**:

- Nightly (automated via GitHub Actions)
- Before major releases
- When investigating test failures
- After infrastructure changes

**Output Example**:

```
═══════════════════════════════════════════
       Flaky Test Detection Report
═══════════════════════════════════════════

  Total Iterations:  3
  Flaky Tests Found: 2

  ⚠️  Flaky Tests (inconsistent results):
─────────────────────────────────────────

1. __tests__/api/video/generate.test.ts
   POST /api/video/generate › should create video
   Pass Rate: 66.7% (2/3)
   Average Duration: 450ms
   Results: ✓ ✗ ✓

2. __tests__/components/Timeline.test.tsx
   Timeline › should handle rapid updates
   Pass Rate: 33.3% (1/3)
   Average Duration: 1250ms
   Results: ✗ ✗ ✓
```

**Automated Actions**:

- Nightly detection creates GitHub issues for flaky tests
- Issues tagged with `flaky-test` label
- Report saved as artifact for 90 days

### 4. Test Health Reporting (`scripts/generate-test-report.js`)

**Purpose**: Generates comprehensive test health dashboard.

**Includes**:

- Overall pass rate and metrics
- Coverage metrics (if available)
- Slowest tests (performance bottlenecks)
- Failed tests with error details
- Flaky tests (if detected)
- Recommendations for improvement

**Usage**:

```bash
# Generate report from test results
npm run test:report

# Custom paths
node scripts/generate-test-report.js /tmp/test-results.json reports/health.md
```

**Generated File**: `TEST_HEALTH_DASHBOARD.md`

**Output Includes**:

- 📊 Overall Metrics (total, passed, failed, pass rate)
- 📈 Coverage Metrics (statements, branches, functions, lines)
- 🏃 Test Suite Performance (failing suites, durations)
- ⏱️ Slowest Tests (top 15 slowest tests)
- ❌ Failed Tests (detailed error messages)
- ⚠️ Flaky Tests (if detected)
- 💡 Recommendations (actionable improvements)

### 5. GitHub Actions Workflows

#### Test Quality Gates (`.github/workflows/test-quality-gates.yml`)

**Triggers**:

- Every pull request
- Every push to main/develop
- Nightly at 2 AM UTC (flaky test detection)
- Manual workflow dispatch

**Jobs**:

**A. Test Pass Rate Check**:

- Runs tests with coverage
- Checks pass rate threshold (75%)
- Generates test health report
- Comments on PR with summary
- Uploads results as artifacts

**B. Coverage Threshold Check**:

- Runs tests with coverage
- Enforces Jest coverage thresholds
- Uploads to Codecov
- Fails if coverage below thresholds

**C. Flaky Test Detection** (nightly only):

- Runs tests 3 times
- Identifies inconsistent tests
- Creates GitHub issues for flaky tests
- Uploads report as artifact (90 days)

**D. Test Performance Monitoring**:

- Measures test execution time
- Warns if tests take >10 minutes
- Comments on PR if slow
- Tracks performance over time

**E. All Quality Gates**:

- Requires all checks to pass
- Blocks PR merge if any fail
- Reports status of each gate

#### Updated CI Workflow (`.github/workflows/ci.yml`)

**Changes**:

- Tests now run with `--json --outputFile`
- Pass rate check added after tests
- Continues on test failure to generate report
- Uploads both coverage and test results

### 6. NPM Scripts

Added to `package.json`:

```json
{
  "scripts": {
    "test:check-pass-rate": "npm run test:coverage -- --json --outputFile=/tmp/test-results.json && node scripts/check-pass-rate.js 75",
    "test:detect-flaky": "node scripts/detect-flaky-tests.js 3",
    "test:report": "node scripts/generate-test-report.js"
  }
}
```

## How to Use

### For Developers

#### Before Committing

```bash
# Run tests to ensure they pass
npm test

# Check if pass rate meets threshold
npm run test:check-pass-rate
```

#### When PR is Blocked

If your PR is blocked by quality gates:

1. **Check the Test Health Report** in PR comments
2. **Review Failed Tests** - Fix or update tests
3. **Check Coverage** - Add tests for new code
4. **Check Pass Rate** - Ensure no new failures

#### Requesting Override

In rare cases, you may need to override quality gates:

1. Document why override is needed
2. Create plan to fix issues
3. Request approval from maintainer
4. Merge with `[skip ci]` if approved (not recommended)

### For Maintainers

#### Adjusting Thresholds

**Pass Rate Threshold**:

```bash
# In scripts/check-pass-rate.js or CI workflow
node scripts/check-pass-rate.js 80  # Increase to 80%
```

**Coverage Thresholds**:

```javascript
// In jest.config.js
coverageThreshold: {
  global: {
    statements: 55,  // Increase by 5%
    // ...
  }
}
```

#### Running Flaky Test Detection

```bash
# Run manually
npm run test:detect-flaky

# Run with more iterations
node scripts/detect-flaky-tests.js 5

# Run on specific tests
node scripts/detect-flaky-tests.js 3 "api/**"
```

#### Reviewing Test Health

```bash
# Generate current health report
npm run test:coverage -- --json --outputFile=/tmp/test-results.json
npm run test:report

# View report
cat TEST_HEALTH_DASHBOARD.md
```

## Quality Gate Thresholds

### Current Thresholds (as of 2025-10-24)

| Metric                    | Threshold | Current  | Status                  |
| ------------------------- | --------- | -------- | ----------------------- |
| **Pass Rate**             | 75%       | ~84%     | ✅ Passing              |
| **Coverage - Statements** | 50%       | ~32%     | ⚠️ Below (conservative) |
| **Coverage - Branches**   | 40%       | ~25%     | ⚠️ Below (conservative) |
| **Coverage - Functions**  | 45%       | ~30%     | ⚠️ Below (conservative) |
| **Coverage - Lines**      | 50%       | ~32%     | ⚠️ Below (conservative) |
| **Test Execution Time**   | <10 min   | ~3-5 min | ✅ Passing              |

**Note**: Coverage thresholds are set conservatively below current levels to prevent immediate failures while test infrastructure is being fixed. They should be gradually increased.

### Target Thresholds (6-month goal)

| Metric                    | Target | Increment Strategy |
| ------------------------- | ------ | ------------------ |
| **Pass Rate**             | 90%    | +2% per sprint     |
| **Coverage - Statements** | 70%    | +5% per month      |
| **Coverage - Branches**   | 60%    | +5% per month      |
| **Coverage - Functions**  | 70%    | +5% per month      |
| **Coverage - Lines**      | 70%    | +5% per month      |

## Handling Quality Gate Failures

### Pass Rate Below Threshold

**Cause**: New failing tests or tests that started failing

**Actions**:

1. Review Test Health Report in PR comments
2. Check "Failed Tests" section
3. Fix failing tests or remove broken ones
4. Re-run tests

**Example**:

```bash
# Identify failed tests
npm test -- --json --outputFile=/tmp/test-results.json
node scripts/check-pass-rate.js 75

# Fix and re-test
npm test
```

### Coverage Below Threshold

**Cause**: New code without tests or removed tests

**Actions**:

1. Check coverage report in artifacts
2. Add tests for new code
3. Ensure test files are included
4. Re-run coverage check

**Example**:

```bash
# Check coverage
npm run test:coverage

# Add tests for uncovered code
# Then re-run
npm run test:coverage
```

### Flaky Tests Detected

**Cause**: Tests with timing issues, race conditions, or insufficient cleanup

**Actions**:

1. Review flaky test report
2. Run test locally multiple times
3. Fix race conditions or timing issues
4. Add proper cleanup
5. Verify stability

**Example**:

```bash
# Run test multiple times
for i in {1..10}; do npm test -- path/to/test.test.ts; done

# Common fixes:
# - Add await for async operations
# - Use waitFor() in React tests
# - Add proper cleanup in afterEach()
# - Mock time-dependent code
# - Increase test timeout if needed
```

### Test Performance Issues

**Cause**: Slow tests or inefficient test setup

**Actions**:

1. Review "Slowest Tests" in report
2. Optimize slow tests (better mocking, reduce setup)
3. Use parallel execution
4. Consider splitting large test files

**Example**:

```bash
# Identify slow tests
npm run test:report
# Check "Slowest Tests" section

# Optimize by:
# - Mocking expensive operations
# - Reducing test data size
# - Using beforeAll for shared setup
# - Parallel test execution
```

## Best Practices

### Writing Stable Tests

1. **Avoid Race Conditions**:

```typescript
// ❌ Bad - timing dependent
test('updates after delay', () => {
  setTimeout(() => updateState(), 100);
  expect(state).toBe(newValue); // May fail
});

// ✅ Good - wait for update
test('updates after delay', async () => {
  await waitFor(() => {
    expect(state).toBe(newValue);
  });
});
```

2. **Proper Cleanup**:

```typescript
// ✅ Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  cleanup(); // React Testing Library
});
```

3. **Isolate Tests**:

```typescript
// ❌ Bad - shared state
let sharedState = {};

test('test 1', () => {
  sharedState.value = 1;
});

test('test 2', () => {
  // Depends on test 1 execution order
  expect(sharedState.value).toBe(1);
});

// ✅ Good - independent tests
test('test 1', () => {
  const state = { value: 1 };
  expect(state.value).toBe(1);
});

test('test 2', () => {
  const state = { value: 1 };
  expect(state.value).toBe(1);
});
```

4. **Mock External Dependencies**:

```typescript
// ✅ Mock network, file system, dates
jest.mock('@/lib/api/client');
jest.useFakeTimers();
```

### Maintaining High Coverage

1. **Test Critical Paths**:
   - Authentication flows
   - Data mutations
   - Error handling
   - Edge cases

2. **Use Coverage Reports**:

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html
```

3. **Add Tests for New Code**:
   - Write tests alongside code
   - Aim for 80%+ coverage on new files
   - Test both success and error cases

## Monitoring and Metrics

### Daily Monitoring

- Review nightly flaky test detection reports
- Check GitHub issues for flaky tests
- Monitor test execution time trends

### Weekly Review

- Review Test Health Dashboard
- Analyze pass rate trends
- Review coverage trends
- Identify slow tests for optimization

### Monthly Review

- Adjust thresholds based on progress
- Plan test infrastructure improvements
- Review and close flaky test issues
- Update documentation

## Troubleshooting

### Tests Passing Locally but Failing in CI

**Possible causes**:

- Environment differences
- Missing environment variables
- Different Node.js versions
- Timing/race conditions (more visible in CI)

**Solutions**:

- Check CI logs for environment details
- Ensure env vars are set in GitHub secrets
- Match Node.js version with CI
- Add retries for flaky tests (temporary)

### Coverage Threshold Failing

**Possible causes**:

- New code without tests
- Deleted test files
- Changed coverage calculation

**Solutions**:

- Add tests for new code
- Verify test files are discovered
- Check jest.config.js collectCoverageFrom

### Pass Rate Calculation Seems Wrong

**Possible causes**:

- Pending/skipped tests counted differently
- Test file discovery issues
- JSON output not generated

**Solutions**:

- Check test results JSON file
- Verify all tests are discovered
- Review pass rate calculation logic

## Related Documentation

- [Testing Utilities Guide](./TESTING_UTILITIES.md)
- [Coding Best Practices](./CODING_BEST_PRACTICES.md)
- [Testing Best Practices](./TESTING_BEST_PRACTICES.md)
- [CI/CD Documentation](../.github/workflows/README.md)

## Changelog

### 2025-10-24 - Initial Implementation

- Created pass rate checking script
- Created flaky test detection script
- Created test health report generator
- Added GitHub Actions quality gates
- Set initial coverage thresholds
- Documented regression prevention system

---

**Last Updated**: 2025-10-24
**Maintained By**: Development Team
**Questions**: Create an issue or check documentation
