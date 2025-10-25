# 🧪 Test Your GitHub Actions Setup

## Quick Test Checklist

After adding `SUPABASE_ACCESS_TOKEN` to GitHub Secrets, run through this checklist:

### ✅ Pre-Test Checklist

- [ ] Added `SUPABASE_ACCESS_TOKEN` to GitHub Secrets
- [ ] Secret name is exactly: `SUPABASE_ACCESS_TOKEN` (case-sensitive)
- [ ] Token was copied from: https://supabase.com/dashboard/account/tokens
- [ ] You're logged into GitHub: https://github.com/Dreamrealai/nonlinear-editor

### 🧪 Test 1: Manual Trigger

1. **Go to Actions page**: https://github.com/Dreamrealai/nonlinear-editor/actions/workflows/supabase-migrations.yml

2. **Click "Run workflow"** (green button, top right)

3. **Select branch**: `main`

4. **Click "Run workflow"**

5. **Expected Result**:
   - Status: ✅ Success
   - Duration: ~30 seconds
   - Last step shows: "✅ Migrations deployed successfully!"

6. **If it fails**:
   - Click on the failed run
   - Check "Deploy migrations to Supabase" step
   - Look for error message
   - Common issues:
     - Secret not set: "Access token not provided"
     - Wrong secret name: Check it's exactly `SUPABASE_ACCESS_TOKEN`
     - Invalid token: Generate a new token

### 🧪 Test 2: Automatic Trigger

1. **Create a test migration**:

   ```bash
   cd /Users/davidchen/Projects/non-linear-editor
   supabase migration new test_github_actions
   ```

2. **Edit the migration** (add a comment):

   ```bash
   echo "-- Test migration for GitHub Actions" > supabase/migrations/*_test_github_actions.sql
   ```

3. **Commit and push**:

   ```bash
   git add supabase/migrations/
   git commit -m "Test: Trigger GitHub Actions auto-deployment"
   git push
   ```

4. **Watch it run**: https://github.com/Dreamrealai/nonlinear-editor/actions

5. **Expected Result**:
   - New workflow run appears automatically
   - Status: ✅ Success
   - Migration applied to Supabase

6. **Verify in Supabase**:
   ```bash
   supabase migration list
   # Should show the new migration as applied
   ```

### 🧪 Test 3: Verify in Production

1. **Check Supabase directly**:
   - Go to: https://supabase.com/dashboard/project/wrximmuaibfjmjrfriej/editor
   - Run: `SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;`
   - Should see your test migration listed

2. **Check via CLI**:
   ```bash
   supabase migration list
   # All migrations should show as applied (Local and Remote columns match)
   ```

### ✅ Success Criteria

All these should be true:

- [ ] Manual trigger completes successfully
- [ ] Automatic trigger on push works
- [ ] Migration appears in `supabase migration list`
- [ ] No errors in GitHub Actions logs
- [ ] Workflow completes in ~30 seconds

### 🎉 If All Tests Pass

**Congratulations!** Your GitHub Actions auto-deployment is fully working!

From now on:

- Just `git push` changes to `supabase/migrations/**`
- GitHub Actions deploys them automatically
- No manual `supabase db push` needed (but still available if you want it)

### ❌ If Tests Fail

**Check these common issues**:

1. **"Access token not provided"**
   - Secret not set or wrong name
   - Fix: Add/rename secret to exactly `SUPABASE_ACCESS_TOKEN`

2. **"unauthorized" or "invalid token"**
   - Token expired or invalid
   - Fix: Generate new token at https://supabase.com/dashboard/account/tokens

3. **"connection refused" or "timeout"**
   - Supabase service temporarily unavailable
   - Fix: Wait 5 minutes and retry

4. **SQL error in migration**
   - Migration has syntax error or references missing objects
   - Fix: Check migration SQL, test locally with `supabase db reset`

5. **Workflow not triggering**
   - Changes not in `supabase/migrations/**` path
   - Fix: Ensure changes are in migrations directory

### 📊 Monitoring

**View all runs**: https://github.com/Dreamrealai/nonlinear-editor/actions/workflows/supabase-migrations.yml

**Check latest status**:

```bash
gh run list --workflow=supabase-migrations.yml --limit 5
```

**View logs of last run**:

```bash
gh run view --log
```

---

## Cleanup

After testing, you can remove the test migration:

```bash
# Delete the test migration file
rm supabase/migrations/*_test_github_actions.sql

# Commit
git add supabase/migrations/
git commit -m "Remove test migration"
git push
```

---

Last Updated: 2025-10-25
