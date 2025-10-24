/**
 * useRubberBandSelection Hook
 *
 * Manages rubber-band (drag-to-select) selection for timeline clips
 *
 * Features:
 * - Click and drag on empty timeline area to create selection rectangle
 * - Visual feedback with dashed border rectangle
 * - Selects all clips intersecting the rectangle
 * - Supports modifier keys (Shift for add-to-selection, Cmd/Ctrl for toggle)
 * - Prevents selection when dragging clips or playhead
 */
'use client';

import { useState, useCallback, useEffect, RefObject } from 'react';

export type SelectionRect = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
} | null;

type UseRubberBandSelectionProps = {
  containerRef: RefObject<HTMLDivElement>;
  enabled: boolean;
  zoom: number;
  trackHeight: number;
  onSelectClipsInRange: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    zoom: number,
    trackHeight: number,
    multi: boolean
  ) => void;
};

export function useRubberBandSelection({
  containerRef,
  enabled,
  zoom,
  trackHeight,
  onSelectClipsInRange,
}: UseRubberBandSelectionProps): { selectionRect: SelectionRect; isSelecting: boolean; } {
  const [selectionRect, setSelectionRect] = useState<SelectionRect>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  // Handle mouse down on timeline background (not on clips)
  const handleMouseDown = useCallback(
    (e: MouseEvent): void => {
      if (!enabled || !containerRef.current) return;

      // Only start selection if clicking on the timeline background
      // Check if target is the container itself or a track background
      const target = e.target as HTMLElement;
      const isTimelineBackground =
        target === containerRef.current ||
        target.classList.contains('timeline-track-background') ||
        target.getAttribute('role') === 'button';

      if (!isTimelineBackground) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setStartPoint({ x, y });
      setIsSelecting(true);
      setSelectionRect({
        startX: x,
        startY: y,
        endX: x,
        endY: y,
      });

      e.preventDefault();
    },
    [enabled, containerRef]
  );

  // Handle mouse move during selection
  const handleMouseMove = useCallback(
    (e: MouseEvent): void => {
      if (!isSelecting || !startPoint || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setSelectionRect({
        startX: startPoint.x,
        startY: startPoint.y,
        endX: x,
        endY: y,
      });
    },
    [isSelecting, startPoint, containerRef]
  );

  // Handle mouse up to complete selection
  const handleMouseUp = useCallback(
    (e: MouseEvent): void => {
      if (!isSelecting || !selectionRect) {
        setIsSelecting(false);
        setStartPoint(null);
        setSelectionRect(null);
        return;
      }

      // Calculate the selection bounds
      const { startX, startY, endX, endY } = selectionRect;

      // Only trigger selection if the rectangle has a meaningful size (> 5px)
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      if (width > 5 || height > 5) {
        // Check for modifier keys
        const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;

        // Call the selection handler
        onSelectClipsInRange(startX, startY, endX, endY, zoom, trackHeight, isMulti);
      }

      // Reset selection state
      setIsSelecting(false);
      setStartPoint(null);
      setSelectionRect(null);
    },
    [isSelecting, selectionRect, zoom, trackHeight, onSelectClipsInRange]
  );

  // Set up event listeners
  useEffect((): (() => void) | undefined => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return (): void => {
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled, containerRef, handleMouseDown, handleMouseMove, handleMouseUp]);

  return {
    selectionRect,
    isSelecting,
  };
}
