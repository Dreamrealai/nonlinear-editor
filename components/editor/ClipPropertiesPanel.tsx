'use client';

import React from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import type { ColorCorrection, Transform } from '@/types/timeline';

/**
 * ClipPropertiesPanel Component
 *
 * Provides controls for editing clip properties including:
 * - Color Correction (brightness, contrast, saturation, hue)
 * - Transform (rotation, flip, scale)
 *
 * Shows when a clip is selected on the timeline.
 */
export default function ClipPropertiesPanel() {
  const selectedClips = useEditorStore((state) => state.selectedClipIds);
  const clips = useEditorStore((state) => state.timeline?.clips ?? []);
  const updateClip = useEditorStore((state) => state.updateClip);

  // Get first selected clip
  const selectedClip = selectedClips.size > 0
    ? clips.find((c) => selectedClips.has(c.id))
    : null;

  if (!selectedClip) {
    return (
      <div className="h-full w-80 border-l border-gray-700 bg-gray-900 p-4">
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          Select a clip to edit properties
        </div>
      </div>
    );
  }

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

  const updateColorCorrection = (updates: Partial<ColorCorrection>) => {
    updateClip(selectedClip.id, {
      colorCorrection: { ...colorCorrection, ...updates },
    });
  };

  const updateTransform = (updates: Partial<Transform>) => {
    updateClip(selectedClip.id, {
      transform: { ...transform, ...updates },
    });
  };

  const resetColorCorrection = () => {
    updateClip(selectedClip.id, {
      colorCorrection: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        hue: 0,
      },
    });
  };

  const resetTransform = () => {
    updateClip(selectedClip.id, {
      transform: {
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        scale: 1.0,
      },
    });
  };

  return (
    <div className="h-full w-80 border-l border-gray-700 bg-gray-900 p-4 overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white mb-1">Clip Properties</h2>
        <p className="text-xs text-gray-400 truncate">{selectedClip.filePath}</p>
      </div>

      {/* Color Correction Section */}
      <div className="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Color Correction</h3>
          <button
            onClick={resetColorCorrection}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Reset
          </button>
        </div>

        {/* Brightness */}
        <div className="mb-3">
          <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span>Brightness</span>
            <span className="text-gray-400">{colorCorrection.brightness}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={colorCorrection.brightness}
            onChange={(e) => updateColorCorrection({ brightness: parseInt(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Contrast */}
        <div className="mb-3">
          <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span>Contrast</span>
            <span className="text-gray-400">{colorCorrection.contrast}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={colorCorrection.contrast}
            onChange={(e) => updateColorCorrection({ contrast: parseInt(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Saturation */}
        <div className="mb-3">
          <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span>Saturation</span>
            <span className="text-gray-400">{colorCorrection.saturation}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={colorCorrection.saturation}
            onChange={(e) => updateColorCorrection({ saturation: parseInt(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Hue */}
        <div>
          <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span>Hue</span>
            <span className="text-gray-400">{colorCorrection.hue}°</span>
          </label>
          <input
            type="range"
            min="0"
            max="360"
            value={colorCorrection.hue}
            onChange={(e) => updateColorCorrection({ hue: parseInt(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>
      </div>

      {/* Transform Section */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Transform</h3>
          <button
            onClick={resetTransform}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Reset
          </button>
        </div>

        {/* Rotation */}
        <div className="mb-3">
          <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span>Rotation</span>
            <span className="text-gray-400">{transform.rotation}°</span>
          </label>
          <input
            type="range"
            min="0"
            max="360"
            value={transform.rotation}
            onChange={(e) => updateTransform({ rotation: parseInt(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Scale */}
        <div className="mb-3">
          <label className="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span>Scale</span>
            <span className="text-gray-400">{transform.scale.toFixed(2)}x</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={transform.scale}
            onChange={(e) => updateTransform({ scale: parseFloat(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Flip Controls */}
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
