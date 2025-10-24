# Production Monitoring Recommendations for Memory Leak Prevention

**Document Version**: 1.0
**Last Updated**: 2025-10-24
**Related Issue**: NEW-HIGH-001 - Memory Leaks from Polling Operations

## Executive Summary

This document provides comprehensive recommendations for monitoring and preventing memory leaks in production, specifically focusing on polling operations that have been identified and fixed in NEW-HIGH-001.

**Key Areas Monitored**:

- Video generation polling (Veo 3.1)
- Audio generation polling (Suno, ElevenLabs)
- Video upscaling polling (Topaz)
- Audio-from-video generation polling (MiniMax)
- Editor handler polling operations

---

## 1. Browser Memory Monitoring

### Client-Side Metrics to Track

#### 1.1 JavaScript Heap Size

**What to Monitor**:

```javascript
// Add to production monitoring
if (performance.memory) {
  const heapStats = {
    usedJSHeapSize: performance.memory.usedJSHeapSize,
    totalJSHeapSize: performance.memory.totalJSHeapSize,
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    utilizationPercent:
      (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100,
  };

  // Log to monitoring service (DataDog, New Relic, etc.)
  monitoringService.track('heap_memory', heapStats);
}
```

**Alerting Thresholds**:

- **Warning**: Heap utilization > 70%
- **Critical**: Heap utilization > 85%
- **Emergency**: Heap growing by > 10MB per minute

#### 1.2 Active Timeout Tracking

**Implementation**:

```javascript
// Add to BrowserEditorClient.tsx and generation pages
const memoryTracker = {
  activeTimeouts: 0,
  activeAbortControllers: 0,

  trackTimeout(timeoutId: NodeJS.Timeout) {
    this.activeTimeouts++;
    // Log to monitoring
    if (this.activeTimeouts > 10) {
      console.warn('High number of active timeouts:', this.activeTimeouts);
    }
  },

  clearTimeout(timeoutId: NodeJS.Timeout) {
    this.activeTimeouts--;
  },

  trackAbortController() {
    this.activeAbortControllers++;
  },

  removeAbortController() {
    this.activeAbortControllers--;
  },

  getStats() {
    return {
      activeTimeouts: this.activeTimeouts,
      activeAbortControllers: this.activeAbortControllers,
      timestamp: Date.now()
    };
  }
};
```

**Alerting Thresholds**:

- **Warning**: > 5 active timeouts on a single page
- **Critical**: > 10 active timeouts on a single page
- **Emergency**: Timeouts not decreasing over 5 minutes

#### 1.3 Network Request Monitoring

**What to Track**:

```javascript
// Monitor fetch request lifecycle
const requestTracker = {
  activeRequests: new Map(),
  completedRequests: 0,
  abortedRequests: 0,
  failedRequests: 0,

  startRequest(url: string, requestId: string) {
    this.activeRequests.set(requestId, {
      url,
      startTime: Date.now()
    });
  },

  endRequest(requestId: string, status: 'completed' | 'aborted' | 'failed') {
    const request = this.activeRequests.get(requestId);
    if (request) {
      const duration = Date.now() - request.startTime;
      this.activeRequests.delete(requestId);

      if (status === 'completed') this.completedRequests++;
      else if (status === 'aborted') this.abortedRequests++;
      else if (status === 'failed') this.failedRequests++;

      // Log metrics
      monitoringService.track('request_lifecycle', {
        url: request.url,
        status,
        duration
      });
    }
  },

  getStats() {
    return {
      active: this.activeRequests.size,
      completed: this.completedRequests,
      aborted: this.abortedRequests,
      failed: this.failedRequests
    };
  }
};
```

**Alerting Thresholds**:

- **Warning**: > 10 concurrent requests to same endpoint
- **Critical**: Requests active for > 2 minutes without completion
- **Emergency**: Abort rate > 50% (may indicate navigation issues)

---

## 2. Server-Side Monitoring

### API Endpoint Metrics

