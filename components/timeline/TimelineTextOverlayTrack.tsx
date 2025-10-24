'use client';

import type React from 'react';
import type { TextOverlay } from '@/types/timeline';
import { TimelineTextOverlayRenderer } from './TimelineTextOverlayRenderer';

type TimelineTextOverlayTrackProps = {
  textOverlays: TextOverlay[];
  selectedTextOverlayId: string | null;
  zoom: number;
  timelineWidth: number;
  onTextOverlayClick: (e: React.MouseEvent, overlay: TextOverlay) => void;
  onRemoveTextOverlay: (id: string) => void;
  onTimelineClick: (e: React.MouseEvent) => void;
};

/**
 * Timeline text overlay track component
 * Renders the dedicated track for text overlays above the main tracks
 */
export const TimelineTextOverlayTrack = React.memo<TimelineTextOverlayTrackProps>(
  function TimelineTextOverlayTrack({
    textOverlays,
    selectedTextOverlayId,
    zoom,
    timelineWidth,
    onTextOverlayClick,
    onRemoveTextOverlay,
    onTimelineClick,
  }) {
    if (textOverlays.length === 0) {
      return null;
    }

    return (
      <div
        className="relative border-b-2 border-purple-300 bg-gradient-to-b from-purple-50 to-purple-100/50"
        style={{ minWidth: timelineWidth, height: 56 }}
        onClick={onTimelineClick}
      >
        <div className="absolute left-2 top-2 flex items-center gap-2">
          <svg
            className="h-4 w-4 text-purple-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="text-xs font-semibold text-purple-700">Text Overlays</span>
        </div>

        {textOverlays.map((overlay) => (
          <TimelineTextOverlayRenderer
            key={overlay.id}
            overlay={overlay}
            zoom={zoom}
            isSelected={selectedTextOverlayId === overlay.id}
            onClick={onTextOverlayClick}
            onRemove={onRemoveTextOverlay}
          />
        ))}
      </div>
    );
  }
);
