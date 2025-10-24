# Caching Layer - Developer Usage Guide

## Quick Start

### Reading Cached Data

```typescript
import { getCachedUserProfile } from '@/lib/cachedData';

// In your API route or Server Component
const profile = await getCachedUserProfile(supabase, userId);
```

### Invalidating Cache

```typescript
import { invalidateUserProfile } from '@/lib/cacheInvalidation';

// After updating user data
await invalidateUserProfile(userId);
```

## Available Cached Functions

### User Data

```typescript
// Get user profile (5 min TTL)
const profile = await getCachedUserProfile(supabase, userId);

// Get user subscription (1 min TTL)
const subscription = await getCachedUserSubscription(supabase, userId);

// Get user settings (10 min TTL) - Future use
const settings = await getCachedUserSettings(supabase, userId);
```

### Project Data

```typescript
// Get single project metadata (2 min TTL)
const project = await getCachedProjectMetadata(supabase, projectId, userId);

// Get all user's projects (2 min TTL)
const projects = await getCachedUserProjects(supabase, userId);
```

### Cache Warming

```typescript
// Preload user data (background operation)
await warmUserCache(supabase, userId);
```

## Available Invalidation Functions

### User Cache

```typescript
// Invalidate ALL user caches
await invalidateUserCache(userId);

// Invalidate specific caches
await invalidateUserProfile(userId);
await invalidateUserSubscription(userId);
await invalidateUserSettings(userId);
```

### Project Cache

```typescript
// Invalidate project metadata
await invalidateProjectCache(projectId, userId);

// Invalidate user's projects list
await invalidateUserProjects(userId);

// Invalidate all project caches
await invalidateAllProjectCaches(userId);
```

### Special Invalidations

```typescript
// Stripe webhook invalidation
await invalidateOnStripeWebhook(userId, 'customer.subscription.updated');

// Admin: Clear everything
await clearAllCaches();
```

## When to Invalidate

### Rule of Thumb

**ALWAYS invalidate cache immediately after mutating data that is cached.**

### Common Scenarios

#### 1. User Profile Updates

```typescript
// Update user profile
await supabase.from('user_profiles').update({ bio: newBio }).eq('id', userId);

// MUST invalidate
await invalidateUserProfile(userId);
```

#### 2. Subscription Changes

```typescript
// Stripe webhook updates subscription
await supabase.from('user_subscriptions').update({ status: 'active' }).eq('user_id', userId);

// MUST invalidate
await invalidateUserSubscription(userId);
```

#### 3. Project Creation/Deletion

```typescript
// Create new project
await supabase.from('projects').insert({ title, user_id: userId });

// MUST invalidate user's projects list
await invalidateUserProjects(userId);
```

#### 4. Project Updates

```typescript
// Update project title
await supabase.from('projects').update({ title: newTitle }).eq('id', projectId);

// MUST invalidate project cache
await invalidateProjectCache(projectId, userId);
```

## Best Practices

### ✅ DO

1. **Always use cached functions for reads**

   ```typescript
   // Good
   const profile = await getCachedUserProfile(supabase, userId);

   // Bad
   const { data: profile } = await supabase
     .from('user_profiles')
     .select('*')
     .eq('id', userId)
     .single();
   ```

2. **Always invalidate after writes**

   ```typescript
   // Good
   await updateUserProfile(userId, data);
   await invalidateUserProfile(userId);

   // Bad - cache will be stale!
   await updateUserProfile(userId, data);
   // Missing invalidation
   ```

3. **Use specific invalidation functions**

   ```typescript
   // Good - only invalidates what changed
   await invalidateUserProfile(userId);

   // Acceptable but less efficient
   await invalidateUserCache(userId); // Clears everything
   ```

4. **Log cache operations in development**
   ```typescript
   const profile = await getCachedUserProfile(supabase, userId);
   // Check logs: "Cache hit: user profile 123 (1ms)"
   ```

### ❌ DON'T

1. **Don't forget to invalidate**

   ```typescript
   // Bad - stale cache!
   await supabase.from('user_profiles').update({ tier: 'premium' });
   // No invalidation - users will see old tier
   ```

2. **Don't over-invalidate**

   ```typescript
   // Bad - clears too much
   await clearAllCaches(); // Only for admin emergencies
   ```

3. **Don't cache unstable data**

   ```typescript
   // Bad - this data changes too frequently
   const onlineStatus = await getCachedUserOnlineStatus(userId);
   // Use direct queries for real-time data
   ```

4. **Don't use cache for critical security checks**

   ```typescript
   // Bad - security checks should always be fresh
   const profile = await getCachedUserProfile(supabase, userId);
   if (profile.tier === 'admin') {
     /* grant access */
   }

   // Good - always verify permissions live
   const { data: profile } = await supabase
     .from('user_profiles')
     .select('tier')
     .eq('id', userId)
     .single();
   if (profile.tier === 'admin') {
     /* grant access */
   }
   ```

## Monitoring Cache Performance

### Check Cache Statistics

```typescript
import { cache } from '@/lib/cache';

const stats = cache.getStats();
console.log('Cache hit rate:', stats.hitRate);
console.log('Cache size:', stats.size);
```

