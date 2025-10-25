/**
 * AudioGenerationModal Component
 * Modal for generating audio using Suno or ElevenLabs
 */
'use client';

import React from 'react';

type AudioGenerationModalProps = {
  isOpen: boolean;
  isPending: boolean;
  mode: 'suno' | 'elevenlabs' | null;
  onClose: () => void;
  onModeSelect: (mode: 'suno' | 'elevenlabs') => void;
  onModeBack: () => void;
  onGenerateSuno: (formData: {
    prompt: string;
    style?: string;
    title?: string;
    customMode?: boolean;
    instrumental?: boolean;
  }) => void;
  onGenerateElevenLabs: (formData: { text: string; voiceId?: string; modelId?: string }) => void;
};

export function AudioGenerationModal({
  isOpen,
  isPending,
  mode,
  onClose,
  onModeSelect,
  onModeBack,
  onGenerateSuno,
  onGenerateElevenLabs,
}: AudioGenerationModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">Generate Audio</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {!mode ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">Choose an AI provider to generate audio:</p>
            <button
              type="button"
              onClick={() => onModeSelect('suno')}
              className="w-full rounded-lg border-2 border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              <h4 className="font-semibold text-neutral-900">Suno V5</h4>
              <p className="mt-1 text-xs text-neutral-600">Generate music and songs with AI</p>
            </button>
            <button
              type="button"
              onClick={() => onModeSelect('elevenlabs')}
              className="w-full rounded-lg border-2 border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              <h4 className="font-semibold text-neutral-900">ElevenLabs</h4>
              <p className="mt-1 text-xs text-neutral-600">
                Generate speech from text with realistic voices
              </p>
            </button>
          </div>
        ) : mode === 'suno' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onGenerateSuno({
                prompt: formData.get('prompt') as string,
                style: formData.get('style') as string,
                title: formData.get('title') as string,
                customMode: formData.get('customMode') === 'on',
                instrumental: formData.get('instrumental') === 'on',
              });
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-neutral-700">
                Prompt *
              </label>
              <textarea
                id="prompt"
                name="prompt"
                required
                rows={3}
                placeholder="Describe the music you want to generate..."
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="style" className="block text-sm font-medium text-neutral-700">
                Style/Genre
              </label>
              <input
                id="style"
                name="style"
                type="text"
                placeholder="e.g., Jazz, Classical, Electronic"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-neutral-700">
                Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="Optional title for the track"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="customMode" className="rounded" />
                <span className="text-sm text-neutral-700">Custom Mode</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="instrumental" className="rounded" />
                <span className="text-sm text-neutral-700">Instrumental</span>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onModeBack}
                disabled={isPending}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onGenerateElevenLabs({
                text: formData.get('text') as string,
                voiceId: (formData.get('voiceId') as string) || undefined,
                modelId: (formData.get('modelId') as string) || undefined,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="text" className="block text-sm font-medium text-neutral-700">
                Text *
              </label>
              <textarea
                id="text"
                name="text"
                required
                rows={4}
                placeholder="Enter the text you want to convert to speech..."
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="voiceId" className="block text-sm font-medium text-neutral-700">
                Voice
              </label>
              <select
                id="voiceId"
                name="voiceId"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              >
                <option value="">Default (Sarah)</option>
                <option value="EXAVITQu4vr4xnSDxMaL">Sarah</option>
                <option value="pNInz6obpgDQGcFmaJgB">Adam</option>
                <option value="21m00Tcm4TlvDq8ikWAM">Rachel</option>
              </select>
            </div>
            <div>
              <label htmlFor="modelId" className="block text-sm font-medium text-neutral-700">
                Model
              </label>
              <select
                id="modelId"
                name="modelId"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              >
                <option value="eleven_multilingual_v2">Multilingual v2 (High Quality)</option>
                <option value="eleven_flash_v2_5">Flash v2.5 (Fast, Low Latency)</option>
                <option value="eleven_turbo_v2_5">Turbo v2.5 (Balanced)</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onModeBack}
                disabled={isPending}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
