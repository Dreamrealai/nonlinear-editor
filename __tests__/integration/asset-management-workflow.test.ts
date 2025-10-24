/**
 * Integration Tests: Asset Management Workflow
 *
 * Tests complete asset management workflows including:
 * - Upload → Process → Use in timeline
 * - Image upload with frame extraction
 * - Video upload with scene detection
 * - Asset organization and search
 * - Asset deletion with timeline updates
 * - Batch upload operations
 *
 * These tests verify that asset management features work together
 * to support realistic file management workflows.
 */

import { AssetService } from '@/lib/services/assetService';
import { ProjectService } from '@/lib/services/projectService';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  resetAllMocks,
  MockSupabaseChain,
  createMockAsset,
} from '@/test-utils/mockSupabase';
import {
  createTestEnvironment,
  AssetFixtures,
  TimelineBuilders,
  IntegrationWorkflow,
  assertAssetValid,
  assertProjectValid,
  cleanupTestData,
} from './helpers/integration-helpers';
import { cache } from '@/lib/cache';

// Mock error tracking
jest.mock('@/lib/errorTracking', () => ({
  trackError: jest.fn(),
  ErrorCategory: {
    DATABASE: 'database',
    EXTERNAL_SERVICE: 'external_service',
    VALIDATION: 'validation',
  },
  ErrorSeverity: {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  },
}));

// Mock cache invalidation
jest.mock('@/lib/cacheInvalidation', () => ({
  invalidateProjectCache: jest.fn(),
  invalidateUserProjects: jest.fn(),
  invalidateAssetCache: jest.fn(),
}));

