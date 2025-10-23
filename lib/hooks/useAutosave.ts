'use client';

import { useEffect, useRef, useState } from 'react';
import { saveTimeline } from '@/lib/saveLoad';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline } from '@/types/timeline';

type SaveFn = (projectId: string, timeline: Timeline) => Promise<void> | void;

export function useAutosave(projectId: string, delay = 2000, saveFn?: SaveFn) {
  const timeline = useEditorStore((state) => state.timeline);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        result.catch((error) => {
          console.error('Autosave failed:', error);
          setSaveError(error instanceof Error ? error.message : 'Failed to save timeline');

          // Clear error after 5 seconds
          setTimeout(() => setSaveError(null), 5000);
        });
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [projectId, timeline, delay, saveFn]);

  return { saveError };
}
