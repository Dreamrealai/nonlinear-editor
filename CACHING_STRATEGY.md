# Database Query Caching Strategy

## Overview

This document outlines the comprehensive caching strategy implemented across the application to optimize database query performance and reduce load times.

## Implementation Summary

### Pages Updated (5 Key Pages)

1. **app/page.tsx** - Home/Landing page
2. **app/editor/[projectId]/timeline/page.tsx** - Timeline editor
3. **app/editor/[projectId]/page.tsx** - Video generation tab
4. **app/editor/[projectId]/generate-audio/page.tsx** - Audio generation tab
5. **app/editor/[projectId]/keyframe/page.tsx** - Keyframe editor

### API Routes Updated (1 Route)

1. **app/api/assets/route.ts** - Asset listing endpoint

## Caching Architecture

### Server-Side Caching (LRU Cache)

The application uses an in-memory LRU (Least Recently Used) cache implemented in `/lib/cache.ts`:

- **Maximum Size**: 1000 entries (configurable via `CACHE_MAX_SIZE` env var)
- **Eviction Policy**: LRU - least recently used entries are removed when cache is full
- **Automatic Cleanup**: Expired entries removed every 60 seconds
- **Statistics**: Tracks hits, misses, hit rate, and cache size

### Cached Data Layer

The `/lib/cachedData.ts` module provides type-safe cached queries:

- **getCachedUserProfile()** - User profile data (5-minute TTL)
- **getCachedUserSubscription()** - Subscription information (1-minute TTL)
- **getCachedProjectMetadata()** - Project metadata (2-minute TTL)
- **getCachedUserProjects()** - User's project list (2-minute TTL)
- **getCachedUserSettings()** - User settings (10-minute TTL)

### Cache Invalidation

The `/lib/cacheInvalidation.ts` module handles automatic cache invalidation:

- **invalidateUserProfile()** - Invalidates user profile cache
- **invalidateUserSubscription()** - Invalidates subscription cache
- **invalidateProjectCache()** - Invalidates specific project cache
- **invalidateUserProjects()** - Invalidates user's project list
- **invalidateAssetCache()** - Invalidates asset cache
- **invalidateOnStripeWebhook()** - Handles Stripe webhook events

## Page-Specific Strategies

### 1. app/page.tsx

**Queries Cached:**

- User's projects list

**Strategy:**

```typescript
// Before (uncached):
const { data: projects } = await supabase
  .from('projects')
  .select('id, title, created_at')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(1);

// After (cached with 2-minute TTL):
const projects = await getCachedUserProjects(supabase, user.id);
```

**TTL:** 2 minutes
**Why force-dynamic remains:** User authentication requires dynamic rendering
**Cache invalidation:** Automatic on project creation via `invalidateUserProjects()`

### 2. app/editor/[projectId]/timeline/page.tsx

**Queries Cached:**

- Project metadata (id, title)

**Strategy:**

```typescript
// Before (uncached):
const { data: project } = await supabase
  .from('projects')
  .select('id, title')
  .eq('id', projectId)
  .eq('user_id', user.id)
  .maybeSingle();

// After (cached with 2-minute TTL):
const project = await getCachedProjectMetadata(supabase, projectId, user.id);
```

**TTL:** 2 minutes
**Why force-dynamic remains:** User authentication and authorization checks
**Cache invalidation:** Automatic on project updates

### 3. app/editor/[projectId]/page.tsx

**Queries Cached:**

- Project metadata (id, title)

**Strategy:**
Same as timeline page - uses `getCachedProjectMetadata()`

**TTL:** 2 minutes
**Why force-dynamic remains:** User authentication and authorization checks
**Cache invalidation:** Automatic on project updates

### 4. app/editor/[projectId]/generate-audio/page.tsx

**Queries Cached:**

- Project metadata (id, title)

**Strategy:**
Same as timeline page - uses `getCachedProjectMetadata()`

**TTL:** 2 minutes
**Why force-dynamic remains:** User authentication and authorization checks
**Cache invalidation:** Automatic on project updates

### 5. app/editor/[projectId]/keyframe/page.tsx

**Queries Cached:**

- Project metadata (id, title)

**Strategy:**
Same as timeline page - uses `getCachedProjectMetadata()`

**TTL:** 2 minutes
**Why force-dynamic remains:** User authentication and authorization checks
**Cache invalidation:** Automatic on project updates

## API Route Caching

### app/api/assets/route.ts

**Current Strategy:**

- Rate limiting: 30 requests/minute per user (TIER 3)
- No server-side caching currently implemented
- Client-side caching via response headers could be added

**Potential Enhancement:**

```typescript
// Could add unstable_cache for server-side caching:
import { unstable_cache } from 'next/cache';

const getCachedAssets = unstable_cache(
  async (userId, projectId, type) => {
    // query implementation
  },
  ['assets'],
  { revalidate: 60 }
);
```

## TTL (Time-To-Live) Configuration

All TTL values are defined in `/lib/cache.ts`:

