/**
 * Comprehensive tests for API response utilities
 */

import { NextResponse } from 'next/server';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationError,
  rateLimitResponse,
  internalServerError,
  badRequestResponse,
  conflictResponse,
  withErrorHandling,
} from '@/lib/api/response';
import { HttpStatusCode } from '@/lib/errors/errorCodes';

// Mock NextResponse for Jest environment
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => {
      const response = new Response(JSON.stringify(body), {
        status: init?.status || 200,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      }) as Response & { json: () => Promise<unknown> };

      // Add custom json() method for testing
      response.json = () => Promise.resolve(body);

      return response;
    },
  },
}));

describe('API Response Utilities', () => {
  describe('errorResponse', () => {
    it('should create error response with default status', () => {
      const response = errorResponse('Something went wrong');

      expect(response).toBeTruthy();
      expect(response.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
    });

    it('should create error response with custom status', () => {
      const response = errorResponse('Bad request', 400);

      expect(response.status).toBe(400);
    });

    it('should include error message in response body', async () => {
      const response = errorResponse('Test error', 400);
      const body = await response.json();

      expect(body.error).toBe('Test error');
    });

    it('should include field name when provided', async () => {
      const response = errorResponse('Invalid field', 400, 'email');
      const body = await response.json();

      expect(body.field).toBe('email');
    });

    it('should include details when provided', async () => {
      const response = errorResponse('Error', 400, undefined, { code: 'ERR001' });
      const body = await response.json();

      expect(body.details).toEqual({ code: 'ERR001' });
    });

    it('should handle all parameters together', async () => {
      const response = errorResponse('Validation failed', 422, 'username', { min: 3 });
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error).toBe('Validation failed');
      expect(body.field).toBe('username');
      expect(body.details).toEqual({ min: 3 });
    });
  });

  describe('successResponse', () => {
    it('should create success response with data only', async () => {
      const data = { id: '123', name: 'Test' };
      const response = successResponse(data);
      const body = await response.json();

      expect(response.status).toBe(HttpStatusCode.OK);
      expect(body).toEqual(data);
    });

    it('should create structured response with message', async () => {
      const data = { id: '123' };
      const response = successResponse(data, 'Created successfully');
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(body.message).toBe('Created successfully');
    });

    it('should create success response with custom status', async () => {
      const response = successResponse({ id: '123' }, 'Created', 201);

      expect(response.status).toBe(201);
    });

    it('should handle null data', async () => {
      const response = successResponse(null, 'Deleted successfully');
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.message).toBe('Deleted successfully');
    });

    it('should handle undefined data with message', async () => {
      const response = successResponse(undefined, 'Operation successful');
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.message).toBe('Operation successful');
    });

    it('should not include data field when data is undefined without message', async () => {
      const response = successResponse(undefined);
      const body = await response.json();

      // When data is undefined without message, it returns structured response
      expect(body.success).toBe(true);
      expect(body.data).toBeUndefined();
    });
  });

  describe('unauthorizedResponse', () => {
    it('should create 401 response with default message', async () => {
      const response = unauthorizedResponse();
      const body = await response.json();

      expect(response.status).toBe(HttpStatusCode.UNAUTHORIZED);
      expect(body.error).toBe('Unauthorized');
    });

    it('should create 401 response with custom message', async () => {
      const response = unauthorizedResponse('Invalid credentials');
      const body = await response.json();

      expect(response.status).toBe(HttpStatusCode.UNAUTHORIZED);
      expect(body.error).toBe('Invalid credentials');
    });
  });

  describe('forbiddenResponse', () => {
    it('should create 403 response with default message', async () => {
      const response = forbiddenResponse();
      const body = await response.json();

      expect(response.status).toBe(HttpStatusCode.FORBIDDEN);
      expect(body.error).toBe('Forbidden');
    });

    it('should create 403 response with custom message', async () => {
      const response = forbiddenResponse('Access denied');
      const body = await response.json();

      expect(response.status).toBe(HttpStatusCode.FORBIDDEN);
      expect(body.error).toBe('Access denied');
    });
  });

  describe('notFoundResponse', () => {
    it('should create 404 response with default resource', async () => {
      const response = notFoundResponse();
      const body = await response.json();

      expect(response.status).toBe(HttpStatusCode.NOT_FOUND);
      expect(body.error).toBe('Resource not found');
    });

    it('should create 404 response with custom resource', async () => {
      const response = notFoundResponse('Project');
      const body = await response.json();

      expect(response.status).toBe(HttpStatusCode.NOT_FOUND);
      expect(body.error).toBe('Project not found');
    });
  });

  describe('validationError', () => {
    it('should create 400 validation error response', async () => {
      const response = validationError('Invalid email format');
      const body = await response.json();

      expect(response.status).toBe(HttpStatusCode.BAD_REQUEST);
      expect(body.error).toBe('Invalid email format');
    });

    it('should include field name when provided', async () => {
      const response = validationError('Required field', 'email');
      const body = await response.json();

      expect(body.field).toBe('email');
    });
  });

  describe('rateLimitResponse', () => {
    it('should create 429 response with rate limit info', async () => {
      const limit = 100;
      const remaining = 0;
      const resetAt = Date.now() + 60000;

      const response = rateLimitResponse(limit, remaining, resetAt);
      const body = await response.json();

      expect(response.status).toBe(HttpStatusCode.RATE_LIMITED);
      expect(body.error).toBe('Rate limit exceeded');
      expect(body.limit).toBe(limit);
      expect(body.remaining).toBe(remaining);
      expect(body.resetAt).toBe(resetAt);
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    it('should include rate limit headers', () => {
      const limit = 100;
      const remaining = 50;
      const resetAt = Date.now() + 60000;

      const response = rateLimitResponse(limit, remaining, resetAt);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('50');
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
      expect(response.headers.get('Retry-After')).toBeTruthy();
    });

    it('should calculate retryAfter correctly', async () => {
      const resetAt = Date.now() + 5000; // 5 seconds from now
      const response = rateLimitResponse(100, 0, resetAt);
      const body = await response.json();

      expect(body.retryAfter).toBeGreaterThanOrEqual(4);
      expect(body.retryAfter).toBeLessThanOrEqual(6);
    });
  });

  describe('internalServerError', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should create 500 response with default message', async () => {
      const response = internalServerError();
      const body = await response.json();

      expect(response.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(body.error).toBe('Internal server error');
    });

    it('should create 500 response with custom message', async () => {
      const response = internalServerError('Database connection failed');
      const body = await response.json();

      expect(body.error).toBe('Database connection failed');
    });

    it('should include details in development', async () => {
      process.env.NODE_ENV = 'development';
      const details = { stack: 'Error stack trace' };
      const response = internalServerError('Error', details);
      const body = await response.json();

      expect(body.details).toEqual(details);
    });

    it('should not include details in production', async () => {
      process.env.NODE_ENV = 'production';
      const details = { stack: 'Error stack trace' };
      const response = internalServerError('Error', details);
      const body = await response.json();

      expect(body.details).toBeUndefined();
    });
  });

  describe('badRequestResponse', () => {
    it('should create 400 response', async () => {
      const response = badRequestResponse('Invalid request');
      const body = await response.json();

      expect(response.status).toBe(HttpStatusCode.BAD_REQUEST);
      expect(body.error).toBe('Invalid request');
    });

    it('should include field when provided', async () => {
      const response = badRequestResponse('Invalid value', 'age');
      const body = await response.json();

      expect(body.field).toBe('age');
    });
  });

  describe('conflictResponse', () => {
    it('should create 409 response', async () => {
      const response = conflictResponse('Resource already exists');
      const body = await response.json();

      expect(response.status).toBe(HttpStatusCode.CONFLICT);
      expect(body.error).toBe('Resource already exists');
    });
  });

  describe('withErrorHandling', () => {
    it('should return handler result on success', async () => {
      const handler = async () => successResponse({ id: '123' });
      const wrappedHandler = withErrorHandling(handler);

      const response = await wrappedHandler();
      const body = await response.json();

      expect(body.id).toBe('123');
    });

    it('should catch errors and return 500', async () => {
      const handler = async () => {
        throw new Error('Test error');
      };
      const wrappedHandler = withErrorHandling(handler);

      const response = await wrappedHandler();
      const body = await response.json();

      expect(response.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(body.error).toBe('Test error');
    });

    it('should handle non-Error throws', async () => {
      const handler = async () => {
        throw 'String error';
      };
      const wrappedHandler = withErrorHandling(handler);

      const response = await wrappedHandler();

      expect(response.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
    });

    it('should preserve handler parameters', async () => {
      const handler = async (a: number, b: string) => {
        return successResponse({ a, b });
      };
      const wrappedHandler = withErrorHandling(handler);

      const response = await wrappedHandler(42, 'test');
      const body = await response.json();

      expect(body.a).toBe(42);
      expect(body.b).toBe('test');
    });

    it('should log errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const handler = async () => {
        throw new Error('Test error');
      };
      const wrappedHandler = withErrorHandling(handler);

      await wrappedHandler();

      expect(consoleSpy).toHaveBeenCalledWith('Handler error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});
