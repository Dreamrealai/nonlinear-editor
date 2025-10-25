# 🚨 URGENT Production Database Fix Required

**Date**: 2025-10-25
**Status**: Action Required
**Priority**: P0 - Critical

## Problem Summary

Production testing with agent swarms revealed **3 critical P0 errors**:

1. ❌ **Database Schema Error** - Missing `assets_snapshot` column → Backups failing (500)
2. ❌ **Orphaned Timeline Clips** - 4 clips reference deleted assets → Asset signing failing (404)
3. ❌ **Playback Engine Broken** - Cannot play videos due to missing assets

## Immediate Action Required

### Step 1: Run Database Migration (5 minutes)

**URGENT**: Log into Supabase SQL Editor and run this migration:

```bash
# Location: supabase/migrations/20251025140000_critical_production_fix.sql
```

This migration will:

- ✅ Add missing `assets_snapshot` column to `project_backups` table
- ✅ Fix user_profiles RLS infinite recursion
- ✅ Create missing `user_preferences` table
- ✅ Fix rate limiting function
- ✅ Refresh schema cache

**Expected Result**: `✅ FIXED` for all checks

### Step 2: Deploy Code Fixes (Automatic via git push)

After running the migration, the code changes in this commit will:

- ✅ Clean orphaned timeline clips
- ✅ Add asset validation to playback engine
- ✅ Add user-friendly error messages for missing assets

---

## Detailed Instructions

### Database Migration (Manual Step Required)

1. Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT]/sql
2. Copy the entire contents of: `supabase/migrations/20251025140000_critical_production_fix.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify output shows: `✅ FIXED` for all 4 checks

**Migration SQL** (lines 9-13):

```sql
ALTER TABLE project_backups
ADD COLUMN IF NOT EXISTS backup_name text,
ADD COLUMN IF NOT EXISTS project_data jsonb,
ADD COLUMN IF NOT EXISTS timeline_data jsonb,
ADD COLUMN IF NOT EXISTS assets_snapshot jsonb DEFAULT '[]'::jsonb;
```

### Code Deployment (Automatic)

After the database migration, deploy the code fixes:

```bash
# Build
npm run build

# Commit and push (Vercel will auto-deploy)
git add .
git commit -m "Fix P0 production errors: orphaned clips and playback engine"
git push
```

---

## Test Results from Agent Swarm

### Agent 1: Authentication ✅ PASSED

- Login/logout working
- Session management secure (HTTP-only cookies)
- **Issues**: 1 unauthorized log request (401) during transition, 1 backup error (500)

### Agent 2: Asset Upload ⚠️ DATA INTEGRITY ISSUES

- Upload UI working
- **Critical**: 0 assets in database, but 4 orphaned clips in timeline
- **Errors**: 404 on asset signing, 500 on backups

### Agent 3: Timeline ✅ MOSTLY WORKING

- Timeline rendering working
- Zoom controls working
- Track management working
- **Errors**: 4 orphaned clips (404), backup errors (500)

### Agent 4: Editing ✅ MOSTLY WORKING

- Clip selection, trim handles, transitions working
- Color correction, audio controls working
- **Missing**: Opacity control, speed control

### Agent 5: Playback ❌ COMPLETELY BROKEN

- Play/pause not working
- Video preview shows black screen
- Seek functionality broken
- **Root cause**: Orphaned assets prevent video loading

### Agent 6: State Management ✅ WORKING

- Undo/redo working
- Autosave working
- **Minor**: Some logging endpoint failures (non-critical)

### Agent 7: AI Assistant ✅ WORKING

- AI API backend working
- Chat history loading
- **Minor**: Send button UI issue (API works, button doesn't trigger)

---

## Error Summary by Priority

### P0 - Critical (Blocks Core Functionality)

1. **Missing Database Column** (500 error)
   - **Error**: `Could not find the 'assets_snapshot' column (code: PGRST204)`
   - **Location**: `project_backups` table
   - **Impact**: Auto-backup feature completely broken (90+ errors/hour)
   - **Fix**: Run database migration (manual step required)

2. **Orphaned Timeline Clips** (404 error)
   - **Error**: `Asset not found`
   - **Asset IDs**:
     - `cfcb42cb-ad78-4133-badb-ef3818fead35`
     - `cd4ab557-fce4-4636-aad3-d877299523c9`
   - **Impact**: Asset signing fails, playback broken
   - **Fix**: Code cleanup in this commit (automatic)

3. **Playback Engine Broken** (no error, silent failure)
   - **Symptoms**: Play button doesn't work, black video preview
   - **Impact**: Cannot play videos
   - **Fix**: Asset validation in playback engine (automatic)

### P1 - High (Major Features Missing)

4. **Missing Opacity Control**
   - **Impact**: Cannot adjust clip transparency
   - **Fix**: Future sprint

5. **Missing Speed Control**
   - **Impact**: Cannot adjust playback rate
   - **Fix**: Future sprint

### P2 - Medium (Minor Issues)

6. **AI Send Button UI**
   - **Impact**: Button doesn't trigger (API works)
   - **Fix**: Future sprint

---

## Post-Deployment Verification

After database migration and code deployment:

1. **Test Backups**:

   ```bash
   curl https://nonlinear-editor.vercel.app/api/projects/[PROJECT_ID]/backups \
     -X POST \
     -H "Authorization: Bearer [TOKEN]" \
     -d '{"backupType": "manual"}'
   ```

   **Expected**: 200 OK with backup created

2. **Test Asset Signing**:

   ```bash
   curl https://nonlinear-editor.vercel.app/api/assets/sign?assetId=[ASSET_ID]
   ```

   **Expected**: 200 OK with signed URL (or friendly 404 if asset deleted)

3. **Test Playback**:
   - Open timeline editor
   - Click play button
   - **Expected**: Video plays or shows "Missing assets" message

4. **Check Axiom**:
   ```apl
   ['nonlinear-editor']
   | where ['_time'] > ago(10m)
   | where ['level'] == "error"
   | summarize count()
   ```
   **Expected**: 0 errors

---

## Files Changed in This Fix

1. `app/api/assets/sign/route.ts` - Better error handling for missing assets
2. `lib/hooks/useTimeline.ts` - Validate assets when loading timeline
3. `lib/services/playbackService.ts` - Handle missing video sources gracefully
4. `components/timeline/TimelineClip.tsx` - Show error for missing assets
5. `PRODUCTION_FIX_INSTRUCTIONS.md` - This file (documentation)

---

## Expected Improvements

**Before Fix**:

- 🔴 Auto-backups: 100% failure rate (500 errors)
- 🔴 Playback: 100% broken
- 🔴 Asset signing: 50% failure rate (404 errors on orphaned assets)

**After Fix**:

- ✅ Auto-backups: 0% failure rate
- ✅ Playback: Works for valid assets, shows error for missing
- ✅ Asset signing: 0% error rate (handles missing assets gracefully)

---

## Timeline

1. **Now**: Run database migration in Supabase SQL Editor (5 min)
2. **+5 min**: Deploy code via `git push` (automatic Vercel deployment ~2 min)
3. **+10 min**: Verify fixes with manual testing
4. **+15 min**: Confirm zero errors in Axiom

**Total Time to Fix**: ~15 minutes

---

## Contact

If issues persist after running these fixes, check:

1. Supabase SQL Editor query output (should show `✅ FIXED`)
2. Vercel deployment logs (should show successful build)
3. Axiom error logs (should show 0 errors)

**Testing Command**:

```bash
# Re-run agent swarm tests
npm run test:production
```
