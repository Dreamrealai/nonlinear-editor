#!/usr/bin/env node

/**
 * Test Metrics Collection Script
 *
 * This script collects test metrics from Jest test results and coverage data,
 * then appends them to a historical log for trend analysis.
 *
 * Usage:
 *   node scripts/collect-test-metrics.js [results-file] [coverage-file]
 *
 * Arguments:
 *   results-file: Path to Jest JSON results file (default: /tmp/test-results.json)
 *   coverage-file: Path to coverage summary JSON (default: coverage/coverage-summary.json)
 *
 * Examples:
 *   npm run test:collect
 *   node scripts/collect-test-metrics.js
 *   node scripts/collect-test-metrics.js /tmp/test-results.json coverage/coverage-summary.json
 *
 * Output:
 *   Appends metrics to test-metrics-history.json
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
};

function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Load JSON file
 */
function loadJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Load test results
 */
function loadTestResults(filePath) {
  if (!fs.existsSync(filePath)) {
    print(`⚠️  Warning: Test results file not found: ${filePath}`, 'yellow');
    return null;
  }
  return loadJSON(filePath);
}

/**
 * Load coverage data
 */
function loadCoverageData(filePath) {
  if (!fs.existsSync(filePath)) {
    print(`⚠️  Warning: Coverage file not found: ${filePath}`, 'yellow');
    return null;
  }
  return loadJSON(filePath);
}

/**
 * Load flaky test report
 */
function loadFlakyTestReport() {
  const flakyReportPath = path.join(process.cwd(), 'flaky-tests-report.json');
  if (!fs.existsSync(flakyReportPath)) {
    return null;
  }
  return loadJSON(flakyReportPath);
}

/**
 * Calculate test metrics from Jest results
 */
function calculateTestMetrics(results) {
  if (!results) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      pending: 0,
      passRate: 0,
      duration: 0,
    };
  }

  const { numTotalTests, numPassedTests, numFailedTests, numPendingTests } = results;
  const activeTests = numTotalTests - numPendingTests;
  const passRate = activeTests > 0 ? (numPassedTests / activeTests) * 100 : 0;

  // Calculate total test duration
  let totalDuration = 0;
  if (results.testResults) {
    results.testResults.forEach((suite) => {
      if (suite.perfStats && suite.perfStats.runtime) {
        totalDuration += suite.perfStats.runtime;
      }
    });
  }

  return {
    total: numTotalTests,
    passed: numPassedTests,
    failed: numFailedTests,
    pending: numPendingTests,
    passRate: Math.round(passRate * 100) / 100,
    duration: Math.round(totalDuration),
  };
}

/**
 * Calculate coverage metrics
 */
function calculateCoverageMetrics(coverage) {
  if (!coverage || !coverage.total) {
    return {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    };
  }

  return {
    statements: Math.round(coverage.total.statements.pct * 100) / 100,
    branches: Math.round(coverage.total.branches.pct * 100) / 100,
    functions: Math.round(coverage.total.functions.pct * 100) / 100,
    lines: Math.round(coverage.total.lines.pct * 100) / 100,
  };
}

/**
 * Calculate test suite breakdown
 */
function calculateTestSuiteBreakdown(results) {
  if (!results || !results.testResults) {
    return {
      unit: 0,
      integration: 0,
      e2e: 0,
    };
  }

  const breakdown = {
    unit: 0,
    integration: 0,
    e2e: 0,
  };

  results.testResults.forEach((suite) => {
    const suiteName = suite.name.toLowerCase();
    if (suiteName.includes('integration')) {
      breakdown.integration += suite.numTotalTests;
    } else if (suiteName.includes('e2e')) {
      breakdown.e2e += suite.numTotalTests;
    } else {
      breakdown.unit += suite.numTotalTests;
    }
  });

  return breakdown;
}

/**
 * Detect flaky tests from current run
 */
function detectFlakyTestsFromRun(results, flakyReport) {
  let flakyTestCount = 0;

  // If we have a flaky report, use it
  if (flakyReport && flakyReport.totalFlakyTests) {
    flakyTestCount = flakyReport.totalFlakyTests;
  }

  return flakyTestCount;
}

/**
 * Count recent failures
 */
function countRecentFailures(results) {
  if (!results || !results.testResults) {
    return 0;
  }

  let failureCount = 0;
  results.testResults.forEach((suite) => {
    failureCount += suite.numFailingTests || 0;
  });

  return failureCount;
}

/**
 * Get slowest tests
 */
function getSlowestTests(results, limit = 5) {
  if (!results || !results.testResults) {
    return [];
  }

  const slowTests = [];

  results.testResults.forEach((suite) => {
    const suiteName = path.relative(process.cwd(), suite.name);

    suite.assertionResults.forEach((test) => {
      if (test.duration && test.duration > 0) {
        slowTests.push({
          suite: suiteName,
          name: test.fullName,
          duration: test.duration,
        });
      }
    });
  });

  return slowTests
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit)
    .map((test) => ({
      suite: test.suite,
      name: test.name,
      duration: Math.round(test.duration),
    }));
}

/**
 * Build metrics object
 */
