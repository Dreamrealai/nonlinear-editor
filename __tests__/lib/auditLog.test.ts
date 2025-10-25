/**
 * Tests for lib/auditLog.ts - Audit Logging System
 *
 * Tests cover:
 * - Main audit logging function
 * - Helper functions for different event types
 * - IP address and user agent extraction
 * - Retry logic and error handling
 * - Query and stats functions
 * - Supabase availability handling
 */

import {
  auditLog,
  auditAuthEvent,
  auditRateLimitViolation,
  auditAdminAction,
  auditProjectOperation,
  auditAssetOperation,
  auditPaymentOperation,
  auditSecurityEvent,
  queryAuditLogs,
  getAuditLogStats,
  AuditAction,
  AuditLogEntry,
} from '@/lib/auditLog';
import { serverLogger } from '@/lib/serverLogger';
import { createServiceSupabaseClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/serverLogger');
jest.mock('@/lib/supabase');

describe('lib/auditLog: Audit Logging System', () => {
  let mockSupabase: any;
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    (createServiceSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);
    (isSupabaseServiceConfigured as jest.Mock).mockReturnValue(true);

    // Mock request object
    mockRequest = {
      headers: new Headers({
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0 Test Browser',
      }),
      method: 'POST',
      nextUrl: {
        pathname: '/api/test',
      } as any,
    };
  });

  describe('auditLog: Success Cases', () => {
    it('should log audit entry with all fields', async () => {
      mockSupabase.insert.mockResolvedValue({ error: null });

      const entry: AuditLogEntry = {
        userId: 'user-123',
        action: AuditAction.PROJECT_CREATE,
        resourceType: 'project',
        resourceId: 'project-456',
        metadata: { title: 'Test Project' },
        request: mockRequest as NextRequest,
        statusCode: 200,
        durationMs: 150,
      };

      await auditLog(entry);

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'project.create',
          resource_type: 'project',
          resource_id: 'project-456',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 Test Browser',
          http_method: 'POST',
          request_path: '/api/test',
          status_code: 200,
          duration_ms: 150,
          metadata: { title: 'Test Project' },
        })
      );

      expect(serverLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'audit.log.success',
          action: 'project.create',
          userId: 'user-123',
        }),
        expect.stringContaining('Audit log recorded')
      );
    });

    it('should log audit entry without optional fields', async () => {
      mockSupabase.insert.mockResolvedValue({ error: null });

      const entry: AuditLogEntry = {
        userId: null,
        action: AuditAction.AUTH_LOGIN_FAILED,
      };

      await auditLog(entry);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          action: 'auth.login.failed',
          resource_type: null,
          resource_id: null,
          ip_address: 'unknown',
          user_agent: 'unknown',
        })
      );
    });

    it('should extract IP address from x-forwarded-for header', async () => {
      mockSupabase.insert.mockResolvedValue({ error: null });

      mockRequest.headers = new Headers({
        'x-forwarded-for': '203.0.113.1, 198.51.100.1',
        'user-agent': 'Test',
      });

      await auditLog({
        userId: 'user-123',
        action: AuditAction.PROJECT_CREATE,
        request: mockRequest as NextRequest,
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '203.0.113.1',
        })
      );
    });

    it('should extract IP address from x-real-ip header', async () => {
      mockSupabase.insert.mockResolvedValue({ error: null });

      mockRequest.headers = new Headers({
        'x-real-ip': '203.0.113.1',
        'user-agent': 'Test',
      });

      await auditLog({
        userId: 'user-123',
        action: AuditAction.PROJECT_CREATE,
        request: mockRequest as NextRequest,
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '203.0.113.1',
        })
      );
    });

    it('should extract IP address from cf-connecting-ip header (Cloudflare)', async () => {
      mockSupabase.insert.mockResolvedValue({ error: null });

      mockRequest.headers = new Headers({
        'cf-connecting-ip': '203.0.113.1',
        'user-agent': 'Test',
      });

      await auditLog({
        userId: 'user-123',
        action: AuditAction.PROJECT_CREATE,
        request: mockRequest as NextRequest,
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '203.0.113.1',
        })
      );
    });

    it('should use manual IP address when provided', async () => {
      mockSupabase.insert.mockResolvedValue({ error: null });

      await auditLog({
        userId: 'user-123',
        action: AuditAction.PROJECT_CREATE,
        ipAddress: '10.0.0.1',
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '10.0.0.1',
        })
      );
    });
  });

  describe('auditLog: Retry Logic', () => {
    it('should retry on transient database errors', async () => {
      jest.useFakeTimers();

      mockSupabase.insert
        .mockResolvedValueOnce({ error: { message: 'Connection timeout', code: 'ETIMEDOUT' } })
        .mockResolvedValueOnce({ error: { message: 'Temporary error', code: '40001' } })
        .mockResolvedValueOnce({ error: null });

      const promise = auditLog({
        userId: 'user-123',
        action: AuditAction.PROJECT_CREATE,
      });

      // Fast-forward through retry delays
      jest.runAllTimers();

      await promise;

      expect(mockSupabase.insert).toHaveBeenCalledTimes(3);
      expect(serverLogger.warn).toHaveBeenCalledTimes(2);
      expect(serverLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'audit.log.success',
          retries: 2,
        }),
        expect.any(String)
      );

      jest.useRealTimers();
    });

    it('should not retry on non-retryable errors (permission denied)', async () => {
      mockSupabase.insert.mockResolvedValue({
        error: { message: 'Permission denied', code: '42501' },
      });

      await auditLog({
        userId: 'user-123',
        action: AuditAction.PROJECT_CREATE,
      });

      expect(mockSupabase.insert).toHaveBeenCalledTimes(1);
      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'audit.log.non_retryable_error',
        }),
        expect.any(String)
      );
    });

    it('should not retry on undefined_table error', async () => {
      mockSupabase.insert.mockResolvedValue({
        error: { message: 'Table does not exist', code: '42P01' },
      });

      await auditLog({
        userId: 'user-123',
        action: AuditAction.PROJECT_CREATE,
      });

      expect(mockSupabase.insert).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      jest.useFakeTimers();

      mockSupabase.insert.mockResolvedValue({
        error: { message: 'Database error', code: '40001' },
      });

      const promise = auditLog({
        userId: 'user-123',
        action: AuditAction.PROJECT_CREATE,
      });

      jest.runAllTimers();

      await promise;

      // Should try 4 times (initial + 3 retries)
      expect(mockSupabase.insert).toHaveBeenCalledTimes(4);
      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'audit.log.insert_failed',
        }),
        expect.any(String)
      );

      jest.useRealTimers();
    });
  });

  describe('auditLog: Supabase Unavailable', () => {
    it('should log warning when Supabase is not configured', async () => {
      (isSupabaseServiceConfigured as jest.Mock).mockReturnValue(false);

      await auditLog({
        userId: 'user-123',
        action: AuditAction.PROJECT_CREATE,
      });

      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'audit.log.supabase_unavailable',
        }),
        expect.any(String)
      );

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'audit.log.fallback',
        }),
        expect.any(String)
      );

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('auditLog: Error Handling', () => {
    it('should catch and log exceptions', async () => {
      (createServiceSupabaseClient as jest.Mock).mockImplementation(() => {
        throw new Error('Supabase client creation failed');
      });

      await auditLog({
        userId: 'user-123',
        action: AuditAction.PROJECT_CREATE,
      });

      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'audit.log.exception',
        }),
        expect.any(String)
      );
    });
  });

  describe('Helper Functions', () => {
    beforeEach(() => {
      mockSupabase.insert.mockResolvedValue({ error: null });
    });

    it('auditAuthEvent should log authentication event', async () => {
      await auditAuthEvent(AuditAction.AUTH_LOGIN_SUCCESS, 'user-123', mockRequest as NextRequest, {
        provider: 'email',
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'auth.login.success',
          resource_type: 'user',
          resource_id: 'user-123',
          metadata: { provider: 'email' },
        })
      );
    });

    it('auditRateLimitViolation should log rate limit event', async () => {
      await auditRateLimitViolation('user-123', mockRequest as NextRequest, 'api_calls', {
        limit: 100,
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'rate_limit.exceeded',
          metadata: { limitType: 'api_calls', limit: 100 },
          status_code: 429,
        })
      );
    });

    it('auditAdminAction should log admin operation', async () => {
      await auditAdminAction(
        'admin-123',
        AuditAction.ADMIN_TIER_CHANGE,
        'user-456',
        mockRequest as NextRequest,
        { oldTier: 'free', newTier: 'premium' }
      );

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'admin-123',
          action: 'admin.tier_change',
          resource_type: 'user',
          resource_id: 'user-456',
          metadata: { isAdminAction: true, oldTier: 'free', newTier: 'premium' },
        })
      );
    });

    it('auditProjectOperation should log project event', async () => {
      await auditProjectOperation(
        AuditAction.PROJECT_UPDATE,
        'user-123',
        'project-456',
        mockRequest as NextRequest,
        { title: 'Updated Title' }
      );

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'project.update',
          resource_type: 'project',
          resource_id: 'project-456',
          metadata: { title: 'Updated Title' },
        })
      );
    });

    it('auditAssetOperation should log asset event', async () => {
      await auditAssetOperation(
        AuditAction.ASSET_DELETE,
        'user-123',
        'asset-789',
        mockRequest as NextRequest,
        { filename: 'image.png' }
      );

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'asset.delete',
          resource_type: 'asset',
          resource_id: 'asset-789',
          metadata: { filename: 'image.png' },
        })
      );
    });

    it('auditPaymentOperation should log payment event', async () => {
      await auditPaymentOperation(
        AuditAction.PAYMENT_CHECKOUT_SUCCESS,
        'user-123',
        mockRequest as NextRequest,
        { amount: 999, tier: 'premium' }
      );

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'payment.checkout.success',
          resource_type: 'payment',
          metadata: { amount: 999, tier: 'premium' },
        })
      );
    });

    it('auditSecurityEvent should log security event', async () => {
      await auditSecurityEvent(
        AuditAction.SECURITY_UNAUTHORIZED_ACCESS,
        'user-123',
        mockRequest as NextRequest,
        { attemptedResource: '/admin/settings' }
      );

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'security.unauthorized_access',
          metadata: { securityEvent: true, attemptedResource: '/admin/settings' },
          status_code: 403,
        })
      );
    });
  });

  describe('queryAuditLogs', () => {
    it('should query audit logs with filters', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'user-123',
          action: 'project.create',
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      mockSupabase.select.mockResolvedValue({ data: mockLogs, error: null });

      const result = await queryAuditLogs({
        userId: 'user-123',
        action: 'project.create',
        limit: 50,
      });

      expect(result).toEqual(mockLogs);
      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockSupabase.eq).toHaveBeenCalledWith('action', 'project.create');
      expect(mockSupabase.limit).toHaveBeenCalledWith(50);
    });

    it('should query with date range', async () => {
      mockSupabase.select.mockResolvedValue({ data: [], error: null });

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      await queryAuditLogs({
        startDate,
        endDate,
      });

      expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', startDate.toISOString());
      expect(mockSupabase.lte).toHaveBeenCalledWith('created_at', endDate.toISOString());
    });

    it('should return empty array when Supabase unavailable', async () => {
      (isSupabaseServiceConfigured as jest.Mock).mockReturnValue(false);

      const result = await queryAuditLogs({ userId: 'user-123' });

      expect(result).toEqual([]);
      expect(serverLogger.warn).toHaveBeenCalled();
    });

    it('should handle query errors', async () => {
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      });

      const result = await queryAuditLogs({ userId: 'user-123' });

      expect(result).toEqual([]);
      expect(serverLogger.error).toHaveBeenCalled();
    });
  });

  describe('getAuditLogStats', () => {
    it('should return audit log statistics', async () => {
      const mockLogs = [
        { action: 'project.create', created_at: '2025-01-01' },
        { action: 'project.create', created_at: '2025-01-02' },
        { action: 'project.update', created_at: '2025-01-03' },
        { action: 'asset.upload', created_at: '2025-01-04' },
      ];

      mockSupabase.select.mockResolvedValue({ data: mockLogs, error: null });

      const stats = await getAuditLogStats('user-123');

      expect(stats.totalLogs).toBe(4);
      expect(stats.actionBreakdown).toEqual({
        'project.create': 2,
        'project.update': 1,
        'asset.upload': 1,
      });
      expect(stats.recentActivity).toHaveLength(4);
    });

    it('should return empty stats when no logs', async () => {
      mockSupabase.select.mockResolvedValue({ data: [], error: null });

      const stats = await getAuditLogStats('user-123');

      expect(stats.totalLogs).toBe(0);
      expect(stats.actionBreakdown).toEqual({});
      expect(stats.recentActivity).toEqual([]);
    });

    it('should handle errors and return empty stats', async () => {
      mockSupabase.select.mockRejectedValue(new Error('Query failed'));

      const stats = await getAuditLogStats('user-123');

      expect(stats.totalLogs).toBe(0);
      expect(serverLogger.error).toHaveBeenCalled();
    });
  });
});
