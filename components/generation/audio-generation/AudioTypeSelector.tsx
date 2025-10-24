/**
 * AudioTypeSelector - Audio generation type selector tabs
 *
 * Provides a segmented control for switching between different audio
 * generation modes: Music (Suno), Voice (ElevenLabs), and Sound Effects.
 * Displays active state with dark background and smooth transitions.
 *
 * Features:
 * - Three audio types: Music, Voice, SFX
 * - Active state highlighting
 * - Smooth hover transitions
 * - Integrated service labels (Suno, ElevenLabs)
 * - Responsive tab layout
 *
 * @param audioType - Currently selected audio type ('music' | 'voice' | 'sfx')
 * @param onTypeChange - Callback when user switches audio type
 *
 * @example
 * ```tsx
 * <AudioTypeSelector
 *   audioType="music"
 *   onTypeChange={(type) => setAudioType(type)}
 * />
 * ```
 */
interface AudioTypeSelectorProps {
  audioType: 'music' | 'voice' | 'sfx';
  onTypeChange: (type: 'music' | 'voice' | 'sfx') => void;
}

export function AudioTypeSelector({ audioType, onTypeChange }: AudioTypeSelectorProps): JSX.Element {
  return (
    <div className="mb-6 flex gap-2 rounded-lg border border-neutral-200 bg-white p-1">
      <button
        type="button"
        onClick={(): void => onTypeChange('music')}
        className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
          audioType === 'music'
            ? 'bg-neutral-900 text-white shadow-sm'
            : 'text-neutral-600 hover:text-neutral-900'
        }`}
      >
        Music (Suno)
      </button>
      <button
        type="button"
        onClick={(): void => onTypeChange('voice')}
        className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
          audioType === 'voice'
            ? 'bg-neutral-900 text-white shadow-sm'
            : 'text-neutral-600 hover:text-neutral-900'
        }`}
      >
        Voice (ElevenLabs)
      </button>
      <button
        type="button"
        onClick={(): void => onTypeChange('sfx')}
        className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
          audioType === 'sfx'
            ? 'bg-neutral-900 text-white shadow-sm'
            : 'text-neutral-600 hover:text-neutral-900'
        }`}
      >
        Sound Effects
      </button>
    </div>
  );
}
