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
import type { Marker } from '@/types/timeline';
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
import { TimelineSnapGuides } from './timeline/TimelineSnapGuides';
import { TimelineTrimOverlay } from './timeline/TimelineTrimOverlay';
import { KeyboardShortcutsPanel } from './timeline/KeyboardShortcutsPanel';
import { EditModeFeedback } from './timeline/EditModeFeedback';
import { TimelineSelectionRectangle } from './timeline/TimelineSelectionRectangle';
import { TimelineMinimap } from './timeline/TimelineMinimap';

// Extracted hooks
import { useTimelineDraggingWithSnap } from '@/lib/hooks/useTimelineDraggingWithSnap';
import { useTimelineKeyboardShortcuts } from '@/lib/hooks/useTimelineKeyboardShortcuts';
import { useTimelineCalculations } from '@/lib/hooks/useTimelineCalculations';
import { useTimelineScrolling } from '@/lib/hooks/useTimelineScrolling';
import { usePlaybackStore } from '@/state/usePlaybackStore';
import { useRubberBandSelection } from '@/lib/hooks/useRubberBandSelection';

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

// Optimized shallow selector - only re-render when clips/textOverlays array changes
// This prevents re-renders when clip properties change (handled by React.memo in TimelineClipRenderer)
const selectTimelineData = (state: ReturnType<typeof useEditorStore.getState>): { timeline: Timeline | null; clips: Clip[]; textOverlays: TextOverlay[]; groups: ClipGroup[]; markers: Marker[]; } => ({
  timeline: state.timeline,
  clips: state.timeline?.clips ?? [],
  textOverlays: state.timeline?.textOverlays ?? [],
  groups: state.timeline?.groups ?? [],
  markers: state.timeline?.markers ?? [],
});

// Separate selector for frequently changing values to minimize re-renders
const selectPlaybackState = (state: ReturnType<typeof useEditorStore.getState>): { currentTime: number; zoom: number; autoScrollEnabled: boolean; } => ({
  currentTime: state.currentTime,
  zoom: state.zoom,
  autoScrollEnabled: state.autoScrollEnabled,
});

// Selector for selection state
const selectSelectionState = (state: ReturnType<typeof useEditorStore.getState>): { selectedClipIds: Set<string>; } => ({
  selectedClipIds: state.selectedClipIds,
});

// Selector for actions (stable references)
const selectActions = (state: ReturnType<typeof useEditorStore.getState>) => ({
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
  removeTextOverlay: state.removeTextOverlay,
  updateTextOverlay: state.updateTextOverlay,
  toggleClipLock: state.toggleClipLock,
  toggleAutoScroll: state.toggleAutoScroll,
<<<<<<< Updated upstream
  toggleSnap: state.toggleSnap,
=======
    addMarker,
    // removeMarker,
    // updateMarker,
    jumpToMarker,
>>>>>>> Stashed changes
  addMarker: state.addMarker,
  selectClipsInRange: state.selectClipsInRange,
  selectAllClips: state.selectAllClips,
  selectAllClipsInTrack: state.selectAllClipsInTrack,
});

