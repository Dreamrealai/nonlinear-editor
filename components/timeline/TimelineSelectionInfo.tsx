/**
 * TimelineSelectionInfo Component
 *
 * Displays information about the current selection
 * Shows count of selected clips and selection hints
 */
'use client';

import React from 'react';

type TimelineSelectionInfoProps = {
  selectedCount: number;
  showModifierHints?: boolean;
};

export const TimelineSelectionInfo: React.FC<TimelineSelectionInfoProps> = ({
  selectedCount,
  showModifierHints = false,
}): React.ReactElement | null => {
  if (selectedCount === 0 && !showModifierHints) return null;

  const isMac = typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
  const cmdKey = isMac ? 'Cmd' : 'Ctrl';

  return (
    <div className="flex items-center gap-4 text-xs text-neutral-600">
      {/* Selection Count */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
          <svg
            className="h-4 w-4 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span className="font-medium text-blue-700">
            {selectedCount} {selectedCount === 1 ? 'clip' : 'clips'} selected
          </span>
        </div>
      )}

      {/* Modifier Key Hints */}
      {showModifierHints && (
        <div className="flex items-center gap-3 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-md">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-xs font-mono shadow-sm">
              {cmdKey}
            </kbd>
            <span className="text-neutral-600">Toggle</span>
          </div>
          <div className="w-px h-4 bg-neutral-300" />
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-xs font-mono shadow-sm">
              Shift
            </kbd>
            <span className="text-neutral-600">Range</span>
          </div>
          <div className="w-px h-4 bg-neutral-300" />
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-600">Drag</span>
            <span className="text-neutral-500">to select area</span>
          </div>
        </div>
      )}
    </div>
  );
};
