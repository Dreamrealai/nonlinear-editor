#!/usr/bin/env node

/**
 * Test Health Dashboard Generator
 *
 * This script generates an HTML dashboard showing test health metrics and trends.
 *
 * Usage:
 *   node scripts/generate-dashboard.js [history-file] [output-file]
 *
 * Arguments:
 *   history-file: Path to metrics history JSON (default: test-metrics-history.json)
 *   output-file: Path to save HTML dashboard (default: test-health-dashboard.html)
 *
 * Examples:
 *   npm run test:dashboard
 *   node scripts/generate-dashboard.js
 *   node scripts/generate-dashboard.js test-metrics-history.json dashboard.html
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
 * Load metrics history
 */
function loadMetricsHistory(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Metrics history file not found: ${filePath}`);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load metrics history: ${error.message}`);
  }
}

/**
 * Get latest metrics
 */
function getLatestMetrics(history) {
  if (history.length === 0) {
    return null;
  }
  return history[history.length - 1];
}

/**
 * Get metrics for last N days
 */
function getRecentMetrics(history, days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return history.filter((entry) => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= cutoffDate;
  });
}

/**
 * Calculate health status
 */
function calculateHealthStatus(latest) {
  if (!latest) return 'unknown';

  const passRate = latest.tests.passRate;
  if (passRate >= 90) return 'excellent';
  if (passRate >= 75) return 'good';
  if (passRate >= 50) return 'warning';
  return 'critical';
}

/**
 * Get status emoji and color
 */
function getStatusInfo(status) {
  const statusMap = {
    excellent: { emoji: '🟢', color: '#10b981', label: 'Excellent' },
    good: { emoji: '🟡', color: '#f59e0b', label: 'Good' },
    warning: { emoji: '🟠', color: '#f97316', label: 'Needs Attention' },
    critical: { emoji: '🔴', color: '#ef4444', label: 'Critical' },
    unknown: { emoji: '⚪', color: '#6b7280', label: 'Unknown' },
  };
  return statusMap[status] || statusMap.unknown;
}

/**
 * Generate chart data for pass rate trend
 */
function generatePassRateTrendData(history) {
  const last30Days = getRecentMetrics(history, 30);

  return {
    labels: last30Days.map((entry) => new Date(entry.timestamp).toLocaleDateString()),
    passRate: last30Days.map((entry) => entry.tests.passRate),
    total: last30Days.map((entry) => entry.tests.total),
    failed: last30Days.map((entry) => entry.tests.failed),
  };
}

/**
 * Generate chart data for coverage trend
 */
function generateCoverageTrendData(history) {
  const last30Days = getRecentMetrics(history, 30);

  return {
    labels: last30Days.map((entry) => new Date(entry.timestamp).toLocaleDateString()),
    statements: last30Days.map((entry) => entry.coverage.statements),
    branches: last30Days.map((entry) => entry.coverage.branches),
    functions: last30Days.map((entry) => entry.coverage.functions),
    lines: last30Days.map((entry) => entry.coverage.lines),
  };
}

/**
 * Generate chart data for test breakdown
 */
function generateTestBreakdownData(latest) {
  if (!latest) return null;

  return {
    labels: ['Unit', 'Integration', 'E2E'],
    data: [latest.breakdown.unit, latest.breakdown.integration, latest.breakdown.e2e],
  };
}

/**
 * Generate HTML dashboard
 */
