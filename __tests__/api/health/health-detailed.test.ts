/**
 * Tests for GET /api/health/detailed - Detailed Health Check
 */

import { GET } from '@/app/api/health/detailed/route';

// Mock createClient from Supabase
jest.mock('@supabase/supabase-js', (): Record<string, unknown> => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  })),
}));

jest.mock('@/lib/serverLogger', (): Record<string, unknown> => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('GET /api/health/detailed', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NODE_ENV = 'test';
  });

  describe('Response Structure', () => {
    it('should return 200 status code', async () => {
      const response = await GET();
      expect(response.status).toBe(200);
    });

    it('should return health check structure', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('checks');
      expect(data).toHaveProperty('features');
      expect(data).toHaveProperty('system');
    });

    it('should include all required checks', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('supabase');
      expect(data.checks).toHaveProperty('axiom');
      expect(data.checks).toHaveProperty('posthog');
      expect(data.checks).toHaveProperty('redis');
    });

    it('should include all feature checks', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.features).toHaveProperty('onboarding');
      expect(data.features).toHaveProperty('timeline');
      expect(data.features).toHaveProperty('assets');
      expect(data.features).toHaveProperty('backup');
      expect(data.features).toHaveProperty('analytics');
    });

    it('should include system information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.system).toHaveProperty('memory');
      expect(data.system).toHaveProperty('uptime');
      expect(data.system.memory).toHaveProperty('used');
      expect(data.system.memory).toHaveProperty('total');
      expect(data.system.memory).toHaveProperty('percentage');
    });
  });

  describe('Database Health Check', () => {
    it('should return healthy when database is accessible', async () => {
      const response = await GET();
      const data = await response.json();

      // With mocked successful query
      expect(data.checks.database.status).toBe('healthy');
      expect(data.checks.database).toHaveProperty('latency');
    });

    it('should return unhealthy when Supabase credentials are missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const response = await GET();
      const data = await response.json();

      expect(data.checks.database.status).toBe('unhealthy');
      expect(data.checks.database.message).toContain('credentials not configured');
    });
  });

  describe('Environment Information', () => {
    it('should return test environment', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBe('test');
    });

    it('should return version number', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.version).toBeDefined();
      expect(typeof data.version).toBe('string');
    });
  });

  describe('Uptime Tracking', () => {
    it('should return uptime in seconds', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.uptime).toBeGreaterThan(0);
      expect(typeof data.uptime).toBe('number');
    });
  });

  describe('Overall Status', () => {
    it('should return overall status based on checks', async () => {
      const response = await GET();
      const data = await response.json();

      expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
    });
  });

  describe('Cache Control Headers', () => {
    it('should have no-cache headers', async () => {
      const response = await GET();

      expect(response.headers.get('cache-control')).toContain('no-store');
    });
  });
});
