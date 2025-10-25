import React from 'react';
/**
 * TransformSection - Clip transformation and orientation controls
 *
 * Provides controls for rotating, scaling, adjusting opacity, speed, and flipping video clips.
 * Features a two-column layout with rotation/scale/opacity/speed on the left and
 * flip controls on the right.
 *
 * Features:
 * - Rotation control (0-360 degrees)
 * - Scale control (0.1x to 3x)
 * - Opacity control (0-100%)
 * - Speed control (0.25x to 4x) for slow-motion/time-lapse
 * - Horizontal flip toggle
 * - Vertical flip toggle
 * - Visual feedback with gradient sliders
 * - Reset all transformations
 *
 * @param rotation - Current rotation angle in degrees (0-360)
 * @param scale - Current scale multiplier (0.1-3.0)
 * @param opacity - Current opacity percentage (0-100)
 * @param speed - Current playback speed multiplier (0.25-4.0)
 * @param flipHorizontal - Whether clip is flipped horizontally
 * @param flipVertical - Whether clip is flipped vertically
 * @param onRotationChange - Callback when rotation changes
 * @param onScaleChange - Callback when scale changes
 * @param onOpacityChange - Callback when opacity changes
 * @param onSpeedChange - Callback when speed changes
 * @param onFlipUpdate - Callback for flip property updates
 * @param onReset - Callback to reset all transformations
 *
 * @example
 * ```tsx
 * <TransformSection
 *   rotation={0}
 *   scale={1.0}
 *   opacity={100}
 *   speed={1.0}
 *   flipHorizontal={false}
 *   flipVertical={false}
 *   onRotationChange={(r) => setRotation(r)}
 *   onScaleChange={(s) => setScale(s)}
 *   onOpacityChange={(o) => setOpacity(o)}
 *   onSpeedChange={(s) => setSpeed(s)}
 *   onFlipUpdate={(flip) => updateFlip(flip)}
 *   onReset={() => resetTransforms()}
 * />
 * ```
 */
import type { Transform } from '@/types/timeline';

interface TransformSectionProps {
  rotation: number;
  scale: number;
  opacity: number;
  speed: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  onRotationChange: (value: number) => void;
  onScaleChange: (value: number) => void;
  onOpacityChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
  onFlipUpdate: (updates: Partial<Transform>) => void;
  onReset: () => void;
}

export function TransformSection({
  rotation,
  scale,
  opacity,
  speed,
  flipHorizontal,
  flipVertical,
  onRotationChange,
  onScaleChange,
  onOpacityChange,
  onSpeedChange,
  onFlipUpdate,
  onReset,
}: TransformSectionProps): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        {/* Rotation */}
        <div className="group">
          <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Rotation
            </span>
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
              {rotation}°
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="360"
            value={rotation}
            onChange={(e): void => onRotationChange(parseInt(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-green-400 to-blue-500"
            style={{ accentColor: '#3b82f6' }}
          />
        </div>

        {/* Scale */}
        <div className="group">
          <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-indigo-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              Scale
            </span>
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
              {scale.toFixed(2)}x
            </span>
          </label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={scale}
            onChange={(e): void => onScaleChange(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-indigo-400 to-purple-500"
            style={{ accentColor: '#3b82f6' }}
          />
        </div>

        {/* Opacity */}
        <div className="group">
          <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Opacity
            </span>
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
              {Math.round(opacity)}%
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={opacity}
            onChange={(e): void => onOpacityChange(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-purple-400 to-pink-500"
            style={{ accentColor: '#3b82f6' }}
          />
        </div>

        {/* Speed */}
        <div className="group">
          <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-orange-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Speed
            </span>
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
              {speed.toFixed(2)}x
            </span>
          </label>
          <input
            type="range"
            min="0.25"
            max="4"
            step="0.05"
            value={speed}
            onChange={(e): void => onSpeedChange(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-orange-400 to-red-500"
            style={{ accentColor: '#3b82f6' }}
          />
          {/* Speed presets */}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={(): void => onSpeedChange(0.5)}
              className="flex-1 rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200"
            >
              0.5x
            </button>
            <button
              type="button"
              onClick={(): void => onSpeedChange(1.0)}
              className="flex-1 rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200"
            >
              1x
            </button>
            <button
              type="button"
              onClick={(): void => onSpeedChange(2.0)}
              className="flex-1 rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200"
            >
              2x
            </button>
          </div>
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
                  checked={flipHorizontal}
                  onChange={(e): void => onFlipUpdate({ flipHorizontal: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-neutral-300 peer-checked:bg-blue-600 transition"></div>
                <div className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-4"></div>
              </div>
              <span className="text-xs font-medium text-neutral-700 group-hover:text-neutral-900">
                Horizontal
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={flipVertical}
                  onChange={(e): void => onFlipUpdate({ flipVertical: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-neutral-300 peer-checked:bg-blue-600 transition"></div>
                <div className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-4"></div>
              </div>
              <span className="text-xs font-medium text-neutral-700 group-hover:text-neutral-900">
                Vertical
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="col-span-2 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
        >
          Reset All
        </button>
      </div>
    </div>
  );
}
