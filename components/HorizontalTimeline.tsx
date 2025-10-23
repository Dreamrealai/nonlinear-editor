/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Clip } from '@/types/timeline';

const TRACK_HEIGHT = 80;
const RULER_HEIGHT = 30;
const MIN_TRACKS = 3;
const SNAP_INTERVAL = 0.1; // seconds
const SNAP_THRESHOLD = SNAP_INTERVAL / 2;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

const getClipFileName = (clip: Clip): string => {
  const path = clip.filePath ?? '';
  const normalized = path.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const segments = normalized.split('/');
  const leaf = segments[segments.length - 1];
  return leaf && leaf.length > 0 ? leaf : 'Clip';
};

type HorizontalTimelineProps = {
  onDetectScenes?: () => void;
  sceneDetectPending?: boolean;
  onExport?: () => void;
};

export default function HorizontalTimeline({ onDetectScenes, sceneDetectPending = false, onExport }: HorizontalTimelineProps = {}) {
  const timeline = useEditorStore((state) => state.timeline);
  const currentTime = useEditorStore((state) => state.currentTime);
  const zoom = useEditorStore((state) => state.zoom);
  const selectedClipIds = useEditorStore((state) => state.selectedClipIds);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const setZoom = useEditorStore((state) => state.setZoom);
  const updateClip = useEditorStore((state) => state.updateClip);
  const removeClip = useEditorStore((state) => state.removeClip);
  const selectClip = useEditorStore((state) => state.selectClip);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const splitClipAtTime = useEditorStore((state) => state.splitClipAtTime);
  const copyClips = useEditorStore((state) => state.copyClips);
  const pasteClips = useEditorStore((state) => state.pasteClips);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);

  const [forcedTrackCount, setForcedTrackCount] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingClip, setDraggingClip] = useState<{ id: string; offsetX: number; offsetY: number; duration: number } | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [trimmingClip, setTrimmingClip] = useState<{
    id: string;
    handle: 'left' | 'right';
    originalStart: number;
    originalEnd: number;
    originalPosition: number;
    sourceDuration: number | null;
  } | null>(null);

  const snapToGrid = useCallback(
    (value: number) => Math.round(value / SNAP_INTERVAL) * SNAP_INTERVAL,
    [],
  );

  const computeSafePosition = useCallback(
    (clipId: string, desiredPosition: number, targetTrackIndex?: number) => {
      const basePosition = Math.max(0, desiredPosition);
      if (!timeline) {
        return Math.max(0, snapToGrid(basePosition));
      }

      const movingClip = timeline.clips.find((clip) => clip.id === clipId);
      if (!movingClip) {
        return Math.max(0, snapToGrid(basePosition));
      }

      const duration = Math.max(SNAP_INTERVAL, movingClip.end - movingClip.start);
      let position = Math.max(0, snapToGrid(basePosition));

      const trackIndex = typeof targetTrackIndex === 'number' ? targetTrackIndex : movingClip.trackIndex;
      const trackClips = timeline.clips
        .filter((clip) => clip.trackIndex === trackIndex && clip.id !== clipId)
        .sort((a, b) => a.timelinePosition - b.timelinePosition);

      const previous = trackClips.filter((clip) => clip.timelinePosition <= position).pop();
      const next = trackClips.find((clip) => clip.timelinePosition >= position);

      let minStart = 0;
      if (previous) {
        const prevDuration = Math.max(SNAP_INTERVAL, previous.end - previous.start);
        minStart = previous.timelinePosition + prevDuration;
      }

      let maxStart = Number.POSITIVE_INFINITY;
      if (next) {
        maxStart = next.timelinePosition - duration;
        if (maxStart < minStart) {
          maxStart = minStart;
        }
      }

      position = Math.max(minStart, Math.min(position, maxStart));

      const gridCandidate = snapToGrid(position);
      if (
        gridCandidate >= minStart - SNAP_THRESHOLD &&
        gridCandidate <= maxStart + SNAP_THRESHOLD
      ) {
        position = gridCandidate;
      }

      const snapCandidates: number[] = [0, minStart];
      if (maxStart !== Number.POSITIVE_INFINITY) {
        snapCandidates.push(maxStart);
      }
      trackClips.forEach((clip) => {
        snapCandidates.push(clip.timelinePosition);
        snapCandidates.push(clip.timelinePosition + Math.max(SNAP_INTERVAL, clip.end - clip.start));
      });

      for (const candidate of snapCandidates) {
        if (!Number.isFinite(candidate)) continue;
        if (Math.abs(candidate - position) <= SNAP_THRESHOLD) {
          position = candidate;
          break;
        }
      }

      return Math.max(0, position);
    },
    [timeline, snapToGrid],
  );

  // Calculate timeline duration
  const timelineDuration = timeline?.clips.length
    ? Math.max(...timeline.clips.map((c) => c.timelinePosition + (c.end - c.start)), 30)
    : 30;

  const maxTrack = timeline?.clips.length
    ? Math.max(...timeline.clips.map((c) => c.trackIndex), MIN_TRACKS - 1)
    : MIN_TRACKS - 1;

  const numTracks = Math.max(maxTrack + 1, MIN_TRACKS, forcedTrackCount ?? 0);

  const handleAddTrack = () => {
    setForcedTrackCount((prev) => Math.max(prev ?? numTracks, numTracks) + 1);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(zoom * 1.2);
  const handleZoomOut = () => setZoom(zoom / 1.2);

  // Playhead dragging
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingPlayhead(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !timeline) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, x / zoom);
    const y = e.clientY - rect.top;

    if (isDraggingPlayhead) {
      setCurrentTime(time);
    } else if (trimmingClip) {
      const clip = timeline.clips.find((c) => c.id === trimmingClip.id);
      if (!clip) return;

      if (trimmingClip.handle === 'left') {
        // Trim start: adjust clip.start and clip.timelinePosition
        const deltaTime = time - trimmingClip.originalPosition;
        const maxEnd =
          typeof clip.sourceDuration === 'number'
            ? clip.sourceDuration
            : trimmingClip.sourceDuration ?? trimmingClip.originalEnd;
        const newStart = Math.max(0, Math.min(trimmingClip.originalStart + deltaTime, Math.max(0, maxEnd - SNAP_INTERVAL)));
        const newPosition = Math.max(0, trimmingClip.originalPosition + (newStart - trimmingClip.originalStart));
        const minDuration = SNAP_INTERVAL;

        // Ensure minimum duration
        if ((maxEnd - newStart) >= minDuration && (Math.abs(newStart - clip.start) > 1e-4 || Math.abs(newPosition - clip.timelinePosition) > 1e-4)) {
          updateClip(trimmingClip.id, {
            start: newStart,
            timelinePosition: snapToGrid(newPosition),
          });
        }
      } else {
        // Trim end: adjust clip.end
        const clipWidth = time - clip.timelinePosition;
        const newEnd = clip.start + clipWidth;
        const minDuration = SNAP_INTERVAL;
        const maxEnd =
          typeof clip.sourceDuration === 'number'
            ? clip.sourceDuration
            : trimmingClip.sourceDuration ?? undefined;
        const boundedEnd = Math.max(
          clip.start + minDuration,
          typeof maxEnd === 'number' ? Math.min(newEnd, maxEnd) : newEnd,
        );

        // Ensure minimum duration
        if (boundedEnd - clip.start >= minDuration && Math.abs(boundedEnd - clip.end) > 1e-4) {
          updateClip(trimmingClip.id, {
            end: boundedEnd,
            ...(typeof clip.sourceDuration !== 'number'
              ? { sourceDuration: Math.max(typeof maxEnd === 'number' ? maxEnd : boundedEnd, boundedEnd) }
              : {}),
          });
        }
      }
    } else if (draggingClip) {
      const desiredPosition = Math.max(0, time - draggingClip.offsetX);
      const proposedTrack = Math.min(
        Math.max(0, Math.floor((y - draggingClip.offsetY) / TRACK_HEIGHT)),
        numTracks - 1
      );
      const safePosition = computeSafePosition(draggingClip.id, desiredPosition, proposedTrack);
      const clip = timeline.clips.find((item) => item.id === draggingClip.id);
      if (!clip || clip.timelinePosition !== safePosition || clip.trackIndex !== proposedTrack) {
        updateClip(draggingClip.id, { timelinePosition: safePosition, trackIndex: proposedTrack });
      }
    }
  }, [isDraggingPlayhead, trimmingClip, draggingClip, zoom, timeline, setCurrentTime, updateClip, computeSafePosition, numTracks, snapToGrid]);

  const handleMouseUp = useCallback(() => {
    if (draggingClip && timeline) {
      const clip = timeline.clips.find((item) => item.id === draggingClip.id);
      if (clip) {
        const safePosition = computeSafePosition(clip.id, clip.timelinePosition, clip.trackIndex);
        if (clip.timelinePosition !== safePosition) {
          updateClip(clip.id, { timelinePosition: safePosition });
        }
      }
    }
    setIsDraggingPlayhead(false);
    setDraggingClip(null);
    setTrimmingClip(null);
  }, [draggingClip, timeline, computeSafePosition, updateClip]);

  useEffect(() => {
    if (isDraggingPlayhead || draggingClip || trimmingClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPlayhead, draggingClip, trimmingClip, handleMouseMove, handleMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl+Z: Undo
      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y: Redo
      if ((cmdOrCtrl && e.key === 'z' && e.shiftKey) || (cmdOrCtrl && e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Cmd/Ctrl+C: Copy
      if (cmdOrCtrl && e.key === 'c') {
        e.preventDefault();
        copyClips();
        return;
      }

      // Cmd/Ctrl+V: Paste
      if (cmdOrCtrl && e.key === 'v') {
        e.preventDefault();
        pasteClips();
        return;
      }

      // Delete/Backspace: Remove selected clips
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        selectedClipIds.forEach((id) => removeClip(id));
        clearSelection();
      }

      // S: Split clip at playhead
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (!timeline) return;
        const clipAtPlayhead = timeline.clips.find((clip) => {
          const clipStart = clip.timelinePosition;
          const clipEnd = clipStart + (clip.end - clip.start);
          return currentTime > clipStart && currentTime < clipEnd;
        });
        if (clipAtPlayhead) {
          splitClipAtTime(clipAtPlayhead.id, currentTime);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipIds, currentTime, timeline, removeClip, clearSelection, splitClipAtTime, copyClips, pasteClips, undo, redo]);

  // Clip dragging
  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip) => {
    if (!containerRef.current) return;
    e.stopPropagation();
    const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;
    selectClip(clip.id, isMulti);
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const clipStartX = clip.timelinePosition * zoom;
    const offsetX = (clickX - clipStartX) / zoom;
    const clipTop = clip.trackIndex * TRACK_HEIGHT;
    const offsetY = clickY - clipTop;
    const duration = Math.max(SNAP_INTERVAL, clip.end - clip.start);
    setDraggingClip({ id: clip.id, offsetX, offsetY, duration });
  };

  // Trim handle handlers
  const handleTrimHandleMouseDown = (e: React.MouseEvent, clip: Clip, handle: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    selectClip(clip.id, e.metaKey || e.ctrlKey || e.shiftKey);
    setTrimmingClip({
      id: clip.id,
      handle,
      originalStart: clip.start,
      originalEnd: clip.end,
      originalPosition: clip.timelinePosition,
      sourceDuration: typeof clip.sourceDuration === 'number' ? clip.sourceDuration : null,
    });
  };

  // Click to select clip
  const handleClipClick = (e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;
    selectClip(clip.id, isMulti);
  };

  // Split clip at playhead
  const handleSplitAtPlayhead = () => {
    if (!timeline) return;
    const clipAtPlayhead = timeline.clips.find((clip) => {
      const clipStart = clip.timelinePosition;
      const clipEnd = clipStart + (clip.end - clip.start);
      return currentTime > clipStart && currentTime < clipEnd;
    });
    if (clipAtPlayhead) {
      splitClipAtTime(clipAtPlayhead.id, currentTime);
    }
  };

  // Timeline click to set playhead
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!containerRef.current || draggingClip || isDraggingPlayhead) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, x / zoom);
    setCurrentTime(time);
    clearSelection();
  };

  // Check if playhead is over any clip (for split button)
  const clipAtPlayhead = timeline?.clips.find((clip) => {
    const clipStart = clip.timelinePosition;
    const clipEnd = clipStart + (clip.end - clip.start);
    return currentTime > clipStart && currentTime < clipEnd;
  });

  if (!timeline || timeline.clips.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-neutral-300 bg-white/60 p-8 text-center">
        <p className="text-sm font-medium text-neutral-600">
          Add clips from the assets panel to build your timeline
        </p>
      </div>
    );
  }

  const timelineWidth = timelineDuration * zoom;

  return (
    <div className="flex flex-col gap-2">
      {/* Zoom Controls */}
      <div className="flex items-center justify-between rounded-lg bg-neutral-100 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="rounded px-2 py-1 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Cmd+Z)"
            >
              ↶
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="rounded px-2 py-1 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Cmd+Shift+Z)"
            >
              ↷
            </button>
          </div>
          <div className="h-4 w-px bg-neutral-300" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-600">Zoom:</span>
            <button
              onClick={handleZoomOut}
              className="rounded px-2 py-1 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50"
            >
              −
            </button>
            <span className="text-xs font-mono text-neutral-700">{Math.round(zoom)}px/s</span>
            <button
              onClick={handleZoomIn}
              className="rounded px-2 py-1 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50"
            >
              +
            </button>
          </div>
          <div className="h-4 w-px bg-neutral-300" />
          <button
            onClick={handleSplitAtPlayhead}
            disabled={!clipAtPlayhead}
            className="rounded px-3 py-1 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Split clip at playhead (S)"
          >
            Split (S)
          </button>
          {onDetectScenes && (
            <>
              <div className="h-4 w-px bg-neutral-300" />
              <button
                onClick={onDetectScenes}
                disabled={sceneDetectPending}
                className="rounded px-3 py-1 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Detect scenes in video"
              >
                {sceneDetectPending ? 'Detecting...' : 'Detect Scenes'}
              </button>
            </>
          )}
          {onExport && (
            <>
              <div className="h-4 w-px bg-neutral-300" />
              <button
                onClick={onExport}
                className="rounded px-3 py-1 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                title="Export/Render video"
              >
                Export Video
              </button>
            </>
          )}
        </div>
        <div className="text-xs font-mono text-neutral-600">
          {formatTime(currentTime)} / {formatTime(timelineDuration)}
        </div>
      </div>

      {/* Timeline Container */}
      <div className="rounded-xl border-2 border-neutral-200 bg-white shadow-sm overflow-auto">
        <div className="relative">
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

          {/* Tracks */}
          <div
            ref={containerRef}
            className="relative"
            style={{ minWidth: timelineWidth, height: numTracks * TRACK_HEIGHT }}
            onClick={handleTimelineClick}
          >
            {/* Track backgrounds */}
            {Array.from({ length: numTracks }).map((_, trackIndex) => (
              <div
                key={trackIndex}
                className="absolute w-full border-b border-neutral-200"
                style={{
                  top: trackIndex * TRACK_HEIGHT,
                  height: TRACK_HEIGHT,
                  backgroundColor: trackIndex % 2 === 0 ? '#fafafa' : '#ffffff',
                }}
              >
                <span className="absolute left-2 top-2 text-xs font-semibold text-neutral-400">
                  Track {trackIndex + 1}
                </span>
              </div>
            ))}

            {/* Clips */}
            {timeline.clips.map((clip) => {
              const clipDuration = clip.end - clip.start;
              const clipWidth = clipDuration * zoom;
              const clipLeft = clip.timelinePosition * zoom;
              const clipTop = clip.trackIndex * TRACK_HEIGHT;
              const thumbnail = clip.thumbnailUrl;
              const isSelected = selectedClipIds.has(clip.id);

              return (
                <div
                  key={clip.id}
                  className={`absolute rounded-lg border-2 overflow-hidden cursor-move hover:shadow-lg transition-all ${
                    isSelected ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-blue-500 hover:border-blue-600'
                  }`}
                  style={{
                    left: clipLeft,
                    top: clipTop + 8,
                    width: clipWidth,
                    height: TRACK_HEIGHT - 16,
                  }}
                  onMouseDown={(e) => handleClipMouseDown(e, clip)}
                  onClick={(e) => handleClipClick(e, clip)}
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

                    {/* Trim Handles */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 bg-white/30 hover:bg-white/50 cursor-ew-resize pointer-events-auto"
                      onMouseDown={(e) => handleTrimHandleMouseDown(e, clip, 'left')}
                      title="Trim start"
                    />
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 hover:bg-white/50 cursor-ew-resize pointer-events-auto"
                      onMouseDown={(e) => handleTrimHandleMouseDown(e, clip, 'right')}
                      title="Trim end"
                    />

                    <div className="absolute inset-0 flex h-full flex-col justify-between p-2 text-white pointer-events-none">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">
                            {getClipFileName(clip)}
                          </p>
                          <p className="text-[10px] font-medium text-white/70">
                            {clipDuration.toFixed(1)}s
                          </p>
                        </div>
                        <button
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            removeClip(clip.id);
                          }}
                          className="flex-shrink-0 rounded bg-white/20 p-0.5 text-white hover:bg-red-500 pointer-events-auto"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 cursor-ew-resize z-20 pointer-events-none"
              style={{ left: currentTime * zoom }}
            >
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full pointer-events-auto cursor-grab active:cursor-grabbing"
                onMouseDown={handlePlayheadMouseDown}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Track Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleAddTrack}
          className="rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-600 transition-all hover:border-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
          title="Add new track"
        >
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Track
          </span>
        </button>
      </div>
    </div>
  );
}
