#!/usr/bin/env node

/**
 * Test Health Report Generator
 *
 * This script generates a comprehensive test health report including:
 * - Pass rate metrics
 * - Coverage metrics
 * - Slowest tests
 * - Recently failed tests
 * - Flaky tests (if detected)
 *
 * Usage:
 *   node scripts/generate-test-report.js [results-file] [output-file]
 *
 * Arguments:
 *   results-file: Path to Jest JSON results file (default: /tmp/test-results.json)
 *   output-file: Path to save markdown report (default: TEST_HEALTH_DASHBOARD.md)
 *
 * Examples:
 *   npm run test:report
 *   node scripts/generate-test-report.js
 *   node scripts/generate-test-report.js /tmp/test-results.json reports/health.md
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
 * Load test results from JSON file
 */
function loadTestResults(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load test results: ${error.message}`);
  }
}

/**
 * Load coverage data
 */
function loadCoverageData() {
  const coverageSummaryPath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

  if (!fs.existsSync(coverageSummaryPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(coverageSummaryPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    print(`⚠️  Warning: Could not load coverage data: ${error.message}`, 'yellow');
    return null;
  }
}

/**
 * Load flaky test report if available
 */
function loadFlakyTestReport() {
  const flakyReportPath = path.join(process.cwd(), 'flaky-tests-report.json');

  if (!fs.existsSync(flakyReportPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(flakyReportPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Calculate test metrics
 */
function calculateMetrics(results) {
  const { numTotalTests, numPassedTests, numFailedTests, numPendingTests } = results;
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
 * Get slowest tests
 */
function getSlowestTests(results, limit = 10) {
  const slowTests = [];

  if (!results.testResults) {
    return slowTests;
  }

  results.testResults.forEach((suite) => {
    const suiteName = path.relative(process.cwd(), suite.name);

    suite.assertionResults.forEach((test) => {
      if (test.duration && test.duration > 0) {
        slowTests.push({
          suite: suiteName,
          name: test.fullName,
          duration: test.duration,
          status: test.status,
        });
      }
    });
  });

  return slowTests.sort((a, b) => b.duration - a.duration).slice(0, limit);
}

/**
 * Get failed tests
 */
function getFailedTests(results) {
  const failedTests = [];

  if (!results.testResults) {
    return failedTests;
  }

  results.testResults.forEach((suite) => {
    const suiteName = path.relative(process.cwd(), suite.name);

    suite.assertionResults
      .filter((test) => test.status === 'failed')
      .forEach((test) => {
        failedTests.push({
          suite: suiteName,
          name: test.fullName,
          failureMessages: test.failureMessages || [],
        });
      });
  });

  return failedTests;
}

/**
 * Get test suite summary
 */
function getTestSuiteSummary(results) {
  if (!results.testResults) {
    return [];
  }

  return results.testResults
    .map((suite) => ({
      name: path.relative(process.cwd(), suite.name),
      total: suite.numTotalTests,
      passed: suite.numPassingTests,
      failed: suite.numFailingTests,
      pending: suite.numPendingTests,
      duration: suite.perfStats?.runtime || 0,
    }))
    .sort((a, b) => b.failed - a.failed || b.duration - a.duration);
}

/**
 * Get health status emoji
 */
function getHealthStatus(passRate) {
  if (passRate >= 90) return '🟢';
  if (passRate >= 75) return '🟡';
  if (passRate >= 50) return '🟠';
  return '🔴';
}

/**
 * Format duration in milliseconds to human-readable
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(results, coverage, flakyReport) {
  const metrics = calculateMetrics(results);
  const slowTests = getSlowestTests(results, 15);
  const failedTests = getFailedTests(results);
  const suiteSummary = getTestSuiteSummary(results);

  const timestamp = new Date().toISOString();
  const healthStatus = getHealthStatus(metrics.passRate);

  let markdown = `# Test Health Dashboard ${healthStatus}\n\n`;
  markdown += `**Last Updated:** ${new Date(timestamp).toLocaleString()}\n\n`;
  markdown += `**Status:** ${healthStatus} ${metrics.passRate >= 75 ? 'HEALTHY' : metrics.passRate >= 50 ? 'NEEDS ATTENTION' : 'CRITICAL'}\n\n`;
  markdown += `---\n\n`;

  // Overall Metrics
  markdown += `## 📊 Overall Metrics\n\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| **Total Tests** | ${metrics.total} |\n`;
  markdown += `| **Passed** | ${metrics.passed} ✅ |\n`;
  markdown += `| **Failed** | ${metrics.failed} ❌ |\n`;
  markdown += `| **Pending/Skipped** | ${metrics.pending} ⏭️ |\n`;
  markdown += `| **Pass Rate** | ${metrics.passRate.toFixed(2)}% |\n\n`;

  // Coverage Metrics
  if (coverage && coverage.total) {
    markdown += `## 📈 Coverage Metrics\n\n`;
    markdown += `| Category | Coverage |\n`;
    markdown += `|----------|----------|\n`;
    markdown += `| **Statements** | ${coverage.total.statements.pct.toFixed(2)}% |\n`;
    markdown += `| **Branches** | ${coverage.total.branches.pct.toFixed(2)}% |\n`;
    markdown += `| **Functions** | ${coverage.total.functions.pct.toFixed(2)}% |\n`;
    markdown += `| **Lines** | ${coverage.total.lines.pct.toFixed(2)}% |\n\n`;
  }

  // Test Suite Performance
  if (suiteSummary.length > 0) {
    markdown += `## 🏃 Test Suite Performance\n\n`;
    markdown += `**Total Test Suites:** ${suiteSummary.length}\n\n`;

    const failingSuites = suiteSummary.filter((s) => s.failed > 0);
    if (failingSuites.length > 0) {
      markdown += `### ❌ Failing Test Suites (${failingSuites.length})\n\n`;
      markdown += `| Suite | Passed | Failed | Total | Duration |\n`;
      markdown += `|-------|--------|--------|-------|---------|\n`;

      failingSuites.slice(0, 10).forEach((suite) => {
        markdown += `| ${suite.name} | ${suite.passed} | **${suite.failed}** | ${suite.total} | ${formatDuration(suite.duration)} |\n`;
      });

      if (failingSuites.length > 10) {
        markdown += `\n*... and ${failingSuites.length - 10} more failing suites*\n`;
      }
      markdown += `\n`;
    }
  }

  // Slowest Tests
  if (slowTests.length > 0) {
    markdown += `## ⏱️ Slowest Tests (Top 15)\n\n`;
    markdown += `Tests taking longer than 1 second may need optimization:\n\n`;
    markdown += `| Duration | Test | Status |\n`;
    markdown += `|----------|------|--------|\n`;

    slowTests.forEach((test) => {
      const statusIcon = test.status === 'passed' ? '✅' : '❌';
      markdown += `| ${formatDuration(test.duration)} | ${test.suite}<br/>${test.name} | ${statusIcon} |\n`;
    });
    markdown += `\n`;
  }

  // Failed Tests Detail
  if (failedTests.length > 0) {
    markdown += `## ❌ Failed Tests (${failedTests.length})\n\n`;

    failedTests.slice(0, 20).forEach((test, index) => {
      markdown += `### ${index + 1}. ${test.name}\n\n`;
      markdown += `**Suite:** \`${test.suite}\`\n\n`;

      if (test.failureMessages && test.failureMessages.length > 0) {
        markdown += `**Error:**\n\`\`\`\n`;
        // Limit error message length
        const errorMsg = test.failureMessages[0].substring(0, 500);
        markdown += errorMsg;
        if (test.failureMessages[0].length > 500) {
          markdown += `\n... (truncated)`;
        }
        markdown += `\n\`\`\`\n\n`;
      }
    });

    if (failedTests.length > 20) {
      markdown += `*... and ${failedTests.length - 20} more failed tests*\n\n`;
    }
  }

  // Flaky Tests
  if (flakyReport && flakyReport.totalFlakyTests > 0) {
    markdown += `## ⚠️ Flaky Tests (${flakyReport.totalFlakyTests})\n\n`;
    markdown += `Tests that show inconsistent results across ${flakyReport.iterations} iterations:\n\n`;
    markdown += `| Test | Pass Rate | Results |\n`;
    markdown += `|------|-----------|----------|\n`;

    flakyReport.flakyTests.slice(0, 10).forEach((test) => {
      markdown += `| ${test.suite}<br/>${test.name} | ${test.passRate.toFixed(1)}% (${test.passCount}/${test.totalRuns}) | ${test.passCount}✓ ${test.failCount}✗ |\n`;
    });

    if (flakyReport.totalFlakyTests > 10) {
      markdown += `\n*... and ${flakyReport.totalFlakyTests - 10} more flaky tests*\n`;
    }
    markdown += `\n`;
  }

  // Recommendations
  markdown += `## 💡 Recommendations\n\n`;

  if (metrics.passRate < 75) {
    markdown += `- 🔴 **Critical:** Pass rate is below 75% target. Focus on fixing failing tests.\n`;
  }

  if (failedTests.length > 50) {
    markdown += `- ⚠️ **High Priority:** ${failedTests.length} failing tests. Review test infrastructure.\n`;
  }

  if (slowTests.filter((t) => t.duration > 5000).length > 0) {
    markdown += `- ⏱️ **Performance:** ${slowTests.filter((t) => t.duration > 5000).length} tests taking >5 seconds. Consider optimization.\n`;
  }

  if (flakyReport && flakyReport.totalFlakyTests > 0) {
    markdown += `- ⚠️ **Stability:** ${flakyReport.totalFlakyTests} flaky tests detected. These need investigation.\n`;
  }

  if (coverage && coverage.total && coverage.total.lines.pct < 50) {
    markdown += `- 📊 **Coverage:** Line coverage is ${coverage.total.lines.pct.toFixed(1)}%. Target is 50%+.\n`;
  }

  markdown += `\n---\n\n`;
  markdown += `*Report generated automatically by test health monitoring system*\n`;

  return markdown;
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);
  const resultsFile = args[0] || '/tmp/test-results.json';
  const outputFile = args[1] || path.join(process.cwd(), 'TEST_HEALTH_DASHBOARD.md');

  try {
    print('\n📊 Generating Test Health Report...', 'cyan');

    // Load data
    if (!fs.existsSync(resultsFile)) {
      print(`❌ Error: Test results file not found: ${resultsFile}`, 'red');
      print('   Run tests with --json --outputFile flag first', 'yellow');
      process.exit(1);
    }

    const results = loadTestResults(resultsFile);
    const coverage = loadCoverageData();
    const flakyReport = loadFlakyTestReport();

    // Generate report
    const markdown = generateMarkdownReport(results, coverage, flakyReport);

    // Save report
    fs.writeFileSync(outputFile, markdown);

    print(`✅ Report generated: ${outputFile}`, 'green');

    // Print summary
    const metrics = calculateMetrics(results);
    const healthStatus = getHealthStatus(metrics.passRate);

    print(`\n${healthStatus} Test Suite Health: ${metrics.passRate.toFixed(1)}% pass rate`, 'cyan');
    print(`   ${metrics.passed} passed, ${metrics.failed} failed, ${metrics.pending} pending\n`, 'cyan');

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
  calculateMetrics,
  generateMarkdownReport,
};