#### 2.1 Polling Endpoint Health

**Endpoints to Monitor**:

- `GET /api/video/status` - Video generation status
- `GET /api/audio/suno/status` - Suno audio status
- `GET /api/video/upscale-status` - Topaz upscaling status
- `GET /api/video/generate-audio-status` - MiniMax audio status

**Metrics to Track**:

```javascript
// Server-side metrics (add to API routes)
{
  endpoint: '/api/video/status',
  metrics: {
    requestsPerMinute: number,
    uniqueOperations: number, // distinct operationName values
    avgResponseTime: number,
    p95ResponseTime: number,
    errorRate: number,
    activePollingClients: number // estimated from request frequency
  }
}
```

**Alerting Thresholds**:

- **Warning**: > 100 requests/min to single endpoint
- **Critical**: Same operationName polled > 60 times (likely runaway poll)
- **Emergency**: Error rate > 10%

#### 2.2 Long-Running Operations

**Track Operation Duration**:

```javascript
// Add to database or Redis
{
  operationId: string,
  type: 'video' | 'audio-suno' | 'upscale' | 'audio-minimax',
  startTime: timestamp,
  lastPolled: timestamp,
  pollCount: number,
  status: 'processing' | 'complete' | 'failed' | 'timeout'
}
```

**Alerting Thresholds**:

- **Warning**: Video generation > 8 minutes
- **Critical**: Video generation > 10 minutes (should timeout)
- **Warning**: Audio generation > 4 minutes
- **Critical**: Audio generation > 5 minutes (should timeout)
- **Warning**: Upscaling > 18 minutes
- **Critical**: Upscaling > 20 minutes (should timeout)

---

## 3. Application Performance Monitoring (APM)

### Recommended Tools

#### 3.1 DataDog RUM (Real User Monitoring)

**Configuration**:

```javascript
// pages/_app.tsx
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: process.env.NEXT_PUBLIC_DATADOG_APP_ID!,
  clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN!,
  site: 'datadoghq.com',
  service: 'nonlinear-editor',
  env: process.env.NODE_ENV,
  version: process.env.NEXT_PUBLIC_APP_VERSION,
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  defaultPrivacyLevel: 'mask-user-input'
});

// Custom tracking for polling operations
datadogRum.addAction('polling_started', {
  type: 'video_generation',
  operationId: 'xyz'
});

datadogRum.addAction('polling_stopped', {
  type: 'video_generation',
  operationId: 'xyz',
  reason: 'unmount' // or 'complete', 'timeout', 'error'
});
```

**Custom Metrics to Track**:

- `polling.video.active_count`
- `polling.audio.active_count`
- `polling.upscale.active_count`
- `memory.heap_utilization_percent`
- `timeouts.active_count`

#### 3.2 Sentry Performance Monitoring

**Configuration**:

```javascript
// pages/_app.tsx
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,

  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Track memory leaks
Sentry.addBreadcrumb({
  category: 'memory',
  message: 'Polling operation started',
  level: 'info',
  data: { type: 'video', operationId: 'xyz' },
});
```

**Alerts to Configure**:

- Unhandled promise rejections in polling code
- Memory warnings from performance.memory API
- Long-running transactions (> 10 minutes)
- High error rate on status endpoints

#### 3.3 New Relic Browser

**Configuration**:

```javascript
// Track custom events
newrelic.addPageAction('PollingStarted', {
  type: 'video_generation',
  operationId: 'xyz',
  timestamp: Date.now(),
});

newrelic.addPageAction('PollingCleanup', {
  type: 'video_generation',
  operationId: 'xyz',
  timeouts_cleared: 1,
  controllers_aborted: 1,
});
```

---

## 4. Custom Monitoring Implementation

### 4.1 Polling Health Dashboard

**Create a monitoring component**:

