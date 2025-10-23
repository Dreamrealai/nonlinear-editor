import type { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly newProjectButton: Locator;
  readonly projectsList: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly settingsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newProjectButton = page.locator('text=New Project');
    this.projectsList = page.locator('[data-testid="projects-list"]').or(page.locator('.projects-list'));
    this.userMenu = page.locator('[data-testid="user-menu"]').or(page.locator('.user-menu'));
    this.logoutButton = page.locator('text=Logout').or(page.locator('a[href="/logout"]'));
    this.settingsButton = page.locator('text=Settings').or(page.locator('a[href="/settings"]'));
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async createNewProject() {
    await this.newProjectButton.click();
  }

  async openProject(projectId: string) {
    await this.page.goto(`/editor/${projectId}/timeline`);
    await this.page.waitForLoadState('networkidle');
  }

  async getProjectCount(): Promise<number> {
    const projects = this.page.locator('[data-testid="project-item"]').or(this.page.locator('.project-item'));
    return await projects.count();
  }

  async logout() {
    await this.logoutButton.click();
  }

  async openSettings() {
    await this.settingsButton.click();
  }
}
