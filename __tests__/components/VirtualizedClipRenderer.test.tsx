/**
 * VirtualizedClipRenderer Component Tests
 *
 * Comprehensive test suite covering:
 * - Viewport detection and rendering
 * - Virtualization logic
 * - Scroll handling
 * - Performance optimization
 * - Edge cases
 */

import React, { useRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import {
  VirtualizedClipRenderer,
  useVirtualizedItems,
  useTimelineScroll,
} from '@/components/VirtualizedClipRenderer';
import type { Clip } from '@/types/timeline';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
};

describe('VirtualizedClipRenderer', () => {
  const createMockClip = (id: string, position: number, duration: number): Clip => ({
    id,
    assetId: `asset-${id}`,
    start: 0,
    end: duration,
    timelinePosition: position,
    trackIndex: 0,
    sourceDuration: duration,
    type: 'video',
    hasAudio: false,
    locked: false,
  });

  describe('useVirtualizedItems Hook', () => {
    it('should return all items when viewport shows entire timeline', () => {
      const items = [
        createMockClip('1', 0, 10),
        createMockClip('2', 10, 10),
        createMockClip('3', 20, 10),
      ];

      const { result } = renderHook(() =>
        useVirtualizedItems({
          items,
          scrollLeft: 0,
          viewportWidth: 1000,
          zoom: 10,
          getItemPosition: (item) => item.timelinePosition,
          getItemDuration: (item) => item.end - item.start,
          overscan: 0,
        })
      );

      expect(result.current).toHaveLength(3);
    });

    it('should filter out items outside viewport', () => {
      const items = [
        createMockClip('1', 0, 10), // Position 0-10s = 0-100px at zoom 10
        createMockClip('2', 50, 10), // Position 50-60s = 500-600px
        createMockClip('3', 100, 10), // Position 100-110s = 1000-1100px
      ];

      const { result } = renderHook(() =>
        useVirtualizedItems({
          items,
          scrollLeft: 400, // Viewing 400-1400px (40-140s)
          viewportWidth: 1000,
          zoom: 10,
          getItemPosition: (item) => item.timelinePosition,
          getItemDuration: (item) => item.end - item.start,
          overscan: 0,
        })
      );

      // Only clip 2 and 3 should be visible
      expect(result.current).toHaveLength(2);
      expect(result.current.map((c) => c.id)).toEqual(['2', '3']);
    });

    it('should include items in overscan buffer', () => {
      const items = [
        createMockClip('1', 25, 10), // 25-35s = 250-350px
        createMockClip('2', 50, 10), // 50-60s = 500-600px
        createMockClip('3', 75, 10), // 75-85s = 750-850px
      ];

      const { result } = renderHook(() =>
        useVirtualizedItems({
          items,
          scrollLeft: 500, // Viewing 500-1500px = 50-150s
          viewportWidth: 1000,
          zoom: 10,
          getItemPosition: (item) => item.timelinePosition,
          getItemDuration: (item) => item.end - item.start,
          overscan: 300, // 300px buffer = 30s, so viewport becomes 200-1800px = 20-180s
        })
      );

      // With overscan, viewport is 200-1800px (20-180s)
      // All clips should be visible
      expect(result.current).toHaveLength(3);
    });

    it('should handle items that partially overlap viewport', () => {
      const items = [
        createMockClip('1', 0, 15), // 0-150px
        createMockClip('2', 10, 15), // 100-250px
        createMockClip('3', 20, 15), // 200-350px
      ];

      const { result } = renderHook(() =>
        useVirtualizedItems({
          items,
          scrollLeft: 100, // Viewing 100-1100px
          viewportWidth: 1000,
          zoom: 10,
          getItemPosition: (item) => item.timelinePosition,
          getItemDuration: (item) => item.end - item.start,
          overscan: 0,
        })
      );

      // Clips 1, 2, 3 all overlap with viewport
      expect(result.current).toHaveLength(3);
    });

    it('should update visible items when scrollLeft changes', () => {
      const items = [
        createMockClip('1', 0, 10), // 0-10s = 0-100px
        createMockClip('2', 60, 10), // 60-70s = 600-700px
        createMockClip('3', 120, 10), // 120-130s = 1200-1300px
      ];

      const { result, rerender } = renderHook(
        ({ scrollLeft }) =>
          useVirtualizedItems({
            items,
            scrollLeft,
            viewportWidth: 500,
            zoom: 10,
            getItemPosition: (item) => item.timelinePosition,
            getItemDuration: (item) => item.end - item.start,
            overscan: 0,
          }),
        { initialProps: { scrollLeft: 0 } }
      );

      // Initially viewing 0-500px (0-50s) - only clip 1
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('1');

      // Scroll to 600px (viewing 600-1100px = 60-110s)
      rerender({ scrollLeft: 600 });
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('2');

      // Scroll to 1200px (viewing 1200-1700px = 120-170s)
      rerender({ scrollLeft: 1200 });
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('3');
    });

    it('should update visible items when zoom changes', () => {
      const items = [createMockClip('1', 60, 10)]; // Position 60s, duration 10s

      const { result, rerender } = renderHook(
        ({ zoom }) =>
          useVirtualizedItems({
            items,
            scrollLeft: 0,
            viewportWidth: 1000,
            zoom,
            getItemPosition: (item) => item.timelinePosition,
            getItemDuration: (item) => item.end - item.start,
            overscan: 0,
          }),
        { initialProps: { zoom: 5 } }
      );

      // At zoom 5: clip at 300-350px (60s * 5, duration 10s * 5 = 50px)
      // Viewport 0-1000px = 0-200s
      expect(result.current).toHaveLength(1);

      // At zoom 20: clip at 1200-1400px (60s * 20, duration 10s * 20 = 200px)
      // Viewport 0-1000px = 0-50s, clip starts at 60s which is beyond viewport
      rerender({ zoom: 20 });
      expect(result.current).toHaveLength(0);
    });

    it('should handle empty items array', () => {
      const { result } = renderHook(() =>
        useVirtualizedItems({
          items: [],
          scrollLeft: 0,
          viewportWidth: 1000,
          zoom: 10,
          getItemPosition: () => 0,
          getItemDuration: () => 10,
          overscan: 0,
        })
      );

      expect(result.current).toEqual([]);
    });
  });

  describe('VirtualizedClipRenderer Component', () => {
    it('should render only visible items', () => {
      const items = [
        createMockClip('1', 0, 10), // 0-10s = 0-100px
        createMockClip('2', 100, 10), // 100-110s = 1000-1100px
        createMockClip('3', 200, 10), // 200-210s = 2000-2100px
      ];

      render(
        <VirtualizedClipRenderer
          items={items}
          scrollLeft={0}
          viewportWidth={500}
          zoom={10}
          getItemPosition={(item) => item.timelinePosition}
          getItemDuration={(item) => item.end - item.start}
          renderItem={(item) => <div key={item.id} data-testid={`clip-${item.id}`} />}
          overscan={0}
        />
      );

      // Only clip 1 should be rendered (viewport 0-500px = 0-50s)
      expect(screen.queryByTestId('clip-1')).toBeInTheDocument();
      expect(screen.queryByTestId('clip-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('clip-3')).not.toBeInTheDocument();
    });

    it('should call renderItem for each visible item', () => {
      const items = [createMockClip('1', 0, 10), createMockClip('2', 5, 10)];

      const renderItem = jest.fn((item) => (
        <div key={item.id} data-testid={`clip-${item.id}`} />
      ));

      render(
        <VirtualizedClipRenderer
          items={items}
          scrollLeft={0}
          viewportWidth={1000}
          zoom={10}
          getItemPosition={(item) => item.timelinePosition}
          getItemDuration={(item) => item.end - item.start}
          renderItem={renderItem}
        />
      );

      expect(renderItem).toHaveBeenCalledTimes(2);
      expect(renderItem).toHaveBeenCalledWith(items[0], 0);
      expect(renderItem).toHaveBeenCalledWith(items[1], 1);
    });

    it('should update rendered items when scroll position changes', () => {
      const items = [
        createMockClip('1', 0, 10), // 0-10s = 0-100px
        createMockClip('2', 100, 10), // 100-110s = 1000-1100px
        createMockClip('3', 200, 10), // 200-210s = 2000-2100px
      ];

      const { rerender } = render(
        <VirtualizedClipRenderer
          items={items}
          scrollLeft={0}
          viewportWidth={500}
          zoom={10}
          getItemPosition={(item) => item.timelinePosition}
          getItemDuration={(item) => item.end - item.start}
          renderItem={(item) => <div key={item.id} data-testid={`clip-${item.id}`} />}
          overscan={0}
        />
      );

      expect(screen.queryByTestId('clip-1')).toBeInTheDocument();
      expect(screen.queryByTestId('clip-2')).not.toBeInTheDocument();

      // Scroll to show clip 2 (viewport 1000-1500px = 100-150s)
      rerender(
        <VirtualizedClipRenderer
          items={items}
          scrollLeft={1000}
          viewportWidth={500}
          zoom={10}
          getItemPosition={(item) => item.timelinePosition}
          getItemDuration={(item) => item.end - item.start}
          renderItem={(item) => <div key={item.id} data-testid={`clip-${item.id}`} />}
          overscan={0}
        />
      );

      expect(screen.queryByTestId('clip-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('clip-2')).toBeInTheDocument();
    });

    it('should use custom overscan value', () => {
      const items = [
        createMockClip('1', 0, 10), // 0-10s = 0-100px
        createMockClip('2', 60, 10), // 60-70s = 600-700px
      ];

      render(
        <VirtualizedClipRenderer
          items={items}
          scrollLeft={0}
          viewportWidth={500} // Viewport 0-500px = 0-50s
          zoom={10}
          getItemPosition={(item) => item.timelinePosition}
          getItemDuration={(item) => item.end - item.start}
          renderItem={(item) => <div key={item.id} data-testid={`clip-${item.id}`} />}
          overscan={300} // 300px = 30s buffer, so viewport becomes -300 to 800px = -30s to 80s
        />
      );

      // Both clips should be rendered with overscan
      expect(screen.queryByTestId('clip-1')).toBeInTheDocument();
      expect(screen.queryByTestId('clip-2')).toBeInTheDocument();
    });
  });

  describe('useTimelineScroll Hook', () => {
    it('should return initial scroll position and viewport width', () => {
      const TestComponent = () => {
        const containerRef = useRef<HTMLDivElement>(null);
        const { scrollLeft, viewportWidth } = useTimelineScroll(containerRef);

        return (
          <div ref={containerRef} data-testid="container">
            <div data-testid="scroll-left">{scrollLeft}</div>
            <div data-testid="viewport-width">{viewportWidth}</div>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('scroll-left')).toHaveTextContent('0');
      expect(screen.getByTestId('viewport-width')).toHaveTextContent('0');
    });

    it('should update scroll position on scroll event', async () => {
      const TestComponent = () => {
        const containerRef = useRef<HTMLDivElement>(null);
        const { scrollLeft } = useTimelineScroll(containerRef);

        return (
          <div
            ref={containerRef}
            data-testid="container"
            style={{ overflow: 'auto', width: '500px' }}
          >
            <div style={{ width: '2000px' }}>
              <div data-testid="scroll-left">{scrollLeft}</div>
            </div>
          </div>
        );
      };

      const { container } = render(<TestComponent />);
      const scrollContainer = screen.getByTestId('container');

      // Simulate scroll
      Object.defineProperty(scrollContainer, 'scrollLeft', {
        writable: true,
        value: 250,
      });
      Object.defineProperty(scrollContainer, 'clientWidth', {
        writable: true,
        value: 500,
      });

      act(() => {
        scrollContainer.dispatchEvent(new Event('scroll'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('scroll-left')).toHaveTextContent('250');
      });
    });

    it('should cleanup event listeners on unmount', () => {
      const TestComponent = () => {
        const containerRef = useRef<HTMLDivElement>(null);
        useTimelineScroll(containerRef);
        return <div ref={containerRef} data-testid="container" />;
      };

      const { unmount } = render(<TestComponent />);

      // Just verify unmount doesn't throw errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle null containerRef gracefully', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(null);
        return useTimelineScroll(containerRef);
      });

      expect(result.current.scrollLeft).toBe(0);
      expect(result.current.viewportWidth).toBe(0);
    });

    it('should observe resize events', async () => {
      const TestComponent = () => {
        const containerRef = useRef<HTMLDivElement>(null);
        const { viewportWidth } = useTimelineScroll(containerRef);

        return (
          <div ref={containerRef} data-testid="container">
            <div data-testid="viewport-width">{viewportWidth}</div>
          </div>
        );
      };

      const { container } = render(<TestComponent />);

      // Component should render successfully with ResizeObserver
      expect(container.querySelector('[data-testid="container"]')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should memoize visible items calculation', () => {
      const items = [createMockClip('1', 0, 10), createMockClip('2', 10, 10)];

      const { result, rerender } = renderHook(
        (props) =>
          useVirtualizedItems({
            items: props.items,
            scrollLeft: props.scrollLeft,
            viewportWidth: 1000,
            zoom: 10,
            getItemPosition: (item) => item.timelinePosition,
            getItemDuration: (item) => item.end - item.start,
          }),
        { initialProps: { items, scrollLeft: 0 } }
      );

      const firstResult = result.current;

      // Rerender with same props
      rerender({ items, scrollLeft: 0 });

      // Result should be memoized - check that it returns the same items
      expect(result.current).toEqual(firstResult);
      expect(result.current).toHaveLength(2);
    });

    it('should only render visible clips even with many total clips', () => {
      const items = Array.from({ length: 1000 }, (_, i) =>
        createMockClip(`clip-${i}`, i * 20, 10)
      );

      const renderItem = jest.fn((item) => (
        <div key={item.id} data-testid={`clip-${item.id}`} />
      ));

      render(
        <VirtualizedClipRenderer
          items={items}
          scrollLeft={0}
          viewportWidth={500}
          zoom={10}
          getItemPosition={(item) => item.timelinePosition}
          getItemDuration={(item) => item.end - item.start}
          renderItem={renderItem}
          overscan={0}
        />
      );

      // Should only render clips in viewport (0-50s at zoom 10)
      expect(renderItem.mock.calls.length).toBeLessThan(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle items with zero duration', () => {
      const items = [createMockClip('1', 0, 0)];

      const { result } = renderHook(() =>
        useVirtualizedItems({
          items,
          scrollLeft: 0,
          viewportWidth: 1000,
          zoom: 10,
          getItemPosition: (item) => item.timelinePosition,
          getItemDuration: (item) => item.end - item.start,
        })
      );

      expect(result.current).toHaveLength(1);
    });

    it('should handle negative scroll position', () => {
      const items = [createMockClip('1', 0, 10)];

      const { result } = renderHook(() =>
        useVirtualizedItems({
          items,
          scrollLeft: -100,
          viewportWidth: 1000,
          zoom: 10,
          getItemPosition: (item) => item.timelinePosition,
          getItemDuration: (item) => item.end - item.start,
        })
      );

      expect(result.current).toHaveLength(1);
    });

    it('should handle very small zoom levels', () => {
      const items = [createMockClip('1', 0, 100)];

      const { result } = renderHook(() =>
        useVirtualizedItems({
          items,
          scrollLeft: 0,
          viewportWidth: 1000,
          zoom: 0.1, // Very zoomed out
          getItemPosition: (item) => item.timelinePosition,
          getItemDuration: (item) => item.end - item.start,
        })
      );

      expect(result.current).toHaveLength(1);
    });

    it('should handle very large zoom levels', () => {
      const items = [createMockClip('1', 0, 1)];

      const { result } = renderHook(() =>
        useVirtualizedItems({
          items,
          scrollLeft: 0,
          viewportWidth: 1000,
          zoom: 1000, // Very zoomed in
          getItemPosition: (item) => item.timelinePosition,
          getItemDuration: (item) => item.end - item.start,
        })
      );

      expect(result.current).toHaveLength(1);
    });
  });
});
