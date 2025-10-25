/**
 * Comprehensive tests for useAutosave hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutosave } from '@/lib/hooks/useAutosave';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline } from '@/types/timeline';

// Mock dependencies
jest.mock(
  '@/lib/saveLoad',
  (): Record<string, unknown> => ({
    saveTimeline: jest.fn(),
  })
);

jest.mock(
  '@/lib/browserLogger',
  (): Record<string, unknown> => ({
    browserLogger: {
      error: jest.fn(),
    },
  })
);

jest.mock(
  '@/state/useEditorStore',
  (): Record<string, unknown> => ({
    useEditorStore: jest.fn(),
  })
);

const mockSaveTimeline = require('@/lib/saveLoad').saveTimeline;
const mockBrowserLogger = require('@/lib/browserLogger').browserLogger;

describe('useAutosave', () => {
  const mockTimeline: Timeline = {
    clips: [],
    textOverlays: [],
    transitions: [],
  };

  const mockProjectId = 'project-123';

  beforeEach((): void => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();

    // Setup default mock implementation
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ timeline: mockTimeline })
    );

    mockSaveTimeline.mockResolvedValue(undefined);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('Basic Autosave Functionality', () => {
    it('should initialize without error', () => {
      const { result } = renderHook(() => useAutosave(mockProjectId));

      expect(result.current.saveError).toBeNull();
    });

    it('should trigger save after delay', async () => {
      jest.useFakeTimers();

      renderHook(() => useAutosave(mockProjectId, 2000));

      // Should not save immediately
      expect(mockSaveTimeline).not.toHaveBeenCalled();

      // Advance time past delay
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should have saved
      expect(mockSaveTimeline).toHaveBeenCalledWith(mockProjectId, mockTimeline);

      jest.useRealTimers();
    });

    it('should use default delay of 2000ms', async () => {
      jest.useFakeTimers();

      renderHook(() => useAutosave(mockProjectId));

      act(() => {
        jest.advanceTimersByTime(1999);
      });
      expect(mockSaveTimeline).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(mockSaveTimeline).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should respect custom delay', async () => {
      jest.useFakeTimers();

      renderHook(() => useAutosave(mockProjectId, 5000));

      act(() => {
        jest.advanceTimersByTime(4999);
      });
      expect(mockSaveTimeline).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(mockSaveTimeline).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('Timeline Changes', () => {
    it('should save when timeline changes', async () => {
      jest.useFakeTimers();

      const newTimeline: Timeline = {
        clips: [
          {
            id: 'clip-1',
            assetId: 'asset-1',
            start: 0,
            end: 5,
            timelinePosition: 0,
            trackIndex: 0,
            effects: [],
            volume: 1,
          },
        ],
        textOverlays: [],
        transitions: [],
      };

      const { rerender } = renderHook(() => useAutosave(mockProjectId, 2000));

      // Update timeline in store
      (useEditorStore as unknown as jest.Mock).mockImplementation((selector) =>
        selector({ timeline: newTimeline })
      );

      rerender();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockSaveTimeline).toHaveBeenCalledWith(mockProjectId, newTimeline);

      jest.useRealTimers();
    });

    it('should reset timer on rapid timeline changes', async () => {
      jest.useFakeTimers();

      let currentTimeline = mockTimeline;

      const { rerender } = renderHook(() => useAutosave(mockProjectId, 2000));

      // First change
      currentTimeline = { ...mockTimeline, clips: [] };
      (useEditorStore as unknown as jest.Mock).mockImplementation((selector) =>
        selector({ timeline: currentTimeline })
      );
      rerender();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Second change before first save completes
      currentTimeline = {
        ...mockTimeline,
        clips: [
          {
            id: 'clip-1',
            assetId: 'asset-1',
            start: 0,
            end: 5,
            timelinePosition: 0,
            trackIndex: 0,
            effects: [],
            volume: 1,
          },
        ],
      };
      (useEditorStore as unknown as jest.Mock).mockImplementation((selector) =>
        selector({ timeline: currentTimeline })
      );
      rerender();

      // Should not have saved yet
      expect(mockSaveTimeline).not.toHaveBeenCalled();

      // Complete delay after last change
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should save with latest timeline
      expect(mockSaveTimeline).toHaveBeenCalledTimes(1);
      expect(mockSaveTimeline).toHaveBeenCalledWith(mockProjectId, currentTimeline);

      jest.useRealTimers();
    });

    it('should not save if timeline is null', async () => {
      jest.useFakeTimers();

      (useEditorStore as unknown as jest.Mock).mockImplementation((selector) =>
        selector({ timeline: null })
      );

      renderHook(() => useAutosave(mockProjectId, 2000));

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockSaveTimeline).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Custom Save Function', () => {
    it('should use custom save function when provided', async () => {
      jest.useFakeTimers();

      const customSaveFn = jest.fn().mockResolvedValue(undefined);

      renderHook(() => useAutosave(mockProjectId, 2000, customSaveFn));

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(customSaveFn).toHaveBeenCalledWith(mockProjectId, mockTimeline);
      expect(mockSaveTimeline).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle synchronous custom save function', async () => {
      jest.useFakeTimers();

      const customSaveFn = jest.fn();

      renderHook(() => useAutosave(mockProjectId, 2000, customSaveFn));

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(customSaveFn).toHaveBeenCalledWith(mockProjectId, mockTimeline);

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors', async () => {
      jest.useFakeTimers();

      const saveError = new Error('Save failed');
      mockSaveTimeline.mockRejectedValueOnce(saveError);

      const { result } = renderHook(() => useAutosave(mockProjectId, 2000));

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Wait for error to be set
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.saveError).toBe('Save failed');
      expect(mockBrowserLogger.error).toHaveBeenCalledWith(
        { error: saveError, projectId: mockProjectId },
        'Autosave failed'
      );

      jest.useRealTimers();
    });

    it('should clear error after 5 seconds', async () => {
      jest.useFakeTimers();

      const saveError = new Error('Save failed');
      mockSaveTimeline.mockRejectedValueOnce(saveError);

      const { result } = renderHook(() => useAutosave(mockProjectId, 2000));

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Wait for error to be set
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.saveError).toBe('Save failed');

      // Advance 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.saveError).toBeNull();

      jest.useRealTimers();
    });

    it('should handle non-Error objects in catch', async () => {
      jest.useFakeTimers();

      mockSaveTimeline.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useAutosave(mockProjectId, 2000));

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.saveError).toBe('Failed to save timeline');

      jest.useRealTimers();
    });

    it('should reset error timeout on new errors', async () => {
      jest.useFakeTimers();

      mockSaveTimeline
        .mockRejectedValueOnce(new Error('First error'))
        .mockRejectedValueOnce(new Error('Second error'));

      let currentTimeline = mockTimeline;

      const { result, rerender } = renderHook(() => useAutosave(mockProjectId, 2000));

      // First save fails
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.saveError).toBe('First error');

      // Advance 3 seconds (not enough to clear)
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Timeline changes again, triggering second save
      currentTimeline = { ...mockTimeline, clips: [] };
      (useEditorStore as unknown as jest.Mock).mockImplementation((selector) =>
        selector({ timeline: currentTimeline })
      );
      rerender();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.saveError).toBe('Second error');

      // Error should still be present (timer was reset)
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(result.current.saveError).toBe('Second error');

      // Complete the 5 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(result.current.saveError).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup timeout on unmount', async () => {
      jest.useFakeTimers();

      const { unmount } = renderHook(() => useAutosave(mockProjectId, 2000));

      unmount();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockSaveTimeline).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should cleanup error timeout on unmount', async () => {
      jest.useFakeTimers();

      mockSaveTimeline.mockRejectedValueOnce(new Error('Save failed'));

      const { result, unmount } = renderHook(() => useAutosave(mockProjectId, 2000));

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.saveError).toBe('Save failed');

      // Unmount before error clears
      unmount();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Error should remain because component unmounted
      expect(result.current.saveError).toBe('Save failed');

      jest.useRealTimers();
    });

    it('should cleanup old timeout when timeline changes', async () => {
      jest.useFakeTimers();

      let currentTimeline = mockTimeline;

      const { rerender } = renderHook(() => useAutosave(mockProjectId, 2000));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Change timeline (should cleanup old timeout)
      currentTimeline = { ...mockTimeline, clips: [] };
      (useEditorStore as unknown as jest.Mock).mockImplementation((selector) =>
        selector({ timeline: currentTimeline })
      );
      rerender();

      // Advance past original save time
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Should not have saved yet (timer was reset)
      expect(mockSaveTimeline).not.toHaveBeenCalled();

      // Complete new delay
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockSaveTimeline).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    it('should handle projectId changes', async () => {
      jest.useFakeTimers();

      const { rerender } = renderHook(({ projectId }) => useAutosave(projectId, 2000), {
        initialProps: { projectId: 'project-1' },
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockSaveTimeline).toHaveBeenCalledWith('project-1', mockTimeline);

      mockSaveTimeline.mockClear();

      // Change projectId
      rerender({ projectId: 'project-2' });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockSaveTimeline).toHaveBeenCalledWith('project-2', mockTimeline);

      jest.useRealTimers();
    });

    it('should handle delay changes', async () => {
      jest.useFakeTimers();

      const { rerender } = renderHook(({ delay }) => useAutosave(mockProjectId, delay), {
        initialProps: { delay: 2000 },
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockSaveTimeline).toHaveBeenCalledTimes(1);
      mockSaveTimeline.mockClear();

      // Change delay
      rerender({ delay: 5000 });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should not have saved yet
      expect(mockSaveTimeline).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockSaveTimeline).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should handle zero delay', async () => {
      jest.useFakeTimers();

      renderHook(() => useAutosave(mockProjectId, 0));

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(mockSaveTimeline).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should handle very large delays', async () => {
      jest.useFakeTimers();

      renderHook(() => useAutosave(mockProjectId, 60000));

      act(() => {
        jest.advanceTimersByTime(59999);
      });
      expect(mockSaveTimeline).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(mockSaveTimeline).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });
});
