/**
 * Markers Slice - Timeline Marker Operations
 *
 * Handles marker-related operations including:
 * - Adding, updating, removing markers
 * - Jumping to markers
 */
import type { Marker, Timeline } from '@/types/timeline';

export interface MarkersSlice {
  /** Add a timeline marker */
  addMarker: (marker: Marker) => void;
  /** Remove a marker */
  removeMarker: (id: string) => void;
  /** Update marker properties */
  updateMarker: (id: string, patch: Partial<Marker>) => void;
  /** Jump playhead to marker */
  jumpToMarker: (markerId: string) => void;
}

export interface MarkersSliceState {
  timeline: Timeline | null;
  currentTime: number;
}

export const createMarkersSlice = (
  set: (fn: (state: MarkersSliceState) => void) => void
): MarkersSlice => ({
  addMarker: (marker: Marker): void =>
    set((state: MarkersSliceState): void => {
      if (!state.timeline) return;
      if (!state.timeline.markers) {
        state.timeline.markers = [];
      }
      state.timeline.markers.push(marker);
    }),

  removeMarker: (id: string): void =>
    set((state: MarkersSliceState): void => {
      if (!state.timeline?.markers) return;
      state.timeline.markers = state.timeline.markers.filter((m): boolean => m.id !== id);
    }),

  updateMarker: (id: string, patch: Partial<Marker>): void =>
    set((state: MarkersSliceState): void => {
      const marker = state.timeline?.markers?.find((m): boolean => m.id === id);
      if (marker) {
        Object.assign(marker, patch);
      }
    }),

  jumpToMarker: (markerId: string): void =>
    set((state: MarkersSliceState): void => {
      const marker = state.timeline?.markers?.find((m): boolean => m.id === markerId);
      if (marker) {
        state.currentTime = marker.time;
      }
    }),
});
