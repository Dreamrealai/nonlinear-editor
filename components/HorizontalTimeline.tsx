/**
 * HorizontalTimeline Component
 *
 * Main timeline component for video editing interface
 * - Displays clips, text overlays, and playhead
 * - Handles drag interactions (clips, playhead, trim)
 * - Supports keyboard shortcuts for editing
 * - Virtualized rendering for performance
 *
 * Refactored to use extracted hooks and components for maintainability
 */
'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Clip, TextOverlay } from '@/types/timeline';
import { useTimelineScroll } from './VirtualizedClipRenderer';
import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';

// Extracted components
import { TimelineClipRenderer } from './timeline/TimelineClipRenderer';
import { TimelineControls } from './timeline/TimelineControls';
import { TimelineRuler } from './timeline/TimelineRuler';
import { TimelineTracks } from './timeline/TimelineTracks';
import { TimelineContextMenu } from './timeline/TimelineContextMenu';
import { TimelinePlayhead } from './timeline/TimelinePlayhead';
import { TimelineTextOverlayTrack } from './timeline/TimelineTextOverlayTrack';

// Extracted hooks
import { useTimelineDragging } from '@/lib/hooks/useTimelineDragging';
import { useTimelineKeyboardShortcuts } from '@/lib/hooks/useTimelineKeyboardShortcuts';
import { useTimelineCalculations } from '@/lib/hooks/useTimelineCalculations';

const { TRACK_HEIGHT, MIN_TRACKS, SNAP_INTERVAL_SECONDS: SNAP_INTERVAL } = TIMELINE_CONSTANTS;

type HorizontalTimelineProps = {
  onDetectScenes?: () => void;
  sceneDetectPending?: boolean;
  onAddText?: () => void;
  onAddTransition?: () => void;
  onGenerateAudioFromClip?: (clipId: string) => void;
  onUpscaleVideo?: () => void;
  upscaleVideoPending?: boolean;
  onSplitAudioFromClip?: (clipId: string) => void;
  onSplitScenesFromClip?: (clipId: string) => void;
  splitAudioPending?: boolean;
  splitScenesPending?: boolean;
};

// Memoized selector to prevent re-renders when unrelated state changes
const selectTimelineState = (state: ReturnType<typeof useEditorStore.getState>) => ({
  timeline: state.timeline,
  currentTime: state.currentTime,
  zoom: state.zoom,
  selectedClipIds: state.selectedClipIds,
  setCurrentTime: state.setCurrentTime,
  setZoom: state.setZoom,
  updateClip: state.updateClip,
  removeClip: state.removeClip,
  selectClip: state.selectClip,
  clearSelection: state.clearSelection,
  splitClipAtTime: state.splitClipAtTime,
  copyClips: state.copyClips,
  pasteClips: state.pasteClips,
  undo: state.undo,
  redo: state.redo,
  canUndo: state.canUndo,
  canRedo: state.canRedo,
  removeTextOverlay: state.removeTextOverlay,
});

