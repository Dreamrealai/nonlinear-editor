/**
 * Mock Supabase client utilities for testing
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface MockSupabaseChain {
  from: jest.Mock;
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  channel: jest.Mock;
  removeChannel: jest.Mock;
  storage: {
    from: jest.Mock;
    upload: jest.Mock;
    getPublicUrl: jest.Mock;
    createSignedUrl: jest.Mock;
    remove: jest.Mock;
  };
  auth: {
    getUser: jest.Mock;
    signOut: jest.Mock;
  };
}

/**
 * Creates a mock Supabase client with chainable methods
 */
export function createMockSupabaseClient(): jest.Mocked<SupabaseClient> & MockSupabaseChain {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockClient: any = {};

  // Default promise value for when mockClient is awaited
  let promiseValue: { data: unknown; error: unknown } = { data: null, error: null };

  // Make mockClient thenable so it can be awaited like Supabase's real query builder
  // This allows: await from().select() OR from().select().eq().single()
  mockClient.then = function (onFulfilled: (value: unknown) => unknown) {
    return Promise.resolve(promiseValue).then(onFulfilled);
  };

  // Helper to set the value returned when mockClient is awaited
  mockClient.mockResolvedValue = (value: { data: unknown; error: unknown }) => {
    promiseValue = value;
    return mockClient;
  };

  // Create chainable methods that return mockClient for proper chaining
  // This allows: supabase.from('table').select('*').eq('field', value).single()
  mockClient.from = jest.fn(() => mockClient);
  mockClient.select = jest.fn(() => mockClient);
  mockClient.insert = jest.fn(() => mockClient);
  mockClient.update = jest.fn(() => mockClient);
  mockClient.delete = jest.fn(() => mockClient);
  mockClient.eq = jest.fn(() => mockClient);
  mockClient.neq = jest.fn(() => mockClient);
  mockClient.order = jest.fn(() => mockClient);
  mockClient.limit = jest.fn(() => mockClient);
  mockClient.range = jest.fn(() => mockClient);

  // Terminal methods that return promises
  // These should be configured with mockResolvedValue in tests
  mockClient.single = jest.fn();
  mockClient.maybeSingle = jest.fn();

  // Other methods
  mockClient.channel = jest.fn();
  mockClient.removeChannel = jest.fn();

  // Storage methods
  mockClient.storage = {
    from: jest.fn(() => mockClient.storage),
    upload: jest.fn(),
    getPublicUrl: jest.fn(),
    createSignedUrl: jest.fn(),
    remove: jest.fn(),
  };

  // Auth methods
  mockClient.auth = {
    getUser: jest.fn(),
    signOut: jest.fn(),
  };

  return mockClient as jest.Mocked<SupabaseClient> & MockSupabaseChain;
}

/**
 * Creates a mock authenticated user
 */
export function createMockUser(overrides?: Record<string, unknown>) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Creates a mock project
 */
export function createMockProject(overrides?: Record<string, unknown>) {
  return {
    id: 'test-project-id',
    user_id: 'test-user-id',
    title: 'Test Project',
    timeline_state_jsonb: {},
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Creates a mock asset
 */
export function createMockAsset(overrides?: Record<string, unknown>) {
  return {
    id: 'test-asset-id',
    project_id: 'test-project-id',
    user_id: 'test-user-id',
    storage_url: 'supabase://assets/test-user-id/test-project-id/image/test.jpg',
    type: 'image',
    mime_type: 'image/jpeg',
    width: 1920,
    height: 1080,
    source: 'upload',
    metadata: {
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      sourceUrl: 'https://example.com/test.jpg',
      size: 1024,
    },
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Creates a mock user profile
 */
export function createMockUserProfile(overrides?: Record<string, unknown>) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    tier: 'free',
    subscription_status: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    subscription_current_period_start: null,
    subscription_current_period_end: null,
    subscription_cancel_at_period_end: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Helper to set up authenticated user mock
 */
export function mockAuthenticatedUser(
  mockClient: MockSupabaseChain,
  user?: Record<string, unknown>
) {
  const mockUser = user || createMockUser();
  mockClient.auth.getUser.mockImplementation(() =>
    Promise.resolve({
      data: { user: mockUser },
      error: null,
    })
  );
  return mockUser;
}

/**
 * Helper to set up unauthenticated state
 */
export function mockUnauthenticatedUser(mockClient: MockSupabaseChain) {
  mockClient.auth.getUser.mockImplementation(() =>
    Promise.resolve({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })
  );
}

/**
 * Helper to mock database query response
 */
export function mockQuerySuccess(
  mockClient: MockSupabaseChain,
  data: Record<string, unknown>,
  method: 'single' | 'maybeSingle' | 'order' = 'single'
) {
  mockClient[method].mockResolvedValue({
    data,
    error: null,
  });
}

/**
 * Helper to mock database query error
 */
export function mockQueryError(
  mockClient: MockSupabaseChain,
  errorMessage: string,
  method: 'single' | 'maybeSingle' | 'order' = 'single'
) {
  mockClient[method].mockResolvedValue({
    data: null,
    error: { message: errorMessage, code: 'DB_ERROR' },
  });
}

/**
 * Helper to mock storage upload success
 */
export function mockStorageUploadSuccess(mockClient: MockSupabaseChain) {
  mockClient.storage.upload.mockResolvedValue({
    data: { path: 'test-path' },
    error: null,
  });
}

/**
 * Helper to mock storage upload error
 */
export function mockStorageUploadError(mockClient: MockSupabaseChain, errorMessage: string) {
  mockClient.storage.upload.mockResolvedValue({
    data: null,
    error: { message: errorMessage, name: 'StorageError' },
  });
}

/**
 * Helper to reset all mocks
 */
export function resetAllMocks(mockClient: MockSupabaseChain) {
  Object.values(mockClient).forEach((value) => {
    if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach((fn) => {
        if (jest.isMockFunction(fn)) {
          fn.mockClear();
        }
      });
    } else if (jest.isMockFunction(value)) {
      value.mockClear();
    }
  });
}
