'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Maximize2, Target } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type ZoomPreset = 25 | 50 | 100 | 200 | 400;

type ZoomPresetDropdownProps = {
  currentZoom: number;
  onFitToTimeline: () => void;
  onFitToSelection: () => void;
  onSetPreset: (preset: ZoomPreset) => void;
  hasSelection: boolean;
};

/**
 * Zoom preset dropdown component
 * Provides quick access to zoom presets and fit commands
 */
export const ZoomPresetDropdown = React.memo<ZoomPresetDropdownProps>(function ZoomPresetDropdown({
  currentZoom,
  onFitToTimeline,
  onFitToSelection,
  onSetPreset,
  hasSelection,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate current zoom percentage (based on DEFAULT_ZOOM = 50 px/s)
  const DEFAULT_ZOOM = 50;
  const zoomPercentage = Math.round((currentZoom / DEFAULT_ZOOM) * 100);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  const presets: ZoomPreset[] = [25, 50, 100, 200, 400];

  const handlePresetClick = (preset: ZoomPreset) => {
    onSetPreset(preset);
    setIsOpen(false);
  };

  const handleFitToTimeline = () => {
    onFitToTimeline();
    setIsOpen(false);
  };

  const handleFitToSelection = () => {
    onFitToSelection();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        title="Zoom presets"
        aria-label="Zoom presets dropdown"
        className="flex items-center gap-1 px-2 text-xs font-mono"
      >
        <span>{zoomPercentage}%</span>
        <ChevronDown className="h-3 w-3" />
      </Button>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 min-w-[180px] rounded-md border border-neutral-200 bg-white shadow-lg py-1"
          role="menu"
          aria-label="Zoom preset menu"
        >
          {/* Fit Commands */}
          <button
            onClick={handleFitToTimeline}
            className="w-full px-3 py-2 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 flex items-center gap-2"
            role="menuitem"
          >
            <Maximize2 className="h-4 w-4" />
            <span>Fit to Timeline</span>
            <span className="ml-auto text-xs text-neutral-500">Cmd+1</span>
          </button>
          <button
            onClick={handleFitToSelection}
            disabled={!hasSelection}
            className="w-full px-3 py-2 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            role="menuitem"
          >
            <Target className="h-4 w-4" />
            <span>Fit to Selection</span>
            <span className="ml-auto text-xs text-neutral-500">Cmd+2</span>
          </button>

          <div className="my-1 h-px bg-neutral-200" />

          {/* Preset Percentages */}
          <div className="px-3 py-1 text-xs font-semibold text-neutral-500 uppercase">
            Zoom Presets
          </div>
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetClick(preset)}
              className={`w-full px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-neutral-100 flex items-center ${
                preset === Math.round((currentZoom / DEFAULT_ZOOM) * 100)
                  ? 'bg-neutral-50 text-neutral-900'
                  : 'text-neutral-700'
              }`}
              role="menuitem"
            >
              <span>{preset}%</span>
              {preset === 100 && <span className="ml-2 text-xs text-neutral-500">(Default)</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
