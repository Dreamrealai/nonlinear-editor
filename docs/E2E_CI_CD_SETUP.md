# E2E Tests CI/CD Integration Guide

## Overview

This guide provides step-by-step instructions for integrating E2E tests into your CI/CD pipeline. The E2E tests are already configured with GitHub Actions but require environment setup and secret configuration.

## Prerequisites

Before setting up CI/CD for E2E tests, ensure you have:

1. ✅ GitHub repository with Actions enabled
2. ✅ Access to repository settings (admin or maintainer role)
3. ✅ All required service accounts and API keys
4. ✅ Test database with test credentials

## Quick Setup Checklist

- [ ] Add GitHub repository secrets
- [ ] Verify test user exists in database
- [ ] Enable GitHub Actions workflow
- [ ] Configure branch protection rules
- [ ] Set up Slack/Email notifications (optional)
- [ ] Run initial test and verify

## Step-by-Step Setup

### Step 1: GitHub Secrets Configuration

Add the following secrets to your GitHub repository:

**Navigation:** Repository → Settings → Secrets and variables → Actions → New repository secret

#### Required Secrets

| Secret Name                           | Description                 | How to Obtain                                         |
| ------------------------------------- | --------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`            | Supabase project URL        | Supabase Dashboard → Settings → API                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | Supabase anonymous key      | Supabase Dashboard → Settings → API                   |
| `SUPABASE_SERVICE_ROLE_KEY`           | Supabase service role key   | Supabase Dashboard → Settings → API (⚠️ Keep secret!) |
| `GOOGLE_CLOUD_PROJECT`                | Google Cloud project ID     | Google Cloud Console → Project Info                   |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Google service account JSON | Google Cloud Console → IAM → Service Accounts         |
| `FAL_KEY`                             | Fal.ai API key              | Fal.ai Dashboard → API Keys                           |
| `STRIPE_SECRET_KEY`                   | Stripe secret key           | Stripe Dashboard → Developers → API Keys              |
| `STRIPE_WEBHOOK_SECRET`               | Stripe webhook secret       | Stripe Dashboard → Developers → Webhooks              |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  | Stripe publishable key      | Stripe Dashboard → Developers → API Keys              |

#### Adding Secrets via GitHub UI

1. Navigate to repository on GitHub
2. Click **Settings**
3. In left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter **Name** (exactly as shown above)
6. Paste **Value**
7. Click **Add secret**
8. Repeat for all secrets

#### Adding Secrets via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Authenticate
gh auth login

# Add secrets
gh secret set NEXT_PUBLIC_SUPABASE_URL -b "your-supabase-url"
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY -b "your-anon-key"
gh secret set SUPABASE_SERVICE_ROLE_KEY -b "your-service-role-key"
gh secret set GOOGLE_CLOUD_PROJECT -b "your-project-id"
gh secret set GOOGLE_APPLICATION_CREDENTIALS_JSON -b "$(cat path/to/credentials.json)"
gh secret set FAL_KEY -b "your-fal-key"
gh secret set STRIPE_SECRET_KEY -b "your-stripe-secret-key"
gh secret set STRIPE_WEBHOOK_SECRET -b "your-webhook-secret"
gh secret set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY -b "your-publishable-key"
```

#### Verifying Secrets

```bash
# List all secrets
gh secret list

# Expected output:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# GOOGLE_CLOUD_PROJECT
# GOOGLE_APPLICATION_CREDENTIALS_JSON
# FAL_KEY
# STRIPE_SECRET_KEY
# STRIPE_WEBHOOK_SECRET
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

### Step 2: Test Database Setup

Ensure test credentials exist in your database:

#### Test User Credentials

**Email:** `test@example.com`
**Password:** `test_password_123`

#### Creating Test User via Supabase

**Option A: Via Supabase Dashboard**

1. Go to Supabase Dashboard
2. Select your project
3. Navigate to **Authentication** → **Users**
4. Click **Add user**
5. Enter email: `test@example.com`
6. Enter password: `test_password_123`
7. Click **Create user**

**Option B: Via SQL**

```sql
-- Insert test user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('test_password_123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);
```

**Option C: Via Supabase Admin API**

```bash
# Using curl
curl -X POST https://YOUR_PROJECT_URL/auth/v1/admin/users \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test_password_123",
    "email_confirm": true
  }'
