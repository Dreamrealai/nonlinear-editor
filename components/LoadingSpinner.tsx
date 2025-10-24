/**
 * LoadingSpinner Component
 *
 * A reusable loading spinner component with customizable size and color.
 * - Uses CSS animations for smooth spinning effect
 * - Optional text label
 * - Multiple size variants
 */

import clsx from 'clsx';

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Custom className for additional styling */
  className?: string;
  /** Text to display next to the spinner */
  text?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
};

export default function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div
        className={clsx(
          'animate-spin rounded-full border-gray-300 border-t-blue-600',
          sizeClasses[size]
        )}
        role="status"
        aria-label="Loading"
      />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
}
