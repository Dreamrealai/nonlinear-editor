/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import type { Clip } from '@/types/timeline';
import { AudioWaveform } from '../AudioWaveform';
import { getClipFileName } from '@/lib/utils/timelineUtils';
import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';

const { TRACK_HEIGHT } = TIMELINE_CONSTANTS;

type TimelineClipRendererProps = {
  clip: Clip;
  zoom: number;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, clip: Clip) => void;
  onClick: (e: React.MouseEvent, clip: Clip) => void;
  onContextMenu: (e: React.MouseEvent, clip: Clip) => void;
  onTrimHandleMouseDown: (e: React.MouseEvent, clip: Clip, handle: 'left' | 'right') => void;
  onRemove: (id: string) => void;
};

/**
 * Memoized clip renderer component for performance optimization
 * Renders a single clip on the timeline with thumbnail, waveform, trim handles, and controls
 */
export const TimelineClipRenderer = React.memo<TimelineClipRendererProps>(
  function TimelineClipRenderer({
    clip,
    zoom,
    isSelected,
    onMouseDown,
    onClick,
    onContextMenu,
    onTrimHandleMouseDown,
    onRemove,
  }) {
    const clipDuration = clip.end - clip.start;
    const clipWidth = clipDuration * zoom;
    const clipLeft = clip.timelinePosition * zoom;
    const clipTop = clip.trackIndex * TRACK_HEIGHT;
    const thumbnail = clip.thumbnailUrl;

    return (
      <div
        className={`absolute rounded-lg border-2 overflow-hidden cursor-move hover:shadow-lg transition-all ${
          isSelected
            ? 'border-yellow-400 ring-2 ring-yellow-400/50'
            : 'border-blue-500 hover:border-blue-600'
        }`}
        style={{
          left: clipLeft,
          top: clipTop + 8,
          width: clipWidth,
          height: TRACK_HEIGHT - 16,
        }}
        onMouseDown={(e) => onMouseDown(e, clip)}
        onClick={(e) => onClick(e, clip)}
        onContextMenu={(e) => onContextMenu(e, clip)}
      >
        <div className="relative h-full w-full select-none">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={`${getClipFileName(clip)} thumbnail`}
              className="pointer-events-none h-full w-full object-cover"
              loading="lazy"
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-blue-200 via-blue-100 to-blue-200" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />

          {/* Audio Waveform */}
          {clip.hasAudio && (
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0"
              style={{ height: '30%' }}
            >
              <AudioWaveform
                clip={clip}
                width={clipWidth}
                height={Math.floor((TRACK_HEIGHT - 16) * 0.3)}
                className="opacity-80"
              />
            </div>
          )}

          {/* Trim Handles */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 bg-white/30 hover:bg-white/50 cursor-ew-resize pointer-events-auto"
            onMouseDown={(e) => onTrimHandleMouseDown(e, clip, 'left')}
            title="Trim start"
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 hover:bg-white/50 cursor-ew-resize pointer-events-auto"
            onMouseDown={(e) => onTrimHandleMouseDown(e, clip, 'right')}
            title="Trim end"
          />

          <div className="absolute inset-0 flex h-full flex-col justify-between p-2 text-white pointer-events-none">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{getClipFileName(clip)}</p>
                <p className="text-[10px] font-medium text-white/70">{clipDuration.toFixed(1)}s</p>
              </div>
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onRemove(clip.id);
                }}
                className="flex-shrink-0 rounded bg-white/20 p-0.5 text-white hover:bg-red-500 pointer-events-auto"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {clip.transitionToNext && (
              <div className="text-[9px] font-medium text-white/80">
                ⟿ {clip.transitionToNext.type}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
