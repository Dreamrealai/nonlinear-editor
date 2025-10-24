/**
 * Supabase Test Helpers
 *
 * Standardized utilities for mocking Supabase clients and responses in tests.
 * These helpers provide consistent, type-safe mocks for database operations,
 * authentication, storage, and query building.
 *
 * @module __tests__/helpers/supabase
 * @example
 * ```typescript
 * import { createMockSupabaseClient, mockAuthenticatedUser } from '@/__tests__/helpers/supabase';
 *
 * const mockSupabase = createMockSupabaseClient();
 * const user = mockAuthenticatedUser(mockSupabase);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Mock Supabase client interface with chainable methods
 */
export interface MockSupabaseClient {
  from: jest.Mock;
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  in: jest.Mock;
  is: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  gt: jest.Mock;
  lt: jest.Mock;
  like: jest.Mock;
  ilike: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
  channel: jest.Mock;
  removeChannel: jest.Mock;
  storage: {
    from: jest.Mock;
    upload: jest.Mock;
    getPublicUrl: jest.Mock;
    createSignedUrl: jest.Mock;
    createSignedUrls: jest.Mock;
    remove: jest.Mock;
    list: jest.Mock;
    move: jest.Mock;
    copy: jest.Mock;
  };
  auth: {
    getUser: jest.Mock;
    getSession: jest.Mock;
    signOut: jest.Mock;
    signInWithPassword: jest.Mock;
    signUp: jest.Mock;
    resetPasswordForEmail: jest.Mock;
    updateUser: jest.Mock;
  };
}

/**
 * Creates a mock Supabase client with chainable query methods.
 *
 * The mock client includes all common Supabase operations:
 * - Database queries (select, insert, update, delete)
 * - Query filters (eq, neq, in, like, etc.)
 * - Authentication (getUser, signOut, etc.)
 * - Storage operations (upload, download, etc.)
 * - Real-time channels
 *
 * @param overrides - Optional partial overrides for specific methods
 * @returns Mock Supabase client with all methods
 *
 * @example
 * ```typescript
 * const mockSupabase = createMockSupabaseClient();
 *
 * // Setup a query response
 * mockSupabase.single.mockResolvedValue({
 *   data: { id: '123', name: 'Test' },
 *   error: null
 * });
 *
 * // Or with custom overrides
 * const customMock = createMockSupabaseClient({
 *   from: jest.fn(() => customQueryBuilder)
 * });
 * ```
 */
export function createMockSupabaseClient(
  overrides?: Partial<MockSupabaseClient>
): jest.Mocked<SupabaseClient> & MockSupabaseClient {
  const mockClient: MockSupabaseClient = {
    // Query builder methods - all chainable
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),

    // Filter methods - all chainable
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),

    // Result methods - terminate the chain
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),

    // Modifier methods - chainable
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),

    // Real-time methods
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    }),
    removeChannel: jest.fn(),

    // Storage API
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.jpg' },
      }),
      createSignedUrl: jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed/file.jpg' },
        error: null,
      }),
      createSignedUrls: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
      move: jest.fn().mockResolvedValue({ data: null, error: null }),
      copy: jest.fn().mockResolvedValue({ data: null, error: null }),
    },

    // Auth API
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
      updateUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },

    ...overrides,
  };

  return mockClient as jest.Mocked<SupabaseClient> & MockSupabaseClient;
}

/**
 * Creates a query builder that returns specific data.
 *
 * Useful for mocking specific query chains without setting up
 * the entire client.
 *
 * @param data - The data to return from the query
 * @param error - Optional error to return instead
 * @returns Mock query builder
 *
 * @example
 * ```typescript
 * const queryBuilder = createMockQueryBuilder(
 *   { id: '123', name: 'Test' }
 * );
 *
 * mockSupabase.from.mockReturnValue(queryBuilder);
 * ```
 */
export function createMockQueryBuilder<T = any>(data: T, error: any = null) {
  const builder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
  };

  return builder;
}

/**
 * Creates a mock authenticated user response.
 *
 * @param overrides - Optional user properties to override
 * @returns Mock user object
 *
 * @example
 * ```typescript
 * const user = createMockAuthUser({
 *   email: 'custom@example.com',
 *   id: 'custom-id'
 * });
 * ```
 */
export function createMockAuthUser(overrides?: Partial<any>) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Creates a mock session object.
 *
 * @param userId - User ID for the session
 * @param tier - Optional subscription tier
 * @returns Mock session
 *
 * @example
 * ```typescript
 * const session = createMockSession('user-123', 'premium');
 * ```
 */
export function createMockSession(userId: string = 'test-user-id', tier: string = 'free') {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: createMockAuthUser({ id: userId }),
  };
}

/**
 * Creates a mock storage client with pre-configured responses.
 *
 * @param overrides - Optional storage method overrides
 * @returns Mock storage client
 *
 * @example
 * ```typescript
 * const storage = createMockStorageClient();
 * mockSupabase.storage = storage;
 * ```
 */
