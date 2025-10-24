/**
 * Clip Group Store - Clip Grouping Management
 *
 * Manages clip groups for organizing and moving related clips together.
 * Groups maintain relative positions of clips when moved or dragged.
 *
 * Features:
 * - Create groups from selected clips
 * - Ungroup clips
 * - Query group membership
 * - Lock/unlock entire groups
 * - Get all clips in a group
 *
 * Architecture:
 * - Uses Immer middleware for immutable updates
 * - Groups stored in Timeline type
 * - Clips reference their group via groupId field
 * - Simple, focused API
 */
'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ClipGroup, Timeline } from '@/types/timeline';

type ClipGroupStore = {
  // ===== Actions =====

  /**
   * Create a group from the specified clip IDs
   * Sets groupId on each clip and adds group to timeline
   */
  createGroup: (timeline: Timeline | null, clipIds: string[], name?: string) => Timeline | null;

  /**
   * Remove a group and clear groupId from all member clips
   */
  removeGroup: (timeline: Timeline | null, groupId: string) => Timeline | null;

  /**
   * Get all clip IDs that belong to a group
   */
  getGroupClipIds: (timeline: Timeline | null, groupId: string) => string[];

  /**
   * Get group by ID
   */
  getGroup: (timeline: Timeline | null, groupId: string) => ClipGroup | null;

  /**
   * Check if a clip belongs to any group
   */
  isClipGrouped: (timeline: Timeline | null, clipId: string) => boolean;

  /**
   * Get the group ID for a clip, or null if not grouped
   */
  getClipGroupId: (timeline: Timeline | null, clipId: string) => string | null;

  /**
   * Lock a group (locks all clips in the group)
   */
  lockGroup: (timeline: Timeline | null, groupId: string) => Timeline | null;

  /**
   * Unlock a group (unlocks all clips in the group)
   */
  unlockGroup: (timeline: Timeline | null, groupId: string) => Timeline | null;

  /**
   * Get all groups in the timeline
   */
  getAllGroups: (timeline: Timeline | null) => ClipGroup[];

  /**
   * Rename a group
   */
  renameGroup: (timeline: Timeline | null, groupId: string, name: string) => Timeline | null;

  /**
   * Set color for a group
   */
  setGroupColor: (timeline: Timeline | null, groupId: string, color: string) => Timeline | null;
};

export const useClipGroupStore = create<ClipGroupStore>()(
  immer((set, get) => ({
    createGroup: (timeline, clipIds, name): Timeline | null => {
      if (!timeline || clipIds.length < 2) return timeline;

      // Create new timeline with group
      const newTimeline = structuredClone(timeline);
      if (!newTimeline.groups) {
        newTimeline.groups = [];
      }

      // Generate group ID
      const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create group
      const group: ClipGroup = {
        id: groupId,
        name: name || `Group ${newTimeline.groups.length + 1}`,
        clipIds: [...clipIds],
        created_at: Date.now(),
      };

      newTimeline.groups.push(group);

      // Set groupId on all clips
      newTimeline.clips.forEach((clip): void => {
        if (clipIds.includes(clip.id)) {
          clip.groupId = groupId;
        }
      });

      return newTimeline;
    },

    removeGroup: (timeline, groupId): Timeline | null => {
      if (!timeline || !timeline.groups) return timeline;

      const newTimeline = structuredClone(timeline);

      // Remove group
      newTimeline.groups = newTimeline.groups.filter((g): boolean => g.id !== groupId);

      // Clear groupId from clips
      newTimeline.clips.forEach((clip): void => {
        if (clip.groupId === groupId) {
          delete clip.groupId;
        }
      });

      return newTimeline;
    },

    getGroupClipIds: (timeline, groupId): string[] => {
      if (!timeline || !timeline.groups) return [];

      const group = timeline.groups.find((g): boolean => g.id === groupId);
      return group ? [...group.clipIds] : [];
    },

    getGroup: (timeline, groupId): ClipGroup | null => {
      if (!timeline || !timeline.groups) return null;

      return timeline.groups.find((g): boolean => g.id === groupId) || null;
    },

    isClipGrouped: (timeline, clipId): boolean => {
      if (!timeline) return false;

      const clip = timeline.clips.find((c): boolean => c.id === clipId);
      return Boolean(clip?.groupId);
    },

    getClipGroupId: (timeline, clipId): string | null => {
      if (!timeline) return null;

      const clip = timeline.clips.find((c): boolean => c.id === clipId);
      return clip?.groupId || null;
    },

    lockGroup: (timeline, groupId): Timeline | null => {
      if (!timeline || !timeline.groups) return timeline;

      const newTimeline = structuredClone(timeline);

      // Lock group
      const group = newTimeline.groups.find((g): boolean => g.id === groupId);
      if (group) {
        group.locked = true;
      }

      // Lock all clips in group
      newTimeline.clips.forEach((clip): void => {
        if (clip.groupId === groupId) {
          clip.locked = true;
        }
      });

      return newTimeline;
    },

    unlockGroup: (timeline, groupId): Timeline | null => {
      if (!timeline || !timeline.groups) return timeline;

      const newTimeline = structuredClone(timeline);

      // Unlock group
      const group = newTimeline.groups.find((g): boolean => g.id === groupId);
      if (group) {
        group.locked = false;
      }

      // Unlock all clips in group
      newTimeline.clips.forEach((clip): void => {
        if (clip.groupId === groupId) {
          clip.locked = false;
        }
      });

      return newTimeline;
    },

    getAllGroups: (timeline): ClipGroup[] => {
      if (!timeline || !timeline.groups) return [];

      return [...timeline.groups];
    },

    renameGroup: (timeline, groupId, name): Timeline | null => {
      if (!timeline || !timeline.groups) return timeline;

      const newTimeline = structuredClone(timeline);

      const group = newTimeline.groups.find((g): boolean => g.id === groupId);
      if (group) {
        group.name = name;
      }

      return newTimeline;
    },

    setGroupColor: (timeline, groupId, color): Timeline | null => {
      if (!timeline || !timeline.groups) return timeline;

      const newTimeline = structuredClone(timeline);

      const group = newTimeline.groups.find((g): boolean => g.id === groupId);
      if (group) {
        group.color = color;
      }

      return newTimeline;
    },
  }))
);
