import type { Page, Locator } from '@playwright/test';

export class SignInPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly signUpLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly guestButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly showPasswordButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.signInButton = page.locator('button[type="submit"]');
    this.signUpLink = page.locator('a[href="/signup"]');
    this.forgotPasswordLink = page.locator('a[href="/forgot-password"]');
    this.guestButton = page.locator('text=Continue as Guest');
    this.errorMessage = page.locator('.bg-red-50');
    this.successMessage = page.locator('.bg-green-50');
    this.showPasswordButton = page.locator('button[aria-label*="password"]');
  }

  async goto() {
    await this.page.goto('/signin');
    await this.page.waitForLoadState('networkidle');
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async signInAsGuest() {
    await this.guestButton.click();
  }

  async togglePasswordVisibility() {
    await this.showPasswordButton.click();
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

  async clickSignUpLink() {
    await this.signUpLink.click();
  }

  async clickForgotPasswordLink() {
    await this.forgotPasswordLink.click();
  }

  async isPasswordVisible(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute('type');
    return type === 'text';
  }
}