// Selector for undo/redo state
const selectHistoryState = (state: ReturnType<typeof useEditorStore.getState>): { canUndo: boolean; canRedo: boolean; } => ({
  canUndo: state.canUndo(),
  canRedo: state.canRedo(),
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
}: HorizontalTimelineProps = {}): React.ReactElement {
  // Optimized store subscriptions - separate selectors to minimize re-renders
  const { timeline, clips, textOverlays, markers } = useEditorStore(selectTimelineData);
  const { currentTime, zoom, autoScrollEnabled } = useEditorStore(selectPlaybackState);
  const { selectedClipIds } = useEditorStore(selectSelectionState);
  const { canUndo, canRedo } = useEditorStore(selectHistoryState);
  const {
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
    removeTextOverlay,
    updateTextOverlay,
    toggleClipLock,
    toggleAutoScroll,
    toggleSnap,
    addMarker,
<<<<<<< Updated upstream
    selectClipsInRange,
    selectAllClips,
    selectAllClipsInTrack,
=======
    // removeMarker,
    // updateMarker,
    jumpToMarker,
    selectClipsInRange,
    selectAllClipsInTrack,
    selectAllClips,
>>>>>>> Stashed changes
  } = useEditorStore(selectActions);

  // Playback state for auto-scroll
  const isPlaying = usePlaybackStore((state): boolean => state.isPlaying);

  // Local state
  const [forcedTrackCount, setForcedTrackCount] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ clipId: string; x: number; y: number } | null>(
    null
  );
  const [selectedTextOverlayId, setSelectedTextOverlayId] = useState<string | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Track scroll position for virtualized rendering
  const { scrollLeft, viewportWidth } = useTimelineScroll(scrollContainerRef);

  // Enhanced scrolling interactions (wheel zoom, space+drag, auto-scroll)
  useTimelineScrolling({
    containerRef: scrollContainerRef,
    zoom,
    setZoom,
    currentTime,
    isPlaying,
    autoScrollEnabled,
  });

  // Timeline calculations (duration, tracks, visible clips)
  const { timelineDuration, numTracks, visibleClips } = useTimelineCalculations({
    timeline,
    forcedTrackCount,
    scrollLeft,
    viewportWidth,
    zoom,
  });

  // Dragging state (clip, playhead, trim) and snap info
  const {
    snapInfo,
    trimPreviewInfo,
    setDraggingClip,
    setIsDraggingPlayhead,
    setTrimmingClip,
    currentEditMode,
    editModeModifiers,
    trimFeedback,
    draggingClip,
    trimmingClip,
  } = useTimelineDraggingWithSnap({
    containerRef,
    timeline,
    zoom,
    numTracks,
    setCurrentTime,
    updateClip,
  });

  // Rubber band selection (drag to select multiple clips)
  const { selectionRect } = useRubberBandSelection({
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    enabled: !draggingClip && !trimmingClip, // Only enable when not dragging clips or trimming
    zoom,
    trackHeight: TRACK_HEIGHT,
    onSelectClipsInRange: selectClipsInRange,
  });

  // Add marker at playhead position
  const handleAddMarker = useCallback((): void => {
    const marker: Marker = {
      id: `marker-${Date.now()}`,
      time: currentTime,
      label: `Marker ${(markers?.length ?? 0) + 1}`,
      color: '#3b82f6', // Default blue
    };
    addMarker(marker);
  }, [currentTime, markers, addMarker]);

<<<<<<< Updated upstream
=======
  // Marker click handler - jump playhead to marker position
  // const handleMarkerClick = useCallback(
    // (markerId: string): void => {
      // jumpToMarker(markerId);
    },
    // [jumpToMarker]
  );

