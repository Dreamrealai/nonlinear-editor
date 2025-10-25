import { test as base } from '@playwright/test';
import { SignInPage } from '../pages/SignInPage';
import { SignUpPage } from '../pages/SignUpPage';

/**
 * Test credentials for E2E tests
 * These credentials are defined in CLAUDE.md
 */
export const TEST_USER = {
  email: 'test@example.com',
  password: 'test_password_123',
};

/**
 * Extended Playwright test with authenticated session
 */
export const test = base.extend<{
  signInPage: SignInPage;
  signUpPage: SignUpPage;
}>({
  signInPage: async ({ page }, use) => {
    await use(new SignInPage(page));
  },
  signUpPage: async ({ page }, use) => {
    await use(new SignUpPage(page));
  },
});

export { expect } from '@playwright/test';

/**
 * Setup authenticated session for tests that require a logged-in user
 */
export async function setupAuthenticatedSession(page: any, credentials = TEST_USER) {
  const signInPage = new SignInPage(page);
  await signInPage.goto();
  await signInPage.signIn(credentials.email, credentials.password);

  // Wait for redirect after successful sign in
  await page.waitForURL(/\/(editor|$)/, { timeout: 10000 });
}
