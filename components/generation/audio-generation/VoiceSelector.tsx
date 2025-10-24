interface Voice {
  voice_id: string;
  name: string;
  category?: string;
}

interface VoiceSelectorProps {
  voices: Voice[];
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
  loadingVoices: boolean;
  disabled?: boolean;
}

export function VoiceSelector({
  voices,
  selectedVoice,
  onVoiceChange,
  loadingVoices,
  disabled = false,
}: VoiceSelectorProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <label htmlFor="voice" className="block text-sm font-semibold text-neutral-900 mb-2">
        Voice Selection
      </label>
      {loadingVoices ? (
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
          Loading voices...
        </div>
      ) : (
        <select
          id="voice"
          value={selectedVoice}
          onChange={(e) => onVoiceChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {voices.length === 0 ? (
            <option value="EXAVITQu4vr4xnSDxMaL">Sarah (Default)</option>
          ) : (
            voices.map((voice) => (
              <option key={voice.voice_id} value={voice.voice_id}>
                {voice.name}
                {voice.category ? ` - ${voice.category}` : ''}
              </option>
            ))
          )}
        </select>
      )}
      <p className="mt-2 text-xs text-neutral-500">
        Select a voice for your text-to-speech generation
      </p>
    </div>
  );
}
