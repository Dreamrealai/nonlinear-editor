/**
 * ProjectBackupManager Component
 *
 * UI for managing project backups with version history.
 * Features:
 * - List all backups with timestamps
 * - Create manual backups
 * - Restore from backup
 * - Download backup as JSON
 * - Delete backups
 *
 * @module components/ProjectBackupManager
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import type { ProjectBackup } from '@/lib/services/backupService';

interface ProjectBackupManagerProps {
  projectId: string;
  projectTitle?: string;
}

export function ProjectBackupManager({
  projectId,
  projectTitle,
}: ProjectBackupManagerProps): React.ReactElement {
  const [backups, setBackups] = useState<ProjectBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<ProjectBackup | null>(null);

  const loadBackups = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/backups`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load backups');
      }

      setBackups(data.backups || []);
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Failed to load backups');
      toast.error('Failed to load backups');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect((): void => {
    void loadBackups();
  }, [loadBackups]);

  const handleCreateBackup = async (): Promise<void> => {
    try {
      setCreating(true);
      const response = await fetch(`/api/projects/${projectId}/backups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupType: 'manual' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create backup');
      }

      toast.success('Backup created successfully');
      await loadBackups();
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Failed to create backup');
      toast.error('Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreClick = (backup: ProjectBackup): void => {
    setSelectedBackup(backup);
    setShowRestoreDialog(true);
  };

  const handleRestoreConfirm = async (): Promise<void> => {
    if (!selectedBackup) return;

    try {
      setRestoring(true);
      const response = await fetch(
        `/api/projects/${projectId}/backups/${selectedBackup.id}/restore`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore backup');
      }

      toast.success('Project restored successfully. Reloading page...');

      // Reload the page to show restored data
      setTimeout((): void => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      browserLogger.error({ error, backupId: selectedBackup.id }, 'Failed to restore backup');
      toast.error('Failed to restore backup');
      setRestoring(false);
    } finally {
      setShowRestoreDialog(false);
      setSelectedBackup(null);
    }
  };

  const handleDownload = async (backup: ProjectBackup): Promise<void> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/backups/${backup.id}`);

      if (!response.ok) {
        throw new Error('Failed to download backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${backup.backup_name.replace(/[^a-z0-9-]/gi, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Backup downloaded');
    } catch (error) {
      browserLogger.error({ error, backupId: backup.id }, 'Failed to download backup');
      toast.error('Failed to download backup');
    }
  };

  const handleDelete = async (backup: ProjectBackup): Promise<void> => {
    const confirmed = confirm(`Delete backup "${backup.backup_name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeleting(backup.id);
      const response = await fetch(`/api/projects/${projectId}/backups/${backup.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete backup');
      }

      toast.success('Backup deleted');
      await loadBackups();
    } catch (error) {
      browserLogger.error({ error, backupId: backup.id }, 'Failed to delete backup');
      toast.error('Failed to delete backup');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Backups</CardTitle>
              <CardDescription>
                {projectTitle && `${projectTitle} - `}Version history and backup management
              </CardDescription>
            </div>
            <Button onClick={(): undefined => void handleCreateBackup()} disabled={creating} size="sm">
              {creating ? 'Creating...' : 'Create Backup'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg
                className="h-12 w-12 text-neutral-300 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              <p className="text-sm font-medium text-neutral-600 mb-1">No backups yet</p>
              <p className="text-xs text-neutral-500">
                Create your first backup to save a version of your project
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup): React.ReactElement => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4 hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-neutral-900 truncate">
                        {backup.backup_name}
                      </h4>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          backup.backup_type === 'auto'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {backup.backup_type === 'auto' ? 'Auto' : 'Manual'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">{formatDate(backup.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      onClick={(): void => handleRestoreClick(backup)}
                      variant="outline"
                      size="sm"
                      disabled={restoring}
                    >
                      Restore
                    </Button>
                    <Button onClick={(): undefined => void handleDownload(backup)} variant="outline" size="sm">
                      Download
                    </Button>
                    <Button
                      onClick={(): undefined => void handleDelete(backup)}
                      variant="outline"
                      size="sm"
                      disabled={deleting === backup.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deleting === backup.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-blue-900 mb-1">About Backups</h5>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Auto backups are created every 5 minutes during editing</li>
                  <li>• Only the 10 most recent auto backups are kept</li>
                  <li>• Manual backups are never auto-deleted</li>
                  <li>• Download backups as JSON for local storage</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Backup?</DialogTitle>
            <DialogDescription>
              This will replace your current project state with the backup from{' '}
              {selectedBackup && formatDate(selectedBackup.created_at)}. Your current work will be
              lost unless you create a backup first.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={(): void => setShowRestoreDialog(false)}
              disabled={restoring}
            >
              Cancel
            </Button>
            <Button onClick={(): undefined => void handleRestoreConfirm()} disabled={restoring}>
              {restoring ? 'Restoring...' : 'Restore Backup'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
