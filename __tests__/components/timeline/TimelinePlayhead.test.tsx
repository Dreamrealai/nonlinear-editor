import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimelinePlayhead } from '@/components/timeline/TimelinePlayhead';

describe('TimelinePlayhead', () => {
  const defaultProps = {
    currentTime: 5,
    zoom: 100,
    onMouseDown: jest.fn(),
  };

  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the playhead component', () => {
      render(<TimelinePlayhead {...defaultProps} />);

      const playhead = screen.getByRole('slider');
      expect(playhead).toBeInTheDocument();
    });

    it('should render at correct position based on currentTime and zoom', () => {
      const { container } = render(
        <TimelinePlayhead {...defaultProps} currentTime={10} zoom={50} />
      );

      // Position should be currentTime * zoom = 10 * 50 = 500px
      const playhead = container.querySelector('[style*="left: 500px"]');
      expect(playhead).toBeInTheDocument();
    });

    it('should have correct visual styling', () => {
      const { container } = render(<TimelinePlayhead {...defaultProps} />);

      const line = container.querySelector('.bg-red-500.w-0\\.5');
      expect(line).toBeInTheDocument();

      const handle = container.querySelector('.rounded-full.bg-red-500');
      expect(handle).toBeInTheDocument();
    });
  });

  describe('Position Calculation', () => {
    it('should calculate position correctly with different zoom levels', () => {
      const { container, rerender } = render(
        <TimelinePlayhead {...defaultProps} currentTime={5} zoom={100} />
      );

      let playhead = container.querySelector('[style*="left: 500px"]');
      expect(playhead).toBeInTheDocument();

      rerender(<TimelinePlayhead {...defaultProps} currentTime={5} zoom={200} />);

      playhead = container.querySelector('[style*="left: 1000px"]');
      expect(playhead).toBeInTheDocument();
    });

    it('should update position when currentTime changes', () => {
      const { container, rerender } = render(
        <TimelinePlayhead {...defaultProps} currentTime={5} zoom={100} />
      );

      let playhead = container.querySelector('[style*="left: 500px"]');
      expect(playhead).toBeInTheDocument();

      rerender(<TimelinePlayhead {...defaultProps} currentTime={15} zoom={100} />);

      playhead = container.querySelector('[style*="left: 1500px"]');
      expect(playhead).toBeInTheDocument();
    });

    it('should handle zero current time', () => {
      const { container } = render(
        <TimelinePlayhead {...defaultProps} currentTime={0} zoom={100} />
      );

      const playhead = container.querySelector('[style*="left: 0px"]');
      expect(playhead).toBeInTheDocument();
    });

    it('should handle fractional current time', () => {
      const { container } = render(
        <TimelinePlayhead {...defaultProps} currentTime={5.5} zoom={100} />
      );

      const playhead = container.querySelector('[style*="left: 550px"]');
      expect(playhead).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onMouseDown when handle is clicked', () => {
      const onMouseDown = jest.fn();
      render(<TimelinePlayhead {...defaultProps} onMouseDown={onMouseDown} />);

      const handle = screen.getByRole('slider');
      fireEvent.mouseDown(handle);

      expect(onMouseDown).toHaveBeenCalledTimes(1);
    });

    it('should pass mouse event to onMouseDown handler', () => {
      const onMouseDown = jest.fn();
      render(<TimelinePlayhead {...defaultProps} onMouseDown={onMouseDown} />);

      const handle = screen.getByRole('slider');
      const mouseEvent = new MouseEvent('mousedown', { bubbles: true });
      fireEvent(handle, mouseEvent);

      expect(onMouseDown).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should not call onMouseDown when line is clicked', () => {
      const onMouseDown = jest.fn();
      const { container } = render(
        <TimelinePlayhead {...defaultProps} onMouseDown={onMouseDown} />
      );

      const line = container.querySelector('.pointer-events-none');
      if (line) {
        fireEvent.mouseDown(line);
      }

      // The line has pointer-events-none, so the handler shouldn't be called
      expect(onMouseDown).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have slider role', () => {
      render(<TimelinePlayhead {...defaultProps} />);

      const playhead = screen.getByRole('slider');
      expect(playhead).toBeInTheDocument();
    });

    it('should have proper ARIA label', () => {
      render(<TimelinePlayhead {...defaultProps} />);

      const playhead = screen.getByRole('slider');
      expect(playhead).toHaveAttribute('aria-label', 'Timeline playhead');
    });

    it('should have correct ARIA value attributes', () => {
      render(<TimelinePlayhead {...defaultProps} currentTime={7.5} />);

      const playhead = screen.getByRole('slider');
      expect(playhead).toHaveAttribute('aria-valuenow', '750');
      expect(playhead).toHaveAttribute('aria-valuemin', '0');
      expect(playhead).toHaveAttribute('aria-valuemax', '10000');
    });

    it('should have descriptive aria-valuetext', () => {
      render(<TimelinePlayhead {...defaultProps} currentTime={12.34} />);

      const playhead = screen.getByRole('slider');
      expect(playhead).toHaveAttribute('aria-valuetext', 'Current time: 12.34 seconds');
    });

    it('should be keyboard focusable', () => {
      render(<TimelinePlayhead {...defaultProps} />);

      const playhead = screen.getByRole('slider');
      expect(playhead).toHaveAttribute('tabIndex', '0');
    });

    it('should update ARIA values when time changes', () => {
      const { rerender } = render(<TimelinePlayhead {...defaultProps} currentTime={5} />);

      let playhead = screen.getByRole('slider');
      expect(playhead).toHaveAttribute('aria-valuenow', '500');
      expect(playhead).toHaveAttribute('aria-valuetext', 'Current time: 5.00 seconds');

      rerender(<TimelinePlayhead {...defaultProps} currentTime={20} />);

      playhead = screen.getByRole('slider');
      expect(playhead).toHaveAttribute('aria-valuenow', '2000');
      expect(playhead).toHaveAttribute('aria-valuetext', 'Current time: 20.00 seconds');
    });
  });

  describe('Visual States', () => {
    it('should have grab cursor on handle', () => {
      render(<TimelinePlayhead {...defaultProps} />);

      const handle = screen.getByRole('slider');
      expect(handle).toHaveClass('cursor-grab');
    });

    it('should have grabbing cursor on active state', () => {
      render(<TimelinePlayhead {...defaultProps} />);

      const handle = screen.getByRole('slider');
      expect(handle).toHaveClass('active:cursor-grabbing');
    });

    it('should render as red color', () => {
      const { container } = render(<TimelinePlayhead {...defaultProps} />);

      const redElements = container.querySelectorAll('.bg-red-500');
      expect(redElements.length).toBeGreaterThan(0);
    });

    it('should position handle at top of line', () => {
      render(<TimelinePlayhead {...defaultProps} />);

      const handle = screen.getByRole('slider');
      expect(handle).toHaveClass('-top-1');
    });

    it('should center handle horizontally', () => {
      render(<TimelinePlayhead {...defaultProps} />);

      const handle = screen.getByRole('slider');
      expect(handle).toHaveClass('left-1/2');
      expect(handle).toHaveClass('-translate-x-1/2');
    });
  });

  describe('Z-index Layering', () => {
    it('should have high z-index to overlay other elements', () => {
      const { container } = render(<TimelinePlayhead {...defaultProps} />);

      const playhead = container.querySelector('.z-20');
      expect(playhead).toBeInTheDocument();
    });

    it('should have pointer-events-none on line but auto on handle', () => {
      const { container } = render(<TimelinePlayhead {...defaultProps} />);

      const line = container.querySelector('.pointer-events-none');
      expect(line).toBeInTheDocument();

      const handle = container.querySelector('.pointer-events-auto');
      expect(handle).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large time values', () => {
      const { container } = render(
        <TimelinePlayhead {...defaultProps} currentTime={1000} zoom={10} />
      );

      const playhead = container.querySelector('[style*="left: 10000px"]');
      expect(playhead).toBeInTheDocument();
    });

    it('should handle very small zoom values', () => {
      const { container } = render(
        <TimelinePlayhead {...defaultProps} currentTime={100} zoom={1} />
      );

      const playhead = container.querySelector('[style*="left: 100px"]');
      expect(playhead).toBeInTheDocument();
    });

    it('should handle very large zoom values', () => {
      const { container } = render(
        <TimelinePlayhead {...defaultProps} currentTime={5} zoom={1000} />
      );

      const playhead = container.querySelector('[style*="left: 5000px"]');
      expect(playhead).toBeInTheDocument();
    });

    it('should handle negative time values gracefully', () => {
      const { container } = render(
        <TimelinePlayhead {...defaultProps} currentTime={-5} zoom={100} />
      );

      // Should render at negative position
      const playhead = container.querySelector('[style*="left: -500px"]');
      expect(playhead).toBeInTheDocument();
    });
  });
});
