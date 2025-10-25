#!/usr/bin/env tsx

/**
 * Test Performance Monitor
 *
 * This script analyzes test execution times to identify slow tests
 * and track performance trends over time.
 *
 * Usage:
 *   npm run test:perf [threshold]
 *   tsx scripts/test-performance.ts [threshold]
 *
 * Arguments:
 *   threshold: Milliseconds threshold for slow tests (default: 5000ms)
 *
 * Examples:
 *   npm run test:perf
 *   npm run test:perf 3000
 *   tsx scripts/test-performance.ts 10000
 *
 * Exit codes:
 *   0: Analysis completed successfully
 *   1: Error occurred during analysis
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
} as const;

type ColorName = keyof typeof colors;

interface TestPerformance {
  suite: string;
  name: string;
  duration: number;
  status: string;
}

interface JestTestResult {
  fullName: string;
  status: string;
  duration?: number;
}

interface JestSuiteResult {
  name: string;
  assertionResults: JestTestResult[];
  perfStats?: {
    runtime: number;
    slow: boolean;
    start: number;
    end: number;
  };
}

interface JestResults {
  testResults?: JestSuiteResult[];
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
}

interface PerformanceReport {
  timestamp: string;
  threshold: number;
  totalTests: number;
  slowTests: number;
  fastestTest: {
    suite: string;
    name: string;
    duration: number;
  } | null;
  slowestTest: {
    suite: string;
    name: string;
    duration: number;
  } | null;
  avgDuration: number;
  medianDuration: number;
  p95Duration: number;
  p99Duration: number;
  slowTestList: Array<{
    suite: string;
    name: string;
    duration: number;
    threshold: number;
    exceedBy: number;
  }>;
  suitePerformance: Array<{
    suite: string;
    totalTests: number;
    totalDuration: number;
    avgDuration: number;
    slowTests: number;
  }>;
}

function print(message: string, color: ColorName = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Run tests and capture performance metrics
 */
