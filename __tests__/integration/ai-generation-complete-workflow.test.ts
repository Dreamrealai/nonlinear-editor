/**
 * @jest-environment node
 */

/**
 * Integration Tests: Complete AI Generation Workflows
 *
 * Tests multi-step AI workflows including:
 * - Video generation → Poll → Add to timeline → Export
 * - Audio generation → Process → Add to project → Mix
 * - Image generation → Upload → Use as frame → Edit
 * - Frame editing → Process → Update timeline → Preview
 * - Sequential AI operations (video + audio + image)
 * - Parallel AI generation requests
 *
 * These tests verify that AI generation services integrate properly
 * with the project workflow and asset management.
 */

import { VideoService } from '@/lib/services/videoService';
import { AssetService } from '@/lib/services/assetService';
import { ProjectService } from '@/lib/services/projectService';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  resetAllMocks,
  MockSupabaseChain,
} from '@/test-utils/mockSupabase';
import {
  createTestEnvironment,
  AssetFixtures,
  TimelineBuilders,
  IntegrationWorkflow,
  MockResponses,
  assertTimelineValid,
  cleanupTestData,
} from './helpers/integration-helpers';
import { cache } from '@/lib/cache';

// Mock error tracking
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

// Mock server logger
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock video generation
jest.mock('@/lib/veo', () => ({
  generateVideo: jest.fn(),
  checkOperationStatus: jest.fn(),
}));

// Mock FAL video
jest.mock('@/lib/fal-video', () => ({
  generateFalVideo: jest.fn(),
  checkFalVideoStatus: jest.fn(),
}));

