import type { Page } from '@playwright/test';

/**
 * Test project data
 */
export const TEST_PROJECT = {
  title: 'E2E Test Project',
  description: 'A test project created by automated tests',
};

/**
 * Create a test project via API
 */
export async function createTestProject(
  page: Page,
  title: string = TEST_PROJECT.title
): Promise<string> {
  const response = await page.evaluate(async (projectTitle) => {
    const res = await fetch('/api/projects/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: projectTitle }),
    });
    return res.json();
  }, title);

  if (!response.id) {
    throw new Error('Failed to create test project');
  }

  return response.id;
}

/**
 * Delete a test project via API
 */
export async function deleteTestProject(page: Page, projectId: string): Promise<void> {
  await page.evaluate(async (id) => {
    await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }, projectId);
}

/**
 * Clean up all test projects created during tests
 */
export async function cleanupTestProjects(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const res = await fetch('/api/projects/list');
    const projects = await res.json();

    for (const project of projects) {
      if (project.title.includes('E2E Test') || project.title.includes('Test Project')) {
        await fetch(`/api/projects/${project.id}`, {
          method: 'DELETE',
        });
      }
    }
  });
}
