#!/usr/bin/env node

/**
 * Flaky Test Detector
 *
 * This script runs the test suite multiple times to identify flaky tests
 * (tests that sometimes pass and sometimes fail with no code changes).
 *
 * Usage:
 *   node scripts/detect-flaky-tests.js [iterations] [pattern]
 *
 * Arguments:
 *   iterations: Number of times to run tests (default: 3)
 *   pattern: Test file pattern to run (default: all tests)
 *
 * Examples:
 *   npm run test:detect-flaky
 *   node scripts/detect-flaky-tests.js 5
 *   node scripts/detect-flaky-tests.js 3 "api/**"
 *
 * Exit codes:
 *   0: No flaky tests detected
 *   1: Flaky tests detected or error occurred
 */

const { execSync } = require('child_process');
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
 * Run Jest tests and capture results
 */
function runTests(iteration, pattern = '') {
  const outputFile = `/tmp/flaky-test-results-${iteration}.json`;

  try {
    print(`\n🧪 Running test iteration ${iteration}...`, 'cyan');

    const testCommand = pattern
      ? `npm test -- ${pattern} --json --outputFile=${outputFile}`
      : `npm test -- --json --outputFile=${outputFile}`;

    // Run tests, capturing exit code but not failing on test failures
    try {
      execSync(testCommand, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
    } catch (error) {
      // Test failures are expected, we'll analyze them from the JSON
      if (!fs.existsSync(outputFile)) {
        throw error; // Only fail if we didn't get results
      }
    }

    // Read results
    const results = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    return results;
  } catch (error) {
    print(`❌ Error running tests: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Extract test results by test name
 */
function extractTestResults(jestResults) {
  const testMap = new Map();

  if (!jestResults.testResults) {
    return testMap;
  }

  jestResults.testResults.forEach((suite) => {
    const suiteName = path.relative(process.cwd(), suite.name);

    suite.assertionResults.forEach((test) => {
      const testKey = `${suiteName}::${test.fullName}`;

      testMap.set(testKey, {
        suite: suiteName,
        name: test.fullName,
        status: test.status,
        duration: test.duration || 0,
      });
    });
  });

  return testMap;
}

/**
 * Compare test results across iterations to find flaky tests
 */
function findFlakyTests(allResults) {
  const testStatusMap = new Map();

  // Collect all statuses for each test
  allResults.forEach((results, iteration) => {
    const tests = extractTestResults(results);

    tests.forEach((test, testKey) => {
      if (!testStatusMap.has(testKey)) {
        testStatusMap.set(testKey, {
          suite: test.suite,
          name: test.name,
          statuses: [],
          durations: [],
        });
      }

      const testData = testStatusMap.get(testKey);
      testData.statuses.push(test.status);
      testData.durations.push(test.duration);
    });
  });

  // Identify flaky tests (tests with inconsistent results)
  const flakyTests = [];

  testStatusMap.forEach((testData, testKey) => {
    const statuses = testData.statuses;
    const uniqueStatuses = [...new Set(statuses)];

    // A test is flaky if it has multiple different statuses
    if (uniqueStatuses.length > 1) {
      const passCount = statuses.filter((s) => s === 'passed').length;
      const failCount = statuses.filter((s) => s === 'failed').length;

      flakyTests.push({
        key: testKey,
        suite: testData.suite,
        name: testData.name,
        totalRuns: statuses.length,
        passCount,
        failCount,
        passRate: (passCount / statuses.length) * 100,
        avgDuration: testData.durations.reduce((a, b) => a + b, 0) / testData.durations.length,
        statuses: statuses,
      });
    }
  });

  return flakyTests;
}

/**
 * Print flaky test report
 */
function printFlakyTestReport(flakyTests, iterations) {
  print('\n═══════════════════════════════════════════', 'magenta');
  print('       Flaky Test Detection Report', 'bright');
  print('═══════════════════════════════════════════', 'magenta');

  console.log('');
  console.log(`  Total Iterations:  ${iterations}`);
  console.log(`  Flaky Tests Found: ${flakyTests.length}`);
  console.log('');

  if (flakyTests.length === 0) {
    print('  ✅ No flaky tests detected!', 'green');
    print('═══════════════════════════════════════════\n', 'magenta');
    return;
  }

  // Sort by pass rate (most flaky first)
  flakyTests.sort((a, b) => Math.abs(50 - a.passRate) - Math.abs(50 - b.passRate));

  print('  ⚠️  Flaky Tests (inconsistent results):', 'yellow');
  print('─────────────────────────────────────────\n', 'yellow');

  flakyTests.forEach((test, index) => {
    const reliability = test.passRate >= 75 ? 'yellow' : 'red';

    console.log(`${index + 1}. ${colors.bright}${test.suite}${colors.reset}`);
    console.log(`   ${test.name}`);
    console.log(
      `   ${colors[reliability]}Pass Rate: ${test.passRate.toFixed(1)}% (${test.passCount}/${test.totalRuns})${colors.reset}`
    );
    console.log(`   Average Duration: ${test.avgDuration.toFixed(0)}ms`);
    console.log(`   Results: ${test.statuses.map((s) => (s === 'passed' ? '✓' : '✗')).join(' ')}`);
    console.log('');
  });

  print('═══════════════════════════════════════════\n', 'magenta');
}

/**
 * Print recommendations for fixing flaky tests
 */
function printRecommendations(flakyTests) {
  if (flakyTests.length === 0) return;

  print('💡 Recommendations:', 'cyan');
  print('─────────────────────────────────────────\n', 'cyan');

  console.log('Common causes of flaky tests:');
  console.log('  1. Race conditions in async code');
  console.log('  2. Missing await/Promise.resolve()');
  console.log('  3. Shared mutable state between tests');
  console.log('  4. Timing-dependent assertions');
  console.log('  5. External dependencies (network, file system)');
  console.log('  6. Insufficient test cleanup');
  console.log('');

  console.log('To fix flaky tests:');
  console.log('  1. Review test for async/await patterns');
  console.log('  2. Add proper test isolation (beforeEach/afterEach)');
  console.log('  3. Use waitFor/findBy queries in React tests');
  console.log('  4. Mock external dependencies completely');
  console.log('  5. Increase test timeouts if needed');
  console.log('  6. Consider using jest.retryTimes() as temporary measure');
  console.log('');

  // Show most problematic tests
  const mostFlaky = flakyTests.filter((t) => t.passRate >= 25 && t.passRate <= 75);
  if (mostFlaky.length > 0) {
    print('⚠️  Most Problematic Tests (50% pass rate):', 'red');
    mostFlaky.slice(0, 5).forEach((test) => {
      console.log(`  • ${test.suite}`);
      console.log(`    ${test.name}`);
    });
    console.log('');
  }
}

/**
 * Save flaky test report to file
 */
function saveFlakyTestReport(flakyTests, iterations) {
  const reportPath = path.join(process.cwd(), 'flaky-tests-report.json');

  const report = {
    timestamp: new Date().toISOString(),
    iterations,
    totalFlakyTests: flakyTests.length,
    flakyTests: flakyTests.map((test) => ({
      suite: test.suite,
      name: test.name,
      passRate: test.passRate,
      totalRuns: test.totalRuns,
      passCount: test.passCount,
      failCount: test.failCount,
      avgDuration: test.avgDuration,
    })),
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  print(`\n💾 Report saved to: ${reportPath}`, 'cyan');
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const iterations = args[0] ? parseInt(args[0], 10) : 3;
  const pattern = args[1] || '';

  // Validate iterations
  if (isNaN(iterations) || iterations < 2 || iterations > 10) {
    print('❌ Error: Iterations must be between 2 and 10', 'red');
    process.exit(1);
  }

  print('\n🔍 Starting Flaky Test Detection', 'bright');
  print(`   Running ${iterations} iterations to detect inconsistent tests\n`, 'cyan');

  const allResults = [];

  try {
    // Run tests multiple times
    for (let i = 1; i <= iterations; i++) {
      const results = runTests(i, pattern);
      allResults.push(results);

      // Small delay between iterations to avoid resource contention
      if (i < iterations) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Analyze results
    print('\n📊 Analyzing results...', 'cyan');
    const flakyTests = findFlakyTests(allResults);

    // Print report
    printFlakyTestReport(flakyTests, iterations);
    printRecommendations(flakyTests);

    // Save report
    saveFlakyTestReport(flakyTests, iterations);

    // Exit with appropriate code
    if (flakyTests.length > 0) {
      print(`\n❌ FAIL: Found ${flakyTests.length} flaky test(s)`, 'red');
      process.exit(1);
    } else {
      print('\n✅ PASS: No flaky tests detected', 'green');
      process.exit(0);
    }
  } catch (error) {
    print(`\n❌ Error: ${error.message}`, 'red');
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
  extractTestResults,
  findFlakyTests,
};
