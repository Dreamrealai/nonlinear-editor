/**
 * Integration Tests for POST /api/analytics/web-vitals
 *
 * This is an example of the NEW integration testing approach:
 * - Tests the ACTUAL route handler (not a mock)
 * - Uses real NextRequest/NextResponse
 * - Only mocks the logger (external service)
 * - More realistic than heavy mocking
 *
 * Compare with web-vitals.test.ts (old unit test approach)
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/analytics/web-vitals/route';

// Only mock the logger (external service we don't want to actually call)
jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
    serverLogger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);

describe('POST /api/analytics/web-vitals - Integration Tests', () => {
  const { serverLogger } = require('@/lib/serverLogger');

  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should accept and log valid CLS metric', async () => {
      // Arrange - Create actual request
      const metric = {
        name: 'CLS',
        value: 0.1,
        rating: 'good' as const,
        id: 'v3-1234567890',
        delta: 0.1,
        navigationType: 'navigate',
      };

      const request = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(metric),
      });

      // Act - Call actual route handler
      const response = await POST(request);

      // Assert - Check response and side effects
      expect(response.status).toBe(204);
      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          metric: 'CLS',
          value: 0.1,
          rating: 'good',
        }),
        expect.stringContaining('CLS')
      );
    });

    it('should accept all Web Vitals metrics (LCP, FCP, TTFB, INP)', async () => {
      const metrics = [
        { name: 'LCP', value: 2500, rating: 'good' as const },
        { name: 'FCP', value: 1800, rating: 'good' as const },
        { name: 'TTFB', value: 600, rating: 'good' as const },
        { name: 'INP', value: 200, rating: 'good' as const },
      ];

      for (const metric of metrics) {
        const request = new NextRequest('http://localhost/api/analytics/web-vitals', {
          method: 'POST',
          body: JSON.stringify({ ...metric, id: `v3-${metric.name}`, delta: metric.value }),
        });

        const response = await POST(request);

        expect(response.status).toBe(204);
        expect(serverLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({ metric: metric.name }),
          expect.any(String)
        );
      }
    });

    it('should warn for poor metrics', async () => {
      const metric = {
        name: 'CLS',
        value: 0.3,
        rating: 'poor' as const,
        id: 'v3-poor-cls',
        delta: 0.3,
      };

      const request = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(metric),
      });

      const response = await POST(request);

      expect(response.status).toBe(204);
      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          metric: 'CLS',
          rating: 'poor',
        }),
        expect.stringContaining('CLS')
      );
    });

    it('should handle empty body gracefully', async () => {
      const request = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: '',
      });

      const response = await POST(request);

      expect(response.status).toBe(204);
    });
  });

  describe('Validation', () => {
    it('should reject metric missing required fields', async () => {
      const invalidMetrics = [
        { value: 0.1, rating: 'good', id: 'v3-1', delta: 0.1 }, // missing name
        { name: 'CLS', rating: 'good', id: 'v3-2', delta: 0.1 }, // missing value
        { name: 'CLS', value: 0.1, id: 'v3-3', delta: 0.1 }, // missing rating
      ];

      for (const metric of invalidMetrics) {
        const request = new NextRequest('http://localhost/api/analytics/web-vitals', {
          method: 'POST',
          body: JSON.stringify(metric),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Invalid metric data');
        expect(serverLogger.warn).toHaveBeenCalled();
      }
    });

    it('should reject metric with non-number value', async () => {
      const request = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify({
          name: 'CLS',
          value: 'not-a-number',
          rating: 'good',
          id: 'v3-bad-value',
          delta: 0.1,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parse errors gracefully', async () => {
      const request = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: 'invalid json{',
      });

      const response = await POST(request);

      // Should return 204 to fail silently (web vitals are non-critical)
      expect(response.status).toBe(204);
      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
        }),
        'Error processing web vitals metric'
      );
    });
  });

  describe('sendBeacon Compatibility', () => {
    it('should handle text/plain content type from sendBeacon', async () => {
      const metric = {
        name: 'CLS',
        value: 0.1,
        rating: 'good' as const,
        id: 'v3-beacon',
        delta: 0.1,
      };

      const request = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(metric),
      });

      const response = await POST(request);

      expect(response.status).toBe(204);
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for GET requests', async () => {
      const response = await GET();

      expect(response.status).toBe(405);
      const data = await response.json();
      expect(data.error).toBe('Method not allowed');
    });
  });
});

/**
 * COMPARISON: Integration vs Unit Testing
 *
 * Integration Approach (this file):
 * ✅ Tests actual route handler
 * ✅ Uses real NextRequest/NextResponse
 * ✅ Only mocks logger (1 external dependency)
 * ✅ Tests real request/response cycle
 * ✅ Less brittle (survives refactoring)
 * ✅ More confidence in production behavior
 *
 * Unit Approach (web-vitals.test.ts):
 * ✅ Also tests actual route handler
 * ✅ Also uses real NextRequest/NextResponse
 * ✅ Also only mocks logger
 * ❓ Same level of mocking
 *
 * VERDICT: For this PUBLIC endpoint, both approaches are similar!
 * The integration approach shines more for AUTHENTICATED endpoints.
 * See: projects.integration.test.ts for a better comparison
 */
