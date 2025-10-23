'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

interface ImageQueueItem {
  id: string;
  prompt: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  imageUrls?: string[];
  error?: string;
  createdAt: number;
}

/**
 * Image Generation Page
 *
 * Provides a comprehensive interface for generating images using Google Vertex AI Imagen models.
 * Supports queueing up to 8 image generation requests at once with a 2-column grid display.
 * Supports Imagen 3 and Imagen 4 with various aspect ratios and settings.
 */
export default function ImageGenPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [generating, setGenerating] = useState(false);
  const [imageQueue, setImageQueue] = useState<ImageQueueItem[]>([]);

  // Form state
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<string>('imagen-3.0-generate-001');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9' | '3:4' | '4:3'>('1:1');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [sampleCount, setSampleCount] = useState<1 | 2 | 4>(1);
  const [safetyFilterLevel, setSafetyFilterLevel] = useState<'block_some' | 'block_few'>('block_some');
  const [personGeneration, setPersonGeneration] = useState<'allow_adult' | 'dont_allow'>('allow_adult');
  const [seed, setSeed] = useState<string>('');

  const handleGenerateImage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    if (imageQueue.length >= 8) {
      toast.error('Maximum 8 generation requests in queue. Please wait for some to complete.');
      return;
    }

    const imageId = `image-${Date.now()}`;

    // Add to queue immediately
    setImageQueue(prev => [...prev, {
      id: imageId,
      prompt,
      status: 'queued',
      createdAt: Date.now(),
    }]);

    setGenerating(true);

    try {
      // Update status to generating
      setImageQueue(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, status: 'generating' }
          : img
      ));

      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          prompt,
          model,
          aspectRatio,
          negativePrompt: negativePrompt.trim() || undefined,
          sampleCount,
          seed: seed.trim() ? parseInt(seed) : undefined,
          safetyFilterLevel,
          personGeneration,
          addWatermark: false,
          outputMimeType: 'image/jpeg',
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Image generation failed');
      }

      // Extract image URLs from assets
      const imageUrls = json.assets?.map((asset: { metadata?: { sourceUrl?: string } }) =>
        asset.metadata?.sourceUrl
      ).filter(Boolean) || [];

      // Update queue item to completed
      setImageQueue(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, status: 'completed', imageUrls }
          : img
      ));

      toast.success(`Generated ${imageUrls.length} image(s) successfully!`);

      // Reset form
      setPrompt('');
      setNegativePrompt('');
      setSeed('');
    } catch (error) {
      console.error('Image generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Image generation failed');

      // Update queue item to failed
      setImageQueue(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }
          : img
      ));
    } finally {
      setGenerating(false);
    }
  }, [projectId, prompt, model, aspectRatio, negativePrompt, sampleCount, seed, safetyFilterLevel, personGeneration, imageQueue.length]);

  const handleRemoveImage = useCallback((imageId: string) => {
    setImageQueue(prev => prev.filter(img => img.id !== imageId));
  }, []);

  const handleClearCompleted = useCallback(() => {
    setImageQueue(prev => prev.filter(img => img.status !== 'completed' && img.status !== 'failed'));
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
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-neutral-900">Generate Images with AI</h1>
                {projectId && (
                  <Link
                    href={`/editor/${projectId}`}
                    className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow hover:bg-neutral-50"
                  >
                    Back to Editor
                  </Link>
                )}
              </div>
              <p className="text-sm text-neutral-600">
                Create high-quality images using Google Vertex AI Imagen models. Customize every aspect of your image generation.
              </p>
            </div>

            {/* Generation Form */}
            <form onSubmit={handleGenerateImage} className="space-y-6">
              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Prompt */}
                  <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                    <label htmlFor="prompt" className="block text-sm font-semibold text-neutral-900 mb-2">
                      Image Description *
                    </label>
                    <textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="A serene mountain landscape at sunset with vibrant orange and pink clouds, highly detailed, photorealistic"
                      rows={6}
                      disabled={generating}
                      className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                    <p className="mt-2 text-xs text-neutral-500">
                      Describe the image you want to generate in detail. Include style, mood, lighting, and atmosphere.
                    </p>
                  </div>

                  {/* Model Selection */}
                  <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                    <label htmlFor="model" className="block text-sm font-semibold text-neutral-900 mb-2">
                      Imagen Model
                    </label>
                    <select
                      id="model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      disabled={generating}
                      className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="imagen-3.0-generate-001">Imagen 3.0 - Stable & High Quality</option>
                      <option value="imagen-3.0-fast-generate-001">Imagen 3.0 Fast - Faster Generation</option>
                      <option value="imagegeneration@006">Imagen 4 - Latest Model (Preview)</option>
                    </select>
                    <p className="mt-2 text-xs text-neutral-500">
                      Choose between Imagen 3 (stable) or Imagen 4 (latest preview). Fast variants trade quality for speed.
                    </p>
                  </div>

                  {/* Image Settings */}
                  <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-semibold text-neutral-900">Image Settings</h3>

                    {/* Aspect Ratio */}
                    <div>
                      <label htmlFor="aspectRatio" className="block text-xs font-medium text-neutral-700 mb-2">
                        Aspect Ratio
                      </label>
                      <select
                        id="aspectRatio"
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as '1:1' | '9:16' | '16:9' | '3:4' | '4:3')}
                        disabled={generating}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="1:1">1:1 (Square / Instagram)</option>
                        <option value="9:16">9:16 (Portrait / Stories)</option>
                        <option value="16:9">16:9 (Landscape / YouTube)</option>
                        <option value="3:4">3:4 (Portrait Photo)</option>
                        <option value="4:3">4:3 (Classic Photo)</option>
                      </select>
                    </div>

                    {/* Sample Count */}
                    <div>
                      <label htmlFor="sampleCount" className="block text-xs font-medium text-neutral-700 mb-2">
                        Number of Images to Generate
                      </label>
                      <select
                        id="sampleCount"
                        value={sampleCount}
                        onChange={(e) => setSampleCount(parseInt(e.target.value) as 1 | 2 | 4)}
                        disabled={generating}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="1">1 image</option>
                        <option value="2">2 images</option>
                        <option value="4">4 images</option>
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
                      placeholder="blurry, low quality, distorted, text, watermark"
                      rows={4}
                      disabled={generating}
                      className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className="mt-2 text-xs text-neutral-500">
                      Describe what you DON&apos;T want in the image. The model will avoid these elements.
                    </p>
                  </div>

                  {/* Advanced Settings */}
                  <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-semibold text-neutral-900">Advanced Settings</h3>

                    {/* Safety Filter Level */}
                    <div>
                      <label htmlFor="safetyFilterLevel" className="block text-xs font-medium text-neutral-700 mb-2">
                        Safety Filter Level
                      </label>
                      <select
                        id="safetyFilterLevel"
                        value={safetyFilterLevel}
                        onChange={(e) => setSafetyFilterLevel(e.target.value as 'block_some' | 'block_few')}
                        disabled={generating}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="block_some">Block Some (Recommended)</option>
                        <option value="block_few">Block Few (More Permissive)</option>
                      </select>
                    </div>

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
                        placeholder="0-2147483647"
                        min="0"
                        max="2147483647"
                        disabled={generating}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <p className="mt-1 text-xs text-neutral-500">
                        Use a seed for reproducible results. Same seed + same prompt = same image.
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
                          <li>Be specific about style and details</li>
                          <li>Include lighting and mood descriptors</li>
                          <li>Mention artistic techniques or references</li>
                          <li>Generation typically takes 10-30 seconds</li>
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
                    {imageQueue.length}/8 generation requests in queue
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={generating || !prompt.trim() || imageQueue.length >= 8 || !projectId}
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Generate Images
                      </>
                    )}
                  </div>
                </button>
              </div>

              {!projectId && (
                <div className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-600">
                  Please select a project from the editor to generate images.
                </div>
              )}
            </form>
          </div>

          {/* Right: Image Queue Grid (2 columns) */}
          <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">
                Image Queue ({imageQueue.length})
              </h2>
              {imageQueue.some(img => img.status === 'completed' || img.status === 'failed') && (
                <button
                  onClick={handleClearCompleted}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Clear Completed
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {imageQueue.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-8">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-neutral-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium text-neutral-900 mb-1">No images in queue</p>
                    <p className="text-xs text-neutral-500">
                      Generate images to see them appear here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {imageQueue.map((image) => (
                    <div
                      key={image.id}
                      className="group relative flex flex-col rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden"
                    >
                      {/* Image Preview */}
                      <div className="relative aspect-square bg-neutral-100">
                        {image.status === 'completed' && image.imageUrls && image.imageUrls.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1 h-full w-full p-1">
                            {image.imageUrls.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Generated ${idx + 1}`}
                                className="h-full w-full object-cover rounded"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            {image.status === 'queued' && (
                              <div className="text-center">
                                <div className="mx-auto h-8 w-8 rounded-full border-4 border-neutral-300 border-t-neutral-600" />
                                <p className="mt-2 text-xs text-neutral-600">Queued</p>
                              </div>
                            )}
                            {image.status === 'generating' && (
                              <div className="text-center">
                                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-purple-600" />
                                <p className="mt-2 text-xs text-neutral-600">Generating...</p>
                              </div>
                            )}
                            {image.status === 'failed' && (
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

                      {/* Image Info */}
                      <div className="p-3">
                        <p className="text-xs text-neutral-700 line-clamp-2 mb-2">
                          {image.prompt}
                        </p>

                        {image.error && (
                          <p className="text-xs text-red-600 mb-2">
                            {image.error}
                          </p>
                        )}

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            image.status === 'completed' ? 'bg-green-100 text-green-700' :
                            image.status === 'generating' ? 'bg-blue-100 text-blue-700' :
                            image.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-neutral-100 text-neutral-700'
                          }`}>
                            {image.status === 'completed' ? `${image.imageUrls?.length || 0} Generated` :
                             image.status === 'generating' ? 'Generating' :
                             image.status === 'failed' ? 'Failed' :
                             'Queued'}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveImage(image.id)}
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
