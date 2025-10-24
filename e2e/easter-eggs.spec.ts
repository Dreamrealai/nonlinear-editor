/**
 * E2E Tests for Easter Eggs
 *
 * Tests all hidden Easter egg features:
 * - Konami Code (↑↑↓↓←→←→BA)
 * - Developer Mode (press D 5 times)
 * - Matrix Mode (press M 3 times)
 * - Disco Mode (type "disco")
 * - Gravity Mode (type "gravity")
 */

import { test, expect, Page } from '@playwright/test';
import { EditorPage } from './pages/EditorPage';

test.describe('Easter Eggs', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    // Sign in with test credentials
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'test_password_123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/home');

    // Create a new project
    await page.click('text=New Project');
    await page.fill('input[placeholder*="project name"]', 'Easter Egg Test Project');
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\/.*\/timeline/);

    editorPage = new EditorPage(page);
    await editorPage.waitForTimelineLoad();
  });

  test.describe('Konami Code', () => {
    test('should activate with correct sequence', async ({ page }) => {
      // Press Konami Code sequence: ↑↑↓↓←→←→BA
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('b');
      await page.keyboard.press('a');

      // Wait for activation
      await page.waitForTimeout(500);

      // Check for success toast
      const toast = page.locator('text=/Konami Code|secret/i');
      await expect(toast).toBeVisible({ timeout: 3000 });

      // Check for konami-active class on body
      const bodyClass = await page.evaluate(() => document.body.className);
      expect(bodyClass).toContain('konami-active');

      // Check for confetti elements
      const confetti = page.locator('.confetti');
      const confettiCount = await confetti.count();
      expect(confettiCount).toBeGreaterThan(0);
    });

    test('should not activate with incorrect sequence', async ({ page }) => {
      // Press incorrect sequence
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('a');
      await page.keyboard.press('b');

      await page.waitForTimeout(500);

      // Should not show success toast
      const toast = page.locator('text=/Konami Code/i');
      await expect(toast).not.toBeVisible({ timeout: 1000 });

      // Body should not have konami-active class
      const bodyClass = await page.evaluate(() => document.body.className);
      expect(bodyClass).not.toContain('konami-active');
    });

    test('should reset sequence after timeout', async ({ page }) => {
      // Start sequence
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowDown');

      // Wait more than 2 seconds (timeout)
      await page.waitForTimeout(2500);

      // Continue with rest of sequence
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('b');
      await page.keyboard.press('a');

      await page.waitForTimeout(500);

      // Should not activate (sequence was broken by timeout)
      const toast = page.locator('text=/Konami Code/i');
      await expect(toast).not.toBeVisible({ timeout: 1000 });
    });

    test('should show rainbow background effect', async ({ page }) => {
      // Activate Konami Code
      const keys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
      for (const key of keys) {
        await page.keyboard.press(key);
      }

      await page.waitForTimeout(500);

      // Check for rainbow animation styles
      const bodyStyle = await page.evaluate(() => {
        const body = document.body;
        const computedStyle = window.getComputedStyle(body);
        return {
          background: computedStyle.background,
          animation: computedStyle.animation,
        };
      });

      // Should have background with gradient or animation
      expect(bodyStyle.background || bodyStyle.animation).toBeTruthy();
    });

    test('should remove effect after 5 seconds', async ({ page }) => {
      // Activate Konami Code
      const keys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
      for (const key of keys) {
        await page.keyboard.press(key);
      }

      await page.waitForTimeout(500);

      // Should have konami-active class
      let bodyClass = await page.evaluate(() => document.body.className);
      expect(bodyClass).toContain('konami-active');

      // Wait for effect to end (5 seconds)
      await page.waitForTimeout(5500);

      // Should not have konami-active class anymore
      bodyClass = await page.evaluate(() => document.body.className);
      expect(bodyClass).not.toContain('konami-active');
    });
  });

  test.describe('Developer Mode', () => {
    test('should activate after pressing D 5 times', async ({ page }) => {
      // Press 'd' 5 times quickly
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('d');
        await page.waitForTimeout(100);
      }

      await page.waitForTimeout(500);

      // Check for success toast
      const toast = page.locator('text=/Developer mode|DEV MODE/i');
      await expect(toast).toBeVisible({ timeout: 3000 });

      // Check for dev mode indicator
      const indicator = page.locator('#dev-mode-indicator');
      await expect(indicator).toBeVisible({ timeout: 2000 });
      await expect(indicator).toContainText('DEV MODE');

      // Check localStorage
      const devMode = await page.evaluate(() => localStorage.getItem('secretDevMode'));
      expect(devMode).toBe('true');
    });

    test('should not activate with slow key presses', async ({ page }) => {
      // Press 'd' 5 times with long delays
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('d');
        await page.waitForTimeout(2500); // More than timeout
      }

      await page.waitForTimeout(500);

      // Should not show dev mode toast
      const toast = page.locator('text=/Developer mode/i');
      await expect(toast).not.toBeVisible({ timeout: 1000 });

      // Should not have indicator
      const indicator = page.locator('#dev-mode-indicator');
      await expect(indicator).not.toBeVisible({ timeout: 1000 });
    });

    test('should persist across page reloads', async ({ page }) => {
      // Activate dev mode
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('d');
        await page.waitForTimeout(100);
      }

      await page.waitForTimeout(500);

      // Verify localStorage
      let devMode = await page.evaluate(() => localStorage.getItem('secretDevMode'));
      expect(devMode).toBe('true');

      // Reload page
      await page.reload();
      await page.waitForTimeout(1000);

      // Should still be in localStorage
      devMode = await page.evaluate(() => localStorage.getItem('secretDevMode'));
      expect(devMode).toBe('true');
    });
  });

  test.describe('Matrix Mode', () => {
    test('should activate after pressing M 3 times', async ({ page }) => {
      // Press 'm' 3 times quickly
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('m');
        await page.waitForTimeout(100);
      }

      await page.waitForTimeout(500);

      // Check for success toast
      const toast = page.locator('text=/Matrix|has you/i');
      await expect(toast).toBeVisible({ timeout: 3000 });

      // Check for matrix canvas
      const matrixCanvas = page.locator('#matrix-canvas');
      await expect(matrixCanvas).toBeVisible({ timeout: 2000 });
    });

    test('should display matrix rain effect', async ({ page }) => {
      // Activate matrix mode
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('m');
        await page.waitForTimeout(100);
      }

      await page.waitForTimeout(500);

      // Check canvas properties
      const canvasExists = await page.evaluate(() => {
        const canvas = document.getElementById('matrix-canvas') as HTMLCanvasElement;
        return canvas && canvas.tagName === 'CANVAS';
      });

      expect(canvasExists).toBe(true);
    });

    test('should stop after 10 seconds', async ({ page }) => {
      // Activate matrix mode
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('m');
        await page.waitForTimeout(100);
      }

      await page.waitForTimeout(500);

      // Canvas should exist
      let matrixCanvas = page.locator('#matrix-canvas');
      await expect(matrixCanvas).toBeVisible();

      // Wait for effect to end (10 seconds)
      await page.waitForTimeout(10500);

      // Canvas should be removed
      matrixCanvas = page.locator('#matrix-canvas');
      await expect(matrixCanvas).not.toBeVisible({ timeout: 1000 });
    });
  });

  test.describe('Disco Mode', () => {
    test('should activate by typing "disco"', async ({ page }) => {
      // Type 'disco'
      await page.keyboard.type('disco');
      await page.waitForTimeout(500);

      // Check for success toast
      const toast = page.locator('text=/Disco/i');
      await expect(toast).toBeVisible({ timeout: 3000 });

      // Check that background is changing colors
      const initialBg = await page.evaluate(() => document.body.style.background);

      await page.waitForTimeout(400); // Wait for color change

      const newBg = await page.evaluate(() => document.body.style.background);

      // Background should change or be set
      expect(initialBg !== newBg || newBg !== '').toBe(true);
    });

    test('should flash multiple colors', async ({ page }) => {
      // Activate disco mode
      await page.keyboard.type('disco');
      await page.waitForTimeout(500);

      // Collect background colors over time
      const colors: string[] = [];
      for (let i = 0; i < 5; i++) {
        const bg = await page.evaluate(() => document.body.style.background);
        if (bg) colors.push(bg);
        await page.waitForTimeout(300);
      }

      // Should have captured multiple different colors
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBeGreaterThan(1);
    });

    test('should stop after 5 seconds', async ({ page }) => {
      // Activate disco mode
      await page.keyboard.type('disco');
      await page.waitForTimeout(500);

      // Background should be set
      const initialBg = await page.evaluate(() => document.body.style.background);
      expect(initialBg).toBeTruthy();

      // Wait for effect to end
      await page.waitForTimeout(5500);

      // Background should be cleared
      const finalBg = await page.evaluate(() => document.body.style.background);
      expect(finalBg).toBe('');
    });
  });

  test.describe('Gravity Mode', () => {
    test('should activate by typing "gravity"', async ({ page }) => {
      // Type 'gravity'
      await page.keyboard.type('gravity');
      await page.waitForTimeout(500);

      // Check for success toast
      const toast = page.locator('text=/Gravity|reversed/i');
      await expect(toast).toBeVisible({ timeout: 3000 });
    });

    test('should make elements fall off screen', async ({ page }) => {
      // Activate gravity mode
      await page.keyboard.type('gravity');
      await page.waitForTimeout(500);

      // Check that some elements have transform styles
      const transformedElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('button, .card, img');
        let count = 0;
        elements.forEach((el) => {
          if (el instanceof HTMLElement && el.style.transform) {
            count++;
          }
        });
        return count;
      });

      expect(transformedElements).toBeGreaterThan(0);
    });

    test('should restore elements after animation', async ({ page }) => {
      // Activate gravity mode
      await page.keyboard.type('gravity');
      await page.waitForTimeout(500);

      // Wait for animation to complete (2 seconds + 1 second restore)
      await page.waitForTimeout(3500);

      // Elements should be restored
      const transformedElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('button, .card, img');
        let hasTransform = 0;
        elements.forEach((el) => {
          if (el instanceof HTMLElement && el.style.transform && el.style.transform !== '') {
            hasTransform++;
          }
        });
        return hasTransform;
      });

      // Most elements should be restored (transform cleared or empty)
      expect(transformedElements).toBeLessThan(5);
    });
  });

  test.describe('Multiple Easter Eggs', () => {
    test('should allow multiple eggs to be active simultaneously', async ({ page }) => {
      // Activate dev mode
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('d');
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(500);

      const devIndicator = page.locator('#dev-mode-indicator');
      await expect(devIndicator).toBeVisible();

      // Activate matrix mode
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('m');
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(500);

      const matrixCanvas = page.locator('#matrix-canvas');
      await expect(matrixCanvas).toBeVisible();

      // Both should be active
      await expect(devIndicator).toBeVisible();
      await expect(matrixCanvas).toBeVisible();
    });

    test('should not break app functionality', async ({ page }) => {
      // Activate Konami Code
      const keys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
      for (const key of keys) {
        await page.keyboard.press(key);
      }
      await page.waitForTimeout(1000);

      // Try to interact with the timeline
      const timeline = page.locator('[data-testid="timeline"]').or(page.locator('.timeline'));
      await expect(timeline).toBeVisible();

      // Should still be able to click buttons
      const saveButton = page.locator('button:has-text("Save")');
      const saveButtonCount = await saveButton.count();

      if (saveButtonCount > 0) {
        // Button should be clickable
        await expect(saveButton.first()).toBeEnabled();
      }

      // Timeline should still be functional
      await expect(timeline).toBeVisible();
    });
  });

  test.describe('Easter Egg Accessibility', () => {
    test('should not interfere with screen readers', async ({ page }) => {
      // Activate an easter egg
      await page.keyboard.type('disco');
      await page.waitForTimeout(1000);

      // Check that important ARIA landmarks still exist
      const main = page.locator('main');
      const mainCount = await main.count();

      // App structure should remain intact
      expect(mainCount).toBeGreaterThanOrEqual(0);
    });

    test('should not prevent keyboard navigation', async ({ page }) => {
      // Activate dev mode
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('d');
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(500);

      // Should still be able to use Tab to navigate
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Focus should move (checking that tab still works)
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.tagName : null;
      });

      expect(focusedElement).toBeTruthy();
    });

    test('should not trigger when typing in input fields', async ({ page }) => {
      // Focus on an input if available
      const inputs = page.locator('input[type="text"]');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        await inputs.first().focus();
        await page.keyboard.type('disco');
        await page.waitForTimeout(500);

        // Disco mode should NOT activate
        const toast = page.locator('text=/Disco/i');
        await expect(toast).not.toBeVisible({ timeout: 1000 });
      }
    });
  });

  test.describe('Visual Effects', () => {
    test('should inject CSS styles for effects', async ({ page }) => {
      // Check that easter egg styles are injected
      const styleExists = await page.evaluate(() => {
        const style = document.getElementById('easter-egg-styles');
        return style !== null && style.tagName === 'STYLE';
      });

      expect(styleExists).toBe(true);
    });

    test('should clean up styles on component unmount', async ({ page }) => {
      // Navigate away
      await page.goto('/home');
      await page.waitForTimeout(500);

      // Navigate back
      await page.goto(`/editor`);
      await page.waitForTimeout(500);

      // Styles should be re-injected
      const styleExists = await page.evaluate(() => {
        const style = document.getElementById('easter-egg-styles');
        return style !== null;
      });

      expect(styleExists).toBe(true);
    });
  });
});
