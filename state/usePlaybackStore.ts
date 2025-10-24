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

export const usePlaybackStore = create<PlaybackStore>()((set): { currentTime: number; zoom: 50; isPlaying: false; setCurrentTime: (time: number) => void; setZoom: (zoom: number) => void; setIsPlaying: (playing: boolean) => void; play: () => void; pause: () => void; togglePlayPause: () => void; } => ({
  currentTime: 0,
  zoom: DEFAULT_ZOOM,
  isPlaying: false,

  setCurrentTime: (time): void =>
    set((): { currentTime: number; } => ({
      currentTime: Math.max(0, time),
    })),

  setZoom: (zoom): void =>
    set((): { zoom: number; } => ({
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)),
    })),

  setIsPlaying: (playing): void =>
    set((): { isPlaying: boolean; } => ({
      isPlaying: playing,
    })),

  play: (): void => set((): { isPlaying: true; } => ({ isPlaying: true })),

  pause: (): void => set((): { isPlaying: false; } => ({ isPlaying: false })),

  togglePlayPause: (): void => set((state): { isPlaying: boolean; } => ({ isPlaying: !state.isPlaying })),
}));
