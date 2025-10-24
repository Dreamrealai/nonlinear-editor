import type { Page, Locator } from '@playwright/test';

/**
 * Audio Generation Page Object
 * Handles interactions with the audio generation interface
 */
export class AudioGenPage {
  readonly page: Page;
  readonly generateButton: Locator;
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly sunoOption: Locator;
  readonly elevenLabsOption: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;

  // Suno-specific elements
  readonly sunoPromptField: Locator;
  readonly sunoStyleField: Locator;
  readonly sunoTitleField: Locator;
  readonly sunoCustomModeCheckbox: Locator;
  readonly sunoInstrumentalCheckbox: Locator;

  // ElevenLabs-specific elements
  readonly elevenLabsTextField: Locator;
  readonly elevenLabsVoiceSelect: Locator;
  readonly elevenLabsModelSelect: Locator;

  // Audio list
  readonly audioList: Locator;
  readonly audioItems: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.generateButton = page
      .locator('button:has-text("Generate")')
      .or(page.locator('text=Generate Audio'))
      .first();
    this.modal = page.locator('[role="dialog"]').or(page.locator('.modal')).first();
    this.closeButton = page
      .locator('button:has-text("Cancel")')
      .or(page.locator('button:has-text("Close")'))
      .or(page.locator('[aria-label="Close"]'))
      .first();
    this.sunoOption = page.locator('text=Suno').first();
    this.elevenLabsOption = page.locator('text=ElevenLabs').first();
    this.backButton = page.locator('button:has-text("Back")').first();
    this.submitButton = page
      .locator('button[type="submit"]')
      .or(page.locator('button:has-text("Generate")'))
      .last();

    // Suno fields
    this.sunoPromptField = page
      .locator('input[name="prompt"]')
      .or(page.locator('textarea[name="prompt"]'))
      .first();
    this.sunoStyleField = page.locator('input[name="style"]').first();
    this.sunoTitleField = page.locator('input[name="title"]').first();
    this.sunoCustomModeCheckbox = page.locator('input[name="customMode"]').first();
    this.sunoInstrumentalCheckbox = page.locator('input[name="instrumental"]').first();

    // ElevenLabs fields
    this.elevenLabsTextField = page
      .locator('input[name="text"]')
      .or(page.locator('textarea[name="text"]'))
      .first();
    this.elevenLabsVoiceSelect = page.locator('select[name="voiceId"]').first();
    this.elevenLabsModelSelect = page.locator('select[name="modelId"]').first();

    // Audio list
    this.audioList = page
      .locator('[data-testid="audio-list"]')
      .or(page.locator('.audio-list'))
      .first();
    this.audioItems = page.locator('[data-testid="audio-item"]').or(page.locator('.audio-item'));
  }

  /**
   * Navigate to audio generation page for a project
   */
  async goto(projectId: string) {
    await this.page.goto(`/editor/${projectId}/generate-audio`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Open the audio generation modal
   */
  async openGenerateModal() {
    await this.generateButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Close the audio generation modal
   */
  async closeModal() {
    await this.closeButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Select Suno as the audio generation mode
   */
  async selectSunoMode() {
    await this.sunoOption.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Select ElevenLabs as the audio generation mode
   */
  async selectElevenLabsMode() {
    await this.elevenLabsOption.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Go back from mode selection
   */
  async clickBack() {
    await this.backButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Generate audio using Suno
   */
  async generateWithSuno(options: {
    prompt: string;
    style?: string;
    title?: string;
    customMode?: boolean;
    instrumental?: boolean;
  }) {
    await this.sunoPromptField.fill(options.prompt);

    if (options.style && (await this.sunoStyleField.count()) > 0) {
      await this.sunoStyleField.fill(options.style);
    }

    if (options.title && (await this.sunoTitleField.count()) > 0) {
      await this.sunoTitleField.fill(options.title);
    }

    if (options.customMode && (await this.sunoCustomModeCheckbox.count()) > 0) {
      await this.sunoCustomModeCheckbox.check();
    }

    if (options.instrumental && (await this.sunoInstrumentalCheckbox.count()) > 0) {
      await this.sunoInstrumentalCheckbox.check();
    }

    await this.submitButton.click();
  }

  /**
   * Generate audio using ElevenLabs
   */
  async generateWithElevenLabs(options: { text: string; voiceId?: string; modelId?: string }) {
    await this.elevenLabsTextField.fill(options.text);

    if (options.voiceId && (await this.elevenLabsVoiceSelect.count()) > 0) {
      await this.elevenLabsVoiceSelect.selectOption(options.voiceId);
    }

    if (options.modelId && (await this.elevenLabsModelSelect.count()) > 0) {
      await this.elevenLabsModelSelect.selectOption(options.modelId);
    }

    await this.submitButton.click();
  }

  /**
   * Get the count of audio items
   */
  async getAudioItemCount(): Promise<number> {
    return await this.audioItems.count();
  }

  /**
   * Check if modal is visible
   */
  async isModalVisible(): Promise<boolean> {
    try {
      return await this.modal.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  /**
   * Check if Suno form is visible
   */
  async isSunoFormVisible(): Promise<boolean> {
    try {
      return await this.sunoPromptField.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  /**
   * Check if ElevenLabs form is visible
   */
  async isElevenLabsFormVisible(): Promise<boolean> {
    try {
      return await this.elevenLabsTextField.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  /**
   * Navigate to timeline
   */
  async navigateToTimeline(projectId: string) {
    const timelineLink = this.page.locator('a[href*="timeline"]').first();
    if ((await timelineLink.count()) > 0) {
      await timelineLink.click();
      await this.page.waitForURL(`**/editor/${projectId}/timeline**`, { timeout: 5000 });
    }
  }
}
