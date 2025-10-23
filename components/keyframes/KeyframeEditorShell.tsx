/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useState, useRef, type CSSProperties } from 'react';
import clsx from 'clsx';
import { useSupabase } from '@/components/providers/SupabaseProvider';

interface AssetRow {
  id: string;
  title?: string | null;
  storage_url: string;
  metadata: Record<string, unknown> | null;
}

interface SceneRow {
  id: string;
  start_ms: number;
  end_ms: number;
}

interface SceneFrameRow {
  id: string;
  scene_id: string;
  kind: 'first' | 'middle' | 'last' | 'custom';
  t_ms: number;
  storage_path: string;
  width: number | null;
  height: number | null;
}

interface FrameEditRow {
  id: string;
  frame_id: string;
  version: number;
  output_storage_path: string;
  created_at: string;
  prompt: string;
}

interface KeyframeEditorShellProps {
  assets: AssetRow[];
}

type Mode = 'global' | 'crop';

interface CropState {
  x: number;
  y: number;
  size: number;
}

function parseStoragePathClient(storagePath: string): { bucket: string; key: string } {
  const clean = storagePath.replace('supabase://', '');
  const [bucket, ...keyParts] = clean.split('/');
  const key = keyParts.join('/');
  if (!bucket || !key) {
    throw new Error(`Invalid storage path: ${storagePath}`);
  }
  return { bucket, key };
}

const defaultCrop = (width?: number | null, height?: number | null): CropState => {
  const size = Math.min(width ?? 512, height ?? 512, 512);
  return { x: 0, y: 0, size: size > 0 ? size : 256 };
};

const getAssetLabel = (asset: AssetRow) => {
  const meta = asset.metadata as { filename?: string } | null;
  return meta?.filename ?? asset.title ?? asset.id;
};

