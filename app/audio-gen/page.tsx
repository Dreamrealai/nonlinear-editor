'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { browserLogger } from '@/lib/browserLogger';

type AudioGenMode = 'suno' | 'elevenlabs' | null;

export default function AudioGenPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [audioGenMode, setAudioGenMode] = useState<AudioGenMode>(null);
  const [audioGenPending, setAudioGenPending] = useState(false);

  // Track polling timeout IDs for cleanup - CRITICAL: prevents memory leaks
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect((): (() => void) => {
    return (): void => {
      isMountedRef.current = false;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, []);

  const handleGenerateSuno = async (formData: {
    prompt: string;
    style?: string;
    title?: string;
    customMode?: boolean;
    instrumental?: boolean;
  }): Promise<void> => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    setAudioGenPending(true);
    toast.loading('Generating audio with Suno V5...', { id: 'generate-suno' });

    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const res = await fetch('/api/audio/suno/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Audio generation failed');
      }

      const taskId = json.taskId;
      toast.success('Audio generation started', { id: 'generate-suno' });

      // Poll for completion with cleanup tracking
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      const pollInterval = 5000; // 5 seconds

      const poll = async (): Promise<void> => {
        // Check if component is still mounted
        if (!isMountedRef.current) {
          return;
        }

        attempts++;
        if (attempts > maxAttempts) {
          throw new Error('Audio generation timed out');
        }

        const statusRes = await fetch(`/api/audio/suno/status?taskId=${taskId}`);
        const statusJson = await statusRes.json();

        if (!statusRes.ok) {
          throw new Error(statusJson.error || 'Status check failed');
        }

        const task = statusJson.tasks?.[0];
        if (!task) {
          throw new Error('Task not found');
        }

        // Check again if component is still mounted before updating state
        if (!isMountedRef.current) {
          return;
        }

        if (task.status === 'complete' && task.audioUrl) {
          toast.success('Audio generated successfully!', { id: 'generate-suno' });

          // Upload to Supabase and create asset
          const audioRes = await fetch(task.audioUrl);
          const audioBlob = await audioRes.blob();
          const fileName = `suno_${Date.now()}.mp3`;
          const filePath = `${user.id}/${projectId}/audio/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('assets')
            .upload(filePath, audioBlob, { contentType: 'audio/mpeg' });

          if (uploadError) throw uploadError;

          const storageUrl = `supabase://assets/${filePath}`;
          const { error: assetError } = await supabase
            .from('assets')
            .insert({
              project_id: projectId,
              user_id: user.id,
              storage_url: storageUrl,
              type: 'audio',
              source: 'genai',
              mime_type: 'audio/mpeg',
              duration_seconds: task.duration ?? null,
              metadata: {
                filename: fileName,
                provider: 'suno',
                prompt: task.prompt,
                title: task.title,
                tags: task.tags,
              },
            })
            .select()
            .single();

          if (assetError) throw assetError;

          if (isMountedRef.current) {
            setAudioGenPending(false);
            pollingTimeoutRef.current = null;
          }
          toast.success('Audio added to your project!');
          router.push(`/editor/${projectId}`);
        } else if (task.status === 'failed') {
          throw new Error('Audio generation failed');
        } else {
          // Still processing, poll again - store timeout ID for cleanup
          pollingTimeoutRef.current = setTimeout(poll, pollInterval);
        }
      };

      // Start polling - store timeout ID for cleanup
      pollingTimeoutRef.current = setTimeout(poll, pollInterval);
    } catch (error) {
      browserLogger.error({ error, projectId, formData }, 'Suno audio generation failed');
      toast.error(error instanceof Error ? error.message : 'Audio generation failed', {
        id: 'generate-suno',
      });
      setAudioGenPending(false);
    }
  };

  const handleGenerateElevenLabs = async (formData: {
    text: string;
    voiceId?: string;
    modelId?: string;
  }): Promise<void> => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    setAudioGenPending(true);
    toast.loading('Generating audio with ElevenLabs...', { id: 'generate-elevenlabs' });

    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const res = await fetch('/api/audio/elevenlabs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId,
          userId: user.id,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Audio generation failed');
      }

      toast.success('Audio generated successfully!', { id: 'generate-elevenlabs' });
      setAudioGenPending(false);
      router.push(`/editor/${projectId}`);
    } catch (error) {
      browserLogger.error({ error, projectId, formData }, 'ElevenLabs audio generation failed');
      toast.error(error instanceof Error ? error.message : 'Audio generation failed', {
        id: 'generate-elevenlabs',
      });
      setAudioGenPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <Toaster position="bottom-right" />
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-neutral-900">Generate Audio with AI</h1>
          {projectId && (
            <Link
              href={`/editor/${projectId}`}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow hover:bg-neutral-50"
            >
              Back to Editor
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
          {!audioGenMode ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Choose an AI Provider</h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Select an AI provider to generate audio for your project
                </p>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setAudioGenMode('suno')}
                  className="w-full rounded-lg border-2 border-neutral-200 bg-white p-6 text-left transition hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <h3 className="text-lg font-semibold text-neutral-900">Suno V5</h3>
                  <p className="mt-2 text-sm text-neutral-600">Generate music and songs with AI</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAudioGenMode('elevenlabs')}
                  className="w-full rounded-lg border-2 border-neutral-200 bg-white p-6 text-left transition hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <h3 className="text-lg font-semibold text-neutral-900">ElevenLabs</h3>
                  <p className="mt-2 text-sm text-neutral-600">
                    Generate speech from text with realistic voices
                  </p>
                </button>
              </div>

              {!projectId && (
                <div className="mt-6 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-600">
                  Please select a project from the editor to generate audio.
                </div>
              )}
            </div>
          ) : audioGenMode === 'suno' ? (
            <div>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setAudioGenMode(null)}
                  disabled={audioGenPending}
                  className="mb-4 text-sm text-neutral-600 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ← Back to providers
                </button>
                <h2 className="text-lg font-semibold text-neutral-900">Suno V5</h2>
                <p className="mt-2 text-sm text-neutral-600">Generate music and songs with AI</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  void handleGenerateSuno({
                    prompt: formData.get('prompt') as string,
                    style: formData.get('style') as string,
                    title: formData.get('title') as string,
                    customMode: formData.get('customMode') === 'on',
                    instrumental: formData.get('instrumental') === 'on',
                  });
                }}
                className="space-y-6"
              >
                <div>
                  <label
                    htmlFor="prompt"
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Prompt *
                  </label>
                  <textarea
                    id="prompt"
                    name="prompt"
                    required
                    disabled={audioGenPending}
                    rows={4}
                    placeholder="Describe the music you want to generate..."
                    className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="style"
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Style/Genre
                  </label>
                  <input
                    id="style"
                    name="style"
                    type="text"
                    disabled={audioGenPending}
                    placeholder="e.g., Jazz, Classical, Electronic"
                    className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Title
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    disabled={audioGenPending}
                    placeholder="Optional title for the track"
                    className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="customMode"
                      className="rounded"
                      disabled={audioGenPending}
                    />
                    <span className="text-sm text-neutral-700">Custom Mode</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="instrumental"
                      className="rounded"
                      disabled={audioGenPending}
                    />
                    <span className="text-sm text-neutral-700">Instrumental</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={audioGenPending}
                  className="w-full rounded-lg bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {audioGenPending ? 'Generating...' : 'Generate'}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setAudioGenMode(null)}
                  disabled={audioGenPending}
                  className="mb-4 text-sm text-neutral-600 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ← Back to providers
                </button>
                <h2 className="text-lg font-semibold text-neutral-900">ElevenLabs</h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Generate speech from text with realistic voices
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  void handleGenerateElevenLabs({
                    text: formData.get('text') as string,
                    voiceId: (formData.get('voiceId') as string) || undefined,
                    modelId: (formData.get('modelId') as string) || undefined,
                  });
                }}
                className="space-y-6"
              >
                <div>
                  <label htmlFor="text" className="block text-sm font-medium text-neutral-700 mb-2">
                    Text *
                  </label>
                  <textarea
                    id="text"
                    name="text"
                    required
                    disabled={audioGenPending}
                    rows={6}
                    placeholder="Enter the text you want to convert to speech..."
                    className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="voiceId"
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Voice
                  </label>
                  <select
                    id="voiceId"
                    name="voiceId"
                    disabled={audioGenPending}
                    className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Default (Sarah)</option>
                    <option value="EXAVITQu4vr4xnSDxMaL">Sarah</option>
                    <option value="pNInz6obpgDQGcFmaJgB">Adam</option>
                    <option value="21m00Tcm4TlvDq8ikWAM">Rachel</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="modelId"
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Model
                  </label>
                  <select
                    id="modelId"
                    name="modelId"
                    disabled={audioGenPending}
                    className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="eleven_multilingual_v2">Multilingual v2 (High Quality)</option>
                    <option value="eleven_flash_v2_5">Flash v2.5 (Fast, Low Latency)</option>
                    <option value="eleven_turbo_v2_5">Turbo v2.5 (Balanced)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={audioGenPending}
                  className="w-full rounded-lg bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {audioGenPending ? 'Generating...' : 'Generate'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
