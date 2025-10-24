# Database Performance Indexes

This document describes the database indexes created for performance optimization.

## Overview

Database indexes have been added to optimize common query patterns in the non-linear video editor. These indexes significantly improve query performance for:

- Project listings and filtering
- Asset pagination and filtering
- Scene detection queries
- Chat message history
- Processing job tracking

## Indexes Added

### Projects Table

| Index Name                     | Columns                    | Purpose                                                      |
| ------------------------------ | -------------------------- | ------------------------------------------------------------ |
| `projects_user_id_created_idx` | `user_id, created_at DESC` | Optimizes project listing by user with chronological sorting |
| `projects_updated_at_idx`      | `updated_at DESC`          | Enables fast "recently updated" queries                      |

**Query Patterns Optimized:**

```sql
-- Get user's projects sorted by creation date
SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC;

-- Get recently updated projects
SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 10;
```

### Assets Table

| Index Name                   | Columns                       | Purpose                                       |
| ---------------------------- | ----------------------------- | --------------------------------------------- |
| `assets_project_type_idx`    | `project_id, type`            | Fast filtering by project and asset type      |
| `assets_project_created_idx` | `project_id, created_at DESC` | Optimized pagination within projects          |
| `assets_user_id_idx`         | `user_id`                     | Quick user quota and ownership checks         |
| `assets_source_idx`          | `source`                      | Filter assets by source (upload/genai/ingest) |

**Query Patterns Optimized:**

```sql
-- Get all video assets for a project
SELECT * FROM assets WHERE project_id = $1 AND type = 'video';

-- Paginate assets in a project
SELECT * FROM assets
WHERE project_id = $1
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- Count user's total assets (quota check)
SELECT COUNT(*) FROM assets WHERE user_id = $1;
```

### Scenes Table

| Index Name              | Columns              | Purpose                                   |
| ----------------------- | -------------------- | ----------------------------------------- |
| `scenes_asset_time_idx` | `asset_id, start_ms` | Fast scene lookups with temporal ordering |
| `scenes_project_idx`    | `project_id`         | Bulk scene operations per project         |

**Query Patterns Optimized:**

```sql
-- Get all scenes for an asset ordered by time
SELECT * FROM scenes WHERE asset_id = $1 ORDER BY start_ms ASC;

-- Count scenes in a project
SELECT COUNT(*) FROM scenes WHERE project_id = $1;
```

### Chat Messages Table

| Index Name                          | Columns                       | Purpose                           |
| ----------------------------------- | ----------------------------- | --------------------------------- |
| `chat_messages_project_created_idx` | `project_id, created_at DESC` | Efficient chat history pagination |

**Query Patterns Optimized:**

```sql
-- Get recent chat messages for a project
SELECT * FROM chat_messages
WHERE project_id = $1
ORDER BY created_at DESC
LIMIT 50;
```

### Processing Jobs Table

| Index Name                            | Columns                                                       | Purpose                                |
| ------------------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| `processing_jobs_user_status_idx`     | `user_id, status`                                             | Dashboard views filtered by status     |
| `processing_jobs_project_created_idx` | `project_id, created_at DESC`                                 | Recent jobs per project                |
| `processing_jobs_active_idx`          | `created_at DESC` WHERE `status IN ('pending', 'processing')` | **Partial index** for active jobs only |
| `processing_jobs_failed_idx`          | `created_at DESC` WHERE `status = 'failed'`                   | **Partial index** for error monitoring |

**Query Patterns Optimized:**

```sql
-- Get user's pending/processing jobs
SELECT * FROM processing_jobs
WHERE user_id = $1 AND status IN ('pending', 'processing')
ORDER BY created_at DESC;

-- Get recent failed jobs (monitoring)
SELECT * FROM processing_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 100;
```

## Partial Indexes

Partial indexes are created on specific subsets of data where queries are frequently filtered by certain conditions. These are highly efficient as they only index rows that match the condition.

### Benefits of Partial Indexes:

- **Smaller index size**: Only indexes relevant rows
- **Faster queries**: Less data to scan
- **Better cache utilization**: More index fits in memory

### Example:

The `processing_jobs_active_idx` only indexes jobs with status 'pending' or 'processing'. Since completed jobs are rarely queried after completion, this dramatically reduces index size while optimizing the most common query pattern.

## Expected Performance Improvements

### Before Optimization:

- Project list query: ~50-100ms (full table scan)
- Asset pagination: ~30-80ms (filtered table scan)
- Active jobs query: ~100-200ms (status filter on large table)

### After Optimization:

- Project list query: ~5-10ms (index scan)
- Asset pagination: ~5-15ms (index-only scan)
- Active jobs query: ~2-5ms (partial index scan)

**Overall improvement: 10-40x faster queries**

## Monitoring Index Usage

To verify indexes are being used, run EXPLAIN ANALYZE on queries:

```sql
EXPLAIN ANALYZE
SELECT * FROM assets
WHERE project_id = 'xxx' AND type = 'video'
ORDER BY created_at DESC
LIMIT 20;
```

Look for:

- `Index Scan` or `Index Only Scan` (good)
- `Bitmap Index Scan` (good for multiple conditions)
- `Seq Scan` (bad - means index not used)

## Maintenance

PostgreSQL automatically maintains indexes. However, for optimal performance:

1. **Vacuum regularly**: Run `VACUUM ANALYZE` to update statistics
2. **Reindex periodically**: `REINDEX TABLE table_name` if performance degrades
3. **Monitor bloat**: Check for index bloat monthly

### Automatic Vacuum

Supabase runs auto-vacuum, but you can manually trigger it:

```sql
VACUUM ANALYZE projects;
VACUUM ANALYZE assets;
VACUUM ANALYZE processing_jobs;
```

## Index Size Monitoring

To check index sizes:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Trade-offs

### Pros:

- Dramatically faster read queries
- Better user experience (faster page loads)
- Reduced database load

### Cons:

- Slightly slower writes (indexes must be updated)
- Increased storage (indexes take ~10-30% of table size)
- More memory usage (indexes cached in RAM)

For a read-heavy application like a video editor, these trade-offs are highly favorable.

## Migration

The indexes are created in migration: `20251024100000_add_performance_indexes.sql`

To apply:

```bash
supabase db push
```

To verify:

```sql
SELECT * FROM pg_indexes WHERE schemaname = 'public';
```

## Future Optimizations

Consider adding:

1. **Covering indexes**: Include frequently queried columns in index
2. **Expression indexes**: For computed values (e.g., LOWER(email))
3. **GIN indexes**: For JSONB columns if frequently queried
4. **Full-text search indexes**: For text search on prompts/descriptions

## References

- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- [Index Maintenance](https://www.postgresql.org/docs/current/routine-vacuuming.html)
