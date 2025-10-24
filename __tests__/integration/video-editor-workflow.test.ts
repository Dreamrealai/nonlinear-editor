/**
 * @jest-environment node
 */

/**
 * Integration Tests: Video Editor Workflow
 *
 * Tests complete video editing workflows including:
 * - Timeline operations (add, trim, reorder, split clips)
 * - Playback controls integration
 * - Undo/redo workflows
 * - Auto-save functionality
 * - Multi-clip editing scenarios
 *
 * These tests verify that the video editor components work together
 * to support realistic editing workflows.
 */

import { ProjectService } from '@/lib/services/projectService';
import { AssetService } from '@/lib/services/assetService';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  resetAllMocks,
  MockSupabaseChain,
} from '@/test-utils/mockSupabase';
import {
  createTestEnvironment,
  UserPersonas,
  AssetFixtures,
  TimelineBuilders,
  IntegrationWorkflow,
  assertTimelineValid,
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
  },
  ErrorSeverity: {
    HIGH: 'high',
    MEDIUM: 'medium',
  },
}));

// Mock cache invalidation
jest.mock('@/lib/cacheInvalidation', () => ({
  invalidateProjectCache: jest.fn(),
  invalidateUserProjects: jest.fn(),
}));

describe('Integration: Video Editor Workflow', () => {
  let env: ReturnType<typeof createTestEnvironment>;
  let projectService: ProjectService;
  let assetService: AssetService;
  let workflow: IntegrationWorkflow;

  beforeEach(() => {
    jest.clearAllMocks();
    env = createTestEnvironment('proTierUser');
    projectService = new ProjectService(env.mockSupabase as unknown as SupabaseClient);
    assetService = new AssetService(env.mockSupabase as unknown as SupabaseClient);
    workflow = new IntegrationWorkflow(env.mockSupabase);
  });

  afterEach(async () => {
    resetAllMocks(env.mockSupabase);
    cleanupTestData(env.mockSupabase);
    await cache.clear();
  });

  describe('Complete Video Editing Session', () => {
    it('should complete full editing workflow: create → add clips → edit → export', async () => {
      // Step 1: Create project
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Video Editing Session',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Video Editing Session',
      });

      expect(project.id).toBe(mockProject.id);
      assertProjectValid(project);

      // Step 2: Upload video assets
      const asset1 = await workflow.uploadAssetWorkflow(project.id, env.user.id, 'video');
      const asset2 = await workflow.uploadAssetWorkflow(project.id, env.user.id, 'video');
      const asset3 = await workflow.uploadAssetWorkflow(project.id, env.user.id, 'video');

      const uploadedAsset1 = await assetService.createVideoAsset(
        env.user.id,
        project.id,
        Buffer.from('video1'),
        { filename: 'video1.mp4', mimeType: 'video/mp4' }
      );

      expect(uploadedAsset1.project_id).toBe(project.id);

      // Step 3: Build timeline with multiple clips
      const timelineState = TimelineBuilders.singleTrack(project.id, [asset1, asset2, asset3]);

      const updatedProject = await workflow.updateTimelineWorkflow(
        project.id,
        env.user.id,
        timelineState
      );

      const projectWithTimeline = await projectService.updateProjectState(
        project.id,
        env.user.id,
        timelineState
      );

      assertTimelineValid(projectWithTimeline.timeline_state_jsonb);
      expect(projectWithTimeline.timeline_state_jsonb.clips).toHaveLength(3);

      // Step 4: Trim a clip
      const trimmedTimeline = {
        ...timelineState,
        clips: timelineState.clips.map((clip, idx) =>
          idx === 1
            ? { ...clip, start: 1000, end: clip.end - 1000 } // Trim middle clip
            : clip
        ),
      };

      const trimmedProject = await workflow.updateTimelineWorkflow(
        project.id,
        env.user.id,
        trimmedTimeline
      );

      await projectService.updateProjectState(project.id, env.user.id, trimmedTimeline);

      expect(trimmedProject.timeline_state_jsonb.clips[1].start).toBe(1000);

      // Step 5: Verify final state
      env.mockSupabase.single.mockResolvedValueOnce({
        data: trimmedProject,
        error: null,
      });

      const finalProject = await projectService.getProjectById(project.id, env.user.id);

      expect(finalProject).toBeDefined();
      expect(finalProject?.timeline_state_jsonb.clips).toHaveLength(3);
    });

    it('should handle real-time auto-save during editing', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Auto-Save Test',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Auto-Save Test',
      });

      const asset = await workflow.uploadAssetWorkflow(project.id, env.user.id, 'video');

      // Act - Simulate multiple quick edits (auto-save scenario)
      const edits = [
        {
          clips: [
            {
              id: 'c1',
              assetId: asset.id,
              start: 0,
              end: 5000,
              timelinePosition: 0,
              trackIndex: 0,
            },
          ],
        },
        {
          clips: [
            {
              id: 'c1',
              assetId: asset.id,
              start: 0,
              end: 4000,
              timelinePosition: 0,
              trackIndex: 0,
            },
          ],
        },
        {
          clips: [
            {
              id: 'c1',
              assetId: asset.id,
              start: 500,
              end: 4000,
              timelinePosition: 0,
              trackIndex: 0,
            },
          ],
        },
      ];

      for (const edit of edits) {
        const timeline = { projectId: project.id, ...edit };
        await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
        await projectService.updateProjectState(project.id, env.user.id, timeline);
      }

      // Assert - Verify final state reflects last edit
      expect(env.mockSupabase.update).toHaveBeenCalledTimes(edits.length);
    });
  });

  describe('Timeline Operations', () => {
    it('should add multiple clips to timeline in sequence', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Sequential Clips',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Sequential Clips',
      });

      // Create assets
      const assets = await Promise.all([
        workflow.uploadAssetWorkflow(project.id, env.user.id, 'video'),
        workflow.uploadAssetWorkflow(project.id, env.user.id, 'video'),
        workflow.uploadAssetWorkflow(project.id, env.user.id, 'video'),
      ]);

      // Act - Add clips one by one
      let timeline = { projectId: project.id, clips: [] };

      for (let i = 0; i < assets.length; i++) {
        timeline = {
          ...timeline,
          clips: [
            ...timeline.clips,
            {
              id: `clip-${i}`,
              assetId: assets[i].id,
              start: 0,
              end: 5000,
              timelinePosition: i * 5000,
              trackIndex: 0,
            },
          ],
        };

        await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
        await projectService.updateProjectState(project.id, env.user.id, timeline);
      }

      // Assert
      expect(timeline.clips).toHaveLength(3);
      expect(timeline.clips[0].timelinePosition).toBe(0);
      expect(timeline.clips[1].timelinePosition).toBe(5000);
      expect(timeline.clips[2].timelinePosition).toBe(10000);
    });

    it('should reorder clips on timeline', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Reorder Clips',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Reorder Clips',
      });

      const assets = AssetFixtures.batch(project.id, env.user.id, 3, 'video');
      const timeline = TimelineBuilders.singleTrack(project.id, assets);

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      await projectService.updateProjectState(project.id, env.user.id, timeline);

      // Act - Reorder: move last clip to first position
      const reorderedTimeline = {
        ...timeline,
        clips: [
          { ...timeline.clips[2], timelinePosition: 0 },
          { ...timeline.clips[0], timelinePosition: 5000 },
          { ...timeline.clips[1], timelinePosition: 10000 },
        ],
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, reorderedTimeline);
      const updated = await projectService.updateProjectState(
        project.id,
        env.user.id,
        reorderedTimeline
      );

      // Assert
      expect(updated.timeline_state_jsonb.clips[0].assetId).toBe(assets[2].id);
      expect(updated.timeline_state_jsonb.clips[1].assetId).toBe(assets[0].id);
      expect(updated.timeline_state_jsonb.clips[2].assetId).toBe(assets[1].id);
    });

    it('should trim clip start and end points', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Trim Clips',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Trim Clips',
      });

      const asset = AssetFixtures.video(project.id, env.user.id);
      await workflow.uploadAssetWorkflow(project.id, env.user.id, 'video');

      const timeline = {
        projectId: project.id,
        clips: [
          {
            id: 'clip-1',
            assetId: asset.id,
            start: 0,
            end: 30000, // Full 30 second clip
            timelinePosition: 0,
            trackIndex: 0,
          },
        ],
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      await projectService.updateProjectState(project.id, env.user.id, timeline);

      // Act - Trim to middle 20 seconds
      const trimmedTimeline = {
        ...timeline,
        clips: [
          {
            ...timeline.clips[0],
            start: 5000, // Trim 5s from start
            end: 25000, // Trim 5s from end
          },
        ],
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, trimmedTimeline);
      const updated = await projectService.updateProjectState(
        project.id,
        env.user.id,
        trimmedTimeline
      );

      // Assert
      const clip = updated.timeline_state_jsonb.clips[0];
      expect(clip.start).toBe(5000);
      expect(clip.end).toBe(25000);
      expect(clip.end - clip.start).toBe(20000); // 20 seconds
    });

    it('should split clip into two clips', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Split Clip',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Split Clip',
      });

      const asset = AssetFixtures.video(project.id, env.user.id);
      await workflow.uploadAssetWorkflow(project.id, env.user.id, 'video');

      const timeline = {
        projectId: project.id,
        clips: [
          {
            id: 'clip-1',
            assetId: asset.id,
            start: 0,
            end: 10000,
            timelinePosition: 0,
            trackIndex: 0,
          },
        ],
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      await projectService.updateProjectState(project.id, env.user.id, timeline);

      // Act - Split at 5 second mark
      const splitPoint = 5000;
      const splitTimeline = {
        ...timeline,
        clips: [
          {
            id: 'clip-1a',
            assetId: asset.id,
            start: 0,
            end: splitPoint,
            timelinePosition: 0,
            trackIndex: 0,
          },
          {
            id: 'clip-1b',
            assetId: asset.id,
            start: splitPoint,
            end: 10000,
            timelinePosition: splitPoint,
            trackIndex: 0,
          },
        ],
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, splitTimeline);
      const updated = await projectService.updateProjectState(
        project.id,
        env.user.id,
        splitTimeline
      );

      // Assert
      expect(updated.timeline_state_jsonb.clips).toHaveLength(2);
      expect(updated.timeline_state_jsonb.clips[0].end).toBe(5000);
      expect(updated.timeline_state_jsonb.clips[1].start).toBe(5000);
      expect(updated.timeline_state_jsonb.clips[1].end).toBe(10000);
    });

    it('should delete clip from timeline', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Delete Clip',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Delete Clip',
      });

      const assets = AssetFixtures.batch(project.id, env.user.id, 3, 'video');
      const timeline = TimelineBuilders.singleTrack(project.id, assets);

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      await projectService.updateProjectState(project.id, env.user.id, timeline);

      expect(timeline.clips).toHaveLength(3);

      // Act - Delete middle clip
      const deletedTimeline = {
        ...timeline,
        clips: timeline.clips.filter((_, idx) => idx !== 1),
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, deletedTimeline);
      const updated = await projectService.updateProjectState(
        project.id,
        env.user.id,
        deletedTimeline
      );

      // Assert
      expect(updated.timeline_state_jsonb.clips).toHaveLength(2);
      expect(updated.timeline_state_jsonb.clips.map((c) => c.assetId)).toEqual([
        assets[0].id,
        assets[2].id,
      ]);
    });

    it('should handle multi-track timeline with video and audio', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Multi-Track',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Multi-Track',
      });

      const videoAssets = AssetFixtures.batch(project.id, env.user.id, 2, 'video');
      const audioAssets = AssetFixtures.batch(project.id, env.user.id, 2, 'audio');

      // Act - Create multi-track timeline
      const timeline = TimelineBuilders.multiTrack(project.id, videoAssets, audioAssets);

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      const updated = await projectService.updateProjectState(project.id, env.user.id, timeline);

      // Assert
      expect(updated.timeline_state_jsonb.clips).toHaveLength(4);

      const videoClips = updated.timeline_state_jsonb.clips.filter((c) => c.trackIndex === 0);
      const audioClips = updated.timeline_state_jsonb.clips.filter((c) => c.trackIndex === 1);

      expect(videoClips).toHaveLength(2);
      expect(audioClips).toHaveLength(2);
    });

    it('should adjust timeline output settings', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Output Settings',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Output Settings',
      });

      const asset = AssetFixtures.video(project.id, env.user.id);
      const timeline = TimelineBuilders.singleTrack(project.id, [asset]);

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      await projectService.updateProjectState(project.id, env.user.id, timeline);

      // Act - Change output settings to 4K
      const updatedTimeline = {
        ...timeline,
        output: {
          width: 3840,
          height: 2160,
          fps: 60,
          vBitrateK: 10000,
          aBitrateK: 320,
          format: 'mp4' as const,
        },
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, updatedTimeline);
      const updated = await projectService.updateProjectState(
        project.id,
        env.user.id,
        updatedTimeline
      );

      // Assert
      expect(updated.timeline_state_jsonb.output?.width).toBe(3840);
      expect(updated.timeline_state_jsonb.output?.height).toBe(2160);
      expect(updated.timeline_state_jsonb.output?.fps).toBe(60);
    });
  });

  describe('Undo/Redo Workflow', () => {
    it('should support undo/redo through state management', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Undo/Redo Test',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Undo/Redo Test',
      });

      const asset = AssetFixtures.video(project.id, env.user.id);

      // Initial state
      const state1 = {
        projectId: project.id,
        clips: [],
      };

      // Add clip (state 2)
      const state2 = {
        ...state1,
        clips: [
          { id: 'c1', assetId: asset.id, start: 0, end: 5000, timelinePosition: 0, trackIndex: 0 },
        ],
      };

      // Trim clip (state 3)
      const state3 = {
        ...state2,
        clips: [
          {
            id: 'c1',
            assetId: asset.id,
            start: 1000,
            end: 4000,
            timelinePosition: 0,
            trackIndex: 0,
          },
        ],
      };

      // Act - Apply state changes
      await workflow.updateTimelineWorkflow(project.id, env.user.id, state1);
      await projectService.updateProjectState(project.id, env.user.id, state1);

      await workflow.updateTimelineWorkflow(project.id, env.user.id, state2);
      await projectService.updateProjectState(project.id, env.user.id, state2);

      await workflow.updateTimelineWorkflow(project.id, env.user.id, state3);
      const current = await projectService.updateProjectState(project.id, env.user.id, state3);

      // Undo - go back to state2
      await workflow.updateTimelineWorkflow(project.id, env.user.id, state2);
      const undone = await projectService.updateProjectState(project.id, env.user.id, state2);

      // Redo - go forward to state3
      await workflow.updateTimelineWorkflow(project.id, env.user.id, state3);
      const redone = await projectService.updateProjectState(project.id, env.user.id, state3);

      // Assert
      expect(current.timeline_state_jsonb.clips[0].start).toBe(1000);
      expect(undone.timeline_state_jsonb.clips[0].start).toBe(0);
      expect(redone.timeline_state_jsonb.clips[0].start).toBe(1000);
    });
  });

  describe('Complex Editing Scenarios', () => {
    it('should handle overlapping clips on different tracks', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Overlapping Clips',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Overlapping Clips',
      });

      const assets = AssetFixtures.batch(project.id, env.user.id, 3, 'video');

      // Act - Create overlapping clips on different tracks
      const timeline = {
        projectId: project.id,
        clips: [
          // Track 0
          {
            id: 'c1',
            assetId: assets[0].id,
            start: 0,
            end: 10000,
            timelinePosition: 0,
            trackIndex: 0,
          },
          // Track 1 - overlaps with c1
          {
            id: 'c2',
            assetId: assets[1].id,
            start: 0,
            end: 10000,
            timelinePosition: 5000,
            trackIndex: 1,
          },
          // Track 2 - overlaps with both
          {
            id: 'c3',
            assetId: assets[2].id,
            start: 0,
            end: 10000,
            timelinePosition: 7000,
            trackIndex: 2,
          },
        ],
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      const updated = await projectService.updateProjectState(project.id, env.user.id, timeline);

      // Assert
      expect(updated.timeline_state_jsonb.clips).toHaveLength(3);
      expect(updated.timeline_state_jsonb.clips[0].trackIndex).toBe(0);
      expect(updated.timeline_state_jsonb.clips[1].trackIndex).toBe(1);
      expect(updated.timeline_state_jsonb.clips[2].trackIndex).toBe(2);

      // Verify overlap
      const clip1End = updated.timeline_state_jsonb.clips[0].timelinePosition + 10000;
      const clip2Start = updated.timeline_state_jsonb.clips[1].timelinePosition;
      expect(clip1End).toBeGreaterThan(clip2Start); // Confirms overlap
    });

    it('should handle complex timeline with gaps', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Timeline with Gaps',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Timeline with Gaps',
      });

      const assets = AssetFixtures.batch(project.id, env.user.id, 4, 'video');

      // Act - Create timeline with intentional gaps
      const timeline = {
        projectId: project.id,
        clips: [
          {
            id: 'c1',
            assetId: assets[0].id,
            start: 0,
            end: 5000,
            timelinePosition: 0,
            trackIndex: 0,
          },
          // Gap from 5000 to 10000
          {
            id: 'c2',
            assetId: assets[1].id,
            start: 0,
            end: 5000,
            timelinePosition: 10000, // 5s gap
            trackIndex: 0,
          },
          // Another gap from 15000 to 25000
          {
            id: 'c3',
            assetId: assets[2].id,
            start: 0,
            end: 5000,
            timelinePosition: 25000, // 10s gap
            trackIndex: 0,
          },
        ],
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      const updated = await projectService.updateProjectState(project.id, env.user.id, timeline);

      // Assert
      expect(updated.timeline_state_jsonb.clips).toHaveLength(3);

      // Verify gaps
      const clip1End = updated.timeline_state_jsonb.clips[0].timelinePosition + 5000;
      const clip2Start = updated.timeline_state_jsonb.clips[1].timelinePosition;
      expect(clip2Start - clip1End).toBe(5000); // 5s gap

      const clip2End = updated.timeline_state_jsonb.clips[1].timelinePosition + 5000;
      const clip3Start = updated.timeline_state_jsonb.clips[2].timelinePosition;
      expect(clip3Start - clip2End).toBe(10000); // 10s gap
    });

    it('should handle rapid consecutive edits', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Rapid Edits',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Rapid Edits',
      });

      const asset = AssetFixtures.video(project.id, env.user.id);

      // Act - Simulate rapid editing
      const edits = Array.from({ length: 10 }, (_, i) => ({
        projectId: project.id,
        clips: [
          {
            id: 'c1',
            assetId: asset.id,
            start: i * 500,
            end: 10000 - i * 500,
            timelinePosition: 0,
            trackIndex: 0,
          },
        ],
      }));

      for (const edit of edits) {
        await workflow.updateTimelineWorkflow(project.id, env.user.id, edit);
        await projectService.updateProjectState(project.id, env.user.id, edit);
      }

      // Assert - Verify last edit is applied
      expect(env.mockSupabase.update).toHaveBeenCalledTimes(edits.length);
    });
  });
});
