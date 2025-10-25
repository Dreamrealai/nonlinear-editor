/**
 * Tests for CSP Nonce Utilities
 *
 * @module __tests__/lib/security/getNonce.test
 */

import { getNonce } from '@/lib/security/getNonce';
import { CSP_NONCE_HEADER } from '@/lib/security/csp';
import { headers } from 'next/headers';

// Mock next/headers
jest.mock(
  'next/headers',
  () => ({
    headers: jest.fn(),
  })
);

const mockHeaders = headers as jest.MockedFunction<typeof headers>;

describe('getNonce', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should return nonce from headers', async () => {
      const testNonce = 'test-nonce-abc123';
      const mockHeadersList = {
        get: jest.fn().mockReturnValue(testNonce),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const nonce = await getNonce();

      expect(nonce).toBe(testNonce);
      expect(mockHeadersList.get).toHaveBeenCalledWith(CSP_NONCE_HEADER);
    });

    it('should return undefined when nonce not present', async () => {
      const mockHeadersList = {
        get: jest.fn().mockReturnValue(null),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const nonce = await getNonce();

      expect(nonce).toBeUndefined();
    });

    it('should return undefined for empty string nonce', async () => {
      const mockHeadersList = {
        get: jest.fn().mockReturnValue(''),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const nonce = await getNonce();

      expect(nonce).toBeUndefined();
    });
  });

  describe('Header Access', () => {
    it('should use CSP_NONCE_HEADER constant', async () => {
      const mockHeadersList = {
        get: jest.fn().mockReturnValue('nonce'),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      await getNonce();

      expect(mockHeadersList.get).toHaveBeenCalledWith(CSP_NONCE_HEADER);
      expect(CSP_NONCE_HEADER).toBe('x-csp-nonce');
    });

    it('should await headers() call', async () => {
      const mockHeadersList = {
        get: jest.fn().mockReturnValue('test'),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const promise = getNonce();

      expect(promise).toBeInstanceOf(Promise);
      await promise;
    });
  });

  describe('Different Nonce Values', () => {
    it('should handle base64 nonce', async () => {
      const base64Nonce = 'YWJjMTIz==';
      const mockHeadersList = {
        get: jest.fn().mockReturnValue(base64Nonce),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const nonce = await getNonce();

      expect(nonce).toBe(base64Nonce);
    });

    it('should handle long nonce values', async () => {
      const longNonce = 'a'.repeat(100);
      const mockHeadersList = {
        get: jest.fn().mockReturnValue(longNonce),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const nonce = await getNonce();

      expect(nonce).toBe(longNonce);
    });

    it('should handle special characters in nonce', async () => {
      const specialNonce = 'abc+123/xyz==';
      const mockHeadersList = {
        get: jest.fn().mockReturnValue(specialNonce),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const nonce = await getNonce();

      expect(nonce).toBe(specialNonce);
    });
  });

  describe('Return Type', () => {
    it('should return string when nonce exists', async () => {
      const mockHeadersList = {
        get: jest.fn().mockReturnValue('nonce'),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const nonce = await getNonce();

      expect(typeof nonce).toBe('string');
    });

    it('should return undefined when nonce missing', async () => {
      const mockHeadersList = {
        get: jest.fn().mockReturnValue(null),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const nonce = await getNonce();

      expect(nonce).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle headers() throwing error', async () => {
      mockHeaders.mockRejectedValue(new Error('Headers not available'));

      await expect(getNonce()).rejects.toThrow('Headers not available');
    });

    it('should handle malformed headers object', async () => {
      mockHeaders.mockResolvedValue(null as any);

      await expect(getNonce()).rejects.toThrow();
    });
  });

  describe('Integration with Server Components', () => {
    it('should work in async server component context', async () => {
      const testNonce = 'server-component-nonce';
      const mockHeadersList = {
        get: jest.fn().mockReturnValue(testNonce),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      // Simulate server component usage
      async function ServerComponent() {
        const nonce = await getNonce();
        return nonce;
      }

      const result = await ServerComponent();

      expect(result).toBe(testNonce);
    });

    it('should be callable multiple times', async () => {
      const testNonce = 'multi-call-nonce';
      const mockHeadersList = {
        get: jest.fn().mockReturnValue(testNonce),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const nonce1 = await getNonce();
      const nonce2 = await getNonce();
      const nonce3 = await getNonce();

      expect(nonce1).toBe(testNonce);
      expect(nonce2).toBe(testNonce);
      expect(nonce3).toBe(testNonce);
      expect(mockHeaders).toHaveBeenCalledTimes(3);
    });
  });

  describe('Type Safety', () => {
    it('should have correct return type', async () => {
      const mockHeadersList = {
        get: jest.fn().mockReturnValue('nonce'),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const nonce = await getNonce();

      // TypeScript should infer: string | undefined
      if (nonce) {
        const test: string = nonce;
        expect(test).toBe('nonce');
      }
    });

    it('should allow undefined checks', async () => {
      const mockHeadersList = {
        get: jest.fn().mockReturnValue(null),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const nonce = await getNonce();

      if (nonce === undefined) {
        expect(nonce).toBeUndefined();
      } else {
        fail('Should be undefined');
      }
    });
  });

  describe('Usage Pattern Tests', () => {
    it('should support conditional script rendering', async () => {
      const testNonce = 'conditional-nonce';
      const mockHeadersList = {
        get: jest.fn().mockReturnValue(testNonce),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const nonce = await getNonce();
      const scriptTag = nonce
        ? `<script nonce="${nonce}">console.log('test')</script>`
        : `<script>console.log('test')</script>`;

      expect(scriptTag).toContain(`nonce="${testNonce}"`);
    });

    it('should support default value pattern', async () => {
      const mockHeadersList = {
        get: jest.fn().mockReturnValue(null),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const nonce = (await getNonce()) || 'default-nonce';

      expect(nonce).toBe('default-nonce');
    });
  });

  describe('Header Name Consistency', () => {
    it('should use lowercase header name', async () => {
      const mockHeadersList = {
        get: jest.fn().mockReturnValue('nonce'),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      await getNonce();

      expect(mockHeadersList.get).toHaveBeenCalledWith('x-csp-nonce');
    });

    it('should match CSP_NONCE_HEADER constant', async () => {
      const mockHeadersList = {
        get: jest.fn().mockReturnValue('nonce'),
      };

      mockHeaders.mockResolvedValue(mockHeadersList as any);

      await getNonce();

      const calledWith = mockHeadersList.get.mock.calls[0][0];
      expect(calledWith).toBe(CSP_NONCE_HEADER);
    });
  });
});

describe('Integration with CSP', () => {
  it('should retrieve nonce set by middleware', async () => {
    // Simulate middleware setting nonce
    const middlewareNonce = 'middleware-set-nonce';

    const mockHeadersList = {
      get: jest.fn((key: string) => {
        if (key === CSP_NONCE_HEADER) {
          return middlewareNonce;
        }
        return null;
      }),
    };

    mockHeaders.mockResolvedValue(mockHeadersList as any);

    const retrievedNonce = await getNonce();

    expect(retrievedNonce).toBe(middlewareNonce);
  });

  it('should work with different nonce per request', async () => {
    const nonces = ['nonce-1', 'nonce-2', 'nonce-3'];
    let callCount = 0;

    const mockHeadersList = {
      get: jest.fn(() => {
        return nonces[callCount++ % nonces.length];
      }),
    };

    mockHeaders.mockResolvedValue(mockHeadersList as any);

    const result1 = await getNonce();
    const result2 = await getNonce();
    const result3 = await getNonce();

    expect([result1, result2, result3]).toEqual(nonces);
  });
});
