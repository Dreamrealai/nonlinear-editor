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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Export Video</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {feedback && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-200'
                : 'border-red-500/30 bg-red-500/10 text-red-200'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Export Preset</label>
            <div className="grid grid-cols-2 gap-3">
              {EXPORT_PRESETS.map((preset, index) => (
                <button
                  key={preset.name}
                  onClick={() => setSelectedPreset(index)}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    selectedPreset === index
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600'
                  }`}
                >
                  <div className="font-semibold text-white">{preset.name}</div>
                  <div className="mt-1 text-xs text-neutral-400">{preset.description}</div>
                  <div className="mt-2 text-xs text-neutral-500">
                    {preset.width}x{preset.height} • {preset.fps}fps • {preset.format.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-neutral-800 p-4">
            <h3 className="mb-2 text-sm font-medium text-neutral-300">Selected Settings</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-neutral-500">Resolution</div>
                <div className="font-mono text-white">
                  {EXPORT_PRESETS[selectedPreset].width}x{EXPORT_PRESETS[selectedPreset].height}
                </div>
              </div>
              <div>
                <div className="text-neutral-500">Frame Rate</div>
                <div className="font-mono text-white">{EXPORT_PRESETS[selectedPreset].fps} fps</div>
              </div>
              <div>
                <div className="text-neutral-500">Format</div>
                <div className="font-mono text-white">
                  {EXPORT_PRESETS[selectedPreset].format.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400"
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
              <div className="text-sm text-blue-200">
                <strong>Note:</strong> Video export requires FFmpeg processing infrastructure. This
                feature is currently a placeholder and will need server-side implementation to
                generate actual video files.
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isLoading || !timeline}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Starting Export...' : 'Start Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
