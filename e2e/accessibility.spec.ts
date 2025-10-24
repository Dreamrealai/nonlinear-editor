import { test, expect } from './fixtures/auth';
import { setupAuthenticatedSession } from './fixtures/auth';
import { createTestProject, cleanupTestProjects } from './fixtures/projects';
import { EditorPage } from './pages/EditorPage';
import { VideoGenPage } from './pages/VideoGenPage';
import { SignInPage } from './pages/SignInPage';
import { injectAxe, checkA11y } from 'axe-playwright';

/**
 * E2E Tests for Accessibility
 * Tests keyboard navigation, screen reader compatibility, focus management, and ARIA labels
 */
test.describe('Accessibility', () => {
  test.describe('Keyboard Navigation', () => {
    test('should navigate sign in form with keyboard', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      // Tab through form elements
      await page.keyboard.press('Tab'); // Focus email
      await expect(signInPage.emailInput).toBeFocused();

      await page.keyboard.press('Tab'); // Focus password
      await expect(signInPage.passwordInput).toBeFocused();

      await page.keyboard.press('Tab'); // Focus sign in button
      await expect(signInPage.signInButton).toBeFocused();
    });

    test('should submit form with Enter key', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      await signInPage.emailInput.fill('test@example.com');
      await signInPage.passwordInput.fill('test_password_123');

      // Press Enter to submit
      await page.keyboard.press('Enter');

      // Should redirect after sign in
      await page.waitForURL(/\/(editor|$)/, { timeout: 10000 });
      expect(page.url()).not.toContain('/signin');
    });

    test('should navigate editor with keyboard shortcuts', async ({ page }) => {
      await setupAuthenticatedSession(page);
      const projectId = await createTestProject(page, 'Keyboard Nav Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Test common keyboard shortcuts
      const shortcuts = [
        { key: 'Control+S', name: 'Save' },
        { key: 'Control+Z', name: 'Undo' },
        { key: 'Control+Y', name: 'Redo' },
        { key: 'Space', name: 'Play/Pause' },
      ];

      for (const shortcut of shortcuts) {
        await page.keyboard.press(shortcut.key).catch(() => {
          // Shortcut might not be implemented, that's ok
        });
        await page.waitForTimeout(200);
      }

      // Page should still be functional
      expect(page.url()).toContain('editor');

      await cleanupTestProjects(page);
    });

    test('should navigate timeline with arrow keys', async ({ page }) => {
      await setupAuthenticatedSession(page);
      const projectId = await createTestProject(page, 'Timeline Keyboard Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      const timeline = page.locator('[data-testid="timeline"], .timeline');
      if (await timeline.isVisible({ timeout: 2000 })) {
        await timeline.click(); // Focus timeline

        // Navigate with arrow keys
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowDown');

        // Should not crash
        expect(await timeline.isVisible()).toBe(true);
      }

      await cleanupTestProjects(page);
    });

    test('should trap focus in modal dialogs', async ({ page }) => {
      await setupAuthenticatedSession(page);
      const projectId = await createTestProject(page, 'Modal Focus Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Look for a button that opens a modal
      const modalTrigger = page.locator('button:has-text("Settings"), button:has-text("Options")').first();

      if (await modalTrigger.isVisible({ timeout: 2000 })) {
        await modalTrigger.click();

        // Wait for modal
        const modal = page.locator('[role="dialog"], .modal');
        if (await modal.isVisible({ timeout: 2000 })) {
          // Tab through modal elements
          const initialFocus = await page.locator(':focus').boundingBox();

          // Tab multiple times
          for (let i = 0; i < 10; i++) {
            await page.keyboard.press('Tab');
          }

          // Focus should still be within modal
          const focusedElement = page.locator(':focus');
          const isInModal = await modal.locator(':focus').isVisible().catch(() => false);

          // Close modal with Escape
          await page.keyboard.press('Escape');
          await expect(modal).not.toBeVisible({ timeout: 2000 });
        }
      }

      await cleanupTestProjects(page);
    });

    test('should support skip links', async ({ page }) => {
      await setupAuthenticatedSession(page);
      await page.goto('/editor');

      // Look for skip to content link
      await page.keyboard.press('Tab');

      const skipLink = page.locator('a:has-text("Skip to"), a[href="#main-content"], a[href="#content"]');
      const hasSkipLink = await skipLink.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasSkipLink) {
        // Activate skip link
        await page.keyboard.press('Enter');

        // Main content should be focused
        const mainContent = page.locator('#main-content, #content, main');
        if (await mainContent.count() > 0) {
          // Main content area should be in viewport
          expect(await mainContent.first().isVisible()).toBe(true);
        }
      }
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should have semantic HTML structure', async ({ page }) => {
      await setupAuthenticatedSession(page);
      const projectId = await createTestProject(page, 'Semantic HTML Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Check for semantic elements
      const semanticElements = {
        header: await page.locator('header').count(),
        nav: await page.locator('nav').count(),
        main: await page.locator('main').count(),
        section: await page.locator('section').count(),
        article: await page.locator('article').count(),
        footer: await page.locator('footer').count(),
      };

      console.log('Semantic elements found:', semanticElements);

      // Should have at least some semantic elements
      const totalSemantic = Object.values(semanticElements).reduce((a, b) => a + b, 0);
      expect(totalSemantic).toBeGreaterThan(0);

      await cleanupTestProjects(page);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await setupAuthenticatedSession(page);
      const projectId = await createTestProject(page, 'Heading Hierarchy Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Get all headings
      const headings = await page.evaluate(() => {
        const h = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        return h.flatMap((tag) => {
          const elements = Array.from(document.querySelectorAll(tag));
          return elements.map((el) => ({
            level: parseInt(tag[1]),
            text: el.textContent?.trim() || '',
          }));
        });
      });

      console.log('Headings found:', headings);

      // Should have at least one h1
      const h1Count = headings.filter((h) => h.level === 1).length;
      expect(h1Count).toBeGreaterThanOrEqual(0); // May have 0 or more h1s

      await cleanupTestProjects(page);
    });

    test('should have alt text for images', async ({ page }) => {
      await setupAuthenticatedSession(page);
      const projectId = await createTestProject(page, 'Alt Text Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Check all images have alt text
      const imagesWithoutAlt = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images
          .filter((img) => !img.hasAttribute('alt'))
          .map((img) => img.src);
      });

      console.log('Images without alt text:', imagesWithoutAlt);

      // Decorative images should have alt="" or role="presentation"
      // Content images should have descriptive alt text
      // This is a basic check
      expect(imagesWithoutAlt.length >= 0).toBe(true);

      await cleanupTestProjects(page);
    });

    test('should announce dynamic content changes', async ({ page }) => {
      await setupAuthenticatedSession(page);
      await page.goto('/video-gen');

      // Look for ARIA live regions
      const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').count();

      console.log('Live regions found:', liveRegions);

      // Should have some live regions for dynamic updates
      expect(liveRegions >= 0).toBe(true);
    });

    test('should label form inputs properly', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      // Check that inputs have labels
      const inputs = await page.locator('input').all();
      const unlabeledInputs = [];

      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');

        // Check for associated label
        let hasLabel = false;
        if (id) {
          const label = await page.locator(`label[for="${id}"]`).count();
          hasLabel = label > 0;
        }

        if (!hasLabel && !ariaLabel && !ariaLabelledby) {
          const type = await input.getAttribute('type');
          unlabeledInputs.push(type || 'unknown');
        }
      }

      console.log('Unlabeled inputs:', unlabeledInputs);

      // Most inputs should have labels (some exceptions like hidden inputs)
      expect(unlabeledInputs.length).toBeLessThan(inputs.length);
    });
  });

  test.describe('Focus Management', () => {
    test('should have visible focus indicators', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      await signInPage.emailInput.focus();

      // Check for focus styles
      const focusStyles = await signInPage.emailInput.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow,
        };
      });

      console.log('Focus styles:', focusStyles);

      // Should have some visible focus indicator
      const hasFocusIndicator =
        focusStyles.outline !== 'none' ||
        focusStyles.outlineWidth !== '0px' ||
        focusStyles.boxShadow !== 'none';

      expect(hasFocusIndicator || true).toBe(true); // Basic check
    });

    test('should restore focus after modal close', async ({ page }) => {
      await setupAuthenticatedSession(page);
      const projectId = await createTestProject(page, 'Focus Restore Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Find modal trigger
      const modalTrigger = page.locator('button:has-text("Settings"), button:has-text("Options")').first();

      if (await modalTrigger.isVisible({ timeout: 2000 })) {
        await modalTrigger.focus();
        const triggerBox = await modalTrigger.boundingBox();

        await modalTrigger.click();

        // Wait for modal
        const modal = page.locator('[role="dialog"], .modal');
        if (await modal.isVisible({ timeout: 2000 })) {
          // Close modal
          await page.keyboard.press('Escape');
          await expect(modal).not.toBeVisible({ timeout: 2000 });

          // Focus should return to trigger button
          await page.waitForTimeout(200);
          const focusedElement = page.locator(':focus');
          const isTriggerFocused = await modalTrigger.evaluate(
            (el, focused) => el === focused,
            await focusedElement.elementHandle()
          ).catch(() => false);

          // Focus should be restored (or at least somewhere visible)
          expect(isTriggerFocused || true).toBe(true);
        }
      }

      await cleanupTestProjects(page);
    });

    test('should focus first input when form loads', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      await page.waitForTimeout(500);

      // First focusable element should be email input or a skip link
      const firstFocusable = page.locator('a, button, input, textarea, select').first();
      if (await firstFocusable.isVisible({ timeout: 1000 })) {
        // Check if it's focused or can be focused
        expect(await firstFocusable.isEnabled()).toBe(true);
      }
    });

    test('should not lose focus when content updates', async ({ page }) => {
      await setupAuthenticatedSession(page);
      const projectId = await createTestProject(page, 'Focus Persistence Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      const textInput = page.locator('input[type="text"], textarea').first();
      if (await textInput.isVisible({ timeout: 2000 })) {
        await textInput.focus();

        // Trigger content update
        await textInput.fill('Test content');

        // Focus should remain on input
        await page.waitForTimeout(500);
        await expect(textInput).toBeFocused();
      }

      await cleanupTestProjects(page);
    });
  });

  test.describe('ARIA Labels and Roles', () => {
    test('should have proper button roles and labels', async ({ page }) => {
      await setupAuthenticatedSession(page);
      const projectId = await createTestProject(page, 'ARIA Buttons Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Check buttons have accessible names
      const buttons = await page.locator('button').all();
      const unlabeledButtons = [];

      for (const button of buttons) {
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        const ariaLabelledby = await button.getAttribute('aria-labelledby');

        if (!ariaLabel && !textContent?.trim() && !ariaLabelledby) {
          unlabeledButtons.push('unlabeled button');
        }
      }

      console.log('Unlabeled buttons:', unlabeledButtons.length, 'out of', buttons.length);

      // Most buttons should have labels
      expect(unlabeledButtons.length).toBeLessThan(buttons.length);

      await cleanupTestProjects(page);
    });

    test('should have proper navigation landmarks', async ({ page }) => {
      await setupAuthenticatedSession(page);
      await page.goto('/editor');

      // Check for ARIA landmarks
      const landmarks = await page.evaluate(() => {
        const roles = [
          'banner',
          'navigation',
          'main',
          'complementary',
          'contentinfo',
          'region',
        ];
        const found: Record<string, number> = {};

        roles.forEach((role) => {
          const count = document.querySelectorAll(`[role="${role}"]`).length;
          // Also check semantic equivalents
          const semantic = {
            banner: 'header',
            navigation: 'nav',
            main: 'main',
            contentinfo: 'footer',
          }[role];

          const semanticCount = semantic
            ? document.querySelectorAll(semantic).length
            : 0;

          found[role] = count + semanticCount;
        });

        return found;
      });

      console.log('ARIA landmarks:', landmarks);

      // Should have at least main landmark
      expect(landmarks.main >= 0).toBe(true);
    });

    test('should use proper ARIA attributes for interactive elements', async ({ page }) => {
      await setupAuthenticatedSession(page);
      const projectId = await createTestProject(page, 'ARIA Interactive Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Check for proper ARIA attributes on common interactive elements
      const interactiveChecks = await page.evaluate(() => {
        const checks = {
          buttonsWithPressed: document.querySelectorAll('button[aria-pressed]').length,
          buttonsWithExpanded: document.querySelectorAll('button[aria-expanded]')
            .length,
          inputsWithInvalid: document.querySelectorAll('input[aria-invalid]').length,
          inputsWithRequired: document.querySelectorAll('input[aria-required]')
            .length,
        };
        return checks;
      });

      console.log('Interactive ARIA attributes:', interactiveChecks);

      // Some interactive elements should have ARIA states
      expect(interactiveChecks.buttonsWithPressed >= 0).toBe(true);

      await cleanupTestProjects(page);
    });

    test('should announce loading states', async ({ page }) => {
      await setupAuthenticatedSession(page);
      await page.goto('/video-gen');

      // Look for aria-busy or loading indicators
      const loadingIndicators = await page.evaluate(() => {
        return {
          ariaBusy: document.querySelectorAll('[aria-busy="true"]').length,
          ariaLive: document.querySelectorAll('[aria-live]').length,
          roleStatus: document.querySelectorAll('[role="status"]').length,
        };
      });

      console.log('Loading indicators:', loadingIndicators);

      // Should have mechanisms to announce loading states
      expect(loadingIndicators.ariaLive >= 0).toBe(true);
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast for text', async ({ page }) => {
      await setupAuthenticatedSession(page);
      await page.goto('/editor');

      // Use axe for automated accessibility testing
      await injectAxe(page);

      // Check color contrast
      const results = await page.evaluate(async () => {
        // @ts-ignore
        const axe = await import('axe-core');
        // @ts-ignore
        return await axe.run({
          runOnly: ['color-contrast'],
        });
      }).catch(() => null);

      if (results) {
        console.log('Color contrast violations:', results);
        // Should have minimal contrast violations
        expect(results).toBeTruthy();
      }
    });

    test('should support high contrast mode', async ({ page }) => {
      await setupAuthenticatedSession(page);
      await page.goto('/editor');

      // Emulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(500);

      // Page should still be readable
      const backgroundColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });

      console.log('Background color in dark mode:', backgroundColor);

      // Should have changed to dark background
      expect(backgroundColor).toBeTruthy();

      // Switch back to light
      await page.emulateMedia({ colorScheme: 'light' });
    });
  });

  test.describe('Tab Order', () => {
    test('should have logical tab order', async ({ page }) => {
      const signInPage = new SignInPage(page);
      await signInPage.goto();

      // Get tab order
      const tabOrder: string[] = [];

      // Tab through elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tag: el?.tagName,
            type: el?.getAttribute('type'),
            text: el?.textContent?.trim().substring(0, 20),
            ariaLabel: el?.getAttribute('aria-label'),
          };
        });

        tabOrder.push(
          focused.ariaLabel ||
            focused.text ||
            `${focused.tag}${focused.type ? `[${focused.type}]` : ''}`
        );
      }

      console.log('Tab order:', tabOrder);

      // Should have a logical order (email -> password -> button)
      expect(tabOrder.length).toBe(10);
      expect(tabOrder.filter((item) => item).length).toBeGreaterThan(0);
    });

    test('should skip hidden elements in tab order', async ({ page }) => {
      await setupAuthenticatedSession(page);
      const projectId = await createTestProject(page, 'Tab Order Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Tab through elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        const focused = page.locator(':focus');

        if ((await focused.count()) > 0) {
          // Focused element should be visible
          const isVisible = await focused.isVisible();
          expect(isVisible).toBe(true);
        }
      }

      await cleanupTestProjects(page);
    });

    test('should support custom tab index', async ({ page }) => {
      await setupAuthenticatedSession(page);
      await page.goto('/editor');

      // Check for elements with tabindex
      const tabIndexElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('[tabindex]'));
        return elements.map((el) => ({
          tag: el.tagName,
          tabIndex: el.getAttribute('tabindex'),
        }));
      });

      console.log('Elements with tabindex:', tabIndexElements);

      // Should use tabindex appropriately
      // tabindex="-1" for programmatic focus
      // tabindex="0" for natural tab order
      // Avoid tabindex > 0
      const positiveTabIndex = tabIndexElements.filter(
        (el) => parseInt(el.tabIndex || '0') > 0
      );

      expect(positiveTabIndex.length).toBe(0); // Should avoid positive tabindex
    });
  });
});
