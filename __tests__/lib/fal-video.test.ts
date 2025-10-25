/**
 * Tests for lib/fal-video.ts - FAL.ai Video Generation Integration
 *
 * Tests cover:
 * - Video generation with Seedance and MiniMax models
 * - Status polling and result fetching
 * - Cancellation operations
 * - Error handling (network errors, API errors, timeouts)
 * - Model-specific parameter handling
 * - Timeout handling
 */

import {
  generateFalVideo,
  checkFalVideoStatus,
  cancelFalVideo,
  FalVideoParams,
} from '@/lib/fal-video';
import { API_ENDPOINTS, FAL_ENDPOINTS, TIMEOUTS } from '@/lib/config/api';
import { VIDEO_MODELS } from '@/lib/config/models';

// Mock global fetch
global.fetch = jest.fn();

// Mock server logger
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    error: jest.fn(),
  },
}));

describe('lib/fal-video: FAL.ai Video Generation Integration', () => {
  let mockApiKey: string;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockApiKey = 'mock-fal-api-key';
    process.env.FAL_API_KEY = mockApiKey;
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.FAL_API_KEY;
  });

  describe('generateFalVideo: Success Cases', () => {
    it('should generate video with Seedance model (text-to-video)', async () => {
      const mockResponse = {
        request_id: 'mock-request-id-123',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params: FalVideoParams = {
        prompt: 'A serene lake at sunset',
        model: VIDEO_MODELS.SEEDANCE_1_0_PRO,
        aspectRatio: '16:9',
        duration: 5,
        resolution: '1080p',
      };

      const result = await generateFalVideo(params);

      expect(result).toEqual({
        requestId: 'mock-request-id-123',
        endpoint: FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_ENDPOINTS.FAL_QUEUE}/${FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO}`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Key ${mockApiKey}`,
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should generate video with MiniMax model (text-to-video)', async () => {
      const mockResponse = {
        request_id: 'mock-minimax-request',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params: FalVideoParams = {
        prompt: 'A futuristic city',
        model: VIDEO_MODELS.MINIMAX_HAILUO_02_PRO,
        aspectRatio: '9:16',
        duration: 6,
        promptOptimizer: true,
      };

      const result = await generateFalVideo(params);

      expect(result).toEqual({
        requestId: 'mock-minimax-request',
        endpoint: FAL_ENDPOINTS.MINIMAX_TEXT_TO_VIDEO,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toMatchObject({
        prompt: 'A futuristic city',
        aspect_ratio: '9:16',
        duration: 6,
        prompt_optimizer: true,
      });
    });

    it('should generate video with Seedance model (image-to-video)', async () => {
      const mockResponse = {
        request_id: 'mock-image-to-video',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params: FalVideoParams = {
        prompt: 'Make the image come alive',
        model: VIDEO_MODELS.SEEDANCE_1_0_PRO,
        imageUrl: 'https://example.com/image.jpg',
        duration: 3,
      };

      const result = await generateFalVideo(params);

      expect(result).toEqual({
        requestId: 'mock-image-to-video',
        endpoint: FAL_ENDPOINTS.SEEDANCE_IMAGE_TO_VIDEO,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toMatchObject({
        prompt: 'Make the image come alive',
        image_url: 'https://example.com/image.jpg',
        duration: '3', // Seedance expects string
      });
    });

    it('should generate video with MiniMax model (image-to-video)', async () => {
      const mockResponse = {
        request_id: 'mock-minimax-i2v',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params: FalVideoParams = {
        prompt: 'Animate this scene',
        model: VIDEO_MODELS.MINIMAX_HAILUO_02_PRO,
        imageUrl: 'https://example.com/scene.jpg',
        promptOptimizer: false,
      };

      const result = await generateFalVideo(params);

      expect(result.endpoint).toBe(FAL_ENDPOINTS.MINIMAX_IMAGE_TO_VIDEO);
    });

    it('should handle Seedance-specific parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ request_id: 'test' }),
      });

      await generateFalVideo({
        prompt: 'Test',
        model: VIDEO_MODELS.SEEDANCE_1_0_PRO,
        resolution: '720p',
        duration: 5,
        aspectRatio: '1:1',
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toMatchObject({
        resolution: '720p',
        duration: '5', // String for Seedance
        aspect_ratio: '1:1',
      });
    });

    it('should default prompt_optimizer to true for MiniMax', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ request_id: 'test' }),
      });

      await generateFalVideo({
        prompt: 'Test',
        model: VIDEO_MODELS.MINIMAX_HAILUO_02_PRO,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.prompt_optimizer).toBe(true);
    });
  });

  describe('generateFalVideo: Error Cases', () => {
    it('should throw error when FAL_API_KEY is not set', async () => {
      delete process.env.FAL_API_KEY;

      await expect(
        generateFalVideo({
          prompt: 'Test',
          model: VIDEO_MODELS.SEEDANCE_1_0_PRO,
        })
      ).rejects.toThrow('FAL_API_KEY environment variable is required');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error for unsupported model', async () => {
      await expect(
        generateFalVideo({
          prompt: 'Test',
          model: 'unsupported-model',
        })
      ).rejects.toThrow('Unsupported model: unsupported-model');
    });

    it('should handle 400 Bad Request', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Invalid parameters'),
      });

      await expect(
        generateFalVideo({
          prompt: 'Test',
          model: VIDEO_MODELS.SEEDANCE_1_0_PRO,
        })
      ).rejects.toThrow('FAL API error: 400 - Invalid parameters');
    });

    it('should handle 401 Unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Invalid API key'),
      });

      await expect(
        generateFalVideo({
          prompt: 'Test',
          model: VIDEO_MODELS.SEEDANCE_1_0_PRO,
        })
      ).rejects.toThrow('FAL API error: 401 - Invalid API key');
    });

    it('should handle 429 Rate Limit', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Rate limit exceeded'),
      });

      await expect(
        generateFalVideo({
          prompt: 'Test',
          model: VIDEO_MODELS.SEEDANCE_1_0_PRO,
        })
      ).rejects.toThrow('FAL API error: 429 - Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

      await expect(
        generateFalVideo({
          prompt: 'Test',
          model: VIDEO_MODELS.SEEDANCE_1_0_PRO,
        })
      ).rejects.toThrow('FAL video generation failed: Network failure');
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: jest.fn().mockResolvedValue({ request_id: 'test' }),
            });
          }, TIMEOUTS.FAL_SUBMIT + 1000);
        });
      });

      const promise = generateFalVideo({
        prompt: 'Test',
        model: VIDEO_MODELS.SEEDANCE_1_0_PRO,
      });

      jest.advanceTimersByTime(TIMEOUTS.FAL_SUBMIT);

      await expect(promise).rejects.toThrow(
        `FAL video generation request timeout after ${TIMEOUTS.FAL_SUBMIT}ms`
      );
    });
  });

  describe('checkFalVideoStatus: Success Cases', () => {
    it('should return in-progress status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'IN_PROGRESS',
        }),
      });

      const result = await checkFalVideoStatus('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO);

      expect(result).toEqual({
        done: false,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_ENDPOINTS.FAL_QUEUE}/${FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO}/requests/request-123/status`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: `Key ${mockApiKey}`,
          },
        })
      );
    });

    it('should return completed status with result', async () => {
      const mockVideo = {
        url: 'https://example.com/video.mp4',
        content_type: 'video/mp4',
        file_name: 'generated.mp4',
        file_size: 1024000,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'COMPLETED',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            video: mockVideo,
          }),
        });

      const result = await checkFalVideoStatus('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO);

      expect(result).toEqual({
        done: true,
        result: {
          video: mockVideo,
        },
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return failed status with error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'FAILED',
          error: 'Generation failed due to content policy',
        }),
      });

      const result = await checkFalVideoStatus('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO);

      expect(result).toEqual({
        done: true,
        error: 'Generation failed due to content policy',
      });
    });

    it('should handle failed status without explicit error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'FAILED',
        }),
      });

      const result = await checkFalVideoStatus('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO);

      expect(result).toEqual({
        done: true,
        error: 'Video generation failed',
      });
    });
  });

  describe('checkFalVideoStatus: Error Cases', () => {
    it('should throw error when status check fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Request not found'),
      });

      await expect(
        checkFalVideoStatus('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO)
      ).rejects.toThrow('FAL status check error: 404 - Request not found');
    });

    it('should throw error when result fetch fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'COMPLETED',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Server error'),
        });

      await expect(
        checkFalVideoStatus('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO)
      ).rejects.toThrow('Failed to fetch result: 500');
    });

    it('should handle status check timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: jest.fn().mockResolvedValue({ status: 'IN_PROGRESS' }),
            });
          }, TIMEOUTS.FAL_STATUS + 1000);
        });
      });

      const promise = checkFalVideoStatus('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO);

      jest.advanceTimersByTime(TIMEOUTS.FAL_STATUS);

      await expect(promise).rejects.toThrow(
        `FAL status check timeout after ${TIMEOUTS.FAL_STATUS}ms`
      );
    });

    it('should handle result fetch timeout', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ status: 'COMPLETED' }),
          });
        }
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: jest.fn().mockResolvedValue({ video: {} }),
            });
          }, TIMEOUTS.FAL_RESULT + 1000);
        });
      });

      const promise = checkFalVideoStatus('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO);

      jest.advanceTimersByTime(TIMEOUTS.FAL_RESULT);

      await expect(promise).rejects.toThrow(
        `FAL result fetch timeout after ${TIMEOUTS.FAL_RESULT}ms`
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

      await expect(
        checkFalVideoStatus('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO)
      ).rejects.toThrow('FAL status check failed: Network failure');
    });
  });

  describe('cancelFalVideo: Success Cases', () => {
    it('should cancel video generation', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      await expect(
        cancelFalVideo('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO)
      ).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_ENDPOINTS.FAL_QUEUE}/${FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO}/requests/request-123/cancel`,
        expect.objectContaining({
          method: 'PUT',
          headers: {
            Authorization: `Key ${mockApiKey}`,
          },
        })
      );
    });
  });

  describe('cancelFalVideo: Error Cases', () => {
    it('should handle 404 Not Found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Request not found'),
      });

      await expect(
        cancelFalVideo('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO)
      ).rejects.toThrow('FAL cancellation error: 404 - Request not found');
    });

    it('should handle 400 Bad Request (already completed)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Request already completed'),
      });

      await expect(
        cancelFalVideo('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO)
      ).rejects.toThrow('FAL cancellation error: 400 - Request already completed');
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: jest.fn().mockResolvedValue({}),
            });
          }, TIMEOUTS.FAL_STATUS + 1000);
        });
      });

      const promise = cancelFalVideo('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO);

      jest.advanceTimersByTime(TIMEOUTS.FAL_STATUS);

      await expect(promise).rejects.toThrow(
        `FAL cancellation timeout after ${TIMEOUTS.FAL_STATUS}ms`
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

      await expect(
        cancelFalVideo('request-123', FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO)
      ).rejects.toThrow('FAL cancellation failed: Network failure');
    });
  });

  describe('API Endpoint Construction', () => {
    it('should use correct queue base URL', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ request_id: 'test' }),
      });

      await generateFalVideo({
        prompt: 'Test',
        model: VIDEO_MODELS.SEEDANCE_1_0_PRO,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain(API_ENDPOINTS.FAL_QUEUE);
    });

    it('should construct status URL correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ status: 'IN_PROGRESS' }),
      });

      await checkFalVideoStatus('request-123', 'fal-ai/seedance/text-to-video');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toBe(
        `${API_ENDPOINTS.FAL_QUEUE}/fal-ai/seedance/text-to-video/requests/request-123/status`
      );
    });

    it('should construct cancel URL correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      await cancelFalVideo('request-123', 'fal-ai/seedance/text-to-video');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toBe(
        `${API_ENDPOINTS.FAL_QUEUE}/fal-ai/seedance/text-to-video/requests/request-123/cancel`
      );
    });
  });
});
