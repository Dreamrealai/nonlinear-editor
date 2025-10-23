'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import VideoQueueItem from './VideoQueueItem';
import AssetLibraryModal from './AssetLibraryModal';

interface GenerateVideoTabProps {
  projectId: string;
}

interface VideoQueueItemData {
  id: string;
  prompt: string;
  operationName: string | null;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: number;
}

interface ImageAsset {
  id: string;
  storage_url: string;
  metadata?: {
    thumbnail?: string;
  };
  created_at: string;
}

// Model configuration interface
interface ModelConfig {
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'seedance' | 'minimax';
  supportedAspectRatios: ('16:9' | '9:16' | '1:1')[];
  supportedDurations: (4 | 5 | 6 | 8 | 10)[];
  supportsResolution: boolean;
  supportsAudio: boolean;
  supportsNegativePrompt: boolean;
  supportsReferenceImage: boolean;
  supportsEnhancePrompt: boolean;
  maxSampleCount: number;
}

// Model configurations
const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Google Veo Models
  'veo-3.1-generate-preview': {
    id: 'veo-3.1-generate-preview',
    name: 'Veo 3.1 (Latest)',
    provider: 'google',
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [4, 5, 6, 8],
    supportsResolution: true,
    supportsAudio: true,
    supportsNegativePrompt: true,
    supportsReferenceImage: true,
    supportsEnhancePrompt: true,
    maxSampleCount: 4,
  },
  'veo-3.1-fast-generate-preview': {
    id: 'veo-3.1-fast-generate-preview',
    name: 'Veo 3.1 Fast',
    provider: 'google',
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [4, 5, 6, 8],
    supportsResolution: true,
    supportsAudio: true,
    supportsNegativePrompt: true,
    supportsReferenceImage: true,
    supportsEnhancePrompt: true,
    maxSampleCount: 4,
  },
  'veo-3.0-generate-001': {
    id: 'veo-3.0-generate-001',
    name: 'Veo 3.0',
    provider: 'google',
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [4, 5, 6, 8],
    supportsResolution: true,
    supportsAudio: true,
    supportsNegativePrompt: true,
    supportsReferenceImage: true,
    supportsEnhancePrompt: true,
    maxSampleCount: 4,
  },
  'veo-3.0-fast-generate-001': {
    id: 'veo-3.0-fast-generate-001',
    name: 'Veo 3.0 Fast',
    provider: 'google',
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [4, 5, 6, 8],
    supportsResolution: true,
    supportsAudio: true,
    supportsNegativePrompt: true,
    supportsReferenceImage: true,
    supportsEnhancePrompt: true,
    maxSampleCount: 4,
  },
  'veo-2.0-generate-001': {
    id: 'veo-2.0-generate-001',
    name: 'Veo 2.0',
    provider: 'google',
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [4, 5, 6, 8],
    supportsResolution: false,
    supportsAudio: false,
    supportsNegativePrompt: true,
    supportsReferenceImage: true,
    supportsEnhancePrompt: true,
    maxSampleCount: 4,
  },
  // OpenAI SORA
  'sora-2-pro': {
    id: 'sora-2-pro',
    name: 'SORA 2 Pro',
    provider: 'openai',
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [5, 10],
    supportsResolution: false,
    supportsAudio: false,
    supportsNegativePrompt: false,
    supportsReferenceImage: true,
    supportsEnhancePrompt: false,
    maxSampleCount: 1,
  },
  // SEEDANCE
  'seedance-1.0': {
    id: 'seedance-1.0',
    name: 'SEEDANCE 1.0',
    provider: 'seedance',
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [4, 6, 8],
    supportsResolution: false,
    supportsAudio: true,
    supportsNegativePrompt: true,
    supportsReferenceImage: true,
    supportsEnhancePrompt: false,
    maxSampleCount: 2,
  },
  // MINIMAX
  'minimax-video-1.0': {
    id: 'minimax-video-1.0',
    name: 'MiniMax Video 1.0',
    provider: 'minimax',
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [5, 6, 8],
    supportsResolution: false,
    supportsAudio: false,
    supportsNegativePrompt: true,
    supportsReferenceImage: true,
    supportsEnhancePrompt: false,
    maxSampleCount: 2,
  },
};

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
  const [videoQueue, setVideoQueue] = useState<VideoQueueItemData[]>([]);
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Form state - Configured with loosest/most permissive settings for Veo 3.1
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<string>('veo-3.1-generate-preview');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [duration, setDuration] = useState<4 | 5 | 6 | 8 | 10>(8);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p'); // Highest quality
  const [negativePrompt, setNegativePrompt] = useState(''); // No restrictions
  const [personGeneration, setPersonGeneration] = useState<'allow_adult' | 'dont_allow'>('allow_adult'); // Allow people
  const [enhancePrompt, setEnhancePrompt] = useState(true); // Enable AI enhancement
  const [generateAudio, setGenerateAudio] = useState(true); // Enable audio generation
  const [seed, setSeed] = useState<string>(''); // Random seed for variety
  const [sampleCount, setSampleCount] = useState<1 | 2 | 3 | 4>(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get current model config
  const currentModelConfig = MODEL_CONFIGS[model];

  // Image input state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageAssetId, setImageAssetId] = useState<string | null>(null);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear selected image
  const handleClearImage = useCallback(() => {
    setSelectedImage(null);
    setImageAssetId(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [imagePreviewUrl]);

  // Handle model change and adjust settings accordingly
  const handleModelChange = useCallback((newModel: string) => {
    const newConfig = MODEL_CONFIGS[newModel];
    if (!newConfig) return;

    setModel(newModel);

    // Adjust aspect ratio if current one is not supported
    if (!newConfig.supportedAspectRatios.includes(aspectRatio)) {
      setAspectRatio(newConfig.supportedAspectRatios[0]);
    }

    // Adjust duration if current one is not supported
    if (!newConfig.supportedDurations.includes(duration)) {
      setDuration(newConfig.supportedDurations[0]);
    }

    // Adjust sample count if it exceeds max
    if (sampleCount > newConfig.maxSampleCount) {
      setSampleCount(1);
    }

    // Clear settings that are not supported by the new model
    if (!newConfig.supportsAudio) {
      setGenerateAudio(false);
    }

    if (!newConfig.supportsNegativePrompt) {
      setNegativePrompt('');
    }

    if (!newConfig.supportsEnhancePrompt) {
      setEnhancePrompt(false);
    }

    if (!newConfig.supportsReferenceImage) {
      handleClearImage();
    }
  }, [aspectRatio, duration, sampleCount, handleClearImage]);

  // Cleanup polling intervals on unmount
  useEffect(() => {
    const intervals = pollingIntervalsRef.current;
    return () => {
      intervals.forEach((interval) => clearInterval(interval));
      intervals.clear();
    };
  }, []);

  // Handle image file (from paste or upload)
  const handleImageFile = useCallback((file: File) => {
    setSelectedImage(file);
    setImageAssetId(null); // Clear asset library selection

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
  }, []);

  // Handle paste events for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleImageFile(file);
            toast.success('Image pasted from clipboard!');
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleImageFile]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
      toast.success('Image selected!');
    }
  }, [handleImageFile]);

  // Handle asset library image selection
  const handleAssetSelect = useCallback((asset: ImageAsset) => {
    setSelectedImage(null); // Clear file upload
    setImageAssetId(asset.id);
    setImagePreviewUrl(asset.metadata?.thumbnail || asset.storage_url);
    setShowAssetLibrary(false);
    toast.success('Image selected from library!');
  }, []);

  // Upload image to Supabase storage
  const uploadImageToStorage = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('type', 'image');

    const uploadRes = await fetch('/api/assets/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      const errorData = await uploadRes.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }

    const { assetId } = await uploadRes.json();
    return assetId;
  }, [projectId]);

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
      let imageAssetIdToUse = imageAssetId;

      // If a file is selected, upload it first
      if (selectedImage) {
        setUploadingImage(true);
        toast.success('Uploading image...');
        imageAssetIdToUse = await uploadImageToStorage(selectedImage);
        setUploadingImage(false);
      }

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
          imageAssetId: imageAssetIdToUse || undefined,
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
      handleClearImage();
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
      setUploadingImage(false);
    }
  }, [projectId, prompt, model, aspectRatio, duration, resolution, negativePrompt, personGeneration, enhancePrompt, generateAudio, seed, sampleCount, videoQueue.length, startPolling, selectedImage, imageAssetId, uploadImageToStorage, handleClearImage]);

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
          <form onSubmit={handleGenerateVideo} className="space-y-4">
            {/* Basic Settings Row - MOVED TO TOP */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Model Selection */}
              <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                <label htmlFor="model" className="block text-xs font-medium text-neutral-700 mb-2">
                  Model
                </label>
                <select
                  id="model"
                  value={model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  disabled={generating}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <optgroup label="Google Veo">
                    <option value="veo-3.1-generate-preview">Veo 3.1 (Latest)</option>
                    <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast</option>
                    <option value="veo-3.0-generate-001">Veo 3.0</option>
                    <option value="veo-3.0-fast-generate-001">Veo 3.0 Fast</option>
                    <option value="veo-2.0-generate-001">Veo 2.0</option>
                  </optgroup>
                  <optgroup label="OpenAI">
                    <option value="sora-2-pro">SORA 2 Pro</option>
                  </optgroup>
                  <optgroup label="Other Models">
                    <option value="seedance-1.0">SEEDANCE 1.0</option>
                    <option value="minimax-video-1.0">MiniMax Video 1.0</option>
                  </optgroup>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                <label htmlFor="aspectRatio" className="block text-xs font-medium text-neutral-700 mb-2">
                  Aspect Ratio
                </label>
                <select
                  id="aspectRatio"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16' | '1:1')}
                  disabled={generating}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {currentModelConfig.supportedAspectRatios.map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio} {ratio === '16:9' ? 'Landscape' : ratio === '9:16' ? 'Portrait' : 'Square'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                <label htmlFor="duration" className="block text-xs font-medium text-neutral-700 mb-2">
                  Duration
                </label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) as 4 | 5 | 6 | 8 | 10)}
                  disabled={generating}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {currentModelConfig.supportedDurations.map((dur) => (
                    <option key={dur} value={dur}>
                      {dur} seconds
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Image Input - MOVED TO MIDDLE */}
            {currentModelConfig.supportsReferenceImage && (
              <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                <label className="block text-sm font-semibold text-neutral-900 mb-3">
                  Reference Image (Optional)
                </label>

                {imagePreviewUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic user-selected reference image preview */}
                    <img
                      src={imagePreviewUrl}
                      alt="Selected reference"
                      className="w-full max-h-64 object-contain rounded-lg border border-neutral-200"
                    />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute right-2 top-2 rounded-md bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                      title="Remove image"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {/* Upload Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={generating || uploadingImage}
                        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg className="h-8 w-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium text-neutral-700">Upload</span>
                      </button>

                      {/* Paste Hint */}
                      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-6">
                        <svg className="h-8 w-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="text-xs font-medium text-neutral-700">Paste (Ctrl+V)</span>
                      </div>

                      {/* Asset Library Button */}
                      <button
                        type="button"
                        onClick={() => setShowAssetLibrary(true)}
                        disabled={generating || uploadingImage}
                        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg className="h-8 w-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span className="text-xs font-medium text-neutral-700">From Library</span>
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    <p className="text-xs text-neutral-500 text-center">
                      Upload, paste, or select an image from your library to use as a reference
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Prompt - MOVED TO BOTTOM */}
            <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
              <label htmlFor="prompt" className="block text-sm font-semibold text-neutral-900 mb-2">
                Video Description *
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A fast-tracking shot through a bustling dystopian sprawl with bright neon signs, flying cars and mist, night, lens flare, volumetric lighting"
                rows={4}
                disabled={generating}
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
              <p className="mt-2 text-xs text-neutral-500">
                Describe the video you want to generate in detail
              </p>
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
                <div className="border-t border-neutral-200 p-6 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Resolution */}
                      {currentModelConfig.supportsResolution && (
                        <div>
                          <label htmlFor="resolution" className="block text-xs font-medium text-neutral-700 mb-2">
                            Resolution
                          </label>
                          <select
                            id="resolution"
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value as '720p' | '1080p')}
                            disabled={generating}
                            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="720p">720p (HD)</option>
                            <option value="1080p">1080p (Full HD)</option>
                          </select>
                        </div>
                      )}

                      {/* Sample Count */}
                      {currentModelConfig.maxSampleCount > 1 && (
                        <div>
                          <label htmlFor="sampleCount" className="block text-xs font-medium text-neutral-700 mb-2">
                            Number of Videos (max {currentModelConfig.maxSampleCount})
                          </label>
                          <select
                            id="sampleCount"
                            value={sampleCount}
                            onChange={(e) => setSampleCount(parseInt(e.target.value) as 1 | 2 | 3 | 4)}
                            disabled={generating}
                            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {[1, 2, 3, 4].filter(n => n <= currentModelConfig.maxSampleCount).map(n => (
                              <option key={n} value={n}>{n} video{n > 1 ? 's' : ''}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Person Generation - Only for Google Veo models */}
                      {currentModelConfig.provider === 'google' && (
                        <div>
                          <label htmlFor="personGeneration" className="block text-xs font-medium text-neutral-700 mb-2">
                            Person Generation
                          </label>
                          <select
                            id="personGeneration"
                            value={personGeneration}
                            onChange={(e) => setPersonGeneration(e.target.value as 'allow_adult' | 'dont_allow')}
                            disabled={generating}
                            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="allow_adult">Allow Adult Faces</option>
                            <option value="dont_allow">Don&apos;t Generate People</option>
                          </select>
                        </div>
                      )}

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
                          placeholder="Random"
                          min="0"
                          max="4294967295"
                          disabled={generating}
                          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="mt-1 text-xs text-neutral-500">
                          For reproducible results
                        </p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Negative Prompt */}
                      {currentModelConfig.supportsNegativePrompt && (
                        <div>
                          <label htmlFor="negativePrompt" className="block text-xs font-medium text-neutral-700 mb-2">
                            Negative Prompt
                          </label>
                          <textarea
                            id="negativePrompt"
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="What to avoid (e.g., blur, distortion)"
                            rows={4}
                            disabled={generating}
                            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                      )}

                      {/* Checkboxes */}
                      <div className="space-y-3">
                        {/* Enhance Prompt */}
                        {currentModelConfig.supportsEnhancePrompt && (
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="enhancePrompt"
                              checked={enhancePrompt}
                              onChange={(e) => setEnhancePrompt(e.target.checked)}
                              disabled={generating}
                              className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                            />
                            <label htmlFor="enhancePrompt" className="text-sm text-neutral-700">
                              Enhance Prompt with Gemini
                            </label>
                          </div>
                        )}

                        {/* Generate Audio */}
                        {currentModelConfig.supportsAudio && (
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="generateAudio"
                              checked={generateAudio}
                              onChange={(e) => setGenerateAudio(e.target.checked)}
                              disabled={generating}
                              className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                            />
                            <label htmlFor="generateAudio" className="text-sm text-neutral-700">
                              Generate Audio
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                    <VideoQueueItem
                      key={video.id}
                      {...video}
                      onRemove={handleRemoveVideo}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Library Modal */}
      {showAssetLibrary && (
        <AssetLibraryModal
          projectId={projectId}
          onSelect={handleAssetSelect}
          onClose={() => setShowAssetLibrary(false)}
        />
      )}
    </div>
  );
}
