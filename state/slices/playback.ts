/**
 * Playback Slice - Playback and Timeline State
 *
 * Handles playback-related state including:
 * - Current time / playhead position
 * - Timecode display mode
 * - Auto-scroll settings
 */

export interface PlaybackSlice {
  /** Playhead position in seconds */
  currentTime: number;
  /** Timecode display mode (duration or timecode) */
  timecodeDisplayMode: 'duration' | 'timecode';
  /** Auto-scroll timeline during playback to follow playhead */
  autoScrollEnabled: boolean;
  /** Set playhead position */
  setCurrentTime: (time: number) => void;
  /** Toggle timecode display mode */
  toggleTimecodeDisplayMode: () => void;
  /** Toggle auto-scroll during playback */
  toggleAutoScroll: () => void;
}

export const createPlaybackSlice = (set: any) => ({
  currentTime: 0,
  timecodeDisplayMode: 'duration',
  autoScrollEnabled: true,

  setCurrentTime: (time): void =>
    set((state): void => {
      state.currentTime = time;
    }),

  toggleTimecodeDisplayMode: (): void =>
    set((state): void => {
      state.timecodeDisplayMode =
        state.timecodeDisplayMode === 'duration' ? 'timecode' : 'duration';
    }),

  toggleAutoScroll: (): void =>
    set((state): void => {
      state.autoScrollEnabled = !state.autoScrollEnabled;
    }),
});
