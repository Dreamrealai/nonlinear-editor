# Axiom Query Library

This document contains a comprehensive collection of Axiom Processing Language (APL) queries for monitoring the Non-Linear Editor platform. These queries are optimized for performance and provide actionable insights.

## Table of Contents

1. [Onboarding Queries](#onboarding-queries)
2. [Feature Usage Queries](#feature-usage-queries)
3. [Performance Queries](#performance-queries)
4. [Error Tracking Queries](#error-tracking-queries)
5. [User Engagement Queries](#user-engagement-queries)
6. [API Monitoring Queries](#api-monitoring-queries)
7. [Security & Compliance Queries](#security--compliance-queries)
8. [Business Metrics Queries](#business-metrics-queries)

---

## Onboarding Queries

### Onboarding Completion Rate

Track overall onboarding success rate over time.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['event'] == 'onboarding_started' or ['event'] == 'onboarding_completed'
| summarize starts=countif(['event']=='onboarding_started'),
            completions=countif(['event']=='onboarding_completed')
            by bin(['_time'], 1h)
| extend completion_rate = completions * 100.0 / starts
| project ['_time'], starts, completions, completion_rate
| order by ['_time'] desc
```

### Onboarding Funnel Analysis

Detailed step-by-step funnel showing drop-off at each stage.

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['event'] startswith 'onboarding_step_'
| extend step_order = case(
    ['step'] == 'welcome', 1,
    ['step'] == 'tutorial_intro', 2,
    ['step'] == 'timeline_interaction', 3,
    ['step'] == 'asset_upload', 4,
    ['step'] == 'project_creation', 5,
    0
  )
| summarize users=dcount(['userId']) by ['step'], step_order
| order by step_order asc
| extend prev_users = prev(users, 1)
| extend drop_off = (prev_users - users) * 100.0 / prev_users
| project ['step'], users, drop_off_rate=round(drop_off, 2)
```

### Average Time per Onboarding Step

Measure time spent on each step (p50, p95, p99).

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'onboarding_step_completed'
| summarize p50=percentile(['duration'], 50),
            p95=percentile(['duration'], 95),
            p99=percentile(['duration'], 99),
            avg=avg(['duration']),
            users=dcount(['userId'])
            by ['step']
| extend p50_seconds = p50 / 1000,
         p95_seconds = p95 / 1000,
         p99_seconds = p99 / 1000
| project ['step'], users, p50_seconds, p95_seconds, p99_seconds
| order by users desc
```

### Onboarding Skip Rate

Identify which steps users skip most frequently.

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'onboarding_step_skipped' or ['event'] == 'onboarding_step_completed'
| summarize skipped=countif(['event']=='onboarding_step_skipped'),
            completed=countif(['event']=='onboarding_step_completed')
            by ['step']
| extend skip_rate = skipped * 100.0 / (skipped + completed)
| project ['step'], skipped, completed, skip_rate=round(skip_rate, 2)
| order by skip_rate desc
```

### Onboarding Completion by Browser/Device

Analyze onboarding success across different platforms.

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'onboarding_started' or ['event'] == 'onboarding_completed'
| extend browser = extract(@"([A-Za-z]+)/[\d\.]+", 1, ['userAgent'])
| summarize starts=dcountif(['userId'], ['event']=='onboarding_started'),
            completions=dcountif(['userId'], ['event']=='onboarding_completed')
            by browser
| extend completion_rate = completions * 100.0 / starts
| where starts > 5  // Filter out low-traffic browsers
| project browser, starts, completions, completion_rate=round(completion_rate, 2)
| order by starts desc
```

---

## Feature Usage Queries

### Easter Egg Discovery Rate

Track which easter eggs are discovered and by how many users.

```apl
['logs']
| where ['_time'] > ago(30d)
| where ['event'] == 'easter_egg_discovered'
| summarize discoveries=count(),
            unique_users=dcount(['userId']),
            first_discovery=min(['_time']),
            last_discovery=max(['_time'])
            by ['easterEggName']
| extend days_since_first = (now() - first_discovery) / 1d
| project ['easterEggName'], discoveries, unique_users, days_since_first=round(days_since_first, 1)
| order by discoveries desc
```

### Timeline Grid Adoption

Measure grid snap feature usage and preferences.

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['feature'] == 'timeline_grid'
| summarize sessions_with_grid=dcountif(['sessionId'], ['gridEnabled'] == true),
            sessions_without_grid=dcountif(['sessionId'], ['gridEnabled'] == false),
            users=dcount(['userId'])
            by bin(['_time'], 1d)
| extend adoption_rate = sessions_with_grid * 100.0 / (sessions_with_grid + sessions_without_grid)
| project ['_time'], users, adoption_rate=round(adoption_rate, 2)
| order by ['_time'] desc
```

### Grid Size Preferences

Analyze which grid sizes users prefer.

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'grid_size_changed' or ['feature'] == 'timeline_grid'
| where ['gridEnabled'] == true
| summarize sessions=count(),
            users=dcount(['userId'])
            by ['gridSize']
| extend percentage = sessions * 100.0 / toscalar(
    ['logs']
    | where ['_time'] > ago(7d)
    | where ['feature'] == 'timeline_grid'
    | where ['gridEnabled'] == true
    | summarize total=count()
  )
| project ['gridSize'], sessions, users, percentage=round(percentage, 2)
| order by sessions desc
```

### Asset Search Metrics

Track search usage, success rate, and performance.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['event'] == 'asset_search_performed'
| summarize searches=count(),
            avg_results=avg(['resultsCount']),
            avg_latency_ms=avg(['duration']),
            p95_latency_ms=percentile(['duration'], 95),
            success_rate=countif(['resultsCount'] > 0) * 100.0 / count()
            by bin(['_time'], 1h)
| project ['_time'], searches, avg_results=round(avg_results, 1),
          avg_latency_ms=round(avg_latency_ms, 0),
          p95_latency_ms=round(p95_latency_ms, 0),
          success_rate=round(success_rate, 2)
| order by ['_time'] desc
```

### Popular Search Terms

Identify most common search queries.

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'asset_search_performed'
| where ['searchQuery'] != ''
| summarize searches=count(),
            unique_users=dcount(['userId']),
            avg_results=avg(['resultsCount'])
            by ['searchQuery']
| where searches > 2  // Filter noise
| project ['searchQuery'], searches, unique_users, avg_results=round(avg_results, 1)
| order by searches desc
| limit 50
```

### Minimap Interaction Rate

Measure minimap feature engagement.

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'minimap_clicked' or ['event'] == 'minimap_dragged' or ['event'] == 'session_started'
| summarize minimap_clicks=countif(['event']=='minimap_clicked'),
            minimap_drags=countif(['event']=='minimap_dragged'),
            total_sessions=dcountif(['sessionId'], ['event']=='session_started')
            by bin(['_time'], 1d)
| extend interaction_rate = (minimap_clicks + minimap_drags) * 100.0 / total_sessions
| project ['_time'], minimap_clicks, minimap_drags, total_sessions,
          interaction_rate=round(interaction_rate, 2)
| order by ['_time'] desc
```

### Selection Tool Usage

Compare single vs multi-select adoption.

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'clip_selected' or ['event'] == 'multi_select_used'
| summarize single_selects=countif(['event']=='clip_selected' and ['multiSelect']==false),
            multi_selects=countif(['event']=='multi_select_used' or ['multiSelect']==true),
            users=dcount(['userId'])
            by bin(['_time'], 1d)
| extend multi_select_rate = multi_selects * 100.0 / (single_selects + multi_selects)
| project ['_time'], single_selects, multi_selects, multi_select_rate=round(multi_select_rate, 2)
| order by ['_time'] desc
```

---

## Performance Queries

### Timeline Render Performance

Monitor timeline rendering speed across percentiles.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['metric'] == 'timeline_render'
| summarize p50=percentile(['duration'], 50),
            p95=percentile(['duration'], 95),
            p99=percentile(['duration'], 99),
            max=max(['duration']),
            samples=count()
            by bin(['_time'], 5m)
| project ['_time'], p50, p95, p99, max, samples
| order by ['_time'] desc
```

### Slow Timeline Renders

Identify sessions with poor rendering performance.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['metric'] == 'timeline_render'
| where ['duration'] > 3000  // Slower than 3 seconds
| summarize slow_renders=count(),
            avg_duration=avg(['duration']),
            max_duration=max(['duration'])
            by ['userId'], ['sessionId'], ['clipCount'], ['trackCount']
| extend avg_duration_sec = avg_duration / 1000,
         max_duration_sec = max_duration / 1000
| project ['userId'], ['sessionId'], ['clipCount'], ['trackCount'],
          slow_renders, avg_duration_sec, max_duration_sec
| order by slow_renders desc
| limit 20
```

### Asset Search Latency

Track search performance over time.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['metric'] == 'asset_search_latency'
| summarize p50=percentile(['duration'], 50),
            p95=percentile(['duration'], 95),
            p99=percentile(['duration'], 99),
            searches=count()
            by bin(['_time'], 15m)
| project ['_time'], p50, p95, p99, searches
| order by ['_time'] desc
```

### Auto-save Performance and Reliability

Monitor auto-save success rate and speed.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['event'] startswith 'auto_save_'
| summarize successes=countif(['event']=='auto_save_completed'),
            failures=countif(['event']=='auto_save_failed'),
            avg_duration=avgif(['duration'], ['event']=='auto_save_completed'),
            p95_duration=percentileif(['duration'], 95, ['event']=='auto_save_completed')
            by bin(['_time'], 15m)
| extend success_rate = successes * 100.0 / (successes + failures)
| project ['_time'], successes, failures,
          success_rate=round(success_rate, 2),
          avg_duration_ms=round(avg_duration, 0),
          p95_duration_ms=round(p95_duration, 0)
| order by ['_time'] desc
```

### Web Vitals Monitoring

Track Core Web Vitals (LCP, FID, CLS, FCP, TTFB).

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['type'] == 'web_vital'
| summarize p50=percentile(['value'], 50),
            p75=percentile(['value'], 75),
            p95=percentile(['value'], 95),
            good=countif(['rating']=='good'),
            needs_improvement=countif(['rating']=='needs-improvement'),
            poor=countif(['rating']=='poor')
            by ['metric'], bin(['_time'], 1h)
| extend good_pct = good * 100.0 / (good + needs_improvement + poor)
| project ['_time'], ['metric'], p50, p75, p95, good_pct=round(good_pct, 2)
| order by ['_time'] desc, ['metric'] asc
```

---

## Error Tracking Queries

### Error Rate by Feature

Identify which features have the highest error rates.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['level'] == 'error'
| summarize errors=count(),
            affected_users=dcount(['userId']),
            unique_errors=dcount(['error.message'])
            by ['feature']
| where errors > 5  // Filter noise
| project ['feature'], errors, affected_users, unique_errors
| order by errors desc
```

### Top 10 Errors by Frequency

Find the most common errors across the platform.

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['level'] == 'error'
| extend error_msg = coalesce(['error.message'], ['message'], 'Unknown error')
| summarize count=count(),
            users=dcount(['userId']),
            first_seen=min(['_time']),
            last_seen=max(['_time'])
            by error_msg, ['error.stack']
| extend hours_since_first = (now() - first_seen) / 1h
| project error_msg, count, users, hours_since_first=round(hours_since_first, 1)
| order by count desc
| limit 10
```

### Error Rate Trend

Monitor overall error rate over time.

```apl
['logs']
| where ['_time'] > ago(24h)
| summarize errors=countif(['level']=='error'),
            total=count(),
            affected_users=dcountif(['userId'], ['level']=='error')
            by bin(['_time'], 5m)
| extend error_rate = errors * 100.0 / total
| project ['_time'], errors, total, error_rate=round(error_rate, 4), affected_users
| order by ['_time'] desc
```

### Errors by Browser/Device

Identify platform-specific issues.

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['level'] == 'error'
| extend browser = extract(@"([A-Za-z]+)/[\d\.]+", 1, ['userAgent'])
| extend os = case(
    ['userAgent'] contains "Windows", "Windows",
    ['userAgent'] contains "Mac", "macOS",
    ['userAgent'] contains "Linux", "Linux",
    ['userAgent'] contains "Android", "Android",
    ['userAgent'] contains "iOS", "iOS",
    "Other"
  )
| summarize errors=count(),
            users=dcount(['userId'])
            by browser, os
| where errors > 5
| project browser, os, errors, users
| order by errors desc
```

### Error Recovery Rate

Measure how often users recover from errors vs abandon.

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'error_encountered' or ['event'] == 'error_recovered' or ['event'] == 'session_ended'
| summarize errors_hit=countif(['event']=='error_encountered'),
            errors_recovered=countif(['event']=='error_recovered'),
            sessions_ended_after_error=countif(['event']=='session_ended' and ['hadError']==true)
            by bin(['_time'], 1d)
| extend recovery_rate = errors_recovered * 100.0 / errors_hit,
         abandon_rate = sessions_ended_after_error * 100.0 / errors_hit
| project ['_time'], errors_hit, recovery_rate=round(recovery_rate, 2),
          abandon_rate=round(abandon_rate, 2)
| order by ['_time'] desc
```

---

## User Engagement Queries

### Daily Active Users (DAU)

Track unique users per day with trends.

```apl
['logs']
| where ['_time'] > ago(30d)
| where ['event'] == 'session_started'
| summarize dau=dcount(['userId']) by bin(['_time'], 1d)
| extend dau_7d_avg = series_avg(dau, 7)
| project ['_time'], dau, dau_7d_avg=round(dau_7d_avg, 0)
| order by ['_time'] desc
```

### Weekly Active Users (WAU) & Monthly Active Users (MAU)

Calculate WAU and MAU ratios.

```apl
['logs']
| where ['_time'] > ago(30d)
| where ['event'] == 'session_started'
| extend week = startofweek(['_time'])
| summarize wau=dcount(['userId']) by week
| join kind=leftouter (
    ['logs']
    | where ['_time'] > ago(30d)
    | where ['event'] == 'session_started'
    | summarize mau=dcount(['userId'])
  ) on $left.week == $right.week
| project week, wau, mau
| order by week desc
```

### Session Duration Distribution

Analyze how long users spend in the app.

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'session_ended'
| extend duration_minutes = ['sessionDuration'] / 60000
| extend duration_bucket = case(
    duration_minutes < 5, "< 5 min (Quick edits)",
    duration_minutes < 30, "5-30 min (Normal)",
    duration_minutes < 60, "30-60 min (Deep work)",
    "> 60 min (Power session)"
  )
| summarize sessions=count(),
            users=dcount(['userId'])
            by duration_bucket
| project duration_bucket, sessions, users
| order by sessions desc
```

### Feature Adoption Timeline

Track when users first use each feature.

```apl
['logs']
| where ['_time'] > ago(30d)
| where ['event'] == 'feature_first_use'
| summarize first_time_users=dcount(['userId'])
            by ['featureName'], bin(['_time'], 1d)
| order by ['_time'] desc, first_time_users desc
```

### Retention Cohort Analysis

Calculate retention by signup cohort.

```apl
['logs']
| where ['event'] == 'session_started'
| extend signup_week = startofweek(['userSignupDate'])
| extend weeks_since_signup = (datetime(['_time']) - datetime(signup_week)) / 7d
| where weeks_since_signup >= 0 and weeks_since_signup <= 12
| summarize retained_users=dcount(['userId'])
            by signup_week, week_number=tolong(weeks_since_signup)
| order by signup_week desc, week_number asc
```

### Churn Risk Scoring

Identify users at risk of churning.

```apl
['logs']
| where ['_time'] > ago(30d)
| where ['event'] == 'session_started'
| summarize last_session=max(['_time']),
            session_count=count(),
            avg_duration=avg(['sessionDuration']),
            error_count=countif(['hadError']==true)
            by ['userId']
| extend days_inactive = (now() - last_session) / 1d
| extend churn_risk_score = case(
    days_inactive > 14, 'high',
    days_inactive > 7 and session_count < 5, 'high',
    days_inactive > 7, 'medium',
    session_count < 3, 'medium',
    error_count > 10, 'medium',
    'low'
  )
| summarize users=count() by churn_risk_score
| extend percentage = users * 100.0 / toscalar(
    ['logs']
    | where ['_time'] > ago(30d)
    | where ['event'] == 'session_started'
    | summarize total=dcount(['userId'])
  )
| project churn_risk_score, users, percentage=round(percentage, 2)
```

---

## API Monitoring Queries

### API Response Times by Endpoint

Track performance of all API endpoints.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['type'] == 'api_request'
| summarize p50=percentile(['duration'], 50),
            p95=percentile(['duration'], 95),
            p99=percentile(['duration'], 99),
            requests=count(),
            errors=countif(['status'] >= 400)
            by ['endpoint'], ['method']
| where requests > 10  // Filter low-traffic endpoints
| extend error_rate = errors * 100.0 / requests
| project ['endpoint'], ['method'], requests, p50, p95, p99, error_rate=round(error_rate, 2)
| order by p95 desc
```

### Slow API Requests

Identify requests exceeding performance targets.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['type'] == 'api_request'
| where ['duration'] > 2000  // Slower than 2 seconds
| summarize slow_requests=count(),
            avg_duration=avg(['duration']),
            max_duration=max(['duration']),
            affected_users=dcount(['userId'])
            by ['endpoint'], ['method']
| project ['endpoint'], ['method'], slow_requests, avg_duration, max_duration, affected_users
| order by slow_requests desc
| limit 20
```

### API Error Rate by Status Code

Break down errors by HTTP status code.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['type'] == 'api_request'
| where ['status'] >= 400
| summarize errors=count(),
            affected_users=dcount(['userId'])
            by ['status'], ['endpoint']
| project ['status'], ['endpoint'], errors, affected_users
| order by errors desc
```

### Rate Limit Hits

Monitor rate limiting effectiveness.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['status'] == 429  // Too Many Requests
| summarize rate_limit_hits=count(),
            unique_ips=dcount(['ip']),
            unique_users=dcount(['userId'])
            by ['endpoint'], bin(['_time'], 15m)
| project ['_time'], ['endpoint'], rate_limit_hits, unique_ips, unique_users
| order by ['_time'] desc, rate_limit_hits desc
```

### Database Query Performance

Track database operation latency.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['type'] == 'database_query'
| summarize p50=percentile(['duration'], 50),
            p95=percentile(['duration'], 95),
            p99=percentile(['duration'], 99),
            queries=count(),
            slow_queries=countif(['duration'] > 1000)
            by ['operation'], ['table']
| extend slow_query_rate = slow_queries * 100.0 / queries
| project ['operation'], ['table'], queries, p50, p95, p99,
          slow_query_rate=round(slow_query_rate, 2)
| order by p95 desc
```

---

## Security & Compliance Queries

### Failed Login Attempts

Detect potential brute-force attacks.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['event'] == 'login_failed'
| summarize failed_attempts=count(),
            unique_ips=dcount(['ip'])
            by ['email'], bin(['_time'], 15m)
| where failed_attempts > 5  // Threshold for suspicious activity
| project ['_time'], ['email'], failed_attempts, unique_ips
| order by failed_attempts desc
```

### Suspicious Activity Detection

Identify unusual user behavior patterns.

```apl
['logs']
| where ['_time'] > ago(24h)
| where ['event'] in ('mass_delete', 'bulk_export', 'api_abuse')
| summarize suspicious_events=count(),
            event_types=make_set(['event'])
            by ['userId'], ['ip']
| where suspicious_events > 3
| project ['userId'], ['ip'], suspicious_events, event_types
| order by suspicious_events desc
```

### GDPR Compliance - Data Access Log

Track all user data access for compliance.

```apl
['logs']
| where ['_time'] > ago(30d)
| where ['event'] in ('user_data_accessed', 'user_data_exported', 'user_data_deleted')
| summarize access_count=count(),
            first_access=min(['_time']),
            last_access=max(['_time'])
            by ['userId'], ['event'], ['accessedBy']
| project ['userId'], ['event'], ['accessedBy'], access_count, first_access, last_access
| order by last_access desc
```

### API Key Usage Audit

Monitor API key usage and potential abuse.

```apl
['logs']
| where ['_time'] > ago(7d)
| where ['authenticationType'] == 'api_key'
| summarize requests=count(),
            unique_endpoints=dcount(['endpoint']),
            errors=countif(['status'] >= 400),
            data_transferred=sum(['responseSize'])
            by ['apiKeyId'], ['userId']
| extend error_rate = errors * 100.0 / requests
| project ['apiKeyId'], ['userId'], requests, unique_endpoints,
          error_rate=round(error_rate, 2),
          data_transferred_mb=round(data_transferred / 1024 / 1024, 2)
| order by requests desc
```

---

## Business Metrics Queries

### Conversion Funnel

Track conversion from signup to paid user.

```apl
['logs']
| where ['_time'] > ago(30d)
| where ['event'] in ('user_signed_up', 'onboarding_completed', 'project_created', 'subscription_started')
| summarize signups=dcountif(['userId'], ['event']=='user_signed_up'),
            onboarded=dcountif(['userId'], ['event']=='onboarding_completed'),
            created_project=dcountif(['userId'], ['event']=='project_created'),
            subscribed=dcountif(['userId'], ['event']=='subscription_started')
            by bin(['_time'], 1d)
| extend onboarding_rate = onboarded * 100.0 / signups,
         activation_rate = created_project * 100.0 / signups,
         conversion_rate = subscribed * 100.0 / signups
| project ['_time'], signups, onboarding_rate, activation_rate, conversion_rate
| order by ['_time'] desc
```

### Revenue Attribution by Feature

Track which features drive subscription conversions.

```apl
['logs']
| where ['_time'] > ago(30d)
| where ['event'] == 'subscription_started'
| join kind=inner (
    ['logs']
    | where ['_time'] > ago(30d)
    | where ['event'] == 'feature_used'
    | summarize features_used=make_set(['featureName']) by ['userId']
  ) on ['userId']
| summarize subscriptions=count() by features=tostring(features_used)
| order by subscriptions desc
| limit 20
```

### User Lifetime Value (LTV) Proxy

Estimate user value based on engagement.

```apl
['logs']
| where ['_time'] > ago(90d)
| where ['event'] in ('session_started', 'project_created', 'video_exported')
| summarize sessions=countif(['event']=='session_started'),
            projects=countif(['event']=='project_created'),
            exports=countif(['event']=='video_exported'),
            days_active=dcount(bin(['_time'], 1d))
            by ['userId'], ['subscriptionTier']
| extend engagement_score = (sessions * 1) + (projects * 5) + (exports * 10)
| extend ltv_proxy = engagement_score * days_active
| summarize avg_ltv_proxy=avg(ltv_proxy),
            users=count()
            by ['subscriptionTier']
| project ['subscriptionTier'], users, avg_ltv_proxy=round(avg_ltv_proxy, 0)
| order by avg_ltv_proxy desc
```

---

## Query Best Practices

### Performance Optimization

1. **Always include time ranges:** Use `where ['_time'] > ago(24h)` to limit data scanned
2. **Filter early:** Place `where` clauses before `summarize` operations
3. **Limit results:** Use `limit` or `top` to reduce data transfer
4. **Use indexed fields:** Query fields that are indexed for faster performance
5. **Aggregate when possible:** Prefer summaries over raw data extraction

### Query Maintenance

1. **Document purpose:** Add comments explaining what each query does
2. **Set alerts:** Configure alerts for critical thresholds
3. **Review regularly:** Check query performance and adjust as needed
4. **Archive unused:** Remove queries that are no longer relevant
5. **Version control:** Track query changes in git

### Debugging Queries

1. **Start simple:** Begin with basic filters and add complexity incrementally
2. **Check sample data:** Use `limit 10` to verify data structure
3. **Test time ranges:** Ensure time filters are returning expected results
4. **Validate joins:** Verify join conditions are correct
5. **Monitor performance:** Check query execution time and optimize if slow

---

**Last Updated:** 2025-10-24
**Maintained By:** Engineering Team
**Review Frequency:** Monthly
