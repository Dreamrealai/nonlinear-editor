/**
 * Tests for POST /api/logs - Browser Logging API
 *
 * Tests cover authentication, rate limiting, log validation, size limits,
 * and Axiom integration for browser-side logging.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/logs/route';
import {
  createMockSupabaseClient,
  createMockUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/__tests__/helpers/apiMocks';

// Mock modules
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

// Mock withAuth wrapper
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();

    if (!supabase || !supabase.auth) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return handler(req, { user, supabase, params: context?.params || {} });
  }),
}));


jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    success: true,
    limit: 60,
    remaining: 59,
    resetAt: Date.now() + 60000,
  }),
  RATE_LIMITS: {
    tier4_general: { requests: 60, window: 60 },
  },
}));

// Mock fetch for Axiom API
global.fetch = jest.fn();

describe('POST /api/logs', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;
  const originalEnv = process.env;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Reset environment variables
    process.env = { ...originalEnv };

    // Mock successful Axiom response by default
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('OK'),
    });
  });

  afterEach((): void => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          logs: [
            {
              level: 'info',
              timestamp: '2025-01-01T00:00:00Z',
              message: 'Test log',
            },
          ],
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should proceed when user is authenticated', async () => {
      mockAuthenticatedUser(mockSupabase);
      process.env['AXIOM_TOKEN'] = 'test-token';
      process.env['AXIOM_DATASET'] = 'test-dataset';

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          logs: [
            {
              level: 'info',
              timestamp: '2025-01-01T00:00:00Z',
              message: 'Test log',
            },
          ],
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce tier4 rate limiting (60/min)', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { checkRateLimit } = require('@/lib/rateLimit');

      checkRateLimit.mockResolvedValueOnce({
        success: false,
        limit: 60,
        remaining: 0,
        resetAt: Date.now() + 60000,
      });

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          logs: [
            {
              level: 'info',
              timestamp: '2025-01-01T00:00:00Z',
              message: 'Test log',
            },
          ],
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toContain('Too many requests');
    });
  });

  describe('Input Validation', () => {
    it('should reject non-array logs', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          logs: 'not-an-array',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid logs format');
      expect(data.field).toBe('logs');
    });

    it('should reject empty logs array', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          logs: [],
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.field).toBe('logs.length');
    });

    it('should reject more than 100 logs per request', async () => {
      mockAuthenticatedUser(mockSupabase);

      const logsArray = Array(101).fill({
        level: 'info',
        timestamp: '2025-01-01T00:00:00Z',
        message: 'Test',
      });

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          logs: logsArray,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.field).toBe('logs.length');
    });

    it('should accept 1 to 100 logs', async () => {
      mockAuthenticatedUser(mockSupabase);
      process.env['AXIOM_TOKEN'] = 'test-token';
      process.env['AXIOM_DATASET'] = 'test-dataset';

      const testCases = [1, 50, 100];

      for (const count of testCases) {
        const logsArray = Array(count).fill({
          level: 'info',
          timestamp: '2025-01-01T00:00:00Z',
          message: 'Test',
        });

        mockRequest = new NextRequest('http://localhost/api/logs', {
          method: 'POST',
          body: JSON.stringify({
            logs: logsArray,
          }),
        });

        const response = await POST(mockRequest);
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Size Limits', () => {
    it('should reject log entry exceeding 10KB', async () => {
      mockAuthenticatedUser(mockSupabase);

      const largeMessage = 'x'.repeat(11 * 1024); // 11KB message

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          logs: [
            {
              level: 'info',
              timestamp: '2025-01-01T00:00:00Z',
              message: largeMessage,
            },
          ],
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('maximum size');
      expect(data.field).toBe('logs');
    });

    it('should reject total request exceeding 100KB', async () => {
      mockAuthenticatedUser(mockSupabase);

      // Create 11 logs of ~10KB each (total > 100KB)
      const largeMessage = 'x'.repeat(9 * 1024);
      const logsArray = Array(11).fill({
        level: 'info',
        timestamp: '2025-01-01T00:00:00Z',
        message: largeMessage,
      });

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          logs: logsArray,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Total logs size exceeds maximum');
      expect(data.field).toBe('logs');
    });

    it('should accept logs under size limits', async () => {
      mockAuthenticatedUser(mockSupabase);
      process.env['AXIOM_TOKEN'] = 'test-token';
      process.env['AXIOM_DATASET'] = 'test-dataset';

      const validMessage = 'x'.repeat(5 * 1024); // 5KB message

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          logs: [
            {
              level: 'info',
              timestamp: '2025-01-01T00:00:00Z',
              message: validMessage,
            },
          ],
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('Axiom Integration', () => {
    it('should send logs to Axiom when configured', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      process.env['AXIOM_TOKEN'] = 'test-axiom-token';
      process.env['AXIOM_DATASET'] = 'test-dataset';

      const logs = [
        {
          level: 'info',
          timestamp: '2025-01-01T00:00:00Z',
          message: 'Test log message',
          data: { key: 'value' },
        },
      ];

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({ logs }),
      });

      await POST(mockRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.axiom.co/v1/datasets/test-dataset/ingest',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-axiom-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should enrich logs with userId', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      process.env['AXIOM_TOKEN'] = 'test-token';
      process.env['AXIOM_DATASET'] = 'test-dataset';

      const logs = [
        {
          level: 'info',
          timestamp: '2025-01-01T00:00:00Z',
          message: 'Test',
        },
      ];

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({ logs }),
      });

      await POST(mockRequest);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body[0]).toMatchObject({
        userId: mockUser.id,
        level: 'info',
        message: 'Test',
        source: 'browser',
      });
    });

    it('should add _time field for Axiom', async () => {
      mockAuthenticatedUser(mockSupabase);
      process.env['AXIOM_TOKEN'] = 'test-token';
      process.env['AXIOM_DATASET'] = 'test-dataset';

      const timestamp = '2025-01-01T00:00:00Z';
      const logs = [
        {
          level: 'info',
          timestamp,
          message: 'Test',
        },
      ];

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({ logs }),
      });

      await POST(mockRequest);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body[0]._time).toBe(timestamp);
    });

    it('should handle Axiom API failure gracefully', async () => {
      mockAuthenticatedUser(mockSupabase);
      process.env['AXIOM_TOKEN'] = 'test-token';
      process.env['AXIOM_DATASET'] = 'test-dataset';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: jest.fn().mockResolvedValue('Axiom error'),
      });

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          logs: [
            {
              level: 'info',
              timestamp: '2025-01-01T00:00:00Z',
              message: 'Test',
            },
          ],
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.success).toBe(false);
      expect(data.data.error).toBe('Failed to send logs to Axiom');
    });

    it('should return success when Axiom succeeds', async () => {
      mockAuthenticatedUser(mockSupabase);
      process.env['AXIOM_TOKEN'] = 'test-token';
      process.env['AXIOM_DATASET'] = 'test-dataset';

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          logs: [
            {
              level: 'info',
              timestamp: '2025-01-01T00:00:00Z',
              message: 'Test',
            },
          ],
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.success).toBe(true);
      expect(data.data.count).toBe(1);
    });
  });

  describe('Development Mode', () => {
    it('should log to server logger in development when Axiom not configured', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      process.env['NODE_ENV'] = 'development';
      delete process.env['AXIOM_TOKEN'];
      delete process.env['AXIOM_DATASET'];

      const { serverLogger } = require('@/lib/serverLogger');

      const logs = [
        {
          level: 'error',
          timestamp: '2025-01-01T00:00:00Z',
          message: 'Error message',
          data: { errorCode: 500 },
        },
        {
          level: 'warn',
          timestamp: '2025-01-01T00:00:00Z',
          message: 'Warning message',
        },
        {
          level: 'info',
          timestamp: '2025-01-01T00:00:00Z',
          message: 'Info message',
        },
        {
          level: 'debug',
          timestamp: '2025-01-01T00:00:00Z',
          message: 'Debug message',
        },
      ];

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({ logs }),
      });

      await POST(mockRequest);

      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 500,
          timestamp: '2025-01-01T00:00:00Z',
          userId: mockUser.id,
        }),
        'Error message'
      );

      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: '2025-01-01T00:00:00Z',
          userId: mockUser.id,
        }),
        'Warning message'
      );

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: '2025-01-01T00:00:00Z',
          userId: mockUser.id,
        }),
        'Info message'
      );

      expect(serverLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: '2025-01-01T00:00:00Z',
          userId: mockUser.id,
        }),
        'Debug message'
      );
    });

    it('should return success in development mode without Axiom', async () => {
      mockAuthenticatedUser(mockSupabase);
      process.env['NODE_ENV'] = 'development';
      delete process.env['AXIOM_TOKEN'];

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          logs: [
            {
              level: 'info',
              timestamp: '2025-01-01T00:00:00Z',
              message: 'Test',
            },
          ],
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.success).toBe(true);
      expect(data.data.count).toBe(1);
    });

    it('should not call fetch when Axiom not configured', async () => {
      mockAuthenticatedUser(mockSupabase);
      process.env['NODE_ENV'] = 'development';
      delete process.env['AXIOM_TOKEN'];

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          logs: [
            {
              level: 'info',
              timestamp: '2025-01-01T00:00:00Z',
              message: 'Test',
            },
          ],
        }),
      });

      await POST(mockRequest);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Log Fields', () => {
    it('should accept logs with all optional fields', async () => {
      mockAuthenticatedUser(mockSupabase);
      process.env['AXIOM_TOKEN'] = 'test-token';
      process.env['AXIOM_DATASET'] = 'test-dataset';

      const logs = [
        {
          level: 'info',
          timestamp: '2025-01-01T00:00:00Z',
          message: 'Test message',
          data: { key1: 'value1', key2: 123 },
          userAgent: 'Mozilla/5.0',
          url: 'https://example.com/page',
        },
      ];

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({ logs }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body[0]).toMatchObject({
        level: 'info',
        message: 'Test message',
        data: { key1: 'value1', key2: 123 },
        userAgent: 'Mozilla/5.0',
        url: 'https://example.com/page',
      });
    });

    it('should handle different log levels', async () => {
      mockAuthenticatedUser(mockSupabase);
      process.env['AXIOM_TOKEN'] = 'test-token';
      process.env['AXIOM_DATASET'] = 'test-dataset';

      const levels = ['error', 'warn', 'info', 'debug'];

      const logs = levels.map((level) => ({
        level,
        timestamp: '2025-01-01T00:00:00Z',
        message: `${level} message`,
      }));

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: JSON.stringify({ logs }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on unexpected errors', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest('http://localhost/api/logs', {
        method: 'POST',
        body: 'invalid-json',
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });
});
