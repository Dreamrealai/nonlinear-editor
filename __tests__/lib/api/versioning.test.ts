/**
 * Tests for API Versioning Utilities
 *
 * @module __tests__/lib/api/versioning.test
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAPIVersion,
  validateAPIVersion,
  addVersionHeaders,
  withVersioning,
  versionedErrorResponse,
  versionedSuccessResponse,
  deprecateVersion,
  API_VERSIONS,
  DEFAULT_API_VERSION,
  VERSION_HEADERS,
} from '@/lib/api/versioning';
import { serverLogger } from '@/lib/serverLogger';

// Mock server logger
jest.mock('@/lib/serverLogger');

describe('getAPIVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Header-based versioning', () => {
    it('should extract version from X-API-Version header', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'X-API-Version': 'v1' },
      });

      const version = getAPIVersion(request);
      expect(version).toBe('v1');
    });

    it('should normalize version without v prefix', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'X-API-Version': '1' },
      });

      const version = getAPIVersion(request);
      expect(version).toBe('v1');
    });

    it('should handle case-insensitive header', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'X-API-Version': 'V1' },
      });

      const version = getAPIVersion(request);
      expect(version).toBe('v1');
    });

    it('should return default for invalid header version', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'X-API-Version': 'invalid' },
      });

      const version = getAPIVersion(request);
      expect(version).toBe(DEFAULT_API_VERSION);
    });
  });

  describe('Path-based versioning', () => {
    it('should extract version from URL path', () => {
      const request = new NextRequest('http://localhost:3000/api/v1/test');

      const version = getAPIVersion(request);
      expect(version).toBe('v1');
    });

    it('should prioritize header over path', () => {
      const request = new NextRequest('http://localhost:3000/api/v1/test', {
        headers: { 'X-API-Version': 'v1' },
      });

      const version = getAPIVersion(request);
      expect(version).toBe('v1');
    });

    it('should return default when no version in path', () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      const version = getAPIVersion(request);
      expect(version).toBe(DEFAULT_API_VERSION);
    });
  });

  describe('Default version', () => {
    it('should return default when no version specified', () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      const version = getAPIVersion(request);
      expect(version).toBe(DEFAULT_API_VERSION);
    });
  });
});

describe('validateAPIVersion', () => {
  it('should validate existing version', () => {
    const config = validateAPIVersion('v1');

    expect(config).toBeDefined();
    expect(config?.version).toBe('1');
  });

  it('should return undefined for invalid version', () => {
    const config = validateAPIVersion('v99');

    expect(config).toBeUndefined();
  });

  it('should handle case-insensitive validation', () => {
    const config = validateAPIVersion('V1');

    expect(config).toBeDefined();
    expect(config?.version).toBe('1');
  });

  it('should validate version properties', () => {
    const config = validateAPIVersion('v1');

    expect(config).toHaveProperty('version');
    expect(config).toHaveProperty('stable');
    expect(config).toHaveProperty('deprecated');
  });
});

describe('addVersionHeaders', () => {
  it('should add version header to response', () => {
    const response = NextResponse.json({ data: 'test' });
    const versionedResponse = addVersionHeaders(response, 'v1');

    expect(versionedResponse.headers.get(VERSION_HEADERS.RESPONSE)).toBe('v1');
  });

  it('should not add headers for invalid version', () => {
    const response = NextResponse.json({ data: 'test' });
    const versionedResponse = addVersionHeaders(response, 'invalid');

    expect(versionedResponse.headers.get(VERSION_HEADERS.RESPONSE)).toBeNull();
  });

  it('should add deprecation header for deprecated version', () => {
    // Temporarily mark v1 as deprecated
    const originalDeprecated = API_VERSIONS.v1.deprecated;
    API_VERSIONS.v1.deprecated = true;
    API_VERSIONS.v1.deprecationMessage = 'Use v2 instead';

    const response = NextResponse.json({ data: 'test' });
    const versionedResponse = addVersionHeaders(response, 'v1');

    expect(versionedResponse.headers.get(VERSION_HEADERS.DEPRECATION)).toBe('Use v2 instead');

    // Restore original state
    API_VERSIONS.v1.deprecated = originalDeprecated;
    delete API_VERSIONS.v1.deprecationMessage;
  });

  it('should add sunset header when available', () => {
    const originalSunsetDate = API_VERSIONS.v1.sunsetDate;
    API_VERSIONS.v1.sunsetDate = '2026-01-01T00:00:00Z';

    const response = NextResponse.json({ data: 'test' });
    const versionedResponse = addVersionHeaders(response, 'v1');

    expect(versionedResponse.headers.get(VERSION_HEADERS.SUNSET)).toBe('2026-01-01T00:00:00Z');

    // Restore original state
    delete API_VERSIONS.v1.sunsetDate;
    API_VERSIONS.v1.sunsetDate = originalSunsetDate;
  });

  it('should return same response instance', () => {
    const response = NextResponse.json({ data: 'test' });
    const versionedResponse = addVersionHeaders(response, 'v1');

    expect(versionedResponse).toBe(response);
  });
});

describe('withVersioning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should wrap handler and add version headers', async () => {
    const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

    const wrappedHandler = withVersioning(handler);
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'X-API-Version': 'v1' },
    });

    const response = await wrappedHandler(request);

    expect(handler).toHaveBeenCalledWith(request, 'v1');
    expect(response.headers.get(VERSION_HEADERS.RESPONSE)).toBe('v1');
  });

  it('should reject invalid version', async () => {
    const handler = jest.fn();
    const wrappedHandler = withVersioning(handler);
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'X-API-Version': 'invalid' },
    });

    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'Unsupported API version',
      requestedVersion: DEFAULT_API_VERSION,
    });
  });

  it('should enforce required version', async () => {
    const handler = jest.fn();
    const wrappedHandler = withVersioning(handler, { requiredVersion: 'v1' });
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'X-API-Version': 'v1' },
    });

    const response = await wrappedHandler(request);

    expect(handler).toHaveBeenCalled();
  });

  it('should reject version mismatch', async () => {
    const handler = jest.fn();
    const wrappedHandler = withVersioning(handler, { requiredVersion: 'v2' });
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'X-API-Version': 'v1' },
    });

    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'Version mismatch',
      requestedVersion: 'v1',
      requiredVersion: 'v2',
    });
  });

  it('should warn about deprecated version', async () => {
    const originalDeprecated = API_VERSIONS.v1.deprecated;
    API_VERSIONS.v1.deprecated = true;
    API_VERSIONS.v1.deprecationMessage = 'Deprecated';

    const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

    const wrappedHandler = withVersioning(handler);
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'X-API-Version': 'v1' },
    });

    await wrappedHandler(request);

    expect(serverLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'api.deprecated_version',
        version: 'v1',
      }),
      expect.any(String)
    );

    // Restore
    API_VERSIONS.v1.deprecated = originalDeprecated;
    delete API_VERSIONS.v1.deprecationMessage;
  });

  it('should allow deprecated version with flag', async () => {
    const originalDeprecated = API_VERSIONS.v1.deprecated;
    API_VERSIONS.v1.deprecated = true;

    const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

    const wrappedHandler = withVersioning(handler, { allowDeprecated: true });
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'X-API-Version': 'v1' },
    });

    const response = await wrappedHandler(request);

    expect(handler).toHaveBeenCalled();
    expect(response.status).toBe(200);

    // Restore
    API_VERSIONS.v1.deprecated = originalDeprecated;
  });
});

describe('versionedErrorResponse', () => {
  it('should create error response with version headers', () => {
    const response = versionedErrorResponse('Test error', 400, 'v1');

    expect(response.status).toBe(400);
    expect(response.headers.get(VERSION_HEADERS.RESPONSE)).toBe('v1');
  });

  it('should include error message in body', async () => {
    const response = versionedErrorResponse('Not found', 404, 'v1');

    const body = await response.json();
    expect(body).toEqual({ error: 'Not found' });
  });
});

describe('versionedSuccessResponse', () => {
  it('should create success response with version headers', () => {
    const data = { success: true, data: 'test' };
    const response = versionedSuccessResponse(data, 'v1');

    expect(response.status).toBe(200);
    expect(response.headers.get(VERSION_HEADERS.RESPONSE)).toBe('v1');
  });

  it('should include data in body', async () => {
    const data = { success: true, data: 'test' };
    const response = versionedSuccessResponse(data, 'v1');

    const body = await response.json();
    expect(body).toEqual(data);
  });

  it('should support custom status code', () => {
    const data = { created: true };
    const response = versionedSuccessResponse(data, 'v1', 201);

    expect(response.status).toBe(201);
  });

  it('should handle various data types', async () => {
    const testCases = [
      { data: 'string' },
      123,
      true,
      null,
      { nested: { object: 'value' } },
      ['array', 'of', 'items'],
    ];

    for (const testData of testCases) {
      const response = versionedSuccessResponse(testData, 'v1');
      const body = await response.json();
      expect(body).toEqual(testData);
    }
  });
});

describe('deprecateVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should mark version as deprecated', () => {
    const originalDeprecated = API_VERSIONS.v1.deprecated;

    deprecateVersion('v1', 'Use v2 instead', '2026-01-01T00:00:00Z');

    expect(API_VERSIONS.v1.deprecated).toBe(true);
    expect(API_VERSIONS.v1.deprecationMessage).toBe('Use v2 instead');
    expect(API_VERSIONS.v1.sunsetDate).toBe('2026-01-01T00:00:00Z');

    // Restore
    API_VERSIONS.v1.deprecated = originalDeprecated;
    delete API_VERSIONS.v1.deprecationMessage;
    delete API_VERSIONS.v1.sunsetDate;
  });

  it('should log deprecation', () => {
    const originalDeprecated = API_VERSIONS.v1.deprecated;

    deprecateVersion('v1', 'Use v2 instead');

    expect(serverLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'api.version_deprecated',
        version: 'v1',
        message: 'Use v2 instead',
      }),
      expect.stringContaining('deprecated')
    );

    // Restore
    API_VERSIONS.v1.deprecated = originalDeprecated;
    delete API_VERSIONS.v1.deprecationMessage;
  });

  it('should handle version without sunset date', () => {
    const originalDeprecated = API_VERSIONS.v1.deprecated;

    deprecateVersion('v1', 'Use v2 instead');

    expect(API_VERSIONS.v1.deprecated).toBe(true);
    expect(API_VERSIONS.v1.deprecationMessage).toBe('Use v2 instead');
    expect(API_VERSIONS.v1.sunsetDate).toBeUndefined();

    // Restore
    API_VERSIONS.v1.deprecated = originalDeprecated;
    delete API_VERSIONS.v1.deprecationMessage;
  });

  it('should not error for invalid version', () => {
    expect(() => {
      deprecateVersion('invalid', 'Test');
    }).not.toThrow();
  });
});

describe('API_VERSIONS Configuration', () => {
  it('should have v1 configured', () => {
    expect(API_VERSIONS.v1).toBeDefined();
    expect(API_VERSIONS.v1.version).toBe('1');
  });

  it('should have stable flag set', () => {
    expect(API_VERSIONS.v1.stable).toBe(true);
  });

  it('should not be deprecated by default', () => {
    expect(API_VERSIONS.v1.deprecated).toBe(false);
  });
});

describe('VERSION_HEADERS Constants', () => {
  it('should define request header', () => {
    expect(VERSION_HEADERS.REQUEST).toBe('X-API-Version');
  });

  it('should define response header', () => {
    expect(VERSION_HEADERS.RESPONSE).toBe('X-API-Version');
  });

  it('should define deprecation header', () => {
    expect(VERSION_HEADERS.DEPRECATION).toBe('X-API-Deprecation-Warning');
  });

  it('should define sunset header', () => {
    expect(VERSION_HEADERS.SUNSET).toBe('Sunset');
  });
});

describe('Edge Cases', () => {
  it('should handle empty string version', () => {
    const config = validateAPIVersion('');
    expect(config).toBeUndefined();
  });

  it('should handle null/undefined gracefully', () => {
    expect(() => validateAPIVersion(null as any)).not.toThrow();
    expect(() => validateAPIVersion(undefined as any)).not.toThrow();
  });

  it('should handle malformed path versions', () => {
    const request = new NextRequest('http://localhost:3000/api/v/test');
    const version = getAPIVersion(request);
    expect(version).toBe(DEFAULT_API_VERSION);
  });
});
