/**
 * Supabase testing utilities.
 *
 * Provides a configurable mock Supabase client with realistic chainable
 * query behaviour, storage helpers, and authentication helpers so that
 * tests can focus on business logic instead of plumbing.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

type QueryResult<T = unknown> = {
  data: T;
  error: any;
  count?: number | null;
};

type PendingValue = QueryResult | Promise<QueryResult>;

export interface MockSupabaseChain {
  // Core query builder methods
  from: jest.Mock;
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
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
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  mockResolvedValue: (value: QueryResult) => MockSupabaseChain;
  mockRejectedValue: (error: unknown) => MockSupabaseChain;
  // Storage API
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
  // Auth API
  auth: {
    getUser: jest.Mock;
    getSession: jest.Mock;
    signOut: jest.Mock;
    signInWithPassword: jest.Mock;
    signUp: jest.Mock;
    resetPasswordForEmail: jest.Mock;
    updateUser: jest.Mock;
  };
  channel: jest.Mock;
  removeChannel: jest.Mock;
}

type MockSupabaseClient = jest.Mocked<SupabaseClient> & MockSupabaseChain;

function createChainableMethod(builder: Record<string, unknown>) {
  const fn = jest.fn(() => builder);
  return fn;
}

/**
 * Creates a query builder that behaves like the Supabase client:
 * - Chainable query/filter helpers
 * - Thenable so it can be awaited directly
 * - Helpers to control the eventual resolved/rejected value
 */
function createQueryBuilder(): any {
  let pending: PendingValue = Promise.resolve({
    data: null,
    error: null,
    count: null,
  });

  const setPending = (value: PendingValue) => {
    pending =
      typeof (value as PromiseLike<unknown>).then === 'function'
        ? (value as Promise<QueryResult>)
        : Promise.resolve(value as QueryResult);
  };

  const builder: any = {
    then: (
      onFulfilled: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => pending.then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => pending.catch(onRejected),
    finally: (onFinally: () => unknown) => pending.finally(onFinally),
    mockResolvedValue: (value: QueryResult) => {
      setPending(value);
      builder.single.mockResolvedValue(value);
      builder.maybeSingle.mockResolvedValue(value);
      return builder;
    },
    mockRejectedValue: (error: unknown) => {
      const rejection =
        error instanceof Error
          ? error
          : Object.assign(new Error('Mock query rejected'), { cause: error });
      const rejectionPromise = Promise.reject(rejection);
      pending = rejectionPromise as PendingValue;
      builder.single.mockRejectedValue(rejection);
      builder.maybeSingle.mockRejectedValue(rejection);
      return builder;
    },
  };

  const chainableMethods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'in',
    'is',
    'gte',
    'lte',
    'gt',
    'lt',
    'like',
    'ilike',
    'order',
    'limit',
    'range',
  ] as const;

  chainableMethods.forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });

  builder.single = jest.fn(() => pending);
  builder.maybeSingle = jest.fn(() => pending);

  return builder;
}

/**
 * Factory for the shared mock Supabase client used across tests.
 */
export function createMockSupabaseClient(
  overrides?: Partial<MockSupabaseChain>
): MockSupabaseClient {
  const defaultQueryBuilder = createQueryBuilder();

  const client: Record<string, any> = {
    // Return the default query builder so that mock configurations persist
    from: jest.fn(() => defaultQueryBuilder),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockResolvedValue({ data: null, error: null }),
      unsubscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
    storage: {
      from: jest.fn(() => client.storage),
      upload: jest.fn().mockResolvedValue({ data: { path: 'mock/path' }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/mock' },
      }),
      createSignedUrl: jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed/mock' },
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
  };

  const chainableKeys: (keyof MockSupabaseChain)[] = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'in',
    'is',
    'gte',
    'lte',
    'gt',
    'lt',
    'like',
    'ilike',
    'order',
    'limit',
    'range',
  ];

  chainableKeys.forEach((key) => {
    client[key] = defaultQueryBuilder[key];
  });

  client.single = defaultQueryBuilder.single;
  client.maybeSingle = defaultQueryBuilder.maybeSingle;

  client.mockResolvedValue = (value: QueryResult) => {
    defaultQueryBuilder.mockResolvedValue(value);
    return client as MockSupabaseClient;
  };

  client.mockRejectedValue = (error: unknown) => {
    defaultQueryBuilder.mockRejectedValue(error);
    return client as MockSupabaseClient;
  };

  const baseClient = client as MockSupabaseClient;

  if (overrides) {
    const { storage, auth, ...rest } = overrides;
    if (storage) {
      Object.assign(baseClient.storage, storage);
    }
    if (auth) {
      Object.assign(baseClient.auth, auth);
    }
    Object.assign(baseClient, rest);
  }

  // Ensure default resolved value is neutral
  baseClient.mockResolvedValue({
    data: null,
    error: null,
    count: null,
  });

  (globalThis as Record<string, unknown>).__TEST_SUPABASE_CLIENT__ = baseClient;

  return baseClient;
}

