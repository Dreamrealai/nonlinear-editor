/**
 * KeyframeEditorShell - Complete keyframe editing interface
 *
 * Main container component for the AI-powered keyframe editing system.
 * Orchestrates keyframe selection, crop editing, AI generation, and version
 * management. Integrates multiple specialized hooks for data fetching,
 * editing state, and image uploads.
 *
 * Features:
 * - Asset/scene selection across multiple assets
 * - Keyframe extraction and custom image upload
 * - Global or crop-based AI editing modes
 * - Prompt-based image generation with reference images
 * - Version history and gallery view
 * - Real-time preview with crop overlay
 * - Supabase integration for data and storage
 * - Automatic URL signing for secure access
 *
 * Architecture:
 * - Uses custom hooks for separation of concerns
 * - Handles Supabase client initialization
 * - Manages global editor state and refresh
 * - Coordinates between sidebar, preview, controls, and gallery
 *
 * @param assets - Array of video/image assets to edit keyframes from
 *
 * @example
 * ```tsx
 * <KeyframeEditorShell assets={projectAssets} />
 * ```
 */
'use client';

import React, {  useCallback, useEffect, useState  } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useKeyframeData, useFrameEdits } from './hooks/useKeyframeData';
import { useKeyframeSelection } from './hooks/useKeyframeSelection';
import { useKeyframeEditing } from './hooks/useKeyframeEditing';
import { useImageUpload } from './hooks/useImageUpload';
import { KeyframeSidebar } from './components/KeyframeSidebar';
import { KeyframePreview } from './components/KeyframePreview';
import { EditControls } from './components/EditControls';
import { VersionsGallery } from './components/VersionsGallery';
import { getAssetLabel, parseStoragePathClient, type AssetRow } from './utils';
import { browserLogger } from '@/lib/browserLogger';

interface KeyframeEditorShellProps {
  assets: AssetRow[];
}

