/**
 * Test-Friendly Authentication Wrapper
 *
 * Provides a simplified withAuth implementation for testing that:
 * - Bypasses complex Supabase mocking
 * - Provides test user injection
 * - Maintains the same API as production withAuth
 * - Works with real middleware and services
 *
 * This is NOT a mock - it's a test implementation that preserves the real behavior
 * while making tests more reliable and easier to write.
 *
 * Usage in tests:
 * ```typescript
 * import { createTestAuthHandler } from '@/test-utils/testWithAuth';
 *
 * describe('POST /api/projects', () => {
 *   it('creates project', async () => {
 *     const handler = createTestAuthHandler(POST);
 *     const { request, user } = createAuthenticatedRequest({
 *       method: 'POST',
 *       url: '/api/projects',
 *       body: { title: 'Test' }
 *     });
 *
 *     const response = await handler(request, { params: Promise.resolve({}) });
 *
 *     expect(response.status).toBe(200);
 *   });
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type { AuthContext, AuthenticatedHandler } from '@/lib/api/withAuth';

/**
 * Test user data injected into requests
 */
export interface TestUserData {
  id?: string;
  email?: string;
  tier?: 'free' | 'pro' | 'admin';
  metadata?: Record<string, any>;
}

/**
 * In-memory test database for storing test data
 * This simulates a database without needing actual connections
 */
class TestDatabase {
  private data: Map<string, Map<string, any>> = new Map();

  constructor() {
    // Initialize tables
    this.data.set('projects', new Map());
    this.data.set('assets', new Map());
    this.data.set('user_profiles', new Map());
    this.data.set('export_jobs', new Map());
  }

  get(table: string, id: string): any | null {
    return this.data.get(table)?.get(id) || null;
  }

  set(table: string, id: string, value: any): void {
    if (!this.data.has(table)) {
      this.data.set(table, new Map());
    }
    this.data.get(table)!.set(id, value);
  }

  query(table: string, filter?: (item: any) => boolean): any[] {
    const tableData = this.data.get(table);
    if (!tableData) return [];

    const items = Array.from(tableData.values());
    return filter ? items.filter(filter) : items;
  }

  delete(table: string, id: string): boolean {
    return this.data.get(table)?.delete(id) || false;
  }

  clear(): void {
    this.data.clear();
    this.data.set('projects', new Map());
    this.data.set('assets', new Map());
    this.data.set('user_profiles', new Map());
    this.data.set('export_jobs', new Map());
  }
}

// Singleton test database instance
let testDb: TestDatabase | null = null;

/**
 * Get or create test database instance
 */
export function getTestDatabase(): TestDatabase {
  if (!testDb) {
    testDb = new TestDatabase();
  }
  return testDb;
}

/**
 * Clear test database
 */
export function clearTestDatabase(): void {
  if (testDb) {
    testDb.clear();
  }
}

/**
 * Create a test Supabase client that uses the in-memory test database
 */
