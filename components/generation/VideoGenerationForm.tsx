'use client';

/**
 * VideoGenerationForm Component
 *
 * Main form for video generation settings including:
 * - Model selection
 * - Aspect ratio, duration
 * - Prompt input
 * - Image reference input
 */

import Image from 'next/image';
import type { ModelConfig } from '@/lib/config/models';
import { VIDEO_MODELS } from '@/lib/config/models';
import { NUMERIC_LIMITS } from '@/lib/config';
import { AssetLibraryModal } from './AssetLibraryModal';
import type { ImageAsset } from '@/lib/utils/videoGenerationUtils';

interface VideoGenerationFormProps {
  /** Current form values */
  prompt: string;
  model: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  duration: 4 | 5 | 6 | 8 | 10;
  /** Current model configuration */
  modelConfig: ModelConfig;
  /** Whether generation is in progress */
  disabled: boolean;
  /** Current queue length */
  queueLength: number;
  /** Image input state */
  imagePreviewUrl: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  showAssetLibrary: boolean;
  /** Callbacks */
  onPromptChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onAspectRatioChange: (value: '16:9' | '9:16' | '1:1' | '4:3' | '3:4') => void;
  onDurationChange: (value: 4 | 5 | 6 | 8 | 10) => void;
  onSubmit: (e: React.FormEvent) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  onAssetSelect: (asset: ImageAsset) => void;
  onShowAssetLibrary: (show: boolean) => void;
  projectId: string;
}

/**
 * Form component for video generation parameters
 */
export function VideoGenerationForm({
  prompt,
  model,
  aspectRatio,
  duration,
  modelConfig,
  disabled,
  queueLength,
  imagePreviewUrl,
  fileInputRef,
  showAssetLibrary,
  onPromptChange,
  onModelChange,
  onAspectRatioChange,
  onDurationChange,
  onSubmit,
  onFileInputChange,
  onClearImage,
  onAssetSelect,
  onShowAssetLibrary,
  projectId,
}: VideoGenerationFormProps): React.ReactElement {
  const canSubmit = !disabled && prompt.trim() && queueLength < NUMERIC_LIMITS.VIDEO_QUEUE_MAX;

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Basic Settings Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Model Selection */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <label htmlFor="model" className="block text-xs font-medium text-neutral-700 mb-2">
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e): void => onModelChange(e.target.value)}
              disabled={disabled}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={VIDEO_MODELS.VEO_3_1_GENERATE}>Veo 3.1 (Latest)</option>
              <option value={VIDEO_MODELS.VEO_3_1_FAST_GENERATE}>Veo 3.1 Fast</option>
              <option value={VIDEO_MODELS.VEO_2_0_GENERATE}>Veo 2.0</option>
              <option value={VIDEO_MODELS.SEEDANCE_1_0_PRO}>SEEDANCE 1.0 Pro</option>
              <option value={VIDEO_MODELS.MINIMAX_HAILUO_02_PRO}>MiniMax Hailuo-02 Pro</option>
            </select>
          </div>

          {/* Aspect Ratio */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <label
              htmlFor="aspectRatio"
              className="block text-xs font-medium text-neutral-700 mb-2"
            >
              Aspect Ratio
            </label>
            <select
              id="aspectRatio"
              value={aspectRatio}
              onChange={(e): void => onAspectRatioChange(e.target.value as '16:9' | '9:16' | '1:1')}
              disabled={disabled}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {modelConfig.supportedAspectRatios.map((ratio): React.ReactElement => (
                <option key={ratio} value={ratio}>
                  {ratio}{' '}
                  {ratio === '16:9'
                    ? 'Landscape'
                    : ratio === '9:16'
                      ? 'Portrait'
                      : ratio === '1:1'
                        ? 'Square'
                        : ''}
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
              onChange={(e): void => onDurationChange(parseInt(e.target.value) as 4 | 5 | 6 | 8 | 10)}
              disabled={disabled}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {modelConfig.supportedDurations.map((dur): React.ReactElement => (
                <option key={dur} value={dur}>
                  {dur} seconds
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Image Input */}
        {modelConfig.supportsReferenceImage && (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="block text-sm font-semibold text-neutral-900 mb-3">
              Reference Image (Optional)
            </div>

            {imagePreviewUrl ? (
              <div className="relative">
                <div className="relative w-full max-h-64">
                  <Image
                    src={imagePreviewUrl}
                    alt="Selected reference"
                    width={800}
                    height={450}
                    className="w-full max-h-64 object-contain rounded-lg border border-neutral-200"
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={onClearImage}
                  className="absolute right-2 top-2 rounded-md bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                  title="Remove image"
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
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={(): void | undefined => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="w-full flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-8 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    className="h-10 w-10 text-neutral-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-neutral-700">
                      Click to upload, paste (Ctrl+V), or{' '}
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-700 cursor-pointer underline"
                        onClick={(e): void => {
                          e.stopPropagation();
                          onShowAssetLibrary(true);
                        }}
                        aria-label="Select image from library"
                      >
                        select from library
                      </button>
                    </span>
                    <span className="text-xs text-neutral-500">
                      Upload, paste, or select an image from your library to use as a reference
                    </span>
                  </div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileInputChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
        )}

        {/* Prompt */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <label htmlFor="prompt" className="block text-sm font-semibold text-neutral-900 mb-2">
            Video Description *
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e): void => onPromptChange(e.target.value)}
            placeholder="A fast-tracking shot through a bustling dystopian sprawl with bright neon signs, flying cars and mist, night, lens flare, volumetric lighting"
            rows={4}
            disabled={disabled}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            required
          />
          <p className="mt-2 text-xs text-neutral-500">
            Describe the video you want to generate in detail
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex-1">
            <p className="text-sm text-neutral-600">
              {queueLength}/{NUMERIC_LIMITS.VIDEO_QUEUE_MAX} videos in queue
            </p>
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-md transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-purple-500 disabled:hover:to-pink-500"
          >
            <div className="flex items-center gap-2">
              {disabled ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Adding to Queue...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                  Add to Queue
                </>
              )}
            </div>
          </button>
        </div>
      </form>

      {/* Asset Library Modal */}
      {showAssetLibrary && (
        <AssetLibraryModal
          projectId={projectId}
          onSelect={(asset): void => {
            onAssetSelect(asset);
            onShowAssetLibrary(false);
          }}
          onClose={(): void => onShowAssetLibrary(false)}
        />
      )}
    </>
  );
}

export default VideoGenerationForm;
