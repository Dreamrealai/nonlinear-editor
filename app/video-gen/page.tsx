'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function VideoGenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [videoGenPending, setVideoGenPending] = useState(false);
  const [videoOperationName, setVideoOperationName] = useState<string | null>(null);

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
            setVideoGenPending(false);
            setVideoOperationName(null);

            // Redirect back to editor
            router.push(`/editor/${projectId}`);
          } else {
            // Continue polling
            setTimeout(poll, pollInterval);
          }
        } catch (pollError) {
          console.error('Video generation polling failed:', pollError);
          toast.error(pollError instanceof Error ? pollError.message : 'Video generation failed', { id: 'generate-video' });
          setVideoGenPending(false);
          setVideoOperationName(null);
        }
      };

      setTimeout(poll, pollInterval);
    } catch (error) {
      console.error('Video generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Video generation failed', { id: 'generate-video' });
      setVideoGenPending(false);
    }
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
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
              <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-600">
                Video generation in progress. This may take several minutes. You can navigate away and come back later.
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
