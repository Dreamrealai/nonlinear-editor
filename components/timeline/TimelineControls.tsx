'use client';

import { formatTime } from '@/lib/utils/timelineUtils';
import React from 'react';

type TimelineControlsProps = {
  zoom: number;
  currentTime: number;
  timelineDuration: number;
  canUndo: boolean;
  canRedo: boolean;
  clipAtPlayhead: boolean;
  sceneDetectPending?: boolean;
  upscaleVideoPending?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSplitAtPlayhead: () => void;
  onDetectScenes?: () => void;
  onAddText?: () => void;
  onAddTransition?: () => void;
  onUpscaleVideo?: () => void;
};

/**
 * Timeline controls component
 * Renders all timeline control buttons and zoom controls
 */
export const TimelineControls = React.memo<TimelineControlsProps>(function TimelineControls({
  zoom,
  currentTime,
  timelineDuration,
  canUndo,
  canRedo,
  clipAtPlayhead,
  sceneDetectPending = false,
  upscaleVideoPending = false,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  onSplitAtPlayhead,
  onDetectScenes,
  onAddText,
  onAddTransition,
  onUpscaleVideo,
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-neutral-100 px-4 py-2">
      <div className="flex items-center gap-3">
        {/* Undo/Redo */}
        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded px-2 py-1 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Cmd+Z)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded px-2 py-1 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Cmd+Shift+Z)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
              />
            </svg>
          </button>
        </div>

        <div className="h-4 w-px bg-neutral-300" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-600">Zoom:</span>
          <button
            onClick={onZoomOut}
            className="rounded px-2 py-1 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50"
            title="Zoom out"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="text-xs font-mono text-neutral-700">{Math.round(zoom)}px/s</span>
          <button
            onClick={onZoomIn}
            className="rounded px-2 py-1 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50"
            title="Zoom in"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>

        <div className="h-4 w-px bg-neutral-300" />

        {/* Split Button */}
        <button
          onClick={onSplitAtPlayhead}
          disabled={!clipAtPlayhead}
          className="rounded px-2 py-1 bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Split clip at playhead (S)"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
            />
          </svg>
        </button>

        {/* Scene Detection */}
        {onDetectScenes && (
          <>
            <div className="h-4 w-px bg-neutral-300" />
            <button
              onClick={onDetectScenes}
              disabled={sceneDetectPending}
              className="rounded px-2 py-1 bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Detect scenes in video"
              aria-label={sceneDetectPending ? 'Detecting scenes...' : 'Detect scenes in video'}
            >
              {sceneDetectPending ? (
                <span className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Detecting scenes...</span>
                </span>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                  />
                </svg>
              )}
            </button>
          </>
        )}

        {/* Add Text */}
        {onAddText && (
          <>
            <div className="h-4 w-px bg-neutral-300" />
            <button
              onClick={onAddText}
              className="rounded px-2 py-1 bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              title="Add text overlay"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>
          </>
        )}

        {/* Add Transition */}
        {onAddTransition && (
          <>
            <div className="h-4 w-px bg-neutral-300" />
            <button
              onClick={onAddTransition}
              className="rounded px-2 py-1 bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              title="Add transition to selected clips"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </button>
          </>
        )}

        {/* Upscale Video */}
        {onUpscaleVideo && (
          <>
            <div className="h-4 w-px bg-neutral-300" />
            <button
              onClick={onUpscaleVideo}
              disabled={upscaleVideoPending}
              className="rounded px-2 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upscale selected video clip using Topaz AI"
              aria-label={
                upscaleVideoPending
                  ? 'Upscaling selected video clip using Topaz AI'
                  : 'Upscale selected video clip using Topaz AI'
              }
            >
              {upscaleVideoPending ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              )}
            </button>
          </>
        )}
      </div>

      {/* Time Display */}
      <div className="text-xs font-mono text-neutral-600">
        {formatTime(currentTime)} / {formatTime(timelineDuration)}
      </div>
    </div>
  );
});
