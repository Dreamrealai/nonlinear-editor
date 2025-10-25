/**
 * Tests for GET /api/health - Health Check Endpoint
 */

import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  describe('Success Cases', () => {
    it('should return healthy status with metadata', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('version');
    });

    it('should return valid ISO timestamp', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeTruthy();
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });

    it('should return numeric uptime', async () => {
      const response = await GET();
      const data = await response.json();

      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return current environment', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBeTruthy();
      expect(typeof data.environment).toBe('string');
    });
  });

  describe('Response Format', () => {
    it('should return JSON content type', async () => {
      const response = await GET();

      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');
    });

    it('should have all required fields', async () => {
      const response = await GET();
      const data = await response.json();

      const requiredFields = ['status', 'timestamp', 'uptime', 'environment', 'version'];
      requiredFields.forEach((field) => {
        expect(data).toHaveProperty(field);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Date constructor errors gracefully', async () => {
      // Mock Date to throw error
      const originalDate = global.Date;
      (global.Date as any) = class extends originalDate {
        constructor() {
          throw new Error('Date constructor failed');
        }
      };

      try {
        const response = await GET();
        expect(response.status).toBe(503);
        const data = await response.json();
        expect(data.status).toBe('unhealthy');
        expect(data.error).toContain('Date constructor failed');
      } finally {
        global.Date = originalDate;
      }
    });

    it('should handle process.uptime() errors', async () => {
      const originalUptime = process.uptime;
      (process.uptime as any) = (): never => {
        throw new Error('Uptime unavailable');
      };

      try {
        const response = await GET();
        expect(response.status).toBe(503);
        const data = await response.json();
        expect(data.status).toBe('unhealthy');
        expect(data.error).toBeTruthy();
      } finally {
        process.uptime = originalUptime;
      }
    });

    it('should handle missing NODE_ENV gracefully', async () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      try {
        const response = await GET();
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.status).toBe('healthy');
        // Environment should be undefined but endpoint should still work
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle missing npm_package_version', async () => {
      const originalVersion = process.env.npm_package_version;
      delete process.env.npm_package_version;

      try {
        const response = await GET();
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.version).toBe('unknown');
      } finally {
        if (originalVersion) {
          process.env.npm_package_version = originalVersion;
        }
      }
    });

    it('should return error object with timestamp when unhealthy', async () => {
      const originalDate = global.Date;
      let callCount = 0;
      (global.Date as any) = class extends originalDate {
        constructor() {
          if (callCount === 0) {
            callCount++;
            throw new Error('First Date call failed');
          }
          return new originalDate();
        }
      };

      try {
        const response = await GET();
        expect(response.status).toBe(503);
        const data = await response.json();
        expect(data).toHaveProperty('status', 'unhealthy');
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('error');
      } finally {
        global.Date = originalDate;
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long uptime values', async () => {
      const originalUptime = process.uptime;
      process.uptime = jest.fn(() => Number.MAX_SAFE_INTEGER);

      try {
        const response = await GET();
        const data = await response.json();
        expect(data.uptime).toBe(Number.MAX_SAFE_INTEGER);
      } finally {
        process.uptime = originalUptime;
      }
    });

    it('should handle zero uptime', async () => {
      const originalUptime = process.uptime;
      process.uptime = jest.fn(() => 0);

      try {
        const response = await GET();
        const data = await response.json();
        expect(data.uptime).toBe(0);
      } finally {
        process.uptime = originalUptime;
      }
    });

    it('should handle fractional uptime values', async () => {
      const originalUptime = process.uptime;
      process.uptime = jest.fn(() => 123.456789);

      try {
        const response = await GET();
        const data = await response.json();
        expect(data.uptime).toBe(123.456789);
      } finally {
        process.uptime = originalUptime;
      }
    });

    it('should handle special characters in environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test-<script>alert("xss")</script>';

      try {
        const response = await GET();
        const data = await response.json();
        expect(data.environment).toBe('test-<script>alert("xss")</script>');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle special characters in version', async () => {
      const originalVersion = process.env.npm_package_version;
      process.env.npm_package_version = '1.0.0-beta+<>&"';

      try {
        const response = await GET();
        const data = await response.json();
        expect(data.version).toBe('1.0.0-beta+<>&"');
      } finally {
        if (originalVersion) {
          process.env.npm_package_version = originalVersion;
        } else {
          delete process.env.npm_package_version;
        }
      }
    });

    it('should handle very long environment strings', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'a'.repeat(10000);

      try {
        const response = await GET();
        const data = await response.json();
        expect(data.environment.length).toBe(10000);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle empty string environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = '';

      try {
        const response = await GET();
        const data = await response.json();
        expect(data.environment).toBe('');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle empty string version', async () => {
      const originalVersion = process.env.npm_package_version;
      process.env.npm_package_version = '';

      try {
        const response = await GET();
        const data = await response.json();
        expect(data.version).toBe('unknown');
      } finally {
        if (originalVersion) {
          process.env.npm_package_version = originalVersion;
        } else {
          delete process.env.npm_package_version;
        }
      }
    });
  });

  describe('Consistency', () => {
    it('should return consistent structure on multiple calls', async () => {
      const response1 = await GET();
      const response2 = await GET();

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(Object.keys(data1).sort()).toEqual(Object.keys(data2).sort());
    });

    it('should increment uptime over time', async () => {
      const response1 = await GET();
      const data1 = await response1.json();

      // Wait a tiny bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response2 = await GET();
      const data2 = await response2.json();

      expect(data2.uptime).toBeGreaterThanOrEqual(data1.uptime);
    });

    it('should have timestamps in chronological order', async () => {
      const response1 = await GET();
      const data1 = await response1.json();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const response2 = await GET();
      const data2 = await response2.json();

      const time1 = new Date(data1.timestamp).getTime();
      const time2 = new Date(data2.timestamp).getTime();

      expect(time2).toBeGreaterThanOrEqual(time1);
    });
  });

  describe('Non-Error Type Handling', () => {
    it('should handle non-Error thrown values', async () => {
      const originalDate = global.Date;
      (global.Date as any) = class {
        constructor() {
          throw 'String error';
        }
      };

      try {
        const response = await GET();
        expect(response.status).toBe(503);
        const data = await response.json();
        expect(data.status).toBe('unhealthy');
        expect(data.error).toBe('Unknown error');
      } finally {
        global.Date = originalDate;
      }
    });

    it('should handle null thrown value', async () => {
      const originalDate = global.Date;
      (global.Date as any) = class {
        constructor() {
          throw null;
        }
      };

      try {
        const response = await GET();
        expect(response.status).toBe(503);
        const data = await response.json();
        expect(data.error).toBe('Unknown error');
      } finally {
        global.Date = originalDate;
      }
    });

    it('should handle undefined thrown value', async () => {
      const originalDate = global.Date;
      (global.Date as any) = class {
        constructor() {
          throw undefined;
        }
      };

      try {
        const response = await GET();
        expect(response.status).toBe(503);
        const data = await response.json();
        expect(data.error).toBe('Unknown error');
      } finally {
        global.Date = originalDate;
      }
    });

    it('should handle number thrown value', async () => {
      const originalDate = global.Date;
      (global.Date as any) = class {
        constructor() {
          throw 42;
        }
      };

      try {
        const response = await GET();
        expect(response.status).toBe(503);
        const data = await response.json();
        expect(data.error).toBe('Unknown error');
      } finally {
        global.Date = originalDate;
      }
    });

    it('should handle object thrown value', async () => {
      const originalDate = global.Date;
      (global.Date as any) = class {
        constructor() {
          throw { code: 500, msg: 'Server error' };
        }
      };

      try {
        const response = await GET();
        expect(response.status).toBe(503);
        const data = await response.json();
        expect(data.error).toBe('Unknown error');
      } finally {
        global.Date = originalDate;
      }
    });
  });
});
