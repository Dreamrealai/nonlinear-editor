/**
 * TimelineSnapGuides Component
 *
 * Renders visual feedback for snap-to-grid behavior during clip dragging.
 * - Shows vertical guidelines at snap candidate positions
 * - Highlights the active snap point when snapping occurs
 * - Displays distance tooltip showing how close to snap threshold
 *
 * Performance optimized with minimal re-renders and CSS animations
 */
'use client';

import React from 'react';
import type { SnapInfo } from '@/lib/hooks/useTimelineDraggingWithSnap';
import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';

const { SNAP_THRESHOLD_SECONDS: SNAP_THRESHOLD } = TIMELINE_CONSTANTS;

type TimelineSnapGuidesProps = {
  snapInfo: SnapInfo | null;
  zoom: number;
  timelineHeight: number;
};

/**
 * Renders snap guidelines and visual feedback during clip dragging
 */
export const TimelineSnapGuides = React.memo<TimelineSnapGuidesProps>(function TimelineSnapGuides({
  snapInfo,
  zoom,
  timelineHeight,
}) {
  if (!snapInfo) {
    return null;
  }

  const { snapPosition, isSnapping, snapCandidates } = snapInfo;

  // Filter snap candidates to show only nearby ones (within 3 snap thresholds)
  const visibleCandidates = snapCandidates.filter(
    (candidate) => Math.abs(candidate - snapPosition) <= SNAP_THRESHOLD * 3
  );

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Render snap candidate guidelines */}
      {visibleCandidates.map((candidate) => {
        const x = candidate * zoom;
        const isActiveSnap = isSnapping && Math.abs(candidate - snapPosition) < 0.001;

        return (
          <div
            key={candidate}
            className={`absolute top-0 transition-opacity duration-150 ${
              isActiveSnap
                ? 'border-l-2 border-yellow-400 opacity-100 shadow-lg'
                : 'border-l border-dashed border-blue-300 opacity-40'
            }`}
            style={{
              left: x,
              height: timelineHeight,
              width: 0,
            }}
          >
            {/* Active snap indicator with flash animation */}
            {isActiveSnap && (
              <>
                {/* Glow effect */}
                <div
                  className="absolute left-0 top-0 -translate-x-1/2 bg-yellow-400/30 blur-sm animate-pulse"
                  style={{
                    width: 8,
                    height: timelineHeight,
                  }}
                />
                {/* Snap indicator dot at top */}
                <div
                  className="absolute left-0 top-0 -translate-x-1/2 bg-yellow-400 rounded-full shadow-md animate-bounce"
                  style={{
                    width: 8,
                    height: 8,
                  }}
                />
                {/* Time label */}
                <div
                  className="absolute left-2 top-2 rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-900 shadow-md"
                  style={{
                    whiteSpace: 'nowrap',
                  }}
                >
                  {candidate.toFixed(2)}s
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Snap zone indicator - shows proximity to snap threshold */}
      {isSnapping && (
        <div
          className="absolute top-0 animate-pulse bg-yellow-400/10 transition-all duration-200"
          style={{
            left: (snapPosition - SNAP_THRESHOLD) * zoom,
            width: SNAP_THRESHOLD * 2 * zoom,
            height: timelineHeight,
          }}
        />
      )}
    </div>
  );
});
