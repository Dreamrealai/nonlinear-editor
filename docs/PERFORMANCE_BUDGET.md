# Performance Budget

This document defines performance budgets for the Non-Linear Video Editor application. These budgets ensure the application remains fast and responsive as new features are added.

## Overview

Performance budgets are limits placed on metrics that affect site performance. They help teams make informed decisions about what to include in their applications and when optimization work is needed.

## Core Web Vitals

### Largest Contentful Paint (LCP)

**Target: < 2.5s**

- **Good**: < 2.5s
- **Needs Improvement**: 2.5s - 4.0s
- **Poor**: > 4.0s

LCP measures loading performance. It marks the point when the page's main content has likely loaded.

### First Input Delay (FID) / Interaction to Next Paint (INP)

**Target: < 100ms**

- **Good**: < 100ms
- **Needs Improvement**: 100ms - 300ms
- **Poor**: > 300ms

FID/INP measures interactivity. It quantifies the experience users feel when trying to interact with unresponsive pages.

### Cumulative Layout Shift (CLS)

**Target: < 0.1**

- **Good**: < 0.1
- **Needs Improvement**: 0.1 - 0.25
- **Poor**: > 0.25

CLS measures visual stability. It quantifies how much unexpected layout shift occurs during page load.

## Page Load Performance

### JavaScript Bundle Size

**Total Budget: < 500KB (gzipped)**

Current breakdown:
- Main bundle: < 300KB
- Vendor bundle: < 150KB
- Runtime: < 50KB

### Initial Page Load

**Target: < 3s (on 3G connection)**

Milestones:
- Time to First Byte (TTFB): < 600ms
- First Contentful Paint (FCP): < 1.0s
- Time to Interactive (TTI): < 3.0s

### Resource Counts

- Total requests: < 50
- Image requests: < 20
- Font requests: < 4

## Runtime Performance

### Frame Rate

**Target: >= 60 FPS (16.67ms per frame)**

Critical operations that must maintain 60 FPS:
- Timeline scrolling
- Playhead dragging
- Clip dragging
- Rubber band selection
- Minimap interaction

### Timeline Performance

**Timeline with 100 clips:**
- Initial render: < 2.0s
- Re-render (zoom/scroll): < 100ms
- Clip drag start: < 16ms
- Playhead update: < 16ms

**Timeline with 200 clips:**
- Initial render: < 4.0s
- Re-render (zoom/scroll): < 200ms
- Clip drag start: < 16ms
- Playhead update: < 16ms

### Asset Panel Performance

**1000 assets loaded:**
- Initial load: < 2.0s
- Search query response: < 300ms
- Filter application: < 200ms
- Sort operation: < 300ms
- Scroll performance: >= 60 FPS

### Feature-Specific Budgets

#### Onboarding System
- Initialization: < 1.0s
- Step transition: < 100ms
- Tooltip positioning: < 50ms
- Complete flow (7 steps): < 5.0s

#### Easter Eggs
- Key detection: < 10ms
- Activation animation: < 100ms
- Confetti generation: < 50ms
- Matrix rain (startup): < 100ms

#### Timeline Grid
- Grid line calculation: < 50ms
- Snap point generation: < 30ms
- Grid render: < 100ms

#### Timeline Minimap
- Initial render (100 clips): < 300ms
- Initial render (200 clips): < 500ms
- Update on scroll: < 50ms
- Click/drag response: < 16ms

#### Auto-Save
- Serialize timeline (100 clips): < 500ms
- Serialize timeline (200 clips): < 1.0s
- Complete save operation: < 2.0s
- Background save (non-blocking): < 5.0s

## Memory Usage

### Heap Size Limits

- Initial page load: < 50MB
- After 5 minutes of use: < 100MB
- After 30 minutes of use: < 200MB
- Maximum heap size: < 500MB

### Memory Leak Prevention

- No memory growth after 1 hour of idle time
- Memory usage should stabilize after initial operations
- Periodic cleanup of unused resources

### Per-Feature Memory Budget

- Timeline store: < 50MB
- Asset cache: < 100MB
- Undo/redo history: < 20MB
- Thumbnail cache: < 50MB

