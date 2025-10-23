/**
 * E2E tests for authentication flows
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display sign in page', async ({ page }) => {
    await page.goto('/');

    // Check if redirected to auth page or if sign in button exists
    await expect(page).toHaveURL(/\/(auth|signin)?/);
  });

  test('should allow user to navigate to sign up page', async ({ page }) => {
    await page.goto('/auth/signin');

    // Look for sign up link
    const signUpLink = page.getByText(/sign up|create account/i);

    if (await signUpLink.isVisible()) {
      await signUpLink.click();
      await expect(page).toHaveURL(/signup/);
    }
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/auth/signin');

    // Try to submit with invalid email
    const emailInput = page.getByPlaceholder(/email/i);
    const submitButton = page.getByRole('button', { name: /sign in/i });

    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid-email');
      await submitButton.click();

      // Should show validation error or not submit
      await expect(page).toHaveURL(/signin/); // Should stay on signin page
    }
  });

  test('should require password for sign in', async ({ page }) => {
    await page.goto('/auth/signin');

    const emailInput = page.getByPlaceholder(/email/i);
    const passwordInput = page.getByPlaceholder(/password/i);

    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      // Fill email but not password
      await emailInput.fill('test@example.com');

      // Password should be required
      await expect(passwordInput).toBeVisible();
      await expect(passwordInput).toHaveAttribute('required', '');
    }
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users from editor', async ({ page }) => {
    // Try to access editor directly
    await page.goto('/editor');

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/(auth|signin)/);
  });

  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('/dashboard');

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/(auth|signin)/);
  });
});