function runTestsWithTiming(): JestResults {
  const outputFile = '/tmp/test-performance-results.json';

  try {
    print('\n🧪 Running tests to collect performance metrics...', 'cyan');

    const testCommand = `npm test -- --json --outputFile=${outputFile} --verbose`;

    // Run tests
    try {
      execSync(testCommand, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
    } catch (error) {
      // Test failures are OK, we just need timing data
      if (!fs.existsSync(outputFile)) {
        throw error;
      }
    }

    // Read results
    const results = JSON.parse(fs.readFileSync(outputFile, 'utf8')) as JestResults;
    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    print(`❌ Error running tests: ${errorMessage}`, 'red');
    throw error;
  }
}

/**
 * Extract performance data from test results
 */
function extractPerformanceData(results: JestResults): TestPerformance[] {
  const performanceData: TestPerformance[] = [];

  if (!results.testResults) {
    return performanceData;
  }

  results.testResults.forEach((suite) => {
    const suiteName = path.relative(process.cwd(), suite.name);

    suite.assertionResults.forEach((test) => {
      if (test.duration !== undefined && test.duration > 0) {
        performanceData.push({
          suite: suiteName,
          name: test.fullName,
          duration: test.duration,
          status: test.status,
        });
      }
    });
  });

  return performanceData;
}

/**
 * Calculate percentile
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Analyze performance data
 */
function analyzePerformance(
  performanceData: TestPerformance[],
  threshold: number
): {
  slowTests: TestPerformance[];
  stats: {
    avgDuration: number;
    medianDuration: number;
    p95Duration: number;
    p99Duration: number;
    fastest: TestPerformance | null;
    slowest: TestPerformance | null;
  };
  suiteStats: Map<
    string,
    {
      totalTests: number;
      totalDuration: number;
      avgDuration: number;
      slowTests: number;
    }
  >;
} {
  // Find slow tests
  const slowTests = performanceData.filter((test) => test.duration >= threshold);

  // Calculate statistics
  const durations = performanceData.map((test) => test.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const medianDuration = calculatePercentile(durations, 50);
  const p95Duration = calculatePercentile(durations, 95);
  const p99Duration = calculatePercentile(durations, 99);

  // Find fastest and slowest
  const sorted = [...performanceData].sort((a, b) => a.duration - b.duration);
  const fastest = sorted[0] || null;
  const slowest = sorted[sorted.length - 1] || null;

  // Calculate suite statistics
  const suiteStats = new Map<
    string,
    {
      totalTests: number;
      totalDuration: number;
      avgDuration: number;
      slowTests: number;
    }
  >();

  performanceData.forEach((test) => {
    if (!suiteStats.has(test.suite)) {
      suiteStats.set(test.suite, {
        totalTests: 0,
        totalDuration: 0,
        avgDuration: 0,
        slowTests: 0,
      });
    }

    const stats = suiteStats.get(test.suite)!;
    stats.totalTests++;
    stats.totalDuration += test.duration;
    if (test.duration >= threshold) {
      stats.slowTests++;
    }
  });

  // Calculate average duration for each suite
  suiteStats.forEach((stats) => {
    stats.avgDuration = stats.totalDuration / stats.totalTests;
  });

  return {
    slowTests,
    stats: {
      avgDuration,
      medianDuration,
      p95Duration,
      p99Duration,
      fastest,
      slowest,
    },
    suiteStats,
  };
}

/**
 * Print performance report
 */
function printPerformanceReport(
  performanceData: TestPerformance[],
  analysis: ReturnType<typeof analyzePerformance>,
  threshold: number
): void {
  print('\n═══════════════════════════════════════════', 'magenta');
  print('       Test Performance Report', 'bright');
  print('═══════════════════════════════════════════', 'magenta');

  console.log('');
  console.log(`  Total Tests Analyzed: ${performanceData.length}`);
  console.log(`  Slow Test Threshold:  ${threshold}ms`);
  console.log(`  Slow Tests Found:     ${analysis.slowTests.length}`);
  console.log('');

  // Overall statistics
  print('  📊 Performance Statistics:', 'cyan');
  console.log(`     Average Duration:  ${analysis.stats.avgDuration.toFixed(0)}ms`);
  console.log(`     Median Duration:   ${analysis.stats.medianDuration.toFixed(0)}ms`);
  console.log(`     95th Percentile:   ${analysis.stats.p95Duration.toFixed(0)}ms`);
  console.log(`     99th Percentile:   ${analysis.stats.p99Duration.toFixed(0)}ms`);
  console.log('');

  if (analysis.stats.fastest) {
    console.log(`     Fastest Test:      ${analysis.stats.fastest.duration.toFixed(0)}ms`);
  }
  if (analysis.stats.slowest) {
    const slowColor: ColorName = analysis.stats.slowest.duration >= threshold ? 'red' : 'yellow';
    console.log(
      `     Slowest Test:      ${colors[slowColor]}${analysis.stats.slowest.duration.toFixed(0)}ms${colors.reset}`
    );
  }
  console.log('');

  // Slow tests
  if (analysis.slowTests.length > 0) {
    print(`  ⚠️  Slow Tests (>= ${threshold}ms):`, 'yellow');
    print('─────────────────────────────────────────\n', 'yellow');

    // Sort by duration (slowest first)
    const sorted = [...analysis.slowTests].sort((a, b) => b.duration - a.duration);

    sorted.slice(0, 10).forEach((test, index) => {
      const exceedBy = test.duration - threshold;
      const exceedPercent = ((exceedBy / threshold) * 100).toFixed(0);

      console.log(
        `${index + 1}. ${colors.bright}${test.duration.toFixed(0)}ms${colors.reset} (+${exceedPercent}%)`
      );
      console.log(`   ${test.suite}`);
      console.log(`   ${test.name}`);
      console.log('');
    });

    if (sorted.length > 10) {
      console.log(`   ... and ${sorted.length - 10} more slow tests`);
      console.log('');
    }
  } else {
    print(`  ✅ No slow tests found (all tests < ${threshold}ms)`, 'green');
    console.log('');
  }

  // Suite performance
  print('  📁 Slowest Test Suites:', 'cyan');
  print('─────────────────────────────────────────\n', 'cyan');

  const sortedSuites = Array.from(analysis.suiteStats.entries())
    .sort((a, b) => b[1].totalDuration - a[1].totalDuration)
    .slice(0, 5);

  sortedSuites.forEach(([suite, stats], index) => {
    console.log(`${index + 1}. ${colors.bright}${suite}${colors.reset}`);
    console.log(`   Total Duration: ${stats.totalDuration.toFixed(0)}ms`);
    console.log(`   Tests: ${stats.totalTests} (${stats.slowTests} slow)`);
    console.log(`   Avg Duration: ${stats.avgDuration.toFixed(0)}ms`);
    console.log('');
  });

  print('═══════════════════════════════════════════\n', 'magenta');
}

/**
 * Print recommendations
 */
function printRecommendations(slowTestCount: number, threshold: number): void {
  if (slowTestCount === 0) return;

  print('💡 Recommendations:', 'cyan');
  print('─────────────────────────────────────────\n', 'cyan');

  console.log('Common causes of slow tests:');
  console.log('  1. Unnecessary setTimeout/delays');
  console.log('  2. Large data fixtures or mock data');
  console.log('  3. Complex DOM rendering in component tests');
  console.log('  4. Excessive mock setup/teardown');
  console.log('  5. Unoptimized database queries in integration tests');
  console.log('  6. Heavy computation in test setup');
  console.log('');

  console.log('To optimize slow tests:');
  console.log('  1. Use jest.useFakeTimers() for time-based tests');
  console.log('  2. Reduce fixture data to minimum needed');
  console.log('  3. Use shallow rendering when possible');
  console.log('  4. Cache expensive mock setups');
  console.log('  5. Consider splitting large test files');
  console.log('  6. Use test.concurrent for independent tests');
  console.log('  7. Profile tests with --detectLeaks flag');
  console.log('');

  print(`⚠️  Consider increasing threshold if ${threshold}ms is too strict`, 'yellow');
  console.log('');
}

/**
 * Save performance report
 */
function savePerformanceReport(
  performanceData: TestPerformance[],
  analysis: ReturnType<typeof analyzePerformance>,
  threshold: number
): void {
  const reportDir = path.join(process.cwd(), 'test-reports');
  const reportPath = path.join(reportDir, 'test-performance.json');

  // Ensure directory exists
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report: PerformanceReport = {
    timestamp: new Date().toISOString(),
    threshold,
    totalTests: performanceData.length,
    slowTests: analysis.slowTests.length,
    fastestTest: analysis.stats.fastest
      ? {
          suite: analysis.stats.fastest.suite,
          name: analysis.stats.fastest.name,
          duration: analysis.stats.fastest.duration,
        }
      : null,
    slowestTest: analysis.stats.slowest
      ? {
          suite: analysis.stats.slowest.suite,
          name: analysis.stats.slowest.name,
          duration: analysis.stats.slowest.duration,
        }
      : null,
    avgDuration: analysis.stats.avgDuration,
    medianDuration: analysis.stats.medianDuration,
    p95Duration: analysis.stats.p95Duration,
    p99Duration: analysis.stats.p99Duration,
    slowTestList: analysis.slowTests
      .sort((a, b) => b.duration - a.duration)
      .map((test) => ({
        suite: test.suite,
        name: test.name,
        duration: test.duration,
        threshold,
        exceedBy: test.duration - threshold,
      })),
    suitePerformance: Array.from(analysis.suiteStats.entries())
      .map(([suite, stats]) => ({
        suite,
        totalTests: stats.totalTests,
        totalDuration: stats.totalDuration,
        avgDuration: stats.avgDuration,
        slowTests: stats.slowTests,
      }))
      .sort((a, b) => b.totalDuration - a.totalDuration),
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  print(`\n💾 Report saved to: ${reportPath}`, 'cyan');
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const threshold = args[0] ? parseInt(args[0], 10) : 5000;

  // Validate threshold
  if (isNaN(threshold) || threshold <= 0) {
    print('❌ Error: Threshold must be a positive number', 'red');
    process.exit(1);
  }

  print('\n⏱️  Starting Test Performance Analysis', 'bright');
  print(`   Analyzing tests with ${threshold}ms slow threshold\n`, 'cyan');

  try {
    // Run tests and capture timing
    const results = runTestsWithTiming();

    // Extract performance data
    print('\n📊 Analyzing test performance...', 'cyan');
    const performanceData = extractPerformanceData(results);

    if (performanceData.length === 0) {
      print('\n⚠️  No test timing data available', 'yellow');
      print('   Make sure tests are running with --verbose flag', 'yellow');
      process.exit(1);
    }

    // Analyze performance
    const analysis = analyzePerformance(performanceData, threshold);

    // Print report
    printPerformanceReport(performanceData, analysis, threshold);
    printRecommendations(analysis.slowTests.length, threshold);

    // Save report
    savePerformanceReport(performanceData, analysis, threshold);

    // Summary
    if (analysis.slowTests.length > 0) {
      print(
        `\n⚠️  Found ${analysis.slowTests.length} slow test(s) exceeding ${threshold}ms`,
        'yellow'
      );
    } else {
      print(`\n✅ All tests are fast (< ${threshold}ms)`, 'green');
    }

    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    print(`\n❌ Error: ${errorMessage}`, 'red');
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run if executed directly
main();
