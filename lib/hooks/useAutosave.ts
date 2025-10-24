'use client';

import { useEffect, useRef, useState } from 'react';
import { saveTimeline } from '@/lib/saveLoad';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline } from '@/types/timeline';

type SaveFn = (projectId: string, timeline: Timeline) => Promise<void> | void;

export function useAutosave(
  projectId: string,
  delay = 2000,
  saveFn?: SaveFn
): { saveError: string | null } {
  const timeline = useEditorStore((state) => state.timeline);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!timeline) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const handler = saveFn ?? saveTimeline;
      const result = handler(projectId, timeline);
      if (result instanceof Promise) {
        result.catch(async (error) => {
          const { browserLogger } = await import('@/lib/browserLogger');
          browserLogger.error({ error, projectId }, 'Autosave failed');
          setSaveError(error instanceof Error ? error.message : 'Failed to save timeline');

          // Clear any existing error timeout
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
          }

          // Clear error after 5 seconds with proper cleanup tracking
          errorTimeoutRef.current = setTimeout(() => {
            setSaveError(null);
            errorTimeoutRef.current = null;
          }, 5000);
        });
      }
    }, delay);

    return (): void => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Clean up error timeout on unmount
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
    };
  }, [projectId, timeline, delay, saveFn]);

  return { saveError };
}
