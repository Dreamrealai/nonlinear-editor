# Analytics and Monitoring Guide

> **Comprehensive guide to analytics, telemetry, and error tracking in the non-linear video editor.**

**Last Updated:** October 24, 2025
**Target Audience:** Developers and Product Managers

---

## Table of Contents

1. [Overview](#overview)
2. [Error Tracking with Sentry](#error-tracking-with-sentry)
3. [Analytics with PostHog](#analytics-with-posthog)
4. [Performance Monitoring](#performance-monitoring)
5. [User Behavior Tracking](#user-behavior-tracking)
6. [Feature Flags](#feature-flags)
7. [Privacy and Compliance](#privacy-and-compliance)
8. [Setup and Configuration](#setup-and-configuration)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This application uses a two-tier approach to observability:

1. **Error Tracking (Sentry):** Captures errors, exceptions, and performance issues
2. **Product Analytics (PostHog):** Tracks user behavior, feature usage, and product metrics

Both systems are privacy-focused and GDPR-compliant.

### Key Features

- **Automatic error capture** on client and server
- **Breadcrumb tracking** for error context
- **Performance monitoring** for API routes and user interactions
- **Session replay** (opt-in) for debugging
- **User flow analysis** to understand product usage
- **Feature flags** for A/B testing and gradual rollouts
- **Real-time dashboards** for monitoring

---

## Error Tracking with Sentry

### What is Sentry?

Sentry is an error tracking and performance monitoring platform that helps identify, triage, and resolve issues in production.

**Location:** `/lib/sentry.ts`

### Configuration

Sentry is configured in three locations:

1. **Client-side:** `/sentry.client.config.ts`
2. **Server-side:** `/sentry.server.config.ts`
3. **Edge Runtime:** `/sentry.edge.config.ts`

### Basic Usage

#### Capturing Errors

```typescript
import { captureError } from '@/lib/sentry';

try {
  await generateVideo(params);
} catch (error) {
  captureError(error, {
    tags: { operation: 'video_generation', provider: 'fal' },
    context: { projectId: project.id, userId: user.id },
    level: 'error',
  });
  throw error; // Re-throw if needed
}
```

#### Adding Breadcrumbs

Breadcrumbs provide context leading up to an error:

```typescript
import { addBreadcrumb, BreadcrumbCategory } from '@/lib/sentry';

// Track user action
addBreadcrumb({
  message: 'User clicked generate video button',
  category: BreadcrumbCategory.VIDEO,
  data: {
    prompt: 'A cat playing piano',
    duration: 5,
    aspectRatio: '16:9',
  },
});

// Track API call
addBreadcrumb({
  message: 'Calling FAL API',
  category: BreadcrumbCategory.API,
  level: 'info',
  data: {
    endpoint: '/fal/video/generate',
    method: 'POST',
  },
});
```

#### Setting User Context

Associate errors with specific users:

```typescript
import { setUserContext } from '@/lib/sentry';

// After user authentication
setUserContext({
  id: user.id,
  email: user.email,
  subscription: userProfile.tier,
  createdAt: user.created_at,
});

// Clear on logout
import { clearUserContext } from '@/lib/sentry';
clearUserContext();
```

### Advanced Features

#### Custom Tags

Tags help filter and group errors in Sentry:

```typescript
import { setTags, OperationTags } from '@/lib/sentry';

setTags({
  operation: OperationTags.VIDEO_GENERATION,
  provider: 'fal',
  model: 'minimax-video-01',
  environment: process.env.NODE_ENV,
});
```

#### Custom Context

Add additional metadata to errors:

```typescript
import { setContext } from '@/lib/sentry';

setContext('video_generation', {
  prompt: params.prompt,
  duration: params.duration,
  aspectRatio: params.aspectRatio,
  seed: params.seed,
  estimatedCost: calculateCost(params),
});
```

#### Performance Monitoring

Track operation performance:

```typescript
import { startTransaction } from '@/lib/sentry';

const transaction = startTransaction({
  name: 'video_generation',
  op: 'ai.generate',
  data: { provider: 'fal', model: 'minimax-video-01' },
});

try {
  const result = await generateVideo(params);
  transaction?.setStatus('ok');
  return result;
} catch (error) {
  transaction?.setStatus('error');
  throw error;
} finally {
  transaction?.finish();
}
```

#### Error Wrapping

Automatically track errors in functions:

```typescript
import { withErrorTracking } from '@/lib/sentry';

const safeGenerateVideo = withErrorTracking(
  async (params) => {
    return await generateVideo(params);
  },
  {
    tags: { operation: 'video_generation' },
    context: { feature: 'ai-video' },
  }
);

// Errors are automatically captured and reported
const result = await safeGenerateVideo(params);
```

### Error Categories

Use consistent error types for better filtering:

```typescript
import { ErrorTypes, captureError } from '@/lib/sentry';

// Validation error
captureError(new Error('Invalid prompt'), {
  tags: { errorType: ErrorTypes.VALIDATION },
  level: 'warning',
});

// Authentication error
captureError(new Error('Session expired'), {
  tags: { errorType: ErrorTypes.AUTHENTICATION },
  level: 'error',
});

// External service error
captureError(new Error('FAL API timeout'), {
  tags: { errorType: ErrorTypes.EXTERNAL_SERVICE, provider: 'fal' },
  level: 'error',
});
```

### API Request Tracking

Track API requests for debugging:

```typescript
import { trackAPIRequest } from '@/lib/sentry';

const startTime = Date.now();

try {
  const response = await fetch('/api/video/generate', options);
  const duration = Date.now() - startTime;

  trackAPIRequest({
    method: 'POST',
    endpoint: '/api/video/generate',
    status: response.status,
    duration,
    userId: user.id,
  });
} catch (error) {
  trackAPIRequest({
    method: 'POST',
    endpoint: '/api/video/generate',
    status: 500,
    duration: Date.now() - startTime,
    userId: user.id,
    error: error.message,
  });
  throw error;
}
```

### Session Replay

Sentry can record user sessions for debugging (opt-in only):

**Configuration:**

```typescript
// sentry.client.config.ts
replaysSessionSampleRate: 0.0,        // Don't record all sessions (privacy)
replaysOnErrorSampleRate: 0.1,        // Record 10% of sessions with errors
```

**Privacy Settings:**

```typescript
// Automatically masks sensitive data
Sentry.replayIntegration({
  maskAllText: true,        // Mask all text
  blockAllMedia: true,      // Block images and videos
})
```

---

## Analytics with PostHog

### What is PostHog?

PostHog is an open-source product analytics platform that helps understand user behavior and feature usage.

**Location:** `/lib/services/analyticsService.ts`

### Configuration

PostHog is initialized in the root layout via `PostHogProvider`:

```typescript
// app/layout.tsx
import { PostHogProvider } from '@/components/providers/PostHogProvider';

export default function RootLayout({ children }) {
  return (
    <PostHogProvider>
      {children}
    </PostHogProvider>
  );
}
```

### Basic Usage

#### Tracking Events

```typescript
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';

// Track video generation
analyticsService.track(AnalyticsEvents.VIDEO_GENERATED, {
  duration: 5,
  format: 'mp4',
  quality: 'high',
  provider: 'fal',
  model: 'minimax-video-01',
});

// Track custom event
analyticsService.track('feature_used', {
  feature: 'keyframe_editor',
  action: 'add_keyframe',
  elementType: 'position',
});
```

#### Identifying Users

Associate analytics events with users:

```typescript
import { analyticsService } from '@/lib/services/analyticsService';

// After user signs in
analyticsService.identify(user.id, {
  email: user.email,
  username: user.username,
  subscription: userProfile.tier,
  createdAt: user.created_at,
});

// Update user properties
analyticsService.setUserProperties({
  subscription: 'premium',
  lastActive: new Date().toISOString(),
});

// On logout
analyticsService.reset();
```

#### Page View Tracking

```typescript
import { analyticsService } from '@/lib/services/analyticsService';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

function usePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    analyticsService.trackPageView(pathname);
  }, [pathname]);
}
```

### Standard Events

The application defines standard events for consistency:

```typescript
export const AnalyticsEvents = {
  // Video events
  VIDEO_GENERATED: 'video_generated',
  VIDEO_EXPORT_STARTED: 'video_export_started',
  VIDEO_EXPORT_COMPLETED: 'video_export_completed',
  VIDEO_EXPORT_FAILED: 'video_export_failed',

  // Timeline events
  TIMELINE_EDIT: 'timeline_edit',
  TIMELINE_CUT: 'timeline_cut',
  TIMELINE_TRIM: 'timeline_trim',
  TIMELINE_REORDER: 'timeline_reorder',

  // Asset events
  ASSET_UPLOADED: 'asset_uploaded',
  ASSET_DELETED: 'asset_deleted',
  ASSET_REPLACED: 'asset_replaced',

  // Project events
  PROJECT_CREATED: 'project_created',
  PROJECT_OPENED: 'project_opened',
  PROJECT_SAVED: 'project_saved',
  PROJECT_DELETED: 'project_deleted',

  // User events
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  USER_UPGRADED: 'user_upgraded',

  // AI events
  AI_GENERATION_STARTED: 'ai_generation_started',
  AI_GENERATION_COMPLETED: 'ai_generation_completed',
  AI_GENERATION_FAILED: 'ai_generation_failed',

  // Performance events
  PAGE_LOAD: 'page_load',
  PAGE_ERROR: 'page_error',
  API_ERROR: 'api_error',
} as const;
```

**Usage:**

```typescript
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';

// Track project creation
analyticsService.track(AnalyticsEvents.PROJECT_CREATED, {
  projectId: project.id,
  templateUsed: false,
  timestamp: new Date().toISOString(),
});

// Track video export
analyticsService.track(AnalyticsEvents.VIDEO_EXPORT_STARTED, {
  projectId: project.id,
  format: 'mp4',
  resolution: '1080p',
  fps: 30,
});
```

---

## Performance Monitoring

### Web Vitals Tracking

The application automatically tracks Core Web Vitals:

```typescript
// components/WebVitals.tsx
import { useReportWebVitals } from 'next/web-vitals';
import { analyticsService } from '@/lib/services/analyticsService';

export function WebVitals() {
  useReportWebVitals((metric) => {
    analyticsService.track('web_vital', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  });

  return null;
}
```

**Metrics tracked:**

- **LCP (Largest Contentful Paint):** Loading performance
- **FID (First Input Delay):** Interactivity
- **CLS (Cumulative Layout Shift):** Visual stability
- **FCP (First Contentful Paint):** Initial render
- **TTFB (Time to First Byte):** Server response time

### Custom Performance Tracking

```typescript
import { trackPerformance } from '@/lib/errorTracking';

const startTime = performance.now();

await generateVideo(params);

const duration = performance.now() - startTime;

trackPerformance('video_generation', duration, {
  provider: 'fal',
  model: 'minimax-video-01',
  duration: params.duration,
});
```

---

## User Behavior Tracking

### User Actions

Track user interactions for product insights:

```typescript
import { trackUserAction, BreadcrumbCategory } from '@/lib/sentry';
import { analyticsService } from '@/lib/services/analyticsService';

function handleButtonClick() {
  // Track in Sentry (for error context)
  trackUserAction({
    action: 'generate_video_clicked',
    category: BreadcrumbCategory.VIDEO,
    data: { prompt: currentPrompt },
  });

  // Track in PostHog (for analytics)
  analyticsService.track('button_clicked', {
    button: 'generate_video',
    location: 'video_gen_page',
    prompt_length: currentPrompt.length,
  });

  generateVideo();
}
```

### Navigation Tracking

```typescript
import { trackNavigation } from '@/lib/sentry';
import { analyticsService } from '@/lib/services/analyticsService';
import { useRouter } from 'next/navigation';

function navigateToEditor(projectId: string) {
  const router = useRouter();

  // Track navigation (Sentry breadcrumb)
  trackNavigation({
    from: '/projects',
    to: `/editor/${projectId}`,
    userId: user.id,
  });

  // Track page view (PostHog)
  analyticsService.trackPageView(`/editor/${projectId}`, {
    projectId,
    source: 'projects_list',
  });

  router.push(`/editor/${projectId}`);
}
```

---

## Feature Flags

PostHog provides feature flags for A/B testing and gradual rollouts:

### Checking Feature Flags

```typescript
import { analyticsService } from '@/lib/services/analyticsService';

function VideoGenPage() {
  const newUIEnabled = analyticsService.isFeatureEnabled('new_video_ui');

  return (
    <div>
      {newUIEnabled ? <NewVideoUI /> : <OldVideoUI />}
    </div>
  );
}
```

### Getting Feature Flag Values

```typescript
const maxVideoDuration = analyticsService.getFeatureFlag('max_video_duration');

if (typeof maxVideoDuration === 'number') {
  validateDuration(duration, maxVideoDuration);
}
```

### Multivariate Flags

```typescript
const videoQuality = analyticsService.getFeatureFlag('video_quality_options');

if (videoQuality === 'high') {
  // High quality settings
} else if (videoQuality === 'medium') {
  // Medium quality settings
} else {
  // Default quality
}
```

---

## Privacy and Compliance

### GDPR Compliance

Both Sentry and PostHog are configured for GDPR compliance:

#### Sentry Privacy Settings

```typescript
// sentry.client.config.ts
Sentry.init({
  // Mask sensitive data in session replay
  replaysSessionSampleRate: 0.0,  // Don't record all sessions
  replaysOnErrorSampleRate: 0.1,  // Only 10% of error sessions

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,      // Mask all text content
      blockAllMedia: true,    // Block images and videos
    }),
  ],

  // Filter out sensitive errors
  beforeSend(event) {
    // Remove sensitive data from events
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['Cookie'];
    }
    return event;
  },
});
```

#### PostHog Privacy Settings

```typescript
// lib/services/analyticsService.ts
posthog.init(key, {
  api_host: host,

  // Privacy settings
  respect_dnt: true,  // Respect Do Not Track
  opt_out_capturing_by_default: false,

  // Session recording (disabled by default)
  session_recording: {
    maskAllInputs: true,      // Mask all input fields
    maskTextSelector: '*',    // Mask all text
    blockSelector: '[data-ph-no-capture]',  // Allow opt-out
  },

  // Manual tracking only
  autocapture: false,
  capture_pageview: false,
});
```

### User Opt-Out

Allow users to opt out of analytics:

```typescript
import { analyticsService } from '@/lib/services/analyticsService';

// Opt out
function handleOptOut() {
  analyticsService.optOut();
  toast.success('Analytics disabled');
}

// Opt in
function handleOptIn() {
  analyticsService.optIn();
  toast.success('Analytics enabled');
}

// Check status
const hasOptedOut = analyticsService.hasOptedOut();
```

### Data Retention

Configure data retention in PostHog and Sentry dashboards:

- **PostHog:** Settings > Data Management > Data Retention
- **Sentry:** Settings > Data Management > Data Scrubbing

---

## Setup and Configuration

### Environment Variables

```bash
# .env.local

# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx  # For source maps upload (CI/CD only)

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_POSTHOG_ENABLE_RECORDINGS=false  # Enable session recordings
```

### Sentry Setup

1. **Create Sentry Project:**
   - Go to https://sentry.io/
   - Create new project (Next.js)
   - Copy DSN

2. **Configure Environment:**
   - Add `NEXT_PUBLIC_SENTRY_DSN` to `.env.local`
   - Add `NEXT_PUBLIC_SENTRY_DSN` to Vercel environment variables

3. **Upload Source Maps (Optional):**
   - Create auth token in Sentry
   - Add `SENTRY_AUTH_TOKEN` to Vercel (production only)
   - Source maps uploaded automatically on build

4. **Configure Alerts:**
   - Set up alert rules in Sentry
   - Configure integrations (Slack, email, etc.)

### PostHog Setup

1. **Create PostHog Project:**
   - Go to https://posthog.com/ or self-host
   - Create new project
   - Copy project API key and host

2. **Configure Environment:**
   - Add `NEXT_PUBLIC_POSTHOG_KEY` to `.env.local`
   - Add `NEXT_PUBLIC_POSTHOG_HOST` to `.env.local`
   - Add same variables to Vercel

3. **Configure Features:**
   - Enable/disable session recordings
   - Set up feature flags
   - Configure funnels and insights

---

## Best Practices

### Error Tracking

1. **Add context to errors:**
   ```typescript
   captureError(error, {
     tags: { operation: 'video_generation' },
     context: { projectId, userId, params }
   });
   ```

2. **Use breadcrumbs for user flow:**
   ```typescript
   addBreadcrumb({ message: 'User clicked generate', category: 'ui' });
   addBreadcrumb({ message: 'Validating parameters', category: 'validation' });
   addBreadcrumb({ message: 'Calling FAL API', category: 'api' });
   ```

3. **Set user context after authentication:**
   ```typescript
   setUserContext({ id: user.id, email: user.email });
   ```

4. **Use consistent error types:**
   ```typescript
   tags: { errorType: ErrorTypes.EXTERNAL_SERVICE }
   ```

### Analytics Tracking

1. **Use standard event names:**
   ```typescript
   analyticsService.track(AnalyticsEvents.VIDEO_GENERATED, data);
   ```

2. **Track meaningful properties:**
   ```typescript
   analyticsService.track('video_generated', {
     duration, format, quality, provider, model,
     generation_time_ms: duration,
     user_tier: userProfile.tier
   });
   ```

3. **Identify users early:**
   ```typescript
   analyticsService.identify(user.id, { email, tier, createdAt });
   ```

4. **Track complete user flows:**
   ```typescript
   // Start of flow
   analyticsService.track('flow_started', { flow: 'video_generation' });

   // Steps
   analyticsService.track('flow_step', { flow: 'video_generation', step: 'parameters' });
   analyticsService.track('flow_step', { flow: 'video_generation', step: 'generation' });

   // Completion
   analyticsService.track('flow_completed', { flow: 'video_generation', duration_ms: elapsed });
   ```

### Performance

1. **Track critical operations:**
   ```typescript
   const transaction = startTransaction({ name: 'video_gen', op: 'ai.generate' });
   ```

2. **Measure user-facing metrics:**
   ```typescript
   trackPerformance('page_load', duration, { page: '/editor' });
   ```

3. **Monitor Web Vitals automatically** (already configured)

---

## Troubleshooting

### Sentry Issues

**Problem:** Errors not appearing in Sentry

**Solutions:**
1. Check `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Verify environment (production vs development)
3. Check Sentry quota limits
4. Verify `beforeSend` filter isn't blocking events

**Problem:** Too many events

**Solutions:**
1. Adjust sample rates in config
2. Add more filters to `beforeSend`
3. Use `ignoreErrors` to filter noise

### PostHog Issues

**Problem:** Events not tracking

**Solutions:**
1. Check `NEXT_PUBLIC_POSTHOG_KEY` is set
2. Verify `analyticsService.init()` is called
3. Check browser ad blockers
4. Verify `autocapture` is disabled (we use manual tracking)

**Problem:** Feature flags not working

**Solutions:**
1. Verify feature flag exists in PostHog dashboard
2. Check feature flag is enabled
3. Ensure user is identified: `analyticsService.identify(userId)`

---

## Additional Resources

### Documentation
- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [PostHog JavaScript SDK](https://posthog.com/docs/libraries/js)
- [Web Vitals Guide](https://web.dev/vitals/)

### Internal Files
- `/lib/sentry.ts` - Sentry utilities
- `/lib/services/analyticsService.ts` - PostHog analytics
- `/lib/errorTracking.ts` - Error tracking helpers
- `/components/WebVitals.tsx` - Web Vitals tracking

---

**Remember:** Good observability helps build better products. Track what matters, respect user privacy, and use data to make informed decisions.
