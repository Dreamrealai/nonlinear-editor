/**
 * API Mock Helpers
 * Re-exports from test-utils for backward compatibility
 */

import { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

/**
 * Creates a mock NextRequest for testing API routes
 */
export function createMockRequest(options: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}): NextRequest {
  const { url, method = 'GET', headers = {}, body } = options;

  // Ensure absolute URL for NextRequest
  const absoluteUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;

  return new NextRequest(absoluteUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Creates a mock Supabase client for testing
 */
export function createMockSupabaseClient(): any {
  const mockClient = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      rangeGt: jest.fn().mockReturnThis(),
      rangeGte: jest.fn().mockReturnThis(),
      rangeLt: jest.fn().mockReturnThis(),
      rangeLte: jest.fn().mockReturnThis(),
      rangeAdjacent: jest.fn().mockReturnThis(),
      overlaps: jest.fn().mockReturnThis(),
      textSearch: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      csv: jest.fn().mockReturnThis(),
      then: jest.fn(),
    }),
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
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/signed' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/public' },
        }),
      }),
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return mockClient;
}

/**
 * Creates a mock user for testing
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
    ...overrides,
  } as User;
}

/**
 * Creates a mock project for testing
 */
export function createMockProject(overrides?: any): any {
  return {
    id: 'test-project-id',
    user_id: 'test-user-id',
    title: 'Test Project',
    description: null,
    timeline_state_jsonb: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mocks an authenticated user in the Supabase client
 */
export function mockAuthenticatedUser(
  supabaseClient: any,
  user?: Partial<User>
): User {
  const mockUser = createMockUser(user);

  supabaseClient.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });

  supabaseClient.auth.getSession.mockResolvedValue({
    data: {
      session: {
        user: mockUser,
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
      },
    },
    error: null,
  });

  return mockUser;
}

/**
 * Mocks an unauthenticated user in the Supabase client
 */
export function mockUnauthenticatedUser(supabaseClient: any): void {
  supabaseClient.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });

  supabaseClient.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
}

/**
 * Mocks a successful query result
 */
export function mockQuerySuccess(supabaseClient: any, data: any): void {
  const mockQuery = supabaseClient.from();

  // Make the query chainable
  Object.keys(mockQuery).forEach((key) => {
    if (typeof mockQuery[key] === 'function' && key !== 'then') {
      mockQuery[key].mockReturnValue(mockQuery);
    }
  });

  // Mock the final resolution
  mockQuery.then.mockImplementation((resolve: any) => {
    resolve({ data, error: null });
    return Promise.resolve({ data, error: null });
  });
}

/**
 * Mocks a query error
 */
export function mockQueryError(supabaseClient: any, error: any): void {
  const mockQuery = supabaseClient.from();

  // Make the query chainable
  Object.keys(mockQuery).forEach((key) => {
    if (typeof mockQuery[key] === 'function' && key !== 'then') {
      mockQuery[key].mockReturnValue(mockQuery);
    }
  });

  // Mock the final resolution with error
  mockQuery.then.mockImplementation((resolve: any) => {
    resolve({ data: null, error });
    return Promise.resolve({ data: null, error });
  });
}

/**
 * Resets all mocks
 */
export function resetAllMocks(): void {
  jest.clearAllMocks();
  jest.restoreAllMocks();
}
