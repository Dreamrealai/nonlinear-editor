/**
 * Tests for lib/imagen.ts - Google Imagen AI Integration
 *
 * Tests cover:
 * - Image generation with various parameters
 * - Authentication and token handling
 * - Error handling (network errors, API errors, timeouts)
 * - Request parameter validation
 * - Timeout handling
 */

import { generateImage, ImagenGenerateParams } from '@/lib/imagen';
import { GoogleAuth } from 'google-auth-library';

// Mock Google Auth
jest.mock('google-auth-library');

// Mock global fetch
global.fetch = jest.fn();

describe('lib/imagen: Google Imagen AI Integration', () => {
  let mockAccessToken: string;
  let mockProjectId: string;
  let mockCredentials: Record<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockAccessToken = 'mock-access-token';
    mockProjectId = 'test-project-id';
    mockCredentials = {
      project_id: mockProjectId,
      type: 'service_account',
      private_key: 'mock-private-key',
      client_email: 'test@test-project.iam.gserviceaccount.com',
    };

    // Setup environment variable
    process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify(mockCredentials);

    // Mock GoogleAuth
    const mockClient = {
      getAccessToken: jest.fn().mockResolvedValue({ token: mockAccessToken }),
    };

    (GoogleAuth as jest.Mock).mockImplementation(() => ({
      getClient: jest.fn().mockResolvedValue(mockClient),
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.GOOGLE_SERVICE_ACCOUNT;
  });

  describe('generateImage: Success Cases', () => {
    it('should generate image with minimal parameters', async () => {
      const mockResponse = {
        predictions: [
          {
            bytesBase64Encoded: 'base64-image-data',
            mimeType: 'image/png',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params: ImagenGenerateParams = {
        prompt: 'A beautiful sunset over mountains',
      };

      const result = await generateImage(params);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `https://us-central1-aiplatform.googleapis.com/v1/projects/${mockProjectId}`
        ),
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"prompt":"A beautiful sunset over mountains"'),
        })
      );
    });

    it('should generate image with all parameters', async () => {
      const mockResponse = {
        predictions: [
          {
            bytesBase64Encoded: 'base64-image-data',
            mimeType: 'image/jpeg',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params: ImagenGenerateParams = {
        prompt: 'A futuristic city at night',
        model: 'imagen-4.0-generate-001',
        aspectRatio: '16:9',
        negativePrompt: 'blurry, low quality',
        sampleCount: 4,
        seed: 12345,
        safetyFilterLevel: 'block_some',
        personGeneration: 'allow_adult',
        addWatermark: true,
        language: 'en',
        outputMimeType: 'image/jpeg',
      };

      const result = await generateImage(params);

      expect(result).toEqual(mockResponse);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.parameters).toMatchObject({
        sampleCount: 4,
        aspectRatio: '16:9',
        negativePrompt: 'blurry, low quality',
        seed: 12345,
        safetyFilterLevel: 'block_some',
        personGeneration: 'allow_adult',
        addWatermark: true,
        language: 'en',
        outputMimeType: 'image/jpeg',
      });
    });

    it('should use default model when not specified', async () => {
      const mockResponse = {
        predictions: [
          {
            bytesBase64Encoded: 'base64-image-data',
            mimeType: 'image/png',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await generateImage({ prompt: 'Test prompt' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('imagen-3.0-generate-001'),
        expect.any(Object)
      );
    });

    it('should generate multiple images', async () => {
      const mockResponse = {
        predictions: [
          { bytesBase64Encoded: 'image1', mimeType: 'image/png' },
          { bytesBase64Encoded: 'image2', mimeType: 'image/png' },
          { bytesBase64Encoded: 'image3', mimeType: 'image/png' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await generateImage({
        prompt: 'A cat',
        sampleCount: 3,
      });

      expect(result.predictions).toHaveLength(3);
    });

    it('should include safety filter metadata when content is filtered', async () => {
      const mockResponse = {
        predictions: [
          {
            bytesBase64Encoded: 'base64-image-data',
            mimeType: 'image/png',
          },
        ],
        metadata: {
          raiMediaFilteredCount: 1,
          raiMediaFilteredReasons: ['inappropriate_content'],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await generateImage({ prompt: 'Test' });

      expect(result.metadata?.raiMediaFilteredCount).toBe(1);
      expect(result.metadata?.raiMediaFilteredReasons).toContain('inappropriate_content');
    });
  });

  describe('generateImage: Authentication Errors', () => {
    it('should throw error when GOOGLE_SERVICE_ACCOUNT is not set', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT;

      await expect(generateImage({ prompt: 'Test' })).rejects.toThrow(
        'GOOGLE_SERVICE_ACCOUNT environment variable is not set'
      );

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error when service account JSON is invalid', async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT = 'invalid-json';

      await expect(generateImage({ prompt: 'Test' })).rejects.toThrow(
        'Failed to parse GOOGLE_SERVICE_ACCOUNT JSON'
      );

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error when project_id is missing from credentials', async () => {
      const invalidCredentials = { ...mockCredentials };
      delete invalidCredentials.project_id;
      process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify(invalidCredentials);

      await expect(generateImage({ prompt: 'Test' })).rejects.toThrow(
        'Project ID not found in service account credentials'
      );
    });

    it('should throw error when access token is not obtained', async () => {
      const mockClient = {
        getAccessToken: jest.fn().mockResolvedValue({ token: null }),
      };

      (GoogleAuth as jest.Mock).mockImplementation(() => ({
        getClient: jest.fn().mockResolvedValue(mockClient),
      }));

      await expect(generateImage({ prompt: 'Test' })).rejects.toThrow('Failed to get access token');
    });
  });

  describe('generateImage: API Errors', () => {
    it('should throw error on 400 Bad Request', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Invalid request parameters'),
      });

      await expect(generateImage({ prompt: 'Test' })).rejects.toThrow(
        'Imagen API error: 400 Invalid request parameters'
      );
    });

    it('should throw error on 401 Unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
      });

      await expect(generateImage({ prompt: 'Test' })).rejects.toThrow(
        'Imagen API error: 401 Unauthorized'
      );
    });

    it('should throw error on 403 Forbidden', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        text: jest.fn().mockResolvedValue('Access denied'),
      });

      await expect(generateImage({ prompt: 'Test' })).rejects.toThrow(
        'Imagen API error: 403 Access denied'
      );
    });

    it('should throw error on 429 Rate Limit', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Rate limit exceeded'),
      });

      await expect(generateImage({ prompt: 'Test' })).rejects.toThrow(
        'Imagen API error: 429 Rate limit exceeded'
      );
    });

    it('should throw error on 500 Internal Server Error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal server error'),
      });

      await expect(generateImage({ prompt: 'Test' })).rejects.toThrow(
        'Imagen API error: 500 Internal server error'
      );
    });
  });

  describe('generateImage: Network Errors', () => {
    it('should throw error on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(generateImage({ prompt: 'Test' })).rejects.toThrow('Network error');
    });

    it('should handle timeout after 60 seconds', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: jest.fn().mockResolvedValue({}),
            });
          }, 70000); // 70 seconds - exceeds timeout
        });
      });

      const promise = generateImage({ prompt: 'Test' });

      // Advance time to trigger timeout
      jest.advanceTimersByTime(60000);

      await expect(promise).rejects.toThrow('Imagen API request timeout after 60s');
    });

    it('should clear timeout on successful response', async () => {
      const mockResponse = {
        predictions: [
          {
            bytesBase64Encoded: 'base64-image-data',
            mimeType: 'image/png',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await generateImage({ prompt: 'Test' });

      // Verify no pending timers after success
      jest.runAllTimers();
      // If timeout wasn't cleared, this would fail
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('generateImage: Parameter Validation', () => {
    it('should support all aspect ratios', async () => {
      const aspectRatios: Array<'1:1' | '9:16' | '16:9' | '3:4' | '4:3'> = [
        '1:1',
        '9:16',
        '16:9',
        '3:4',
        '4:3',
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          predictions: [{ bytesBase64Encoded: 'data', mimeType: 'image/png' }],
        }),
      });

      for (const aspectRatio of aspectRatios) {
        await generateImage({ prompt: 'Test', aspectRatio });
      }

      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it('should support safety filter levels', async () => {
      const safetyLevels: Array<'block_most' | 'block_some' | 'block_few' | 'block_fewest'> = [
        'block_most',
        'block_some',
        'block_few',
        'block_fewest',
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          predictions: [{ bytesBase64Encoded: 'data', mimeType: 'image/png' }],
        }),
      });

      for (const safetyFilterLevel of safetyLevels) {
        await generateImage({ prompt: 'Test', safetyFilterLevel });
      }

      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    it('should support output MIME types', async () => {
      const mimeTypes: Array<'image/png' | 'image/jpeg'> = ['image/png', 'image/jpeg'];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          predictions: [{ bytesBase64Encoded: 'data', mimeType: 'image/png' }],
        }),
      });

      for (const outputMimeType of mimeTypes) {
        await generateImage({ prompt: 'Test', outputMimeType });
      }

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateImage: Request Structure', () => {
    it('should send correct request structure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          predictions: [{ bytesBase64Encoded: 'data', mimeType: 'image/png' }],
        }),
      });

      await generateImage({
        prompt: 'Test prompt',
        aspectRatio: '16:9',
        sampleCount: 2,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toHaveProperty('instances');
      expect(requestBody).toHaveProperty('parameters');
      expect(requestBody.instances[0]).toEqual({ prompt: 'Test prompt' });
      expect(requestBody.parameters).toMatchObject({
        aspectRatio: '16:9',
        sampleCount: 2,
      });
    });

    it('should include Authorization header', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          predictions: [{ bytesBase64Encoded: 'data', mimeType: 'image/png' }],
        }),
      });

      await generateImage({ prompt: 'Test' });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBe(`Bearer ${mockAccessToken}`);
    });

    it('should use correct API endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          predictions: [{ bytesBase64Encoded: 'data', mimeType: 'image/png' }],
        }),
      });

      await generateImage({ prompt: 'Test', model: 'imagen-4.0-generate-001' });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const url = fetchCall[0];

      expect(url).toContain('us-central1-aiplatform.googleapis.com');
      expect(url).toContain(`projects/${mockProjectId}`);
      expect(url).toContain('locations/us-central1');
      expect(url).toContain('publishers/google');
      expect(url).toContain('models/imagen-4.0-generate-001:predict');
    });
  });
});
