'use client';

import React from 'react';
import { CaseSensitive } from 'lucide-react';
import type { TextOverlay } from '@/types/timeline';

interface TimelineTextOverlayTrackProps {
  textOverlays: TextOverlay[];
  selectedTextOverlayId: string | null;
  zoom: number;
  timelineWidth: number;
  onTextOverlayClick: (e: React.MouseEvent, overlay: TextOverlay) => void;
  onRemoveTextOverlay: (id: string) => void;
  onTimelineClick: (e: React.MouseEvent) => void;
}

/**
 * Timeline text overlay track background component
 * Visually groups text overlay clips
 */
export const TimelineTextOverlayTrack = React.memo(function TimelineTextOverlayTrack(
  _props: TimelineTextOverlayTrackProps
) {
  // Props are available for future implementation
  return (
    <div
      style={{ top: 0, height: 48 }}
      className="relative border-b-2 border-purple-300 bg-gradient-to-b from-purple-50 to-purple-100/50"
    >
      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <CaseSensitive className="h-4 w-4 text-purple-600" />
        <span className="text-xs font-semibold text-purple-700">Text Overlays</span>
      </div>
    </div>
  );
});
