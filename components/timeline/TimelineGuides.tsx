/**
 * TimelineGuides Component
 *
 * Renders draggable guide lines on the timeline for precise alignment
 * - Vertical guide lines at user-defined positions
 * - Draggable to reposition
 * - Snapping support for clips
 * - Right-click to delete
 */
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Trash2 } from 'lucide-react';

export type Guide = {
  id: string;
  time: number; // Position in seconds
  color?: string; // Guide color (default purple)
};

type TimelineGuidesProps = {
  guides: Guide[];
  zoom: number;
  timelineDuration: number;
  onGuideUpdate: (guideId: string, time: number) => void;
  onGuideDelete: (guideId: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
};

export const TimelineGuides = React.memo<TimelineGuidesProps>(function TimelineGuides({
  guides,
  zoom,
  timelineDuration,
  onGuideUpdate,
  onGuideDelete,
  containerRef,
}) {
  const [draggingGuideId, setDraggingGuideId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ guideId: string; x: number; y: number } | null>(
    null
  );
  const dragStartX = useRef(0);
  const dragStartTime = useRef(0);

  // Start dragging guide
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, guide: Guide) => {
      if (e.button !== 0) return; // Only left mouse button
      e.preventDefault();
      e.stopPropagation();

      setDraggingGuideId(guide.id);
      dragStartX.current = e.clientX;
      dragStartTime.current = guide.time;
    },
    []
  );

  // Handle guide drag
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingGuideId || !containerRef.current) return;

      const deltaX = e.clientX - dragStartX.current;
      const deltaTime = deltaX / zoom;
      let newTime = dragStartTime.current + deltaTime;

      // Clamp to timeline bounds
      newTime = Math.max(0, Math.min(timelineDuration, newTime));

      onGuideUpdate(draggingGuideId, newTime);
    },
    [draggingGuideId, zoom, timelineDuration, onGuideUpdate, containerRef]
  );

  // Stop dragging
  const handleMouseUp = useCallback(() => {
    setDraggingGuideId(null);
  }, []);

  // Set up drag event listeners
  React.useEffect(() => {
    if (draggingGuideId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [draggingGuideId, handleMouseMove, handleMouseUp]);

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, guideId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ guideId, x: e.clientX, y: e.clientY });
  };

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [contextMenu]);

  return (
    <>
      {/* Guide lines */}
      {guides.map((guide) => {
        const guideLeft = guide.time * zoom;
        const guideColor = guide.color || '#a855f7'; // Default purple
        const isDragging = draggingGuideId === guide.id;

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
              onMouseDown={(e) => handleMouseDown(e, guide)}
              onContextMenu={(e) => handleContextMenu(e, guide.id)}
            />

            {/* Guide handle at top */}
            <div
              className={`absolute -top-1 -left-2 w-4 h-4 rounded-full cursor-ew-resize transition-all ${
                isDragging
                  ? 'opacity-100 scale-110'
                  : 'opacity-0 group-hover:opacity-100 group-hover:scale-100'
              }`}
              style={{ backgroundColor: guideColor }}
              onMouseDown={(e) => handleMouseDown(e, guide)}
              onContextMenu={(e) => handleContextMenu(e, guide.id)}
            />

            {/* Time label (shows on hover or drag) */}
            <div
              className={`absolute top-6 left-0 -translate-x-1/2 px-2 py-0.5 bg-white dark:bg-neutral-800 rounded border text-xs whitespace-nowrap transition-opacity pointer-events-none ${
                isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              style={{ borderColor: guideColor, color: guideColor }}
            >
              {guide.time.toFixed(2)}s
            </div>
          </div>
        );
      })}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-50"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
        >
          <button
            onClick={() => {
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
