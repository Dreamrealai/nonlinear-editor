'use client';

import { formatTime } from '@/lib/utils/timelineUtils';
import React from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

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
  onUndo: () => void;
  onRedo: () => void;
  onSplitAtPlayhead: () => void;
  onDetectScenes?: () => void;
  onAddText?: () => void;
  onAddTransition?: () => void;
  onUpscaleVideo?: () => void;
  onToggleTimecodeDisplay?: () => void;
  onToggleAutoScroll?: () => void;
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
  onUndo,
  onRedo,
  onSplitAtPlayhead,
  onDetectScenes,
  onAddText,
  onAddTransition,
  onUpscaleVideo,
  onToggleTimecodeDisplay,
  onToggleAutoScroll,
}) {
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
            title="Undo (Cmd+Z)"
            aria-label="Undo"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <Undo className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button
            onClick={onRedo}
            disabled={!canRedo}
            variant="outline"
            size="icon"
            title="Redo (Cmd+Shift+Z)"
            aria-label="Redo"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <Redo className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <div className="h-4 w-px bg-neutral-300" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="hidden sm:inline text-xs font-medium text-neutral-600">Zoom:</span>
          <Button
            onClick={onZoomOut}
            variant="outline"
            size="icon"
            title="Zoom out"
            aria-label="Zoom out"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <span className="text-xs font-mono text-neutral-700 min-w-[3rem] text-center">{Math.round(zoom)}px/s</span>
          <Button
            onClick={onZoomIn}
            variant="outline"
            size="icon"
            title="Zoom in"
            aria-label="Zoom in"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>

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
