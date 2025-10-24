/**
 * Tests for Google Veo Video Generation API Integration
 *
 * @module __tests__/lib/veo.test
 */

import { generateVideo, checkOperationStatus, cancelOperation } from '@/lib/veo';
import { GoogleAuth } from 'google-auth-library';

// Mock GoogleAuth
jest.mock('google-auth-library');

const MockGoogleAuth = GoogleAuth as jest.MockedClass<typeof GoogleAuth>;

// Mock global fetch
global.fetch = jest.fn();

describe('generateVideo', () => {
  const originalEnv = process.env;
  let mockAuth: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env = { ...originalEnv };
    process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify({
      project_id: 'test-project',
      client_email: 'test@test.iam.gserviceaccount.com',
      private_key: 'test-key',
    });

    // Mock auth client
    mockClient = {
      getAccessToken: jest.fn().mockResolvedValue({ token: 'test-token' }),
    };

    mockAuth = {
      getClient: jest.fn().resolvedValue(mockClient),
    };

    MockGoogleAuth.mockImplementation(() => mockAuth);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Basic Video Generation', () => {
    it('should generate video with default parameters', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          name: 'projects/test-project/locations/us-central1/operations/op-123',
          metadata: { progressPercentage: 0 },
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await generateVideo({
        prompt: 'A beautiful sunset',
      });

      expect(result.name).toBe('projects/test-project/locations/us-central1/operations/op-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://us-central1-aiplatform.googleapis.com/v1/projects/test-project/locations/us-central1/publishers/google/models/veo-3.1-generate-preview:predictLongRunning',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        })
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody).toEqual({
        instances: [{ prompt: 'A beautiful sunset' }],
        parameters: {
          aspectRatio: '16:9',
          durationSeconds: 8,
          enhancePrompt: true,
        },
      });
    });

    it('should generate video with custom parameters', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ name: 'op-123' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await generateVideo({
        prompt: 'City timelapse',
        aspectRatio: '9:16',
        duration: 5,
        resolution: '1080p',
        negativePrompt: 'blur, low quality',
        personGeneration: 'dont_allow',
        enhancePrompt: false,
        generateAudio: true,
        seed: 12345,
        sampleCount: 2,
        compressionQuality: 'lossless',
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.parameters).toEqual({
        aspectRatio: '9:16',
        durationSeconds: 5,
        resolution: '1080p',
        negativePrompt: 'blur, low quality',
        personGeneration: 'dont_allow',
        enhancePrompt: false,
        generateAudio: true,
        seed: 12345,
        sampleCount: 2,
        compressionQuality: 'lossless',
      });
    });

    it('should handle image-to-video generation', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ name: 'op-123' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await generateVideo({
        prompt: 'Animate this image',
        imageUrl: 'gs://bucket/image.jpg',
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.instances[0]).toEqual({
        prompt: 'Animate this image',
        image: { gcsUri: 'gs://bucket/image.jpg' },
      });
    });

    it('should use custom model', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ name: 'op-123' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await generateVideo({
        prompt: 'Test',
        model: 'veo-3.1-fast-generate-preview',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://us-central1-aiplatform.googleapis.com/v1/projects/test-project/locations/us-central1/publishers/google/models/veo-3.1-fast-generate-preview:predictLongRunning',
        expect.any(Object)
      );
    });

    it('should trim whitespace from negative prompt', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ name: 'op-123' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await generateVideo({
        prompt: 'Test',
        negativePrompt: '  blur, distortion  ',
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.parameters.negativePrompt).toBe('blur, distortion');
    });

    it('should exclude empty negative prompt', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ name: 'op-123' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await generateVideo({
        prompt: 'Test',
        negativePrompt: '   ',
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.parameters.negativePrompt).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when GOOGLE_SERVICE_ACCOUNT not set', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT;

      await expect(
        generateVideo({ prompt: 'Test' })
      ).rejects.toThrow('GOOGLE_SERVICE_ACCOUNT environment variable is required');
    });

    it('should throw error when project_id missing', async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify({
        client_email: 'test@test.iam.gserviceaccount.com',
      });

      await expect(
        generateVideo({ prompt: 'Test' })
      ).rejects.toThrow('Could not extract project_id from GOOGLE_SERVICE_ACCOUNT');
    });

    it('should handle API error response', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Invalid request'),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(
        generateVideo({ prompt: 'Test' })
      ).rejects.toThrow('Veo API error: 400 - Invalid request');
    });

    it('should handle request timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('AbortError')), 100);
          })
      );

      const promise = generateVideo({ prompt: 'Test' });

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(60000);

      await expect(promise).rejects.toThrow('Video generation request timeout after 60 seconds');
    });

    it('should handle network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

      await expect(
        generateVideo({ prompt: 'Test' })
      ).rejects.toThrow('Network failure');
    });
  });

  describe('Authentication', () => {
    it('should create GoogleAuth with correct scopes', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ name: 'op-123' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await generateVideo({ prompt: 'Test' });

      expect(MockGoogleAuth).toHaveBeenCalledWith({
        credentials: expect.objectContaining({
          project_id: 'test-project',
        }),
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    });

    it('should use access token in request', async () => {
      mockClient.getAccessToken.mockResolvedValue({ token: 'custom-token-abc' });

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ name: 'op-123' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await generateVideo({ prompt: 'Test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer custom-token-abc',
          }),
        })
      );
    });
  });
});

