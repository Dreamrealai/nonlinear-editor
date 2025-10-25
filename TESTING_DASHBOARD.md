# Test Health Monitoring Dashboard

This document explains how to use the test health monitoring system to track and improve test quality over time.

## Overview

The test health monitoring system consists of three main components:

1. **Metrics Collection** - Captures test results, coverage, and performance data
2. **Dashboard Generator** - Creates visual HTML dashboards with trend charts
3. **Health Checker** - Validates test quality against defined thresholds

## Quick Start

### Running Tests with Health Monitoring

```bash
# Run full test suite with health monitoring
npm run test:full-check

# Or run steps individually:
npm run test:coverage -- --json --outputFile=/tmp/test-results.json
npm run test:collect
npm run test:dashboard
npm run test:health
```

### Viewing the Dashboard

After running the tests and generating the dashboard:

```bash
# Open the dashboard in your default browser
open test-health-dashboard.html

# Or manually open: test-health-dashboard.html in any browser
```

## Components

### 1. Metrics Collection (`collect-test-metrics.js`)

Collects test metrics and appends them to a historical log.

**Usage:**

```bash
npm run test:collect

# Or with custom paths:
node scripts/collect-test-metrics.js [results-file] [coverage-file]
```

**What it collects:**

- Test counts (total, passed, failed, pending)
- Pass rate percentage
- Test execution duration
- Coverage metrics (statements, branches, functions, lines)
- Test suite breakdown (unit, integration, E2E)
- Flaky test count
- Recent failures
- Slowest tests

**Output:**

- Appends metrics to `test-metrics-history.json`
- Keeps 90 days of historical data
- Each entry is timestamped

### 2. Dashboard Generator (`generate-dashboard.js`)

Generates an interactive HTML dashboard with visualizations.

**Usage:**

```bash
npm run test:dashboard

# Or with custom paths:
node scripts/generate-dashboard.js [history-file] [output-file]
```

**Dashboard Features:**

- Current test health status (Excellent/Good/Warning/Critical)
- Key metrics cards:
  - Pass rate
  - Coverage percentage
  - Failed test count
  - Flaky test count
  - Test duration
  - Total test count
- Interactive charts:
  - Pass rate trend (last 30 days)
  - Coverage trend (last 30 days)
  - Test suite breakdown (pie chart)
  - Failed tests trend
- Slowest tests table
- Recent failures list

**Chart Types:**

- Line charts for trends (pass rate, coverage)
- Doughnut chart for test breakdown
- Bar chart for failed tests

### 3. Health Checker (`check-test-health.js`)

Validates test quality against defined thresholds and alerts on degradation.

**Usage:**

```bash
npm run test:health

# Show configured thresholds:
npm run test:health:thresholds
```

**Health Checks:**

| Check                | Threshold           | Severity | Description                       |
| -------------------- | ------------------- | -------- | --------------------------------- |
| Pass Rate (min)      | 85%                 | Warning  | Minimum acceptable pass rate      |
| Pass Rate (critical) | 75%                 | Critical | Critical minimum pass rate        |
| Coverage Drop        | 5 percentage points | Warning  | Maximum allowed coverage decrease |
| New Failures         | 10 tests            | Critical | Maximum new test failures         |
| Duration Increase    | 50%                 | Warning  | Maximum test duration increase    |
| Flaky Tests          | 5 tests             | Warning  | Maximum flaky tests allowed       |
| Test Count Decrease  | 10 tests            | Warning  | Alerts if tests are removed       |

**Alert Levels:**

- **Critical** - Fails the build, must be fixed
- **Warning** - Passes but needs attention

**Exit Codes:**

- `0` - All checks passed or warnings only
- `1` - Critical checks failed

## Interpreting Metrics

### Pass Rate

- **Excellent** (90%+): Green, all tests passing
- **Good** (75-89%): Yellow, mostly passing
- **Warning** (50-74%): Orange, needs attention
- **Critical** (<50%): Red, immediate action required

**Target:** Maintain 85%+ pass rate

### Coverage

Tracks four types of coverage:

- **Statements**: Individual executable statements
- **Branches**: Conditional branches (if/else)
- **Functions**: Function definitions
- **Lines**: Source code lines

**Target:** 50%+ line coverage (current baseline)

**Note:** Coverage should not decrease by more than 5 percentage points between runs.

### Test Duration

- Tracks total test execution time
- Alerts if duration increases by more than 50%
- Use slowest tests table to identify bottlenecks

**Target:** Keep test suite under 2 minutes

### Flaky Tests

Tests that sometimes pass and sometimes fail without code changes.

- Detected by running tests multiple times
- Maximum 5 flaky tests allowed
- Run `npm run test:detect-flaky` to find them

**Action:** Fix flaky tests to improve reliability

## How to Add New Metrics

To track additional metrics, modify `scripts/collect-test-metrics.js`:

```javascript
// Add new metric to buildMetrics function
function buildMetrics(results, coverage, flakyReport) {
  return {
    // ... existing metrics
    customMetric: calculateCustomMetric(results),
  };
}

// Add calculation function
function calculateCustomMetric(results) {
  // Your calculation logic
  return value;
}
```

Then update the dashboard generator to visualize the new metric.

## How to Configure Alerts

Edit threshold values in `scripts/check-test-health.js`:

```javascript
const THRESHOLDS = {
  passRate: {
    min: 85, // Change minimum pass rate
    critical: 75, // Change critical threshold
  },
  coverageDrop: {
    max: 5, // Change max coverage drop
  },
  // ... other thresholds
};
```

## CI/CD Integration

The test health monitoring is integrated into GitHub Actions workflows:

### On Pull Requests