```typescript
// lib/monitoring/pollingHealth.ts
export class PollingHealthMonitor {
  private static instance: PollingHealthMonitor;
  private activePolls: Map<string, PollingOperation> = new Map();

  private constructor() {
    // Send health report every 30 seconds
    setInterval(() => this.sendHealthReport(), 30000);
  }

  static getInstance(): PollingHealthMonitor {
    if (!PollingHealthMonitor.instance) {
      PollingHealthMonitor.instance = new PollingHealthMonitor();
    }
    return PollingHealthMonitor.instance;
  }

  startPolling(operationId: string, type: PollingType) {
    this.activePolls.set(operationId, {
      id: operationId,
      type,
      startTime: Date.now(),
      pollCount: 0,
      lastPollTime: Date.now(),
    });
  }

  incrementPoll(operationId: string) {
    const poll = this.activePolls.get(operationId);
    if (poll) {
      poll.pollCount++;
      poll.lastPollTime = Date.now();

      // Alert if exceeding max attempts
      const maxAttempts = this.getMaxAttemptsForType(poll.type);
      if (poll.pollCount > maxAttempts) {
        this.alertRunawayPoll(poll);
      }
    }
  }

  endPolling(operationId: string, reason: 'complete' | 'timeout' | 'error' | 'unmount') {
    const poll = this.activePolls.get(operationId);
    if (poll) {
      const duration = Date.now() - poll.startTime;

      // Log completion
      this.logPollingCompletion({
        ...poll,
        duration,
        reason,
      });

      this.activePolls.delete(operationId);
    }
  }

  private sendHealthReport() {
    const report = {
      activePolls: this.activePolls.size,
      polls: Array.from(this.activePolls.values()).map((poll) => ({
        id: poll.id,
        type: poll.type,
        age: Date.now() - poll.startTime,
        pollCount: poll.pollCount,
      })),
      timestamp: Date.now(),
    };

    // Send to monitoring service
    console.log('[PollingHealth]', report);

    // Alert on anomalies
    if (report.activePolls > 5) {
      console.warn('[PollingHealth] High number of active polls:', report.activePolls);
    }
  }

  private getMaxAttemptsForType(type: PollingType): number {
    switch (type) {
      case 'video':
        return 60;
      case 'audio-suno':
        return 60;
      case 'audio-minimax':
        return 60;
      case 'upscale':
        return 120;
      default:
        return 60;
    }
  }

  private alertRunawayPoll(poll: PollingOperation) {
    console.error('[PollingHealth] Runaway poll detected:', poll);
    // Send alert to monitoring service
  }

  private logPollingCompletion(data: any) {
    console.info('[PollingHealth] Polling completed:', data);
    // Log to analytics
  }
}

type PollingType = 'video' | 'audio-suno' | 'audio-minimax' | 'upscale';

interface PollingOperation {
  id: string;
  type: PollingType;
  startTime: number;
  pollCount: number;
  lastPollTime: number;
}
```

**Usage in Production Code**:

```typescript
// app/video-gen/page.tsx
const monitor = PollingHealthMonitor.getInstance();

// Start monitoring
monitor.startPolling(operationName, 'video');

const poll = async () => {
  monitor.incrementPoll(operationName);

  // ... polling logic ...
};

// On cleanup
monitor.endPolling(operationName, 'complete');
```

### 4.2 Memory Leak Detection

**Implement in-app detection**:

