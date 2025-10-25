/**
 * Tests for POST /api/analytics/web-vitals - Web Vitals Analytics
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/analytics/web-vitals/route';

// Mock server logger
jest.mock(
  '@/lib/serverLogger',
  () => ({
    serverLogger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);

describe('POST /api/analytics/web-vitals', () => {
  let mockRequest: NextRequest;
  const { serverLogger } = require('@/lib/serverLogger');

  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should accept valid CLS metric', async () => {
      const metric = {
        name: 'CLS',
        value: 0.1,
        rating: 'good' as const,
        id: 'v3-1234567890',
        delta: 0.1,
        navigationType: 'navigate',
      };

      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(metric),
      });

      const response = await POST(mockRequest);

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

    it('should accept valid LCP metric', async () => {
      const metric = {
        name: 'LCP',
        value: 2500,
        rating: 'good' as const,
        id: 'v3-1234567891',
        delta: 2500,
      };

      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(metric),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(204);
      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          metric: 'LCP',
          value: 2500,
        }),
        expect.any(String)
      );
    });

    it('should accept valid FCP metric', async () => {
      const metric = {
        name: 'FCP',
        value: 1800,
        rating: 'good' as const,
        id: 'v3-1234567892',
        delta: 1800,
      };

      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(metric),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(204);
    });

    it('should accept valid TTFB metric', async () => {
      const metric = {
        name: 'TTFB',
        value: 600,
        rating: 'good' as const,
        id: 'v3-1234567893',
        delta: 600,
      };

      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(metric),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(204);
    });

    it('should accept valid INP metric', async () => {
      const metric = {
        name: 'INP',
        value: 200,
        rating: 'good' as const,
        id: 'v3-1234567894',
        delta: 200,
      };

      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(metric),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(204);
    });

    it('should accept metric with needs-improvement rating', async () => {
      const metric = {
        name: 'CLS',
        value: 0.15,
        rating: 'needs-improvement' as const,
        id: 'v3-1234567895',
        delta: 0.15,
      };

      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(metric),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(204);
      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 'needs-improvement',
        }),
        expect.any(String)
      );
    });

    it('should log warning for poor metrics', async () => {
      const metric = {
        name: 'CLS',
        value: 0.3,
        rating: 'poor' as const,
        id: 'v3-1234567896',
        delta: 0.3,
      };

      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(metric),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(204);
      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          metric: 'CLS',
          value: 0.3,
          rating: 'poor',
        }),
        expect.stringContaining('CLS')
      );
    });

    it('should return 204 for empty body', async () => {
      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: '',
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(204);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for missing name field', async () => {
      const invalidMetric = {
        value: 0.1,
        rating: 'good' as const,
        id: 'v3-1234567890',
        delta: 0.1,
      };

      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(invalidMetric),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid metric data');
      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          receivedData: invalidMetric,
        }),
        'Invalid web vitals data received'
      );
    });

    it('should return 400 for missing value field', async () => {
      const invalidMetric = {
        name: 'CLS',
        rating: 'good' as const,
        id: 'v3-1234567890',
        delta: 0.1,
      };

      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(invalidMetric),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid metric data');
    });

    it('should return 400 for missing rating field', async () => {
      const invalidMetric = {
        name: 'CLS',
        value: 0.1,
        id: 'v3-1234567890',
        delta: 0.1,
      };

      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(invalidMetric),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid metric data');
    });

    it('should return 400 for non-number value', async () => {
      const invalidMetric = {
        name: 'CLS',
        value: 'not-a-number',
        rating: 'good' as const,
        id: 'v3-1234567890',
        delta: 0.1,
      };

      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(invalidMetric),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid metric data');
    });
  });

  describe('Error Handling', () => {
    it('should return 204 even on JSON parse error', async () => {
      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: 'invalid json{',
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(204);
      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
        }),
        'Error processing web vitals metric'
      );
    });

    it('should fail silently on unexpected errors', async () => {
      // Mock JSON.parse to throw an unexpected error
      const originalParse = JSON.parse;
      JSON.parse = jest.fn(() => {
        throw new Error('Unexpected error');
      });

      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        body: '{"name":"CLS"}',
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(204);
      expect(serverLogger.error).toHaveBeenCalled();

      // Restore original
      JSON.parse = originalParse;
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

  describe('sendBeacon Compatibility', () => {
    it('should handle text/plain content type', async () => {
      const metric = {
        name: 'CLS',
        value: 0.1,
        rating: 'good' as const,
        id: 'v3-1234567890',
        delta: 0.1,
      };

      mockRequest = new NextRequest('http://localhost/api/analytics/web-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(metric),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(204);
    });
  });
});
