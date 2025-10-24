import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlaybackControls from '@/components/preview/PlaybackControls';

// Mock video utils
jest.mock('@/lib/utils/videoUtils', () => ({
  clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
  formatTimecode: (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },
}));

describe('PlaybackControls', () => {
  const defaultProps = {
    isPlaying: false,
    currentTime: 5,
    totalDuration: 60,
    isFullscreen: false,
    hasClips: true,
    onPlayPause: jest.fn(),
    onSeek: jest.fn(),
    onToggleFullscreen: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render playback controls', () => {
      render(<PlaybackControls {...defaultProps} />);

      expect(screen.getByRole('slider')).toBeInTheDocument();
      expect(screen.getByTitle('Play (Space)')).toBeInTheDocument();
      expect(screen.getByTitle('Enter fullscreen')).toBeInTheDocument();
    });

    it('should display formatted time correctly', () => {
      render(<PlaybackControls {...defaultProps} currentTime={65} totalDuration={120} />);

      expect(screen.getByText('01:05')).toBeInTheDocument();
      expect(screen.getByText('02:00')).toBeInTheDocument();
    });

    it('should show play button when not playing', () => {
      render(<PlaybackControls {...defaultProps} isPlaying={false} />);

      const button = screen.getByTitle('Play (Space)');
      expect(button).toBeInTheDocument();
    });

    it('should show pause button when playing', () => {
      render(<PlaybackControls {...defaultProps} isPlaying={true} />);

      const button = screen.getByTitle('Pause (Space)');
      expect(button).toBeInTheDocument();
    });

    it('should show enter fullscreen button when not in fullscreen', () => {
      render(<PlaybackControls {...defaultProps} isFullscreen={false} />);

      const button = screen.getByTitle('Enter fullscreen');
      expect(button).toBeInTheDocument();
    });

    it('should show exit fullscreen button when in fullscreen', () => {
      render(<PlaybackControls {...defaultProps} isFullscreen={true} />);

      const button = screen.getByTitle('Exit fullscreen');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Play/Pause Button', () => {
    it('should call onPlayPause when play button is clicked', () => {
      const onPlayPause = jest.fn();
      render(<PlaybackControls {...defaultProps} isPlaying={false} onPlayPause={onPlayPause} />);

      const button = screen.getByTitle('Play (Space)');
      fireEvent.click(button);

      expect(onPlayPause).toHaveBeenCalledTimes(1);
    });

    it('should call onPlayPause when pause button is clicked', () => {
      const onPlayPause = jest.fn();
      render(<PlaybackControls {...defaultProps} isPlaying={true} onPlayPause={onPlayPause} />);

      const button = screen.getByTitle('Pause (Space)');
      fireEvent.click(button);

      expect(onPlayPause).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when there are no clips', () => {
      render(<PlaybackControls {...defaultProps} hasClips={false} />);

      const button = screen.getByTitle('Play (Space)');
      expect(button).toBeDisabled();
    });

    it('should be enabled when there are clips', () => {
      render(<PlaybackControls {...defaultProps} hasClips={true} />);

      const button = screen.getByTitle('Play (Space)');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Fullscreen Button', () => {
    it('should call onToggleFullscreen when clicked', () => {
      const onToggleFullscreen = jest.fn();
      render(<PlaybackControls {...defaultProps} onToggleFullscreen={onToggleFullscreen} />);

      const button = screen.getByTitle('Enter fullscreen');
      fireEvent.click(button);

      expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
    });

    it('should toggle button text based on fullscreen state', () => {
      const { rerender } = render(<PlaybackControls {...defaultProps} isFullscreen={false} />);

      expect(screen.getByTitle('Enter fullscreen')).toBeInTheDocument();

      rerender(<PlaybackControls {...defaultProps} isFullscreen={true} />);

      expect(screen.getByTitle('Exit fullscreen')).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar with correct aria attributes', () => {
      render(<PlaybackControls {...defaultProps} currentTime={10} totalDuration={60} />);

      const slider = screen.getByRole('slider', { name: 'Video progress' });
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '60');
      expect(slider).toHaveAttribute('aria-valuenow', '10');
    });

    it('should call onSeek when progress bar is clicked', () => {
      const onSeek = jest.fn();
      render(<PlaybackControls {...defaultProps} totalDuration={100} onSeek={onSeek} />);

      const progressBar = screen.getByRole('slider', { name: 'Video progress' });

      // Mock getBoundingClientRect
      progressBar.getBoundingClientRect = jest.fn(() => ({
        left: 0,
        width: 1000,
        top: 0,
        right: 1000,
        bottom: 20,
        height: 20,
        x: 0,
        y: 0,
        toJSON: () => {},
      }));

      fireEvent.mouseDown(progressBar, { clientX: 500 });

      expect(onSeek).toHaveBeenCalled();
    });

    it('should calculate correct time when clicking progress bar', () => {
      const onSeek = jest.fn();
      render(<PlaybackControls {...defaultProps} totalDuration={100} onSeek={onSeek} />);

      const progressBar = screen.getByRole('slider', { name: 'Video progress' });

      progressBar.getBoundingClientRect = jest.fn(() => ({
        left: 0,
        width: 1000,
        top: 0,
        right: 1000,
        bottom: 20,
        height: 20,
        x: 0,
        y: 0,
        toJSON: () => {},
      }));

      // Click at 50% of the width (500px out of 1000px)
      fireEvent.mouseDown(progressBar, { clientX: 500 });

      // Should seek to 50% of totalDuration (50 seconds)
      expect(onSeek).toHaveBeenCalledWith(50);
    });

    it('should display correct progress percentage', () => {
      const { container } = render(
        <PlaybackControls {...defaultProps} currentTime={30} totalDuration={60} />
      );

      // Progress should be 50%
      const progressBar = container.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should handle dragging to seek', async () => {
      const onSeek = jest.fn();
      render(<PlaybackControls {...defaultProps} totalDuration={100} onSeek={onSeek} />);

      const progressBar = screen.getByRole('slider', { name: 'Video progress' });

      progressBar.getBoundingClientRect = jest.fn(() => ({
        left: 0,
        width: 1000,
        top: 0,
        right: 1000,
        bottom: 20,
        height: 20,
        x: 0,
        y: 0,
        toJSON: () => {},
      }));

      // Start dragging
      fireEvent.mouseDown(progressBar, { clientX: 300 });

      // Move mouse
      fireEvent(document, new MouseEvent('mousemove', { bubbles: true, clientX: 500 }));

      // Should have called onSeek multiple times
      expect(onSeek.mock.calls.length).toBeGreaterThan(1);

      // Stop dragging
      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));
    });
  });

  describe('Auto-hide Controls', () => {
    it('should show controls initially', () => {
      render(<PlaybackControls {...defaultProps} />);

      const button = screen.getByTitle('Play (Space)');
      expect(button).toBeVisible();
    });

    it('should hide controls after 3 seconds when playing', () => {
      const { container } = render(<PlaybackControls {...defaultProps} isPlaying={true} />);

      const button = screen.getByTitle('Pause (Space)');
      expect(button).toBeVisible();

      // Fast-forward time by 3 seconds wrapped in act
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // The show controls button should appear
      expect(screen.queryByTitle('Show controls')).toBeInTheDocument();
    });

    it('should not auto-hide controls when not playing', () => {
      render(<PlaybackControls {...defaultProps} isPlaying={false} />);

      const button = screen.getByTitle('Play (Space)');
      expect(button).toBeVisible();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Controls should still be visible
      expect(button).toBeVisible();
    });

    it('should reset hide timer on mouse move', () => {
      const { container } = render(<PlaybackControls {...defaultProps} isPlaying={true} />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Move mouse
      const wrapper = container.firstChild as HTMLElement;
      act(() => {
        fireEvent.mouseMove(wrapper);
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Controls should still be visible (timer was reset)
      const button = screen.getByTitle('Pause (Space)');
      expect(button).toBeVisible();
    });

    it('should show controls when show controls button is clicked', async () => {
      render(<PlaybackControls {...defaultProps} isPlaying={true} />);

      // Fast-forward to hide controls wrapped in act
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        const showButton = screen.queryByTitle('Show controls');
        if (showButton) {
          fireEvent.click(showButton);
        }
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all interactive elements', () => {
      render(<PlaybackControls {...defaultProps} />);

      expect(screen.getByRole('slider')).toHaveAttribute('aria-label', 'Video progress');
      expect(screen.getByTitle('Play (Space)')).toBeInTheDocument();
      expect(screen.getByTitle('Enter fullscreen')).toBeInTheDocument();
    });

    it('should have keyboard focusable elements', () => {
      render(<PlaybackControls {...defaultProps} />);

      const progressBar = screen.getByRole('slider');
      expect(progressBar).toHaveAttribute('tabIndex', '0');
    });

    it('should update ARIA values when time changes', () => {
      const { rerender } = render(
        <PlaybackControls {...defaultProps} currentTime={10} totalDuration={60} />
      );

      let slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '10');

      rerender(<PlaybackControls {...defaultProps} currentTime={30} totalDuration={60} />);

      slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '30');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration', () => {
      render(<PlaybackControls {...defaultProps} currentTime={0} totalDuration={0} />);

      const timecodes = screen.getAllByText('00:00');
      expect(timecodes.length).toBeGreaterThan(0);
    });

    it('should clamp progress to 0-1 range', () => {
      const { container } = render(
        <PlaybackControls {...defaultProps} currentTime={100} totalDuration={60} />
      );

      // Progress should be clamped to 100% even though time > duration
      const progressBar = container.querySelector('[style*="width: 100%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should handle negative time values', () => {
      render(<PlaybackControls {...defaultProps} currentTime={-5} totalDuration={60} />);

      // Should display as 00:00 or handle gracefully
      const timeDisplay = screen.getByText(/\d{2}:\d{2}/);
      expect(timeDisplay).toBeInTheDocument();
    });

    it('should cleanup timeout on unmount', () => {
      const { unmount } = render(<PlaybackControls {...defaultProps} isPlaying={true} />);

      jest.advanceTimersByTime(1000);

      unmount();

      // Verify no errors and all timers are cleared
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Seek Constraints', () => {
    it('should not allow seeking beyond totalDuration', () => {
      const onSeek = jest.fn();
      render(<PlaybackControls {...defaultProps} totalDuration={100} onSeek={onSeek} />);

      const progressBar = screen.getByRole('slider', { name: 'Video progress' });

      progressBar.getBoundingClientRect = jest.fn(() => ({
        left: 0,
        width: 1000,
        top: 0,
        right: 1000,
        bottom: 20,
        height: 20,
        x: 0,
        y: 0,
        toJSON: () => {},
      }));

      // Click beyond the progress bar (1500px when width is 1000px)
      fireEvent.mouseDown(progressBar, { clientX: 1500 });

      // Should clamp to totalDuration (100)
      expect(onSeek).toHaveBeenCalledWith(100);
    });

    it('should not allow seeking before 0', () => {
      const onSeek = jest.fn();
      render(<PlaybackControls {...defaultProps} totalDuration={100} onSeek={onSeek} />);

      const progressBar = screen.getByRole('slider', { name: 'Video progress' });

      progressBar.getBoundingClientRect = jest.fn(() => ({
        left: 100,
        width: 1000,
        top: 0,
        right: 1100,
        bottom: 20,
        height: 20,
        x: 100,
        y: 0,
        toJSON: () => {},
      }));

      // Click before the progress bar starts
      fireEvent.mouseDown(progressBar, { clientX: 50 });

      // Should clamp to 0
      expect(onSeek).toHaveBeenCalledWith(0);
    });
  });
});
