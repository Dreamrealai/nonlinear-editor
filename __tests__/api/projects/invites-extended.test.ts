/**
 * Extended Tests for Project Invites API
 * Adds additional coverage to existing test suite
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/projects/[projectId]/invites/route';
import { DELETE } from '@/app/api/projects/[projectId]/invites/[inviteId]/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

// Mock withAuth wrapper
jest.mock(
  '@/lib/api/withAuth',
  (): Record<string, unknown> => ({
    withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      return handler(req, { user, supabase, params: context?.params || {} });
    }),
  })
);

jest.mock('@/lib/supabase', () => {
  const { createMockSupabaseClient } = jest.requireActual('@/__tests__/helpers/apiMocks');
  return {
    createServerSupabaseClient: jest.fn(async () => createMockSupabaseClient()),
    ensureHttpsProtocol: jest.fn((url) => url),
  };
});

jest.mock(
  '@/lib/rateLimit',
  (): Record<string, unknown> => ({
    checkRateLimit: jest.fn().mockResolvedValue({ success: true }),
    RATE_LIMITS: { tier3_status_read: { max: 20, windowMs: 60000 } },
  })
);
jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
    serverLogger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  })
);

describe('Project Invites - Extended Coverage', () => {
  beforeEach(() => resetAllMocks());

  describe('POST /api/projects/[projectId]/invites', () => {
    it('should return 401 for unauthenticated user', async () => {
      mockUnauthenticatedUser();
      const request = new NextRequest('http://localhost/api/projects/proj-123/invites', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', role: 'editor' }),
      });

      const response = await POST(request, { params: Promise.resolve({ projectId: 'proj-123' }) });
      expect(response.status).toBe(401);
    });

    it('should handle empty body', async () => {
      mockAuthenticatedUser();
      const request = new NextRequest('http://localhost/api/projects/proj-123/invites', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ projectId: 'proj-123' }) });
      expect([400, 500]).toContain(response.status);
    });

    it('should handle missing email', async () => {
      mockAuthenticatedUser();
      const request = new NextRequest('http://localhost/api/projects/proj-123/invites', {
        method: 'POST',
        body: JSON.stringify({ role: 'editor' }),
      });

      const response = await POST(request, { params: Promise.resolve({ projectId: 'proj-123' }) });
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/projects/[projectId]/invites/[inviteId]', () => {
    it('should return 401 for unauthenticated user', async () => {
      mockUnauthenticatedUser();
      const request = new NextRequest('http://localhost/api/projects/proj-123/invites/invite-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ projectId: 'proj-123', inviteId: 'invite-123' }),
      });
      expect(response.status).toBe(401);
    });

    it('should handle invalid inviteId format', async () => {
      mockAuthenticatedUser();
      const request = new NextRequest('http://localhost/api/projects/proj-123/invites/invalid-id', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ projectId: 'proj-123', inviteId: 'invalid-id' }),
      });
      expect([400, 404, 500]).toContain(response.status);
    });
  });
});
