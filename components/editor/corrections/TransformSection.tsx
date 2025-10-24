/**
 * TransformSection - Clip transformation and orientation controls
 *
 * Provides controls for rotating, scaling, and flipping video clips.
 * Features a two-column layout with rotation/scale on the left and
 * flip controls on the right.
 *
 * Features:
 * - Rotation control (0-360 degrees)
 * - Scale control (0.1x to 3x)
 * - Horizontal flip toggle
 * - Vertical flip toggle
 * - Visual feedback with gradient sliders
 * - Reset all transformations
 *
 * @param rotation - Current rotation angle in degrees (0-360)
 * @param scale - Current scale multiplier (0.1-3.0)
 * @param flipHorizontal - Whether clip is flipped horizontally
 * @param flipVertical - Whether clip is flipped vertically
 * @param onRotationChange - Callback when rotation changes
 * @param onScaleChange - Callback when scale changes
 * @param onFlipUpdate - Callback for flip property updates
 * @param onReset - Callback to reset all transformations
 *
 * @example
 * ```tsx
 * <TransformSection
 *   rotation={0}
 *   scale={1.0}
 *   flipHorizontal={false}
 *   flipVertical={false}
 *   onRotationChange={(r) => setRotation(r)}
 *   onScaleChange={(s) => setScale(s)}
 *   onFlipUpdate={(flip) => updateFlip(flip)}
 *   onReset={() => resetTransforms()}
 * />
 * ```
 */
import type { Transform } from '@/types/timeline';

interface TransformSectionProps {
  rotation: number;
  scale: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  onRotationChange: (value: number) => void;
  onScaleChange: (value: number) => void;
  onFlipUpdate: (updates: Partial<Transform>) => void;
  onReset: () => void;
}

export function TransformSection({
  rotation,
  scale,
  flipHorizontal,
  flipVertical,
  onRotationChange,
  onScaleChange,
  onFlipUpdate,
  onReset,
}: TransformSectionProps): JSX.Element {
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
