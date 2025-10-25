# Project Memory

## 🤖 Supabase Auto-Deployment (GitHub Actions)

**STATUS**: ✅ Configured | ⚠️ Secret Required | 📋 [Full Guide](./SUPABASE_AUTO_DEPLOYMENT.md)

### Quick Setup (5 minutes)

Your Supabase migrations now auto-deploy on every push to `main`! But you need to add one secret first:

#### Step 1: Get Your Supabase Access Token

1. Go to: https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Name: `GitHub Actions`
4. **Copy the token** (you'll only see it once!)

#### Step 2: Add Token to GitHub Secrets

1. Go to: https://github.com/Dreamrealai/nonlinear-editor/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `SUPABASE_ACCESS_TOKEN`
4. Paste your token
5. Click **"Add secret"**

#### Step 3: Test It!

```bash
# Option A: Trigger manually via GitHub UI
# Go to: https://github.com/Dreamrealai/nonlinear-editor/actions
# Click "Deploy Supabase Migrations" → "Run workflow"

# Option B: Trigger by pushing a migration
supabase migration new test_deployment
git add supabase/migrations/
git commit -m "Test auto-deployment"
git push
# Watch it deploy: https://github.com/Dreamrealai/nonlinear-editor/actions
```

#### How It Works

**✅ AUTOMATIC**:

- Any push to `main` with changes in `supabase/migrations/**` triggers deployment
- GitHub Actions runs `supabase db push --include-all`
- Takes ~30 seconds

**📊 Current Status**:

- Workflow: **Active** (ID: 200877640)
- Last Run: **Failed** (missing secret)
- Location: `.github/workflows/supabase-migrations.yml`

**🔗 Quick Links**:

- [View Workflows](https://github.com/Dreamrealai/nonlinear-editor/actions)
- [View Secrets](https://github.com/Dreamrealai/nonlinear-editor/settings/secrets/actions)
- [Full Documentation](./SUPABASE_AUTO_DEPLOYMENT.md)

### Migration Workflow (After Setup)

```bash
# 1. Create migration
supabase migration new add_my_feature

# 2. Edit the SQL file
vim supabase/migrations/20251025120000_add_my_feature.sql

# 3. Commit and push
git add supabase/migrations/
git commit -m "Add my feature to database"
git push

# 4. Done! GitHub Actions deploys it automatically 🚀
# Watch progress: https://github.com/Dreamrealai/nonlinear-editor/actions
```

### Manual Deployment (Still Available)

You can still use the CLI if you prefer:

```bash
# Deploy immediately without waiting for CI/CD
supabase db push --include-all

# Check status
supabase migration list
```

---

## Git Workflow

**IMPORTANT**: After every code update or change:

1. **Build the project** - Always run the build command to ensure the code compiles without errors
2. **Commit changes** - Create a git commit with a descriptive message
3. **Push to remote** - Push the changes to the git remote repository

### Automated Workflow

When making changes to this project:

1. Run `npm run build` to build the Next.js application with Turbopack
2. Verify the build succeeds without errors
3. Stage changes with `git add .`
4. Create a commit: `git commit -m "descriptive message"`
5. Push to remote: `git push`

This ensures all changes are properly built, tested, and version controlled before being pushed to the repository.

## Document Management

**CRITICAL**: Before creating ANY new markdown document, you MUST follow this protocol to prevent document proliferation.

### Document Creation Protocol

**ALWAYS follow these steps in order:**

1. **Check for existing documents FIRST**

   ```bash
   # Search for existing issue/analysis documents
   ls -la *.md | grep -iE "(issue|analysis|report|validation|tracking)"

   # Check if ISSUES.md exists (canonical issue tracker)
   test -f ISSUES.md && echo "Use ISSUES.md" || echo "Create ISSUES.md"
   ```

2. **Update existing documents instead of creating new ones**
   - If `ISSUES.md` exists → Add new issues to it with status updates
   - If analysis reports exist → Update existing report with new findings
   - If documentation exists in `/docs/` → Update the appropriate doc file

3. **Only create NEW documents when:**
   - No existing document covers the topic
   - Creating a one-time report that will be archived
   - Document serves a distinct purpose (e.g., migration guide, specific bug report)

### Canonical Document Locations

**Issue Tracking:**

- **`ISSUES.md`** - Single source of truth for ALL codebase issues
  - Update this file, never create `ISSUES_2.md`, `NEW_ISSUES.md`, etc.
  - Format: Priority-based sections (P0, P1, P2, P3), status tracking, effort estimates

**Project Documentation:**

- **`/docs/`** directory - All permanent documentation
  - Architecture guides
  - API documentation
  - Coding standards
  - Testing guides

**Temporary Analysis:**

- **Root directory** - Only for one-time reports that will be cleaned up
  - Name format: `[TOPIC]_REPORT_[DATE].md`
  - Example: `MIGRATION_REPORT_2025-10-24.md`
  - Archive or delete after information is incorporated into ISSUES.md

### Forbidden Document Patterns

**NEVER create these types of files:**

- ❌ `ISSUES_NEW.md` - Update ISSUES.md instead
- ❌ `CODEBASE_ANALYSIS_REPORT.md` - Add findings to ISSUES.md
- ❌ `VALIDATION_REPORT.md` - Update issue status in ISSUES.md
- ❌ `DUPLICATE_CODE_ANALYSIS.md` - Add to ISSUES.md as duplicate code issues
- ❌ `AGENT_[N]_FINDINGS.md` - Consolidate findings into ISSUES.md
- ❌ Multiple files for the same topic

**Instead:**

- ✅ Update `ISSUES.md` with new findings
- ✅ Add status updates to existing issues
- ✅ Create sections in ISSUES.md for different issue categories

### Document Maintenance

**When running analysis tasks:**

1. **Check current state:**

   ```bash
   # Count existing analysis documents
   ls -1 *.md | wc -l

   # List all analysis files
   ls -1 *ANALYSIS*.md *REPORT*.md *VALIDATION*.md *ISSUES*.md 2>/dev/null
   ```

2. **Consolidate before creating:**
   - If 3+ analysis documents exist → Consolidate them first
   - Read existing ISSUES.md → Update it with new findings
   - Archive old reports → Move to `/archive/` directory

3. **Update ISSUES.md format:**

   ```markdown
   ## [Issue Category]

   ### Issue #X: [Title]

   - **Status:** Open/Fixed/In Progress
   - **Priority:** P0/P1/P2/P3
   - **Location:** [file:line]
   - **Reported:** [Date]
   - **Updated:** [Date]
   - **Effort:** [Hours]
   - **Description:** [Details]
   ```

### Pre-Document Creation Checklist

Before creating ANY new markdown file in project root:

- [ ] Searched for existing documents on this topic
- [ ] Checked if ISSUES.md exists and can be updated
- [ ] Verified this is not duplicate information
- [ ] Confirmed this needs to be a separate document
- [ ] Named with clear convention: `[TOPIC]_[TYPE]_[DATE].md`
- [ ] Planned to consolidate/archive after use

### Document Cleanup Protocol

**Every sprint:**

1. Review all `*.md` files in project root
2. Consolidate analysis reports into ISSUES.md
3. Move archived reports to `/archive/` directory
4. Delete redundant or outdated reports
5. Update ISSUES.md status for all items

### Agent Instructions for Document Creation

**When an agent is asked to analyze the codebase:**

1. **First action:** Check if ISSUES.md exists
   - If yes: Read it and prepare to UPDATE it
   - If no: Create it as the canonical issue tracker

2. **During analysis:** Collect all findings in memory

3. **Final action:** Update ISSUES.md with:
   - New issues discovered
   - Status updates for existing issues
   - Validation results
   - Priority adjustments

4. **Never:** Create separate `*_REPORT.md`, `*_ANALYSIS.md`, `*_FINDINGS.md` files unless explicitly required for a one-time deliverable

### Example: Correct Document Workflow

**BAD** ❌:

```
Agent 1 creates: CODEBASE_ANALYSIS_REPORT.md
Agent 2 creates: VALIDATION_REPORT.md
Agent 3 creates: DUPLICATE_CODE_ANALYSIS.md
Agent 4 creates: ISSUES_VERIFIED.md
Agent 5 creates: FINAL_CONSOLIDATED_REPORT.md
Result: 5 overlapping documents, scattered information
```

**GOOD** ✅:

```
Agent 1: Checks for ISSUES.md (not found)
Agent 1: Creates ISSUES.md with all findings
Agent 2: Reads ISSUES.md, validates issues, updates status
Agent 3: Reads ISSUES.md, adds new duplicate code issues
Agent 4: Reads ISSUES.md, marks fixed issues as Fixed
Agent 5: Reads ISSUES.md, adds priority adjustments
Result: 1 comprehensive document, single source of truth
```

## Coding Best Practices Summary

**MUST READ**: Comprehensive documentation available in `/docs/`

### Key Practices

**TypeScript:**

- Use branded types for IDs: `UserId`, `ProjectId`, `AssetId`
- Use discriminated unions for error handling
- Use assertion functions for type guards
- Avoid `any` - use `unknown` or generics
- Always specify function return types

**React Components:**

- Use `forwardRef` for reusable components
- Extract logic into custom hooks
- Follow hooks order: context → state → refs → effects → custom
- Use memoization for expensive computations

**State Management (Zustand):**

- Separate stores by domain (timeline, playback, selection)
- Use Immer middleware for immutable updates
- Use selectors for derived state
- Keep actions focused and atomic

**API Routes:**

- Always use `withAuth` middleware
- Apply appropriate rate limiting tier
- Validate all inputs with assertion functions
- Use service layer for business logic
- Return standardized error responses

**Service Layer:**

- Implement in `/lib/services/`
- Accept dependencies via constructor (dependency injection)
- Handle errors and track them
- Implement caching where appropriate
- Invalidate cache after mutations

**Error Handling:**

- Use custom error classes (ValidationError, DatabaseError)
- Track errors with context
- Provide user-friendly messages
- Implement graceful fallbacks

**Security:**

- Validate all inputs (never trust client data)
- Use Row Level Security (RLS) in database
- Verify ownership before operations
- Apply rate limiting by operation cost
- Sanitize user-generated content

**Testing:**

- Follow AAA pattern (Arrange-Act-Assert)
- Use helper functions for common setups
- Write descriptive test names
- Test edge cases and error paths

**Code Organization:**

- Follow naming conventions (camelCase, PascalCase, SCREAMING_SNAKE_CASE)
- Organize imports (React → third-party → absolute → relative → types)
- Use consistent file naming
- Keep files focused and cohesive

### Quick Reference Documentation

- **[Coding Best Practices](/docs/CODING_BEST_PRACTICES.md)** - Comprehensive patterns with examples
- **[Style Guide](/docs/STYLE_GUIDE.md)** - Code formatting and conventions
- **[Architecture Overview](/docs/ARCHITECTURE_OVERVIEW.md)** - System design and patterns
- **[Service Layer Guide](/docs/SERVICE_LAYER_GUIDE.md)** - Business logic patterns
- **[API Documentation](/docs/api/)** - API endpoints and contracts

### Before Committing Code

Checklist:

- [ ] TypeScript strict mode passes (no `any`)
- [ ] Branded types used for IDs
- [ ] API routes use `withAuth` middleware
- [ ] Errors handled with `errorResponse` helpers
- [ ] Input validation with assertion functions
- [ ] Service layer used for business logic
- [ ] Tests follow AAA pattern
- [ ] Code formatted with Prettier
- [ ] No ESLint warnings
- [ ] Documentation updated

## Test Credentials

### Local Development (Auth Bypass)

When `BYPASS_AUTH=true` is set in `.env.local`, authentication is bypassed for local testing.
This allows testing API routes without authentication.

**Local Testing Credentials** (for manual login testing):

- Email: test@example.com
- Password: test_password_123

### Production Site Testing

**Production Credentials**:

- Email: david@dreamreal.ai
- Password: sc3p4sses

**IMPORTANT**: Use production credentials only for testing the production deployment.

## Supabase CLI Access

**IMPORTANT**: This project has Supabase CLI installed and configured. Use it for database management, migrations, and remote project operations.

**✅ ALL MIGRATIONS APPLIED**: All 27 local migrations are successfully synchronized with production (as of 2025-10-25).

**🤖 AUTO-DEPLOYMENT ENABLED**: GitHub Actions automatically deploys migrations on push (see section above).

### CLI Information

- **Version**: 2.53.6
- **Linked Project**: `nonlinearvideoeditor` (Reference ID: wrximmuaibfjmjrfriej)
- **Region**: us-east-2
- **Migrations Directory**: `/supabase/migrations/`
- **Config File**: `/supabase/config.toml`

### Common Supabase CLI Commands

**Database Management:**

```bash
# Generate a new migration from schema changes
supabase db diff -f <migration_name>

# Diff local migrations against linked remote project
supabase db diff --linked

# Push local migrations to remote database
supabase db push

# Reset local database (requires Docker)
supabase db reset

# Create a new migration file
supabase migration new <name>
```

**Project Management:**

```bash
# List all Supabase projects
supabase projects list

# Show current project status
supabase status

# Link to a different Supabase project
supabase link --project-ref <project-ref>
```

**Storage Management:**

```bash
# List storage buckets
supabase storage ls

# Upload files to storage
supabase storage cp <local-file> <bucket>/<path>

# Download files from storage
supabase storage cp <bucket>/<path> <local-file>
```

**Secrets Management:**

```bash
# List project secrets
supabase secrets list

# Set a secret
supabase secrets set <NAME>=<value>

# Unset a secret
supabase secrets unset <NAME>
```

**Backups:**

```bash
# List available backups
supabase backups list

# Download a backup
supabase backups download <backup-id>
```

**Functions (Edge Functions):**

```bash
# List edge functions
supabase functions list

# Deploy an edge function
supabase functions deploy <function-name>

# View function logs
supabase functions logs <function-name>
```

### Important Notes

1. **Local Development**: Local Supabase development requires Docker to be running. If Docker is not running, local commands will fail.

2. **Remote Operations**: Commands that interact with the remote project (like `db push`, `secrets set`, `functions deploy`) work without Docker.

3. **Migration Workflow**:
   - Always create migrations for schema changes
   - Test migrations locally first (if Docker available)
   - Push to remote with `supabase db push` after testing
   - Migrations are version-controlled in `/supabase/migrations/`

4. **Security**:
   - Never commit sensitive credentials to migrations
   - Use `supabase secrets` for environment-specific values
   - Always review `db diff` output before creating migrations

5. **Storage Limits**:
   - Verify storage bucket limits in Supabase dashboard
   - Current file upload limit: 1GB (configured in application)
   - Ensure Supabase storage bucket supports this limit

### When to Use Supabase CLI

**Use Supabase CLI when you need to:**

- Create or modify database schemas
- Generate migrations from schema changes
- Push migrations to production
- Manage storage buckets and files
- Configure environment secrets
- Deploy edge functions
- Download database backups
- Inspect database configuration

**Example Workflow: Creating a New Migration**

```bash
# 1. Make schema changes in SQL
supabase migration new add_new_feature

# 2. Edit the migration file in /supabase/migrations/
# 3. Test locally (if Docker available)
supabase db reset

# 4. Review the changes
supabase db diff --linked

# 5. Push to remote
supabase db push
```

### Available Migrations

The project currently has 29+ migrations in `/supabase/migrations/`, including:

- Initial schema setup
- User authentication and profiles
- Projects and assets management
- Timeline and clips storage
- Processing jobs queue
- Export functionality
- Collaboration features
- Backup and versioning
- User preferences and onboarding
- Performance indexes
- Row Level Security (RLS) policies

### Troubleshooting

**"Cannot connect to Docker daemon"**: This is expected if Docker is not running. Remote operations (like `projects list`, `db push`) still work.

**"Failed to link project"**: Ensure you're authenticated with `supabase login` and have access to the organization.

**"Migration already exists"**: Check `/supabase/migrations/` for existing migrations with the same timestamp or name.

For more information, run `supabase --help` or visit the [Supabase CLI documentation](https://supabase.com/docs/guides/cli).
