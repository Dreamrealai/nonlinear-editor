'use client';
import React from 'react';

import Image from 'next/image';
import { Clip } from '@/types/timeline';
import { AudioWaveform } from '../AudioWaveform';
import { getClipFileName, formatTimecode } from '@/lib/utils/timelineUtils';
import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';
import { useEditorStore } from '@/state/useEditorStore';

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
    const [hoverX, setHoverX] = React.useState<number | null>(null);
    const toggleClipLock = useEditorStore((state) => state.toggleClipLock);
    const timeline = useEditorStore((state) => state.timeline);

    // Memoize expensive calculations to prevent recalculation on every render
    const clipMetrics = React.useMemo(() => {
      const duration = clip.end - clip.start;
      return {
        duration,
        width: duration * zoom,
        left: clip.timelinePosition * zoom,
        top: clip.trackIndex * TRACK_HEIGHT,
      };
    }, [clip.end, clip.start, clip.timelinePosition, clip.trackIndex, zoom]);

    const thumbnail = clip.thumbnailUrl;
    const isLocked = clip.locked ?? false;

    // Check if clip is grouped (memoized)
    const groupInfo = React.useMemo(() => {
      const isGrouped = Boolean(clip.groupId);
      const group = timeline?.groups?.find((g) => g.id === clip.groupId);
      const groupColor = group?.color || '#8b5cf6';
      return { isGrouped, group, groupColor };
    }, [clip.groupId, timeline?.groups]);

    // Calculate timecode values (memoized)
    const timecodes = React.useMemo(() => ({
      in: formatTimecode(clip.start),
      out: formatTimecode(clip.end),
      start: formatTimecode(clip.timelinePosition),
      end: formatTimecode(clip.timelinePosition + clipMetrics.duration),
    }), [clip.start, clip.end, clip.timelinePosition, clipMetrics.duration]);

    // Calculate scrub position timecode based on hover position
    const scrubTimecode = React.useMemo(() => {
      if (hoverX === null) return null;
      const relativeX = hoverX / clipMetrics.width;
      const scrubTime = clip.start + (clipMetrics.duration * relativeX);
      return formatTimecode(scrubTime);
    }, [hoverX, clipMetrics.width, clipMetrics.duration, clip.start]);

    // Memoize event handlers to prevent re-renders
    const handleLockToggle = React.useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      toggleClipLock(clip.id);
    }, [toggleClipLock, clip.id]);

    // Handle mouse move for scrubbing preview
    const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverX(x);
    }, []);

    // Handle mouse leave
    const handleMouseLeave = React.useCallback(() => {
      setIsHovered(false);
      setHoverX(null);
    }, []);

    return (
      <div
        className={`absolute rounded-lg border-2 overflow-hidden transition-all ${
          isLocked
            ? 'cursor-not-allowed border-gray-400 bg-gray-500/20'
            : 'cursor-move hover:shadow-lg'
        } ${
          isSelected
            ? 'border-yellow-400 ring-2 ring-yellow-400/50'
            : groupInfo.isGrouped
            ? `border-[${groupInfo.groupColor}] hover:brightness-110`
            : isLocked
            ? 'border-gray-400'
            : 'border-blue-500 hover:border-blue-600'
        }`}
        style={{
          left: clipMetrics.left,
          top: clipMetrics.top + 8,
          width: clipMetrics.width,
          height: TRACK_HEIGHT - 16,
          ...(groupInfo.isGrouped && !isSelected
            ? { borderColor: groupInfo.groupColor, boxShadow: `0 0 0 1px ${groupInfo.groupColor}80` }
            : {}),
        }}
        onMouseDown={(e) => onMouseDown(e, clip)}
        onClick={(e) => onClick(e, clip)}
        onContextMenu={(e) => onContextMenu(e, clip)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(e as unknown as React.MouseEvent<HTMLDivElement>, clip);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Timeline clip: ${getClipFileName(clip)}${groupInfo.isGrouped ? ` (${groupInfo.group?.name || 'Grouped'})` : ''}`}
      >
        <div className="relative h-full w-full select-none">
          {/* Color Label Indicator */}
          {clip.color && (
            <div
              className="absolute left-0 top-0 bottom-0 w-1 z-10"
              style={{
                backgroundColor: clip.color,
                boxShadow: `0 0 8px ${clip.color}80`
              }}
              title={`Color: ${clip.color}`}
            />
          )}

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
                width={clipMetrics.width}
                height={Math.floor((TRACK_HEIGHT - 16) * 0.3)}
                zoom={zoom}
                className="opacity-80"
              />
            </div>
          )}

          {/* Trim Handles - Enhanced with better visual feedback */}
          {/* Left trim handle with expanded hit area and ripple animation */}
          <div
            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize pointer-events-auto group"
            style={{ marginLeft: '-3px' }}
            onMouseDown={(e) => onTrimHandleMouseDown(e, clip, 'left')}
            role="slider"
            tabIndex={0}
            aria-label="Trim clip start (Shift=Ripple, Alt=Roll, Cmd=Slip)"
            aria-valuenow={clip.start || 0}
            aria-valuemin={0}
            aria-valuemax={clip.sourceDuration || 0}
            title="Trim start • Shift: Ripple • Alt: Roll • Cmd: Slip"
          >
            {/* Main handle bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/50 group-hover:w-3 group-hover:bg-blue-400 transition-all duration-150 shadow-lg" />
            {/* Grip lines indicator */}
            <div className="absolute left-0.5 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div className="w-0.5 h-1 bg-white rounded-full" />
              <div className="w-0.5 h-1 bg-white rounded-full" />
              <div className="w-0.5 h-1 bg-white rounded-full" />
            </div>
          </div>
          {/* Right trim handle with expanded hit area and ripple animation */}
          <div
            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize pointer-events-auto group"
            style={{ marginRight: '-3px' }}
            onMouseDown={(e) => onTrimHandleMouseDown(e, clip, 'right')}
            role="slider"
            tabIndex={0}
            aria-label="Trim clip end (Shift=Ripple, Alt=Roll, Cmd=Slip)"
            aria-valuenow={clip.end || clip.sourceDuration || 0}
            aria-valuemin={0}
            aria-valuemax={clip.sourceDuration || 0}
            title="Trim end • Shift: Ripple • Alt: Roll • Cmd: Slip"
          >
            {/* Main handle bar */}
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/50 group-hover:w-3 group-hover:bg-purple-400 transition-all duration-150 shadow-lg" />
            {/* Grip lines indicator */}
            <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div className="w-0.5 h-1 bg-white rounded-full" />
              <div className="w-0.5 h-1 bg-white rounded-full" />
              <div className="w-0.5 h-1 bg-white rounded-full" />
            </div>
          </div>

          <div className="absolute inset-0 flex h-full flex-col justify-between p-2 text-white pointer-events-none">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-xs font-semibold">{getClipFileName(clip)}</p>
                  {groupInfo.isGrouped && (
                    <div
                      className="flex-shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase"
                      style={{ backgroundColor: groupInfo.groupColor, color: 'white' }}
                      title={groupInfo.group?.name || 'Grouped'}
                    >
                      <svg
                        className="h-2.5 w-2.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                {timecodeDisplayMode === 'duration' ? (
                  <p className="text-[10px] font-medium text-white/70">
                    {clipMetrics.duration.toFixed(1)}s
                  </p>
                ) : (
                  <div className="text-[9px] font-mono text-white/80 leading-tight">
                    <div>In: {timecodes.in}</div>
                    <div>Out: {timecodes.out}</div>
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onMouseDown={handleLockToggle}
                  className={`flex-shrink-0 rounded p-0.5 pointer-events-auto transition-colors ${
                    isLocked
                      ? 'bg-yellow-500/80 text-white hover:bg-yellow-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                  title={isLocked ? 'Unlock clip' : 'Lock clip'}
                  aria-label={isLocked ? 'Unlock clip' : 'Lock clip'}
                >
                  {isLocked ? (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
                <button
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onRemove(clip.id);
                  }}
                  className="flex-shrink-0 rounded bg-white/20 p-0.5 text-white hover:bg-red-500 pointer-events-auto"
                  title="Remove clip"
                  aria-label="Remove clip"
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
            </div>

            {/* Hover Timecode Display */}
            {isHovered && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 rounded-lg px-3 py-2 shadow-xl border border-white/20 z-10 pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-[10px] font-mono text-white/60 text-center flex-1">
                    Timecodes
                  </div>
                  {isLocked && (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span className="text-[9px] font-semibold">LOCKED</span>
                    </div>
                  )}
                </div>
                <div className="space-y-0.5 text-xs font-mono">
                  <div className="flex justify-between gap-4">
                    <span className="text-white/70">Start:</span>
                    <span className="text-white font-semibold">{timecodes.start}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/70">End:</span>
                    <span className="text-white font-semibold">{timecodes.end}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/70">Duration:</span>
                    <span className="text-emerald-400 font-semibold">
                      {clipMetrics.duration.toFixed(2)}s
                    </span>
                  </div>
                  <div className="border-t border-white/20 pt-1 mt-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-white/70">In:</span>
                      <span className="text-blue-400 font-semibold">{timecodes.in}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-white/70">Out:</span>
                      <span className="text-blue-400 font-semibold">{timecodes.out}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scrubbing Preview Indicator */}
            {isHovered && hoverX !== null && (
              <>
                {/* Vertical line showing scrub position */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 pointer-events-none z-20"
                  style={{ left: `${hoverX}px` }}
                >
                  {/* Timecode label at scrub position */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1 bg-yellow-400 text-black text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                    {scrubTimecode}
                  </div>
                </div>
              </>
            )}

            {clip.transitionToNext && clip.transitionToNext.type !== 'none' && (
              <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-[9px] font-medium px-2 py-0.5 rounded-full shadow-md border border-purple-400/30">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span>{clip.transitionToNext.type}</span>
                <span className="text-purple-200">{clip.transitionToNext.duration.toFixed(1)}s</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