```

### Step 3: Workflow Configuration

The E2E workflow is already configured in `.github/workflows/e2e-tests.yml`.

#### Workflow Features

- ✅ Runs on push to `main` and `develop` branches
- ✅ Runs on pull requests to `main` and `develop`
- ✅ Tests across 3 desktop browsers (Chrome, Firefox, Safari)
- ✅ Tests on 2 mobile devices (iPhone, iPad)
- ✅ Automatic retry on failure (2 retries)
- ✅ Artifact upload (reports, screenshots, videos)
- ✅ 60-minute timeout

#### Workflow Triggers

The workflow triggers on:

- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

To modify triggers, edit `.github/workflows/e2e-tests.yml`:

```yaml
on:
  push:
    branches: [main, develop, staging] # Add branches
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * *' # Daily at midnight
  workflow_dispatch: # Manual trigger
```

### Step 4: Enable GitHub Actions

If Actions are disabled:

1. Go to repository **Settings**
2. Click **Actions** → **General**
3. Under "Actions permissions", select:
   - ✅ **Allow all actions and reusable workflows**
4. Click **Save**

### Step 5: Branch Protection Rules

Recommended branch protection settings:

**For `main` branch:**

1. Go to **Settings** → **Branches**
2. Click **Add rule** for `main` branch
3. Configure:
   - ✅ Require pull request before merging
   - ✅ Require approvals (at least 1)
   - ✅ Require status checks to pass
     - ✅ `test (chromium)` - E2E tests on Chrome
     - ✅ `test (firefox)` - E2E tests on Firefox
     - ✅ `test (webkit)` - E2E tests on Safari
     - ✅ `test-mobile (Mobile Chrome iPhone)` - Mobile tests
     - ✅ `test-mobile (Mobile Safari iPad)` - Tablet tests
   - ✅ Require branches to be up to date
   - ✅ Require conversation resolution
4. Click **Create**

**For `develop` branch:** Same as above

### Step 6: Notifications Setup (Optional)

#### Slack Notifications

Add to workflow:

```yaml
- name: Notify Slack on Failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "E2E Tests Failed on ${{ github.ref }}"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

#### Email Notifications

Configure in repository **Settings** → **Notifications**

### Step 7: Run Initial Test

Trigger the workflow manually:

1. Go to **Actions** tab
2. Click **E2E Tests** workflow
3. Click **Run workflow**
4. Select branch (e.g., `main`)
5. Click **Run workflow**

Monitor the execution and verify all jobs pass.

## Workflow Jobs Breakdown

### Desktop Tests Job

**Matrix Strategy:** Tests run in parallel across browsers

- **Browser:** chromium, firefox, webkit
- **Timeout:** 60 minutes
- **Retries:** 2 (in CI only)
- **Workers:** 1 (sequential execution)

### Mobile Tests Job

**Matrix Strategy:** Tests run in parallel across devices

- **Devices:** Mobile Chrome iPhone, Mobile Safari iPad
- **Timeout:** 60 minutes
- **Browser Requirements:** chromium, webkit

## Test Artifacts

After each workflow run, the following artifacts are available:

### Playwright Reports

- **Name:** `playwright-report-{browser}`
- **Contains:** HTML test report with details of each test
- **Retention:** 30 days
- **Access:** Actions → Workflow Run → Artifacts

### Test Results

- **Name:** `test-results-{browser}`
- **Contains:** Screenshots, videos, traces for failed tests
- **Retention:** 30 days
- **Access:** Actions → Workflow Run → Artifacts

### Downloading Artifacts

**Via GitHub UI:**

1. Go to Actions tab
2. Click on workflow run
3. Scroll to "Artifacts" section
4. Click artifact name to download

**Via GitHub CLI:**

```bash
# List artifacts
gh run list --workflow=e2e-tests.yml

# Download artifacts from latest run
gh run download <run-id>
```

## Viewing Test Results

### HTML Report

1. Download `playwright-report-{browser}` artifact
2. Extract ZIP file
3. Open `index.html` in browser
4. Navigate through test results

### Failed Tests

For failed tests, the report includes:

