'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface GenerateVideoTabProps {
  projectId: string;
}

interface VideoQueueItem {
  id: string;
  prompt: string;
  operationName: string | null;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: number;
}

/**
 * Generate Video Tab Component
 *
 * Provides a comprehensive interface for generating videos using Google Vertex AI Veo models.
 * Supports queueing up to 8 videos at once with a 2-column grid display on the right side.
 * Supports all available Veo parameters including duration, aspect ratio, resolution,
 * negative prompts, person generation settings, and more.
 */
export default function GenerateVideoTab({ projectId }: GenerateVideoTabProps) {
  const [generating, setGenerating] = useState(false);
  const [videoQueue, setVideoQueue] = useState<VideoQueueItem[]>([]);
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

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
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Cleanup polling intervals on unmount
  useEffect(() => {
    const intervals = pollingIntervalsRef.current;
    return () => {
      intervals.forEach((interval) => clearInterval(interval));
      intervals.clear();
    };
  }, []);

  // Start polling for a specific video
  const startPolling = useCallback((videoId: string, operationName: string) => {
    const pollInterval = 10000; // 10 seconds

    const poll = async () => {
      try {
        const statusRes = await fetch(`/api/video/status?operationName=${encodeURIComponent(operationName)}&projectId=${projectId}`);
        const statusJson = await statusRes.json();

        if (statusJson.done) {
          // Clear polling interval
          const interval = pollingIntervalsRef.current.get(videoId);
          if (interval) {
            clearInterval(interval);
            pollingIntervalsRef.current.delete(videoId);
          }

          if (statusJson.error) {
            setVideoQueue(prev => prev.map(v =>
              v.id === videoId
                ? { ...v, status: 'failed', error: statusJson.error }
                : v
            ));
            toast.error(`Video generation failed: ${statusJson.error}`);
          } else if (statusJson.asset) {
            // Video completed successfully
            const videoUrl = statusJson.asset.metadata?.sourceUrl || '';
            const thumbnailUrl = statusJson.asset.metadata?.thumbnail || '';

            setVideoQueue(prev => prev.map(v =>
              v.id === videoId
                ? { ...v, status: 'completed', videoUrl, thumbnailUrl }
                : v
            ));
            toast.success('Video generated successfully!');
          }
        }
      } catch (pollError) {
        console.error('Video generation polling failed:', pollError);
        const interval = pollingIntervalsRef.current.get(videoId);
        if (interval) {
          clearInterval(interval);
          pollingIntervalsRef.current.delete(videoId);
        }
        setVideoQueue(prev => prev.map(v =>
          v.id === videoId
            ? { ...v, status: 'failed', error: 'Polling failed' }
            : v
        ));
      }
    };

    const interval = setInterval(poll, pollInterval);
    pollingIntervalsRef.current.set(videoId, interval);

    // Poll immediately
    poll();
  }, [projectId]);

  const handleGenerateVideo = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (videoQueue.length >= 8) {
      toast.error('Maximum 8 videos in queue. Please wait for some to complete.');
      return;
    }

    const videoId = `video-${Date.now()}`;

    // Add to queue immediately
    setVideoQueue(prev => [...prev, {
      id: videoId,
      prompt,
      operationName: null,
      status: 'queued',
      createdAt: Date.now(),
    }]);

    setGenerating(true);

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

      // Update queue item with operation name and start polling
      setVideoQueue(prev => prev.map(v =>
        v.id === videoId
          ? { ...v, operationName: json.operationName, status: 'generating' }
          : v
      ));

      toast.success('Video generation started!');
      startPolling(videoId, json.operationName);

      // Reset form
      setPrompt('');
      setNegativePrompt('');
      setSeed('');
    } catch (error) {
      console.error('Video generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Video generation failed');

      // Update queue item to failed
      setVideoQueue(prev => prev.map(v =>
        v.id === videoId
          ? { ...v, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }
          : v
      ));
    } finally {
      setGenerating(false);
    }
  }, [projectId, prompt, model, aspectRatio, duration, resolution, negativePrompt, personGeneration, enhancePrompt, generateAudio, seed, sampleCount, videoQueue.length, startPolling]);

  const handleRemoveVideo = useCallback((videoId: string) => {
    // Clear polling interval if exists
    const interval = pollingIntervalsRef.current.get(videoId);
    if (interval) {
      clearInterval(interval);
      pollingIntervalsRef.current.delete(videoId);
    }

    setVideoQueue(prev => prev.filter(v => v.id !== videoId));
  }, []);

  const handleClearCompleted = useCallback(() => {
    setVideoQueue(prev => prev.filter(v => v.status !== 'completed' && v.status !== 'failed'));
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Toaster position="bottom-right" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_600px] gap-6 h-full">
          {/* Left: Generation Form */}
          <div className="overflow-y-auto">
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
                <p className="text-sm text-neutral-600">
                  {videoQueue.length}/8 videos in queue
                </p>
              </div>
              <button
                type="submit"
                disabled={generating || !prompt.trim() || videoQueue.length >= 8}
                className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-md transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-purple-500 disabled:hover:to-pink-500"
              >
                <div className="flex items-center gap-2">
                  {generating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Adding to Queue...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Add to Queue
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>
          </div>

          {/* Right: Video Queue Grid (2 columns) */}
          <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">
                Video Queue ({videoQueue.length})
              </h2>
              {videoQueue.some(v => v.status === 'completed' || v.status === 'failed') && (
                <button
                  onClick={handleClearCompleted}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Clear Completed
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {videoQueue.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-8">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-neutral-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium text-neutral-900 mb-1">No videos in queue</p>
                    <p className="text-xs text-neutral-500">
                      Generate videos to see them appear here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {videoQueue.map((video) => (
                    <div
                      key={video.id}
                      className="group relative flex flex-col rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden"
                    >
                      {/* Video Preview */}
                      <div className="relative aspect-video bg-neutral-100">
                        {video.status === 'completed' && video.videoUrl ? (
                          <video
                            src={video.videoUrl}
                            controls
                            className="h-full w-full object-cover"
                            poster={video.thumbnailUrl}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            {video.status === 'queued' && (
                              <div className="text-center">
                                <div className="mx-auto h-8 w-8 rounded-full border-4 border-neutral-300 border-t-neutral-600" />
                                <p className="mt-2 text-xs text-neutral-600">Queued</p>
                              </div>
                            )}
                            {video.status === 'generating' && (
                              <div className="text-center">
                                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-purple-600" />
                                <p className="mt-2 text-xs text-neutral-600">Generating...</p>
                              </div>
                            )}
                            {video.status === 'failed' && (
                              <div className="text-center p-4">
                                <svg className="mx-auto h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="mt-2 text-xs text-red-600">Failed</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Video Info */}
                      <div className="p-3">
                        <p className="text-xs text-neutral-700 line-clamp-2 mb-2">
                          {video.prompt}
                        </p>

                        {video.error && (
                          <p className="text-xs text-red-600 mb-2">
                            {video.error}
                          </p>
                        )}

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            video.status === 'completed' ? 'bg-green-100 text-green-700' :
                            video.status === 'generating' ? 'bg-blue-100 text-blue-700' :
                            video.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-neutral-100 text-neutral-700'
                          }`}>
                            {video.status === 'completed' ? 'Completed' :
                             video.status === 'generating' ? 'Generating' :
                             video.status === 'failed' ? 'Failed' :
                             'Queued'}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveVideo(video.id)}
                        className="absolute right-2 top-2 z-10 rounded-md bg-black/50 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                        title="Remove from queue"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
