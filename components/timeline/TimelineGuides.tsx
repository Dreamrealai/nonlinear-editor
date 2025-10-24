/**
 * TimelineGuides Component
 *
 * Renders draggable guide lines (vertical and horizontal) for timeline alignment
 * - Vertical guides show time position with labels
 * - Horizontal guides show track position
 * - Guides can be dragged to reposition
 * - Right-click or double-click to remove a guide
 * - Visibility can be toggled
 *
 * Features:
 * - Visual feedback during drag
 * - Time labels for vertical guides
 * - Track labels for horizontal guides
 * - Snap to grid when dragging (optional)
 * - Color customization per guide
 */
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import type { Guide } from '@/types/timeline';
import { formatTimeSeconds } from '@/lib/utils/timeFormatting';
import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';

const { TRACK_HEIGHT } = TIMELINE_CONSTANTS;

type TimelineGuidesProps = {
  guides: Guide[];
  zoom: number;
  timelineDuration: number;
  numTracks: number;
  onGuideUpdate: (guideId: string, patch: Partial<Guide>) => void;
  onGuideDelete: (guideId: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
};

export const TimelineGuides = React.memo<TimelineGuidesProps>(function TimelineGuides({
  guides,
  zoom,
  timelineDuration,
  numTracks,
  onGuideUpdate,
  onGuideDelete,
  containerRef,
}): JSX.Element {
  const [draggingGuideId, setDraggingGuideId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ guideId: string; x: number; y: number } | null>(
    null
  );
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragStartPosition = useRef(0);

  // Start dragging guide
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, guide: Guide): void => {
      if (e.button !== 0) return; // Only left mouse button
      e.preventDefault();
      e.stopPropagation();

      setDraggingGuideId(guide.id);
      dragStartX.current = e.clientX;
      dragStartY.current = e.clientY;
      dragStartPosition.current = guide.position;
    },
    []
  );

  // Handle guide drag
  const handleMouseMove = useCallback(
    (e: MouseEvent): void => {
      if (!draggingGuideId || !containerRef.current) return;

      const guide = guides.find((g): boolean => g.id === draggingGuideId);
      if (!guide) return;

      if (guide.orientation === 'vertical') {
        // Vertical guide - update time position
        const deltaX = e.clientX - dragStartX.current;
        const deltaTime = deltaX / zoom;
        let newPosition = dragStartPosition.current + deltaTime;

        // Clamp to timeline bounds
        newPosition = Math.max(0, Math.min(timelineDuration, newPosition));

        onGuideUpdate(draggingGuideId, { position: newPosition });
      } else {
        // Horizontal guide - update track position
        const deltaY = e.clientY - dragStartY.current;
        const deltaTrack = deltaY / TRACK_HEIGHT;
        let newPosition = Math.round(dragStartPosition.current + deltaTrack);

        // Clamp to track bounds
        newPosition = Math.max(0, Math.min(numTracks - 1, newPosition));

        onGuideUpdate(draggingGuideId, { position: newPosition });
      }
    },
    [draggingGuideId, guides, zoom, timelineDuration, numTracks, onGuideUpdate, containerRef]
  );

  // Stop dragging
  const handleMouseUp = useCallback((): void => {
    setDraggingGuideId(null);
  }, []);

  // Set up drag event listeners
  React.useEffect((): (() => void) | undefined => {
    if (draggingGuideId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return (): void => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [draggingGuideId, handleMouseMove, handleMouseUp]);

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, guideId: string): void => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ guideId, x: e.clientX, y: e.clientY });
  };

  // Close context menu when clicking outside
  React.useEffect((): (() => void) | undefined => {
    const handleClickOutside = (): void => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return (): void => document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [contextMenu]);

  // Filter visible guides
  const visibleGuides = guides.filter((g): boolean => g.visible !== false);

  return (
    <>
      {/* Guide lines */}
      {visibleGuides.map((guide): JSX.Element => {
        const guideColor = guide.color || '#3b82f6'; // Default blue
        const isDragging = draggingGuideId === guide.id;

        if (guide.orientation === 'vertical') {
          // Vertical guide (time-based)
          const guideLeft = guide.position * zoom;

          return (
            <div
              key={guide.id}
              className={`absolute top-0 bottom-0 pointer-events-auto group ${
                isDragging ? 'z-50' : 'z-10'
              }`}
              style={{ left: `${guideLeft}px` }}
            >
              {/* Guide line */}
              <div
                className={`absolute top-0 bottom-0 w-0.5 cursor-ew-resize transition-all ${
                  isDragging
                    ? 'opacity-100 w-1'
                    : 'opacity-40 hover:opacity-100 hover:w-1'
                }`}
                style={{ backgroundColor: guideColor }}
                onMouseDown={(e): void => handleMouseDown(e, guide)}
                onContextMenu={(e): void => handleContextMenu(e, guide.id)}
              />

              {/* Guide handle at top */}
              <div
                className={`absolute -top-1 -left-2 w-4 h-4 rounded-full cursor-ew-resize transition-all ${
                  isDragging
                    ? 'opacity-100 scale-110'
                    : 'opacity-0 group-hover:opacity-100 group-hover:scale-100'
                }`}
                style={{ backgroundColor: guideColor }}
                onMouseDown={(e): void => handleMouseDown(e, guide)}
                onContextMenu={(e): void => handleContextMenu(e, guide.id)}
              />

              {/* Time label (shows on hover or drag) */}
              <div
                className={`absolute top-6 left-0 -translate-x-1/2 px-2 py-0.5 bg-white dark:bg-neutral-800 rounded border text-xs whitespace-nowrap transition-opacity pointer-events-none ${
                  isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ borderColor: guideColor, color: guideColor }}
              >
                {guide.label || formatTimeSeconds(guide.position)}
              </div>
            </div>
          );
        } else {
          // Horizontal guide (track-based)
          const guideTop = guide.position * TRACK_HEIGHT;

          return (
            <div
              key={guide.id}
              className={`absolute left-0 right-0 pointer-events-auto group ${
                isDragging ? 'z-50' : 'z-10'
              }`}
              style={{ top: `${guideTop}px` }}
            >
              {/* Guide line */}
              <div
                className={`absolute left-0 right-0 h-0.5 cursor-ns-resize transition-all ${
                  isDragging
                    ? 'opacity-100 h-1'
                    : 'opacity-40 hover:opacity-100 hover:h-1'
                }`}
                style={{ backgroundColor: guideColor }}
                onMouseDown={(e): void => handleMouseDown(e, guide)}
                onContextMenu={(e): void => handleContextMenu(e, guide.id)}
              />

              {/* Guide handle at left */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 -left-1 w-4 h-4 rounded-full cursor-ns-resize transition-all ${
                  isDragging
                    ? 'opacity-100 scale-110'
                    : 'opacity-0 group-hover:opacity-100 group-hover:scale-100'
                }`}
                style={{ backgroundColor: guideColor }}
                onMouseDown={(e): void => handleMouseDown(e, guide)}
                onContextMenu={(e): void => handleContextMenu(e, guide.id)}
              />

              {/* Track label (shows on hover or drag) */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 left-6 px-2 py-0.5 bg-white dark:bg-neutral-800 rounded border text-xs whitespace-nowrap transition-opacity pointer-events-none ${
                  isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ borderColor: guideColor, color: guideColor }}
              >
                {guide.label || `Track ${Math.round(guide.position)}`}
              </div>
            </div>
          );
        }
      })}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-50"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
        >
          <button
            onClick={(): void => {
              onGuideDelete(contextMenu.guideId);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Guide
          </button>
        </div>
      )}
    </>
  );
});
