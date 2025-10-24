'use client';
import React from 'react';

import Image from 'next/image';
import { Clip } from '@/types/timeline';
import { AudioWaveform } from '../AudioWaveform';
import { getClipFileName, formatTimecode } from '@/lib/utils/timelineUtils';
import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';

const { TRACK_HEIGHT } = TIMELINE_CONSTANTS;

type TimelineClipRendererProps = {
  clip: Clip;
  zoom: number;
  isSelected: boolean;
  timecodeDisplayMode?: 'duration' | 'timecode';
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
    timecodeDisplayMode = 'duration',
    onMouseDown,
    onClick,
    onContextMenu,
    onTrimHandleMouseDown,
    onRemove,
  }) {
    const [isHovered, setIsHovered] = React.useState(false);
    const clipDuration = clip.end - clip.start;
    const clipWidth = clipDuration * zoom;
    const clipLeft = clip.timelinePosition * zoom;
    const clipTop = clip.trackIndex * TRACK_HEIGHT;
    const thumbnail = clip.thumbnailUrl;

    // Calculate timecode values
    const inTimecode = formatTimecode(clip.start);
    const outTimecode = formatTimecode(clip.end);
    const clipStartTime = formatTimecode(clip.timelinePosition);
    const clipEndTime = formatTimecode(clip.timelinePosition + clipDuration);

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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(e as unknown as React.MouseEvent<HTMLDivElement>, clip);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Timeline clip: ${getClipFileName(clip)}`}
      >
        <div className="relative h-full w-full select-none">
          {thumbnail ? (
            <div className="relative h-full w-full">
              <Image
                src={thumbnail}
                alt={`${getClipFileName(clip)} thumbnail`}
                fill
                className="pointer-events-none object-cover"
                sizes="(max-width: 768px) 100vw, 200px"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
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
          {/* Left trim handle with expanded hit area */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize pointer-events-auto group"
            style={{ marginLeft: '-2px' }}
            onMouseDown={(e) => onTrimHandleMouseDown(e, clip, 'left')}
            role="slider"
            tabIndex={0}
            aria-label="Trim clip start"
            aria-valuenow={clip.start || 0}
            aria-valuemin={0}
            aria-valuemax={clip.sourceDuration || 0}
            title="Trim start"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/40 group-hover:w-2.5 group-hover:bg-white/60 transition-all duration-150" />
          </div>
          {/* Right trim handle with expanded hit area */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize pointer-events-auto group"
            style={{ marginRight: '-2px' }}
            onMouseDown={(e) => onTrimHandleMouseDown(e, clip, 'right')}
            role="slider"
            tabIndex={0}
            aria-label="Trim clip end"
            aria-valuenow={clip.end || clip.sourceDuration || 0}
            aria-valuemin={0}
            aria-valuemax={clip.sourceDuration || 0}
            title="Trim end"
          >
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/40 group-hover:w-2.5 group-hover:bg-white/60 transition-all duration-150" />
          </div>

          <div className="absolute inset-0 flex h-full flex-col justify-between p-2 text-white pointer-events-none">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{getClipFileName(clip)}</p>
                {timecodeDisplayMode === 'duration' ? (
                  <p className="text-[10px] font-medium text-white/70">
                    {clipDuration.toFixed(1)}s
                  </p>
                ) : (
                  <div className="text-[9px] font-mono text-white/80 leading-tight">
                    <div>In: {inTimecode}</div>
                    <div>Out: {outTimecode}</div>
                  </div>
                )}
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

            {/* Hover Timecode Display */}
            {isHovered && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 rounded-lg px-3 py-2 shadow-xl border border-white/20 z-10 pointer-events-none">
                <div className="text-[10px] font-mono text-white/60 mb-1 text-center">
                  Timecodes
                </div>
                <div className="space-y-0.5 text-xs font-mono">
                  <div className="flex justify-between gap-4">
                    <span className="text-white/70">Start:</span>
                    <span className="text-white font-semibold">{clipStartTime}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/70">End:</span>
                    <span className="text-white font-semibold">{clipEndTime}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/70">Duration:</span>
                    <span className="text-emerald-400 font-semibold">
                      {clipDuration.toFixed(2)}s
                    </span>
                  </div>
                  <div className="border-t border-white/20 pt-1 mt-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-white/70">In:</span>
                      <span className="text-blue-400 font-semibold">{inTimecode}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-white/70">Out:</span>
                      <span className="text-blue-400 font-semibold">{outTimecode}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