function generateDashboard(history) {
  const latest = getLatestMetrics(history);
  const status = calculateHealthStatus(latest);
  const statusInfo = getStatusInfo(status);
  const passRateTrend = generatePassRateTrendData(history);
  const coverageTrend = generateCoverageTrendData(history);
  const breakdownData = generateTestBreakdownData(latest);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Health Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #1f2937;
      padding: 2rem;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      color: #111827;
    }

    .header .status {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1rem;
    }

    .header .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 1.25rem;
      font-weight: 600;
      background: ${statusInfo.color}20;
      color: ${statusInfo.color};
      border: 2px solid ${statusInfo.color};
    }

    .header .timestamp {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
    }

    .metric-card .metric-label {
      color: #6b7280;
      font-size: 0.875rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .metric-card .metric-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: #111827;
    }

    .metric-card .metric-subtext {
      color: #9ca3af;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .metric-card.excellent .metric-value { color: #10b981; }
    .metric-card.good .metric-value { color: #f59e0b; }
    .metric-card.warning .metric-value { color: #f97316; }
    .metric-card.critical .metric-value { color: #ef4444; }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .chart-card {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .chart-card h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: #111827;
    }

    .chart-container {
      position: relative;
      height: 300px;
    }

    .failures-section {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .failures-section h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: #111827;
    }

    .failures-list {
      list-style: none;
    }

    .failures-list li {
      padding: 0.75rem;
      border-left: 3px solid #ef4444;
      background: #fef2f2;
      margin-bottom: 0.5rem;
      border-radius: 0.25rem;
    }

    .failures-list .suite {
      font-weight: 600;
      color: #991b1b;
    }

    .failures-list .test-name {
      color: #6b7280;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .slowest-tests {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .slowest-tests h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: #111827;
    }

    .slowest-tests table {
      width: 100%;
      border-collapse: collapse;
    }

    .slowest-tests th {
      text-align: left;
      padding: 0.75rem;
      background: #f3f4f6;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }

    .slowest-tests td {
      padding: 0.75rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .slowest-tests tr:last-child td {
      border-bottom: none;
    }

    .duration {
      font-weight: 600;
      color: #f59e0b;
    }

    .footer {
      text-align: center;
      color: white;
      margin-top: 2rem;
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }

      .header h1 {
        font-size: 1.75rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusInfo.emoji} Test Health Dashboard</h1>
      <div class="status">
        <span class="status-badge">
          ${statusInfo.emoji} ${statusInfo.label}
        </span>
      </div>
      <div class="timestamp">
        Last updated: ${latest ? new Date(latest.timestamp).toLocaleString() : 'N/A'}
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card ${status}">
        <div class="metric-label">Pass Rate</div>
        <div class="metric-value">${latest ? latest.tests.passRate.toFixed(1) : 0}%</div>
        <div class="metric-subtext">${latest ? latest.tests.passed : 0} / ${latest ? latest.tests.total : 0} tests</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Coverage</div>
        <div class="metric-value">${latest ? latest.coverage.lines.toFixed(1) : 0}%</div>
        <div class="metric-subtext">Line coverage</div>
      </div>

      <div class="metric-card ${latest && latest.tests.failed > 0 ? 'critical' : ''}">
        <div class="metric-label">Failed Tests</div>
        <div class="metric-value">${latest ? latest.tests.failed : 0}</div>
        <div class="metric-subtext">${latest && latest.tests.failed > 0 ? 'Needs attention' : 'All passing'}</div>
      </div>

      <div class="metric-card ${latest && latest.flaky > 0 ? 'warning' : ''}">
        <div class="metric-label">Flaky Tests</div>
        <div class="metric-value">${latest ? latest.flaky : 0}</div>
        <div class="metric-subtext">${latest && latest.flaky > 0 ? 'Unstable tests detected' : 'No flaky tests'}</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Test Duration</div>
        <div class="metric-value">${latest ? (latest.tests.duration / 1000).toFixed(1) : 0}s</div>
        <div class="metric-subtext">Total execution time</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Total Tests</div>
        <div class="metric-value">${latest ? latest.tests.total : 0}</div>
        <div class="metric-subtext">${latest ? latest.breakdown.unit : 0} unit, ${latest ? latest.breakdown.integration : 0} integration</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h2>📊 Pass Rate Trend (Last 30 Days)</h2>
        <div class="chart-container">
          <canvas id="passRateChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <h2>📈 Coverage Trend (Last 30 Days)</h2>
        <div class="chart-container">
          <canvas id="coverageChart"></canvas>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h2>🧪 Test Suite Breakdown</h2>
        <div class="chart-container">
          <canvas id="breakdownChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <h2>📉 Failed Tests Trend (Last 30 Days)</h2>
        <div class="chart-container">
          <canvas id="failedTestsChart"></canvas>
        </div>
      </div>
    </div>

    ${
      latest && latest.slowestTests && latest.slowestTests.length > 0
        ? `
    <div class="slowest-tests">
      <h2>⏱️ Slowest Tests</h2>
      <table>
        <thead>
          <tr>
            <th>Duration</th>
            <th>Test</th>
            <th>Suite</th>
          </tr>
        </thead>
        <tbody>
          ${latest.slowestTests
            .map(
              (test) => `
            <tr>
              <td class="duration">${test.duration}ms</td>
              <td>${test.name}</td>
              <td>${test.suite}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <div class="footer">
      Test Health Dashboard | Generated ${new Date().toLocaleString()} |
      ${history.length} data points collected
    </div>
  </div>

  <script>
    // Pass Rate Trend Chart
    new Chart(document.getElementById('passRateChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(passRateTrend.labels)},
        datasets: [{
          label: 'Pass Rate (%)',
          data: ${JSON.stringify(passRateTrend.passRate)},
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) { return value + '%'; }
            }
          }
        }
      }
    });

    // Coverage Trend Chart
    new Chart(document.getElementById('coverageChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(coverageTrend.labels)},
        datasets: [
          {
            label: 'Lines',
            data: ${JSON.stringify(coverageTrend.lines)},
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4
          },
          {
            label: 'Statements',
            data: ${JSON.stringify(coverageTrend.statements)},
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4
          },
          {
            label: 'Branches',
            data: ${JSON.stringify(coverageTrend.branches)},
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2,
            tension: 0.4
          },
          {
            label: 'Functions',
            data: ${JSON.stringify(coverageTrend.functions)},
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) { return value + '%'; }
            }
          }
        }
      }
    });

    // Test Breakdown Chart
    new Chart(document.getElementById('breakdownChart'), {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(breakdownData ? breakdownData.labels : [])},
        datasets: [{
          data: ${JSON.stringify(breakdownData ? breakdownData.data : [])},
          backgroundColor: [
            '#3b82f6',
            '#8b5cf6',
            '#f59e0b'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          }
        }
      }
    });

    // Failed Tests Trend Chart
    new Chart(document.getElementById('failedTestsChart'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(passRateTrend.labels)},
        datasets: [{
          label: 'Failed Tests',
          data: ${JSON.stringify(passRateTrend.failed)},
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  </script>
</body>
</html>`;

  return html;
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);
  const historyFile = args[0] || path.join(process.cwd(), 'test-metrics-history.json');
  const outputFile = args[1] || path.join(process.cwd(), 'test-health-dashboard.html');

  print('\n📊 Generating Test Health Dashboard...', 'cyan');

  try {
    // Load metrics history
    print(`📂 Loading metrics history: ${historyFile}`, 'cyan');
    const history = loadMetricsHistory(historyFile);

    if (history.length === 0) {
      print(
        '⚠️  Warning: No metrics history found. Run tests and collect metrics first.',
        'yellow'
      );
      print('   Use: npm run test:collect', 'cyan');
      process.exit(1);
    }

    print(`   Found ${history.length} data points`, 'green');

    // Generate dashboard
    print('\n🎨 Generating dashboard HTML...', 'cyan');
    const html = generateDashboard(history);

    // Save dashboard
    fs.writeFileSync(outputFile, html);
    print(`✅ Dashboard generated: ${outputFile}`, 'green');

    // Print summary
    const latest = getLatestMetrics(history);
    const status = calculateHealthStatus(latest);
    const statusInfo = getStatusInfo(status);

    print(`\n${statusInfo.emoji} Current Status: ${statusInfo.label}`, 'bright');
    print(`   Pass Rate: ${latest.tests.passRate.toFixed(1)}%`, 'cyan');
    print(`   Coverage: ${latest.coverage.lines.toFixed(1)}%`, 'cyan');
    print(`   Failed Tests: ${latest.tests.failed}`, latest.tests.failed > 0 ? 'red' : 'green');
    print('');
    print(`💡 Open ${outputFile} in your browser to view the dashboard`, 'cyan');
    print('');

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
  loadMetricsHistory,
  getLatestMetrics,
  calculateHealthStatus,
  generateDashboard,
};
