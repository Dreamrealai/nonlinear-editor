#!/usr/bin/env node

/**
 * Test Pass Rate Checker
 *
 * This script checks that the test suite pass rate meets a minimum threshold.
 * It's used in CI/CD to prevent merging changes that degrade test quality.
 *
 * Usage:
 *   node scripts/check-pass-rate.js [threshold] [results-file]
 *
 * Arguments:
 *   threshold: Minimum pass rate percentage (default: 75)
 *   results-file: Path to Jest JSON results file (default: looks for most recent)
 *
 * Examples:
 *   npm run test:check-pass-rate
 *   node scripts/check-pass-rate.js 80
 *   node scripts/check-pass-rate.js 75 /tmp/test-results.json
 *
 * Exit codes:
 *   0: Pass rate meets or exceeds threshold
 *   1: Pass rate below threshold or error occurred
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

/**
 * Format a number as a percentage with 2 decimal places
 */
function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

/**
 * Print colored output to console
 */
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Find the most recent test results file
 */
function findRecentTestResults() {
  const possiblePaths = [
    '/tmp/test-results.json',
    path.join(process.cwd(), 'test-results.json'),
    path.join(process.cwd(), 'coverage', 'test-results.json'),
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

/**
 * Load and parse test results from JSON file
 */
function loadTestResults(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load test results from ${filePath}: ${error.message}`);
  }
}

/**
 * Calculate test metrics from Jest results
 */
function calculateMetrics(results) {
  const { numTotalTests, numPassedTests, numFailedTests, numPendingTests } = results;

  // Calculate pass rate (excluding pending/skipped tests)
  const activeTests = numTotalTests - numPendingTests;
  const passRate = activeTests > 0 ? (numPassedTests / activeTests) * 100 : 0;

  return {
    total: numTotalTests,
    passed: numPassedTests,
    failed: numFailedTests,
    pending: numPendingTests,
    active: activeTests,
    passRate,
  };
}

/**
 * Print test metrics summary
 */
function printMetrics(metrics) {
  print('\n═══════════════════════════════════════════', 'cyan');
  print('         Test Pass Rate Report', 'bright');
  print('═══════════════════════════════════════════', 'cyan');

  console.log('');
  console.log(`  Total Tests:     ${metrics.total}`);
  console.log(`  Passed:          ${colors.green}${metrics.passed}${colors.reset}`);
  console.log(
    `  Failed:          ${metrics.failed > 0 ? colors.red : ''}${metrics.failed}${colors.reset}`
  );
  console.log(`  Pending/Skipped: ${colors.yellow}${metrics.pending}${colors.reset}`);
  console.log(`  Active Tests:    ${metrics.active}`);
  console.log('');

  const passRateColor =
    metrics.passRate >= 75 ? 'green' : metrics.passRate >= 50 ? 'yellow' : 'red';
  print(`  Pass Rate: ${formatPercent(metrics.passRate)}`, passRateColor);

  print('═══════════════════════════════════════════\n', 'cyan');
}

/**
 * Check if pass rate meets threshold
 */
function checkPassRate(metrics, threshold) {
  const { passRate } = metrics;

  if (passRate >= threshold) {
    print(
      `✅ PASS: Test pass rate ${formatPercent(passRate)} meets threshold ${formatPercent(threshold)}`,
      'green'
    );
    return true;
  } else {
    const deficit = threshold - passRate;
    print(
      `❌ FAIL: Test pass rate ${formatPercent(passRate)} is below threshold ${formatPercent(threshold)}`,
      'red'
    );
    print(`         Deficit: ${formatPercent(deficit)}`, 'red');
    print(
      `         Need ${Math.ceil((threshold / 100) * metrics.active - metrics.passed)} more tests to pass`,
      'yellow'
    );
    return false;
  }
}

/**
 * Print test suite summary by status
 */
function printTestSuiteSummary(results) {
  if (!results.testResults || results.testResults.length === 0) {
    return;
  }

  const failedSuites = results.testResults.filter((suite) => suite.numFailingTests > 0);

  if (failedSuites.length === 0) {
    return;
  }

  print('\n📋 Failed Test Suites:', 'yellow');
  print('─────────────────────────────────────────\n', 'yellow');

  failedSuites
    .sort((a, b) => b.numFailingTests - a.numFailingTests)
    .slice(0, 10) // Show top 10 worst suites
    .forEach((suite) => {
      const relativePath = path.relative(process.cwd(), suite.name);
      console.log(`  ${colors.red}✗${colors.reset} ${relativePath}`);
      console.log(`    ${suite.numFailingTests} failed, ${suite.numPassingTests} passed`);
      console.log('');
    });

  if (failedSuites.length > 10) {
    print(`  ... and ${failedSuites.length - 10} more suites with failures\n`, 'yellow');
  }
}

/**
 * Main execution function
 */
function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const threshold = args[0] ? parseFloat(args[0]) : 75;
  const resultsFile = args[1] || findRecentTestResults();

  // Validate threshold
  if (isNaN(threshold) || threshold < 0 || threshold > 100) {
    print('❌ Error: Threshold must be a number between 0 and 100', 'red');
    process.exit(1);
  }

  // Find and validate results file
  if (!resultsFile) {
    print('❌ Error: No test results file found', 'red');
    print('   Run tests with --json --outputFile flag first:', 'yellow');
    print('   npm test -- --json --outputFile=/tmp/test-results.json', 'cyan');
    process.exit(1);
  }

  if (!fs.existsSync(resultsFile)) {
    print(`❌ Error: Test results file not found: ${resultsFile}`, 'red');
    process.exit(1);
  }

  try {
    // Load and process test results
    print(`\n📊 Loading test results from: ${resultsFile}`, 'cyan');
    const results = loadTestResults(resultsFile);
    const metrics = calculateMetrics(results);

    // Print metrics
    printMetrics(metrics);

    // Print failed suites if any
    printTestSuiteSummary(results);

    // Check threshold
    const passed = checkPassRate(metrics, threshold);

    // Exit with appropriate code
    process.exit(passed ? 0 : 1);
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
  calculateMetrics,
  checkPassRate,
  loadTestResults,
};
