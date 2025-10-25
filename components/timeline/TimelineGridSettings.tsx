'use client';

import React, { useState } from 'react';
import { Grid, Check } from 'lucide-react';
import { useEditorStore } from '@/state/useEditorStore';
import { cn } from '@/lib/utils';

/**
 * Timeline Grid Settings Component
 *
 * Allows users to customize grid snap intervals for precise timeline editing.
 * Features:
 * - Toggle snap on/off
 * - Preset grid intervals (0.01s, 0.1s, 0.5s, 1s, 5s)
 * - Custom interval input
 * - Visual feedback of current settings
 * - Keyboard shortcut hint (Cmd+Shift+S)
 */

const PRESET_INTERVALS = [
  { value: 0.01, label: '0.01s (10ms)' },
  { value: 0.1, label: '0.1s (100ms)' },
  { value: 0.5, label: '0.5s' },
  { value: 1, label: '1s' },
  { value: 5, label: '5s' },
] as const;

type TimelineGridSettingsProps = {
  className?: string;
};

export function TimelineGridSettings({ className }: TimelineGridSettingsProps): React.ReactElement {
  const snapEnabled = useEditorStore((state): boolean => state.snapEnabled);
  const snapGridInterval = useEditorStore((state): number => state.snapGridInterval);
  const toggleSnap = useEditorStore((state): () => void => state.toggleSnap);
  const setSnapGridInterval = useEditorStore((state): (interval: number) => void => state.setSnapGridInterval);

  const [isOpen, setIsOpen] = useState(false);
  const [customInterval, setCustomInterval] = useState('');

  const handlePresetClick = (value: number): void => {
    setSnapGridInterval(value);
    setCustomInterval('');
  };

  const handleCustomIntervalSubmit = (): void => {
    const value = parseFloat(customInterval);
    if (!isNaN(value) && value >= 0.01 && value <= 10) {
      setSnapGridInterval(value);
    } else {
      setCustomInterval('');
    }
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={(): void => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
          snapEnabled
            ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
            : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
        )}
        aria-label="Grid settings"
        aria-expanded={isOpen}
      >
        <Grid className="h-4 w-4" />
        <span>Grid</span>
        {snapEnabled && (
          <span className="text-xs text-purple-600">
            {snapGridInterval < 1
              ? `${(snapGridInterval * 1000).toFixed(0)}ms`
              : `${snapGridInterval}s`}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={(): void => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown panel */}
          <div className="absolute left-0 top-full mt-2 w-72 z-50 rounded-lg border border-neutral-200 bg-white shadow-lg">
            {/* Header */}
            <div className="border-b border-neutral-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-neutral-900">Grid Settings</h3>
                <button
                  onClick={toggleSnap}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    snapEnabled
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                  )}
                  aria-label={snapEnabled ? 'Disable snap' : 'Enable snap'}
                >
                  {snapEnabled ? 'Snap On' : 'Snap Off'}
                </button>
              </div>
              <p className="text-xs text-neutral-600">
                Keyboard shortcut:{' '}
                <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 border border-neutral-300">
                  ⌘+Shift+S
                </kbd>
              </p>
            </div>

            {/* Preset intervals */}
            <div className="p-4 space-y-2">
              <p className="text-xs font-semibold text-neutral-700 mb-2">Preset Intervals</p>
              <div className="space-y-1">
                {/*
                  Key strategy: Use preset label since it's guaranteed unique in PRESET_INTERVALS.
                  Each preset has a unique label value.
                */}
                {PRESET_INTERVALS.map((preset): React.ReactElement => (
                  <button
                    key={`preset-${preset.label}`}
                    onClick={(): void => handlePresetClick(preset.value)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                      Math.abs(snapGridInterval - preset.value) < 0.001
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    )}
                  >
                    <span>{preset.label}</span>
                    {Math.abs(snapGridInterval - preset.value) < 0.001 && (
                      <Check className="h-4 w-4 text-purple-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom interval */}
            <div className="border-t border-neutral-200 p-4">
              <p className="text-xs font-semibold text-neutral-700 mb-2">Custom Interval</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.01"
                  max="10"
                  step="0.01"
                  value={customInterval}
                  onChange={(e): void => setCustomInterval(e.target.value)}
                  onKeyDown={(e): void => {
                    if (e.key === 'Enter') {
                      handleCustomIntervalSubmit();
                    }
                  }}
                  placeholder={`${snapGridInterval}s`}
                  className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  aria-label="Custom grid interval"
                />
                <button
                  onClick={handleCustomIntervalSubmit}
                  disabled={!customInterval}
                  className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Set
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1">Range: 0.01s to 10s</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