## API Response Times

### Asset Operations
- List assets: < 500ms
- Upload asset: < 5.0s (per MB)
- Delete asset: < 300ms
- Get asset metadata: < 200ms

### Project Operations
- Load project: < 1.0s
- Save project: < 2.0s
- List projects: < 500ms
- Create project: < 300ms

### Timeline Operations
- Load timeline: < 800ms
- Save timeline: < 2.0s
- Add clip: < 100ms
- Remove clip: < 100ms
- Update clip: < 100ms

## Network Performance

### Request Priorities

1. **Critical** (block rendering):
   - HTML document
   - Critical CSS
   - Critical JavaScript

2. **High** (affects user experience):
   - Fonts
   - Above-the-fold images
   - API requests for initial data

3. **Medium** (visible but not critical):
   - Below-the-fold images
   - Non-critical API requests

4. **Low** (deferred):
   - Analytics
   - Non-critical third-party scripts
   - Prefetched resources

### Caching Strategy

- Static assets: Cache for 1 year
- API responses: Cache for 5 minutes (with revalidation)
- Images/thumbnails: Cache for 1 week
- User-generated content: Cache for 1 day

## Monitoring and Alerts

### Performance Monitoring

We use the following tools:
- **Web Vitals**: Track Core Web Vitals in production
- **PostHog**: Custom performance metrics and user analytics
- **Browser DevTools**: Performance profiling during development
- **Lighthouse CI**: Automated performance testing in CI/CD

### Alert Thresholds

Trigger alerts when:
- LCP > 3.0s (75th percentile)
- FID/INP > 150ms (75th percentile)
- CLS > 0.15 (75th percentile)
- Timeline render > 3.0s (100 clips, 95th percentile)
- Asset search > 500ms (95th percentile)
- Memory usage > 300MB (after 30 min)
- Frame rate < 30 FPS (during interactions)

### Performance Testing

Run performance tests:
- On every pull request (automated)
- Weekly performance audit (manual)
- Before major releases (comprehensive)

## Optimization Strategies

### Code Splitting

- Route-based code splitting
- Component lazy loading for non-critical features
- Dynamic imports for heavy dependencies

### Image Optimization

- Use Next.js Image component for automatic optimization
- Serve WebP format with fallbacks
- Implement progressive image loading
- Use appropriate image sizes (srcset)

### Caching

- Service Worker for offline support
- In-memory cache for frequently accessed data
- LocalStorage for user preferences
- IndexedDB for large datasets

### Rendering Optimization

- React.memo for expensive components
- useMemo/useCallback for expensive calculations
- Virtual scrolling for long lists
- Debounce/throttle event handlers
- RequestAnimationFrame for animations

### Network Optimization

- HTTP/2 multiplexing
- Resource prefetching
- DNS prefetch for external domains
- Preconnect to critical origins

## Performance Budget Review

Review and update performance budgets:
- **Monthly**: Review metrics and adjust if needed
- **Quarterly**: Comprehensive performance audit
- **Annually**: Major performance budget revision

### When to Adjust Budgets

Increase budgets when:
- New critical features require more resources
- Technology improvements allow better performance
- User feedback indicates performance is acceptable

Decrease budgets when:
- Performance degradation is detected
- Optimization techniques improve baseline performance
- Competition sets higher standards

## Tools and Resources

### Performance Tools

- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)

### Benchmarking

Run benchmarks with:
```bash
# Run comprehensive benchmark suite
npm run benchmark

# Run timeline-specific benchmarks
npx tsx scripts/test-timeline-performance.ts

# Run bundle size check
npm run analyze:bundle
```

### Monitoring in Production

```typescript
import { initWebVitalsMonitoring } from '@/lib/performance/monitoring';

// Initialize in _app.tsx or root layout
initWebVitalsMonitoring();
```

## References

- [Web Vitals](https://web.dev/vitals/)
- [Performance Budgets](https://web.dev/performance-budgets-101/)
- [Chrome Performance Best Practices](https://developer.chrome.com/docs/lighthouse/performance/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

---

**Last Updated**: 2025-10-24
**Next Review**: 2025-11-24
**Owner**: Engineering Team
