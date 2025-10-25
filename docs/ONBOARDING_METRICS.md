# Onboarding Metrics Documentation

## Overview

This document defines the key metrics for tracking onboarding effectiveness and provides PostHog queries for analyzing user onboarding performance.

## Key Performance Indicators (KPIs)

### Primary Metrics

1. **Completion Rate**
   - Percentage of users who complete the entire onboarding flow
   - Target: >80%
   - Formula: `(Users who completed / Users who started) * 100`

2. **Time to Complete**
   - Average time users spend completing onboarding
   - Target: 2-4 minutes
   - Metric: `avg(total_time_ms) / 60000` (convert to minutes)

3. **Drop-off Rate by Step**
   - Percentage of users who abandon onboarding at each step
   - Target: <5% per step
   - Critical: Identify steps with >10% drop-off

4. **Feedback Sentiment**
   - Percentage of users rating onboarding as "helpful"
   - Target: >75% positive
   - Formula: `(Helpful ratings / Total ratings) * 100`

### Secondary Metrics

5. **Tutorial Replay Rate**
   - Users who replay the tutorial after initial completion
   - Indicates: Onboarding effectiveness or feature complexity

6. **Help Access Frequency**
   - Number of times users access contextual help
   - High frequency may indicate confusing UI

7. **Step Completion Time Distribution**
   - Time spent on each individual step
   - Helps identify confusing or lengthy steps

## PostHog Queries

### 1. Overall Completion Rate

```apl
['onboarding']
| where event == 'onboarding_started' or event == 'onboarding_completed'
| summarize
    started = countif(event == 'onboarding_started'),
    completed = countif(event == 'onboarding_completed')
| extend completion_rate = (completed * 100.0) / started
| project completion_rate, started, completed
```

### 2. Completion Rate by Cohort (Last 7 Days)

```apl
['onboarding']
| where timestamp > ago(7d)
| where event == 'onboarding_started' or event == 'onboarding_completed'
| extend date = bin(timestamp, 1d)
| summarize
    started = countif(event == 'onboarding_started'),
    completed = countif(event == 'onboarding_completed')
    by date
| extend completion_rate = (completed * 100.0) / started
| project date, completion_rate, started, completed
| order by date desc
```

### 3. Average Time Per Step

```apl
['onboarding']
| where event == 'onboarding_step_completed'
| summarize
    avg_time_ms = avg(properties.time_on_step_ms),
    median_time_ms = percentile(properties.time_on_step_ms, 50),
    p90_time_ms = percentile(properties.time_on_step_ms, 90),
    count = count()
    by step_id = tostring(properties.step_id), step_title = tostring(properties.step_title)
| extend
    avg_time_seconds = avg_time_ms / 1000,
    median_time_seconds = median_time_ms / 1000,
    p90_time_seconds = p90_time_ms / 1000
| project step_id, step_title, avg_time_seconds, median_time_seconds, p90_time_seconds, count
| order by avg_time_seconds desc
```

### 4. Drop-off Analysis by Step

```apl
['onboarding']
| where event == 'onboarding_step_viewed' or event == 'onboarding_skipped'
| extend
    step_viewed = case(event == 'onboarding_step_viewed', 1, 0),
    skipped_at_step = case(event == 'onboarding_skipped', tostring(properties.abandoned_at_step_id), "")
| summarize
    total_views = sum(step_viewed),
    skip_count = countif(skipped_at_step != "")
    by step = coalesce(skipped_at_step, tostring(properties.step_id))
| extend drop_off_rate = (skip_count * 100.0) / total_views
| where drop_off_rate > 0
| project step, drop_off_rate, skip_count, total_views
| order by drop_off_rate desc
```

### 5. Feedback Sentiment Analysis

```apl
['onboarding']
| where event == 'onboarding_feedback_submitted'
| summarize
    helpful = countif(properties.rating == 'helpful'),
    not_helpful = countif(properties.rating == 'not_helpful'),
    total = count(),
    with_text = countif(properties.has_text_feedback == true)
| extend
    helpful_percentage = (helpful * 100.0) / total,
    not_helpful_percentage = (not_helpful * 100.0) / total,
    text_feedback_rate = (with_text * 100.0) / total
| project helpful_percentage, not_helpful_percentage, text_feedback_rate, helpful, not_helpful, total
```

### 6. User Journey Funnel

```apl
['onboarding']
| where event in ('onboarding_started', 'onboarding_step_completed', 'onboarding_completed')
| extend step_num = case(
    event == 'onboarding_started', 0,
    event == 'onboarding_step_completed', toint(properties.step_number),
    event == 'onboarding_completed', 8,
    -1
  )
| summarize count() by step_num
| order by step_num asc
| extend
    drop_from_previous = prev(count()) - count(),
    drop_rate = (drop_from_previous * 100.0) / prev(count())
| project step_num, count, drop_from_previous, drop_rate
```

### 7. A/B Test Variant Performance

```apl
['onboarding']
| where event == 'ab_test_variant_exposure'
| where properties.test_name == 'onboarding_copy_test'
| join kind=inner (
    ['onboarding']
    | where event == 'onboarding_completed'
  ) on $left.distinct_id == $right.distinct_id
| summarize
    exposures = count(),
    completions = dcount(distinct_id)
    by variant = tostring(properties.variant)
| extend completion_rate = (completions * 100.0) / exposures
| project variant, completion_rate, completions, exposures
| order by completion_rate desc
```