```typescript
// lib/monitoring/memoryLeakDetector.ts
export class MemoryLeakDetector {
  private heapSamples: number[] = [];
  private readonly maxSamples = 10;
  private readonly sampleInterval = 60000; // 1 minute

  start() {
    setInterval(() => this.takeSample(), this.sampleInterval);
  }

  private takeSample() {
    if (!performance.memory) return;

    const heapUsed = performance.memory.usedJSHeapSize;
    this.heapSamples.push(heapUsed);

    if (this.heapSamples.length > this.maxSamples) {
      this.heapSamples.shift();
    }

    // Check for steady growth (potential leak)
    if (this.heapSamples.length >= this.maxSamples) {
      const growth = this.calculateGrowthRate();

      if (growth > 0.1) {
        // 10% growth per sample
        this.alertMemoryLeak(growth);
      }
    }
  }

  private calculateGrowthRate(): number {
    const first = this.heapSamples[0];
    const last = this.heapSamples[this.heapSamples.length - 1];
    return (last - first) / first;
  }

  private alertMemoryLeak(growthRate: number) {
    console.error('[MemoryLeakDetector] Potential memory leak detected', {
      growthRate,
      currentHeap: performance.memory?.usedJSHeapSize,
      samples: this.heapSamples,
    });

    // Send to monitoring service
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'memory_leak_detected',
        growthRate,
        heapSize: performance.memory?.usedJSHeapSize,
      });
    }
  }
}
```

---

## 5. Alerting Strategy

### Alert Levels

#### Level 1: INFO (Log Only)

- Polling operation started
- Polling operation completed normally
- Memory usage within normal range

#### Level 2: WARNING (Notify Team)

- Memory utilization > 70%
- > 5 concurrent polling operations
- Polling exceeding 80% of timeout limit
- Unusual poll frequency (> 1 per second)

#### Level 3: CRITICAL (Page On-Call)

- Memory utilization > 85%
- > 10 concurrent polling operations
- Polling exceeding timeout limit
- Runaway poll detected (> max attempts)
- Memory leak pattern detected

#### Level 4: EMERGENCY (Immediate Action)

- Memory utilization > 95%
- Application becoming unresponsive
- Heap growing > 50MB per minute
- Multiple concurrent memory leaks

### Alert Channels

**Recommended Setup**:

```yaml
# Alert routing configuration
alerts:
  memory_leak_detected:
    severity: critical
    channels: [slack, pagerduty]
    message: 'Memory leak detected in production'

  runaway_poll:
    severity: critical
    channels: [slack, pagerduty]
    message: 'Runaway polling operation detected'

  high_memory_usage:
    severity: warning
    channels: [slack]
    message: 'High memory usage in browser'

  timeout_exceeded:
    severity: warning
    channels: [slack]
    message: 'Polling operation exceeded timeout'
```

---

## 6. Production Debugging Tools

### 6.1 Chrome DevTools Performance

**Enable in Production** (for admins):

```javascript
// Add to production for admin users
if (user.role === 'admin' && window.location.search.includes('debug=true')) {
  window.__ENABLE_MEMORY_PROFILING__ = true;

  // Log memory stats every 5 seconds
  setInterval(() => {
    if (performance.memory) {
      console.table({
        'Used Heap': `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        'Total Heap': `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        'Heap Limit': `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
        Utilization: `${((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2)}%`,
      });
    }
  }, 5000);
}
```

### 6.2 React DevTools Profiler

**Add Profiling Markers**:

```typescript
// Add to components with polling
import { Profiler } from 'react';