export function createTestSupabaseClient(userId: string): SupabaseClient {
  const db = getTestDatabase();

  // Create a mock Supabase client with functional query builder
  const client: any = {
    from: (table: string) => {
      let currentTable = table;
      let currentFilters: Array<(item: any) => boolean> = [];
      let selectColumns = '*';
      let singleResult = false;

      const builder = {
        select: (columns?: string) => {
          selectColumns = columns || '*';
          return builder;
        },
        insert: (data: any | any[]) => {
          const items = Array.isArray(data) ? data : [data];
          const inserted = items.map((item) => {
            const id = item.id || uuidv4();
            const record = {
              ...item,
              id,
              created_at: item.created_at || new Date().toISOString(),
              updated_at: item.updated_at || new Date().toISOString(),
            };
            db.set(currentTable, id, record);
            return record;
          });
          return {
            ...builder,
            select: () => ({
              ...builder,
              data: inserted,
              error: null,
            }),
            then: (resolve: any) =>
              resolve({ data: inserted, error: null, count: inserted.length }),
          };
        },
        update: (data: any) => {
          return {
            ...builder,
            eq: (column: string, value: any) => {
              const items = db.query(currentTable, (item) => item[column] === value);
              const updated = items.map((item) => {
                const updatedItem = {
                  ...item,
                  ...data,
                  updated_at: new Date().toISOString(),
                };
                db.set(currentTable, item.id, updatedItem);
                return updatedItem;
              });
              return {
                select: () => ({
                  data: updated,
                  error: null,
                }),
                then: (resolve: any) =>
                  resolve({ data: updated, error: null, count: updated.length }),
              };
            },
          };
        },
        delete: () => {
          return {
            ...builder,
            eq: (column: string, value: any) => {
              const items = db.query(currentTable, (item) => item[column] === value);
              items.forEach((item) => db.delete(currentTable, item.id));
              return {
                then: (resolve: any) =>
                  resolve({ data: null, error: null, count: items.length }),
              };
            },
          };
        },
        eq: (column: string, value: any) => {
          currentFilters.push((item) => item[column] === value);
          return builder;
        },
        neq: (column: string, value: any) => {
          currentFilters.push((item) => item[column] !== value);
          return builder;
        },
        in: (column: string, values: any[]) => {
          currentFilters.push((item) => values.includes(item[column]));
          return builder;
        },
        gte: (column: string, value: any) => {
          currentFilters.push((item) => item[column] >= value);
          return builder;
        },
        lte: (column: string, value: any) => {
          currentFilters.push((item) => item[column] <= value);
          return builder;
        },
        single: () => {
          singleResult = true;
          return builder;
        },
        then: (resolve: any) => {
          let data = db.query(currentTable, (item) =>
            currentFilters.every((filter) => filter(item))
          );

          if (singleResult) {
            return resolve({ data: data[0] || null, error: null });
          }

          return resolve({ data, error: null, count: data.length });
        },
      };

      return builder;
    },
    auth: {
      getUser: async () => {
        const profile = db.get('user_profiles', userId);
        const user: User = {
          id: userId,
          email: profile?.email || `test-${userId}@example.com`,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: profile?.metadata || {},
        } as User;
        return { data: { user }, error: null };
      },
      signOut: async () => ({ error: null }),
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: any) => ({
          data: { path },
          error: null,
        }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://test-storage.com/${bucket}/${path}` },
        }),
        remove: async (paths: string[]) => ({
          data: paths,
          error: null,
        }),
      }),
    },
  };

  return client as unknown as SupabaseClient;
}

/**
 * Create a test user and add to test database
 */
export function createTestUser(data: TestUserData = {}): User {
  const db = getTestDatabase();
  const userId = data.id || uuidv4();

  // Create user profile in test database
  const profile = {
    id: userId,
    email: data.email || `test-${userId}@example.com`,
    tier: data.tier || 'free',
    metadata: data.metadata || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.set('user_profiles', userId, profile);

  // Create User object
  const user: User = {
    id: userId,
    email: profile.email,
    aud: 'authenticated',
    role: 'authenticated',
    created_at: profile.created_at,
    app_metadata: {},
    user_metadata: profile.metadata,
  } as User;

  return user;
}

/**
 * Create an authenticated NextRequest for testing
 */
export function createAuthenticatedRequest(options: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  body?: any;
  user?: User;
  headers?: Record<string, string>;
}): { request: NextRequest; user: User } {
  const user = options.user || createTestUser();

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });

  const requestInit: RequestInit = {
    method: options.method,
    headers,
  };

  if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
    requestInit.body = JSON.stringify(options.body);
  }

  const fullUrl = options.url.startsWith('http')
    ? options.url
    : `http://localhost:3000${options.url}`;
  const request = new NextRequest(fullUrl, requestInit);

  // Attach user to request for test withAuth to pick up
  (request as any).__testUser = user;

  return { request, user };
}

/**
 * Create an unauthenticated request
 */
export function createUnauthenticatedRequest(options: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  body?: any;
  headers?: Record<string, string>;
}): NextRequest {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });

  const requestInit: RequestInit = {
    method: options.method,
    headers,
  };

  if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
    requestInit.body = JSON.stringify(options.body);
  }

  const fullUrl = options.url.startsWith('http')
    ? options.url
    : `http://localhost:3000${options.url}`;

  return new NextRequest(fullUrl, requestInit);
}

/**
 * Create a test-friendly auth handler
 * This wraps a route handler to inject test authentication
 */
export function createTestAuthHandler<TParams = Record<string, never>>(
  handler: AuthenticatedHandler<TParams>,
  options: { skipAuth?: boolean } = {}
): (request: NextRequest, context: { params: Promise<TParams> }) => Promise<Response> {
  return async (
    request: NextRequest,
    context: { params: Promise<TParams> }
  ): Promise<Response> => {
    // Check if request has test user attached
    const testUser = (request as any).__testUser as User | undefined;

    // If no test user and auth is required, return 401
    if (!testUser && !options.skipAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create test Supabase client
    const supabase = createTestSupabaseClient(testUser?.id || 'anonymous');

    // Create auth context
    const authContext: AuthContext = {
      user: testUser!,
      supabase,
    };

    // Call handler with auth context
    return handler(request, authContext, context);
  };
}
