import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * Comprehensive configuration for end-to-end testing with mobile and desktop viewports
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Desktop Browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile Browsers - iPhone
    {
      name: 'Mobile Chrome iPhone',
      use: { ...devices['iPhone 13'] },
    },

    {
      name: 'Mobile Safari iPhone',
      use: { ...devices['iPhone 13 Pro'] },
    },

    {
      name: 'Mobile Safari iPhone SE',
      use: { ...devices['iPhone SE'] },
    },

    // Mobile Browsers - iPad
    {
      name: 'Mobile Safari iPad',
      use: { ...devices['iPad Pro'] },
    },

    {
      name: 'Mobile Safari iPad Mini',
      use: { ...devices['iPad Mini'] },
    },

    // Mobile Browsers - Android
    {
      name: 'Mobile Chrome Android',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Chrome Galaxy',
      use: { ...devices['Galaxy S9+'] },
    },

    // Tablet Browsers
    {
      name: 'Mobile Chrome Tablet',
      use: { ...devices['Galaxy Tab S4'] },
    },

    // Custom viewport sizes
    {
      name: 'Desktop 1080p',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'Desktop 4K',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 3840, height: 2160 },
      },
    },

    {
      name: 'Mobile Portrait',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
    },

    {
      name: 'Mobile Landscape',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 844, height: 390 },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
