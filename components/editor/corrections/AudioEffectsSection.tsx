/**
 * AudioEffectsSection - Comprehensive audio effects control panel
 *
 * Provides fine-grained control over audio properties including volume,
 * equalization, compression, fades, and normalization. Features an intuitive
 * interface with visual feedback for all adjustments.
 *
 * Features:
 * - Volume control with mute toggle (-60dB to +12dB)
 * - Fade in/out controls (0-5 seconds)
 * - 3-band equalizer (Bass, Mid, Treble) with -12dB to +12dB range
 * - Dynamic range compression (0-100%)
 * - Audio normalization to -3dB peak
 * - Reset all settings to defaults
 *
 * @param volume - Volume adjustment in decibels (-60 to +12)
 * @param mute - Whether audio is muted
 * @param fadeIn - Fade in duration in seconds (0-5)
 * @param fadeOut - Fade out duration in seconds (0-5)
 * @param bassGain - Bass frequency gain in dB (-12 to +12, 100-400 Hz)
 * @param midGain - Mid frequency gain in dB (-12 to +12, 400-4000 Hz)
 * @param trebleGain - Treble frequency gain in dB (-12 to +12, 4000+ Hz)
 * @param compression - Compression intensity (0-100%)
 * @param normalize - Whether to auto-normalize to -3dB peak
 * @param onVolumeChange - Callback when volume changes
 * @param onFadeInChange - Callback when fade in duration changes
 * @param onFadeOutChange - Callback when fade out duration changes
 * @param onBassGainChange - Callback when bass gain changes
 * @param onMidGainChange - Callback when mid gain changes
 * @param onTrebleGainChange - Callback when treble gain changes
 * @param onCompressionChange - Callback when compression changes
 * @param onAudioUpdate - Callback for batch audio property updates
 * @param onReset - Callback to reset all effects to defaults
 *
 * @example
 * ```tsx
 * <AudioEffectsSection
 *   volume={0}
 *   mute={false}
 *   fadeIn={0}
 *   fadeOut={0}
 *   bassGain={0}
 *   midGain={0}
 *   trebleGain={0}
 *   compression={0}
 *   normalize={false}
 *   onVolumeChange={(v) => setVolume(v)}
 *   onAudioUpdate={(updates) => applyUpdates(updates)}
 *   onReset={() => resetToDefaults()}
 * />
 * ```
 */
import type { AudioEffects } from '@/types/timeline';

interface AudioEffectsSectionProps {
  volume: number;
  mute: boolean;
  fadeIn: number;
  fadeOut: number;
  bassGain: number;
  midGain: number;
  trebleGain: number;
  compression: number;
  normalize: boolean;
  onVolumeChange: (value: number) => void;
  onFadeInChange: (value: number) => void;
  onFadeOutChange: (value: number) => void;
  onBassGainChange: (value: number) => void;
  onMidGainChange: (value: number) => void;
  onTrebleGainChange: (value: number) => void;
  onCompressionChange: (value: number) => void;
  onAudioUpdate: (updates: Partial<AudioEffects>) => void;
  onReset: () => void;
}

