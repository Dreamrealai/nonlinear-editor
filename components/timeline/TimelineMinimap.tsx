/**
 * TimelineMinimap Component
 *
 * Provides a bird's-eye view of the entire timeline with a viewport indicator.
 * Allows users to quickly navigate long timelines by clicking or dragging the viewport.
 *
 * Features:
 * - Shows all clips as colored blocks
 * - Displays current viewport position and size
 * - Click to jump to position
 * - Drag viewport to pan timeline
 */
'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { Clip } from '@/types/timeline';

interface TimelineMinimapProps {
  /** All clips in the timeline */
  clips: Clip[];
  /** Total timeline duration in seconds */
  timelineDuration: number;
  /** Current scroll position in pixels */
  scrollLeft: number;
  /** Viewport width in pixels */
  viewportWidth: number;
  /** Current zoom level (pixels per second) */
  zoom: number;
  /** Number of tracks */
  numTracks: number;
  /** Callback when user clicks or drags viewport */
  onSeek: (time: number) => void;
  /** Callback when user drags viewport to pan */
  onPan: (scrollLeft: number) => void;
}

const MINIMAP_HEIGHT = 60;
const MINIMAP_PADDING = 4;

/**
 * TimelineMinimap Component
 *
 * Renders a minimap of the entire timeline showing all clips
 * and the current viewport window.
 */
export function TimelineMinimap({
  clips,
  timelineDuration,
  scrollLeft,
  viewportWidth,
  zoom,
  numTracks,
  onSeek,
  onPan,
}: TimelineMinimapProps): React.JSX.Element {
  const minimapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [minimapWidth, setMinimapWidth] = useState(0);

  // Update minimap width on resize
  useEffect((): (() => void) | undefined => {
    if (!minimapRef.current) return;

    const observer = new ResizeObserver((entries): void => {
      for (const entry of entries) {
        setMinimapWidth(entry.contentRect.width);
      }
    });

    observer.observe(minimapRef.current);
    return (): void => observer.disconnect();
  }, []);

  // Calculate viewport position and size in minimap coordinates
  const viewportTime = scrollLeft / zoom;
  const viewportDuration = viewportWidth / zoom;
  const minimapViewportLeft = (viewportTime / timelineDuration) * minimapWidth;
  const minimapViewportWidth = Math.max(
    10,
    (viewportDuration / timelineDuration) * minimapWidth
  );

  // Handle click on minimap to jump to position
  const handleMinimapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (!minimapRef.current || isDragging) return;

      const rect = minimapRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickTime = (clickX / minimapWidth) * timelineDuration;

      // Center viewport on clicked position
      const centeredTime = Math.max(0, clickTime - viewportDuration / 2);
      const centeredScrollLeft = centeredTime * zoom;

      onPan(centeredScrollLeft);
      onSeek(clickTime);
    },
    [minimapWidth, timelineDuration, viewportDuration, zoom, onPan, onSeek, isDragging]
  );

  // Handle viewport drag
  const handleViewportMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      e.stopPropagation();
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startScrollLeft = scrollLeft;

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        const deltaX = moveEvent.clientX - startX;
        const deltaScrollLeft = (deltaX / minimapWidth) * (timelineDuration * zoom);
        const newScrollLeft = Math.max(0, startScrollLeft + deltaScrollLeft);

        onPan(newScrollLeft);
      };

      const handleMouseUp = (): void => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [scrollLeft, minimapWidth, timelineDuration, zoom, onPan]
  );

  // Render clips in minimap
  const renderClips = (): JSX.Element[] | null => {
    if (minimapWidth === 0) return null;

    return clips.map((clip): JSX.Element => {
      const clipLeft = (clip.timelinePosition / timelineDuration) * minimapWidth;
      const clipDuration = clip.end - clip.start;
      const clipWidth = Math.max(2, (clipDuration / timelineDuration) * minimapWidth);
      const clipTop =
        MINIMAP_PADDING + (clip.trackIndex / numTracks) * (MINIMAP_HEIGHT - 2 * MINIMAP_PADDING);
      const clipHeight = Math.max(
        2,
        (1 / numTracks) * (MINIMAP_HEIGHT - 2 * MINIMAP_PADDING) - 1
      );

      // Color based on clip type
      const clipColor =
        clip.type === 'video'
          ? 'bg-blue-500'
          : clip.type === 'audio'
            ? 'bg-green-500'
            : 'bg-purple-500';

      return (
        <div
          key={clip.id}
          className={`absolute ${clipColor} opacity-60 rounded-sm`}
          style={{
            left: `${clipLeft}px`,
            top: `${clipTop}px`,
            width: `${clipWidth}px`,
            height: `${clipHeight}px`,
          }}
          title={`${clip.metadata?.filename || 'Clip'} (Track ${clip.trackIndex + 1})`}
        />
      );
    });
  };

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Timeline Overview
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-500">
          {clips.length} {clips.length === 1 ? 'clip' : 'clips'}
        </span>
      </div>

      <div
        ref={minimapRef}
        className="relative cursor-pointer rounded bg-neutral-100 dark:bg-neutral-800"
        style={{ height: MINIMAP_HEIGHT }}
        onClick={handleMinimapClick}
        role="button"
        tabIndex={0}
        aria-label="Timeline minimap - click to navigate"
        onKeyDown={(e): void => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleMinimapClick(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        }}
      >
        {/* Clips */}
        {renderClips()}

        {/* Viewport indicator */}
        <div
          className={`absolute top-0 bottom-0 border-2 border-blue-600 bg-blue-500/20 rounded ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            left: `${minimapViewportLeft}px`,
            width: `${minimapViewportWidth}px`,
          }}
          onMouseDown={handleViewportMouseDown}
          role="slider"
          aria-label="Timeline viewport position"
          aria-valuemin={0}
          aria-valuemax={timelineDuration}
          aria-valuenow={viewportTime}
          tabIndex={0}
        >
          {/* Drag handle indicators */}
          <div className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
          <div className="absolute inset-y-0 right-0 w-1 bg-blue-600" />
        </div>
      </div>

      {/* Time indicators */}
      <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-500">
        <span>0:00</span>
        <span>
          {Math.floor(timelineDuration / 60)}:{String(Math.floor(timelineDuration % 60)).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
