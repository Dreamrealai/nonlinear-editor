/**
 * Timeline Scrolling Hook
 *
 * Provides enhanced scrolling interactions for the timeline:
 * - Mouse wheel zoom (Ctrl/Cmd + wheel)
 * - Space + drag panning
 * - Auto-scroll during playback
 *
 * @module useTimelineScrolling
 */
'use client';

import { useEffect, useCallback, useRef, type RefObject } from 'react';

interface UseTimelineScrollingOptions {
  /** Container element ref */
  containerRef: RefObject<HTMLElement | null>;
  /** Current zoom level in px/s */
  zoom: number;
  /** Set zoom level */
  setZoom: (zoom: number) => void;
  /** Current playhead time in seconds */
  currentTime: number;
  /** Is video currently playing */
  isPlaying: boolean;
  /** Auto-scroll enabled flag */
  autoScrollEnabled: boolean;
  /** Min zoom level */
  minZoom?: number;
  /** Max zoom level */
  maxZoom?: number;
  /** Zoom sensitivity (multiplier per wheel tick) */
  zoomSensitivity?: number;
}

interface UseTimelineScrollingReturn {
  /** Whether space key is currently pressed (for visual feedback) */
  isSpacePressed: boolean;
  /** Whether user is currently panning */
  isPanning: boolean;
}

/**
 * Enhanced timeline scrolling hook with mouse wheel zoom, space+drag panning,
 * and auto-scroll during playback.
 */
export function useTimelineScrolling({
  containerRef,
  zoom,
  setZoom,
  currentTime,
  isPlaying,
  autoScrollEnabled,
  minZoom = 10,
  maxZoom = 500,
  zoomSensitivity = 0.1,
}: UseTimelineScrollingOptions): UseTimelineScrollingReturn {
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, scrollLeft: 0 });
  const lastAutoScrollTimeRef = useRef(0);

  // Mouse wheel zoom handler (zooms to cursor position)
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Only zoom if Ctrl/Cmd is pressed
      if (!(e.ctrlKey || e.metaKey)) return;

      e.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      // Calculate zoom center relative to mouse cursor position
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left; // Mouse position relative to container
      const scrollLeft = container.scrollLeft;

      // Calculate the time position under the cursor before zoom
      const timeUnderCursor = (scrollLeft + mouseX) / zoom;

      // Calculate new zoom level
      const delta = -e.deltaY;
      const zoomFactor = 1 + delta * zoomSensitivity * 0.01;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * zoomFactor));

      // Update zoom
      setZoom(newZoom);

      // Adjust scroll position to keep the time under cursor at the same screen position
      // Schedule scroll adjustment after zoom state updates
      requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;

        // Calculate new pixel position of the time that was under cursor
        const newPixelPosition = timeUnderCursor * newZoom;

        // Calculate new scroll position to keep cursor over the same time
        const newScrollLeft = newPixelPosition - mouseX;
        container.scrollLeft = Math.max(0, newScrollLeft);
      });
    },
    [containerRef, zoom, setZoom, minZoom, maxZoom, zoomSensitivity]
  );

  // Space key press/release handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only activate space panning if not typing in an input
    if (
      e.code === 'Space' &&
      !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
    ) {
      e.preventDefault();
      isSpacePressedRef.current = true;
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      isSpacePressedRef.current = false;
      isPanningRef.current = false;
    }
  }, []);

  // Mouse down handler for space+drag panning
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!isSpacePressedRef.current) return;
      const container = containerRef.current;
      if (!container) return;

      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        scrollLeft: container.scrollLeft,
      };

      // Change cursor to grabbing
      container.style.cursor = 'grabbing';
    },
    [containerRef]
  );

  // Mouse move handler for space+drag panning
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      const container = containerRef.current;
      if (!container) return;

      e.preventDefault();
      const deltaX = e.clientX - panStartRef.current.x;
      container.scrollLeft = panStartRef.current.scrollLeft - deltaX;
    },
    [containerRef]
  );

  // Mouse up handler to stop panning
  const handleMouseUp = useCallback(() => {
    if (!isPanningRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    isPanningRef.current = false;
    container.style.cursor = isSpacePressedRef.current ? 'grab' : '';
  }, [containerRef]);

  // Auto-scroll during playback with requestAnimationFrame throttling
  useEffect(() => {
    if (!isPlaying || !autoScrollEnabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Use requestAnimationFrame for smooth 60fps scrolling
    let rafId: number | null = null;

    const performAutoScroll = () => {
      const now = Date.now();
      // Throttle to ~60fps (16ms) minimum
      if (now - lastAutoScrollTimeRef.current < 16) {
        rafId = requestAnimationFrame(performAutoScroll);
        return;
      }
      lastAutoScrollTimeRef.current = now;

      // Calculate playhead position in pixels
      const playheadX = currentTime * zoom;
      const viewportWidth = container.clientWidth;
      const scrollLeft = container.scrollLeft;
      const scrollRight = scrollLeft + viewportWidth;

      // Auto-scroll if playhead is near the edge or outside viewport
      const edgeThreshold = viewportWidth * 0.2; // 20% from edge

      if (playheadX > scrollRight - edgeThreshold) {
        // Playhead approaching right edge - scroll right
        const targetScrollLeft = playheadX - viewportWidth * 0.3; // Keep playhead at 30% from left
        container.scrollLeft = Math.max(0, targetScrollLeft);
      } else if (playheadX < scrollLeft + edgeThreshold && scrollLeft > 0) {
        // Playhead approaching left edge - scroll left
        const targetScrollLeft = playheadX - viewportWidth * 0.3;
        container.scrollLeft = Math.max(0, targetScrollLeft);
      }
    };

    // Start the auto-scroll loop
    rafId = requestAnimationFrame(performAutoScroll);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [containerRef, currentTime, zoom, isPlaying, autoScrollEnabled]);

  // Setup event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Mouse wheel zoom
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Space key handlers (on window for global capture)
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Mouse handlers for panning (on window to capture outside container)
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    containerRef,
    handleWheel,
    handleKeyDown,
    handleKeyUp,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  ]);

  // Update cursor when space key state changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isSpacePressedRef.current && !isPanningRef.current) {
      container.style.cursor = 'grab';
    } else if (!isPanningRef.current) {
      container.style.cursor = '';
    }
  }, [containerRef]);

  return {
    isSpacePressed: isSpacePressedRef.current,
    isPanning: isPanningRef.current,
  };
}
