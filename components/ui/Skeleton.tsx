/**
 * Skeleton Component
 *
 * A skeleton loader component for displaying loading states with placeholders.
 * - Provides visual feedback while content is loading
 * - Multiple variants for different content types
 * - Branded purple gradient animation
 * - Respects reduced motion preferences
 * - Fully accessible with ARIA labels
 */

import { cn } from '@/lib/utils';

export interface SkeletonProps {
  /** Custom className for additional styling */
  className?: string;
  /** Variant for different skeleton types */
  variant?: 'default' | 'branded';
  /** Whether to animate the skeleton */
  animate?: boolean;
}

/**
 * Base Skeleton component
 */
export function Skeleton({ className, variant = 'default', animate = true }: SkeletonProps) {
  const baseClasses = 'rounded-md bg-neutral-200 dark:bg-neutral-800';

  const animationClasses = animate
    ? variant === 'branded'
      ? 'animate-pulse bg-gradient-to-r from-purple-100 via-purple-200 to-purple-100 dark:from-purple-900 dark:via-purple-800 dark:to-purple-900 motion-reduce:animate-none'
      : 'animate-pulse motion-reduce:animate-none'
    : '';

  return (
    <div
      className={cn(baseClasses, animationClasses, className)}
      role="status"
      aria-label="Loading content"
      aria-live="polite"
    />
  );
}

/**
 * Skeleton for text content
 */
export interface SkeletonTextProps extends Omit<SkeletonProps, 'className'> {
  /** Number of lines to display */
  lines?: number;
  /** Custom className for the container */
  className?: string;
  /** Custom className for each line */
  lineClassName?: string;
}

export function SkeletonText({
  lines = 3,
  className,
  lineClassName,
  variant = 'default',
  animate = true,
}: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading text">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant={variant}
          animate={animate}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-4/5' : 'w-full',
            lineClassName
          )}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for a card component
 */
export interface SkeletonCardProps extends Omit<SkeletonProps, 'className'> {
  /** Custom className for the container */
  className?: string;
  /** Show image placeholder */
  showImage?: boolean;
  /** Show title placeholder */
  showTitle?: boolean;
  /** Number of description lines */
  descriptionLines?: number;
}

export function SkeletonCard({
  className,
  variant = 'default',
  animate = true,
  showImage = true,
  showTitle = true,
  descriptionLines = 2,
}: SkeletonCardProps) {
  return (
    <div className={cn('rounded-lg border border-neutral-200 p-4 dark:border-neutral-800', className)} role="status" aria-label="Loading card">
      {showImage && (
        <Skeleton
          variant={variant}
          animate={animate}
          className="mb-4 h-48 w-full"
        />
      )}
      {showTitle && (
        <Skeleton
          variant={variant}
          animate={animate}
          className="mb-2 h-6 w-3/4"
        />
      )}
      <SkeletonText
        lines={descriptionLines}
        variant={variant}
        animate={animate}
      />
    </div>
  );
}

/**
 * Skeleton for a list item
 */
export interface SkeletonListItemProps extends Omit<SkeletonProps, 'className'> {
  /** Custom className for the container */
  className?: string;
  /** Show avatar/icon placeholder */
  showAvatar?: boolean;
}

export function SkeletonListItem({
  className,
  variant = 'default',
  animate = true,
  showAvatar = true,
}: SkeletonListItemProps) {
  return (
    <div className={cn('flex items-center gap-4', className)} role="status" aria-label="Loading list item">
      {showAvatar && (
        <Skeleton
          variant={variant}
          animate={animate}
          className="h-12 w-12 rounded-full"
        />
      )}
      <div className="flex-1 space-y-2">
        <Skeleton
          variant={variant}
          animate={animate}
          className="h-4 w-3/4"
        />
        <Skeleton
          variant={variant}
          animate={animate}
          className="h-3 w-1/2"
        />
      </div>
    </div>
  );
}

/**
 * Skeleton for a table
 */
export interface SkeletonTableProps extends Omit<SkeletonProps, 'className'> {
  /** Custom className for the container */
  className?: string;
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
}

export function SkeletonTable({
  className,
  variant = 'default',
  animate = true,
  rows = 5,
  columns = 4,
}: SkeletonTableProps) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading table">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={`header-${i}`}
            variant={variant}
            animate={animate}
            className="h-4 flex-1"
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              variant={variant}
              animate={animate}
              className="h-6 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for video timeline
 */
export interface SkeletonTimelineProps extends Omit<SkeletonProps, 'className'> {
  /** Custom className for the container */
  className?: string;
  /** Number of clips to show */
  clips?: number;
}

export function SkeletonTimeline({
  className,
  variant = 'branded',
  animate = true,
  clips = 3,
}: SkeletonTimelineProps) {
  return (
    <div className={cn('space-y-4', className)} role="status" aria-label="Loading timeline">
      {/* Timeline header */}
      <div className="flex items-center justify-between">
        <Skeleton variant={variant} animate={animate} className="h-8 w-32" />
        <Skeleton variant={variant} animate={animate} className="h-8 w-24" />
      </div>

      {/* Timeline tracks */}
      <div className="space-y-2">
        {Array.from({ length: clips }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton
              variant={variant}
              animate={animate}
              className="h-16 w-20"
            />
            <Skeleton
              variant={variant}
              animate={animate}
              className="h-16 flex-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
