/**
 * Groups Slice - Clip Grouping Operations
 *
 * Handles clip grouping operations including:
 * - Creating groups from selected clips
 * - Ungrouping clips
 * - Querying group information
 */
import type { Timeline, Clip, ClipGroup } from '@/types/timeline';
import { EDITOR_CONSTANTS } from '@/lib/constants';
import type { WritableDraft } from 'immer';

const { MAX_HISTORY } = EDITOR_CONSTANTS;

/**
 * Deep clones a timeline for history snapshots.
 */
const cloneTimeline = (timeline: Timeline | null): Timeline | null => {
  if (!timeline) return null;
  return structuredClone(timeline);
};

export interface GroupsSlice {
  /** Create a group from selected clips */
  groupSelectedClips: (name?: string) => void;
  /** Ungroup clips in a group */
  ungroupClips: (groupId: string) => void;
  /** Get all clip IDs in a group */
  getGroupClipIds: (groupId: string) => string[];
  /** Check if a clip is grouped */
  isClipGrouped: (clipId: string) => boolean;
  /** Get group ID for a clip */
  getClipGroupId: (clipId: string) => string | null;
}

export interface GroupsSliceState {
  timeline: Timeline | null;
  selectedClipIds: Set<string>;
  history: Timeline[];
  historyIndex: number;
}

/**
 * Zustand set function type with Immer middleware
 */
type SetState = (fn: (state: WritableDraft<GroupsSliceState>) => void) => void;

/**
 * Zustand get function type
 */
type GetState = () => GroupsSliceState;

export const createGroupsSlice = (set: SetState, get: GetState): GroupsSlice => ({
  groupSelectedClips: (name?: string): void =>
    set((state: WritableDraft<GroupsSliceState>): void => {
      if (!state.timeline || state.selectedClipIds.size < 2) return;

      if (!state.timeline.groups) {
        state.timeline.groups = [];
      }

      const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const clipIds = Array.from(state.selectedClipIds);

      state.timeline.groups.push({
        id: groupId,
        name: name || `Group ${state.timeline.groups.length + 1}`,
        clipIds,
        created_at: Date.now(),
      });

      state.timeline.clips.forEach((clip: Clip): void => {
        if (clipIds.includes(clip.id)) {
          clip.groupId = groupId;
        }
      });

      // Save to history
      const cloned = cloneTimeline(state.timeline);
      if (cloned) {
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(cloned);
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      }
    }),

  ungroupClips: (groupId: string): void =>
    set((state: WritableDraft<GroupsSliceState>): void => {
      if (!state.timeline || !state.timeline.groups) return;

      state.timeline.groups = state.timeline.groups.filter((g: ClipGroup): boolean => g.id !== groupId);

      state.timeline.clips.forEach((clip: Clip): void => {
        if (clip.groupId === groupId) {
          delete clip.groupId;
        }
      });

      // Save to history
      const cloned = cloneTimeline(state.timeline);
      if (cloned) {
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(cloned);
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      }
    }),

  getGroupClipIds: (groupId: string): string[] => {
    const state = get();
    if (!state.timeline || !state.timeline.groups) return [];

    const group = state.timeline.groups.find((g: ClipGroup): boolean => g.id === groupId);
    return group ? [...group.clipIds] : [];
  },

  isClipGrouped: (clipId: string): boolean => {
    const state = get();
    if (!state.timeline) return false;

    const clip = state.timeline.clips.find((c: Clip): boolean => c.id === clipId);
    return Boolean(clip?.groupId);
  },

  getClipGroupId: (clipId: string): string | null => {
    const state = get();
    if (!state.timeline) return null;

    const clip = state.timeline.clips.find((c: Clip): boolean => c.id === clipId);
    return clip?.groupId || null;
  },
});
