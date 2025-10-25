/**
 * Tests for CORS Middleware
 *
 * @module __tests__/lib/api/cors.test
 */

import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, withCORS, CORSPresets, type CORSOptions } from '@/lib/api/cors';

// Mock environment variables
const originalEnv = process.env;

describe('corsMiddleware', () => {
  beforeEach((): void => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
  });

  afterEach((): void => {
    process.env = originalEnv;
  });

  describe('Same-Origin Requests', () => {
    it('should allow same-origin request (no origin header)', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      });

      const response = corsMiddleware(request);

      expect(response).toBeNull();
    });

    it('should allow request from same origin', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      const response = corsMiddleware(request);

      expect(response).toBeNull();
    });
  });

  describe('Cross-Origin Requests', () => {
    it('should block cross-origin request by default', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          origin: 'https://evil.com',
        },
      });

      const response = corsMiddleware(request);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(403);
    });

    it('should allow configured origin', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          origin: 'https://trusted.com',
        },
      });

      const options: CORSOptions = {
        allowedOrigins: ['https://trusted.com'],
      };

      const response = corsMiddleware(request, options);

      expect(response).toBeNull();
    });

    it('should allow multiple configured origins', () => {
      const origins = ['https://app1.com', 'https://app2.com'];
      const options: CORSOptions = { allowedOrigins: origins };

      for (const origin of origins) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: { origin },
        });

        const response = corsMiddleware(request, options);
        expect(response).toBeNull();
      }
    });

    it('should allow all origins with wildcard', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          origin: 'https://any-domain.com',
        },
      });

      const options: CORSOptions = {
        allowedOrigins: ['*'],
      };

      const response = corsMiddleware(request, options);

      expect(response).toBeNull();
    });
  });

  describe('Preflight Requests (OPTIONS)', () => {
    it('should handle OPTIONS preflight request', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://trusted.com',
        },
      });

      const options: CORSOptions = {
        allowedOrigins: ['https://trusted.com'],
      };

      const response = corsMiddleware(request, options);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(204);
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe('https://trusted.com');
    });

    it('should include allowed methods in preflight', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://trusted.com',
        },
      });

      const options: CORSOptions = {
        allowedOrigins: ['https://trusted.com'],
        allowedMethods: ['GET', 'POST'],
      };

      const response = corsMiddleware(request, options);

      expect(response!.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST');
    });

    it('should include allowed headers in preflight', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://trusted.com',
        },
      });

      const options: CORSOptions = {
        allowedOrigins: ['https://trusted.com'],
        allowedHeaders: ['Content-Type', 'X-Custom-Header'],
      };

      const response = corsMiddleware(request, options);

      expect(response!.headers.get('Access-Control-Allow-Headers')).toBe(
        'Content-Type, X-Custom-Header'
      );
    });

    it('should include max age in preflight', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://trusted.com',
        },
      });

      const options: CORSOptions = {
        allowedOrigins: ['https://trusted.com'],
        maxAge: 3600,
      };

      const response = corsMiddleware(request, options);

      expect(response!.headers.get('Access-Control-Max-Age')).toBe('3600');
    });
  });

  describe('CORS Headers', () => {
    it('should not set CORS headers for blocked origin', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          origin: 'https://evil.com',
        },
      });

      const response = corsMiddleware(request);

      expect(response).not.toBeNull();
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('should set Vary header for specific origins', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://trusted.com',
        },
      });

      const options: CORSOptions = {
        allowedOrigins: ['https://trusted.com'],
      };

      const response = corsMiddleware(request, options);

      expect(response!.headers.get('Vary')).toBe('Origin');
    });

    it('should not set Vary header for wildcard', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://any.com',
        },
      });

      const options: CORSOptions = {
        allowedOrigins: ['*'],
      };

      const response = corsMiddleware(request, options);

      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response!.headers.get('Vary')).toBeNull();
    });
  });

  describe('Credentials', () => {
    it('should not include credentials header by default', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://trusted.com',
        },
      });

      const options: CORSOptions = {
        allowedOrigins: ['https://trusted.com'],
      };

      const response = corsMiddleware(request, options);

      expect(response!.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    });

    it('should include credentials header when enabled', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://trusted.com',
        },
      });

      const options: CORSOptions = {
        allowedOrigins: ['https://trusted.com'],
        credentials: true,
      };

      const response = corsMiddleware(request, options);

      expect(response!.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });
  });

  describe('Exposed Headers', () => {
    it('should expose configured headers', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://trusted.com',
        },
      });

      const options: CORSOptions = {
        allowedOrigins: ['https://trusted.com'],
        exposedHeaders: ['X-Custom-Header', 'X-Another-Header'],
      };

      const response = corsMiddleware(request, options);

      expect(response!.headers.get('Access-Control-Expose-Headers')).toBe(
        'X-Custom-Header, X-Another-Header'
      );
    });

    it('should not set exposed headers when empty', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://trusted.com',
        },
      });

      const options: CORSOptions = {
        allowedOrigins: ['https://trusted.com'],
        exposedHeaders: [],
      };

      const response = corsMiddleware(request, options);

      expect(response!.headers.get('Access-Control-Expose-Headers')).toBeNull();
    });
  });
});

