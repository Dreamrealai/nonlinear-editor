import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 * This runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  console.log(`📍 Testing against: ${baseURL}`);

  // Launch a browser to verify the application is running
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Try to access the application
    const response = await page.goto(baseURL, { timeout: 30000 });

    if (!response || !response.ok()) {
      throw new Error(`Application not accessible at ${baseURL}`);
    }

    console.log('✅ Application is accessible');
  } catch (error) {
    console.error('❌ Failed to access application:', error);
    console.error('💡 Make sure the application is running: npm run dev');
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✨ Global setup completed successfully\n');
}

export default globalSetup;
