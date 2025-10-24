/**
 * TimelineSelectionRectangle Component
 *
 * Displays a visual rectangle during rubber-band selection
 * Shows the area being selected by dragging on the timeline
 */
'use client';

import React from 'react';

type SelectionRect = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

type TimelineSelectionRectangleProps = {
  selectionRect: SelectionRect | null;
};

export const TimelineSelectionRectangle: React.FC<TimelineSelectionRectangleProps> = ({
  selectionRect,
}) => {
  if (!selectionRect) return null;

  const { startX, startY, endX, endY } = selectionRect;

  // Calculate rectangle bounds (handle dragging in any direction)
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  return (
    <div
      className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/10 rounded-sm z-50"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
      aria-label="Selection rectangle"
    />
  );
};
