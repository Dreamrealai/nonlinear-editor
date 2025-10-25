# Axiom Monitoring Setup Guide

This guide explains how to set up comprehensive monitoring and alerting using Axiom for the video editor application.

## Prerequisites

- Axiom account (sign up at https://axiom.co)
- Axiom dataset already configured (see LOGGING.md)
- Slack/PagerDuty integration credentials (optional)

## Quick Start

1. Load monitor definitions:

   ```bash
   # The monitor configurations are in axiom-monitors.json
   cat axiom-monitors.json
   ```

2. Create monitors in Axiom dashboard using the APL queries provided

3. Set up notification channels (Slack, Email, PagerDuty)

4. Create dashboards for real-time visibility

## Monitor Configurations

### 1. High Error Rate Alert

**Purpose:** Catch sudden spikes in application errors

**Query:**

```apl
['logs']
| where ['level'] == 'error'
| summarize error_count=count() by bin(_time, 5m)
| extend total_errors = sum(error_count)
| where total_errors > 10
```

**Threshold:** More than 10 errors in 5 minutes

**Severity:** High

**Action:** Check recent deployments, database connectivity, external API status

---

### 2. API Latency P95 Alert

**Purpose:** Detect performance degradation

**Query:**

```apl
['logs']
| where ['request'] != null
| extend duration = todouble(['response.duration'])
| summarize p95=percentile(duration, 95) by bin(_time, 5m)
| where p95 > 3000
```

**Threshold:** P95 > 3 seconds

**Severity:** Medium

**Action:** Check database queries, external API latency, server resources

---

### 3. Failed Authentication Attempts

**Purpose:** Detect potential security threats

**Query:**

```apl
['logs']
| where ['message'] contains 'authentication failed' or ['message'] contains 'invalid credentials'
| summarize failed_attempts=count() by bin(_time, 10m)
| where failed_attempts > 50
```

**Threshold:** More than 50 failed attempts in 10 minutes

**Severity:** High

**Action:** Check for brute force attacks, verify rate limiting

---

### 4. AI Generation Service Failures

**Purpose:** Monitor external AI service health

**Query:**

```apl
['logs']
| where ['service'] in ('gemini', 'fal-ai', 'elevenlabs', 'suno') and ['status'] == 'failed'
| summarize failures=count() by ['service'], bin(_time, 15m)
| where failures > 5
```

**Threshold:** More than 5 failures per service in 15 minutes

**Severity:** Medium

**Action:** Check service status pages, API keys, rate limits

---

### 5. Database Connection Errors

**Purpose:** Critical database connectivity issues

**Query:**

```apl
['logs']
| where ['category'] == 'DATABASE' and ['level'] == 'error'
| summarize db_errors=count() by bin(_time, 5m)
| where db_errors > 3
```

**Threshold:** More than 3 errors in 5 minutes

**Severity:** Critical

**Action:** Check Supabase dashboard, connection pool, network

---

## Setting Up Monitors in Axiom

### Step 1: Navigate to Monitors

1. Log in to Axiom: https://app.axiom.co
2. Select your dataset
3. Click "Monitors" in the left sidebar
4. Click "Create Monitor"

### Step 2: Configure Monitor

1. **Name:** Enter monitor name (e.g., "High Error Rate Alert")
2. **Description:** Add description
3. **APL Query:** Paste the query from axiom-monitors.json
4. **Interval:** Set check frequency (e.g., 5m)
5. **Threshold:** Configure when to trigger alert

### Step 3: Add Notifications

1. Click "Add Notification"
2. Choose channel type:
   - **Email:** Enter recipient addresses
   - **Slack:** Configure webhook URL
   - **PagerDuty:** Enter integration key
   - **Webhook:** Custom webhook endpoint

### Step 4: Test Monitor

1. Click "Test Query" to verify APL syntax
2. Click "Test Notification" to verify channel
3. Save monitor

## Notification Channel Setup

### Slack Integration

1. Create incoming webhook in Slack:
   - Go to Slack workspace settings
   - Navigate to "Incoming Webhooks"
   - Click "Add New Webhook to Workspace"
   - Select channel (e.g., #alerts)
   - Copy webhook URL

2. Add to Axiom:
   - In monitor notification settings
   - Select "Slack"
   - Paste webhook URL
   - Customize message format

### Email Notifications

1. In Axiom monitor settings:
   - Select "Email"
   - Add recipient addresses
   - Configure email template
   - Set sending frequency

### PagerDuty Integration

1. Create integration in PagerDuty:
   - Go to Services → Service Directory
   - Select service or create new
   - Add integration → Axiom
   - Copy integration key

2. Configure in Axiom:
   - Select "PagerDuty"
   - Paste integration key
   - Map severity levels

## Dashboard Setup

### Creating Dashboards

1. Navigate to "Dashboards" in Axiom
2. Click "Create Dashboard"
3. Name dashboard (e.g., "API Performance Overview")

### Adding Widgets

For each widget in `axiom-monitors.json`:

1. Click "Add Widget"
2. Select visualization type:
   - **Timeseries:** Line charts over time
   - **Bar:** Comparison charts
   - **Pie:** Distribution charts
   - **Table:** Tabular data

3. Paste APL query
4. Configure display options:
   - Title
   - Refresh interval
   - Time range
   - Colors

### Example Dashboard Widgets

#### Request Rate

```apl
['logs']
| where ['request'] != null
| summarize requests=count() by bin(_time, 1m)
```

#### Error Rate

```apl
['logs']
| where ['level'] == 'error'
| summarize errors=count() by bin(_time, 1m)
```

#### Latency Percentiles

```apl
['logs']
| where ['response.duration'] != null
| extend duration = todouble(['response.duration'])
| summarize
    p50=percentile(duration, 50),
    p95=percentile(duration, 95),
    p99=percentile(duration, 99)
  by bin(_time, 5m)
```

## Testing Monitors

### Generate Test Events

1. **Trigger error alert:**

   ```bash
   # Make multiple failing API calls
   for i in {1..15}; do
     curl -X POST http://localhost:3000/api/test/error
   done
   ```

2. **Trigger latency alert:**

   ```bash
   # Make slow requests
   curl http://localhost:3000/api/test/slow?delay=5000
   ```

3. **Trigger auth failure alert:**
   ```bash
   # Multiple failed logins
   for i in {1..60}; do
     curl -X POST http://localhost:3000/auth/signin \
       -d '{"email":"fake@example.com","password":"wrong"}'
   done
   ```

### Verify Alerts

1. Check Axiom monitor status
2. Verify notifications received:
   - Check email inbox
   - Check Slack #alerts channel
   - Check PagerDuty incidents

## Best Practices

### Monitor Thresholds

- Start conservative (higher thresholds)
- Adjust based on historical data
- Review false positive rate weekly
- Use percentage-based thresholds when possible

### Alert Fatigue Prevention

1. **Group related alerts:** Combine similar monitors
2. **Use severity levels:** Not everything is critical
3. **Implement alert suppression:** During maintenance windows
4. **Add context:** Include runbook links in alerts

### Runbook Development

For each monitor, document:

1. What the alert means
2. Potential root causes
3. Investigation steps
4. Resolution procedures
5. Escalation path

Example runbook structure:

```markdown
## High Error Rate Alert

### What it means

Application is experiencing elevated error rates

### Potential causes

- Recent deployment introduced bugs
- Database connectivity issues
- External service failures
- DDoS attack

### Investigation

1. Check recent deployments: `git log -10`
2. Review error logs: Query Axiom for error details
3. Check Supabase status
4. Verify external API status

### Resolution

- Rollback deployment if needed
- Scale database connections
- Contact external service support
- Enable rate limiting

### Escalation

If unresolved in 30 minutes:

- Page on-call engineer
- Create incident in PagerDuty
- Notify stakeholders
```

## Advanced Monitoring

### Composite Monitors

Combine multiple conditions:

```apl
// Alert if high error rate AND slow responses
let errors = ['logs']
  | where ['level'] == 'error'
  | summarize error_count=count() by bin(_time, 5m);

let slow_requests = ['logs']
  | where ['response.duration'] > 3000
  | summarize slow_count=count() by bin(_time, 5m);

errors
| join slow_requests on _time
| where error_count > 10 and slow_count > 20
```

### Anomaly Detection

Use statistical anomaly detection:

```apl
['logs']
| where ['request'] != null
| summarize request_count=count() by bin(_time, 5m)
| extend
    avg_requests = avg(request_count) over (rows between 12 preceding and current row),
    std_requests = stdev(request_count) over (rows between 12 preceding and current row)
| extend zscore = (request_count - avg_requests) / std_requests
| where abs(zscore) > 3  // More than 3 standard deviations
```

### SLO Monitoring

Track Service Level Objectives:

```apl
// 99.9% uptime SLO
['logs']
| where ['request'] != null
| summarize
    total_requests = count(),
    successful_requests = countif(['response.status'] < 500)
  by bin(_time, 1h)
| extend uptime_pct = (successful_requests * 100.0) / total_requests
| where uptime_pct < 99.9
```

## Troubleshooting

### Monitor Not Triggering

1. Verify APL query syntax
2. Check time range in query
3. Confirm threshold values
4. Review data ingestion (are logs arriving?)

### False Positives

1. Analyze historical data
2. Adjust thresholds
3. Add filters to exclude known noise
4. Consider time-of-day variations

### Missing Notifications

1. Test notification channel
2. Verify webhook URLs
3. Check spam/junk folders (email)
4. Review Axiom notification logs

## Maintenance

### Regular Tasks

- **Weekly:** Review alert frequency and accuracy
- **Monthly:** Update thresholds based on traffic patterns
- **Quarterly:** Review and update runbooks
- **Yearly:** Audit all monitors and remove obsolete ones

### Alerting Metrics

Track your monitoring system health:

```apl
['axiom_monitors']
| summarize
    total_alerts = count(),
    false_positives = countif(['acknowledged_as'] == 'false_positive'),
    time_to_acknowledge = avg(['acknowledged_at'] - ['triggered_at'])
  by ['monitor_name'], bin(_time, 1d)
```

## Resources

- [Axiom Documentation](https://axiom.co/docs)
- [APL Query Language](https://axiom.co/docs/apl/introduction)
- [Monitor Setup Guide](https://axiom.co/docs/monitor-data/monitors)
- [Dashboard Creation](https://axiom.co/docs/dashboards/overview)
- [Notification Channels](https://axiom.co/docs/monitor-data/notifiers)

## Support

For issues or questions:

- Axiom Support: support@axiom.co
- Axiom Community: https://axiom.co/discord
- Documentation: https://axiom.co/docs
