/**
 * LoadingSpinner Component
 *
 * An animated loading indicator with size and variant customization.
 * Uses Lucide's Loader2 icon with continuous spin animation.
 *
 * @example
 * ```tsx
 * <LoadingSpinner />
 * <LoadingSpinner size={32} variant="branded" />
 * <LoadingSpinner size={16} className="text-blue-500" />
 * ```
 */
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Props for the LoadingSpinner component
 */
interface LoadingSpinnerProps {
  /** Size of the spinner in pixels (default: 24) */
  size?: number;
  /** Additional CSS classes to apply */
  className?: string;
  /** Visual variant (default or branded with gradient) */
  variant?: 'default' | 'branded';
}

/**
 * A rotating loading spinner icon.
 *
 * Features:
 * - Continuous rotation animation
 * - Customizable size
 * - Branded variant with gradient coloring
 * - Proper ARIA labels for accessibility
 *
 * @param size - Spinner size in pixels (default: 24)
 * @param variant - Visual style variant (default or branded)
 * @param className - Additional CSS classes
 * @returns An animated loading spinner with proper accessibility attributes
 */
export function LoadingSpinner({ size = 24, className, variant = 'default' }: LoadingSpinnerProps) {
  const variantClass = variant === 'branded'
    ? 'bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent'
    : '';

  return (
    <Loader2
      style={{ width: size, height: size }}
      className={cn('animate-spin', variantClass, className)}
      aria-label="Loading"
      role="status"
    />
  );
}
