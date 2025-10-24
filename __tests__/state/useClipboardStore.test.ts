import { renderHook, act } from '@testing-library/react';
import { useClipboardStore } from '@/state/useClipboardStore';
import type { Clip } from '@/types/timeline';

describe('useClipboardStore', () => {
  // Helper to create a mock clip
  const createMockClip = (overrides?: Partial<Clip>): Clip => ({
    id: `clip-${Date.now()}-${Math.random()}`,
    assetId: 'asset-1',
    filePath: '/test/video.mp4',
    mime: 'video/mp4',
    start: 0,
    end: 10,
    sourceDuration: 10,
    timelinePosition: 0,
    trackIndex: 0,
    crop: null,
    ...overrides,
  });

  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useClipboardStore());
    act(() => {
      result.current.clearClipboard();
    });
  });

  describe('Initial State', () => {
    it('should initialize with empty clipboard', () => {
      // Arrange & Act
      const { result } = renderHook(() => useClipboardStore());

      // Assert
      expect(result.current.copiedClips).toEqual([]);
      expect(result.current.hasClips()).toBe(false);
    });
  });

  describe('Copy Operations', () => {
    it('should copy single clip', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({ id: 'clip-1' });

      // Act
      act(() => {
        result.current.copyClips([clip]);
      });

      // Assert
      expect(result.current.copiedClips).toHaveLength(1);
      expect(result.current.copiedClips[0]?.id).toBe('clip-1');
      expect(result.current.hasClips()).toBe(true);
    });

    it('should copy multiple clips', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });
      const clip3 = createMockClip({ id: 'clip-3' });

      // Act
      act(() => {
        result.current.copyClips([clip1, clip2, clip3]);
      });

      // Assert
      expect(result.current.copiedClips).toHaveLength(3);
      expect(result.current.hasClips()).toBe(true);
    });

    it('should deep clone clips when copying', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({ id: 'clip-1', timelinePosition: 5 });

      // Act
      act(() => {
        result.current.copyClips([clip]);
      });

      // Modify original
      clip.timelinePosition = 10;

      // Assert - Clipboard should not be affected
      expect(result.current.copiedClips[0]?.timelinePosition).toBe(5);
    });

    it('should replace previous clipboard contents', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.copyClips([clip1]);
      });

      // Act
      act(() => {
        result.current.copyClips([clip2]);
      });

      // Assert
      expect(result.current.copiedClips).toHaveLength(1);
      expect(result.current.copiedClips[0]?.id).toBe('clip-2');
    });

    it('should handle copying empty array', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());

      // Act
      act(() => {
        result.current.copyClips([]);
      });

      // Assert
      expect(result.current.copiedClips).toEqual([]);
      expect(result.current.hasClips()).toBe(false);
    });

    it('should preserve clip properties when copying', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({
        id: 'clip-1',
        timelinePosition: 5,
        trackIndex: 2,
        start: 1,
        end: 9,
        volume: 0.5,
        opacity: 0.8,
      });

      // Act
      act(() => {
        result.current.copyClips([clip]);
      });

      // Assert
      const copiedClip = result.current.copiedClips[0];
      expect(copiedClip?.timelinePosition).toBe(5);
      expect(copiedClip?.trackIndex).toBe(2);
      expect(copiedClip?.start).toBe(1);
      expect(copiedClip?.end).toBe(9);
      expect(copiedClip?.volume).toBe(0.5);
      expect(copiedClip?.opacity).toBe(0.8);
    });
  });

  describe('Paste Operations', () => {
    it('should paste single clip at target time', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({ id: 'clip-1', timelinePosition: 0 });

      act(() => {
        result.current.copyClips([clip]);
      });

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(10);
      });

      // Assert
      expect(pastedClips).toHaveLength(1);
      expect(pastedClips[0]?.timelinePosition).toBe(10);
    });

    it('should paste multiple clips with preserved relative positions', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 0 });
      const clip2 = createMockClip({ id: 'clip-2', timelinePosition: 5 });
      const clip3 = createMockClip({ id: 'clip-3', timelinePosition: 10 });

      act(() => {
        result.current.copyClips([clip1, clip2, clip3]);
      });

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(20);
      });

      // Assert
      expect(pastedClips).toHaveLength(3);
      expect(pastedClips[0]?.timelinePosition).toBe(20); // 20 + (0 - 0)
      expect(pastedClips[1]?.timelinePosition).toBe(25); // 20 + (5 - 0)
      expect(pastedClips[2]?.timelinePosition).toBe(30); // 20 + (10 - 0)
    });

    it('should generate new IDs for pasted clips', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.copyClips([clip]);
      });

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(10);
      });

      // Assert
      expect(pastedClips[0]?.id).not.toBe('clip-1');
      expect(pastedClips[0]?.id).toContain('clip-1-paste-');
    });

    it('should return empty array when pasting with empty clipboard', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(10);
      });

      // Assert
      expect(pastedClips).toEqual([]);
    });

    it('should preserve clip properties when pasting', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({
        id: 'clip-1',
        timelinePosition: 0,
        trackIndex: 2,
        start: 1,
        end: 9,
        volume: 0.5,
        opacity: 0.8,
      });

      act(() => {
        result.current.copyClips([clip]);
      });

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(10);
      });

      // Assert
      const pastedClip = pastedClips[0];
      expect(pastedClip?.trackIndex).toBe(2);
      expect(pastedClip?.start).toBe(1);
      expect(pastedClip?.end).toBe(9);
      expect(pastedClip?.volume).toBe(0.5);
      expect(pastedClip?.opacity).toBe(0.8);
    });

    it('should allow pasting at time 0', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({ id: 'clip-1', timelinePosition: 5 });

      act(() => {
        result.current.copyClips([clip]);
      });

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(0);
      });

      // Assert
      expect(pastedClips[0]?.timelinePosition).toBe(0);
    });

    it('should allow pasting multiple times', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({ id: 'clip-1', timelinePosition: 0 });

      act(() => {
        result.current.copyClips([clip]);
      });

      // Act
      let pastedClips1: Clip[] = [];
      let pastedClips2: Clip[] = [];
      act(() => {
        pastedClips1 = result.current.pasteClips(10);
      });
      act(() => {
        pastedClips2 = result.current.pasteClips(20);
      });

      // Assert
      expect(pastedClips1).toHaveLength(1);
      expect(pastedClips2).toHaveLength(1);
      expect(pastedClips1[0]?.id).not.toBe(pastedClips2[0]?.id);
      expect(pastedClips1[0]?.timelinePosition).toBe(10);
      expect(pastedClips2[0]?.timelinePosition).toBe(20);
    });

    it('should not mutate clipboard when pasting', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({ id: 'clip-1', timelinePosition: 0 });

      act(() => {
        result.current.copyClips([clip]);
      });

      const originalClipboardSize = result.current.copiedClips.length;

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(10);
      });

      // Assert
      expect(result.current.copiedClips).toHaveLength(originalClipboardSize);
      expect(result.current.copiedClips[0]?.id).toBe('clip-1');
    });
  });

  describe('Clipboard Management', () => {
    it('should clear clipboard', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.copyClips([clip]);
      });

      // Act
      act(() => {
        result.current.clearClipboard();
      });

      // Assert
      expect(result.current.copiedClips).toEqual([]);
      expect(result.current.hasClips()).toBe(false);
    });

    it('should handle clearing empty clipboard', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.clearClipboard();
        });
      }).not.toThrow();
      expect(result.current.hasClips()).toBe(false);
    });

    it('should report hasClips correctly', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({ id: 'clip-1' });

      expect(result.current.hasClips()).toBe(false);

      // Act
      act(() => {
        result.current.copyClips([clip]);
      });

      // Assert
      expect(result.current.hasClips()).toBe(true);

      act(() => {
        result.current.clearClipboard();
      });

      expect(result.current.hasClips()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle clips with negative timeline positions', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: -5 });
      const clip2 = createMockClip({ id: 'clip-2', timelinePosition: 0 });

      act(() => {
        result.current.copyClips([clip1, clip2]);
      });

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(10);
      });

      // Assert - Should preserve relative positions
      expect(pastedClips[0]?.timelinePosition).toBe(10); // 10 + (-5 - (-5)) = 10
      expect(pastedClips[1]?.timelinePosition).toBe(15); // 10 + (0 - (-5)) = 15
    });

    it('should handle clips with same timeline position', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 5 });
      const clip2 = createMockClip({ id: 'clip-2', timelinePosition: 5 });

      act(() => {
        result.current.copyClips([clip1, clip2]);
      });

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(10);
      });

      // Assert
      expect(pastedClips[0]?.timelinePosition).toBe(10);
      expect(pastedClips[1]?.timelinePosition).toBe(10);
    });

    it('should handle very large target times', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({ id: 'clip-1', timelinePosition: 0 });

      act(() => {
        result.current.copyClips([clip]);
      });

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(999999);
      });

      // Assert
      expect(pastedClips[0]?.timelinePosition).toBe(999999);
    });

    it('should handle fractional target times', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({ id: 'clip-1', timelinePosition: 0 });

      act(() => {
        result.current.copyClips([clip]);
      });

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(10.5);
      });

      // Assert
      expect(pastedClips[0]?.timelinePosition).toBe(10.5);
    });

    it('should handle clips with complex properties', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({
        id: 'clip-1',
        timelinePosition: 0,
        crop: { x: 10, y: 20, width: 100, height: 200 },
        transitionToNext: { type: 'fade', duration: 1 },
        volume: 0.75,
        opacity: 0.9,
        muted: true,
        speed: 1.5,
      });

      act(() => {
        result.current.copyClips([clip]);
      });

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(10);
      });

      // Assert
      const pastedClip = pastedClips[0];
      expect(pastedClip?.crop).toEqual({ x: 10, y: 20, width: 100, height: 200 });
      expect(pastedClip?.transitionToNext).toEqual({ type: 'fade', duration: 1 });
      expect(pastedClip?.volume).toBe(0.75);
      expect(pastedClip?.opacity).toBe(0.9);
      expect(pastedClip?.muted).toBe(true);
      expect(pastedClip?.speed).toBe(1.5);
    });
  });

  describe('Integration Tests', () => {
    it('should handle typical copy-paste workflow', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 0 });
      const clip2 = createMockClip({ id: 'clip-2', timelinePosition: 5 });

      // Act - Copy and paste multiple times
      act(() => {
        result.current.copyClips([clip1, clip2]);
      });

      let paste1: Clip[] = [];
      let paste2: Clip[] = [];
      act(() => {
        paste1 = result.current.pasteClips(10);
      });
      act(() => {
        paste2 = result.current.pasteClips(20);
      });

      // Assert
      expect(paste1).toHaveLength(2);
      expect(paste2).toHaveLength(2);
      expect(paste1[0]?.timelinePosition).toBe(10);
      expect(paste1[1]?.timelinePosition).toBe(15);
      expect(paste2[0]?.timelinePosition).toBe(20);
      expect(paste2[1]?.timelinePosition).toBe(25);
    });

    it('should handle copy-clear-paste workflow', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip = createMockClip({ id: 'clip-1', timelinePosition: 0 });

      // Act
      act(() => {
        result.current.copyClips([clip]);
        result.current.clearClipboard();
      });

      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(10);
      });

      // Assert
      expect(pastedClips).toEqual([]);
    });

    it('should handle copy-copy-paste workflow', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 0 });
      const clip2 = createMockClip({ id: 'clip-2', timelinePosition: 5 });

      // Act - Copy twice, should replace
      act(() => {
        result.current.copyClips([clip1]);
        result.current.copyClips([clip2]);
      });

      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(10);
      });

      // Assert
      expect(pastedClips).toHaveLength(1);
      expect(pastedClips[0]?.id).toContain('clip-2-paste-');
    });

    it('should maintain isolation between clipboard and external state', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const originalClip = createMockClip({ id: 'clip-1', timelinePosition: 0 });

      act(() => {
        result.current.copyClips([originalClip]);
      });

      // Act - Modify original clip
      originalClip.timelinePosition = 100;
      originalClip.volume = 0.1;

      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(10);
      });

      // Assert - Pasted clip should not reflect external changes
      expect(pastedClips[0]?.timelinePosition).toBe(10);
      expect(pastedClips[0]?.volume).toBeUndefined();
    });
  });

  describe('Position Calculation', () => {
    it('should calculate positions correctly with clips starting at different times', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 10 });
      const clip2 = createMockClip({ id: 'clip-2', timelinePosition: 15 });
      const clip3 = createMockClip({ id: 'clip-3', timelinePosition: 25 });

      act(() => {
        result.current.copyClips([clip1, clip2, clip3]);
      });

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(0);
      });

      // Assert - min is 10, so offsets are 0, 5, 15
      expect(pastedClips[0]?.timelinePosition).toBe(0); // 0 + (10 - 10)
      expect(pastedClips[1]?.timelinePosition).toBe(5); // 0 + (15 - 10)
      expect(pastedClips[2]?.timelinePosition).toBe(15); // 0 + (25 - 10)
    });

    it('should preserve spacing between clips', () => {
      // Arrange
      const { result } = renderHook(() => useClipboardStore());
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 0 });
      const clip2 = createMockClip({ id: 'clip-2', timelinePosition: 10 });
      const clip3 = createMockClip({ id: 'clip-3', timelinePosition: 30 });

      act(() => {
        result.current.copyClips([clip1, clip2, clip3]);
      });

      // Act
      let pastedClips: Clip[] = [];
      act(() => {
        pastedClips = result.current.pasteClips(100);
      });

      // Assert - Spacing should be preserved (10 and 20 unit gaps)
      const spacing1 = pastedClips[1]!.timelinePosition - pastedClips[0]!.timelinePosition;
      const spacing2 = pastedClips[2]!.timelinePosition - pastedClips[1]!.timelinePosition;
      expect(spacing1).toBe(10);
      expect(spacing2).toBe(20);
    });
  });
});
