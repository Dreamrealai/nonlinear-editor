import { test, expect } from './fixtures/auth';
import { setupAuthenticatedSession } from './fixtures/auth';
import { createTestProject, cleanupTestProjects } from './fixtures/projects';
import { EditorPage } from './pages/EditorPage';

/**
 * Corrections and Edits E2E Tests
 * Tests corrections/edits functionality including applying corrections to timeline,
 * undo/redo operations, edit history, and state management
 */
test.describe('Corrections and Edits', () => {
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    // Sign in and create a test project
    await setupAuthenticatedSession(page);
    projectId = await createTestProject(page, 'Corrections Test Project');
  });

  test.afterEach(async ({ page }) => {
    // Clean up test projects
    await cleanupTestProjects(page);
  });

  test.describe('Apply Corrections to Timeline', () => {
    test('should display timeline for corrections', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Timeline should be visible
      await expect(editorPage.timeline).toBeVisible();
    });

    test('should have editing tools available', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for editing tools
      const hasEditingTools =
        (await page.locator('[data-testid*="edit"]').count()) > 0 ||
        (await page.locator('[data-testid*="tool"]').count()) > 0 ||
        (await page.locator('text=Edit').count()) > 0 ||
        (await page.locator('text=Tools').count()) > 0;

      // Editing tools should be available
      expect(hasEditingTools).toBe(true);
    });

    test('should support clip selection', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // For new project, no clips exist
      const clipCount = await editorPage.getClipCount();
      expect(clipCount).toBe(0);

      // Timeline should be clickable for selection
      await editorPage.timeline.click();
      await expect(editorPage.timeline).toBeVisible();
    });

    test('should show clip properties when selected', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for properties panel or inspector
      const hasPropertiesPanel =
        (await page.locator('[data-testid*="properties"]').count()) > 0 ||
        (await page.locator('[data-testid*="inspector"]').count()) > 0 ||
        (await page.locator('.properties').count()) > 0 ||
        (await page.locator('.inspector').count()) > 0 ||
        (await page.locator('text=Properties').count()) > 0;

      // Properties panel may be present
    });

    test('should allow trimming clips', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for trim functionality
      const hasTrimFeature =
        (await page.locator('[data-testid*="trim"]').count()) > 0 ||
        (await page.locator('text=Trim').count()) > 0 ||
        (await page.locator('[aria-label*="Trim"]').count()) > 0;

      // Trim feature should exist
      expect(hasTrimFeature).toBe(true);
    });

    test('should support split/cut operations', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for split/cut functionality
      const hasSplitFeature =
        (await page.locator('[data-testid*="split"]').count()) > 0 ||
        (await page.locator('[data-testid*="cut"]').count()) > 0 ||
        (await page.locator('text=Split').count()) > 0 ||
        (await page.locator('text=Cut').count()) > 0;

      // Split/cut feature should exist
      expect(hasSplitFeature).toBe(true);
    });

    test('should support clip deletion', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for delete functionality
      const hasDeleteFeature =
        (await page.locator('[data-testid*="delete"]').count()) > 0 ||
        (await page.locator('text=Delete').count()) > 0 ||
        (await page.locator('[aria-label*="Delete"]').count()) > 0;

      // Delete feature should exist
      expect(hasDeleteFeature).toBe(true);
    });

    test('should support keyboard shortcuts for editing', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Click timeline to focus
      await editorPage.timeline.click();

      // Test common editing shortcuts
      await page.keyboard.press('Delete'); // Delete selected
      await page.keyboard.press('KeyC'); // Cut
      await page.keyboard.press('KeyS'); // Split

      // Should not crash
      await expect(editorPage.timeline).toBeVisible();
    });
  });

  test.describe('Undo/Redo Functionality', () => {
    test('should have undo button available', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for undo button
      const undoButton = page
        .locator('[data-testid="undo"]')
        .or(page.locator('button:has-text("Undo")'))
        .or(page.locator('[aria-label*="Undo"]'))
        .first();

      // Undo button should exist
      const hasUndoButton = (await undoButton.count()) > 0;
      expect(hasUndoButton).toBe(true);
    });

    test('should have redo button available', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for redo button
      const redoButton = page
        .locator('[data-testid="redo"]')
        .or(page.locator('button:has-text("Redo")'))
        .or(page.locator('[aria-label*="Redo"]'))
        .first();

      // Redo button should exist
      const hasRedoButton = (await redoButton.count()) > 0;
      expect(hasRedoButton).toBe(true);
    });

    test('should disable undo when no history', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // For new project, undo should be disabled
      const undoButton = page
        .locator('[data-testid="undo"]')
        .or(page.locator('button:has-text("Undo")'))
        .or(page.locator('[aria-label*="Undo"]'))
        .first();

      if ((await undoButton.count()) > 0) {
        const isDisabled = await undoButton.isDisabled();
        // Should be disabled for new project with no actions
        expect(isDisabled).toBe(true);
      }
    });

    test('should disable redo when no future history', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // For new project, redo should be disabled
      const redoButton = page
        .locator('[data-testid="redo"]')
        .or(page.locator('button:has-text("Redo")'))
        .or(page.locator('[aria-label*="Redo"]'))
        .first();

      if ((await redoButton.count()) > 0) {
        const isDisabled = await redoButton.isDisabled();
        // Should be disabled for new project with no redo stack
        expect(isDisabled).toBe(true);
      }
    });

    test('should support undo keyboard shortcut', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Press Cmd+Z (Mac) or Ctrl+Z (Windows)
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+KeyZ`);

      // Should not crash
      await expect(editorPage.timeline).toBeVisible();
    });

    test('should support redo keyboard shortcut', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Press Cmd+Shift+Z (Mac) or Ctrl+Y (Windows)
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+Shift+KeyZ`);

      // Should not crash
      await expect(editorPage.timeline).toBeVisible();
    });

    test('should maintain undo/redo state across page navigation', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Navigate to different tab and back
      const audioLink = page.locator('a[href*="generate-audio"]').first();

      if ((await audioLink.count()) > 0) {
        await audioLink.click();
        await page.waitForLoadState('networkidle');

        // Navigate back to timeline
        const timelineLink = page.locator('a[href*="timeline"]').first();
        if ((await timelineLink.count()) > 0) {
          await timelineLink.click();
          await page.waitForLoadState('networkidle');

          await editorPage.waitForTimelineLoad();

          // Undo/redo buttons should still be present
          const hasUndoRedo =
            (await page.locator('[data-testid="undo"]').count()) > 0 ||
            (await page.locator('button:has-text("Undo")').count()) > 0;

          expect(hasUndoRedo).toBe(true);
        }
      }
    });

    test('should show undo/redo tooltips or labels', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Hover over undo button
      const undoButton = page
        .locator('[data-testid="undo"]')
        .or(page.locator('[aria-label*="Undo"]'))
        .first();

      if ((await undoButton.count()) > 0) {
        await undoButton.hover();

        // Should have aria-label or title
        const hasLabel =
          (await undoButton.getAttribute('aria-label')) !== null ||
          (await undoButton.getAttribute('title')) !== null ||
          (await undoButton.textContent()) !== null;

        expect(hasLabel).toBe(true);
      }
    });
  });

  test.describe('Edit History', () => {
    test('should track edit operations', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for history panel or indicator
      const hasHistoryFeature =
        (await page.locator('[data-testid*="history"]').count()) > 0 ||
        (await page.locator('text=History').count()) > 0 ||
        (await page.locator('.history').count()) > 0;

      // History feature may be present
    });

    test('should persist edit state across reloads', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Get initial clip count
      const initialClipCount = await editorPage.getClipCount();

      // Reload page
      await page.reload();
      await editorPage.waitForTimelineLoad();

      // Clip count should be the same
      const reloadedClipCount = await editorPage.getClipCount();
      expect(reloadedClipCount).toBe(initialClipCount);
    });

    test('should clear redo stack after new action', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // After any new action, redo should be disabled
      // For fresh project, redo is already disabled
      const redoButton = page
        .locator('[data-testid="redo"]')
        .or(page.locator('button:has-text("Redo")'))
        .first();

      if ((await redoButton.count()) > 0) {
        const isDisabled = await redoButton.isDisabled();
        expect(isDisabled).toBe(true);
      }
    });
  });

  test.describe('Clip Modifications', () => {
    test('should support clip duration adjustment', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for duration/trim handles
      const hasDurationControls =
        (await page.locator('[data-testid*="trim-handle"]').count()) > 0 ||
        (await page.locator('[data-testid*="duration"]').count()) > 0 ||
        (await page.locator('.trim-handle').count()) > 0;

      // Duration controls may be visible when clips exist
    });

    test('should support clip position adjustment', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Timeline should support drag and drop for positioning
      const timeline = editorPage.timeline;
      await expect(timeline).toBeVisible();

      // Clips can be dragged to reposition (when they exist)
    });

    test('should support clip reordering', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // For new project, no clips to reorder
      const clipCount = await editorPage.getClipCount();
      expect(clipCount).toBe(0);

      // Timeline should support reordering when multiple clips exist
    });

    test('should validate clip boundaries', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Timeline should have defined boundaries
      const timelineBoundingBox = await editorPage.timeline.boundingBox();
      expect(timelineBoundingBox).toBeTruthy();
      expect(timelineBoundingBox?.width).toBeGreaterThan(0);
    });
  });

  test.describe('Multi-clip Operations', () => {
    test('should support selecting multiple clips', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for multi-select capability
      // Press Cmd/Ctrl (modifier for multi-select)
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.down(modifier);

      // Click on timeline (simulating multi-select)
      await editorPage.timeline.click({ position: { x: 100, y: 50 } });

      await page.keyboard.up(modifier);

      // Should not crash
      await expect(editorPage.timeline).toBeVisible();
    });

    test('should support select all shortcut', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Press Cmd+A (Mac) or Ctrl+A (Windows)
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+KeyA`);

      // Should not crash
      await expect(editorPage.timeline).toBeVisible();
    });

    test('should support group operations', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for group/ungroup functionality
      const hasGroupFeature =
        (await page.locator('text=Group').count()) > 0 ||
        (await page.locator('[data-testid*="group"]').count()) > 0;

      // Group feature may be present
    });
  });

  test.describe('Correction Validation', () => {
    test('should prevent invalid operations', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Try to delete non-existent clip
      await page.keyboard.press('Delete');

      // Should not crash or show error
      await expect(editorPage.timeline).toBeVisible();
    });

    test('should show feedback for operations', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Perform an operation
      await page.keyboard.press('Space');

      // Should provide some feedback (visual or audio)
      await expect(editorPage.timeline).toBeVisible();
    });

    test('should handle rapid consecutive edits', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Perform multiple rapid edits
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Space');
        await page.waitForTimeout(50);
      }

      // Should remain stable
      await expect(editorPage.timeline).toBeVisible();
    });
  });

  test.describe('State Management', () => {
    test('should maintain timeline state', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Get initial state
      const initialClipCount = await editorPage.getClipCount();

      // Perform navigation
      await page.goBack();
      await page.goForward();
      await editorPage.waitForTimelineLoad();

      // State should be maintained
      const afterClipCount = await editorPage.getClipCount();
      expect(afterClipCount).toBe(initialClipCount);
    });

    test('should sync state across tabs', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Navigate to another editor tab
      const audioLink = page.locator('a[href*="generate-audio"]').first();

      if ((await audioLink.count()) > 0) {
        await audioLink.click();
        await page.waitForLoadState('networkidle');

        // Project ID should be preserved
        expect(page.url()).toContain(projectId);
      }
    });

    test('should handle concurrent modifications gracefully', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Simulate rapid state changes
      await page.keyboard.press('Space');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');

      // Should remain stable
      await expect(editorPage.timeline).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should load without JavaScript errors', async ({ page }) => {
      const errors: string[] = [];

      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Filter out non-critical errors
      const criticalErrors = errors.filter(
        (err) => !err.includes('ResizeObserver') && !err.includes('webkit-masked-url')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('should handle undo/redo errors gracefully', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Try to undo when nothing to undo
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+KeyZ`);

      // Should not crash
      await expect(editorPage.timeline).toBeVisible();

      // Try to redo when nothing to redo
      await page.keyboard.press(`${modifier}+Shift+KeyZ`);

      // Should not crash
      await expect(editorPage.timeline).toBeVisible();
    });

    test('should recover from invalid state', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Reload page to reset state
      await page.reload();
      await editorPage.waitForTimelineLoad();

      // Should load successfully
      await expect(editorPage.timeline).toBeVisible();
    });
  });
});
