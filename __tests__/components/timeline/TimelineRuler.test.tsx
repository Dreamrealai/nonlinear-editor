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

    it('should render time markers for each second', () => {
      const { container } = render(<TimelineRuler {...defaultProps} timelineDuration={10} />);

      // Should have markers for 0s, 1s, 2s, ..., 10s (11 markers total)
      const markers = container.querySelectorAll('span');
      expect(markers.length).toBeGreaterThanOrEqual(11);
    });

    it('should display correct time labels on markers', () => {
      render(<TimelineRuler {...defaultProps} timelineDuration={5} />);

      expect(screen.getByText('0s')).toBeInTheDocument();
      expect(screen.getByText('1s')).toBeInTheDocument();
      expect(screen.getByText('2s')).toBeInTheDocument();
      expect(screen.getByText('3s')).toBeInTheDocument();
      expect(screen.getByText('4s')).toBeInTheDocument();
      expect(screen.getByText('5s')).toBeInTheDocument();
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
    it('should adjust marker spacing when zoom changes', () => {
      const { container } = render(
        <TimelineRuler {...defaultProps} zoom={100} timelineDuration={5} />
      );

      // At zoom 100, markers should be 100px apart
      const markers = container.querySelectorAll('[style*="left"]');
      const firstMarker = markers[0] as HTMLElement;
      const secondMarker = markers[1] as HTMLElement;

      expect(firstMarker.style.left).toBe('0px');
      expect(secondMarker.style.left).toBe('100px');
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
