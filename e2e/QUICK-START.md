# E2E Tests Quick Start Guide

## Prerequisites

1. **Node.js and npm** installed
2. **Application running** on `http://localhost:3000`
3. **Test credentials** available in database:
   - Email: `test@example.com`
   - Password: `test_password_123`

## Installation

```bash
# Install dependencies (if not already done)
npm install

# Install Playwright browsers
npx playwright install
```

## Running Tests

### Quick Commands

```bash
# Run all tests (headless mode)
npm run test:e2e

# Run tests with UI (interactive, recommended for first-time)
npm run test:e2e:ui

# Run tests in debug mode (step through tests)
npm run test:e2e:debug
```

### Running Specific Tests

```bash
# Run only authentication tests
npx playwright test e2e/auth.spec.ts

# Run only video generation tests
npx playwright test e2e/video-generation.spec.ts

# Run a specific test by name
npx playwright test -g "should successfully sign in"
```

### Running on Specific Browsers

```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Safari only
npx playwright test --project=webkit

# Mobile devices
npx playwright test --project="Mobile Chrome iPhone"
```

## First Test Run

### Step 1: Start the Application

```bash
# In one terminal
npm run dev
```

### Step 2: Run Tests in UI Mode

```bash
# In another terminal
npm run test:e2e:ui
```

This will open Playwright's UI where you can:

- See all test files
- Run tests individually
- Watch tests execute
- Inspect test results

### Step 3: Run Specific Test Suite

```bash
# Start with authentication tests
npx playwright test e2e/auth.spec.ts --headed
```

The `--headed` flag shows the browser so you can see what's happening.

## Viewing Results

### Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

### Screenshots and Videos

Failed tests automatically capture:

- Screenshots → `test-results/`
- Videos → `test-results/`
- Traces → `test-results/`

View a trace file:

```bash
npx playwright show-trace test-results/trace.zip
```

## Common Issues and Solutions

### Issue: Tests fail with "Timeout waiting for http://localhost:3000"

**Solution:** Make sure the app is running:

```bash
npm run dev
```

### Issue: Tests fail with authentication errors

**Solution:** Ensure test user exists in database:

- Email: `test@example.com`
- Password: `test_password_123`

### Issue: "chromium not found"

**Solution:** Install Playwright browsers:

```bash
npx playwright install
```

### Issue: Tests pass locally but fail in CI

**Solution:** Check environment variables are set in CI:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- etc.

## Test Structure

```
e2e/
├── auth.spec.ts              # Sign in/up tests
├── projects.spec.ts          # Project management tests
├── video-generation.spec.ts  # Video gen workflow tests
├── timeline-editing.spec.ts  # Timeline/editor tests
├── asset-management.spec.ts  # Asset upload/management tests
├── pages/                    # Page objects
├── fixtures/                 # Test helpers
└── utils/                    # Utilities
```

## Writing Your First Test

Create a new file: `e2e/my-test.spec.ts`

```typescript
import { test, expect } from './fixtures/auth';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    // Navigate to page
    await page.goto('/my-page');

    // Interact with elements
    await page.click('button:text("Click Me")');

    // Assert results
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

Run it:

```bash
npx playwright test e2e/my-test.spec.ts
```

## Tips for Success

1. **Use Page Objects** - Don't interact with elements directly in tests
2. **Wait Properly** - Use `waitForLoadState`, `waitForSelector`, not `waitForTimeout`
3. **Clean Up** - Always clean up test data in `afterEach`
4. **Isolate Tests** - Each test should be independent
5. **Use Fixtures** - Leverage authentication and project fixtures

## Next Steps

1. ✅ Run all tests: `npm run test:e2e`
2. ✅ Check test report: `npx playwright show-report`
3. ✅ Read [README.md](./README.md) for detailed documentation
4. ✅ Review [TEST-SUMMARY.md](./TEST-SUMMARY.md) for implementation details
5. ✅ Write custom tests for your features

## Need Help?

- [Playwright Documentation](https://playwright.dev/)
- [Test README](./README.md)
- [Test Summary](./TEST-SUMMARY.md)
- [Playwright Discord](https://discord.com/invite/playwright-807756831384403968)

## Example Test Run

```bash
# Terminal 1: Start app
npm run dev

# Terminal 2: Run tests
npm run test:e2e:ui
```

Expected output:

```
Running 63 tests using 4 workers
  63 passed (2m)

To open last HTML report run:
  npx playwright show-report
```

Success! 🎉

## Quick Reference

| Command                                  | Description         |
| ---------------------------------------- | ------------------- |
| `npm run test:e2e`                       | Run all tests       |
| `npm run test:e2e:ui`                    | Interactive UI mode |
| `npm run test:e2e:debug`                 | Debug mode          |
| `npx playwright test --headed`           | Show browser        |
| `npx playwright test --project=chromium` | Chrome only         |
| `npx playwright show-report`             | View HTML report    |
| `npx playwright codegen`                 | Record new tests    |
