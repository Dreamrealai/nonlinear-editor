/**
 * Playback Store - Playback Controls and UI State
 *
 * Manages playback-related state including current time and zoom level.
 * This store is separate from timeline data to avoid unnecessary re-renders.
 *
 * Features:
 * - Playhead position management
 * - Zoom level with clamping
 * - Playback state (playing/paused)
 *
 * Architecture:
 * - Lightweight store for high-frequency updates
 * - No heavy computations or data structures
 * - Optimized for performance
 */
'use client';

import { create } from 'zustand';
import { ZOOM_CONSTANTS } from '@/lib/constants';

const { MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM } = ZOOM_CONSTANTS;

type PlaybackStore = {
  // ===== State =====
  currentTime: number;
  zoom: number;
  isPlaying: boolean;

  // ===== Actions =====
  setCurrentTime: (time: number) => void;
  setZoom: (zoom: number) => void;
  setIsPlaying: (playing: boolean) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
};

export const usePlaybackStore = create<PlaybackStore>()((set) => ({
  currentTime: 0,
  zoom: DEFAULT_ZOOM,
  isPlaying: false,

  setCurrentTime: (time) =>
    set(() => ({
      currentTime: Math.max(0, time),
    })),

  setZoom: (zoom) =>
    set(() => ({
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)),
    })),

  setIsPlaying: (playing) =>
    set(() => ({
      isPlaying: playing,
    })),

  play: () => set(() => ({ isPlaying: true })),

  pause: () => set(() => ({ isPlaying: false })),

  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
}));