```typescript
export const CacheTTL = {
  userProfile: 5 * 60, // 5 minutes
  userSettings: 10 * 60, // 10 minutes
  userSubscription: 1 * 60, // 1 minute (short due to billing)
  projectMetadata: 2 * 60, // 2 minutes
  userProjects: 2 * 60, // 2 minutes
  asset: 5 * 60, // 5 minutes
  short: 60, // 1 minute (utility)
  medium: 5 * 60, // 5 minutes (utility)
  long: 15 * 60, // 15 minutes (utility)
};
```

## Why force-dynamic Remains

All pages that were updated still use `export const dynamic = 'force-dynamic'` because:

1. **Authentication Required**: All pages require user authentication via `supabase.auth.getUser()`, which is inherently dynamic
2. **Authorization Checks**: Pages verify project ownership which varies per user
3. **User-Specific Data**: The rendered content depends on which user is logged in
4. **Client-Side Rendering**: Most pages use client components that handle dynamic updates

**Key Point:** `force-dynamic` doesn't prevent caching - it only affects Next.js's rendering strategy. Our server-side LRU cache operates independently and provides significant performance benefits even with dynamic rendering.

## Client-Side Caching Opportunities

For future enhancement, consider implementing client-side caching with:

1. **SWR (Stale-While-Revalidate)**

   ```typescript
   import useSWR from 'swr';

   const { data: assets } = useSWR(
     `/api/assets?projectId=${projectId}`,
     fetcher,
     { refreshInterval: 60000 } // 1 minute
   );
   ```

2. **React Query**

   ```typescript
   import { useQuery } from '@tanstack/react-query';

   const { data: assets } = useQuery({
     queryKey: ['assets', projectId],
     queryFn: () => fetchAssets(projectId),
     staleTime: 60000, // 1 minute
   });
   ```

## Performance Impact

### Before Caching

- Each page load: Direct database query
- Project metadata query: ~50-150ms
- User projects query: ~100-300ms
- Total overhead: 150-450ms per page

### After Caching

- Cache hit: ~1-5ms (98-99% faster)
- Cache miss: ~50-150ms + cache storage
- Expected hit rate: 70-90% after warm-up
- Reduced database load: 70-90% fewer queries

## Monitoring Cache Performance

Use the cache statistics API:

```typescript
import { getCacheStats } from '@/lib/cacheInvalidation';

const stats = getCacheStats();
// Returns: { hits, misses, hitRate, size, maxSize }
```

Available via admin endpoint: `/api/admin/cache`

## Cache Invalidation Patterns

### Manual Invalidation

```typescript
import { invalidateUserProjects } from '@/lib/cacheInvalidation';

// After creating a project
await supabase.from('projects').insert({ ... });
await invalidateUserProjects(userId);
```

### Webhook Invalidation

```typescript
// Stripe webhook handling
import { invalidateOnStripeWebhook } from '@/lib/cacheInvalidation';

await invalidateOnStripeWebhook(userId, eventType);
```

### Bulk Invalidation

```typescript
import { invalidateMultipleUsers } from '@/lib/cacheInvalidation';

// Admin operation
await invalidateMultipleUsers([userId1, userId2, userId3]);
```

## Best Practices

1. **Always invalidate on writes**: After any database mutation, invalidate related caches
2. **Use appropriate TTLs**: Shorter for frequently changing data (subscriptions), longer for stable data (user profiles)
3. **Monitor hit rates**: Aim for 70%+ hit rate; adjust TTLs if lower
4. **Cache granularly**: Cache at the query level, not page level
5. **Handle cache misses gracefully**: Always fall back to database query
6. **Log cache operations**: Use serverLogger for debugging and monitoring

## Future Enhancements

1. **Redis Integration**: Replace in-memory cache with Redis for multi-instance deployments
2. **Response Header Caching**: Add Cache-Control headers to API responses
3. **Client-Side Caching**: Implement SWR or React Query for frontend caching
4. **Predictive Prefetching**: Warm cache for commonly accessed routes
5. **Cache Compression**: Compress large cached values to save memory
6. **Distributed Tracing**: Add cache metrics to observability platform

## Environment Variables

```bash
# Optional: Configure cache size
CACHE_MAX_SIZE=1000  # Default: 1000 entries

# Future Redis support
REDIS_URL=redis://localhost:6379  # Not yet implemented
```

## Troubleshooting

### Cache Not Working

1. Check if cache instance is initialized (logs should show "Cache initialized")
2. Verify TTL values are reasonable (> 0)
3. Check for cache invalidation calls removing entries too frequently

### Stale Data Issues

1. Reduce TTL for affected cache keys
2. Ensure cache invalidation is called after mutations
3. Use shorter TTLs for rapidly changing data

### Memory Issues

1. Reduce CACHE_MAX_SIZE
2. Implement cache compression
3. Consider migrating to Redis

## Related Files

- `/lib/cache.ts` - Core LRU cache implementation
- `/lib/cachedData.ts` - Cached query functions
- `/lib/cacheInvalidation.ts` - Cache invalidation utilities
- `/app/api/admin/cache/route.ts` - Cache management API
