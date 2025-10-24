'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ProgressBar, IndeterminateProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils/timeFormatting';

export type OperationType =
  | 'upscale'
  | 'split-audio'
  | 'split-scenes'
  | 'scene-detect'
  | 'generate-video'
  | 'generate-audio';

export interface ProgressState {
  /** Operation type */
  type: OperationType;
  /** Whether the operation is active */
  isActive: boolean;
  /** Progress percentage (0-100), undefined for indeterminate */
  progress?: number;
  /** Current step description */
  currentStep?: string;
  /** Error message if failed */
  error?: string;
  /** Whether the operation completed successfully */
  completed?: boolean;
  /** Time started (timestamp) */
  startTime?: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Whether cancellation is supported */
  cancellable?: boolean;
}

interface ProgressModalProps {
  /** Progress state */
  progressState: ProgressState;
  /** Callback when user cancels operation */
  onCancel?: () => void;
  /** Callback when user closes completed/error modal */
  onClose?: () => void;
}

const OPERATION_LABELS: Record<OperationType, string> = {
  upscale: 'Upscaling Video',
  'split-audio': 'Extracting Audio',
  'split-scenes': 'Splitting Scenes',
  'scene-detect': 'Detecting Scenes',
  'generate-video': 'Generating Video',
  'generate-audio': 'Generating Audio',
};

const OPERATION_DESCRIPTIONS: Record<OperationType, string> = {
  upscale: 'Enhancing video quality using Topaz AI...',
  'split-audio': 'Extracting audio track from video...',
  'split-scenes': 'Analyzing video and detecting scene changes...',
  'scene-detect': 'Analyzing video content for scene boundaries...',
  'generate-video': 'Creating video using AI...',
  'generate-audio': 'Generating audio using AI...',
};

// formatDuration is now imported from @/lib/utils/timeFormatting

/**
 * Calculate estimated time remaining based on elapsed time and progress
 */
function calculateEstimatedTimeRemaining(startTime: number, progress: number): number | undefined {
  if (!progress || progress === 0) return undefined;

  const elapsed = (Date.now() - startTime) / 1000; // seconds
  const estimatedTotal = (elapsed / progress) * 100;
  const remaining = estimatedTotal - elapsed;

  return remaining > 0 ? remaining : undefined;
}

/**
 * Progress modal component that shows real-time progress for async operations
 */
export function ProgressModal({
  progressState,
  onCancel,
  onClose,
}: ProgressModalProps): React.JSX.Element {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedRemaining, setEstimatedRemaining] = useState<number | undefined>(undefined);

  // Update elapsed time every second
  useEffect(() => {
    if (!progressState.isActive || !progressState.startTime) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - progressState.startTime!) / 1000;
      setElapsedTime(elapsed);

      // Calculate estimated time remaining
      if (progressState.progress && progressState.progress > 0) {
        const estimated = calculateEstimatedTimeRemaining(
          progressState.startTime!,
          progressState.progress
        );
        setEstimatedRemaining(estimated);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [progressState.isActive, progressState.startTime, progressState.progress]);

  // Use provided estimate if available, otherwise use calculated one
  const timeRemaining = progressState.estimatedTimeRemaining ?? estimatedRemaining;

  const operationLabel = OPERATION_LABELS[progressState.type];
  const operationDescription = OPERATION_DESCRIPTIONS[progressState.type];

  // Determine if we should show the modal
  const isOpen = progressState.isActive || !!progressState.error || !!progressState.completed;

  // Handle close - only allow closing if operation is completed or errored
  const handleClose = () => {
    if (progressState.completed || progressState.error) {
      onClose?.();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={cn(
          'sm:max-w-md',
          progressState.completed && 'border-green-500',
          progressState.error && 'border-red-500'
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {progressState.completed && <CheckCircle className="h-5 w-5 text-green-600" />}
            {progressState.error && <AlertCircle className="h-5 w-5 text-red-600" />}
            {!progressState.completed && !progressState.error && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            )}
            <span>
              {progressState.completed
                ? `${operationLabel} Complete`
                : progressState.error
                  ? `${operationLabel} Failed`
                  : operationLabel}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          {!progressState.completed && !progressState.error && (
            <p className="text-sm text-neutral-600">{operationDescription}</p>
          )}

          {/* Success message */}
          {progressState.completed && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
              Operation completed successfully!
            </div>
          )}

          {/* Error message */}
          {progressState.error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              <p className="font-medium">Error:</p>
              <p className="mt-1">{progressState.error}</p>
            </div>
          )}

          {/* Current step */}
          {progressState.currentStep && !progressState.completed && !progressState.error && (
            <div className="text-sm text-neutral-700">
              <span className="font-medium">Current step:</span> {progressState.currentStep}
            </div>
          )}

          {/* Progress bar */}
          {!progressState.completed && !progressState.error && (
            <div>
              {progressState.progress !== undefined ? (
                <ProgressBar
                  progress={progressState.progress}
                  showPercentage={true}
                  variant="primary"
                  size="md"
                  animated={true}
                  timeElapsed={elapsedTime}
                  timeRemaining={timeRemaining}
                />
              ) : (
                <IndeterminateProgressBar label="Processing..." variant="primary" size="md" />
              )}
            </div>
          )}

          {/* Time information */}
          {!progressState.completed && !progressState.error && progressState.startTime && (
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Elapsed: {formatDuration(elapsedTime)}</span>
              {timeRemaining !== undefined && timeRemaining > 0 && (
                <span>Estimated remaining: {formatDuration(timeRemaining, { approximate: true })}</span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            {/* Cancel button - only show during active operation if cancellable */}
            {!progressState.completed &&
              !progressState.error &&
              progressState.cancellable &&
              onCancel && (
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Cancel Operation
                </Button>
              )}

            {/* Close button - only show when completed or errored */}
            {(progressState.completed || progressState.error) && (
              <Button variant="default" onClick={handleClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
