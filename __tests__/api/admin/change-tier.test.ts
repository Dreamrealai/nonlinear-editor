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

jest.mock('@/lib/supabase', (): Record<string, unknown> => ({
  createServiceSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/serverLogger', (): Record<string, unknown> => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440001';

jest.mock('@/lib/api/withAuth', (): Record<string, unknown> => ({
  withAdminAuth: jest.fn((handler) => async (req: NextRequest) => {
    const mockUser = createMockUser({ id: ADMIN_ID, email: 'admin@example.com' });
    return handler(req, { user: mockUser, supabase: null });
  }),
  logAdminAction: jest.fn(),
}));

// Mock API response helpers - use actual implementation, only mock wrapper
jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    withErrorHandling: jest.fn((handler) => handler),
  };
});

jest.mock('@/lib/services/userService', (): Record<string, unknown> => ({
  UserService: jest.fn().mockImplementation(() => ({
    getUserProfile: jest.fn().mockResolvedValue({ tier: 'free' }),
    updateUserTier: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/lib/cacheInvalidation', (): Record<string, unknown> => ({
  invalidateUserProfile: jest.fn(),
}));

describe('POST /api/admin/change-tier', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Validation', () => {
    it('should return 400 for missing userId', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/change-tier', {
        method: 'POST',
        body: JSON.stringify({ tier: 'premium' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid tier', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/change-tier', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-123-valid-uuid', tier: 'invalid' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });
  });

  describe('Security', () => {
    it('should prevent admin from changing own tier', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/change-tier', {
        method: 'POST',
        body: JSON.stringify({ userId: ADMIN_ID, tier: 'premium' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      if (response.status !== 403) {
        const error = await response.json();
        console.log('Expected 403, got:', response.status, error);
      }
      expect(response.status).toBe(403);
    });
  });

  describe('Success Cases', () => {
    it('should change user tier successfully', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/change-tier', {
        method: 'POST',
        body: JSON.stringify({ userId: OTHER_USER_ID, tier: 'premium' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      if (response.status !== 200) {
        const error = await response.json();
        console.log('Expected 200, got:', response.status, error);
      }
      expect(response.status).toBe(200);
    });
  });
});
