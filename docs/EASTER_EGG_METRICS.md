# Easter Egg Metrics Dashboard

This document provides PostHog queries and analysis guidelines for tracking easter egg discovery, engagement, and impact on user retention.

## Overview

We have implemented 5 hidden easter eggs in the application:

1. **Konami Code** (↑↑↓↓←→←→BA) - Rainbow mode + confetti
2. **Developer Mode** (Press 'D' 5x) - Dev indicator
3. **Matrix Mode** (Press 'M' 3x) - Matrix rain effect
4. **Disco Mode** (Type 'disco') - Flashing colors
5. **Gravity Mode** (Type 'gravity') - Elements fall

## Key Metrics to Track

### Discovery Metrics

#### Overall Discovery Rate

```sql
-- Percentage of users who discovered at least one easter egg
SELECT
  COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(DISTINCT user_id) FROM users) as discovery_rate
FROM easter_egg_achievements;
```

#### Discovery Rate by Egg

```sql
-- PostHog Insight: Trends
-- Event: easter_egg_discovered
-- Group by: egg_id
-- Time range: Last 30 days

-- Shows which eggs are discovered most/least frequently
```

#### Time to First Discovery

```sql
-- PostHog Insight: Trends
-- Event: easter_egg_discovered
-- Formula: avg(timestamp - user_created_at)
-- Shows how long it takes users to find their first egg
```

#### Master Achievement Rate

```sql
-- Percentage of users who discovered all 5 eggs
SELECT
  COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(DISTINCT user_id) FROM users) as master_rate
FROM (
  SELECT user_id, COUNT(DISTINCT egg_id) as eggs_found
  FROM easter_egg_achievements
  GROUP BY user_id
  HAVING COUNT(DISTINCT egg_id) = 5
) subquery;
```

### Engagement Metrics

#### Activation Frequency

```sql
-- PostHog Insight: Trends
-- Event: easter_egg_activated
-- Group by: egg_id
-- Shows how often each egg is activated (repeat engagement)
```

#### Average Session Duration During Easter Egg

```sql
-- PostHog SQL Query
SELECT
  properties.egg_id,
  AVG(properties.duration_ms) as avg_duration_ms
FROM events
WHERE event = 'easter_egg_deactivated'
GROUP BY properties.egg_id;
```

#### User Engagement After Discovery

```sql
-- PostHog Funnel
-- Step 1: easter_egg_discovered
-- Step 2: Any project action (within 24 hours)
-- Measures if easter eggs increase app usage
```

### Social Sharing Metrics

#### Share Conversion Rate

```sql
-- PostHog Insight: Trends
-- Event: easter_egg_shared
-- Formula: count(easter_egg_shared) / count(easter_egg_discovered) * 100
-- Shows percentage of discoveries that lead to shares
```

#### Share by Platform

```sql
-- PostHog SQL Query
SELECT
  properties.platform,
  COUNT(*) as share_count
FROM events
WHERE event = 'easter_egg_shared'
GROUP BY properties.platform
ORDER BY share_count DESC;
```

### Feedback Metrics

#### Feedback Submission Rate

```sql
-- Percentage of Master users who submitted feedback
SELECT
  COUNT(DISTINCT f.user_id) * 100.0 / COUNT(DISTINCT a.user_id) as feedback_rate
FROM easter_egg_feedback f
RIGHT JOIN (
  SELECT user_id
  FROM easter_egg_achievements
  GROUP BY user_id
  HAVING COUNT(DISTINCT egg_id) = 5
) a ON f.user_id = a.user_id;
```

#### Average Rating

```sql
-- PostHog SQL Query
SELECT
  AVG(properties.rating) as avg_rating,
  COUNT(*) as total_feedback
FROM events
WHERE event = 'easter_egg_feedback_submitted';
```

#### Favorite Easter Egg

```sql
-- PostHog SQL Query
SELECT
  properties.favorite_egg,
  COUNT(*) as vote_count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM events
WHERE event = 'easter_egg_feedback_submitted'
  AND properties.favorite_egg IS NOT NULL
  AND properties.favorite_egg != 'none'
GROUP BY properties.favorite_egg
ORDER BY vote_count DESC;
```

### Retention Impact

#### User Retention After Easter Egg Discovery

```sql
-- PostHog Retention Table
-- Cohort: Users who discovered their first easter egg
-- Return event: Any app usage
-- Time period: Weekly for 8 weeks
-- Compare with: All users (control group)
```

