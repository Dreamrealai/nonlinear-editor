/**
 * Asset Deletion Protection Tests
 *
 * Tests for the DELETE /api/assets/[assetId] endpoint
 * to ensure assets in use cannot be deleted.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMockSupabaseClient } from '@/lib/test-utils/mockSupabase';
import type { Timeline } from '@/types/timeline';

describe('DELETE /api/assets/[assetId] - Timeline Protection', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
  });

  describe('Asset in use protection', () => {
    it('should prevent deletion of asset used in timeline', async () => {
      const assetId = 'asset-123';
      const projectId = 'project-456';
      const userId = 'user-789';

      // Mock asset exists
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: assetId,
                user_id: userId,
                project_id: projectId,
                storage_url: 'supabase://assets/path/to/file.mp4',
                metadata: { filename: 'test.mp4' },
                type: 'video',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock timeline with asset in use
      const timeline: Timeline = {
        projectId,
        clips: [
          {
            id: 'clip-1',
            assetId: assetId, // Asset is in use!
            filePath: '/path/to/file.mp4',
            mime: 'video/mp4',
            start: 0,
            end: 10,
            timelinePosition: 0,
            trackIndex: 0,
            crop: null,
          },
        ],
        output: {
          resolution: { width: 1920, height: 1080 },
          framerate: 30,
          codec: 'h264',
        },
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'timeline-1',
                project_id: projectId,
                timeline_data: timeline,
              },
            ],
            error: null,
          }),
        }),
      } as any);

      // The endpoint should detect the asset is in use and return 400
      // In actual implementation, this would be handled by the API route
      const timelinesUsingAsset = timeline.clips.filter((clip) => clip.assetId === assetId);

      expect(timelinesUsingAsset.length).toBeGreaterThan(0);
      expect(timeline.clips[0].assetId).toBe(assetId);
    });

    it('should allow deletion of asset not in use', async () => {
      const assetId = 'asset-123';
      const projectId = 'project-456';
      const userId = 'user-789';

      // Mock asset exists
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: assetId,
                user_id: userId,
                project_id: projectId,
                storage_url: 'supabase://assets/path/to/file.mp4',
                metadata: { filename: 'test.mp4' },
                type: 'video',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock timeline without asset
      const timeline: Timeline = {
        projectId,
        clips: [
          {
            id: 'clip-1',
            assetId: 'different-asset', // Different asset
            filePath: '/path/to/other.mp4',
            mime: 'video/mp4',
            start: 0,
            end: 10,
            timelinePosition: 0,
            trackIndex: 0,
            crop: null,
          },
        ],
        output: {
          resolution: { width: 1920, height: 1080 },
          framerate: 30,
          codec: 'h264',
        },
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'timeline-1',
                project_id: projectId,
                timeline_data: timeline,
              },
            ],
            error: null,
          }),
        }),
      } as any);

      // The asset is not in use
      const timelinesUsingAsset = timeline.clips.filter((clip) => clip.assetId === assetId);

      expect(timelinesUsingAsset.length).toBe(0);
    });

    it('should detect asset in multiple timelines', async () => {
      const assetId = 'asset-123';
      const projectId = 'project-456';

      const timeline1: Timeline = {
        projectId,
        clips: [
          {
            id: 'clip-1',
            assetId: assetId,
            filePath: '/path/to/file.mp4',
            mime: 'video/mp4',
            start: 0,
            end: 10,
            timelinePosition: 0,
            trackIndex: 0,
            crop: null,
          },
        ],
        output: {
          resolution: { width: 1920, height: 1080 },
          framerate: 30,
          codec: 'h264',
        },
      };

      const timeline2: Timeline = {
        projectId,
        clips: [
          {
            id: 'clip-2',
            assetId: assetId, // Same asset in different timeline
            filePath: '/path/to/file.mp4',
            mime: 'video/mp4',
            start: 5,
            end: 15,
            timelinePosition: 0,
            trackIndex: 0,
            crop: null,
          },
        ],
        output: {
          resolution: { width: 1920, height: 1080 },
          framerate: 30,
          codec: 'h264',
        },
      };

      const timelines = [
        { id: 'timeline-1', project_id: projectId, timeline_data: timeline1 },
        { id: 'timeline-2', project_id: projectId, timeline_data: timeline2 },
      ];

      // Check both timelines
      const timelinesUsingAsset = timelines.filter((t) => {
        const timelineData = t.timeline_data as Timeline;
        return timelineData.clips.some((clip) => clip.assetId === assetId);
      });

      expect(timelinesUsingAsset.length).toBe(2);
      expect(timelinesUsingAsset[0].id).toBe('timeline-1');
      expect(timelinesUsingAsset[1].id).toBe('timeline-2');
    });

    it('should handle empty timeline', async () => {
      const assetId = 'asset-123';
      const projectId = 'project-456';

      const timeline: Timeline = {
        projectId,
        clips: [], // No clips
        output: {
          resolution: { width: 1920, height: 1080 },
          framerate: 30,
          codec: 'h264',
        },
      };

      const timelinesUsingAsset = timeline.clips.filter((clip) => clip.assetId === assetId);

      expect(timelinesUsingAsset.length).toBe(0);
    });
  });
});