describe('withCORS Higher-Order Function', () => {
  beforeEach((): void => {
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
  });

  it('should wrap handler and add CORS headers', async () => {
    const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

    const wrappedHandler = withCORS(handler, {
      allowedOrigins: ['https://trusted.com'],
    });

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        origin: 'https://trusted.com',
      },
    });

    const response = await wrappedHandler(request);

    expect(handler).toHaveBeenCalledWith(request);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://trusted.com');
  });

  it('should block request before calling handler', async () => {
    const handler = jest.fn();

    const wrappedHandler = withCORS(handler, {
      allowedOrigins: ['https://trusted.com'],
    });

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        origin: 'https://evil.com',
      },
    });

    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
  });

  it('should handle preflight without calling handler', async () => {
    const handler = jest.fn();

    const wrappedHandler = withCORS(handler, {
      allowedOrigins: ['https://trusted.com'],
    });

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://trusted.com',
      },
    });

    const response = await wrappedHandler(request);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it('should preserve response body and status', async () => {
    const responseData = { data: 'test', success: true };
    const handler = jest.fn().mockResolvedValue(NextResponse.json(responseData, { status: 201 }));

    const wrappedHandler = withCORS(handler, {
      allowedOrigins: ['https://trusted.com'],
    });

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        origin: 'https://trusted.com',
      },
    });

    const response = await wrappedHandler(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(responseData);
  });
});

describe('CORSPresets', () => {
  describe('sameOrigin', () => {
    it('should create same-origin configuration', () => {
      const config = CORSPresets.sameOrigin();

      expect(config.allowedOrigins).toEqual([]);
      expect(config.credentials).toBe(false);
    });
  });

  describe('allowAll', () => {
    it('should create allow-all configuration', () => {
      const config = CORSPresets.allowAll();

      expect(config.allowedOrigins).toEqual(['*']);
      expect(config.credentials).toBe(false);
    });
  });

  describe('trustedOrigins', () => {
    it('should create trusted origins configuration', () => {
      const origins = ['https://app1.com', 'https://app2.com'];
      const config = CORSPresets.trustedOrigins(origins);

      expect(config.allowedOrigins).toEqual(origins);
      expect(config.credentials).toBe(true);
      expect(config.allowedHeaders).toContain('Cookie');
    });
  });

  describe('publicAPI', () => {
    it('should create public API configuration', () => {
      const config = CORSPresets.publicAPI();

      expect(config.allowedOrigins).toEqual(['*']);
      expect(config.credentials).toBe(false);
      expect(config.allowedMethods).toEqual(['GET', 'OPTIONS']);
      expect(config.allowedHeaders).toEqual(['Content-Type']);
    });
  });
});

describe('Edge Cases', () => {
  beforeEach((): void => {
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
  });

  it('should handle missing origin header gracefully', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
    });

    const response = corsMiddleware(request);

    expect(response).toBeNull();
  });

  it('should handle empty allowedOrigins array', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        origin: 'https://any.com',
      },
    });

    const options: CORSOptions = {
      allowedOrigins: [],
    };

    const response = corsMiddleware(request, options);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(403);
  });

  it('should handle missing base URL env var', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        origin: 'https://any.com',
      },
    });

    const response = corsMiddleware(request);

    expect(response).not.toBeNull();
  });

  it('should handle default options', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://trusted.com',
      },
    });

    const options: CORSOptions = {
      allowedOrigins: ['https://trusted.com'],
    };

    const response = corsMiddleware(request, options);

    expect(response).not.toBeNull();
    expect(response!.headers.get('Access-Control-Allow-Methods')).toBeDefined();
    expect(response!.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    expect(response!.headers.get('Access-Control-Max-Age')).toBeDefined();
  });

  it('should handle origin with port', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:8080',
      },
    });

    const options: CORSOptions = {
      allowedOrigins: ['http://localhost:8080'],
    };

    const response = corsMiddleware(request, options);

    expect(response).toBeNull();
  });

  it('should handle origin with subdomain', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        origin: 'https://api.example.com',
      },
    });

    const options: CORSOptions = {
      allowedOrigins: ['https://api.example.com'],
    };

    const response = corsMiddleware(request, options);

    expect(response).toBeNull();
  });

  it('should be case-sensitive for origins', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        origin: 'https://Example.com',
      },
    });

    const options: CORSOptions = {
      allowedOrigins: ['https://example.com'],
    };

    const response = corsMiddleware(request, options);

    // Origins are case-sensitive, should be blocked
    expect(response).not.toBeNull();
    expect(response!.status).toBe(403);
  });
});