function KeyframeEditorContent({
  assets,
  supabase,
}: KeyframeEditorShellProps & {
  supabase: NonNullable<ReturnType<typeof useSupabase>['supabaseClient']>;
}): React.ReactElement {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(assets[0]?.id ?? null);
  const [refreshToken, setRefreshToken] = useState(0);

  const signStoragePath = useCallback(async (storagePath: string, expiresIn = 3600): Promise<string | null> => {
    if (!storagePath) {
      return null;
    }

    if (storagePath.startsWith('http') || storagePath.startsWith('blob:')) {
      return storagePath;
    }

    try {
      parseStoragePathClient(storagePath);
    } catch (error) {
      browserLogger.error({ error, storagePath }, 'Invalid storage path');
      return null;
    }

    try {
      const params = new URLSearchParams({ storageUrl: storagePath });
      if (Number.isFinite(expiresIn) && expiresIn > 0) {
        params.set('ttl', Math.round(expiresIn).toString());
      }
      const response = await fetch(`/api/assets/sign?${params.toString()}`);
      if (!response.ok) {
        const detail = await response.text().catch((): string => '');
        browserLogger.error(
          { storagePath, status: response.status, detail },
          'Failed to sign storage path'
        );
        return null;
      }
      const payload = (await response.json()) as { signedUrl?: string };
      return payload.signedUrl ?? null;
    } catch (error) {
      browserLogger.error({ error, storagePath }, 'Failed to sign storage path');
      return null;
    }
  }, []);

  const handleRefreshNeeded = useCallback((): void => {
    setRefreshToken((token): number => token + 1);
  }, []);

  // Data loading hooks
  const { scenes, frames, frameUrls, groupedFrames } = useKeyframeData({
    supabase,
    selectedAssetId,
    refreshToken,
    signStoragePath,
  });

  // Frame selection and crop management
  const {
    selectedFrameId,
    selectedFrameUrl,
    selectedFrame,
    mode,
    crop,
    feather,
    cropOverlayStyle,
    setMode,
    setCrop,
    setFeather,
    handleFrameSelect,
    handleImageClick,
    clampCrop,
  } = useKeyframeSelection({
    frames,
    frameUrls,
    signStoragePath,
  });

  // Frame edits loading
  const { edits } = useFrameEdits({
    supabase,
    selectedFrameId,
    refreshToken,
    signStoragePath,
  });

  // Edit submission logic
  const {
    prompt,
    setPrompt,
    isSubmitting,
    submitError,
    refImages,
    handleSubmit,
    handleRefImageSelect,
    handleRemoveRefImage,
    handlePaste,
  } = useKeyframeEditing({
    supabase,
    selectedFrameId,
    selectedAssetId,
    mode,
    crop,
    feather,
    signStoragePath,
    onRefreshNeeded: handleRefreshNeeded,
  });

  // Image upload and video frame extraction
  const {
    assetVideoUrl,
    showVideoPlayer,
    setShowVideoPlayer,
    isVideoReady,
    isExtractingFrame,
    isUploadingImage,
    videoRef,
    canvasRef,
    fileInputRef,
    handleExtractFrame,
    handleImageUpload,
    handlePasteAsKeyframe,
  } = useImageUpload({
    supabase,
    selectedAssetId,
    assets,
    signStoragePath,
    onRefreshNeeded: handleRefreshNeeded,
  });

  // Reference image input ref
  const refImageInputRef = useCallback((): void => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e): undefined =>
      void handleRefImageSelect(e as unknown as React.ChangeEvent<HTMLInputElement>);
    input.click();
  }, [handleRefImageSelect]);

  // Attach paste event listeners
  useEffect((): () => void => {
    const pasteHandler = (event: Event): void => {
      void handlePaste(event as ClipboardEvent);
      void handlePasteAsKeyframe(event as ClipboardEvent);
    };
    document.addEventListener('paste', pasteHandler);
    return (): void => {
      document.removeEventListener('paste', pasteHandler);
    };
  }, [handlePaste, handlePasteAsKeyframe]);

  return (
    <div className="flex h-screen flex-col bg-white">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageUpload}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Compact Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-sm font-medium text-neutral-900">Key Frame Editor</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="rounded border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 transition-colors hover:border-neutral-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
            value={selectedAssetId ?? ''}
            onChange={(event): void => setSelectedAssetId(event.target.value || null)}
          >
            {assets.map((asset): React.ReactElement => (
              <option key={asset.id} value={asset.id}>
                {getAssetLabel(asset)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded border border-neutral-200 bg-white p-1.5 text-neutral-600 transition-colors hover:bg-neutral-50"
            onClick={handleRefreshNeeded}
            title="Refresh frames"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Video Player Modal */}
      {showVideoPlayer && assetVideoUrl && (
        <div className="border-b border-neutral-200 bg-neutral-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-medium text-neutral-700">Video Scrubber</h3>
            <button
              onClick={(): void => setShowVideoPlayer(false)}
              className="text-neutral-400 transition-colors hover:text-neutral-900"
              aria-label="Close video player"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            <video
              ref={videoRef}
              src={assetVideoUrl}
              controls
              className="w-full rounded border border-neutral-200 bg-black"
              style={{ maxHeight: '280px' }}
              aria-label="Video preview"
            >
              <track kind="captions" />
            </video>
            <button
              type="button"
              className="w-full rounded bg-neutral-900 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleExtractFrame}
              disabled={isExtractingFrame || !isVideoReady}
            >
              {isExtractingFrame ? 'Extracting...' : 'Extract Current Frame'}
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <KeyframeSidebar
          scenes={scenes}
          frames={frames}
          frameUrls={frameUrls}
          groupedFrames={groupedFrames}
          selectedFrameId={selectedFrameId}
          onFrameSelect={handleFrameSelect}
          onExtractFrame={(): void => setShowVideoPlayer(!showVideoPlayer)}
          onUploadImage={(): void | undefined => fileInputRef.current?.click()}
          isUploadingImage={isUploadingImage}
          canExtractFrame={!!assetVideoUrl}
        />

        {/* Main Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
          {/* Frame Preview */}
          <KeyframePreview
            selectedFrame={selectedFrame}
            selectedFrameUrl={selectedFrameUrl}
            scenes={scenes}
            mode={mode}
            cropOverlayStyle={cropOverlayStyle}
            onImageClick={handleImageClick}
          />

          {/* Edit Controls */}
          <EditControls
            mode={mode}
            onModeChange={setMode}
            selectedFrame={selectedFrame}
            crop={crop}
            feather={feather}
            onCropChange={setCrop}
            onFeatherChange={setFeather}
            prompt={prompt}
            onPromptChange={setPrompt}
            refImages={refImages}
            onAttachRefImages={refImageInputRef}
            onRemoveRefImage={handleRemoveRefImage}
            submitError={submitError}
            isSubmitting={isSubmitting}
            onClear={(): void => setPrompt('')}
            onSubmit={handleSubmit}
            selectedFrameId={selectedFrameId}
            clampCrop={clampCrop}
          />

          {/* Versions */}
          <VersionsGallery edits={edits} />
        </div>
      </div>
    </div>
  );
}

export function KeyframeEditorShell({ assets }: KeyframeEditorShellProps): React.ReactElement {
  const { supabaseClient, isLoading } = useSupabase();

  if (isLoading || !supabaseClient) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Loading keyframe editor..." />
      </div>
    );
  }

  return <KeyframeEditorContent assets={assets} supabase={supabaseClient} />;
}
