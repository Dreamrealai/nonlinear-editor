/**
 * BrowserEditorClient Component
 *
 * Main client-side video editor interface that has been refactored into smaller components.
 * This file now acts as an orchestrator, delegating to specialized components.
 *
 * Keyboard Shortcuts Integration:
 * - Uses useGlobalKeyboardShortcuts for centralized shortcut management
 * - Supports comprehensive editing shortcuts (undo, redo, copy, paste, delete, etc.)
 * - Includes playback shortcuts (space for play/pause)
 * - Features help modal (Cmd/Ctrl + ?) to display all available shortcuts
 */
'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  LazyHorizontalTimeline,
  LazyPreviewPlayer,
  LazyExportModal,
  LazyClipPropertiesPanel,
} from '@/components/LazyComponents';
import { EditorHeader } from '@/components/EditorHeader';
import { TimelineCorrectionsMenu } from '@/components/editor/TimelineCorrectionsMenu';
import { useAutosave } from '@/lib/hooks/useAutosave';
import {
  useGlobalKeyboardShortcuts,
  type KeyboardShortcut,
} from '@/lib/hooks/useGlobalKeyboardShortcuts';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { saveTimeline, loadTimeline } from '@/lib/saveLoad';
import { useEditorStore } from '@/state/useEditorStore';
import { browserLogger } from '@/lib/browserLogger';
import { safeArrayGet } from '@/lib/utils/arrayUtils';

// Extracted components and utilities
import { AssetPanel } from '@/components/editor/AssetPanel';
import { AudioGenerationModal } from './AudioGenerationModal';
import { VideoGenerationModal } from './VideoGenerationModal';
import { useEditorHandlers } from './useEditorHandlers';
import type { AssetRow } from '@/types/assets';
import {
  enrichTimelineWithSourceDurations,
  createEmptyTimeline,
  parseAssetMetadata,
  isAssetType,
  createImageThumbnail,
  createVideoThumbnail,
} from './editorUtils';

/**
 * Maps a database row to an AssetRow object
 */
const mapAssetRow = (row: Record<string, unknown>): AssetRow | null => {
  const id = typeof row.id === 'string' ? row.id : null;
  const storageUrl = typeof row.storage_url === 'string' ? row.storage_url : null;
  const duration =
    typeof row.duration_seconds === 'number' && Number.isFinite(row.duration_seconds)
      ? row.duration_seconds
      : null;
  const createdAt = typeof row.created_at === 'string' ? row.created_at : null;
  const type = isAssetType(row.type) ? row.type : null;

  if (!id || !storageUrl || !type) {
    return null;
  }

  const parsedMetadata = parseAssetMetadata(
    (row.metadata ?? null) as Record<string, unknown> | null
  );
  const rawMetadata = (row.rawMetadata ?? null) as Record<string, unknown> | null;
  const metadataDuration = parsedMetadata?.durationSeconds ?? null;
  return {
    id,
    storage_url: storageUrl,
    duration_seconds: duration ?? metadataDuration,
    metadata: parsedMetadata,
    rawMetadata,
    created_at: createdAt,
    type,
  };
};

type BrowserEditorClientProps = {
  projectId: string;
};

