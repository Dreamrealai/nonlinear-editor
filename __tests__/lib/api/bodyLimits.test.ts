/**
 * Tests for Request Body Size Limits Middleware
 *
 * @module __tests__/lib/api/bodyLimits.test
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateBodySize,
  safeParseJSON,
  withBodySizeLimit,
  BODY_SIZE_LIMITS,
  DEFAULT_BODY_SIZE_LIMIT,
  BodySizeLimitPresets,
} from '@/lib/api/bodyLimits';
import { serverLogger } from '@/lib/serverLogger';

// Mock server logger
jest.mock('@/lib/serverLogger');

describe('BODY_SIZE_LIMITS Constants', () => {
  it('should define size limits', () => {
    expect(BODY_SIZE_LIMITS.TINY).toBe(1024);
    expect(BODY_SIZE_LIMITS.SMALL).toBe(10 * 1024);
    expect(BODY_SIZE_LIMITS.MEDIUM).toBe(100 * 1024);
    expect(BODY_SIZE_LIMITS.LARGE).toBe(1024 * 1024);
    expect(BODY_SIZE_LIMITS.XLARGE).toBe(10 * 1024 * 1024);
  });

  it('should have correct default limit', () => {
    expect(DEFAULT_BODY_SIZE_LIMIT).toBe(BODY_SIZE_LIMITS.MEDIUM);
  });
});

describe('validateBodySize', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Valid Body Sizes', () => {
    it('should allow body under limit', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '1000',
        },
      });

      const response = validateBodySize(request, BODY_SIZE_LIMITS.SMALL);

      expect(response).toBeNull();
    });

    it('should allow body exactly at limit', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': String(BODY_SIZE_LIMITS.SMALL),
        },
      });

      const response = validateBodySize(request, BODY_SIZE_LIMITS.SMALL);

      expect(response).toBeNull();
    });

    it('should allow body with no content-length header', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      });

      const response = validateBodySize(request, BODY_SIZE_LIMITS.SMALL);

      expect(response).toBeNull();
    });
  });

  describe('Oversized Bodies', () => {
    it('should reject body over limit', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '100000',
        },
      });

      const response = validateBodySize(request, BODY_SIZE_LIMITS.SMALL);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(413); // Payload Too Large

      const body = await response!.json();
      expect(body).toHaveProperty('error', 'Request body too large');
      expect(body).toHaveProperty('maxSize');
      expect(body).toHaveProperty('actualSize');
    });

    it('should log oversized body warning', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '100000',
        },
      });

      validateBodySize(request, BODY_SIZE_LIMITS.SMALL);

      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'api.body_size.exceeded',
          contentLength: 100000,
          limit: BODY_SIZE_LIMITS.SMALL,
        }),
        expect.any(String)
      );
    });
  });

  describe('Default Limit', () => {
    it('should use default limit when not specified', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': String(DEFAULT_BODY_SIZE_LIMIT + 1),
        },
      });

      const response = validateBodySize(request);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(413);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid content-length header', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': 'invalid',
        },
      });

      const response = validateBodySize(request, BODY_SIZE_LIMITS.SMALL);

      expect(response).toBeNull();
    });

    it('should handle negative content-length', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '-100',
        },
      });

      const response = validateBodySize(request, BODY_SIZE_LIMITS.SMALL);

      // Negative values should pass through (invalid, will fail later)
      expect(response).toBeNull();
    });

    it('should handle zero content-length', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '0',
        },
      });

      const response = validateBodySize(request, BODY_SIZE_LIMITS.SMALL);

      expect(response).toBeNull();
    });
  });
});

describe('safeParseJSON', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Valid JSON Parsing', () => {
    it('should parse valid JSON', async () => {
      const body = { test: 'data', nested: { value: 123 } };
      const bodyString = JSON.stringify(body);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': String(bodyString.length),
        },
        body: bodyString,
      });

      const result = await safeParseJSON(request, BODY_SIZE_LIMITS.SMALL);

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data).toEqual(body);
      }
    });

    it('should parse empty object', async () => {
      const body = {};
      const bodyString = JSON.stringify(body);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': String(bodyString.length),
        },
        body: bodyString,
      });

      const result = await safeParseJSON(request, BODY_SIZE_LIMITS.SMALL);

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data).toEqual({});
      }
    });

    it('should parse arrays', async () => {
      const body = [1, 2, 3, { key: 'value' }];
      const bodyString = JSON.stringify(body);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': String(bodyString.length),
        },
        body: bodyString,
      });

      const result = await safeParseJSON(request, BODY_SIZE_LIMITS.SMALL);

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data).toEqual(body);
      }
    });
  });

  describe('Size Validation', () => {
    it('should reject oversized body based on content-length', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '100000',
        },
      });

      const result = await safeParseJSON(request, BODY_SIZE_LIMITS.SMALL);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.status).toBe(413);
      }
    });

    it('should reject oversized body after parsing', async () => {
      const largeBody = { data: 'x'.repeat(100000) };
      const bodyString = JSON.stringify(largeBody);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: bodyString,
      });

      const result = await safeParseJSON(request, BODY_SIZE_LIMITS.TINY);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        const body = await result.error.json();
        expect(body).toHaveProperty('error', 'Request body too large');
      }
    });
  });

  describe('Invalid JSON', () => {
    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: 'invalid json{',
      });

      const result = await safeParseJSON(request, BODY_SIZE_LIMITS.SMALL);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.status).toBe(400);
        const body = await result.error.json();
        expect(body).toHaveProperty('error', 'Invalid request body');
      }
    });

    it('should log parse errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: 'invalid',
      });

      await safeParseJSON(request, BODY_SIZE_LIMITS.SMALL);

      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'api.body_size.parse_error',
        }),
        expect.any(String)
      );
    });
  });
});

describe('withBodySizeLimit', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('POST Requests', () => {
    it('should validate body size for POST', async () => {
      const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const wrappedHandler = withBodySizeLimit(handler, BODY_SIZE_LIMITS.SMALL);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '1000',
        },
      });

      await wrappedHandler(request);

      expect(handler).toHaveBeenCalledWith(request);
    });

    it('should reject oversized POST body', async () => {
      const handler = jest.fn();

      const wrappedHandler = withBodySizeLimit(handler, BODY_SIZE_LIMITS.SMALL);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '100000',
        },
      });

      const response = await wrappedHandler(request);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(413);
    });
  });

  describe('GET Requests', () => {
    it('should skip validation for GET', async () => {
      const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const wrappedHandler = withBodySizeLimit(handler, BODY_SIZE_LIMITS.SMALL);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      await wrappedHandler(request);

      expect(handler).toHaveBeenCalledWith(request);
    });
  });

  describe('Other Methods', () => {
    it('should skip validation for DELETE', async () => {
      const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const wrappedHandler = withBodySizeLimit(handler, BODY_SIZE_LIMITS.SMALL);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE',
      });

      await wrappedHandler(request);

      expect(handler).toHaveBeenCalled();
    });

    it('should skip validation for OPTIONS', async () => {
      const handler = jest.fn().mockResolvedValue(new NextResponse(null));

      const wrappedHandler = withBodySizeLimit(handler, BODY_SIZE_LIMITS.SMALL);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
      });

      await wrappedHandler(request);

      expect(handler).toHaveBeenCalled();
    });

    it('should skip validation for HEAD', async () => {
      const handler = jest.fn().mockResolvedValue(new NextResponse(null));

      const wrappedHandler = withBodySizeLimit(handler, BODY_SIZE_LIMITS.SMALL);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'HEAD',
      });

      await wrappedHandler(request);

      expect(handler).toHaveBeenCalled();
    });

    it('should validate PUT requests', async () => {
      const handler = jest.fn();

      const wrappedHandler = withBodySizeLimit(handler, BODY_SIZE_LIMITS.SMALL);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'PUT',
        headers: {
          'content-length': '100000',
        },
      });

      const response = await wrappedHandler(request);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(413);
    });

    it('should validate PATCH requests', async () => {
      const handler = jest.fn();

      const wrappedHandler = withBodySizeLimit(handler, BODY_SIZE_LIMITS.SMALL);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'PATCH',
        headers: {
          'content-length': '100000',
        },
      });

      const response = await wrappedHandler(request);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(413);
    });
  });

  describe('Default Limit', () => {
    it('should use default limit when not specified', async () => {
      const handler = jest.fn();

      const wrappedHandler = withBodySizeLimit(handler);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': String(DEFAULT_BODY_SIZE_LIMIT + 1),
        },
      });

      const response = await wrappedHandler(request);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(413);
    });
  });
});

describe('BodySizeLimitPresets', () => {
  it('should define auth preset', () => {
    expect(BodySizeLimitPresets.auth).toBe(BODY_SIZE_LIMITS.TINY);
  });

  it('should define crud preset', () => {
    expect(BodySizeLimitPresets.crud).toBe(BODY_SIZE_LIMITS.SMALL);
  });

  it('should define api preset', () => {
    expect(BodySizeLimitPresets.api).toBe(BODY_SIZE_LIMITS.MEDIUM);
  });

  it('should define content preset', () => {
    expect(BodySizeLimitPresets.content).toBe(BODY_SIZE_LIMITS.LARGE);
  });

  it('should define batch preset', () => {
    expect(BodySizeLimitPresets.batch).toBe(BODY_SIZE_LIMITS.XLARGE);
  });
});

describe('Response Format', () => {
  it('should format bytes in error message', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        'content-length': '100000',
      },
    });

    const response = validateBodySize(request, BODY_SIZE_LIMITS.SMALL);
    const body = await response!.json();

    expect(body.maxSize).toMatch(/KB$/);
    expect(body.actualSize).toMatch(/KB$/);
  });

  it('should format large sizes as MB', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        'content-length': String(10 * 1024 * 1024),
      },
    });

    const response = validateBodySize(request, BODY_SIZE_LIMITS.MEDIUM);
    const body = await response!.json();

    expect(body.actualSize).toMatch(/MB$/);
  });
});

describe('Integration', () => {
  it('should work with safeParseJSON in handler', async () => {
    const handler = async (request: NextRequest) => {
      const result = await safeParseJSON(request, BODY_SIZE_LIMITS.SMALL);

      if ('error' in result) {
        return result.error;
      }

      return NextResponse.json({ received: result.data });
    };

    const wrappedHandler = withBodySizeLimit(handler, BODY_SIZE_LIMITS.SMALL);

    const body = { test: 'data' };
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const response = await wrappedHandler(request);
    const responseBody = await response.json();

    expect(responseBody).toEqual({ received: body });
  });
});
