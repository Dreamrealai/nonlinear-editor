# Performance Optimization Guide

Comprehensive performance optimization strategies and best practices for the Non-Linear Video Editor.

## Table of Contents

1. [Performance Overview](#performance-overview)
2. [Web Vitals Tracking](#web-vitals-tracking)
3. [Frontend Performance](#frontend-performance)
4. [React Performance](#react-performance)
5. [Zustand Store Optimization](#zustand-store-optimization)
6. [Bundle Size Optimization](#bundle-size-optimization)
7. [Caching Strategies](#caching-strategies)
8. [Backend Performance](#backend-performance)
9. [Database Optimization](#database-optimization)
10. [Asset Loading & Caching](#asset-loading--caching)
11. [Timeline Performance](#timeline-performance)
12. [Video Playback](#video-playback)
13. [Memory Management](#memory-management)
14. [Network Optimization](#network-optimization)
15. [Monitoring & Metrics](#monitoring--metrics)
16. [Performance Budgets](#performance-budgets)
17. [Performance Checklist](#performance-checklist)

---

## Performance Overview

### Performance Goals

| Metric                          | Target  | Acceptable |
| ------------------------------- | ------- | ---------- |
| First Contentful Paint (FCP)    | < 1.5s  | < 2.5s     |
| Largest Contentful Paint (LCP)  | < 2.5s  | < 4.0s     |
| Time to Interactive (TTI)       | < 3.5s  | < 5.0s     |
| Total Blocking Time (TBT)       | < 200ms | < 500ms    |
| Cumulative Layout Shift (CLS)   | < 0.1   | < 0.25     |
| First Input Delay (FID)         | < 100ms | < 300ms    |
| Interaction to Next Paint (INP) | < 200ms | < 300ms    |
| API Response Time               | < 500ms | < 1s       |
| Video Playback FPS              | 30fps   | 24fps      |

### Current Performance Characteristics

**Strengths:**

- Turbopack for fast development builds
- React 19 concurrent features
- Zustand with Immer for efficient state updates
- Debounced autosave reduces database writes
- Client-side rendering with selective SSR
- LRU caching layer reduces database load by 80-90%

**Limitations:**

- Timeline performance degrades with >200 clips
- Large video files strain browser memory
- No WebWorkers for heavy computations yet
- Client-side video processing limited

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

## Frontend Performance

### React Optimization

#### 1. Component Memoization

Use `React.memo` for expensive components:

```typescript
// Memoize timeline clips to prevent unnecessary re-renders
const TimelineClip = React.memo(
  ({ clip, onMove, onTrim }) => {
    // Component logic
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if clip data changes
    return (
      prevProps.clip.id === nextProps.clip.id &&
      prevProps.clip.timelinePosition === nextProps.clip.timelinePosition &&
      prevProps.clip.duration === nextProps.clip.duration
    );
  }
);
```

**Optimized Components:**

```typescript
// Timeline components
export const TimelineClipRenderer = React.memo(...)
export const TimelineRuler = React.memo(...)
export const TimelinePlayhead = React.memo(...)
export const TimelineTextOverlayRenderer = React.memo(...)
export const TimelineTracks = React.memo(...)
```

#### 2. Lazy Loading

Load heavy components on demand:

```typescript
// Lazy load keyframe editor
const KeyframeEditor = lazy(() => import('./KeyframeEditor'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <KeyframeEditor />
</Suspense>
```

**Available Lazy Components** (`/components/LazyComponents.tsx`):

```typescript
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

**Benefits:**

- Reduced Initial Load: Only essential code loads initially
- Faster Time to Interactive: Critical rendering path is shorter
- Better Code Organization: Clear separation between critical and optional features

**Usage Example:**

```typescript
import { LazyExportModal } from '@/components/LazyComponents';

// Component loads only when modal is opened
{showExportModal && <LazyExportModal onClose={() => setShowExportModal(false)} />}
```

#### 3. Virtual Scrolling

For long asset lists:

```typescript
// Future enhancement: Use react-window or react-virtualized
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={assets.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <AssetCard key={assets[index].id} asset={assets[index]} style={style} />
  )}
</FixedSizeList>
```

### CSS Optimization

#### 1. Tailwind CSS Purging

Tailwind automatically purges unused styles in production.

Verify `tailwind.config.ts`:

```typescript
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  // ...
};
```

#### 2. Critical CSS

Next.js automatically inlines critical CSS. No action needed.

### Image Optimization

#### 1. Use Next.js Image Component

```typescript
import Image from 'next/image';

<Image
  src="/thumbnail.jpg"
  alt="Video thumbnail"
  width={320}
  height={180}
  loading="lazy"
  placeholder="blur"
/>
```

#### 2. Responsive Images

```typescript
<Image
  src="/hero.jpg"
  alt="Hero"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

#### 3. Loading Strategies

```typescript
// Priority Loading (above fold)
<Image priority src={heroImage} />

// Lazy Loading (below fold)
<Image loading="lazy" src={thumbnail} />

// Eager Loading (critical content)
<Image loading="eager" src={logo} />
```

#### 4. Image Formats

- **AVIF**: Best compression, served first
- **WebP**: Fallback for browsers without AVIF
- **JPEG/PNG**: Final fallback

---

## React Performance

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

2. **Code Splitting**

Next.js automatically code-splits pages. For additional splitting:

```typescript
// Dynamic imports for heavy libraries
const processVideo = async (video: File) => {
  const { default: ffmpeg } = await import('ffmpeg.js');
  return ffmpeg.process(video);
};
```

3. **Tree Shaking**

Ensure imports are optimized:

```typescript
// Good - only imports what's needed
import { Upload, Download, Play } from 'lucide-react';

// Bad - imports entire library
import * as Icons from 'lucide-react';
```

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

## Caching Strategies

### Server-Side Caching

1. **LRU Cache Implementation**

   ```typescript
   // lib/cache.ts
   // In-memory LRU cache with TTL support
   // Maximum Size: 1000 entries (configurable via CACHE_MAX_SIZE)
   ```

2. **Cached Data Access**

   ```typescript
   // lib/cachedData.ts
   // 2-minute TTL for project metadata
   const project = await getCachedProjectMetadata(supabase, projectId, userId);

   // 5-minute TTL for user profile
   const profile = await getCachedUserProfile(supabase, userId);

   // 1-minute TTL for subscription (billing needs fresh data)
   const subscription = await getCachedUserSubscription(supabase, userId);
   ```

3. **Cache Invalidation**
   ```typescript
   // lib/cacheInvalidation.ts
   // Automatic invalidation on updates
   import { invalidateProjectCache } from '@/lib/cacheInvalidation';
   await invalidateProjectCache(projectId);
   ```

### Performance Impact

| Operation                | Before (uncached) | After (cached) | Improvement       |
| ------------------------ | ----------------- | -------------- | ----------------- |
| User Profile Lookup      | 50-100ms          | 1-2ms          | **95-98% faster** |
| Subscription Check       | 50-100ms          | 1-2ms          | **95-98% faster** |
| Project Metadata         | 50-100ms          | 1-2ms          | **95-98% faster** |
| Projects List (10 items) | 100-150ms         | 1-2ms          | **98-99% faster** |

**Expected Cache Hit Rate: 80-90%**

For detailed caching documentation, see [`/docs/guides/CACHING.md`](/docs/guides/CACHING.md).

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

## Backend Performance

### API Route Optimization

#### 1. Caching

Implement caching for expensive operations:

```typescript
// In-memory cache (upgrade to Redis for production)
const cache = new Map<string, { data: any; expiry: number }>();

export async function GET(req: NextRequest) {
  const cacheKey = req.url;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const data = await expensiveOperation();

  cache.set(cacheKey, {
    data,
    expiry: Date.now() + 60000, // 1 minute
  });

  return NextResponse.json(data);
}
```

#### 2. Parallel Requests

Use `Promise.all` for independent operations:

```typescript
// Good - parallel requests
const [user, project, assets] = await Promise.all([
  supabase.from('users').select('*').single(),
  supabase.from('projects').select('*').single(),
  supabase.from('assets').select('*'),
]);

// Bad - sequential requests
const user = await supabase.from('users').select('*').single();
const project = await supabase.from('projects').select('*').single();
const assets = await supabase.from('assets').select('*');
```

#### 3. Streaming Responses

For large data sets:

```typescript
export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      const assets = await fetchAssets();
      for (const asset of assets) {
        controller.enqueue(JSON.stringify(asset) + '\n');
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}
```

### Rate Limiting

Current implementation uses in-memory storage. For production:

```typescript
// Upgrade to Redis-based rate limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'),
});

export async function POST(req: NextRequest) {
  const { success } = await ratelimit.limit(userId);
  if (!success) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }
  // Continue...
}
```

---

## Database Optimization

### Query Optimization

#### 1. Select Only Needed Columns

```typescript
// Good - select specific columns
const { data } = await supabase
  .from('projects')
  .select('id, title, created_at')
  .eq('user_id', userId);

// Bad - select all columns
const { data } = await supabase.from('projects').select('*').eq('user_id', userId);
```

#### 2. Use Indexes

Ensure frequently queried columns are indexed. The following indexes are implemented in the project for optimal query performance:

**Projects Table:**

```sql
-- Optimizes project listing by user with chronological sorting
CREATE INDEX IF NOT EXISTS projects_user_id_created_idx ON projects(user_id, created_at DESC);

-- Enables fast "recently updated" queries
CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects(updated_at DESC);
```

**Assets Table:**

```sql
-- Fast filtering by project and asset type
CREATE INDEX IF NOT EXISTS assets_project_type_idx ON assets(project_id, type);

-- Optimized pagination within projects
CREATE INDEX IF NOT EXISTS assets_project_created_idx ON assets(project_id, created_at DESC);

-- Quick user quota and ownership checks
CREATE INDEX IF NOT EXISTS assets_user_id_idx ON assets(user_id);

-- Filter assets by source (upload/genai/ingest)
CREATE INDEX IF NOT EXISTS assets_source_idx ON assets(source);
```

**Scenes Table:**

```sql
-- Fast scene lookups with temporal ordering
CREATE INDEX IF NOT EXISTS scenes_asset_time_idx ON scenes(asset_id, start_ms);

-- Bulk scene operations per project
CREATE INDEX IF NOT EXISTS scenes_project_idx ON scenes(project_id);
```

**Chat Messages Table:**

```sql
-- Efficient chat history pagination
CREATE INDEX IF NOT EXISTS chat_messages_project_created_idx ON chat_messages(project_id, created_at DESC);
```

**Processing Jobs Table:**

```sql
-- Dashboard views filtered by status
CREATE INDEX IF NOT EXISTS processing_jobs_user_status_idx ON processing_jobs(user_id, status);

-- Recent jobs per project
CREATE INDEX IF NOT EXISTS processing_jobs_project_created_idx ON processing_jobs(project_id, created_at DESC);

-- Partial index for active jobs only (more efficient)
CREATE INDEX IF NOT EXISTS processing_jobs_active_idx ON processing_jobs(created_at DESC)
WHERE status IN ('pending', 'processing');

-- Partial index for error monitoring
CREATE INDEX IF NOT EXISTS processing_jobs_failed_idx ON processing_jobs(created_at DESC)
WHERE status = 'failed';
```

**Performance Impact:**

- Project list queries: ~50-100ms → ~5-10ms (10x faster)
- Asset pagination: ~30-80ms → ~5-15ms (5x faster)
- Active jobs queries: ~100-200ms → ~2-5ms (40x faster)

**Monitoring Index Usage:**

```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM assets
WHERE project_id = 'xxx' AND type = 'video'
ORDER BY created_at DESC
LIMIT 20;

-- View index sizes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

#### 3. Pagination

For large result sets:

```typescript
const PAGE_SIZE = 50;

const { data, count } = await supabase
  .from('assets')
  .select('*', { count: 'exact' })
  .eq('project_id', projectId)
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  .order('created_at', { ascending: false });
```

### Connection Pooling

Supabase automatically handles connection pooling. For custom connections:

```typescript
// Use connection pooler
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL + '/pooler',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-connection-mode': 'transaction' },
    },
  }
);
```

### Database Statistics

Monitor query performance:

```sql
-- View slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- View table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Asset Loading & Caching

### Signed URL Caching

Cache signed URLs to reduce generation overhead:

```typescript
const signedUrlCache = new Map<string, { url: string; expiry: number }>();

async function getSignedUrl(storageUrl: string): Promise<string> {
  const cached = signedUrlCache.get(storageUrl);

  // Return cached if still valid (with 5-minute buffer)
  if (cached && cached.expiry > Date.now() + 300000) {
    return cached.url;
  }

  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600); // 1 hour

  signedUrlCache.set(storageUrl, {
    url: data.signedUrl,
    expiry: Date.now() + 3600000,
  });

  return data.signedUrl;
}
```

### Progressive Loading

Load thumbnails before full assets:

```typescript
// Store low-res thumbnail in metadata
const metadata = {
  thumbnail: 'data:image/jpeg;base64,...', // Small base64 thumbnail
  fullUrl: 'supabase://...'
};

// Display thumbnail immediately
<img src={asset.metadata.thumbnail} />

// Load full resolution on demand
<img src={signedUrl} onLoad={() => setLoaded(true)} />
```

### Lazy Loading Images

```typescript
<img
  src={signedUrl}
  loading="lazy"
  decoding="async"
  alt="Asset thumbnail"
/>
```

---

## Timeline Performance

### Clip Rendering Optimization

#### 1. Canvas-Based Rendering

For >100 clips, consider canvas instead of DOM:

```typescript
// Future enhancement: Render timeline on canvas
const TimelineCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw clips
    clips.forEach(clip => {
      ctx.fillStyle = getClipColor(clip.type);
      ctx.fillRect(
        timeToPixels(clip.timelinePosition),
        clip.trackIndex * TRACK_HEIGHT,
        timeToPixels(clip.duration),
        TRACK_HEIGHT
      );
    });
  }, [clips]);

  return <canvas ref={canvasRef} width={1920} height={1080} />;
};
```

#### 2. Debounce Drag Operations

```typescript
import { debounce } from 'lodash';

const handleClipMove = debounce((clipId, newPosition) => {
  updateClipPosition(clipId, newPosition);
}, 16); // ~60fps
```

#### 3. Virtualize Tracks

Only render visible tracks:

```typescript
const VisibleTracks = () => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });

  return tracks.slice(visibleRange.start, visibleRange.end).map(track => (
    <Track key={track.id} {...track} />
  ));
};
```

### State Update Optimization

#### 1. Immer Structural Sharing

Zustand with Immer already provides structural sharing:

```typescript
// Immer only updates changed paths
set((state) => {
  state.clips[clipId].position = newPosition;
  // Other clips remain unchanged (same reference)
});
```

#### 2. Batch Updates

Group multiple state changes:

```typescript
// Good - single update
set((state) => {
  state.clips[id1].position = pos1;
  state.clips[id2].position = pos2;
  state.clips[id3].position = pos3;
});

// Bad - multiple updates
set((state) => {
  state.clips[id1].position = pos1;
});
set((state) => {
  state.clips[id2].position = pos2;
});
set((state) => {
  state.clips[id3].position = pos3;
});
```

---

## Video Playback

### RAF-Based Playback

Current implementation uses `requestAnimationFrame`:

```typescript
function playVideo() {
  let lastFrameTime = performance.now();

  const frame = (currentTime: number) => {
    const deltaTime = currentTime - lastFrameTime;

    if (deltaTime >= 1000 / TARGET_FPS) {
      updatePlayhead(deltaTime);
      syncAudioTracks();
      lastFrameTime = currentTime;
    }

    if (isPlaying) {
      rafId = requestAnimationFrame(frame);
    }
  };

  rafId = requestAnimationFrame(frame);
}
```

### Video Buffering

Preload next segments:

```typescript
const videoElement = useRef<HTMLVideoElement>(null);

useEffect(() => {
  if (!videoElement.current) return;

  // Set preload strategy
  videoElement.current.preload = 'auto';

  // Monitor buffer
  const checkBuffer = () => {
    const buffered = videoElement.current.buffered;
    if (buffered.length > 0) {
      const bufferedEnd = buffered.end(buffered.length - 1);
      const currentTime = videoElement.current.currentTime;
      const bufferAhead = bufferedEnd - currentTime;

      if (bufferAhead < 2) {
        // Buffer running low, pause or reduce playback
        console.warn('Buffer low:', bufferAhead);
      }
    }
  };

  videoElement.current.addEventListener('timeupdate', checkBuffer);
}, []);
```

### Audio Synchronization

Use Web Audio API for precise sync:

```typescript
const audioContext = new AudioContext();
const audioTracks = clips.filter((c) => c.type === 'audio');

audioTracks.forEach((track) => {
  const source = audioContext.createMediaElementSource(track.element);
  source.connect(audioContext.destination);
  source.start(audioContext.currentTime + track.timelinePosition);
});
```

---

## Memory Management

### Memory Leak Prevention

#### 1. Clean Up Event Listeners

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Handle key
  };

  window.addEventListener('keydown', handleKeyPress);

  return () => {
    window.removeEventListener('keydown', handleKeyPress);
  };
}, []);
```

#### 2. Cancel RAF on Unmount

```typescript
useEffect(() => {
  let rafId: number;

  const animate = () => {
    // Animation logic
    rafId = requestAnimationFrame(animate);
  };

  rafId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(rafId);
  };
}, []);
```

#### 3. Limit Undo/Redo Stack

```typescript
const MAX_HISTORY = 50;

const addToHistory = (state: EditorState) => {
  const newHistory = [...history, state].slice(-MAX_HISTORY);
  setHistory(newHistory);
};
```

### Video Element Cleanup

```typescript
useEffect(() => {
  const videos = document.querySelectorAll('video');

  return () => {
    videos.forEach((video) => {
      video.pause();
      video.src = '';
      video.load();
    });
  };
}, []);
```

---

## Network Optimization

### Request Batching

Batch multiple asset fetches:

```typescript
async function batchFetchAssets(assetIds: string[]) {
  // Single query for multiple assets
  const { data } = await supabase.from('assets').select('*').in('id', assetIds);

  return data;
}
```

### Compression

Enable compression for API responses:

```typescript
// next.config.ts
export default {
  compress: true, // Enable gzip compression
};
```

### CDN for Static Assets

```typescript
// Use Supabase CDN for static files
const { data } = supabase.storage.from('assets').getPublicUrl(path, {
  transform: {
    width: 320,
    height: 180,
    quality: 80,
  },
});
```

---

## Monitoring & Metrics

### Web Vitals

Track Core Web Vitals:

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Custom Performance Metrics

```typescript
// Measure timeline render time
const renderStart = performance.now();
renderTimeline();
const renderEnd = performance.now();

logMetric('timeline-render', renderEnd - renderStart);
```

### Performance Utility

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

### Browser Performance API

```typescript
import { browserPerformance } from '@/lib/performance';

const navTiming = browserPerformance.getNavigationTiming();
const resources = browserPerformance.getResourceTiming();
const memory = browserPerformance.getMemoryUsage();
```

### Axiom Logging

Log performance metrics to Axiom:

```typescript
await fetch('/api/logs', {
  method: 'POST',
  body: JSON.stringify({
    logs: [
      {
        level: 'info',
        message: 'Timeline rendered',
        data: {
          duration: renderTime,
          clipCount: clips.length,
          trackCount: tracks.length,
        },
      },
    ],
  }),
});
```

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

## Performance Checklist

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

### Before Each Release

- [ ] Run Lighthouse audit (score >80)
- [ ] Check bundle size (`npm run build`)
- [ ] Test with 100+ clips on timeline
- [ ] Monitor memory usage (DevTools)
- [ ] Verify no console errors/warnings
- [ ] Test video playback smoothness
- [ ] Check API response times
- [ ] Verify lazy loading works
- [ ] Test on slower connections (3G)
- [ ] Check mobile performance

### Ongoing Monitoring

- [ ] Monitor Core Web Vitals (Vercel)
- [ ] Track API response times (Axiom)
- [ ] Monitor database query times
- [ ] Check storage bucket usage
- [ ] Review error rates
- [ ] Monitor user session duration
- [ ] Review cache hit rates (80%+ target)

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
- Monitor cache statistics and hit rates

### Optimization Workflow

1. Identify bottleneck using profiler
2. Measure baseline performance
3. Implement optimization
4. Measure improvement
5. Document changes
6. Monitor in production

---

## Performance Monitoring Tools

### Built-in Tools

1. **Performance Utility** (`/lib/performance.ts`)
2. **Browser Performance API**
3. **Web Vitals Dashboard**

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

## Resources

- [Web Vitals Documentation](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [React Performance](https://react.dev/learn/render-and-commit#optimizing-performance)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/practice-with-no-store-actions)
- [Bundle Analysis Guide](https://nextjs.org/docs/app/building-your-application/optimizing/bundle-analyzer)

---

**Last Updated**: 2025-10-24
**Performance Score**: See latest Lighthouse audit
**Bundle Size**: 102 kB (First Load JS shared)
**Target Environment**: Modern browsers (Chrome, Safari, Firefox, Edge)