export function BrowserEditorClient({ projectId }: BrowserEditorClientProps): React.JSX.Element {
  const supabase = createBrowserSupabaseClient();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [timelineBootstrapped, setTimelineBootstrapped] = useState(false);
  const processedThumbnailIdsRef = useRef<Set<string>>(new Set());
  const [uploadPending, setUploadPending] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [sceneDetectPending, setSceneDetectPending] = useState(false);

  // Audio generation state
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'image'>('video');
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [audioGenMode, setAudioGenMode] = useState<'suno' | 'elevenlabs' | null>(null);
  const [audioGenPending, setAudioGenPending] = useState(false);

  // Video generation state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoGenPending, setVideoGenPending] = useState(false);
  const [videoOperationName, setVideoOperationName] = useState<string | null>(null);

  // Video processing state
  const [splitAudioPending, setSplitAudioPending] = useState(false);
  const [splitScenesPending, setSplitScenesPending] = useState(false);
  const [upscaleVideoPending, setUpscaleVideoPending] = useState(false);

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);

  // Keyboard shortcuts help modal state
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Centralized polling cleanup tracking
  const pollingTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const abortControllersRef = useRef<Set<AbortController>>(new Set());

  // Cleanup all polling on unmount
  useEffect(() => {
    const pollingTimeouts = pollingTimeoutsRef.current;
    const abortControllers = abortControllersRef.current;

    return () => {
      pollingTimeouts.forEach((timeout) => clearTimeout(timeout));
      pollingTimeouts.clear();
      abortControllers.forEach((controller) => controller.abort());
      abortControllers.clear();
    };
  }, []);

  // Zustand store selectors
  const timeline = useEditorStore((state) => state.timeline);
  const setTimeline = useEditorStore((state) => state.setTimeline);
  const addClip = useEditorStore((state) => state.addClip);
  const selectedClipIds = useEditorStore((state) => state.selectedClipIds);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);
  const removeClip = useEditorStore((state) => state.removeClip);
  const copyClips = useEditorStore((state) => state.copyClips);
  const pasteClips = useEditorStore((state) => state.pasteClips);
  const selectClip = useEditorStore((state) => state.selectClip);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  // Play/pause state ref for keyboard shortcuts
  const playPauseStateRef = useRef<{ isPlaying: boolean; togglePlayPause: () => void } | null>(
    null
  );

  // Keyboard shortcut handlers
  const handleUndo = useCallback(() => {
    if (canUndo()) {
      undo();
      toast.success('Undo', { duration: 1000 });
    }
  }, [undo, canUndo]);

  const handleRedo = useCallback(() => {
    if (canRedo()) {
      redo();
      toast.success('Redo', { duration: 1000 });
    }
  }, [redo, canRedo]);

  const handleCopy = useCallback(() => {
    if (selectedClipIds.size > 0) {
      copyClips();
      toast.success(
        `Copied ${selectedClipIds.size} clip${selectedClipIds.size > 1 ? 's' : ''}`,
        { duration: 1500 }
      );
    }
  }, [copyClips, selectedClipIds]);

  const handlePaste = useCallback(() => {
    pasteClips();
  }, [pasteClips]);

  const handleDelete = useCallback(() => {
    if (selectedClipIds.size > 0) {
      const count = selectedClipIds.size;
      selectedClipIds.forEach((clipId) => removeClip(clipId));
      toast.success(`Deleted ${count} clip${count > 1 ? 's' : ''}`, { duration: 1500 });
    }
  }, [selectedClipIds, removeClip]);

  const handleSelectAll = useCallback(() => {
    if (timeline?.clips && timeline.clips.length > 0) {
      clearSelection();
      timeline.clips.forEach((clip) => selectClip(clip.id, true));
      toast.success(
        `Selected ${timeline.clips.length} clip${timeline.clips.length > 1 ? 's' : ''}`,
        { duration: 1500 }
      );
    }
  }, [timeline, clearSelection, selectClip]);

  const handlePlayPause = useCallback(() => {
    if (playPauseStateRef.current?.togglePlayPause) {
      playPauseStateRef.current.togglePlayPause();
    }
  }, []);

  const handleExportClick = useCallback((): void => {
    if (!timeline || timeline.clips.length === 0) {
      toast.error('Add clips to timeline before exporting');
      return;
    }
    setShowExportModal(true);
  }, [timeline]);

  const handleShowShortcuts = useCallback(() => {
    setShowShortcutsHelp(true);
  }, []);

  // Define all keyboard shortcuts with categories
  const editorShortcuts = useMemo<KeyboardShortcut[]>(
    () => [
      // General shortcuts
      {
        id: 'show-shortcuts',
        keys: ['meta', '?'],
        description: 'Show keyboard shortcuts',
        category: 'general',
        action: handleShowShortcuts,
        priority: 100,
      },
      {
        id: 'show-shortcuts-alt',
        keys: ['meta', '/'],
        description: 'Show keyboard shortcuts',
        category: 'general',
        action: handleShowShortcuts,
        priority: 100,
      },
      {
        id: 'export',
        keys: ['meta', 'e'],
        description: 'Export video',
        category: 'general',
        action: handleExportClick,
      },

      // Playback shortcuts
      {
        id: 'play-pause',
        keys: ['space'],
        description: 'Play/Pause',
        category: 'playback',
        action: handlePlayPause,
      },

      // Editing shortcuts
      {
        id: 'undo',
        keys: ['meta', 'z'],
        description: 'Undo',
        category: 'editing',
        action: handleUndo,
      },
      {
        id: 'redo',
        keys: ['meta', 'shift', 'z'],
        description: 'Redo',
        category: 'editing',
        action: handleRedo,
      },
      {
        id: 'copy',
        keys: ['meta', 'c'],
        description: 'Copy selected clips',
        category: 'editing',
        action: handleCopy,
      },
      {
        id: 'paste',
        keys: ['meta', 'v'],
        description: 'Paste clips',
        category: 'editing',
        action: handlePaste,
      },
      {
        id: 'delete',
        keys: ['delete'],
        description: 'Delete selected clips',
        category: 'editing',
        action: handleDelete,
      },
      {
        id: 'delete-backspace',
        keys: ['backspace'],
        description: 'Delete selected clips',
        category: 'editing',
        action: handleDelete,
      },
      {
        id: 'select-all',
        keys: ['meta', 'a'],
        description: 'Select all clips',
        category: 'editing',
        action: handleSelectAll,
      },
    ],
    [
      handleUndo,
      handleRedo,
      handleCopy,
      handlePaste,
      handleDelete,
      handleSelectAll,
      handlePlayPause,
      handleExportClick,
      handleShowShortcuts,
    ]
  );

  // Register global keyboard shortcuts
  useGlobalKeyboardShortcuts({
    shortcuts: editorShortcuts,
    enabled: !showShortcutsHelp, // Disable shortcuts when help modal is open
    disableInInputs: true,
  });

  // Use the extracted handlers hook
  const handlers = useEditorHandlers({
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
  });

  // Wrap handlers with pending state management
  const handleDetectScenes = useCallback(async (): Promise<void> => {
    setSceneDetectPending(true);
    try {
      await handlers.handleDetectScenes();
    } finally {
      setSceneDetectPending(false);
    }
  }, [handlers]);

  const handleSplitAudioFromClip = useCallback(
    async (clipId: string): Promise<void> => {
      setSplitAudioPending(true);
      try {
        await handlers.handleSplitAudioFromClip(clipId);
      } finally {
        setSplitAudioPending(false);
      }
    },
    [handlers]
  );

  const handleSplitScenesFromClip = useCallback(
    async (clipId: string): Promise<void> => {
      setSplitScenesPending(true);
      try {
        await handlers.handleSplitScenesFromClip(clipId);
      } finally {
        setSplitScenesPending(false);
      }
    },
    [handlers]
  );

  const handleUpscaleVideoFromTimeline = useCallback(async (): Promise<void> => {
    setUpscaleVideoPending(true);
    try {
      await handlers.handleUpscaleVideoFromTimeline();
    } finally {
      setUpscaleVideoPending(false);
    }
  }, [handlers]);

  const handleGenerateSuno = useCallback(
    async (formData: {
      prompt: string;
      style?: string;
      title?: string;
      customMode?: boolean;
      instrumental?: boolean;
    }): Promise<void> => {
      setAudioGenPending(true);
      try {
        await handlers.handleGenerateSuno(formData);
        setShowAudioModal(false);
        setActiveTab('audio');
      } finally {
        setAudioGenPending(false);
      }
    },
    [handlers]
  );

  const handleGenerateElevenLabs = useCallback(
    async (formData: { text: string; voiceId?: string; modelId?: string }): Promise<void> => {
      setAudioGenPending(true);
      try {
        await handlers.handleGenerateElevenLabs(formData);
        setShowAudioModal(false);
        setActiveTab('audio');
      } finally {
        setAudioGenPending(false);
      }
    },
    [handlers]
  );

  const handleGenerateVideo = useCallback(
    async (formData: {
      prompt: string;
      aspectRatio?: '9:16' | '16:9' | '1:1';
      duration?: number;
    }): Promise<void> => {
      setVideoGenPending(true);
      try {
        const operationName = await handlers.handleGenerateVideo(formData);
        if (operationName) {
          setVideoOperationName(operationName);
        }
        setShowVideoModal(false);
        setActiveTab('video');
      } finally {
        setVideoGenPending(false);
      }
    },
    [handlers]
  );

  // Load timeline from database
  useEffect(() => {
    if (timelineBootstrapped || !assetsLoaded) {
      return;
    }

    let cancelled = false;

    const loadTimelineData = async (): Promise<void> => {
      try {
        const timelineData = await loadTimeline(projectId);

        if (cancelled) return;

        if (timelineData) {
          const enriched = enrichTimelineWithSourceDurations(timelineData, assets);
          setTimeline(enriched);
        } else {
          const emptyTimeline = createEmptyTimeline(projectId);
          setTimeline(emptyTimeline);
          await saveTimeline(projectId, emptyTimeline);
        }

        setTimelineBootstrapped(true);
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Failed to load timeline');
        const emptyTimeline = createEmptyTimeline(projectId);
        setTimeline(emptyTimeline);
        setTimelineBootstrapped(true);
      }
    };

    void loadTimelineData();

    return () => {
      cancelled = true;
    };
  }, [projectId, assets, assetsLoaded, timelineBootstrapped, setTimeline]);

  // Load assets from database
  useEffect(() => {
    let cancelled = false;

    const loadAssets = async (): Promise<void> => {
      setLoadingAssets(true);
      setAssetError(null);
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (cancelled) return;

        const mapped = (data ?? [])
          .map((row) => mapAssetRow(row as Record<string, unknown>))
          .filter((asset): asset is AssetRow => Boolean(asset));

        setAssets(mapped);
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Failed to load assets');
        if (cancelled) return;
        setAssetError('Failed to load assets. Please try again later.');
      } finally {
        if (!cancelled) {
          setLoadingAssets(false);
          setAssetsLoaded(true);
        }
      }
    };

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, [projectId, supabase]);

  // Generate thumbnails for assets that don't have them
  useEffect(() => {
    if (!assetsLoaded || !timeline) {
      return;
    }

    const missingThumbnails = assets.filter((asset) => {
      if (processedThumbnailIdsRef.current.has(asset.id)) {
        return false;
      }
      processedThumbnailIdsRef.current.add(asset.id);
      return !asset.metadata?.thumbnail && asset.type !== 'audio';
    });

    if (!missingThumbnails.length) {
      return;
    }

    void (async () => {
      for (const asset of missingThumbnails) {
        try {
          const bucketName = safeArrayGet(
            asset.storage_url.replace('supabase://', '').split('/'),
            0
          );
          if (!bucketName) continue;

          const signedUrlResponse = await supabase.storage.from(bucketName).createSignedUrl(
            asset.storage_url
              .replace(/^supabase:\/\//, '')
              .split('/')
              .slice(1)
              .join('/'),
            600
          );

          if (!signedUrlResponse.data?.signedUrl) {
            continue;
          }

          const response = await fetch(signedUrlResponse.data.signedUrl);
          const blob = await response.blob();

          let thumbnail: string | null = null;
          if (asset.type === 'image') {
            thumbnail = await createImageThumbnail(blob);
          } else if (asset.type === 'video') {
            thumbnail = await createVideoThumbnail(blob);
          }

          if (!thumbnail) continue;

          await supabase
            .from('assets')
            .update({
              metadata: {
                ...(asset.metadata ?? {}),
                thumbnail,
              },
            })
            .eq('id', asset.id);

          setAssets((prev) =>
            prev.map((entry) =>
              entry.id === asset.id
                ? {
                    ...entry,
                    metadata: {
                      ...(entry.metadata ?? {}),
                      thumbnail,
                    },
                  }
                : entry
            )
          );
        } catch (error) {
          browserLogger.error({ error, assetId: asset.id }, 'Failed to generate thumbnail');
        }
      }
    })();
  }, [assets, assetsLoaded, timeline, supabase]);

  // Autosave timeline
  useAutosave(projectId, 2000, async (projectIdParam, timelineToSave): Promise<void> => {
    if (!timelineToSave) {
      return;
    }
    try {
      await saveTimeline(projectIdParam, timelineToSave);
      toast.success('Timeline saved');
    } catch (error) {
      browserLogger.error({ error, projectId: projectIdParam }, 'Failed to autosave timeline');
      toast.error('Failed to autosave timeline');
    }
  });

  if (!timeline) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-sm text-neutral-500">Loading timeline…</span>
        <Toaster position="bottom-right" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <EditorHeader projectId={projectId} currentTab="video-editor" onExport={handleExportClick} />
      <div className="grid h-full grid-cols-[280px_1fr_320px] gap-6 p-6">
        <Toaster position="bottom-right" />

        {/* Assets Panel */}
        <AssetPanel
          projectId={projectId}
          activeTab={activeTab}
          assets={assets}
          loadingAssets={loadingAssets}
          assetError={assetError}
          uploadPending={uploadPending}
          onTabChange={setActiveTab}
          onAssetAdd={handlers.handleClipAdd}
          onAssetDelete={handlers.handleAssetDelete}
          onFileSelect={handlers.handleFileSelect}
        />

        {/* Main Editor */}
        <main className="flex h-full flex-col gap-4 overflow-hidden">
          <section className="flex-[18] overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <LazyPreviewPlayer />
          </section>
          <section className="flex-[5] rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <LazyHorizontalTimeline
              onDetectScenes={handleDetectScenes}
              sceneDetectPending={sceneDetectPending}
              onAddText={handlers.handleAddText}
              onAddTransition={handlers.handleAddTransition}
              onGenerateAudioFromClip={handlers.handleGenerateAudioFromClip}
              onUpscaleVideo={handleUpscaleVideoFromTimeline}
              upscaleVideoPending={upscaleVideoPending}
              onSplitAudioFromClip={handleSplitAudioFromClip}
              onSplitScenesFromClip={handleSplitScenesFromClip}
              splitAudioPending={splitAudioPending}
              splitScenesPending={splitScenesPending}
            />
          </section>

          <TimelineCorrectionsMenu />
        </main>

        {/* Clip Properties Panel */}
        <LazyClipPropertiesPanel />

        {/* Audio Generation Modal */}
        <AudioGenerationModal
          isOpen={showAudioModal}
          isPending={audioGenPending}
          mode={audioGenMode}
          onClose={() => {
            setShowAudioModal(false);
            setAudioGenMode(null);
          }}
          onModeSelect={setAudioGenMode}
          onModeBack={() => setAudioGenMode(null)}
          onGenerateSuno={handleGenerateSuno}
          onGenerateElevenLabs={handleGenerateElevenLabs}
        />

        {/* Video Generation Modal */}
        <VideoGenerationModal
          isOpen={showVideoModal}
          isPending={videoGenPending}
          operationName={videoOperationName}
          onClose={() => setShowVideoModal(false)}
          onGenerate={handleGenerateVideo}
        />

        {/* Export Modal */}
        <LazyExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          projectId={projectId}
          timeline={timeline}
        />

        {/* Keyboard Shortcuts Help Modal */}
        <KeyboardShortcutsHelp
          shortcuts={editorShortcuts}
          isOpen={showShortcutsHelp}
          onClose={() => setShowShortcutsHelp(false)}
        />
      </div>
    </div>
  );
}
