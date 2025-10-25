import { renderHook, act } from '@testing-library/react';
import { useSelectionStore } from '@/state/useSelectionStore';

describe('useSelectionStore', () => {
  beforeEach((): void => {
    // Reset store before each test
    const { result } = renderHook(() => useSelectionStore());
    act(() => {
      result.current.clearSelection();
    });
  });

  describe('Initial State', () => {
    it('should initialize with empty selection', () => {
      // Arrange & Act
      const { result } = renderHook(() => useSelectionStore());

      // Assert
      expect(result.current.selectedClipIds.size).toBe(0);
      expect(result.current.getSelectedCount()).toBe(0);
      expect(result.current.getSelectedIds()).toEqual([]);
    });
  });

  describe('Single Selection', () => {
    it('should select a clip', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act
      act(() => {
        result.current.selectClip('clip-1');
      });

      // Assert
      expect(result.current.selectedClipIds.has('clip-1')).toBe(true);
      expect(result.current.isSelected('clip-1')).toBe(true);
      expect(result.current.getSelectedCount()).toBe(1);
    });

    it('should replace selection when selecting without multi flag', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.selectClip('clip-1');
      });

      // Act
      act(() => {
        result.current.selectClip('clip-2');
      });

      // Assert
      expect(result.current.selectedClipIds.has('clip-1')).toBe(false);
      expect(result.current.selectedClipIds.has('clip-2')).toBe(true);
      expect(result.current.getSelectedCount()).toBe(1);
    });

    it('should replace selection when selecting with multi=false', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.selectClip('clip-1');
      });

      // Act
      act(() => {
        result.current.selectClip('clip-2', false);
      });

      // Assert
      expect(result.current.selectedClipIds.has('clip-1')).toBe(false);
      expect(result.current.selectedClipIds.has('clip-2')).toBe(true);
      expect(result.current.getSelectedCount()).toBe(1);
    });

    it('should handle selecting same clip twice', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.selectClip('clip-1');
      });

      // Act
      act(() => {
        result.current.selectClip('clip-1');
      });

      // Assert
      expect(result.current.selectedClipIds.has('clip-1')).toBe(true);
      expect(result.current.getSelectedCount()).toBe(1);
    });
  });

  describe('Multi Selection', () => {
    it('should add to selection with multi flag', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.selectClip('clip-1');
      });

      // Act
      act(() => {
        result.current.selectClip('clip-2', true);
      });

      // Assert
      expect(result.current.selectedClipIds.has('clip-1')).toBe(true);
      expect(result.current.selectedClipIds.has('clip-2')).toBe(true);
      expect(result.current.getSelectedCount()).toBe(2);
    });

    it('should toggle clip off when multi-selecting already selected clip', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.selectClip('clip-1');
      });

      // Act
      act(() => {
        result.current.selectClip('clip-1', true);
      });

      // Assert
      expect(result.current.selectedClipIds.has('clip-1')).toBe(false);
      expect(result.current.getSelectedCount()).toBe(0);
    });

    it('should support multiple clips in selection', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act
      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-2', true);
        result.current.selectClip('clip-3', true);
      });

      // Assert
      expect(result.current.getSelectedCount()).toBe(3);
      expect(result.current.getSelectedIds()).toEqual(
        expect.arrayContaining(['clip-1', 'clip-2', 'clip-3'])
      );
    });

    it('should toggle individual clips in multi-selection', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-2', true);
        result.current.selectClip('clip-3', true);
      });

      // Act - Toggle clip-2 off
      act(() => {
        result.current.selectClip('clip-2', true);
      });

      // Assert
      expect(result.current.selectedClipIds.has('clip-1')).toBe(true);
      expect(result.current.selectedClipIds.has('clip-2')).toBe(false);
      expect(result.current.selectedClipIds.has('clip-3')).toBe(true);
      expect(result.current.getSelectedCount()).toBe(2);
    });

    it('should handle mixed selection and deselection', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act - Select, toggle, select again
      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-2', true);
        result.current.selectClip('clip-1', true); // Toggle off
        result.current.selectClip('clip-3', true);
      });

      // Assert
      expect(result.current.getSelectedIds()).toEqual(expect.arrayContaining(['clip-2', 'clip-3']));
      expect(result.current.getSelectedCount()).toBe(2);
    });
  });

  describe('Deselection', () => {
    it('should deselect a clip', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.selectClip('clip-1');
      });

      // Act
      act(() => {
        result.current.deselectClip('clip-1');
      });

      // Assert
      expect(result.current.selectedClipIds.has('clip-1')).toBe(false);
      expect(result.current.getSelectedCount()).toBe(0);
    });

    it('should handle deselecting non-selected clip', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.deselectClip('non-existent');
        });
      }).not.toThrow();
      expect(result.current.getSelectedCount()).toBe(0);
    });

    it('should deselect specific clip from multi-selection', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-2', true);
        result.current.selectClip('clip-3', true);
      });

      // Act
      act(() => {
        result.current.deselectClip('clip-2');
      });

      // Assert
      expect(result.current.selectedClipIds.has('clip-1')).toBe(true);
      expect(result.current.selectedClipIds.has('clip-2')).toBe(false);
      expect(result.current.selectedClipIds.has('clip-3')).toBe(true);
      expect(result.current.getSelectedCount()).toBe(2);
    });

    it('should clear all selections', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-2', true);
        result.current.selectClip('clip-3', true);
      });

      // Act
      act(() => {
        result.current.clearSelection();
      });

      // Assert
      expect(result.current.selectedClipIds.size).toBe(0);
      expect(result.current.getSelectedCount()).toBe(0);
      expect(result.current.getSelectedIds()).toEqual([]);
    });

    it('should handle clearing empty selection', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.clearSelection();
        });
      }).not.toThrow();
      expect(result.current.getSelectedCount()).toBe(0);
    });
  });

  describe('Selection Queries', () => {
    it('should check if clip is selected', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.selectClip('clip-1');
      });

      // Act & Assert
      expect(result.current.isSelected('clip-1')).toBe(true);
      expect(result.current.isSelected('clip-2')).toBe(false);
    });

    it('should get selected count', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act
      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-2', true);
      });

      // Assert
      expect(result.current.getSelectedCount()).toBe(2);
    });

    it('should get selected IDs as array', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act
      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-2', true);
        result.current.selectClip('clip-3', true);
      });

      // Assert
      const selectedIds = result.current.getSelectedIds();
      expect(selectedIds).toHaveLength(3);
      expect(selectedIds).toContain('clip-1');
      expect(selectedIds).toContain('clip-2');
      expect(selectedIds).toContain('clip-3');
    });

    it('should return empty array when no selection', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act & Assert
      expect(result.current.getSelectedIds()).toEqual([]);
    });

    it('should reflect changes in selection queries', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-2', true);
      });

      expect(result.current.getSelectedCount()).toBe(2);

      // Act
      act(() => {
        result.current.deselectClip('clip-1');
      });

      // Assert
      expect(result.current.getSelectedCount()).toBe(1);
      expect(result.current.isSelected('clip-1')).toBe(false);
      expect(result.current.isSelected('clip-2')).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex selection workflow', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act - Simulate complex user interactions
      act(() => {
        // Single select
        result.current.selectClip('clip-1');
        // Multi-select
        result.current.selectClip('clip-2', true);
        result.current.selectClip('clip-3', true);
        // Deselect one
        result.current.deselectClip('clip-2');
        // Single select (should clear others)
        result.current.selectClip('clip-4');
        // Multi-select again
        result.current.selectClip('clip-5', true);
      });

      // Assert
      expect(result.current.getSelectedCount()).toBe(2);
      expect(result.current.isSelected('clip-4')).toBe(true);
      expect(result.current.isSelected('clip-5')).toBe(true);
      expect(result.current.isSelected('clip-1')).toBe(false);
      expect(result.current.isSelected('clip-2')).toBe(false);
      expect(result.current.isSelected('clip-3')).toBe(false);
    });

    it('should handle rapid selection changes', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act - Rapid changes
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.selectClip(`clip-${i}`, true);
        }
      });

      // Assert
      expect(result.current.getSelectedCount()).toBe(10);
    });

    it('should handle selecting and deselecting same clips multiple times', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act
      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-1', true); // Deselect
        result.current.selectClip('clip-1', true); // Select
        result.current.selectClip('clip-1', true); // Deselect
      });

      // Assert
      expect(result.current.isSelected('clip-1')).toBe(false);
      expect(result.current.getSelectedCount()).toBe(0);
    });

    it('should maintain Set integrity across operations', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act - Various operations
      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-2', true);
        result.current.selectClip('clip-1', true); // Toggle off
        result.current.selectClip('clip-3', true);
        result.current.deselectClip('clip-2');
        result.current.selectClip('clip-4');
        result.current.selectClip('clip-5', true);
      });

      // Assert - Verify Set has no duplicates and correct state
      const selectedIds = result.current.getSelectedIds();
      const uniqueIds = new Set(selectedIds);
      expect(selectedIds.length).toBe(uniqueIds.size); // No duplicates
      expect(result.current.getSelectedCount()).toBe(selectedIds.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string clip ID', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act
      act(() => {
        result.current.selectClip('');
      });

      // Assert
      expect(result.current.isSelected('')).toBe(true);
      expect(result.current.getSelectedCount()).toBe(1);
    });

    it('should handle special characters in clip IDs', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());
      const specialId = 'clip-@#$%^&*()_+-=[]{}|;:,.<>?';

      // Act
      act(() => {
        result.current.selectClip(specialId);
      });

      // Assert
      expect(result.current.isSelected(specialId)).toBe(true);
    });

    it('should handle very long clip IDs', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());
      const longId = 'clip-' + 'a'.repeat(1000);

      // Act
      act(() => {
        result.current.selectClip(longId);
      });

      // Assert
      expect(result.current.isSelected(longId)).toBe(true);
    });

    it('should handle numeric clip IDs as strings', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act
      act(() => {
        result.current.selectClip('123', true);
        result.current.selectClip('456', true);
      });

      // Assert
      expect(result.current.isSelected('123')).toBe(true);
      expect(result.current.isSelected('456')).toBe(true);
      expect(result.current.getSelectedCount()).toBe(2);
    });

    it('should handle large number of selections', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());
      const clipCount = 1000;

      // Act
      act(() => {
        for (let i = 0; i < clipCount; i++) {
          result.current.selectClip(`clip-${i}`, true);
        }
      });

      // Assert
      expect(result.current.getSelectedCount()).toBe(clipCount);
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistency between has() and isSelected()', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-2', true);
      });

      // Act & Assert
      const selectedIds = result.current.getSelectedIds();
      selectedIds.forEach((id) => {
        expect(result.current.selectedClipIds.has(id)).toBe(true);
        expect(result.current.isSelected(id)).toBe(true);
      });
    });

    it('should maintain consistency between size and getSelectedCount()', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act
      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-2', true);
        result.current.selectClip('clip-3', true);
      });

      // Assert
      expect(result.current.selectedClipIds.size).toBe(result.current.getSelectedCount());
    });

    it('should maintain consistency between Set and array', () => {
      // Arrange
      const { result } = renderHook(() => useSelectionStore());

      // Act
      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-2', true);
        result.current.selectClip('clip-3', true);
      });

      // Assert
      const selectedIds = result.current.getSelectedIds();
      expect(selectedIds.length).toBe(result.current.selectedClipIds.size);
      selectedIds.forEach((id) => {
        expect(result.current.selectedClipIds.has(id)).toBe(true);
      });
    });
  });
});
