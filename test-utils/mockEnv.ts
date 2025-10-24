/**
 * Environment Variable Mocking Utilities
 *
 * Provides utilities for mocking and restoring environment variables in tests.
 * Ensures tests don't pollute the global environment and can safely mock
 * process.env values.
 *
 * @example
 * ```ts
 * import { mockEnv, restoreEnv } from '@/test-utils/mockEnv';
 *
 * describe('my test', () => {
 *   beforeEach(() => {
 *     mockEnv({
 *       NEXT_PUBLIC_APP_URL: 'http://test.com',
 *       STRIPE_SECRET_KEY: 'sk_test_mock',
 *     });
 *   });
 *
 *   afterEach(() => {
 *     restoreEnv();
 *   });
 *
 *   test('uses mocked env vars', () => {
 *     expect(process.env.NEXT_PUBLIC_APP_URL).toBe('http://test.com');
 *   });
 * });
 * ```
 */

/**
 * Store original environment variables
 */
let originalEnv: NodeJS.ProcessEnv = {};

/**
 * Mock environment variables for testing
 *
 * @param envVars - Object containing environment variables to mock
 * @param preserveExisting - If true, merges with existing env vars. If false, replaces them.
 */
export function mockEnv(
  envVars: Record<string, string | undefined>,
  preserveExisting = true
): void {
  // Store original env on first call
  if (Object.keys(originalEnv).length === 0) {
    originalEnv = { ...process.env };
  }

  if (preserveExisting) {
    process.env = {
      ...process.env,
      ...envVars,
    };
  } else {
    process.env = { ...envVars } as NodeJS.ProcessEnv;
  }
}

/**
 * Restore original environment variables
 */
export function restoreEnv(): void {
  if (Object.keys(originalEnv).length > 0) {
    process.env = { ...originalEnv };
    originalEnv = {};
  }
}

/**
 * Set test environment with common test values
 * This sets up a complete test environment with all necessary variables
 */
export function setTestEnv(): void {
  mockEnv({
    NODE_ENV: 'test',

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',

    // Google Cloud
    GOOGLE_CLOUD_PROJECT_ID: 'test-project-id',
    GOOGLE_CLOUD_LOCATION: 'us-central1',
    GOOGLE_APPLICATION_CREDENTIALS: './test-credentials.json',

    // Google AI
    NEXT_PUBLIC_GEMINI_API_KEY: 'test-gemini-key',
    VERTEX_AI_PROJECT_ID: 'test-vertex-project',

    // Stripe
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_mock',

    // Application
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_API_URL: 'http://localhost:3000/api',

    // Feature Flags
    NEXT_PUBLIC_ENABLE_AI_FEATURES: 'true',
    NEXT_PUBLIC_ENABLE_ANALYTICS: 'false',
    NEXT_PUBLIC_ENABLE_ERROR_TRACKING: 'false',

    // Storage
    STORAGE_BUCKET_NAME: 'test-bucket',
    STORAGE_MAX_FILE_SIZE: '104857600',

    // Rate Limiting
    RATE_LIMIT_ENABLED: 'false',

    // Session
    SESSION_SECRET: 'test-session-secret-min-32-chars',

    // Monitoring
    SENTRY_ENABLED: 'false',
    POSTHOG_ENABLED: 'false',

    // Misc
    LOG_LEVEL: 'error',
    DEBUG: 'false',
  });
}

/**
 * Get a test environment variable with type safety
 */
export function getTestEnv(key: string, defaultValue?: string): string {
  return process.env[key] ?? defaultValue ?? '';
}

/**
 * Assert that required environment variables are set for a test
 * Throws an error if any are missing
 */
export function assertTestEnv(requiredVars: string[]): void {
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required test environment variables: ${missing.join(', ')}\n` +
      'Make sure to call setTestEnv() or mockEnv() before running tests.'
    );
  }
}

/**
 * Create a scoped environment for a single test
 * Automatically restores after the test completes
 *
 * @example
 * ```ts
 * test('with scoped env', () => {
 *   withTestEnv({ API_KEY: 'test-key' }, () => {
 *     expect(process.env.API_KEY).toBe('test-key');
 *   });
 *   // API_KEY is automatically restored here
 * });
 * ```
 */
export function withTestEnv<T>(
  envVars: Record<string, string | undefined>,
  fn: () => T
): T {
  mockEnv(envVars);
  try {
    return fn();
  } finally {
    restoreEnv();
  }
}

/**
 * Create a scoped async environment for a single test
 */
export async function withTestEnvAsync<T>(
  envVars: Record<string, string | undefined>,
  fn: () => Promise<T>
): Promise<T> {
  mockEnv(envVars);
  try {
    return await fn();
  } finally {
    restoreEnv();
  }
}
