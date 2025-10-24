import { renderHook, act } from '@testing-library/react';
import { useHistoryStore } from '@/state/useHistoryStore';
import type { Timeline } from '@/types/timeline';
import { EDITOR_CONSTANTS } from '@/lib/constants';

const { MAX_HISTORY, HISTORY_DEBOUNCE_MS } = EDITOR_CONSTANTS;

describe('useHistoryStore', () => {
  // Helper to create a mock timeline
  const createMockTimeline = (projectId = 'test-project'): Timeline => ({
    projectId,
    clips: [],
    output: {
      width: 1920,
      height: 1080,
      fps: 30,
      vBitrateK: 5000,
      aBitrateK: 128,
      format: 'mp4',
    },
  });

  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useHistoryStore());
    act(() => {
      result.current.clearHistory();
    });
  });

  describe('Initial State', () => {
    it('should initialize with empty history', () => {
      // Arrange & Act
      const { result } = renderHook(() => useHistoryStore());

      // Assert
      expect(result.current.history).toEqual([]);
      expect(result.current.historyIndex).toBe(-1);
      expect(result.current.canUndo()).toBe(false);
      expect(result.current.canRedo()).toBe(false);
    });
  });

  describe('History Initialization', () => {
    it('should initialize history with timeline', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline = createMockTimeline();

      // Act
      act(() => {
        result.current.initializeHistory(timeline);
      });

      // Assert
      expect(result.current.history).toHaveLength(1);
      expect(result.current.historyIndex).toBe(0);
      expect(result.current.history[0]).toEqual(timeline);
    });

    it('should initialize history with null timeline', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());

      // Act
      act(() => {
        result.current.initializeHistory(null);
      });

      // Assert
      expect(result.current.history).toEqual([]);
      expect(result.current.historyIndex).toBe(-1);
    });

    it('should deep clone timeline when initializing', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline = createMockTimeline();

      // Act
      act(() => {
        result.current.initializeHistory(timeline);
      });

      // Modify original
      timeline.projectId = 'modified-project';

      // Assert - History should not be affected
      expect(result.current.history[0]?.projectId).toBe('test-project');
    });

    it('should replace existing history when initializing', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      act(() => {
        result.current.initializeHistory(timeline1);
      });

      // Act
      act(() => {
        result.current.initializeHistory(timeline2);
      });

      // Assert
      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0]?.projectId).toBe('project-2');
    });
  });

  describe('Save to History', () => {
    it('should save timeline to history', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline = createMockTimeline();

      // Act
      act(() => {
        result.current.saveToHistory(timeline);
      });

      // Assert
      expect(result.current.history).toHaveLength(1);
      expect(result.current.historyIndex).toBe(0);
    });

    it('should not save null timeline', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());

      // Act
      act(() => {
        result.current.saveToHistory(null);
      });

      // Assert
      expect(result.current.history).toEqual([]);
    });

    it('should append to history when saving multiple times', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      // Act
      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
      });

      // Assert
      expect(result.current.history).toHaveLength(2);
      expect(result.current.historyIndex).toBe(1);
    });

    it('should deep clone timeline when saving', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline = createMockTimeline();

      // Act
      act(() => {
        result.current.saveToHistory(timeline);
      });

      // Modify original
      timeline.projectId = 'modified-project';

      // Assert
      expect(result.current.history[0]?.projectId).toBe('test-project');
    });

    it('should clear redo history when saving after undo', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');
      const timeline3 = createMockTimeline('project-3');

      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
        result.current.undo();
      });

      expect(result.current.canRedo()).toBe(true);

      // Act - Save new timeline, should clear redo
      act(() => {
        result.current.saveToHistory(timeline3);
      });

      // Assert
      expect(result.current.canRedo()).toBe(false);
      expect(result.current.history).toHaveLength(2);
      expect(result.current.history[1]?.projectId).toBe('project-3');
    });

    it('should respect max history limit', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());

      // Act - Add more than MAX_HISTORY entries
      act(() => {
        for (let i = 0; i < MAX_HISTORY + 10; i++) {
          const timeline = createMockTimeline(`project-${i}`);
          result.current.saveToHistory(timeline);
        }
      });

      // Assert
      expect(result.current.history.length).toBeLessThanOrEqual(MAX_HISTORY);
    });

    it('should keep most recent entries when exceeding max history', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());

      // Act - Add MAX_HISTORY + 5 entries
      act(() => {
        for (let i = 0; i < MAX_HISTORY + 5; i++) {
          const timeline = createMockTimeline(`project-${i}`);
          result.current.saveToHistory(timeline);
        }
      });

      // Assert - Should keep last MAX_HISTORY entries
      const lastEntry = result.current.history[result.current.history.length - 1];
      expect(lastEntry?.projectId).toBe(`project-${MAX_HISTORY + 4}`);
    });
  });

  describe('Debounced Save', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce history saves with same key', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      // Act - Rapid saves with same debounce key
      act(() => {
        result.current.saveToHistory(timeline1, 'update-clip');
        result.current.saveToHistory(timeline2, 'update-clip');
      });

      // Assert - Should not save immediately
      expect(result.current.history).toHaveLength(0);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(HISTORY_DEBOUNCE_MS);
      });

      // Assert - Should save only the last one
      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0]?.projectId).toBe('project-2');
    });

    it('should not debounce when no debounce key provided', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline = createMockTimeline();

      // Act
      act(() => {
        result.current.saveToHistory(timeline);
      });

      // Assert - Should save immediately
      expect(result.current.history).toHaveLength(1);
    });

    it('should handle multiple debounce keys independently', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      // Act
      act(() => {
        result.current.saveToHistory(timeline1, 'key-1');
        result.current.saveToHistory(timeline2, 'key-2');
      });

      act(() => {
        jest.advanceTimersByTime(HISTORY_DEBOUNCE_MS);
      });

      // Assert - Both should be saved
      expect(result.current.history).toHaveLength(2);
    });
  });

  describe('Undo Operations', () => {
    it('should undo to previous state', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
      });

      // Act
      let previousTimeline: Timeline | null = null;
      act(() => {
        previousTimeline = result.current.undo();
      });

      // Assert
      expect(previousTimeline?.projectId).toBe('project-1');
      expect(result.current.historyIndex).toBe(0);
    });

    it('should return null when undoing at start', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline = createMockTimeline();

      act(() => {
        result.current.saveToHistory(timeline);
      });

      // Act
      let result1: Timeline | null = null;
      act(() => {
        result1 = result.current.undo();
      });

      // Assert - Already at start
      expect(result1).toBeNull();
      expect(result.current.historyIndex).toBe(0);
    });

    it('should return null when undoing with empty history', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());

      // Act
      let undoResult: Timeline | null = null;
      act(() => {
        undoResult = result.current.undo();
      });

      // Assert
      expect(undoResult).toBeNull();
    });

    it('should undo multiple times', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');
      const timeline3 = createMockTimeline('project-3');

      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
        result.current.saveToHistory(timeline3);
      });

      // Act & Assert
      let result1: Timeline | null = null;
      act(() => {
        result1 = result.current.undo();
      });
      expect(result1?.projectId).toBe('project-2');

      let result2: Timeline | null = null;
      act(() => {
        result2 = result.current.undo();
      });
      expect(result2?.projectId).toBe('project-1');
    });

    it('should update canUndo correctly', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      act(() => {
        result.current.saveToHistory(timeline1);
      });

      expect(result.current.canUndo()).toBe(false);

      act(() => {
        result.current.saveToHistory(timeline2);
      });

      // Act & Assert
      expect(result.current.canUndo()).toBe(true);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canUndo()).toBe(false);
    });
  });

  describe('Redo Operations', () => {
    it('should redo to next state', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
        result.current.undo();
      });

      // Act
      let nextTimeline: Timeline | null = null;
      act(() => {
        nextTimeline = result.current.redo();
      });

      // Assert
      expect(nextTimeline?.projectId).toBe('project-2');
      expect(result.current.historyIndex).toBe(1);
    });

    it('should return null when redoing at end', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline = createMockTimeline();

      act(() => {
        result.current.saveToHistory(timeline);
      });

      // Act
      let redoResult: Timeline | null = null;
      act(() => {
        redoResult = result.current.redo();
      });

      // Assert
      expect(redoResult).toBeNull();
    });

    it('should return null when redoing with empty history', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());

      // Act
      let redoResult: Timeline | null = null;
      act(() => {
        redoResult = result.current.redo();
      });

      // Assert
      expect(redoResult).toBeNull();
    });

    it('should redo multiple times', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');
      const timeline3 = createMockTimeline('project-3');

      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
        result.current.saveToHistory(timeline3);
        result.current.undo();
        result.current.undo();
      });

      // Act & Assert
      let result1: Timeline | null = null;
      act(() => {
        result1 = result.current.redo();
      });
      expect(result1?.projectId).toBe('project-2');

      let result2: Timeline | null = null;
      act(() => {
        result2 = result.current.redo();
      });
      expect(result2?.projectId).toBe('project-3');
    });

    it('should update canRedo correctly', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
      });

      expect(result.current.canRedo()).toBe(false);

      // Act & Assert
      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo()).toBe(true);

      act(() => {
        result.current.redo();
      });

      expect(result.current.canRedo()).toBe(false);
    });
  });

  describe('Clear History', () => {
    it('should clear all history', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
      });

      // Act
      act(() => {
        result.current.clearHistory();
      });

      // Assert
      expect(result.current.history).toEqual([]);
      expect(result.current.historyIndex).toBe(-1);
      expect(result.current.canUndo()).toBe(false);
      expect(result.current.canRedo()).toBe(false);
    });

    it('should handle clearing empty history', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.clearHistory();
        });
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex undo/redo workflow', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');
      const timeline3 = createMockTimeline('project-3');
      const timeline4 = createMockTimeline('project-4');

      // Act - Complex workflow
      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
        result.current.saveToHistory(timeline3);
        result.current.undo(); // Back to timeline2
        result.current.undo(); // Back to timeline1
        result.current.redo(); // Forward to timeline2
        result.current.saveToHistory(timeline4); // Should clear timeline3, add timeline4
      });

      // Assert
      expect(result.current.history).toHaveLength(3);
      expect(result.current.history[2]?.projectId).toBe('project-4');
      expect(result.current.canRedo()).toBe(false);
      expect(result.current.canUndo()).toBe(true);
    });

    it('should maintain data integrity across multiple operations', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');
      const timeline3 = createMockTimeline('project-3');

      // Act
      act(() => {
        result.current.initializeHistory(timeline1);
        result.current.saveToHistory(timeline2);
        result.current.saveToHistory(timeline3);
      });

      const originalHistoryLength = result.current.history.length;

      act(() => {
        result.current.undo();
        result.current.undo();
        result.current.redo();
      });

      // Assert
      expect(result.current.history).toHaveLength(originalHistoryLength);
      expect(result.current.historyIndex).toBe(1);
    });

    it('should handle undo/redo at boundaries', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
      });

      // Act & Assert - Undo to start
      act(() => {
        result.current.undo();
      });
      expect(result.current.historyIndex).toBe(0);

      let undoResult: Timeline | null = null;
      act(() => {
        undoResult = result.current.undo();
      });
      expect(undoResult).toBeNull();
      expect(result.current.historyIndex).toBe(0);

      // Redo to end
      act(() => {
        result.current.redo();
      });
      expect(result.current.historyIndex).toBe(1);

      let redoResult: Timeline | null = null;
      act(() => {
        redoResult = result.current.redo();
      });
      expect(redoResult).toBeNull();
      expect(result.current.historyIndex).toBe(1);
    });

    it('should not mutate returned timelines', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
      });

      // Act
      let undoTimeline: Timeline | null = null;
      act(() => {
        undoTimeline = result.current.undo();
      });

      // Modify returned timeline
      if (undoTimeline) {
        undoTimeline.projectId = 'modified';
      }

      // Assert - History should not be affected
      expect(result.current.history[0]?.projectId).toBe('project-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle saving identical timelines', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline = createMockTimeline();

      // Act
      act(() => {
        result.current.saveToHistory(timeline);
        result.current.saveToHistory(timeline);
        result.current.saveToHistory(timeline);
      });

      // Assert - Should save each time
      expect(result.current.history).toHaveLength(3);
    });

    it('should handle rapid undo/redo cycles', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
      });

      // Act - Rapid cycles
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.undo();
          result.current.redo();
        }
      });

      // Assert
      expect(result.current.historyIndex).toBe(1);
    });

    it('should handle history index consistency', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');
      const timeline3 = createMockTimeline('project-3');

      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
        result.current.saveToHistory(timeline3);
      });

      // Act & Assert - Verify index is always within bounds
      expect(result.current.historyIndex).toBeLessThan(result.current.history.length);
      expect(result.current.historyIndex).toBeGreaterThanOrEqual(0);

      act(() => {
        result.current.undo();
      });
      expect(result.current.historyIndex).toBeLessThan(result.current.history.length);
      expect(result.current.historyIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistency between history and index', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      // Act
      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
      });

      // Assert
      expect(result.current.historyIndex).toBe(result.current.history.length - 1);
    });

    it('should maintain consistency between canUndo and state', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      act(() => {
        result.current.saveToHistory(timeline1);
      });

      // Assert
      expect(result.current.canUndo()).toBe(result.current.historyIndex > 0);

      act(() => {
        result.current.saveToHistory(timeline2);
      });

      expect(result.current.canUndo()).toBe(result.current.historyIndex > 0);
    });

    it('should maintain consistency between canRedo and state', () => {
      // Arrange
      const { result } = renderHook(() => useHistoryStore());
      const timeline1 = createMockTimeline('project-1');
      const timeline2 = createMockTimeline('project-2');

      act(() => {
        result.current.saveToHistory(timeline1);
        result.current.saveToHistory(timeline2);
      });

      // Assert
      expect(result.current.canRedo()).toBe(
        result.current.historyIndex < result.current.history.length - 1
      );

      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo()).toBe(
        result.current.historyIndex < result.current.history.length - 1
      );
    });
  });
});
