/**
 * Test Suite: Text Overlays Slice
 *
 * Tests text overlay management operations including:
 * - Adding text overlays
 * - Updating text overlay properties
 * - Removing text overlays
 * - History tracking integration
 * - Edge cases and validation
 */

import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline, TextOverlay } from '@/types/timeline';

describe('Text Overlays Slice', () => {
  // Helper to create a mock timeline
  const createMockTimeline = (): Timeline => ({
    projectId: 'test-project',
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

  // Helper to create a mock text overlay
  const createMockTextOverlay = (overrides?: Partial<TextOverlay>): TextOverlay => ({
    id: `text-${Date.now()}-${Math.random()}`,
    text: 'Sample Text',
    start: 0,
    end: 5,
    position: { x: 100, y: 100 },
    style: {
      fontSize: 24,
      fontFamily: 'Arial',
      color: '#ffffff',
      backgroundColor: '#000000',
      textAlign: 'center',
      fontWeight: 'normal',
      fontStyle: 'normal',
    },
    ...overrides,
  });

  beforeEach((): void => {
    // Reset store before each test
    const { result } = renderHook(() => useEditorStore());
    act(() => {
      result.current.setTimeline(null);
    });
  });

  describe('addTextOverlay', () => {
    it('should add a text overlay to timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockOverlay = createMockTextOverlay({ id: 'text-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(mockOverlay);
      });

      expect(result.current.timeline?.textOverlays).toHaveLength(1);
      expect(result.current.timeline?.textOverlays?.[0]).toEqual(mockOverlay);
    });

    it('should initialize textOverlays array if undefined', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockOverlay = createMockTextOverlay();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(mockOverlay);
      });

      expect(result.current.timeline?.textOverlays).toBeDefined();
      expect(result.current.timeline?.textOverlays).toHaveLength(1);
    });

    it('should add multiple text overlays', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const overlay1 = createMockTextOverlay({ id: 'text-1', text: 'First' });
      const overlay2 = createMockTextOverlay({ id: 'text-2', text: 'Second' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(overlay1);
        result.current.addTextOverlay(overlay2);
      });

      expect(result.current.timeline?.textOverlays).toHaveLength(2);
      expect(result.current.timeline?.textOverlays?.[0]?.text).toBe('First');
      expect(result.current.timeline?.textOverlays?.[1]?.text).toBe('Second');
    });

    it('should update history when adding text overlay', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockOverlay = createMockTextOverlay();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(mockOverlay);
      });

      expect(result.current.history.length).toBe(2); // Initial + add
      expect(result.current.historyIndex).toBe(1);
    });

    it('should not add text overlay if timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockOverlay = createMockTextOverlay();

      act(() => {
        result.current.addTextOverlay(mockOverlay);
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should add text overlays with different styles', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const overlay1 = createMockTextOverlay({
        id: 'text-1',
        style: {
          fontSize: 32,
          fontFamily: 'Times New Roman',
          color: '#ff0000',
          backgroundColor: '#000000',
          textAlign: 'left',
          fontWeight: 'bold',
          fontStyle: 'italic',
        },
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(overlay1);
      });

      expect(result.current.timeline?.textOverlays?.[0]?.style.fontWeight).toBe('bold');
      expect(result.current.timeline?.textOverlays?.[0]?.style.fontStyle).toBe('italic');
    });
  });

  describe('updateTextOverlay', () => {
    it('should update text overlay properties', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockOverlay = createMockTextOverlay({ id: 'text-1', text: 'Original' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(mockOverlay);
        result.current.updateTextOverlay('text-1', { text: 'Updated' });
      });

      expect(result.current.timeline?.textOverlays?.[0]?.text).toBe('Updated');
    });

    it('should update text overlay position', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockOverlay = createMockTextOverlay({ id: 'text-1', position: { x: 100, y: 100 } });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(mockOverlay);
        result.current.updateTextOverlay('text-1', { position: { x: 200, y: 300 } });
      });

      expect(result.current.timeline?.textOverlays?.[0]?.position).toEqual({ x: 200, y: 300 });
    });

    it('should update text overlay timing', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockOverlay = createMockTextOverlay({ id: 'text-1', start: 0, end: 5 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(mockOverlay);
        result.current.updateTextOverlay('text-1', { start: 2, end: 8 });
      });

      expect(result.current.timeline?.textOverlays?.[0]?.start).toBe(2);
      expect(result.current.timeline?.textOverlays?.[0]?.end).toBe(8);
    });

    it('should update text overlay style properties', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockOverlay = createMockTextOverlay({ id: 'text-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(mockOverlay);
        result.current.updateTextOverlay('text-1', {
          style: {
            fontSize: 48,
            fontFamily: 'Helvetica',
            color: '#00ff00',
            backgroundColor: '#ffffff',
            textAlign: 'right',
            fontWeight: 'bold',
            fontStyle: 'normal',
          },
        });
      });

      const overlay = result.current.timeline?.textOverlays?.[0];
      expect(overlay?.style.fontSize).toBe(48);
      expect(overlay?.style.color).toBe('#00ff00');
      expect(overlay?.style.textAlign).toBe('right');
    });

    it('should update history when updating text overlay', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockOverlay = createMockTextOverlay({ id: 'text-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(mockOverlay);
        result.current.updateTextOverlay('text-1', { text: 'Updated' });
      });

      expect(result.current.history.length).toBe(3); // Initial + add + update
    });

    it('should not update if text overlay not found', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTextOverlay('nonexistent-text', { text: 'Updated' });
      });

      expect(result.current.history.length).toBe(1); // Only initial
    });

    it('should handle partial updates', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockOverlay = createMockTextOverlay({
        id: 'text-1',
        text: 'Original',
        position: { x: 100, y: 100 },
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(mockOverlay);
        result.current.updateTextOverlay('text-1', { text: 'Updated Only Text' });
      });

      const overlay = result.current.timeline?.textOverlays?.[0];
      expect(overlay?.text).toBe('Updated Only Text');
      expect(overlay?.position).toEqual({ x: 100, y: 100 }); // Should remain unchanged
    });
  });

  describe('removeTextOverlay', () => {
    it('should remove text overlay from timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockOverlay = createMockTextOverlay({ id: 'text-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(mockOverlay);
        result.current.removeTextOverlay('text-1');
      });

      expect(result.current.timeline?.textOverlays).toHaveLength(0);
    });

    it('should remove specific text overlay from multiple overlays', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const overlay1 = createMockTextOverlay({ id: 'text-1' });
      const overlay2 = createMockTextOverlay({ id: 'text-2' });
      const overlay3 = createMockTextOverlay({ id: 'text-3' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(overlay1);
        result.current.addTextOverlay(overlay2);
        result.current.addTextOverlay(overlay3);
        result.current.removeTextOverlay('text-2');
      });

      expect(result.current.timeline?.textOverlays).toHaveLength(2);
      expect(result.current.timeline?.textOverlays?.find((t) => t.id === 'text-2')).toBeUndefined();
    });

    it('should update history when removing text overlay', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockOverlay = createMockTextOverlay({ id: 'text-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(mockOverlay);
        result.current.removeTextOverlay('text-1');
      });

      expect(result.current.history.length).toBe(3); // Initial + add + remove
    });

    it('should handle removing nonexistent text overlay gracefully', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.removeTextOverlay('nonexistent-text');
      });

      expect(result.current.timeline?.textOverlays).toBeUndefined();
    });

    it('should handle removal when textOverlays is undefined', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.removeTextOverlay('text-1');
      });

      expect(result.current.timeline).toBeDefined();
    });
  });

  describe('History Integration', () => {
    it('should track history for all text overlay operations', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const overlay1 = createMockTextOverlay({ id: 'text-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      const initialHistory = result.current.history.length;

      act(() => {
        result.current.addTextOverlay(overlay1);
      });

      expect(result.current.history.length).toBe(initialHistory + 1);
    });

    it('should allow undo of text overlay operations', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const overlay1 = createMockTextOverlay({ id: 'text-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(overlay1);
        result.current.undo();
      });

      expect(result.current.timeline?.textOverlays).toHaveLength(0);
    });

    it('should respect MAX_HISTORY limit', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);

        // Add 52 text overlays (should exceed MAX_HISTORY of 50)
        for (let i = 0; i < 52; i++) {
          result.current.addTextOverlay(createMockTextOverlay({ id: `text-${i}` }));
        }
      });

      expect(result.current.history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle text overlays with same position', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const overlay1 = createMockTextOverlay({ id: 'text-1', position: { x: 100, y: 100 } });
      const overlay2 = createMockTextOverlay({ id: 'text-2', position: { x: 100, y: 100 } });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(overlay1);
        result.current.addTextOverlay(overlay2);
      });

      expect(result.current.timeline?.textOverlays).toHaveLength(2);
    });

    it('should handle text overlays with overlapping time ranges', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const overlay1 = createMockTextOverlay({ id: 'text-1', start: 0, end: 10 });
      const overlay2 = createMockTextOverlay({ id: 'text-2', start: 5, end: 15 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(overlay1);
        result.current.addTextOverlay(overlay2);
      });

      expect(result.current.timeline?.textOverlays).toHaveLength(2);
    });

    it('should handle empty text content', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const overlay = createMockTextOverlay({ id: 'text-1', text: '' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(overlay);
      });

      expect(result.current.timeline?.textOverlays?.[0]?.text).toBe('');
    });
  });
});
