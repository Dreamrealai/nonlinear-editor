import React from 'react';
/**
 * VideoEffectsSection - Comprehensive video effects and color grading controls
 *
 * Provides a complete suite of video effects including preset filters and
 * manual adjustments. Features 10 professionally designed presets and
 * granular control over brightness, contrast, saturation, hue, and blur.
 *
 * Features:
 * - 10 effect presets (Normal, Vivid, Vintage, B&W, Cool, Warm, Faded, Dramatic, Soft Focus, Dream)
 * - Brightness control (0-200%)
 * - Contrast control (0-200%)
 * - Saturation control (0-200%)
 * - Hue rotation (0-360 degrees)
 * - Blur effect (0-20px)
 * - Dark mode support
 * - Visual feedback with gradient sliders
 * - Reset all effects to defaults
 *
 * @param brightness - Brightness level (0-200%)
 * @param contrast - Contrast level (0-200%)
 * @param saturation - Color saturation (0-200%)
 * @param hue - Hue rotation in degrees (0-360)
 * @param blur - Blur intensity in pixels (0-20)
 * @param onBrightnessChange - Callback when brightness changes
 * @param onContrastChange - Callback when contrast changes
 * @param onSaturationChange - Callback when saturation changes
 * @param onHueChange - Callback when hue rotation changes
 * @param onBlurChange - Callback when blur intensity changes
 * @param onPresetApply - Callback when a preset is applied
 * @param onReset - Callback to reset all effects to defaults
 *
 * @example
 * ```tsx
 * <VideoEffectsSection
 *   brightness={100}
 *   contrast={100}
 *   saturation={100}
 *   hue={0}
 *   blur={0}
 *   onBrightnessChange={(b) => setBrightness(b)}
 *   onPresetApply={(preset) => applyPreset(preset)}
 *   onReset={() => resetEffects()}
 * />
 * ```
 */
import type { VideoEffects } from '@/types/timeline';

interface VideoEffectsSectionProps {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
  onHueChange: (value: number) => void;
  onBlurChange: (value: number) => void;
  onPresetApply: (preset: VideoEffectsPreset) => void;
  onReset: () => void;
}

export type VideoEffectsPreset = {
  name: string;
  description: string;
  icon: string;
  effects: VideoEffects;
};

// Pre-defined effect presets
export const VIDEO_EFFECT_PRESETS: VideoEffectsPreset[] = [
  {
    name: 'Normal',
    description: 'Reset all effects to default',
    icon: '🔄',
    effects: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
    },
  },
  {
    name: 'Vivid',
    description: 'Enhanced colors and contrast',
    icon: '🎨',
    effects: {
      brightness: 110,
      contrast: 120,
      saturation: 140,
      hue: 0,
      blur: 0,
    },
  },
  {
    name: 'Vintage',
    description: 'Warm, faded retro look',
    icon: '📷',
    effects: {
      brightness: 105,
      contrast: 90,
      saturation: 80,
      hue: 20,
      blur: 0.5,
    },
  },
  {
    name: 'Black & White',
    description: 'Classic monochrome',
    icon: '⬛',
    effects: {
      brightness: 100,
      contrast: 110,
      saturation: 0,
      hue: 0,
      blur: 0,
    },
  },
  {
    name: 'Cool',
    description: 'Blue-tinted, cooler tones',
    icon: '❄️',
    effects: {
      brightness: 100,
      contrast: 105,
      saturation: 110,
      hue: 200,
      blur: 0,
    },
  },
  {
    name: 'Warm',
    description: 'Orange-tinted, warmer tones',
    icon: '🔥',
    effects: {
      brightness: 105,
      contrast: 100,
      saturation: 115,
      hue: 15,
      blur: 0,
    },
  },
  {
    name: 'Faded',
    description: 'Low contrast, washed out',
    icon: '🌫️',
    effects: {
      brightness: 110,
      contrast: 70,
      saturation: 70,
      hue: 0,
      blur: 0,
    },
  },
  {
    name: 'Dramatic',
    description: 'High contrast, dark shadows',
    icon: '🎭',
    effects: {
      brightness: 95,
      contrast: 140,
      saturation: 120,
      hue: 0,
      blur: 0,
    },
  },
  {
    name: 'Soft Focus',
    description: 'Gentle blur effect',
    icon: '✨',
    effects: {
      brightness: 105,
      contrast: 95,
      saturation: 105,
      hue: 0,
      blur: 2,
    },
  },
  {
    name: 'Dream',
    description: 'Soft, ethereal look',
    icon: '☁️',
    effects: {
      brightness: 115,
      contrast: 80,
      saturation: 90,
      hue: 10,
      blur: 1.5,
    },
  },
];

