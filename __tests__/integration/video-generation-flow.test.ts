/**
 * Integration Tests: Video Generation Flow
 *
 * Tests the complete video generation lifecycle including:
 * - Submit generation request
 * - Poll status
 * - Receive video
 * - Add to project
 * - Verify asset creation
 *
 * These tests verify that Video API, Status polling, and Project integration
 * work together correctly to support the complete video generation flow.
 */

import { VideoService } from '@/lib/services/videoService';
import { AssetService } from '@/lib/services/assetService';
import { ProjectService } from '@/lib/services/projectService';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockProject,
  createMockAsset,
  mockAuthenticatedUser,
  resetAllMocks,
  MockSupabaseChain,
} from '@/test-utils/mockSupabase';
import { cache } from '@/lib/cache';

// Mock the error tracking module
jest.mock('@/lib/errorTracking', () => ({
  trackError: jest.fn(),
  ErrorCategory: {
    DATABASE: 'database',
    EXTERNAL_SERVICE: 'external_service',
  },
  ErrorSeverity: {
    HIGH: 'high',
    MEDIUM: 'medium',
  },
}));

// Mock serverLogger
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock video generation modules
jest.mock('@/lib/veo', () => ({
  generateVideo: jest.fn(),
  checkOperationStatus: jest.fn(),
}));

jest.mock('@/lib/fal-video', () => ({
  generateFalVideo: jest.fn(),
  checkFalVideoStatus: jest.fn(),
}));

