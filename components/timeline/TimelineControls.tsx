'use client';

import { formatTime } from '@/lib/utils/timelineUtils';
import React, { useState, useRef, useEffect } from 'react';
import {
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Scissors,
  Clapperboard,
  CaseSensitive,
  Wand2,
  Sparkles,
  Clock,
  MousePointerClick,
  Maximize2,
  ChevronDown,
  Bookmark,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { TimelineGridSettings } from './TimelineGridSettings';

type TimelineControlsProps = {
  zoom: number;
  currentTime: number;
  timelineDuration: number;
  canUndo: boolean;
  canRedo: boolean;
  clipAtPlayhead: boolean;
  sceneDetectPending?: boolean;
  upscaleVideoPending?: boolean;
  timecodeDisplayMode?: 'duration' | 'timecode';
  autoScrollEnabled?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange?: (zoom: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSplitAtPlayhead: () => void;
  onDetectScenes?: () => void;
  onAddText?: () => void;
  onAddTransition?: () => void;
  onUpscaleVideo?: () => void;
  onToggleTimecodeDisplay?: () => void;
  onToggleAutoScroll?: () => void;
  onZoomPreset?: (preset: 25 | 50 | 100 | 200 | 400) => void;
  onFitToTimeline?: () => void;
  onFitToSelection?: () => void;
  onAddMarker?: () => void;
  onShowHistory?: () => void;
  onShowKeyboardShortcuts?: () => void;
  hasSelection?: boolean;
};

/**
 * Timeline controls component
 * Renders all timeline control buttons and zoom controls
 */
export const TimelineControls = React.memo<TimelineControlsProps>(function TimelineControls({
  zoom,
  currentTime,
  timelineDuration,
  canUndo,
  canRedo,
  clipAtPlayhead,
  sceneDetectPending = false,
  upscaleVideoPending = false,
  timecodeDisplayMode = 'duration',
  autoScrollEnabled = true,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onUndo,
  onRedo,
  onSplitAtPlayhead,
  onDetectScenes,
  onAddText,
  onAddTransition,
  onUpscaleVideo,
  onToggleTimecodeDisplay,
  onToggleAutoScroll,
  onZoomPreset,
  onFitToTimeline,
  onFitToSelection,
  onAddMarker,
  onShowHistory,
  onShowKeyboardShortcuts: _onShowKeyboardShortcuts,
  hasSelection = false,
}): React.ReactElement {
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const zoomMenuRef = useRef<HTMLDivElement>(null);

  // Determine keyboard shortcut based on platform
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const undoShortcut = isMac ? 'Cmd+Z' : 'Ctrl+Z';
  const redoShortcut = isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y';

  // Close zoom menu when clicking outside
  useEffect((): (() => void) | undefined => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(event.target as Node)) {
        setShowZoomMenu(false);
      }
    };

    if (showZoomMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return (): void => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [showZoomMenu]);
  return (
    <div className="flex items-center justify-between rounded-lg bg-neutral-100 px-2 sm:px-4 py-2 overflow-x-auto">
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            onClick={onUndo}
            disabled={!canUndo}
            variant="outline"
            size="icon"
            title={`Undo (${undoShortcut})`}
            aria-label="Undo last action"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <Undo className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button
            onClick={onRedo}
            disabled={!canRedo}
            variant="outline"
            size="icon"
            title={`Redo (${redoShortcut})`}
            aria-label="Redo previously undone action"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <Redo className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          {onShowHistory && (
            <Button
              onClick={onShowHistory}
              variant="outline"
              size="icon"
              title="Show edit history"
              aria-label="Show edit history"
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          )}
        </div>

        <div className="h-4 w-px bg-neutral-300" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 sm:gap-2 relative">
          <span className="hidden sm:inline text-xs font-medium text-neutral-600">Zoom:</span>
          <Button
            onClick={onZoomOut}
            variant="outline"
            size="icon"
            title="Zoom out (Cmd+-)"
            aria-label="Zoom out"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>

          {/* Zoom Slider - Hidden on mobile */}
          {onZoomChange && (
            <input
              type="range"
              min="10"
              max="200"
              value={zoom}
              onChange={(e): void => {
                const newZoom = parseFloat(e.target.value);
                onZoomChange(newZoom);
              }}
              className="hidden lg:block w-20 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
              title={`Zoom: ${Math.round((zoom / 50) * 100)}%`}
              aria-label="Zoom slider"
            />
          )}

          <span className="text-xs font-mono text-neutral-700 min-w-[3rem] text-center">{Math.round((zoom / 50) * 100)}%</span>
          <Button
            onClick={onZoomIn}
            variant="outline"
            size="icon"
            title="Zoom in (Cmd+=)"
            aria-label="Zoom in"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          {/* Zoom Presets Menu */}
          <div ref={zoomMenuRef} className="relative">
            <Button
              onClick={(): void => setShowZoomMenu(!showZoomMenu)}
              variant="outline"
              size="icon"
              title="Zoom presets"
              aria-label="Zoom presets menu"
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            {showZoomMenu && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50 py-1">
                {onZoomPreset && (
                  <>
                    <button
                      onClick={(): void => {
                        onZoomPreset(25);
                        setShowZoomMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      25%
                    </button>
                    <button
                      onClick={(): void => {
                        onZoomPreset(50);
                        setShowZoomMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      50%
                    </button>
                    <button
                      onClick={(): void => {
                        onZoomPreset(100);
                        setShowZoomMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      100% (Default)
                    </button>
                    <button
                      onClick={(): void => {
                        onZoomPreset(200);
                        setShowZoomMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      200%
                    </button>
                    <button
                      onClick={(): void => {
                        onZoomPreset(400);
                        setShowZoomMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      400%
                    </button>
                  </>
                )}
                {onFitToTimeline && (
                  <>
                    <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />
                    <button
                      onClick={(): void => {
                        onFitToTimeline();
                        setShowZoomMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Fit Timeline
                    </button>
                  </>
                )}
                {onFitToSelection && hasSelection && (
                  <button
                    onClick={(): void => {
                      onFitToSelection();
                      setShowZoomMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    Fit Selection
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="h-4 w-px bg-neutral-300" />

        {/* Grid Settings */}
        <TimelineGridSettings className="hidden sm:block" />

        <div className="h-4 w-px bg-neutral-300" />

        {/* Split Button */}
        <Button
          onClick={onSplitAtPlayhead}
          disabled={!clipAtPlayhead}
          variant="outline"
          size="icon"
          title="Split clip at playhead (S)"
          aria-label="Split clip at playhead"
          className="h-8 w-8 sm:h-9 sm:w-9"
        >
          <Scissors className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>

        {/* Add Marker Button */}
        {onAddMarker && (
          <>
            <div className="h-4 w-px bg-neutral-300" />
            <Button
              onClick={onAddMarker}
              variant="outline"
              size="icon"
              title="Add marker at playhead (M)"
              aria-label="Add marker at playhead"
              className="h-8 w-8 sm:h-9 sm:w-9 bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
            >
              <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </>
        )}

        {/* Scene Detection - Hidden on small screens */}
        {onDetectScenes && (
          <>
            <div className="hidden md:block h-4 w-px bg-neutral-300" />
            <Button
              onClick={onDetectScenes}
              disabled={sceneDetectPending}
              variant="outline"
              size="icon"
              title="Detect scenes in video"
              aria-label={sceneDetectPending ? 'Detecting scenes...' : 'Detect scenes in video'}
              className="hidden md:inline-flex h-8 w-8 sm:h-9 sm:w-9"
            >
              {sceneDetectPending ? (
                <LoadingSpinner size={16} />
              ) : (
                <Clapperboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
            </Button>
          </>
        )}

        {/* Add Text - Hidden on small screens */}
        {onAddText && (
          <>
            <div className="hidden lg:block h-4 w-px bg-neutral-300" />
            <Button
              onClick={onAddText}
              variant="outline"
              size="icon"
              className="hidden lg:inline-flex bg-purple-600 text-white hover:bg-purple-700 hover:text-white h-8 w-8 sm:h-9 sm:w-9"
              title="Add text overlay"
              aria-label="Add text overlay"
            >
              <CaseSensitive className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </>
        )}

        {/* Add Transition - Hidden on small screens */}
        {onAddTransition && (
          <>
            <div className="hidden lg:block h-4 w-px bg-neutral-300" />
            <Button
              onClick={onAddTransition}
              variant="outline"
              size="icon"
              className="hidden lg:inline-flex bg-amber-600 text-white hover:bg-amber-700 hover:text-white h-8 w-8 sm:h-9 sm:w-9"
              title="Add transition to selected clips"
              aria-label="Add transition to selected clips"
            >
              <Wand2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </>
        )}

        {/* Upscale Video - Hidden on small screens */}
        {onUpscaleVideo && (
          <>
            <div className="hidden lg:block h-4 w-px bg-neutral-300" />
            <Button
              onClick={onUpscaleVideo}
              disabled={upscaleVideoPending}
              variant="outline"
              size="icon"
              className="hidden lg:inline-flex bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 h-8 w-8 sm:h-9 sm:w-9"
              title="Upscale selected video clip using Topaz AI"
              aria-label={
                upscaleVideoPending
                  ? 'Upscaling selected video clip using Topaz AI'
                  : 'Upscale selected video clip using Topaz AI'
              }
            >
              {upscaleVideoPending ? (
                <LoadingSpinner size={16} />
              ) : (
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
            </Button>
          </>
        )}

        {/* Timecode Display Toggle - Hidden on small screens */}
        {onToggleTimecodeDisplay && (
          <>
            <div className="hidden md:block h-4 w-px bg-neutral-300" />
            <Button
              onClick={onToggleTimecodeDisplay}
              variant="outline"
              size="icon"
              className={`hidden md:inline-flex h-8 w-8 sm:h-9 sm:w-9 ${timecodeDisplayMode === 'timecode' ? 'bg-blue-100' : ''}`}
              title={`Toggle timecode display (current: ${timecodeDisplayMode === 'timecode' ? 'Timecode' : 'Duration'})`}
              aria-label="Toggle timecode display mode"
            >
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </>
        )}

        {/* Auto-Scroll Toggle - Hidden on small screens */}
        {onToggleAutoScroll && (
          <>
            <div className="hidden md:block h-4 w-px bg-neutral-300" />
            <Button
              onClick={onToggleAutoScroll}
              variant="outline"
              size="icon"
              className={`hidden md:inline-flex h-8 w-8 sm:h-9 sm:w-9 ${autoScrollEnabled ? 'bg-green-100' : ''}`}
              title={`Auto-scroll during playback ${autoScrollEnabled ? 'enabled' : 'disabled'} - Click to toggle`}
              aria-label={`Auto-scroll ${autoScrollEnabled ? 'enabled' : 'disabled'}`}
            >
              <MousePointerClick className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Time Display */}
      <div className="text-[10px] sm:text-xs font-mono text-neutral-600 whitespace-nowrap">
        {formatTime(currentTime)} / {formatTime(timelineDuration)}
      </div>
    </div>
  );
});
