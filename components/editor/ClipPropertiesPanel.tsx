'use client';

import React, {  useState, useEffect, useCallback  } from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { Clip } from '@/types/timeline';

/**
 * ClipPropertiesPanel Component (Enhanced)
 *
 * Provides controls for editing clip properties including:
 * - Color Correction (brightness, contrast, saturation, hue)
 * - Transform (rotation, flip, scale)
 * - Audio Effects (EQ, compression, normalization)
 *
 * Features debounced updates for smooth slider interaction.
 * Shows when a clip is selected on the timeline.
 */
export function ClipPropertiesPanel(): React.ReactElement {
  const selectedClips = useEditorStore((state): Set<string> => state.selectedClipIds);
  const clips = useEditorStore((state): Clip[] => state.timeline?.clips ?? []);
  const updateClipStore = useEditorStore((state): (id: string, patch: Partial<Clip>) => void => state.updateClip);

  // Stable reference for updateClip
  const updateClip = useCallback(
    (id: string, updates: Record<string, string | number | boolean | object>): void => {
      updateClipStore(id, updates);
    },
    [updateClipStore]
  );

  // Get first selected clip
  const selectedClip = selectedClips.size > 0 ? clips.find((c): boolean => selectedClips.has(c.id)) : null;

  // Local state for slider values (immediate feedback)
  const [localBrightness, setLocalBrightness] = useState(100);
  const [localContrast, setLocalContrast] = useState(100);
  const [localSaturation, setLocalSaturation] = useState(100);
  const [localHue, setLocalHue] = useState(0);
  const [localRotation, setLocalRotation] = useState(0);
  const [localScale, setLocalScale] = useState(1.0);
  const [localBassGain, setLocalBassGain] = useState(0);
  const [localMidGain, setLocalMidGain] = useState(0);
  const [localTrebleGain, setLocalTrebleGain] = useState(0);
  const [localCompression, setLocalCompression] = useState(0);

  // Debounced values (actual updates to store)
  const debouncedBrightness = useDebounce(localBrightness, 100);
  const debouncedContrast = useDebounce(localContrast, 100);
  const debouncedSaturation = useDebounce(localSaturation, 100);
  const debouncedHue = useDebounce(localHue, 100);
  const debouncedRotation = useDebounce(localRotation, 100);
  const debouncedScale = useDebounce(localScale, 100);
  const debouncedBassGain = useDebounce(localBassGain, 100);
  const debouncedMidGain = useDebounce(localMidGain, 100);
  const debouncedTrebleGain = useDebounce(localTrebleGain, 100);
  const debouncedCompression = useDebounce(localCompression, 100);

  // Sync local state with selected clip
  // Dependencies: Only re-run when selectedClip identity changes (via ID) or properties change
  useEffect((): void => {
    if (selectedClip) {
      const colorCorrection = selectedClip.colorCorrection || {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        hue: 0,
      };
      const transform = selectedClip.transform || {
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        scale: 1.0,
      };
      const audioEffects = selectedClip.audioEffects || {
        bassGain: 0,
        midGain: 0,
        trebleGain: 0,
        compression: 0,
        normalize: false,
      };

      setLocalBrightness(colorCorrection.brightness);
      setLocalContrast(colorCorrection.contrast);
      setLocalSaturation(colorCorrection.saturation);
      setLocalHue(colorCorrection.hue);
      setLocalRotation(transform.rotation);
      setLocalScale(transform.scale);
      setLocalBassGain(audioEffects.bassGain);
      setLocalMidGain(audioEffects.midGain);
      setLocalTrebleGain(audioEffects.trebleGain);
      setLocalCompression(audioEffects.compression);
    }
  }, [selectedClip]);

  // Apply debounced color correction updates
  useEffect((): void => {
    if (selectedClip) {
      const current = selectedClip.colorCorrection || {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        hue: 0,
      };
      if (
        current.brightness !== debouncedBrightness ||
        current.contrast !== debouncedContrast ||
        current.saturation !== debouncedSaturation ||
        current.hue !== debouncedHue
      ) {
        updateClip(selectedClip.id, {
          colorCorrection: {
            brightness: debouncedBrightness,
            contrast: debouncedContrast,
            saturation: debouncedSaturation,
            hue: debouncedHue,
          },
        });
      }
    }
  }, [
    debouncedBrightness,
    debouncedContrast,
    debouncedSaturation,
    debouncedHue,
    selectedClip,
    updateClip,
  ]);

  // Apply debounced transform updates
  useEffect((): void => {
    if (selectedClip) {
      const current = selectedClip.transform || {
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        scale: 1.0,
      };
      if (current.rotation !== debouncedRotation || current.scale !== debouncedScale) {
        updateClip(selectedClip.id, {
          transform: {
            ...current,
            rotation: debouncedRotation,
            scale: debouncedScale,
          },
        });
      }
    }
  }, [debouncedRotation, debouncedScale, selectedClip, updateClip]);

  // Apply debounced audio effects updates
  useEffect((): void => {
    if (selectedClip && selectedClip.hasAudio) {
      const current = selectedClip.audioEffects || {
        bassGain: 0,
        midGain: 0,
        trebleGain: 0,
        compression: 0,
        normalize: false,
      };
      if (
        current.bassGain !== debouncedBassGain ||
        current.midGain !== debouncedMidGain ||
        current.trebleGain !== debouncedTrebleGain ||
        current.compression !== debouncedCompression
      ) {
        updateClip(selectedClip.id, {
          audioEffects: {
            ...current,
            bassGain: debouncedBassGain,
            midGain: debouncedMidGain,
            trebleGain: debouncedTrebleGain,
            compression: debouncedCompression,
          },
        });
      }
    }
  }, [
    debouncedBassGain,
    debouncedMidGain,
    debouncedTrebleGain,
    debouncedCompression,
    selectedClip,
    updateClip,
  ]);

  if (!selectedClip) {
    return (
      <div className="h-full w-80 border-l border-gray-700 bg-gray-900 p-4">
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          Select a clip to edit properties
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-80 border-l border-gray-700 bg-gray-900 p-4 overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white mb-1">Clip Properties</h2>
        <p className="text-xs text-gray-400 truncate">{selectedClip.filePath}</p>
      </div>

      {/* Info about advanced corrections */}
      <div className="mb-4 rounded-lg border border-blue-700 bg-blue-900/30 p-3">
        <div className="flex items-start gap-2">
          <svg
            className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-xs font-semibold text-blue-300 mb-1">Advanced Corrections</h3>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Use the collapsible menu below the timeline to access color correction, transform, and
              audio effects controls.
            </p>
          </div>
        </div>
      </div>

      {/* Clip Info */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
        <h3 className="text-sm font-medium text-white mb-3">Clip Info</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-gray-700">
            <span className="text-gray-400">Duration:</span>
            <span className="text-white font-medium">
              {(selectedClip.end - selectedClip.start).toFixed(2)}s
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-700">
            <span className="text-gray-400">Position:</span>
            <span className="text-white font-medium">
              {selectedClip.timelinePosition.toFixed(2)}s
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-700">
            <span className="text-gray-400">Track:</span>
            <span className="text-white font-medium">{selectedClip.trackIndex + 1}</span>
          </div>
          {selectedClip.speed !== undefined && selectedClip.speed !== 1 && (
            <div className="flex justify-between items-center py-1 border-b border-gray-700">
              <span className="text-gray-400">Speed:</span>
              <span className="text-white font-medium">{selectedClip.speed}x</span>
            </div>
          )}
          {selectedClip.hasAudio && (
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Audio:</span>
              <span className="flex items-center gap-1 text-green-400 font-medium">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Yes
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Clip Color Label */}
      <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800 p-3">
        <h3 className="text-sm font-medium text-white mb-3">Clip Color Label</h3>
        <p className="text-xs text-gray-400 mb-3">
          Assign a color to this clip for visual organization on the timeline
        </p>

        <div className="space-y-3">
          {/* Color Presets */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Preset Colors</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { name: 'None', value: undefined, color: 'transparent' },
                { name: 'Red', value: '#ef4444', color: '#ef4444' },
                { name: 'Orange', value: '#f97316', color: '#f97316' },
                { name: 'Yellow', value: '#eab308', color: '#eab308' },
                { name: 'Green', value: '#22c55e', color: '#22c55e' },
                { name: 'Blue', value: '#3b82f6', color: '#3b82f6' },
                { name: 'Purple', value: '#a855f7', color: '#a855f7' },
                { name: 'Pink', value: '#ec4899', color: '#ec4899' },
                { name: 'Teal', value: '#14b8a6', color: '#14b8a6' },
                { name: 'Indigo', value: '#6366f1', color: '#6366f1' },
              ].map((preset): React.ReactElement => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={(): void => { if (preset.value) updateClip(selectedClip.id, { color: preset.value }); }}
                  className={`h-8 rounded border-2 transition-all hover:scale-110 ${
                    selectedClip.color === preset.value
                      ? 'border-white ring-2 ring-white/50'
                      : 'border-gray-600 hover:border-gray-400'
                  } ${preset.value === undefined ? 'border-dashed' : ''}`}
                  style={{
                    backgroundColor: preset.color,
                    backgroundImage: preset.value === undefined
                      ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
                      : undefined
                  }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Custom Color Picker */}
          <div>
            <label htmlFor="custom-color-picker" className="text-xs text-gray-400 mb-2 block">
              Custom Color
            </label>
            <div className="flex gap-2 items-center">
              <input
                id="custom-color-picker"
                type="color"
                value={selectedClip.color ?? '#ffffff'}
                onChange={(e): void => updateClip(selectedClip.id, { color: e.target.value })}
                className="h-10 w-full rounded border border-gray-600 cursor-pointer bg-gray-700"
              />
              {selectedClip.color && (
                <button
                  type="button"
                  onClick={(): void => updateClip(selectedClip.id, { color: '' })}
                  className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 transition-colors"
                  title="Clear color"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Preview */}
          {selectedClip.color && (
            <div className="pt-2 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Preview:</p>
              <div
                className="h-12 rounded border-2 border-gray-600 flex items-center justify-center text-xs text-white font-medium shadow-inner"
                style={{
                  backgroundColor: selectedClip.color,
                  backgroundImage: `linear-gradient(135deg, ${selectedClip.color}dd 0%, ${selectedClip.color} 100%)`
                }}
              >
                Clip Color Label
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
