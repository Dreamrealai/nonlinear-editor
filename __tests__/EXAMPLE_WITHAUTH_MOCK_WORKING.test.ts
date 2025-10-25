/**
 * EXAMPLE: Working withAuth mock pattern
 *
 * This test demonstrates the CORRECT way to mock withAuth for API route testing.
 * Copy this pattern when writing new API route tests.
 *
 * KEY POINTS:
 * 1. All mocks must be defined inline in jest.mock() factory functions
 * 2. The withAuth mock must handle both 2-param and 3-param handler signatures
 * 3. Use beforeEach to CONFIGURE mocks, not create them
 * 4. Import routes AFTER all mocks are defined (Jest hoists anyway, but for clarity)
 */

import { NextRequest } from 'next/server';

/**
 * Mock withAuth - handles both handler signatures automatically
 * - 2-param: handler(request, authContext) - for static routes
 * - 3-param: handler(request, authContext, routeContext) - for dynamic routes
 */
jest.mock(
  '@/lib/api/withAuth',
  (): Record<string, unknown> => ({
    withAuth: (handler: any) => async (req: any, context: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      const authContext = { user, supabase };

      // Determine handler signature based on presence of params
      if (context?.params !== undefined) {
        // 3-param: dynamic route like /api/projects/[projectId]
        const routeContext = { params: context.params };
        return handler(req, authContext, routeContext);
      } else {
        // 2-param: static route like /api/projects
        return handler(req, authContext);
      }
    },
  })
);

/**
 * Mock Supabase - will be configured in beforeEach
 */
jest.mock(
  '@/lib/supabase',
  (): Record<string, unknown> => ({
    createServerSupabaseClient: jest.fn(),
  })
);

/**
 * Mock serverLogger - inline definition
 */
jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
    serverLogger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      child: jest.fn(
        (): Record<string, unknown> => ({
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn(),
        })
      ),
    },
  })
);

/**
 * Mock rate limiting
 */
jest.mock(
  '@/lib/rateLimit',
  (): Record<string, unknown> => ({
    RATE_LIMITS: {
      tier3_status_read: { requests: 60, window: 60 },
      tier2_resource_creation: { requests: 10, window: 60 },
    },
  })
);

/**
 * Mock audit log
 */
jest.mock(
  '@/lib/auditLog',
  (): Record<string, unknown> => ({
    auditSecurityEvent: jest.fn().mockResolvedValue(undefined),
    auditRateLimitViolation: jest.fn().mockResolvedValue(undefined),
    AuditAction: { SECURITY_UNAUTHORIZED_ACCESS: 'security.unauthorized_access' },
  })
);

/**
 * Mock BackupService (example)
 */
jest.mock(
  '@/lib/services/backupService',
  (): Record<string, unknown> => ({
    BackupService: jest.fn().mockImplementation(() => ({
      listBackups: jest.fn().mockResolvedValue([
        {
          id: 'backup-1',
          created_at: '2024-01-01',
          backup_type: 'manual',
          backup_name: 'Test Backup',
        },
      ]),
      createBackup: jest.fn().mockResolvedValue({ id: 'new-backup', created_at: '2024-01-02' }),
    })),
  })
);

// Import routes AFTER all mocks (Jest hoists mocks anyway, but this is clearer)
import { GET } from '@/app/api/projects/[projectId]/backups/route';

describe('EXAMPLE: withAuth Mock Pattern', () => {
  const validProjectId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach((): void => {
    jest.clearAllMocks();

    // Configure Supabase mock (created in jest.mock above)
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null }, // No user = 401
          error: null,
        }),
      },
    });
  });

  describe('Unauthenticated requests', () => {
    it('should return 401 when user is not authenticated', async () => {
      const request = new NextRequest(`http://localhost/api/projects/${validProjectId}/backups`);
      const context = { params: Promise.resolve({ projectId: validProjectId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Authenticated requests', () => {
    beforeEach((): void => {
      // Reconfigure mock for authenticated user
      const { createServerSupabaseClient } = require('@/lib/supabase');
      createServerSupabaseClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
              },
            },
            error: null,
          }),
        },
      });
    });

    it('should list backups for authenticated user', async () => {
      const request = new NextRequest(`http://localhost/api/projects/${validProjectId}/backups`);
      const context = { params: Promise.resolve({ projectId: validProjectId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.backups).toBeDefined();
      expect(Array.isArray(data.backups)).toBe(true);
    });
  });
});
