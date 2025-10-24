import React from 'react';
/**
 * LoadingSpinner Component
 *
 * A reusable loading spinner component with customizable size and color.
 * - Uses CSS animations for smooth spinning effect
 * - Optional text label
 * - Multiple size variants
 * - Branded purple gradient variant
 * - Accessibility support with reduced motion
 */

import clsx from 'clsx';

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Custom className for additional styling */
  className?: string;
  /** Text to display next to the spinner */
  text?: string;
  /** Variant for branded or default styling */
  variant?: 'default' | 'branded';
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
};

export function LoadingSpinner({ size = 'md', className, text, variant = 'default' }: LoadingSpinnerProps): React.ReactElement {
  const borderClasses = variant === 'branded'
    ? 'border-purple-200 border-t-purple-600 dark:border-purple-800 dark:border-t-purple-400'
    : 'border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400';

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div
        className={clsx(
          'animate-spin rounded-full motion-reduce:animate-none motion-reduce:border-t-4',
          borderClasses,
          sizeClasses[size]
        )}
        role="status"
        aria-label="Loading"
      />
      {text && <span className="text-sm text-gray-600 dark:text-gray-400">{text}</span>}
    </div>
  );
}
