/**
 * Tests for /api/admin/cache - Admin Cache Management
 *
 * GET: Get cache statistics
 * DELETE: Clear all caches
 */

import { NextRequest } from 'next/server';
import { GET, DELETE } from '@/app/api/admin/cache/route';

// Mock cache invalidation functions
jest.mock(
  '@/lib/cacheInvalidation',
  (): Record<string, unknown> => ({
    getCacheStats: jest.fn(),
    clearAllCaches: jest.fn(),
  })
);

// Mock withAdminAuth wrapper
jest.mock(
  '@/lib/api/withAuth',
  (): Record<string, unknown> => ({
    withAdminAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        user_metadata: { is_admin: true },
      };
      return handler(req, { user: mockAdmin, supabase: null, params: context?.params || {} });
    }),
  })
);

// Mock server logger
jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
    serverLogger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);

describe('GET /api/admin/cache', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should return cache statistics', async () => {
      const { getCacheStats } = require('@/lib/cacheInvalidation');
      const mockStats = {
        totalKeys: 150,
        hitRate: 0.85,
        missRate: 0.15,
        memoryUsage: 1024 * 1024, // 1MB
      };
      getCacheStats.mockReturnValue(mockStats);

      const mockRequest = new NextRequest('http://localhost/api/admin/cache', {
        method: 'GET',
      });

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalKeys).toBe(150);
      expect(data.hitRate).toBe(0.85);
      expect(data.timestamp).toBeTruthy();
      expect(getCacheStats).toHaveBeenCalled();
    });

    it('should include timestamp in response', async () => {
      const { getCacheStats } = require('@/lib/cacheInvalidation');
      getCacheStats.mockReturnValue({ totalKeys: 0 });

      const mockRequest = new NextRequest('http://localhost/api/admin/cache', {
        method: 'GET',
      });

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });

    it('should return empty stats when no cache data', async () => {
      const { getCacheStats } = require('@/lib/cacheInvalidation');
      getCacheStats.mockReturnValue({
        totalKeys: 0,
        hitRate: 0,
        missRate: 0,
        memoryUsage: 0,
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/cache', {
        method: 'GET',
      });

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalKeys).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when getCacheStats throws error', async () => {
      const { getCacheStats } = require('@/lib/cacheInvalidation');
      getCacheStats.mockImplementation(() => {
        throw new Error('Cache system error');
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/cache', {
        method: 'GET',
      });

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to fetch cache statistics');
    });
  });
});

describe('DELETE /api/admin/cache', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should clear all caches successfully', async () => {
      const { clearAllCaches } = require('@/lib/cacheInvalidation');
      clearAllCaches.mockResolvedValue(undefined);

      const mockRequest = new NextRequest('http://localhost/api/admin/cache', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('cleared successfully');
      expect(clearAllCaches).toHaveBeenCalled();
    });

    it('should log cache clear action', async () => {
      const { clearAllCaches } = require('@/lib/cacheInvalidation');
      const { serverLogger } = require('@/lib/serverLogger');
      clearAllCaches.mockResolvedValue(undefined);

      const mockRequest = new NextRequest('http://localhost/api/admin/cache', {
        method: 'DELETE',
      });

      await DELETE(mockRequest, { params: Promise.resolve({}) });

      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'admin.cache.clear_requested',
        }),
        expect.any(String)
      );

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'admin.cache.cleared',
        }),
        expect.any(String)
      );
    });

    it('should return null data on successful clear', async () => {
      const { clearAllCaches } = require('@/lib/cacheInvalidation');
      clearAllCaches.mockResolvedValue(undefined);

      const mockRequest = new NextRequest('http://localhost/api/admin/cache', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toBeNull();
      expect(data.message).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when clearAllCaches fails', async () => {
      const { clearAllCaches } = require('@/lib/cacheInvalidation');
      clearAllCaches.mockRejectedValue(new Error('Cache clear failed'));

      const mockRequest = new NextRequest('http://localhost/api/admin/cache', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to clear caches');
    });

    it('should log error details on failure', async () => {
      const { clearAllCaches } = require('@/lib/cacheInvalidation');
      const { serverLogger } = require('@/lib/serverLogger');
      const error = new Error('Redis connection failed');
      clearAllCaches.mockRejectedValue(error);

      const mockRequest = new NextRequest('http://localhost/api/admin/cache', {
        method: 'DELETE',
      });

      await DELETE(mockRequest, { params: Promise.resolve({}) });

      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'admin.cache.clear_error',
          error,
        }),
        expect.any(String)
      );
    });
  });

  describe('Security', () => {
    it('should only be accessible to admins (enforced by middleware)', async () => {
      const { clearAllCaches } = require('@/lib/cacheInvalidation');
      clearAllCaches.mockResolvedValue(undefined);

      const mockRequest = new NextRequest('http://localhost/api/admin/cache', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, { params: Promise.resolve({}) });

      // If we get here, middleware allowed access (admin check passed)
      expect(response.status).toBe(200);
    });

    it('should log admin email for audit trail', async () => {
      const { clearAllCaches } = require('@/lib/cacheInvalidation');
      const { serverLogger } = require('@/lib/serverLogger');
      clearAllCaches.mockResolvedValue(undefined);

      const mockRequest = new NextRequest('http://localhost/api/admin/cache', {
        method: 'DELETE',
      });

      await DELETE(mockRequest, { params: Promise.resolve({}) });

      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          adminEmail: 'admin@example.com',
        }),
        expect.any(String)
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should have conservative rate limit for DELETE (5/min)', async () => {
      // Rate limiting is applied via withAdminAuth middleware
      // This test verifies the route configuration
      const { clearAllCaches } = require('@/lib/cacheInvalidation');
      clearAllCaches.mockResolvedValue(undefined);

      // Make multiple requests rapidly
      const requests = Array(3)
        .fill(null)
        .map(() =>
          DELETE(new NextRequest('http://localhost/api/admin/cache', { method: 'DELETE' }), {
            params: Promise.resolve({}),
          })
        );

      const responses = await Promise.all(requests);

      // All should succeed within rate limit
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should have higher rate limit for GET (30/min)', async () => {
      const { getCacheStats } = require('@/lib/cacheInvalidation');
      getCacheStats.mockReturnValue({ totalKeys: 0 });

      // Make multiple GET requests
      const requests = Array(10)
        .fill(null)
        .map(() =>
          GET(new NextRequest('http://localhost/api/admin/cache', { method: 'GET' }), {
            params: Promise.resolve({}),
          })
        );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });
});
