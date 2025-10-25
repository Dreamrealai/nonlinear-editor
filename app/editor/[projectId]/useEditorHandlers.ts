/**
 * useEditorHandlers hook
 * Contains all business logic and event handlers for the editor
 */
'use client';

import { useCallback, type ChangeEvent } from 'react';
import { v4 as uuid } from 'uuid';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient, ensureHttpsProtocol } from '@/lib/supabase';
import { useEditorStore } from '@/state/useEditorStore';
import { browserLogger } from '@/lib/browserLogger';
import { safeArrayMax } from '@/lib/utils/arrayUtils';
import type { Clip, Timeline as TimelineType } from '@/types/timeline';
import type { AssetRow } from '@/types/assets';
import { extractStorageLocation, audioBufferToWav, mapAssetRow } from './editorUtils';

type UseEditorHandlersProps = {
  projectId: string;
  timeline: TimelineType | null;
  assets: AssetRow[];
  setAssets: React.Dispatch<React.SetStateAction<AssetRow[]>>;
  setTimeline: (timeline: TimelineType) => void;
  addClip: (clip: Clip) => void;
  setUploadPending: (pending: boolean) => void;
  uploadInputRef: React.RefObject<HTMLInputElement | null>;
  pollingTimeoutsRef: React.MutableRefObject<Set<NodeJS.Timeout>>;
  abortControllersRef: React.MutableRefObject<Set<AbortController>>;
};

