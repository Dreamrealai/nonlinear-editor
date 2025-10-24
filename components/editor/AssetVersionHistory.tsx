/**
 * AssetVersionHistory Component
 *
 * Displays version history for an asset and allows users to:
 * - View all previous versions
 * - See version metadata (date, size, change reason)
 * - Revert to a previous version
 * - Compare versions (visual preview)
 */
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { browserLogger } from '@/lib/browserLogger';
import { formatDuration } from '@/lib/utils/timeFormatting';

interface AssetVersion {
  id: string;
  asset_id: string;
  version_number: number;
  version_label: string | null;
  storage_url: string;
  storage_path: string;
  type: 'video' | 'audio' | 'image';
  mime_type: string | null;
  file_size: bigint | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  metadata: Record<string, unknown>;
  change_reason: string | null;
  changed_by: string | null;
  created_at: string;
}

interface VersionHistoryData {
  versions: AssetVersion[];
  currentVersion: number;
  totalVersions: number;
}

interface AssetVersionHistoryProps {
  /** Asset ID to show version history for */
  assetId: string;
  /** Asset type for display */
  assetType: 'video' | 'audio' | 'image';
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when asset is reverted (to trigger reload) */
  onReverted?: () => void;
}

export function AssetVersionHistory({
  assetId,
  assetType: _assetType,
  isOpen,
  onClose,
  onReverted,
}: AssetVersionHistoryProps): JSX.Element {
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);

  // Load version history when dialog opens
  useEffect((): void => {
    if (isOpen) {
      loadVersionHistory();
    }
  }, [isOpen, assetId]);

  const loadVersionHistory = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/versions`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load version history');
      }

      const data: VersionHistoryData = await response.json();
      setVersions(data.versions);
      setCurrentVersion(data.currentVersion);

      browserLogger.info(
        {
          event: 'asset_version_history.loaded',
          assetId,
          versionCount: data.totalVersions,
        },
        'Version history loaded successfully'
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load version history';
      setError(errorMessage);

      browserLogger.error(
        {
          event: 'asset_version_history.load_error',
          assetId,
          error: errorMessage,
        },
        'Failed to load version history'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (versionId: string, versionNumber: number): Promise<void> => {
    if (!confirm(`Are you sure you want to revert to version ${versionNumber}? This will create a backup of the current version.`)) {
      return;
    }

    setReverting(versionId);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/versions/${versionId}/revert`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revert asset');
      }

      browserLogger.info(
        {
          event: 'asset_version_history.reverted',
          assetId,
          versionId,
          versionNumber,
        },
        `Asset reverted to version ${versionNumber}`
      );

      // Reload version history
      await loadVersionHistory();

      // Notify parent component
      if (onReverted) {
        onReverted();
      }

      // Show success message
      alert(`Successfully reverted to version ${versionNumber}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revert asset';
      setError(errorMessage);

      browserLogger.error(
        {
          event: 'asset_version_history.revert_error',
          assetId,
          versionId,
          error: errorMessage,
        },
        'Failed to revert asset'
      );
    } finally {
      setReverting(null);
    }
  };

  const formatFileSize = (bytes: bigint | number | null): string => {
    if (!bytes) return 'Unknown';
    const numBytes = typeof bytes === 'bigint' ? Number(bytes) : bytes;

    if (numBytes < 1024) return `${numBytes} B`;
    if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
    if (numBytes < 1024 * 1024 * 1024) return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(numBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current version indicator */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Current Version: v{currentVersion}
              </span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* No versions message */}
          {!loading && versions.length === 0 && (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              <p>No version history available.</p>
              <p className="text-sm mt-2">
                Versions are created when you update this asset.
              </p>
            </div>
          )}

          {/* Version list */}
          {!loading && versions.length > 0 && (
            <div className="space-y-3">
              {versions.map((version): JSX.Element => (
                <div
                  key={version.id}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Version info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">
                          Version {version.version_number}
                        </span>
                        {version.version_label && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded-full">
                            {version.version_label}
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span>
                            <span className="font-medium">Created:</span> {formatDate(version.created_at)}
                          </span>
                          <span>
                            <span className="font-medium">Size:</span> {formatFileSize(version.file_size)}
                          </span>
                          {version.width && version.height && (
                            <span>
                              <span className="font-medium">Dimensions:</span> {version.width} × {version.height}
                            </span>
                          )}
                          {version.duration_seconds && (
                            <span>
                              <span className="font-medium">Duration:</span> {formatDuration(version.duration_seconds * 1000)}
                            </span>
                          )}
                        </div>

                        {version.change_reason && (
                          <div className="mt-2">
                            <span className="font-medium">Reason:</span>{' '}
                            <span className="italic">{version.change_reason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(): Promise<void> => handleRevert(version.id, version.version_number)}
                        disabled={reverting !== null}
                      >
                        {reverting === version.id ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Reverting...
                          </>
                        ) : (
                          'Revert'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer info */}
          {!loading && versions.length > 0 && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <p>
                Total versions: {versions.length} | Current version: v{currentVersion}
              </p>
              <p className="mt-1">
                Reverting to a previous version will create a backup of the current state.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
