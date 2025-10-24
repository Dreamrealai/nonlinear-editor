'use client';

import React from 'react';
import type { TextOverlay } from '@/types/timeline';

type TimelineTextOverlayRendererProps = {
  overlay: TextOverlay;
  zoom: number;
  isSelected: boolean;
  onClick: (e: React.MouseEvent, overlay: TextOverlay) => void;
  onRemove: (id: string) => void;
};

/**
 * Memoized text overlay renderer for timeline
 * Renders text overlays with duration, position, and controls
 */
export const TimelineTextOverlayRenderer = React.memo<TimelineTextOverlayRendererProps>(
  function TimelineTextOverlayRenderer({ overlay, zoom, isSelected, onClick, onRemove }) {
    const overlayWidth = overlay.duration * zoom;
    const overlayLeft = overlay.timelinePosition * zoom;

    return (
      <div
        className={`absolute rounded-lg border-2 overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
          isSelected
            ? 'border-purple-400 ring-2 ring-purple-400/50'
            : 'border-purple-500 hover:border-purple-600'
        }`}
        style={{
          left: overlayLeft,
          top: 8,
          width: overlayWidth,
          height: 40,
          backgroundColor: 'rgba(147, 51, 234, 0.15)', // purple with transparency
        }}
        onClick={(e) => onClick(e, overlay)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(e as unknown as React.MouseEvent<HTMLDivElement>, overlay);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Text overlay: ${overlay.text}`}
      >
        <div className="relative h-full w-full select-none">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-300/30 via-purple-200/20 to-purple-300/30" />

          <div className="absolute inset-0 flex h-full items-center justify-between px-2 text-purple-900 pointer-events-none">
            <div className="min-w-0 flex-1 flex items-center gap-1">
              <svg
                className="h-3 w-3 flex-shrink-0"
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
              <p className="truncate text-xs font-semibold">{overlay.text}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRemove(overlay.id);
              }}
              className="flex-shrink-0 rounded bg-white/30 p-0.5 text-purple-900 hover:bg-red-500 hover:text-white pointer-events-auto"
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

          <div className="absolute bottom-0 left-0 right-0 text-center pointer-events-none">
            <p className="text-[9px] font-medium text-purple-900/70">
              {overlay.duration.toFixed(1)}s
            </p>
          </div>
        </div>
      </div>
    );
  }
);