1. Tests run with coverage
2. Metrics are collected
3. Dashboard is generated
4. Health checks validate quality
5. Artifacts are uploaded
6. PR is commented with summary

### On Main Branch

- Full dashboard generation
- Historical metrics tracking
- Trend analysis
- Artifact retention for 30 days

### Accessing CI Results

In GitHub Actions:

1. Go to workflow run
2. Scroll to "Artifacts" section
3. Download `test-results-{sha}` or `test-health-report-{sha}`
4. Open `test-health-dashboard.html` locally

## Best Practices

### Daily Development

1. Run tests before committing:

   ```bash
   npm test
   ```

2. Check test health weekly:

   ```bash
   npm run test:full-check
   open test-health-dashboard.html
   ```

3. Address warnings proactively:
   - Fix flaky tests immediately
   - Don't let pass rate drop
   - Add tests for new features

### Before Merging PRs

1. Ensure all tests pass
2. Check health alerts in CI
3. Review coverage changes
4. Fix any new failures

### Monitoring Trends

1. Open dashboard weekly
2. Check trend charts for:
   - Declining pass rate
   - Dropping coverage
   - Increasing test duration
3. Investigate and fix trends early

### Handling Alerts

**Critical Alerts (Red):**

- Do not merge
- Fix immediately
- Review failing tests

**Warning Alerts (Yellow):**

- Create issue to track
- Plan fix in next sprint
- Monitor for escalation

## Troubleshooting

### Dashboard shows "No metrics history found"

**Solution:** Run tests and collect metrics first:

```bash
npm run test:coverage -- --json --outputFile=/tmp/test-results.json
npm run test:collect
npm run test:dashboard
```

### Health check fails with "Metrics history file not found"

This is normal on first run. Collect metrics:

```bash
npm run test:collect
```

### Charts not rendering in dashboard

- Ensure you have internet connection (Chart.js loads from CDN)
- Try a different browser
- Check browser console for errors

### Metrics collection shows warnings

Common warnings:

- Test results file not found → Run tests first
- Coverage file not found → Run tests with coverage

### High test duration

If tests are taking too long:

1. Check slowest tests in dashboard
2. Optimize or split long tests
3. Review test setup/teardown
4. Consider parallel execution

## Maintenance

### Cleaning Old Data

Metrics history automatically keeps only 90 days of data. To manually clean:

```bash
# Backup current history
cp test-metrics-history.json test-metrics-history.backup.json

# Remove old entries manually or delete file to start fresh
rm test-metrics-history.json
```

### Updating Thresholds

As test suite improves, tighten thresholds:

```javascript
// In scripts/check-test-health.js
const THRESHOLDS = {
  passRate: {
    min: 90, // Increase from 85
  },
};
```

### Dashboard Customization

To customize the dashboard appearance:

1. Edit `scripts/generate-dashboard.js`
2. Modify the HTML template in `generateDashboard` function
3. Adjust CSS styles in `<style>` section
4. Add/remove charts as needed

## Integration with Other Tools

### Codecov

Test coverage is also uploaded to Codecov for:

- PR comments
- Coverage badges
- Trend analysis

### Sentry

Test failures are tracked in Sentry for:

- Error monitoring
- Stack traces
- Breadcrumbs

### Slack Notifications (Future)

Add Slack webhook to health checker:

```javascript
// In scripts/check-test-health.js
async function sendSlackAlert(alerts) {
  // Implementation
}
```

## Examples

### Example: Daily Workflow

```bash
# Morning: Check current health
npm run test:dashboard
open test-health-dashboard.html

# During development: Run tests
npm test

# Before commit: Full check
npm run test:full-check

# Review results
npm run test:health
```

### Example: PR Review

```bash
# Reviewer: Check test health in CI
# 1. Open GitHub Actions workflow
# 2. Download test-results artifact
# 3. Open test-health-dashboard.html
# 4. Review metrics and trends
# 5. Check for alerts
```

### Example: Sprint Retrospective

```bash
# Generate dashboard for review
npm run test:dashboard
open test-health-dashboard.html

# Review trends:
# - Did pass rate improve?
# - Did coverage increase?
# - Are tests faster?
# - Any flaky tests?

# Plan improvements for next sprint
```

## FAQ

**Q: How often should I run the health check?**
A: Daily during development, and on every PR in CI.

**Q: What if I have too many warnings?**
A: Prioritize by severity. Fix critical first, plan warnings for next sprint.

**Q: Can I customize the thresholds?**
A: Yes, edit `THRESHOLDS` in `scripts/check-test-health.js`.

**Q: How do I share the dashboard with the team?**
A: The HTML dashboard can be:

- Opened from CI artifacts
- Committed to repo (on main only)
- Hosted on GitHub Pages
- Sent via email

**Q: What if tests are flaky only in CI?**
A: This indicates environment-specific issues:

- Check CI resource limits
- Review timing assumptions
- Add explicit waits
- Mock external dependencies

**Q: How do I add a new chart?**
A: Edit `scripts/generate-dashboard.js`:

1. Add data extraction function
2. Add HTML canvas element
3. Add Chart.js configuration
4. Regenerate dashboard

## Support

For issues or questions:

1. Check this documentation
2. Review script help: `node scripts/[script-name].js --help`
3. Check GitHub Actions logs
4. Create issue in repository

## Related Documentation

- [Testing Best Practices](./docs/TESTING_BEST_PRACTICES.md)
- [Coding Best Practices](./docs/CODING_BEST_PRACTICES.md)
- [CI/CD Workflows](./.github/workflows/README.md)

---

**Last Updated:** 2025-10-24
**Maintained By:** Agent 9
**Version:** 1.0.0
