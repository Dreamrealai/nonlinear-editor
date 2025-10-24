/**
 * Tests for Error Response Utilities
 *
 * @module __tests__/lib/api/errorResponse.test
 */

import { NextResponse } from 'next/server';
import {
  errorResponse,
  ErrorResponses,
  getErrorMessage,
  type ErrorContext,
} from '@/lib/api/errorResponse';
import { serverLogger } from '@/lib/serverLogger';

// Mock server logger
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('errorResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should create error response with default status', async () => {
      const response = errorResponse('Test error');

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'Test error' });
    });

    it('should create error response with custom status', async () => {
      const response = errorResponse('Not found', 404);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({ error: 'Not found' });
    });

    it('should create error response with context', async () => {
      const context: ErrorContext = {
        userId: 'user-123',
        projectId: 'project-456',
        operationName: 'deleteProject',
      };

      const response = errorResponse('Operation failed', 400, context);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'Operation failed' });
    });
  });

  describe('Logging', () => {
    it('should log 5xx errors as error level', () => {
      errorResponse('Server error', 500, { userId: 'user-123' });

      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'api.error_response',
          statusCode: 500,
          userId: 'user-123',
        }),
        'Server error'
      );
    });

    it('should log 4xx errors as warn level', () => {
      errorResponse('Bad request', 400, { userId: 'user-123' });

      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'api.error_response',
          statusCode: 400,
          userId: 'user-123',
        }),
        'Bad request'
      );
    });

    it('should include all context in logs', () => {
      const context: ErrorContext = {
        userId: 'user-123',
        projectId: 'project-456',
        assetId: 'asset-789',
        operationName: 'uploadAsset',
        requestId: 'req-abc',
        customField: 'custom value',
      };

      errorResponse('Upload failed', 413, context);

      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'api.error_response',
          statusCode: 413,
          ...context,
        }),
        'Upload failed'
      );
    });
  });

  describe('Response Format', () => {
    it('should always return JSON with error field', async () => {
      const response = errorResponse('Test', 400);
      const body = await response.json();

      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
    });

    it('should set correct content-type header', () => {
      const response = errorResponse('Test', 400);

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});

describe('ErrorResponses Presets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('badRequest', () => {
    it('should create 400 response with default message', async () => {
      const response = ErrorResponses.badRequest();

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'Invalid request' });
    });

    it('should create 400 response with custom message', async () => {
      const response = ErrorResponses.badRequest('Missing field');

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'Missing field' });
    });

    it('should include context in logs', () => {
      ErrorResponses.badRequest('Invalid input', { userId: 'user-123' });

      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'api.error_response',
          statusCode: 400,
          userId: 'user-123',
        }),
        'Invalid input'
      );
    });
  });

  describe('unauthorized', () => {
    it('should create 401 response', async () => {
      const response = ErrorResponses.unauthorized();

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should accept custom message', async () => {
      const response = ErrorResponses.unauthorized('Token expired');

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'Token expired' });
    });
  });

  describe('forbidden', () => {
    it('should create 403 response', async () => {
      const response = ErrorResponses.forbidden();

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({ error: 'Forbidden' });
    });

    it('should accept custom message', async () => {
      const response = ErrorResponses.forbidden('Insufficient permissions');

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({ error: 'Insufficient permissions' });
    });
  });

  describe('notFound', () => {
    it('should create 404 response', async () => {
      const response = ErrorResponses.notFound();

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({ error: 'Not found' });
    });

    it('should accept custom message', async () => {
      const response = ErrorResponses.notFound('Project not found');

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({ error: 'Project not found' });
    });
  });

  describe('conflict', () => {
    it('should create 409 response', async () => {
      const response = ErrorResponses.conflict();

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body).toEqual({ error: 'Conflict' });
    });

    it('should accept custom message', async () => {
      const response = ErrorResponses.conflict('Resource already exists');

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body).toEqual({ error: 'Resource already exists' });
    });
  });

  describe('tooManyRequests', () => {
    it('should create 429 response', async () => {
      const response = ErrorResponses.tooManyRequests();

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body).toEqual({ error: 'Too many requests' });
    });

    it('should accept custom message', async () => {
      const response = ErrorResponses.tooManyRequests('Rate limit exceeded');

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body).toEqual({ error: 'Rate limit exceeded' });
    });
  });

  describe('internal', () => {
    it('should create 500 response', async () => {
      const response = ErrorResponses.internal();

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'Internal server error' });
    });

    it('should accept custom message', async () => {
      const response = ErrorResponses.internal('Database connection failed');

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'Database connection failed' });
    });

    it('should log as error level', () => {
      ErrorResponses.internal('Server error');

      expect(serverLogger.error).toHaveBeenCalled();
      expect(serverLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('serviceUnavailable', () => {
    it('should create 503 response', async () => {
      const response = ErrorResponses.serviceUnavailable();

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body).toEqual({ error: 'Service unavailable' });
    });

    it('should accept custom message', async () => {
      const response = ErrorResponses.serviceUnavailable('Maintenance mode');

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body).toEqual({ error: 'Maintenance mode' });
    });
  });
});

