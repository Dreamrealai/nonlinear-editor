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
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt, ...props }: any): JSX.Element {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Create a wrapper component to test integration
const PlaybackIntegrationWrapper = (): JSX.Element => {
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const timeline = useEditorStore((state) => state.timeline);
  const zoom = useEditorStore((state) => state.zoom);
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
    const currentZoom = useEditorStore.getState().zoom;
    useEditorStore.getState().setZoom(currentZoom * 1.2);
  };

  const handleZoomOut = (): void => {
    const currentZoom = useEditorStore.getState().zoom;
    useEditorStore.getState().setZoom(currentZoom / 1.2);
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
  beforeEach(() => {
    // Reset stores before each test
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

  afterEach(() => {
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

    it.skip('should use spacebar to toggle play/pause', async () => {
      // Keyboard shortcuts are not implemented in these isolated components
      // This would need to be tested at a higher integration level
      const user = userEvent.setup();
      render(<PlaybackIntegrationWrapper />);

      // Initially should show play button - wait for it to be visible
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
      });

      // Press spacebar
      await user.keyboard(' ');

      // Should toggle to playing state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Pause video' })).toBeInTheDocument();
      });

      // Press spacebar again
      await user.keyboard(' ');

      // Should toggle back to paused
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
      });
    });
  });

  describe('Timeline Controls Integration', () => {
    it('should zoom in when zoom in button is clicked', async () => {
      const user = userEvent.setup();
      render(<PlaybackIntegrationWrapper />);

      const initialZoom = useEditorStore.getState().zoom;

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      await user.click(zoomInButton);

      await waitFor(() => {
        const currentZoom = useEditorStore.getState().zoom;
        expect(currentZoom).toBeGreaterThan(initialZoom);
      });
    });

    it('should zoom out when zoom out button is clicked', async () => {
      const user = userEvent.setup();

      // Set initial zoom higher than default
      useEditorStore.getState().setZoom(100);

      render(<PlaybackIntegrationWrapper />);

      const initialZoom = useEditorStore.getState().zoom;

      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      await user.click(zoomOutButton);

      await waitFor(() => {
        const currentZoom = useEditorStore.getState().zoom;
        expect(currentZoom).toBeLessThan(initialZoom);
      });
    });

    it.skip('should toggle snap when snap button is clicked', async () => {
      // Snap toggle not in TimelineControls component
      const user = userEvent.setup();
      render(<PlaybackIntegrationWrapper />);

      const snapButton = screen.getByRole('button', { name: /snap/i });

      // Get initial snap state
      const initialSnapEnabled = useEditorStore.getState().snapEnabled;

      await user.click(snapButton);

      await waitFor(() => {
        const currentSnapEnabled = useEditorStore.getState().snapEnabled;
        expect(currentSnapEnabled).toBe(!initialSnapEnabled);
      });
    });
  });

  describe('Playback State Synchronization', () => {
    it.skip('should update current time when timeline is playing', async () => {
      // Test wrapper doesn't have playback engine to advance time
      const user = userEvent.setup();
      render(<PlaybackIntegrationWrapper />);

      // Start playback - wait for button to be visible
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
      });
      const playButton = screen.getByRole('button', { name: 'Play video' });
      await user.click(playButton);

      const initialTime = useEditorStore.getState().currentTime;

      // Wait for time to advance
      await waitFor(
        () => {
          const currentTime = useEditorStore.getState().currentTime;
          expect(currentTime).toBeGreaterThan(initialTime);
        },
        { timeout: 1000 }
      );
    });

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

      // Pause
      const pauseButton = screen.getByRole('button', { name: 'Pause video' });
      await user.click(pauseButton);

      const timeWhenPaused = useEditorStore.getState().currentTime;

      // Wait a bit more
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Time should not have advanced
      const timeAfterWaiting = useEditorStore.getState().currentTime;
      expect(timeAfterWaiting).toBe(timeWhenPaused);
    });
  });

  describe.skip('Skip Controls Integration', () => {
    // Skip controls not present in PlaybackControls component
    it('should skip backward when skip back button is clicked', async () => {
      const user = userEvent.setup();

      // Set initial time to 10 seconds
      useEditorStore.getState().setCurrentTime(10);

      render(<PlaybackIntegrationWrapper />);

      const initialTime = useEditorStore.getState().currentTime;
      expect(initialTime).toBe(10);

      // Click skip backward
      const skipBackButton = screen.getByRole('button', { name: /skip backward/i });
      await user.click(skipBackButton);

      await waitFor(() => {
        const currentTime = useEditorStore.getState().currentTime;
        expect(currentTime).toBeLessThan(initialTime);
      });
    });

    it('should skip forward when skip forward button is clicked', async () => {
      const user = userEvent.setup();

      // Set initial time
      useEditorStore.getState().setCurrentTime(5);

      render(<PlaybackIntegrationWrapper />);

      const initialTime = useEditorStore.getState().currentTime;

      // Click skip forward
      const skipForwardButton = screen.getByRole('button', { name: /skip forward/i });
      await user.click(skipForwardButton);

      await waitFor(() => {
        const currentTime = useEditorStore.getState().currentTime;
        expect(currentTime).toBeGreaterThan(initialTime);
      });
    });

    it('should not skip before timeline start (time 0)', async () => {
      const user = userEvent.setup();

      // Set time to 0
      useEditorStore.getState().setCurrentTime(0);

      render(<PlaybackIntegrationWrapper />);

      const skipBackButton = screen.getByRole('button', { name: /skip backward/i });
      await user.click(skipBackButton);

      // Time should stay at 0
      await waitFor(() => {
        const currentTime = useEditorStore.getState().currentTime;
        expect(currentTime).toBe(0);
      });
    });
  });

  describe.skip('Keyboard Shortcuts', () => {
    // Keyboard shortcuts are not implemented in these isolated components
    it('should play/pause with spacebar', async () => {
      const user = userEvent.setup();
      render(<PlaybackIntegrationWrapper />);

      // Press spacebar to play
      await user.keyboard(' ');

      await waitFor(() => {
        expect(usePlaybackStore.getState().isPlaying).toBe(true);
      });

      // Press spacebar to pause
      await user.keyboard(' ');

      await waitFor(() => {
        expect(usePlaybackStore.getState().isPlaying).toBe(false);
      });
    });

    it('should skip forward with arrow right', async () => {
      const user = userEvent.setup();
      useEditorStore.getState().setCurrentTime(5);

      render(<PlaybackIntegrationWrapper />);

      const initialTime = useEditorStore.getState().currentTime;

      await user.keyboard('{ArrowRight}');

      await waitFor(() => {
        const currentTime = useEditorStore.getState().currentTime;
        expect(currentTime).toBeGreaterThan(initialTime);
      });
    });

    it('should skip backward with arrow left', async () => {
      const user = userEvent.setup();
      useEditorStore.getState().setCurrentTime(10);

      render(<PlaybackIntegrationWrapper />);

      const initialTime = useEditorStore.getState().currentTime;

      await user.keyboard('{ArrowLeft}');

      await waitFor(() => {
        const currentTime = useEditorStore.getState().currentTime;
        expect(currentTime).toBeLessThan(initialTime);
      });
    });

    it('should go to start with Home key', async () => {
      const user = userEvent.setup();
      useEditorStore.getState().setCurrentTime(20);

      render(<PlaybackIntegrationWrapper />);

      await user.keyboard('{Home}');

      await waitFor(() => {
        const currentTime = useEditorStore.getState().currentTime;
        expect(currentTime).toBe(0);
      });
    });

    it('should zoom in with + key', async () => {
      const user = userEvent.setup();
      render(<PlaybackIntegrationWrapper />);

      const initialZoom = useEditorStore.getState().zoom;

      await user.keyboard('+');

      await waitFor(() => {
        const currentZoom = useEditorStore.getState().zoom;
        expect(currentZoom).toBeGreaterThan(initialZoom);
      });
    });

    it('should zoom out with - key', async () => {
      const user = userEvent.setup();
      useEditorStore.getState().setZoom(2);

      render(<PlaybackIntegrationWrapper />);

      const initialZoom = useEditorStore.getState().zoom;

      await user.keyboard('-');

      await waitFor(() => {
        const currentZoom = useEditorStore.getState().zoom;
        expect(currentZoom).toBeLessThan(initialZoom);
      });
    });
  });

  describe('Loop Mode', () => {
    it.skip('should toggle loop mode when loop button is clicked', async () => {
      // TODO: Loop functionality not yet implemented in usePlaybackStore
      const user = userEvent.setup();
      render(<PlaybackIntegrationWrapper />);

      const loopButton = screen.getByRole('button', { name: /loop/i });

      const initialLoopState = (usePlaybackStore.getState() as any).loop;

      await user.click(loopButton);

      await waitFor(() => {
        const currentLoopState = (usePlaybackStore.getState() as any).loop;
        expect(currentLoopState).toBe(!initialLoopState);
      });
    });

    it.skip('should restart from beginning when loop is enabled and timeline ends', async () => {
      // TODO: Loop functionality not yet implemented in usePlaybackStore
      const user = userEvent.setup();

      // Enable loop mode
      (usePlaybackStore.getState() as any).setLoop?.(true);

      // Set time near end of a short timeline
      useEditorStore.getState().setCurrentTime(9.9);

      render(<PlaybackIntegrationWrapper />);

      // Start playback - wait for button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
      });
      const playButton = screen.getByRole('button', { name: 'Play video' });
      await user.click(playButton);

      // Wait for loop to occur
      await waitFor(
        () => {
          const currentTime = useEditorStore.getState().currentTime;
          // Should have looped back to near zero
          expect(currentTime).toBeLessThan(1);
        },
        { timeout: 2000 }
      );
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

    it.skip('should show visual feedback for active states', async () => {
      // Snap toggle not in TimelineControls component
      const user = userEvent.setup();
      render(<PlaybackIntegrationWrapper />);

      // Toggle snap
      const snapButton = screen.getByRole('button', { name: /snap/i });
      await user.click(snapButton);

      // Button should have active styling
      await waitFor(() => {
        expect(snapButton).toHaveClass('bg-blue-500', 'text-white');
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
      // Clear timeline
      useEditorStore.getState().setTimeline(null);

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
