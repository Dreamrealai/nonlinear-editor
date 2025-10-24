/**
 * ColorCorrectionSection - Basic color correction controls
 *
 * Provides essential color correction tools for adjusting brightness,
 * contrast, saturation, and hue. Features a two-column layout with
 * intuitive gradient sliders for visual feedback.
 *
 * Features:
 * - Brightness adjustment (0-200%)
 * - Contrast adjustment (0-200%)
 * - Saturation adjustment (0-200%)
 * - Hue rotation (0-360 degrees)
 * - Visual gradient sliders
 * - Reset all corrections
 *
 * @param brightness - Brightness level (0-200%)
 * @param contrast - Contrast level (0-200%)
 * @param saturation - Color saturation (0-200%)
 * @param hue - Hue rotation in degrees (0-360)
 * @param onBrightnessChange - Callback when brightness changes
 * @param onContrastChange - Callback when contrast changes
 * @param onSaturationChange - Callback when saturation changes
 * @param onHueChange - Callback when hue rotation changes
 * @param onReset - Callback to reset all corrections
 *
 * @example
 * ```tsx
 * <ColorCorrectionSection
 *   brightness={100}
 *   contrast={100}
 *   saturation={100}
 *   hue={0}
 *   onBrightnessChange={(b) => setBrightness(b)}
 *   onReset={() => resetColors()}
 * />
 * ```
 */

interface ColorCorrectionSectionProps {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
  onHueChange: (value: number) => void;
  onReset: () => void;
}

export function ColorCorrectionSection({
  brightness,
  contrast,
  saturation,
  hue,
  onBrightnessChange,
  onContrastChange,
  onSaturationChange,
  onHueChange,
  onReset,
}: ColorCorrectionSectionProps): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        {/* Brightness */}
        <div className="group">
          <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
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
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
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
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
              Contrast
            </span>
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
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
      </div>

      <div className="space-y-4">
        {/* Saturation */}
        <div className="group">
          <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
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
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
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

        {/* Hue */}
        <div className="group">
          <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
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
              Hue
            </span>
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
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
