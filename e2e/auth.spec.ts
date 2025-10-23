import { test, expect } from './fixtures/auth';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { generateTestId } from './utils/helpers';

test.describe('Authentication', () => {
  test.describe('Sign In', () => {
    test('should display sign in form correctly', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      // Verify page elements are visible
      await expect(signInPage.emailInput).toBeVisible();
      await expect(signInPage.passwordInput).toBeVisible();
      await expect(signInPage.signInButton).toBeVisible();
      await expect(signInPage.guestButton).toBeVisible();
      await expect(signInPage.signUpLink).toBeVisible();
      await expect(signInPage.forgotPasswordLink).toBeVisible();

      // Verify page title
      await expect(page.locator('text=Sign in to Editor')).toBeVisible();
    });

    test('should successfully sign in with valid credentials', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      await signInPage.signIn('test@example.com', 'test_password_123');

      // Should redirect to editor after successful sign in
      await page.waitForURL(/\/(editor|$)/, { timeout: 10000 });

      // Verify we're no longer on the sign in page
      expect(page.url()).not.toContain('/signin');
    });

    test('should show error with invalid credentials', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      await signInPage.signIn('invalid@example.com', 'wrongpassword');

      // Should show error message
      await expect(signInPage.errorMessage).toBeVisible({ timeout: 5000 });

      const errorText = await signInPage.getErrorMessage();
      expect(errorText?.toLowerCase()).toContain('invalid');
    });

    test('should show error with empty fields', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      await signInPage.signInButton.click();

      // HTML5 validation should prevent submission
      const emailValidity = await signInPage.emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(emailValidity).toBe(false);
    });

    test('should toggle password visibility', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      await signInPage.passwordInput.fill('testpassword');

      // Password should be hidden initially
      expect(await signInPage.isPasswordVisible()).toBe(false);

      // Toggle to show password
      await signInPage.togglePasswordVisibility();
      expect(await signInPage.isPasswordVisible()).toBe(true);

      // Toggle back to hide password
      await signInPage.togglePasswordVisibility();
      expect(await signInPage.isPasswordVisible()).toBe(false);
    });

    test('should navigate to sign up page', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      await signInPage.clickSignUpLink();

      await page.waitForURL('/signup');
      expect(page.url()).toContain('/signup');
    });

    test('should navigate to forgot password page', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      await signInPage.clickForgotPasswordLink();

      await page.waitForURL('/forgot-password');
      expect(page.url()).toContain('/forgot-password');
    });

    test('should allow guest sign in', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      await signInPage.signInAsGuest();

      // Should redirect after successful guest sign in
      await page.waitForURL(/\/(editor|$)/, { timeout: 10000 });
      expect(page.url()).not.toContain('/signin');
    });
  });

  test.describe('Sign Up', () => {
    test('should display sign up form correctly', async ({ page }) => {
      const signUpPage = new SignUpPage(page);
      await signUpPage.goto();

      // Verify page elements are visible
      await expect(signUpPage.emailInput).toBeVisible();
      await expect(signUpPage.passwordInput).toBeVisible();
      await expect(signUpPage.confirmPasswordInput).toBeVisible();
      await expect(signUpPage.signUpButton).toBeVisible();
      await expect(signUpPage.signInLink).toBeVisible();

      // Verify page title
      await expect(page.locator('text=Create Your Account')).toBeVisible();
    });

    test('should show password strength indicator', async ({ page }) => {
      const signUpPage = new SignUpPage(page);
      await signUpPage.goto();

      // Type a weak password
      await signUpPage.passwordInput.fill('weak');

      // Password strength indicator should be visible
      await expect(signUpPage.passwordStrengthIndicator).toBeVisible();

      // Type a strong password
      await signUpPage.passwordInput.fill('StrongP@ssw0rd123');

      const strength = await signUpPage.getPasswordStrength();
      expect(strength).toBeTruthy();
    });

    test('should show error when passwords do not match', async ({ page }) => {
      const signUpPage = new SignUpPage(page);
      await signUpPage.goto();

      const testEmail = `test-${generateTestId()}@example.com`;
      await signUpPage.signUp(testEmail, 'Password123!', 'DifferentPassword123!');

      // Should show error message
      await expect(signUpPage.errorMessage).toBeVisible({ timeout: 5000 });

      const errorText = await signUpPage.getErrorMessage();
      expect(errorText?.toLowerCase()).toContain('match');
    });

    test('should show error with weak password', async ({ page }) => {
      const signUpPage = new SignUpPage(page);
      await signUpPage.goto();

      const testEmail = `test-${generateTestId()}@example.com`;
      await signUpPage.signUp(testEmail, 'weak', 'weak');

      // Should show error message
      await expect(signUpPage.errorMessage).toBeVisible({ timeout: 5000 });

      const errorText = await signUpPage.getErrorMessage();
      expect(errorText).toBeTruthy();
    });

    test('should show error with invalid email', async ({ page }) => {
      const signUpPage = new SignUpPage(page);
      await signUpPage.goto();

      await signUpPage.emailInput.fill('invalid-email');
      await signUpPage.passwordInput.fill('StrongP@ssw0rd123');
      await signUpPage.confirmPasswordInput.fill('StrongP@ssw0rd123');
      await signUpPage.signUpButton.click();

      // HTML5 validation should prevent submission
      const emailValidity = await signUpPage.emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(emailValidity).toBe(false);
    });

    test('should successfully create account with valid data', async ({ page }) => {
      const signUpPage = new SignUpPage(page);
      await signUpPage.goto();

      const testEmail = `test-${generateTestId()}@example.com`;
      const password = 'StrongP@ssw0rd123';

      await signUpPage.signUp(testEmail, password, password);

      // Should show success message (email confirmation required)
      await expect(signUpPage.successMessage).toBeVisible({ timeout: 5000 });

      const successText = await signUpPage.getSuccessMessage();
      expect(successText?.toLowerCase()).toContain('email');
    });

    test('should show error when email already exists', async ({ page }) => {
      const signUpPage = new SignUpPage(page);
      await signUpPage.goto();

      // Use the test credentials that already exist
      await signUpPage.signUp('test@example.com', 'test_password_123');

      // Should show error message about existing email
      await expect(signUpPage.errorMessage).toBeVisible({ timeout: 5000 });

      const errorText = await signUpPage.getErrorMessage();
      expect(errorText?.toLowerCase()).toMatch(/already|exists|registered/);
    });

    test('should toggle password visibility', async ({ page }) => {
      const signUpPage = new SignUpPage(page);
      await signUpPage.goto();

      await signUpPage.passwordInput.fill('testpassword');

      // Password should be hidden initially
      expect(await signUpPage.isPasswordVisible()).toBe(false);

      // Toggle to show password
      await signUpPage.togglePasswordVisibility();
      expect(await signUpPage.isPasswordVisible()).toBe(true);

      // Toggle back to hide password
      await signUpPage.togglePasswordVisibility();
      expect(await signUpPage.isPasswordVisible()).toBe(false);
    });

    test('should navigate to sign in page', async ({ page }) => {
      const signUpPage = new SignUpPage(page);
      await signUpPage.goto();

      await signUpPage.clickSignInLink();

      await page.waitForURL('/signin');
      expect(page.url()).toContain('/signin');
    });
  });
});
