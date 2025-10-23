import type { Page, Locator } from '@playwright/test';

export class VideoGenPage {
  readonly page: Page;
  readonly promptTextarea: Locator;
  readonly aspectRatioSelect: Locator;
  readonly durationSelect: Locator;
  readonly generateButton: Locator;
  readonly cancelButton: Locator;
  readonly progressBar: Locator;
  readonly progressText: Locator;
  readonly backToEditorLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.promptTextarea = page.locator('textarea[name="prompt"]');
    this.aspectRatioSelect = page.locator('select[name="aspectRatio"]');
    this.durationSelect = page.locator('select[name="duration"]');
    this.generateButton = page.locator('button[type="submit"]');
    this.cancelButton = page.locator('text=Cancel');
    this.progressBar = page.locator('.bg-blue-600');
    this.progressText = page.locator('text=/% complete/');
    this.backToEditorLink = page.locator('text=Back to Editor');
    this.errorMessage = page.locator('.bg-red-50').or(page.locator('.bg-yellow-50'));
  }

  async goto(projectId: string) {
    await this.page.goto(`/video-gen?projectId=${projectId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async generateVideo(options: {
    prompt: string;
    aspectRatio?: '9:16' | '16:9' | '1:1';
    duration?: number;
  }) {
    await this.promptTextarea.fill(options.prompt);

    if (options.aspectRatio) {
      await this.aspectRatioSelect.selectOption(options.aspectRatio);
    }

    if (options.duration) {
      await this.durationSelect.selectOption(options.duration.toString());
    }

    await this.generateButton.click();
  }

  async cancelGeneration() {
    await this.cancelButton.click();
  }

  async waitForGenerationComplete(timeout = 120000) {
    await this.page.waitForURL(/\/editor/, { timeout });
  }

  async getProgress(): Promise<number> {
    try {
      const text = await this.progressText.textContent();
      const match = text?.match(/(\d+)% complete/);
      return match ? parseInt(match[1]) : 0;
    } catch {
      return 0;
    }
  }

  async isGenerating(): Promise<boolean> {
    try {
      await this.progressBar.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      return await this.errorMessage.textContent();
    } catch {
      return null;
    }
  }

  async backToEditor() {
    await this.backToEditorLink.click();
  }
}
