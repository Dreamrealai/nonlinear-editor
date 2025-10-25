# Supabase Connection Pooling Configuration

This document describes how to configure connection pooling for the Supabase database to optimize performance and prevent connection exhaustion.

## Overview

Supabase provides built-in connection pooling through **Supavisor** (new projects) or **PgBouncer** (legacy projects), which manages database connections efficiently. This is especially important for serverless environments like Vercel where many short-lived connections are created.

### Supavisor vs PgBouncer

- **Supavisor**: New connection pooler for all new Supabase projects (recommended)
  - More efficient handling of serverless workloads
  - Better connection multiplexing
  - Improved performance metrics
  - Available on all new projects by default

- **PgBouncer**: Legacy connection pooler for older projects
  - Still supported and maintained
  - Similar functionality to Supavisor

## Connection Pool Modes

Supabase supports two connection pooling modes:

### 1. Transaction Mode (Recommended)

- **Use Case**: Most application queries, serverless functions
- **Connection String (Supavisor)**: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
- **Connection String (PgBouncer)**: `postgresql://[user]:[password]@[host]:6543/postgres?pgbouncer=true`
- **Port**: 6543
- **Behavior**: Connection is assigned for the duration of a transaction
- **Max Connections**: Higher limit (configurable based on plan)
- **Best for**: Short-lived serverless functions, API routes, edge functions

### 2. Session Mode

- **Use Case**: Long-running connections, prepared statements, advisory locks
- **Connection String (Supavisor)**: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
- **Connection String (Direct)**: `postgresql://[user]:[password]@[host]:5432/postgres`
- **Port**: 5432
- **Behavior**: Connection is assigned for entire session
- **Max Connections**: Lower limit
- **Best for**: Background jobs, long-running processes, connection-specific features

## Configuration Steps

### Step 1: Verify Connection Pooling (Already Configured ✅)

**Our application already uses connection pooling best practices!**

The Supabase JavaScript SDK (`@supabase/supabase-js`) automatically:

- Uses HTTP/REST API connections (not direct Postgres connections)
- Implements efficient connection pooling server-side via PostgREST
- Reuses connections across requests
- Handles connection lifecycle automatically
- Works seamlessly with serverless environments (Vercel, Edge Runtime)

**No client-side configuration required** - connection pooling is handled automatically by Supabase's infrastructure.

### Step 2: Configure Dashboard Settings (Optional)

You can adjust connection pool settings in the Supabase Dashboard if needed:

1. Navigate to: **Settings** → **Database** → **Connection Pooling**
2. Configure these settings:

```yaml
Pool Mode: Transaction (recommended for serverless)
Default Pool Size: 15-40 (depending on your plan and usage)
Max Client Connections: 50-200 (based on plan tier)

Recommended Settings by Plan:
  Free Tier:
    - Pool Size: 15
    - Max Connections: 50
    - Transaction Mode recommended

  Pro Plan:
    - Pool Size: 20-30
    - Max Connections: 200
    - Transaction Mode recommended

  Team/Enterprise:
    - Pool Size: 30-50
    - Max Connections: 400+
    - Transaction Mode for API traffic
```

**Note**: Default settings are usually sufficient. Only adjust if you experience connection issues.

### Step 3: Monitor Connection Usage

Monitor your connection pool usage in the Supabase dashboard:

1. Go to **Settings** → **Database** → **Connection Pooling**
2. View real-time connection metrics
3. Check current connection count vs. limit
4. Monitor connection usage over time

## Best Practices

### 1. Use Supabase SDK (Recommended) ✅

```typescript
// ✅ Good: Uses HTTP API with built-in pooling
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);
await supabase.from('users').select('*');
```

**Our implementation**: All database access uses the Supabase SDK, which automatically handles connection pooling through PostgREST.

### 2. Avoid Direct Postgres Connections in Serverless ❌

```typescript
// ❌ Bad: Direct Postgres connections in serverless environments
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

**Why?** Serverless functions create many short-lived instances, which can exhaust connection pools. The Supabase SDK uses HTTP/REST API instead of direct database connections.

### 3. Reuse Client Instances ✅

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

**Our implementation**: Client factory pattern in `/lib/supabase.ts` ensures efficient client reuse.

### 4. Close Connections Properly ✅

The Supabase SDK automatically handles connection cleanup. No manual cleanup needed.

### 5. Use Service Role Client Sparingly ⚠️

```typescript
// Service role client bypasses RLS and uses more resources
const adminClient = createServiceSupabaseClient();

