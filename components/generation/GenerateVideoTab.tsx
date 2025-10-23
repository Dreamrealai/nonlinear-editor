'use client';

import { useState, useCallback } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import toast, { Toaster } from 'react-hot-toast';

interface GenerateVideoTabProps {
  projectId: string;
}

/**
 * Generate Video Tab Component
 *
 * Provides a comprehensive interface for generating videos using Google Vertex AI Veo models.
 * Supports all available Veo parameters including duration, aspect ratio, resolution,
 * negative prompts, person generation settings, and more.
 */
export default function GenerateVideoTab({ projectId }: GenerateVideoTabProps) {
  const { supabaseClient } = useSupabase();
  const [generating, setGenerating] = useState(false);
  const [operationName, setOperationName] = useState<string | null>(null);

  // Form state
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<string>('veo-3.1-generate-preview');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [duration, setDuration] = useState<4 | 5 | 6 | 8>(8);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [personGeneration, setPersonGeneration] = useState<'allow_adult' | 'dont_allow'>('allow_adult');
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [generateAudio, setGenerateAudio] = useState(true);
  const [seed, setSeed] = useState<string>('');
  const [sampleCount, setSampleCount] = useState<1 | 2 | 3 | 4>(1);

  const handleGenerateVideo = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setGenerating(true);
    toast.loading('Starting video generation...', { id: 'generate-video' });

    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          prompt,
          model,
          aspectRatio,
          duration,
          resolution,
          negativePrompt: negativePrompt.trim() || undefined,
          personGeneration,
          enhancePrompt,
          generateAudio,
          seed: seed.trim() ? parseInt(seed) : undefined,
          sampleCount,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Video generation failed');
      }

      setOperationName(json.operationName);
      toast.loading('Video generation in progress... This may take several minutes.', { id: 'generate-video' });

      // Poll for video generation status
      const pollInterval = 10000; // 10 seconds
      const poll = async () => {
        try {
          const statusRes = await fetch(`/api/video/status?operationName=${encodeURIComponent(json.operationName)}&projectId=${projectId}`);
          const statusJson = await statusRes.json();

          if (statusJson.done) {
            if (statusJson.error) {
              throw new Error(statusJson.error);
            }

            toast.success('Video generated successfully!', { id: 'generate-video' });
            setGenerating(false);
            setOperationName(null);

            // Reset form
            setPrompt('');
            setNegativePrompt('');
            setSeed('');
          } else {
            // Continue polling
            setTimeout(poll, pollInterval);
          }
        } catch (pollError) {
          console.error('Video generation polling failed:', pollError);
          toast.error(pollError instanceof Error ? pollError.message : 'Video generation failed', { id: 'generate-video' });
          setGenerating(false);
          setOperationName(null);
        }
      };

      setTimeout(poll, pollInterval);
    } catch (error) {
      console.error('Video generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Video generation failed', { id: 'generate-video' });
      setGenerating(false);
    }
  }, [projectId, prompt, model, aspectRatio, duration, resolution, negativePrompt, personGeneration, enhancePrompt, generateAudio, seed, sampleCount]);

  return (
    <div className="flex h-full flex-col">
      <Toaster position="bottom-right" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Generate Video with AI</h1>
            <p className="text-sm text-neutral-600">
              Create high-quality videos using Google Vertex AI Veo models. Customize every aspect of your video generation.
            </p>
          </div>

          {/* Generation Form */}
          <form onSubmit={handleGenerateVideo} className="space-y-6">
            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Prompt */}
                <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                  <label htmlFor="prompt" className="block text-sm font-semibold text-neutral-900 mb-2">
                    Video Description *
                  </label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A fast-tracking shot through a bustling dystopian sprawl with bright neon signs, flying cars and mist, night, lens flare, volumetric lighting"
                    rows={6}
                    disabled={generating}
                    className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  />
                  <p className="mt-2 text-xs text-neutral-500">
                    Describe the video you want to generate in detail. Include camera movements, lighting, atmosphere, and style.
                  </p>
                </div>

                {/* Model Selection */}
                <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                  <label htmlFor="model" className="block text-sm font-semibold text-neutral-900 mb-2">
                    Veo Model
                  </label>
                  <select
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={generating}
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="veo-3.1-generate-preview">Veo 3.1 (Preview) - Latest model</option>
                    <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast (Preview) - Faster generation</option>
                    <option value="veo-3.0-generate-001">Veo 3.0 - Stable</option>
                    <option value="veo-3.0-fast-generate-001">Veo 3.0 Fast - Faster generation</option>
                    <option value="veo-2.0-generate-001">Veo 2.0 - Stable</option>
                    <option value="veo-2.0-generate-exp">Veo 2.0 Experimental</option>
                  </select>
                  <p className="mt-2 text-xs text-neutral-500">
                    Choose between different Veo models. Newer versions offer better quality, fast variants trade quality for speed.
                  </p>
                </div>

                {/* Video Settings */}
                <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-900">Video Settings</h3>

                  {/* Aspect Ratio */}
                  <div>
                    <label htmlFor="aspectRatio" className="block text-xs font-medium text-neutral-700 mb-2">
                      Aspect Ratio
                    </label>
                    <select
                      id="aspectRatio"
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16' | '1:1')}
                      disabled={generating}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="16:9">16:9 (Landscape / YouTube)</option>
                      <option value="9:16">9:16 (Portrait / TikTok, Shorts)</option>
                      <option value="1:1">1:1 (Square / Instagram)</option>
                    </select>
                  </div>

                  {/* Duration */}
                  <div>
                    <label htmlFor="duration" className="block text-xs font-medium text-neutral-700 mb-2">
                      Duration (seconds)
                    </label>
                    <select
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) as 4 | 5 | 6 | 8)}
                      disabled={generating}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="4">4 seconds (Veo 3 only)</option>
                      <option value="5">5 seconds (Veo 2 only)</option>
                      <option value="6">6 seconds (Veo 3 only)</option>
                      <option value="8">8 seconds (All models)</option>
                    </select>
                    <p className="mt-1 text-xs text-neutral-500">
                      Note: Veo 2 supports 5-8 seconds, Veo 3 supports 4, 6, or 8 seconds
                    </p>
                  </div>

                  {/* Resolution */}
                  <div>
                    <label htmlFor="resolution" className="block text-xs font-medium text-neutral-700 mb-2">
                      Resolution (Veo 3 only)
                    </label>
                    <select
                      id="resolution"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value as '720p' | '1080p')}
                      disabled={generating}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="720p">720p (HD)</option>
                      <option value="1080p">1080p (Full HD)</option>
                    </select>
                  </div>

                  {/* Sample Count */}
                  <div>
                    <label htmlFor="sampleCount" className="block text-xs font-medium text-neutral-700 mb-2">
                      Number of Videos to Generate
                    </label>
                    <select
                      id="sampleCount"
                      value={sampleCount}
                      onChange={(e) => setSampleCount(parseInt(e.target.value) as 1 | 2 | 3 | 4)}
                      disabled={generating}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="1">1 video</option>
                      <option value="2">2 videos</option>
                      <option value="3">3 videos</option>
                      <option value="4">4 videos</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Negative Prompt */}
                <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                  <label htmlFor="negativePrompt" className="block text-sm font-semibold text-neutral-900 mb-2">
                    Negative Prompt
                  </label>
                  <textarea
                    id="negativePrompt"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="overhead lighting, bright colors, people, animals"
                    rows={4}
                    disabled={generating}
                    className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="mt-2 text-xs text-neutral-500">
                    Describe what you DON&apos;T want in the video. The model will avoid these elements.
                  </p>
                </div>

                {/* Advanced Settings */}
                <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-900">Advanced Settings</h3>

                  {/* Person Generation */}
                  <div>
                    <label htmlFor="personGeneration" className="block text-xs font-medium text-neutral-700 mb-2">
                      Person Generation
                    </label>
                    <select
                      id="personGeneration"
                      value={personGeneration}
                      onChange={(e) => setPersonGeneration(e.target.value as 'allow_adult' | 'dont_allow')}
                      disabled={generating}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="allow_adult">Allow Adult Faces</option>
                      <option value="dont_allow">Don&apos;t Generate People</option>
                    </select>
                  </div>

                  {/* Enhance Prompt */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enhancePrompt"
                      checked={enhancePrompt}
                      onChange={(e) => setEnhancePrompt(e.target.checked)}
                      disabled={generating}
                      className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <label htmlFor="enhancePrompt" className="text-sm text-neutral-700">
                      Enhance Prompt with Gemini
                    </label>
                  </div>

                  {/* Generate Audio */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="generateAudio"
                      checked={generateAudio}
                      onChange={(e) => setGenerateAudio(e.target.checked)}
                      disabled={generating}
                      className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <label htmlFor="generateAudio" className="text-sm text-neutral-700">
                      Generate Audio (Veo 3 only)
                    </label>
                  </div>

                  {/* Seed */}
                  <div>
                    <label htmlFor="seed" className="block text-xs font-medium text-neutral-700 mb-2">
                      Seed (optional)
                    </label>
                    <input
                      type="number"
                      id="seed"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      placeholder="0-4294967295"
                      min="0"
                      max="4294967295"
                      disabled={generating}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Use a seed for reproducible results. Same seed + same prompt = same video.
                    </p>
                  </div>
                </div>

                {/* Info Box */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex gap-3">
                    <svg className="h-5 w-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-blue-900">
                      <p className="font-semibold mb-1">Generation Tips:</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Be specific about camera movements and angles</li>
                        <li>Include lighting and atmosphere details</li>
                        <li>Mention specific visual styles or references</li>
                        <li>Generation typically takes 3-5 minutes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex-1">
                {generating && operationName && (
                  <p className="text-sm text-neutral-600">
                    Generation in progress... This may take several minutes. You can navigate away and check back later.
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={generating || !prompt.trim()}
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Generate Video
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
