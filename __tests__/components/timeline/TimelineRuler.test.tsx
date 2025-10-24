import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimelineRuler } from '@/components/timeline/TimelineRuler';

// Mock TIMELINE_CONSTANTS
jest.mock('@/lib/constants/ui', () => ({
  TIMELINE_CONSTANTS: {
    RULER_HEIGHT: 40,
  },
}));

describe('TimelineRuler', () => {
  const defaultProps = {
    timelineDuration: 30,
    zoom: 100,
    currentTime: 5,
    onPlayheadMouseDown: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the ruler container', () => {
      const { container } = render(<TimelineRuler {...defaultProps} />);

      const ruler = container.querySelector('[style*="height"]');
      expect(ruler).toBeInTheDocument();
    });

    it('should render adaptive time markers based on zoom level', () => {
      const { container } = render(<TimelineRuler {...defaultProps} timelineDuration={10} zoom={100} />);

      // With zoom=100, MIN_LABEL_SPACING_PX=80, minInterval = 80/100 = 0.8s
      // Should use 1s intervals (next nice interval)
      // Expect markers at 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 (11 major markers)
      // Plus minor markers (5 between each major = 50 total markers)
      const markers = container.querySelectorAll('[class*="border-l"]');
      expect(markers.length).toBeGreaterThan(10);
    });

    it('should display adaptive time labels with appropriate format', () => {
      // At zoom=100, minInterval = 80/100 = 0.8s, next nice interval = 1s
      // 1s interval uses decimal seconds format
      render(<TimelineRuler {...defaultProps} timelineDuration={5} zoom={100} />);

      // Should show decimal seconds format
      expect(screen.getByText('0.0s')).toBeInTheDocument();
      expect(screen.getByText('1.0s')).toBeInTheDocument();
      expect(screen.getByText('2.0s')).toBeInTheDocument();
    });

    it('should render playhead at correct position', () => {
      const { container } = render(<TimelineRuler {...defaultProps} currentTime={10} zoom={100} />);

      const playhead = container.querySelector('[style*="left: 1000px"]');
      expect(playhead).toBeInTheDocument();
    });

    it('should calculate timeline width based on duration and zoom', () => {
      const { container } = render(
        <TimelineRuler {...defaultProps} timelineDuration={20} zoom={50} />
      );

      // Timeline width should be duration * zoom = 20 * 50 = 1000px
      const timeline = container.querySelector('[style*="width: 1000px"]');
      expect(timeline).toBeInTheDocument();
    });
  });

  describe('Playhead', () => {
    it('should render playhead with correct ARIA attributes', () => {
      render(<TimelineRuler {...defaultProps} currentTime={5} />);

      const playhead = screen.getByRole('slider');
      expect(playhead).toHaveAttribute('aria-label', 'Timeline ruler playhead');
      expect(playhead).toHaveAttribute('aria-valuenow', '500');
      expect(playhead).toHaveAttribute('aria-valuemin', '0');
      expect(playhead).toHaveAttribute('aria-valuemax', '10000');
      expect(playhead).toHaveAttribute('aria-valuetext', 'Current time: 5.00 seconds');
    });

    it('should call onPlayheadMouseDown when playhead is clicked', () => {
      const onPlayheadMouseDown = jest.fn();
      render(<TimelineRuler {...defaultProps} onPlayheadMouseDown={onPlayheadMouseDown} />);

      const playhead = screen.getByRole('slider');
      fireEvent.mouseDown(playhead);

      expect(onPlayheadMouseDown).toHaveBeenCalledTimes(1);
    });

    it('should update playhead position when currentTime changes', () => {
      const { container, rerender } = render(
        <TimelineRuler {...defaultProps} currentTime={5} zoom={100} />
      );

      let playhead = container.querySelector('[style*="left: 500px"]');
      expect(playhead).toBeInTheDocument();

      rerender(<TimelineRuler {...defaultProps} currentTime={15} zoom={100} />);

      playhead = container.querySelector('[style*="left: 1500px"]');
      expect(playhead).toBeInTheDocument();
    });

    it('should have keyboard accessibility', () => {
      render(<TimelineRuler {...defaultProps} />);

      const playhead = screen.getByRole('slider');
      expect(playhead).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Zoom Behavior', () => {
    it('should use larger intervals at low zoom levels to prevent overlap', () => {
      // At zoom=10 (MIN_ZOOM), MIN_LABEL_SPACING_PX=80, minInterval = 80/10 = 8s
      // Should use 10s intervals (next nice interval)
      const { container } = render(
        <TimelineRuler {...defaultProps} zoom={10} timelineDuration={60} />
      );

      // Should have fewer markers (every 10 seconds)
      // 0, 10, 20, 30, 40, 50, 60 = 7 major markers + minor ticks
      const markers = container.querySelectorAll('[class*="border-l"]');
      // With 10s major intervals and 2s minor intervals (10/5), we get many markers
      expect(markers.length).toBeGreaterThan(7);
    });

    it('should use smaller intervals at high zoom levels for precision', () => {
      // At zoom=200 (MAX_ZOOM), MIN_LABEL_SPACING_PX=80, minInterval = 80/200 = 0.4s
      // Should use 0.5s intervals (next nice interval)
      const { container } = render(
        <TimelineRuler {...defaultProps} zoom={200} timelineDuration={5} />
      );

      // Should have many markers (every 0.5 seconds)
      // 0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0 = 11 major markers
      const markers = container.querySelectorAll('[class*="border-l"]');
      expect(markers.length).toBeGreaterThan(10);
    });

    it('should adjust timeline width when zoom changes', () => {
      const { container, rerender } = render(
        <TimelineRuler {...defaultProps} timelineDuration={10} zoom={100} />
      );

      let timeline = container.querySelector('[style*="width: 1000px"]');
      expect(timeline).toBeInTheDocument();

      rerender(<TimelineRuler {...defaultProps} timelineDuration={10} zoom={200} />);

      timeline = container.querySelector('[style*="width: 2000px"]');
      expect(timeline).toBeInTheDocument();
    });

    it('should update playhead position proportionally with zoom', () => {
      const { container, rerender } = render(
        <TimelineRuler {...defaultProps} currentTime={10} zoom={50} />
      );

      let playhead = container.querySelector('[style*="left: 500px"]');
      expect(playhead).toBeInTheDocument();

      rerender(<TimelineRuler {...defaultProps} currentTime={10} zoom={100} />);

      playhead = container.querySelector('[style*="left: 1000px"]');
      expect(playhead).toBeInTheDocument();
    });
  });

  describe('Adaptive Label Format', () => {
    it('should use decimal seconds format at very high zoom', () => {
      // At zoom=200, interval=0.5s, should show "0.0s", "0.5s", "1.0s" format
      render(<TimelineRuler {...defaultProps} zoom={200} timelineDuration={2} />);

      // Expect decimal second labels
      expect(screen.getByText('0.0s')).toBeInTheDocument();
      expect(screen.getByText('0.5s')).toBeInTheDocument();
      expect(screen.getByText('1.0s')).toBeInTheDocument();
    });

    it('should use timecode format at medium zoom', () => {
      // At zoom=50, interval=2s, should show "0:00.00", "0:02.00" format
      render(<TimelineRuler {...defaultProps} zoom={50} timelineDuration={10} />);

      // Expect timecode labels
      expect(screen.getByText('0:00.00')).toBeInTheDocument();
      expect(screen.getByText('0:02.00')).toBeInTheDocument();
    });

    it('should use timecode with minutes at low zoom', () => {
      // At zoom=10, interval=10s, should show "0:00.00", "0:10.00", "0:20.00" format
      render(<TimelineRuler {...defaultProps} zoom={10} timelineDuration={60} />);

      // Expect timecode labels with minutes
      expect(screen.getByText('0:00.00')).toBeInTheDocument();
      expect(screen.getByText('0:10.00')).toBeInTheDocument();
      expect(screen.getByText('0:20.00')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration', () => {
      const { container } = render(<TimelineRuler {...defaultProps} timelineDuration={0} />);

      const timeline = container.querySelector('[style*="width: 0px"]');
      expect(timeline).toBeInTheDocument();
    });

    it('should handle zero current time', () => {
      const { container } = render(<TimelineRuler {...defaultProps} currentTime={0} />);

      const playhead = container.querySelector('[style*="left: 0px"]');
      expect(playhead).toBeInTheDocument();
    });

    it('should handle fractional current time', () => {
      render(<TimelineRuler {...defaultProps} currentTime={5.75} />);

      const playhead = screen.getByRole('slider');
      expect(playhead).toHaveAttribute('aria-valuetext', 'Current time: 5.75 seconds');
    });

    it('should handle very long duration', () => {
      const { container } = render(
        <TimelineRuler {...defaultProps} timelineDuration={300} zoom={10} />
      );

      // Timeline width should be 300 * 10 = 3000px
      const timeline = container.querySelector('[style*="width: 3000px"]');
      expect(timeline).toBeInTheDocument();
    });

    it('should handle very small zoom', () => {
      const { container } = render(
        <TimelineRuler {...defaultProps} timelineDuration={100} zoom={1} />
      );

      const timeline = container.querySelector('[style*="width: 100px"]');
      expect(timeline).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply sticky positioning to ruler', () => {
      const { container } = render(<TimelineRuler {...defaultProps} />);

      const ruler = container.firstChild as HTMLElement;
      expect(ruler).toHaveClass('sticky');
    });

    it('should have border styling on ruler', () => {
      const { container } = render(<TimelineRuler {...defaultProps} />);

      const ruler = container.firstChild as HTMLElement;
      expect(ruler).toHaveClass('border-b');
      expect(ruler).toHaveClass('border-neutral-300');
    });

    it('should style playhead as red', () => {
      const { container } = render(<TimelineRuler {...defaultProps} />);

      const playhead = container.querySelector('.bg-red-500');
      expect(playhead).toBeInTheDocument();
    });

    it('should have cursor styling on playhead', () => {
      render(<TimelineRuler {...defaultProps} />);

      const playhead = screen.getByRole('slider');
      expect(playhead).toHaveClass('cursor-grab');
      expect(playhead).toHaveClass('active:cursor-grabbing');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role for playhead', () => {
      render(<TimelineRuler {...defaultProps} />);

      const playhead = screen.getByRole('slider');
      expect(playhead).toBeInTheDocument();
    });

    it('should update ARIA values when time changes', () => {
      const { rerender } = render(<TimelineRuler {...defaultProps} currentTime={10} />);

      let playhead = screen.getByRole('slider');
      expect(playhead).toHaveAttribute('aria-valuenow', '1000');

      rerender(<TimelineRuler {...defaultProps} currentTime={25} />);

      playhead = screen.getByRole('slider');
      expect(playhead).toHaveAttribute('aria-valuenow', '2500');
    });

    it('should provide descriptive aria-valuetext', () => {
      render(<TimelineRuler {...defaultProps} currentTime={12.5} />);

      const playhead = screen.getByRole('slider');
      expect(playhead).toHaveAttribute('aria-valuetext', 'Current time: 12.50 seconds');
    });
  });
});
