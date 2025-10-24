/**
 * TimelineTrimOverlay Component
 *
 * Provides visual feedback during clip trimming operations:
 * - Displays new clip duration during trim
 * - Shows before/after duration comparison
 * - Positioned near the trim handle being dragged
 * - Real-time preview of trim result
 */
'use client';

import React from 'react';

export type TrimPreviewInfo = {
  clipId: string;
  handle: 'left' | 'right';
  originalDuration: number;
  newDuration: number;
  originalStart: number;
  originalEnd: number;
  newStart: number;
  newEnd: number;
  position: {
    x: number;
    y: number;
  };
};

type TimelineTrimOverlayProps = {
  trimInfo: TrimPreviewInfo | null;
};

/**
 * Renders trim overlay with duration feedback
 */
export const TimelineTrimOverlay = React.memo<TimelineTrimOverlayProps>(
  function TimelineTrimOverlay({ trimInfo }): React.ReactElement | null {
    if (!trimInfo) {
      return null;
    }

    const { handle, originalDuration, newDuration, newStart, newEnd, position } =
      trimInfo;

    // Calculate the change in duration
    const durationChange = newDuration - originalDuration;
    const isIncreasing = durationChange > 0;
    const changeIcon = isIncreasing ? '▲' : '▼';
    const changeColor = isIncreasing ? 'text-green-400' : 'text-red-400';

    // Calculate trim boundaries display
    const trimBoundaryLabel =
      handle === 'left' ? `Start: ${newStart.toFixed(2)}s` : `End: ${newEnd.toFixed(2)}s`;

    return (
      <div
        className="pointer-events-none absolute z-50"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -120%)',
        }}
      >
        {/* Main overlay card */}
        <div
          className={`flex flex-col gap-1 rounded-lg border-2 border-yellow-400 bg-gray-900/95 px-3 py-2 shadow-xl backdrop-blur-sm`}
        >
          {/* Trim handle indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full ${handle === 'left' ? 'bg-blue-400' : 'bg-purple-400'}`}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {handle === 'left' ? 'Trim Start' : 'Trim End'}
            </span>
          </div>

          {/* Duration comparison */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500">Original</span>
              <span className="text-sm font-bold text-white">{originalDuration.toFixed(2)}s</span>
            </div>

            <div className="flex h-full items-center">
              <svg
                className="h-4 w-4 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500">New</span>
              <span className="text-sm font-bold text-yellow-400">{newDuration.toFixed(2)}s</span>
            </div>

            {/* Change indicator */}
            <div className={`flex items-center gap-0.5 ${changeColor}`}>
              <span className="text-xs">{changeIcon}</span>
              <span className="text-xs font-semibold">{Math.abs(durationChange).toFixed(2)}s</span>
            </div>
          </div>

          {/* Trim boundary display */}
          <div className="border-t border-gray-700 pt-1">
            <span className="text-[10px] text-gray-400">{trimBoundaryLabel}</span>
          </div>
        </div>

        {/* Arrow pointing to trim handle */}
        <div
          className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2"
          style={{
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid rgb(250, 204, 21)', // yellow-400
          }}
        />
      </div>
    );
  }
);
