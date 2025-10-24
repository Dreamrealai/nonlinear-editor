import type { AudioEffects } from '@/types/timeline';

interface AudioEffectsSectionProps {
  bassGain: number;
  midGain: number;
  trebleGain: number;
  compression: number;
  normalize: boolean;
  onBassGainChange: (value: number) => void;
  onMidGainChange: (value: number) => void;
  onTrebleGainChange: (value: number) => void;
  onCompressionChange: (value: number) => void;
  onAudioUpdate: (updates: Partial<AudioEffects>) => void;
  onReset: () => void;
}

export function AudioEffectsSection({
  bassGain,
  midGain,
  trebleGain,
  compression,
  normalize,
  onBassGainChange,
  onMidGainChange,
  onTrebleGainChange,
  onCompressionChange,
  onAudioUpdate,
  onReset,
}: AudioEffectsSectionProps) {
  return (
    <div className="space-y-6">
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
                onChange={(e) => onBassGainChange(parseFloat(e.target.value))}
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
                onChange={(e) => onMidGainChange(parseFloat(e.target.value))}
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
                onChange={(e) => onTrebleGainChange(parseFloat(e.target.value))}
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
            onChange={(e) => onCompressionChange(parseInt(e.target.value))}
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
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={normalize}
                onChange={(e) => onAudioUpdate({ normalize: e.target.checked })}
                className="peer sr-only"
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
