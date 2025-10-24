/**
 * Tests for Authentication Middleware
 *
 * @module __tests__/lib/api/withAuth.test
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withAuth,
  withAdminAuth,
  logAdminAction,
  getRateLimitIdentifier,
  type AuthContext,
} from '@/lib/api/withAuth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';
import { HttpStatusCode } from '@/lib/errors/errorCodes';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/serverLogger');
jest.mock('@/lib/auditLog');
jest.mock('@/lib/rateLimit');

const mockCreateServerSupabaseClient = createServerSupabaseClient as jest.MockedFunction<
  typeof createServerSupabaseClient
>;

describe('withAuth Middleware', () => {
  let mockSupabase: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Mock server logger
    (serverLogger.info as jest.Mock) = jest.fn();
    (serverLogger.warn as jest.Mock) = jest.fn();
    (serverLogger.error as jest.Mock) = jest.fn();
    (serverLogger.debug as jest.Mock) = jest.fn();
    (serverLogger.child as jest.Mock) = jest.fn(() => serverLogger);

    // Create mock request
    mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
    });
  });

  describe('Authentication', () => {
    it('should authenticate valid user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const wrappedHandler = withAuth(handler, { route: '/api/test' });
      const response = await wrappedHandler(mockRequest, {
        params: Promise.resolve({}),
      });

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({
          user: mockUser,
          supabase: mockSupabase,
        })
      );
      expect(response.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const handler = jest.fn();
      const wrappedHandler = withAuth(handler, { route: '/api/test' });
      const response = await wrappedHandler(mockRequest, {
        params: Promise.resolve({}),
      });

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(HttpStatusCode.UNAUTHORIZED);

      const body = await response.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should reject request with auth error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const handler = jest.fn();
      const wrappedHandler = withAuth(handler, { route: '/api/test' });
      const response = await wrappedHandler(mockRequest, {
        params: Promise.resolve({}),
      });

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(HttpStatusCode.UNAUTHORIZED);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting when configured', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock rate limit module
      const mockCheckRateLimit = jest.fn().mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        resetAt: Date.now() + 60000,
      });

      jest.doMock('@/lib/rateLimit', () => ({
        checkRateLimit: mockCheckRateLimit,
      }));

      const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const wrappedHandler = withAuth(handler, {
        route: '/api/test',
        rateLimit: { max: 10, windowMs: 60000 },
      });

      const response = await wrappedHandler(mockRequest, {
        params: Promise.resolve({}),
      });

      expect(response.status).toBe(200);
    });

    it('should reject request when rate limit exceeded', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockCheckRateLimit = jest.fn().mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        resetAt: Date.now() + 60000,
      });

      jest.doMock('@/lib/rateLimit', () => ({
        checkRateLimit: mockCheckRateLimit,
      }));

      const handler = jest.fn();
      const wrappedHandler = withAuth(handler, {
        route: '/api/test',
        rateLimit: { max: 10, windowMs: 60000 },
      });

      await wrappedHandler(mockRequest, { params: Promise.resolve({}) });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle handler exceptions gracefully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const handler = jest.fn().mockRejectedValue(new Error('Test error'));
      const wrappedHandler = withAuth(handler, { route: '/api/test' });

      const response = await wrappedHandler(mockRequest, {
        params: Promise.resolve({}),
      });

      expect(response.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
      const body = await response.json();
      expect(body).toEqual({ error: 'Internal server error' });
    });

    it('should log error details on exception', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const testError = new Error('Test error');
      const handler = jest.fn().mockRejectedValue(testError);
      const wrappedHandler = withAuth(handler, { route: '/api/test' });

      await wrappedHandler(mockRequest, { params: Promise.resolve({}) });

      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'api.exception',
          route: '/api/test',
          method: 'POST',
        }),
        expect.any(String)
      );
    });
  });

  describe('Logging', () => {
    it('should log request start', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const wrappedHandler = withAuth(handler, { route: '/api/test' });
      await wrappedHandler(mockRequest, { params: Promise.resolve({}) });

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'api.request',
          route: '/api/test',
          method: 'POST',
        }),
        expect.any(String)
      );
    });

    it('should log successful response', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const handler = jest
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true }, { status: 200 }));

      const wrappedHandler = withAuth(handler, { route: '/api/test' });
      await wrappedHandler(mockRequest, { params: Promise.resolve({}) });

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'api.success',
          status: 200,
        }),
        expect.any(String)
      );
    });

    it('should create child logger with user context', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const wrappedHandler = withAuth(handler, { route: '/api/test' });
      await wrappedHandler(mockRequest, { params: Promise.resolve({}) });

      expect(serverLogger.child).toHaveBeenCalledWith({
        userId: 'user-123',
        userEmail: 'test@example.com',
        route: '/api/test',
      });
    });
  });

  describe('Async Params Handling', () => {
    it('should handle Next.js 15 async params', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const testParams = { id: 'test-id' };
      const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const wrappedHandler = withAuth<typeof testParams>(handler, {
        route: '/api/test',
      });

      await wrappedHandler(mockRequest, {
        params: Promise.resolve(testParams),
      });

      expect(handler).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({
          params: testParams,
        })
      );
    });
  });
});

describe('withAdminAuth Middleware', () => {
  let mockSupabase: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase);

    mockRequest = new NextRequest('http://localhost:3000/api/admin/test', {
      method: 'POST',
    });
  });

  it('should allow admin user', async () => {
    const mockUser = { id: 'admin-123', email: 'admin@example.com' };
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'admin-123', tier: 'admin' },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

    const wrappedHandler = withAdminAuth(handler, { route: '/api/admin/test' });
    const response = await wrappedHandler(mockRequest, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      mockRequest,
      expect.objectContaining({
        user: mockUser,
        adminProfile: { id: 'admin-123', tier: 'admin' },
      })
    );
  });

  it('should reject non-admin user', async () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' };
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'user-123', tier: 'free' },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const handler = jest.fn();
    const wrappedHandler = withAdminAuth(handler, { route: '/api/admin/test' });
    const response = await wrappedHandler(mockRequest, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(HttpStatusCode.FORBIDDEN);
    expect(handler).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body).toEqual({ error: 'Admin access required' });
  });

  it('should handle admin check error', async () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' };
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const handler = jest.fn();
    const wrappedHandler = withAdminAuth(handler, { route: '/api/admin/test' });
    const response = await wrappedHandler(mockRequest, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(HttpStatusCode.FORBIDDEN);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('logAdminAction', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(),
    };
  });

  it('should log admin action successfully', async () => {
    const mockQuery = {
      insert: jest.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    await logAdminAction(mockSupabase, 'delete_user', 'admin-123', 'user-456', {
      reason: 'violation',
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('admin_audit_log');
    expect(mockQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'delete_user',
        admin_id: 'admin-123',
        target_user_id: 'user-456',
        details: { reason: 'violation' },
      })
    );
  });

  it('should handle database insert error', async () => {
    const mockQuery = {
      insert: jest.fn().mockResolvedValue({
        error: { message: 'Insert failed' },
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    await logAdminAction(mockSupabase, 'delete_user', 'admin-123', 'user-456', {});

    expect(serverLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'admin.audit_log_failed',
      }),
      expect.any(String)
    );
  });

  it('should handle exception', async () => {
    mockSupabase.from.mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    await logAdminAction(mockSupabase, 'delete_user', 'admin-123', 'user-456', {});

    expect(serverLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'admin.audit_log_exception',
      }),
      expect.any(String)
    );
  });
});
