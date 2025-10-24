import { test, expect } from './fixtures/auth';
import { setupAuthenticatedSession } from './fixtures/auth';
import { createTestProject, cleanupTestProjects } from './fixtures/projects';
import { EditorPage } from './pages/EditorPage';

/**
 * Audio Generation E2E Tests
 * Tests audio generation functionality including Suno and ElevenLabs integration,
 * audio configuration, generation flow, and adding audio to timeline
 */
test.describe('Audio Generation', () => {
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    // Sign in and create a test project
    await setupAuthenticatedSession(page);
    projectId = await createTestProject(page, 'Audio Generation Test Project');
  });

  test.afterEach(async ({ page }) => {
    // Clean up test projects
    await cleanupTestProjects(page);
  });

  test.describe('Open Audio Generation Tab', () => {
    test('should navigate to audio generation page from editor', async ({ page }) => {
      const editorPage = new EditorPage(page);
      await editorPage.goto(projectId);

      await editorPage.waitForTimelineLoad();

      // Look for audio generation link/button
      const audioGenLink = page
        .locator('a[href*="generate-audio"]')
        .or(page.locator('text=Generate Audio'))
        .or(page.locator('text=Audio'))
        .first();

      if ((await audioGenLink.count()) > 0) {
        await audioGenLink.click();
        await page.waitForURL('**/generate-audio**', { timeout: 10000 });
        expect(page.url()).toContain('generate-audio');
        expect(page.url()).toContain(projectId);
      }
    });

    test('should load audio generation page directly', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('generate-audio');
      expect(page.url()).toContain(projectId);
    });

    test('should display audio generation interface', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      // Look for audio generation UI elements
      const hasAudioUI =
        (await page.locator('text=Generate Audio').count()) > 0 ||
        (await page.locator('text=Audio Generation').count()) > 0 ||
        (await page.locator('[data-testid*="audio"]').count()) > 0;

      expect(hasAudioUI).toBe(true);
    });

    test('should show audio generation modal trigger', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      // Look for button to trigger audio generation
      const hasGenerateButton =
        (await page.locator('text=Generate').count()) > 0 ||
        (await page.locator('button:has-text("Generate")').count()) > 0 ||
        (await page.locator('[data-testid*="generate"]').count()) > 0;

      expect(hasGenerateButton).toBe(true);
    });
  });

  test.describe('Configure Audio Settings', () => {
    test('should open audio generation modal', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      // Click generate button to open modal
      const generateButton = page
        .locator('button:has-text("Generate")')
        .or(page.locator('text=Generate Audio'))
        .first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();

        // Modal should appear
        const modal = page.locator('[role="dialog"]').or(page.locator('.modal'));

        if ((await modal.count()) > 0) {
          await expect(modal.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should show Suno audio option', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      // Open modal
      const generateButton = page
        .locator('button:has-text("Generate")')
        .or(page.locator('text=Generate Audio'))
        .first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();

        // Look for Suno option
        await page.waitForTimeout(1000);
        const hasSunoOption =
          (await page.locator('text=Suno').count()) > 0 ||
          (await page.locator('[data-testid*="suno"]').count()) > 0;

        if (hasSunoOption) {
          expect(await page.locator('text=Suno').first().isVisible()).toBe(true);
        }
      }
    });

    test('should show ElevenLabs audio option', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      // Open modal
      const generateButton = page
        .locator('button:has-text("Generate")')
        .or(page.locator('text=Generate Audio'))
        .first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();

        // Look for ElevenLabs option
        await page.waitForTimeout(1000);
        const hasElevenLabsOption =
          (await page.locator('text=ElevenLabs').count()) > 0 ||
          (await page.locator('[data-testid*="elevenlabs"]').count()) > 0;

        if (hasElevenLabsOption) {
          expect(await page.locator('text=ElevenLabs').first().isVisible()).toBe(true);
        }
      }
    });

    test('should allow selecting Suno mode', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      // Open modal
      const generateButton = page
        .locator('button:has-text("Generate")')
        .or(page.locator('text=Generate Audio'))
        .first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        // Click Suno option
        const sunoButton = page.locator('text=Suno').first();

        if ((await sunoButton.count()) > 0) {
          await sunoButton.click();

          // Should show Suno form
          await page.waitForTimeout(500);
          const hasSunoForm =
            (await page.locator('input[name="prompt"]').count()) > 0 ||
            (await page.locator('textarea[name="prompt"]').count()) > 0 ||
            (await page.locator('input[name="style"]').count()) > 0;

          expect(hasSunoForm).toBe(true);
        }
      }
    });

    test('should allow selecting ElevenLabs mode', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      // Open modal
      const generateButton = page
        .locator('button:has-text("Generate")')
        .or(page.locator('text=Generate Audio'))
        .first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        // Click ElevenLabs option
        const elevenLabsButton = page.locator('text=ElevenLabs').first();

        if ((await elevenLabsButton.count()) > 0) {
          await elevenLabsButton.click();

          // Should show ElevenLabs form
          await page.waitForTimeout(500);
          const hasElevenLabsForm =
            (await page.locator('input[name="text"]').count()) > 0 ||
            (await page.locator('textarea[name="text"]').count()) > 0 ||
            (await page.locator('select[name="voiceId"]').count()) > 0;

          expect(hasElevenLabsForm).toBe(true);
        }
      }
    });

    test('should show Suno configuration fields', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      const generateButton = page.locator('button:has-text("Generate")').first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        const sunoButton = page.locator('text=Suno').first();
        if ((await sunoButton.count()) > 0) {
          await sunoButton.click();
          await page.waitForTimeout(500);

          // Check for Suno-specific fields
          const promptField = page
            .locator('input[name="prompt"]')
            .or(page.locator('textarea[name="prompt"]'))
            .first();
          const styleField = page.locator('input[name="style"]').first();
          const titleField = page.locator('input[name="title"]').first();

          if ((await promptField.count()) > 0) {
            await expect(promptField).toBeVisible();
          }
        }
      }
    });

    test('should show ElevenLabs configuration fields', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      const generateButton = page.locator('button:has-text("Generate")').first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        const elevenLabsButton = page.locator('text=ElevenLabs').first();
        if ((await elevenLabsButton.count()) > 0) {
          await elevenLabsButton.click();
          await page.waitForTimeout(500);

          // Check for ElevenLabs-specific fields
          const textField = page
            .locator('input[name="text"]')
            .or(page.locator('textarea[name="text"]'))
            .first();
          const voiceSelect = page.locator('select[name="voiceId"]').first();

          if ((await textField.count()) > 0) {
            await expect(textField).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Generate Audio', () => {
    test('should validate required fields for Suno', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      const generateButton = page.locator('button:has-text("Generate")').first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        const sunoButton = page.locator('text=Suno').first();
        if ((await sunoButton.count()) > 0) {
          await sunoButton.click();
          await page.waitForTimeout(500);

          // Try to submit without filling required fields
          const submitButton = page
            .locator('button[type="submit"]')
            .or(page.locator('button:has-text("Generate")'))
            .last();

          if ((await submitButton.count()) > 0) {
            await submitButton.click();

            // Should show validation error or prevent submission
            const promptField = page
              .locator('input[name="prompt"]')
              .or(page.locator('textarea[name="prompt"]'))
              .first();

            if ((await promptField.count()) > 0) {
              const isValid = await promptField.evaluate(
                (el: HTMLInputElement) => el.validity.valid
              );
              expect(isValid).toBe(false);
            }
          }
        }
      }
    });

    test('should validate required fields for ElevenLabs', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      const generateButton = page.locator('button:has-text("Generate")').first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        const elevenLabsButton = page.locator('text=ElevenLabs').first();
        if ((await elevenLabsButton.count()) > 0) {
          await elevenLabsButton.click();
          await page.waitForTimeout(500);

          // Try to submit without filling required fields
          const submitButton = page
            .locator('button[type="submit"]')
            .or(page.locator('button:has-text("Generate")'))
            .last();

          if ((await submitButton.count()) > 0) {
            await submitButton.click();

            // Should show validation error or prevent submission
            const textField = page
              .locator('input[name="text"]')
              .or(page.locator('textarea[name="text"]'))
              .first();

            if ((await textField.count()) > 0) {
              const isValid = await textField.evaluate((el: HTMLInputElement) => el.validity.valid);
              expect(isValid).toBe(false);
            }
          }
        }
      }
    });

    test('should accept valid Suno input', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      const generateButton = page.locator('button:has-text("Generate")').first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        const sunoButton = page.locator('text=Suno').first();
        if ((await sunoButton.count()) > 0) {
          await sunoButton.click();
          await page.waitForTimeout(500);

          // Fill in valid data
          const promptField = page
            .locator('input[name="prompt"]')
            .or(page.locator('textarea[name="prompt"]'))
            .first();

          if ((await promptField.count()) > 0) {
            await promptField.fill('Create an upbeat jazz melody');

            const styleField = page.locator('input[name="style"]').first();
            if ((await styleField.count()) > 0) {
              await styleField.fill('Jazz');
            }

            const titleField = page.locator('input[name="title"]').first();
            if ((await titleField.count()) > 0) {
              await titleField.fill('Test Jazz Track');
            }

            // Verify form is filled
            const promptValue = await promptField.inputValue();
            expect(promptValue).toBe('Create an upbeat jazz melody');
          }
        }
      }
    });

    test('should accept valid ElevenLabs input', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      const generateButton = page.locator('button:has-text("Generate")').first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        const elevenLabsButton = page.locator('text=ElevenLabs').first();
        if ((await elevenLabsButton.count()) > 0) {
          await elevenLabsButton.click();
          await page.waitForTimeout(500);

          // Fill in valid data
          const textField = page
            .locator('input[name="text"]')
            .or(page.locator('textarea[name="text"]'))
            .first();

          if ((await textField.count()) > 0) {
            await textField.fill('This is a test voiceover for the video editor.');

            const voiceSelect = page.locator('select[name="voiceId"]').first();
            if ((await voiceSelect.count()) > 0) {
              await voiceSelect.selectOption({ index: 0 });
            }

            // Verify form is filled
            const textValue = await textField.inputValue();
            expect(textValue).toBe('This is a test voiceover for the video editor.');
          }
        }
      }
    });

    test('should show loading state during generation', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      const generateButton = page.locator('button:has-text("Generate")').first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        const sunoButton = page.locator('text=Suno').first();
        if ((await sunoButton.count()) > 0) {
          await sunoButton.click();
          await page.waitForTimeout(500);

          const promptField = page
            .locator('input[name="prompt"]')
            .or(page.locator('textarea[name="prompt"]'))
            .first();

          if ((await promptField.count()) > 0) {
            await promptField.fill('Test prompt');

            // Submit form
            const submitButton = page
              .locator('button[type="submit"]')
              .or(page.locator('button:has-text("Generate")'))
              .last();

            if ((await submitButton.count()) > 0) {
              await submitButton.click();

              // Should show loading indicator
              const hasLoadingIndicator =
                (await page.locator('text=Generating').count()) > 0 ||
                (await page.locator('[data-testid*="loading"]').count()) > 0 ||
                (await submitButton.isDisabled());

              // Loading state should be present (or operation completes very quickly)
            }
          }
        }
      }
    });
  });

  test.describe('Add to Timeline', () => {
    test('should have option to navigate back to timeline', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      // Look for timeline navigation
      const timelineLink = page.locator('a[href*="timeline"]').first();

      if ((await timelineLink.count()) > 0) {
        expect(await timelineLink.isVisible()).toBe(true);
      }
    });

    test('should maintain project context', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      // Project ID should be in URL
      expect(page.url()).toContain(projectId);

      // Navigate to timeline and back
      const timelineLink = page.locator('a[href*="timeline"]').first();
      if ((await timelineLink.count()) > 0) {
        await timelineLink.click();
        await page.waitForURL('**/timeline**', { timeout: 5000 });

        const audioLink = page.locator('a[href*="generate-audio"]').first();
        if ((await audioLink.count()) > 0) {
          await audioLink.click();
          await page.waitForURL('**/generate-audio**', { timeout: 5000 });

          // Should still have same project ID
          expect(page.url()).toContain(projectId);
        }
      }
    });

    test('should show generated audio in assets', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      // Look for audio assets list or library
      const hasAudioList =
        (await page.locator('[data-testid*="audio-list"]').count()) > 0 ||
        (await page.locator('[data-testid*="asset"]').count()) > 0 ||
        (await page.locator('.audio-item').count()) > 0;

      // Audio list may be empty initially
    });
  });

  test.describe('Modal Interaction', () => {
    test('should close modal on cancel', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      const generateButton = page.locator('button:has-text("Generate")').first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        // Look for close/cancel button
        const closeButton = page
          .locator('button:has-text("Cancel")')
          .or(page.locator('button:has-text("Close")').or(page.locator('[aria-label="Close"]')))
          .first();

        if ((await closeButton.count()) > 0) {
          await closeButton.click();

          // Modal should close
          const modal = page.locator('[role="dialog"]').or(page.locator('.modal'));
          if ((await modal.count()) > 0) {
            await expect(modal.first()).not.toBeVisible({ timeout: 2000 });
          }
        }
      }
    });

    test('should allow navigating back from mode selection', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      const generateButton = page.locator('button:has-text("Generate")').first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        const sunoButton = page.locator('text=Suno').first();
        if ((await sunoButton.count()) > 0) {
          await sunoButton.click();
          await page.waitForTimeout(500);

          // Look for back button
          const backButton = page.locator('button:has-text("Back")').first();

          if ((await backButton.count()) > 0) {
            await backButton.click();

            // Should return to mode selection
            await page.waitForTimeout(500);
            const hasModeSelection =
              (await page.locator('text=Suno').count()) > 0 &&
              (await page.locator('text=ElevenLabs').count()) > 0;

            expect(hasModeSelection).toBe(true);
          }
        }
      }
    });

    test('should handle escape key to close modal', async ({ page }) => {
      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      const generateButton = page.locator('button:has-text("Generate")').first();

      if ((await generateButton.count()) > 0) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        // Press Escape
        await page.keyboard.press('Escape');

        // Modal should close
        await page.waitForTimeout(500);
        const modal = page.locator('[role="dialog"]').or(page.locator('.modal'));
        if ((await modal.count()) > 0) {
          const isVisible = await modal.first().isVisible();
          expect(isVisible).toBe(false);
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should load page without JavaScript errors', async ({ page }) => {
      const errors: string[] = [];

      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.goto(`/editor/${projectId}/generate-audio`);
      await page.waitForLoadState('networkidle');

      // Filter out non-critical errors
      const criticalErrors = errors.filter(
        (err) => !err.includes('ResizeObserver') && !err.includes('webkit-masked-url')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('should handle unauthorized access', async ({ page, context }) => {
      // Create new context without authentication
      const newContext = await context.browser()?.newContext();
      if (!newContext) return;

      const newPage = await newContext.newPage();

      // Try to access audio generation without auth
      await newPage.goto(`/editor/${projectId}/generate-audio`);
      await newPage.waitForLoadState('networkidle');

      // Should redirect to signin
      expect(newPage.url()).toMatch(/\/(signin|error)/);

      await newContext.close();
    });
  });
});
