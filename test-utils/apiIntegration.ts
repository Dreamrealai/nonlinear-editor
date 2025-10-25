/**
 * Integration Testing Utilities for API Routes
 *
 * This module provides utilities for integration testing Next.js API routes with minimal mocking.
 * Unlike unit tests that mock everything, integration tests use real implementations where possible
 * and only mock external services.
 *
 * Philosophy:
 * - Test the FULL request/response cycle
 * - Use REAL middleware (withAuth, rate limiting, etc.)
 * - Use REAL services and database queries (with test data)
 * - Only mock EXTERNAL services (Stripe, Google Cloud, AI providers)
 * - Less brittle, more realistic tests
 *
 * Benefits over heavy mocking:
 * - Tests catch real integration issues
 * - Less mock maintenance
 * - Tests survive refactoring better
 * - More confidence in deployments
 *
 * Usage:
 * ```typescript
 * import { createIntegrationTest, authenticatedRequest, mockExternalServices } from '@/test-utils/apiIntegration';
 *
 * describe('POST /api/projects', () => {
 *   const test = createIntegrationTest();
 *
 *   it('creates project for authenticated user', async () => {
 *     const { request, user } = await authenticatedRequest(test, 'POST', '/api/projects', {
 *       title: 'Test Project'
 *     });
 *
 *     const response = await POST(request, { params: Promise.resolve({}) });
 *
 *     expect(response.status).toBe(200);
 *     const data = await response.json();
 *     expect(data.title).toBe('Test Project');
 *     expect(data.user_id).toBe(user.id);
 *   });
 * });
 * ```
 */

import { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test context for integration tests
 * Contains test state and utilities
 */
export interface IntegrationTestContext {
  /** Test users created for this test */
  users: Map<string, TestUser>;
  /** Test data cleanup functions */
  cleanup: Array<() => Promise<void>>;
  /** Mock external service reset functions */
  externalMocks: {
    stripe: jest.MockedObject<any> | null;
    googleCloud: jest.MockedObject<any> | null;
    aiProviders: jest.MockedObject<any> | null;
  };
}

/**
 * Test user with authentication state
 */
export interface TestUser {
  /** User ID (UUID) */
  id: string;
  /** User email */
  email: string;
  /** User metadata */
  metadata?: Record<string, any>;
  /** Mock JWT token for testing */
  token: string;
  /** User tier (free, pro, admin) */
  tier?: 'free' | 'pro' | 'admin';
}

/**
 * Create an integration test context
 * Sets up test environment with minimal mocking
 */
export function createIntegrationTest(): IntegrationTestContext {
  const context: IntegrationTestContext = {
    users: new Map(),
    cleanup: [],
    externalMocks: {
      stripe: null,
      googleCloud: null,
      aiProviders: null,
    },
  };

  // Mock external services by default
  mockExternalServices(context);

  return context;
}

/**
 * Create a test user with authentication
 */
export function createTestUser(
  context: IntegrationTestContext,
  options: {
    email?: string;
    tier?: 'free' | 'pro' | 'admin';
    metadata?: Record<string, any>;
  } = {}
): TestUser {
  const userId = uuidv4();
  const user: TestUser = {
    id: userId,
    email: options.email || `test-${userId}@example.com`,
    tier: options.tier || 'free',
    metadata: options.metadata,
    token: `test-token-${userId}`,
  };

  context.users.set(userId, user);
  return user;
}

/**
 * Create an authenticated NextRequest for testing
 * This creates a request that will pass authentication
 */
export async function authenticatedRequest(
  context: IntegrationTestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  body?: any,
  options: {
    user?: TestUser;
    headers?: Record<string, string>;
  } = {}
): Promise<{ request: NextRequest; user: TestUser }> {
  // Create or use existing user
  const user = options.user || createTestUser(context);

  // Create headers with auth token
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });

  // Add auth cookie (simulates Supabase auth)
  headers.set('Cookie', `supabase-auth-token=${user.token}`);

  // Create request
  const requestInit: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(body);
  }

  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
  const request = new NextRequest(fullUrl, requestInit);

  // Store user ID in request for withAuth to pick up
  // This simulates the Supabase session
  (request as any).__testUser = user;

  return { request, user };
}

/**
 * Create an unauthenticated request (for testing auth failures)
 */
export function unauthenticatedRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  body?: any
): NextRequest {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  const requestInit: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(body);
  }

  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
  return new NextRequest(fullUrl, requestInit);
}

/**
 * Mock external services that we don't want to call in tests
 * These are external APIs that cost money or have rate limits
 */
export function mockExternalServices(context: IntegrationTestContext): void {
  // Mock Stripe API
  context.externalMocks.stripe = mockStripeService();

  // Mock Google Cloud services (Vertex AI, Storage, Video Intelligence)
  context.externalMocks.googleCloud = mockGoogleCloudServices();

  // Mock AI providers (ElevenLabs, Suno, Fal.ai)
  context.externalMocks.aiProviders = mockAIProviders();
}

