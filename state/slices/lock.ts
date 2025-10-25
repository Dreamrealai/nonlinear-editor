/**
 * Lock Slice - Clip Locking Operations
 *
 * Handles clip locking operations including:
 * - Locking/unlocking individual clips
 * - Locking/unlocking selected clips
 */
import type { Timeline } from '@/types/timeline';
import { timelineAnnouncements } from '@/lib/utils/screenReaderAnnouncer';
import { getClipFileName } from '@/lib/utils/timelineUtils';

export interface LockSlice {
  /** Lock a clip to prevent editing/moving */
  lockClip: (id: string) => void;
  /** Unlock a clip to allow editing/moving */
  unlockClip: (id: string) => void;
  /** Toggle lock state for a clip */
  toggleClipLock: (id: string) => void;
  /** Lock all selected clips */
  lockSelectedClips: () => void;
  /** Unlock all selected clips */
  unlockSelectedClips: () => void;
}

export interface LockSliceState {
  timeline: Timeline | null;
  selectedClipIds: Set<string>;
}

export const createLockSlice = (set: (fn: (state: LockSliceState) => void) => void): LockSlice => ({
  lockClip: (id: string): void =>
    set((state: LockSliceState): void => {
      const clip = state.timeline?.clips.find((c): boolean => c.id === id);
      if (clip) {
        clip.locked = true;
      }
    }),

  unlockClip: (id: string): void =>
    set((state: LockSliceState): void => {
      const clip = state.timeline?.clips.find((c): boolean => c.id === id);
      if (clip) {
        clip.locked = false;
      }
    }),

  toggleClipLock: (id: string): void =>
    set((state: LockSliceState): void => {
      const clip = state.timeline?.clips.find((c): boolean => c.id === id);
      if (clip) {
        clip.locked = !clip.locked;

        // Announce to screen readers
        if (typeof window !== 'undefined') {
          if (clip.locked) {
            timelineAnnouncements.clipLocked(getClipFileName(clip));
          } else {
            timelineAnnouncements.clipUnlocked(getClipFileName(clip));
          }
        }
      }
    }),

  lockSelectedClips: (): void =>
    set((state: LockSliceState): void => {
      if (!state.timeline) return;
      state.selectedClipIds.forEach((clipId: string): void => {
        const clip = state.timeline!.clips.find((c): boolean => c.id === clipId);
        if (clip) {
          clip.locked = true;
        }
      });
    }),

  unlockSelectedClips: (): void =>
    set((state: LockSliceState): void => {
      if (!state.timeline) return;
      state.selectedClipIds.forEach((clipId: string): void => {
        const clip = state.timeline!.clips.find((c): boolean => c.id === clipId);
        if (clip) {
          clip.locked = false;
        }
      });
    }),
});