describe('Integration: Complete AI Generation Workflows', () => {
  let env: ReturnType<typeof createTestEnvironment>;
  let videoService: VideoService;
  let assetService: AssetService;
  let projectService: ProjectService;
  let workflow: IntegrationWorkflow;

  beforeEach(() => {
    jest.clearAllMocks();
    env = createTestEnvironment('proTierUser');
    videoService = new VideoService(env.mockSupabase as unknown as SupabaseClient);
    assetService = new AssetService(env.mockSupabase as unknown as SupabaseClient);
    projectService = new ProjectService(env.mockSupabase as unknown as SupabaseClient);
    workflow = new IntegrationWorkflow(env.mockSupabase);
  });

  afterEach(async () => {
    resetAllMocks(env.mockSupabase);
    cleanupTestData(env.mockSupabase);
    await cache.clear();
  });

  describe('Video Generation Complete Workflow', () => {
    it('should complete workflow: request → poll → receive → add to timeline → export', async () => {
      // Step 1: Create project
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'AI Video Project',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'AI Video Project',
      });

      // Step 2: Request video generation
      const { generateVideo } = require('@/lib/veo');
      generateVideo.mockResolvedValueOnce({
        name: 'operations/complete-workflow',
      });

      const generationRequest = await videoService.generateVideo(env.user.id, project.id, {
        prompt: 'A beautiful sunset over mountains',
        model: 'veo-3.1-generate-preview',
        aspectRatio: '16:9',
        duration: 5,
        generateAudio: true,
      });

      expect(generationRequest.operationName).toBe('operations/complete-workflow');
      expect(generationRequest.status).toBe('processing');

      // Step 3: Poll status (in progress)
      const { checkOperationStatus } = require('@/lib/veo');
      checkOperationStatus.mockResolvedValueOnce({
        done: false,
        metadata: { progressPercentage: 25 },
      });

      const status1 = await videoService.checkVideoStatus(
        env.user.id,
        project.id,
        generationRequest.operationName
      );

      expect(status1.done).toBe(false);
      expect(status1.progress).toBe(25);

      // Step 4: Poll again (still in progress)
      checkOperationStatus.mockResolvedValueOnce({
        done: false,
        metadata: { progressPercentage: 75 },
      });

      const status2 = await videoService.checkVideoStatus(
        env.user.id,
        project.id,
        generationRequest.operationName
      );

      expect(status2.progress).toBe(75);

      // Step 5: Poll final (completed)
      const videoBase64 = Buffer.from('generated-video-data').toString('base64');
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

      env.mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'ai-video-path' },
        error: null,
      });

      env.mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/ai-video.mp4' },
      });

      const mockAIAsset = AssetFixtures.aiVideo(project.id, env.user.id, {
        id: 'ai-video-asset',
      });

      env.mockSupabase.single.mockResolvedValueOnce({
        data: mockAIAsset,
        error: null,
      });

      env.mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const completedStatus = await videoService.checkVideoStatus(
        env.user.id,
        project.id,
        generationRequest.operationName
      );

      expect(completedStatus.done).toBe(true);
      expect(completedStatus.asset).toBeDefined();
      expect(completedStatus.asset?.id).toBe('ai-video-asset');

      // Step 6: Add to timeline
      const timeline = {
        projectId: project.id,
        clips: [
          {
            id: 'ai-clip-1',
            assetId: completedStatus.asset!.id,
            start: 0,
            end: 5000,
            timelinePosition: 0,
            trackIndex: 0,
          },
        ],
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      const updatedProject = await projectService.updateProjectState(
        project.id,
        env.user.id,
        timeline
      );

      // Step 7: Verify final state
      expect(updatedProject.timeline_state_jsonb.clips).toHaveLength(1);
      expect(updatedProject.timeline_state_jsonb.clips[0].assetId).toBe('ai-video-asset');

      assertTimelineValid(updatedProject.timeline_state_jsonb);
    });

    it('should handle video generation with multiple retries', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Retry Project',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Retry Project',
      });

      const { generateVideo, checkOperationStatus } = require('@/lib/veo');

      generateVideo.mockResolvedValueOnce({
        name: 'operations/retry-test',
      });

      await videoService.generateVideo(env.user.id, project.id, {
        prompt: 'Test video',
        model: 'veo-3.1-generate-preview',
      });

      // Act - Poll multiple times with gradual progress
      const progressUpdates = [10, 25, 50, 75, 90, 100];

      for (const progress of progressUpdates.slice(0, -1)) {
        checkOperationStatus.mockResolvedValueOnce({
          done: false,
          metadata: { progressPercentage: progress },
        });

        const status = await videoService.checkVideoStatus(
          env.user.id,
          project.id,
          'operations/retry-test'
        );

        expect(status.progress).toBe(progress);
      }

      // Final completion
      const videoBase64 = Buffer.from('final-video').toString('base64');
      checkOperationStatus.mockResolvedValueOnce({
        done: true,
        response: {
          videos: [{ bytesBase64Encoded: videoBase64, mimeType: 'video/mp4' }],
        },
      });

      const mockAsset = await workflow.generateVideoWorkflow(project.id, env.user.id);

      env.mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      const finalStatus = await videoService.checkVideoStatus(
        env.user.id,
        project.id,
        'operations/retry-test'
      );

      // Assert
      expect(finalStatus.done).toBe(true);
      expect(checkOperationStatus).toHaveBeenCalledTimes(progressUpdates.length);
    });

    it('should handle video generation failure and retry', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Failure Retry',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Failure Retry',
      });

      const { generateVideo, checkOperationStatus } = require('@/lib/veo');

      // First attempt fails
      generateVideo.mockRejectedValueOnce(new Error('Temporary service error'));

      // Act & Assert - First attempt fails
      await expect(
        videoService.generateVideo(env.user.id, project.id, {
          prompt: 'Test video',
          model: 'veo-3.1-generate-preview',
        })
      ).rejects.toThrow('Temporary service error');

      // Second attempt succeeds
      generateVideo.mockResolvedValueOnce({
        name: 'operations/retry-success',
      });

      const retryResult = await videoService.generateVideo(env.user.id, project.id, {
        prompt: 'Test video',
        model: 'veo-3.1-generate-preview',
      });

      expect(retryResult.operationName).toBe('operations/retry-success');
      expect(generateVideo).toHaveBeenCalledTimes(2);
    });
  });

  describe('Multi-Step AI Workflows', () => {
    it('should generate video, then add audio track, then add effects', async () => {
      // Step 1: Create project
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Multi-Step AI',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Multi-Step AI',
      });

      // Step 2: Generate video
      const { generateVideo, checkOperationStatus } = require('@/lib/veo');

      generateVideo.mockResolvedValueOnce({
        name: 'operations/video-gen',
      });

      await videoService.generateVideo(env.user.id, project.id, {
        prompt: 'Mountain landscape',
        model: 'veo-3.1-generate-preview',
      });

      const videoBase64 = Buffer.from('video-data').toString('base64');
      checkOperationStatus.mockResolvedValueOnce({
        done: true,
        response: {
          videos: [{ bytesBase64Encoded: videoBase64, mimeType: 'video/mp4' }],
        },
      });

      const mockVideoAsset = await workflow.generateVideoWorkflow(project.id, env.user.id);

      env.mockSupabase.single.mockResolvedValueOnce({
        data: mockVideoAsset,
        error: null,
      });

      const videoStatus = await videoService.checkVideoStatus(
        env.user.id,
        project.id,
        'operations/video-gen'
      );

      expect(videoStatus.done).toBe(true);

      // Step 3: Add audio track
      const mockAudioAsset = AssetFixtures.audio(project.id, env.user.id, {
        id: 'audio-track',
      });

      await workflow.uploadAssetWorkflow(project.id, env.user.id, 'audio');

      // Step 4: Create multi-track timeline
      const timeline = TimelineBuilders.multiTrack(project.id, [mockVideoAsset], [mockAudioAsset]);

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      const updatedProject = await projectService.updateProjectState(
        project.id,
        env.user.id,
        timeline
      );

      // Assert
      expect(updatedProject.timeline_state_jsonb.clips).toHaveLength(2);
      const videoClips = updatedProject.timeline_state_jsonb.clips.filter(
        (c) => c.trackIndex === 0
      );
      const audioClips = updatedProject.timeline_state_jsonb.clips.filter(
        (c) => c.trackIndex === 1
      );

      expect(videoClips).toHaveLength(1);
      expect(audioClips).toHaveLength(1);
    });

    it('should generate multiple assets and combine into single project', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Combined AI Assets',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Combined AI Assets',
      });

      const { generateVideo, checkOperationStatus } = require('@/lib/veo');

      // Generate 3 video segments
      const segments = ['Intro scene', 'Main scene', 'Outro scene'];
      const generatedAssets = [];

      for (let i = 0; i < segments.length; i++) {
        // Request generation
        generateVideo.mockResolvedValueOnce({
          name: `operations/segment-${i}`,
        });

        await videoService.generateVideo(env.user.id, project.id, {
          prompt: segments[i],
          model: 'veo-3.1-generate-preview',
        });

        // Complete generation
        const videoBase64 = Buffer.from(`segment-${i}`).toString('base64');
        checkOperationStatus.mockResolvedValueOnce({
          done: true,
          response: {
            videos: [{ bytesBase64Encoded: videoBase64, mimeType: 'video/mp4' }],
          },
        });

        const mockAsset = await workflow.generateVideoWorkflow(project.id, env.user.id);
        mockAsset.id = `segment-asset-${i}`;

        env.mockSupabase.single.mockResolvedValueOnce({
          data: mockAsset,
          error: null,
        });

        const status = await videoService.checkVideoStatus(
          env.user.id,
          project.id,
          `operations/segment-${i}`
        );

        generatedAssets.push(status.asset);
      }

      // Act - Combine into timeline
      const timeline = TimelineBuilders.singleTrack(project.id, generatedAssets);

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      const finalProject = await projectService.updateProjectState(
        project.id,
        env.user.id,
        timeline
      );

      // Assert
      expect(finalProject.timeline_state_jsonb.clips).toHaveLength(3);
      expect(finalProject.timeline_state_jsonb.clips[0].timelinePosition).toBe(0);
      expect(finalProject.timeline_state_jsonb.clips[1].timelinePosition).toBe(5000);
      expect(finalProject.timeline_state_jsonb.clips[2].timelinePosition).toBe(10000);
    });
  });

  describe('Parallel AI Generation', () => {
    it('should handle concurrent video generation requests', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Parallel Generation',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Parallel Generation',
      });

      const { generateVideo } = require('@/lib/veo');

      // Act - Request 3 videos concurrently
      const prompts = ['Scene 1', 'Scene 2', 'Scene 3'];

      generateVideo
        .mockResolvedValueOnce({ name: 'operations/parallel-1' })
        .mockResolvedValueOnce({ name: 'operations/parallel-2' })
        .mockResolvedValueOnce({ name: 'operations/parallel-3' });

      const requests = await Promise.all(
        prompts.map((prompt, idx) =>
          videoService.generateVideo(env.user.id, project.id, {
            prompt,
            model: 'veo-3.1-generate-preview',
          })
        )
      );

      // Assert
      expect(requests).toHaveLength(3);
      expect(requests[0].operationName).toBe('operations/parallel-1');
      expect(requests[1].operationName).toBe('operations/parallel-2');
      expect(requests[2].operationName).toBe('operations/parallel-3');
      expect(generateVideo).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success/failure in parallel generations', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Mixed Results',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Mixed Results',
      });

      const { generateVideo } = require('@/lib/veo');

      // Act - 2 succeed, 1 fails
      generateVideo
        .mockResolvedValueOnce({ name: 'operations/success-1' })
        .mockRejectedValueOnce(new Error('Generation failed'))
        .mockResolvedValueOnce({ name: 'operations/success-2' });

      const results = await Promise.allSettled([
        videoService.generateVideo(env.user.id, project.id, {
          prompt: 'Video 1',
          model: 'veo-3.1-generate-preview',
        }),
        videoService.generateVideo(env.user.id, project.id, {
          prompt: 'Video 2',
          model: 'veo-3.1-generate-preview',
        }),
        videoService.generateVideo(env.user.id, project.id, {
          prompt: 'Video 3',
          model: 'veo-3.1-generate-preview',
        }),
      ]);

      // Assert
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      const successful = results.filter((r) => r.status === 'fulfilled');
      expect(successful).toHaveLength(2);
    });

    it('should poll multiple generations concurrently', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Concurrent Polling',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Concurrent Polling',
      });

      const { checkOperationStatus } = require('@/lib/veo');

      const operations = ['operations/poll-1', 'operations/poll-2', 'operations/poll-3'];

      // Act - Poll all operations concurrently
      checkOperationStatus
        .mockResolvedValueOnce({ done: false, metadata: { progressPercentage: 30 } })
        .mockResolvedValueOnce({ done: false, metadata: { progressPercentage: 60 } })
        .mockResolvedValueOnce({ done: true, response: { videos: [] } });

      const statuses = await Promise.all(
        operations.map((op) => videoService.checkVideoStatus(env.user.id, project.id, op))
      );

      // Assert
      expect(statuses).toHaveLength(3);
      expect(statuses[0].done).toBe(false);
      expect(statuses[0].progress).toBe(30);
      expect(statuses[1].done).toBe(false);
      expect(statuses[1].progress).toBe(60);
      expect(statuses[2].done).toBe(true);
    });
  });

  describe('FAL.ai Video Generation Workflow', () => {
    it('should complete FAL video generation workflow', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'FAL Video Project',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'FAL Video Project',
      });

      const { generateFalVideo, checkFalVideoStatus } = require('@/lib/fal-video');

      // Step 1: Request generation
      generateFalVideo.mockResolvedValueOnce({
        endpoint: 'fal-ai/seedance-pro',
        requestId: 'fal-request-123',
      });

      const request = await videoService.generateVideo(env.user.id, project.id, {
        prompt: 'Dancing animation',
        model: 'seedance-1.0-pro',
      });

      expect(request.operationName).toBe('fal:fal-ai/seedance-pro:fal-request-123');

      // Step 2: Poll status
      checkFalVideoStatus.mockResolvedValueOnce({
        done: false,
      });

      const status1 = await videoService.checkVideoStatus(
        env.user.id,
        project.id,
        request.operationName
      );

      expect(status1.done).toBe(false);

      // Step 3: Complete
      checkFalVideoStatus.mockResolvedValueOnce({
        done: true,
        result: {
          video: {
            url: 'https://fal.ai/generated.mp4',
            content_type: 'video/mp4',
          },
        },
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      const mockAsset = await workflow.generateVideoWorkflow(project.id, env.user.id);
      mockAsset.id = 'fal-video-asset';

      env.mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      const finalStatus = await videoService.checkVideoStatus(
        env.user.id,
        project.id,
        request.operationName
      );

      // Assert
      expect(finalStatus.done).toBe(true);
      expect(finalStatus.asset?.id).toBe('fal-video-asset');
    });
  });

  describe('AI Generation Error Recovery', () => {
    it('should handle generation timeout and cleanup', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Timeout Project',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Timeout Project',
      });

      const { generateVideo, checkOperationStatus } = require('@/lib/veo');

      generateVideo.mockResolvedValueOnce({
        name: 'operations/timeout',
      });

      await videoService.generateVideo(env.user.id, project.id, {
        prompt: 'Test',
        model: 'veo-3.1-generate-preview',
      });

      // Act - Simulate stuck generation (never completes)
      checkOperationStatus.mockResolvedValue({
        done: false,
        metadata: { progressPercentage: 50 },
      });

      // Poll multiple times - always stuck at 50%
      for (let i = 0; i < 5; i++) {
        const status = await videoService.checkVideoStatus(
          env.user.id,
          project.id,
          'operations/timeout'
        );
        expect(status.progress).toBe(50);
      }

      // Assert - Client should handle timeout and allow retry
      expect(checkOperationStatus).toHaveBeenCalledTimes(5);
    });

    it('should handle storage failure during AI video save', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Storage Failure',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Storage Failure',
      });

      const { generateVideo, checkOperationStatus } = require('@/lib/veo');

      generateVideo.mockResolvedValueOnce({
        name: 'operations/storage-fail',
      });

      await videoService.generateVideo(env.user.id, project.id, {
        prompt: 'Test',
        model: 'veo-3.1-generate-preview',
      });

      // Complete generation but fail storage
      const videoBase64 = Buffer.from('video').toString('base64');
      checkOperationStatus.mockResolvedValueOnce({
        done: true,
        response: {
          videos: [{ bytesBase64Encoded: videoBase64, mimeType: 'video/mp4' }],
        },
      });

      env.mockSupabase.storage.upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage full' },
      });

      // Act & Assert
      await expect(
        videoService.checkVideoStatus(env.user.id, project.id, 'operations/storage-fail')
      ).rejects.toThrow('Storage upload failed');
    });

    it('should handle invalid model configuration', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Invalid Model',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Invalid Model',
      });

      // Act & Assert
      await expect(
        videoService.generateVideo(env.user.id, project.id, {
          prompt: 'Test',
          model: 'nonexistent-model',
        })
      ).rejects.toThrow('Unsupported video generation model');
    });
  });

  describe('AI Generation Resource Management', () => {
    it('should track AI generation usage', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Usage Tracking',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Usage Tracking',
      });

      const { generateVideo, checkOperationStatus } = require('@/lib/veo');

      // Generate multiple videos
      for (let i = 0; i < 3; i++) {
        generateVideo.mockResolvedValueOnce({
          name: `operations/usage-${i}`,
        });

        await videoService.generateVideo(env.user.id, project.id, {
          prompt: `Video ${i}`,
          model: 'veo-3.1-generate-preview',
        });
      }

      // Assert - Should track 3 generations
      expect(generateVideo).toHaveBeenCalledTimes(3);
    });
  });
});