function buildMetrics(results, coverage, flakyReport) {
  const testMetrics = calculateTestMetrics(results);
  const coverageMetrics = calculateCoverageMetrics(coverage);
  const breakdown = calculateTestSuiteBreakdown(results);
  const flakyCount = detectFlakyTestsFromRun(results, flakyReport);
  const recentFailures = countRecentFailures(results);
  const slowestTests = getSlowestTests(results);

  return {
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString('en-US'),
    tests: testMetrics,
    coverage: coverageMetrics,
    breakdown,
    flaky: flakyCount,
    recentFailures,
    slowestTests,
    environment: {
      node: process.version,
      platform: process.platform,
      ci: process.env.CI === 'true',
    },
  };
}

/**
 * Load existing metrics history
 */
function loadMetricsHistory(historyFile) {
  if (!fs.existsSync(historyFile)) {
    return [];
  }

  try {
    const content = fs.readFileSync(historyFile, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    print(`⚠️  Warning: Could not load metrics history: ${error.message}`, 'yellow');
    return [];
  }
}

/**
 * Save metrics history
 */
function saveMetricsHistory(historyFile, history) {
  try {
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    return true;
  } catch (error) {
    print(`❌ Error: Could not save metrics history: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Append metrics to history
 */
function appendMetricsToHistory(historyFile, metrics) {
  let history = loadMetricsHistory(historyFile);

  // Add new metrics
  history.push(metrics);

  // Keep only last 90 days of data
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  history = history.filter((entry) => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= ninetyDaysAgo;
  });

  return saveMetricsHistory(historyFile, history);
}

/**
 * Print metrics summary
 */
function printMetricsSummary(metrics) {
  print('\n═══════════════════════════════════════════', 'cyan');
  print('       Test Metrics Collection', 'bright');
  print('═══════════════════════════════════════════', 'cyan');

  console.log('');
  console.log(`  Timestamp:       ${metrics.timestamp}`);
  console.log('');

  console.log('  📊 Test Metrics:');
  console.log(`     Total:        ${metrics.tests.total}`);
  console.log(`     Passed:       ${colors.green}${metrics.tests.passed}${colors.reset}`);
  console.log(
    `     Failed:       ${metrics.tests.failed > 0 ? colors.red : ''}${metrics.tests.failed}${colors.reset}`
  );
  console.log(`     Pending:      ${metrics.tests.pending}`);
  console.log(
    `     Pass Rate:    ${metrics.tests.passRate >= 75 ? colors.green : colors.yellow}${metrics.tests.passRate}%${colors.reset}`
  );
  console.log(`     Duration:     ${metrics.tests.duration}ms`);
  console.log('');

  console.log('  📈 Coverage:');
  console.log(`     Statements:   ${metrics.coverage.statements}%`);
  console.log(`     Branches:     ${metrics.coverage.branches}%`);
  console.log(`     Functions:    ${metrics.coverage.functions}%`);
  console.log(`     Lines:        ${metrics.coverage.lines}%`);
  console.log('');

  console.log('  🧪 Test Breakdown:');
  console.log(`     Unit:         ${metrics.breakdown.unit}`);
  console.log(`     Integration:  ${metrics.breakdown.integration}`);
  console.log(`     E2E:          ${metrics.breakdown.e2e}`);
  console.log('');

  if (metrics.flaky > 0) {
    console.log(`  ⚠️  Flaky Tests:  ${colors.yellow}${metrics.flaky}${colors.reset}`);
    console.log('');
  }

  if (metrics.recentFailures > 0) {
    console.log(`  ❌ Recent Failures: ${colors.red}${metrics.recentFailures}${colors.reset}`);
    console.log('');
  }

  if (metrics.slowestTests.length > 0) {
    console.log('  ⏱️  Slowest Tests:');
    metrics.slowestTests.forEach((test, idx) => {
      console.log(`     ${idx + 1}. ${test.duration}ms - ${test.name.substring(0, 50)}`);
    });
    console.log('');
  }

  print('═══════════════════════════════════════════\n', 'cyan');
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);
  const resultsFile = args[0] || '/tmp/test-results.json';
  const coverageFile = args[1] || path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  const historyFile = path.join(process.cwd(), 'test-metrics-history.json');

  print('\n📊 Collecting Test Metrics...', 'cyan');

  try {
    // Load data
    const results = loadTestResults(resultsFile);
    const coverage = loadCoverageData(coverageFile);
    const flakyReport = loadFlakyTestReport();

    // Build metrics
    const metrics = buildMetrics(results, coverage, flakyReport);

    // Print summary
    printMetricsSummary(metrics);

    // Append to history
    print(`💾 Saving metrics to history: ${historyFile}`, 'cyan');
    if (appendMetricsToHistory(historyFile, metrics)) {
      print(`✅ Metrics collected successfully`, 'green');

      // Show history count
      const history = loadMetricsHistory(historyFile);
      print(`   History contains ${history.length} entries`, 'cyan');
    } else {
      print(`❌ Failed to save metrics`, 'red');
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    print(`❌ Error: ${error.message}`, 'red');
    if (process.env.DEBUG) {
      console.error(error);
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
  calculateTestMetrics,
  calculateCoverageMetrics,
  calculateTestSuiteBreakdown,
  buildMetrics,
};
