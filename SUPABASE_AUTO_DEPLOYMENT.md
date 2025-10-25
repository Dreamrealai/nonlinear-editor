# Supabase Auto-Deployment via GitHub Actions

## ✅ Automatic Migration Deployment Now Enabled!

Your Supabase migrations will now automatically deploy to production whenever you push changes to the `supabase/migrations/` directory.

---

## How It Works

**GitHub Actions Workflow**: `.github/workflows/supabase-migrations.yml`

**Triggers**:
- ✅ Automatic: When you push to `main` branch with changes to `supabase/migrations/**`
- ✅ Manual: Via GitHub Actions UI (workflow_dispatch)

**What It Does**:
1. Checks out your code
2. Installs Supabase CLI
3. Links to your Supabase project (`wrximmuaibfjmjrfriej`)
4. Runs `supabase db push --include-all`
5. Notifies on failure

---

## Setup Required

### 1. Add Supabase Access Token to GitHub Secrets

You need to add your Supabase access token to GitHub repository secrets:

**Step-by-Step**:

1. **Get your Supabase Access Token**:
   - Go to: https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Name: `GitHub Actions`
   - Click "Generate token"
   - **Copy the token** (you'll only see it once!)

2. **Add to GitHub Secrets**:
   - Go to: https://github.com/Dreamrealai/nonlinear-editor/settings/secrets/actions
   - Click "New repository secret"
   - Name: `SUPABASE_ACCESS_TOKEN`
   - Value: Paste your token
   - Click "Add secret"

3. **Test the workflow**:
   - Go to: https://github.com/Dreamrealai/nonlinear-editor/actions
   - Find "Deploy Supabase Migrations"
   - Click "Run workflow" → "Run workflow"
   - Should complete successfully!

---

## Usage

### Automatic Deployment

Just commit and push your migration files:

```bash
# Create a new migration
supabase migration new add_new_feature

# Edit the migration file in supabase/migrations/
# Add your SQL changes

# Commit and push
git add supabase/migrations/
git commit -m "Add new feature migration"
git push

# GitHub Actions will automatically deploy it! 🚀
```

### Manual Deployment

If you need to manually trigger deployment:

1. Go to: https://github.com/Dreamrealai/nonlinear-editor/actions
2. Click "Deploy Supabase Migrations"
3. Click "Run workflow"
4. Select branch: `main`
5. Click "Run workflow"

---

## CLI Still Available

You can still use the CLI for local testing and direct deployment:

```bash
# Test migrations locally (requires Docker)
supabase db reset

# Push to remote manually
supabase db push --include-all

# Check migration status
supabase migration list
```

---

## Migration Best Practices

### 1. Always Use Timestamp Prefixes

```bash
# Good ✅
supabase migration new add_new_feature
# Creates: 20251025120000_add_new_feature.sql

# Bad ❌
touch supabase/migrations/my_migration.sql
```

### 2. Test Locally First (If Docker Available)

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db reset

# Test in local app
npm run dev
```

### 3. Make Migrations Idempotent

Use `IF NOT EXISTS`, `IF EXISTS`, and `DO $$ BEGIN ... END $$` blocks:

```sql
-- Good ✅
CREATE TABLE IF NOT EXISTS my_table (...);

-- Add column safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'my_table' AND column_name = 'new_column'
  ) THEN
    ALTER TABLE my_table ADD COLUMN new_column text;
  END IF;
END $$;

-- Bad ❌
CREATE TABLE my_table (...);  -- Fails if exists
ALTER TABLE my_table ADD COLUMN new_column text;  -- Fails if exists
```

### 4. Avoid These Common Mistakes

- ❌ Duplicate timestamp prefixes
- ❌ Using `gen_random_bytes()` without `pgcrypto` extension
- ❌ Creating policies with `IF NOT EXISTS` (use DO blocks instead)
- ❌ Forward references to tables created in later migrations
- ❌ Changing function signatures without dropping first

---

## Troubleshooting

### GitHub Action Fails

**Check**:
1. Is `SUPABASE_ACCESS_TOKEN` secret set correctly?
2. View the action logs: https://github.com/Dreamrealai/nonlinear-editor/actions
3. Look for error messages in the "Deploy migrations" step

**Common Issues**:
- **"unauthorized"**: Token is missing or invalid
- **"connection refused"**: Supabase service temporarily unavailable (retry)
- **SQL error**: Migration has syntax error or references missing objects

### Migration Already Applied

If GitHub Actions tries to apply an already-applied migration:

```bash
# Locally, mark it as applied
supabase migration repair --status applied <timestamp>

# Push this change
git push
```

### Rollback a Migration

```bash
# Mark migration as reverted
supabase migration repair --status reverted <timestamp>

# Create a new migration to undo changes
supabase migration new revert_previous_feature

# Edit the new migration to reverse the changes
# Commit and push
git push
```

---

## Current Status

✅ **All 27 migrations successfully applied to production**

**Applied Migrations**:
- Initial schema (projects, assets, timelines, scenes, etc.)
- Processing jobs (exports, video generation, etc.)
- User subscription system
- Rate limiting infrastructure
- Audit logs
- Backup and restore functionality
- Export presets (YouTube, Instagram, TikTok, etc.)
- Project templates
- Collaboration support
- Share links and invitations
- Asset versioning
- User preferences
- Onboarding state
- Activity tracking
- Performance indexes

**Database Health**:
- ✅ No schema errors
- ✅ No missing tables
- ✅ No missing columns
- ✅ RLS policies active
- ✅ All functions created
- ✅ All indexes created

---

## Next Steps

1. ✅ Add `SUPABASE_ACCESS_TOKEN` to GitHub secrets
2. ✅ Test the workflow by running it manually
3. 📝 Create new migrations following best practices
4. 🚀 Push to `main` and watch auto-deployment happen!

---

## Alternative: Local CLI Only

If you prefer to **NOT** use GitHub Actions:

1. Delete the workflow file:
   ```bash
   rm .github/workflows/supabase-migrations.yml
   git commit -m "Remove Supabase auto-deployment"
   git push
   ```

2. Always deploy manually:
   ```bash
   supabase db push --include-all
   ```

---

## Support

**Documentation**:
- Supabase CLI: https://supabase.com/docs/guides/cli
- GitHub Actions: https://docs.github.com/en/actions

**Troubleshooting**:
- Check Supabase project logs: https://supabase.com/dashboard/project/wrximmuaibfjmjrfriej/logs
- Check GitHub Actions logs: https://github.com/Dreamrealai/nonlinear-editor/actions
- Check Axiom logs: https://app.axiom.co/

---

Last Updated: 2025-10-25
