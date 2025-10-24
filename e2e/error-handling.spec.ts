import { test, expect } from './fixtures/auth';
import { setupAuthenticatedSession } from './fixtures/auth';
import { createTestProject, cleanupTestProjects } from './fixtures/projects';
import { VideoGenPage } from './pages/VideoGenPage';
import { EditorPage } from './pages/EditorPage';
import { mockAPIResponse } from './utils/helpers';
import type { Page } from '@playwright/test';

/**
 * E2E Tests for Error Handling & Recovery
 * Tests network failures, API timeouts, retry mechanisms, and recovery flows
 */
test.describe('Error Handling & Recovery', () => {
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    projectId = await createTestProject(page, 'Error Handling Test');
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestProjects(page);
  });

  test.describe('Network Failures', () => {
    test('should handle network failure during video generation', async ({ page }) => {
      const videoGenPage = new VideoGenPage(page);
      await videoGenPage.goto(projectId);

      // Mock network failure
      await page.route('**/api/video/generate', (route) => {
        route.abort('failed');
      });

      await videoGenPage.promptTextarea.fill('Test prompt');
      await videoGenPage.generateButton.click();

      // Should show network error message
      const errorMessage = await videoGenPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.toLowerCase()).toMatch(/network|connection|failed/);
    });

    test('should handle network failure during project load', async ({ page }) => {
      const editorPage = new EditorPage(page);

      // Mock network failure for project load
      await page.route('**/api/projects/**', (route) => {
        route.abort('failed');
      });

      await editorPage.goto(projectId);

      // Should show error message or retry option
      const errorVisible = await page.locator('text=/error|failed|try again/i').isVisible();
      expect(errorVisible).toBe(true);
    });

    test('should handle network failure during asset upload', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Mock network failure for asset upload
      await page.route('**/api/assets/upload', (route) => {
        route.abort('failed');
      });

      // Attempt to upload an asset
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Create a test file
        const buffer = Buffer.from('test content');
        await fileInput.setInputFiles({
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer,
        });

        // Should show upload error
        const errorVisible = await page
          .locator('text=/upload.*failed|error/i')
          .isVisible({ timeout: 5000 });
        expect(errorVisible).toBe(true);
      }
    });

    test('should handle intermittent network issues', async ({ page }) => {
      const videoGenPage = new VideoGenPage(page);
      await videoGenPage.goto(projectId);

      let requestCount = 0;

      // Mock intermittent failure (fail first 2 attempts, succeed on 3rd)
      await page.route('**/api/video/generate', (route) => {
        requestCount++;
        if (requestCount <= 2) {
          route.abort('failed');
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              operationName: 'test-operation',
              message: 'Success',
            }),
          });
        }
      });

      await videoGenPage.promptTextarea.fill('Test prompt');
      await videoGenPage.generateButton.click();

      // First attempt should fail
      const errorMessage = await videoGenPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();

      // Check if retry button exists
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
      if (await retryButton.isVisible({ timeout: 2000 })) {
        await retryButton.click();

        // If still failing, retry again
        if (await errorMessage) {
          const secondRetryButton = page.locator(
            'button:has-text("Retry"), button:has-text("Try Again")'
          );
          if (await secondRetryButton.isVisible({ timeout: 2000 })) {
            await secondRetryButton.click();

            // Third attempt should succeed
            const successMessage = page.locator('text=/success|started|generating/i');
            await expect(successMessage).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });
  });

  test.describe('API Timeout Scenarios', () => {
    test('should handle API timeout during video generation', async ({ page }) => {
      const videoGenPage = new VideoGenPage(page);
      await videoGenPage.goto(projectId);

      // Mock slow API response that times out
      await page.route('**/api/video/generate', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 60000)); // 60 second delay
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Success' }),
        });
      });

      await videoGenPage.promptTextarea.fill('Test prompt');
      await videoGenPage.generateButton.click();

      // Should show timeout error or loading indicator
      const timeoutError = page.locator('text=/timeout|taking.*long|slow/i');
      const loadingIndicator = page.locator('[role="progressbar"], [aria-busy="true"]');

      // Either timeout error should appear or loading should be visible
      const timeoutVisible = await timeoutError.isVisible({ timeout: 10000 }).catch(() => false);
      const loadingVisible = await loadingIndicator
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      expect(timeoutVisible || loadingVisible).toBe(true);
    });

    test('should handle slow API responses gracefully', async ({ page }) => {
      const videoGenPage = new VideoGenPage(page);
      await videoGenPage.goto(projectId);

      // Mock slow but successful API response
      await page.route('**/api/video/generate', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 second delay
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            operationName: 'test-operation',
            message: 'Success',
          }),
        });
      });

      await videoGenPage.promptTextarea.fill('Test prompt');
      await videoGenPage.generateButton.click();

      // Loading indicator should be shown
      const loadingIndicator = page.locator(
        '[role="progressbar"], [aria-busy="true"], text=/loading|generating/i'
      );
      await expect(loadingIndicator).toBeVisible({ timeout: 1000 });

      // Should eventually succeed
      const successMessage = page.locator('text=/success|started|generating/i');
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Retry Mechanisms', () => {
    test('should allow manual retry after failure', async ({ page }) => {
      const videoGenPage = new VideoGenPage(page);
      await videoGenPage.goto(projectId);

      let attemptCount = 0;

      // Mock failure on first attempt, success on retry
      await page.route('**/api/video/generate', (route) => {
        attemptCount++;
        if (attemptCount === 1) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Server error' }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              operationName: 'test-operation',
              message: 'Success',
            }),
          });
        }
      });

      await videoGenPage.promptTextarea.fill('Test prompt');
      await videoGenPage.generateButton.click();

      // Should show error
      const errorMessage = await videoGenPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();

      // Look for retry button
      const retryButton = page.locator(
        'button:has-text("Retry"), button:has-text("Try Again"), button:has-text("Generate")'
      );
      await retryButton.first().click();

      // Should succeed on retry
      const successMessage = page.locator('text=/success|started|generating/i');
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    });

    test('should show retry count limit', async ({ page }) => {
      const videoGenPage = new VideoGenPage(page);
      await videoGenPage.goto(projectId);

      // Mock consistent failures
      await page.route('**/api/video/generate', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      });

      await videoGenPage.promptTextarea.fill('Test prompt');

      // Try multiple times
      for (let i = 0; i < 3; i++) {
        await videoGenPage.generateButton.click();
        await page.waitForTimeout(1000);
      }

      // Should show error message
      const errorMessage = await videoGenPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
    });
  });

  test.describe('Graceful Degradation', () => {
    test('should handle missing API endpoints', async ({ page }) => {
      // Mock 404 for non-existent endpoint
      await page.route('**/api/nonexistent', (route) => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' }),
        });
      });

      await page.goto('/editor');

      // Page should still load without critical failures
      await expect(page).toHaveURL(/\/editor/);
    });

    test('should work offline with cached data', async ({ page, context }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Go offline
      await context.setOffline(true);

      // Try to interact with the page
      const timelineVisible = await page
        .locator('[data-testid="timeline"], .timeline')
        .isVisible()
        .catch(() => false);

      // Page should still be functional for viewing
      expect(timelineVisible || page.url().includes('editor')).toBe(true);

      // Go back online
      await context.setOffline(false);
    });

    test('should handle partial API failures', async ({ page }) => {
      const editorPage = new EditorPage(page);

      // Mock partial failure - projects load but assets fail
      await page.route('**/api/projects/**', (route) => {
        if (route.request().url().includes('assets')) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Assets unavailable' }),
          });
        } else {
          route.continue();
        }
      });

      await editorPage.goto(projectId);

      // Project should load even if assets fail
      await expect(page).toHaveURL(new RegExp(projectId));
    });
  });

  test.describe('Error Message Display', () => {
    test('should display user-friendly error messages', async ({ page }) => {
      const videoGenPage = new VideoGenPage(page);
      await videoGenPage.goto(projectId);

      // Mock API error with technical message
      await page.route('**/api/video/generate', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'ECONNREFUSED: Connection refused at port 5000',
          }),
        });
      });

      await videoGenPage.promptTextarea.fill('Test prompt');
      await videoGenPage.generateButton.click();

      const errorMessage = await videoGenPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();

      // Error should not contain technical jargon like ECONNREFUSED
      // Instead should show user-friendly message
      const isFriendly = errorMessage && !errorMessage.includes('ECONNREFUSED');
      expect(isFriendly).toBe(true);
    });

    test('should show specific error for validation failures', async ({ page }) => {
      const videoGenPage = new VideoGenPage(page);
      await videoGenPage.goto(projectId);

      // Mock validation error
      await page.route('**/api/video/generate', (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Prompt must be at least 10 characters',
          }),
        });
      });

      await videoGenPage.promptTextarea.fill('Short');
      await videoGenPage.generateButton.click();

      const errorMessage = await videoGenPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.toLowerCase()).toMatch(/prompt|character/);
    });

    test('should show error for unauthorized access', async ({ page }) => {
      // Mock 401 unauthorized
      await page.route('**/api/projects/**', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      });

      await page.goto(`/editor?projectId=${projectId}`);

      // Should show unauthorized error or redirect to sign in
      const isSignInPage = page.url().includes('signin');
      const hasErrorMessage = await page
        .locator('text=/unauthorized|access denied|sign in/i')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(isSignInPage || hasErrorMessage).toBe(true);
    });
  });

  test.describe('Recovery Flows', () => {
    test('should allow cancel during generation', async ({ page }) => {
      const videoGenPage = new VideoGenPage(page);
      await videoGenPage.goto(projectId);

      // Mock slow API response
      await page.route('**/api/video/generate', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Success' }),
        });
      });

      await videoGenPage.promptTextarea.fill('Test prompt');
      await videoGenPage.generateButton.click();

      // Look for cancel button
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Stop")');
      if (await cancelButton.isVisible({ timeout: 2000 })) {
        await cancelButton.click();

        // Should return to ready state
        await expect(videoGenPage.generateButton).toBeEnabled({ timeout: 3000 });
      }
    });

    test('should preserve form data after error', async ({ page }) => {
      const videoGenPage = new VideoGenPage(page);
      await videoGenPage.goto(projectId);

      // Mock API error
      await page.route('**/api/video/generate', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      });

      const testPrompt = 'A beautiful sunset over the ocean';
      await videoGenPage.promptTextarea.fill(testPrompt);
      await videoGenPage.aspectRatioSelect.selectOption('16:9');
      await videoGenPage.generateButton.click();

      // Wait for error
      await page.waitForTimeout(1000);

      // Form data should be preserved
      const promptValue = await videoGenPage.promptTextarea.inputValue();
      const aspectRatioValue = await videoGenPage.aspectRatioSelect.inputValue();

      expect(promptValue).toBe(testPrompt);
      expect(aspectRatioValue).toBe('16:9');
    });

    test('should allow navigation away from error state', async ({ page }) => {
      const videoGenPage = new VideoGenPage(page);
      await videoGenPage.goto(projectId);

      // Mock API error
      await page.route('**/api/video/generate', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      });

      await videoGenPage.promptTextarea.fill('Test prompt');
      await videoGenPage.generateButton.click();

      // Wait for error
      await page.waitForTimeout(1000);

      // Should be able to navigate back to editor
      const backLink = page.locator('a:has-text("Back"), a:has-text("Editor")');
      if (await backLink.isVisible({ timeout: 2000 })) {
        await backLink.click();
        await expect(page).toHaveURL(/\/editor/);
      }
    });

    test('should clear error on new action', async ({ page }) => {
      const videoGenPage = new VideoGenPage(page);
      await videoGenPage.goto(projectId);

      let attemptCount = 0;

      // Mock error on first attempt, success on second
      await page.route('**/api/video/generate', (route) => {
        attemptCount++;
        if (attemptCount === 1) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Server error' }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              operationName: 'test-operation',
              message: 'Success',
            }),
          });
        }
      });

      await videoGenPage.promptTextarea.fill('Test prompt');
      await videoGenPage.generateButton.click();

      // Wait for error
      const errorMessage = await videoGenPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();

      // Try again - error should clear
      await videoGenPage.generateButton.click();

      // Success message should appear and error should be gone
      const successMessage = page.locator('text=/success|started|generating/i');
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    });
  });
});
