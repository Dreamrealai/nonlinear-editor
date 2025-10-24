'use client';

import { useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { VideoGenerationForm } from './VideoGenerationForm';
import { VideoGenerationSettings } from './VideoGenerationSettings';
import { VideoGenerationQueue } from './VideoGenerationQueue';
import { VIDEO_MODELS, VIDEO_MODEL_CONFIGS } from '@/lib/config/models';
import type { ModelConfig } from '@/lib/config/models';
import { useVideoGenerationQueue } from '@/lib/hooks/useVideoGenerationQueue';
import { useImageInput } from '@/lib/hooks/useImageInput';
import { adjustFormStateForModel } from '@/lib/utils/videoGenerationUtils';
import type { VideoGenerationFormState } from '@/lib/utils/videoGenerationUtils';

interface GenerateVideoTabProps {
  projectId: string;
}

/**
 * Generate Video Tab Component
 *
 * Provides a comprehensive interface for generating videos using Google Vertex AI Veo models.
 * Supports queueing up to 8 videos at once with a 2-column grid display on the right side.
 * Supports all available Veo parameters including duration, aspect ratio, resolution,
 * negative prompts, person generation settings, and more.
 */
export function GenerateVideoTab({ projectId }: GenerateVideoTabProps) {
  // Form state - Configured with loosest/most permissive settings for Veo 3.1
  const [formState, setFormState] = useState<VideoGenerationFormState>({
    prompt: '',
    model: VIDEO_MODELS.VEO_3_1_GENERATE,
    aspectRatio: '16:9',
    duration: 8,
    resolution: '1080p',
    negativePrompt: '',
    personGeneration: 'allow_adult',
    enhancePrompt: true,
    generateAudio: true,
    seed: '',
    sampleCount: 1,
  });

  // Asset library modal state
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);

  // Get current model config (with fallback to prevent undefined)
  const currentModelConfig = (VIDEO_MODEL_CONFIGS[formState.model] ??
    VIDEO_MODEL_CONFIGS['kling-v1.6']) as ModelConfig;

  // Image input hook
  const imageInput = useImageInput();

  // Video generation queue hook
  const { videoQueue, generating, generateVideo, removeVideo, clearCompleted } =
    useVideoGenerationQueue(projectId);

  // Handle model change and adjust settings accordingly
  const handleModelChange = useCallback(
    (newModel: string) => {
      const adjustments = adjustFormStateForModel(newModel, formState);

      setFormState((prev) => ({
        ...prev,
        model: newModel,
        ...adjustments,
      }));

      // Clear image if new model doesn't support it
      if (!VIDEO_MODEL_CONFIGS[newModel]?.supportsReferenceImage) {
        imageInput.clearImage();
      }
    },
    [formState, imageInput]
  );

  // Handle form submission
  const handleGenerateVideo = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      let imageAssetIdToUse = imageInput.imageAssetId;

      try {
        // If a file is selected, upload it first
        if (imageInput.selectedImage) {
          imageInput.setUploadingImage(true);
          toast.success('Uploading image...');
          imageAssetIdToUse = await imageInput.uploadImageToStorage(
            imageInput.selectedImage,
            projectId
          );
          imageInput.setUploadingImage(false);
        }

        // Generate video
        await generateVideo(formState, imageAssetIdToUse || undefined);

        // Reset form on success
        setFormState((prev) => ({
          ...prev,
          prompt: '',
          negativePrompt: '',
          seed: '',
        }));
        imageInput.clearImage();
      } catch {
        imageInput.setUploadingImage(false);
        // Error already handled by the hook
      }
    },
    [formState, imageInput, generateVideo, projectId]
  );

  // Form field update handlers
  const updateFormField = useCallback(
    <K extends keyof VideoGenerationFormState>(key: K, value: VideoGenerationFormState[K]) => {
      setFormState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

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
                Create high-quality videos using Google Vertex AI Veo models. Customize every aspect
                of your video generation.
              </p>
            </div>

            {/* Generation Form */}
            <div className="space-y-4">
              <VideoGenerationForm
                prompt={formState.prompt}
                model={formState.model}
                aspectRatio={formState.aspectRatio}
                duration={formState.duration}
                modelConfig={currentModelConfig}
                disabled={generating || imageInput.uploadingImage}
                queueLength={videoQueue.length}
                imagePreviewUrl={imageInput.imagePreviewUrl}
                fileInputRef={imageInput.fileInputRef}
                showAssetLibrary={showAssetLibrary}
                onPromptChange={(value) => updateFormField('prompt', value)}
                onModelChange={handleModelChange}
                onAspectRatioChange={(value) => updateFormField('aspectRatio', value)}
                onDurationChange={(value) => updateFormField('duration', value)}
                onSubmit={handleGenerateVideo}
                onFileInputChange={imageInput.handleFileInputChange}
                onClearImage={imageInput.clearImage}
                onAssetSelect={imageInput.handleAssetSelect}
                onShowAssetLibrary={setShowAssetLibrary}
                projectId={projectId}
              />

              {/* Advanced Settings */}
              <VideoGenerationSettings
                modelConfig={currentModelConfig}
                resolution={formState.resolution}
                sampleCount={formState.sampleCount}
                personGeneration={formState.personGeneration}
                seed={formState.seed}
                negativePrompt={formState.negativePrompt}
                enhancePrompt={formState.enhancePrompt}
                generateAudio={formState.generateAudio}
                disabled={generating || imageInput.uploadingImage}
                onResolutionChange={(value) => updateFormField('resolution', value)}
                onSampleCountChange={(value) => updateFormField('sampleCount', value)}
                onPersonGenerationChange={(value) => updateFormField('personGeneration', value)}
                onSeedChange={(value) => updateFormField('seed', value)}
                onNegativePromptChange={(value) => updateFormField('negativePrompt', value)}
                onEnhancePromptChange={(value) => updateFormField('enhancePrompt', value)}
                onGenerateAudioChange={(value) => updateFormField('generateAudio', value)}
              />
            </div>
          </div>

          {/* Right: Video Queue Grid (2 columns) */}
          <VideoGenerationQueue
            videoQueue={videoQueue}
            onRemove={removeVideo}
            onClearCompleted={clearCompleted}
          />
        </div>
      </div>
    </div>
  );
}