const formatMs = (ms: number) => {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

function KeyframeEditorContent({ assets, supabase }: KeyframeEditorShellProps & { supabase: NonNullable<ReturnType<typeof useSupabase>['supabaseClient']> }) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(assets[0]?.id ?? null);
  const [scenes, setScenes] = useState<SceneRow[]>([]);
  const [frames, setFrames] = useState<SceneFrameRow[]>([]);
  const [frameUrls, setFrameUrls] = useState<Record<string, string>>({});
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [selectedFrameUrl, setSelectedFrameUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('global');
  const [crop, setCrop] = useState<CropState>(defaultCrop());
  const [feather, setFeather] = useState<number>(24);
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Array<FrameEditRow & { url: string | null }>>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [assetVideoUrl, setAssetVideoUrl] = useState<string | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isExtractingFrame, setIsExtractingFrame] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [refImages, setRefImages] = useState<Array<{
    id: string;
    file: File;
    previewUrl: string;
    uploading: boolean;
    uploadedUrl?: string;
  }>>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  const groupedFrames = useMemo(() => {
    const byScene = new Map<string, SceneFrameRow[]>();
    for (const frame of frames) {
      const existing = byScene.get(frame.scene_id) ?? [];
      existing.push(frame);
      byScene.set(frame.scene_id, existing);
    }
    for (const frameList of byScene.values()) {
      frameList.sort((a, b) => {
        const order: Record<SceneFrameRow['kind'], number> = { first: 0, middle: 1, last: 2, custom: 3 };
        return order[a.kind] - order[b.kind];
      });
    }
    return byScene;
  }, [frames]);

  const clampCrop = useCallback(
    (next: CropState, frame: SceneFrameRow | null) => {
      if (!frame) return next;
      const maxSize = Math.min(frame.width ?? next.size, frame.height ?? next.size);
      const size = Math.min(next.size, maxSize);
      const maxX = Math.max(0, (frame.width ?? size) - size);
      const maxY = Math.max(0, (frame.height ?? size) - size);
      return {
        size,
        x: Math.max(0, Math.min(next.x, maxX)),
        y: Math.max(0, Math.min(next.y, maxY)),
      };
    },
    []
  );

  const signStoragePath = useCallback(async (storagePath: string, expiresIn = 3600) => {
    if (!storagePath) {
      return null;
    }

    if (storagePath.startsWith('http') || storagePath.startsWith('blob:')) {
      return storagePath;
    }

    try {
      parseStoragePathClient(storagePath);
    } catch (error) {
      console.error('Invalid storage path', storagePath, error);
      return null;
    }

    try {
      const params = new URLSearchParams({ storageUrl: storagePath });
      if (Number.isFinite(expiresIn) && expiresIn > 0) {
        params.set('ttl', Math.round(expiresIn).toString());
      }
      const response = await fetch(`/api/assets/sign?${params.toString()}`);
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.error('Failed to sign storage path', storagePath, response.status, detail);
        return null;
      }
      const payload = (await response.json()) as { signedUrl?: string };
      return payload.signedUrl ?? null;
    } catch (error) {
      console.error('Failed to sign storage path', storagePath, error);
      return null;
    }
  }, []);

  const loadScenesAndFrames = useCallback(
    async (assetId: string | null) => {
      if (!assetId) {
        setScenes([]);
        setFrames([]);
        setFrameUrls({});
        setSelectedFrameId(null);
        return;
      }

      const [{ data: sceneRows, error: scenesError }, { data: frameRows, error: framesError }] =
        await Promise.all([
          supabase
            .from('scenes')
            .select('id, start_ms, end_ms')
            .eq('asset_id', assetId)
            .order('start_ms', { ascending: true }),
          supabase
            .from('scene_frames')
            .select('id, scene_id, kind, t_ms, storage_path, width, height')
            .eq('asset_id', assetId),
        ]);

      if (scenesError) {
        console.error('Failed to load scenes', scenesError);
      }
      if (framesError) {
        console.error('Failed to load frames', framesError);
      }

      setScenes(sceneRows ?? []);
      setFrames(frameRows ?? []);

      if (frameRows?.length) {
        const urls = Object.fromEntries(
          await Promise.all(
            frameRows.map(async (frame) => {
              const url = await signStoragePath(frame.storage_path);
              return [frame.id, url ?? ''] as const;
            })
          )
        );
        setFrameUrls(urls);

        const preferredFrame = frameRows.find((f) => f.kind === 'middle') ?? frameRows[0];
        if (preferredFrame) {
          setSelectedFrameId(preferredFrame.id);
          setSelectedFrameUrl(urls[preferredFrame.id] ?? null);
          setCrop(clampCrop(defaultCrop(preferredFrame.width, preferredFrame.height), preferredFrame));
        }
      } else {
        setFrameUrls({});
        setSelectedFrameId(null);
        setSelectedFrameUrl(null);
      }
    },
    [clampCrop, signStoragePath, supabase]
  );

  useEffect(() => {
    void loadScenesAndFrames(selectedAssetId);
  }, [loadScenesAndFrames, selectedAssetId, refreshToken]);

  const loadFrameEdits = useCallback(
    async (frameId: string | null) => {
      if (!frameId) {
        setEdits([]);
        return;
      }
      const { data, error } = await supabase
        .from('frame_edits')
        .select('id, frame_id, version, output_storage_path, created_at, prompt')
        .eq('frame_id', frameId)
        .order('version', { ascending: false });
      if (error) {
        console.error('Failed to load frame edits', error);
        setEdits([]);
        return;
      }
      const editsWithUrls = await Promise.all(
        (data ?? []).map(async (row) => ({
          ...row,
          url: await signStoragePath(row.output_storage_path),
        }))
      );
      setEdits(editsWithUrls);
    },
    [signStoragePath, supabase]
  );

  useEffect(() => {
    void loadFrameEdits(selectedFrameId);
  }, [loadFrameEdits, selectedFrameId, refreshToken]);

  useEffect(() => {
    setMode('global');
    setPrompt('');
    setSubmitError(null);
  }, [selectedFrameId]);

  const selectedFrame = useMemo(
    () => frames.find((frame) => frame.id === selectedFrameId) ?? null,
    [frames, selectedFrameId]
  );

  const handleFrameSelect = async (frame: SceneFrameRow) => {
    setSelectedFrameId(frame.id);
    const url = frameUrls[frame.id] ?? (await signStoragePath(frame.storage_path));
    setSelectedFrameUrl(url);
    setCrop(clampCrop(defaultCrop(frame.width, frame.height), frame));
  };

  const handleSubmit = async () => {
    if (!selectedFrameId) return;
    if (!prompt.trim()) {
      setSubmitError('Prompt is required.');
      return;
    }

    // Check if any reference images are still uploading
    const uploadingImages = refImages.filter((img) => img.uploading);
    if (uploadingImages.length > 0) {
      setSubmitError('Please wait for all reference images to finish uploading.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const refImageUrls = refImages.filter((img) => img.uploadedUrl).map((img) => img.uploadedUrl!);

      const response = await fetch(`/api/frames/${selectedFrameId}/edit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode,
          prompt,
          crop: mode === 'crop' ? crop : undefined,
          featherPx: mode === 'crop' ? feather : undefined,
          refImages: refImageUrls,
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? 'Failed to run edit');
      }

      setPrompt('');
      // Clear reference images after successful submission
      refImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setRefImages([]);
      setRefreshToken((token) => token + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (mode !== 'crop' || !selectedFrame) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = (selectedFrame.width ?? rect.width) / rect.width;
    const scaleY = (selectedFrame.height ?? rect.height) / rect.height;
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;
    const half = crop.size / 2;
    const next: CropState = {
      x: Math.round(clickX - half),
      y: Math.round(clickY - half),
      size: crop.size,
    };
    setCrop(clampCrop(next, selectedFrame));
  };

  const cropOverlayStyle = useMemo(() => {
    if (mode !== 'crop' || !selectedFrame || !selectedFrameUrl) return undefined;
    const displayWidth = selectedFrame.width ?? 1;
    const displayHeight = selectedFrame.height ?? 1;
    return {
      left: `${(crop.x / displayWidth) * 100}%`,
      top: `${(crop.y / displayHeight) * 100}%`,
      width: `${(crop.size / displayWidth) * 100}%`,
      height: `${(crop.size / displayHeight) * 100}%`,
    } satisfies CSSProperties;
  }, [crop, mode, selectedFrame, selectedFrameUrl]);

  // Load video URL when asset is selected
  useEffect(() => {
    if (!selectedAssetId) {
      setAssetVideoUrl(null);
      return;
    }
    const asset = assets.find((a) => a.id === selectedAssetId);
    if (asset) {
      void signStoragePath(asset.storage_url).then(setAssetVideoUrl);
    }
  }, [selectedAssetId, assets, signStoragePath]);

  // Track video readiness
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideoPlayer) {
      setIsVideoReady(false);
      return;
    }

    const handleLoadedMetadata = () => {
      setIsVideoReady(true);
    };

    // Check if video is already loaded
    if (video.readyState >= 1) {
      setIsVideoReady(true);
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [showVideoPlayer, assetVideoUrl]);

  const handleExtractFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedAssetId) return;

    setIsExtractingFrame(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas context');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
      if (!blob) throw new Error('Failed to create image blob');

      const currentTimeMs = Math.round(video.currentTime * 1000);

      // Upload the frame image to Supabase storage
      const fileName = `${selectedAssetId}/custom/${Date.now()}-${currentTimeMs}ms.png`;
      const { error: uploadError } = await supabase.storage
        .from('frames')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create a frame record in the database
      const storagePath = `supabase://frames/${fileName}`;
      const { error: insertError } = await supabase
        .from('scene_frames')
        .insert({
          project_id: assets.find((a) => a.id === selectedAssetId)?.metadata?.project_id,
          asset_id: selectedAssetId,
          scene_id: null, // Custom frames don't have a scene
          kind: 'custom',
          t_ms: currentTimeMs,
          storage_path: storagePath,
          width: canvas.width,
          height: canvas.height,
        });

      if (insertError) throw insertError;

      // Refresh frames
      setRefreshToken((t) => t + 1);
      setShowVideoPlayer(false);
    } catch (error) {
      console.error('Failed to extract frame:', error);
      alert('Failed to extract frame. Please try again.');
    } finally {
      setIsExtractingFrame(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedAssetId) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setIsUploadingImage(true);
    try {
      // Create an image to get dimensions
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });
      URL.revokeObjectURL(imageUrl);

      // Upload the image to Supabase storage
      const fileName = `${selectedAssetId}/custom/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('frames')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create a frame record in the database
      const storagePath = `supabase://frames/${fileName}`;
      const { error: insertError } = await supabase
        .from('scene_frames')
        .insert({
          project_id: assets.find((a) => a.id === selectedAssetId)?.metadata?.project_id,
          asset_id: selectedAssetId,
          scene_id: null, // Custom frames don't have a scene
          kind: 'custom',
          t_ms: 0, // Uploaded images don't have a timestamp
          storage_path: storagePath,
          width: img.width,
          height: img.height,
        });

      if (insertError) throw insertError;

      // Refresh frames
      setRefreshToken((t) => t + 1);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRefImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedAssetId) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert('Please select image files');
      return;
    }

    // Create preview URLs and add to state
    const newImages = imageFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: false,
    }));

    setRefImages((prev) => [...prev, ...newImages]);

    // Upload images to Supabase storage
    for (const img of newImages) {
      setRefImages((prev) =>
        prev.map((item) => (item.id === img.id ? { ...item, uploading: true } : item))
      );

      try {
        const fileName = `${selectedAssetId}/refs/${Date.now()}-${img.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('frames')
          .upload(fileName, img.file, {
            contentType: img.file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get signed URL for the uploaded image
        const storagePath = `supabase://frames/${fileName}`;
        const signedUrl = await signStoragePath(storagePath, 3600);

        setRefImages((prev) =>
          prev.map((item) =>
            item.id === img.id
              ? { ...item, uploading: false, uploadedUrl: signedUrl ?? undefined }
              : item
          )
        );
      } catch (error) {
        console.error('Failed to upload reference image:', error);
        // Remove failed upload
        setRefImages((prev) => prev.filter((item) => item.id !== img.id));
        alert(`Failed to upload ${img.file.name}. Please try again.`);
      }
    }

    // Reset file input
    if (refImageInputRef.current) {
      refImageInputRef.current.value = '';
    }
  };

  const handleRemoveRefImage = (id: string) => {
    setRefImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  // Handle paste events for images
  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (!selectedAssetId) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;

    event.preventDefault();

    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;

      // Check if pasting into the prompt area (attach as reference image)
      const target = event.target as HTMLElement;
      const isPastingIntoPrompt = target.tagName === 'TEXTAREA';

      if (isPastingIntoPrompt) {
        // Add as reference image
        const newImage = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
          uploading: false,
        };

        setRefImages((prev) => [...prev, newImage]);

        // Upload to Supabase
        setRefImages((prev) =>
          prev.map((item) => (item.id === newImage.id ? { ...item, uploading: true } : item))
        );

        try {
          const fileName = `${selectedAssetId}/refs/${Date.now()}-pasted.png`;
          const { error: uploadError } = await supabase.storage
            .from('frames')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const storagePath = `supabase://frames/${fileName}`;
          const signedUrl = await signStoragePath(storagePath, 3600);

          setRefImages((prev) =>
            prev.map((item) =>
              item.id === newImage.id
                ? { ...item, uploading: false, uploadedUrl: signedUrl ?? undefined }
                : item
            )
          );
        } catch (error) {
          console.error('Failed to upload pasted image:', error);
          setRefImages((prev) => prev.filter((item) => item.id !== newImage.id));
          alert('Failed to upload pasted image. Please try again.');
        }
      } else {
        // Add as new keyframe
        setIsUploadingImage(true);
        try {
          const img = new Image();
          const imageUrl = URL.createObjectURL(file);
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
          });
          URL.revokeObjectURL(imageUrl);

          const fileName = `${selectedAssetId}/custom/${Date.now()}-pasted.png`;
          const { error: uploadError } = await supabase.storage
            .from('frames')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const storagePath = `supabase://frames/${fileName}`;
          const { error: insertError } = await supabase
            .from('scene_frames')
            .insert({
              project_id: assets.find((a) => a.id === selectedAssetId)?.metadata?.project_id,
              asset_id: selectedAssetId,
              scene_id: null,
              kind: 'custom',
              t_ms: 0,
              storage_path: storagePath,
              width: img.width,
              height: img.height,
            });

          if (insertError) throw insertError;

          setRefreshToken((t) => t + 1);
        } catch (error) {
          console.error('Failed to upload pasted image:', error);
          alert('Failed to upload pasted image. Please try again.');
        } finally {
          setIsUploadingImage(false);
        }
      }
    }
  }, [selectedAssetId, assets, supabase, signStoragePath]);

  // Attach paste event listener
  useEffect(() => {
    const pasteHandler = (event: Event) => {
      void handlePaste(event as ClipboardEvent);
    };
    document.addEventListener('paste', pasteHandler);
    return () => {
      document.removeEventListener('paste', pasteHandler);
    };
  }, [handlePaste]);

  return (
    <div className="flex h-screen flex-col bg-white">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={refImageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleRefImageSelect}
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
            onChange={(event) => setSelectedAssetId(event.target.value || null)}
          >
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {getAssetLabel(asset)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded border border-neutral-200 bg-white p-1.5 text-neutral-600 transition-colors hover:bg-neutral-50"
            onClick={() => setRefreshToken((token) => token + 1)}
            title="Refresh frames"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
              onClick={() => setShowVideoPlayer(false)}
              className="text-neutral-400 transition-colors hover:text-neutral-900"
              aria-label="Close video player"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
            />
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
        {/* Full-height Sidebar */}
        <div className="w-64 flex-shrink-0 overflow-y-auto border-r border-neutral-200 bg-white">
          {/* Action Buttons */}
          <div className="space-y-2 border-b border-neutral-200 p-4">
            <button
              type="button"
              className="w-full rounded bg-neutral-900 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setShowVideoPlayer((prev) => !prev)}
              disabled={!assetVideoUrl}
            >
              {showVideoPlayer ? 'Hide' : 'Extract'} Frame
            </button>
            <button
              type="button"
              className="w-full rounded border border-neutral-200 bg-white py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage || !selectedAssetId}
            >
              {isUploadingImage ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>

          {/* Custom Frames Section */}
          {frames.filter((f) => f.kind === 'custom').length > 0 && (
            <div className="border-b border-neutral-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                  Custom
                </h2>
                <span className="text-[10px] text-neutral-400">
                  {frames.filter((f) => f.kind === 'custom').length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {frames
                  .filter((f) => f.kind === 'custom')
                  .sort((a, b) => b.t_ms - a.t_ms)
                  .map((frame) => (
                    <button
                      key={frame.id}
                      type="button"
                      onClick={() => void handleFrameSelect(frame)}
                      className={clsx(
                        'group relative aspect-[4/3] overflow-hidden rounded border text-left transition-all',
                        selectedFrameId === frame.id
                          ? 'border-neutral-900 ring-1 ring-neutral-900'
                          : 'border-neutral-200 hover:border-neutral-400'
                      )}
                    >
                      {frameUrls[frame.id] ? (
                        <img
                          src={frameUrls[frame.id] ?? ''}
                          alt="Custom frame"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-neutral-100 text-[10px] text-neutral-400">
                          Loading...
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                        <span className="text-[9px] font-medium text-white">
                          {frame.t_ms > 0 ? formatMs(frame.t_ms) : 'Upload'}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Scene Frames Section */}
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                Scenes
              </h2>
              <span className="text-[10px] text-neutral-400">{scenes.length}</span>
            </div>
            <div className="space-y-3">
              {scenes.map((scene) => {
                const sceneFrames = groupedFrames.get(scene.id) ?? [];
                return (
                  <div key={scene.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] text-neutral-500">
                      <span>{formatMs(scene.start_ms)}</span>
                      <span className="text-neutral-300">—</span>
                      <span>{formatMs(scene.end_ms)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {sceneFrames.map((frame) => (
                        <button
                          key={frame.id}
                          type="button"
                          onClick={() => void handleFrameSelect(frame)}
                          className={clsx(
                            'group relative aspect-[4/3] overflow-hidden rounded border text-left transition-all',
                            selectedFrameId === frame.id
                              ? 'border-neutral-900 ring-1 ring-neutral-900'
                              : 'border-neutral-200 hover:border-neutral-400'
                          )}
                        >
                          {frameUrls[frame.id] ? (
                            <img
                              src={frameUrls[frame.id] ?? ''}
                              alt={`${frame.kind} frame`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-neutral-100 text-[9px] text-neutral-400">
                              ...
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1 py-0.5">
                            <span className="text-[8px] font-medium uppercase text-white">
                              {frame.kind}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!scenes.length && (
                <div className="rounded border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
                  <svg
                    className="mx-auto h-8 w-8 text-neutral-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                    />
                  </svg>
                  <p className="mt-2 text-xs text-neutral-600">No scenes detected</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
          {/* Frame Preview */}
          <div className="border-b border-neutral-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">Preview</h2>
              {selectedFrame && (
                <span className="text-[10px] text-neutral-400">
                  {selectedFrame.kind === 'custom' ? 'Custom' : `Scene ${scenes.findIndex((s) => s.id === selectedFrame.scene_id) + 1} · ${selectedFrame.kind}`}
                </span>
              )}
            </div>
            {selectedFrame && selectedFrameUrl ? (
              <div className="relative overflow-hidden rounded border border-neutral-200 bg-neutral-50">
                <img
                  src={selectedFrameUrl}
                  alt="Selected frame"
                  className="w-full"
                  onClick={handleImageClick}
                />
                {mode === 'crop' && cropOverlayStyle && (
                  <div
                    className="absolute border-2 border-neutral-900/50 bg-neutral-900/10"
                    style={cropOverlayStyle}
                  />
                )}
              </div>
            ) : (
              <div className="rounded border border-dashed border-neutral-200 bg-neutral-50 p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-neutral-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-3 text-xs text-neutral-500">Select a frame</p>
                <p className="mt-1 text-[10px] text-neutral-400">or paste an image (Cmd/Ctrl+V)</p>
              </div>
            )}
          </div>

          {/* Edit Controls */}
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
                onClick={() => setMode('global')}
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
                onClick={() => setMode('crop')}
              >
                Crop
              </button>
            </div>

            {mode === 'crop' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <label className="w-16 text-xs text-neutral-600">Size</label>
                  <input
                    type="range"
                    min={64}
                    max={Math.min(1024, selectedFrame?.width ?? 1024)}
                    step={16}
                    value={crop.size}
                    onChange={(event) =>
                      setCrop((prev) =>
                        clampCrop(
                          {
                            ...prev,
                            size: Number(event.target.value),
                          },
                          selectedFrame
                        )
                      )
                    }
                    className="flex-1"
                  />
                  <span className="w-12 text-right text-[10px] text-neutral-500">{crop.size}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="w-16 text-xs text-neutral-600">Feather</label>
                  <input
                    type="range"
                    min={0}
                    max={128}
                    step={1}
                    value={feather}
                    onChange={(event) => setFeather(Number(event.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-right text-[10px] text-neutral-500">{feather}px</span>
                </div>
                <p className="text-[10px] text-neutral-400">Click image to reposition crop area</p>
              </div>
            )}

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-700">Edit Prompt</label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">Paste images here</span>
                  <button
                    type="button"
                    className="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                    onClick={() => refImageInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    Attach
                  </button>
                </div>
              </div>
              <textarea
                className="w-full rounded border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                rows={3}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe your desired edit or paste reference images (Cmd/Ctrl+V)"
              />
              {refImages.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {refImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative h-14 w-14 overflow-hidden rounded border border-neutral-200 bg-neutral-50"
                    >
                      <img
                        src={img.previewUrl}
                        alt="Reference"
                        className="h-full w-full object-cover"
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
                        onClick={() => handleRemoveRefImage(img.id)}
                        className="absolute -right-1 -top-1 h-4 w-4 rounded-full border border-neutral-200 bg-white text-neutral-600 opacity-0 transition-opacity hover:bg-neutral-100 group-hover:opacity-100"
                        disabled={img.uploading}
                      >
                        <svg className="h-full w-full p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {submitError && <p className="mt-2 text-xs text-red-600">{submitError}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                onClick={() => setPrompt('')}
                disabled={isSubmitting}
              >
                Clear
              </button>
              <button
                type="button"
                className="rounded bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || !selectedFrameId}
              >
                {isSubmitting ? 'Generating…' : 'Generate Edit'}
              </button>
            </div>
          </div>

          {/* Versions */}
          <div className="bg-white p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">Versions</h2>
              <span className="text-[10px] text-neutral-400">{edits.length}</span>
            </div>
            {edits.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {edits.map((edit) => (
                  <div
                    key={edit.id}
                    className="space-y-1.5"
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded border border-neutral-200 bg-neutral-50">
                      {edit.url ? (
                        <img src={edit.url} alt={`Version ${edit.version}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[9px] text-neutral-400">
                          ...
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-neutral-900">v{edit.version}</p>
                    <p className="truncate text-[9px] text-neutral-500" title={edit.prompt}>
                      {edit.prompt}
                    </p>
                    <p className="text-[9px] text-neutral-400">
                      {new Date(edit.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center">
                <p className="text-xs text-neutral-500">No edits yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KeyframeEditorShell({ assets }: KeyframeEditorShellProps) {
  const { supabaseClient, isLoading } = useSupabase();

  // Show loading state while Supabase client initializes
  if (isLoading || !supabaseClient) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900 mx-auto" />
          <p className="mt-4 text-sm text-neutral-600">Loading keyframe editor...</p>
        </div>
      </div>
    );
  }

  return <KeyframeEditorContent assets={assets} supabase={supabaseClient} />;
}
