import type { Page, Locator } from '@playwright/test';

export class SignUpPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly signUpButton: Locator;
  readonly signInLink: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly showPasswordButton: Locator;
  readonly showConfirmPasswordButton: Locator;
  readonly passwordStrengthIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    this.signUpButton = page.locator('button[type="submit"]');
    this.signInLink = page.locator('a[href="/signin"]');
    this.errorMessage = page.locator('.bg-red-50');
    this.successMessage = page.locator('.bg-green-50');
    this.showPasswordButton = page.locator('input[name="password"] ~ button');
    this.showConfirmPasswordButton = page.locator('input[name="confirmPassword"] ~ button');
    this.passwordStrengthIndicator = page.locator('.h-1.w-full');
  }

  async goto() {
    await this.page.goto('/signup');
    await this.page.waitForLoadState('networkidle');
  }

  async signUp(email: string, password: string, confirmPassword?: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword || password);
    await this.signUpButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      return await this.errorMessage.textContent();
    } catch {
      return null;
    }
  }

  async getSuccessMessage(): Promise<string | null> {
    try {
      return await this.successMessage.textContent();
    } catch {
      return null;
    }
  }

  async clickSignInLink() {
    await this.signInLink.click();
  }

  async getPasswordStrength(): Promise<string | null> {
    try {
      const indicator = this.page.locator('text=Password strength:').locator('..');
      return await indicator.textContent();
    } catch {
      return null;
    }
  }

  async isPasswordVisible(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute('type');
    return type === 'text';
  }

  async togglePasswordVisibility() {
    await this.showPasswordButton.click();
  }

  async toggleConfirmPasswordVisibility() {
    await this.showConfirmPasswordButton.click();
  }
}
