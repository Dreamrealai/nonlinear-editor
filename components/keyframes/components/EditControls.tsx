'use client';

/**
 * EditControls - Keyframe editing controls panel
 *
 * Comprehensive control panel for AI-powered keyframe editing. Provides
 * mode selection (global vs crop), crop positioning controls, prompt input,
 * reference image management, and generation submission.
 *
 * Features:
 * - Mode toggle: Global editing vs Crop-based editing
 * - Crop controls: X/Y position and size sliders with feathering
 * - Multi-line prompt textarea for AI generation
 * - Reference image attachment and preview
 * - Image upload with drag-and-drop support
 * - Clear all edits button
 * - Generate button with loading state
 * - Error message display
 * - Form validation
 *
 * Modes:
 * - Global: Edit entire frame
 * - Crop: Edit specific region with feathered edges
 *
 * @param mode - Current editing mode ('global' | 'crop')
 * @param onModeChange - Callback to switch editing mode
 * @param selectedFrame - Currently selected frame data
 * @param crop - Current crop state (x, y, size)
 * @param feather - Crop edge feathering amount
 * @param onCropChange - Callback when crop changes
 * @param onFeatherChange - Callback when feathering changes
 * @param prompt - AI generation prompt text
 * @param onPromptChange - Callback when prompt changes
 * @param refImages - Attached reference images
 * @param onAttachRefImages - Callback to attach new reference images
 * @param onRemoveRefImage - Callback to remove a reference image
 * @param submitError - Error message from generation attempt
 * @param isSubmitting - Whether generation is in progress
 * @param onClear - Callback to clear all edits
 * @param onSubmit - Callback to submit generation
 * @param selectedFrameId - ID of selected frame
 * @param clampCrop - Function to clamp crop values to frame bounds
 *
 * @example
 * ```tsx
 * <EditControls
 *   mode="crop"
 *   onModeChange={setMode}
 *   selectedFrame={frame}
 *   crop={cropState}
 *   onCropChange={setCrop}
 *   prompt={prompt}
 *   onPromptChange={setPrompt}
 *   onSubmit={handleGenerate}
 * />
 * ```
 */

import Image from 'next/image';
import clsx from 'clsx';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface SceneFrameRow {
  id: string;
  scene_id: string;
  kind: 'first' | 'middle' | 'last' | 'custom';
  t_ms: number;
  storage_path: string;
  width: number | null;
  height: number | null;
}

interface CropState {
  x: number;
  y: number;
  size: number;
}

interface RefImage {
  id: string;
  file: File;
  previewUrl: string;
  uploading: boolean;
  uploadedUrl?: string;
}

interface EditControlsProps {
  mode: 'global' | 'crop';
  onModeChange: (mode: 'global' | 'crop') => void;
  selectedFrame: SceneFrameRow | null;
  crop: CropState;
  feather: number;
  onCropChange: (crop: CropState) => void;
  onFeatherChange: (feather: number) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  refImages: RefImage[];
  onAttachRefImages: () => void;
  onRemoveRefImage: (id: string) => void;
  submitError: string | null;
  isSubmitting: boolean;
  onClear: () => void;
  onSubmit: () => void;
  selectedFrameId: string | null;
  clampCrop: (next: CropState, frame: SceneFrameRow | null) => CropState;
}

export function EditControls({
  mode,
  onModeChange,
  selectedFrame,
  crop,
  feather,
  onCropChange,
  onFeatherChange,
  prompt,
  onPromptChange,
  refImages,
  onAttachRefImages,
  onRemoveRefImage,
  submitError,
  isSubmitting,
  onClear,
  onSubmit,
  selectedFrameId,
  clampCrop,
}: EditControlsProps): React.ReactElement {
  return (
    <div className="border-b border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={clsx(
            'rounded px-3 py-1.5 text-xs font-medium transition-all',
            mode === 'global'
              ? 'bg-neutral-900 text-white'
              : 'border border-neutral-200 text-neutral-600 hover:border-neutral-300'
          )}
          onClick={(): void => onModeChange('global')}
        >
          Global
        </button>
        <button
          type="button"
          className={clsx(
            'rounded px-3 py-1.5 text-xs font-medium transition-all',
            mode === 'crop'
              ? 'bg-neutral-900 text-white'
              : 'border border-neutral-200 text-neutral-600 hover:border-neutral-300'
          )}
          onClick={(): void => onModeChange('crop')}
        >
          Crop
        </button>
      </div>

      {mode === 'crop' && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <label htmlFor="edit-crop-size" className="w-16 text-xs text-neutral-600">
              Size
            </label>
            <input
              id="edit-crop-size"
              type="range"
              min={64}
              max={Math.min(1024, selectedFrame?.width ?? 1024)}
              step={16}
              value={crop.size}
              onChange={(event): void =>
                onCropChange(
                  clampCrop(
                    {
                      ...crop,
                      size: Number(event.target.value),
                    },
                    selectedFrame
                  )
                )
              }
              className="flex-1"
              aria-label="Crop size"
            />
            <span className="w-12 text-right text-[10px] text-neutral-500">{crop.size}px</span>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="edit-crop-feather" className="w-16 text-xs text-neutral-600">
              Feather
            </label>
            <input
              id="edit-crop-feather"
              type="range"
              min={0}
              max={128}
              step={1}
              value={feather}
              onChange={(event): void => onFeatherChange(Number(event.target.value))}
              className="flex-1"
              aria-label="Feather amount"
            />
            <span className="w-12 text-right text-[10px] text-neutral-500">{feather}px</span>
          </div>
          <p className="text-[10px] text-neutral-400">Click image to reposition crop area</p>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="edit-controls-prompt" className="text-xs font-medium text-neutral-700">
            Edit Prompt
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-400">Paste images here</span>
            <button
              type="button"
              className="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50"
              onClick={onAttachRefImages}
              disabled={isSubmitting}
            >
              Attach
            </button>
          </div>
        </div>
        <textarea
          id="edit-controls-prompt"
          className="w-full rounded border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
          rows={3}
          value={prompt}
          onChange={(event): void => onPromptChange(event.target.value)}
          placeholder="Describe your desired edit or paste reference images (Cmd/Ctrl+V)"
        />
        {refImages.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {refImages.map(
              (img): React.ReactElement => (
                <div
                  key={img.id}
                  className="group relative h-14 w-14 overflow-hidden rounded border border-neutral-200 bg-neutral-50"
                >
                  <Image
                    src={img.previewUrl}
                    alt="Reference"
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                  {img.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                      <svg
                        className="h-4 w-4 animate-spin text-neutral-600"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(): void => onRemoveRefImage(img.id)}
                    className="absolute -right-1 -top-1 h-4 w-4 rounded-full border border-neutral-200 bg-white text-neutral-600 opacity-0 transition-opacity hover:bg-neutral-100 group-hover:opacity-100"
                    disabled={img.uploading}
                  >
                    <svg
                      className="h-full w-full p-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>
      {submitError && <p className="mt-2 text-xs text-red-600">{submitError}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="rounded border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50"
          onClick={onClear}
          disabled={isSubmitting}
        >
          Clear
        </button>
        <button
          type="button"
          className="rounded bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400 flex items-center gap-2"
          onClick={onSubmit}
          disabled={isSubmitting || !selectedFrameId}
        >
          {isSubmitting && <LoadingSpinner size="sm" className="text-white" />}
          {isSubmitting ? 'Generating 4 Variations…' : 'Generate 4 Edits'}
        </button>
      </div>
    </div>
  );
}