describe('getErrorMessage', () => {
  it('should extract message from Error instance', () => {
    const error = new Error('Test error');
    const message = getErrorMessage(error);

    expect(message).toBe('Test error');
  });

  it('should return string error as-is', () => {
    const error = 'String error';
    const message = getErrorMessage(error);

    expect(message).toBe('String error');
  });

  it('should handle unknown error types', () => {
    const error = { code: 123, data: 'something' };
    const message = getErrorMessage(error);

    expect(message).toBe('An unknown error occurred');
  });

  it('should handle null error', () => {
    const message = getErrorMessage(null);

    expect(message).toBe('An unknown error occurred');
  });

  it('should handle undefined error', () => {
    const message = getErrorMessage(undefined);

    expect(message).toBe('An unknown error occurred');
  });

  it('should handle number error', () => {
    const message = getErrorMessage(404);

    expect(message).toBe('An unknown error occurred');
  });

  it('should handle custom Error subclass', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }

    const error = new CustomError('Custom error message');
    const message = getErrorMessage(error);

    expect(message).toBe('Custom error message');
  });
});

describe('Type Safety', () => {
  it('should maintain correct return type', () => {
    const response = errorResponse('Test', 400);

    // TypeScript should infer this as NextResponse<ErrorResponse>
    expect(response).toBeInstanceOf(NextResponse);
  });

  it('should work with all ErrorResponses methods', async () => {
    const responses = [
      ErrorResponses.badRequest(),
      ErrorResponses.unauthorized(),
      ErrorResponses.forbidden(),
      ErrorResponses.notFound(),
      ErrorResponses.conflict(),
      ErrorResponses.tooManyRequests(),
      ErrorResponses.internal(),
      ErrorResponses.serviceUnavailable(),
    ];

    for (const response of responses) {
      expect(response).toBeInstanceOf(NextResponse);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
    }
  });
});

describe('Edge Cases', () => {
  it('should handle empty error message', async () => {
    const response = errorResponse('', 400);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: '' });
  });

  it('should handle very long error message', async () => {
    const longMessage = 'A'.repeat(10000);
    const response = errorResponse(longMessage, 400);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe(longMessage);
  });

  it('should handle special characters in message', async () => {
    const specialMessage = 'Error: <script>alert("xss")</script>';
    const response = errorResponse(specialMessage, 400);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe(specialMessage);
  });

  it('should handle context with nested objects', () => {
    const context: ErrorContext = {
      userId: 'user-123',
      metadata: {
        nested: {
          value: 'test',
        },
      },
    };

    errorResponse('Test', 400, context);

    expect(serverLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        metadata: {
          nested: {
            value: 'test',
          },
        },
      }),
      'Test'
    );
  });
});