export function createMockStorageClient(overrides?: any) {
  return {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn().mockResolvedValue({
      data: { path: 'test-path' },
      error: null,
    }),
    getPublicUrl: jest.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/file.jpg' },
    }),
    createSignedUrl: jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed/file.jpg' },
      error: null,
    }),
    remove: jest.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
    list: jest.fn().mockResolvedValue({
      data: [],
      error: null,
    }),
    ...overrides,
  };
}

/**
 * Sets up the mock client to return an authenticated user.
 *
 * @param mockClient - The mock Supabase client
 * @param user - Optional user overrides
 * @returns The mocked user
 *
 * @example
 * ```typescript
 * const mockSupabase = createMockSupabaseClient();
 * const user = mockAuthenticatedUser(mockSupabase);
 *
 * // Now auth.getUser() will return this user
 * ```
 */
export function mockAuthenticatedUser(mockClient: MockSupabaseClient, user?: Partial<any>) {
  const mockUser = createMockAuthUser(user);
  mockClient.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });
  return mockUser;
}

/**
 * Sets up the mock client to return unauthenticated state.
 *
 * @param mockClient - The mock Supabase client
 * @param errorMessage - Optional error message
 *
 * @example
 * ```typescript
 * const mockSupabase = createMockSupabaseClient();
 * mockUnauthenticatedUser(mockSupabase);
 *
 * // Now auth.getUser() will return null user
 * ```
 */
export function mockUnauthenticatedUser(
  mockClient: MockSupabaseClient,
  errorMessage: string = 'Not authenticated'
) {
  mockClient.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: errorMessage, name: 'AuthError', status: 401 },
  });
}

/**
 * Sets up a successful database query response.
 *
 * @param mockClient - The mock Supabase client
 * @param data - The data to return
 * @param method - Which result method to mock (single, maybeSingle, or order)
 *
 * @example
 * ```typescript
 * const mockSupabase = createMockSupabaseClient();
 * mockQuerySuccess(mockSupabase, { id: '123', name: 'Test' });
 *
 * // Or for array results
 * mockQuerySuccess(mockSupabase, [{ id: '1' }, { id: '2' }], 'order');
 * ```
 */
export function mockQuerySuccess<T = any>(
  mockClient: MockSupabaseClient,
  data: T,
  method: 'single' | 'maybeSingle' | 'order' = 'single'
) {
  mockClient[method].mockResolvedValue({
    data,
    error: null,
  });
}

/**
 * Sets up a database query error response.
 *
 * @param mockClient - The mock Supabase client
 * @param errorMessage - The error message
 * @param method - Which result method to mock
 * @param code - Optional error code (e.g., 'PGRST116' for not found)
 *
 * @example
 * ```typescript
 * const mockSupabase = createMockSupabaseClient();
 * mockQueryError(mockSupabase, 'Record not found', 'single', 'PGRST116');
 * ```
 */
export function mockQueryError(
  mockClient: MockSupabaseClient,
  errorMessage: string,
  method: 'single' | 'maybeSingle' | 'order' = 'single',
  code?: string
) {
  mockClient[method].mockResolvedValue({
    data: null,
    error: {
      message: errorMessage,
      code: code || 'DB_ERROR',
      details: '',
      hint: '',
    },
  });
}

/**
 * Sets up a successful storage upload response.
 *
 * @param mockClient - The mock Supabase client
 * @param path - The storage path to return
 *
 * @example
 * ```typescript
 * const mockSupabase = createMockSupabaseClient();
 * mockStorageUploadSuccess(mockSupabase, 'user-id/project-id/file.jpg');
 * ```
 */
export function mockStorageUploadSuccess(
  mockClient: MockSupabaseClient,
  path: string = 'test-path'
) {
  mockClient.storage.upload.mockResolvedValue({
    data: { path },
    error: null,
  });
}

/**
 * Sets up a storage upload error response.
 *
 * @param mockClient - The mock Supabase client
 * @param errorMessage - The error message
 *
 * @example
 * ```typescript
 * const mockSupabase = createMockSupabaseClient();
 * mockStorageUploadError(mockSupabase, 'File too large');
 * ```
 */
export function mockStorageUploadError(mockClient: MockSupabaseClient, errorMessage: string) {
  mockClient.storage.upload.mockResolvedValue({
    data: null,
    error: {
      message: errorMessage,
      name: 'StorageError',
      statusCode: '400',
    },
  });
}

/**
 * Resets all mocks on the Supabase client.
 *
 * Call this in afterEach() to ensure clean state between tests.
 *
 * @param mockClient - The mock Supabase client
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   resetAllMocks(mockSupabase);
 * });
 * ```
 */
export function resetAllMocks(mockClient: MockSupabaseClient) {
  // Reset all methods in the client
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