>>>>>>> Stashed changes
  // Keyboard shortcuts
  useTimelineKeyboardShortcuts({
    timeline,
    currentTime,
    selectedClipIds: new Set(selectedClipIds),
    undo,
    redo,
    copyClips,
    pasteClips,
    removeClip,
    clearSelection,
    splitClipAtTime,
    toggleClipLock,
    onAddTransition,
    onAddMarker: handleAddMarker,
<<<<<<< Updated upstream
    onToggleSnap: toggleSnap,
=======
>>>>>>> Stashed changes
    onSelectAll: selectAllClips,
  });

  // Zoom controls - memoized to prevent re-creation on every render
  const handleZoomIn = useCallback((): void => setZoom(zoom * 1.2), [setZoom, zoom]);
  const handleZoomOut = useCallback((): void => setZoom(zoom / 1.2), [setZoom, zoom]);

  // Playhead dragging - memoized
  const handlePlayheadMouseDown = useCallback(
    (e: React.MouseEvent): void => {
      e.preventDefault();
      setIsDraggingPlayhead(true);
    },
    [setIsDraggingPlayhead]
  );

  // Clip dragging
  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip): void => {
    if (!containerRef.current) return;
    e.stopPropagation();
    const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;
    selectClip(clip.id, isMulti);

    // Prevent dragging locked clips
    if (clip.locked) {
      return;
    }

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
  const handleTrimHandleMouseDown = (
    e: React.MouseEvent,
    clip: Clip,
    handle: 'left' | 'right'
  ): void => {
    e.stopPropagation();
    e.preventDefault();
    selectClip(clip.id, e.metaKey || e.ctrlKey || e.shiftKey);

    // Prevent trimming locked clips
    if (clip.locked) {
      return;
    }

    setTrimmingClip({
      id: clip.id,
      handle,
      originalStart: clip.start,
      originalEnd: clip.end,
      originalPosition: clip.timelinePosition,
      sourceDuration: typeof clip.sourceDuration === 'number' ? clip.sourceDuration : null,
    });
  };

  // Click to select clip with enhanced shift+click for range selection
  const handleClipClick = (e: React.MouseEvent, clip: Clip): void => {
    e.stopPropagation();

    // Shift+click extends selection to include range
    if (e.shiftKey && selectedClipIds.size > 0) {
      // Get the first selected clip
      const firstSelectedId = Array.from(selectedClipIds)[0];
      const firstClip = clips.find((c): boolean => c.id === firstSelectedId);

      if (firstClip) {
        // Select all clips between first selected and clicked clip
        const startPos = Math.min(firstClip.timelinePosition, clip.timelinePosition);
        const endPos = Math.max(
          firstClip.timelinePosition + (firstClip.end - firstClip.start),
          clip.timelinePosition + (clip.end - clip.start)
        );

        clips.forEach((c): void => {
          const clipStart = c.timelinePosition;
          const clipEnd = clipStart + (c.end - c.start);
          // Select clips that overlap with the range
          if (clipEnd >= startPos && clipStart <= endPos) {
            selectClip(c.id, true);
          }
        });
      }
    } else {
      // Normal multi-select behavior (Cmd/Ctrl toggles selection)
      const isMulti = e.metaKey || e.ctrlKey;
      selectClip(clip.id, isMulti);
    }

    setSelectedTextOverlayId(null);
  };

  // Click to select text overlay
  const handleTextOverlayClick = (e: React.MouseEvent, overlay: TextOverlay): void => {
    e.stopPropagation();
    setSelectedTextOverlayId(overlay.id);
    clearSelection();
  };

  // Split clip at playhead - memoized
  const handleSplitAtPlayhead = useCallback((): void => {
    if (!timeline || !timeline.clips || !splitClipAtTime) return;
    const clipAtPlayhead = timeline.clips.find((clip): boolean => {
      const clipStart = clip.timelinePosition;
      const clipEnd = clipStart + (clip.end - clip.start);
      return currentTime > clipStart && currentTime < clipEnd;
    });
    if (clipAtPlayhead) {
      splitClipAtTime(clipAtPlayhead.id, currentTime);
    }
  }, [timeline, splitClipAtTime, currentTime]);

  // Timeline click to set playhead
  const handleTimelineClick = (e: React.MouseEvent): void => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const time = Math.max(0, clickX / zoom);
    setCurrentTime(time);
    clearSelection();
    setSelectedTextOverlayId(null);
  };

  // Check if playhead is over any clip (for split button) - memoized with optimized check
  // Only re-calculate when currentTime or clips array changes
  const clipAtPlayhead = React.useMemo((): Clip | undefined => {
    if (!clips.length) return undefined;

    // Binary search optimization for large clip arrays
    // Sort clips by timeline position for efficient lookup
    const sortedClips = [...clips].sort((a, b): number => a.timelinePosition - b.timelinePosition);

    // Find clip using linear search (binary search not worth it for typical clip counts)
    return sortedClips.find((clip): boolean => {
      const clipStart = clip.timelinePosition;
      const clipEnd = clipStart + (clip.end - clip.start);
      return currentTime >= clipStart && currentTime <= clipEnd;
    });
  }, [clips, currentTime]);

  // Close context menu when clicking elsewhere
  useEffect((): (() => void) | undefined => {
    const handleClick = (): void => setContextMenu(null);
    if (contextMenu && typeof window !== 'undefined') {
      window.addEventListener('click', handleClick);
      return (): void => window.removeEventListener('click', handleClick);
    }
    return undefined;
  }, [contextMenu]);

  const handleClipContextMenu = useCallback((e: React.MouseEvent, clip: Clip): void => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ clipId: clip.id, x: e.clientX, y: e.clientY });
  }, []);

  // Keyboard shortcut for opening help panel ("?" key)
  useEffect((): (() => void) | undefined => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // "?" key opens keyboard shortcuts panel
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return (): void => window.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, []);

  if (!timeline || clips.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-neutral-300 bg-white/60 p-8 text-center">
        <p className="text-sm font-medium text-neutral-600">
          Add clips from the assets panel to build your timeline
        </p>
      </div>
    );
  }

  const timelineWidth = timelineDuration * zoom;

  // Handler for minimap pan
  const handleMinimapPan = useCallback((newScrollLeft: number): void => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = newScrollLeft;
    }
  }, []);

  // Handler for minimap seek
  const handleMinimapSeek = useCallback(
    (time: number): void => {
      setCurrentTime(time);
    },
    [setCurrentTime]
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Controls */}
      <TimelineControls
        zoom={zoom}
        currentTime={currentTime}
        timelineDuration={timelineDuration}
        canUndo={canUndo}
        canRedo={canRedo}
        clipAtPlayhead={!!clipAtPlayhead}
        sceneDetectPending={sceneDetectPending}
        upscaleVideoPending={upscaleVideoPending}
        autoScrollEnabled={autoScrollEnabled}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onUndo={undo}
        onRedo={redo}
        onSplitAtPlayhead={handleSplitAtPlayhead}
        onDetectScenes={onDetectScenes}
        onAddText={onAddText}
        onAddTransition={onAddTransition}
        onUpscaleVideo={onUpscaleVideo}
        onToggleAutoScroll={toggleAutoScroll}
      />

      {/* Minimap for timeline navigation */}
      {clips.length > 0 && (
        <TimelineMinimap
          clips={clips}
          timelineDuration={timelineDuration}
          scrollLeft={scrollLeft}
          viewportWidth={viewportWidth}
          zoom={zoom}
          numTracks={numTracks}
          onSeek={handleMinimapSeek}
          onPan={handleMinimapPan}
        />
      )}

      {/* Timeline Container */}
      <div
        ref={scrollContainerRef}
        className="rounded-xl border-2 border-neutral-200 bg-white shadow-sm overflow-auto"
      >
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
            textOverlays={textOverlays}
            selectedTextOverlayId={selectedTextOverlayId}
            zoom={zoom}
            timelineWidth={timelineWidth}
            onTextOverlayClick={handleTextOverlayClick}
            onRemoveTextOverlay={removeTextOverlay}
            onTimelineClick={handleTimelineClick}
            onUpdateTextOverlay={updateTextOverlay}
          />

          {/* Tracks */}
          <div
            ref={containerRef}
            className="relative"
            style={{ minWidth: timelineWidth, height: numTracks * TRACK_HEIGHT }}
            onClick={handleTimelineClick}
            onKeyDown={(e): void => {
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
              clips={clips}
              onAddTrack={(): void => setForcedTrackCount(numTracks + 1)}
              onRemoveTrack={(): void => setForcedTrackCount(Math.max(MIN_TRACKS, numTracks - 1))}
            />

            {/* Clips - Virtualized rendering */}
            {visibleClips.map((clip): React.ReactElement => (
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

            {/* Snap Guides - Visual feedback during dragging */}
            <TimelineSnapGuides
              snapInfo={snapInfo}
              zoom={zoom}
              timelineHeight={numTracks * TRACK_HEIGHT}
            />

            {/* Rubber Band Selection Rectangle */}
            <TimelineSelectionRectangle selectionRect={selectionRect} />

            {/* Trim Preview Overlay - Visual feedback during trimming */}
            <TimelineTrimOverlay trimInfo={trimPreviewInfo} />
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
          onAddTransition={onAddTransition ? (): void => onAddTransition() : undefined}
          onSelectAllInTrack={(trackIndex): void => selectAllClipsInTrack(trackIndex, true)}
          onClose={(): void => setContextMenu(null)}
        />
      )}

      {/* Keyboard Shortcuts Panel */}
      <KeyboardShortcutsPanel
        open={showKeyboardShortcuts}
        onOpenChange={setShowKeyboardShortcuts}
      />

      {/* Edit Mode Feedback - Shows current trimming mode and keyboard modifiers */}
      {trimPreviewInfo && (
        <EditModeFeedback
          currentMode={currentEditMode || 'normal'}
          feedback={trimFeedback}
          modifiers={editModeModifiers || { shift: false, alt: false, cmd: false, ctrl: false }}
        />
      )}
    </div>
  );
}

export default HorizontalTimeline;
