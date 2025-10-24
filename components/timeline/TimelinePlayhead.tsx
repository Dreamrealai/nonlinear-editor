'use client';

import React from 'react';

type TimelinePlayheadProps = {
  currentTime: number;
  zoom: number;
  onMouseDown: (e: React.MouseEvent) => void;
};

/**
 * Timeline playhead component
 * Renders the red playhead indicator with draggable handle
 */
export const TimelinePlayhead = React.memo<TimelinePlayheadProps>(function TimelinePlayhead({
  currentTime,
  zoom,
  onMouseDown,
}) {
  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 cursor-ew-resize z-20 pointer-events-none"
      style={{ left: currentTime * zoom }}
    >
      <div
        className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full pointer-events-auto cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
      />
    </div>
  );
});
