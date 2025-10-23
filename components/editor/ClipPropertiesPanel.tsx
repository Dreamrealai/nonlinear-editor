'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { Transform, AudioEffects } from '@/types/timeline';

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
export default function ClipPropertiesPanel() {
  const selectedClips = useEditorStore((state) => state.selectedClipIds);
  const clips = useEditorStore((state) => state.timeline?.clips ?? []);
  const updateClipStore = useEditorStore((state) => state.updateClip);

  // Stable reference for updateClip
  const updateClip = useCallback((id: string, updates: Record<string, string | number | boolean | object>) => {
    updateClipStore(id, updates);
  }, [updateClipStore]);

  // Get first selected clip
  const selectedClip = selectedClips.size > 0
    ? clips.find((c) => selectedClips.has(c.id))
    : null;

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
  useEffect(() => {
    if (selectedClip) {
      const cc = selectedClip.colorCorrection || { brightness: 100, contrast: 100, saturation: 100, hue: 0 };
      const t = selectedClip.transform || { rotation: 0, flipHorizontal: false, flipVertical: false, scale: 1.0 };
      const ae = selectedClip.audioEffects || { bassGain: 0, midGain: 0, trebleGain: 0, compression: 0, normalize: false };

      setLocalBrightness(cc.brightness);
      setLocalContrast(cc.contrast);
      setLocalSaturation(cc.saturation);
      setLocalHue(cc.hue);
      setLocalRotation(t.rotation);
      setLocalScale(t.scale);
      setLocalBassGain(ae.bassGain);
      setLocalMidGain(ae.midGain);
      setLocalTrebleGain(ae.trebleGain);
      setLocalCompression(ae.compression);
    }
  }, [selectedClip]);

  // Apply debounced color correction updates
  useEffect(() => {
    if (selectedClip) {
      const current = selectedClip.colorCorrection || { brightness: 100, contrast: 100, saturation: 100, hue: 0 };
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
  }, [debouncedBrightness, debouncedContrast, debouncedSaturation, debouncedHue, selectedClip, updateClip]);

  // Apply debounced transform updates
  useEffect(() => {
    if (selectedClip) {
      const current = selectedClip.transform || { rotation: 0, flipHorizontal: false, flipVertical: false, scale: 1.0 };
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
  useEffect(() => {
    if (selectedClip && selectedClip.hasAudio) {
      const current = selectedClip.audioEffects || { bassGain: 0, midGain: 0, trebleGain: 0, compression: 0, normalize: false };
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
  }, [debouncedBassGain, debouncedMidGain, debouncedTrebleGain, debouncedCompression, selectedClip, updateClip]);

  if (!selectedClip) {
    return (
      <div className="h-full w-80 border-l border-gray-700 bg-gray-900 p-4">
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          Select a clip to edit properties
        </div>
      </div>
    );
  }

  const transform = selectedClip.transform || { rotation: 0, flipHorizontal: false, flipVertical: false, scale: 1.0 };
  const audioEffects = selectedClip.audioEffects || { bassGain: 0, midGain: 0, trebleGain: 0, compression: 0, normalize: false };

  const updateTransform = (updates: Partial<Transform>) => {
    updateClip(selectedClip.id, {
      transform: { ...transform, ...updates },
    });
  };

  const updateAudioEffects = (updates: Partial<AudioEffects>) => {
    updateClip(selectedClip.id, {
      audioEffects: { ...audioEffects, ...updates },
    });
  };

  const resetColorCorrection = () => {
    setLocalBrightness(100);
    setLocalContrast(100);
    setLocalSaturation(100);
    setLocalHue(0);
    updateClip(selectedClip.id, {
      colorCorrection: { brightness: 100, contrast: 100, saturation: 100, hue: 0 },
    });
  };

  const resetTransform = () => {
    setLocalRotation(0);
    setLocalScale(1.0);
    updateClip(selectedClip.id, {
      transform: { rotation: 0, flipHorizontal: false, flipVertical: false, scale: 1.0 },
    });
  };

  const resetAudioEffects = () => {
    setLocalBassGain(0);
    setLocalMidGain(0);
    setLocalTrebleGain(0);
    setLocalCompression(0);
    updateClip(selectedClip.id, {
      audioEffects: { bassGain: 0, midGain: 0, trebleGain: 0, compression: 0, normalize: false },
    });
  };

  return (
    <div className="h-full w-80 border-l border-gray-700 bg-gray-900 p-4 overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white mb-1">Clip Properties</h2>
        <p className="text-xs text-gray-400 truncate">{selectedClip.filePath}</p>
      </div>

      {/* Color Correction Section */}
      <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Color Correction</h3>
          <button onClick={resetColorCorrection} className="text-xs text-blue-400 hover:text-blue-300">
            Reset
          </button>
        </div>

        <div className="mb-3">
          <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span>Brightness</span>
            <span className="text-gray-400">{localBrightness}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={localBrightness}
            onChange={(e) => setLocalBrightness(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span>Contrast</span>
            <span className="text-gray-400">{localContrast}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={localContrast}
            onChange={(e) => setLocalContrast(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span>Saturation</span>
            <span className="text-gray-400">{localSaturation}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={localSaturation}
            onChange={(e) => setLocalSaturation(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span>Hue</span>
            <span className="text-gray-400">{localHue}°</span>
          </label>
          <input
            type="range"
            min="0"
            max="360"
            value={localHue}
            onChange={(e) => setLocalHue(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
      </div>

      {/* Transform Section */}
      <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Transform</h3>
          <button onClick={resetTransform} className="text-xs text-blue-400 hover:text-blue-300">
            Reset
          </button>
        </div>

        <div className="mb-3">
          <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span>Rotation</span>
            <span className="text-gray-400">{localRotation}°</span>
          </label>
          <input
            type="range"
            min="0"
            max="360"
            value={localRotation}
            onChange={(e) => setLocalRotation(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span>Scale</span>
            <span className="text-gray-400">{localScale.toFixed(2)}x</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={localScale}
            onChange={(e) => setLocalScale(parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={transform.flipHorizontal}
              onChange={(e) => updateTransform({ flipHorizontal: e.target.checked })}
              className="accent-blue-500"
            />
            <span className="text-xs text-gray-300">Flip Horizontal</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={transform.flipVertical}
              onChange={(e) => updateTransform({ flipVertical: e.target.checked })}
              className="accent-blue-500"
            />
            <span className="text-xs text-gray-300">Flip Vertical</span>
          </label>
        </div>
      </div>

      {/* Audio Effects Section (only for clips with audio) */}
      {selectedClip.hasAudio && (
        <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Audio Effects</h3>
            <button onClick={resetAudioEffects} className="text-xs text-blue-400 hover:text-blue-300">
              Reset
            </button>
          </div>

          <div className="mb-2">
            <p className="text-xs text-gray-400 mb-3">3-Band Equalizer</p>

            <div className="mb-3">
              <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
                <span>Bass (100-400 Hz)</span>
                <span className="text-gray-400">{localBassGain > 0 ? '+' : ''}{localBassGain} dB</span>
              </label>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={localBassGain}
                onChange={(e) => setLocalBassGain(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
                <span>Mid (400-4000 Hz)</span>
                <span className="text-gray-400">{localMidGain > 0 ? '+' : ''}{localMidGain} dB</span>
              </label>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={localMidGain}
                onChange={(e) => setLocalMidGain(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
                <span>Treble (4000+ Hz)</span>
                <span className="text-gray-400">{localTrebleGain > 0 ? '+' : ''}{localTrebleGain} dB</span>
              </label>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={localTrebleGain}
                onChange={(e) => setLocalTrebleGain(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>

          <div className="mb-3 pt-2 border-t border-gray-700">
            <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
              <span>Compression</span>
              <span className="text-gray-400">{localCompression}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={localCompression}
              onChange={(e) => setLocalCompression(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <p className="text-[10px] text-gray-500 mt-1">Reduces dynamic range</p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={audioEffects.normalize}
                onChange={(e) => updateAudioEffects({ normalize: e.target.checked })}
                className="accent-blue-500"
              />
              <span className="text-xs text-gray-300">Auto-Normalize to -3dB</span>
            </label>
            <p className="text-[10px] text-gray-500 ml-5 mt-1">Automatically adjust peak volume</p>
          </div>
        </div>
      )}

      {/* Clip Info */}
      <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800 p-3">
        <h3 className="text-sm font-medium text-white mb-2">Clip Info</h3>
        <div className="space-y-1 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Duration:</span>
            <span className="text-gray-300">{(selectedClip.end - selectedClip.start).toFixed(2)}s</span>
          </div>
          <div className="flex justify-between">
            <span>Position:</span>
            <span className="text-gray-300">{selectedClip.timelinePosition.toFixed(2)}s</span>
          </div>
          <div className="flex justify-between">
            <span>Track:</span>
            <span className="text-gray-300">{selectedClip.trackIndex + 1}</span>
          </div>
          {selectedClip.speed !== undefined && selectedClip.speed !== 1 && (
            <div className="flex justify-between">
              <span>Speed:</span>
              <span className="text-gray-300">{selectedClip.speed}x</span>
            </div>
          )}
          {selectedClip.hasAudio && (
            <div className="flex justify-between">
              <span>Audio:</span>
              <span className="text-gray-300">Yes</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
