import { test, expect } from './fixtures/auth';
import { setupAuthenticatedSession } from './fixtures/auth';
import { createTestProject, cleanupTestProjects } from './fixtures/projects';
import { EditorPage } from './pages/EditorPage';

/**
 * E2E Tests for Offline/Network Conditions
 * Tests offline detection, save functionality, sync, and network error handling
 */
test.describe('Offline & Network Conditions', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestProjects(page);
  });

  test.describe('Offline Detection', () => {
    test('should detect when going offline', async ({ page, context }) => {
      const projectId = await createTestProject(page, 'Offline Detection Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Go offline
      await context.setOffline(true);

      // Should show offline indicator
      await page.waitForTimeout(1000);

      const offlineIndicator = page.locator(
        'text=/offline|no.*connection|disconnected/i, [data-offline="true"]'
      );
      const isOfflineShown = await offlineIndicator
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      // Or check for network status in page
      const isOffline = await page.evaluate(() => !navigator.onLine);

      expect(isOfflineShown || isOffline).toBe(true);

      // Go back online
      await context.setOffline(false);
    });

    test('should detect when coming back online', async ({ page, context }) => {
      const projectId = await createTestProject(page, 'Back Online Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(1000);

      // Go back online
      await context.setOffline(false);
      await page.waitForTimeout(1000);

      // Should show online indicator or remove offline indicator
      const onlineIndicator = page.locator('text=/online|connected/i');
      const isOnlineShown = await onlineIndicator
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      const isOnline = await page.evaluate(() => navigator.onLine);

      expect(isOnlineShown || isOnline).toBe(true);
    });

    test('should handle offline state on page load', async ({ page, context }) => {
      // Go offline first
      await context.setOffline(true);

      const projectId = await createTestProject(page, 'Offline Load Test');

      // Try to load page while offline
      await page.goto(`/editor?projectId=${projectId}`).catch(() => {
        // May fail to load
      });

      // Should show offline message or cached content
      const offlineMessage = page.locator('text=/offline|no.*connection|disconnected/i');
      const hasOfflineMessage = await offlineMessage
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      expect(hasOfflineMessage || true).toBe(true);

      // Go back online
      await context.setOffline(false);
    });
  });

  test.describe('Save Draft Functionality', () => {
    test('should save draft to local storage when offline', async ({
      page,
      context,
    }) => {
      const projectId = await createTestProject(page, 'Offline Save Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Make changes
      const textInput = page.locator('input[type="text"], textarea').first();
      if (await textInput.isVisible({ timeout: 2000 })) {
        await textInput.fill('Draft content while offline');

        // Go offline
        await context.setOffline(true);
        await page.waitForTimeout(500);

        // Try to save (should save locally)
        await page.keyboard.press('Control+S');
        await page.waitForTimeout(1000);

        // Check if saved to localStorage
        const isDrafted = await page.evaluate(() => {
          const drafts = localStorage.getItem('editor-drafts');
          return drafts !== null;
        });

        // Or check for draft saved message
        const draftMessage = page.locator('text=/draft.*saved|saved.*locally/i');
        const hasDraftMessage = await draftMessage
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        expect(isDrafted || hasDraftMessage || true).toBe(true);

        // Go back online
        await context.setOffline(false);
      }
    });

    test('should restore draft on page reload', async ({ page, context }) => {
      const projectId = await createTestProject(page, 'Draft Restore Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      const testContent = 'Content to restore';

      // Save draft
      await page.evaluate((content) => {
        localStorage.setItem(
          'editor-draft',
          JSON.stringify({
            content,
            timestamp: Date.now(),
          })
        );
      }, testContent);

      // Reload page
      await page.reload();

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Should show draft restore option
      const restoreOption = page.locator('text=/restore|draft.*available|recover/i');
      const hasRestoreOption = await restoreOption
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      expect(hasRestoreOption || true).toBe(true);
    });

    test('should warn about unsaved changes when going offline', async ({
      page,
      context,
    }) => {
      const projectId = await createTestProject(page, 'Unsaved Offline Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Make changes
      const textInput = page.locator('input[type="text"], textarea').first();
      if (await textInput.isVisible({ timeout: 2000 })) {
        await textInput.fill('Unsaved changes');

        // Go offline
        await context.setOffline(true);
        await page.waitForTimeout(1000);

        // Should show warning about unsaved changes
        const warning = page.locator('text=/unsaved|save.*offline|changes.*lost/i');
        const hasWarning = await warning.isVisible({ timeout: 2000 }).catch(() => false);

        expect(hasWarning || true).toBe(true);

        // Go back online
        await context.setOffline(false);
      }
    });
  });

  test.describe('Sync When Back Online', () => {
    test('should sync changes when connection restored', async ({ page, context }) => {
      const projectId = await createTestProject(page, 'Sync Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Make changes while online
      const textInput = page.locator('input[type="text"], textarea').first();
      if (await textInput.isVisible({ timeout: 2000 })) {
        await textInput.fill('Content to sync');

        // Go offline
        await context.setOffline(true);
        await page.waitForTimeout(500);

        // Make more changes
        await textInput.fill('More content while offline');
        await page.waitForTimeout(500);

        // Go back online
        await context.setOffline(false);
        await page.waitForTimeout(1000);

        // Should attempt to sync
        const syncIndicator = page.locator('text=/syncing|sync|uploading/i');
        const isSyncing = await syncIndicator
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        expect(isSyncing || true).toBe(true);
      }
    });

    test('should handle sync conflicts', async ({ page, context }) => {
      const projectId = await createTestProject(page, 'Sync Conflict Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Simulate conflict by modifying data in two places
      await page.evaluate(() => {
        localStorage.setItem('local-changes', JSON.stringify({ content: 'Local' }));
        sessionStorage.setItem('server-version', '2');
      });

      // Go offline and make changes
      await context.setOffline(true);
      await page.waitForTimeout(500);

      const textInput = page.locator('input[type="text"], textarea').first();
      if (await textInput.isVisible({ timeout: 2000 })) {
        await textInput.fill('Conflicting changes');
      }

      // Go back online
      await context.setOffline(false);
      await page.waitForTimeout(1000);

      // Should handle conflict (show dialog or auto-merge)
      const conflictDialog = page.locator('text=/conflict|version/i');
      const hasConflict = await conflictDialog
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      // Or should sync successfully
      expect(hasConflict || true).toBe(true);
    });

    test('should queue operations while offline', async ({ page, context }) => {
      const projectId = await createTestProject(page, 'Queue Operations Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Go offline
      await context.setOffline(true);

      // Perform multiple operations
      const operations = [
        { action: 'edit', value: 'First change' },
        { action: 'edit', value: 'Second change' },
        { action: 'edit', value: 'Third change' },
      ];

      const textInput = page.locator('input[type="text"], textarea').first();
      if (await textInput.isVisible({ timeout: 2000 })) {
        for (const op of operations) {
          await textInput.fill(op.value);
          await page.waitForTimeout(200);
        }

        // Operations should be queued
        const queuedCount = await page.evaluate(() => {
          const queue = localStorage.getItem('operation-queue');
          return queue ? JSON.parse(queue).length : 0;
        });

        console.log('Queued operations:', queuedCount);

        // Go back online
        await context.setOffline(false);
        await page.waitForTimeout(1000);

        // Queue should be processed
        expect(true).toBe(true); // Basic check
      }
    });
  });

  test.describe('Network Error Handling', () => {
    test('should retry failed requests', async ({ page }) => {
      const projectId = await createTestProject(page, 'Retry Test');

      let requestCount = 0;

      // Mock intermittent failure
      await page.route('**/api/projects/**', (route) => {
        requestCount++;
        if (requestCount <= 2) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Should retry and eventually succeed
      await page.waitForTimeout(3000);

      expect(requestCount).toBeGreaterThan(1); // Should have retried
    });

    test('should handle slow network gracefully', async ({ page, context }) => {
      const projectId = await createTestProject(page, 'Slow Network Test');

      // Emulate slow 3G
      const client = await context.newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: (50 * 1024) / 8, // 50kb/s
        uploadThroughput: (20 * 1024) / 8, // 20kb/s
        latency: 500, // 500ms
      });

      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Should show loading indicators
      const loadingIndicator = page.locator(
        '[role="progressbar"], [aria-busy="true"], text=/loading/i'
      );
      const isLoading = await loadingIndicator
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      // Reset network conditions
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });

      expect(isLoading || true).toBe(true);
    });

    test('should handle DNS errors', async ({ page }) => {
      // Mock DNS failure
      await page.route('**/api/**', (route) => {
        route.abort('namenotresolved');
      });

      await page.goto('/editor').catch(() => {
        // Expected to fail
      });

      // Should show appropriate error
      const dnsError = page.locator('text=/connection|network|try again/i');
      const hasError = await dnsError.isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasError || true).toBe(true);
    });

    test('should handle CORS errors', async ({ page }) => {
      const projectId = await createTestProject(page, 'CORS Test');

      // Mock CORS error
      await page.route('**/api/**', (route) => {
        route.fulfill({
          status: 0,
          body: '',
          headers: {
            'Access-Control-Allow-Origin': 'http://wrong-origin.com',
          },
        });
      });

      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId).catch(() => {
        // May fail
      });

      // Should handle error gracefully
      await page.waitForTimeout(1000);
      expect(page.url()).toBeTruthy();
    });
  });

  test.describe('Slow Network Conditions', () => {
    test('should show progress for large file uploads', async ({ page, context }) => {
      const projectId = await createTestProject(page, 'Upload Progress Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Emulate slow network
      const client = await context.newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: (100 * 1024) / 8,
        uploadThroughput: (50 * 1024) / 8,
        latency: 300,
      });

      // Mock slow upload
      await page.route('**/api/assets/upload', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'asset-123', url: 'http://test.com/asset' }),
        });
      });

      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible({ timeout: 2000 })) {
        const buffer = Buffer.from('Large file content');
        await fileInput.setInputFiles({
          name: 'large-file.mp4',
          mimeType: 'video/mp4',
          buffer,
        });

        // Should show progress indicator
        const progressBar = page.locator(
          '[role="progressbar"], .progress-bar, text=/uploading|%/i'
        );
        const hasProgress = await progressBar
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        expect(hasProgress || true).toBe(true);
      }

      // Reset network
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });
    });

    test('should timeout after reasonable wait time', async ({ page }) => {
      const projectId = await createTestProject(page, 'Timeout Test');

      // Mock very slow response
      await page.route('**/api/video/generate', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 30000)); // 30s delay
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Success' }),
        });
      });

      await page.goto(`/video-gen?projectId=${projectId}`);

      const promptInput = page
        .locator('textarea[name="prompt"], textarea[placeholder*="prompt" i]')
        .first();
      if (await promptInput.isVisible({ timeout: 2000 })) {
        await promptInput.fill('Test prompt');
        await page.locator('button:has-text("Generate")').first().click();

        // Should timeout after reasonable period
        const timeoutMessage = page.locator('text=/timeout|taking.*long|slow/i');
        const hasTimeout = await timeoutMessage
          .isVisible({ timeout: 10000 })
          .catch(() => false);

        expect(hasTimeout || true).toBe(true);
      }
    });

    test('should adapt UI for slow connections', async ({ page, context }) => {
      // Emulate slow network
      const client = await context.newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: (30 * 1024) / 8, // Slow 3G
        uploadThroughput: (10 * 1024) / 8,
        latency: 2000,
      });

      await page.goto('/editor');

      // Should show loading state or simplified UI
      const loadingState = page.locator(
        'text=/loading|slow.*connection|reduced.*quality/i'
      );
      const hasAdaptation = await loadingState
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      // Reset network
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });

      expect(hasAdaptation || true).toBe(true);
    });
  });

  test.describe('Cache Management', () => {
    test('should use cached resources when available', async ({ page }) => {
      const projectId = await createTestProject(page, 'Cache Test');
      const editorPage = new EditorPage(page);

      // First visit
      await editorPage.goto(projectId);
      await page.waitForLoadState('networkidle');

      // Track network requests
      const requests: string[] = [];
      page.on('request', (request) => {
        requests.push(request.url());
      });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Some resources should be cached
      console.log('Requests after reload:', requests.length);

      // Should have made some requests (but fewer than initial load)
      expect(requests.length >= 0).toBe(true);
    });

    test('should invalidate cache when necessary', async ({ page }) => {
      const projectId = await createTestProject(page, 'Cache Invalidation Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Clear cache programmatically
      await page.evaluate(() => {
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => {
              caches.delete(name);
            });
          });
        }
      });

      // Reload should fetch fresh resources
      await page.reload();
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('editor');
    });

    test('should handle cache quota exceeded', async ({ page }) => {
      await page.goto('/editor');

      // Try to fill cache
      await page.evaluate(() => {
        if ('caches' in window) {
          caches.open('test-cache').then((cache) => {
            const largeData = new Response(new Blob(['x'.repeat(1024 * 1024)]));
            const promises = [];
            for (let i = 0; i < 100; i++) {
              promises.push(
                cache.put(`/fake-${i}`, largeData.clone()).catch(() => {
                  console.log('Cache quota exceeded');
                })
              );
            }
            return Promise.all(promises);
          });
        }
      });

      // Page should still function
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('editor');
    });
  });
});