// ✅ Good: Use for admin operations only
await adminClient.from('users').update({ role: 'admin' });

// ❌ Bad: Use for regular user queries
await adminClient.from('posts').select('*'); // Use regular client instead
```

## Connection Pool Limits by Plan

| Plan       | Transaction Mode | Session Mode   | Notes                       |
| ---------- | ---------------- | -------------- | --------------------------- |
| Free       | 50 connections   | 5 connections  | Sufficient for development  |
| Pro        | 200 connections  | 15 connections | Recommended for production  |
| Team       | 400 connections  | 30 connections | For larger applications     |
| Enterprise | Custom           | Custom         | Configurable based on needs |

## Troubleshooting

### Error: "remaining connection slots are reserved"

**Cause**: Connection pool is exhausted

**Solutions**:

1. Verify you're using the Supabase SDK (not direct `pg` connections)
2. Upgrade to Pro plan for more connections
3. Optimize queries to reduce connection time
4. Check for connection leaks in custom code
5. Implement retry logic with exponential backoff

```typescript
async function retryQuery<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
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

Optional: Integrate with monitoring tools:

- Axiom (application-level logging)
- Sentry (error tracking)
- PostHog (performance analytics)

## Implementation in Our Codebase

Our codebase already implements connection pooling best practices:

### 1. SDK-Based Access ✅

All database access uses the Supabase SDK (HTTP API), which automatically pools connections server-side.

### 2. Client Factory Pattern ✅

```typescript
// lib/supabase.ts
export const createBrowserSupabaseClient = () => { ... }
export const createServerSupabaseClient = async () => { ... }
export const createServiceSupabaseClient = () => { ... }
```

### 3. Proper Client Usage ✅

- **Browser client**: For client components (auto-pooled)
- **Server client**: For server components (auto-pooled)
- **Service client**: For admin operations (used sparingly)

### 4. No Direct Postgres Connections ✅

We don't use `pg`, `pg-pool`, or direct Postgres connections, avoiding connection pool exhaustion in serverless environments.

### 5. Serverless-Optimized ✅

- Works seamlessly with Vercel Edge Runtime
- Compatible with Next.js App Router
- No connection management required

## Environment Variables

**No additional environment variables are required for connection pooling.**

The following variables are documented for reference if you ever use direct Postgres connections with libraries like `pg` or `pg-pool`:

```bash
# Connection pool settings (only for direct Postgres connections via pg/pg-pool)
# NOT USED by Supabase JS SDK - these are here for reference only
# DO NOT ADD these to .env.local unless using direct database connections

# SUPABASE_POOL_MAX_IDLE=10         # Max idle connections
# SUPABASE_POOL_MAX_OPEN=100        # Max open connections
# SUPABASE_POOL_MAX_LIFETIME=3600   # Max connection lifetime (seconds)
# SUPABASE_POOL_IDLE_TIMEOUT=600    # Idle timeout (seconds)
```

**Note**: Our application uses `@supabase/supabase-js` exclusively, which uses HTTP/REST API. We do NOT use direct Postgres connections, so these variables are not needed.

### Next.js Configuration

No additional Next.js configuration needed. Connection pooling works out-of-the-box with:

- Server Components
- API Routes
- Server Actions
- Edge Runtime
- Middleware

## Summary

✅ **Our implementation already uses connection pooling best practices:**

- Uses Supabase SDK (HTTP API with auto-pooling via PostgREST)
- Client factory pattern for efficient reuse
- No direct Postgres connections
- Proper client usage patterns
- Serverless-optimized

✅ **No additional configuration required** - connection pooling works by default

✅ **Monitoring available** in Supabase Dashboard

✅ **Scales with Supabase plan** - upgrade for more connections if needed

## Configuration Checklist

- [x] Using Supabase JavaScript SDK (`@supabase/supabase-js`)
- [x] Client factory pattern implemented (`/lib/supabase.ts`)
- [x] No direct Postgres connections (no `pg` or `pg-pool`)
- [x] Service role client used sparingly
- [x] Connection pooling enabled (automatic via SDK)
- [ ] Optional: Monitor connection usage in dashboard
- [ ] Optional: Configure custom pool settings if experiencing issues
- [ ] Optional: Upgrade plan if hitting connection limits

## References

- [Supabase Connection Management Docs](https://supabase.com/docs/guides/database/connection-management)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Supavisor Pooler](https://supabase.com/docs/guides/database/supavisor)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

---

**Last Updated**: 2025-10-24
**Status**: Connection pooling configured and working ✅
**Action Required**: None - monitoring recommended
