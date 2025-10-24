# Timeline State JSONB Column Deprecation

## Overview

The `timeline_state_jsonb` column in the `projects` table has been deprecated as of **October 23, 2025**. All timeline data is now stored in the dedicated `timelines` table for better data separation, performance, and maintainability.

## Migration Information

- **Migration File**: `/supabase/migrations/20251025100000_deprecate_timeline_state_jsonb.sql`
- **Deprecation Date**: 2025-10-23
- **Issue Reference**: NEW-MED-004
- **Status**: Column deprecated but retained for backward compatibility

## Background

### Why Was This Column Deprecated?

1. **Separation of Concerns**: Timeline data is complex and changes frequently. Storing it in a dedicated table improves:
   - Query performance (index on project_id instead of scanning JSONB)
   - Data integrity (dedicated schema for timeline structure)
   - Maintainability (timeline updates don't trigger project row updates)

2. **Code Analysis Results**:
   - Analysis showed no active code reading from `projects.timeline_state_jsonb`
   - All read operations were already using the `timelines` table
   - Double writes were identified as unnecessary overhead

3. **Performance Benefits**:
   - Reduced row size in the `projects` table
   - Better index utilization for timeline queries
   - Eliminated redundant JSONB parsing

### Timeline of Changes

| Date       | Change               | Description                                                        |
| ---------- | -------------------- | ------------------------------------------------------------------ |
| 2025-01-01 | Initial Schema       | Both `projects.timeline_state_jsonb` and `timelines` table created |
| 2025-10-23 | Double Write Removed | Stopped writing to `projects.timeline_state_jsonb`                 |
| 2025-10-23 | Code Verification    | Confirmed no code reads from deprecated column                     |
| 2025-10-25 | Column Deprecated    | Added deprecation comments and warning trigger                     |
| TBD        | Column Removal       | Future removal after 90+ day monitoring period                     |

## Migration Path

### For Application Code

#### Before (Deprecated)

```typescript
// DON'T USE - This pattern is deprecated
const { data } = await supabase
  .from('projects')
  .select('timeline_state_jsonb')
  .eq('id', projectId)
  .single();

const timeline = data?.timeline_state_jsonb;
```

#### After (Correct)

```typescript
// USE THIS - Read from timelines table
const { data } = await supabase
  .from('timelines')
  .select('timeline_data')
  .eq('project_id', projectId)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const timeline = data?.timeline_data ?? null;
```

### Reference Implementation

See `/lib/saveLoad.ts` for the current reference implementation:

```typescript
// Loading timeline data
export async function loadTimeline(projectId: string): Promise<Timeline | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('timelines')
    .select('timeline_data')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    browserLogger.error({ error, projectId }, 'Failed to load timeline');
    return null;
  }

  return (data?.timeline_data as Timeline) ?? null;
}

// Saving timeline data
export async function saveTimeline(projectId: string, timeline: Timeline): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from('timelines').upsert(
    {
      project_id: projectId,
      timeline_data: timeline,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id' }
  );

  if (error) {
    browserLogger.error({ error, projectId }, 'Failed to save timeline');
    return;
  }
}
```

### For Database Queries

#### Before (Deprecated)

```sql
-- DON'T USE
SELECT timeline_state_jsonb FROM projects WHERE id = $1;

UPDATE projects
SET timeline_state_jsonb = $2
WHERE id = $1;
```

#### After (Correct)

```sql
-- USE THIS
SELECT timeline_data FROM timelines WHERE project_id = $1;

INSERT INTO timelines (project_id, timeline_data, updated_at)
VALUES ($1, $2, NOW())
ON CONFLICT (project_id)
DO UPDATE SET
  timeline_data = EXCLUDED.timeline_data,
  updated_at = EXCLUDED.updated_at;
```

## What Changed in the Migration

The migration (`20251025100000_deprecate_timeline_state_jsonb.sql`) implements:

1. **Column Comment**: Added deprecation notice to `projects.timeline_state_jsonb`
2. **Table Comment**: Updated `projects` table comment to note the deprecation
3. **Warning Trigger**: Created trigger that logs a NOTICE when the column is updated
4. **Documentation**: Added inline SQL comments explaining the deprecation

### Warning Trigger

A database trigger has been added to help identify any legacy code still writing to this column:

```sql
CREATE TRIGGER warn_deprecated_timeline_state
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION warn_timeline_state_jsonb_deprecated();
```

If you see warnings like this in your logs:

```
NOTICE: DEPRECATION WARNING: timeline_state_jsonb column is deprecated.
Use timelines table instead. Project ID: 550e8400-e29b-41d4-a716-446655440000
```

Update your code to use the `timelines` table instead.

## Backward Compatibility

### Why Keep the Column?

The column is retained (not dropped) for:

1. **True Backward Compatibility**: External tools or integrations may still read this column
2. **Safe Rollback**: Allows reverting changes if critical issues are discovered
3. **Data Preservation**: Historical data remains accessible for forensic purposes
4. **Gradual Migration**: Provides time for all systems to migrate

### Default Value

The column retains its default value of `'{}'::jsonb` to ensure:

- INSERT statements without this column continue to work
- No NULL values are introduced
- Schema validation passes

## Monitoring and Future Removal

### Monitoring Period

The column will be monitored for **90+ days** after deprecation:

1. **Trigger Warnings**: Review database logs for deprecation warnings
2. **Usage Analysis**: Check if any code paths still access this column
3. **External Integrations**: Verify third-party tools have migrated
4. **Data Validation**: Ensure all timeline data exists in `timelines` table

### Before Removal

Before the column can be safely removed:

- [ ] 90+ days of monitoring with no trigger warnings
- [ ] Verification that no external integrations depend on this column
- [ ] Confirmation all legacy code has been migrated
- [ ] Data export created for historical records
- [ ] Documentation updated
- [ ] Stakeholder approval obtained

### Removal Process

When ready to remove (future major version):

```sql
-- Step 1: Drop the trigger
DROP TRIGGER IF EXISTS warn_deprecated_timeline_state ON projects;
DROP FUNCTION IF EXISTS warn_timeline_state_jsonb_deprecated();

-- Step 2: Export any remaining data (if needed)
COPY (
  SELECT id, timeline_state_jsonb
  FROM projects
  WHERE timeline_state_jsonb::text != '{}'
) TO '/tmp/timeline_state_backup.csv' CSV HEADER;

-- Step 3: Drop the column
ALTER TABLE projects DROP COLUMN timeline_state_jsonb;

-- Step 4: Verify
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name = 'timeline_state_jsonb';
-- Should return no rows
```

## Troubleshooting

### I'm Getting Deprecation Warnings

**Cause**: Your code is updating the `timeline_state_jsonb` column.

**Solution**: Update your code to use the `timelines` table:

1. Find the code triggering the warning (check Project ID in log)
2. Replace writes to `projects.timeline_state_jsonb` with upserts to `timelines`
3. Follow the migration examples above

### Timeline Data is Missing

**Cause**: Data may only exist in the old column (very old projects).

**Solution**: One-time data migration (if needed):

```sql
-- Check for projects with timeline data in old column but not in timelines table
SELECT p.id, p.title
FROM projects p
LEFT JOIN timelines t ON t.project_id = p.id
WHERE p.timeline_state_jsonb::text != '{}'
  AND t.id IS NULL;

-- Migrate the data (if any found)
INSERT INTO timelines (project_id, timeline_data, updated_at)
SELECT id, timeline_state_jsonb, NOW()
FROM projects
WHERE id IN (
  SELECT p.id
  FROM projects p
  LEFT JOIN timelines t ON t.project_id = p.id
  WHERE p.timeline_state_jsonb::text != '{}'
    AND t.id IS NULL
);
```

### How Do I Rollback?

If you need to rollback the deprecation:

```sql
-- Remove deprecation markers
DROP TRIGGER IF EXISTS warn_deprecated_timeline_state ON projects;
DROP FUNCTION IF EXISTS warn_timeline_state_jsonb_deprecated();
COMMENT ON COLUMN projects.timeline_state_jsonb IS NULL;
COMMENT ON TABLE projects IS NULL;
```

Then restore double-write logic in your application code.

## Related Documentation

- [Coding Best Practices](/docs/CODING_BEST_PRACTICES.md) - Database patterns
- [Architecture Overview](/docs/ARCHITECTURE_OVERVIEW.md) - Data model design
- [Service Layer Guide](/docs/SERVICE_LAYER_GUIDE.md) - Business logic patterns

## References

- **Migration File**: `/supabase/migrations/20251025100000_deprecate_timeline_state_jsonb.sql`
- **Implementation**: `/lib/saveLoad.ts`
- **Initial Schema**: `/supabase/migrations/20250101000000_init_schema.sql`
- **Issue**: NEW-MED-004

## Questions?

If you have questions about this migration:

1. Review the migration file for detailed inline comments
2. Check the reference implementation in `/lib/saveLoad.ts`
3. Review database trigger warnings in logs
4. Consult the architecture documentation

---

**Last Updated**: 2025-10-25
**Status**: Active Deprecation (Column Retained)
**Next Review**: 2026-01-23 (90 days after deprecation)