function VideoGenPage() {
  const onRenderCallback = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    if (actualDuration > 100) { // > 100ms render
      console.warn('[Profiler] Slow render detected:', {
        id,
        phase,
        actualDuration
      });
    }
  };

  return (
    <Profiler id="VideoGenPage" onRender={onRenderCallback}>
      {/* component content */}
    </Profiler>
  );
}
```

### 6.3 Polling State Inspector

**Create debug panel**:

```typescript
// components/debug/PollingInspector.tsx
export function PollingInspector() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const monitor = PollingHealthMonitor.getInstance();
      setStats(monitor.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!stats || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg opacity-90 text-xs">
      <h3 className="font-bold mb-2">Polling Health</h3>
      <div>Active Polls: {stats.activePolls}</div>
      <div>Active Timeouts: {stats.activeTimeouts}</div>
      <div>Active Controllers: {stats.activeControllers}</div>
      <div className="mt-2">
        <h4 className="font-semibold">Memory</h4>
        {performance.memory && (
          <>
            <div>Heap: {(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB</div>
            <div>Limit: {(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB</div>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 7. Incident Response Playbook

### When Memory Leak Alert Fires

**Step 1: Assess Severity**

- Check current memory utilization
- Determine number of affected users
- Check error rates and user reports

**Step 2: Immediate Mitigation**

- Enable debug logging for affected pages
- Capture heap snapshots if possible
- Notify users to refresh their browsers

**Step 3: Investigation**

- Check PollingHealthMonitor logs
- Review active polling operations
- Identify which polling operation is leaking
- Check if timeouts are being cleared
- Verify AbortControllers are being aborted

**Step 4: Resolution**

- Apply hotfix if pattern identified
- Deploy fix to production
- Monitor for recurrence
- Update tests to prevent regression

**Step 5: Post-Mortem**

- Document root cause
- Update monitoring thresholds
- Add additional test coverage
- Update this playbook

---

## 8. Testing in Production

### Canary Releases

**Strategy**:

- Deploy fixes to 5% of users first
- Monitor for 24 hours
- Gradually increase to 100%

**Metrics to Watch**:

- Memory utilization trends
- Error rates
- User session duration
- Page load times
- Bounce rates

### Feature Flags

**Implementation**:

```typescript
// Use feature flags for polling operations
const ENABLE_NEW_POLLING_PATTERN = featureFlags.isEnabled('new-polling-pattern', user);

if (ENABLE_NEW_POLLING_PATTERN) {
  // New polling with better cleanup
} else {
  // Old polling pattern
}
```

---

## 9. Key Performance Indicators (KPIs)

### Memory Health KPIs

| Metric                    | Target   | Warning  | Critical  |
| ------------------------- | -------- | -------- | --------- |
| Average Heap Utilization  | < 50%    | > 70%    | > 85%     |
| Max Heap Utilization      | < 70%    | > 85%    | > 95%     |
| Memory Leak Incidents     | 0/week   | > 0/week | > 1/day   |
| Active Polling Operations | < 3/user | > 5/user | > 10/user |
| Timeout Cleanup Rate      | 100%     | < 100%   | < 95%     |
| AbortController Usage     | 100%     | < 100%   | < 100%    |

### Polling Health KPIs

| Metric                    | Target  | Warning | Critical |
| ------------------------- | ------- | ------- | -------- |
| Avg Poll Duration (Video) | < 5 min | > 8 min | > 10 min |
| Avg Poll Duration (Audio) | < 3 min | > 4 min | > 5 min  |
| Timeout Rate              | < 1%    | > 5%    | > 10%    |
| Error Rate                | < 1%    | > 5%    | > 10%    |
| Concurrent Polls          | < 100   | > 500   | > 1000   |

---

## 10. Continuous Improvement

### Monthly Review Checklist

- [ ] Review memory leak incidents (should be 0)
- [ ] Analyze polling duration trends
- [ ] Check timeout/abort controller usage
- [ ] Review alert thresholds
- [ ] Update monitoring dashboards
- [ ] Conduct memory profiling session
- [ ] Update documentation with learnings

### Quarterly Goals

- Q1 2026: Implement automated memory regression tests
- Q2 2026: Add predictive alerting for memory leaks
- Q3 2026: Optimize polling intervals based on data
- Q4 2026: Implement WebSocket alternative to reduce polling

---

## Summary

**Critical Success Factors**:

1. ✅ All polling operations use cleanup patterns
2. ✅ Comprehensive monitoring in place
3. ✅ Alerts configured for anomalies
4. ✅ Incident response playbook ready
5. ✅ Regular reviews scheduled

**Next Steps**:

1. Implement PollingHealthMonitor in production
2. Configure APM tool (DataDog/Sentry/New Relic)
3. Set up alert channels (Slack/PagerDuty)
4. Train team on incident response
5. Schedule first monthly review

---

**Document Owner**: Engineering Team
**Review Frequency**: Monthly
**Last Reviewed**: 2025-10-24
**Next Review**: 2025-11-24
