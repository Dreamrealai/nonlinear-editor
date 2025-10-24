'use client';

import React, { useState } from 'react';

type TimelinePlayheadProps = {
  currentTime: number;
  zoom: number;
  onMouseDown: (e: React.MouseEvent) => void;
};

/**
 * Format seconds to MM:SS.ms
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Timeline playhead component
 * Renders the red playhead indicator with draggable handle and time tooltip
 */
export const TimelinePlayhead = React.memo<TimelinePlayheadProps>(function TimelinePlayhead({
  currentTime,
  zoom,
  onMouseDown,
}): React.ReactElement {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 cursor-ew-resize z-40 pointer-events-none"
      style={{ left: currentTime * zoom }}
    >
      <div
        className="absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-7 bg-red-500 rounded-full pointer-events-auto cursor-grab active:cursor-grabbing hover:w-8 hover:h-8 transition-all"
        onMouseDown={onMouseDown}
        onMouseEnter={(): void => setIsHovering(true)}
        onMouseLeave={(): void => setIsHovering(false)}
        role="slider"
        tabIndex={0}
        aria-label="Timeline playhead"
        aria-valuenow={Math.round(currentTime * 100)}
        aria-valuemin={0}
        aria-valuemax={10000}
        aria-valuetext={`Current time: ${currentTime.toFixed(2)} seconds`}
      />

      {/* Tooltip */}
      {isHovering && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-neutral-900 dark:bg-neutral-700 text-white text-xs font-medium rounded-lg shadow-lg whitespace-nowrap pointer-events-none z-50 animate-in fade-in duration-150">
          {formatTime(currentTime)}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-900 dark:bg-neutral-700 rotate-45" />
        </div>
      )}
    </div>
  );
});
