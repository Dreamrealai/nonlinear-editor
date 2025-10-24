/**
 * useAutoBackup Hook
 *
 * Automatically creates backups at specified intervals.
 * Works alongside useAutosave to create version history.
 *
 * @module lib/hooks/useAutoBackup
 */

'use client';

import { useEffect, useRef } from 'react';
import { browserLogger } from '@/lib/browserLogger';
import type { ProjectId } from '@/types/branded';

const AUTO_BACKUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

export function useAutoBackup(projectId: ProjectId | string): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBackupRef = useRef<number>(0);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Create auto backup function
    const createAutoBackup = async (): Promise<void> => {
      const now = Date.now();

      // Check if enough time has passed since last backup
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
          throw new Error(data.error || 'Failed to create auto backup');
        }

        lastBackupRef.current = now;
        browserLogger.info({ projectId, backupId: data.backup?.id }, 'Auto backup created');
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Failed to create auto backup');
        // Don't show toast error for auto backups to avoid interrupting user
      }
    };

    // Create initial backup after 30 seconds (give time for project to load)
    const initialTimeout = setTimeout(() => {
      void createAutoBackup();
    }, 30000);

    // Set up interval for periodic backups
    intervalRef.current = setInterval(() => {
      void createAutoBackup();
    }, AUTO_BACKUP_INTERVAL);

    // Cleanup
    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [projectId]);
}
