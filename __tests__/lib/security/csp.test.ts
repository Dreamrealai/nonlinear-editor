/**
 * Tests for Content Security Policy Utilities
 *
 * @module __tests__/lib/security/csp.test
 */

import {
  generateNonce,
  buildCSPHeader,
  getSecurityHeaders,
  CSP_NONCE_HEADER,
  type CSPOptions,
} from '@/lib/security/csp';

// Mock crypto
const mockGetRandomValues = jest.fn();
global.crypto = {
  getRandomValues: mockGetRandomValues,
} as any;

describe('generateNonce', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    // Mock crypto.getRandomValues to return predictable values
    mockGetRandomValues.mockImplementation((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = i;
      }
      return array;
    });
  });

  it('should generate a nonce string', () => {
    const nonce = generateNonce();

    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
  });

  it('should use crypto.getRandomValues', () => {
    generateNonce();

    expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(mockGetRandomValues).toHaveBeenCalledWith(expect.objectContaining({ length: 16 }));
  });

  it('should return base64 encoded string', () => {
    const nonce = generateNonce();

    // Base64 strings only contain these characters
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('should generate 16-byte nonces', () => {
    generateNonce();

    const callArg = mockGetRandomValues.mock.calls[0][0];
    expect(callArg).toBeInstanceOf(Uint8Array);
    expect(callArg.length).toBe(16);
  });

  it('should generate different nonces on successive calls', () => {
    // Use real crypto for this test
    global.crypto.getRandomValues = (array: any) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };

    const nonce1 = generateNonce();
    const nonce2 = generateNonce();
    const nonce3 = generateNonce();

    expect(nonce1).not.toBe(nonce2);
    expect(nonce2).not.toBe(nonce3);
    expect(nonce1).not.toBe(nonce3);
  });
});

describe('buildCSPHeader', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Basic Header Generation', () => {
    it('should generate valid CSP header', () => {
      const csp = buildCSPHeader();

      expect(typeof csp).toBe('string');
      expect(csp).toContain("default-src 'self'");
    });

    it('should include required directives', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain('default-src');
      expect(csp).toContain('script-src');
      expect(csp).toContain('style-src');
      expect(csp).toContain('img-src');
      expect(csp).toContain('media-src');
      expect(csp).toContain('connect-src');
      expect(csp).toContain('font-src');
      expect(csp).toContain('object-src');
      expect(csp).toContain('base-uri');
      expect(csp).toContain('form-action');
      expect(csp).toContain('frame-ancestors');
    });

    it('should use semicolon separator', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain('; ');
      const directives = csp.split('; ');
      expect(directives.length).toBeGreaterThan(5);
    });
  });

  describe('Nonce Support', () => {
    it('should include nonce in script-src when provided', () => {
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader({ nonce });

      expect(csp).toContain(`'nonce-${nonce}'`);
      expect(csp).toContain(`script-src`);
    });

    it('should not include nonce when not provided', () => {
      const csp = buildCSPHeader();

      expect(csp).not.toContain("'nonce-");
    });

    it('should format nonce correctly', () => {
      const nonce = 'ABC123xyz==';
      const csp = buildCSPHeader({ nonce });

      expect(csp).toContain(`'nonce-${nonce}'`);
    });
  });

  describe('Development Mode', () => {
    it('should include unsafe-eval in development', () => {
      const csp = buildCSPHeader({ isDevelopment: true });

      expect(csp).toContain("'unsafe-eval'");
    });

    it('should not include unsafe-eval in production', () => {
      const csp = buildCSPHeader({ isDevelopment: false });

      expect(csp).not.toContain("'unsafe-eval'");
    });

    it('should not include upgrade-insecure-requests in development', () => {
      const csp = buildCSPHeader({ isDevelopment: true });

      expect(csp).not.toContain('upgrade-insecure-requests');
    });

    it('should include upgrade-insecure-requests in production', () => {
      const csp = buildCSPHeader({ isDevelopment: false });

      expect(csp).toContain('upgrade-insecure-requests');
    });
  });

  describe('Security Directives', () => {
    it('should block object/embed/applet', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain("object-src 'none'");
    });

    it('should prevent framing', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should restrict base-uri', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain("base-uri 'self'");
    });

    it('should restrict form-action', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain("form-action 'self'");
    });

    it('should require wasm-unsafe-eval for Next.js', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain("'wasm-unsafe-eval'");
    });
  });

  describe('Third-Party Services', () => {
    it('should allow Vercel Analytics', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain('va.vercel-scripts.com');
    });

    it('should allow Supabase connections', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain('*.supabase.co');
      expect(csp).toContain('wss://*.supabase.co');
    });

    it('should allow Fal.ai for video generation', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain('fal.run');
      expect(csp).toContain('queue.fal.run');
    });

    it('should allow Google Gemini API', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain('generativelanguage.googleapis.com');
    });

    it('should allow Google Fonts', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain('fonts.googleapis.com');
      expect(csp).toContain('fonts.gstatic.com');
    });
  });

  describe('Media and Images', () => {
    it('should allow data URIs for images', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain('img-src');
      expect(csp).toContain('data:');
    });

    it('should allow blob URLs', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain('blob:');
    });

    it('should allow Supabase storage for media', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain('media-src');
      expect(csp).toContain('*.supabase.co');
    });
  });

  describe('Styles', () => {
    it('should allow unsafe-inline for Tailwind', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain('style-src');
      expect(csp).toContain("'unsafe-inline'");
    });

    it('should allow self for styles', () => {
      const csp = buildCSPHeader();

      expect(csp).toContain("style-src 'self'");
    });
  });

  describe('Options Combination', () => {
    it('should handle nonce and development mode together', () => {
      const options: CSPOptions = {
        nonce: 'test-nonce',
        isDevelopment: true,
      };

      const csp = buildCSPHeader(options);

      expect(csp).toContain("'nonce-test-nonce'");
      expect(csp).toContain("'unsafe-eval'");
      expect(csp).not.toContain('upgrade-insecure-requests');
    });

    it('should handle nonce in production', () => {
      const options: CSPOptions = {
        nonce: 'prod-nonce',
        isDevelopment: false,
      };

      const csp = buildCSPHeader(options);

      expect(csp).toContain("'nonce-prod-nonce'");
      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp).toContain('upgrade-insecure-requests');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options object', () => {
      const csp = buildCSPHeader({});

      expect(csp).toBeDefined();
      expect(csp.length).toBeGreaterThan(0);
    });

    it('should handle undefined options', () => {
      const csp = buildCSPHeader(undefined);

      expect(csp).toBeDefined();
    });

    it('should handle empty nonce string', () => {
      const csp = buildCSPHeader({ nonce: '' });

      // Empty nonce should be filtered out
      expect(csp).not.toContain("'nonce-'");
    });

    it('should produce valid CSP format', () => {
      const csp = buildCSPHeader({ nonce: 'test', isDevelopment: true });

      // Should not have trailing semicolon
      expect(csp.endsWith(';')).toBe(false);
      // Should not have leading/trailing spaces
      expect(csp).toBe(csp.trim());
      // Each directive should have a value
      const directives = csp.split('; ');
      directives.forEach((directive) => {
        expect(directive).toContain(' ');
        expect(directive.split(' ').length).toBeGreaterThanOrEqual(2);
      });
    });
  });
});