### Admin API

```bash
# Get cache stats
curl -X GET https://your-app.com/api/admin/cache \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Clear all caches (emergency only)
curl -X DELETE https://your-app.com/api/admin/cache \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Logs to Monitor

```typescript
// Cache hits (good - fast!)
event: 'cache.hit';
key: 'user:profile:123';
duration: 1;

// Cache misses (expected occasionally)
event: 'cache.miss';
key: 'user:profile:123';

// Cache invalidations (after data changes)
event: 'cache.invalidate_user';
userId: '123';
```

## Troubleshooting

### Problem: Data Not Updating

**Cause:** Forgot to invalidate cache after mutation

**Solution:**

```typescript
// Add invalidation after update
await supabase.from('user_profiles').update({ ... });
await invalidateUserProfile(userId); // ← Add this
```

### Problem: Too Many Database Queries

**Cause:** Not using cached functions

**Solution:**

```typescript
// Replace direct queries with cached versions
// Before:
const { data } = await supabase.from('user_profiles').select('*').single();

// After:
const profile = await getCachedUserProfile(supabase, userId);
```

### Problem: Cache Hit Rate Too Low

**Possible Causes:**

1. TTL too short - increase TTL values in `/lib/cache.ts`
2. Too much invalidation - review invalidation logic
3. Low traffic - cache needs time to warm up

**Solution:**

```typescript
// Warm cache on user login
await warmUserCache(supabase, userId);
```

## Adding New Cached Queries

### Step 1: Add to Cache Keys

Edit `/lib/cache.ts`:

```typescript
export const CacheKeys = {
  // ... existing keys
  myNewData: (id: string) => `my:data:${id}`,
};

export const CacheTTL = {
  // ... existing TTLs
  myNewData: 3 * 60, // 3 minutes
};
```

### Step 2: Create Cached Function

Edit `/lib/cachedData.ts`:

```typescript
export async function getCachedMyData(
  supabase: SupabaseClient,
  id: string
): Promise<MyData | null> {
  const cacheKey = CacheKeys.myNewData(id);
  const startTime = Date.now();

  try {
    // Try cache first
    const cached = await cache.get<MyData>(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      serverLogger.debug(
        {
          event: 'cache.hit',
          key: cacheKey,
          duration,
        },
        `Cache hit: my data ${id} (${duration}ms)`
      );
      return cached;
    }

    // Cache miss - fetch from database
    serverLogger.debug(
      {
        event: 'cache.miss',
        key: cacheKey,
      },
      `Cache miss: fetching my data ${id} from database`
    );

    const { data, error } = await supabase.from('my_table').select('*').eq('id', id).single();

    if (error || !data) {
      return null;
    }

    // Store in cache
    await cache.set(cacheKey, data, CacheTTL.myNewData);

    const duration = Date.now() - startTime;
    serverLogger.debug(
      {
        event: 'cachedData.my_data.fetched',
        id,
        duration,
      },
      `My data fetched and cached (${duration}ms)`
    );

    return data as MyData;
  } catch (error) {
    serverLogger.error(
      {
        event: 'cachedData.my_data.error',
        id,
        error,
      },
      'Error fetching my data'
    );
    return null;
  }
}
```

### Step 3: Add Invalidation Function

Edit `/lib/cacheInvalidation.ts`:

```typescript
export async function invalidateMyData(id: string): Promise<void> {
  try {
    await cache.del(CacheKeys.myNewData(id));

    serverLogger.debug(
      {
        event: 'cache.invalidate_my_data',
        id,
      },
      `Invalidated my data cache for ${id}`
    );
  } catch (error) {
    serverLogger.error(
      {
        event: 'cache.invalidate_my_data_error',
        id,
        error,
      },
      'Error invalidating my data cache'
    );
  }
}
```

### Step 4: Use in API Route

```typescript
import { getCachedMyData } from '@/lib/cachedData';
import { invalidateMyData } from '@/lib/cacheInvalidation';

// GET - Read with cache
export async function GET(request: NextRequest) {
  const data = await getCachedMyData(supabase, id);
  return NextResponse.json(data);
}

// PUT - Update and invalidate
export async function PUT(request: NextRequest) {
  await supabase.from('my_table').update({ ... }).eq('id', id);
  await invalidateMyData(id);
  return NextResponse.json({ success: true });
}
```

## Configuration

### Adjust Cache Size

```bash
# .env.local
CACHE_MAX_SIZE=2000  # Default: 1000
```

### Adjust TTL Values

Edit `/lib/cache.ts`:

```typescript
export const CacheTTL = {
  userProfile: 5 * 60, // 5 minutes
  userSubscription: 1 * 60, // 1 minute
  // ... adjust as needed
};
```

## Summary

1. **Use cached functions for reads** - `getCached...(...)`
2. **Invalidate after writes** - `invalidate...(...)`
3. **Monitor hit rates** - Check logs and admin API
4. **Add new cached queries** - Follow 4-step pattern

**Questions?** Check the full documentation: `/docs/CACHING_IMPLEMENTATION.md`
