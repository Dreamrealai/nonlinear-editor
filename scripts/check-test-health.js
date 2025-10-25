#!/usr/bin/env node

/**
 * Test Health Checker with Alerting
 *
 * This script checks test health against defined thresholds and alerts when thresholds are breached.
 * Designed to run in CI/CD pipelines to prevent quality degradation.
 *
 * Usage:
 *   node scripts/check-test-health.js [history-file]
 *
 * Arguments:
 *   history-file: Path to metrics history JSON (default: test-metrics-history.json)
 *
 * Examples:
 *   npm run test:health
 *   node scripts/check-test-health.js
 *   node scripts/check-test-health.js test-metrics-history.json
 *
 * Exit codes:
 *   0: All health checks passed
 *   1: One or more health checks failed
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Health check thresholds
 */
const THRESHOLDS = {
  passRate: {
    min: 85, // Pass rate must be at least 85%
    critical: 75, // Below 75% is critical
  },
  coverageDrop: {
    max: 5, // Coverage can't drop more than 5 percentage points
  },
  newFailures: {
    max: 10, // No more than 10 new failures
  },
  durationIncrease: {
    max: 50, // Duration can't increase more than 50%
  },
  flakyTests: {
    max: 5, // No more than 5 flaky tests
  },
  totalTests: {
    minDecrease: -10, // Total tests shouldn't decrease by more than 10
  },
};

/**
 * Load metrics history
 */
