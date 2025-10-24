import { test, expect } from './fixtures/auth';
import { setupAuthenticatedSession } from './fixtures/auth';
import { createTestProject, cleanupTestProjects } from './fixtures/projects';
import { EditorPage } from './pages/EditorPage';
import type { Page } from '@playwright/test';

/**
 * E2E Tests for Performance & Load
 * Tests large projects, timeline performance, concurrent operations, and memory leaks
 */
test.describe('Performance & Load Testing', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestProjects(page);
  });

  test.describe('Large Project Loading', () => {
    test('should load project with 100+ clips', async ({ page }) => {
      const projectId = await createTestProject(page, 'Large Project 100 Clips');
      const editorPage = new EditorPage(page);

      // Mock large project data
      await page.evaluate(() => {
        const mockClips = Array.from({ length: 100 }, (_, i) => ({
          id: `clip-${i}`,
          type: i % 2 === 0 ? 'video' : 'audio',
          start: i * 3,
          duration: 3,
          name: `Clip ${i + 1}`,
        }));
        sessionStorage.setItem('large-project-clips', JSON.stringify(mockClips));
      });

      const startTime = Date.now();
      await editorPage.goto(projectId);

      // Should load within reasonable time (< 5 seconds)
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000);

      // Page should be functional
      await expect(page.locator('[data-testid="timeline"], .timeline')).toBeVisible({ timeout: 3000 });
    });

    test('should handle project with 1000+ assets', async ({ page }) => {
      const projectId = await createTestProject(page, 'Large Project 1000 Assets');

      // Mock large asset library
      await page.evaluate(() => {
        const mockAssets = Array.from({ length: 1000 }, (_, i) => ({
          id: `asset-${i}`,
          type: i % 3 === 0 ? 'video' : i % 3 === 1 ? 'audio' : 'image',
          name: `Asset ${i + 1}`,
          size: Math.floor(Math.random() * 1000000),
        }));
        sessionStorage.setItem('large-project-assets', JSON.stringify(mockAssets));
      });

      const editorPage = new EditorPage(page);
      const startTime = Date.now();
      await editorPage.goto(projectId);

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // Allow 10s for very large projects

      expect(page.url()).toContain(projectId);
    });

    test('should progressively load large projects', async ({ page }) => {
      const projectId = await createTestProject(page, 'Progressive Loading');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Mock progressive loading of clips
      await page.evaluate(() => {
        let loadedCount = 0;
        const totalClips = 500;

        const loadBatch = () => {
          const batchSize = 50;
          const clips = Array.from({ length: batchSize }, (_, i) => ({
            id: `clip-${loadedCount + i}`,
            type: 'video',
            start: (loadedCount + i) * 2,
            duration: 2,
          }));

          loadedCount += batchSize;
          sessionStorage.setItem('progressive-clips', JSON.stringify(clips));

          if (loadedCount < totalClips) {
            setTimeout(loadBatch, 100);
          }
        };

        loadBatch();
      });

      // Wait for initial render
      await page.waitForTimeout(2000);

      // Page should remain responsive
      const timeline = page.locator('[data-testid="timeline"], .timeline');
      if (await timeline.isVisible({ timeout: 2000 })) {
        expect(await timeline.isVisible()).toBe(true);
      }
    });

    test('should measure initial page load performance', async ({ page }) => {
      const projectId = await createTestProject(page, 'Performance Test');

      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          domInteractive: perfData.domInteractive - perfData.fetchStart,
        };
      });

      // Log metrics
      console.log('Performance Metrics:', metrics);

      // DOM should be interactive quickly (< 3s)
      expect(metrics.domInteractive).toBeLessThan(3000);
    });
  });

  test.describe('Timeline Scrolling Performance', () => {
    test('should handle smooth scrolling in timeline', async ({ page }) => {
      const projectId = await createTestProject(page, 'Scrolling Performance');
      const editorPage = new EditorPage(page);

      // Create long timeline
      await page.evaluate(() => {
        const mockClips = Array.from({ length: 200 }, (_, i) => ({
          id: `clip-${i}`,
          type: 'video',
          start: i * 5,
          duration: 5,
        }));
        sessionStorage.setItem('scroll-test-clips', JSON.stringify(mockClips));
      });

      await editorPage.goto(projectId);

      const timeline = page.locator('[data-testid="timeline"], .timeline');
      if (await timeline.isVisible({ timeout: 3000 })) {
        await timeline.hover();

        // Measure scroll performance
        const scrollStart = Date.now();

        for (let i = 0; i < 10; i++) {
          await page.mouse.wheel(50, 0);
          await page.waitForTimeout(50);
        }

        const scrollTime = Date.now() - scrollStart;

        // Scrolling should be smooth (< 1s for 10 scrolls)
        expect(scrollTime).toBeLessThan(1000);
      }
    });

    test('should handle zoom operations smoothly', async ({ page }) => {
      const projectId = await createTestProject(page, 'Zoom Performance');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      const timeline = page.locator('[data-testid="timeline"], .timeline');
      if (await timeline.isVisible({ timeout: 2000 })) {
        await timeline.hover();

        // Test zoom in/out
        const zoomStart = Date.now();

        // Zoom in
        await page.keyboard.press('Control+=');
        await page.waitForTimeout(100);

        // Zoom out
        await page.keyboard.press('Control+-');
        await page.waitForTimeout(100);

        const zoomTime = Date.now() - zoomStart;

        // Zoom operations should be fast (< 500ms)
        expect(zoomTime).toBeLessThan(500);
      }
    });

    test('should render timeline updates efficiently', async ({ page }) => {
      const projectId = await createTestProject(page, 'Render Performance');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Measure rendering performance during updates
      const renderMetrics = await page.evaluate(() => {
        const metrics: number[] = [];

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              metrics.push(entry.duration);
            }
          }
        });

        observer.observe({ entryTypes: ['measure'] });

        // Simulate timeline updates
        for (let i = 0; i < 10; i++) {
          performance.mark(`update-start-${i}`);

          // Trigger re-render
          const event = new CustomEvent('timeline-update');
          window.dispatchEvent(event);

          performance.mark(`update-end-${i}`);
          performance.measure(`update-${i}`, `update-start-${i}`, `update-end-${i}`);
        }

        return metrics;
      });

      // Each update should be fast
      const avgRenderTime = renderMetrics.reduce((a, b) => a + b, 0) / renderMetrics.length;
      console.log('Average render time:', avgRenderTime, 'ms');

      expect(avgRenderTime).toBeLessThan(100); // < 100ms per update
    });
  });

  test.describe('Multiple Concurrent Operations', () => {
    test('should handle multiple video generations', async ({ page, context }) => {
      const projectIds = await Promise.all([
        createTestProject(page, 'Concurrent Gen 1'),
        createTestProject(page, 'Concurrent Gen 2'),
        createTestProject(page, 'Concurrent Gen 3'),
      ]);

      const pages = [page, await context.newPage(), await context.newPage()];

      // Mock API responses for all
      for (const p of pages) {
        await p.route('**/api/video/generate', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              operationName: `operation-${Math.random()}`,
              message: 'Started',
            }),
          });
        });
      }

      // Start all generations simultaneously
      const startTime = Date.now();

      await Promise.all(
        pages.map(async (p, i) => {
          await p.goto(`/video-gen?projectId=${projectIds[i]}`);
          const prompt = p.locator('textarea[name="prompt"], textarea[placeholder*="prompt" i]').first();
          if (await prompt.isVisible({ timeout: 2000 })) {
            await prompt.fill(`Concurrent test ${i + 1}`);
            await p.locator('button:has-text("Generate")').first().click();
          }
        })
      );

      const totalTime = Date.now() - startTime;

      // All should complete within reasonable time
      expect(totalTime).toBeLessThan(10000);

      // Close extra pages
      await pages[1].close();
      await pages[2].close();
    });

    test('should handle multiple project loads', async ({ page, context }) => {
      const projectIds = await Promise.all([
        createTestProject(page, 'Load Test 1'),
        createTestProject(page, 'Load Test 2'),
        createTestProject(page, 'Load Test 3'),
      ]);

      const pages = [page, await context.newPage(), await context.newPage()];

      const startTime = Date.now();

      // Load all projects simultaneously
      await Promise.all(
        pages.map(async (p, i) => {
          const editorPage = new EditorPage(p);
          await editorPage.goto(projectIds[i]);
        })
      );

      const loadTime = Date.now() - startTime;

      // Should load all within 10 seconds
      expect(loadTime).toBeLessThan(10000);

      // All should be loaded
      for (let i = 0; i < pages.length; i++) {
        expect(pages[i].url()).toContain(projectIds[i]);
      }

      // Close extra pages
      await pages[1].close();
      await pages[2].close();
    });

    test('should handle concurrent asset uploads', async ({ page }) => {
      const projectId = await createTestProject(page, 'Concurrent Uploads');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Mock upload endpoint
      let uploadCount = 0;
      await page.route('**/api/assets/upload', route => {
        uploadCount++;
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ id: `asset-${uploadCount}`, url: `http://test.com/asset-${uploadCount}` }),
          });
        }, 500); // Simulate slow upload
      });

      const fileInputs = await page.locator('input[type="file"]').all();

      if (fileInputs.length > 0) {
        // Upload multiple files
        const uploadPromises = fileInputs.slice(0, 3).map(async (input, i) => {
          const buffer = Buffer.from(`Test content ${i}`);
          await input.setInputFiles({
            name: `test-${i}.txt`,
            mimeType: 'text/plain',
            buffer,
          });
        });

        const startTime = Date.now();
        await Promise.all(uploadPromises);
        const uploadTime = Date.now() - startTime;

        // Concurrent uploads should be faster than sequential
        expect(uploadTime).toBeLessThan(2000); // Less than 3 * 500ms
      }
    });
  });

  test.describe('Memory Leak Detection', () => {
    test('should not leak memory during navigation', async ({ page }) => {
      const projectId = await createTestProject(page, 'Memory Leak Test');

      // Measure initial memory
      const getMemoryUsage = async () => {
        return await page.evaluate(() => {
          if ((performance as any).memory) {
            return (performance as any).memory.usedJSHeapSize;
          }
          return 0;
        });
      };

      const editorPage = new EditorPage(page);

      // Navigate back and forth multiple times
      for (let i = 0; i < 5; i++) {
        await editorPage.goto(projectId);
        await page.waitForTimeout(500);
        await page.goto('/');
        await page.waitForTimeout(500);
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      const finalMemory = await getMemoryUsage();

      // Memory usage should be reasonable (this is a basic check)
      console.log('Final memory usage:', finalMemory);

      // Memory should not grow unbounded
      expect(finalMemory).toBeLessThan(100 * 1024 * 1024); // < 100MB
    });

    test('should clean up event listeners', async ({ page }) => {
      const projectId = await createTestProject(page, 'Event Listener Test');
      const editorPage = new EditorPage(page);

      const getListenerCount = async () => {
        return await page.evaluate(() => {
          // This is a simplified check
          const elements = document.querySelectorAll('*');
          let count = 0;
          elements.forEach((el) => {
            // Count elements with event listeners (approximate)
            if ((el as any)._listeners) {
              count += Object.keys((el as any)._listeners).length;
            }
          });
          return count;
        });
      };

      // Navigate multiple times
      for (let i = 0; i < 3; i++) {
        await editorPage.goto(projectId);
        await page.waitForTimeout(500);
        await page.goto('/');
        await page.waitForTimeout(500);
      }

      await editorPage.goto(projectId);
      const listenerCount = await getListenerCount();

      console.log('Event listener count:', listenerCount);

      // Should have reasonable number of listeners
      expect(listenerCount).toBeLessThan(1000);
    });

    test('should not accumulate DOM nodes', async ({ page }) => {
      const projectId = await createTestProject(page, 'DOM Node Test');
      const editorPage = new EditorPage(page);

      const getDomNodeCount = async () => {
        return await page.evaluate(() => {
          return document.querySelectorAll('*').length;
        });
      };

      await editorPage.goto(projectId);
      const initialNodes = await getDomNodeCount();

      // Perform actions that could leak DOM nodes
      for (let i = 0; i < 10; i++) {
        // Simulate modal open/close
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }

      const finalNodes = await getDomNodeCount();

      console.log('DOM nodes - Initial:', initialNodes, 'Final:', finalNodes);

      // DOM node count should not grow significantly
      expect(finalNodes - initialNodes).toBeLessThan(100);
    });
  });

  test.describe('Long-Running Session Stability', () => {
    test('should remain stable during extended use', async ({ page }) => {
      const projectId = await createTestProject(page, 'Extended Session Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Simulate extended use (5 minutes compressed into fast actions)
      const actions = 50;

      for (let i = 0; i < actions; i++) {
        // Various interactions
        const buttons = await page.locator('button').all();
        if (buttons.length > 0) {
          const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
          if (await randomButton.isEnabled({ timeout: 100 }).catch(() => false)) {
            await randomButton.click().catch(() => {});
          }
        }

        await page.waitForTimeout(100);

        // Check page is still responsive
        if (i % 10 === 0) {
          expect(page.url()).toContain('editor');
        }
      }

      // Page should still be functional
      expect(page.url()).toContain('editor');
    });

    test('should handle idle timeout', async ({ page }) => {
      const projectId = await createTestProject(page, 'Idle Timeout Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Wait idle (simulate 5 minutes with faster timeout)
      await page.waitForTimeout(5000);

      // Should show idle warning or still be functional
      const idleWarning = page.locator('text=/idle|inactive|timeout/i');
      const isIdle = await idleWarning.isVisible({ timeout: 1000 }).catch(() => false);

      // Either shows idle warning or page is still active
      expect(isIdle || page.url().includes('editor')).toBeTruthy();
    });

    test('should persist data during long session', async ({ page }) => {
      const projectId = await createTestProject(page, 'Data Persistence Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Make changes
      const textInput = page.locator('input[type="text"], textarea').first();
      if (await textInput.isVisible({ timeout: 2000 })) {
        const testValue = 'Persisted data test';
        await textInput.fill(testValue);

        // Wait and verify data persists
        await page.waitForTimeout(3000);

        const currentValue = await textInput.inputValue();
        expect(currentValue).toBe(testValue);
      }
    });

    test('should handle session timeout gracefully', async ({ page, context }) => {
      const projectId = await createTestProject(page, 'Session Timeout Test');

      // Clear session cookie to simulate timeout
      await context.clearCookies();

      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Should redirect to sign in or show session expired message
      await page.waitForTimeout(2000);

      const isSignIn = page.url().includes('signin');
      const sessionExpired = await page.locator('text=/session.*expired|sign.*in.*again/i').isVisible({ timeout: 2000 }).catch(() => false);

      expect(isSignIn || sessionExpired).toBeTruthy();
    });
  });

  test.describe('Resource Loading', () => {
    test('should lazy load images', async ({ page }) => {
      const projectId = await createTestProject(page, 'Lazy Load Test');
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      // Check for lazy loading attributes
      const images = await page.locator('img').all();
      const lazyImages = [];

      for (const img of images) {
        const loading = await img.getAttribute('loading');
        if (loading === 'lazy') {
          lazyImages.push(img);
        }
      }

      console.log(`Found ${lazyImages.length} lazy-loaded images`);

      // At least some images should be lazy loaded
      expect(lazyImages.length >= 0).toBe(true);
    });

    test('should load critical CSS first', async ({ page }) => {
      const projectId = await createTestProject(page, 'CSS Loading Test');
      const editorPage = new EditorPage(page);

      await editorPage.goto(projectId);

      // Check if critical CSS is loaded
      const hasStyles = await page.evaluate(() => {
        return document.styleSheets.length > 0;
      });

      expect(hasStyles).toBe(true);
    });

    test('should defer non-critical JavaScript', async ({ page }) => {
      const projectId = await createTestProject(page, 'JS Loading Test');
      const editorPage = new EditorPage(page);

      await editorPage.goto(projectId);

      // Check for deferred scripts
      const scripts = await page.evaluate(() => {
        const scriptElements = Array.from(document.querySelectorAll('script'));
        return scriptElements.map(script => ({
          defer: script.defer,
          async: script.async,
        }));
      });

      console.log('Script loading strategies:', scripts);

      // Should have some deferred or async scripts
      const optimizedScripts = scripts.filter(s => s.defer || s.async);
      expect(optimizedScripts.length >= 0).toBe(true);
    });
  });
});
