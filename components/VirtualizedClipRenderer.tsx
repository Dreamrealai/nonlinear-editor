/**
 * VirtualizedClipRenderer
 *
 * Renders only visible clips in the viewport for better performance.
 * Uses viewport detection to avoid rendering clips outside the visible area.
 */
'use client';

import React, {  useMemo, useState, useEffect, type RefObject  } from 'react';
import type { Clip } from '@/types/timeline';

interface VirtualizedClipRendererProps<T extends Clip | unknown> {
  /** Array of items to render */
  items: T[];
  /** Current scroll position in pixels */
  scrollLeft: number;
  /** Width of the visible viewport in pixels */
  viewportWidth: number;
  /** Zoom level in pixels per second */
  zoom: number;
  /** Function to get the timeline position of an item */
  getItemPosition: (item: T) => number;
  /** Function to get the duration of an item */
  getItemDuration: (item: T) => number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Extra buffer in pixels to render outside viewport (default: 500px) */
  overscan?: number;
}

/**
 * Determines which items are visible in the current viewport.
 * Only items within the viewport (plus overscan buffer) are rendered.
 */
export function useVirtualizedItems<T extends Clip | unknown>({
  items,
  scrollLeft,
  viewportWidth,
  zoom,
  getItemPosition,
  getItemDuration,
  overscan = 500,
}: Omit<VirtualizedClipRendererProps<T>, 'renderItem'>): T[] {
  return useMemo((): T[] => {
    // Calculate visible time range with buffer
    const viewportStartTime = (scrollLeft - overscan) / zoom;
    const viewportEndTime = (scrollLeft + viewportWidth + overscan) / zoom;

    // Filter items that intersect with the visible range
    return items.filter((item): boolean => {
      const itemStart = getItemPosition(item);
      const itemEnd = itemStart + getItemDuration(item);

      // Item is visible if it overlaps with the viewport
      return itemEnd >= viewportStartTime && itemStart <= viewportEndTime;
    });
  }, [items, scrollLeft, viewportWidth, zoom, getItemPosition, getItemDuration, overscan]);
}

/**
 * Virtualized renderer that only renders visible items in the viewport.
 * Significantly improves performance for timelines with many clips.
 */
export function VirtualizedClipRenderer<T extends Clip | unknown>({
  items,
  scrollLeft,
  viewportWidth,
  zoom,
  getItemPosition,
  getItemDuration,
  renderItem,
  overscan = 500,
}: VirtualizedClipRendererProps<T>): React.ReactElement {
  const visibleItems = useVirtualizedItems({
    items,
    scrollLeft,
    viewportWidth,
    zoom,
    getItemPosition,
    getItemDuration,
    overscan,
  });

  return <>{visibleItems.map((item, index): ReactNode => renderItem(item, index))}</>;
}

/**
 * Hook to detect if a timeline container is being scrolled.
 * Returns scroll position for virtualization.
 */
export function useTimelineScroll(containerRef: RefObject<HTMLElement | HTMLDivElement | null>): { scrollLeft: number; viewportWidth: number; } {
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect((): (() => void) | undefined => {
    const container = containerRef.current;
    if (!container) return;

    const updateScroll = (): void => {
      setScrollLeft(container.scrollLeft);
      setViewportWidth(container.clientWidth);
    };

    // Initial update
    updateScroll();

    // Listen for scroll events
    container.addEventListener('scroll', updateScroll, { passive: true });

    // Listen for resize events
    const resizeObserver = new ResizeObserver(updateScroll);
    resizeObserver.observe(container);

    return (): void => {
      container.removeEventListener('scroll', updateScroll);
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return { scrollLeft, viewportWidth };
}
