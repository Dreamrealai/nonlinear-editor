# Production Monitoring Dashboards

This document describes the Axiom monitoring dashboards for the Non-Linear Editor platform. These dashboards provide real-time insights into user behavior, feature adoption, performance metrics, and system health.

## Dashboard 1: Onboarding Metrics

**Purpose:** Track user onboarding flow completion and identify drop-off points.

### Key Metrics

#### Onboarding Start Rate
- **Query:** Count of `onboarding_started` events per hour/day
- **Visualization:** Time series chart
- **Target:** Correlate with new user registrations
- **Alert Threshold:** Drop > 30% compared to previous week

#### Completion Rate by Step
- **Query:** Track completion rate for each onboarding step
  - Welcome screen
  - Tutorial introduction
  - Timeline interaction
  - Asset upload
  - First project creation
- **Visualization:** Funnel chart
- **Target:** > 60% completion rate
- **Alert Threshold:** Any step with < 40% completion

#### Drop-off Analysis
- **Query:** Identify where users abandon onboarding
- **Visualization:** Sankey diagram showing flow between steps
- **Insights:**
  - Most common exit points
  - Time spent on each step before drop-off
  - Device/browser correlation with drop-off

#### Average Time per Step
- **Query:** Calculate median and p95 time spent on each step
- **Visualization:** Bar chart with percentile lines
- **Target:**
  - Welcome: < 30 seconds
  - Tutorial: 1-2 minutes
  - Timeline interaction: 2-3 minutes
  - Asset upload: 1-2 minutes
  - Project creation: < 1 minute

#### Skip Rate
- **Query:** Percentage of users who skip tutorial steps
- **Visualization:** Pie chart + trend line
- **Insights:**
  - Which steps are most commonly skipped
  - Impact of skipping on feature adoption
  - Correlation with user retention

### Axiom APL Queries

```apl
// Onboarding completion rate
['logs']
| where ['_time'] > ago(24h)
| where ['event'] == 'onboarding_started' or ['event'] == 'onboarding_completed'
| summarize starts=countif(['event']=='onboarding_started'),
            completions=countif(['event']=='onboarding_completed')
| extend completion_rate = completions * 100.0 / starts

// Step-by-step funnel
['logs']
| where ['_time'] > ago(24h)
| where ['event'] startswith 'onboarding_step_'
| summarize users=dcount(['userId']) by ['step']
| order by ['step'] asc

// Average time per step
['logs']
| where ['_time'] > ago(24h)
| where ['event'] == 'onboarding_step_completed'
| summarize avg_time=avg(['duration']),
            p50=percentile(['duration'], 50),
            p95=percentile(['duration'], 95)
            by ['step']
```

---

## Dashboard 2: Feature Usage

**Purpose:** Monitor adoption and usage patterns of new features.

### Key Metrics

#### Easter Egg Discovery Rate
- **Query:** Track which easter eggs users discover
- **Visualization:** Leaderboard + discovery timeline
- **Metrics:**
  - Total discoveries per easter egg
  - Unique users who discovered each
  - Time to first discovery
  - Discovery method (keyboard shortcut, UI exploration, etc.)

#### Timeline Grid Usage
- **Query:** Measure grid snap feature adoption
- **Visualization:** Stacked area chart
- **Metrics:**
  - Users with grid enabled vs disabled
  - Grid size preferences (small, medium, large)
  - Snap-to-grid engagement
  - Correlation with editing precision

#### Asset Search Frequency
- **Query:** Track search feature usage
- **Visualization:** Line chart + search term word cloud
- **Metrics:**
  - Searches per user session
  - Search success rate (click-through)
  - Popular search terms
  - Search performance (latency)

#### Minimap Interaction Rate
- **Query:** Measure minimap feature engagement
- **Visualization:** Heatmap of interaction points
- **Metrics:**
  - Users who interact with minimap
  - Clicks on minimap per session
  - Navigation efficiency (time saved)
  - Viewport jumps using minimap

#### Selection Tool Usage
- **Query:** Track multi-select and selection tools
- **Visualization:** Comparison chart
- **Metrics:**
  - Single select vs multi-select usage
  - Shift-click adoption
  - Drag-select usage
  - Selection tool shortcuts

### Axiom APL Queries

```apl
// Easter egg discoveries
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'easter_egg_discovered'
| summarize discoveries=count(),
            unique_users=dcount(['userId'])
            by ['easterEggName']
| order by discoveries desc

// Timeline grid adoption
['logs']
| where ['_time'] > ago(24h)
| where ['feature'] == 'timeline_grid'
| summarize users_with_grid=dcountif(['userId'], ['gridEnabled'] == true),
            users_without_grid=dcountif(['userId'], ['gridEnabled'] == false)
| extend adoption_rate = users_with_grid * 100.0 / (users_with_grid + users_without_grid)

// Asset search metrics
['logs']
| where ['_time'] > ago(24h)
| where ['event'] == 'asset_search_performed'
| summarize searches=count(),
            avg_results=avg(['resultsCount']),
            avg_latency=avg(['duration'])
            by bin(['_time'], 1h)

// Minimap interactions
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'minimap_clicked' or ['event'] == 'minimap_dragged'
| summarize interactions=count(),
            unique_users=dcount(['userId'])
            by ['event'], bin(['_time'], 1d)
```

