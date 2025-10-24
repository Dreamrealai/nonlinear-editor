/**
 * Tests for POST /api/admin/change-tier - Admin Change User Tier
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/change-tier/route';
import {
  createMockSupabaseClient,
  createMockUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

jest.mock('@/lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAdminAuth: jest.fn((handler) => async (req: NextRequest) => {
    const mockUser = createMockUser({ id: 'admin-123', email: 'admin@example.com' });
    return handler(req, { user: mockUser, supabase: null });
  }),
  logAdminAction: jest.fn(),
}));

jest.mock('@/lib/api/response', () => ({
  validationError: jest.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  forbiddenResponse: jest.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 403 })),
  errorResponse: jest.fn((msg, status) => new Response(JSON.stringify({ error: msg }), { status })),
  successResponse: jest.fn(() => new Response(JSON.stringify({ success: true }), { status: 200 })),
}));

jest.mock('@/lib/services/userService', () => ({
  UserService: jest.fn().mockImplementation(() => ({
    getUserProfile: jest.fn().mockResolvedValue({ tier: 'free' }),
    updateUserTier: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/lib/cacheInvalidation', () => ({
  invalidateUserProfile: jest.fn(),
}));

describe('POST /api/admin/change-tier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation', () => {
    it('should return 400 for missing userId', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/change-tier', {
        method: 'POST',
        body: JSON.stringify({ tier: 'premium' }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid tier', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/change-tier', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-123-valid-uuid', tier: 'invalid' }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
    });
  });

  describe('Security', () => {
    it('should prevent admin from changing own tier', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/change-tier', {
        method: 'POST',
        body: JSON.stringify({ userId: 'admin-123', tier: 'premium' }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(403);
    });
  });

  describe('Success Cases', () => {
    it('should change user tier successfully', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/change-tier', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-456-valid-uuid', tier: 'premium' }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
    });
  });
});