function HorizontalTimeline({
  onDetectScenes,
  sceneDetectPending = false,
  onAddText,
  onAddTransition,
  onGenerateAudioFromClip,
  onUpscaleVideo,
  upscaleVideoPending = false,
  onSplitAudioFromClip,
  onSplitScenesFromClip,
  splitAudioPending = false,
  splitScenesPending = false,
}: HorizontalTimelineProps = {}) {
  // Store state - use single selector to reduce re-renders
  const {
    timeline,
    currentTime,
    zoom,
    selectedClipIds,
    setCurrentTime,
    setZoom,
    updateClip,
    removeClip,
    selectClip,
    clearSelection,
    splitClipAtTime,
    copyClips,
    pasteClips,
    undo,
    redo,
    canUndo,
    canRedo,
    removeTextOverlay,
  } = useEditorStore(selectTimelineState);

  // Local state
  const [forcedTrackCount, setForcedTrackCount] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ clipId: string; x: number; y: number } | null>(
    null
  );
  const [selectedTextOverlayId, setSelectedTextOverlayId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Track scroll position for virtualized rendering
  const { scrollLeft, viewportWidth } = useTimelineScroll(containerRef);

  // Timeline calculations (duration, tracks, visible clips)
  const { timelineDuration, numTracks, visibleClips } = useTimelineCalculations({
    timeline,
    forcedTrackCount,
    scrollLeft,
    viewportWidth,
    zoom,
  });

  // Dragging state (clip, playhead, trim)
  const { setDraggingClip, setIsDraggingPlayhead, setTrimmingClip } = useTimelineDragging({
    containerRef,
    timeline,
    zoom,
    numTracks,
    setCurrentTime,
    updateClip,
  });

  // Keyboard shortcuts
  useTimelineKeyboardShortcuts({
    timeline,
    currentTime,
    selectedClipIds,
    undo,
    redo,
    copyClips,
    pasteClips,
    removeClip,
    clearSelection,
    splitClipAtTime,
  });

  // Zoom controls - memoized to prevent re-creation on every render
  const handleZoomIn = useCallback(() => setZoom(zoom * 1.2), [setZoom, zoom]);
  const handleZoomOut = useCallback(() => setZoom(zoom / 1.2), [setZoom, zoom]);

  // Playhead dragging - memoized
  const handlePlayheadMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingPlayhead(true);
    },
    [setIsDraggingPlayhead]
  );

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
    setSelectedTextOverlayId(null);
  };

  // Click to select text overlay
  const handleTextOverlayClick = (e: React.MouseEvent, overlay: TextOverlay) => {
    e.stopPropagation();
    setSelectedTextOverlayId(overlay.id);
    clearSelection();
  };

  // Split clip at playhead - memoized
  const handleSplitAtPlayhead = useCallback(() => {
    if (!timeline || !timeline.clips || !splitClipAtTime) return;
    const clipAtPlayhead = timeline.clips.find((clip) => {
      const clipStart = clip.timelinePosition;
      const clipEnd = clipStart + (clip.end - clip.start);
      return currentTime > clipStart && currentTime < clipEnd;
    });
    if (clipAtPlayhead) {
      splitClipAtTime(clipAtPlayhead.id, currentTime);
    }
  }, [timeline, splitClipAtTime, currentTime]);

  // Timeline click to set playhead
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const time = Math.max(0, clickX / zoom);
    setCurrentTime(time);
    clearSelection();
    setSelectedTextOverlayId(null);
  };

  // Check if playhead is over any clip (for split button) - memoized
  const clipAtPlayhead = React.useMemo(() => {
    return timeline?.clips?.find((clip) => {
      if (!clip) return false;
      const clipStart = clip.timelinePosition;
      const clipEnd = clipStart + (clip.end - clip.start);
      return currentTime > clipStart && currentTime < clipEnd;
    });
  }, [timeline?.clips, currentTime]);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu && typeof window !== 'undefined') {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
    return undefined;
  }, [contextMenu]);

  const handleClipContextMenu = useCallback((e: React.MouseEvent, clip: Clip) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ clipId: clip.id, x: e.clientX, y: e.clientY });
  }, []);

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
      {/* Controls */}
      <TimelineControls
        zoom={zoom}
        currentTime={currentTime}
        timelineDuration={timelineDuration}
        canUndo={canUndo()}
        canRedo={canRedo()}
        clipAtPlayhead={!!clipAtPlayhead}
        sceneDetectPending={sceneDetectPending}
        upscaleVideoPending={upscaleVideoPending}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onUndo={undo}
        onRedo={redo}
        onSplitAtPlayhead={handleSplitAtPlayhead}
        onDetectScenes={onDetectScenes}
        onAddText={onAddText}
        onAddTransition={onAddTransition}
        onUpscaleVideo={onUpscaleVideo}
      />

      {/* Timeline Container */}
      <div className="rounded-xl border-2 border-neutral-200 bg-white shadow-sm overflow-auto">
        <div className="relative">
          {/* Time Ruler */}
          <TimelineRuler
            timelineDuration={timelineDuration}
            zoom={zoom}
            currentTime={currentTime}
            onPlayheadMouseDown={handlePlayheadMouseDown}
          />

          {/* Text Overlay Track */}
          <TimelineTextOverlayTrack
            textOverlays={timeline.textOverlays ?? []}
            selectedTextOverlayId={selectedTextOverlayId}
            zoom={zoom}
            timelineWidth={timelineWidth}
            onTextOverlayClick={handleTextOverlayClick}
            onRemoveTextOverlay={removeTextOverlay}
            onTimelineClick={handleTimelineClick}
          />

          {/* Tracks */}
          <div
            ref={containerRef}
            className="relative"
            style={{ minWidth: timelineWidth, height: numTracks * TRACK_HEIGHT }}
            onClick={handleTimelineClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTimelineClick(e as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Timeline workspace"
          >
            {/* Track backgrounds */}
            <TimelineTracks
              numTracks={numTracks}
              clips={timeline.clips}
              onAddTrack={() => setForcedTrackCount(numTracks + 1)}
              onRemoveTrack={() => setForcedTrackCount(Math.max(MIN_TRACKS, numTracks - 1))}
            />

            {/* Clips - Virtualized rendering */}
            {visibleClips.map((clip) => (
              <TimelineClipRenderer
                key={clip.id}
                clip={clip}
                zoom={zoom}
                isSelected={selectedClipIds.has(clip.id)}
                onMouseDown={handleClipMouseDown}
                onClick={handleClipClick}
                onContextMenu={handleClipContextMenu}
                onTrimHandleMouseDown={handleTrimHandleMouseDown}
                onRemove={removeClip}
              />
            ))}

            {/* Playhead */}
            <TimelinePlayhead
              currentTime={currentTime}
              zoom={zoom}
              onMouseDown={handlePlayheadMouseDown}
            />
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <TimelineContextMenu
          clipId={contextMenu.clipId}
          x={contextMenu.x}
          y={contextMenu.y}
          splitAudioPending={splitAudioPending}
          splitScenesPending={splitScenesPending}
          onCopy={copyClips}
          onPaste={pasteClips}
          onSplitAudio={onSplitAudioFromClip}
          onSplitScenes={onSplitScenesFromClip}
          onGenerateAudio={onGenerateAudioFromClip}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export default HorizontalTimeline;