---

## Dashboard 3: Performance Metrics

**Purpose:** Monitor application performance and identify bottlenecks.

### Key Metrics

#### Timeline Render Time (p50, p95, p99)
- **Query:** Track timeline rendering performance
- **Visualization:** Multi-line percentile chart
- **Targets:**
  - p50: < 200ms
  - p95: < 1000ms
  - p99: < 3000ms
- **Alert Threshold:** p95 > 3000ms for 1 hour

#### Asset Search Latency
- **Query:** Measure search response time
- **Visualization:** Histogram + percentile trend
- **Targets:**
  - p50: < 100ms
  - p95: < 500ms
  - p99: < 1000ms
- **Alert Threshold:** p95 > 1000ms for 15 minutes

#### Auto-save Completion Time
- **Query:** Track auto-save performance
- **Visualization:** Time series with error bars
- **Targets:**
  - p50: < 500ms
  - p95: < 2000ms
  - Success rate: > 99%
- **Alert Threshold:** Failure rate > 5% over 1 hour

#### Error Rates by Feature
- **Query:** Group errors by feature/component
- **Visualization:** Treemap + trend lines
- **Metrics:**
  - Error count per feature
  - Error rate (errors per 1000 requests)
  - Unique error types
  - User impact (affected users)

#### API Response Times
- **Query:** Track API endpoint performance
- **Visualization:** Heatmap by endpoint
- **Targets:**
  - GET endpoints: p95 < 500ms
  - POST endpoints: p95 < 1000ms
  - Upload endpoints: p95 < 5000ms
- **Alert Threshold:** Any endpoint p95 > 2x target for 15 minutes

### Axiom APL Queries

```apl
// Timeline render performance
['logs']
| where ['_time'] > ago(24h)
| where ['metric'] == 'timeline_render'
| summarize p50=percentile(['duration'], 50),
            p95=percentile(['duration'], 95),
            p99=percentile(['duration'], 99)
            by bin(['_time'], 5m)
| render timechart

// Asset search latency
['logs']
| where ['_time'] > ago(24h)
| where ['metric'] == 'asset_search_latency'
| summarize p50=percentile(['duration'], 50),
            p95=percentile(['duration'], 95),
            p99=percentile(['duration'], 99)
            by bin(['_time'], 5m)

// Auto-save performance and reliability
['logs']
| where ['_time'] > ago(24h)
| where ['event'] startswith 'auto_save_'
| summarize successes=countif(['event']=='auto_save_completed'),
            failures=countif(['event']=='auto_save_failed'),
            avg_duration=avgif(['duration'], ['event']=='auto_save_completed')
            by bin(['_time'], 15m)
| extend success_rate = successes * 100.0 / (successes + failures)

// Error rates by feature
['logs']
| where ['_time'] > ago(24h)
| where ['level'] == 'error'
| summarize errors=count(),
            affected_users=dcount(['userId']),
            unique_errors=dcount(['error.message'])
            by ['feature']
| order by errors desc

// API response times by endpoint
['logs']
| where ['_time'] > ago(24h)
| where ['type'] == 'api_request'
| summarize p50=percentile(['duration'], 50),
            p95=percentile(['duration'], 95),
            p99=percentile(['duration'], 99),
            requests=count()
            by ['endpoint'], ['method']
| where requests > 10
| order by p95 desc
```

---

## Dashboard 4: User Engagement

**Purpose:** Track user activity, feature adoption, and retention metrics.

### Key Metrics

#### Daily Active Users (DAU)
- **Query:** Count unique users per day
- **Visualization:** Line chart with 7-day moving average
- **Segments:**
  - Total DAU
  - New users
  - Returning users
  - Power users (daily activity > 30 min)

#### Feature Adoption Rate
- **Query:** Track adoption of new features over time
- **Visualization:** Stacked area chart
- **Metrics:**
  - % of users who tried feature at least once
  - % of users who use feature regularly (weekly)
  - Time to first use (days since feature launch)
  - Adoption velocity (users per day)

#### Session Duration
- **Query:** Measure time users spend in the app
- **Visualization:** Distribution histogram + trend
- **Segments:**
  - < 5 minutes (quick edits)
  - 5-30 minutes (normal sessions)
  - 30-60 minutes (deep work)
  - > 60 minutes (power sessions)

#### Retention Cohorts
- **Query:** Track user retention by cohort
- **Visualization:** Cohort retention table
- **Metrics:**
  - Day 1, 7, 30, 90 retention
  - Retention by signup source
  - Retention by onboarding completion
  - Feature usage impact on retention