export function useEditorHandlers({
  projectId,
  timeline,
  assets,
  setAssets,
  setTimeline,
  addClip,
  setUploadPending,
  uploadInputRef,
  pollingTimeoutsRef,
  abortControllersRef,
}: UseEditorHandlersProps) {
  const supabase = createBrowserSupabaseClient();

  /**
   * Uploads a media file using the centralized API endpoint.
   */
  const uploadAsset = useCallback(
    async ({ file, assetType }: { file: File; assetType: AssetRow['type'] }) => {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('type', assetType);

      // Call the centralized upload API endpoint
      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();

      // Fetch the created asset from database to get complete record
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('*')
        .eq('id', result.assetId)
        .single();

      if (assetError || !assetData) {
        throw new Error('Failed to fetch uploaded asset');
      }

      return assetData as AssetRow;
    },
    [projectId, supabase]
  );

  const handleAssetUpload = useCallback(
    async (file: File) => {
      const type: AssetRow['type'] = file.type.startsWith('audio')
        ? 'audio'
        : file.type.startsWith('image')
          ? 'image'
          : 'video';
      try {
        const result = await uploadAsset({ file, assetType: type });
        setAssets((prev) => [result, ...prev]);
        toast.success('Asset uploaded');
      } catch (error) {
        browserLogger.error({ error, projectId, fileName: file.name }, 'Failed to upload asset');
        toast.error('Failed to upload asset');
      }
    },
    [projectId, uploadAsset, setAssets]
  );

  const handleFileSelect = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) {
        return;
      }
      setUploadPending(true);
      try {
        for (const file of files) {
          await handleAssetUpload(file);
        }
      } finally {
        setUploadPending(false);
        if (uploadInputRef.current) {
          uploadInputRef.current.value = '';
        }
      }
    },
    [handleAssetUpload, setUploadPending, uploadInputRef]
  );

  const handleAssetDelete = useCallback(
    async (asset: AssetRow) => {
      if (!confirm(`Delete "${asset.metadata?.filename ?? asset.id}"?`)) {
        return;
      }

      try {
        const { error } = await supabase
          .from('assets')
          .delete()
          .eq('id', asset.id)
          .eq('project_id', projectId);

        if (error) {
          browserLogger.error({ error, assetId: asset.id }, 'Failed to delete asset');
          toast.error('Failed to delete asset');
          return;
        }

        // Remove asset from local state
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));

        // Remove clips using this asset from timeline
        if (timeline) {
          const updatedClips = timeline.clips.filter((clip) => clip.assetId !== asset.id);
          if (updatedClips.length !== timeline.clips.length) {
            setTimeline({ ...timeline, clips: updatedClips });
            toast.success('Asset deleted from library and timeline');
          } else {
            toast.success('Asset deleted');
          }
        } else {
          toast.success('Asset deleted');
        }
      } catch (error) {
        browserLogger.error({ error, assetId: asset.id }, 'Error deleting asset');
        toast.error('Failed to delete asset');
      }
    },
    [projectId, timeline, setTimeline, supabase, setAssets]
  );

  const handleClipAdd = useCallback(
    async (asset: AssetRow) => {
      if (!timeline) {
        toast.error('Timeline not ready');
        return;
      }

      const assetDuration =
        typeof asset.duration_seconds === 'number' && Number.isFinite(asset.duration_seconds)
          ? asset.duration_seconds
          : typeof asset.metadata?.durationSeconds === 'number' &&
              Number.isFinite(asset.metadata.durationSeconds)
            ? asset.metadata.durationSeconds
            : null;
      const clip: Clip = {
        id: uuid(),
        assetId: asset.id,
        filePath: asset.storage_url,
        mime: asset.metadata?.mimeType ?? 'video/mp4',
        start: 0,
        end: assetDuration ?? 5,
        sourceDuration: assetDuration,
        timelinePosition:
          timeline.clips.length > 0
            ? safeArrayMax(
                timeline.clips.map((c) => c.timelinePosition + (c.end - c.start)),
                0
              )
            : 0,
        trackIndex: 0,
        crop: null,
        transitionToNext: { type: 'none', duration: 0.5 },
        previewUrl: asset.metadata?.sourceUrl ?? null,
        thumbnailUrl: asset.metadata?.thumbnail ?? null,
        hasAudio: asset.type !== 'image',
      };

      addClip(clip);
      // Note: addClip already updates the timeline in the Zustand store
      // No need to call setTimeline here as it would create a race condition
      toast.success(
        `Clip ${asset.metadata?.filename || asset.storage_url.split('/').pop()} added to track ${clip.trackIndex + 1}`
      );
    },
    [timeline, addClip, setTimeline]
  );

  const handleDetectScenes = useCallback(async () => {
    const latestVideo = assets.find((asset) => asset.type === 'video');
    if (!latestVideo) {
      toast.error('Upload a video before detecting scenes');
      return;
    }

    toast.loading('Detecting scenes...', { id: 'detect-scenes' });

    try {
      const res = await fetch('/api/video/split-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, assetId: latestVideo.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        const errorMsg = json.details
          ? `${json.error || 'Scene detection failed'}: ${json.details}`
          : json.error || 'Scene detection failed';
        throw new Error(errorMsg);
      }

      browserLogger.info(
        { projectId, assetId: latestVideo.id, sceneCount: json.scenes?.length },
        'Scenes detected successfully'
      );
      toast.success(`Detected ${json.scenes?.length ?? 0} scenes`, { id: 'detect-scenes' });

      // Optionally: add scenes as clips to timeline
      if (json.scenes && Array.isArray(json.scenes) && timeline) {
        // O(n) instead of O(n²) - compute cumulative durations once
        let cumulativeDuration = 0;
        const newClips: Clip[] = json.scenes.map(
          (scene: { startTime: number; endTime: number }) => {
            const timelinePosition = cumulativeDuration;
            cumulativeDuration += scene.endTime - scene.startTime;

            return {
              id: uuid(),
              assetId: latestVideo.id,
              filePath: latestVideo.storage_url,
              mime: latestVideo.metadata?.mimeType ?? 'video/mp4',
              start: scene.startTime,
              end: scene.endTime,
              sourceDuration: latestVideo.duration_seconds,
              timelinePosition,
              trackIndex: 0,
              crop: null,
              transitionToNext: { type: 'none', duration: 0.5 },
              previewUrl: latestVideo.metadata?.sourceUrl ?? null,
              thumbnailUrl: latestVideo.metadata?.thumbnail ?? null,
              hasAudio: latestVideo.type !== 'image',
            };
          }
        );

        setTimeline({
          ...timeline,
          clips: newClips,
        });
        toast.success('Scenes added to timeline');
      }
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Scene detection failed');
      toast.error(error instanceof Error ? error.message : 'Scene detection failed', {
        id: 'detect-scenes',
      });
    }
  }, [assets, projectId, timeline, setTimeline]);

  const handleAddText = useCallback(() => {
    const addTextOverlay = useEditorStore.getState().addTextOverlay;
    const currentTime = useEditorStore.getState().currentTime;
    addTextOverlay({
      id: `text-${Date.now()}`,
      text: 'New Text',
      timelinePosition: currentTime,
      duration: 5,
      x: 50,
      y: 50,
      fontSize: 32,
      color: '#ffffff',
      backgroundColor: 'transparent',
      fontFamily: 'sans-serif',
      align: 'center',
      opacity: 1,
    });
    toast.success('Text overlay added at playhead');
  }, []);

  const handleAddTransition = useCallback(() => {
    const addTransitionToSelectedClips = useEditorStore.getState().addTransitionToSelectedClips;
    const selectedClipIds = useEditorStore.getState().selectedClipIds;
    if (selectedClipIds.size === 0) {
      toast.error('Select clips to add transition');
      return;
    }
    addTransitionToSelectedClips('crossfade', 0.5);
    toast.success('Transition added to selected clips');
  }, []);

  const handleGenerateSuno = useCallback(
    async (formData: {
      prompt: string;
      style?: string;
      title?: string;
      customMode?: boolean;
      instrumental?: boolean;
    }) => {
      toast.loading('Generating audio with Suno V5...', { id: 'generate-suno' });

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const res = await fetch('/api/audio/suno/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            projectId,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Audio generation failed');
        }

        const taskId = json.taskId;
        toast.success('Audio generation started', { id: 'generate-suno' });

        // Poll for completion
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max
        const pollInterval = 5000; // 5 seconds

        const poll = async (): Promise<void> => {
          attempts++;
          if (attempts > maxAttempts) {
            throw new Error('Audio generation timed out');
          }

          const statusRes = await fetch(
            `/api/audio/suno/status?taskId=${taskId}&projectId=${projectId}`
          );
          const statusJson = await statusRes.json();

          if (!statusRes.ok) {
            throw new Error(statusJson.error || 'Status check failed');
          }

          const task = statusJson.tasks?.[0];
          if (!task) {
            throw new Error('Task not found');
          }

          if (task.status === 'complete' && task.audioUrl) {
            toast.success('Audio generated successfully!', { id: 'generate-suno' });

            // Upload to Supabase and create asset
            const audioRes = await fetch(task.audioUrl);
            const audioBlob = await audioRes.blob();
            const fileName = `suno_${Date.now()}.mp3`;
            const filePath = `${user.id}/${projectId}/audio/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('assets')
              .upload(filePath, audioBlob, { contentType: 'audio/mpeg' });

            if (uploadError) throw uploadError;

            const storageUrl = `supabase://assets/${filePath}`;
            const { data: newAsset, error: assetError } = await supabase
              .from('assets')
              .insert({
                project_id: projectId,
                user_id: user.id,
                storage_url: storageUrl,
                type: 'audio',
                source: 'genai',
                mime_type: 'audio/mpeg',
                duration_seconds: task.duration ?? null,
                metadata: {
                  filename: fileName,
                  provider: 'suno',
                  prompt: task.prompt,
                  title: task.title,
                  tags: task.tags,
                },
              })
              .select()
              .single();

            if (assetError) throw assetError;

            const mappedAsset = mapAssetRow(newAsset as Record<string, unknown>);
            if (mappedAsset) {
              setAssets((prev) => [mappedAsset, ...prev]);
            }

            return;
          } else if (task.status === 'failed') {
            throw new Error('Audio generation failed');
          } else {
            // Still processing, poll again - track timeout for cleanup
            const timeout = setTimeout(poll, pollInterval);
            pollingTimeoutsRef.current.add(timeout);
          }
        };

        // Start polling - track timeout for cleanup
        const initialTimeout = setTimeout(poll, pollInterval);
        pollingTimeoutsRef.current.add(initialTimeout);
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Suno audio generation failed');
        toast.error(error instanceof Error ? error.message : 'Audio generation failed', {
          id: 'generate-suno',
        });
      }
    },
    [supabase, projectId, setAssets, pollingTimeoutsRef]
  );

  const handleGenerateElevenLabs = useCallback(
    async (formData: { text: string; voiceId?: string; modelId?: string }) => {
      toast.loading('Generating audio with ElevenLabs...', { id: 'generate-elevenlabs' });

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const res = await fetch('/api/audio/elevenlabs/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            projectId,
            userId: user.id,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Audio generation failed');
        }

        toast.success('Audio generated successfully!', { id: 'generate-elevenlabs' });

        const mappedAsset = mapAssetRow(json.asset as Record<string, unknown>);
        if (mappedAsset) {
          setAssets((prev) => [mappedAsset, ...prev]);
        }
      } catch (error) {
        browserLogger.error({ error, projectId }, 'ElevenLabs audio generation failed');
        toast.error(error instanceof Error ? error.message : 'Audio generation failed', {
          id: 'generate-elevenlabs',
        });
      }
    },
    [supabase, projectId, setAssets]
  );

  const handleGenerateVideo = useCallback(
    async (formData: {
      prompt: string;
      aspectRatio?: '9:16' | '16:9' | '1:1';
      duration?: number;
    }) => {
      toast.loading('Generating video with Veo 3.1...', { id: 'generate-video' });

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
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

        const operationName = json.operationName;
        toast.loading('Video generation in progress... This may take several minutes.', {
          id: 'generate-video',
        });

        // Poll for video generation status with cleanup tracking
        const pollInterval = 10000; // 10 seconds
        const poll = async () => {
          try {
            // Create AbortController and track it
            const controller = new AbortController();
            abortControllersRef.current.add(controller);

            const statusRes = await fetch(
              `/api/video/status?operationName=${encodeURIComponent(operationName)}&projectId=${projectId}`,
              { signal: controller.signal }
            );
            const statusJson = await statusRes.json();

            // Remove controller after successful fetch
            abortControllersRef.current.delete(controller);

            if (statusJson.done) {
              if (statusJson.error) {
                throw new Error(statusJson.error);
              }

              toast.success('Video generated successfully!', { id: 'generate-video' });

              const mappedAsset = mapAssetRow(statusJson.asset as Record<string, unknown>);
              if (mappedAsset) {
                setAssets((prev) => [mappedAsset, ...prev]);
              }

              return;
            } else {
              // Continue polling with tracked timeout
              const timeout = setTimeout(poll, pollInterval);
              pollingTimeoutsRef.current.add(timeout);
            }
          } catch (pollError) {
            // Ignore abort errors
            if (pollError instanceof Error && pollError.name === 'AbortError') {
              return;
            }

            browserLogger.error({ error: pollError, projectId }, 'Video generation polling failed');
            toast.error(
              pollError instanceof Error ? pollError.message : 'Video generation failed',
              { id: 'generate-video' }
            );
          }
        };

        const initialTimeout = setTimeout(poll, pollInterval);
        pollingTimeoutsRef.current.add(initialTimeout);

        return operationName;
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Video generation failed');
        toast.error(error instanceof Error ? error.message : 'Video generation failed', {
          id: 'generate-video',
        });
        return null;
      }
    },
    [supabase, projectId, setAssets, pollingTimeoutsRef, abortControllersRef]
  );

  const handleSplitAudio = useCallback(
    async (asset: AssetRow) => {
      toast.loading('Extracting audio from video...', { id: 'split-audio' });

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get signed URL for the video
        const { data: signData } = await supabase
          .from('assets')
          .select('storage_url, metadata')
          .eq('id', asset.id)
          .single();

        if (!signData) throw new Error('Asset not found');

        // Resolve a fetchable URL for the video asset
        let videoUrl: string | undefined = asset.metadata?.sourceUrl;
        if (!videoUrl) {
          const location =
            typeof signData.storage_url === 'string'
              ? extractStorageLocation(signData.storage_url)
              : null;
          if (!location) {
            throw new Error('Invalid storage location for asset');
          }
          const { data: signed, error: signError } = await supabase.storage
            .from(location.bucket)
            .createSignedUrl(location.path, 600);

          if (signError || !signed?.signedUrl) {
            throw new Error('Failed to create signed URL for asset');
          }

          videoUrl = signed.signedUrl;
        }

        // Type guard: After this point, videoUrl is guaranteed to be a string
        if (!videoUrl) {
          throw new Error('Failed to resolve video URL');
        }

        // Fetch the video - videoUrl is now guaranteed to be string
        const videoResponse = await fetch(videoUrl);
        const videoBlob = await videoResponse.blob();

        // Create audio context
        const audioContext = new (window.AudioContext || (window as never)['webkitAudioContext'])();
        const arrayBuffer = await videoBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Convert to WAV
        const wav = audioBufferToWav(audioBuffer);
        const audioBlob = new Blob([wav], { type: 'audio/wav' });

        // Upload to Supabase
        const fileName = `${uuid()}.wav`;
        const storagePath = `${user.id}/${projectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(storagePath, audioBlob, {
            contentType: 'audio/wav',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const {
          data: { publicUrl: rawPublicUrl },
        } = supabase.storage.from('assets').getPublicUrl(storagePath);
        const publicUrl = ensureHttpsProtocol(rawPublicUrl);

        // Create asset record
        const { data: newAsset, error: assetError } = await supabase
          .from('assets')
          .insert({
            user_id: user.id,
            project_id: projectId,
            type: 'audio',
            source: 'upload',
            storage_url: `supabase://assets/${storagePath}`,
            metadata: {
              filename: fileName,
              mimeType: 'audio/wav',
              sourceUrl: publicUrl,
              extractedFrom: asset.id,
            },
          })
          .select()
          .single();

        if (assetError) {
          throw new Error(`Asset creation failed: ${assetError.message}`);
        }

        toast.success('Audio extracted successfully!', { id: 'split-audio' });

        const mappedAsset = mapAssetRow(newAsset as Record<string, unknown>);
        if (mappedAsset) {
          setAssets((prev) => [mappedAsset, ...prev]);
        }
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Audio extraction failed');
        toast.error(error instanceof Error ? error.message : 'Failed to extract audio', {
          id: 'split-audio',
        });
      }
    },
    [supabase, projectId, setAssets]
  );

  const handleSplitScenes = useCallback(
    async (asset: AssetRow) => {
      toast.loading('Splitting video into scenes...', { id: 'split-scenes' });

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const res = await fetch('/api/video/split-scenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assetId: asset.id,
            projectId,
            threshold: 0.5,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          const errorMsg = json.details
            ? `${json.error || 'Scene splitting failed'}: ${json.details}`
            : json.error || 'Scene splitting failed';
          throw new Error(errorMsg);
        }

        toast.success(json.message || 'Scene splitting initiated', { id: 'split-scenes' });
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Scene splitting failed');
        toast.error(error instanceof Error ? error.message : 'Failed to split scenes', {
          id: 'split-scenes',
        });
      }
    },
    [supabase, projectId]
  );

  const handleUpscaleVideo = useCallback(
    async (asset: AssetRow) => {
      toast.loading('Upscaling video with Topaz AI...', { id: 'upscale-video' });

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Submit upscale request
        const res = await fetch('/api/video/upscale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assetId: asset.id,
            projectId,
            upscaleFactor: 2,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Video upscale failed');
        }

        const requestId = json.requestId;
        toast.loading('Video upscaling in progress... This may take several minutes.', {
          id: 'upscale-video',
        });

        // Poll for completion
        const pollInterval = 10000; // 10 seconds
        const poll = async () => {
          try {
            const statusRes = await fetch(
              `/api/video/upscale-status?requestId=${encodeURIComponent(requestId)}&projectId=${projectId}`
            );
            const statusJson = await statusRes.json();

            if (statusJson.done) {
              if (statusJson.error) {
                throw new Error(statusJson.error);
              }

              toast.success('Video upscaled successfully!', { id: 'upscale-video' });

              const mappedAsset = mapAssetRow(statusJson.asset as Record<string, unknown>);
              if (mappedAsset) {
                setAssets((prev) => [mappedAsset, ...prev]);
              }

              return;
            } else {
              // Continue polling - track timeout for cleanup
              const timeout = setTimeout(poll, pollInterval);
              pollingTimeoutsRef.current.add(timeout);
            }
          } catch (pollError) {
            browserLogger.error({ error: pollError, projectId }, 'Video upscale polling failed');
            toast.error(pollError instanceof Error ? pollError.message : 'Video upscale failed', {
              id: 'upscale-video',
            });
          }
        };

        // Start polling - track timeout for cleanup
        const initialTimeout = setTimeout(poll, pollInterval);
        pollingTimeoutsRef.current.add(initialTimeout);
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Video upscale failed');
        toast.error(error instanceof Error ? error.message : 'Video upscale failed', {
          id: 'upscale-video',
        });
      }
    },
    [supabase, projectId, setAssets, pollingTimeoutsRef]
  );

  const handleGenerateAudioFromClip = useCallback(
    async (clipId: string) => {
      if (!timeline) return;
      const clip = timeline.clips.find((c) => c.id === clipId);
      if (!clip) return;

      // O(1) lookup using Map instead of O(n) find
      const assetMap = new Map(assets.map((a) => [a.id, a]));
      const asset = assetMap.get(clip.assetId);
      if (!asset) {
        toast.error('Asset not found for clip');
        return;
      }

      toast.loading('Generating audio with MiniMax...', { id: 'generate-audio' });

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const res = await fetch('/api/video/generate-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assetId: asset.id,
            projectId,
            model: 'minimax',
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Audio generation failed');
        }

        const requestId = json.requestId;
        toast.loading('Audio generation in progress... This may take a few minutes.', {
          id: 'generate-audio',
        });

        // Poll for completion
        const pollInterval = 5000; // 5 seconds
        const poll = async () => {
          try {
            const statusRes = await fetch(
              `/api/video/generate-audio-status?requestId=${encodeURIComponent(requestId)}&projectId=${projectId}&assetId=${asset.id}`
            );
            const statusJson = await statusRes.json();

            if (statusJson.status === 'completed') {
              toast.success('Audio generated successfully!', { id: 'generate-audio' });

              const mappedAsset = mapAssetRow(statusJson.asset as Record<string, unknown>);
              if (mappedAsset) {
                setAssets((prev) => [mappedAsset, ...prev]);
              }
            } else if (statusJson.status === 'failed') {
              throw new Error(statusJson.error || 'Audio generation failed');
            } else {
              // Continue polling - track timeout for cleanup
              const timeout = setTimeout(poll, pollInterval);
              pollingTimeoutsRef.current.add(timeout);
            }
          } catch (pollError) {
            browserLogger.error({ error: pollError, projectId }, 'Audio generation polling failed');
            toast.error(
              pollError instanceof Error ? pollError.message : 'Audio generation failed',
              { id: 'generate-audio' }
            );
          }
        };

        // Start polling - track timeout for cleanup
        const initialTimeout = setTimeout(poll, pollInterval);
        pollingTimeoutsRef.current.add(initialTimeout);
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Audio generation failed');
        toast.error(error instanceof Error ? error.message : 'Audio generation failed', {
          id: 'generate-audio',
        });
      }
    },
    [timeline, assets, supabase, projectId, setAssets, pollingTimeoutsRef]
  );

  const handleSplitAudioFromClip = useCallback(
    async (clipId: string) => {
      if (!timeline) return;
      const clip = timeline.clips.find((c) => c.id === clipId);
      if (!clip) return;

      // O(1) lookup using Map instead of O(n) find
      const assetMap = new Map(assets.map((a) => [a.id, a]));
      const asset = assetMap.get(clip.assetId);
      if (!asset) {
        toast.error('Asset not found for clip');
        return;
      }

      if (asset.type !== 'video') {
        toast.error('Split audio only works with video clips');
        return;
      }

      await handleSplitAudio(asset);
    },
    [timeline, assets, handleSplitAudio]
  );

  const handleSplitScenesFromClip = useCallback(
    async (clipId: string) => {
      if (!timeline) return;
      const clip = timeline.clips.find((c) => c.id === clipId);
      if (!clip) return;

      // O(1) lookup using Map instead of O(n) find
      const assetMap = new Map(assets.map((a) => [a.id, a]));
      const asset = assetMap.get(clip.assetId);
      if (!asset) {
        toast.error('Asset not found for clip');
        return;
      }

      if (asset.type !== 'video') {
        toast.error('Split scenes only works with video clips');
        return;
      }

      await handleSplitScenes(asset);
    },
    [timeline, assets, handleSplitScenes]
  );

  const handleUpscaleVideoFromTimeline = useCallback(async () => {
    if (!timeline) return;

    // Get the first selected clip or error if no selection
    const selectedClipId = Array.from(timeline.clips).find((c) =>
      useEditorStore.getState().selectedClipIds.has(c.id)
    )?.id;

    if (!selectedClipId) {
      toast.error('Please select a video clip to upscale');
      return;
    }

    const clip = timeline.clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    // O(1) lookup using Map instead of O(n) find
    const assetMap = new Map(assets.map((a) => [a.id, a]));
    const asset = assetMap.get(clip.assetId);
    if (!asset) {
      toast.error('Asset not found for clip');
      return;
    }

    if (asset.type !== 'video') {
      toast.error('Upscale only works with video clips');
      return;
    }

    await handleUpscaleVideo(asset);
  }, [timeline, assets, handleUpscaleVideo]);

  return {
    handleFileSelect,
    handleAssetDelete,
    handleClipAdd,
    handleDetectScenes,
    handleAddText,
    handleAddTransition,
    handleGenerateSuno,
    handleGenerateElevenLabs,
    handleGenerateVideo,
    handleSplitAudio,
    handleSplitScenes,
    handleUpscaleVideo,
    handleGenerateAudioFromClip,
    handleSplitAudioFromClip,
    handleSplitScenesFromClip,
    handleUpscaleVideoFromTimeline,
  };
}
