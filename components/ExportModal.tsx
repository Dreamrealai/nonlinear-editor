/**
 * ExportModal Component
 *
 * Modal for exporting video projects
 * - Platform-specific presets (YouTube, Instagram, TikTok, etc.)
 * - Custom preset creation and management
 * - Quality settings display
 * - Priority selection for render queue
 * - FFmpeg processing integration
 */
'use client';

import React, {  useState, useEffect  } from 'react';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import type { Timeline } from '@/types/timeline';
import type { ExportPreset } from '@/types/export';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Info, List, Youtube, Instagram, Twitter } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  timeline: Timeline | null;
  onOpenQueue?: () => void; // Callback to open render queue panel
}

// Platform icons mapping
const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube_1080p: Youtube,
  youtube_4k: Youtube,
  youtube_shorts: Youtube,
  instagram_feed: Instagram,
  instagram_story: Instagram,
  instagram_reel: Instagram,
  tiktok: Info, // Use Info as placeholder for TikTok
  twitter: Twitter,
  facebook: Info,
  linkedin: Info,
};

export function ExportModal({ isOpen, onClose, projectId, timeline, onOpenQueue }: ExportModalProps): React.ReactElement {
  const [presets, setPresets] = useState<ExportPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [priority, setPriority] = useState(0); // 0 = normal priority
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(
    null
  );

  // Fetch presets when modal opens
  useEffect((): void => {
    if (isOpen) {
      fetchPresets();
    }
  }, [isOpen]);

  const fetchPresets = async (): Promise<void> => {
    setIsLoadingPresets(true);
    try {
      const response = await fetch('/api/export-presets');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch presets');
      }

      setPresets(data.data.presets);
      // Select first preset by default
      if (data.data.presets.length > 0 && !selectedPresetId) {
        setSelectedPresetId(data.data.presets[0].id);
      }
    } catch (err) {
      browserLogger.error({ error: err }, 'Failed to fetch export presets');
      toast.error('Failed to load export presets');
    } finally {
      setIsLoadingPresets(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    if (!timeline) {
      setFeedback({ type: 'error', message: 'No timeline to export' });
      toast.error('No timeline to export');
      return;
    }

    if (!selectedPresetId) {
      setFeedback({ type: 'error', message: 'Please select an export preset' });
      toast.error('Please select an export preset');
      return;
    }

    setIsExporting(true);
    setFeedback(null);

    try {
      const preset = presets.find((p): boolean => p.id === selectedPresetId);
      if (!preset) {
        throw new Error('Invalid export preset selected');
      }

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          timeline: {
            clips: timeline.clips,
          },
          outputSpec: preset.settings,
          priority, // Include priority in export request
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Export failed');
      }

      browserLogger.info({ projectId, jobId: data.data?.jobId, preset: preset.name, priority }, 'Export started');
      const successMessage =
        data.message || `Export added to queue. Track progress in the Render Queue.`;
      setFeedback({
        type: 'success',
        message: successMessage,
      });
      toast.success('Export added to render queue');

      // Reset priority after successful export
      setPriority(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start export';
      setFeedback({ type: 'error', message: errorMessage });
      toast.error(errorMessage);
      browserLogger.error({ error: err, projectId }, 'Failed to start export');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedPreset = presets.find((p): boolean => p.id === selectedPresetId);

  // Group presets by platform vs custom
  const platformPresets = presets.filter((p): boolean => p.is_platform);
  const customPresets = presets.filter((p): boolean => p.is_custom);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Select a preset and priority, then add to render queue
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {feedback && (
            <Alert variant={feedback.type === 'success' ? 'success' : 'destructive'}>
              <AlertTitle>
                {feedback.type === 'success' ? 'Export Started' : 'Export Failed'}
              </AlertTitle>
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          )}

          {isLoadingPresets ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner size={32} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Platform Presets */}
              {platformPresets.length > 0 && (
                <div>
                  <div className="mb-2 block text-sm font-medium">Platform Presets</div>
                  <div className="grid grid-cols-2 gap-3">
                    {platformPresets.map((preset): React.ReactElement => {
                      const Icon = preset.platform_type ? PLATFORM_ICONS[preset.platform_type] : Info;
                      return (
                        <button
                          key={preset.id}
                          onClick={(): void => setSelectedPresetId(preset.id)}
                          className={cn(
                            'rounded-lg border p-4 text-left transition-all',
                            selectedPresetId === preset.id
                              ? 'border-blue-500 bg-blue-500/20'
                              : 'border-border hover:border-blue-500/50'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className="h-4 w-4" />}
                            <div className="font-semibold">{preset.name}</div>
                          </div>
                          {preset.description && (
                            <div className="mt-1 text-xs text-muted-foreground">{preset.description}</div>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground/80">
                            {preset.settings.width}x{preset.settings.height} •{' '}
                            {preset.settings.fps}fps •{' '}
                            {preset.settings.format.toUpperCase()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Presets */}
              {customPresets.length > 0 && (
                <div>
                  <div className="mb-2 block text-sm font-medium">Custom Presets</div>
                  <div className="grid grid-cols-2 gap-3">
                    {customPresets.map((preset): React.ReactElement => (
                      <button
                        key={preset.id}
                        onClick={(): void => setSelectedPresetId(preset.id)}
                        className={cn(
                          'rounded-lg border p-4 text-left transition-all',
                          selectedPresetId === preset.id
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-border hover:border-blue-500/50'
                        )}
                      >
                        <div className="font-semibold">{preset.name}</div>
                        {preset.description && (
                          <div className="mt-1 text-xs text-muted-foreground">{preset.description}</div>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground/80">
                          {preset.settings.width}x{preset.settings.height} •{' '}
                          {preset.settings.fps}fps •{' '}
                          {preset.settings.format.toUpperCase()}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Settings */}
              {selectedPreset && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <h3 className="mb-2 text-sm font-medium">Selected Settings</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Resolution</div>
                      <div className="font-mono">
                        {selectedPreset.settings.width}x{selectedPreset.settings.height}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Frame Rate</div>
                      <div className="font-mono">{selectedPreset.settings.fps} fps</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Format</div>
                      <div className="font-mono">
                        {selectedPreset.settings.format.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Priority Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium">Priority</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={priority}
                    onChange={(e): void => setPriority(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-8">{priority}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Higher priority exports render first (0 = normal, 10 = highest)
                </p>
              </div>

              {/* Info Alert */}
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
                  <div className="text-sm text-blue-300">
                    <strong>Note:</strong> Video export requires FFmpeg processing infrastructure.
                    This feature is currently a placeholder and will need server-side implementation
                    to generate actual video files.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <div>
              {onOpenQueue && (
                <Button onClick={onOpenQueue} variant="outline" size="sm">
                  <List className="mr-2 h-4 w-4" />
                  View Queue
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={onClose} variant="outline" disabled={isExporting}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={isExporting || !timeline || !selectedPresetId}>
                {isExporting ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size={16} />
                    <span>Adding to queue...</span>
                  </div>
                ) : (
                  'Add to Queue'
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportModal;
