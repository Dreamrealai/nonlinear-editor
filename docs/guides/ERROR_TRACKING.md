# Error Tracking Guide

**Last Updated:** 2025-10-24
**Version:** 1.0.0

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Error Tracking Services](#error-tracking-services)
4. [Usage Patterns](#usage-patterns)
5. [Error Context & Breadcrumbs](#error-context--breadcrumbs)
6. [Axiom Integration](#axiom-integration)
7. [Sentry Integration](#sentry-integration)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Best Practices](#best-practices)

## Overview

The application uses a dual error tracking approach:

- **Axiom**: Structured logging and analytics (all environments)
- **Sentry**: Error tracking and monitoring (optional, production)

This guide explains how to effectively track, monitor, and debug errors in production.

## Architecture

### Error Tracking Flow

```
┌─────────────────┐
│  Application    │
│  (Client/Server)│
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         v                  v
┌────────────────┐   ┌──────────────┐
│ browserLogger  │   │ serverLogger │
│ (Client-side)  │   │ (Server-side)│
└────────┬───────┘   └──────┬───────┘
         │                  │
         ├──────────┬───────┤
         │          │       │
         v          v       v
    ┌────────┐  ┌──────────────┐
    │ Axiom  │  │    Sentry    │
    │ Logs   │  │ Error Track  │
    └────────┘  └──────────────┘
         │            │
         v            v
    ┌────────────────────────┐
    │   Monitoring & Alerts  │
    │  - Dashboards          │
    │  - Slack/Email         │
    │  - PagerDuty           │
    └────────────────────────┘
```

### Components

1. **browserLogger**: Client-side logging to Axiom
   - Automatic error capture (uncaught errors, unhandled rejections)
   - Manual error tracking with context
   - Web Vitals monitoring
   - Session tracking

2. **serverLogger**: Server-side logging to Axiom
   - Pino-based structured logging
   - Automatic batching and flushing
   - Sentry integration for errors

3. **errorTracking**: Error tracking utilities
   - Error classification (category, severity)
   - Context enrichment
   - Performance tracking
   - User action tracking

4. **sentryService**: Sentry integration (optional)
   - Error capture with breadcrumbs
   - User context tracking
   - Performance monitoring
   - Release tracking

## Error Tracking Services

### Axiom

**Purpose:** Structured logging and analytics

**Features:**

- Real-time log ingestion
- APL query language for analysis
- Dashboard creation
- Alerting and notifications
- Long-term log retention

**Configuration:**

```bash
# .env.local
AXIOM_TOKEN=your_axiom_token_here
AXIOM_DATASET=genai-video-production
```

**Setup:** See [AXIOM_SETUP.md](../AXIOM_SETUP.md)

### Sentry (Optional)

**Purpose:** Error tracking and monitoring

**Features:**

- Error grouping and deduplication
- Source maps for stack traces
- Performance monitoring
- Release tracking
- User feedback

**Configuration:**

```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_AUTH_TOKEN=your_sentry_auth_token_here
```

**Note:** Sentry is optional. If not configured, all error tracking will use Axiom only.

## Usage Patterns

### Client-Side Error Tracking

#### Basic Error Logging

```typescript
import { browserLogger } from '@/lib/browserLogger';

try {
  await saveProject(project);
} catch (error) {
  browserLogger.error({ error, projectId: project.id }, 'Failed to save project');
  throw error; // Re-throw if caller needs to handle
}
```

#### With Error Classification

```typescript
import { trackError, ErrorCategory, ErrorSeverity } from '@/lib/errorTracking';

try {
  await generateVideo(params);
} catch (error) {
  trackError(error, {
    category: ErrorCategory.EXTERNAL_SERVICE,
    severity: ErrorSeverity.HIGH,
    userId: user.id,
    context: {
      service: 'fal-ai',
      operation: 'video_generation',
      params: { model: 'sora-2', duration: 10 },
    },
  });

  // Show error to user
  toast.error('Failed to generate video. Please try again.');
}
```

#### With User Actions

```typescript
import { trackAction } from '@/lib/errorTracking';

function handleExport() {
  trackAction('export_video', {
    projectId: project.id,
    format: 'mp4',
    resolution: '1920x1080',
  });

  try {
    await exportVideo(project);
    trackAction('export_success', { projectId: project.id });
  } catch (error) {
    trackError(error, {
      category: ErrorCategory.CLIENT,
      severity: ErrorSeverity.MEDIUM,
      context: { projectId: project.id },
    });
    trackAction('export_failed', { projectId: project.id });
  }
}
```

### Server-Side Error Tracking

#### API Route Error Handling

```typescript
import { serverLogger } from '@/lib/serverLogger';
import { withAuth } from '@/lib/api/withAuth';
import { errorResponse, successResponse } from '@/lib/api/response';

export const POST = withAuth(async (req, { user, supabase }) => {
  try {
    const body = await req.json();

    // Business logic
    const result = await createProject(body, user.id);

    serverLogger.info({ userId: user.id, projectId: result.id }, 'Project created successfully');

    return successResponse(result);
  } catch (error) {
    // Log error with context
    serverLogger.error(
      {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : error,
        userId: user.id,
        body: req.body,
      },
      'Failed to create project'
    );

    // Return safe error response
    return errorResponse('Failed to create project', 500);
  }
});
```

#### Service Layer Error Handling

```typescript
import { serverLogger } from '@/lib/serverLogger';

export class ProjectService {
  private logger = serverLogger.child({ service: 'ProjectService' });

  async createProject(data: CreateProjectInput, userId: string) {
    this.logger.info({ userId, data }, 'Creating project');

    try {
      const project = await this.db.insert(data);

      this.logger.info({ userId, projectId: project.id }, 'Project created successfully');

      return project;
    } catch (error) {
      this.logger.error({ error, userId, data }, 'Failed to create project');
      throw error;
    }
  }
}
```

### Error Categories

Use appropriate error categories for better organization:

```typescript
export enum ErrorCategory {
  /** Client-side errors (React, browser APIs) */
  CLIENT = 'client',

  /** API route errors */
  API = 'api',

  /** External service errors (Google, FAL, ElevenLabs, etc.) */
  EXTERNAL_SERVICE = 'external_service',

  /** Database/Supabase errors */
  DATABASE = 'database',

  /** Authentication/authorization errors */
  AUTH = 'auth',

  /** Validation errors */
  VALIDATION = 'validation',

  /** Network/timeout errors */
  NETWORK = 'network',

  /** Unknown/uncategorized errors */
  UNKNOWN = 'unknown',
}
```

### Error Severity Levels

Use appropriate severity levels for prioritization:

```typescript
export enum ErrorSeverity {
  /** Critical errors that break core functionality */
  CRITICAL = 'critical',

  /** Errors that impact user experience */
  HIGH = 'high',

  /** Errors that are recoverable */
  MEDIUM = 'medium',

  /** Minor errors, warnings */
  LOW = 'low',
}
```

## Error Context & Breadcrumbs

### Adding Context to Errors

Context helps understand the circumstances of an error:

```typescript
trackError(error, {
  category: ErrorCategory.EXTERNAL_SERVICE,
  severity: ErrorSeverity.HIGH,
  userId: user.id,
  projectId: project.id,
  context: {
    // Operation details
    operation: 'video_generation',
    service: 'fal-ai',
    model: 'sora-2',

    // Request details
    requestId: 'req_123',
    timestamp: new Date().toISOString(),

    // User environment
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,

    // Application state
    timelineItems: timeline.items.length,
    projectDuration: project.duration,
  },
  tags: ['video-generation', 'fal-ai'],
});
```

### Using Breadcrumbs (Sentry)

Breadcrumbs track the user's journey leading to an error:

```typescript
import { sentryService } from '@/lib/services/sentryService';

function VideoEditor() {
  useEffect(() => {
    // Track page load
    sentryService.addBreadcrumb({
      message: 'Video editor loaded',
      category: 'navigation',
      level: 'info',
      data: { projectId: project.id },
    });
  }, []);

  function handleTimelineChange() {
    // Track user actions
    sentryService.addBreadcrumb({
      message: 'Timeline modified',
      category: 'user-action',
      level: 'info',
      data: {
        itemCount: timeline.items.length,
        duration: timeline.duration,
      },
    });

    try {
      saveTimeline(timeline);
    } catch (error) {
      // Error will include all breadcrumbs
      trackError(error, {
        category: ErrorCategory.CLIENT,
        context: { projectId: project.id },
      });
    }
  }
}
```

### Correlation IDs

Use correlation IDs to trace requests across services:

```typescript
import { browserLogger, generateCorrelationId } from '@/lib/browserLogger';

async function apiCall(endpoint: string, data: any) {
  const correlationId = generateCorrelationId();

  // Set correlation ID for this operation
  browserLogger.setCorrelationId(correlationId);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // Error log will include correlation ID
    browserLogger.error({ error, endpoint, correlationId }, 'API call failed');
    throw error;
  } finally {
    // Clear correlation ID
    browserLogger.clearCorrelationId();
  }
}
```

## Axiom Integration

### Query Examples

#### Find All Errors

```apl
['logs']
| where ['level'] == 'error'
| project _time, message, ['data.error.message'], ['data.userId'], ['data.category']
| order by _time desc
| take 100
```

#### Errors by Category

```apl
['logs']
| where ['level'] == 'error'
| summarize error_count=count() by ['data.category'], bin(_time, 1h)
| order by _time desc
```

#### User-Specific Errors

```apl
['logs']
| where ['level'] == 'error' and ['data.userId'] == 'user_123'
| project _time, message, ['data.error.message'], ['data.context']
| order by _time desc
```

#### External Service Failures

```apl
['logs']
| where ['data.category'] == 'external_service' and ['level'] == 'error'
| summarize failures=count() by ['data.context.service'], bin(_time, 15m)
| order by failures desc
```

#### Error Rate Over Time

```apl
['logs']
| where ['level'] == 'error'
| summarize
    total_errors = count(),
    unique_users = dcount(['data.userId']),
    unique_projects = dcount(['data.projectId'])
  by bin(_time, 5m)
| order by _time desc
```

### Creating Dashboards

Create an "Error Monitoring" dashboard in Axiom:

#### Widget 1: Error Rate (Line Chart)

```apl
['logs']
| where ['level'] in ('error', 'fatal')
| summarize error_count=count() by bin(_time, 5m)
| order by _time asc
```

#### Widget 2: Errors by Category (Pie Chart)

```apl
['logs']
| where ['level'] == 'error' and _time > ago(24h)
| summarize count() by ['data.category']
```

#### Widget 3: Top Errors (Table)

```apl
['logs']
| where ['level'] == 'error' and _time > ago(24h)
| summarize
    count=count(),
    unique_users=dcount(['data.userId']),
    first_seen=min(_time),
    last_seen=max(_time)
  by ['data.error.message']
| order by count desc
| take 20
```

#### Widget 4: Error Severity Distribution (Bar Chart)

```apl
['logs']
| where ['level'] == 'error' and _time > ago(24h)
| summarize count() by ['data.severity']
| order by count desc
```

### Setting Up Alerts

#### High Error Rate Alert

**Query:**

```apl
['logs']
| where ['level'] == 'error'
| summarize error_count=count() by bin(_time, 5m)
| where error_count > 10
```

**Threshold:** More than 10 errors in 5 minutes
**Action:** Alert via Slack/Email
**Priority:** High

#### Critical Error Alert

**Query:**

```apl
['logs']
| where ['data.severity'] == 'critical'
| summarize critical_count=count() by bin(_time, 5m)
| where critical_count > 0
```

**Threshold:** Any critical error
**Action:** Alert via PagerDuty
**Priority:** Critical

#### External Service Failure Alert

**Query:**

```apl
['logs']
| where ['data.category'] == 'external_service' and ['level'] == 'error'
| summarize failures=count() by ['data.context.service'], bin(_time, 15m)
| where failures > 5
```

**Threshold:** More than 5 failures per service in 15 minutes
**Action:** Alert via Slack
**Priority:** Medium

## Sentry Integration

### Configuring User Context

Track users for better error attribution:

```typescript
import { sentryService } from '@/lib/services/sentryService';

function useUserContext() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      sentryService.setUser({
        id: user.id,
        email: user.email,
        username: user.user_metadata?.full_name,
        subscription: user.subscription_tier,
      });
    } else {
      sentryService.clearContext();
    }
  }, [user]);
}
```

### Performance Monitoring

Track performance spans:

```typescript
import { sentryService } from '@/lib/services/sentryService';

async function exportVideo(project: Project) {
  return sentryService.startSpan('export_video', 'function', async () => {
    // Expensive operation
    const result = await processVideo(project);
    return result;
  });
}
```

### Release Tracking

Track errors by release version:

```bash
# sentry.properties
defaults.org=your-org
defaults.project=genai-video-production

[auth]
token=YOUR_SENTRY_AUTH_TOKEN
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  environment: process.env.NODE_ENV,
});
```

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Error Rate**: Total errors per time period
2. **Error Rate by Category**: Errors grouped by type
3. **Unique Error Messages**: Number of distinct errors
4. **Affected Users**: Users experiencing errors
5. **Error Severity**: Critical vs. high vs. medium
6. **External Service Health**: Third-party API failures
7. **Response Time P95**: Performance degradation indicator

### Alert Configuration

#### Slack Notifications

Configure Slack webhook in Axiom:

```json
{
  "channel": "#alerts",
  "username": "Axiom Alerts",
  "icon_emoji": ":warning:",
  "text": "Error rate spike detected",
  "attachments": [
    {
      "color": "danger",
      "fields": [
        {
          "title": "Error Count",
          "value": "{{error_count}}",
          "short": true
        },
        {
          "title": "Time Window",
          "value": "Last 5 minutes",
          "short": true
        }
      ]
    }
  ]
}
```

#### Email Notifications

Configure email in Axiom monitor settings:

- **Recipients**: dev-team@company.com, oncall@company.com
- **Subject**: `[ALERT] Error rate spike in genai-video-production`
- **Priority**: Based on severity

#### PagerDuty Integration

For critical alerts that require immediate attention:

1. Create PagerDuty integration in Axiom
2. Map severity levels to PagerDuty urgency
3. Configure escalation policies
4. Test integration

## Best Practices

### 1. Error Classification

Always classify errors appropriately:

```typescript
// Good - Specific category and severity
trackError(error, {
  category: ErrorCategory.EXTERNAL_SERVICE,
  severity: ErrorSeverity.HIGH,
  context: { service: 'fal-ai' },
});

// Bad - Generic classification
trackError(error, {
  category: ErrorCategory.UNKNOWN,
  severity: ErrorSeverity.MEDIUM,
});
```

### 2. Context Enrichment

Provide actionable context:

```typescript
// Good - Rich context
trackError(error, {
  category: ErrorCategory.DATABASE,
  userId: user.id,
  context: {
    operation: 'update_project',
    projectId: project.id,
    attemptCount: retryCount,
    query: 'UPDATE projects SET...',
    connectionPoolSize: pool.size,
  },
});

// Bad - Minimal context
trackError(error, {
  category: ErrorCategory.DATABASE,
});
```

### 3. Avoid Sensitive Data

Never log sensitive information:

```typescript
// Bad - Logs password
trackError(error, {
  context: {
    email: user.email,
    password: password, // ❌ NEVER log passwords
    creditCard: cardNumber, // ❌ NEVER log credit cards
  },
});

// Good - Logs only safe data
trackError(error, {
  context: {
    email: user.email,
    userId: user.id,
    // No sensitive data
  },
});
```

### 4. Error Grouping

Use consistent error messages for better grouping:

```typescript
// Good - Consistent format
throw new Error(`Failed to generate video: ${reason}`);

// Bad - Variable format (causes fragmentation)
throw new Error(`Video generation failed at ${new Date()} because ${reason}`);
```

### 5. Performance Tracking

Track performance alongside errors:

```typescript
import { trackPerformance } from '@/lib/errorTracking';

async function exportVideo(project: Project) {
  const startTime = performance.now();

  try {
    const result = await processVideo(project);

    const duration = performance.now() - startTime;
    trackPerformance('export_video', duration, {
      projectId: project.id,
      itemCount: project.items.length,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    trackError(error, {
      category: ErrorCategory.CLIENT,
      context: {
        projectId: project.id,
        duration,
      },
    });
    throw error;
  }
}
```

### 6. Sampling for High-Volume Events

Sample high-frequency events to reduce log volume:

```typescript
// Sample 10% of info logs
if (Math.random() < 0.1) {
  browserLogger.info({ action: 'timeline_scroll' }, 'User scrolled timeline');
}

// Always log errors (no sampling)
browserLogger.error({ error }, 'Failed to save');
```

### 7. Error Recovery

Track recovery attempts:

```typescript
async function saveWithRetry(data: any, maxRetries = 3) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      const result = await save(data);

      if (attempt > 1) {
        // Log successful retry
        browserLogger.info({ attempt, maxRetries }, 'Save succeeded after retry');
      }

      return result;
    } catch (error) {
      if (attempt >= maxRetries) {
        trackError(error, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.HIGH,
          context: {
            attempts: attempt,
            maxRetries,
            data,
          },
        });
        throw error;
      }

      // Log retry attempt
      browserLogger.warn({ attempt, maxRetries, error }, 'Save failed, retrying');

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}
```

### 8. Testing Error Tracking

Test error tracking in development:

```typescript
// Test client-side error tracking
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore - Testing only
  window.testError = () => {
    trackError(new Error('Test error'), {
      category: ErrorCategory.CLIENT,
      severity: ErrorSeverity.LOW,
      context: { test: true },
    });
  };
}

// Trigger with: window.testError()
```

### 9. Error Budget

Define and monitor error budget:

```typescript
// Target: 99.9% success rate
// Allowed error rate: 0.1%

// Query to check error budget:
const errorBudgetQuery = `
['logs']
| where _time > ago(30d)
| summarize
    total_requests = countif(['type'] == 'request'),
    failed_requests = countif(['level'] == 'error' and ['type'] == 'request')
| extend
    error_rate = (failed_requests * 100.0) / total_requests,
    success_rate = 100.0 - error_rate
| project success_rate, error_rate, total_requests, failed_requests
`;
```

### 10. Documentation

Document known errors and solutions:

```typescript
/**
 * Handle video generation errors
 *
 * Common errors:
 * - FAL_API_QUOTA_EXCEEDED: User exceeded API quota
 *   Solution: Upgrade subscription or wait for quota reset
 *
 * - FAL_API_TIMEOUT: Generation took too long
 *   Solution: Reduce video duration or complexity
 *
 * - NETWORK_ERROR: Network connectivity issue
 *   Solution: Retry with exponential backoff
 */
async function handleVideoGeneration(params: VideoGenParams) {
  try {
    return await generateVideo(params);
  } catch (error) {
    const errorCode = getErrorCode(error);

    switch (errorCode) {
      case 'FAL_API_QUOTA_EXCEEDED':
        trackError(error, {
          category: ErrorCategory.EXTERNAL_SERVICE,
          severity: ErrorSeverity.MEDIUM,
          context: { errorCode, userId: params.userId },
        });
        throw new QuotaExceededError('API quota exceeded');

      case 'FAL_API_TIMEOUT':
        trackError(error, {
          category: ErrorCategory.EXTERNAL_SERVICE,
          severity: ErrorSeverity.HIGH,
          context: { errorCode, duration: params.duration },
        });
        throw new TimeoutError('Generation timed out');

      default:
        trackError(error, {
          category: ErrorCategory.EXTERNAL_SERVICE,
          severity: ErrorSeverity.HIGH,
          context: { errorCode, params },
        });
        throw error;
    }
  }
}
```

## Resources

### Documentation

- [Axiom Setup Guide](../AXIOM_SETUP.md)
- [Axiom APL Documentation](https://axiom.co/docs/apl/introduction)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Error Handling Best Practices](https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript)

### Internal Resources

- [browserLogger.ts](../../lib/browserLogger.ts) - Client-side logging
- [serverLogger.ts](../../lib/serverLogger.ts) - Server-side logging
- [errorTracking.ts](../../lib/errorTracking.ts) - Error tracking utilities
- [sentryService.ts](../../lib/services/sentryService.ts) - Sentry integration

### Tools

- [Axiom Dashboard](https://app.axiom.co/)
- [Sentry Dashboard](https://sentry.io/)
- [Axiom CLI](https://github.com/axiomhq/cli)

---

**Next Steps:**

1. Configure Axiom and Sentry (if desired)
2. Set up error monitoring dashboards
3. Configure alerts for critical errors
4. Review and improve error classification
5. Test error tracking in staging environment
