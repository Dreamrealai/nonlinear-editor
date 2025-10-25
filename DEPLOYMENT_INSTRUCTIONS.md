# Production Deployment Instructions

**Date**: 2025-10-25
**Purpose**: Fix critical P0 and P1 errors found in production testing

---

## Summary of Fixes

### Code Fixes (Included in this deployment)

- ✅ Fixed `/generate/video` route - now points to `/editor/[projectId]/generate-video`
- ✅ TypeScript build errors fixed (audit_logs types, ExportedProject)

### Database Migrations Required (Manual Step)

**CRITICAL**: The following migrations exist in the codebase but have NOT been applied to production Supabase:

1. **Export Presets Table**: `supabase/migrations/20251025200000_add_export_presets.sql`
2. **Processing Jobs Table**: `supabase/migrations/20250123000000_add_processing_jobs.sql`
3. **Project Backups Table**: `supabase/migrations/20251024120000_create_project_backups.sql`
4. **Audit Logs Table**: `supabase/migrations/20251024100000_create_audit_logs_table.sql`

---

## Deployment Steps

### Step 1: Deploy Code Changes

```bash
# Already done - just push to main triggers Vercel deployment
git push origin main
```

Vercel will automatically deploy the latest code to production.

---

### Step 2: Apply Database Migrations to Supabase (CRITICAL)

**You must run these migrations in Supabase Studio or via Supabase CLI**

#### Option A: Using Supabase Studio (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to: **SQL Editor** > **New query**
4. Run each migration file in order:

**Migration 1 - Processing Jobs** (if not already exists):

```sql
-- Copy contents of: supabase/migrations/20250123000000_add_processing_jobs.sql
-- Paste and execute in SQL Editor
```

**Migration 2 - Project Backups**:

```sql
-- Copy contents of: supabase/migrations/20251024120000_create_project_backups.sql
-- Paste and execute in SQL Editor
```

**Migration 3 - Audit Logs**:

```sql
-- Copy contents of: supabase/migrations/20251024100000_create_audit_logs_table.sql
-- Paste and execute in SQL Editor
```

**Migration 4 - Export Presets**:

```sql
-- Copy contents of: supabase/migrations/20251025200000_add_export_presets.sql
-- Paste and execute in SQL Editor
```

#### Option B: Using Supabase CLI

```bash
# Link to your production project
supabase link --project-ref YOUR_PROJECT_REF

# Apply all pending migrations
supabase db push

# Verify migrations applied
supabase migration list
```

---

### Step 3: Verify Database Tables Created

Run this query in Supabase SQL Editor to verify all tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'processing_jobs',
  'project_backups',
  'audit_logs',
  'export_presets'
)
ORDER BY table_name;
```

Expected output (4 rows):

- audit_logs
- export_presets
- processing_jobs
- project_backups

---

### Step 4: Seed Export Presets

The `export_presets` migration includes automatic seeding of platform presets (YouTube, Instagram, TikTok, etc.).

Verify presets were created:

```sql
SELECT name, platform, resolution, fps
FROM export_presets
WHERE is_platform_preset = true
ORDER BY platform, name;
```

Expected: ~10 platform presets (YouTube 1080p/4K, Instagram Feed/Story/Reel, TikTok, Twitter, Facebook, LinkedIn)

---

### Step 5: Set Environment Variables (Optional)

If you want to enable video export functionality, set in Vercel:

```bash
VIDEO_EXPORT_ENABLED=true
```

**Note**: Only set this if you have a background worker configured to process export jobs. Otherwise, jobs will queue but never process.

---

### Step 6: Verify Fixes in Production

After deploying code and applying migrations, test these features:

**Test Export Functionality**:

1. Navigate to: https://nonlinear-editor-[your-url].vercel.app
2. Sign in with production credentials
3. Open any project with clips
4. Click "Export Video" button
5. **Expected**: Export modal opens and displays preset list
6. **Previously**: Modal stuck in loading state with 500 error

**Test Backups**:

1. In editor, click "Backups" button
2. Click "Create Backup"
3. **Expected**: Backup created successfully
4. **Previously**: 500 error

**Test Video Generation Navigation**:

1. Click "Generate Video" in navigation
2. **Expected**: Navigates to `/editor/[projectId]/generate-video` page
3. **Previously**: 404 error on `/generate/video`

---

## Errors Fixed

### P0 - Critical (Fixed with database migrations)

- ✅ Export presets API 500 error → Fixed when `export_presets` table created
- ✅ Export queue API 500 error → Fixed when `processing_jobs` table exists
- ✅ Project backups 500 error → Fixed when `project_backups` table created

### P1 - High Priority (Fixed in code)

- ✅ `/generate/video` route 404 → Fixed navigation link in EditorHeader.tsx

### Build Errors (Fixed in code)

- ✅ TypeScript error on `audit_logs` table types
- ✅ TypeScript error on `ExportedProject` type mismatch
- ✅ Unused import warnings

---

## Outstanding Issues (Not Fixed in This Deployment)

### P1 - Requires Investigation

- ⚠️ **Chat responses not displaying in UI** - API calls succeed but UI doesn't update
  - Needs frontend debugging
  - Chat API returns 200 OK
  - Messages saved to database successfully
  - Issue appears to be in React component state management

### P2 - Low Priority

- ⚠️ **Accessibility warnings** - DialogTitle missing in some dialogs
  - Non-blocking, can be fixed in next deployment
  - Affects screen reader users only

### P2 - Expected Behavior

- ⚠️ **Analytics endpoints return ERR_ABORTED** - Sent before auth completes
  - Low priority, analytics still collected after auth

- ⚠️ **Asset signing 404 for deleted assets** - Expected for missing assets
  - Need better error handling for missing assets

---

## Rollback Plan

If deployment causes issues:

1. **Rollback Code**:

   ```bash
   # In Vercel dashboard, rollback to previous deployment
   # OR revert git commits:
   git revert HEAD
   git push origin main
   ```

2. **Rollback Database** (if needed):
   ```sql
   -- Drop tables in reverse order (if absolutely necessary)
   DROP TABLE IF EXISTS export_presets CASCADE;
   DROP TABLE IF EXISTS project_backups CASCADE;
   DROP TABLE IF EXISTS audit_logs CASCADE;
   -- Note: Do NOT drop processing_jobs if it has active jobs
   ```

---

## Success Criteria

After deployment, verify:

- [ ] All migrations applied successfully (4 new tables)
- [ ] Export modal loads without errors
- [ ] Export presets displayed in modal (~10 platform presets)
- [ ] Project backups can be created
- [ ] "Generate Video" navigation works (no 404)
- [ ] Production build succeeds with no TypeScript errors

---

## Next Steps (Future Deployments)

1. Fix chat UI display issue
2. Add DialogTitle to all dialogs for accessibility
3. Improve error handling for missing assets
4. Configure background worker for video export (if needed)
5. Enable comprehensive error monitoring (Sentry/Axiom)

---

## Questions?

If issues occur during deployment:

1. Check Vercel deployment logs for build errors
2. Check Supabase logs for SQL errors
3. Test in production with browser DevTools console open
4. Review `PRODUCTION_TEST_ERRORS.md` for full error details

---

**Deployment prepared by**: Automated testing with Claude Code
**Last updated**: 2025-10-25
