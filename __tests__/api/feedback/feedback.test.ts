/**
 * Tests for /api/feedback - User Feedback
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/feedback/route';

jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
    serverLogger: {
      info: jest.fn(),
      error: jest.fn(),
    },
  })
);

jest.mock(
  '@supabase/supabase-js',
  (): Record<string, unknown> => ({
    createClient: jest.fn(() => ({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      },
      from: jest.fn(() => ({
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })),
      rpc: jest.fn().mockResolvedValue({
        data: { total: 100, by_type: {}, by_sentiment: {} },
        error: null,
      }),
    })),
  })
);

describe('POST /api/feedback', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  describe('Input Validation', () => {
    it('should return 400 for missing type', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test feedback',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid type', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid',
          message: 'Test feedback',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing message', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: 'feature',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid rating', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: 'feature',
          message: 'Test feedback',
          rating: 6,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid sentiment', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: 'feature',
          message: 'Test feedback',
          sentiment: 'invalid',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Success Cases', () => {
    it('should accept valid feedback with all fields', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          type: 'feature',
          feature: 'timeline',
          rating: 5,
          message: 'Great feature!',
          sentiment: 'positive',
          url: '/editor',
          userAgent: 'Mozilla/5.0',
          metadata: { page: 'timeline' },
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.sentiment).toBe('positive');
    });

    it('should accept feedback with minimal fields', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: 'bug',
          message: 'Something is broken',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should analyze sentiment when not provided', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: 'feature',
          message: 'This is amazing and I love it!',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.sentiment).toBe('positive');
    });

    it('should detect negative sentiment from keywords', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: 'bug',
          message: 'This is terrible and broken',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.sentiment).toBe('negative');
    });

    it('should derive sentiment from rating', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: 'experience',
          message: 'Okay experience',
          rating: 5,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.sentiment).toBe('positive');
    });

    it('should accept all valid feedback types', async () => {
      const types = ['feature', 'bug', 'experience', 'other'];

      for (const type of types) {
        const request = new NextRequest('http://localhost/api/feedback', {
          method: 'POST',
          body: JSON.stringify({
            type,
            message: `Test ${type} feedback`,
          }),
        });
        const response = await POST(request);

        expect(response.status).toBe(201);
      }
    });

    it('should accept all valid ratings', async () => {
      for (let rating = 1; rating <= 5; rating++) {
        const request = new NextRequest('http://localhost/api/feedback', {
          method: 'POST',
          body: JSON.stringify({
            type: 'experience',
            message: 'Test feedback',
            rating,
          }),
        });
        const response = await POST(request);

        expect(response.status).toBe(201);
      }
    });
  });

  describe('Anonymous Feedback', () => {
    it('should accept feedback without authentication', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: 'feature',
          message: 'Anonymous feedback',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });
});

describe('GET /api/feedback', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  describe('Authentication', () => {
    it('should return 401 without authorization header', async () => {
      const request = new NextRequest('http://localhost/api/feedback');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return statistics for authenticated admin', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        headers: {
          authorization: 'Bearer test-token',
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.statistics).toBeDefined();
    });
  });
});
