import { test, expect } from './fixtures/auth';
import { setupAuthenticatedSession } from './fixtures/auth';
import { createTestProject, cleanupTestProjects } from './fixtures/projects';
import { VideoGenPage } from './pages/VideoGenPage';
import { EditorPage } from './pages/EditorPage';
import { mockAPIResponse } from './utils/helpers';

test.describe('Video Generation Workflow', () => {
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    // Sign in and create a test project
    await setupAuthenticatedSession(page);
    projectId = await createTestProject(page, 'Video Gen Test Project');
  });

  test.afterEach(async ({ page }) => {
    // Clean up test projects
    await cleanupTestProjects(page);
  });

  test('should display video generation form correctly', async ({ page }) => {
    const videoGenPage = new VideoGenPage(page);
    await videoGenPage.goto(projectId);

    // Verify form elements are visible
    await expect(videoGenPage.promptTextarea).toBeVisible();
    await expect(videoGenPage.aspectRatioSelect).toBeVisible();
    await expect(videoGenPage.durationSelect).toBeVisible();
    await expect(videoGenPage.generateButton).toBeVisible();
    await expect(videoGenPage.backToEditorLink).toBeVisible();

    // Verify page title
    await expect(page.locator('text=Generate Video with AI')).toBeVisible();
  });

  test('should require prompt field', async ({ page }) => {
    const videoGenPage = new VideoGenPage(page);
    await videoGenPage.goto(projectId);

    // Try to submit without prompt
    await videoGenPage.generateButton.click();

    // HTML5 validation should prevent submission
    const promptValidity = await videoGenPage.promptTextarea.evaluate(
      (el: HTMLTextAreaElement) => el.validity.valid
    );
    expect(promptValidity).toBe(false);
  });

  test('should allow selecting different aspect ratios', async ({ page }) => {
    const videoGenPage = new VideoGenPage(page);
    await videoGenPage.goto(projectId);

    // Test different aspect ratios
    await videoGenPage.aspectRatioSelect.selectOption('16:9');
    expect(await videoGenPage.aspectRatioSelect.inputValue()).toBe('16:9');

    await videoGenPage.aspectRatioSelect.selectOption('9:16');
    expect(await videoGenPage.aspectRatioSelect.inputValue()).toBe('9:16');

    await videoGenPage.aspectRatioSelect.selectOption('1:1');
    expect(await videoGenPage.aspectRatioSelect.inputValue()).toBe('1:1');
  });

  test('should allow selecting different durations', async ({ page }) => {
    const videoGenPage = new VideoGenPage(page);
    await videoGenPage.goto(projectId);

    // Test different durations
    await videoGenPage.durationSelect.selectOption('5');
    expect(await videoGenPage.durationSelect.inputValue()).toBe('5');

    await videoGenPage.durationSelect.selectOption('8');
    expect(await videoGenPage.durationSelect.inputValue()).toBe('8');
  });

  test('should show error when no project is selected', async ({ page }) => {
    const videoGenPage = new VideoGenPage(page);
    await page.goto('/video-gen'); // No projectId parameter

    await videoGenPage.promptTextarea.fill('A beautiful sunset over the ocean');
    await videoGenPage.generateButton.click();

    // Should show error message
    const errorMessage = await videoGenPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage?.toLowerCase()).toMatch(/project/);
  });

  test('should initiate video generation with valid inputs', async ({ page }) => {
    const videoGenPage = new VideoGenPage(page);
    await videoGenPage.goto(projectId);

    // Mock the API response to avoid actual video generation
    await mockAPIResponse(page, '**/api/video/generate', {
      operationName: 'test-operation-123',
      message: 'Video generation started',
    });

    await videoGenPage.generateVideo({
      prompt: 'A serene mountain landscape at dawn',
      aspectRatio: '16:9',
      duration: 8,
    });

    // Should show progress indicator
    await expect(videoGenPage.progressBar).toBeVisible({ timeout: 5000 });

    // Should show generating state
    const isGenerating = await videoGenPage.isGenerating();
    expect(isGenerating).toBe(true);
  });

  test('should display progress during generation', async ({ page }) => {
    const videoGenPage = new VideoGenPage(page);
    await videoGenPage.goto(projectId);

    // Mock API responses
    await mockAPIResponse(page, '**/api/video/generate', {
      operationName: 'test-operation-123',
      message: 'Video generation started',
    });

    await mockAPIResponse(page, '**/api/video/status*', {
      done: false,
      progress: 25,
      message: 'Generating...',
    });

    await videoGenPage.generateVideo({
      prompt: 'A busy city street with cars and pedestrians',
      aspectRatio: '16:9',
      duration: 8,
    });

    // Wait for progress to appear
    await expect(videoGenPage.progressBar).toBeVisible({ timeout: 5000 });
  });

  test('should allow canceling video generation', async ({ page }) => {
    const videoGenPage = new VideoGenPage(page);
    await videoGenPage.goto(projectId);

    // Mock API response
    await mockAPIResponse(page, '**/api/video/generate', {
      operationName: 'test-operation-123',
      message: 'Video generation started',
    });

    await videoGenPage.generateVideo({
      prompt: 'An astronaut floating in space',
      aspectRatio: '16:9',
      duration: 8,
    });

    // Wait for progress to appear
    await expect(videoGenPage.progressBar).toBeVisible({ timeout: 5000 });

    // Cancel the generation
    await videoGenPage.cancelGeneration();

    // Progress should be hidden after cancellation
    await expect(videoGenPage.progressBar).not.toBeVisible({ timeout: 5000 });
  });

  test('should redirect to editor after successful generation', async ({ page }) => {
    const videoGenPage = new VideoGenPage(page);
    await videoGenPage.goto(projectId);

    // Mock API responses for successful generation
    await mockAPIResponse(page, '**/api/video/generate', {
      operationName: 'test-operation-123',
      message: 'Video generation started',
    });

    await mockAPIResponse(page, '**/api/video/status*', {
      done: true,
      progress: 100,
      videoUrl: 'https://example.com/video.mp4',
      message: 'Video generated successfully',
    });

    await videoGenPage.generateVideo({
      prompt: 'A calm ocean with gentle waves',
      aspectRatio: '16:9',
      duration: 8,
    });

    // Should redirect to editor after completion
    await page.waitForURL(`/editor/${projectId}*`, { timeout: 30000 });

    expect(page.url()).toContain(`/editor/${projectId}`);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    const videoGenPage = new VideoGenPage(page);
    await videoGenPage.goto(projectId);

    // Mock API error response
    await mockAPIResponse(
      page,
      '**/api/video/generate',
      {
        error: 'Video generation failed: Insufficient credits',
      },
      400
    );

    await videoGenPage.generateVideo({
      prompt: 'A forest with tall trees',
      aspectRatio: '16:9',
      duration: 8,
    });

    // Should display error message
    // Wait for toast or error message
    await page.waitForTimeout(2000);

    // Error could be shown in toast or error div
    const hasError =
      (await page.locator('text=failed').count()) > 0 ||
      (await page.locator('.bg-red-50').count()) > 0;
    expect(hasError).toBe(true);
  });

  test('should navigate back to editor', async ({ page }) => {
    const videoGenPage = new VideoGenPage(page);
    await videoGenPage.goto(projectId);

    await videoGenPage.backToEditor();

    await page.waitForURL(`/editor/${projectId}*`, { timeout: 10000 });
    expect(page.url()).toContain(`/editor/${projectId}`);
  });

  test('should preserve form values when returning from error', async ({ page }) => {
    const videoGenPage = new VideoGenPage(page);
    await videoGenPage.goto(projectId);

    const testPrompt = 'A detailed test prompt for video generation';

    // Fill in form
    await videoGenPage.promptTextarea.fill(testPrompt);
    await videoGenPage.aspectRatioSelect.selectOption('9:16');
    await videoGenPage.durationSelect.selectOption('5');

    // Mock API error
    await mockAPIResponse(page, '**/api/video/generate', { error: 'Test error' }, 500);

    // Attempt to generate
    await videoGenPage.generateButton.click();

    // Wait for error
    await page.waitForTimeout(2000);

    // Verify form values are preserved
    expect(await videoGenPage.promptTextarea.inputValue()).toBe(testPrompt);
    expect(await videoGenPage.aspectRatioSelect.inputValue()).toBe('9:16');
    expect(await videoGenPage.durationSelect.inputValue()).toBe('5');
  });
});