#### Churn Indicators
- **Query:** Identify users at risk of churning
- **Visualization:** Risk score distribution
- **Risk Factors:**
  - Declining session frequency
  - Decreased feature usage
  - Error encounters
  - Low project completion rate
  - No activity in 7+ days

### Axiom APL Queries

```apl
// Daily Active Users
['logs']
| where ['_time'] > ago(30d)
| where ['event'] == 'session_started'
| summarize dau=dcount(['userId']) by bin(['_time'], 1d)
| render timechart

// Feature adoption over time
['logs']
| where ['_time'] > ago(30d)
| where ['event'] == 'feature_first_use' or ['event'] == 'feature_used'
| summarize first_time_users=dcountif(['userId'], ['event']=='feature_first_use'),
            returning_users=dcountif(['userId'], ['event']=='feature_used')
            by ['featureName'], bin(['_time'], 1d)

// Session duration distribution
['logs']
| where ['_time'] > ago(7d)
| where ['event'] == 'session_ended'
| summarize count() by bin(['sessionDuration'], 300000) // 5-minute bins (milliseconds)
| render columnchart

// Retention cohort analysis
['logs']
| where ['event'] == 'session_started'
| extend signup_date = bin(['userSignupDate'], 1d)
| extend days_since_signup = (datetime(['_time']) - datetime(signup_date)) / 1d
| where days_since_signup >= 0 and days_since_signup <= 30
| summarize retained_users=dcount(['userId'])
            by signup_date, day_number = tolong(days_since_signup)
| order by signup_date desc, day_number asc

// Churn risk scoring
['logs']
| where ['_time'] > ago(30d)
| where ['event'] == 'session_started'
| summarize last_session=max(['_time']),
            session_count=count(),
            avg_duration=avg(['sessionDuration'])
            by ['userId']
| extend days_inactive = (now() - last_session) / 1d
| extend churn_risk_score =
    case(
      days_inactive > 14, 'high',
      days_inactive > 7, 'medium',
      session_count < 3, 'medium',
      'low'
    )
| summarize users=count() by churn_risk_score
```

---

## Dashboard Setup Instructions

### 1. Create Dashboards in Axiom

1. Log into your Axiom account
2. Navigate to **Dashboards** section
3. Click **Create Dashboard**
4. Name each dashboard according to the sections above
5. Add charts using the provided APL queries

### 2. Configure Refresh Rates

- **Onboarding Metrics:** Every 5 minutes
- **Feature Usage:** Every 15 minutes
- **Performance Metrics:** Every 1 minute (real-time)
- **User Engagement:** Every 1 hour

### 3. Set Up Dashboard Sharing

- Generate public read-only links for stakeholder access
- Create team-specific views with relevant filters
- Configure email reports for weekly summaries

### 4. Add Contextual Filters

All dashboards should include these global filters:
- **Time Range:** Last 24h, 7d, 30d, custom
- **Environment:** Production, staging, development
- **User Segment:** New users, returning users, power users
- **Device Type:** Desktop, mobile, tablet
- **Browser:** Chrome, Firefox, Safari, Edge

### 5. Configure Annotations

Add annotations for:
- Feature releases
- Deployment times
- Incident reports
- Marketing campaigns
- A/B test start/end dates

---

## Best Practices

### Dashboard Maintenance

1. **Review Weekly:** Check for anomalies and trends
2. **Update Quarterly:** Refine queries and add new metrics
3. **Archive Unused:** Remove metrics that aren't actionable
4. **Document Changes:** Track query modifications
5. **Test Alerts:** Verify alert thresholds are appropriate

### Query Optimization

1. **Use Time Windows:** Always include time range filters
2. **Limit Results:** Use `limit` or `top` to reduce data transfer
3. **Aggregate When Possible:** Prefer summaries over raw data
4. **Index Key Fields:** Ensure frequently queried fields are indexed
5. **Cache Results:** Use Axiom's caching for expensive queries

### Visualization Guidelines

1. **Choose Appropriate Charts:**
   - Time series: Line charts
   - Distributions: Histograms
   - Comparisons: Bar charts
   - Relationships: Scatter plots
   - Parts of whole: Pie charts (use sparingly)

2. **Use Color Effectively:**
   - Green: Positive/healthy
   - Yellow: Warning/attention needed
   - Red: Critical/errors
   - Blue: Neutral/informational

3. **Add Context:**
   - Include target lines
   - Show historical baselines
   - Add annotations for events
   - Display percentile ranges

---

## Related Documentation

- [Axiom Query Library](./QUERIES.md) - Comprehensive APL query examples
- [Alert Configuration](./ALERTS.md) - Alert setup and thresholds
- [Incident Response](./INCIDENT_RESPONSE.md) - Incident handling procedures
- [Analytics Integration](../ANALYTICS_AND_MONITORING.md) - PostHog and Axiom integration

---

**Last Updated:** 2025-10-24
**Maintained By:** Engineering Team
**Review Frequency:** Quarterly
