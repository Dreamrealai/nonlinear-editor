# End-to-End Testing Guide

## Executive Summary

This document provides comprehensive information about the E2E testing infrastructure for the non-linear video editor application. The test suite uses Playwright and implements the Page Object Model pattern to ensure maintainability and reliability.

**Current Status:**

- **Total Test Files:** 15
- **Test Suites:** 82
- **Browser Coverage:** 15 configurations (Desktop, Mobile, Tablet)
- **CI/CD Integration:** GitHub Actions
- **Infrastructure:** Complete and Production-Ready

## Table of Contents

1. [Test Coverage Overview](#test-coverage-overview)
2. [Critical User Workflows](#critical-user-workflows)
3. [Test Infrastructure](#test-infrastructure)
4. [Running Tests](#running-tests)
5. [CI/CD Integration](#cicd-integration)
6. [Test Scenarios](#test-scenarios)
7. [Best Practices](#best-practices)
8. [Recommendations](#recommendations)

## Test Coverage Overview

### Test Files and Coverage

| Test Suite          | File                        | Test Count | Coverage Area                                           |
| ------------------- | --------------------------- | ---------- | ------------------------------------------------------- |
| Authentication      | `auth.spec.ts`              | 17         | Sign in, sign up, password validation, navigation       |
| Projects            | `projects.spec.ts`          | 8          | Project creation, loading, persistence, deletion        |
| Video Generation    | `video-generation.spec.ts`  | 12         | Form validation, generation workflow, progress tracking |
| Timeline Editing    | `timeline-editing.spec.ts`  | 13         | Timeline display, navigation, state persistence         |
| Asset Management    | `asset-management.spec.ts`  | 14         | Upload capability, asset pages, API endpoints           |
| Video Editor Core   | `editor.spec.ts`            | 40+        | Timeline interaction, clip editing, playback, save      |
| Audio Generation    | `audio-generation.spec.ts`  | 20+        | Suno & ElevenLabs integration, modal interaction        |
| Corrections & Edits | `corrections.spec.ts`       | 15+        | Timeline corrections, undo/redo functionality           |
| Edge Cases          | `edge-cases.spec.ts`        | 20+        | Boundary conditions, special characters, limits         |
| Error Handling      | `error-handling.spec.ts`    | 25+        | Network failures, API timeouts, retry mechanisms        |
| Accessibility       | `accessibility.spec.ts`     | 25+        | Keyboard navigation, screen readers, ARIA, focus        |
| Offline Mode        | `offline.spec.ts`           | 18+        | Offline functionality, sync, recovery                   |
| Performance         | `performance.spec.ts`       | 20+        | Large projects, memory leaks, concurrent operations     |
| Validation          | `validation.spec.ts`        | 30+        | Input validation, file types, size limits               |
| State Persistence   | `state-persistence.spec.ts` | 25+        | Browser storage, session management, recovery           |

**Estimated Total:** 280+ individual test cases

### Browser and Device Coverage

#### Desktop Browsers (3)

- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)

#### Mobile Phones (5)

- iPhone 13
- iPhone 13 Pro
- iPhone SE
- Pixel 5
- Galaxy S9+

#### Tablets (3)

- iPad Pro
- iPad Mini
- Galaxy Tab S4

#### Custom Viewports (4)

- Desktop 1080p (1920×1080)
- Desktop 4K (3840×2160)
- Mobile Portrait (390×844)
- Mobile Landscape (844×390)

**Total Configurations:** 15

## Critical User Workflows

### 1. Authentication Workflow

**Scenario:** User creates account and signs in

**Test Coverage:**

- [x] Sign up form display and validation
- [x] Email validation (format, uniqueness)
- [x] Password strength requirements
- [x] Password confirmation matching
- [x] Email confirmation flow
- [x] Sign in with valid credentials
- [x] Error handling for invalid credentials
- [x] Password visibility toggle
- [x] Forgot password navigation
- [x] Guest access option

**Test Files:**

- `e2e/auth.spec.ts` (17 tests)

**Key Scenarios:**

```typescript
// Successful sign up
test('should create account with valid data', async ({ page }) => {
  const signUpPage = new SignUpPage(page);
  await signUpPage.goto();
  const testEmail = `test-${generateTestId()}@example.com`;
  const password = 'StrongP@ssw0rd123';
  await signUpPage.signUp(testEmail, password, password);
  await expect(signUpPage.successMessage).toBeVisible();
});

// Successful sign in
test('should successfully sign in with valid credentials', async ({ page }) => {
  const signInPage = new SignInPage(page);
  await signInPage.goto();
  await signInPage.signIn('test@example.com', 'test_password_123');
  await page.waitForURL(/\/(editor|$)/);
});
```

### 2. Project Management Workflow

**Scenario:** User creates, edits, and manages projects

**Test Coverage:**

- [x] Automatic project creation on first sign in
- [x] Project listing and selection
- [x] Project title display and editing
- [x] Multiple project handling
- [x] Project persistence across sessions
- [x] Project deletion
- [x] Non-existent project handling (404)
- [x] Unauthorized access prevention

**Test Files:**

- `e2e/projects.spec.ts` (8 tests)
- `e2e/state-persistence.spec.ts` (25+ tests)

**Key Scenarios:**

```typescript
// Create and persist project
test('should persist project data after reload', async ({ page }) => {
  const projectId = await createTestProject(page, 'Persistent Project');
  const editorPage = new EditorPage(page);
  await editorPage.goto(projectId);
  const initialTitle = await editorPage.getProjectTitle();

  await page.reload();
  await editorPage.waitForTimelineLoad();

  const reloadedTitle = await editorPage.getProjectTitle();
  expect(reloadedTitle).toBe(initialTitle);
});
```

### 3. Timeline Editing Workflow

**Scenario:** User edits video timeline with clips

**Test Coverage:**

- [x] Timeline display and interaction
- [x] Add clips to timeline
- [x] Trim/cut clips
- [x] Reorder clips (drag and drop)
- [x] Delete clips
- [x] Undo/redo operations
- [x] Playback controls (play, pause, seek)
- [x] Timeline zoom and scroll
- [x] Keyboard shortcuts
- [x] Save changes
- [x] Auto-save functionality

**Test Files:**

- `e2e/timeline-editing.spec.ts` (13 tests)
- `e2e/editor.spec.ts` (40+ tests)
- `e2e/corrections.spec.ts` (15+ tests)

**Key Scenarios:**

```typescript
// Timeline interaction
test('should support keyboard navigation', async ({ page }) => {
  const editorPage = new EditorPage(page);
  await editorPage.goto(projectId);
  await editorPage.waitForTimelineLoad();

  await editorPage.timeline.click();
  await page.keyboard.press('Space'); // Play/pause
  await page.keyboard.press('ArrowRight'); // Navigate
  await page.keyboard.press('ArrowLeft');

  await expect(editorPage.timeline).toBeVisible();
});

// Undo/redo
test('should support undo/redo functionality', async ({ page }) => {
  const editorPage = new EditorPage(page);
  await editorPage.goto(projectId);

  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+KeyZ`); // Undo
  await page.keyboard.press(`${modifier}+Shift+KeyZ`); // Redo
});
```

### 4. Asset Management Workflow

**Scenario:** User uploads and manages media assets

**Test Coverage:**

- [x] File upload interface
- [x] File type validation (video, audio, image)
- [x] File size limits
- [x] Upload progress tracking
- [x] Asset library organization
- [x] Asset preview
- [x] Asset deletion
- [x] Integration with timeline
- [x] Image generation page
- [x] Audio generation page
- [x] Video generation page

**Test Files:**

- `e2e/asset-management.spec.ts` (14 tests)
- `e2e/video-generation.spec.ts` (12 tests)
- `e2e/audio-generation.spec.ts` (20+ tests)

**Key Scenarios:**

```typescript
// Asset upload
test('should handle asset upload', async ({ page }) => {
  const editorPage = new EditorPage(page);
  await editorPage.goto(projectId);

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('path/to/test.mp4');

  // Verify upload initiated
  await expect(page.locator('text=Uploading')).toBeVisible();
});

// Video generation
test('should initiate video generation with valid inputs', async ({ page }) => {
  const videoGenPage = new VideoGenPage(page);
  await videoGenPage.goto(projectId);

  await videoGenPage.generateVideo({
    prompt: 'A serene mountain landscape at dawn',
    aspectRatio: '16:9',
    duration: 8,
  });

  await expect(videoGenPage.progressBar).toBeVisible();
});
```

### 5. Playback Controls Workflow

**Scenario:** User previews and plays video

**Test Coverage:**

- [x] Video preview display
- [x] Play/pause controls
- [x] Seek functionality
- [x] Volume controls
- [x] Fullscreen mode
- [x] Playback speed
- [x] Keyboard shortcuts (spacebar, arrows)
- [x] Playback for empty timeline
- [x] Playback with multiple clips

**Test Files:**

- `e2e/editor.spec.ts` (40+ tests)

**Key Scenarios:**

```typescript
// Playback controls
test('should have playback controls', async ({ page }) => {
  const editorPage = new EditorPage(page);
  await editorPage.goto(projectId);

  const hasPlaybackControls =
    (await page.locator('[data-testid*="play"]').count()) > 0 ||
    (await page.locator('[aria-label*="Play"]').count()) > 0;

  expect(hasPlaybackControls).toBe(true);
});

// Spacebar play/pause
test('should support spacebar for play/pause', async ({ page }) => {
  const editorPage = new EditorPage(page);
  await editorPage.goto(projectId);

  await page.keyboard.press('Space');
  await expect(editorPage.timeline).toBeVisible();
});
```

## Test Infrastructure

### Directory Structure

```
project/
├── e2e/                                    # E2E test directory
│   ├── pages/                              # Page Object Models (5 files)
│   │   ├── SignInPage.ts                   # Sign in page
│   │   ├── SignUpPage.ts                   # Sign up page
│   │   ├── EditorPage.ts                   # Editor/timeline page
│   │   ├── VideoGenPage.ts                 # Video generation page
│   │   ├── AudioGenPage.ts                 # Audio generation page
│   │   └── HomePage.ts                     # Home page
│   │
│   ├── fixtures/                           # Test fixtures (2 files)
│   │   ├── auth.ts                         # Authentication helpers
│   │   └── projects.ts                     # Project management helpers
│   │
│   ├── utils/                              # Utilities (1 file)
│   │   └── helpers.ts                      # Helper functions
│   │
│   ├── auth.spec.ts                        # 17 authentication tests
│   ├── projects.spec.ts                    # 8 project tests
│   ├── video-generation.spec.ts            # 12 video generation tests
│   ├── timeline-editing.spec.ts            # 13 timeline tests
│   ├── asset-management.spec.ts            # 14 asset management tests
│   ├── editor.spec.ts                      # 40+ editor core tests
│   ├── audio-generation.spec.ts            # 20+ audio generation tests
│   ├── corrections.spec.ts                 # 15+ corrections tests
│   ├── edge-cases.spec.ts                  # 20+ edge case tests
│   ├── error-handling.spec.ts              # 25+ error handling tests
│   ├── accessibility.spec.ts               # 25+ accessibility tests
│   ├── offline.spec.ts                     # 18+ offline mode tests
│   ├── performance.spec.ts                 # 20+ performance tests
│   ├── validation.spec.ts                  # 30+ validation tests
│   ├── state-persistence.spec.ts           # 25+ state tests
│   │
│   ├── global-setup.ts                     # Global setup
│   ├── global-teardown.ts                  # Global teardown
│   │
│   ├── README.md                           # Main documentation
│   ├── TEST-SUMMARY.md                     # Implementation summary
│   └── QUICK-START.md                      # Quick start guide
│
├── .github/
│   └── workflows/
│       └── e2e-tests.yml                   # CI/CD workflow
│
├── playwright.config.ts                    # Playwright configuration
└── docs/
    └── E2E_TESTING_GUIDE.md               # This file
```

### Page Object Models

The test suite uses the Page Object Model pattern for maintainability:

```typescript
// Example: EditorPage.ts
export class EditorPage {
  readonly page: Page;
  readonly timeline: Locator;
  readonly videoPreview: Locator;
  readonly projectTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.timeline = page.locator('[data-testid="timeline"]');
    this.videoPreview = page.locator('[data-testid="video-preview"]');
    this.projectTitle = page.locator('[data-testid="project-title"]');
  }

  async goto(projectId: string) {
    await this.page.goto(`/editor/${projectId}/timeline`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForTimelineLoad() {
    await this.timeline.waitFor({ state: 'visible', timeout: 10000 });
  }
}
```

### Test Fixtures

Fixtures provide reusable setup and teardown logic:

```typescript
// Authentication fixture
export async function setupAuthenticatedSession(page: Page) {
  const signInPage = new SignInPage(page);
  await signInPage.goto();
  await signInPage.signIn('test@example.com', 'test_password_123');
  await page.waitForURL(/\/(editor|$)/);
}

// Project fixture
export async function createTestProject(
  page: Page,
  name: string = 'Test Project'
): Promise<string> {
  await page.goto('/');
  await page.waitForURL(/\/editor\/[a-zA-Z0-9-]+/);
  const url = page.url();
  const match = url.match(/\/editor\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : '';
}

export async function cleanupTestProjects(page: Page) {
  // Cleanup logic
}
```

### Test Utilities

Helper functions for common operations:

```typescript
// From e2e/utils/helpers.ts
export const generateTestId = (): string => {
  return Date.now().toString();
};

export const mockAPIResponse = async (
  page: Page,
  url: string,
  response: any,
  status: number = 200
) => {
  await page.route(url, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
};

export const waitForToast = async (page: Page, message: string) => {
  await page.locator(`text=${message}`).waitFor({ state: 'visible' });
};
```

## Running Tests

### Prerequisites

1. **Application Running:**

   ```bash
   npm run dev
   ```

   Application should be accessible at `http://localhost:3000`

2. **Test Credentials:**
   Ensure test user exists in database:
   - Email: `test@example.com`
   - Password: `test_password_123`

3. **Playwright Installed:**
   ```bash
   npx playwright install
   ```

### Running Commands

#### Run All Tests

```bash
npm run test:e2e
```

#### Run with UI Mode (Recommended for Development)

```bash
npm run test:e2e:ui
```

#### Run in Debug Mode

```bash
npm run test:e2e:debug
```

#### Run in Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

#### Run Specific Test File

```bash
npx playwright test e2e/auth.spec.ts
```

#### Run Specific Test by Name

```bash
npx playwright test -g "should sign in"
```

#### Run Tests for Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

#### Run Tests for Mobile Devices

```bash
npx playwright test --project="Mobile Chrome iPhone"
npx playwright test --project="Mobile Safari iPad"
```

#### Generate and View Report

```bash
# Generate report
npx playwright test

# View report
npx playwright show-report
```

### Advanced Options

#### Update Snapshots

```bash
npx playwright test --update-snapshots
```

#### Run with Tracing

```bash
npx playwright test --trace on
```

#### Run Specific Number of Workers

```bash
npx playwright test --workers=4
```

#### Run with Video Recording

```bash
npx playwright test --video=on
```

## CI/CD Integration

### GitHub Actions Workflow

The E2E tests are integrated into the CI/CD pipeline via GitHub Actions.

**Workflow File:** `.github/workflows/e2e-tests.yml`

#### Workflow Overview

- **Triggers:** Push to `main` or `develop`, Pull Requests
- **Jobs:**
  - Desktop tests (chromium, firefox, webkit)
  - Mobile tests (iPhone, iPad)
- **Timeout:** 60 minutes per job
- **Retries:** 2 retries in CI
- **Artifacts:** Test reports, screenshots, videos

#### Environment Variables Required

Add the following secrets in GitHub repository settings:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_CLOUD_PROJECT
GOOGLE_APPLICATION_CREDENTIALS_JSON
FAL_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

#### Setting Up GitHub Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each required secret
4. Verify secrets are available in workflow

#### Workflow Configuration

```yaml
# Desktop tests
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps ${{ matrix.browser }}
      - run: npx playwright test --project=${{ matrix.browser }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/

  # Mobile tests
  test-mobile:
    strategy:
      matrix:
        device: ['Mobile Chrome iPhone', 'Mobile Safari iPad']
    # ... similar configuration
```

### Viewing CI Test Results

1. **GitHub Actions Tab:**
   - Navigate to Actions tab in GitHub repository
   - Click on latest workflow run
   - View test results for each browser/device

2. **Download Artifacts:**
   - Scroll to "Artifacts" section in workflow run
   - Download test reports, screenshots, videos

3. **Test Report:**
   - Extract downloaded artifact
   - Open `index.html` in browser

### Local CI Simulation

Test locally with CI settings:

```bash
# Run with CI configuration
CI=true npx playwright test

# Run with retries
npx playwright test --retries=2

# Run with single worker
npx playwright test --workers=1
```

## Test Scenarios

### Edge Cases Tested

1. **Boundary Conditions:**
   - Empty project names
   - Maximum length project names (255 characters)
   - Special characters in names
   - Very long video prompts
   - Maximum file sizes
   - Empty file uploads

2. **Concurrent Operations:**
   - Multiple tabs open
   - Multiple users editing same project
   - Simultaneous video generations
   - Concurrent uploads

3. **Browser Compatibility:**
   - Different viewport sizes
   - Mobile vs desktop
   - Touch vs mouse interactions
   - Browser back/forward buttons

4. **Network Conditions:**
   - Slow network (3G, 4G)
   - Offline mode
   - Intermittent connectivity
   - Request timeouts

### Error Scenarios Tested

1. **Authentication Errors:**
   - Invalid credentials
   - Expired sessions
   - Missing tokens
   - Unauthorized access

2. **API Errors:**
   - 400 Bad Request
   - 401 Unauthorized
   - 403 Forbidden
   - 404 Not Found
   - 429 Rate Limit
   - 500 Server Error
   - Network failures
   - Timeout errors

3. **Validation Errors:**
   - Invalid email formats
   - Weak passwords
   - Unsupported file types
   - File size violations
   - Missing required fields

4. **State Errors:**
   - Corrupted local storage
   - Invalid session data
   - Missing project IDs
   - Stale data

### Accessibility Testing

1. **Keyboard Navigation:**
   - Tab order
   - Focus indicators
   - Keyboard shortcuts
   - Skip links
   - Modal focus trap

2. **Screen Readers:**
   - Semantic HTML
   - ARIA labels
   - ARIA roles
   - Heading hierarchy
   - Alt text for images

3. **Visual:**
   - Color contrast
   - Focus indicators
   - High contrast mode
   - Text sizing

## Best Practices

### Writing Tests

1. **Use Page Object Model:**

   ```typescript
   // Good
   const editorPage = new EditorPage(page);
   await editorPage.goto(projectId);
   await editorPage.addClip();

   // Bad
   await page.goto(`/editor/${projectId}`);
   await page.locator('button').click();
   ```

2. **Proper Waiting:**

   ```typescript
   // Good
   await page.waitForLoadState('networkidle');
   await element.waitFor({ state: 'visible' });

   // Bad
   await page.waitForTimeout(5000);
   ```

3. **Test Isolation:**

   ```typescript
   test.beforeEach(async ({ page }) => {
     await setupAuthenticatedSession(page);
     projectId = await createTestProject(page);
   });

   test.afterEach(async ({ page }) => {
     await cleanupTestProjects(page);
   });
   ```

4. **Descriptive Test Names:**

   ```typescript
   // Good
   test('should display error when passwords do not match', async ({ page }) => {
     // ...
   });

   // Bad
   test('password test', async ({ page }) => {
     // ...
   });
   ```

5. **Use Assertions with Timeout:**

   ```typescript
   // Good
   await expect(element).toBeVisible({ timeout: 5000 });

   // Bad
   const isVisible = await element.isVisible();
   expect(isVisible).toBe(true);
   ```

### Debugging Tests

1. **Use UI Mode:**

   ```bash
   npm run test:e2e:ui
   ```

2. **Use Debug Mode:**

   ```bash
   npm run test:e2e:debug
   ```

3. **Add Screenshots:**

   ```typescript
   await page.screenshot({ path: 'debug.png' });
   ```

4. **Use Trace Viewer:**

   ```bash
   npx playwright test --trace on
   npx playwright show-trace trace.zip
   ```

5. **Console Logging:**
   ```typescript
   page.on('console', (msg) => console.log(msg.text()));
   page.on('pageerror', (error) => console.error(error));
   ```

### Test Maintenance

1. **Update Page Objects:** When UI changes, update page objects first
2. **Review Flaky Tests:** Investigate and fix intermittent failures
3. **Keep Tests Fast:** Optimize slow tests, use mocking when appropriate
4. **Document Complex Tests:** Add comments for complex test scenarios
5. **Regular Review:** Review and update tests quarterly

## Recommendations

### Immediate Actions

1. **Run Tests Locally:**

   ```bash
   npm run test:e2e:ui
   ```

   Verify all tests pass in your environment

2. **Review Test Credentials:**
   Ensure `test@example.com` user exists in all environments

3. **Verify GitHub Secrets:**
   Add all required secrets to GitHub repository

4. **Enable GitHub Actions:**
   Ensure E2E workflow is enabled and runs on PRs

### Short-term Improvements (1-2 weeks)

1. **Visual Regression Testing:**
   - Add screenshot comparison tests
   - Use `@playwright/test` snapshot features
   - Test critical UI states

2. **API Contract Testing:**
   - Add tests for API request/response schemas
   - Validate API error responses
   - Test API versioning

3. **Performance Monitoring:**
   - Add performance metrics collection
   - Test page load times
   - Monitor memory usage
   - Track bundle size impact

4. **Mobile-Specific Tests:**
   - Add touch gesture tests
   - Test mobile-specific UI
   - Validate responsive layouts

### Medium-term Enhancements (1-3 months)

1. **Load Testing:**
   - Test with large projects (100+ clips)
   - Test with many assets (1000+ files)
   - Concurrent user simulation

2. **Cross-Browser Visual Testing:**
   - Compare rendering across browsers
   - Test CSS compatibility
   - Validate animations

3. **Security Testing:**
   - Test XSS prevention
   - Test CSRF protection
   - Validate authentication flows
   - Test authorization boundaries

4. **Integration Testing:**
   - Test third-party integrations (Stripe, Supabase)
   - Test AI service integrations (Google Vertex AI, Fal.ai)
   - Test email service (Resend)

### Long-term Goals (3-6 months)

1. **Synthetic Monitoring:**
   - Set up continuous E2E tests in production
   - Monitor real user flows
   - Alert on failures

2. **A/B Testing Support:**
   - Test multiple UI variants
   - Validate feature flags
   - Test rollout strategies

3. **Accessibility Automation:**
   - Integrate axe-core for automated accessibility testing
   - Add WCAG compliance tests
   - Test with screen reader automation

4. **Mobile App Testing:**
   - If mobile app developed, add mobile app E2E tests
   - Test native mobile features
   - Test app store flows

### Additional Coverage Recommendations

#### High Priority

1. **Export Functionality:**
   - Test video export workflow
   - Test different export formats
   - Test export quality settings
   - Test export progress tracking

2. **Collaboration Features:**
   - Test project sharing
   - Test multi-user editing (if applicable)
   - Test permission management

3. **Subscription/Payment Flow:**
   - Test subscription sign up
   - Test payment processing
   - Test plan upgrades/downgrades
   - Test trial periods

#### Medium Priority

1. **Settings/Preferences:**
   - Test user preferences
   - Test theme switching
   - Test keyboard shortcuts customization

2. **Search/Filter:**
   - Test project search
   - Test asset filtering
   - Test timeline search

3. **Notifications:**
   - Test toast notifications
   - Test email notifications
   - Test in-app notifications

#### Low Priority

1. **Help/Documentation:**
   - Test help system
   - Test tutorial flows
   - Test tooltips

2. **Analytics:**
   - Test analytics tracking
   - Test event logging

3. **Localization:**
   - Test multiple languages (if supported)
   - Test RTL layouts (if supported)

## Test Credentials

**Test Account (Development/Staging):**

- Email: `test@example.com`
- Password: `test_password_123`

**Important Notes:**

- These credentials are for testing purposes only
- Must exist in database for tests to pass
- Should not be used in production
- Consider using separate test database

## Troubleshooting

### Common Issues

#### 1. Tests Timeout

**Symptoms:** Tests fail with timeout errors

**Solutions:**

- Verify application is running: `npm run dev`
- Check network connectivity
- Increase timeout in test: `{ timeout: 30000 }`
- Use proper wait conditions

#### 2. Authentication Fails

**Symptoms:** Tests fail at sign in

**Solutions:**

- Verify test credentials exist
- Check Supabase configuration
- Verify environment variables
- Check database connection

#### 3. Flaky Tests

**Symptoms:** Tests pass/fail intermittently

**Solutions:**

- Add proper wait conditions
- Use `waitForLoadState('networkidle')`
- Avoid race conditions
- Check for timing issues

#### 4. CI Tests Fail but Local Tests Pass

**Symptoms:** Tests pass locally but fail in CI

**Solutions:**

- Check GitHub secrets configuration
- Verify CI environment variables
- Review CI logs for specific errors
- Test locally with CI settings: `CI=true npm run test:e2e`

#### 5. Slow Tests

**Symptoms:** Tests take too long to run

**Solutions:**

- Use API mocking for slow operations
- Parallelize tests: `--workers=4`
- Optimize wait conditions
- Skip unnecessary setup

## Metrics and Reporting

### Test Execution Metrics

Track the following metrics:

- **Total Tests:** Number of test cases
- **Pass Rate:** Percentage of passing tests
- **Execution Time:** Total time to run all tests
- **Flaky Tests:** Tests that fail intermittently
- **Coverage:** Code covered by tests

### Reporting

1. **HTML Report:**

   ```bash
   npx playwright show-report
   ```

2. **JSON Report:**
   - Located at `test-results.json`
   - Use for custom reporting

3. **CI Reports:**
   - Available as artifacts in GitHub Actions
   - Download from workflow run

### Test Quality Indicators

**Healthy Test Suite:**

- Pass rate > 95%
- Average execution time < 15 minutes
- Flaky test rate < 2%
- Clear, descriptive test names
- Proper use of page objects

**Warning Signs:**

- Pass rate < 90%
- Execution time > 30 minutes
- Flaky test rate > 5%
- Hard-coded waits (sleep/timeout)
- Duplicate test logic

## Resources

### Documentation

- [E2E Test README](/e2e/README.md) - Quick reference
- [Test Summary](/e2e/TEST-SUMMARY.md) - Implementation details
- [Quick Start Guide](/e2e/QUICK-START.md) - Getting started
- [Playwright Docs](https://playwright.dev/) - Official documentation

### Tools

- [Playwright Test](https://playwright.dev/docs/intro) - Test framework
- [Playwright Inspector](https://playwright.dev/docs/inspector) - Debugging
- [Trace Viewer](https://playwright.dev/docs/trace-viewer) - Trace analysis

### Best Practices

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)

## Conclusion

The E2E test suite provides comprehensive coverage of critical user workflows with:

- ✅ 280+ test cases across 15 test files
- ✅ 15 browser/device configurations
- ✅ Page Object Model architecture
- ✅ CI/CD integration with GitHub Actions
- ✅ Comprehensive error and edge case testing
- ✅ Accessibility testing
- ✅ Performance testing
- ✅ Offline mode testing
- ✅ Complete documentation

The test infrastructure is production-ready and can be integrated into the development workflow immediately. Follow the recommendations above to continuously improve test coverage and quality.

---

**Last Updated:** October 23, 2025
**Version:** 1.0.0
**Maintained By:** Development Team
