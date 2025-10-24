/**
 * PlaybackControls Component
 *
 * Provides video player controls including:
 * - Progress bar with seek functionality
 * - Play/pause button
 * - Time display (current/total)
 * - Fullscreen toggle
 * - Auto-hide on inactivity
 *
 * Extracted from PreviewPlayer to promote component reusability.
 */
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { clamp, formatTimecode } from '@/lib/utils/videoUtils';

export interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  isFullscreen: boolean;
  hasClips: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onToggleFullscreen: () => void;
}

/**
 * PlaybackControls Component
 *
 * Renders video player controls with auto-hide functionality.
 * Handles seeking via progress bar click/drag.
 */
export function PlaybackControls({
  isPlaying,
  currentTime,
  totalDuration,
  isFullscreen,
  hasClips,
  onPlayPause,
  onSeek,
  onToggleFullscreen,
}: PlaybackControlsProps) {
  const [showControls, setShowControls] = useState(true);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after inactivity
  const resetHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    setShowControls(true);

    // Only auto-hide if playing
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000); // Hide after 3 seconds of inactivity
    }
  }, [isPlaying]);

  // Calculate time from mouse position on progress bar
  const getTimeFromMouseEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!progressBarRef.current) return 0;

      const rect = progressBarRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const percentage = clamp(mouseX / rect.width, 0, 1);
      return percentage * totalDuration;
    },
    [totalDuration]
  );

  // Handle seeking by clicking or dragging the progress bar
  const handleProgressBarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingSlider(true);

      const newTime = getTimeFromMouseEvent(e);
      onSeek(newTime);
    },
    [getTimeFromMouseEvent, onSeek]
  );

  // Handle mouse move and mouse up for slider dragging
  useEffect(() => {
    if (!isDraggingSlider) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newTime = getTimeFromMouseEvent(e);
      onSeek(newTime);
    };

    const handleMouseUp = () => {
      setIsDraggingSlider(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSlider, getTimeFromMouseEvent, onSeek]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  // Reset timeout when playing state changes
  useEffect(() => {
    resetHideControlsTimeout();
  }, [isPlaying, resetHideControlsTimeout]);

  const progress = totalDuration > 0 ? clamp(currentTime / totalDuration, 0, 1) : 0;
  const formattedCurrent = formatTimecode(currentTime);
  const formattedTotal = formatTimecode(totalDuration);

  return (
    <div
      onMouseMove={resetHideControlsTimeout}
      onMouseEnter={resetHideControlsTimeout}
      className="absolute inset-0 pointer-events-none"
    >
      {/* Overlay Controls - Auto-hide on play */}
      {showControls && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 transition-opacity duration-300 z-[1050] pointer-events-auto">
          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="absolute top-4 right-4 rounded-full bg-black/50 hover:bg-black/70 p-2 text-white transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
            title={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
          >
            {isFullscreen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                />
              </svg>
            )}
          </button>

          {/* Bottom Controls Container */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-2">
            {/* Progress Bar */}
            <div className="mb-2">
              <div
                ref={progressBarRef}
                className="h-1.5 w-full rounded-full bg-white/30 backdrop-blur-sm cursor-pointer hover:h-2 transition-all group"
                onMouseDown={handleProgressBarMouseDown}
                role="slider"
                aria-label="Video progress"
                aria-valuemin={0}
                aria-valuemax={totalDuration}
                aria-valuenow={currentTime}
                tabIndex={0}
              >
                <div
                  className="h-full rounded-full bg-white transition-all duration-200 relative"
                  style={{ width: `${progress * 100}%` }}
                >
                  {/* Draggable thumb */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                </div>
              </div>
            </div>

            {/* Play/Pause Button and Time Display */}
            <div className="flex items-center justify-center gap-3">
              {/* Small Play/Pause Button */}
              <button
                type="button"
                onClick={onPlayPause}
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
                className="flex items-center justify-center rounded-full bg-white/90 hover:bg-white hover:scale-110 p-1.5 text-black transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 shadow-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                disabled={!hasClips}
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? (
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Time Display */}
              <div
                className="flex items-center gap-2 text-xs font-mono font-semibold text-white drop-shadow-lg"
                role="timer"
                aria-live="off"
                aria-label={`Video time: ${formattedCurrent} of ${formattedTotal}`}
              >
                <span aria-label="Current time">{formattedCurrent}</span>
                <span className="text-white/60" aria-hidden="true">
                  /
                </span>
                <span aria-label="Total duration">{formattedTotal}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show controls button when hidden */}
      {!showControls && (
        <button
          type="button"
          onClick={() => setShowControls(true)}
          aria-label="Show video controls"
          className="absolute bottom-4 right-4 rounded-full bg-black/50 hover:bg-black/70 p-3 text-white transition-all backdrop-blur-sm opacity-0 hover:opacity-100 focus:opacity-100 pointer-events-auto focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
          title="Show controls"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
