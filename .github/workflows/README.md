# GitHub Actions Workflows Documentation

This directory contains all CI/CD workflows for the non-linear-editor project.

## Workflows Overview

### Core CI Workflows

#### 1. `ci.yml` - Main CI Pipeline

**Triggers:** Push to main/develop, Pull Requests
**Jobs:**

- **Lint & Format** - ESLint and Prettier checks
- **Type Check** - TypeScript compilation validation
- **Unit Tests** - Jest unit and integration tests with coverage
- **Build Check** - Next.js production build verification
- **Security Audit** - npm audit for vulnerabilities
- **Dependency Review** - PR dependency security check
- **Environment Validation** - Validates environment configuration
- **Performance Benchmarks** - Timeline and editor performance tests
- **All Checks Passed** - Final gate requiring all checks to succeed

**Test Coverage:**

- Coverage reports uploaded to Codecov
- Test results stored as artifacts (30-day retention)
- Coverage threshold: 70% (branches, functions, lines, statements)

**Environment Variables:**

- `NEXT_PUBLIC_SUPABASE_URL` - Dummy value for builds
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Dummy value for builds
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Dummy value for builds

**Duration:** ~15-20 minutes

#### 2. `e2e-tests.yml` - End-to-End Tests

**Triggers:** Push to main/develop, Pull Requests
**Jobs:**

- **Desktop Browser Tests** - Chromium, Firefox, WebKit
- **Mobile Browser Tests** - iPhone, iPad variants
- **Test Matrix** - Parallel execution across multiple browsers/devices

**Features:**

- Playwright for E2E testing
- Browser matrix testing (3 desktop + multiple mobile devices)
- Test reports uploaded as artifacts
- Screenshots and videos on failure
- Retry on failure (2 retries in CI)

**Duration:** ~30-60 minutes (parallelized)

#### 3. `pr-checks.yml` - PR Quality Validation

**Triggers:** Pull Request events (opened, synchronize, reopened)
**Jobs:**

- **PR Metadata Check** - Semantic PR title validation
- **File Size Check** - Warns on files >1MB
- **Code Complexity Check** - Warns on files >500 lines
- **Changed Files Summary** - Lists all changed files
- **Documentation Check** - Verifies docs updated if labeled
- **Test Coverage Check** - Posts coverage report as PR comment

**Features:**

- Semantic PR title enforcement (feat, fix, docs, etc.)
- Sensitive file detection (.env, credentials)
- Coverage reporter with PR comments
- Automated quality gates

**Duration:** ~10-15 minutes

### Quality & Analysis Workflows

#### 4. `code-quality.yml` - Code Quality Analysis

**Triggers:** Pull Requests, Manual dispatch
**Jobs:**

- **Bundle Size Analysis** - Next.js bundle size tracking
- **Code Complexity Check** - File size and nesting analysis
- **Lighthouse Performance Audit** - Performance, accessibility, SEO scores
- **Coverage Requirements** - Validates coverage thresholds

**Duration:** ~20-25 minutes

#### 5. `bundle-size.yml` - Bundle Size Tracking

**Triggers:** Pull Requests to main
**Jobs:**

- **Bundle Analysis** - Webpack bundle analyzer

**Duration:** ~10 minutes

### Maintenance Workflows

#### 6. `dependency-update.yml` - Dependency Management

**Triggers:** Weekly schedule (Mondays 9 AM UTC), Manual dispatch
**Jobs:**

- **Update Check** - Reports outdated packages
- **Security Audit** - Generates security audit report
- **Auto-update Patch** - Creates PR for patch version updates (manual trigger only)

**Artifacts:**

- Outdated packages report (JSON)
- Security audit report (JSON)

**Duration:** ~15-20 minutes

#### 7. `deploy.yml` - Production Deployment

**Triggers:** Push to main, Manual dispatch
**Jobs:**

- **CI Checks** - Reuses ci.yml workflow
- **Deploy** - Deploys to Vercel (production environment)

**Features:**

- Concurrency control (no parallel deployments)
- Requires all CI checks to pass
- Post-deployment health checks
- Deployment status notifications

**Duration:** ~25-30 minutes

## Test Integration Summary

### Unit & Integration Tests

- **Framework:** Jest with jsdom
- **Command:** `npm run test:coverage`
- **Location:** `__tests__/` directory
- **Coverage Target:** 70% (all metrics)
- **Memory Optimization:**
  - Max workers: 3
  - Worker memory limit: 1024MB
  - Node memory: 4096MB
- **Test Files:** 807 passing tests across multiple categories
  - State management tests
  - API route tests
  - Component tests
  - Integration workflow tests
  - Security tests

### E2E Tests

- **Framework:** Playwright
- **Command:** `npm run test:e2e`
- **Location:** `e2e/` directory
- **Browsers:** Chromium, Firefox, WebKit
- **Mobile:** iPhone, iPad, Android devices
- **Features:**
  - Screenshots on failure
  - Video recording on failure
  - Trace on first retry
  - Parallel execution

