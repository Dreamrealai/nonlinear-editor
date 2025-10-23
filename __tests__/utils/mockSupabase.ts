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
  const mockClient: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
      createSignedUrl: jest.fn(),
      remove: jest.fn(),
    },
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
  };

  return mockClient as jest.Mocked<SupabaseClient> & MockSupabaseChain;
}

/**
 * Creates a mock authenticated user
 */
export function createMockUser(overrides?: Partial<any>) {
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
export function createMockProject(overrides?: Partial<any>) {
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
export function createMockAsset(overrides?: Partial<any>) {
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
export function createMockUserProfile(overrides?: Partial<any>) {
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
  user?: any
) {
  const mockUser = user || createMockUser();
  mockClient.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });
  return mockUser;
}

/**
 * Helper to set up unauthenticated state
 */
export function mockUnauthenticatedUser(mockClient: MockSupabaseChain) {
  mockClient.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'Not authenticated' },
  });
}

/**
 * Helper to mock database query response
 */
export function mockQuerySuccess(
  mockClient: MockSupabaseChain,
  data: any,
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
export function mockStorageUploadError(
  mockClient: MockSupabaseChain,
  errorMessage: string
) {
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
