import React from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

interface GenerationProgressProps {
  /** Current progress percentage (0-100) */
  progress: number;
  /** Current attempt number */
  currentAttempt: number;
  /** Maximum number of attempts */
  maxAttempts: number;
  /** Status message to display */
  statusMessage?: string;
  /** Show cancel button */
  showCancel?: boolean;
  /** Cancel button click handler */
  onCancel?: () => void;
  /** Type of generation (for messaging) */
  generationType?: 'video' | 'audio' | 'image';
  /** Additional CSS classes */
  className?: string;
  /** Variant for different visual styles */
  variant?: 'default' | 'compact';
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}

/**
 * Calculate status message based on progress
 */
function getStatusMessage(progress: number, generationType: string = 'content'): string {
  if (progress === 0) {
    return 'Initializing...';
  } else if (progress < 10) {
    return 'Starting generation...';
  } else if (progress < 30) {
    return 'Processing request...';
  } else if (progress < 60) {
    return `Generating ${generationType}...`;
  } else if (progress < 90) {
    return 'Almost done...';
  } else if (progress < 100) {
    return 'Finalizing...';
  }
  return 'Complete!';
}

/**
 * Estimate time remaining based on progress and attempts
 * Returns estimated seconds remaining
 */
function estimateTimeRemaining(
  progress: number,
  currentAttempt: number,
  maxAttempts: number,
  pollInterval: number = 10
): number {
  // If no progress yet, estimate based on average time
  if (progress === 0) {
    // Assume average completion around 30 attempts for initial estimate
    return 30 * pollInterval;
  }

  // Calculate estimated total attempts needed based on current progress
  const estimatedTotalAttempts = (currentAttempt / progress) * 100;
  const remainingAttempts = Math.max(0, estimatedTotalAttempts - currentAttempt);

  // Convert to seconds
  return remainingAttempts * pollInterval;
}

/**
 * Format seconds into human-readable time
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `~${Math.ceil(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return `~${hours}h ${minutes}m`;
  }
}

export function GenerationProgress({
  progress,
  currentAttempt,
  maxAttempts,
  statusMessage,
  showCancel = true,
  onCancel,
  generationType = 'video',
  className,
  variant = 'default',
  estimatedTimeRemaining,
}: GenerationProgressProps): React.JSX.Element {
  // Calculate or use provided time estimate
  const timeRemaining =
    estimatedTimeRemaining !== undefined
      ? estimatedTimeRemaining
      : estimateTimeRemaining(progress, currentAttempt, maxAttempts);

  // Get status message
  const displayMessage = statusMessage || getStatusMessage(progress, generationType);

  if (variant === 'compact') {
    return (
      <div
        className={cn('flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3', className)}
        role="status"
        aria-live="polite"
        aria-label={`Generation progress: ${displayMessage}`}
      >
        <LoadingSpinner size={20} className="text-blue-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">{displayMessage}</p>
        </div>
        {showCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
            aria-label="Cancel generation"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('space-y-3 rounded-lg bg-blue-50 px-4 py-3', className)}
      role="status"
      aria-live="polite"
      aria-label={`Generation progress: ${displayMessage}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LoadingSpinner size={16} className="text-blue-600" />
          <p className="text-sm font-medium text-blue-900">{displayMessage}</p>
        </div>
        {showCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
            aria-label="Cancel generation"
          >
            Cancel
          </button>
        )}
      </div>

      <ProgressBar
        progress={progress}
        variant="primary"
        size="md"
        showPercentage={false}
        className="mb-0"
      />

      <div className="flex items-center justify-between text-xs">
        <span className="text-blue-700">
          {progress > 0 ? `${Math.round(progress)}% complete` : 'Starting...'}
        </span>
        <div className="flex items-center gap-3 text-blue-600">
          {timeRemaining > 0 && <span>{formatTimeRemaining(timeRemaining)} remaining</span>}
          <span>
            Attempt {currentAttempt}/{maxAttempts}
          </span>
        </div>
      </div>

      <p className="text-xs text-blue-600">
        This may take several minutes. You can navigate away and come back later.
      </p>
    </div>
  );
}

/**
 * Simple loading state component for when generation just started
 */
export function GenerationStarting({
  generationType = 'content',
  className,
}: {
  generationType?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn('flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3', className)}
      role="status"
      aria-live="polite"
      aria-label={`Starting ${generationType} generation`}
    >
      <LoadingSpinner size={20} className="text-blue-600" />
      <p className="text-sm font-medium text-blue-900">Starting {generationType} generation...</p>
    </div>
  );
}
