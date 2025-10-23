# End-to-End Tests

Comprehensive E2E tests for the non-linear video editor application using Playwright.

## Overview

This directory contains end-to-end tests that validate the complete user workflows of the video editing application, including:

- User authentication (signup/signin)
- Project creation and management
- Video generation workflow
- Timeline editing
- Asset management

## Directory Structure

```
e2e/
├── pages/              # Page Object Models
│   ├── SignInPage.ts
│   ├── SignUpPage.ts
│   ├── EditorPage.ts
│   ├── VideoGenPage.ts
│   └── HomePage.ts
├── fixtures/           # Test fixtures and setup
│   ├── auth.ts        # Authentication fixtures
│   └── projects.ts    # Project management fixtures
├── utils/             # Test utilities
│   └── helpers.ts     # Helper functions
├── auth.spec.ts       # Authentication tests
├── projects.spec.ts   # Project management tests
├── video-generation.spec.ts  # Video generation tests
├── timeline-editing.spec.ts  # Timeline editing tests
├── asset-management.spec.ts  # Asset management tests
└── README.md          # This file
```

## Test Credentials

Tests use the following credentials (defined in CLAUDE.md):

- Email: `test@example.com`
- Password: `test_password_123`

**Important:** These are test credentials only and should be available in the test environment.

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
```

### Run tests for specific browser
```bash
npx playwright test --project=chromium
```

### Run tests in headed mode
```bash
npx playwright test --headed
```

## Test Coverage

### Authentication Tests (`auth.spec.ts`)
- ✓ Display sign in form correctly
- ✓ Sign in with valid credentials
- ✓ Show error with invalid credentials
- ✓ Show error with empty fields
- ✓ Toggle password visibility
- ✓ Navigate to sign up page
- ✓ Navigate to forgot password page
- ✓ Guest sign in
- ✓ Display sign up form correctly
- ✓ Show password strength indicator
- ✓ Show error when passwords don't match
- ✓ Show error with weak password
- ✓ Show error with invalid email
- ✓ Create account with valid data
- ✓ Show error when email already exists

### Project Management Tests (`projects.spec.ts`)
- ✓ Redirect to editor after sign in
- ✓ Create default project on first sign in
- ✓ Load editor page successfully
- ✓ Display project title in editor
- ✓ Persist project data after reload
- ✓ Handle multiple projects
- ✓ Return 404 for non-existent project
- ✓ Handle project deletion

### Video Generation Tests (`video-generation.spec.ts`)
- ✓ Display video generation form correctly
- ✓ Require prompt field
- ✓ Allow selecting different aspect ratios
- ✓ Allow selecting different durations
- ✓ Show error when no project selected
- ✓ Initiate video generation with valid inputs
- ✓ Display progress during generation
- ✓ Allow canceling video generation
- ✓ Redirect to editor after successful generation
- ✓ Handle API errors gracefully
- ✓ Navigate back to editor
- ✓ Preserve form values when returning from error

### Timeline Editing Tests (`timeline-editing.spec.ts`)
- ✓ Display timeline correctly
- ✓ Display video preview area
- ✓ Display project title
- ✓ Show empty timeline for new project
- ✓ Have navigation to video generation
- ✓ Navigate to video generation page
- ✓ Maintain project context across pages
- ✓ Handle different editor sub-routes
- ✓ Persist timeline state
- ✓ Handle browser back/forward navigation
- ✓ Display timeline controls
- ✓ Load without JavaScript errors
- ✓ Handle unauthorized access gracefully

### Asset Management Tests (`asset-management.spec.ts`)
- ✓ Display asset upload capability
- ✓ Accept file input element for uploads
- ✓ Navigate to asset management pages
- ✓ Display image generation page
- ✓ Display audio generation page
- ✓ Have link back to editor from asset pages
- ✓ Maintain project context in asset pages
- ✓ Show warning when no project selected
- ✓ Handle asset upload API endpoint
- ✓ Validate asset types
- ✓ Handle multiple asset types
- ✓ Provide asset organization
- ✓ Integrate assets with timeline
- ✓ Handle asset deletion

## Page Object Model Pattern

Tests use the Page Object Model (POM) pattern for better maintainability:

```typescript
import { SignInPage } from './pages/SignInPage';

test('should sign in', async ({ page }) => {
  const signInPage = new SignInPage(page);
  await signInPage.goto();
  await signInPage.signIn('test@example.com', 'test_password_123');
});
```

## Fixtures

### Authentication Fixture
Provides authenticated session for tests that require a logged-in user:

```typescript
import { setupAuthenticatedSession } from './fixtures/auth';

test('authenticated test', async ({ page }) => {
  await setupAuthenticatedSession(page);
  // Test code here
});
```

### Project Fixture
Provides project creation and cleanup:

```typescript
import { createTestProject, cleanupTestProjects } from './fixtures/projects';

test('project test', async ({ page }) => {
  const projectId = await createTestProject(page);
  // Test code here
  await cleanupTestProjects(page); // Cleanup
});
```

## CI/CD Integration

The tests are configured to run in CI/CD environments:

- **Retries:** 2 retries in CI (0 in local development)
- **Workers:** 1 worker in CI (parallel in local development)
- **Video:** Recorded on failure
- **Screenshots:** Taken on failure
- **Trace:** Enabled on first retry

## Browser Coverage

Tests run on multiple browsers and devices:

### Desktop Browsers
- Chrome
- Firefox
- Safari (WebKit)

### Mobile Browsers
- iPhone 13
- iPhone 13 Pro
- iPhone SE
- iPad Pro
- iPad Mini
- Pixel 5
- Galaxy S9+
- Galaxy Tab S4

### Custom Viewports
- Desktop 1080p (1920×1080)
- Desktop 4K (3840×2160)
- Mobile Portrait (390×844)
- Mobile Landscape (844×390)

## Best Practices

1. **Use Page Objects:** All page interactions should go through page object models
2. **Clean Up:** Always clean up test data in `afterEach` hooks
3. **Wait Properly:** Use `waitForLoadState`, `waitForSelector`, etc. instead of hard waits
4. **Assertions:** Use Playwright's built-in assertions with timeout
5. **Isolation:** Each test should be independent and not rely on other tests
6. **Mocking:** Use API mocking for external dependencies when appropriate

## Debugging Tests

### Debug a specific test
```bash
npx playwright test --debug e2e/auth.spec.ts
```

### Generate trace
```bash
npx playwright test --trace on
```

### View trace
```bash
npx playwright show-trace trace.zip
```

### Show test report
```bash
npx playwright show-report
```

## Writing New Tests

When adding new tests:

1. Create appropriate page objects in `e2e/pages/`
2. Add test fixtures if needed in `e2e/fixtures/`
3. Write tests using the POM pattern
4. Ensure tests are isolated and clean up after themselves
5. Add test documentation to this README

## Common Issues

### Tests fail with "Timeout waiting for..."
- Increase timeout in test or use proper wait conditions
- Check if the application is running (`npm run dev`)
- Verify network conditions

### Authentication fails
- Ensure test credentials exist in database
- Check Supabase configuration
- Verify environment variables

### Tests pass locally but fail in CI
- Check CI environment configuration
- Verify all dependencies are installed
- Review CI logs for specific errors

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Test Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)
