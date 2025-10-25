/**
 * Test Suite: useEasterEggs Hook
 *
 * Tests easter egg functionality including:
 * - Initial state
 * - Easter egg tracking
 * - Reset functionality
 * - Hook lifecycle
 */

import { renderHook, act } from '@testing-library/react';
import { useEasterEggs } from '@/lib/hooks/useEasterEggs';

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
  },
}));

// Mock achievement service
jest.mock('@/lib/services/achievementService', () => ({
  achievementService: {
    init: jest.fn(),
    recordActivation: jest.fn(),
    recordDeactivation: jest.fn(),
  },
  EasterEggIds: {
    KONAMI: 'konami',
    DEVMODE: 'devmode',
    MATRIX: 'matrix',
    DISCO: 'disco',
    GRAVITY: 'gravity',
  },
}));

describe('useEasterEggs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset DOM modifications
    document.body.className = '';
    document.body.style.background = '';
  });

  afterEach(() => {
    // Clean up DOM
    document.querySelectorAll('[id*="matrix"], [id*="dev-mode"]').forEach((el) => el.remove());
  });

  describe('Initial State', () => {
    it('should initialize with empty easter eggs triggered list', () => {
      const { result } = renderHook(() => useEasterEggs());

      expect(result.current.easterEggsTriggered).toEqual([]);
    });

    it('should provide reset function', () => {
      const { result } = renderHook(() => useEasterEggs());

      expect(typeof result.current.resetEasterEggs).toBe('function');
    });

    it('should respect enabled option', () => {
      const { result } = renderHook(() => useEasterEggs({ enabled: false }));

      expect(result.current).toBeDefined();
    });
  });

  describe('Return Value', () => {
    it('should return object with easterEggsTriggered and resetEasterEggs', () => {
      const { result } = renderHook(() => useEasterEggs());

      expect(result.current).toHaveProperty('easterEggsTriggered');
      expect(result.current).toHaveProperty('resetEasterEggs');
    });

    it('should have easterEggsTriggered as an array', () => {
      const { result } = renderHook(() => useEasterEggs());

      expect(Array.isArray(result.current.easterEggsTriggered)).toBe(true);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset easter eggs', () => {
      const { result } = renderHook(() => useEasterEggs());

      act(() => {
        result.current.resetEasterEggs();
      });

      expect(result.current.easterEggsTriggered).toEqual([]);
    });

    it('should clear local storage on reset', () => {
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

      const { result } = renderHook(() => useEasterEggs());

      act(() => {
        result.current.resetEasterEggs();
      });

      expect(removeItemSpy).toHaveBeenCalledWith('secretDevMode');

      removeItemSpy.mockRestore();
    });

    it('should be callable multiple times', () => {
      const { result } = renderHook(() => useEasterEggs());

      act(() => {
        result.current.resetEasterEggs();
        result.current.resetEasterEggs();
        result.current.resetEasterEggs();
      });

      expect(result.current.easterEggsTriggered).toEqual([]);
    });
  });

  describe('Hook Dependencies', () => {
    it('should work with enabled=true', () => {
      const { result } = renderHook(() => useEasterEggs({ enabled: true }));

      expect(result.current).toBeDefined();
    });

    it('should work with enabled=false', () => {
      const { result } = renderHook(() => useEasterEggs({ enabled: false }));

      expect(result.current).toBeDefined();
    });

    it('should handle enabled state changes', () => {
      const { result, rerender } = renderHook(({ enabled }) => useEasterEggs({ enabled }), {
        initialProps: { enabled: true },
      });

      expect(result.current).toBeDefined();

      rerender({ enabled: false });
      expect(result.current).toBeDefined();

      rerender({ enabled: true });
      expect(result.current).toBeDefined();
    });
  });

  describe('Lifecycle', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useEasterEggs());

      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple re-renders', () => {
      const { result, rerender } = renderHook(() => useEasterEggs());

      expect(result.current).toBeDefined();

      rerender();
      rerender();
      rerender();

      expect(result.current).toBeDefined();
    });

    it('should inject CSS styles', () => {
      renderHook(() => useEasterEggs());

      const styleElement = document.getElementById('easter-egg-styles');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.tagName).toBe('STYLE');
    });

    it('should remove CSS styles on unmount', () => {
      const { unmount } = renderHook(() => useEasterEggs());

      const styleElement = document.getElementById('easter-egg-styles');
      expect(styleElement).toBeTruthy();

      unmount();

      // Styles should be removed
      const styleAfterUnmount = document.getElementById('easter-egg-styles');
      expect(styleAfterUnmount).toBeFalsy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined options', () => {
      const { result } = renderHook(() => useEasterEggs());

      expect(result.current).toBeDefined();
    });

    it('should handle empty options object', () => {
      const { result } = renderHook(() => useEasterEggs({}));

      expect(result.current).toBeDefined();
    });

    it('should maintain state after reset', () => {
      const { result } = renderHook(() => useEasterEggs());

      act(() => {
        result.current.resetEasterEggs();
      });

      expect(result.current.easterEggsTriggered).toEqual([]);
      expect(typeof result.current.resetEasterEggs).toBe('function');
    });
  });

  describe('Integration', () => {
    it('should handle rapid resets', () => {
      const { result } = renderHook(() => useEasterEggs());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.resetEasterEggs();
        }
      });

      expect(result.current.easterEggsTriggered).toEqual([]);
    });

    it('should preserve reset function reference across renders', () => {
      const { result, rerender } = renderHook(() => useEasterEggs());

      const resetFn = result.current.resetEasterEggs;

      rerender();

      expect(result.current.resetEasterEggs).toBe(resetFn);
    });
  });
});
