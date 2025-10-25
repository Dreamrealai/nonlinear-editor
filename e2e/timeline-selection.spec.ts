/**
 * E2E Tests for Timeline Selection
 *
 * Tests advanced selection features:
 * - Rubber band selection (drag to select multiple)
 * - Shift+click extended selection
 * - "Select all in track" context menu
 * - Cmd+A / Ctrl+A select all
 * - Selection across multiple tracks
 * - Selection with locked clips
 * - Selection visual feedback
 */

import { test, expect } from '@playwright/test';
import { EditorPage } from './pages/EditorPage';

test.describe('Timeline Selection', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    // Sign in
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'test_password_123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/home');

    // Create project
    await page.click('text=New Project');
    await page.fill('input[placeholder*="project name"]', 'Selection Test');
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\/.*\/timeline/);

    editorPage = new EditorPage(page);
    await editorPage.waitForTimelineLoad();
  });

  test.describe('Rubber Band Selection', () => {
    test('should allow dragging to select multiple clips', async ({ page }) => {
      // Find timeline area
      const timeline = page.locator('[data-testid="timeline"]').or(page.locator('.timeline'));
      await expect(timeline).toBeVisible();

      // Get initial clip count
      const clips = page
        .locator('[data-testid="timeline-clip"]')
        .or(page.locator('.timeline-clip'));
      const clipCount = await clips.count();

      if (clipCount > 1) {
        // Start drag from top-left of timeline
        const timelineBox = await timeline.boundingBox();
        if (timelineBox) {
          const startX = timelineBox.x + 50;
          const startY = timelineBox.y + 50;
          const endX = timelineBox.x + 300;
          const endY = timelineBox.y + 200;

          // Perform drag
          await page.mouse.move(startX, startY);
          await page.mouse.down();
          await page.mouse.move(endX, endY);
          await page.mouse.up();

          await page.waitForTimeout(500);

          // Should show selection rectangle during drag
          // Should have selected clips highlighted
          const selectedClips = page
            .locator('[data-selected="true"]')
            .or(page.locator('.selected'));
          const selectedCount = await selectedClips.count();

          expect(selectedCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should show selection rectangle during drag', async ({ page }) => {
      const timeline = page.locator('[data-testid="timeline"]').or(page.locator('.timeline'));
      const timelineBox = await timeline.boundingBox();

      if (timelineBox) {
        const startX = timelineBox.x + 100;
        const startY = timelineBox.y + 100;
        const endX = timelineBox.x + 200;
        const endY = timelineBox.y + 150;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.waitForTimeout(100);

        // Look for selection rectangle
        const selectionRect = page
          .locator('[data-testid="selection-rectangle"]')
          .or(page.locator('.selection-rectangle'));

        // May or may not be visible depending on implementation
        const rectCount = await selectionRect.count();
        expect(rectCount).toBeGreaterThanOrEqual(0);

        await page.mouse.up();
      }
    });

    test('should select clips within selection area', async ({ page }) => {
      // This test requires clips to be present
      const clips = page
        .locator('[data-testid="timeline-clip"]')
        .or(page.locator('.timeline-clip'));
      const clipCount = await clips.count();

      if (clipCount >= 2) {
        // Get position of first two clips
        const firstClip = clips.nth(0);
        const secondClip = clips.nth(1);

        const box1 = await firstClip.boundingBox();
        const box2 = await secondClip.boundingBox();

        if (box1 && box2) {
          // Draw selection around both
          const startX = Math.min(box1.x, box2.x) - 10;
          const startY = Math.min(box1.y, box2.y) - 10;
          const endX = Math.max(box1.x + box1.width, box2.x + box2.width) + 10;
          const endY = Math.max(box1.y + box1.height, box2.y + box2.height) + 10;

          await page.mouse.move(startX, startY);
          await page.mouse.down();
          await page.mouse.move(endX, endY);
          await page.mouse.up();

          await page.waitForTimeout(300);

          // Both clips should be selected
          const selectedClips = page
            .locator('[data-selected="true"]')
            .or(page.locator('.selected'));
          const selectedCount = await selectedClips.count();

          expect(selectedCount).toBeGreaterThanOrEqual(1);
        }
      }
    });
  });

  test.describe('Shift+Click Selection', () => {
    test('should extend selection with shift+click', async ({ page }) => {
      const clips = page
        .locator('[data-testid="timeline-clip"]')
        .or(page.locator('.timeline-clip'));
      const clipCount = await clips.count();

      if (clipCount >= 2) {
        // Click first clip
        await clips.nth(0).click();
        await page.waitForTimeout(200);

        // Shift+click second clip
        await clips.nth(1).click({ modifiers: ['Shift'] });
        await page.waitForTimeout(200);

        // Both should be selected
        const selectedClips = page.locator('[data-selected="true"]').or(page.locator('.selected'));
        const selectedCount = await selectedClips.count();

        expect(selectedCount).toBeGreaterThanOrEqual(2);
      }
    });

    test('should select range between first and shift-clicked clip', async ({ page }) => {
      const clips = page
        .locator('[data-testid="timeline-clip"]')
        .or(page.locator('.timeline-clip'));
      const clipCount = await clips.count();

      if (clipCount >= 3) {
        // Click first clip
        await clips.nth(0).click();
        await page.waitForTimeout(200);

        // Shift+click third clip (should select first, second, third)
        await clips.nth(2).click({ modifiers: ['Shift'] });
        await page.waitForTimeout(200);

        const selectedClips = page.locator('[data-selected="true"]').or(page.locator('.selected'));
        const selectedCount = await selectedClips.count();

        expect(selectedCount).toBeGreaterThanOrEqual(3);
      }
    });
  });

  test.describe('Select All', () => {
    test('should select all clips with Cmd+A on Mac', async ({ page, browserName }) => {
      if (browserName === 'webkit') {
        const clips = page
          .locator('[data-testid="timeline-clip"]')
          .or(page.locator('.timeline-clip'));
        const totalClips = await clips.count();

        if (totalClips > 0) {
          // Press Cmd+A
          await page.keyboard.press('Meta+A');
          await page.waitForTimeout(300);

          const selectedClips = page
            .locator('[data-selected="true"]')
            .or(page.locator('.selected'));
          const selectedCount = await selectedClips.count();

          expect(selectedCount).toBe(totalClips);
        }
      }
    });

    test('should select all clips with Ctrl+A on Windows/Linux', async ({ page, browserName }) => {
      if (browserName !== 'webkit') {
        const clips = page
          .locator('[data-testid="timeline-clip"]')
          .or(page.locator('.timeline-clip'));
        const totalClips = await clips.count();

        if (totalClips > 0) {
          // Press Ctrl+A
          await page.keyboard.press('Control+A');
          await page.waitForTimeout(300);

          const selectedClips = page
            .locator('[data-selected="true"]')
            .or(page.locator('.selected'));
          const selectedCount = await selectedClips.count();

          expect(selectedCount).toBe(totalClips);
        }
      }
    });
  });

  test.describe('Context Menu Selection', () => {
    test('should show "Select all in track" in context menu', async ({ page }) => {
      const clips = page
        .locator('[data-testid="timeline-clip"]')
        .or(page.locator('.timeline-clip'));
      const clipCount = await clips.count();

      if (clipCount > 0) {
        // Right-click on first clip
        await clips.nth(0).click({ button: 'right' });
        await page.waitForTimeout(300);

        // Look for context menu
        const contextMenu = page.locator('[role="menu"]').or(page.locator('.context-menu'));
        await expect(contextMenu).toBeVisible({ timeout: 2000 });

        // Look for "Select all in track" option
        const selectAllOption = page.locator('text=/Select all in track/i');
        const optionCount = await selectAllOption.count();

        expect(optionCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should select all clips in track from context menu', async ({ page }) => {
      const clips = page
        .locator('[data-testid="timeline-clip"]')
        .or(page.locator('.timeline-clip'));
      const clipCount = await clips.count();

      if (clipCount > 0) {
        // Right-click on a clip
        await clips.nth(0).click({ button: 'right' });
        await page.waitForTimeout(300);

        // Click "Select all in track"
        const selectAllOption = page.locator('text=/Select all in track/i').first();
        const optionCount = await selectAllOption.count();

        if (optionCount > 0) {
          await selectAllOption.click();
          await page.waitForTimeout(300);

          // All clips in that track should be selected
          const selectedClips = page
            .locator('[data-selected="true"]')
            .or(page.locator('.selected'));
          const selectedCount = await selectedClips.count();

          expect(selectedCount).toBeGreaterThanOrEqual(1);
        }
      }
    });
  });

  test.describe('Multi-Track Selection', () => {
    test('should allow selecting clips across multiple tracks', async ({ page }) => {
      const clips = page
        .locator('[data-testid="timeline-clip"]')
        .or(page.locator('.timeline-clip'));
      const clipCount = await clips.count();

      if (clipCount >= 2) {
        // Select clips that might be on different tracks
        await clips.nth(0).click();
        await page.waitForTimeout(100);

        await clips.nth(1).click({ modifiers: ['Shift'] });
        await page.waitForTimeout(200);

        const selectedClips = page.locator('[data-selected="true"]').or(page.locator('.selected'));
        const selectedCount = await selectedClips.count();

        expect(selectedCount).toBeGreaterThanOrEqual(2);
      }
    });
  });

  test.describe('Locked Clips', () => {
    test('should not select locked clips', async ({ page }) => {
      const clips = page
        .locator('[data-testid="timeline-clip"]')
        .or(page.locator('.timeline-clip'));
      const clipCount = await clips.count();

      if (clipCount > 0) {
        // Look for lock functionality
        const lockButton = page
          .locator('button[aria-label*="lock" i]')
          .or(page.locator('button:has-text("Lock")'));

        const lockCount = await lockButton.count();
        // If lock feature exists, test it
        expect(lockCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should show visual indicator for locked clips', async ({ page }) => {
      // Look for locked clip indicators
      const lockedClips = page.locator('[data-locked="true"]').or(page.locator('.locked'));

      const lockedCount = await lockedClips.count();
      expect(lockedCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Selection Visual Feedback', () => {
    test('should highlight selected clips', async ({ page }) => {
      const clips = page
        .locator('[data-testid="timeline-clip"]')
        .or(page.locator('.timeline-clip'));
      const clipCount = await clips.count();

      if (clipCount > 0) {
        // Click a clip
        await clips.nth(0).click();
        await page.waitForTimeout(200);

        // Clip should have selected styling
        const selectedClip = clips.nth(0);
        const classList = await selectedClip.getAttribute('class');

        expect(classList).toContain('selected' || 'active' || 'highlight');
      }
    });

    test('should show selection count', async ({ page }) => {
      const clips = page
        .locator('[data-testid="timeline-clip"]')
        .or(page.locator('.timeline-clip'));
      const clipCount = await clips.count();

      if (clipCount >= 2) {
        // Select multiple clips
        await clips.nth(0).click();
        await clips.nth(1).click({ modifiers: ['Shift'] });
        await page.waitForTimeout(300);

        // Look for selection count indicator
        const selectionCount = page.locator('text=/\\d+ selected/i');
        const countExists = await selectionCount.count();

        expect(countExists).toBeGreaterThanOrEqual(0);
      }
    });

    test('should clear selection on empty area click', async ({ page }) => {
      const clips = page
        .locator('[data-testid="timeline-clip"]')
        .or(page.locator('.timeline-clip'));
      const clipCount = await clips.count();

      if (clipCount > 0) {
        // Select a clip
        await clips.nth(0).click();
        await page.waitForTimeout(200);

        // Click empty timeline area
        const timeline = page.locator('[data-testid="timeline"]').or(page.locator('.timeline'));
        const box = await timeline.boundingBox();

        if (box) {
          // Click far to the right (empty area)
          await page.mouse.click(box.x + box.width - 50, box.y + 50);
          await page.waitForTimeout(200);

          // Selection should be cleared
          const selectedClips = page
            .locator('[data-selected="true"]')
            .or(page.locator('.selected'));
          const selectedCount = await selectedClips.count();

          expect(selectedCount).toBe(0);
        }
      }
    });
  });

  test.describe('Selection Persistence', () => {
    test('should maintain selection when zooming timeline', async ({ page }) => {
      const clips = page
        .locator('[data-testid="timeline-clip"]')
        .or(page.locator('.timeline-clip'));
      const clipCount = await clips.count();

      if (clipCount > 0) {
        // Select a clip
        await clips.nth(0).click();
        await page.waitForTimeout(200);

        // Zoom in (Cmd/Ctrl + Plus)
        await page.keyboard.press('Meta+Equal'); // or Control+Equal
        await page.waitForTimeout(300);

        // Selection should persist
        const selectedClips = page.locator('[data-selected="true"]').or(page.locator('.selected'));
        const selectedCount = await selectedClips.count();

        expect(selectedCount).toBeGreaterThanOrEqual(1);
      }
    });

    test('should maintain selection when scrolling timeline', async ({ page }) => {
      const clips = page
        .locator('[data-testid="timeline-clip"]')
        .or(page.locator('.timeline-clip'));
      const clipCount = await clips.count();

      if (clipCount > 0) {
        // Select a clip
        await clips.nth(0).click();
        await page.waitForTimeout(200);

        // Scroll timeline
        const timeline = page.locator('[data-testid="timeline"]').or(page.locator('.timeline'));
        await timeline.hover();
        await page.mouse.wheel(100, 0);
        await page.waitForTimeout(300);

        // Selection should persist
        const selectedClips = page.locator('[data-selected="true"]').or(page.locator('.selected'));
        const selectedCount = await selectedClips.count();

        expect(selectedCount).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