### Test Caching Strategy

All workflows use npm caching via `actions/setup-node@v4` with `cache: 'npm'`:

- Caches `node_modules/` based on `package-lock.json` hash
- Dramatically speeds up dependency installation
- Shared across workflow runs

### Coverage Reporting

- **Service:** Codecov
- **Integration:** Automatic upload after test completion
- **PR Integration:** Coverage diff posted as comment via `lcov-reporter-action`
- **Flags:** Unit tests, integration tests, security tests
- **Configuration:** `codecov.yml` in root directory

**Note:** Codecov v4 requires a `CODECOV_TOKEN` secret to be set in GitHub repository settings. This is free for open source projects.

## Test Artifacts

All test artifacts are uploaded with 30-day retention:

- Unit test coverage reports (`coverage/`)
- E2E test results per browser (`test-results-{browser}/`)
- Playwright HTML reports (`playwright-report-{browser}/`)
- Performance benchmark results (`performance-results/`)

## Environment Variables & Secrets

### Required Secrets for Full CI/CD

```yaml
# Supabase (for E2E tests)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Google Cloud (for E2E tests)
GOOGLE_CLOUD_PROJECT
GOOGLE_APPLICATION_CREDENTIALS_JSON

# Stripe (for E2E tests)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# FAL AI (for E2E tests)
FAL_KEY

# Codecov (for coverage reporting)
CODECOV_TOKEN  # Optional but recommended for private repos
```

### Build-only Environment Variables

Build checks use dummy values:

- `NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY: dummy-key-for-build`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_dummy`

## Test Parallelization

### Unit Tests

- **Workers:** 3 (configurable in jest.config.js)
- **Strategy:** Test file parallelization
- **Memory per worker:** 1024MB

### E2E Tests

- **CI Workers:** 1 (sequential to avoid rate limits)
- **Local Workers:** Unlimited (parallel)
- **Matrix Strategy:** Browser/device parallelization
- **Retry Strategy:** 2 retries on failure

## CI Performance Optimization

1. **Dependency Caching:** npm cache via setup-node action
2. **Concurrency Control:** Cancel in-progress runs on new commits
3. **Timeouts:** All jobs have timeout limits (5-60 minutes)
4. **Fail-fast:** Type errors and linting fail immediately
5. **Parallel Jobs:** Independent jobs run simultaneously
6. **Selective Testing:** E2E tests can be triggered separately

## Required Status Checks

The following checks should be marked as required in branch protection:

- Lint & Format
- Type Check
- Unit Tests
- Build Check
- Security Audit
- All Checks Passed

## Workflow Maintenance

### Adding New Tests

1. Add test files to `__tests__/` or `e2e/`
2. Tests automatically picked up by existing workflows
3. Coverage automatically calculated and reported

### Updating Node.js Version

Update `node-version: '20'` in all workflow files:

- ci.yml
- e2e-tests.yml
- pr-checks.yml
- code-quality.yml
- bundle-size.yml
- dependency-update.yml

### Modifying Coverage Thresholds

Update in two places:

1. `jest.config.js` - `coverageThreshold.global`
2. `codecov.yml` - `coverage.status.project.default.target`

## Troubleshooting

### Tests Failing in CI but Passing Locally

- Check Node.js version matches (>=18.18.0 <23.0.0)
- Verify environment variables are set
- Check for timezone-dependent tests
- Review memory limits (may need adjustment)

### Codecov Upload Failing

- Ensure `CODECOV_TOKEN` secret is set (for private repos)
- Check coverage files are generated (`coverage/lcov.info`)
- Verify codecov action version is up to date

### E2E Tests Timing Out

- Increase timeout in playwright.config.ts
- Check if webServer is starting correctly
- Verify no blocking operations in tests
- Consider reducing parallelization

### Build Failing with Memory Error

- Increase Node memory: `NODE_OPTIONS='--max-old-space-size=4096'`
- Reduce worker count in jest.config.js
- Check for memory leaks in tests

## Monitoring & Metrics

### Estimated Test Run Times

- **Lint & Format:** ~2 minutes
- **Type Check:** ~3 minutes
- **Unit Tests:** ~8-10 minutes
- **Build Check:** ~5-7 minutes
- **E2E Tests (per browser):** ~15-20 minutes
- **Total CI Pipeline:** ~20-30 minutes (with parallelization)

### Test Statistics

- **Total Unit Tests:** 807 passing
- **Test Coverage:** 22.67% (target: 70%)
- **E2E Test Suites:** 20+ spec files
- **Browser Coverage:** 3 desktop + 8 mobile/tablet configurations

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Codecov Documentation](https://docs.codecov.com/)
- [Next.js Testing](https://nextjs.org/docs/testing)