export function createMockUser(overrides?: Record<string, unknown>) {
  const defaultId = '550e8400-e29b-41d4-a716-446655440000';
  return {
    id: defaultId,
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockProject(overrides?: Record<string, unknown>) {
  const defaultUserId = '550e8400-e29b-41d4-a716-446655440000';
  const defaultProjectId = '550e8400-e29b-41d4-a716-446655440001';
  return {
    id: defaultProjectId,
    user_id: defaultUserId,
    title: 'Test Project',
    timeline_state_jsonb: {},
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockAsset(overrides?: Record<string, unknown>) {
  const defaultUserId = '550e8400-e29b-41d4-a716-446655440000';
  const defaultProjectId = '550e8400-e29b-41d4-a716-446655440001';
  const defaultAssetId = '550e8400-e29b-41d4-a716-446655440002';
  return {
    id: defaultAssetId,
    project_id: defaultProjectId,
    user_id: defaultUserId,
    storage_url: `supabase://assets/${defaultUserId}/${defaultProjectId}/image/test.jpg`,
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

export function createMockUserProfile(overrides?: Record<string, unknown>) {
  const defaultId = '550e8400-e29b-41d4-a716-446655440000';
  return {
    id: defaultId,
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

export function mockAuthenticatedUser(
  mockClient: MockSupabaseChain,
  userOverrides?: Record<string, unknown>
) {
  const user = createMockUser(userOverrides);
  mockClient.auth.getUser.mockResolvedValue({
    data: { user },
    error: null,
  });
  return user;
}

export function mockUnauthenticatedUser(
  mockClient: MockSupabaseChain,
  message = 'Not authenticated'
) {
  mockClient.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message, status: 401, name: 'AuthError' },
  });
}

export function mockQuerySuccess<T = unknown>(
  mockClient: MockSupabaseChain,
  data: T,
  method: 'single' | 'maybeSingle' = 'single',
  count: number | null = Array.isArray(data) ? data.length : null
) {
  const result: QueryResult<T> = {
    data,
    error: null,
    count,
  };
  mockClient[method].mockResolvedValue(result);
  mockClient.mockResolvedValue(result);
  return result;
}

export function mockQueryError(
  mockClient: MockSupabaseChain,
  errorMessage: string,
  method: 'single' | 'maybeSingle' = 'single'
) {
  const errorResult = {
    data: null,
    error: {
      message: errorMessage,
      code: 'DB_ERROR',
    },
  };
  mockClient[method].mockResolvedValue(errorResult);
  mockClient.mockResolvedValue(errorResult);
  return errorResult;
}

export function mockStorageUploadSuccess(
  mockClient: MockSupabaseChain,
  path: string = 'mock/path'
) {
  mockClient.storage.upload.mockResolvedValue({
    data: { path },
    error: null,
  });
}

export function mockStorageUploadError(mockClient: MockSupabaseChain, errorMessage: string) {
  mockClient.storage.upload.mockResolvedValue({
    data: null,
    error: { message: errorMessage, name: 'StorageError' },
  });
}

export function resetAllMocks(mockClient: MockSupabaseChain) {
  const reset = (value: unknown) => {
    if (jest.isMockFunction(value)) {
      value.mockClear();
    }
  };

  Object.values(mockClient).forEach((value) => {
    if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(reset);
    } else {
      reset(value);
    }
  });

  mockClient.mockResolvedValue({
    data: null,
    error: null,
    count: null,
  });
}
