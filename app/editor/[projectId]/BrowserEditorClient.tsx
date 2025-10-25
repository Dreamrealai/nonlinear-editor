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
import { useAutoBackup } from '@/lib/hooks/useAutoBackup';
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
import { ResizableAssetPanel } from '@/components/editor/ResizableAssetPanel';
import { AudioGenerationModal } from './AudioGenerationModal';
import { VideoGenerationModal } from './VideoGenerationModal';
import { useEditorHandlers } from './useEditorHandlers';
import { useAssetList } from '@/lib/hooks/useAssetList';
import type { AssetRow } from '@/types/assets';
import {
  exportProjectToJSON,
  downloadProjectJSON,
  importProjectFromFile,
  type ExportedProject,
} from '@/lib/utils/projectExportImport';
import { downloadTimelineAsEDL, downloadTimelineAsFCPXML } from '@/lib/utils/davinciExport';
import {
  enrichTimelineWithSourceDurations,
  createEmptyTimeline,
  createImageThumbnail,
  createVideoThumbnail,
} from './editorUtils';
import { UserOnboarding } from '@/components/UserOnboarding';
import { useEasterEggs } from '@/lib/hooks/useEasterEggs';

type BrowserEditorClientProps = {
  projectId: string;
};

export function BrowserEditorClient({ projectId }: BrowserEditorClientProps): React.JSX.Element {
  const supabase = createBrowserSupabaseClient();

  // Use the asset list hook with pagination
  const {
    assets,
    loadingAssets,
    assetError,
    assetsLoaded,
    reloadAssets,
    currentPage,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    loadNextPage,
    loadPreviousPage,
    updateAsset,
  } = useAssetList(projectId);

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

    return (): void => {
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

  // Easter eggs hook
  useEasterEggs({ enabled: true });

  // Compute which assets are currently used in the timeline
  const usedAssetIds = useMemo((): Set<string> => {
    const ids = new Set<string>();
    if (timeline?.clips) {
      timeline.clips.forEach((clip) => {
        if (clip.assetId) {
          ids.add(clip.assetId);
        }
      });
    }
    return ids;
  }, [timeline]);

  // Play/pause state ref for keyboard shortcuts
  const playPauseStateRef = useRef<{ isPlaying: boolean; togglePlayPause: () => void } | null>(
    null
  );

  // Keyboard shortcut handlers
  const handleUndo = useCallback((): void => {
    if (canUndo()) {
      undo();
      toast.success('Undo', { duration: 1000 });
    }
  }, [undo, canUndo]);

  const handleRedo = useCallback((): void => {
    if (canRedo()) {
      redo();
      toast.success('Redo', { duration: 1000 });
    }
  }, [redo, canRedo]);

  const handleCopy = useCallback((): void => {
    if (selectedClipIds.size > 0) {
      copyClips();
      toast.success(`Copied ${selectedClipIds.size} clip${selectedClipIds.size > 1 ? 's' : ''}`, {
        duration: 1500,
      });
    }
  }, [copyClips, selectedClipIds]);

  const handlePaste = useCallback((): void => {
    pasteClips();
  }, [pasteClips]);

  const handleDelete = useCallback((): void => {
    if (selectedClipIds.size > 0) {
      const count = selectedClipIds.size;
      selectedClipIds.forEach((clipId) => removeClip(clipId));
      toast.success(`Deleted ${count} clip${count > 1 ? 's' : ''}`, { duration: 1500 });
    }
  }, [selectedClipIds, removeClip]);

  const handleSelectAll = useCallback((): void => {
    if (timeline?.clips && timeline.clips.length > 0) {
      clearSelection();
      timeline.clips.forEach((clip) => selectClip(clip.id, true));
      toast.success(
        `Selected ${timeline.clips.length} clip${timeline.clips.length > 1 ? 's' : ''}`,
        { duration: 1500 }
      );
    }
  }, [timeline, clearSelection, selectClip]);

  const handlePlayPause = useCallback((): void => {
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

  // Project export handler with format selection
  const handleExportProject = useCallback(
    (format: 'json' | 'edl' | 'xml'): void => {
      if (!timeline) {
        toast.error('No timeline to export');
        return;
      }

      try {
        const projectName = `project-${projectId.slice(0, 8)}`;

        switch (format) {
          case 'json': {
            const exportedProject = exportProjectToJSON(projectId, projectName, timeline);
            downloadProjectJSON(exportedProject, projectName);
            toast.success('Project exported as JSON!');
            break;
          }
          case 'edl': {
            downloadTimelineAsEDL(projectName, timeline, timeline.output.fps || 30);
            toast.success('Timeline exported as EDL for DaVinci Resolve!');
            break;
          }
          case 'xml': {
            downloadTimelineAsFCPXML(projectName, timeline);
            toast.success('Timeline exported as Final Cut Pro XML!');
            break;
          }
        }
      } catch (error) {
        console.error('Export error:', error);
        toast.error('Failed to export project: ' + (error as Error).message);
      }
    },
    [timeline, projectId]
  );

  // Import project handler
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<ExportedProject | null>(null);

  const handleImportProject = useCallback((): void => {
    importFileInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const result = await importProjectFromFile(file);

        if (!result.success || !result.project) {
          toast.error(result.error || 'Failed to import project');
          return;
        }

        // Show import preview/confirmation
        setImportPreview(result.project);
        setShowImportModal(true);
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import project: ' + (error as Error).message);
      } finally {
        // Reset file input
        if (importFileInputRef.current) {
          importFileInputRef.current.value = '';
        }
      }
    },
    []
  );

  const handleConfirmImport = useCallback((): void => {
    if (!importPreview || !timeline) {
      toast.error('Invalid import state');
      return;
    }

    try {
      // Replace entire timeline
      const importedTimeline = {
        ...importPreview.timeline,
        projectId: timeline.projectId, // Keep current project ID
      };
      setTimeline(importedTimeline);
      toast.success('Project imported successfully!');
      setShowImportModal(false);
      setImportPreview(null);
    } catch (error) {
      console.error('Import confirmation error:', error);
      toast.error('Failed to apply import: ' + (error as Error).message);
    }
  }, [importPreview, timeline, setTimeline, setShowImportModal, setImportPreview]);

  const handleShowShortcuts = useCallback((): void => {
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

  // Create a wrapper that calls reloadAssets after state updates
  const setAssetsWithReload = useCallback(
    (_updater: React.SetStateAction<AssetRow[]>): void => {
      // After any asset state change, reload assets to maintain pagination
      void reloadAssets();
    },
    [reloadAssets]
  );

  // Use the extracted handlers hook
  const handlers = useEditorHandlers({
    projectId,
    timeline,
    assets,
    setAssets: setAssetsWithReload,
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
    let mounted = true;

    const loadTimelineData = async (): Promise<void> => {
      try {
        const timelineData = await loadTimeline(projectId);

        if (cancelled || !mounted) return;

        if (timelineData) {
          const enriched = enrichTimelineWithSourceDurations(timelineData, assets);
          if (mounted) {
            setTimeline(enriched);
          }
        } else {
          const emptyTimeline = createEmptyTimeline(projectId);
          if (mounted) {
            setTimeline(emptyTimeline);
          }
          // Save timeline only if still mounted
          if (mounted) {
            await saveTimeline(projectId, emptyTimeline);
          }
        }

        if (mounted) {
          setTimelineBootstrapped(true);
        }
      } catch (error) {
        if (mounted) {
          browserLogger.error({ error, projectId }, 'Failed to load timeline');
          const emptyTimeline = createEmptyTimeline(projectId);
          setTimeline(emptyTimeline);
          setTimelineBootstrapped(true);
        }
      }
    };

    void loadTimelineData();

    return (): void => {
      cancelled = true;
      mounted = false;
    };
  }, [projectId, assets, assetsLoaded, timelineBootstrapped, setTimeline]);

  // Asset loading is now handled by the useAssetList hook

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

    let cancelled = false;

    void (async (): Promise<void> => {
      for (const asset of missingThumbnails) {
        if (cancelled) break;

        try {
          const bucketName = safeArrayGet(
            asset.storage_url.replace('supabase://', '').split('/'),
            0
          );
          if (!bucketName) continue;

          if (cancelled) break;

          const signedUrlResponse = await supabase.storage.from(bucketName).createSignedUrl(
            asset.storage_url
              .replace(/^supabase:\/\//, '')
              .split('/')
              .slice(1)
              .join('/'),
            600
          );

          if (cancelled || !signedUrlResponse.data?.signedUrl) {
            continue;
          }

          const response = await fetch(signedUrlResponse.data.signedUrl);
          if (cancelled) break;

          const blob = await response.blob();
          if (cancelled) break;

          let thumbnail: string | null = null;
          if (asset.type === 'image') {
            thumbnail = await createImageThumbnail(blob);
          } else if (asset.type === 'video') {
            thumbnail = await createVideoThumbnail(blob);
          }

          if (cancelled || !thumbnail) continue;

          await supabase
            .from('assets')
            .update({
              metadata: {
                ...(asset.metadata ?? {}),
                thumbnail,
              },
            })
            .eq('id', asset.id);

          if (cancelled) break;

          updateAsset(
            asset.id,
            (a: AssetRow): AssetRow => ({
              ...a,
              metadata: {
                ...(a.metadata ?? {}),
                thumbnail,
              },
            })
          );
        } catch (error) {
          if (!cancelled) {
            browserLogger.error({ error, assetId: asset.id }, 'Failed to generate thumbnail');
          }
        }
      }
    })();

    return (): void => {
      cancelled = true;
    };
  }, [assets, assetsLoaded, timeline, supabase, updateAsset]);

  // Autosave timeline
  const { lastSaved, isSaving } = useAutosave(
    projectId,
    2000,
    async (projectIdParam, timelineToSave): Promise<void> => {
      if (!timelineToSave) {
        return;
      }
      try {
        await saveTimeline(projectIdParam, timelineToSave);
      } catch (error) {
        browserLogger.error({ error, projectId: projectIdParam }, 'Failed to autosave timeline');
        toast.error('Failed to autosave timeline');
      }
    }
  );

  // Auto-backup project periodically (every 5 minutes)
  useAutoBackup(projectId);

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
      <EditorHeader
        projectId={projectId}
        currentTab="video-editor"
        onExport={handleExportClick}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
        lastSaved={lastSaved}
        isSaving={isSaving}
      />
      <div className="flex h-full gap-3 lg:gap-6 p-3 lg:p-6">
        <Toaster position="bottom-right" />

        {/* Assets Panel - Desktop Only (Resizable) */}
        <div className="hidden lg:block">
          <ResizableAssetPanel
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
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onNextPage={loadNextPage}
            onPreviousPage={loadPreviousPage}
            usedAssetIds={usedAssetIds}
            initialWidth={280}
            minWidth={200}
            maxWidth={500}
          />
        </div>

        {/* Main Editor - Flexible width */}
        <main className="flex h-full flex-1 flex-col gap-2 lg:gap-4 overflow-hidden">
          {/* Preview Player */}
          <section className="flex-[18] overflow-hidden rounded-lg lg:rounded-xl border border-neutral-200 bg-white p-2 lg:p-4 shadow-sm">
            <LazyPreviewPlayer />
          </section>

          {/* Timeline */}
          <section className="flex-[5] rounded-lg lg:rounded-xl border border-neutral-200 bg-white p-2 lg:p-4 shadow-sm">
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

        {/* Clip Properties Panel - Desktop Only (Fixed width) */}
        <div className="hidden xl:block w-80 flex-shrink-0">
          <LazyClipPropertiesPanel />
        </div>

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

        {/* Hidden File Input for Import Project */}
        <input
          ref={importFileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportFileChange}
          className="hidden"
          aria-label="Import project file"
        />

        {/* Import Confirmation Modal */}
        {showImportModal && importPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Import Project</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Review project details before importing
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Project Info */}
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                        {importPreview.projectName}
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Exported: {new Date(importPreview.exportDate).toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Version: {importPreview.version}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {importPreview.metadata.clipCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Clips</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {importPreview.metadata.tracks}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Tracks</div>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
                        Warning
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        This will replace your current timeline. Make sure you have saved or
                        exported your current work.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3">
                <button
                  type="button"
                  onClick={(): void => {
                    setShowImportModal(false);
                    setImportPreview(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Import & Replace Timeline
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Onboarding Tour */}
        <UserOnboarding />
      </div>
    </div>
  );
}