export function AudioEffectsSection({
  volume,
  mute,
  fadeIn,
  fadeOut,
  bassGain,
  midGain,
  trebleGain,
  compression,
  normalize,
  onVolumeChange,
  onFadeInChange,
  onFadeOutChange,
  onBassGainChange,
  onMidGainChange,
  onTrebleGainChange,
  onCompressionChange,
  onAudioUpdate,
  onReset,
}: AudioEffectsSectionProps): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Volume Control */}
      <div className="rounded-lg border border-neutral-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <svg
            className="h-5 w-5 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
          Volume Control
        </h4>

        <div className="space-y-4">
          {/* Volume Slider */}
          <div>
            <label className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
              <span>Volume</span>
              <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                {volume > 0 ? '+' : ''}
                {volume} dB
              </span>
            </label>
            <input
              type="range"
              min="-60"
              max="12"
              step="1"
              value={volume}
              onChange={(e): void => onVolumeChange(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-blue-300 to-blue-600"
              style={{ accentColor: '#2563eb' }}
            />
            <div className="mt-1 flex justify-between text-[10px] text-neutral-600">
              <span>-60dB (Silent)</span>
              <span>0dB (Normal)</span>
              <span>+12dB (Boost)</span>
            </div>
          </div>

          {/* Mute Toggle */}
          <label htmlFor="audio-mute" className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                id="audio-mute"
                type="checkbox"
                checked={mute}
                onChange={(e): void => onAudioUpdate({ mute: e.target.checked })}
                className="peer sr-only"
                aria-label="Mute audio"
              />
              <div className="h-6 w-11 rounded-full bg-neutral-300 peer-checked:bg-red-600 transition"></div>
              <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5"></div>
            </div>
            <div>
              <span className="text-xs font-medium text-neutral-700 group-hover:text-neutral-900">
                Mute
              </span>
              <p className="text-[10px] text-neutral-600">Silence audio completely</p>
            </div>
          </label>
        </div>
      </div>

      {/* Fades */}
      <div className="grid grid-cols-2 gap-4">
        {/* Fade In */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <label className="mb-3 flex items-center justify-between text-xs font-medium text-neutral-700">
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
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              Fade In
            </span>
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
              {fadeIn.toFixed(1)}s
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={fadeIn}
            onChange={(e): void => onFadeInChange(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-neutral-300 to-green-600"
            style={{ accentColor: '#16a34a' }}
          />
          <p className="mt-2 text-[10px] text-neutral-600">
            Gradual volume increase at start
          </p>
        </div>

        {/* Fade Out */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <label className="mb-3 flex items-center justify-between text-xs font-medium text-neutral-700">
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              Fade Out
            </span>
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
              {fadeOut.toFixed(1)}s
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={fadeOut}
            onChange={(e): void => onFadeOutChange(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-red-600 to-neutral-300"
            style={{ accentColor: '#dc2626' }}
          />
          <p className="mt-2 text-[10px] text-neutral-600">
            Gradual volume decrease at end
          </p>
        </div>
      </div>
      {/* Equalizer */}
      <div className="rounded-lg border border-neutral-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <svg
            className="h-5 w-5 text-purple-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
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
                value={bassGain}
                onChange={(e): void => onBassGainChange(parseFloat(e.target.value))}
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
                {bassGain > 0 ? '+' : ''}
                {bassGain} dB
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
                value={midGain}
                onChange={(e): void => onMidGainChange(parseFloat(e.target.value))}
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
                {midGain > 0 ? '+' : ''}
                {midGain} dB
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
                value={trebleGain}
                onChange={(e): void => onTrebleGainChange(parseFloat(e.target.value))}
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
                {trebleGain > 0 ? '+' : ''}
                {trebleGain} dB
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
              Compression
            </span>
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
              {compression}%
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={compression}
            onChange={(e): void => onCompressionChange(parseInt(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-orange-300 to-orange-600"
            style={{ accentColor: '#3b82f6' }}
          />
          <p className="mt-2 text-[10px] text-neutral-600">
            Reduces dynamic range for consistent volume
          </p>
        </div>

        {/* Normalize */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h4 className="mb-3 text-xs font-semibold text-neutral-900">Normalization</h4>
          <label htmlFor="audio-normalize" className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                id="audio-normalize"
                type="checkbox"
                checked={normalize}
                onChange={(e): void => onAudioUpdate({ normalize: e.target.checked })}
                className="peer sr-only"
                aria-label="Auto-normalize audio"
              />
              <div className="h-6 w-11 rounded-full bg-neutral-300 peer-checked:bg-green-600 transition"></div>
              <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5"></div>
            </div>
            <div>
              <span className="text-xs font-medium text-neutral-700 group-hover:text-neutral-900">
                Auto-Normalize
              </span>
              <p className="text-[10px] text-neutral-600">Adjust peak volume to -3dB</p>
            </div>
          </label>
        </div>
      </div>

      {/* Reset Button */}
      <div className="flex justify-end">
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