describe('getSecurityHeaders', () => {
  it('should return array of security headers', () => {
    const headers = getSecurityHeaders();

    expect(Array.isArray(headers)).toBe(true);
    expect(headers.length).toBeGreaterThan(0);
  });

  it('should include X-Content-Type-Options', () => {
    const headers = getSecurityHeaders();

    const header = headers.find((h) => h.key === 'X-Content-Type-Options');
    expect(header).toBeDefined();
    expect(header?.value).toBe('nosniff');
  });

  it('should include X-Frame-Options', () => {
    const headers = getSecurityHeaders();

    const header = headers.find((h) => h.key === 'X-Frame-Options');
    expect(header).toBeDefined();
    expect(header?.value).toBe('DENY');
  });

  it('should include X-XSS-Protection', () => {
    const headers = getSecurityHeaders();

    const header = headers.find((h) => h.key === 'X-XSS-Protection');
    expect(header).toBeDefined();
    expect(header?.value).toBe('1; mode=block');
  });

  it('should include Referrer-Policy', () => {
    const headers = getSecurityHeaders();

    const header = headers.find((h) => h.key === 'Referrer-Policy');
    expect(header).toBeDefined();
    expect(header?.value).toBe('strict-origin-when-cross-origin');
  });

  it('should include Permissions-Policy', () => {
    const headers = getSecurityHeaders();

    const header = headers.find((h) => h.key === 'Permissions-Policy');
    expect(header).toBeDefined();
    expect(header?.value).toContain('camera=()');
    expect(header?.value).toContain('microphone=()');
    expect(header?.value).toContain('geolocation=()');
  });

  it('should return headers with correct structure', () => {
    const headers = getSecurityHeaders();

    headers.forEach((header) => {
      expect(header).toHaveProperty('key');
      expect(header).toHaveProperty('value');
      expect(typeof header.key).toBe('string');
      expect(typeof header.value).toBe('string');
    });
  });

  it('should return at least 5 security headers', () => {
    const headers = getSecurityHeaders();

    expect(headers.length).toBeGreaterThanOrEqual(5);
  });

  it('should not mutate on successive calls', () => {
    const headers1 = getSecurityHeaders();
    const headers2 = getSecurityHeaders();

    expect(headers1).toEqual(headers2);
  });
});

describe('CSP_NONCE_HEADER constant', () => {
  it('should be defined', () => {
    expect(CSP_NONCE_HEADER).toBeDefined();
  });

  it('should be a string', () => {
    expect(typeof CSP_NONCE_HEADER).toBe('string');
  });

  it('should have correct value', () => {
    expect(CSP_NONCE_HEADER).toBe('x-csp-nonce');
  });

  it('should be lowercase', () => {
    expect(CSP_NONCE_HEADER).toBe(CSP_NONCE_HEADER.toLowerCase());
  });
});

describe('Integration Tests', () => {
  it('should generate complete secure CSP for production', () => {
    const nonce = generateNonce();
    const csp = buildCSPHeader({ nonce, isDevelopment: false });

    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('should generate developer-friendly CSP for development', () => {
    const nonce = generateNonce();
    const csp = buildCSPHeader({ nonce, isDevelopment: true });

    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('should work with middleware flow', () => {
    // Simulate middleware flow
    const nonce = generateNonce();
    const csp = buildCSPHeader({ nonce, isDevelopment: false });
    const headers = getSecurityHeaders();

    // Check that nonce can be passed through header
    expect(CSP_NONCE_HEADER).toBeTruthy();
    expect(nonce).toBeTruthy();
    expect(csp).toContain(nonce);

    // Check security headers are independent
    expect(headers).toBeTruthy();
    expect(headers.length).toBeGreaterThan(0);
  });
});