#### Feature Adoption After Discovery

```sql
-- PostHog Funnel
-- Step 1: easter_egg_discovered
-- Step 2: video_generated (within 7 days)
-- Measures if easter eggs correlate with feature usage
```

## PostHog Dashboard Setup

### Dashboard 1: Discovery Overview

**Widgets:**

1. **Total Discoveries** (Number)
   - Event: `easter_egg_discovered`
   - Unique users count
   - Time range: All time

2. **Discovery Rate by Egg** (Bar Chart)
   - Event: `easter_egg_discovered`
   - Group by: `egg_id`
   - Time range: Last 30 days

3. **Discovery Funnel** (Funnel)
   - Step 1: First visit
   - Step 2: 1st egg discovered
   - Step 3: 3rd egg discovered
   - Step 4: 5th egg discovered (Master)

4. **Time to First Discovery** (Histogram)
   - Event: `easter_egg_discovered`
   - Formula: `timestamp - user_signup_timestamp`
   - Buckets: 1 day, 1 week, 1 month, 3 months

### Dashboard 2: Engagement & Retention

**Widgets:**

1. **Activation Frequency** (Line Chart)
   - Event: `easter_egg_activated`
   - Y-axis: Count
   - X-axis: Time (daily)
   - Breakdown: By `egg_id`

2. **Average Egg Duration** (Bar Chart)
   - Event: `easter_egg_deactivated`
   - Y-axis: Average `duration_ms`
   - X-axis: `egg_id`

3. **User Retention Comparison** (Retention Table)
   - Cohort A: Users with egg discoveries
   - Cohort B: Users without egg discoveries
   - Compare weekly retention

4. **Engagement After Discovery** (Funnel)
   - Step 1: `easter_egg_discovered`
   - Step 2: Any editor action (24h)
   - Step 3: Project saved (7d)
   - Conversion window: 7 days

### Dashboard 3: Social & Feedback

**Widgets:**

1. **Share Conversion Rate** (Number)
   - Formula: `count(easter_egg_shared) / count(easter_egg_discovered) * 100`
   - Time range: Last 30 days

2. **Share by Platform** (Pie Chart)
   - Event: `easter_egg_shared`
   - Group by: `platform`

3. **Average Feedback Rating** (Number)
   - Event: `easter_egg_feedback_submitted`
   - Average of `rating` property

4. **Favorite Easter Eggs** (Bar Chart)
   - Event: `easter_egg_feedback_submitted`
   - Group by: `favorite_egg`
   - Filter: `favorite_egg != 'none'`

## Key Performance Indicators (KPIs)

### Success Metrics

| Metric               | Target | Actual | Status |
| -------------------- | ------ | ------ | ------ |
| Discovery Rate (30d) | >10%   | TBD    | ⏳     |
| Master Rate (90d)    | >2%    | TBD    | ⏳     |
| Average Rating       | >4.0   | TBD    | ⏳     |
| Share Conversion     | >5%    | TBD    | ⏳     |
| Retention Lift       | +10%   | TBD    | ⏳     |

### Analysis Schedule

- **Daily:** Monitor discovery counts and activation frequency
- **Weekly:** Review engagement metrics and user feedback
- **Monthly:** Analyze retention impact and update targets
- **Quarterly:** Comprehensive review and easter egg strategy adjustment

## Analysis Questions

### Discovery Analysis

1. **Which eggs are hardest to discover?**
   - Look at discovery rate by egg
   - Consider adding more hints for low-discovery eggs

2. **How long does it take users to find all 5?**
   - Analyze time between first and last discovery
   - Identify speed runners vs casual explorers

3. **Do hints increase discovery rate?**
   - Compare discovery rates before/after hint implementation
   - A/B test hint timing and content

### Engagement Analysis

4. **Do easter eggs increase session duration?**
   - Compare session length for users who discovered eggs vs those who didn't
   - Look at time spent during egg activation

5. **Do users replay easter eggs?**
   - Look at activation_count in database
   - Identify most replayed eggs

6. **What happens after egg discovery?**
   - Track next actions after easter_egg_discovered
   - Measure if it leads to feature exploration

### Impact Analysis

7. **Do easter eggs improve retention?**
   - Compare 7-day, 30-day retention for discoverers vs non-discoverers
   - Control for user cohort and signup date

8. **Do easter eggs drive viral growth?**
   - Track share_count and resulting signups from shared links
   - Calculate viral coefficient

