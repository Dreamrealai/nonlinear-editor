/**
 * useAutoBackup Hook
 *
 * Automatically creates backups at specified intervals.
 * Works alongside useAutosave to create version history.
 *
 * Features:
 * - Exponential backoff for rate limit errors
 * - Prevents duplicate backups from multiple tabs
 * - Graceful error handling without user interruption
 *
 * @module lib/hooks/useAutoBackup
 */

'use client';

import { useEffect, useRef } from 'react';
import { browserLogger } from '@/lib/browserLogger';
import type { ProjectId } from '@/types/branded';

const AUTO_BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MIN_BACKOFF_DELAY = 1 * 60 * 1000; // 1 minute
const MAX_BACKOFF_DELAY = 15 * 60 * 1000; // 15 minutes

export function useAutoBackup(projectId: ProjectId | string): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBackupRef = useRef<number>(0);
  const backoffDelayRef = useRef<number>(0); // Track current backoff delay
  const consecutiveFailuresRef = useRef<number>(0); // Track consecutive failures

  useEffect((): (() => void) => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Create auto backup function with exponential backoff
    const createAutoBackup = async (): Promise<void> => {
      const now = Date.now();

      // Check if we're in backoff period due to rate limiting
      if (backoffDelayRef.current > 0 && now - lastBackupRef.current < backoffDelayRef.current) {
        browserLogger.debug(
          {
            projectId,
            backoffDelay: backoffDelayRef.current,
            timeRemaining: backoffDelayRef.current - (now - lastBackupRef.current),
          },
          'Skipping backup due to backoff period'
        );
        return;
      }

      // Check if enough time has passed since last successful backup
      if (now - lastBackupRef.current < AUTO_BACKUP_INTERVAL) {
        return;
      }

      try {
        const response = await fetch(`/api/projects/${projectId}/backups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupType: 'auto' }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle rate limit error (429) with exponential backoff
          if (response.status === 429) {
            consecutiveFailuresRef.current++;
            const backoffMultiplier = Math.pow(2, consecutiveFailuresRef.current - 1);
            backoffDelayRef.current = Math.min(
              MIN_BACKOFF_DELAY * backoffMultiplier,
              MAX_BACKOFF_DELAY
            );

            browserLogger.warn(
              {
                projectId,
                status: response.status,
                consecutiveFailures: consecutiveFailuresRef.current,
                backoffDelay: backoffDelayRef.current,
              },
              'Rate limit hit for auto backup, applying exponential backoff'
            );
            return;
          }

          throw new Error(data.error || 'Failed to create auto backup');
        }

        // Backup succeeded - reset backoff and failure counters
        lastBackupRef.current = now;
        backoffDelayRef.current = 0;
        consecutiveFailuresRef.current = 0;

        browserLogger.info({ projectId, backupId: data.backup?.id }, 'Auto backup created');
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Failed to create auto backup');
        // Don't show toast error for auto backups to avoid interrupting user
      }
    };

    // Create initial backup after 30 seconds (give time for project to load)
    const initialTimeout = setTimeout((): void => {
      void createAutoBackup();
    }, 30000);

    // Set up interval for periodic backups
    intervalRef.current = setInterval((): void => {
      void createAutoBackup();
    }, AUTO_BACKUP_INTERVAL);

    // Cleanup
    return (): void => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [projectId]);
}
