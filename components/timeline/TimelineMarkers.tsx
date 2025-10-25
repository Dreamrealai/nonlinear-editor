/**
 * TimelineMarkers Component
 *
 * Renders user-created markers on the timeline
 * - Visual marker indicators at specific timeline positions
 * - Marker labels and colors
 * - Clickable to jump to marker position
 * - Right-click context menu for editing/deleting
 */
'use client';

import React, { useState } from 'react';
import type { Marker } from '@/types/timeline';
import { Bookmark, Edit2, Trash2 } from 'lucide-react';

type TimelineMarkersProps = {
  markers: Marker[];
  zoom: number;
  currentTime: number;
  onMarkerClick: (markerId: string) => void;
  onMarkerDelete?: (markerId: string) => void;
  onMarkerUpdate?: (markerId: string, patch: Partial<Marker>) => void;
};

export const TimelineMarkers = React.memo<TimelineMarkersProps>(function TimelineMarkers({
  markers,
  zoom,
  currentTime,
  onMarkerClick,
  onMarkerDelete,
  onMarkerUpdate,
}): React.ReactElement {
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [contextMenu, setContextMenu] = useState<{ markerId: string; x: number; y: number } | null>(
    null
  );

  // Handle marker right-click
  const handleContextMenu = (e: React.MouseEvent, markerId: string): void => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ markerId, x: e.clientX, y: e.clientY });
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

  // Start editing marker
  const handleStartEdit = (marker: Marker): void => {
    setEditingMarkerId(marker.id);
    setEditLabel(marker.label);
    setContextMenu(null);
  };

  // Save marker edit
  const handleSaveEdit = (markerId: string): void => {
    if (onMarkerUpdate && editLabel.trim()) {
      onMarkerUpdate(markerId, { label: editLabel.trim() });
    }
    setEditingMarkerId(null);
    setEditLabel('');
  };

  // Cancel marker edit
  const handleCancelEdit = (): void => {
    setEditingMarkerId(null);
    setEditLabel('');
  };

  return (
    <>
      {/* Markers */}
      {markers.map((marker): React.ReactElement => {
        const markerLeft = marker.time * zoom;
        const isActive = Math.abs(currentTime - marker.time) < 0.1; // Within 0.1 seconds
        const markerColor = marker.color || '#3b82f6'; // Default blue

        return (
          <div
            key={marker.id}
            className="absolute top-0 bottom-0 pointer-events-auto"
            style={{ left: `${markerLeft}px` }}
          >
            {/* Marker line */}
            <button
              className={`absolute top-0 bottom-0 w-0.5 cursor-pointer transition-all border-none p-0 ${
                isActive ? 'opacity-100' : 'opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: markerColor }}
              onClick={(): void => onMarkerClick(marker.id)}
              onContextMenu={(e): void => handleContextMenu(e, marker.id)}
              aria-label={`Jump to marker: ${marker.label}`}
            />

            {/* Marker icon/flag at top */}
            <button
              className={`absolute -top-1 -left-2 w-4 h-4 cursor-pointer transition-all border-none bg-transparent p-0 ${
                isActive ? 'scale-110' : 'hover:scale-105'
              }`}
              style={{ color: markerColor }}
              onClick={(): void => onMarkerClick(marker.id)}
              onContextMenu={(e): void => handleContextMenu(e, marker.id)}
              title={marker.label}
              aria-label={`Marker: ${marker.label}`}
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>

            {/* Marker label */}
            {editingMarkerId === marker.id ? (
              <div className="absolute top-6 -left-16 w-32 bg-white dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-600 shadow-lg p-2 z-50">
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e): void => setEditLabel(e.target.value)}
                  onKeyDown={(e): void => {
                    if (e.key === 'Enter') handleSaveEdit(marker.id);
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={(): void => handleSaveEdit(marker.id)}
                    className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 px-2 py-1 text-xs bg-neutral-300 dark:bg-neutral-600 rounded hover:bg-neutral-400 dark:hover:bg-neutral-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className={`absolute top-6 left-0 -translate-x-1/2 px-2 py-0.5 bg-white dark:bg-neutral-800 rounded border text-xs whitespace-nowrap cursor-pointer transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ borderColor: markerColor, color: markerColor }}
                onClick={(): void => onMarkerClick(marker.id)}
                aria-label={`Jump to marker: ${marker.label}`}
              >
                {marker.label}
              </button>
            )}
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
            onClick={(): void => {
              const marker = markers.find((m): boolean => m.id === contextMenu.markerId);
              if (marker) handleStartEdit(marker);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit Marker
          </button>
          {onMarkerDelete && (
            <button
              onClick={(): void => {
                onMarkerDelete(contextMenu.markerId);
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Marker
            </button>
          )}
        </div>
      )}
    </>
  );
});
