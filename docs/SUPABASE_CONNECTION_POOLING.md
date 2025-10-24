# Supabase Connection Pooling Configuration

This document describes how to configure connection pooling for the Supabase database to optimize performance and prevent connection exhaustion.

## Overview

Supabase provides built-in connection pooling through PgBouncer, which manages database connections efficiently. This is especially important for serverless environments like Vercel where many short-lived connections are created.

## Connection Pool Modes

Supabase supports two connection pooling modes:

### 1. Transaction Mode (Recommended)
- **Use Case**: Most application queries
- **Connection String**: `postgresql://[user]:[password]@[host]:6543/postgres?pgbouncer=true`
- **Port**: 6543
- **Behavior**: Connection is assigned for the duration of a transaction
- **Max Connections**: Higher limit (configurable based on plan)

### 2. Session Mode
- **Use Case**: Long-running connections, prepared statements
- **Connection String**: `postgresql://[user]:[password]@[host]:5432/postgres`
- **Port**: 5432
- **Behavior**: Connection is assigned for entire session
- **Max Connections**: Lower limit

## Configuration Steps

### Step 1: Update Supabase Connection String

By default, the Supabase SDK uses connection pooling automatically. No additional configuration is required for the JavaScript client.

The SDK automatically:
- Uses HTTP connections (not direct Postgres connections)
- Implements client-side connection pooling
- Reuses connections across requests
- Handles connection lifecycle

### Step 2: Configure Connection Pool Settings (Optional)

If you need to configure specific pooling behavior, you can set these environment variables:

```bash
# Maximum number of idle connections (default: 10)
SUPABASE_POOL_MAX_IDLE=10

# Maximum number of open connections (default: 100)
SUPABASE_POOL_MAX_OPEN=100

# Maximum connection lifetime in seconds (default: 3600 = 1 hour)
SUPABASE_POOL_MAX_LIFETIME=3600

# Connection idle timeout in seconds (default: 600 = 10 minutes)
SUPABASE_POOL_IDLE_TIMEOUT=600
```

**Note**: These settings apply if using direct Postgres connections. The Supabase JS SDK uses HTTP/REST API and doesn't require these settings.

### Step 3: Monitor Connection Usage

Monitor your connection pool usage in the Supabase dashboard:

1. Go to **Settings** → **Database**
2. View **Connection Pooling** section
3. Check current connection count vs. limit

## Best Practices

### 1. Use Supabase SDK (Recommended)

```typescript
// ✅ Good: Uses HTTP API with built-in pooling
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);
await supabase.from('users').select('*');
```

### 2. Avoid Direct Postgres Connections in Serverless

```typescript
// ❌ Bad: Direct Postgres connections in serverless environments
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

**Why?** Serverless functions create many short-lived instances, which can exhaust connection pools.

### 3. Reuse Client Instances

```typescript
// ✅ Good: Singleton pattern (already implemented in our codebase)
// lib/supabase.ts
export const createBrowserSupabaseClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// ❌ Bad: Creating new client for each request
function MyComponent() {
  const supabase = createClient(url, key); // Don't do this
}
```

### 4. Close Connections Properly

The Supabase SDK automatically handles connection cleanup. No manual cleanup needed.

### 5. Use Service Role Client Sparingly

```typescript
// Service role client bypasses RLS and uses more resources
const adminClient = createServiceSupabaseClient();

// ✅ Good: Use for admin operations only
await adminClient.from('users').update({ role: 'admin' });

// ❌ Bad: Use for regular user queries
await adminClient.from('posts').select('*'); // Use regular client instead
```

## Connection Pool Limits by Plan

| Plan | Transaction Mode | Session Mode |
|------|-----------------|--------------|
| Free | 50 connections | 5 connections |
| Pro | 200 connections | 15 connections |
| Team | 400 connections | 30 connections |
| Enterprise | Custom | Custom |

## Troubleshooting

### Error: "remaining connection slots are reserved"

**Cause**: Connection pool is exhausted

**Solutions**:
1. Upgrade to Pro plan for more connections
2. Optimize queries to reduce connection time
3. Use transaction mode (port 6543)
4. Implement retry logic with exponential backoff

```typescript
async function retryQuery<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Error: "prepared statement already exists"

**Cause**: Using prepared statements with transaction mode pooling

**Solution**: Switch to session mode for prepared statements, or avoid prepared statements

### High Connection Count

**Diagnosis**:
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check connections by state
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- Check long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

**Solutions**:
1. Identify and optimize long-running queries
2. Implement query timeouts
3. Use connection pooling (already enabled by default)
4. Scale up database plan

## Performance Monitoring

### Key Metrics to Monitor

1. **Connection Count**
   - Current vs. limit
   - Trend over time
   - Peak usage times

2. **Query Performance**
   - Average query time
   - Slow queries (>1s)
   - Query frequency

3. **Error Rates**
   - Connection errors
   - Timeout errors
   - Query errors

### Monitoring Setup

Use Supabase Dashboard:
- **Database** → **Connection Pooling**: View real-time connections
- **Database** → **Query Performance**: Identify slow queries
- **Logs** → **Database**: View connection errors

## Implementation in Our Codebase

Our codebase already implements connection pooling best practices:

### 1. SDK-Based Access
All database access uses the Supabase SDK (HTTP API), which automatically pools connections.

### 2. Client Factory Pattern
```typescript
// lib/supabase.ts
export const createBrowserSupabaseClient = () => { ... }
export const createServerSupabaseClient = async () => { ... }
export const createServiceSupabaseClient = () => { ... }
```

### 3. Proper Client Usage
- Browser client: For client components (auto-pooled)
- Server client: For server components (auto-pooled)
- Service client: For admin operations (used sparingly)

### 4. No Direct Postgres Connections
We don't use `pg` or direct Postgres connections, avoiding connection pool exhaustion.

## Additional Configuration

### Environment Variables

Add these to `.env.local` if you need custom connection pool settings:

```bash
# Supabase connection pooling (optional - defaults are fine)
SUPABASE_POOL_MAX_IDLE=10
SUPABASE_POOL_MAX_OPEN=100
SUPABASE_POOL_MAX_LIFETIME=3600
SUPABASE_POOL_IDLE_TIMEOUT=600
```

### Next.js Configuration

No additional Next.js configuration needed. Connection pooling works out-of-the-box with:
- Server Components
- API Routes
- Server Actions
- Edge Runtime
- Middleware

## Summary

✅ **Our implementation already uses connection pooling best practices:**
- Uses Supabase SDK (HTTP API with auto-pooling)
- Client factory pattern for reuse
- No direct Postgres connections
- Proper client usage patterns

✅ **No additional configuration required** - connection pooling works by default

✅ **Monitoring available** in Supabase Dashboard

✅ **Scales with Supabase plan** - upgrade for more connections if needed

## References

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
