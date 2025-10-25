/**
 * Lazy-loaded Components
 *
 * Dynamic imports for code splitting to reduce initial bundle size.
 * Components are loaded on-demand when needed.
 */
'use client';

import dynamic from 'next/dynamic';
import React, { ComponentType, ReactElement, NamedExoticComponent } from 'react';
import type { Clip } from '@/types/timeline';
import type { ProjectListProps } from '@/components/ProjectList';

/**
 * Loading component shown while lazy components are loading
 */
const LoadingFallback = (): React.ReactElement => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600 motion-reduce:animate-none motion-reduce:border-t-8 dark:border-purple-800 dark:border-t-purple-400"
        role="status"
        aria-label="Loading"
      ></div>
      <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading...</span>
    </div>
  </div>
);



/**
 * Lazy-loaded ClipPropertiesPanel component
 * Only loaded when a clip is selected
 */
export const LazyClipPropertiesPanel = dynamic(
  (): Promise<{
    default: typeof import('@/components/editor/ClipPropertiesPanel').ClipPropertiesPanel;
  }> =>
    import('@/components/editor/ClipPropertiesPanel').then(
      (mod): { default: typeof mod.ClipPropertiesPanel } => ({ default: mod.ClipPropertiesPanel })
    ),
  {
    loading: (): React.ReactElement => (
      <div className="h-full w-80 border-l border-gray-700 bg-gray-900 p-4">
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          Loading properties...
        </div>
      </div>
    ),
    ssr: false,
  }
);

/**
 * Props for HorizontalTimeline component
 */
type HorizontalTimelineProps = {
  onDetectScenes?: () => Promise<void>;
  sceneDetectPending?: boolean;
  onAddText?: () => void;
  onAddTransition?: () => void;
  onGenerateAudioFromClip?: (clipId: string) => Promise<void>;
  onUpscaleVideo?: () => Promise<void>;
  upscaleVideoPending?: boolean;
  onSplitAudioFromClip?: (clipId: string) => Promise<void>;
  onSplitScenesFromClip?: (clipId: string) => Promise<void>;
  splitAudioPending?: boolean;
  splitScenesPending?: boolean;
};

/**
 * Lazy-loaded HorizontalTimeline component
 * Only loaded when editor is fully initialized
 */
export const LazyHorizontalTimeline = dynamic<HorizontalTimelineProps>(
  (): Promise<{ default: typeof import('@/components/HorizontalTimeline').HorizontalTimeline }> =>
    import('@/components/HorizontalTimeline').then(
      (mod): { default: typeof mod.HorizontalTimeline } => ({ default: mod.HorizontalTimeline })
    ),
  {
    loading: (): React.ReactElement => (
      <div className="flex h-full w-full items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600 motion-reduce:animate-none motion-reduce:border-t-8 dark:border-purple-800 dark:border-t-purple-400"
            role="status"
            aria-label="Loading timeline"
          ></div>
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Loading timeline...
          </span>
        </div>
      </div>
    ),
    ssr: false,
  }
);

/**
 * Lazy-loaded PreviewPlayer component
 * Only loaded when needed for video playback
 */
export const LazyPreviewPlayer = dynamic(
  (): Promise<{ default: typeof import('@/components/PreviewPlayer').PreviewPlayer }> =>
    import('@/components/PreviewPlayer').then((mod): { default: typeof mod.PreviewPlayer } => ({
      default: mod.PreviewPlayer,
    })),
  {
    loading: (): React.ReactElement => (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-700 border-t-neutral-400"></div>
          <span className="text-sm text-neutral-400">Loading player...</span>
        </div>
      </div>
    ),
    ssr: false,
  }
);

/**
 * Lazy-loaded AudioWaveform component
 * Only loaded when audio visualization is needed
 */
export const LazyAudioWaveform = dynamic(
  (): Promise<{
    default: NamedExoticComponent<{
      clip: Clip;
      width: number;
      height: number;
      zoom?: number;
      className?: string;
    }>;
  }> =>
    import('@/components/AudioWaveform').then(
      (
        mod
      ): {
        default: NamedExoticComponent<{
          clip: Clip;
          width: number;
          height: number;
          zoom?: number;
          className?: string;
        }>;
      } => ({ default: mod.AudioWaveform })
    ),
  {
    loading: (): React.ReactElement => (
      <div className="h-full w-full bg-neutral-100 animate-pulse"></div>
    ),
    ssr: false,
  }
);

/**
 * Lazy-loaded TextOverlayEditor component
 * Only loaded when editing text overlays
 */
