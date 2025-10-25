/**
 * Tests for GET /api/docs - API Documentation Route
 *
 * Tests cover OpenAPI spec serving in JSON and YAML formats,
 * caching headers, and error handling.
 */

import { GET } from '@/app/api/docs/route';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock fs module
jest.mock(
  'fs',
  (): Record<string, unknown> => ({
    readFileSync: jest.fn(),
  })
);

// Mock yaml parser
jest.mock(
  'yaml',
  (): Record<string, unknown> => ({
    parse: jest.fn(),
  })
);

describe('GET /api/docs', () => {
  const mockYamlContent = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      summary: Test endpoint
`;

  const mockJsonContent = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {
      '/test': {
        get: {
          summary: 'Test endpoint',
        },
      },
    },
  };

  beforeEach((): void => {
    jest.clearAllMocks();
    (readFileSync as jest.Mock).mockReturnValue(mockYamlContent);
  });

  describe('JSON Format', () => {
    it('should return JSON format by default', async () => {
      const yaml = require('yaml');
      yaml.parse.mockReturnValue(mockJsonContent);

      const request = new Request('http://localhost/api/docs');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockJsonContent);
    });

    it('should return JSON when format=json is specified', async () => {
      const yaml = require('yaml');
      yaml.parse.mockReturnValue(mockJsonContent);

      const request = new Request('http://localhost/api/docs?format=json');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockJsonContent);
    });

    it('should parse YAML to JSON', async () => {
      const yaml = require('yaml');
      yaml.parse.mockReturnValue(mockJsonContent);

      const request = new Request('http://localhost/api/docs');
      await GET(request);

      expect(yaml.parse).toHaveBeenCalledWith(mockYamlContent);
    });

    it('should set correct content-type for JSON', async () => {
      const yaml = require('yaml');
      yaml.parse.mockReturnValue(mockJsonContent);

      const request = new Request('http://localhost/api/docs');
      const response = await GET(request);

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should set cache-control header for JSON', async () => {
      const yaml = require('yaml');
      yaml.parse.mockReturnValue(mockJsonContent);

      const request = new Request('http://localhost/api/docs');
      const response = await GET(request);

      expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
    });
  });

  describe('YAML Format', () => {
    it('should return YAML when format=yaml is specified', async () => {
      const request = new Request('http://localhost/api/docs?format=yaml');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe(mockYamlContent);
    });

    it('should set correct content-type for YAML', async () => {
      const request = new Request('http://localhost/api/docs?format=yaml');
      const response = await GET(request);

      expect(response.headers.get('content-type')).toBe('application/x-yaml');
    });

    it('should set cache-control header for YAML', async () => {
      const request = new Request('http://localhost/api/docs?format=yaml');
      const response = await GET(request);

      expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
    });

    it('should not parse YAML for YAML format', async () => {
      const yaml = require('yaml');

      const request = new Request('http://localhost/api/docs?format=yaml');
      await GET(request);

      expect(yaml.parse).not.toHaveBeenCalled();
    });
  });

  describe('File Reading', () => {
    it('should read OpenAPI spec from correct path', async () => {
      const yaml = require('yaml');
      yaml.parse.mockReturnValue(mockJsonContent);

      const request = new Request('http://localhost/api/docs');
      await GET(request);

      expect(readFileSync).toHaveBeenCalledWith(
        expect.stringContaining(join('docs', 'api', 'openapi.yaml')),
        'utf-8'
      );
    });

    it('should use process.cwd() for base path', async () => {
      const yaml = require('yaml');
      yaml.parse.mockReturnValue(mockJsonContent);

      const request = new Request('http://localhost/api/docs');
      await GET(request);

      const callPath = (readFileSync as jest.Mock).mock.calls[0][0];
      expect(callPath).toContain('docs');
      expect(callPath).toContain('api');
      expect(callPath).toContain('openapi.yaml');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when file read fails', async () => {
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const request = new Request('http://localhost/api/docs');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to load API documentation');
      expect(data.message).toBe('File not found');
    });

    it('should return 500 when YAML parsing fails', async () => {
      const yaml = require('yaml');
      yaml.parse.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      const request = new Request('http://localhost/api/docs');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to load API documentation');
      expect(data.message).toBe('Invalid YAML');
    });

    it('should handle unknown errors gracefully', async () => {
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw 'Unknown error';
      });

      const request = new Request('http://localhost/api/docs');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to load API documentation');
      expect(data.message).toBe('Unknown error');
    });
  });

  describe('Caching', () => {
    it('should cache for 1 hour (3600 seconds)', async () => {
      const yaml = require('yaml');
      yaml.parse.mockReturnValue(mockJsonContent);

      const request = new Request('http://localhost/api/docs');
      const response = await GET(request);

      const cacheControl = response.headers.get('cache-control');
      expect(cacheControl).toContain('max-age=3600');
      expect(cacheControl).toContain('public');
    });

    it('should use public cache directive', async () => {
      const yaml = require('yaml');
      yaml.parse.mockReturnValue(mockJsonContent);

      const request = new Request('http://localhost/api/docs');
      const response = await GET(request);

      const cacheControl = response.headers.get('cache-control');
      expect(cacheControl).toContain('public');
    });
  });

  describe('Query Parameters', () => {
    it('should ignore unknown query parameters', async () => {
      const yaml = require('yaml');
      yaml.parse.mockReturnValue(mockJsonContent);

      const request = new Request('http://localhost/api/docs?unknown=param&format=json');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockJsonContent);
    });

    it('should handle format parameter case-sensitively', async () => {
      const yaml = require('yaml');
      yaml.parse.mockReturnValue(mockJsonContent);

      // 'YAML' should not match 'yaml', so it returns JSON
      const request = new Request('http://localhost/api/docs?format=YAML');
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Should return JSON since format doesn't match 'yaml' exactly
      const data = await response.json();
      expect(data).toEqual(mockJsonContent);
    });

    it('should handle empty format parameter', async () => {
      const yaml = require('yaml');
      yaml.parse.mockReturnValue(mockJsonContent);

      const request = new Request('http://localhost/api/docs?format=');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockJsonContent);
    });
  });

  describe('Response Structure', () => {
    it('should return valid OpenAPI JSON structure', async () => {
      const yaml = require('yaml');
      yaml.parse.mockReturnValue(mockJsonContent);

      const request = new Request('http://localhost/api/docs');
      const response = await GET(request);

      const data = await response.json();
      expect(data).toHaveProperty('openapi');
      expect(data).toHaveProperty('info');
      expect(data).toHaveProperty('paths');
    });

    it('should return valid error structure on failure', async () => {
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      const request = new Request('http://localhost/api/docs');
      const response = await GET(request);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(data.error).toBe('Failed to load API documentation');
      expect(data.message).toBe('Test error');
    });
  });
});
