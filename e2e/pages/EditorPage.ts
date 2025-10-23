import type { Page, Locator } from '@playwright/test';

export class EditorPage {
  readonly page: Page;
  readonly timeline: Locator;
  readonly videoPreview: Locator;
  readonly addClipButton: Locator;
  readonly generateVideoButton: Locator;
  readonly exportButton: Locator;
  readonly uploadButton: Locator;
  readonly projectTitle: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.timeline = page.locator('[data-testid="timeline"]').or(page.locator('.timeline'));
    this.videoPreview = page.locator('[data-testid="video-preview"]').or(page.locator('video'));
    this.addClipButton = page.locator('text=Add Clip');
    this.generateVideoButton = page.locator('text=Generate Video');
    this.exportButton = page.locator('text=Export');
    this.uploadButton = page.locator('text=Upload');
    this.projectTitle = page.locator('[data-testid="project-title"]').or(page.locator('h1'));
    this.saveButton = page.locator('text=Save');
  }

  async goto(projectId: string) {
    await this.page.goto(`/editor/${projectId}/timeline`);
    await this.page.waitForLoadState('networkidle');
  }

  async addClip() {
    await this.addClipButton.click();
  }

  async clickGenerateVideo() {
    await this.generateVideoButton.click();
  }

  async clickExport() {
    await this.exportButton.click();
  }

  async uploadAsset(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
  }

  async getProjectTitle(): Promise<string | null> {
    try {
      return await this.projectTitle.textContent();
    } catch {
      return null;
    }
  }

  async saveProject() {
    await this.saveButton.click();
  }

  async waitForTimelineLoad() {
    await this.timeline.waitFor({ state: 'visible', timeout: 10000 });
  }

  async getClipCount(): Promise<number> {
    const clips = this.page.locator('[data-testid="timeline-clip"]').or(this.page.locator('.timeline-clip'));
    return await clips.count();
  }

  async deleteClip(index: number) {
    const clips = this.page.locator('[data-testid="timeline-clip"]').or(this.page.locator('.timeline-clip'));
    const clip = clips.nth(index);
    await clip.hover();
    const deleteButton = clip.locator('text=Delete').or(clip.locator('[aria-label="Delete"]'));
    await deleteButton.click();
  }

  async moveClip(index: number, targetIndex: number) {
    const clips = this.page.locator('[data-testid="timeline-clip"]').or(this.page.locator('.timeline-clip'));
    const sourceClip = clips.nth(index);
    const targetClip = clips.nth(targetIndex);

    await sourceClip.dragTo(targetClip);
  }
}