describe('Integration: Video Generation Flow', () => {
  let mockSupabase: MockSupabaseChain;
  let videoService: VideoService;
  let assetService: AssetService;
  let projectService: ProjectService;
  let mockUser: ReturnType<typeof createMockUser>;
  let mockProject: ReturnType<typeof createMockProject>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    videoService = new VideoService(mockSupabase as unknown as SupabaseClient);
    assetService = new AssetService(mockSupabase as unknown as SupabaseClient);
    projectService = new ProjectService(mockSupabase as unknown as SupabaseClient);
    mockUser = mockAuthenticatedUser(mockSupabase);
    mockProject = createMockProject({ user_id: mockUser.id });
  });

  afterEach(async () => {
    resetAllMocks(mockSupabase);
    await cache.clear();
  });

  describe('Google Veo Video Generation Flow', () => {
    it('should initiate video generation with Veo model', async () => {
      // Arrange
      const { generateVideo } = require('@/lib/veo');
      generateVideo.mockResolvedValueOnce({
        name: 'operations/veo-operation-123',
      });

      // Act
      const result = await videoService.generateVideo(mockUser.id, mockProject.id, {
        prompt: 'A serene lake at sunset',
        model: 'veo-3.1-generate-preview',
        aspectRatio: '16:9',
        duration: 5,
        generateAudio: true,
      });

      // Assert
      expect(result.operationName).toBe('operations/veo-operation-123');
      expect(result.status).toBe('processing');
      expect(generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'A serene lake at sunset',
          model: 'veo-3.1-generate-preview',
          aspectRatio: '16:9',
          duration: 5,
          generateAudio: true,
        })
      );
    });

    it('should poll Veo video status until completion', async () => {
      // Arrange
      const { checkOperationStatus } = require('@/lib/veo');
      const operationName = 'operations/veo-operation-123';

      // Mock in-progress status
      checkOperationStatus.mockResolvedValueOnce({
        done: false,
        metadata: { progressPercentage: 50 },
      });

      // Act - First poll (in progress)
      const status1 = await videoService.checkVideoStatus(
        mockUser.id,
        mockProject.id,
        operationName
      );

      // Assert
      expect(status1.done).toBe(false);
      expect(status1.progress).toBe(50);
      expect(checkOperationStatus).toHaveBeenCalledWith(operationName);
    });

    it('should complete Veo video generation and create asset', async () => {
      // Arrange
      const { checkOperationStatus } = require('@/lib/veo');
      const operationName = 'operations/veo-operation-123';

      // Mock completed status with base64 video
      const videoBase64 = Buffer.from('mock-video-data').toString('base64');
      checkOperationStatus.mockResolvedValueOnce({
        done: true,
        response: {
          videos: [
            {
              bytesBase64Encoded: videoBase64,
              mimeType: 'video/mp4',
            },
          ],
        },
      });

      // Mock storage upload
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'video-path' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/video.mp4' },
      });

      // Mock asset creation
      const mockVideoAsset = createMockAsset({
        id: 'video-asset-123',
        type: 'video',
        project_id: mockProject.id,
        user_id: mockUser.id,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockVideoAsset,
        error: null,
      });

      // Mock activity logging
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Act
      const result = await videoService.checkVideoStatus(
        mockUser.id,
        mockProject.id,
        operationName
      );

      // Assert
      expect(result.done).toBe(true);
      expect(result.asset).toBeDefined();
      expect(result.asset?.id).toBe('video-asset-123');
      expect(result.storageUrl).toContain('https://');
      expect(mockSupabase.storage.upload).toHaveBeenCalled();
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should handle Veo video from GCS URI', async () => {
      // Arrange
      const { checkOperationStatus } = require('@/lib/veo');
      const operationName = 'operations/veo-operation-456';

      // Mock completed status with GCS URI
      checkOperationStatus.mockResolvedValueOnce({
        done: true,
        response: {
          videos: [
            {
              gcsUri: 'gs://bucket/path/to/video.mp4',
              mimeType: 'video/mp4',
            },
          ],
        },
      });

      // Mock GCS download
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      // Mock storage upload
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'video-path' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/video.mp4' },
      });

      // Mock asset creation
      const mockVideoAsset = createMockAsset({
        type: 'video',
        project_id: mockProject.id,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockVideoAsset,
        error: null,
      });

      // Mock activity logging
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Set required environment variable
      process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify({
        type: 'service_account',
        project_id: 'test-project',
        private_key: 'test-key',
        client_email: 'test@example.com',
      });

      // Act
      const result = await videoService.checkVideoStatus(
        mockUser.id,
        mockProject.id,
        operationName
      );

      // Assert
      expect(result.done).toBe(true);
      expect(result.asset).toBeDefined();
      expect(mockSupabase.storage.upload).toHaveBeenCalled();
    });
  });

  describe('FAL.ai Video Generation Flow', () => {
    it('should initiate video generation with FAL model', async () => {
      // Arrange
      const { generateFalVideo } = require('@/lib/fal-video');
      generateFalVideo.mockResolvedValueOnce({
        endpoint: 'fal-ai/seedance-pro',
        requestId: 'fal-request-123',
      });

      // Act
      const result = await videoService.generateVideo(mockUser.id, mockProject.id, {
        prompt: 'Dancing robot',
        model: 'seedance-1.0-pro',
        aspectRatio: '16:9',
        duration: 5,
      });

      // Assert
      expect(result.operationName).toBe('fal:fal-ai/seedance-pro:fal-request-123');
      expect(result.status).toBe('processing');
      expect(generateFalVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Dancing robot',
          model: 'seedance-1.0-pro',
        })
      );
    });

    it('should poll FAL video status until completion', async () => {
      // Arrange
      const { checkFalVideoStatus } = require('@/lib/fal-video');
      const operationName = 'fal:fal-ai/seedance-pro:fal-request-123';

      // Mock in-progress status
      checkFalVideoStatus.mockResolvedValueOnce({
        done: false,
      });

      // Act
      const status = await videoService.checkVideoStatus(
        mockUser.id,
        mockProject.id,
        operationName
      );

      // Assert
      expect(status.done).toBe(false);
      expect(checkFalVideoStatus).toHaveBeenCalledWith('fal-request-123', 'fal-ai/seedance-pro');
    });

    it('should complete FAL video generation and create asset', async () => {
      // Arrange
      const { checkFalVideoStatus } = require('@/lib/fal-video');
      const operationName = 'fal:fal-ai/seedance-pro:fal-request-123';

      // Mock completed status
      checkFalVideoStatus.mockResolvedValueOnce({
        done: true,
        result: {
          video: {
            url: 'https://fal.ai/generated-video.mp4',
            content_type: 'video/mp4',
          },
        },
      });

      // Mock video download
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      // Mock storage upload
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'video-path' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/video.mp4' },
      });

      // Mock asset creation
      const mockVideoAsset = createMockAsset({
        id: 'fal-video-123',
        type: 'video',
        project_id: mockProject.id,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockVideoAsset,
        error: null,
      });

      // Mock activity logging
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Act
      const result = await videoService.checkVideoStatus(
        mockUser.id,
        mockProject.id,
        operationName
      );

      // Assert
      expect(result.done).toBe(true);
      expect(result.asset?.id).toBe('fal-video-123');
      expect(mockSupabase.storage.upload).toHaveBeenCalled();
    });

    it('should handle FAL video generation error', async () => {
      // Arrange
      const { checkFalVideoStatus } = require('@/lib/fal-video');
      const operationName = 'fal:fal-ai/seedance-pro:fal-request-error';

      checkFalVideoStatus.mockResolvedValueOnce({
        done: true,
        error: 'Video generation failed: Invalid prompt',
      });

      // Act
      const result = await videoService.checkVideoStatus(
        mockUser.id,
        mockProject.id,
        operationName
      );

      // Assert
      expect(result.done).toBe(true);
      expect(result.error).toBe('Video generation failed: Invalid prompt');
      expect(result.asset).toBeUndefined();
    });
  });

  describe('Video Generation Error Handling', () => {
    it('should handle invalid model error', async () => {
      // Act & Assert
      await expect(
        videoService.generateVideo(mockUser.id, mockProject.id, {
          prompt: 'Test video',
          model: 'invalid-model',
        })
      ).rejects.toThrow('Unsupported video generation model');
    });

    it('should handle storage upload failure during video save', async () => {
      // Arrange
      const { checkOperationStatus } = require('@/lib/veo');
      const operationName = 'operations/veo-operation-fail';

      const videoBase64 = Buffer.from('mock-video-data').toString('base64');
      checkOperationStatus.mockResolvedValueOnce({
        done: true,
        response: {
          videos: [
            {
              bytesBase64Encoded: videoBase64,
              mimeType: 'video/mp4',
            },
          ],
        },
      });

      // Mock storage upload failure
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      // Act & Assert
      await expect(
        videoService.checkVideoStatus(mockUser.id, mockProject.id, operationName)
      ).rejects.toThrow('Storage upload failed');
    });

    it('should rollback storage upload if asset creation fails', async () => {
      // Arrange
      const { checkOperationStatus } = require('@/lib/veo');
      const operationName = 'operations/veo-operation-rollback';

      const videoBase64 = Buffer.from('mock-video-data').toString('base64');
      checkOperationStatus.mockResolvedValueOnce({
        done: true,
        response: {
          videos: [
            {
              bytesBase64Encoded: videoBase64,
              mimeType: 'video/mp4',
            },
          ],
        },
      });

      // Storage upload succeeds
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'video-path' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/video.mp4' },
      });

      // Asset creation fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      // Mock cleanup
      mockSupabase.storage.remove.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(
        videoService.checkVideoStatus(mockUser.id, mockProject.id, operationName)
      ).rejects.toThrow('Asset creation failed');

      // Verify cleanup was attempted
      expect(mockSupabase.storage.remove).toHaveBeenCalled();
    });

    it('should handle video download failure from external URL', async () => {
      // Arrange
      const { checkFalVideoStatus } = require('@/lib/fal-video');
      const operationName = 'fal:fal-ai/seedance-pro:download-fail';

      checkFalVideoStatus.mockResolvedValueOnce({
        done: true,
        result: {
          video: {
            url: 'https://invalid-url.com/video.mp4',
            content_type: 'video/mp4',
          },
        },
      });

      // Mock failed download
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // Act & Assert
      await expect(
        videoService.checkVideoStatus(mockUser.id, mockProject.id, operationName)
      ).rejects.toThrow('Failed to download video');
    });
  });

  describe('Video Integration with Project', () => {
    it('should add generated video to project timeline', async () => {
      // Arrange
      const { checkOperationStatus } = require('@/lib/veo');
      const operationName = 'operations/veo-timeline-integration';

      // Generate video
      const videoBase64 = Buffer.from('mock-video-data').toString('base64');
      checkOperationStatus.mockResolvedValueOnce({
        done: true,
        response: {
          videos: [
            {
              bytesBase64Encoded: videoBase64,
              mimeType: 'video/mp4',
            },
          ],
        },
      });

      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'video-path' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/video.mp4' },
      });

      const mockVideoAsset = createMockAsset({
        id: 'timeline-video-123',
        type: 'video',
        project_id: mockProject.id,
        user_id: mockUser.id,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockVideoAsset,
        error: null,
      });

      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Act - Generate video
      const videoResult = await videoService.checkVideoStatus(
        mockUser.id,
        mockProject.id,
        operationName
      );

      expect(videoResult.asset).toBeDefined();

      // Add to timeline
      const timelineState = {
        projectId: mockProject.id,
        clips: [
          {
            id: 'clip-1',
            assetId: videoResult.asset!.id,
            start: 0,
            end: 5000,
            timelinePosition: 0,
            trackIndex: 0,
          },
        ],
      };

      const updatedProject = {
        ...mockProject,
        timeline_state_jsonb: timelineState,
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: updatedProject,
        error: null,
      });

      // Act - Update timeline
      const project = await projectService.updateProjectState(
        mockProject.id,
        mockUser.id,
        timelineState
      );

      // Assert
      expect(project.timeline_state_jsonb.clips).toHaveLength(1);
      expect(project.timeline_state_jsonb.clips[0].assetId).toBe(videoResult.asset!.id);
    });

    it('should fetch all video assets for a project', async () => {
      // Arrange
      const mockVideoAssets = [
        createMockAsset({ id: 'video-1', type: 'video', project_id: mockProject.id }),
        createMockAsset({ id: 'video-2', type: 'video', project_id: mockProject.id }),
        createMockAsset({ id: 'video-3', type: 'video', project_id: mockProject.id }),
      ];

      mockSupabase.order.mockResolvedValueOnce({
        data: mockVideoAssets,
        error: null,
      });

      // Act
      const assets = await assetService.getProjectAssets(mockProject.id, mockUser.id);

      // Filter video assets
      const videoAssets = assets.filter((a) => a.type === 'video');

      // Assert
      expect(videoAssets).toHaveLength(3);
      expect(videoAssets.every((a) => a.type === 'video')).toBe(true);
    });
  });

  describe('Complete Video Generation End-to-End', () => {
    it('should complete full workflow: request → poll → receive → add to project', async () => {
      // Step 1: Request video generation
      const { generateVideo } = require('@/lib/veo');
      generateVideo.mockResolvedValueOnce({
        name: 'operations/e2e-operation',
      });

      const generationResult = await videoService.generateVideo(mockUser.id, mockProject.id, {
        prompt: 'Beautiful sunset over mountains',
        model: 'veo-3.1-generate-preview',
        aspectRatio: '16:9',
        duration: 5,
      });

      expect(generationResult.operationName).toBe('operations/e2e-operation');
      expect(generationResult.status).toBe('processing');

      // Step 2: Poll status (in progress)
      const { checkOperationStatus } = require('@/lib/veo');
      checkOperationStatus.mockResolvedValueOnce({
        done: false,
        metadata: { progressPercentage: 30 },
      });

      const status1 = await videoService.checkVideoStatus(
        mockUser.id,
        mockProject.id,
        generationResult.operationName
      );

      expect(status1.done).toBe(false);
      expect(status1.progress).toBe(30);

      // Step 3: Poll status (completed)
      const videoBase64 = Buffer.from('complete-video-data').toString('base64');
      checkOperationStatus.mockResolvedValueOnce({
        done: true,
        response: {
          videos: [
            {
              bytesBase64Encoded: videoBase64,
              mimeType: 'video/mp4',
            },
          ],
        },
      });

      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'e2e-video-path' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/e2e-video.mp4' },
      });

      const mockVideoAsset = createMockAsset({
        id: 'e2e-video-asset',
        type: 'video',
        project_id: mockProject.id,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockVideoAsset,
        error: null,
      });

      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const status2 = await videoService.checkVideoStatus(
        mockUser.id,
        mockProject.id,
        generationResult.operationName
      );

      expect(status2.done).toBe(true);
      expect(status2.asset?.id).toBe('e2e-video-asset');

      // Step 4: Add video to project timeline
      const timelineState = {
        projectId: mockProject.id,
        clips: [
          {
            id: 'clip-e2e',
            assetId: status2.asset!.id,
            start: 0,
            end: 5000,
            timelinePosition: 0,
            trackIndex: 0,
          },
        ],
      };

      const updatedProject = {
        ...mockProject,
        timeline_state_jsonb: timelineState,
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: updatedProject,
        error: null,
      });

      const finalProject = await projectService.updateProjectState(
        mockProject.id,
        mockUser.id,
        timelineState
      );

      // Step 5: Verify final state
      expect(finalProject.timeline_state_jsonb.clips).toHaveLength(1);
      expect(finalProject.timeline_state_jsonb.clips[0].assetId).toBe('e2e-video-asset');

      mockSupabase.order.mockResolvedValueOnce({
        data: [mockVideoAsset],
        error: null,
      });

      const projectAssets = await assetService.getProjectAssets(mockProject.id, mockUser.id);
      expect(projectAssets.some((a) => a.id === 'e2e-video-asset')).toBe(true);
    });

    it('should handle multiple concurrent video generations', async () => {
      // Arrange
      const { generateVideo } = require('@/lib/veo');

      // Request 3 video generations
      generateVideo
        .mockResolvedValueOnce({ name: 'operations/video-1' })
        .mockResolvedValueOnce({ name: 'operations/video-2' })
        .mockResolvedValueOnce({ name: 'operations/video-3' });

      // Act
      const results = await Promise.all([
        videoService.generateVideo(mockUser.id, mockProject.id, {
          prompt: 'Video 1',
          model: 'veo-3.1-generate-preview',
        }),
        videoService.generateVideo(mockUser.id, mockProject.id, {
          prompt: 'Video 2',
          model: 'veo-3.1-generate-preview',
        }),
        videoService.generateVideo(mockUser.id, mockProject.id, {
          prompt: 'Video 3',
          model: 'veo-3.1-generate-preview',
        }),
      ]);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].operationName).toBe('operations/video-1');
      expect(results[1].operationName).toBe('operations/video-2');
      expect(results[2].operationName).toBe('operations/video-3');
      expect(generateVideo).toHaveBeenCalledTimes(3);
    });
  });

  describe('Video Model Configuration', () => {
    it('should disable audio for models that do not support it', async () => {
      // Arrange
      const { generateVideo } = require('@/lib/veo');
      generateVideo.mockResolvedValueOnce({
        name: 'operations/veo-2-operation',
      });

      // Act - Try to generate with audio on unsupported model
      await videoService.generateVideo(mockUser.id, mockProject.id, {
        prompt: 'Test video',
        model: 'veo-2.0-generate-001',
        generateAudio: true, // Request audio
      });

      // Assert - Audio should be disabled for this model
      expect(generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          generateAudio: false, // Should be forced to false
        })
      );
    });

    it('should enable audio by default for models that support it', async () => {
      // Arrange
      const { generateVideo } = require('@/lib/veo');
      generateVideo.mockResolvedValueOnce({
        name: 'operations/veo-3-operation',
      });

      // Act - Don't specify generateAudio
      await videoService.generateVideo(mockUser.id, mockProject.id, {
        prompt: 'Test video',
        model: 'veo-3.1-generate-preview',
        // generateAudio not specified
      });

      // Assert - Audio should be enabled by default
      expect(generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          generateAudio: true,
        })
      );
    });

    it('should filter unsupported resolutions for Veo', async () => {
      // Arrange
      const { generateVideo } = require('@/lib/veo');
      generateVideo.mockResolvedValueOnce({
        name: 'operations/veo-resolution-test',
      });

      // Act - Try to use 480p (unsupported by Veo)
      await videoService.generateVideo(mockUser.id, mockProject.id, {
        prompt: 'Test video',
        model: 'veo-3.1-generate-preview',
        resolution: '480p',
      });

      // Assert - Resolution should be filtered out
      expect(generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          resolution: undefined,
        })
      );
    });
  });
});
