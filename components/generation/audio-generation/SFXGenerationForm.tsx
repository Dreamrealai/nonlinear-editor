interface SFXGenerationFormProps {
  sfxPrompt: string;
  setSfxPrompt: (value: string) => void;
  sfxDuration: number;
  setSfxDuration: (value: number) => void;
  generating: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const SFX_PRESETS = [
  'Door knock',
  'Phone ringing',
  'Car engine',
  'Glass breaking',
  'Crowd applause',
  'Thunder storm',
  'Footsteps',
  'Bird chirping',
];

export default function SFXGenerationForm({
  sfxPrompt,
  setSfxPrompt,
  sfxDuration,
  setSfxDuration,
  generating,
  onSubmit,
}: SFXGenerationFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* SFX Prompt */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <label htmlFor="sfxPrompt" className="block text-sm font-semibold text-neutral-900 mb-2">
          Sound Effect Description *
        </label>
        <textarea
          id="sfxPrompt"
          value={sfxPrompt}
          onChange={(e) => setSfxPrompt(e.target.value)}
          placeholder="Describe the sound effect you want to generate..."
          rows={4}
          disabled={generating}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          required
        />
        <p className="mt-2 text-xs text-neutral-500">
          Examples: &quot;Door creaking open&quot;, &quot;Thunder and rain&quot;, &quot;Footsteps on
          gravel&quot;
        </p>
      </div>

      {/* Duration Slider */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <label htmlFor="sfxDuration" className="block text-sm font-semibold text-neutral-900 mb-2">
          Duration: {sfxDuration.toFixed(1)}s
        </label>
        <input
          type="range"
          id="sfxDuration"
          min="1"
          max="22"
          step="0.5"
          value={sfxDuration}
          onChange={(e) => setSfxDuration(parseFloat(e.target.value))}
          disabled={generating}
          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="flex justify-between mt-2 text-xs text-neutral-500">
          <span>1s</span>
          <span>22s</span>
        </div>
      </div>

      {/* Common Sound Effects Presets */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="block text-sm font-semibold text-neutral-900 mb-3">Quick Presets</h3>
        <div className="grid grid-cols-2 gap-2">
          {SFX_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setSfxPrompt(preset)}
              disabled={generating}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 transition-all hover:border-neutral-900 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex-1">
          {generating && (
            <p className="text-sm text-neutral-600">
              Generating sound effect... This may take a moment.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={generating || !sfxPrompt.trim()}
          className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 font-semibold text-white shadow-md transition-all hover:from-green-600 hover:to-emerald-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-green-500 disabled:hover:to-emerald-500"
        >
          <div className="flex items-center gap-2">
            {generating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
                Generate SFX
              </>
            )}
          </div>
        </button>
      </div>
    </form>
  );
}
