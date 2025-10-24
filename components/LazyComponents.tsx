/**
 * Lazy-loaded Components
 *
 * Dynamic imports for code splitting to reduce initial bundle size.
 * Components are loaded on-demand when needed.
 */
'use client';

import dynamic from 'next/dynamic';
import { ComponentType, ReactElement } from 'react';

/**
 * Loading component shown while lazy components are loading
 */
const LoadingFallback = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900"></div>
      <span className="text-sm text-neutral-600">Loading...</span>
    </div>
  </div>
);

/**
 * Lazy-loaded ExportModal component
 * Only loaded when user triggers export
 */
export const LazyExportModal = dynamic(() => import('@/components/ExportModal'), {
  loading: LoadingFallback,
  ssr: false,
});

/**
 * Lazy-loaded ClipPropertiesPanel component
 * Only loaded when a clip is selected
 */
export const LazyClipPropertiesPanel = dynamic(
  () => import('@/components/editor/ClipPropertiesPanel'),
  {
    loading: () => (
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
 * Lazy-loaded HorizontalTimeline component
 * Only loaded when editor is fully initialized
 */
export const LazyHorizontalTimeline = dynamic(() => import('@/components/HorizontalTimeline'), {
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900"></div>
        <span className="text-sm text-neutral-600">Loading timeline...</span>
      </div>
    </div>
  ),
  ssr: false,
});

/**
 * Lazy-loaded PreviewPlayer component
 * Only loaded when needed for video playback
 */
export const LazyPreviewPlayer = dynamic(() => import('@/components/PreviewPlayer'), {
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-700 border-t-neutral-400"></div>
        <span className="text-sm text-neutral-400">Loading player...</span>
      </div>
    </div>
  ),
  ssr: false,
});

/**
 * Lazy-loaded AudioWaveform component
 * Only loaded when audio visualization is needed
 */
export const LazyAudioWaveform = dynamic(
  () => import('@/components/AudioWaveform').then((mod) => ({ default: mod.AudioWaveform })),
  {
    loading: () => <div className="h-full w-full bg-neutral-100 animate-pulse"></div>,
    ssr: false,
  }
);

/**
 * Lazy-loaded TextOverlayEditor component
 * Only loaded when editing text overlays
 */
export const LazyTextOverlayEditor = dynamic(() => import('@/components/TextOverlayEditor'), {
  loading: LoadingFallback,
  ssr: false,
});

/**
 * Lazy-loaded KeyframeEditor component
 * Only loaded when editing keyframes
 */
export const LazyKeyframeEditor = dynamic(
  () => import('@/components/keyframes/KeyframeEditorShell'),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Lazy-loaded ChatBox component
 * Only loaded when user opens chat interface
 */
export const LazyChatBox = dynamic(() => import('@/components/editor/ChatBox'), {
  loading: LoadingFallback,
  ssr: false,
});

/**
 * Lazy-loaded ProjectList component
 * Only loaded on home/project listing page
 */
export const LazyProjectList = dynamic(
  () => import('@/components/ProjectList').then((mod) => ({ default: mod.ProjectList })),
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
  () => import('@/components/ActivityHistory').then((mod) => ({ default: mod.ActivityHistory })),
  {
    loading: LoadingFallback,
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
