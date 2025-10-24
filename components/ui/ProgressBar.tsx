import React from 'react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils/timeFormatting';

interface ProgressBarProps {
  /** Progress value from 0 to 100 */
  progress: number;
  /** Optional label to show above the progress bar */
  label?: string;
  /** Show percentage text inside or next to the bar */
  showPercentage?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Additional CSS classes */
  className?: string;
  /** Show animated stripes for indeterminate progress */
  animated?: boolean;
  /** Time elapsed in seconds (optional) */
  timeElapsed?: number;
  /** Estimated time remaining in seconds (optional) */
  timeRemaining?: number;
}

const variantClasses = {
  primary: 'bg-blue-600',
  success: 'bg-green-600',
  warning: 'bg-yellow-600',
  danger: 'bg-red-600',
  info: 'bg-cyan-600',
};

const variantBackgroundClasses = {
  primary: 'bg-blue-200',
  success: 'bg-green-200',
  warning: 'bg-yellow-200',
  danger: 'bg-red-200',
  info: 'bg-cyan-200',
};

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

// formatDuration is now imported from @/lib/utils/timeFormatting

export function ProgressBar({
  progress,
  label,
  showPercentage = true,
  size = 'md',
  variant = 'primary',
  className,
  animated = false,
  timeElapsed,
  timeRemaining,
}: ProgressBarProps): React.JSX.Element {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage || timeElapsed !== undefined || timeRemaining !== undefined) && (
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {label && <span className="text-sm font-medium text-neutral-700">{label}</span>}
            {showPercentage && (
              <span className="text-xs font-semibold text-neutral-600">
                {Math.round(clampedProgress)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            {timeElapsed !== undefined && <span>Elapsed: {formatDuration(timeElapsed)}</span>}
            {timeRemaining !== undefined && timeRemaining > 0 && (
              <span>Remaining: {formatDuration(timeRemaining)}</span>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          'w-full overflow-hidden rounded-full',
          variantBackgroundClasses[variant],
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            variantClasses[variant],
            animated && 'animate-pulse'
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Indeterminate progress bar for unknown progress
 */
export function IndeterminateProgressBar({
  label,
  size = 'md',
  variant = 'primary',
  className,
}: Pick<ProgressBarProps, 'label' | 'size' | 'variant' | 'className'>): React.JSX.Element {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="mb-2">
          <span className="text-sm font-medium text-neutral-700">{label}</span>
        </div>
      )}

      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full',
          variantBackgroundClasses[variant],
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'absolute h-full w-1/3 rounded-full',
            variantClasses[variant],
            'animate-[indeterminate_1.5s_ease-in-out_infinite]'
          )}
          style={{
            animation: 'indeterminate 1.5s ease-in-out infinite',
          }}
        />
      </div>

      <style>
        {`
          @keyframes indeterminate {
            0% {
              left: -33%;
            }
            100% {
              left: 100%;
            }
          }
        `}
      </style>
    </div>
  );
}
