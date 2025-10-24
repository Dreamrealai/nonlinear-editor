# Axiom Alert Configurations

This document defines all production alerts for the Non-Linear Editor platform. Alerts are categorized by severity and configured with appropriate thresholds to minimize false positives while ensuring timely detection of issues.

## Alert Severity Levels

- **Critical (P0):** Immediate action required, page on-call engineer
- **High (P1):** Urgent issue, notify team immediately
- **Medium (P2):** Important but not urgent, notify during business hours
- **Low (P3):** Informational, log for review

## Alert Categories

1. [Onboarding Alerts](#onboarding-alerts)
2. [Performance Alerts](#performance-alerts)
3. [Error & Reliability Alerts](#error--reliability-alerts)
4. [Security Alerts](#security-alerts)
5. [Business Metrics Alerts](#business-metrics-alerts)
6. [Infrastructure Alerts](#infrastructure-alerts)

---

## Onboarding Alerts

### Alert #1: High Onboarding Drop-off

**Severity:** Medium (P2)
**Purpose:** Detect when onboarding completion rate drops significantly
**Impact:** Reduced user activation and retention

#### Trigger Conditions
- Onboarding completion rate < 60% over 24 hours
- OR completion rate drops > 15% compared to previous 7-day average

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(24h)
| where ['event'] == 'onboarding_started' or ['event'] == 'onboarding_completed'
| summarize starts=countif(['event']=='onboarding_started'),
            completions=countif(['event']=='onboarding_completed')
| extend completion_rate = completions * 100.0 / starts
| where completion_rate < 60 or starts < 10
```

#### Action Items
1. Review recent code deployments
2. Check for errors in onboarding flow
3. Analyze drop-off points in funnel
4. Review user feedback
5. Consider A/B test rollback if applicable

#### Notification Channels
- Slack: #product-alerts
- Email: product-team@company.com

---

### Alert #2: Onboarding Step Failure

**Severity:** High (P1)
**Purpose:** Detect when a specific onboarding step is failing
**Impact:** Users cannot complete onboarding

#### Trigger Conditions
- Any onboarding step has < 40% completion rate over 6 hours
- OR error rate > 10% for any step

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(6h)
| where ['event'] == 'onboarding_step_started' or ['event'] == 'onboarding_step_completed' or ['event'] == 'onboarding_step_failed'
| summarize starts=countif(['event']=='onboarding_step_started'),
            completions=countif(['event']=='onboarding_step_completed'),
            failures=countif(['event']=='onboarding_step_failed')
            by ['step']
| extend completion_rate = completions * 100.0 / starts,
         error_rate = failures * 100.0 / starts
| where completion_rate < 40 or error_rate > 10
```

#### Action Items
1. Immediately investigate failing step
2. Check for backend errors
3. Review recent deployments
4. Consider emergency rollback
5. Notify engineering team

#### Notification Channels
- PagerDuty: On-call engineer
- Slack: #incidents (mention @engineering)
- Email: engineering-team@company.com

---

## Performance Alerts

### Alert #3: Performance Degradation

**Severity:** Critical (P0)
**Purpose:** Detect severe performance issues affecting user experience
**Impact:** Poor UX, potential user churn

#### Trigger Conditions
- Timeline render p95 > 3000ms over 1 hour
- OR Asset search p95 > 1000ms over 30 minutes
- OR API endpoint p95 > 5000ms over 15 minutes

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(1h)
| where ['metric'] in ('timeline_render', 'asset_search_latency')
       or ['type'] == 'api_request'
| summarize p95=percentile(['duration'], 95) by ['metric']
| where p95 > 3000
```

#### Action Items
1. Page on-call engineer immediately
2. Check system resource utilization
3. Review database query performance
4. Identify slow queries or endpoints
5. Scale infrastructure if needed
6. Rollback recent deployments if necessary

#### Notification Channels
- PagerDuty: Page on-call engineer
- Slack: #incidents (mention @here)
- SMS: Engineering leads

#### Auto-remediation
- Trigger auto-scaling if available
- Restart degraded services
- Enable caching layers

---

### Alert #4: Web Vitals Degradation

**Severity:** Medium (P2)
**Purpose:** Detect Core Web Vitals falling below acceptable thresholds
**Impact:** SEO ranking, user experience

#### Trigger Conditions
- LCP (Largest Contentful Paint) p75 > 2500ms for 2 hours
- FID (First Input Delay) p75 > 100ms for 2 hours
- CLS (Cumulative Layout Shift) p75 > 0.1 for 2 hours

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(2h)
| where ['type'] == 'web_vital'
| summarize p75=percentile(['value'], 75) by ['metric']
| extend threshold_exceeded = case(
    ['metric'] == 'LCP' and p75 > 2500, true,
    ['metric'] == 'FID' and p75 > 100, true,
    ['metric'] == 'CLS' and p75 > 0.1, true,
    false
  )
| where threshold_exceeded == true
```

#### Action Items
1. Identify which pages are affected
2. Review recent frontend changes
3. Analyze resource loading patterns
4. Optimize images and assets
5. Review third-party scripts

#### Notification Channels
- Slack: #frontend-team
- Email: frontend-team@company.com

---

### Alert #5: Slow Database Queries

**Severity:** High (P1)
**Purpose:** Detect database performance issues
**Impact:** API slowdowns, user experience degradation

#### Trigger Conditions
- More than 10 queries taking > 1000ms in 15 minutes
- OR p95 query time > 2000ms over 30 minutes

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(15m)
| where ['type'] == 'database_query'
| where ['duration'] > 1000
| summarize slow_queries=count(),
            p95=percentile(['duration'], 95)
            by ['operation'], ['table']
| where slow_queries > 10 or p95 > 2000
```

#### Action Items
1. Identify slow queries
2. Check for missing indexes
3. Review query execution plans
4. Check database connection pool
5. Consider query optimization
6. Scale database if needed

#### Notification Channels
- Slack: #backend-team
- PagerDuty: On-call engineer (if p95 > 5000ms)

---

## Error & Reliability Alerts

### Alert #6: Error Spike

**Severity:** Critical (P0)
**Purpose:** Detect sudden increase in error rates
**Impact:** Service disruption, user frustration

#### Trigger Conditions
- Error rate > 5% over 15 minutes
- OR > 100 errors affecting > 10 unique users in 5 minutes

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(15m)
| summarize errors=countif(['level']=='error'),
            total=count(),
            affected_users=dcountif(['userId'], ['level']=='error')
| extend error_rate = errors * 100.0 / total
| where error_rate > 5 or (errors > 100 and affected_users > 10)
```

#### Action Items
1. Create incident in PagerDuty
2. Identify error source
3. Check recent deployments
4. Review error logs for patterns
5. Rollback if necessary
6. Post incident update to status page

#### Notification Channels
- PagerDuty: Page on-call engineer
- Slack: #incidents (mention @here)
- Status page: Automatic incident creation

#### Auto-remediation
- Automatic rollback if error rate > 10%
- Circuit breaker activation

---

### Alert #7: Auto-backup Failing

**Severity:** High (P1)
**Purpose:** Detect when auto-save/backup system is failing
**Impact:** Data loss risk

#### Trigger Conditions
- Backup failure rate > 5% over 1 hour
- OR > 50 consecutive failures

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(1h)
| where ['event'] startswith 'auto_save_'
| summarize successes=countif(['event']=='auto_save_completed'),
            failures=countif(['event']=='auto_save_failed')
| extend failure_rate = failures * 100.0 / (successes + failures)
| where failure_rate > 5 or failures > 50
```

#### Action Items
1. Notify engineering team immediately
2. Check storage system health
3. Review database connection status
4. Check API rate limits
5. Verify authentication tokens
6. Manual backup if necessary

#### Notification Channels
- Slack: #engineering (mention @engineering-leads)
- Email: engineering-team@company.com
- PagerDuty: On-call engineer (if failure rate > 20%)

---

### Alert #8: API Error Rate by Endpoint

**Severity:** Medium (P2)
**Purpose:** Detect endpoint-specific issues
**Impact:** Feature degradation

#### Trigger Conditions
- Any endpoint has > 10% error rate over 30 minutes
- Minimum 20 requests to avoid false positives

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(30m)
| where ['type'] == 'api_request'
| summarize errors=countif(['status'] >= 400),
            total=count()
            by ['endpoint'], ['method']
| extend error_rate = errors * 100.0 / total
| where error_rate > 10 and total > 20
```

#### Action Items
1. Identify affected endpoint
2. Review endpoint logs
3. Check for dependency failures
4. Verify database connectivity
5. Review recent API changes

#### Notification Channels
- Slack: #backend-team

---

## Security Alerts

### Alert #9: Brute Force Attack Detection

**Severity:** High (P1)
**Purpose:** Detect potential brute force login attempts
**Impact:** Security breach risk

#### Trigger Conditions
- > 10 failed login attempts from same IP in 5 minutes
- OR > 20 failed login attempts for same email in 15 minutes

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(15m)
| where ['event'] == 'login_failed'
| summarize attempts_by_ip=count() by ['ip'], ['email']
| where attempts_by_ip > 10
```

#### Action Items
1. Temporarily block offending IP addresses
2. Notify security team
3. Check for account compromise
4. Review authentication logs
5. Consider enabling CAPTCHA
6. Alert affected users

#### Notification Channels
- PagerDuty: Security team
- Slack: #security-alerts
- Email: security-team@company.com

#### Auto-remediation
- Automatic IP blocking after 15 failed attempts
- Rate limit enforcement
- CAPTCHA activation

---

### Alert #10: Suspicious Data Access

**Severity:** High (P1)
**Purpose:** Detect unusual data access patterns
**Impact:** Potential data breach

#### Trigger Conditions
- Mass data export (> 1000 records) by single user
- Data access from unusual location/IP
- Multiple failed authorization attempts

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(1h)
| where ['event'] in ('mass_export', 'bulk_delete', 'unauthorized_access_attempt')
| summarize suspicious_events=count(),
            records_affected=sum(['recordCount'])
            by ['userId'], ['ip']
| where suspicious_events > 3 or records_affected > 1000
```

#### Action Items
1. Alert security team immediately
2. Investigate user account
3. Check for compromised credentials
4. Review access logs
5. Consider temporary account suspension
6. Contact user if legitimate

#### Notification Channels
- PagerDuty: Security team (immediate)
- Slack: #security-incidents (mention @security-leads)
- Email: security-team@company.com

---

### Alert #11: Rate Limit Abuse

**Severity:** Medium (P2)
**Purpose:** Detect API abuse or DoS attempts
**Impact:** Service degradation, increased costs

#### Trigger Conditions
- > 100 rate limit hits (429 status) from same IP in 10 minutes
- OR > 500 rate limit hits total in 10 minutes

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(10m)
| where ['status'] == 429
| summarize hits=count(),
            unique_ips=dcount(['ip'])
            by ['ip']
| where hits > 100
```

#### Action Items
1. Identify abusive IP addresses
2. Review rate limit configuration
3. Consider IP blocking
4. Check for DDoS attack
5. Review API key usage
6. Contact user if legitimate high usage

#### Notification Channels
- Slack: #infrastructure
- Email: ops-team@company.com

---

## Business Metrics Alerts

### Alert #12: Feature Adoption Low

**Severity:** Low (P3)
**Purpose:** Track adoption of newly launched features
**Impact:** Product development insights

#### Trigger Conditions
- New feature usage < 10% of active users after 7 days
- Feature engagement declining > 20% week-over-week

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'feature_first_use'
| summarize users_adopted=dcount(['userId']) by ['featureName']
| join kind=inner (
    ['logs']
    | where ['_time'] > ago(7d)
    | where ['event'] == 'session_started'
    | summarize total_users=dcount(['userId'])
  ) on $left.featureName == $right.featureName
| extend adoption_rate = users_adopted * 100.0 / total_users
| where adoption_rate < 10
```

#### Action Items
1. Notify product team
2. Review feature discoverability
3. Analyze user feedback
4. Consider UX improvements
5. Evaluate feature value proposition
6. Plan user education/onboarding

#### Notification Channels
- Slack: #product-team
- Email: Weekly product metrics report

---

### Alert #13: Conversion Rate Drop

**Severity:** Medium (P2)
**Purpose:** Detect drops in free-to-paid conversion
**Impact:** Revenue impact

#### Trigger Conditions
- Conversion rate drops > 25% compared to 30-day average
- Minimum 100 signups in period to avoid noise

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'user_signed_up' or ['event'] == 'subscription_started'
| summarize signups=dcountif(['userId'], ['event']=='user_signed_up'),
            conversions=dcountif(['userId'], ['event']=='subscription_started')
| extend conversion_rate = conversions * 100.0 / signups
| where signups > 100 and conversion_rate < 5  // Adjust threshold based on baseline
```

#### Action Items
1. Notify product and sales teams
2. Review pricing page changes
3. Analyze conversion funnel
4. Check for payment issues
5. Review competitor activity
6. Examine user feedback

#### Notification Channels
- Slack: #revenue-ops
- Email: product-team@company.com, sales-team@company.com

---

### Alert #14: Churn Risk Increase

**Severity:** Medium (P2)
**Purpose:** Detect increase in users at risk of churning
**Impact:** Customer retention

#### Trigger Conditions
- > 20% of active users showing churn signals
- High-value users (> 10 projects) inactive for 7+ days

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(30d)
| where ['event'] == 'session_started'
| summarize last_session=max(['_time']),
            project_count=max(['projectCount'])
            by ['userId']
| extend days_inactive = (now() - last_session) / 1d
| where days_inactive > 7 and project_count > 10
| summarize at_risk_users=count()
```

#### Action Items
1. Notify customer success team
2. Trigger re-engagement campaigns
3. Analyze reasons for inactivity
4. Review product changes that might affect retention
5. Consider personalized outreach

#### Notification Channels
- Slack: #customer-success
- Email: Weekly retention report

---

## Infrastructure Alerts

### Alert #15: Health Check Failures

**Severity:** Critical (P0)
**Purpose:** Detect service availability issues
**Impact:** Complete service outage

#### Trigger Conditions
- Health check endpoint returns 503 status
- Health check response time > 5000ms
- Health check fails 3 consecutive times

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(5m)
| where ['endpoint'] == '/api/health/detailed'
| where ['status'] == 503 or ['duration'] > 5000
| summarize failures=count()
| where failures >= 3
```

#### Action Items
1. Page on-call engineer immediately
2. Check all service dependencies
3. Verify database connectivity
4. Check Supabase status
5. Review infrastructure metrics
6. Initiate incident response

#### Notification Channels
- PagerDuty: Page on-call engineer (P0)
- Slack: #incidents (mention @here)
- Status page: Automatic update

#### Auto-remediation
- Automatic service restart
- Failover to backup instances
- Scale up resources

---

### Alert #16: Memory/CPU Threshold

**Severity:** High (P1)
**Purpose:** Detect resource exhaustion
**Impact:** Performance degradation, potential crashes

#### Trigger Conditions
- CPU usage > 80% for 10 minutes
- Memory usage > 85% for 10 minutes
- Disk usage > 90%

#### Axiom Query
```apl
['logs']
| where ['_time'] > ago(10m)
| where ['type'] == 'system_metrics'
| summarize avg_cpu=avg(['cpuUsage']),
            avg_memory=avg(['memoryUsage']),
            max_disk=max(['diskUsage'])
| where avg_cpu > 80 or avg_memory > 85 or max_disk > 90
```

#### Action Items
1. Notify infrastructure team
2. Check for resource leaks
3. Review application logs
4. Scale up infrastructure
5. Identify resource-intensive processes
6. Consider horizontal scaling

#### Notification Channels
- PagerDuty: On-call SRE
- Slack: #infrastructure
- Email: ops-team@company.com

#### Auto-remediation
- Automatic horizontal scaling
- Memory cleanup routines
- Kill runaway processes

---

## Alert Configuration Guide

### Setting Up Alerts in Axiom

1. **Navigate to Monitors:**
   - Log into Axiom
   - Go to **Monitors** section
   - Click **Create Monitor**

2. **Configure Query:**
   - Paste the APL query from above
   - Set appropriate time window
   - Test query to verify results

3. **Set Thresholds:**
   - Define trigger conditions
   - Set comparison operators (>, <, ==)
   - Specify threshold values

4. **Configure Actions:**
   - Add notification channels
   - Set notification frequency (immediate, 5min, 15min)
   - Configure escalation policies

5. **Test Alert:**
   - Use test mode to verify
   - Check notification delivery
   - Verify message content

### Alert Best Practices

1. **Avoid Alert Fatigue:**
   - Set appropriate thresholds
   - Use noise reduction techniques
   - Consolidate similar alerts
   - Regular threshold review

2. **Actionable Alerts:**
   - Include context in messages
   - Provide investigation steps
   - Link to relevant dashboards
   - Document resolution procedures

3. **Escalation Policies:**
   - P0: Immediate page
   - P1: Notify within 5 minutes
   - P2: Notify during business hours
   - P3: Daily digest

4. **Alert Maintenance:**
   - Review weekly for false positives
   - Adjust thresholds based on data
   - Archive unused alerts
   - Document all changes

### Notification Channel Setup

**Slack Integration:**
```
- #incidents: P0, P1 alerts
- #engineering: P1, P2 technical alerts
- #product-team: Product metric alerts
- #security-alerts: Security-related alerts
```

**PagerDuty Integration:**
```
- P0: Immediate page, 2-minute timeout
- P1: Page after 5 minutes, escalate if unacknowledged
- P2: Create incident, no page
```

**Email:**
```
- engineering-team@company.com: All technical alerts
- product-team@company.com: Product metrics
- security-team@company.com: Security alerts
```

---

## Alert Response Runbooks

Each alert should have a corresponding runbook in `/docs/monitoring/INCIDENT_RESPONSE.md` with:

- Investigation steps
- Common causes
- Resolution procedures
- Escalation criteria
- Post-incident review template

---

**Last Updated:** 2025-10-24
**Maintained By:** Engineering & SRE Teams
**Review Frequency:** Monthly
