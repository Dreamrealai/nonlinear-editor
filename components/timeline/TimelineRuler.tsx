'use client';

import React from 'react';
import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';

const { RULER_HEIGHT } = TIMELINE_CONSTANTS;

type TimelineRulerProps = {
  timelineDuration: number;
  zoom: number;
  currentTime: number;
  onPlayheadMouseDown: (e: React.MouseEvent) => void;
};

/**
 * Timeline ruler component with time markers and playhead
 * Displays time intervals and allows playhead dragging
 */
export const TimelineRuler = React.memo<TimelineRulerProps>(function TimelineRuler({
  timelineDuration,
  zoom,
  currentTime,
  onPlayheadMouseDown,
}) {
  const timelineWidth = timelineDuration * zoom;

  return (
    <>
      {/* Time Ruler */}
      <div
        className="sticky top-0 z-10 bg-neutral-100 border-b border-neutral-300"
        style={{ height: RULER_HEIGHT }}
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
        />
      </div>
    </>
  );
});
