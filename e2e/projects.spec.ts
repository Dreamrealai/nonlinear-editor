import { test, expect } from './fixtures/auth';
import { setupAuthenticatedSession } from './fixtures/auth';
import { createTestProject, deleteTestProject, cleanupTestProjects } from './fixtures/projects';
import { HomePage } from './pages/HomePage';
import { EditorPage } from './pages/EditorPage';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await setupAuthenticatedSession(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up test projects after each test
    await cleanupTestProjects(page);
  });

  test('should redirect to editor after sign in', async ({ page }) => {
    // After sign in, should be on editor or project page
    expect(page.url()).toMatch(/\/(editor|$)/);
  });

  test('should create a default project on first sign in', async ({ page }) => {
    // The home page automatically creates a default project and redirects to editor
    expect(page.url()).toMatch(/\/editor\/[a-zA-Z0-9-]+\/timeline/);
  });

  test('should load editor page successfully', async ({ page }) => {
    // Get current URL which should be an editor page
    const url = page.url();
    const match = url.match(/\/editor\/([a-zA-Z0-9-]+)/);

    if (match) {
      const projectId = match[1];
      const editorPage = new EditorPage(page);

      // Verify editor page loaded
      await editorPage.waitForTimelineLoad();

      // Verify project title is visible
      const title = await editorPage.getProjectTitle();
      expect(title).toBeTruthy();
    }
  });

  test('should display project title in editor', async ({ page }) => {
    const projectId = await createTestProject(page, 'Test Project Title');

    const editorPage = new EditorPage(page);
    await editorPage.goto(projectId);

    const title = await editorPage.getProjectTitle();
    expect(title).toBeTruthy();
  });

  test('should persist project data after reload', async ({ page }) => {
    const projectId = await createTestProject(page, 'Persistent Project');

    const editorPage = new EditorPage(page);
    await editorPage.goto(projectId);

    // Get initial state
    const initialTitle = await editorPage.getProjectTitle();

    // Reload page
    await page.reload();
    await editorPage.waitForTimelineLoad();

    // Verify data persists
    const reloadedTitle = await editorPage.getProjectTitle();
    expect(reloadedTitle).toBe(initialTitle);
  });

  test('should handle multiple projects', async ({ page }) => {
    // Create multiple test projects
    const project1 = await createTestProject(page, 'Project 1');
    const project2 = await createTestProject(page, 'Project 2');
    const project3 = await createTestProject(page, 'Project 3');

    expect(project1).toBeTruthy();
    expect(project2).toBeTruthy();
    expect(project3).toBeTruthy();
    expect(project1).not.toBe(project2);
    expect(project2).not.toBe(project3);

    // Verify we can navigate between projects
    const editorPage = new EditorPage(page);

    await editorPage.goto(project1);
    expect(page.url()).toContain(project1);

    await editorPage.goto(project2);
    expect(page.url()).toContain(project2);

    await editorPage.goto(project3);
    expect(page.url()).toContain(project3);
  });

  test('should return 404 for non-existent project', async ({ page }) => {
    const editorPage = new EditorPage(page);
    const response = await page.goto('/editor/non-existent-project-id-12345/timeline');

    // Should handle error gracefully (either 404 or redirect)
    expect(response?.status()).toBeGreaterThanOrEqual(400);
  });

  test('should handle project deletion', async ({ page }) => {
    const projectId = await createTestProject(page, 'To Be Deleted');

    const editorPage = new EditorPage(page);
    await editorPage.goto(projectId);

    // Delete the project
    await deleteTestProject(page, projectId);

    // Try to access the deleted project
    const response = await page.goto(`/editor/${projectId}/timeline`);

    // Should return an error or redirect
    expect(response?.status()).not.toBe(200);
  });
});
