import VoiceSelector from './VoiceSelector';

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
}

interface VoiceGenerationFormProps {
  voiceText: string;
  setVoiceText: (value: string) => void;
  voices: Voice[];
  selectedVoice: string;
  setSelectedVoice: (value: string) => void;
  loadingVoices: boolean;
  generating: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function VoiceGenerationForm({
  voiceText,
  setVoiceText,
  voices,
  selectedVoice,
  setSelectedVoice,
  loadingVoices,
  generating,
  onSubmit,
}: VoiceGenerationFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Text Input */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <label htmlFor="voiceText" className="block text-sm font-semibold text-neutral-900 mb-2">
          Text to Convert to Speech *
        </label>
        <textarea
          id="voiceText"
          value={voiceText}
          onChange={(e) => setVoiceText(e.target.value)}
          placeholder="Enter the text you want to convert to speech..."
          rows={6}
          disabled={generating}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          required
        />
        <p className="mt-2 text-xs text-neutral-500">
          Enter the text you want to convert to natural-sounding speech
        </p>
      </div>

      {/* Voice Selection */}
      <VoiceSelector
        voices={voices}
        selectedVoice={selectedVoice}
        onVoiceChange={setSelectedVoice}
        loadingVoices={loadingVoices}
        disabled={generating}
      />

      {/* Submit Button */}
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex-1">
          {generating && (
            <p className="text-sm text-neutral-600">
              Generating voice... This should take just a few seconds.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={generating || !voiceText.trim()}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-cyan-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-blue-500 disabled:hover:to-cyan-500"
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
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                Generate Voice
              </>
            )}
          </div>
        </button>
      </div>
    </form>
  );
}