describe('checkOperationStatus', () => {
  const originalEnv = process.env;
  let mockAuth: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env = { ...originalEnv };
    process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify({
      project_id: 'test-project',
    });

    mockClient = {
      getAccessToken: jest.fn().mockResolvedValue({ token: 'test-token' }),
    };

    mockAuth = {
      getClient: jest.fn().mockResolvedValue(mockClient),
    };

    MockGoogleAuth.mockImplementation(() => mockAuth);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Status Checking', () => {
    it('should check operation status in progress', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          done: false,
          metadata: { progressPercentage: 50 },
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await checkOperationStatus(
        'projects/test-project/locations/us-central1/publishers/google/models/veo-3.1-generate-preview/operations/op-123'
      );

      expect(result).toEqual({
        done: false,
        metadata: { progressPercentage: 50 },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://us-central1-aiplatform.googleapis.com/v1/projects/test-project/locations/us-central1/publishers/google/models/veo-3.1-generate-preview:fetchPredictOperation',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            operationName:
              'projects/test-project/locations/us-central1/publishers/google/models/veo-3.1-generate-preview/operations/op-123',
          }),
        })
      );
    });

    it('should check completed operation with video', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          done: true,
          response: {
            '@type': 'type.googleapis.com/google.cloud.aiplatform.v1.PredictResponse',
            videos: [
              {
                gcsUri: 'gs://bucket/video.mp4',
                mimeType: 'video/mp4',
              },
            ],
          },
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await checkOperationStatus('op-123');

      expect(result.done).toBe(true);
      expect(result.response?.videos).toHaveLength(1);
      expect(result.response?.videos?.[0].gcsUri).toBe('gs://bucket/video.mp4');
    });

    it('should check operation with error', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          done: true,
          error: {
            code: 3,
            message: 'Content policy violation',
          },
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await checkOperationStatus('op-123');

      expect(result.done).toBe(true);
      expect(result.error).toEqual({
        code: 3,
        message: 'Content policy violation',
      });
    });

    it('should check operation with filtered content', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          done: true,
          response: {
            raiMediaFilteredCount: 1,
            raiMediaFilteredReasons: ['Violence', 'Adult content'],
          },
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await checkOperationStatus('op-123');

      expect(result.done).toBe(true);
      expect(result.response?.raiMediaFilteredCount).toBe(1);
      expect(result.response?.raiMediaFilteredReasons).toContain('Violence');
    });

    it('should extract model from operation name', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ done: false }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await checkOperationStatus(
        'projects/test-project/locations/us-central1/publishers/google/models/veo-3.1-fast-generate-preview/operations/op-123'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('veo-3.1-fast-generate-preview:fetchPredictOperation'),
        expect.any(Object)
      );
    });

    it('should use default model if extraction fails', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ done: false }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await checkOperationStatus('invalid-operation-name');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('veo-3.1-generate-preview:fetchPredictOperation'),
        expect.any(Object)
      );
    });

    it('should accept explicit model parameter', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ done: false }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await checkOperationStatus('op-123', 'veo-2.0-generate-001');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('veo-2.0-generate-001:fetchPredictOperation'),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error when GOOGLE_SERVICE_ACCOUNT not set', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT;

      await expect(
        checkOperationStatus('op-123')
      ).rejects.toThrow('GOOGLE_SERVICE_ACCOUNT environment variable is required');
    });

    it('should throw error when project_id missing', async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify({});

      await expect(
        checkOperationStatus('op-123')
      ).rejects.toThrow('Could not extract project_id from GOOGLE_SERVICE_ACCOUNT');
    });

    it('should handle API error response', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Operation not found'),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(
        checkOperationStatus('op-123')
      ).rejects.toThrow('Operation status check failed: 404 - Operation not found');
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('AbortError')), 100);
          })
      );

      const promise = checkOperationStatus('op-123');

      jest.advanceTimersByTime(60000);

      await expect(promise).rejects.toThrow('Veo status check timeout after 60s');
    });
  });
});

describe('cancelOperation', () => {
  const originalEnv = process.env;
  let mockAuth: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env = { ...originalEnv };
    process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify({
      project_id: 'test-project',
    });

    mockClient = {
      getAccessToken: jest.fn().mockResolvedValue({ token: 'test-token' }),
    };

    mockAuth = {
      getClient: jest.fn().mockResolvedValue(mockClient),
    };

    MockGoogleAuth.mockImplementation(() => mockAuth);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Operation Cancellation', () => {
    it('should cancel operation successfully', async () => {
      const mockResponse = {
        ok: true,
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await cancelOperation(
        'projects/test-project/locations/us-central1/operations/op-123'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://us-central1-aiplatform.googleapis.com/v1/projects/test-project/locations/us-central1/operations/op-123:cancel',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle cancellation error', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Operation cannot be cancelled'),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(
        cancelOperation('projects/test-project/locations/us-central1/operations/op-123')
      ).rejects.toThrow('Operation cancellation failed: 400 - Operation cannot be cancelled');
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('AbortError')), 100);
          })
      );

      const promise = cancelOperation('op-123');

      jest.advanceTimersByTime(60000);

      await expect(promise).rejects.toThrow('Operation cancellation timeout after 60s');
    });

    it('should throw error when GOOGLE_SERVICE_ACCOUNT not set', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT;

      await expect(
        cancelOperation('op-123')
      ).rejects.toThrow('GOOGLE_SERVICE_ACCOUNT environment variable is required');
    });
  });
});
