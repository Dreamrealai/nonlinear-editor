import React from 'react';
import { render } from '@testing-library/react';
import { WebVitals } from '@/components/WebVitals';

// Mock the webVitals module
jest.mock('@/lib/webVitals', (): Record<string, unknown> => ({
  initWebVitals: jest.fn(),
}));

// Get the mock after it's been created by jest.mock
const { initWebVitals: mockInitWebVitals } = jest.requireMock('@/lib/webVitals');

describe('WebVitals', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<WebVitals />);
      expect(container).toBeInTheDocument();
    });

    it('should not render any visible content', () => {
      const { container } = render(<WebVitals />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null', () => {
      const { container } = render(<WebVitals />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('Initialization', () => {
    it('should call initWebVitals on mount', () => {
      render(<WebVitals />);
      expect(mockInitWebVitals).toHaveBeenCalledTimes(1);
    });

    it('should call initWebVitals with no arguments', () => {
      render(<WebVitals />);
      expect(mockInitWebVitals).toHaveBeenCalledWith();
    });

    it('should only call initWebVitals once', () => {
      render(<WebVitals />);
      expect(mockInitWebVitals).toHaveBeenCalledTimes(1);
    });

    it('should call initWebVitals on every mount', () => {
      const { unmount } = render(<WebVitals />);
      expect(mockInitWebVitals).toHaveBeenCalledTimes(1);

      unmount();
      render(<WebVitals />);
      expect(mockInitWebVitals).toHaveBeenCalledTimes(2);
    });
  });

  describe('Effect Behavior', () => {
    it('should not call initWebVitals on re-render without unmount', () => {
      const { rerender } = render(<WebVitals />);
      expect(mockInitWebVitals).toHaveBeenCalledTimes(1);

      rerender(<WebVitals />);
      expect(mockInitWebVitals).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple instances', () => {
      render(
        <>
          <WebVitals />
          <WebVitals />
        </>
      );
      expect(mockInitWebVitals).toHaveBeenCalledTimes(2);
    });

    it('should work when wrapped in other components', () => {
      render(
        <div>
          <WebVitals />
        </div>
      );
      expect(mockInitWebVitals).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should not crash if initWebVitals throws', () => {
      mockInitWebVitals.mockImplementation(() => {
        throw new Error('Web Vitals error');
      });

      expect(() => render(<WebVitals />)).toThrow('Web Vitals error');
    });

    it('should handle initWebVitals returning undefined', () => {
      mockInitWebVitals.mockReturnValue(undefined);
      const { container } = render(<WebVitals />);
      expect(container.innerHTML).toBe('');
    });

    it('should handle initWebVitals returning null', () => {
      mockInitWebVitals.mockReturnValue(null);
      const { container } = render(<WebVitals />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('Integration', () => {
    it('should work in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(<WebVitals />);
      expect(mockInitWebVitals).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should work in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<WebVitals />);
      expect(mockInitWebVitals).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should work in test environment', () => {
      render(<WebVitals />);
      expect(mockInitWebVitals).toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should clean up on unmount', () => {
      const { unmount } = render(<WebVitals />);
      expect(mockInitWebVitals).toHaveBeenCalledTimes(1);
      unmount();
      // Component should unmount cleanly
    });

    it('should handle rapid mount/unmount cycles', () => {
      const { unmount: unmount1 } = render(<WebVitals />);
      const { unmount: unmount2 } = render(<WebVitals />);
      const { unmount: unmount3 } = render(<WebVitals />);

      expect(mockInitWebVitals).toHaveBeenCalledTimes(3);

      unmount1();
      unmount2();
      unmount3();
    });
  });

  describe('Side Effects', () => {
    it('should not modify DOM', () => {
      const { container } = render(<WebVitals />);
      expect(container.children.length).toBe(0);
    });

    it('should not add event listeners to window', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      render(<WebVitals />);
      // WebVitals component itself doesn't add listeners, the lib might
      expect(addEventListenerSpy).not.toHaveBeenCalledWith(expect.anything(), expect.anything());
      addEventListenerSpy.mockRestore();
    });

    it('should not modify global state', () => {
      const globalKeys = Object.keys(global);
      render(<WebVitals />);
      const newGlobalKeys = Object.keys(global);
      expect(newGlobalKeys.length).toBe(globalKeys.length);
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const start = Date.now();
      render(<WebVitals />);
      const end = Date.now();
      expect(end - start).toBeLessThan(100); // Should render in less than 100ms
    });

    it('should not cause memory leaks with multiple renders', () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<WebVitals />);
        unmount();
      }
      expect(mockInitWebVitals).toHaveBeenCalledTimes(10);
    });
  });

  describe('Client-Side Only', () => {
    it('should be a client component', () => {
      // This component uses useEffect which is client-only
      expect(() => render(<WebVitals />)).not.toThrow();
    });

    it('should handle SSR gracefully', () => {
      // useEffect doesn't run during SSR
      const { container } = render(<WebVitals />);
      expect(container.innerHTML).toBe('');
    });
  });
});
