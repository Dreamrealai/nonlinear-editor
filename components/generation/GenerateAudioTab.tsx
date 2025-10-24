'use client';

import { Toaster } from 'react-hot-toast';
import { useAudioGeneration } from './audio-generation/useAudioGeneration';
import { AudioTypeSelector } from './audio-generation/AudioTypeSelector';
import { MusicGenerationForm } from './audio-generation/MusicGenerationForm';
import { VoiceGenerationForm } from './audio-generation/VoiceGenerationForm';
import { SFXGenerationForm } from './audio-generation/SFXGenerationForm';

interface GenerateAudioTabProps {
  projectId: string;
}

/**
 * Generate Audio Tab Component
 *
 * Provides an interface for generating audio using Suno AI (music generation)
 * and ElevenLabs (text-to-speech and sound effects).
 *
 * This component orchestrates the audio generation UI by delegating to specialized
 * sub-components for each audio type (music, voice, sound effects).
 */
export function GenerateAudioTab({ projectId }: GenerateAudioTabProps): JSX.Element {
  const audioGeneration = useAudioGeneration({ projectId });

  return (
    <div className="flex h-full flex-col">
      <Toaster position="bottom-right" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Generate Audio with AI</h1>
            <p className="text-sm text-neutral-600">
              Create music and audio using Suno AI. Generate custom tracks for your videos.
            </p>
          </div>

          {/* Audio Type Selection */}
          <AudioTypeSelector
            audioType={audioGeneration.audioType}
            onTypeChange={audioGeneration.setAudioType}
          />

          {/* Music Generation Form */}
          {audioGeneration.audioType === 'music' && (
            <MusicGenerationForm
              prompt={audioGeneration.prompt}
              setPrompt={audioGeneration.setPrompt}
              style={audioGeneration.style}
              setStyle={audioGeneration.setStyle}
              title={audioGeneration.title}
              setTitle={audioGeneration.setTitle}
              customMode={audioGeneration.customMode}
              setCustomMode={audioGeneration.setCustomMode}
              instrumental={audioGeneration.instrumental}
              setInstrumental={audioGeneration.setInstrumental}
              generating={audioGeneration.generating}
              taskId={audioGeneration.taskId}
              onSubmit={audioGeneration.handleGenerateMusic}
            />
          )}

          {/* Voice Generation Form (ElevenLabs) */}
          {audioGeneration.audioType === 'voice' && (
            <VoiceGenerationForm
              voiceText={audioGeneration.voiceText}
              setVoiceText={audioGeneration.setVoiceText}
              voices={audioGeneration.voices}
              selectedVoice={audioGeneration.selectedVoice}
              setSelectedVoice={audioGeneration.setSelectedVoice}
              loadingVoices={audioGeneration.loadingVoices}
              generating={audioGeneration.generating}
              onSubmit={audioGeneration.handleGenerateVoice}
            />
          )}

          {/* Sound Effects Generation Form */}
          {audioGeneration.audioType === 'sfx' && (
            <SFXGenerationForm
              sfxPrompt={audioGeneration.sfxPrompt}
              setSfxPrompt={audioGeneration.setSfxPrompt}
              sfxDuration={audioGeneration.sfxDuration}
              setSfxDuration={audioGeneration.setSfxDuration}
              generating={audioGeneration.generating}
              onSubmit={audioGeneration.handleGenerateSFX}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default GenerateAudioTab;