- ✅ Screenshot at failure point
- ✅ Video recording of test
- ✅ Trace file for debugging
- ✅ Error message and stack trace

### Trace Viewer

To analyze trace files:

```bash
# Install Playwright if not already installed
npm install -D @playwright/test

# View trace
npx playwright show-trace path/to/trace.zip
```

## Troubleshooting CI Issues

### Issue 1: Tests Fail in CI but Pass Locally

**Symptoms:**

- Tests pass on local machine
- Tests fail in GitHub Actions

**Solutions:**

1. **Check Environment Variables:**

   ```bash
   # Verify all secrets are set
   gh secret list
   ```

2. **Test Locally with CI Settings:**

   ```bash
   CI=true npm run test:e2e
   ```

3. **Review CI Logs:**
   - Check Actions tab → Failed run → Job logs
   - Look for specific error messages

4. **Check Timing Issues:**
   - CI environments may be slower
   - Increase timeouts if needed

### Issue 2: Authentication Failures

**Symptoms:**

- Tests fail at sign-in step
- Error: "Invalid credentials" or "User not found"

**Solutions:**

1. **Verify Test User Exists:**
   - Check Supabase Dashboard → Authentication → Users
   - Ensure `test@example.com` exists

2. **Verify Supabase Secrets:**

   ```bash
   # Check secrets are set
   gh secret list | grep SUPABASE
   ```

3. **Test Database Connection:**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
   - Verify `SUPABASE_SERVICE_ROLE_KEY` has proper permissions

### Issue 3: Timeout Errors

**Symptoms:**

- Tests timeout after 60 minutes
- Specific tests timeout

**Solutions:**

1. **Increase Job Timeout:**

   ```yaml
   jobs:
     test:
       timeout-minutes: 120 # Increase from 60
   ```

2. **Increase Test Timeout:**

   ```typescript
   test(
     'slow test',
     async ({ page }) => {
       // ...
     },
     { timeout: 120000 }
   ); // 2 minutes
   ```

3. **Optimize Slow Tests:**
   - Use API mocking
   - Skip unnecessary waits
   - Parallelize independent operations

### Issue 4: Flaky Tests

**Symptoms:**

- Tests pass/fail intermittently
- Different results on retries

**Solutions:**

1. **Add Proper Waits:**

   ```typescript
   // Good
   await page.waitForLoadState('networkidle');

   // Bad
   await page.waitForTimeout(5000);
   ```

2. **Increase Retries:**

   ```yaml
   # In workflow
   run: npx playwright test --retries=3
   ```

3. **Use Stable Locators:**

   ```typescript
   // Good - data-testid
   page.locator('[data-testid="button"]');

   // Bad - text that may change
   page.locator('text=Click here');
   ```

### Issue 5: Missing Artifacts

**Symptoms:**

- No artifacts uploaded
- Artifacts empty

**Solutions:**

1. **Verify Upload Configuration:**

   ```yaml
   - uses: actions/upload-artifact@v4
     if: always() # Always upload, even on failure
   ```

2. **Check Artifact Paths:**

   ```yaml
   with:
     path: playwright-report/ # Ensure path exists
   ```

3. **Review Job Logs:**
   - Check for upload errors
   - Verify paths are correct

## Performance Optimization

### Reduce CI Test Time

1. **Parallelize Tests:**

   ```yaml
   # Increase workers for faster execution
   run: npx playwright test --workers=2
   ```

2. **Skip Mobile Tests on Draft PRs:**

   ```yaml
   if: github.event.pull_request.draft == false
   ```

3. **Run Subset on PRs:**

   ```yaml
   # Only critical tests on PR
   run: npx playwright test e2e/auth.spec.ts e2e/projects.spec.ts
   ```

4. **Use Sharding:**
   ```yaml
   strategy:
     matrix:
       shard: [1, 2, 3, 4]
   steps:
     - run: npx playwright test --shard=${{ matrix.shard }}/4
   ```

### Cache Dependencies