export const LazyTextOverlayEditor = dynamic(
  (): Promise<{ default: typeof import('@/components/TextOverlayEditor').TextOverlayEditor }> =>
    import('@/components/TextOverlayEditor').then(
      (mod): { default: typeof mod.TextOverlayEditor } => ({ default: mod.TextOverlayEditor })
    ),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Lazy-loaded KeyframeEditor component
 * Only loaded when editing keyframes
 */
export const LazyKeyframeEditor = dynamic(
  (): Promise<{
    default: typeof import('@/components/keyframes/KeyframeEditorShell').KeyframeEditorShell;
  }> =>
    import('@/components/keyframes/KeyframeEditorShell').then(
      (mod): { default: typeof mod.KeyframeEditorShell } => ({ default: mod.KeyframeEditorShell })
    ),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Lazy-loaded ChatBox component
 * Only loaded when user opens chat interface
 */
export const LazyChatBox = dynamic(
  (): Promise<{ default: typeof import('@/components/editor/ChatBox').ChatBox }> =>
    import('@/components/editor/ChatBox').then((mod): { default: typeof mod.ChatBox } => ({
      default: mod.ChatBox,
    })),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Lazy-loaded ProjectList component
 * Only loaded on home/project listing page
 */
export const LazyProjectList = dynamic(
  (): Promise<{ default: NamedExoticComponent<ProjectListProps> }> =>
    import('@/components/ProjectList').then(
      (mod): { default: NamedExoticComponent<ProjectListProps> } => ({ default: mod.ProjectList })
    ),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Lazy-loaded ActivityHistory component
 * Only loaded when viewing activity/history
 */
export const LazyActivityHistory = dynamic(
  (): Promise<{ default: NamedExoticComponent<object> }> =>
    import('@/components/ActivityHistory').then(
      (mod): { default: NamedExoticComponent<object> } => ({ default: mod.ActivityHistory })
    ),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Lazy-loaded VideoGenerationForm component
 * Only loaded when user opens video generation
 */
export const LazyVideoGenerationForm = dynamic(
  (): Promise<{
    default: typeof import('@/components/generation/VideoGenerationForm').VideoGenerationForm;
  }> =>
    import('@/components/generation/VideoGenerationForm').then(
      (mod): { default: typeof mod.VideoGenerationForm } => ({ default: mod.VideoGenerationForm })
    ),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Lazy-loaded GenerateAudioTab component
 * Only loaded when user opens audio generation
 */
export const LazyGenerateAudioTab = dynamic(
  (): Promise<{
    default: typeof import('@/components/generation/GenerateAudioTab').GenerateAudioTab;
  }> =>
    import('@/components/generation/GenerateAudioTab').then(
      (mod): { default: typeof mod.GenerateAudioTab } => ({ default: mod.GenerateAudioTab })
    ),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Lazy-loaded AssetLibraryModal component
 * Only loaded when user opens asset library
 */
export const LazyAssetLibraryModal = dynamic(
  (): Promise<{
    default: typeof import('@/components/generation/AssetLibraryModal').AssetLibraryModal;
  }> =>
    import('@/components/generation/AssetLibraryModal').then(
      (mod): { default: typeof mod.AssetLibraryModal } => ({ default: mod.AssetLibraryModal })
    ),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Lazy-loaded VideoGenerationQueue component
 * Only loaded in video generation context
 */
export const LazyVideoGenerationQueue = dynamic(
  (): Promise<{
    default: typeof import('@/components/generation/VideoGenerationQueue').VideoGenerationQueue;
  }> =>
    import('@/components/generation/VideoGenerationQueue').then(
      (mod): { default: typeof mod.VideoGenerationQueue } => ({ default: mod.VideoGenerationQueue })
    ),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Lazy-loaded UserOnboarding component
 * Only loaded when user first visits the editor
 */
export const LazyUserOnboarding = dynamic(
  (): Promise<{ default: typeof import('@/components/UserOnboarding').UserOnboarding }> =>
    import('@/components/UserOnboarding').then((mod): { default: typeof mod.UserOnboarding } => ({
      default: mod.UserOnboarding,
    })),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Lazy-loaded SubscriptionManager component
 * Only loaded in settings or when subscription actions are needed
 */
export const LazySubscriptionManager = dynamic(
  (): Promise<{ default: typeof import('@/components/SubscriptionManager').SubscriptionManager }> =>
    import('@/components/SubscriptionManager').then(
      (mod): { default: typeof mod.SubscriptionManager } => ({ default: mod.SubscriptionManager })
    ),
  {
    loading: (): React.ReactElement => (
      <div className="h-32 animate-pulse rounded-2xl bg-neutral-100" />
    ),
    ssr: false,
  }
);

/**
 * Generic lazy loader for any component
 * Useful for dynamically loading components based on conditions
 */
export function createLazyComponent<P extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  loadingComponent?: () => ReactElement
): ComponentType<P> {
  return dynamic(importFn, {
    loading: (loadingComponent || LoadingFallback) as () => ReactElement,
    ssr: false,
  }) as ComponentType<P>;
}
