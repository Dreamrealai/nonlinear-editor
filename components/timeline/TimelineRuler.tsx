'use client';

import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';
import React, { useCallback, useRef, useState } from 'react';

const { RULER_HEIGHT } = TIMELINE_CONSTANTS;

type TimelineRulerProps = {
  timelineDuration: number;
  zoom: number;
  currentTime: number;
  onPlayheadMouseDown: (e: React.MouseEvent) => void;
  onRulerClick?: (time: number) => void;
};

/**
 * Timeline ruler component with time markers and playhead
 * Displays time intervals and allows playhead dragging
 * Supports clicking to set playhead position with hover preview
 */
export const TimelineRuler = React.memo<TimelineRulerProps>(function TimelineRuler({
  timelineDuration,
  zoom,
  currentTime,
  onPlayheadMouseDown,
  onRulerClick,
}) {
  const timelineWidth = timelineDuration * zoom;
  const rulerRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  /**
   * Calculate time position from mouse X coordinate
   */
  const calculateTimeFromX = useCallback(
    (clientX: number): number => {
      if (!rulerRef.current) return 0;
      const rect = rulerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const time = Math.max(0, Math.min(x / zoom, timelineDuration));
      return time;
    },
    [zoom, timelineDuration]
  );

  /**
   * Handle click on ruler to set playhead position
   */
  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const time = calculateTimeFromX(e.clientX);
      onRulerClick?.(time);
    },
    [calculateTimeFromX, onRulerClick]
  );

  /**
   * Handle mouse move to show hover preview
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!rulerRef.current) return;
      const time = calculateTimeFromX(e.clientX);
      const rect = rulerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverTime(time);
      setHoverPosition(x);
    },
    [calculateTimeFromX]
  );

  /**
   * Clear hover preview when mouse leaves
   */
  const handleMouseLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  /**
   * Format time for display (seconds with 2 decimal places)
   */
  const formatTime = useCallback((time: number): string => {
    return `${time.toFixed(2)}s`;
  }, []);

  return (
    <>
      {/* Time Ruler */}
      <div
        ref={rulerRef}
        className="sticky top-0 z-10 bg-neutral-100 border-b border-neutral-300 cursor-pointer"
        style={{ height: RULER_HEIGHT }}
        onClick={handleRulerClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="button"
        aria-label="Timeline ruler - click to set playhead position"
        data-testid="timeline-ruler"
      >
        <div className="relative h-full" style={{ width: timelineWidth }}>
          {Array.from({ length: Math.ceil(timelineDuration) + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full border-l border-neutral-300"
              style={{ left: i * zoom }}
            >
              <span className="absolute top-1 left-1 text-[10px] font-mono text-neutral-600">
                {i}s
              </span>
            </div>
          ))}

          {/* Hover preview line and time tooltip */}
          {hoverTime !== null && (
            <>
              {/* Hover line */}
              <div
                className="absolute top-0 bottom-0 w-px bg-blue-400 opacity-50 pointer-events-none"
                style={{ left: hoverPosition }}
              />
              {/* Time tooltip */}
              <div
                className="absolute -top-6 -translate-x-1/2 px-2 py-0.5 bg-neutral-900 text-white text-[10px] font-mono rounded pointer-events-none whitespace-nowrap"
                style={{ left: hoverPosition }}
              >
                {formatTime(hoverTime)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Playhead - rendered separately to overlay everything */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 cursor-ew-resize z-20 pointer-events-none"
        style={{ left: currentTime * zoom }}
      >
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full pointer-events-auto cursor-grab active:cursor-grabbing"
          onMouseDown={onPlayheadMouseDown}
          role="slider"
          tabIndex={0}
          aria-label="Timeline ruler playhead"
          aria-valuenow={Math.round(currentTime * 100)}
          aria-valuemin={0}
          aria-valuemax={10000}
          aria-valuetext={`Current time: ${currentTime.toFixed(2)} seconds`}
        />
      </div>
    </>
  );
});
