/**
 * Debug test to trace where the timeout is happening
 */

import { NextRequest } from 'next/server';

// Mock Supabase - factory function must create the mock inline
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  }),
}));

// Mock serverLogger
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn((...args) => console.log('[SERVER LOGGER INFO]', ...args)),
    error: jest.fn((...args) => console.log('[SERVER LOGGER ERROR]', ...args)),
    warn: jest.fn((...args) => console.log('[SERVER LOGGER WARN]', ...args)),
    debug: jest.fn((...args) => console.log('[SERVER LOGGER DEBUG]', ...args)),
    child: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));

// Mock rateLimit
jest.mock('@/lib/rateLimit', () => ({
  RATE_LIMITS: {
    tier3_status_read: { requests: 60, window: 60 },
  },
}));

// Mock auditLog
jest.mock('@/lib/auditLog', () => ({
  auditSecurityEvent: jest.fn((...args) => {
    console.log('[AUDIT EVENT]', ...args);
    return Promise.resolve();
  }),
  auditRateLimitViolation: jest.fn().mockResolvedValue(undefined),
  AuditAction: { SECURITY_UNAUTHORIZED_ACCESS: 'security.unauthorized_access' },
}));

// Mock BackupService
jest.mock('@/lib/services/backupService', () => ({
  BackupService: jest.fn().mockImplementation(() => ({
    listBackups: jest.fn().mockResolvedValue([]),
  })),
}));

// Mock withAuth with detailed logging
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any, options: any) => {
    console.log('[MOCK] withAuth called with options:', options);
    return async (req: any, context: any) => {
      console.log('[MOCK] Wrapped handler called, context:', context);
      const { createServerSupabaseClient } = require('@/lib/supabase');
      console.log('[MOCK] Getting Supabase client...');
      const supabase = await createServerSupabaseClient();
      console.log('[MOCK] Got Supabase client:', supabase);
      console.log('[MOCK] supabase.auth:', supabase.auth);
      console.log('[MOCK] supabase.auth.getUser:', supabase.auth.getUser);

      console.log('[MOCK] Getting user...');
      const getUserResult = supabase.auth.getUser();
      console.log('[MOCK] getUserResult:', getUserResult);
      const resolvedResult = await getUserResult;
      console.log('[MOCK] resolvedResult:', resolvedResult);
      const {
        data: { user },
      } = resolvedResult;
      console.log('[MOCK] Got user:', user);

      if (!user) {
        console.log('[MOCK] No user, returning 401');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      const authContext = { user, supabase };

      // Check if this is a dynamic route (has params)
      if (context?.params !== undefined) {
        console.log('[MOCK] Dynamic route, calling handler with 3 params');
        const routeContext = { params: context.params };
        return handler(req, authContext, routeContext);
      } else {
        console.log('[MOCK] Static route, calling handler with 2 params');
        return handler(req, authContext);
      }
    };
  },
}));

// Now import the route
import { GET } from '@/app/api/projects/[projectId]/backups/route';

describe('Debug Backups Test', () => {
  it('should return 401 when not authenticated', async () => {
    console.log('[TEST] Starting test...');
    const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
    console.log('[TEST] Creating request...');
    const request = new NextRequest(`http://localhost/api/projects/${validProjectId}/backups`);
    const context = { params: Promise.resolve({ projectId: validProjectId }) };

    console.log('[TEST] Calling GET...');
    const response = await GET(request, context);
    console.log('[TEST] Got response:', response.status);

    expect(response.status).toBe(401);
  });
});
