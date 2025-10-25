/**
 * Tests for VideoService
 */

import { VideoService } from '@/lib/services/videoService';
import { SupabaseClient } from '@supabase/supabase-js';
import * as veo from '@/lib/veo';
import * as falVideo from '@/lib/fal-video';

// Mock external modules
jest.mock('@/lib/errorTracking', () => ({
  trackError: jest.fn(),
  ErrorCategory: {
    EXTERNAL_SERVICE: 'external_service',
    DATABASE: 'database',
  },
  ErrorSeverity: {
    HIGH: 'high',
    MEDIUM: 'medium',
  },
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/veo', () => ({
  generateVideo: jest.fn(),
  checkOperationStatus: jest.fn(),
}));

jest.mock('@/lib/fal-video', () => ({
  generateFalVideo: jest.fn(),
  checkFalVideoStatus: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

describe('VideoService', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let videoService: VideoService;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
      storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
        remove: jest.fn(),
      },
    } as unknown as jest.Mocked<SupabaseClient>;

    videoService = new VideoService(mockSupabase);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('generateVideo', () => {
    const validProjectId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = 'user123';

    describe('Google Veo provider', () => {
      it('should generate video using Veo provider successfully', async () => {
        const options = {
          prompt: 'A serene lake at sunset',
          model: 'veo-3.1-generate-preview',
          aspectRatio: '16:9' as const,
          duration: 5,
        };

        (veo.generateVideo as jest.Mock).mockResolvedValue({
          name: 'operations/test-operation-123',
        });

        const result = await videoService.generateVideo(userId, validProjectId, options);

        expect(result).toEqual({
          operationName: 'operations/test-operation-123',
          status: 'processing',
          message: 'Video generation started. Use the operation name to check status.',
        });

        expect(veo.generateVideo).toHaveBeenCalledWith({
          prompt: options.prompt,
          model: options.model,
          aspectRatio: options.aspectRatio,
          duration: options.duration,
          resolution: undefined,
          negativePrompt: undefined,
          personGeneration: undefined,
          enhancePrompt: undefined,
          generateAudio: true, // Default for Veo 3.1
          seed: undefined,
          sampleCount: undefined,
          compressionQuality: undefined,
          imageUrl: undefined,
        });
      });

      it('should filter out 480p resolution for Veo', async () => {
        const options = {
          prompt: 'Test prompt',
          model: 'veo-3.1-generate-preview',
          resolution: '480p' as const,
        };

        (veo.generateVideo as jest.Mock).mockResolvedValue({
          name: 'operations/test-operation',
        });

        await videoService.generateVideo(userId, validProjectId, options);

        expect(veo.generateVideo).toHaveBeenCalledWith(
          expect.objectContaining({
            resolution: undefined, // 480p should be filtered out
          })
        );
      });

      it('should allow 720p and 1080p for Veo', async () => {
        const options = {
          prompt: 'Test prompt',
          model: 'veo-3.1-generate-preview',
          resolution: '1080p' as const,
        };

        (veo.generateVideo as jest.Mock).mockResolvedValue({
          name: 'operations/test-operation',
        });

        await videoService.generateVideo(userId, validProjectId, options);

        expect(veo.generateVideo).toHaveBeenCalledWith(
          expect.objectContaining({
            resolution: '1080p',
          })
        );
      });

      it('should disable audio for veo-2.0 model', async () => {
        const options = {
          prompt: 'Test prompt',
          model: 'veo-2.0-generate-001',
          generateAudio: true, // User requests audio
        };

        (veo.generateVideo as jest.Mock).mockResolvedValue({
          name: 'operations/test-operation',
        });

        await videoService.generateVideo(userId, validProjectId, options);

        expect(veo.generateVideo).toHaveBeenCalledWith(
          expect.objectContaining({
            generateAudio: false, // Should be false for veo-2.0
          })
        );
      });

      it('should pass all optional parameters to Veo', async () => {
        const options = {
          prompt: 'Test prompt',
          model: 'veo-3.1-generate-preview',
          negativePrompt: 'blurry, low quality',
          personGeneration: 'allow_adult' as const,
          enhancePrompt: true,
          seed: 12345,
          sampleCount: 2,
          compressionQuality: 'lossless' as const,
          imageUrl: 'https://example.com/image.jpg',
        };

        (veo.generateVideo as jest.Mock).mockResolvedValue({
          name: 'operations/test-operation',
        });

        await videoService.generateVideo(userId, validProjectId, options);

        expect(veo.generateVideo).toHaveBeenCalledWith(
          expect.objectContaining({
            negativePrompt: options.negativePrompt,
            personGeneration: options.personGeneration,
            enhancePrompt: options.enhancePrompt,
            seed: options.seed,
            sampleCount: options.sampleCount,
            compressionQuality: options.compressionQuality,
            imageUrl: options.imageUrl,
          })
        );
      });
    });

    describe('FAL.ai provider', () => {
      it('should generate video using FAL provider for Seedance model', async () => {
        const options = {
          prompt: 'A dancing robot',
          model: 'seedance-1.0-pro',
          aspectRatio: '16:9' as const,
          duration: 10,
        };

        (falVideo.generateFalVideo as jest.Mock).mockResolvedValue({
          endpoint: 'fal-ai/seedance-video-v1',
          requestId: 'fal-request-123',
        });

        const result = await videoService.generateVideo(userId, validProjectId, options);

        expect(result).toEqual({
          operationName: 'fal:fal-ai/seedance-video-v1:fal-request-123',
          status: 'processing',
          message: 'Video generation started. Use the operation name to check status.',
        });

        expect(falVideo.generateFalVideo).toHaveBeenCalledWith({
          prompt: options.prompt,
          model: options.model,
          aspectRatio: options.aspectRatio,
          duration: options.duration,
          resolution: undefined,
          imageUrl: undefined,
          promptOptimizer: undefined,
        });
      });

      it('should generate video using FAL provider for MiniMax model', async () => {
        const options = {
          prompt: 'A flying bird',
          model: 'minimax-hailuo-02-pro',
        };

        (falVideo.generateFalVideo as jest.Mock).mockResolvedValue({
          endpoint: 'fal-ai/minimax-video',
          requestId: 'fal-request-456',
        });

        await videoService.generateVideo(userId, validProjectId, options);

        expect(falVideo.generateFalVideo).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: options.prompt,
            model: options.model,
          })
        );
      });

      it('should pass enhancePrompt as promptOptimizer to FAL', async () => {
        const options = {
          prompt: 'Test prompt',
          model: 'seedance-1.0-pro',
          enhancePrompt: true,
        };

        (falVideo.generateFalVideo as jest.Mock).mockResolvedValue({
          endpoint: 'fal-ai/seedance',
          requestId: 'fal-request',
        });

        await videoService.generateVideo(userId, validProjectId, options);

        expect(falVideo.generateFalVideo).toHaveBeenCalledWith(
          expect.objectContaining({
            promptOptimizer: true,
          })
        );
      });
    });

    describe('Error handling', () => {
      it('should throw error for invalid project ID', async () => {
        const options = {
          prompt: 'Test prompt',
          model: 'veo-3.1-generate-preview',
        };

        await expect(videoService.generateVideo(userId, 'invalid-uuid', options)).rejects.toThrow();
      });

      it('should throw error for unsupported model', async () => {
        const options = {
          prompt: 'Test prompt',
          model: 'unsupported-model',
        };

        await expect(videoService.generateVideo(userId, validProjectId, options)).rejects.toThrow(
          'Unsupported video generation model'
        );
      });

      it('should handle Veo API errors', async () => {
        const options = {
          prompt: 'Test prompt',
          model: 'veo-3.1-generate-preview',
        };

        (veo.generateVideo as jest.Mock).mockRejectedValue(new Error('Veo API error'));

        await expect(videoService.generateVideo(userId, validProjectId, options)).rejects.toThrow(
          'Veo API error'
        );
      });

      it('should handle FAL API errors', async () => {
        const options = {
          prompt: 'Test prompt',
          model: 'seedance-1.0-pro',
        };

        (falVideo.generateFalVideo as jest.Mock).mockRejectedValue(new Error('FAL API error'));

        await expect(videoService.generateVideo(userId, validProjectId, options)).rejects.toThrow(
          'FAL API error'
        );
      });
    });
  });

  describe('checkVideoStatus', () => {
    const userId = 'user123';
    const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

    it('should throw error for invalid project ID', async () => {
      await expect(
        videoService.checkVideoStatus(userId, 'invalid-uuid', 'operation-name')
      ).rejects.toThrow();
    });

    describe('Veo video status', () => {
      it('should return in-progress status when not done', async () => {
        const operationName = 'operations/test-operation-123';

        (veo.checkOperationStatus as jest.Mock).mockResolvedValue({
          done: false,
          metadata: {
            progressPercentage: 50,
          },
        });

        const result = await videoService.checkVideoStatus(userId, validProjectId, operationName);

        expect(result).toEqual({
          done: false,
          progress: 50,
          error: undefined,
        });
      });

      it('should return error status when operation fails', async () => {
        const operationName = 'operations/test-operation-123';

        (veo.checkOperationStatus as jest.Mock).mockResolvedValue({
          done: true,
          error: {
            message: 'Video generation failed',
          },
        });

        const result = await videoService.checkVideoStatus(userId, validProjectId, operationName);

        expect(result).toEqual({
          done: true,
          progress: 0,
          error: 'Video generation failed',
        });
      });

      it('should create asset when Veo video is complete (base64)', async () => {
        const operationName = 'operations/test-operation-123';

        (veo.checkOperationStatus as jest.Mock).mockResolvedValue({
          done: true,
          response: {
            videos: [
              {
                bytesBase64Encoded: Buffer.from('fake-video-data').toString('base64'),
                mimeType: 'video/mp4',
              },
            ],
          },
        });

        // Mock storage upload
        mockSupabase.storage.upload.mockResolvedValue({
          data: { path: 'user123/project123/test-uuid-1234.mp4' },
          error: null,
        });

        mockSupabase.storage.getPublicUrl.mockReturnValue({
          data: { publicUrl: 'https://example.com/video.mp4' },
        });

        // Mock asset creation
        mockSupabase.single.mockResolvedValue({
          data: {
            id: 'asset-123',
            type: 'video',
            storage_url: 'supabase://assets/user123/project123/test-uuid-1234.mp4',
            metadata: {
              sourceUrl: 'https://example.com/video.mp4',
              generator: 'veo',
            },
          },
          error: null,
        });

        const result = await videoService.checkVideoStatus(userId, validProjectId, operationName);

        expect(result.done).toBe(true);
        expect(result.asset).toBeDefined();
        expect(result.asset?.id).toBe('asset-123');
        expect(result.storageUrl).toBe('https://example.com/video.mp4');

        // Verify storage upload was called
        expect(mockSupabase.storage.upload).toHaveBeenCalled();
        expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      });

      it('should handle storage upload failure', async () => {
        const operationName = 'operations/test-operation-123';

        (veo.checkOperationStatus as jest.Mock).mockResolvedValue({
          done: true,
          response: {
            videos: [
              {
                bytesBase64Encoded: Buffer.from('fake-video-data').toString('base64'),
                mimeType: 'video/mp4',
              },
            ],
          },
        });

        mockSupabase.storage.upload.mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' },
        });

        await expect(
          videoService.checkVideoStatus(userId, validProjectId, operationName)
        ).rejects.toThrow('Storage upload failed');
      });

      it('should handle asset creation failure and cleanup storage', async () => {
        const operationName = 'operations/test-operation-123';

        (veo.checkOperationStatus as jest.Mock).mockResolvedValue({
          done: true,
          response: {
            videos: [
              {
                bytesBase64Encoded: Buffer.from('fake-video-data').toString('base64'),
                mimeType: 'video/mp4',
              },
            ],
          },
        });

        mockSupabase.storage.upload.mockResolvedValue({
          data: { path: 'user123/project123/test-uuid-1234.mp4' },
          error: null,
        });

        mockSupabase.storage.getPublicUrl.mockReturnValue({
          data: { publicUrl: 'https://example.com/video.mp4' },
        });

        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });

        mockSupabase.storage.remove.mockResolvedValue({
          data: [],
          error: null,
        });

        await expect(
          videoService.checkVideoStatus(userId, validProjectId, operationName)
        ).rejects.toThrow('Asset creation failed');

        // Verify cleanup was called
        expect(mockSupabase.storage.remove).toHaveBeenCalledWith([
          'user123/550e8400-e29b-41d4-a716-446655440000/test-uuid-1234.mp4',
        ]);
      });
    });

    describe('FAL video status', () => {
      it('should return in-progress status for FAL video', async () => {
        const operationName = 'fal:fal-ai/seedance:request-123';

        (falVideo.checkFalVideoStatus as jest.Mock).mockResolvedValue({
          done: false,
        });

        const result = await videoService.checkVideoStatus(userId, validProjectId, operationName);

        expect(result).toEqual({
          done: false,
          progress: 0,
        });

        expect(falVideo.checkFalVideoStatus).toHaveBeenCalledWith('request-123', 'fal-ai/seedance');
      });

      it('should return error status for FAL video', async () => {
        const operationName = 'fal:fal-ai/seedance:request-123';

        (falVideo.checkFalVideoStatus as jest.Mock).mockResolvedValue({
          done: true,
          error: 'Generation failed',
        });

        const result = await videoService.checkVideoStatus(userId, validProjectId, operationName);

        expect(result).toEqual({
          done: true,
          error: 'Generation failed',
        });
      });

      it('should download and create asset when FAL video is complete', async () => {
        const operationName = 'fal:fal-ai/seedance:request-123';
        const videoUrl = 'https://fal.ai/video.mp4';

        (falVideo.checkFalVideoStatus as jest.Mock).mockResolvedValue({
          done: true,
          result: {
            video: {
              url: videoUrl,
              content_type: 'video/mp4',
            },
          },
        });

        // Mock fetch for video download
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
        });

        // Mock storage upload
        mockSupabase.storage.upload.mockResolvedValue({
          data: { path: 'user123/project123/test-uuid-1234.mp4' },
          error: null,
        });

        mockSupabase.storage.getPublicUrl.mockReturnValue({
          data: { publicUrl: 'https://example.com/video.mp4' },
        });

        // Mock asset creation
        mockSupabase.single.mockResolvedValue({
          data: {
            id: 'asset-456',
            type: 'video',
            storage_url: 'supabase://assets/user123/project123/test-uuid-1234.mp4',
            metadata: {
              sourceUrl: 'https://example.com/video.mp4',
              generator: 'seedance-pro',
            },
          },
          error: null,
        });

        const result = await videoService.checkVideoStatus(userId, validProjectId, operationName);

        expect(result.done).toBe(true);
        expect(result.asset).toBeDefined();
        expect(result.asset?.id).toBe('asset-456');

        // Verify video was downloaded
        expect(global.fetch).toHaveBeenCalledWith(videoUrl);
      });

      it('should handle video download failure', async () => {
        const operationName = 'fal:fal-ai/seedance:request-123';

        (falVideo.checkFalVideoStatus as jest.Mock).mockResolvedValue({
          done: true,
          result: {
            video: {
              url: 'https://fal.ai/video.mp4',
              content_type: 'video/mp4',
            },
          },
        });

        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status: 404,
        });

        await expect(
          videoService.checkVideoStatus(userId, validProjectId, operationName)
        ).rejects.toThrow('Failed to download video');
      });

      it('should throw error for invalid FAL operation name', async () => {
        const operationName = 'fal:invalid'; // Missing request ID

        await expect(
          videoService.checkVideoStatus(userId, validProjectId, operationName)
        ).rejects.toThrow('Invalid FAL operation name format');
      });
    });
  });
});