9. **What do users think?**
   - Review feedback ratings and suggestions
   - Identify opportunities for new easter eggs

## Recommended Actions Based on Metrics

### If Discovery Rate < 10%

- Add more prominent hints
- Improve hint timing (show earlier)
- Create tutorial easter egg for first-time users
- Add "easter egg challenge" onboarding step

### If Master Rate < 2%

- Simplify egg activation sequences
- Provide progressive hints (reveal more over time)
- Add achievement progress indicator
- Create social incentive (leaderboard)

### If Average Rating < 4.0

- Review negative feedback for patterns
- Improve egg effects (make them more impressive)
- Add user-requested easter eggs
- Fix bugs in activation logic

### If Share Conversion < 5%

- Make share button more prominent
- Add incentive for sharing (bonus egg?)
- Improve share message copy
- Add more share platforms (LinkedIn, Reddit)

### If Retention Lift < 10%

- Increase egg "stickiness" (make effects longer)
- Add progression system (unlock new eggs)
- Create easter egg events (limited time)
- Integrate eggs deeper into core features

## Database Queries

### Get User's Easter Egg Progress

```sql
SELECT
  u.id,
  u.email,
  COUNT(DISTINCT e.egg_id) as eggs_discovered,
  MIN(e.discovered_at) as first_discovery,
  MAX(e.discovered_at) as last_discovery,
  SUM(e.activation_count) as total_activations,
  ARRAY_AGG(DISTINCT e.egg_id ORDER BY e.egg_id) as eggs_found
FROM users u
LEFT JOIN easter_egg_achievements e ON u.id = e.user_id
WHERE u.id = '<user_id>'
GROUP BY u.id, u.email;
```

### Leaderboard Query (already in migration)

```sql
SELECT * FROM easter_egg_leaderboard
ORDER BY eggs_discovered DESC, discovery_duration ASC
LIMIT 100;
```

### Easter Egg Performance Summary

```sql
SELECT
  egg_id,
  COUNT(DISTINCT user_id) as unique_discoverers,
  SUM(activation_count) as total_activations,
  AVG(activation_count) as avg_activations_per_user,
  SUM(total_duration_ms) as total_duration_ms,
  AVG(total_duration_ms) as avg_duration_per_user,
  COUNT(CASE WHEN shared THEN 1 END) as share_count
FROM easter_egg_achievements
GROUP BY egg_id
ORDER BY unique_discoverers DESC;
```

## A/B Testing Ideas

1. **Hint Timing Test**
   - A: Show hints after 30 days
   - B: Show hints after 7 days
   - Metric: Discovery rate

2. **Share Incentive Test**
   - A: No incentive for sharing
   - B: Unlock bonus easter egg after sharing
   - Metric: Share conversion rate

3. **Feedback Collection Test**
   - A: Show feedback after all 5 eggs
   - B: Show feedback after each egg
   - Metric: Feedback submission rate

4. **Progress Indicator Test**
   - A: No progress indicator
   - B: Floating progress indicator
   - Metric: Master achievement rate

## Next Steps

1. **Baseline Phase (Weeks 1-4)**
   - Collect initial data
   - Establish baseline metrics
   - Identify early trends

2. **Optimization Phase (Weeks 5-8)**
   - Implement hint system
   - A/B test improvements
   - Adjust based on feedback

3. **Expansion Phase (Weeks 9-12)**
   - Add new easter eggs based on suggestions
   - Create seasonal easter eggs
   - Build community around discoveries

4. **Iteration Phase (Ongoing)**
   - Monthly metric reviews
   - Quarterly easter egg refreshes
   - Continuous improvement based on data

## Reporting Template

### Weekly Easter Egg Report

**Week of [DATE]**

**Discovery Metrics:**

- New discoverers: [X]
- Total Master users: [X]
- Discovery rate: [X]%

**Engagement Metrics:**

- Total activations: [X]
- Avg activations per user: [X]
- Most popular egg: [EGG_NAME]

**Social Metrics:**

- Total shares: [X]
- Share conversion: [X]%
- New users from shares: [X]

**Feedback:**

- Feedback submissions: [X]
- Average rating: [X]/5
- Top suggestion: [SUGGESTION]

**Key Insights:**

- [INSIGHT 1]
- [INSIGHT 2]

**Action Items:**

- [ACTION 1]
- [ACTION 2]

---

_This dashboard is a living document. Update metrics targets and queries as needed based on product evolution._
