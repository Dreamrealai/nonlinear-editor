'use client';

import { useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface GenerateAudioTabProps {
  projectId: string;
}

/**
 * Generate Audio Tab Component
 *
 * Provides an interface for generating audio using Suno AI (music generation)
 * and ElevenLabs (text-to-speech).
 */
export default function GenerateAudioTab({ projectId }: GenerateAudioTabProps) {
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [audioType, setAudioType] = useState<'music' | 'voice'>('music');

  // Music generation state (Suno)
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('');
  const [title, setTitle] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [instrumental, setInstrumental] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerateMusic = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim() && !customMode) {
      toast.error('Please enter a prompt');
      return;
    }

    if (customMode && !style.trim()) {
      toast.error('Please enter a style for custom mode');
      return;
    }

    setGenerating(true);
    toast.loading('Starting music generation...', { id: 'generate-audio' });

    try {
      const res = await fetch('/api/audio/suno/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          prompt,
          style: customMode ? style : undefined,
          title: title.trim() || undefined,
          customMode,
          instrumental,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Music generation failed');
      }

      setTaskId(json.taskId);
      toast.loading('Music generation in progress... This may take 1-2 minutes.', { id: 'generate-audio' });

      // Poll for music generation status
      const pollInterval = 5000; // 5 seconds
      const poll = async () => {
        try {
          const statusRes = await fetch(`/api/audio/suno/status?taskId=${encodeURIComponent(json.taskId)}&projectId=${projectId}`);
          const statusJson = await statusRes.json();

          if (statusJson.status === 'completed') {
            toast.success('Music generated successfully!', { id: 'generate-audio' });
            setGenerating(false);
            setTaskId(null);

            // Reset form
            setPrompt('');
            setStyle('');
            setTitle('');
          } else if (statusJson.status === 'failed') {
            throw new Error(statusJson.error || 'Music generation failed');
          } else {
            // Continue polling
            setTimeout(poll, pollInterval);
          }
        } catch (pollError) {
          console.error('Music generation polling failed:', pollError);
          toast.error(pollError instanceof Error ? pollError.message : 'Music generation failed', { id: 'generate-audio' });
          setGenerating(false);
          setTaskId(null);
        }
      };

      setTimeout(poll, pollInterval);
    } catch (error) {
      console.error('Music generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Music generation failed', { id: 'generate-audio' });
      setGenerating(false);
    }
  }, [projectId, prompt, style, title, customMode, instrumental]);

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
          <div className="mb-6 flex gap-2 rounded-lg border border-neutral-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setAudioType('music')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                audioType === 'music'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Music Generation (Suno)
            </button>
            <button
              type="button"
              onClick={() => setAudioType('voice')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                audioType === 'voice'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              disabled
            >
              Voice / TTS (Coming Soon)
            </button>
          </div>

          {/* Music Generation Form */}
          {audioType === 'music' && (
            <form onSubmit={handleGenerateMusic} className="space-y-4">
              {/* Prompt */}
              <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                <label htmlFor="prompt" className="block text-sm font-semibold text-neutral-900 mb-2">
                  {customMode ? 'Lyrics / Description' : 'Music Description *'}
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={customMode
                    ? "Enter your lyrics or description here..."
                    : "An upbeat electronic track with synth melodies, perfect for a tech video"
                  }
                  rows={4}
                  disabled={generating}
                  className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  required={!customMode}
                />
                <p className="mt-2 text-xs text-neutral-500">
                  Describe the music you want to generate
                </p>
              </div>

              {/* Title */}
              <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                <label htmlFor="title" className="block text-xs font-medium text-neutral-700 mb-2">
                  Title (optional)
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Awesome Track"
                  disabled={generating}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Advanced Settings Collapsible */}
              <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className={`h-4 w-4 text-neutral-500 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm font-semibold text-neutral-900">Advanced Settings</span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {showAdvanced ? 'Hide' : 'Show'}
                  </span>
                </button>

                {showAdvanced && (
                  <div className="border-t border-neutral-200 p-6 space-y-4">
                    {/* Mode Selection */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-2">
                        Generation Mode
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={!customMode}
                            onChange={() => setCustomMode(false)}
                            disabled={generating}
                            className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                          />
                          <span className="text-sm text-neutral-700">Simple Mode</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={customMode}
                            onChange={() => setCustomMode(true)}
                            disabled={generating}
                            className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                          />
                          <span className="text-sm text-neutral-700">Custom Mode</span>
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-neutral-500">
                        Simple mode auto-generates lyrics. Custom mode lets you provide your own.
                      </p>
                    </div>

                    {/* Style (Custom Mode) */}
                    {customMode && (
                      <div>
                        <label htmlFor="style" className="block text-xs font-medium text-neutral-700 mb-2">
                          Style / Genre *
                        </label>
                        <input
                          type="text"
                          id="style"
                          value={style}
                          onChange={(e) => setStyle(e.target.value)}
                          placeholder="electronic, synth-pop, upbeat"
                          disabled={generating}
                          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          required={customMode}
                        />
                        <p className="mt-1 text-xs text-neutral-500">
                          e.g., &quot;pop rock&quot;, &quot;lo-fi hip-hop&quot;, &quot;orchestral&quot;
                        </p>
                      </div>
                    )}

                    {/* Instrumental */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="instrumental"
                        checked={instrumental}
                        onChange={(e) => setInstrumental(e.target.checked)}
                        disabled={generating}
                        className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <label htmlFor="instrumental" className="text-sm text-neutral-700">
                        Make instrumental (no vocals)
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex-1">
                  {generating && taskId && (
                    <p className="text-sm text-neutral-600">
                      Generation in progress... This may take 1-2 minutes. You can navigate away and check back later.
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={generating || (!prompt.trim() && !customMode) || (customMode && !style.trim())}
                  className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-md transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-purple-500 disabled:hover:to-pink-500"
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        Generate Music
                      </>
                    )}
                  </div>
                </button>
              </div>
            </form>
          )}

          {/* Voice Generation (Coming Soon) */}
          {audioType === 'voice' && (
            <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-neutral-100 p-4">
                  <svg className="h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">Voice Generation Coming Soon</h3>
                  <p className="mt-2 text-sm text-neutral-600">
                    Text-to-speech with ElevenLabs will be available in a future update.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