function loadMetricsHistory(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Metrics history file not found: ${filePath}`);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const history = JSON.parse(content);

    if (!Array.isArray(history) || history.length === 0) {
      throw new Error('Metrics history is empty');
    }

    return history;
  } catch (error) {
    throw new Error(`Failed to load metrics history: ${error.message}`);
  }
}

/**
 * Get latest and previous metrics
 */
function getComparisonMetrics(history) {
  if (history.length < 2) {
    return {
      latest: history[history.length - 1],
      previous: null,
    };
  }

  return {
    latest: history[history.length - 1],
    previous: history[history.length - 2],
  };
}

/**
 * Get baseline metrics (7-day average)
 */
function getBaselineMetrics(history) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentMetrics = history.filter((entry) => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= sevenDaysAgo;
  });

  if (recentMetrics.length === 0) {
    return null;
  }

  // Calculate averages
  const sum = recentMetrics.reduce(
    (acc, entry) => {
      acc.passRate += entry.tests.passRate;
      acc.coverage += entry.coverage.lines;
      acc.duration += entry.tests.duration;
      return acc;
    },
    { passRate: 0, coverage: 0, duration: 0 }
  );

  return {
    passRate: sum.passRate / recentMetrics.length,
    coverage: sum.coverage / recentMetrics.length,
    duration: sum.duration / recentMetrics.length,
  };
}

/**
 * Check pass rate threshold
 */
function checkPassRate(latest) {
  const alerts = [];
  const passRate = latest.tests.passRate;

  if (passRate < THRESHOLDS.passRate.critical) {
    alerts.push({
      level: 'critical',
      check: 'Pass Rate',
      message: `Pass rate ${passRate.toFixed(1)}% is below critical threshold ${THRESHOLDS.passRate.critical}%`,
      value: passRate,
      threshold: THRESHOLDS.passRate.critical,
      recommendation: 'Immediate action required: Fix failing tests before merging',
    });
  } else if (passRate < THRESHOLDS.passRate.min) {
    alerts.push({
      level: 'warning',
      check: 'Pass Rate',
      message: `Pass rate ${passRate.toFixed(1)}% is below target threshold ${THRESHOLDS.passRate.min}%`,
      value: passRate,
      threshold: THRESHOLDS.passRate.min,
      recommendation: 'Fix failing tests to improve quality',
    });
  }

  return alerts;
}

/**
 * Check coverage drop
 */
function checkCoverageDrop(latest, previous) {
  const alerts = [];

  if (!previous) {
    return alerts;
  }

  const coverageDrop = previous.coverage.lines - latest.coverage.lines;

  if (coverageDrop > THRESHOLDS.coverageDrop.max) {
    alerts.push({
      level: 'warning',
      check: 'Coverage Drop',
      message: `Coverage dropped by ${coverageDrop.toFixed(1)}pp (${previous.coverage.lines.toFixed(1)}% → ${latest.coverage.lines.toFixed(1)}%)`,
      value: coverageDrop,
      threshold: THRESHOLDS.coverageDrop.max,
      recommendation: 'Add tests for new code or investigate removed tests',
    });
  }

  return alerts;
}

/**
 * Check new failures
 */
function checkNewFailures(latest, previous) {
  const alerts = [];

  if (!previous) {
    if (latest.tests.failed > THRESHOLDS.newFailures.max) {
      alerts.push({
        level: 'critical',
        check: 'Failed Tests',
        message: `${latest.tests.failed} tests are failing`,
        value: latest.tests.failed,
        threshold: THRESHOLDS.newFailures.max,
        recommendation: 'Fix failing tests before merging',
      });
    }
    return alerts;
  }

  const newFailures = latest.tests.failed - previous.tests.failed;

  if (newFailures > THRESHOLDS.newFailures.max) {
    alerts.push({
      level: 'critical',
      check: 'New Failures',
      message: `${newFailures} new test failures detected (${previous.tests.failed} → ${latest.tests.failed})`,
      value: newFailures,
      threshold: THRESHOLDS.newFailures.max,
      recommendation: 'Review and fix new test failures',
    });
  } else if (newFailures > 0) {
    alerts.push({
      level: 'warning',
      check: 'New Failures',
      message: `${newFailures} new test failures (${previous.tests.failed} → ${latest.tests.failed})`,
      value: newFailures,
      threshold: THRESHOLDS.newFailures.max,
      recommendation: 'Investigate new failures',
    });
  }

  return alerts;
}

/**
 * Check duration increase
 */
function checkDurationIncrease(latest, baseline) {
  const alerts = [];

  if (!baseline) {
    return alerts;
  }

  const percentIncrease = ((latest.tests.duration - baseline.duration) / baseline.duration) * 100;

  if (percentIncrease > THRESHOLDS.durationIncrease.max) {
    alerts.push({
      level: 'warning',
      check: 'Test Duration',
      message: `Test duration increased by ${percentIncrease.toFixed(1)}% (${baseline.duration}ms → ${latest.tests.duration}ms)`,
      value: percentIncrease,
      threshold: THRESHOLDS.durationIncrease.max,
      recommendation: 'Optimize slow tests or review new test additions',
    });
  }

  return alerts;
}

/**
 * Check flaky tests
 */
function checkFlakyTests(latest) {
  const alerts = [];

  if (latest.flaky > THRESHOLDS.flakyTests.max) {
    alerts.push({
      level: 'warning',
      check: 'Flaky Tests',
      message: `${latest.flaky} flaky tests detected (threshold: ${THRESHOLDS.flakyTests.max})`,
      value: latest.flaky,
      threshold: THRESHOLDS.flakyTests.max,
      recommendation: 'Fix flaky tests to improve reliability',
    });
  }

  return alerts;
}

/**
 * Check total test count
 */
function checkTotalTests(latest, previous) {
  const alerts = [];

  if (!previous) {
    return alerts;
  }

  const testCountChange = latest.tests.total - previous.tests.total;

  if (testCountChange < THRESHOLDS.totalTests.minDecrease) {
    alerts.push({
      level: 'warning',
      check: 'Test Count',
      message: `Total tests decreased by ${Math.abs(testCountChange)} (${previous.tests.total} → ${latest.tests.total})`,
      value: testCountChange,
      threshold: THRESHOLDS.totalTests.minDecrease,
      recommendation: 'Verify tests were not accidentally removed',
    });
  }

  return alerts;
}

/**
 * Run all health checks
 */
function runHealthChecks(history) {
  const { latest, previous } = getComparisonMetrics(history);
  const baseline = getBaselineMetrics(history);

  const alerts = [
    ...checkPassRate(latest),
    ...checkCoverageDrop(latest, previous),
    ...checkNewFailures(latest, previous),
    ...checkDurationIncrease(latest, baseline),
    ...checkFlakyTests(latest),
    ...checkTotalTests(latest, previous),
  ];

  return {
    latest,
    previous,
    baseline,
    alerts,
  };
}

/**
 * Print health check results
 */
function printHealthCheckResults(results) {
  const { latest, alerts } = results;

  print('\n═══════════════════════════════════════════', 'cyan');
  print('       Test Health Check Report', 'bright');
  print('═══════════════════════════════════════════', 'cyan');

  console.log('');
  console.log(`  Timestamp: ${new Date(latest.timestamp).toLocaleString()}`);
  console.log('');

  // Print current metrics
  print('  📊 Current Metrics:', 'cyan');
  console.log(`     Pass Rate:      ${latest.tests.passRate.toFixed(1)}%`);
  console.log(`     Coverage:       ${latest.coverage.lines.toFixed(1)}%`);
  console.log(`     Total Tests:    ${latest.tests.total}`);
  console.log(`     Failed:         ${latest.tests.failed}`);
  console.log(`     Flaky:          ${latest.flaky}`);
  console.log(`     Duration:       ${(latest.tests.duration / 1000).toFixed(1)}s`);
  console.log('');

  // Print alerts
  const criticalAlerts = alerts.filter((a) => a.level === 'critical');
  const warningAlerts = alerts.filter((a) => a.level === 'warning');

  if (alerts.length === 0) {
    print('  ✅ All health checks passed!', 'green');
    print('     No issues detected', 'green');
  } else {
    if (criticalAlerts.length > 0) {
      print(`  🔴 Critical Alerts (${criticalAlerts.length}):`, 'red');
      print('─────────────────────────────────────────', 'red');
      criticalAlerts.forEach((alert) => {
        console.log(`\n  ❌ ${alert.check}`);
        console.log(`     ${colors.red}${alert.message}${colors.reset}`);
        console.log(`     💡 ${alert.recommendation}`);
      });
      console.log('');
    }

    if (warningAlerts.length > 0) {
      print(`  ⚠️  Warnings (${warningAlerts.length}):`, 'yellow');
      print('─────────────────────────────────────────', 'yellow');
      warningAlerts.forEach((alert) => {
        console.log(`\n  ⚠️  ${alert.check}`);
        console.log(`     ${colors.yellow}${alert.message}${colors.reset}`);
        console.log(`     💡 ${alert.recommendation}`);
      });
      console.log('');
    }
  }

  print('═══════════════════════════════════════════\n', 'cyan');

  return alerts;
}

/**
 * Print threshold configuration
 */
function printThresholds() {
  print('\n📋 Health Check Thresholds:', 'cyan');
  print('─────────────────────────────────────────', 'cyan');
  console.log(`  Pass Rate (min):           ${THRESHOLDS.passRate.min}%`);
  console.log(`  Pass Rate (critical):      ${THRESHOLDS.passRate.critical}%`);
  console.log(`  Coverage Drop (max):       ${THRESHOLDS.coverageDrop.max}pp`);
  console.log(`  New Failures (max):        ${THRESHOLDS.newFailures.max}`);
  console.log(`  Duration Increase (max):   ${THRESHOLDS.durationIncrease.max}%`);
  console.log(`  Flaky Tests (max):         ${THRESHOLDS.flakyTests.max}`);
  console.log(`  Test Count Decrease (max): ${Math.abs(THRESHOLDS.totalTests.minDecrease)}`);
  console.log('');
}

/**
 * Generate alert summary for CI
 */
function generateCIOutput(alerts) {
  if (alerts.length === 0) {
    return;
  }

  const criticalAlerts = alerts.filter((a) => a.level === 'critical');
  const warningAlerts = alerts.filter((a) => a.level === 'warning');

  console.log('::group::Test Health Alerts');
  if (criticalAlerts.length > 0) {
    criticalAlerts.forEach((alert) => {
      console.log(`::error title=${alert.check}::${alert.message}`);
    });
  }
  if (warningAlerts.length > 0) {
    warningAlerts.forEach((alert) => {
      console.log(`::warning title=${alert.check}::${alert.message}`);
    });
  }
  console.log('::endgroup::');
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);
  const historyFile = args[0] || path.join(process.cwd(), 'test-metrics-history.json');

  // Check for --show-thresholds flag
  if (args.includes('--show-thresholds')) {
    printThresholds();
    process.exit(0);
  }

  print('\n🏥 Running Test Health Checks...', 'cyan');

  try {
    // Load metrics history
    const history = loadMetricsHistory(historyFile);

    // Run health checks
    const results = runHealthChecks(history);

    // Print results
    const alerts = printHealthCheckResults(results);

    // Generate CI output if in CI environment
    if (process.env.CI === 'true') {
      generateCIOutput(alerts);
    }

    // Determine exit code
    const hasCritical = alerts.some((a) => a.level === 'critical');

    if (hasCritical) {
      print('❌ FAIL: Critical health checks failed', 'red');
      print('   Fix critical issues before merging\n', 'red');
      process.exit(1);
    } else if (alerts.length > 0) {
      print('⚠️  WARN: Some health checks need attention', 'yellow');
      print('   Review warnings and consider improvements\n', 'yellow');
      // Exit with 0 for warnings (don't fail build)
      process.exit(0);
    } else {
      print('✅ PASS: All health checks passed', 'green');
      print('   Test suite is healthy\n', 'green');
      process.exit(0);
    }
  } catch (error) {
    print(`❌ Error: ${error.message}`, 'red');
    if (process.env.DEBUG) {
      console.error(error);
    }

    // If metrics file doesn't exist, it's not a failure (first run)
    if (error.message.includes('not found')) {
      print('\n💡 Tip: Run tests and collect metrics first:', 'yellow');
      print('   npm run test:coverage -- --json --outputFile=/tmp/test-results.json', 'cyan');
      print('   npm run test:collect', 'cyan');
      process.exit(0);
    }

    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  THRESHOLDS,
  runHealthChecks,
  checkPassRate,
  checkCoverageDrop,
  checkNewFailures,
};
