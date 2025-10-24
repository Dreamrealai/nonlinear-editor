import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner } from '@/components/LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should have loading aria-label', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should have role status for accessibility', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render small size', () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveClass('w-4', 'h-4', 'border-2');
    });

    it('should render medium size by default', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveClass('w-6', 'h-6', 'border-2');
    });

    it('should render large size', () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveClass('w-8', 'h-8', 'border-3');
    });

    it('should render extra large size', () => {
      const { container } = render(<LoadingSpinner size="xl" />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveClass('w-12', 'h-12', 'border-4');
    });
  });

  describe('Text Display', () => {
    it('should display text when provided', () => {
      render(<LoadingSpinner text="Loading..." />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should not display text when not provided', () => {
      const { container } = render(<LoadingSpinner />);
      const textElement = container.querySelector('span');
      expect(textElement).not.toBeInTheDocument();
    });

    it('should style text correctly', () => {
      render(<LoadingSpinner text="Please wait" />);
      const textElement = screen.getByText('Please wait');
      expect(textElement).toHaveClass('text-sm', 'text-gray-600');
    });

    it('should display custom text', () => {
      render(<LoadingSpinner text="Custom loading message" />);
      expect(screen.getByText('Custom loading message')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should accept custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('should combine custom className with default classes', () => {
      const { container } = render(<LoadingSpinner className="mt-4" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'items-center', 'gap-2', 'mt-4');
    });

    it('should apply multiple custom classes', () => {
      const { container } = render(<LoadingSpinner className="mt-4 mb-4 mx-auto" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('mt-4', 'mb-4', 'mx-auto');
    });
  });

  describe('Animation', () => {
    it('should have spin animation class', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should have rounded-full class', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveClass('rounded-full');
    });

    it('should have correct border colors', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveClass('border-gray-300', 'border-t-blue-600');
    });
  });

  describe('Layout', () => {
    it('should have flex layout', () => {
      const { container } = render(<LoadingSpinner />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex');
    });

    it('should align items center', () => {
      const { container } = render(<LoadingSpinner />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('items-center');
    });

    it('should have gap between spinner and text', () => {
      const { container } = render(<LoadingSpinner text="Loading" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('gap-2');
    });
  });

  describe('Combined Props', () => {
    it('should render with all props', () => {
      const { container } = render(
        <LoadingSpinner size="lg" text="Processing..." className="my-custom-class" />
      );

      const wrapper = container.firstChild;
      const spinner = container.querySelector('[role="status"]');

      expect(wrapper).toHaveClass('my-custom-class');
      expect(spinner).toHaveClass('w-8', 'h-8');
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should work with size and text', () => {
      const { container } = render(<LoadingSpinner size="sm" text="Loading..." />);
      const spinner = container.querySelector('[role="status"]');

      expect(spinner).toHaveClass('w-4', 'h-4');
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should work with size and className', () => {
      const { container } = render(<LoadingSpinner size="xl" className="mt-8" />);
      const spinner = container.querySelector('[role="status"]');
      const wrapper = container.firstChild;

      expect(spinner).toHaveClass('w-12', 'h-12');
      expect(wrapper).toHaveClass('mt-8');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text prop', () => {
      const { container } = render(<LoadingSpinner text="" />);
      const textElement = container.querySelector('span');
      expect(textElement).not.toBeInTheDocument();
    });

    it('should handle whitespace text', () => {
      render(<LoadingSpinner text="   " />);
      const whitespaceSpans = screen.getAllByText((_, element) => element?.textContent === '   ');
      expect(whitespaceSpans.length).toBeGreaterThan(0);
    });

    it('should handle undefined className gracefully', () => {
      const { container } = render(<LoadingSpinner className={undefined} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'items-center', 'gap-2');
    });

    it('should handle long text', () => {
      const longText = 'This is a very long loading message that might wrap to multiple lines';
      render(<LoadingSpinner text={longText} />);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });

  describe('Snapshot Consistency', () => {
    it('should maintain structure with default props', () => {
      const { container } = render(<LoadingSpinner />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should maintain structure with all props', () => {
      const { container } = render(
        <LoadingSpinner size="lg" text="Loading data..." className="custom-spinner" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