export function VideoEffectsSection({
  brightness,
  contrast,
  saturation,
  hue,
  blur,
  onBrightnessChange,
  onContrastChange,
  onSaturationChange,
  onHueChange,
  onBlurChange,
  onPresetApply,
  onReset,
}: VideoEffectsSectionProps): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Effect Presets */}
      <div className="rounded-lg border border-neutral-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 dark:border-neutral-700 p-4">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <svg
            className="h-5 w-5 text-purple-600 dark:text-purple-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
          Effect Presets
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {VIDEO_EFFECT_PRESETS.map(
            (preset): React.ReactElement => (
              <button
                key={preset.name}
                type="button"
                onClick={(): void => onPresetApply(preset)}
                className="group relative flex flex-col items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 p-3 text-center transition hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:shadow-md"
                title={preset.description}
              >
                <span className="text-2xl" role="img" aria-label={preset.name}>
                  {preset.icon}
                </span>
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                  {preset.name}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Manual Controls */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <svg
            className="h-5 w-5 text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          Manual Adjustments
        </h4>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Brightness */}
            <div className="group">
              <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-yellow-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  Brightness
                </span>
                <span className="rounded bg-neutral-900 dark:bg-neutral-700 px-2 py-0.5 text-xs font-bold text-white">
                  {brightness}%
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={brightness}
                onChange={(e): void => onBrightnessChange(parseInt(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-black via-neutral-500 to-white"
                style={{ accentColor: '#3b82f6' }}
              />
            </div>

            {/* Contrast */}
            <div className="group">
              <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
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
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                  Contrast
                </span>
                <span className="rounded bg-neutral-900 dark:bg-neutral-700 px-2 py-0.5 text-xs font-bold text-white">
                  {contrast}%
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={contrast}
                onChange={(e): void => onContrastChange(parseInt(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-neutral-400 via-neutral-600 to-neutral-900"
                style={{ accentColor: '#3b82f6' }}
              />
            </div>

            {/* Saturation */}
            <div className="group">
              <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-pink-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                  Saturation
                </span>
                <span className="rounded bg-neutral-900 dark:bg-neutral-700 px-2 py-0.5 text-xs font-bold text-white">
                  {saturation}%
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e): void => onSaturationChange(parseInt(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-neutral-400 via-pink-400 to-pink-600"
                style={{ accentColor: '#3b82f6' }}
              />
            </div>
          </div>

          <div className="space-y-4">
            {/* Hue */}
            <div className="group">
              <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-cyan-500"
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
                  Hue Rotation
                </span>
                <span className="rounded bg-neutral-900 dark:bg-neutral-700 px-2 py-0.5 text-xs font-bold text-white">
                  {hue}°
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e): void => onHueChange(parseInt(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg"
                style={{
                  background:
                    'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                  accentColor: '#3b82f6',
                }}
              />
            </div>

            {/* Blur */}
            <div className="group">
              <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-blue-500"
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
                  Blur
                </span>
                <span className="rounded bg-neutral-900 dark:bg-neutral-700 px-2 py-0.5 text-xs font-bold text-white">
                  {blur.toFixed(1)}px
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={blur}
                onChange={(e): void => onBlurChange(parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-blue-200 to-blue-600"
                style={{ accentColor: '#3b82f6' }}
              />
              <p className="mt-1 text-[10px] text-neutral-600 dark:text-neutral-400">
                {blur === 0
                  ? 'No blur'
                  : blur < 5
                    ? 'Soft focus'
                    : blur < 10
                      ? 'Medium blur'
                      : 'Heavy blur'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg bg-neutral-900 dark:bg-neutral-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 dark:hover:bg-neutral-600"
        >
          Reset All
        </button>
      </div>
    </div>
  );
}
