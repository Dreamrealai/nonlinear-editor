# Performance Optimization Guide

Best practices and optimization strategies for the Non-Linear Video Editor.

## Table of Contents
1. [Performance Overview](#performance-overview)
2. [Frontend Performance](#frontend-performance)
3. [Backend Performance](#backend-performance)
4. [Database Optimization](#database-optimization)
5. [Asset Loading & Caching](#asset-loading--caching)
6. [Timeline Performance](#timeline-performance)
7. [Video Playback](#video-playback)
8. [Memory Management](#memory-management)
9. [Network Optimization](#network-optimization)
10. [Monitoring & Metrics](#monitoring--metrics)

---

## Performance Overview

### Performance Goals

| Metric | Target | Acceptable |
|--------|--------|------------|
| First Contentful Paint (FCP) | < 1.5s | < 2.5s |
| Largest Contentful Paint (LCP) | < 2.5s | < 4.0s |
| Time to Interactive (TTI) | < 3.5s | < 5.0s |
| Total Blocking Time (TBT) | < 200ms | < 500ms |
| Cumulative Layout Shift (CLS) | < 0.1 | < 0.25 |
| API Response Time | < 500ms | < 1s |
| Video Playback FPS | 30fps | 24fps |

### Current Performance Characteristics

**Strengths:**
- Turbopack for fast development builds
- React 19 concurrent features
- Zustand with Immer for efficient state updates
- Debounced autosave reduces database writes
- Client-side rendering with selective SSR

**Limitations:**
- Timeline performance degrades with >200 clips
- Large video files strain browser memory
- No WebWorkers for heavy computations yet
- Client-side video processing limited

---

## Frontend Performance

### React Optimization

#### 1. Component Memoization

Use `React.memo` for expensive components:

```typescript
// Memoize timeline clips to prevent unnecessary re-renders
const TimelineClip = React.memo(({ clip, onMove, onTrim }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if clip data changes
  return prevProps.clip.id === nextProps.clip.id &&
         prevProps.clip.timelinePosition === nextProps.clip.timelinePosition &&
         prevProps.clip.duration === nextProps.clip.duration;
});
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

### Bundle Optimization

#### 1. Code Splitting

Next.js automatically code-splits pages. For additional splitting:

```typescript
// Dynamic imports for heavy libraries
const processVideo = async (video: File) => {
  const { default: ffmpeg } = await import('ffmpeg.js');
  return ffmpeg.process(video);
};
```

#### 2. Tree Shaking

Ensure imports are optimized:

```typescript
// Good - only imports what's needed
import { Upload, Download, Play } from 'lucide-react';

// Bad - imports entire library
import * as Icons from 'lucide-react';
```

#### 3. Bundle Analysis

```bash
# Analyze bundle size
npm run build

# With bundle analyzer (add to next.config.ts)
ANALYZE=true npm run build
```

### CSS Optimization

#### 1. Tailwind CSS Purging

Tailwind automatically purges unused styles in production.

Verify `tailwind.config.ts`:
```typescript
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  // ...
}
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

---

## Backend Performance

### API Route Optimization

#### 1. Caching

Implement caching for expensive operations:

```typescript
// In-memory cache (upgrade to Redis for production)
const cache = new Map<string, { data: any, expiry: number }>();

export async function GET(req: NextRequest) {
  const cacheKey = req.url;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const data = await expensiveOperation();

  cache.set(cacheKey, {
    data,
    expiry: Date.now() + 60000 // 1 minute
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
  supabase.from('assets').select('*')
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
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' }
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
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', userId);
```

#### 2. Use Indexes

Ensure frequently queried columns are indexed:

```sql
-- Add index for common queries
CREATE INDEX IF NOT EXISTS assets_project_idx ON assets(project_id);
CREATE INDEX IF NOT EXISTS assets_user_idx ON assets(user_id);
CREATE INDEX IF NOT EXISTS scenes_asset_idx ON scenes(asset_id);
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
const signedUrlCache = new Map<string, { url: string, expiry: number }>();

async function getSignedUrl(storageUrl: string): Promise<string> {
  const cached = signedUrlCache.get(storageUrl);

  // Return cached if still valid (with 5-minute buffer)
  if (cached && cached.expiry > Date.now() + 300000) {
    return cached.url;
  }

  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600); // 1 hour

  signedUrlCache.set(storageUrl, {
    url: data.signedUrl,
    expiry: Date.now() + 3600000
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
set((state) => { state.clips[id1].position = pos1; });
set((state) => { state.clips[id2].position = pos2; });
set((state) => { state.clips[id3].position = pos3; });
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
const audioTracks = clips.filter(c => c.type === 'audio');

audioTracks.forEach(track => {
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
    videos.forEach(video => {
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
  const { data } = await supabase
    .from('assets')
    .select('*')
    .in('id', assetIds);

  return data;
}
```

### Compression

Enable compression for API responses:

```typescript
// next.config.ts
export default {
  compress: true,  // Enable gzip compression
};
```

### CDN for Static Assets

```typescript
// Use Supabase CDN for static files
const { data } = supabase.storage
  .from('assets')
  .getPublicUrl(path, {
    transform: {
      width: 320,
      height: 180,
      quality: 80
    }
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

### Axiom Logging

Log performance metrics to Axiom:

```typescript
await fetch('/api/logs', {
  method: 'POST',
  body: JSON.stringify({
    logs: [{
      level: 'info',
      message: 'Timeline rendered',
      data: {
        duration: renderTime,
        clipCount: clips.length,
        trackCount: tracks.length
      }
    }]
  })
});
```

---

## Performance Checklist

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

---

**Last Updated**: 2025-01-23
**Version**: 1.0.0
**Target Environment**: Modern browsers (Chrome, Safari, Firefox, Edge)
