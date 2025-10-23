import { FullConfig } from '@playwright/test';

/**
 * Global teardown for E2E tests
 * This runs once after all tests complete
 */
async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Running E2E test global teardown...');

  // Add any global cleanup here if needed
  // For example: cleaning up test database, stopping servers, etc.

  console.log('✨ Global teardown completed successfully');
}

export default globalTeardown;
