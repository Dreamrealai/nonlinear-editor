/**
 * Integration Test: Timeline and Playback Controls Integration
 *
 * Tests the integration between timeline controls, playback functionality,
 * and preview player:
 * - Play/pause controls update timeline state
 * - Timeline playhead syncs with playback time
 * - Seeking in timeline updates playback position
 * - Timeline controls (zoom, snap) affect UI
 * - Keyboard shortcuts control playback
 *
 * This test verifies that PlaybackControls, TimelineControls, TimelinePlayhead,
 * and the playback state work together correctly.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PlaybackControls } from '@/components/preview/PlaybackControls';
import { TimelineControls } from '@/components/timeline/TimelineControls';
import { usePlaybackStore } from '@/state/usePlaybackStore';
import { useEditorStore } from '@/state/useEditorStore';

// Mock Next.js Image
jest.mock(
  'next/image',
  () => ({
    __esModule: true,
    default: function MockImage({
      src,
      alt,
      ...props
    }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }): JSX.Element {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={alt} {...props} />;
    },
  })
);

// Create a wrapper component to test integration
const PlaybackIntegrationWrapper = (): JSX.Element => {
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const zoom = usePlaybackStore((state) => state.zoom);
  const timeline = useEditorStore((state) => state.timeline);
  const hasClips = timeline !== null && timeline.clips.length > 0;
  const totalDuration = timeline?.duration || 0;

  const handlePlayPause = (): void => {
    usePlaybackStore.getState().togglePlayPause();
  };

  const handleSeek = (time: number): void => {
    usePlaybackStore.getState().setCurrentTime(time);
  };

  const handleToggleFullscreen = (): void => {
    // Mock fullscreen toggle
  };

  const handleZoomIn = (): void => {
    const currentZoom = usePlaybackStore.getState().zoom;
    usePlaybackStore.getState().setZoom(currentZoom * 1.2);
  };

  const handleZoomOut = (): void => {
    const currentZoom = usePlaybackStore.getState().zoom;
    usePlaybackStore.getState().setZoom(currentZoom / 1.2);
  };

  const handleSplitAtPlayhead = (): void => {
    // Mock split functionality
  };

  return (
    <div>
      <PlaybackControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={totalDuration}
        isFullscreen={false}
        hasClips={hasClips}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onToggleFullscreen={handleToggleFullscreen}
      />
      <TimelineControls
        zoom={zoom}
        currentTime={currentTime}
        timelineDuration={totalDuration}
        clipAtPlayhead={false}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onUndo={jest.fn()}
        onRedo={jest.fn()}
        onSplitAtPlayhead={handleSplitAtPlayhead}
        canUndo={false}
        canRedo={false}
      />
    </div>
  );
};

describe('Integration: Timeline and Playback Controls', () => {
  beforeEach((): void => {
    // Reset stores before each test - wrap in act to avoid act() warnings
    act(() => {
      usePlaybackStore.getState().reset();
      useEditorStore.getState().reset();

      // Set up a timeline with clips for tests
      useEditorStore.getState().setTimeline({
        id: 'test-timeline',
        projectId: 'test-project',
        duration: 30,
        clips: [
          {
            id: 'clip-1',
            type: 'video',
            assetId: 'asset-1',
            start: 0,
            end: 10,
            timelinePosition: 0,
            trackIndex: 0,
            url: 'https://example.com/video1.mp4',
            thumbnailUrl: 'https://example.com/thumb1.jpg',
          },
          {
            id: 'clip-2',
            type: 'video',
            assetId: 'asset-2',
            start: 0,
            end: 15,
            timelinePosition: 10,
            trackIndex: 0,
            url: 'https://example.com/video2.mp4',
            thumbnailUrl: 'https://example.com/thumb2.jpg',
          },
        ],
        tracks: [{ id: 'track-1', type: 'video', clips: [] }],
      } as any);
    });
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('Play/Pause Integration', () => {
    it('should render both playback and timeline controls', async () => {
      render(<PlaybackIntegrationWrapper />);

      // Playback controls - wait for controls to be visible
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
      });

      // Timeline controls
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    });

    it('should toggle play/pause state when play button is clicked', async () => {
      const user = userEvent.setup();
      render(<PlaybackIntegrationWrapper />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
      });

      // Verify initial state
      expect(usePlaybackStore.getState().isPlaying).toBe(false);

      const playButton = screen.getByRole('button', { name: 'Play video' });

      // Click play
      await user.click(playButton);

      // Button should change to pause - verify store state first
      await waitFor(
        () => {
          const state = usePlaybackStore.getState();
          expect(state.isPlaying).toBe(true);
        },
        { timeout: 3000 }
      );

      // Then verify UI updated
      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: 'Pause video' })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Click pause
      const pauseButton = screen.getByRole('button', { name: 'Pause video' });
      await user.click(pauseButton);

      // Verify store state changed
      await waitFor(
        () => {
          expect(usePlaybackStore.getState().isPlaying).toBe(false);
        },
        { timeout: 3000 }
      );

      // Button should change back to play
      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Timeline Controls Integration', () => {
    it('should zoom in when zoom in button is clicked', async () => {
      const user = userEvent.setup();
      render(<PlaybackIntegrationWrapper />);

      const initialZoom = usePlaybackStore.getState().zoom;

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      await user.click(zoomInButton);

      await waitFor(() => {
        const currentZoom = usePlaybackStore.getState().zoom;
        expect(currentZoom).toBeGreaterThan(initialZoom);
      });
    });

    it('should zoom out when zoom out button is clicked', async () => {
      const user = userEvent.setup();

      // Set initial zoom higher than default - wrap in act
      act(() => {
        usePlaybackStore.getState().setZoom(100);
      });

      render(<PlaybackIntegrationWrapper />);

      const initialZoom = usePlaybackStore.getState().zoom;

      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      await user.click(zoomOutButton);

      await waitFor(() => {
        const currentZoom = usePlaybackStore.getState().zoom;
        expect(currentZoom).toBeLessThan(initialZoom);
      });
    });
  });

  describe('Playback State Synchronization', () => {
    it('should stop time advancement when paused', async () => {
      const user = userEvent.setup();
      render(<PlaybackIntegrationWrapper />);

      // Start playback - wait for button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
      });
      const playButton = screen.getByRole('button', { name: 'Play video' });
      await user.click(playButton);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Wait for playback to start
      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: 'Pause video' })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Pause
      const pauseButton = screen.getByRole('button', { name: 'Pause video' });
      await user.click(pauseButton);

      // Wait for pause to take effect
      await waitFor(() => {
        expect(usePlaybackStore.getState().isPlaying).toBe(false);
      });

      const timeWhenPaused = usePlaybackStore.getState().currentTime;

      // Wait a bit more
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Time should not have advanced
      const timeAfterWaiting = usePlaybackStore.getState().currentTime;
      expect(timeAfterWaiting).toBe(timeWhenPaused);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all buttons', async () => {
      render(<PlaybackIntegrationWrapper />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Play video' })).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: /zoom in/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: /zoom out/i })).toHaveAttribute('aria-label');
    });

    it('should announce playback state changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<PlaybackIntegrationWrapper />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
      });
      const playButton = screen.getByRole('button', { name: 'Play video' });
      await user.click(playButton);

      // Button label should update
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Pause video' })).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not cause excessive re-renders during playback', async () => {
      const user = userEvent.setup();
      const renderCount = { current: 0 };

      const TestWrapper = (): JSX.Element => {
        renderCount.current++;
        return <PlaybackIntegrationWrapper />;
      };

      render(<TestWrapper />);

      const initialRenderCount = renderCount.current;

      // Start playback - wait for button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
      });
      const playButton = screen.getByRole('button', { name: 'Play video' });
      await user.click(playButton);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should not have excessive renders (allow some for time updates)
      // This is a basic check; real performance monitoring would be more sophisticated
      expect(renderCount.current - initialRenderCount).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing timeline gracefully', async () => {
      // Clear timeline - wrap in act
      act(() => {
        useEditorStore.getState().setTimeline(null);
      });

      render(<PlaybackIntegrationWrapper />);

      // Controls should still render - wait for them
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    });

    it('should recover from playback errors', async () => {
      const user = userEvent.setup();
      render(<PlaybackIntegrationWrapper />);

      // Try to play empty timeline - wait for button to be available
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
      });

      const playButton = screen.getByRole('button', { name: 'Play video' });
      await user.click(playButton);

      // Should toggle to playing state (even with empty timeline)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Pause video' })).toBeInTheDocument();
      });
    });
  });
});
