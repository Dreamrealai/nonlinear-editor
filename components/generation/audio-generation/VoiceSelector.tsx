/**
 * VoiceSelector - AI voice selection dropdown
 *
 * Dropdown selector for choosing AI voices for text-to-speech generation.
 * Displays available voices with optional category labels, loading state,
 * and a default fallback voice.
 *
 * Features:
 * - Dynamic voice list from API
 * - Loading state with spinner
 * - Default voice fallback (Sarah)
 * - Voice categories display
 * - Disabled state support
 * - Accessible select element
 *
 * @param voices - Array of available AI voices
 * @param selectedVoice - Currently selected voice ID
 * @param onVoiceChange - Callback when voice selection changes
 * @param loadingVoices - Whether voices are being loaded from API
 * @param disabled - Whether the selector should be disabled
 *
 * @example
 * ```tsx
 * <VoiceSelector
 *   voices={voiceList}
 *   selectedVoice="EXAVITQu4vr4xnSDxMaL"
 *   onVoiceChange={(id) => setVoiceId(id)}
 *   loadingVoices={false}
 *   disabled={isGenerating}
 * />
 * ```
 */
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
}: VoiceSelectorProps): JSX.Element {
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
          onChange={(e): void => onVoiceChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {voices.length === 0 ? (
            <option value="EXAVITQu4vr4xnSDxMaL">Sarah (Default)</option>
          ) : (
            voices.map((voice): JSX.Element => (
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
