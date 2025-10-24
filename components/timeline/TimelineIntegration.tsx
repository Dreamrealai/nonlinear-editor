/**
 * TimelineIntegration
 *
 * Helper component to integrate markers, guides, and zoom presets into HorizontalTimeline
 * This file provides the handlers and integration points for the new features
 */
'use client';

import { useEditorStore } from '@/state/useEditorStore';
import { useCallback } from 'react';
import type { Marker } from '@/types/timeline';

export function useTimelineIntegration(): {
  handleAddMarker: () => void;
  handleMarkerClick: (markerId: string) => void;
  handleMarkerDelete: (markerId: string) => void;
  handleMarkerUpdate: (markerId: string, updates: Partial<Marker>) => void;
  handleAddGuide: () => void;
  handleGuideUpdate: (guideId: string, time: number) => void;
  handleGuideDelete: (guideId: string) => void;
  handleZoomPreset: (preset: 25 | 50 | 100 | 200 | 400) => void;
  handleFitToTimeline: (viewportWidth: number) => void;
  handleFitToSelection: (viewportWidth: number) => void;
  hasSelection: boolean;
} {
  // Get store actions
  const {
    addMarker,
    removeMarker,
    updateMarker,
    jumpToMarker,
    addGuide,
    updateGuide,
    deleteGuide,
    setZoomPreset,
    fitToTimeline,
    fitToSelection,
    currentTime,
    selectedClipIds,
  } = useEditorStore((state) => ({
    addMarker: state.addMarker,
    removeMarker: state.removeMarker,
    updateMarker: state.updateMarker,
    jumpToMarker: state.jumpToMarker,
    addGuide: state.addGuide,
    updateGuide: state.updateGuide,
    deleteGuide: state.deleteGuide,
    setZoomPreset: state.setZoomPreset,
    fitToTimeline: state.fitToTimeline,
    fitToSelection: state.fitToSelection,
    currentTime: state.currentTime,
    selectedClipIds: state.selectedClipIds,
  }));

  // Add marker at current playhead position
  const handleAddMarker = useCallback((): void => {
    const markerId = `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    addMarker({
      id: markerId,
      time: currentTime,
      label: `Marker ${new Date().toLocaleTimeString()}`,
      color: '#3b82f6', // Blue color
    });
  }, [addMarker, currentTime]);

  // Add guide at current playhead position
  const handleAddGuide = useCallback((): void => {
    addGuide(currentTime);
  }, [addGuide, currentTime]);

  // Zoom preset handlers
  const handleZoomPreset = useCallback((preset: 25 | 50 | 100 | 200 | 400): void => {
    setZoomPreset(preset);
  }, [setZoomPreset]);

  const handleFitToTimeline = useCallback((viewportWidth: number): void => {
    fitToTimeline(viewportWidth);
  }, [fitToTimeline]);

  const handleFitToSelection = useCallback((viewportWidth: number): void => {
    fitToSelection(viewportWidth);
  }, [fitToSelection]);

  return {
    // Marker handlers
    handleAddMarker,
    handleMarkerClick: jumpToMarker,
    handleMarkerDelete: removeMarker,
    handleMarkerUpdate: updateMarker,

    // Guide handlers
    handleAddGuide,
    handleGuideUpdate: updateGuide,
    handleGuideDelete: deleteGuide,

    // Zoom handlers
    handleZoomPreset,
    handleFitToTimeline,
    handleFitToSelection,

    // Selection state
    hasSelection: selectedClipIds.size > 0,
  };
}