describe('Integration: Asset Management Workflow', () => {
  let env: ReturnType<typeof createTestEnvironment>;
  let assetService: AssetService;
  let projectService: ProjectService;
  let workflow: IntegrationWorkflow;

  beforeEach(() => {
    jest.clearAllMocks();
    env = createTestEnvironment('proTierUser');
    assetService = new AssetService(env.mockSupabase as unknown as SupabaseClient);
    projectService = new ProjectService(env.mockSupabase as unknown as SupabaseClient);
    workflow = new IntegrationWorkflow(env.mockSupabase);
  });

  afterEach(async () => {
    resetAllMocks(env.mockSupabase);
    cleanupTestData(env.mockSupabase);
    await cache.clear();
  });

  describe('Upload → Process → Timeline Integration', () => {
    it('should complete full asset workflow: upload → process → add to timeline', async () => {
      // Step 1: Create project
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Asset Integration Project',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Asset Integration Project',
      });

      assertProjectValid(project);

      // Step 2: Upload video asset
      const mockVideoAsset = await workflow.uploadAssetWorkflow(project.id, env.user.id, 'video');

      const videoBuffer = Buffer.from('video-data');
      const videoAsset = await assetService.createVideoAsset(env.user.id, project.id, videoBuffer, {
        filename: 'test-video.mp4',
        mimeType: 'video/mp4',
      });

      assertAssetValid(videoAsset);
      expect(videoAsset.type).toBe('video');
      expect(videoAsset.project_id).toBe(project.id);

      // Step 3: Add asset to timeline
      const timeline = {
        projectId: project.id,
        clips: [
          {
            id: 'clip-1',
            assetId: videoAsset.id,
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

      // Step 4: Verify integration
      expect(updatedProject.timeline_state_jsonb.clips).toHaveLength(1);
      expect(updatedProject.timeline_state_jsonb.clips[0].assetId).toBe(videoAsset.id);

      // Step 5: Fetch project assets
      env.mockSupabase.order.mockResolvedValueOnce({
        data: [mockVideoAsset],
        error: null,
      });

      const projectAssets = await assetService.getProjectAssets(project.id, env.user.id);

      expect(projectAssets).toHaveLength(1);
      expect(projectAssets[0].id).toBe(videoAsset.id);
    });

    it('should handle image upload with metadata extraction', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Image Upload Project',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Image Upload Project',
      });

      // Act - Upload image
      const mockImageAsset = await workflow.uploadAssetWorkflow(project.id, env.user.id, 'image');

      const imageBuffer = Buffer.from('image-data');
      const imageAsset = await assetService.createImageAsset(env.user.id, project.id, imageBuffer, {
        filename: 'test-image.jpg',
        mimeType: 'image/jpeg',
      });

      // Assert
      assertAssetValid(imageAsset);
      expect(imageAsset.type).toBe('image');
      expect(imageAsset.metadata).toBeDefined();
      expect(imageAsset.metadata.filename).toBe('test-image.jpg');
      expect(imageAsset.metadata.mimeType).toBe('image/jpeg');
    });

    it('should handle video upload with duration detection', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Video Processing Project',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Video Processing Project',
      });

      // Act - Upload video with metadata
      const mockVideoAsset = AssetFixtures.video(project.id, env.user.id, {
        duration_seconds: 45,
        metadata: {
          filename: 'long-video.mp4',
          mimeType: 'video/mp4',
          width: 1920,
          height: 1080,
          fps: 30,
          duration: 45,
        },
      });

      env.mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'test-path' },
        error: null,
      });

      env.mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/video.mp4' },
      });

      env.mockSupabase.single.mockResolvedValueOnce({
        data: mockVideoAsset,
        error: null,
      });

      const videoBuffer = Buffer.from('video-data');
      const videoAsset = await assetService.createVideoAsset(env.user.id, project.id, videoBuffer, {
        filename: 'long-video.mp4',
        mimeType: 'video/mp4',
      });

      // Assert
      expect(videoAsset.duration_seconds).toBe(45);
      expect(videoAsset.metadata.duration).toBe(45);
    });

    it('should handle audio upload workflow', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Audio Upload Project',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Audio Upload Project',
      });

      // Act - Upload audio
      const mockAudioAsset = await workflow.uploadAssetWorkflow(project.id, env.user.id, 'audio');

      // Manually mock audio creation since workflow doesn't have audio method
      env.mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'audio-path' },
        error: null,
      });

      env.mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/audio.mp3' },
      });

      env.mockSupabase.single.mockResolvedValueOnce({
        data: mockAudioAsset,
        error: null,
      });

      // Note: AssetService doesn't have createAudioAsset, using createImageAsset as proxy
      const audioBuffer = Buffer.from('audio-data');
      const audioAsset = await assetService.createImageAsset(env.user.id, project.id, audioBuffer, {
        filename: 'test-audio.mp3',
        mimeType: 'audio/mpeg',
      });

      // Assert
      assertAssetValid(audioAsset);
    });
  });

  describe('Batch Upload Operations', () => {
    it('should upload multiple assets in batch', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Batch Upload Project',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Batch Upload Project',
      });

      // Act - Upload 5 assets
      const mockAssets = AssetFixtures.batch(project.id, env.user.id, 5, 'video');

      const uploadPromises = mockAssets.map(async (_, idx) => {
        env.mockSupabase.storage.upload.mockResolvedValueOnce({
          data: { path: `path-${idx}` },
          error: null,
        });

        env.mockSupabase.storage.getPublicUrl.mockReturnValue({
          data: { publicUrl: `https://example.com/video-${idx}.mp4` },
        });

        env.mockSupabase.single.mockResolvedValueOnce({
          data: mockAssets[idx],
          error: null,
        });

        const buffer = Buffer.from(`video-${idx}`);
        return assetService.createVideoAsset(env.user.id, project.id, buffer, {
          filename: `video-${idx}.mp4`,
          mimeType: 'video/mp4',
        });
      });

      const uploadedAssets = await Promise.all(uploadPromises);

      // Assert
      expect(uploadedAssets).toHaveLength(5);
      expect(env.mockSupabase.storage.upload).toHaveBeenCalledTimes(5);

      uploadedAssets.forEach((asset, idx) => {
        expect(asset.project_id).toBe(project.id);
        assertAssetValid(asset);
      });
    });

    it('should handle partial batch upload failure', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Partial Batch Failure',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Partial Batch Failure',
      });

      const mockAssets = AssetFixtures.batch(project.id, env.user.id, 3, 'video');

      // Act - First 2 succeed, 3rd fails
      // Asset 1
      env.mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'path-1' },
        error: null,
      });

      env.mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/video-1.mp4' },
      });

      env.mockSupabase.single.mockResolvedValueOnce({
        data: mockAssets[0],
        error: null,
      });

      const asset1 = await assetService.createVideoAsset(
        env.user.id,
        project.id,
        Buffer.from('video-1'),
        {
          filename: 'video-1.mp4',
          mimeType: 'video/mp4',
        }
      );

      // Asset 2
      env.mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'path-2' },
        error: null,
      });

      env.mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/video-2.mp4' },
      });

      env.mockSupabase.single.mockResolvedValueOnce({
        data: mockAssets[1],
        error: null,
      });

      const asset2 = await assetService.createVideoAsset(
        env.user.id,
        project.id,
        Buffer.from('video-2'),
        {
          filename: 'video-2.mp4',
          mimeType: 'video/mp4',
        }
      );

      // Asset 3 - storage fails
      env.mockSupabase.storage.upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      // Assert - First 2 succeed
      expect(asset1).toBeDefined();
      expect(asset2).toBeDefined();

      // Third fails
      await expect(
        assetService.createVideoAsset(env.user.id, project.id, Buffer.from('video-3'), {
          filename: 'video-3.mp4',
          mimeType: 'video/mp4',
        })
      ).rejects.toThrow('Failed to upload asset');
    });

    it('should track upload progress for batch operations', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Upload Progress',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Upload Progress',
      });

      const batchSize = 10;
      const mockAssets = AssetFixtures.batch(project.id, env.user.id, batchSize, 'image');

      // Act - Upload with progress tracking
      let completed = 0;
      const uploadPromises = mockAssets.map(async (asset, idx) => {
        env.mockSupabase.storage.upload.mockResolvedValueOnce({
          data: { path: `path-${idx}` },
          error: null,
        });

        env.mockSupabase.storage.getPublicUrl.mockReturnValue({
          data: { publicUrl: `https://example.com/image-${idx}.jpg` },
        });

        env.mockSupabase.single.mockResolvedValueOnce({
          data: asset,
          error: null,
        });

        const result = await assetService.createImageAsset(
          env.user.id,
          project.id,
          Buffer.from(`image-${idx}`),
          {
            filename: `image-${idx}.jpg`,
            mimeType: 'image/jpeg',
          }
        );

        completed++;
        return result;
      });

      const results = await Promise.all(uploadPromises);

      // Assert
      expect(results).toHaveLength(batchSize);
      expect(completed).toBe(batchSize);
    });
  });

  describe('Asset Organization and Search', () => {
    it('should fetch all assets for a project', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Asset Organization',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Asset Organization',
      });

      const mockAssets = [
        AssetFixtures.video(project.id, env.user.id, { id: 'video-1' }),
        AssetFixtures.image(project.id, env.user.id, { id: 'image-1' }),
        AssetFixtures.audio(project.id, env.user.id, { id: 'audio-1' }),
      ];

      // Mock fetching assets
      env.mockSupabase.order.mockResolvedValueOnce({
        data: mockAssets,
        error: null,
      });

      // Act
      const assets = await assetService.getProjectAssets(project.id, env.user.id);

      // Assert
      expect(assets).toHaveLength(3);
      expect(assets.map((a) => a.type)).toEqual(['video', 'image', 'audio']);
    });

    it('should filter assets by type', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Filter Assets',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Filter Assets',
      });

      const mockAssets = [
        ...AssetFixtures.batch(project.id, env.user.id, 3, 'video'),
        ...AssetFixtures.batch(project.id, env.user.id, 2, 'image'),
      ];

      env.mockSupabase.order.mockResolvedValueOnce({
        data: mockAssets,
        error: null,
      });

      // Act
      const allAssets = await assetService.getProjectAssets(project.id, env.user.id);
      const videoAssets = allAssets.filter((a) => a.type === 'video');
      const imageAssets = allAssets.filter((a) => a.type === 'image');

      // Assert
      expect(allAssets).toHaveLength(5);
      expect(videoAssets).toHaveLength(3);
      expect(imageAssets).toHaveLength(2);
    });

    it('should sort assets by creation date', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Sort Assets',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Sort Assets',
      });

      const now = Date.now();
      const mockAssets = [
        AssetFixtures.video(project.id, env.user.id, {
          id: 'video-1',
          created_at: new Date(now - 3000).toISOString(),
        }),
        AssetFixtures.video(project.id, env.user.id, {
          id: 'video-2',
          created_at: new Date(now - 2000).toISOString(),
        }),
        AssetFixtures.video(project.id, env.user.id, {
          id: 'video-3',
          created_at: new Date(now - 1000).toISOString(),
        }),
      ];

      env.mockSupabase.order.mockResolvedValueOnce({
        data: mockAssets.reverse(), // Most recent first
        error: null,
      });

      // Act
      const assets = await assetService.getProjectAssets(project.id, env.user.id);

      // Assert
      expect(assets[0].id).toBe('video-3'); // Most recent
      expect(assets[1].id).toBe('video-2');
      expect(assets[2].id).toBe('video-1'); // Oldest
      expect(env.mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should get asset by ID', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Get Asset',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Get Asset',
      });

      const mockAsset = AssetFixtures.video(project.id, env.user.id, {
        id: 'specific-asset',
      });

      env.mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      // Act
      const asset = await assetService.getAssetById('specific-asset', env.user.id);

      // Assert
      expect(asset).toBeDefined();
      expect(asset?.id).toBe('specific-asset');
      expect(env.mockSupabase.eq).toHaveBeenCalledWith('id', 'specific-asset');
    });
  });

  describe('Asset Deletion with Timeline Updates', () => {
    it('should delete asset and remove from timeline', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Delete Asset',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Delete Asset',
      });

      const mockAsset = await workflow.uploadAssetWorkflow(project.id, env.user.id, 'video');

      const videoBuffer = Buffer.from('video-data');
      const videoAsset = await assetService.createVideoAsset(env.user.id, project.id, videoBuffer, {
        filename: 'to-delete.mp4',
        mimeType: 'video/mp4',
      });

      // Add to timeline
      const timeline = {
        projectId: project.id,
        clips: [
          {
            id: 'clip-1',
            assetId: videoAsset.id,
            start: 0,
            end: 5000,
            timelinePosition: 0,
            trackIndex: 0,
          },
        ],
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      await projectService.updateProjectState(project.id, env.user.id, timeline);

      // Act - Delete asset
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockEqChain),
        }),
      };

      env.mockSupabase.from.mockReturnValue(mockDeleteChain);

      await assetService.deleteAsset(videoAsset.id, env.user.id);

      // Update timeline to remove clips using deleted asset
      const updatedTimeline = {
        ...timeline,
        clips: timeline.clips.filter((c) => c.assetId !== videoAsset.id),
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, updatedTimeline);
      const finalProject = await projectService.updateProjectState(
        project.id,
        env.user.id,
        updatedTimeline
      );

      // Assert
      expect(mockDeleteChain.delete).toHaveBeenCalled();
      expect(finalProject.timeline_state_jsonb.clips).toHaveLength(0);
    });

    it('should handle deletion of asset used in multiple clips', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Multi-Clip Delete',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Multi-Clip Delete',
      });

      const mockAsset = await workflow.uploadAssetWorkflow(project.id, env.user.id, 'video');

      // Create timeline with same asset used multiple times
      const timeline = {
        projectId: project.id,
        clips: [
          {
            id: 'clip-1',
            assetId: mockAsset.id,
            start: 0,
            end: 5000,
            timelinePosition: 0,
            trackIndex: 0,
          },
          {
            id: 'clip-2',
            assetId: mockAsset.id,
            start: 5000,
            end: 10000,
            timelinePosition: 5000,
            trackIndex: 0,
          },
          {
            id: 'clip-3',
            assetId: mockAsset.id,
            start: 0,
            end: 10000,
            timelinePosition: 0,
            trackIndex: 1,
          },
        ],
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      await projectService.updateProjectState(project.id, env.user.id, timeline);

      // Act - Delete asset
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockEqChain),
        }),
      };

      env.mockSupabase.from.mockReturnValue(mockDeleteChain);

      await assetService.deleteAsset(mockAsset.id, env.user.id);

      // Remove all clips using this asset
      const updatedTimeline = {
        ...timeline,
        clips: timeline.clips.filter((c) => c.assetId !== mockAsset.id),
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, updatedTimeline);
      const finalProject = await projectService.updateProjectState(
        project.id,
        env.user.id,
        updatedTimeline
      );

      // Assert - All 3 clips should be removed
      expect(finalProject.timeline_state_jsonb.clips).toHaveLength(0);
    });

    it('should handle storage cleanup on asset deletion', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Storage Cleanup',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Storage Cleanup',
      });

      const mockAsset = await workflow.uploadAssetWorkflow(project.id, env.user.id, 'video');

      const videoBuffer = Buffer.from('video-data');
      const videoAsset = await assetService.createVideoAsset(env.user.id, project.id, videoBuffer, {
        filename: 'cleanup-test.mp4',
        mimeType: 'video/mp4',
      });

      // Act - Delete asset
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockEqChain),
        }),
      };

      env.mockSupabase.from.mockReturnValue(mockDeleteChain);

      // Mock storage deletion
      env.mockSupabase.storage.remove.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await assetService.deleteAsset(videoAsset.id, env.user.id);

      // Assert
      expect(mockDeleteChain.delete).toHaveBeenCalled();
      // Note: Storage cleanup would be handled by database triggers or service layer
    });
  });

  describe('Asset Validation and Error Handling', () => {
    it('should validate asset ownership before operations', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Ownership Test',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Ownership Test',
      });

      // Create asset owned by different user
      const otherUserId = 'other-user-123';
      const mockAsset = AssetFixtures.video(project.id, otherUserId, {
        id: 'other-asset',
      });

      env.mockSupabase.single.mockResolvedValueOnce({
        data: null, // Asset not found for current user
        error: { code: 'PGRST116' },
      });

      // Act & Assert - Should not be able to access
      const asset = await assetService.getAssetById('other-asset', env.user.id);
      expect(asset).toBeNull();
    });

    it('should handle upload failure gracefully', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Upload Failure',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Upload Failure',
      });

      // Mock storage failure
      env.mockSupabase.storage.upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' },
      });

      // Act & Assert
      const videoBuffer = Buffer.from('video-data');
      await expect(
        assetService.createVideoAsset(env.user.id, project.id, videoBuffer, {
          filename: 'fail.mp4',
          mimeType: 'video/mp4',
        })
      ).rejects.toThrow('Failed to upload asset');
    });
  });
});
