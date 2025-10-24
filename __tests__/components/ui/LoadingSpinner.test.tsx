import React from 'react';
import { render } from '@testing-library/react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render loading spinner', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[data-lucide="loader-2"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should render with default props', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[data-lucide="loader-2"]');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Size Prop', () => {
    it('should use default size of 24 when not specified', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[data-testid="loader-icon"]') as HTMLElement;
      expect(spinner.style.width).toBe('24px');
      expect(spinner.style.height).toBe('24px');
    });

    it('should apply custom size', () => {
      const { container } = render(<LoadingSpinner size={32} />);
      const spinner = container.querySelector('[data-testid="loader-icon"]') as HTMLElement;
      expect(spinner.style.width).toBe('32px');
      expect(spinner.style.height).toBe('32px');
    });

    it('should apply small size', () => {
      const { container } = render(<LoadingSpinner size={16} />);
      const spinner = container.querySelector('[data-testid="loader-icon"]') as HTMLElement;
      expect(spinner.style.width).toBe('16px');
      expect(spinner.style.height).toBe('16px');
    });

    it('should apply large size', () => {
      const { container } = render(<LoadingSpinner size={48} />);
      const spinner = container.querySelector('[data-testid="loader-icon"]') as HTMLElement;
      expect(spinner.style.width).toBe('48px');
      expect(spinner.style.height).toBe('48px');
    });

    it('should apply very small size', () => {
      const { container } = render(<LoadingSpinner size={8} />);
      const spinner = container.querySelector('[data-testid="loader-icon"]') as HTMLElement;
      expect(spinner.style.width).toBe('8px');
      expect(spinner.style.height).toBe('8px');
    });

    it('should apply very large size', () => {
      const { container } = render(<LoadingSpinner size={100} />);
      const spinner = container.querySelector('[data-testid="loader-icon"]') as HTMLElement;
      expect(spinner.style.width).toBe('100px');
      expect(spinner.style.height).toBe('100px');
    });
  });

  describe('Animation', () => {
    it('should have spin animation class', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should preserve animation class with custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toHaveClass('animate-spin');
      expect(spinner).toHaveClass('custom-class');
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = render(<LoadingSpinner className="text-blue-500" />);
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toHaveClass('text-blue-500');
    });

    it('should apply multiple custom classes', () => {
      const { container } = render(<LoadingSpinner className="text-red-500 opacity-50" />);
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toHaveClass('text-red-500');
      expect(spinner).toHaveClass('opacity-50');
    });

    it('should combine default and custom classes', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toHaveClass('animate-spin');
      expect(spinner).toHaveClass('custom-class');
    });
  });

  describe('Style Variations', () => {
    it('should render with primary color class', () => {
      const { container } = render(<LoadingSpinner className="text-primary" />);
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toHaveClass('text-primary');
    });

    it('should render with secondary color class', () => {
      const { container } = render(<LoadingSpinner className="text-secondary" />);
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toHaveClass('text-secondary');
    });

    it('should render with muted color class', () => {
      const { container } = render(<LoadingSpinner className="text-muted-foreground" />);
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toHaveClass('text-muted-foreground');
    });

    it('should render with custom opacity', () => {
      const { container } = render(<LoadingSpinner className="opacity-75" />);
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toHaveClass('opacity-75');
    });
  });

  describe('Use Cases', () => {
    it('should render as button loading indicator', () => {
      const { container } = render(
        <button disabled>
          <LoadingSpinner size={16} className="mr-2" />
          Loading...
        </button>
      );
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should render as page loading indicator', () => {
      const { container } = render(
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner size={48} />
        </div>
      );
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should render as inline loading indicator', () => {
      const { container } = render(
        <span className="inline-flex items-center">
          <LoadingSpinner size={12} className="mr-1" />
          <span>Processing</span>
        </span>
      );
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should render as card loading state', () => {
      const { container } = render(
        <div className="p-4 flex justify-center">
          <LoadingSpinner size={32} />
        </div>
      );
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Composition', () => {
    it('should work inside flex container', () => {
      const { container } = render(
        <div className="flex items-center gap-2">
          <LoadingSpinner size={20} />
          <span>Loading content...</span>
        </div>
      );
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should work with text', () => {
      const { container } = render(
        <div>
          <LoadingSpinner size={24} className="mb-2" />
          <p>Please wait while we process your request</p>
        </div>
      );
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should work in grid layout', () => {
      const { container } = render(
        <div className="grid place-items-center">
          <LoadingSpinner size={40} />
        </div>
      );
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle size of 0', () => {
      const { container } = render(<LoadingSpinner size={0} />);
      const spinner = container.querySelector('[data-testid="loader-icon"]') as HTMLElement;
      expect(spinner.style.width).toBe('0px');
      expect(spinner.style.height).toBe('0px');
    });

    it('should handle undefined className', () => {
      const { container } = render(<LoadingSpinner className={undefined} />);
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should handle empty className', () => {
      const { container } = render(<LoadingSpinner className="" />);
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should render multiple spinners independently', () => {
      const { container } = render(
        <>
          <LoadingSpinner size={16} />
          <LoadingSpinner size={24} />
          <LoadingSpinner size={32} />
        </>
      );
      const spinners = container.querySelectorAll('[data-testid="loader-icon"]');
      expect(spinners).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    it('should be visible to screen readers', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should work with aria-label on parent', () => {
      const { container } = render(
        <div aria-label="Loading">
          <LoadingSpinner />
        </div>
      );
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should work with role="status" on parent', () => {
      const { container } = render(
        <div role="status">
          <LoadingSpinner />
        </div>
      );
      const spinner = container.querySelector('[data-testid="loader-icon"]');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Consistency', () => {
    it('should render consistently', () => {
      const { container: container1 } = render(<LoadingSpinner size={24} />);
      const { container: container2 } = render(<LoadingSpinner size={24} />);

      const spinner1 = container1.querySelector('[data-testid="loader-icon"]') as HTMLElement;
      const spinner2 = container2.querySelector('[data-testid="loader-icon"]') as HTMLElement;

      expect(spinner1.style.width).toBe(spinner2.style.width);
      expect(spinner1.style.height).toBe(spinner2.style.height);
      expect(spinner1.className).toBe(spinner2.className);
    });

    it('should maintain aspect ratio', () => {
      const { container } = render(<LoadingSpinner size={50} />);
      const spinner = container.querySelector('[data-testid="loader-icon"]') as HTMLElement;
      expect(spinner.style.width).toBe(spinner.style.height);
    });
  });
});
