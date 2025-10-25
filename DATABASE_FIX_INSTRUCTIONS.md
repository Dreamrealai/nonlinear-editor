# 🚨 URGENT: Database Migration Required

## Current Status

- **90+ database errors per hour** in production
- **3 critical issues** preventing core features from working
- **Solution ready** - just needs to be applied

## How to Apply the Fix

### Step 1: Login to Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)

### Step 2: Run the Migration

1. Click **New Query**
2. Copy ALL contents from: `RUN_THIS_IN_SUPABASE_NOW.sql`
3. Paste into the SQL editor
4. Click **Run** button

### Step 3: Verify the Fix

The script will output a verification table:

```
check_name                | status
--------------------------|----------
Backup columns           | ✅ FIXED
User preferences table   | ✅ CREATED
Rate limit function      | ✅ EXISTS
User profiles policies   | ✅ FIXED
```

All should show ✅ status.

### Step 4: Test in Production

1. Go to https://nonlinear-editor.vercel.app
2. Test these features:
   - Create a manual backup (should work now)
   - Open Settings page (should load without error)
   - Check keyboard shortcuts (already working)
   - Switch AI models (already working)

## What This Fixes

### 🔴 Before Migration (Current State)

- ❌ **90+ backup errors/hour** - "assets_snapshot column not found"
- ❌ **Settings page broken** - "infinite recursion in RLS policy"
- ❌ **User preferences missing** - "table not found"
- ❌ **Auto-backups failing** - Every 5 minutes

### ✅ After Migration (Expected)

- ✅ Manual and auto-backups working
- ✅ Settings page loads properly
- ✅ User preferences saved
- ✅ Error rate drops to near zero

## Error Reduction Expected

| Metric         | Before    | After   | Reduction |
| -------------- | --------- | ------- | --------- |
| Backup errors  | 90/hour   | 0       | 100%      |
| Profile errors | 10/hour   | 0       | 100%      |
| Total errors   | 100+/hour | <5/hour | 95%+      |

## Testing Checklist

After running the migration, test these features:

- [ ] **Backup Creation**
  - Click "Backups" button
  - Create manual backup
  - Should see success message
  - Backup should appear in list

- [ ] **Settings Page**
  - Navigate to Settings
  - No "Failed to load subscription data" error
  - All sections load properly

- [ ] **Auto-Backup**
  - Wait 5 minutes
  - Check browser console
  - Should see no backup errors

- [ ] **AI Chat**
  - Open AI assistant
  - Switch between models
  - Send a test message

## If Issues Persist

1. **Check PostgREST cache:**
   - In Supabase Dashboard → Settings → API
   - Click "Reload schema cache"

2. **Verify migration ran:**
   - SQL Editor → Run the verification query again
   - All items should show ✅

3. **Check browser console:**
   - Look for any new error types
   - Note exact error messages

## Timeline

**Current State:** 100+ errors/hour causing data loss risk
**After Migration:** Near-zero errors, all features functional
**Time to Apply:** ~2 minutes
**Testing Time:** ~5 minutes

## Priority: CRITICAL

This migration fixes:

1. Data loss risk (backups not working)
2. User experience issues (Settings page broken)
3. System stability (100+ errors/hour)

**Apply immediately to restore full functionality.**