### 8. Time Distribution Analysis

```apl
['onboarding']
| where event == 'onboarding_completed'
| extend total_time_minutes = toint(properties.total_time_ms) / 60000
| summarize
    avg_time = avg(total_time_minutes),
    median_time = percentile(total_time_minutes, 50),
    p25_time = percentile(total_time_minutes, 25),
    p75_time = percentile(total_time_minutes, 75),
    p90_time = percentile(total_time_minutes, 90),
    p95_time = percentile(total_time_minutes, 95),
    min_time = min(total_time_minutes),
    max_time = max(total_time_minutes)
| project avg_time, median_time, p25_time, p75_time, p90_time, p95_time, min_time, max_time
```

### 9. Skipped vs Completed Users

```apl
['onboarding']
| where event in ('onboarding_completed', 'onboarding_skipped')
| summarize
    completed = countif(event == 'onboarding_completed'),
    skipped = countif(event == 'onboarding_skipped'),
    total = count()
| extend
    completion_rate = (completed * 100.0) / total,
    skip_rate = (skipped * 100.0) / total
| project completion_rate, skip_rate, completed, skipped, total
```

### 10. Replay Tutorial Analysis

```apl
['onboarding']
| where event == 'onboarding_tutorial_replayed'
| summarize
    replay_count = count(),
    unique_users = dcount(distinct_id)
| extend replays_per_user = replay_count * 1.0 / unique_users
| project replay_count, unique_users, replays_per_user
```

## Monitoring Alerts

### Critical Alerts (Immediate Action Required)

1. **Completion Rate Below 60%**

   ```
   Trigger: completion_rate < 60
   Action: Investigate drop-off points immediately
   Review: Step descriptions, UI/UX issues, technical errors
   ```

2. **Any Step Drop-off >15%**

   ```
   Trigger: drop_off_rate > 15 for any step
   Action: Review specific step content and flow
   Consider: A/B test alternative approaches
   ```

3. **Average Time >10 Minutes**
   ```
   Trigger: avg_time_minutes > 10
   Action: Onboarding is too long
   Consider: Reducing steps or shortening content
   ```

### Warning Alerts (Action Within 24-48 Hours)

4. **Feedback Sentiment <70% Positive**

   ```
   Trigger: helpful_percentage < 70
   Action: Review text feedback for common issues
   Consider: A/B testing different copy variants
   ```

5. **High Replay Rate (>20% of Users)**
   ```
   Trigger: (unique_replayers / total_users) > 0.20
   Action: Indicates confusion or forgetfulness
   Consider: Adding in-context help, improving step clarity
   ```

## Dashboard Recommendations

### PostHog Dashboard Setup

Create a dashboard with these panels:

1. **Hero Metrics (Top Row)**
   - Completion Rate (single stat)
   - Average Time to Complete (single stat)
   - Total Users Started (single stat)
   - Feedback Sentiment (single stat)

2. **Trends (Second Row)**
   - Completion Rate Over Time (line chart, 30 days)
   - Users Started vs Completed (bar chart, 30 days)

3. **Funnel Analysis (Third Row)**
   - Step-by-step funnel (funnel chart)
   - Drop-off heatmap by step (table)

4. **User Feedback (Fourth Row)**
   - Feedback sentiment distribution (pie chart)
   - Recent text feedback (table)

5. **A/B Testing (Fifth Row)**
   - Variant completion rates (bar chart)
   - Variant exposure distribution (pie chart)

## Analysis Best Practices

### Weekly Review Checklist

- [ ] Check completion rate trend (improving/declining?)
- [ ] Identify steps with high drop-off rates
- [ ] Review feedback sentiment and text comments
- [ ] Compare A/B test variant performance
- [ ] Monitor average completion time
- [ ] Check for technical errors in onboarding flow
- [ ] Review user cohort differences (new vs returning)

### Monthly Deep Dive

- [ ] Analyze correlation between onboarding completion and long-term retention
- [ ] Compare onboarding metrics across different user segments
- [ ] Review effectiveness of copy/design changes
- [ ] Identify opportunities for optimization
- [ ] Plan A/B tests for next month
- [ ] Update success criteria based on data

## Success Criteria

### Excellent Performance

- Completion Rate: >85%
- Average Time: 2-3 minutes
- Drop-off per Step: <3%
- Feedback Sentiment: >85% positive
- Replay Rate: <10%

### Good Performance

- Completion Rate: 75-85%
- Average Time: 3-4 minutes
- Drop-off per Step: 3-5%
- Feedback Sentiment: 75-85% positive
- Replay Rate: 10-15%

### Needs Improvement

- Completion Rate: 60-75%
- Average Time: 4-6 minutes
- Drop-off per Step: 5-10%
- Feedback Sentiment: 60-75% positive
- Replay Rate: 15-20%

### Critical (Requires Immediate Action)

- Completion Rate: <60%
- Average Time: >6 minutes
- Drop-off per Step: >10%
- Feedback Sentiment: <60% positive
- Replay Rate: >20%

## Related Documentation

- [User Testing Protocol](./USER_TESTING_ONBOARDING.md)
- [A/B Testing Service](../lib/services/abTestingService.ts)
- [Analytics Service](../lib/services/analyticsService.ts)
- [UserOnboarding Component](../components/UserOnboarding.tsx)
