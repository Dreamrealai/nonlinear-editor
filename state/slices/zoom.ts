/**
 * Zoom Slice - Zoom and Viewport Control Operations
 *
 * Handles zoom-related operations including:
 * - Setting zoom level
 * - Zoom presets
 * - Fit to timeline/selection
 * - Snap controls
 */

import type { Timeline, Clip } from '@/types/timeline';
import { ZOOM_CONSTANTS } from '@/lib/constants';

const { MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM } = ZOOM_CONSTANTS;

export interface ZoomSlice {
  /** Timeline zoom level in pixels per second */
  zoom: number;
  /** Enable/disable snapping to grid and clip edges */
  snapEnabled: boolean;
  /** Snap grid interval in seconds */
  snapGridInterval: number;
  /** Set zoom level (clamped to 10-200 px/s) */
  setZoom: (zoom: number) => void;
  /** Toggle snap to grid and clip edges */
  toggleSnap: () => void;
  /** Set snap grid interval in seconds */
  setSnapGridInterval: (interval: number) => void;
  /** Calculate zoom to fit entire timeline in viewport */
  calculateFitToTimelineZoom: (viewportWidth: number) => number;
  /** Calculate zoom to fit selected clips in viewport */
  calculateFitToSelectionZoom: (viewportWidth: number) => number;
  /** Apply zoom to fit entire timeline */
  fitToTimeline: (viewportWidth: number) => void;
  /** Apply zoom to fit selected clips */
  fitToSelection: (viewportWidth: number) => void;
  /** Set zoom to specific preset percentage */
  setZoomPreset: (preset: 25 | 50 | 100 | 200 | 400) => void;
}

export interface ZoomSliceState {
  timeline: Timeline | null;
  zoom: number;
  snapEnabled: boolean;
  snapGridInterval: number;
  selectedClipIds: Set<string>;
}

export const createZoomSlice = (
  set: (fn: (state: ZoomSliceState) => void) => void,
  get: () => ZoomSliceState
): ZoomSlice => ({
  zoom: DEFAULT_ZOOM,
  snapEnabled: true,
  snapGridInterval: 0.1,

  setZoom: (zoom: number): void =>
    set((state: ZoomSliceState): void => {
      state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    }),

  toggleSnap: (): void =>
    set((state: ZoomSliceState): void => {
      state.snapEnabled = !state.snapEnabled;
    }),

  setSnapGridInterval: (interval: number): void =>
    set((state: ZoomSliceState): void => {
      state.snapGridInterval = Math.max(0.01, Math.min(10, interval));
    }),

  calculateFitToTimelineZoom: (viewportWidth: number): number => {
    const state = get();
    if (!state.timeline || state.timeline.clips.length === 0 || viewportWidth <= 0) {
      return DEFAULT_ZOOM;
    }

    const timelineDuration = Math.max(
      ...state.timeline.clips.map(
        (clip: Clip): number => clip.timelinePosition + (clip.end - clip.start)
      )
    );

    const padding = 0.1;
    const effectiveWidth = viewportWidth * (1 - 2 * padding);
    const calculatedZoom = effectiveWidth / timelineDuration;

    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, calculatedZoom));
  },

  calculateFitToSelectionZoom: (viewportWidth: number): number => {
    const state = get();
    if (!state.timeline || state.selectedClipIds.size === 0 || viewportWidth <= 0) {
      return state.zoom;
    }

    const selectedClips = state.timeline.clips.filter((clip: Clip): boolean =>
      state.selectedClipIds.has(clip.id)
    );

    if (selectedClips.length === 0) {
      return state.zoom;
    }

    const minPosition = Math.min(
      ...selectedClips.map((clip: Clip): number => clip.timelinePosition)
    );
    const maxPosition = Math.max(
      ...selectedClips.map((clip: Clip): number => clip.timelinePosition + (clip.end - clip.start))
    );

    const selectionDuration = maxPosition - minPosition;

    const padding = 0.1;
    const effectiveWidth = viewportWidth * (1 - 2 * padding);
    const calculatedZoom = effectiveWidth / selectionDuration;

    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, calculatedZoom));
  },

  fitToTimeline(viewportWidth: number): void {
    const state = get();
    const methods = state as unknown as ZoomSlice & ZoomSliceState;
    const newZoom = methods.calculateFitToTimelineZoom(viewportWidth);
    set((s: ZoomSliceState): void => {
      s.zoom = newZoom;
    });
  },

  fitToSelection(viewportWidth: number): void {
    const state = get();
    const methods = state as unknown as ZoomSlice & ZoomSliceState;
    const newZoom = methods.calculateFitToSelectionZoom(viewportWidth);
    set((s: ZoomSliceState): void => {
      s.zoom = newZoom;
    });
  },

  setZoomPreset: (preset: 25 | 50 | 100 | 200 | 400): void => {
    const zoomMap = {
      25: DEFAULT_ZOOM * 0.25,
      50: DEFAULT_ZOOM * 0.5,
      100: DEFAULT_ZOOM,
      200: DEFAULT_ZOOM * 2,
      400: DEFAULT_ZOOM * 4,
    };
    const newZoom = zoomMap[preset];
    set((state: ZoomSliceState): void => {
      state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    });
  },
});