/**
 * Mock Stripe service
 */
function mockStripeService(): jest.MockedObject<any> {
  const mock = {
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'test_session_123',
          url: 'https://checkout.stripe.com/test',
        }),
      },
    },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'test_sub_123',
        status: 'active',
      }),
    },
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'test_cus_123',
      }),
    },
  };

  // Mock the Stripe module
  jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => mock);
  });

  return mock as jest.MockedObject<any>;
}

/**
 * Mock Google Cloud services
 */
function mockGoogleCloudServices(): jest.MockedObject<any> {
  const mock = {
    storage: {
      bucket: jest.fn().mockReturnValue({
        file: jest.fn().mockReturnValue({
          save: jest.fn().mockResolvedValue(undefined),
          getSignedUrl: jest.fn().mockResolvedValue(['https://storage.googleapis.com/test']),
        }),
      }),
    },
    vertexai: {
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => 'Test AI response',
        },
      }),
    },
  };

  jest.mock('@google-cloud/storage', () => ({
    Storage: jest.fn().mockImplementation(() => mock.storage),
  }));

  jest.mock('@google-cloud/vertexai', () => ({
    VertexAI: jest.fn().mockImplementation(() => mock.vertexai),
  }));

  return mock as jest.MockedObject<any>;
}

/**
 * Mock AI providers
 */
function mockAIProviders(): jest.MockedObject<any> {
  const mock = {
    elevenlabs: {
      generate: jest.fn().mockResolvedValue({
        audio_url: 'https://elevenlabs.io/test.mp3',
      }),
    },
    suno: {
      generate: jest.fn().mockResolvedValue({
        id: 'test_suno_123',
        status: 'queued',
      }),
    },
    fal: {
      subscribe: jest.fn().mockResolvedValue({
        video_url: 'https://fal.ai/test.mp4',
      }),
    },
  };

  // Mock fetch for external API calls
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('elevenlabs')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mock.elevenlabs.generate()),
      });
    }
    if (url.includes('suno')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mock.suno.generate()),
      });
    }
    if (url.includes('fal.ai')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mock.fal.subscribe()),
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    });
  }) as jest.Mock;

  return mock as jest.MockedObject<any>;
}

/**
 * Response assertion helpers
 */
export const assertResponse = {
  /**
   * Assert response is successful (2xx)
   */
  isSuccess: async (response: Response): Promise<void> => {
    if (response.status < 200 || response.status >= 300) {
      const body = await response.text();
      throw new Error(
        `Expected success response (2xx), got ${response.status}. Body: ${body}`
      );
    }
  },

  /**
   * Assert response has specific status code
   */
  hasStatus: (response: Response, expectedStatus: number): void => {
    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected status ${expectedStatus}, got ${response.status}`
      );
    }
  },

  /**
   * Assert response is JSON and parse it
   */
  hasJson: async <T = any>(response: Response): Promise<T> => {
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error(
        `Expected JSON response, got content-type: ${contentType}`
      );
    }
    return response.json();
  },

  /**
   * Assert response contains expected data
   */
  containsData: async (response: Response, expected: Record<string, any>): Promise<void> => {
    const data = await assertResponse.hasJson(response);
    for (const [key, value] of Object.entries(expected)) {
      if (data[key] !== value) {
        throw new Error(
          `Expected ${key} to be ${value}, got ${data[key]}`
        );
      }
    }
  },

  /**
   * Assert response is unauthorized (401)
   */
  isUnauthorized: (response: Response): void => {
    assertResponse.hasStatus(response, 401);
  },

  /**
   * Assert response is forbidden (403)
   */
  isForbidden: (response: Response): void => {
    assertResponse.hasStatus(response, 403);
  },

  /**
   * Assert response is not found (404)
   */
  isNotFound: (response: Response): void => {
    assertResponse.hasStatus(response, 404);
  },

  /**
   * Assert response is bad request (400)
   */
  isBadRequest: (response: Response): void => {
    assertResponse.hasStatus(response, 400);
  },

  /**
   * Assert response is rate limited (429)
   */
  isRateLimited: (response: Response): void => {
    assertResponse.hasStatus(response, 429);
  },
};

/**
 * Cleanup test context
 * Call this in afterEach or afterAll
 */
export async function cleanupIntegrationTest(
  context: IntegrationTestContext
): Promise<void> {
  // Run all cleanup functions
  for (const cleanup of context.cleanup) {
    await cleanup();
  }

  // Clear users
  context.users.clear();

  // Clear mocks
  jest.clearAllMocks();
}

/**
 * Setup integration test environment
 * Call this in beforeEach
 */
export function setupIntegrationTest(): IntegrationTestContext {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Disable rate limiting in tests
  process.env.DISABLE_RATE_LIMITING = 'true';

  return createIntegrationTest();
}
