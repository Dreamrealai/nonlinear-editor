'use client';

import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';
import React, { useCallback, useRef, useState, useMemo } from 'react';
import { formatTimeSeconds, formatTimecode } from '@/lib/utils/timeFormatting';

const { RULER_HEIGHT } = TIMELINE_CONSTANTS;

/**
 * Minimum pixel spacing between major labels to prevent overlap
 * Based on typical label width (e.g., "00:05.00" ~60px)
 */
const MIN_LABEL_SPACING_PX = 80;

/**
 * Calculate adaptive label interval based on zoom level
 * Returns interval in seconds that maintains readable spacing
 *
 * Algorithm:
 * - Calculates minimum time interval needed to achieve MIN_LABEL_SPACING_PX
 * - Rounds to "nice" intervals (0.1, 0.5, 1, 5, 10, 30, 60, 300, 600 seconds)
 * - Returns appropriate formatting style for the interval
 *
 * @param zoom - Current zoom level in pixels per second
 * @returns Object with interval (seconds) and format type
 */
function calculateLabelInterval(zoom: number): {
  majorInterval: number;
  minorInterval: number;
  formatType: 'frames' | 'seconds' | 'timecode';
} {
  // Calculate minimum interval needed to maintain label spacing
  const minInterval = MIN_LABEL_SPACING_PX / zoom;

  // Define "nice" intervals in seconds
  // These are human-friendly intervals that make sense for video editing
  const niceIntervals = [
    0.1, // Frame-level (3 frames at 30fps)
    0.5, // Half second
    1, // 1 second
    2, // 2 seconds
    5, // 5 seconds
    10, // 10 seconds
    15, // 15 seconds
    30, // 30 seconds
    60, // 1 minute
    120, // 2 minutes
    300, // 5 minutes
    600, // 10 minutes
    900, // 15 minutes
    1800, // 30 minutes
  ];

  // Find the smallest nice interval that's >= minInterval
  const majorInterval = niceIntervals.find((interval): boolean => interval >= minInterval) || 1800;

  // Calculate minor interval (for tick marks between labels)
  const minorInterval = majorInterval / 5;

  // Determine format type based on interval
  let formatType: 'frames' | 'seconds' | 'timecode';
  if (majorInterval <= 1) {
    formatType = 'seconds'; // For sub-second intervals, show decimal seconds
  } else if (majorInterval < 60) {
    formatType = 'timecode'; // For intervals < 1 minute, show MM:SS.CS
  } else {
    formatType = 'timecode'; // For longer intervals, show HH:MM:SS
  }

  return { majorInterval, minorInterval, formatType };
}

/**
 * Generate timeline markers for given duration and zoom
 * Creates both major (labeled) and minor (tick marks only) markers
 */
function generateMarkers(
  duration: number,
  zoom: number
): Array<{ time: number; type: 'major' | 'minor'; label?: string }> {
  const { majorInterval, minorInterval, formatType } = calculateLabelInterval(zoom);
  const markers: Array<{ time: number; type: 'major' | 'minor'; label?: string }> = [];

  // Calculate how many markers we need
  const maxTime = Math.ceil(duration / majorInterval) * majorInterval + majorInterval;

  // Use integer counting to avoid floating point accumulation errors
  // Calculate total number of minor intervals needed
  const totalMinorIntervals = Math.ceil(maxTime / minorInterval);
  const minorsPerMajor = Math.round(majorInterval / minorInterval);

  // Generate markers using integer index to avoid floating point errors
  for (let i = 0; i <= totalMinorIntervals; i++) {
    const time = i * minorInterval;

    // Check if this is a major marker (every nth minor interval)
    const isMajor = i % minorsPerMajor === 0;

    if (isMajor) {
      // Major marker with label
      let label: string;
      if (formatType === 'seconds') {
        // Show decimal seconds for very zoomed in views
        label = `${time.toFixed(1)}s`;
      } else if (formatType === 'timecode') {
        // Show timecode for normal views
        label = formatTimecode(time);
      } else {
        // Frames view (not currently used, but kept for extensibility)
        label = formatTimeSeconds(time, 1);
      }
      markers.push({ time, type: 'major', label });
    } else {
      // Minor marker (tick mark only)
      markers.push({ time, type: 'minor' });
    }
  }

  return markers;
}

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
 * Features adaptive label density based on zoom level
 */
export const TimelineRuler = React.memo<TimelineRulerProps>(function TimelineRuler({
  timelineDuration,
  zoom,
  currentTime,
  onPlayheadMouseDown,
  onRulerClick,
}): React.ReactElement {
  const timelineWidth = timelineDuration * zoom;
  const rulerRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  // Memoize markers calculation to avoid recalculating on every render
  // Only recalculates when timelineDuration or zoom changes
  const markers = useMemo(
    (): { time: number; type: 'major' | 'minor'; label?: string }[] =>
      generateMarkers(timelineDuration, zoom),
    [timelineDuration, zoom]
  );

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
    (e: React.MouseEvent): void => {
      const time = calculateTimeFromX(e.clientX);
      onRulerClick?.(time);
    },
    [calculateTimeFromX, onRulerClick]
  );

  /**
   * Handle mouse move to show hover preview
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent): void => {
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
  const handleMouseLeave = useCallback((): void => {
    setHoverTime(null);
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
        tabIndex={0}
        aria-label="Timeline ruler - click to set playhead position"
        data-testid="timeline-ruler"
      >
        <div className="relative h-full" style={{ width: timelineWidth }}>
          {/* Adaptive time markers with major (labeled) and minor (tick) marks */}
          {/*
            Key strategy: Use index as primary key since markers are generated in order
            and represent fixed positions in the timeline. The time value alone could
            theoretically have duplicates due to floating point precision.
          */}
          {markers.map((marker, index): React.ReactElement => {
            const position = marker.time * zoom;
            const isMajor = marker.type === 'major';

            return (
              <div
                key={`ruler-marker-${index}`}
                className={`absolute top-0 border-l ${
                  isMajor ? 'h-full border-neutral-400' : 'h-2 border-neutral-300'
                }`}
                style={{ left: position }}
              >
                {isMajor && marker.label && (
                  <span className="absolute top-1 left-1 text-[10px] font-mono text-neutral-700 whitespace-nowrap select-none">
                    {marker.label}
                  </span>
                )}
              </div>
            );
          })}

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
                {formatTimeSeconds(hoverTime)}
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
