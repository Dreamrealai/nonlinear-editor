'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CaseSensitive } from 'lucide-react';
import type { TextOverlay } from '@/types/timeline';
import { TimelineTextOverlayRenderer } from './TimelineTextOverlayRenderer';

interface TimelineTextOverlayTrackProps {
  textOverlays: TextOverlay[];
  selectedTextOverlayId: string | null;
  zoom: number;
  timelineWidth: number;
  onTextOverlayClick: (e: React.MouseEvent, overlay: TextOverlay) => void;
  onRemoveTextOverlay: (id: string) => void;
  onTimelineClick: (e: React.MouseEvent) => void;
  onUpdateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
}

type DraggingState = {
  overlayId: string;
  startX: number;
  startPosition: number;
};

type TrimmingState = {
  overlayId: string;
  handle: 'left' | 'right';
  startX: number;
  originalPosition: number;
  originalDuration: number;
};

/**
 * Timeline text overlay track component
 * Renders all text overlays with interactive controls
 * Supports drag to reposition and trim handles to resize
 */
export const TimelineTextOverlayTrack = React.memo(function TimelineTextOverlayTrack(
  props: TimelineTextOverlayTrackProps
): React.ReactElement {
  const {
    textOverlays,
    selectedTextOverlayId,
    zoom,
    timelineWidth,
    onTextOverlayClick,
    onRemoveTextOverlay,
    onTimelineClick,
    onUpdateTextOverlay,
  } = props;

  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [trimming, setTrimming] = useState<TrimmingState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle dragging text overlay position
  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent, overlay: TextOverlay): void => {
      if (!containerRef.current) return;
      e.stopPropagation();

      const rect = containerRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;

      setDragging({
        overlayId: overlay.id,
        startX,
        startPosition: overlay.timelinePosition,
      });

      // Also select the overlay
      onTextOverlayClick(e, overlay);
    },
    [onTextOverlayClick]
  );

  // Handle trimming text overlay duration
  const handleTrimMouseDown = useCallback(
    (e: React.MouseEvent, overlay: TextOverlay, handle: 'left' | 'right'): void => {
      if (!containerRef.current) return;
      e.stopPropagation();
      e.preventDefault();

      const rect = containerRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;

      setTrimming({
        overlayId: overlay.id,
        handle,
        startX,
        originalPosition: overlay.timelinePosition,
        originalDuration: overlay.duration,
      });

      // Also select the overlay
      onTextOverlayClick(e, overlay);
    },
    [onTextOverlayClick]
  );

  // Mouse move handler for dragging and trimming
  useEffect((): (() => void) | undefined => {
    if (!dragging && !trimming) return;

    const handleMouseMove = (e: MouseEvent): void => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;

      if (dragging) {
        // Calculate new position
        const deltaX = currentX - dragging.startX;
        const deltaTime = deltaX / zoom;
        const newPosition = Math.max(0, dragging.startPosition + deltaTime);

        onUpdateTextOverlay(dragging.overlayId, {
          timelinePosition: newPosition,
        });
      } else if (trimming) {
        const deltaX = currentX - trimming.startX;
        const deltaTime = deltaX / zoom;

        if (trimming.handle === 'left') {
          // Trim left: adjust start position and duration
          const newPosition = Math.max(0, trimming.originalPosition + deltaTime);
          const positionChange = newPosition - trimming.originalPosition;
          const newDuration = Math.max(0.5, trimming.originalDuration - positionChange);

          onUpdateTextOverlay(trimming.overlayId, {
            timelinePosition: newPosition,
            duration: newDuration,
          });
        } else {
          // Trim right: adjust duration only
          const newDuration = Math.max(0.5, trimming.originalDuration + deltaTime);

          onUpdateTextOverlay(trimming.overlayId, {
            duration: newDuration,
          });
        }
      }
    };

    const handleMouseUp = (): void => {
      setDragging(null);
      setTrimming(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return (): void => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, trimming, zoom, onUpdateTextOverlay]);

  return (
    <div
      ref={containerRef}
      style={{ top: 0, height: 48, minWidth: timelineWidth }}
      className="relative border-b-2 border-purple-300 bg-gradient-to-b from-purple-50 to-purple-100/50"
      onClick={onTimelineClick}
    >
      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-10">
        <CaseSensitive className="h-4 w-4 text-purple-600" />
        <span className="text-xs font-semibold text-purple-700">Text Overlays</span>
      </div>

      {/* Render text overlay clips */}
      {textOverlays.map(
        (overlay): React.ReactElement => (
          <TimelineTextOverlayRenderer
            key={overlay.id}
            overlay={overlay}
            zoom={zoom}
            isSelected={selectedTextOverlayId === overlay.id}
            onClick={onTextOverlayClick}
            onRemove={onRemoveTextOverlay}
            onMouseDown={handleOverlayMouseDown}
            onTrimMouseDown={handleTrimMouseDown}
          />
        )
      )}
    </div>
  );
});
