# Performance Optimization Guide

This document outlines the performance optimizations implemented in the nonlinear video editor application and provides guidelines for maintaining optimal performance.

## Table of Contents

1. [Web Vitals Tracking](#web-vitals-tracking)
2. [Bundle Size Optimization](#bundle-size-optimization)
3. [Code Splitting & Lazy Loading](#code-splitting--lazy-loading)
4. [React Performance](#react-performance)
5. [Zustand Store Optimization](#zustand-store-optimization)
6. [Caching Strategies](#caching-strategies)
7. [Image Optimization](#image-optimization)
8. [Performance Budgets](#performance-budgets)

---

## Web Vitals Tracking

### Overview

Web Vitals tracking has been integrated to monitor Core Web Vitals metrics in real-time.

### Implementation

- **Location**: `/lib/webVitals.ts`
- **Integration**: Automatically initialized in root layout via `<WebVitals />` component
- **Metrics Tracked**:
  - **LCP (Largest Contentful Paint)**: Target ≤2.5s
  - **FID (First Input Delay)**: Target ≤100ms
  - **CLS (Cumulative Layout Shift)**: Target ≤0.1
  - **FCP (First Contentful Paint)**: Target ≤1.8s
  - **TTFB (Time to First Byte)**: Target ≤800ms
  - **INP (Interaction to Next Paint)**: Target ≤200ms

### Usage

```typescript
import { initWebVitals } from '@/lib/webVitals';

// Automatically initialized in layout
// Metrics are logged to browser console and sent to analytics endpoint
```

### Monitoring

- Metrics are logged with performance thresholds
- Slow operations trigger warnings in development
- Production metrics can be sent to analytics endpoint at `/api/analytics/web-vitals`

---

## Bundle Size Optimization

### Current Bundle Stats

```
First Load JS shared by all: 102 kB
  ├ chunks/1255-acddf03a4ca96e66.js     45.3 kB
  ├ chunks/4bd1b696-182b6b13bdad92e3.js 54.2 kB
  └ other shared chunks                  2.3 kB

Middleware: 83 kB
```

### Optimizations Applied

1. **Package Optimization**

   ```typescript
   // next.config.ts
   experimental: {
     optimizePackageImports: ['@supabase/supabase-js', 'zustand', 'clsx', 'lucide-react'];
   }
   ```

2. **Tree Shaking**
   - Console.log removal in production
   - Removal of unused code paths
   - Selective imports

3. **Compression**
   - Gzip compression enabled
   - Modern image formats (AVIF, WebP)

### Bundle Analysis

Run bundle analysis to identify optimization opportunities:

```bash
npm run build:analyze
```

This will generate reports in `.next/analyze/`:

- `client.html` - Client-side bundle analysis
- `nodejs.html` - Server-side bundle analysis
- `edge.html` - Edge runtime bundle analysis

---

## Code Splitting & Lazy Loading

### Lazy Components

Heavy components are lazy-loaded to reduce initial bundle size:

```typescript
// components/LazyComponents.tsx

// Editor components (loaded on demand)
export const LazyHorizontalTimeline = dynamic(...)
export const LazyPreviewPlayer = dynamic(...)
export const LazyExportModal = dynamic(...)
export const LazyClipPropertiesPanel = dynamic(...)

// Generation components
export const LazyAudioWaveform = dynamic(...)
export const LazyTextOverlayEditor = dynamic(...)
export const LazyKeyframeEditor = dynamic(...)

// Interface components
export const LazyChatBox = dynamic(...)
export const LazyProjectList = dynamic(...)
export const LazyActivityHistory = dynamic(...)
```

### Benefits

- **Reduced Initial Load**: Only essential code loads initially
- **Faster Time to Interactive**: Critical rendering path is shorter
- **Better Code Organization**: Clear separation between critical and optional features

### Usage Example

```typescript
import { LazyExportModal } from '@/components/LazyComponents';

// Component loads only when modal is opened
{showExportModal && <LazyExportModal onClose={() => setShowExportModal(false)} />}
```

---

## React Performance

### React.memo Optimization

Components that re-render frequently are wrapped with React.memo:

```typescript
// Optimized timeline components
export const TimelineClipRenderer = React.memo(...)
export const TimelineRuler = React.memo(...)
export const TimelinePlayhead = React.memo(...)
export const TimelineTextOverlayRenderer = React.memo(...)
export const TimelineTracks = React.memo(...)
```

### useCallback & useMemo

Expensive callbacks and computations are memoized:

```typescript
// Example from EditorHeader
const handleProjectChange = useCallback(
  (newProjectId: string) => {
    setIsDropdownOpen(false);
    router.push(`/editor/${newProjectId}`);
  },
  [router]
);

const handleRenameSubmit = useCallback(async () => {
  // ... expensive async operation
}, [supabaseClient, renameValue, projectId, projects]);
```

### Best Practices

1. **Use React.memo for**:
   - Components that receive same props frequently
   - Components rendered in lists
   - Heavy rendering components (e.g., timeline clips, waveforms)

2. **Use useCallback for**:
   - Event handlers passed to child components
   - Functions used in useEffect dependencies
   - Functions passed to memoized components

3. **Use useMemo for**:
   - Expensive calculations
   - Complex derived state
   - Object/array creation in render

---

## Zustand Store Optimization

### Optimized Selectors

Selectors prevent unnecessary re-renders by extracting only required state:

```typescript
// state/selectors.ts

// ✅ Good: Only re-renders when clips change
export const useClips = () => useTimelineStore((state) => state.timeline?.clips ?? []);

// ✅ Good: Only re-renders when specific clip changes
export const useClip = (clipId: string) =>
  useTimelineStore((state) => state.timeline?.clips.find((c) => c.id === clipId) ?? null);

// ❌ Avoid: Re-renders on ANY timeline change
export const useTimeline = () => useTimelineStore((state) => state.timeline);
```

### Action Selectors

Extract only the actions you need to prevent re-renders:

```typescript
// ✅ Good: Never causes re-renders
const { addClip, updateClip } = useTimelineActions();

// ❌ Avoid: Re-renders when any state changes
const timelineStore = useTimelineStore();
```

### Store Architecture

1. **Separation of Concerns**:
   - `useTimelineStore` - Timeline data and clips
   - `usePlaybackStore` - Playback state
   - `useEditorStore` - UI state and selections
   - `useHistoryStore` - Undo/redo functionality

2. **Immer Middleware**: All stores use Immer for immutable updates
3. **Deduplication**: Automatic clip deduplication in timeline store

---

## Caching Strategies

### Server-Side Caching

1. **Project Metadata Caching**

   ```typescript
   // lib/cachedData.ts
   // 2-minute TTL for project metadata
   const project = await getCachedProjectMetadata(supabase, projectId, userId);
   ```

2. **Signed URL Caching**

   ```typescript
   // lib/signedUrlCache.ts
   // 50-minute TTL for storage URLs (Supabase URLs valid for 60 min)
   ```

3. **Cache Invalidation**
   ```typescript
   // Automatic invalidation on updates
   import { invalidateProjectCache } from '@/lib/cacheInvalidation';
   await invalidateProjectCache(projectId);
   ```

### Client-Side Caching

1. **Request Deduplication**

   ```typescript
   // lib/requestDeduplication.ts
   // Prevents duplicate simultaneous requests
   const data = await deduplicateRequest(key, fetchFunction);
   ```

2. **React Query (Future Enhancement)**
   - Consider implementing for API calls
   - Automatic background refetching
   - Optimistic updates

### Next.js Caching

1. **Image Optimization**

   ```typescript
   // next.config.ts
   images: {
     minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
     formats: ['image/avif', 'image/webp'],
   }
   ```

2. **Static Generation**
   - API documentation page pre-rendered
   - Static assets served with long cache headers

---

## Image Optimization

### Next.js Image Component

All images use the optimized Next.js Image component:

```typescript
import Image from 'next/image';

// ✅ Optimized with lazy loading, responsive sizes
<Image
  src={thumbnailUrl}
  alt="Clip thumbnail"
  width={100}
  height={60}
  loading="lazy"
  sizes="(max-width: 768px) 100vw, 50vw"
/>

// ❌ Avoid: Regular img tag misses optimizations
<img src={thumbnailUrl} alt="Clip thumbnail" />
```

### Loading Strategies

1. **Priority Loading** (above fold):

   ```typescript
   <Image priority src={heroImage} />
   ```

2. **Lazy Loading** (below fold):

   ```typescript
   <Image loading="lazy" src={thumbnail} />
   ```

3. **Eager Loading** (critical content):
   ```typescript
   <Image loading="eager" src={logo} />
   ```

### Image Formats

- **AVIF**: Best compression, served first
- **WebP**: Fallback for browsers without AVIF
- **JPEG/PNG**: Final fallback

---

## Performance Budgets

### Target Metrics

| Metric        | Target  | Critical Threshold |
| ------------- | ------- | ------------------ |
| First Load JS | ≤150 kB | 200 kB             |
| LCP           | ≤2.5s   | 4.0s               |
| FID/INP       | ≤100ms  | 300ms              |
| CLS           | ≤0.1    | 0.25               |
| FCP           | ≤1.8s   | 3.0s               |
| TTFB          | ≤800ms  | 1.8s               |

### Page-Specific Budgets

| Page     | First Load JS | Notes              |
| -------- | ------------- | ------------------ |
| Home     | ≤120 kB       | Static content     |
| Editor   | ≤250 kB       | Heavy interactions |
| Timeline | ≤300 kB       | Most complex page  |
| Settings | ≤130 kB       | Simple form        |

### Monitoring

```bash
# Check bundle size
npm run analyze:bundle

# Build and check output
npm run build

# Check specific page size
# Review build output for route sizes
```

### When Budgets Are Exceeded

1. Review bundle analysis to identify large dependencies
2. Consider lazy loading heavy components
3. Check for duplicate dependencies
4. Optimize images and assets
5. Review third-party package usage

---

## Performance Monitoring Tools

### Built-in Tools

1. **Performance Utility**

   ```typescript
   import { measurePerformance } from '@/lib/performance';

   const result = await measurePerformance(
     PerformanceCategory.DATABASE_QUERY,
     'fetch-projects',
     async () => {
       return await fetchProjects();
     }
   );
   ```

2. **Browser Performance API**

   ```typescript
   import { browserPerformance } from '@/lib/performance';

   const navTiming = browserPerformance.getNavigationTiming();
   const resources = browserPerformance.getResourceTiming();
   const memory = browserPerformance.getMemoryUsage();
   ```

3. **Web Vitals Dashboard**

   ```typescript
   import { getWebVitalsBudgetStatus } from '@/lib/webVitals';

   const budgets = getWebVitalsBudgetStatus();
   ```

### External Tools

1. **Lighthouse**
   - Run audits in Chrome DevTools
   - CI integration available

2. **Bundle Analyzer**

   ```bash
   npm run build:analyze
   ```

3. **React DevTools Profiler**
   - Identify slow components
   - Analyze render performance

---

## Best Practices Checklist

### Code

- [ ] Use React.memo for components rendered in lists
- [ ] Wrap event handlers in useCallback
- [ ] Use useMemo for expensive calculations
- [ ] Use optimized Zustand selectors
- [ ] Lazy load heavy components
- [ ] Avoid inline object/array creation in render

### Data Loading

- [ ] Use server-side caching where appropriate
- [ ] Implement request deduplication
- [ ] Add loading states for async operations
- [ ] Prefetch critical data
- [ ] Invalidate cache on updates

### Images

- [ ] Use Next.js Image component
- [ ] Specify width and height
- [ ] Use appropriate loading strategy
- [ ] Optimize image sizes
- [ ] Use modern formats (AVIF/WebP)

### Bundles

- [ ] Run bundle analysis regularly
- [ ] Check for duplicate dependencies
- [ ] Lazy load non-critical features
- [ ] Tree shake unused code
- [ ] Monitor bundle size trends

---

## Performance Maintenance

### Regular Checks

1. **Weekly**: Review Web Vitals in production
2. **Per PR**: Check bundle size changes
3. **Monthly**: Run full Lighthouse audit
4. **Quarterly**: Review and update performance budgets

### Continuous Monitoring

- Set up Real User Monitoring (RUM)
- Track Core Web Vitals in analytics
- Monitor slow API endpoints
- Review error rates and timeouts

### Optimization Workflow

1. Identify bottleneck using profiler
2. Measure baseline performance
3. Implement optimization
4. Measure improvement
5. Document changes
6. Monitor in production

---

## Resources

- [Web Vitals Documentation](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [React Performance](https://react.dev/learn/render-and-commit#optimizing-performance)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/practice-with-no-store-actions)
- [Bundle Analysis Guide](https://nextjs.org/docs/app/building-your-application/optimizing/bundle-analyzer)

---

**Last Updated**: 2025-10-23
**Performance Score**: See latest Lighthouse audit
**Bundle Size**: 102 kB (First Load JS shared)
