'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

// Maximum polling attempts before timing out (60 attempts * 10s = 10 minutes)
const MAX_POLLING_ATTEMPTS = 60;

export default function VideoGenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [videoGenPending, setVideoGenPending] = useState(false);
  const [videoOperationName, setVideoOperationName] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  // Track polling timeout IDs for cleanup
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Track polling attempts
  const pollingAttemptsRef = useRef(0);

  // Cleanup on unmount - CRITICAL: prevents memory leaks
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, []);

  const handleGenerateVideo = async (formData: { prompt: string; aspectRatio?: '9:16' | '16:9' | '1:1'; duration?: number }) => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    setVideoGenPending(true);
    toast.loading('Generating video with Veo 3.1...', { id: 'generate-video' });

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Video generation failed');
      }

      setVideoOperationName(json.operationName);
      toast.loading('Video generation in progress... This may take several minutes.', { id: 'generate-video' });

      // Reset polling attempts counter
      pollingAttemptsRef.current = 0;

      // Poll for video generation status with cleanup tracking
      const pollInterval = 10000; // 10 seconds
      const poll = async () => {
        // Check if component is still mounted
        if (!isMountedRef.current) {
          return;
        }

        // Increment polling attempts counter
        pollingAttemptsRef.current++;

        // Check if max attempts exceeded
        if (pollingAttemptsRef.current > MAX_POLLING_ATTEMPTS) {
          toast.error('Video generation timed out after 10 minutes. Please try again or contact support.', { id: 'generate-video' });
          if (isMountedRef.current) {
            setVideoGenPending(false);
            setVideoOperationName(null);
          }
          return;
        }

        try {
          const statusRes = await fetch(`/api/video/status?operationName=${encodeURIComponent(json.operationName)}&projectId=${projectId}`);
          const statusJson = await statusRes.json();

          // Check again if component is still mounted before updating state
          if (!isMountedRef.current) {
            return;
          }

          if (statusJson.done) {
            if (statusJson.error) {
              throw new Error(statusJson.error);
            }

            toast.success('Video generated successfully!', { id: 'generate-video' });
            setVideoGenPending(false);
            setVideoOperationName(null);
            setProgress(0);
            pollingTimeoutRef.current = null;

            // Redirect back to editor
            router.push(`/editor/${projectId}`);
          } else {
            // Update progress from API response
            const currentProgress = statusJson.progress || statusJson.progressPercentage || 0;
            if (isMountedRef.current) {
              setProgress(currentProgress);
            }

            // Continue polling - store timeout ID for cleanup
            pollingTimeoutRef.current = setTimeout(poll, pollInterval);
          }
        } catch (pollError) {
          console.error('Video generation polling failed:', pollError);
          if (isMountedRef.current) {
            toast.error(pollError instanceof Error ? pollError.message : 'Video generation failed', { id: 'generate-video' });
            setVideoGenPending(false);
            setVideoOperationName(null);
            setProgress(0);
            pollingTimeoutRef.current = null;
          }
        }
      };

      // Start polling - store timeout ID for cleanup
      pollingTimeoutRef.current = setTimeout(poll, pollInterval);
    } catch (error) {
      console.error('Video generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Video generation failed', { id: 'generate-video' });
      setVideoGenPending(false);
    }
  };

  const handleCancelGeneration = () => {
    // Clear polling timeout
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    // Reset state
    setVideoGenPending(false);
    setVideoOperationName(null);
    setProgress(0);

    toast.success('Video generation cancelled', { id: 'generate-video' });
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <Toaster position="bottom-right" />
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-neutral-900">Generate Video with AI</h1>
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
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Veo 3.1 Video Generation</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Generate high-quality videos from text descriptions using Google&apos;s Veo 3.1 model.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              void handleGenerateVideo({
                prompt: formData.get('prompt') as string,
                aspectRatio: (formData.get('aspectRatio') as '9:16' | '16:9' | '1:1') || '16:9',
                duration: parseInt(formData.get('duration') as string) || 8,
              });
            }}
            className="space-y-6"
          >
            <div>
              <label htmlFor="video-prompt" className="block text-sm font-medium text-neutral-700 mb-2">
                Video Description *
              </label>
              <textarea
                id="video-prompt"
                name="prompt"
                required
                disabled={videoGenPending}
                placeholder="Describe the video you want to generate..."
                rows={6}
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Be as descriptive as possible for best results
              </p>
            </div>

            <div>
              <label htmlFor="video-aspect-ratio" className="block text-sm font-medium text-neutral-700 mb-2">
                Aspect Ratio
              </label>
              <select
                id="video-aspect-ratio"
                name="aspectRatio"
                disabled={videoGenPending}
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="1:1">1:1 (Square)</option>
              </select>
            </div>

            <div>
              <label htmlFor="video-duration" className="block text-sm font-medium text-neutral-700 mb-2">
                Duration (seconds)
              </label>
              <select
                id="video-duration"
                name="duration"
                disabled={videoGenPending}
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="5">5 seconds</option>
                <option value="8" selected>8 seconds</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={videoGenPending || !projectId}
              className="w-full rounded-lg bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {videoGenPending ? 'Generating...' : 'Generate Video'}
            </button>

            {videoGenPending && videoOperationName && (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-blue-50 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-blue-900">
                      Video generation in progress...
                    </p>
                    <button
                      type="button"
                      onClick={handleCancelGeneration}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-blue-700">
                        {progress > 0 ? `${Math.round(progress)}% complete` : 'Starting...'}
                      </span>
                      <span className="text-xs text-blue-600">
                        Attempt {pollingAttemptsRef.current}/{MAX_POLLING_ATTEMPTS}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-blue-600 mt-2">
                    This may take several minutes. You can navigate away and come back later.
                  </p>
                </div>
              </div>
            )}

            {!projectId && (
              <div className="mt-4 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-600">
                Please select a project from the editor to generate videos.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
