/**
 * ExportModal Component
 *
 * Modal for exporting video projects
 * - Multiple export presets (1080p, 720p, 480p, Web)
 * - Quality settings display
 * - FFmpeg processing integration
 */
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import type { Timeline } from '@/types/timeline';
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
import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  timeline: Timeline | null;
}

export interface ExportPreset {
  name: string;
  description: string;
  width: number;
  height: number;
  fps: number;
  vBitrateK: number;
  aBitrateK: number;
  format: 'mp4' | 'webm';
}

const EXPORT_PRESETS: ExportPreset[] = [
  {
    name: '1080p HD',
    description: 'Full HD quality (1920x1080)',
    width: 1920,
    height: 1080,
    fps: 30,
    vBitrateK: 8000,
    aBitrateK: 192,
    format: 'mp4',
  },
  {
    name: '720p HD',
    description: 'High quality (1280x720)',
    width: 1280,
    height: 720,
    fps: 30,
    vBitrateK: 5000,
    aBitrateK: 128,
    format: 'mp4',
  },
  {
    name: '480p SD',
    description: 'Standard definition (854x480)',
    width: 854,
    height: 480,
    fps: 30,
    vBitrateK: 2500,
    aBitrateK: 128,
    format: 'mp4',
  },
  {
    name: 'Web Optimized',
    description: 'Fast loading (1280x720, WebM)',
    width: 1280,
    height: 720,
    fps: 30,
    vBitrateK: 3000,
    aBitrateK: 128,
    format: 'webm',
  },
];

export default function ExportModal({ isOpen, onClose, projectId, timeline }: ExportModalProps) {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(
    null
  );

  const handleExport = async () => {
    if (!timeline) {
      setFeedback({ type: 'error', message: 'No timeline to export' });
      toast.error('No timeline to export');
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const preset = EXPORT_PRESETS[selectedPreset];

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
          outputSpec: {
            width: preset.width,
            height: preset.height,
            fps: preset.fps,
            vBitrateK: preset.vBitrateK,
            aBitrateK: preset.aBitrateK,
            format: preset.format,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Export failed');
      }

      browserLogger.info({ projectId, jobId: data.jobId, preset: preset.name }, 'Export started');
      const successMessage =
        data.message || `Export job queued. Track progress with job ID ${data.jobId}.`;
      setFeedback({
        type: 'success',
        message: successMessage,
      });
      toast.success('Export started successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start export';
      setFeedback({ type: 'error', message: errorMessage });
      toast.error(errorMessage);
      browserLogger.error({ error: err, projectId }, 'Failed to start export');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Select a preset to export your video. This feature is a placeholder and requires
            server-side implementation.
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

          <div className="space-y-4">
            <div>
              <div className="mb-2 block text-sm font-medium">Export Preset</div>
              <div className="grid grid-cols-2 gap-3">
                {EXPORT_PRESETS.map((preset, index) => (
                  <button
                    key={preset.name}
                    onClick={() => setSelectedPreset(index)}
                    className={cn(
                      'rounded-lg border p-4 text-left transition-all',
                      selectedPreset === index
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-border hover:border-blue-500/50'
                    )}
                  >
                    <div className="font-semibold">{preset.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{preset.description}</div>
                    <div className="mt-2 text-xs text-muted-foreground/80">
                      {preset.width}x{preset.height} • {preset.fps}fps •{' '}
                      {preset.format.toUpperCase()}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <h3 className="mb-2 text-sm font-medium">Selected Settings</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Resolution</div>
                  <div className="font-mono">
                    {EXPORT_PRESETS[selectedPreset].width}x{EXPORT_PRESETS[selectedPreset].height}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Frame Rate</div>
                  <div className="font-mono">{EXPORT_PRESETS[selectedPreset].fps} fps</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Format</div>
                  <div className="font-mono">
                    {EXPORT_PRESETS[selectedPreset].format.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

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
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline" disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isLoading || !timeline}>
            {isLoading ? <LoadingSpinner size={20} /> : 'Start Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
