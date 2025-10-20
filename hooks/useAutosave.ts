'use client';

import { useEffect, useRef } from 'react';
import { saveTimeline } from '@/lib/saveLoad';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline } from '@/types/timeline';

type SaveFn = (projectId: string, timeline: Timeline) => Promise<void> | void;

export function useAutosave(projectId: string, delay = 2000, saveFn?: SaveFn) {
  const timeline = useEditorStore((state) => state.timeline);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        void result;
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [projectId, timeline, delay, saveFn]);
}
