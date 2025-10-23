'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { Transform, AudioEffects } from '@/types/timeline';

/**
 * TimelineCorrectionsMenu Component
 *
 * A collapsible panel below the timeline for advanced video corrections including:
 * - Color Correction (brightness, contrast, saturation, hue)
 * - Transform (rotation, flip, scale)
 * - Audio Effects (EQ, compression, normalization)
 *
 * Features modern, sleek design with smooth animations and debounced updates.
 */
export default function TimelineCorrectionsMenu() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<'color' | 'transform' | 'audio'>('color');

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
    return null; // Don't show menu when no clip is selected
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
    <div className="w-full border-t border-neutral-200 bg-white shadow-lg">
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-6 py-3 transition hover:bg-neutral-50"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`h-4 w-4 text-neutral-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <h3 className="text-sm font-semibold text-neutral-900">Advanced Corrections</h3>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {selectedClip.filePath.split('/').pop()?.slice(0, 20)}...
          </span>
        </div>
        <span className="text-xs text-neutral-500">
          {isExpanded ? 'Collapse' : 'Expand'}
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-neutral-100 bg-gradient-to-b from-white to-neutral-50 px-6 py-4">
          {/* Section Tabs */}
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('color')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeSection === 'color'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Color
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('transform')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeSection === 'transform'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Transform
            </button>
            {selectedClip.hasAudio && (
              <button
                type="button"
                onClick={() => setActiveSection('audio')}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  activeSection === 'audio'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Audio
              </button>
            )}
          </div>

          {/* Color Correction Section */}
          {activeSection === 'color' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Brightness */}
                <div className="group">
                  <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Brightness
                    </span>
                    <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">{localBrightness}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={localBrightness}
                    onChange={(e) => setLocalBrightness(parseInt(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-black via-neutral-500 to-white"
                    style={{
                      accentColor: '#3b82f6',
                    }}
                  />
                </div>

                {/* Contrast */}
                <div className="group">
                  <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      Contrast
                    </span>
                    <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">{localContrast}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={localContrast}
                    onChange={(e) => setLocalContrast(parseInt(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-neutral-400 via-neutral-600 to-neutral-900"
                    style={{
                      accentColor: '#3b82f6',
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {/* Saturation */}
                <div className="group">
                  <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      Saturation
                    </span>
                    <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">{localSaturation}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={localSaturation}
                    onChange={(e) => setLocalSaturation(parseInt(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-neutral-400 via-pink-400 to-pink-600"
                    style={{
                      accentColor: '#3b82f6',
                    }}
                  />
                </div>

                {/* Hue */}
                <div className="group">
                  <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Hue
                    </span>
                    <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">{localHue}°</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={localHue}
                    onChange={(e) => setLocalHue(parseInt(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg"
                    style={{
                      background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                      accentColor: '#3b82f6',
                    }}
                  />
                </div>
              </div>

              {/* Reset Button */}
              <div className="col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={resetColorCorrection}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
                >
                  Reset All
                </button>
              </div>
            </div>
          )}

          {/* Transform Section */}
          {activeSection === 'transform' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Rotation */}
                <div className="group">
                  <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Rotation
                    </span>
                    <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">{localRotation}°</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={localRotation}
                    onChange={(e) => setLocalRotation(parseInt(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-green-400 to-blue-500"
                    style={{
                      accentColor: '#3b82f6',
                    }}
                  />
                </div>

                {/* Scale */}
                <div className="group">
                  <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      Scale
                    </span>
                    <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">{localScale.toFixed(2)}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={localScale}
                    onChange={(e) => setLocalScale(parseFloat(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-indigo-400 to-purple-500"
                    style={{
                      accentColor: '#3b82f6',
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {/* Flip Controls */}
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <h4 className="mb-3 text-xs font-semibold text-neutral-900">Flip</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={transform.flipHorizontal}
                          onChange={(e) => updateTransform({ flipHorizontal: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className="h-5 w-9 rounded-full bg-neutral-300 peer-checked:bg-blue-600 transition"></div>
                        <div className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-4"></div>
                      </div>
                      <span className="text-xs font-medium text-neutral-700 group-hover:text-neutral-900">Horizontal</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={transform.flipVertical}
                          onChange={(e) => updateTransform({ flipVertical: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className="h-5 w-9 rounded-full bg-neutral-300 peer-checked:bg-blue-600 transition"></div>
                        <div className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-4"></div>
                      </div>
                      <span className="text-xs font-medium text-neutral-700 group-hover:text-neutral-900">Vertical</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <div className="col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={resetTransform}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
                >
                  Reset All
                </button>
              </div>
            </div>
          )}

          {/* Audio Effects Section */}
          {activeSection === 'audio' && selectedClip.hasAudio && (
            <div className="space-y-6">
              {/* Equalizer */}
              <div className="rounded-lg border border-neutral-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  3-Band Equalizer
                </h4>

                <div className="grid grid-cols-3 gap-4">
                  {/* Bass */}
                  <div className="flex flex-col items-center">
                    <div className="mb-2 flex h-32 w-full items-end justify-center">
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={localBassGain}
                        onChange={(e) => setLocalBassGain(parseFloat(e.target.value))}
                        className="h-full w-8 cursor-pointer appearance-none rounded-lg bg-gradient-to-t from-purple-300 to-purple-600"
                        style={{
                          writingMode: 'vertical-lr' as const,
                          WebkitAppearance: 'slider-vertical' as const,
                          accentColor: '#9333ea',
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-neutral-900">Bass</p>
                      <p className="text-[10px] text-neutral-600">100-400 Hz</p>
                      <p className="mt-1 rounded bg-purple-600 px-2 py-0.5 text-xs font-bold text-white">
                        {localBassGain > 0 ? '+' : ''}{localBassGain} dB
                      </p>
                    </div>
                  </div>

                  {/* Mid */}
                  <div className="flex flex-col items-center">
                    <div className="mb-2 flex h-32 w-full items-end justify-center">
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={localMidGain}
                        onChange={(e) => setLocalMidGain(parseFloat(e.target.value))}
                        className="h-full w-8 cursor-pointer appearance-none rounded-lg bg-gradient-to-t from-pink-300 to-pink-600"
                        style={{
                          writingMode: 'vertical-lr' as const,
                          WebkitAppearance: 'slider-vertical',
                          accentColor: '#db2777',
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-neutral-900">Mid</p>
                      <p className="text-[10px] text-neutral-600">400-4000 Hz</p>
                      <p className="mt-1 rounded bg-pink-600 px-2 py-0.5 text-xs font-bold text-white">
                        {localMidGain > 0 ? '+' : ''}{localMidGain} dB
                      </p>
                    </div>
                  </div>

                  {/* Treble */}
                  <div className="flex flex-col items-center">
                    <div className="mb-2 flex h-32 w-full items-end justify-center">
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={localTrebleGain}
                        onChange={(e) => setLocalTrebleGain(parseFloat(e.target.value))}
                        className="h-full w-8 cursor-pointer appearance-none rounded-lg bg-gradient-to-t from-cyan-300 to-cyan-600"
                        style={{
                          writingMode: 'vertical-lr' as const,
                          WebkitAppearance: 'slider-vertical',
                          accentColor: '#0891b2',
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-neutral-900">Treble</p>
                      <p className="text-[10px] text-neutral-600">4000+ Hz</p>
                      <p className="mt-1 rounded bg-cyan-600 px-2 py-0.5 text-xs font-bold text-white">
                        {localTrebleGain > 0 ? '+' : ''}{localTrebleGain} dB
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamics */}
              <div className="grid grid-cols-2 gap-4">
                {/* Compression */}
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <label className="mb-3 flex items-center justify-between text-xs font-medium text-neutral-700">
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Compression
                    </span>
                    <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">{localCompression}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={localCompression}
                    onChange={(e) => setLocalCompression(parseInt(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-orange-300 to-orange-600"
                    style={{
                      accentColor: '#3b82f6',
                    }}
                  />
                  <p className="mt-2 text-[10px] text-neutral-600">Reduces dynamic range for consistent volume</p>
                </div>

                {/* Normalize */}
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <h4 className="mb-3 text-xs font-semibold text-neutral-900">Normalization</h4>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={audioEffects.normalize}
                        onChange={(e) => updateAudioEffects({ normalize: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-neutral-300 peer-checked:bg-green-600 transition"></div>
                      <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5"></div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-neutral-700 group-hover:text-neutral-900">Auto-Normalize</span>
                      <p className="text-[10px] text-neutral-600">Adjust peak volume to -3dB</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Reset Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={resetAudioEffects}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
                >
                  Reset All
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