Already configured in workflow:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm' # Caches node_modules
```

### Cache Playwright Browsers

Add to workflow:

```yaml
- uses: actions/cache@v3
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}
```

## Monitoring and Alerts

### GitHub Status Checks

- View status in PR checks section
- Green checkmark: All tests passed
- Red X: Tests failed
- Yellow dot: Tests running

### Test Trends

Track over time:

- Pass rate
- Execution time
- Flaky tests
- Failed tests

### Setting Up Alerts

**Option 1: GitHub Notifications**

- Settings → Notifications
- Enable "Actions" notifications

**Option 2: Slack Integration**

- Add Slack webhook to secrets
- Add notification step to workflow

**Option 3: Email Alerts**

- Configure in repository settings
- Automatic on workflow failure

## Best Practices

### 1. Run Tests Before Pushing

```bash
# Always run locally first
npm run test:e2e
```

### 2. Keep Tests Fast

- Target: < 15 minutes total
- Use mocking for slow operations
- Parallelize when possible

### 3. Fix Failures Immediately

- Don't ignore failing tests
- Fix or skip broken tests
- Update tests with code changes

### 4. Monitor Test Stability

- Track flaky tests
- Improve test reliability
- Remove consistently failing tests

### 5. Keep Dependencies Updated

```bash
# Update Playwright regularly
npm update @playwright/test
npx playwright install
```

## Advanced Configuration

### Custom Test Matrix

```yaml
strategy:
  matrix:
    browser: [chromium, firefox]
    env: [staging, production]
runs-on: ubuntu-latest
steps:
  - run: npx playwright test --project=${{ matrix.browser }}
    env:
      BASE_URL: ${{ matrix.env == 'staging' && 'https://staging.example.com' || 'https://example.com' }}
```

### Conditional Execution

```yaml
# Skip on draft PRs
if: github.event.pull_request.draft == false

# Only on specific branches
if: github.ref == 'refs/heads/main'

# Only on specific file changes
if: contains(github.event.head_commit.modified, 'src/')
```

### Parallel Sharding

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: npx playwright test --shard=${{ matrix.shard }}/4
```

### Merge Reports from Shards

```yaml
- name: Merge Reports
  run: npx playwright merge-reports --reporter html ./all-blob-reports
```

## Security Considerations

### Secrets Management

- ✅ Never commit secrets to repository
- ✅ Use GitHub Secrets for sensitive data
- ✅ Rotate keys regularly
- ✅ Use least privilege principle
- ✅ Audit secret access logs

### Environment Isolation

- ✅ Use separate test database
- ✅ Don't run tests on production
- ✅ Use test API keys when available
- ✅ Implement test data cleanup

### Access Control

- ✅ Limit who can modify workflows
- ✅ Require PR reviews
- ✅ Use branch protection
- ✅ Enable two-factor authentication

## Maintenance

### Regular Tasks

**Weekly:**

- Review test results
- Fix flaky tests
- Update dependencies

**Monthly:**

- Review test coverage
- Optimize slow tests
- Update documentation

**Quarterly:**

- Major dependency updates
- Test infrastructure review
- Performance optimization

### Updating Tests

When application changes:

1. Update page objects first
2. Run tests locally
3. Fix failing tests
4. Update documentation
5. Create PR with test updates

## Resources

### Documentation

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Playwright CI Docs](https://playwright.dev/docs/ci)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

### Tools

- [GitHub CLI](https://cli.github.com/)
- [act - Run GitHub Actions Locally](https://github.com/nektos/act)
- [Playwright Test](https://playwright.dev/)

## Support

### Getting Help

1. **Check Documentation:**
   - This guide
   - [E2E Testing Guide](/docs/E2E_TESTING_GUIDE.md)
   - [Playwright Docs](https://playwright.dev/)

2. **Review Logs:**
   - GitHub Actions logs
   - Test artifacts
   - Error messages

3. **Common Issues:**
   - See troubleshooting section above
   - Check [GitHub Discussions](https://github.com/microsoft/playwright/discussions)

4. **Contact Team:**
   - Create issue in repository
   - Tag appropriate team members

## Conclusion

With proper CI/CD setup:

- ✅ E2E tests run automatically on every PR
- ✅ Tests verify critical user workflows
- ✅ Failures are caught before merge
- ✅ Artifacts available for debugging
- ✅ Notifications alert team of issues

Follow this guide to integrate E2E tests into your CI/CD pipeline and maintain high code quality.

---

**Last Updated:** October 23, 2025
**Version:** 1.0.0
**Maintained By:** Development Team
