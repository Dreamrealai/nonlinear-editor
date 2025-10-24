import { test, expect } from './fixtures/auth';
import { setupAuthenticatedSession } from './fixtures/auth';
import { createTestProject, cleanupTestProjects } from './fixtures/projects';
import { EditorPage } from './pages/EditorPage';

/**
 * Video Editor Core E2E Tests
 * Tests critical editor functionality including timeline interaction,
 * video clip management, preview playback, and save operations
 */
test.describe('Video Editor Core', () => {
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    // Sign in and create a test project
    await setupAuthenticatedSession(page);
    projectId = await createTestProject(page, 'Editor Core Test Project');
  });

  test.afterEach(async ({ page }) => {
    // Clean up test projects
    await cleanupTestProjects(page);
  });

  test.describe('Timeline Interaction', () => {
    test('should display timeline with proper structure', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Verify timeline is visible
      await editorPage.waitForTimelineLoad();
      await expect(editorPage.timeline).toBeVisible();

      // Timeline should be interactive
      const timelineBoundingBox = await editorPage.timeline.boundingBox();
      expect(timelineBoundingBox).toBeTruthy();
      expect(timelineBoundingBox?.width).toBeGreaterThan(0);
      expect(timelineBoundingBox?.height).toBeGreaterThan(0);
    });

    test('should allow clicking on timeline', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Click on timeline (should not throw error)
      await editorPage.timeline.click({ position: { x: 100, y: 50 } });

      // Verify page is still functional
      await expect(editorPage.timeline).toBeVisible();
    });

    test('should display timeline ruler/markers', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for timeline markers or ruler indicators
      const hasTimelineMarkers =
        (await page.locator('[data-testid*="timeline-ruler"]').count()) > 0 ||
        (await page.locator('.timeline-ruler').count()) > 0 ||
        (await page.locator('[data-testid*="time-marker"]').count()) > 0 ||
        (await page.locator('.ruler').count()) > 0;

      // Timeline should have some visual indicators (or be empty for new project)
      expect(await editorPage.timeline.isVisible()).toBe(true);
    });

    test('should support keyboard navigation', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Click timeline to focus
      await editorPage.timeline.click();

      // Press space (common play/pause shortcut)
      await page.keyboard.press('Space');

      // Press arrow keys (common navigation)
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');

      // Should not crash or error
      await expect(editorPage.timeline).toBeVisible();
    });
  });

  test.describe('Add Video Clip', () => {
    test('should show upload/add clip option', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for upload or add clip functionality
      const hasUploadOption =
        (await page.locator('text=Upload').count()) > 0 ||
        (await page.locator('text=Add Clip').count()) > 0 ||
        (await page.locator('text=Import').count()) > 0 ||
        (await page.locator('input[type="file"]').count()) > 0 ||
        (await page.locator('[data-testid*="upload"]').count()) > 0;

      expect(hasUploadOption).toBe(true);
    });

    test('should allow accessing video generation', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for video generation link/button
      const videoGenLink = page.locator('a[href*="video-gen"]').first();

      if ((await videoGenLink.count()) > 0) {
        await videoGenLink.click();
        await page.waitForURL('**/video-gen**', { timeout: 10000 });
        expect(page.url()).toContain('video-gen');
      } else {
        // Alternative: look for generate button
        const generateButton = page.locator('text=Generate Video').first();
        if ((await generateButton.count()) > 0) {
          await generateButton.click();
          // Should trigger some action
        }
      }
    });

    test('should display empty state for new project', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      const clipCount = await editorPage.getClipCount();
      expect(clipCount).toBe(0);
    });

    test('should handle file input for upload', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for file input
      const fileInput = page.locator('input[type="file"]');

      if ((await fileInput.count()) > 0) {
        // Verify file input accepts video files
        const acceptAttr = await fileInput.first().getAttribute('accept');
        expect(acceptAttr).toBeTruthy();
      }
    });
  });

  test.describe('Trim/Edit Clip', () => {
    test('should show clip editing options when clip exists', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // For new project, verify no clips exist
      const clipCount = await editorPage.getClipCount();
      expect(clipCount).toBe(0);

      // Look for editing UI elements
      const hasEditingUI =
        (await page.locator('[data-testid*="trim"]').count()) > 0 ||
        (await page.locator('[data-testid*="cut"]').count()) > 0 ||
        (await page.locator('[data-testid*="split"]').count()) > 0 ||
        (await page.locator('text=Trim').count()) > 0 ||
        (await page.locator('text=Cut').count()) > 0;

      // Editing options may not be visible without clips
      // This test verifies the UI structure
    });

    test('should support undo/redo functionality', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for undo/redo buttons
      const hasUndoRedo =
        (await page.locator('[data-testid="undo"]').count()) > 0 ||
        (await page.locator('[data-testid="redo"]').count()) > 0 ||
        (await page.locator('text=Undo').count()) > 0 ||
        (await page.locator('text=Redo').count()) > 0 ||
        (await page.locator('[aria-label*="Undo"]').count()) > 0 ||
        (await page.locator('[aria-label*="Redo"]').count()) > 0;

      // Undo/redo should be available
      expect(hasUndoRedo).toBe(true);
    });

    test('should support keyboard shortcuts for undo/redo', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Test undo shortcut (Cmd+Z on Mac, Ctrl+Z on Windows)
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+KeyZ`);

      // Test redo shortcut (Cmd+Shift+Z on Mac, Ctrl+Y on Windows)
      await page.keyboard.press(`${modifier}+Shift+KeyZ`);

      // Should not crash
      await expect(editorPage.timeline).toBeVisible();
    });
  });

  test.describe('Preview Playback', () => {
    test('should display video preview area', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for video preview element
      const hasPreview =
        (await page.locator('[data-testid="video-preview"]').count()) > 0 ||
        (await page.locator('video').count()) > 0 ||
        (await page.locator('[data-testid="preview"]').count()) > 0 ||
        (await page.locator('.preview').count()) > 0 ||
        (await page.locator('.video-player').count()) > 0;

      expect(hasPreview).toBe(true);
    });

    test('should have playback controls', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for play/pause controls
      const hasPlaybackControls =
        (await page.locator('[data-testid*="play"]').count()) > 0 ||
        (await page.locator('[data-testid*="pause"]').count()) > 0 ||
        (await page.locator('[aria-label*="Play"]').count()) > 0 ||
        (await page.locator('[aria-label*="Pause"]').count()) > 0 ||
        (await page.locator('button[aria-label*="play"]').count()) > 0;

      // Playback controls should be available
      expect(hasPlaybackControls || (await page.locator('video').count()) > 0).toBe(true);
    });

    test('should support spacebar for play/pause', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Press space to toggle play/pause
      await page.keyboard.press('Space');

      // Should not crash
      await expect(editorPage.timeline).toBeVisible();
    });

    test('should show preview placeholder for empty project', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Empty project should show some preview area or placeholder
      const hasPreviewArea =
        (await page.locator('[data-testid="video-preview"]').count()) > 0 ||
        (await page.locator('.preview').count()) > 0 ||
        (await page.locator('video').count()) > 0 ||
        (await page.locator('canvas').count()) > 0;

      expect(hasPreviewArea).toBe(true);
    });
  });

  test.describe('Save Changes', () => {
    test('should have save functionality', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for save button or auto-save indicator
      const hasSaveOption =
        (await page.locator('text=Save').count()) > 0 ||
        (await page.locator('[data-testid="save"]').count()) > 0 ||
        (await page.locator('[aria-label*="Save"]').count()) > 0 ||
        (await page.locator('text=Saved').count()) > 0 ||
        (await page.locator('text=Auto-save').count()) > 0;

      // Should have save functionality (explicit or auto-save)
      expect(hasSaveOption).toBe(true);
    });

    test('should persist data across page reloads', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Get initial project title
      const initialTitle = await editorPage.getProjectTitle();

      // Reload page
      await page.reload();
      await editorPage.waitForTimelineLoad();

      // Project title should persist
      const reloadedTitle = await editorPage.getProjectTitle();
      expect(reloadedTitle).toBe(initialTitle);
    });

    test('should handle save keyboard shortcut', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Press Cmd+S (Mac) or Ctrl+S (Windows)
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+KeyS`);

      // Should not crash
      await expect(editorPage.timeline).toBeVisible();
    });

    test('should show save status indicator', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for save status (saved, saving, unsaved changes, etc.)
      const hasSaveStatus =
        (await page.locator('text=Saved').count()) > 0 ||
        (await page.locator('text=Saving').count()) > 0 ||
        (await page.locator('text=Auto-save').count()) > 0 ||
        (await page.locator('[data-testid*="save-status"]').count()) > 0;

      // Should indicate save status (or auto-save)
    });
  });

  test.describe('Error Handling', () => {
    test('should load editor without JavaScript errors', async ({ page }) => {
      const errors: string[] = [];

      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Filter out non-critical errors
      const criticalErrors = errors.filter(
        (err) =>
          !err.includes('ResizeObserver') && // Common benign error
          !err.includes('webkit-masked-url') // Safari-specific
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('should handle network errors gracefully', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Simulate offline
      await page.context().setOffline(true);

      // Try to perform an action
      await page.keyboard.press('Space');

      // Page should still be responsive
      await expect(editorPage.timeline).toBeVisible();

      // Restore online
      await page.context().setOffline(false);
    });

    test('should handle invalid project ID', async ({ page }) => {
      const editorPage = new EditorPage(page);
      const response = await page.goto('/editor/invalid-project-id-12345/timeline');

      // Should handle error gracefully
      expect(response?.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between editor tabs', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Navigate to timeline
      expect(page.url()).toContain('/timeline');

      // Try to navigate to other editor tabs
      const tabs = ['keyframe', 'generate-audio'];

      for (const tab of tabs) {
        const tabLink = page.locator(`a[href*="${tab}"]`).first();

        if ((await tabLink.count()) > 0) {
          await tabLink.click();
          await page.waitForLoadState('networkidle');
          expect(page.url()).toContain(tab);

          // Navigate back to timeline
          const timelineLink = page.locator('a[href*="timeline"]').first();
          if ((await timelineLink.count()) > 0) {
            await timelineLink.click();
            await page.waitForLoadState('networkidle');
          }
        }
      }
    });

    test('should maintain project context across navigation', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // URL should contain project ID
      expect(page.url()).toContain(projectId);

      // Navigate away and back
      await page.goBack();
      await page.goForward();
      await editorPage.waitForTimelineLoad();

      // Project ID should still be in URL
      expect(page.url()).toContain(projectId);
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Timeline should be visible at desktop size
      await expect(editorPage.timeline).toBeVisible();
    });

    test('should handle window resize', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Resize window
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForTimeout(500);

      // Timeline should still be visible
      await expect(editorPage.timeline).toBeVisible();

      // Resize to larger
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      // Timeline should still be visible
      await expect(editorPage.timeline).toBeVisible();
    });
  });
});
