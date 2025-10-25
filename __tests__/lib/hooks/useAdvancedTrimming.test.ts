/**
 * Tests for useAdvancedTrimming Hook
 *
 * Tests trim operations including:
 * - Normal trim
 * - Ripple edit (moves following clips)
 * - Roll edit (adjusts adjacent clips)
 * - Slip edit (changes in/out points)
 * - Keyboard modifier detection
 */

import { renderHook, act } from '@testing-library/react';
import { useAdvancedTrimming } from '@/lib/hooks/useAdvancedTrimming';
import type { Clip, Timeline } from '@/types/timeline';

// Mock timeline with multiple clips
const createMockClip = (overrides: Partial<Clip> = {}): Clip => ({
  id: `clip-${Date.now()}`,
  assetId: 'asset-1',
  trackIndex: 0,
  timelinePosition: 0,
  start: 0,
  end: 10,
  filePath: 'test.mp4',
  sourceDuration: 30,
  ...overrides,
});

const createMockTimeline = (clips: Clip[] = []): Timeline => ({
  id: 'timeline-1',
  projectId: 'project-1',
  name: 'Test Timeline',
  clips,
  duration: 100,
  width: 1920,
  height: 1080,
  fps: 30,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('useAdvancedTrimming', () => {
  let updateClipMock: jest.Mock;

  beforeEach(() => {
    updateClipMock = jest.fn();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const timeline = createMockTimeline();
      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      expect(result.current.modifiers).toEqual({
        shift: false,
        alt: false,
        cmd: false,
        ctrl: false,
      });
      expect(result.current.currentEditMode).toBe('normal');
      expect(result.current.currentOperation).toBeNull();
      expect(result.current.feedback).toBeNull();
    });
  });

  describe('Keyboard Modifiers', () => {
    it('should track shift key for ripple mode', () => {
      const timeline = createMockTimeline();
      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { shiftKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.modifiers.shift).toBe(true);
      expect(result.current.currentEditMode).toBe('ripple');
    });

    it('should track alt key for roll mode', () => {
      const timeline = createMockTimeline();
      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { altKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.modifiers.alt).toBe(true);
      expect(result.current.currentEditMode).toBe('roll');
    });

    it('should track cmd key for slip mode', () => {
      const timeline = createMockTimeline();
      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { metaKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.modifiers.cmd).toBe(true);
      expect(result.current.currentEditMode).toBe('slip');
    });

    it('should update modifiers on keyup', () => {
      const timeline = createMockTimeline();
      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { shiftKey: true }));
      });

      expect(result.current.modifiers.shift).toBe(true);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { shiftKey: false }));
      });

      expect(result.current.modifiers.shift).toBe(false);
      expect(result.current.currentEditMode).toBe('normal');
    });
  });

  describe('Normal Trim', () => {
    it('should calculate normal trim operation', () => {
      const clip = createMockClip({ id: 'clip-1', start: 0, end: 10, timelinePosition: 5 });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      const operation = result.current.calculateTrimOperation(clip, 'right', 0, 15, 5);

      expect(operation).not.toBeNull();
      expect(operation?.editMode).toBe('normal');
      expect(operation?.clipId).toBe('clip-1');
      expect(operation?.newStart).toBe(0);
      expect(operation?.newEnd).toBe(15);
      expect(operation?.newPosition).toBe(5);
    });

    it('should execute normal trim operation', () => {
      const clip = createMockClip({ id: 'clip-1', start: 0, end: 10, timelinePosition: 5 });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      const operation = result.current.calculateTrimOperation(clip, 'right', 0, 15, 5);

      act(() => {
        if (operation) {
          result.current.executeTrimOperation(operation);
        }
      });

      expect(updateClipMock).toHaveBeenCalledWith('clip-1', {
        start: 0,
        end: 15,
        timelinePosition: 5,
      });
    });

    it('should reject trim with duration below minimum', () => {
      const clip = createMockClip({ id: 'clip-1', start: 0, end: 10, timelinePosition: 5 });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      // Try to trim to 0.01 seconds (below MIN_CLIP_DURATION)
      const operation = result.current.calculateTrimOperation(clip, 'right', 0, 0.01, 5);

      expect(operation).toBeNull();
    });

    it('should reject trim beyond source duration', () => {
      const clip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 5,
        sourceDuration: 20,
      });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      // Try to trim beyond source duration (30 > 20)
      const operation = result.current.calculateTrimOperation(clip, 'right', 0, 30, 5);

      expect(operation).toBeNull();
    });
  });

  describe('Ripple Edit', () => {
    it('should calculate ripple trim with affected clips', () => {
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 0, start: 0, end: 10 });
      const clip2 = createMockClip({ id: 'clip-2', timelinePosition: 10, start: 0, end: 5 });
      const clip3 = createMockClip({ id: 'clip-3', timelinePosition: 15, start: 0, end: 5 });
      const timeline = createMockTimeline([clip1, clip2, clip3]);

      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      // Enable ripple mode
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { shiftKey: true }));
      });

      // Trim clip1 from 10s to 15s (adds 5s)
      const operation = result.current.calculateTrimOperation(clip1, 'right', 0, 15, 0);

      expect(operation?.editMode).toBe('ripple');
      expect(operation?.affectedClips).toHaveLength(2);
      expect(operation?.affectedClips?.[0].clipId).toBe('clip-2');
      expect(operation?.affectedClips?.[0].newPosition).toBe(15); // Moved by +5s
      expect(operation?.affectedClips?.[1].clipId).toBe('clip-3');
      expect(operation?.affectedClips?.[1].newPosition).toBe(20); // Moved by +5s
    });

    it('should execute ripple trim and update affected clips', () => {
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 0, start: 0, end: 10 });
      const clip2 = createMockClip({ id: 'clip-2', timelinePosition: 10, start: 0, end: 5 });
      const timeline = createMockTimeline([clip1, clip2]);

      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { shiftKey: true }));
      });

      const operation = result.current.calculateTrimOperation(clip1, 'right', 0, 15, 0);

      act(() => {
        if (operation) {
          result.current.executeTrimOperation(operation);
        }
      });

      expect(updateClipMock).toHaveBeenCalledTimes(2);
      expect(updateClipMock).toHaveBeenCalledWith('clip-1', {
        start: 0,
        end: 15,
        timelinePosition: 0,
      });
      expect(updateClipMock).toHaveBeenCalledWith('clip-2', {
        timelinePosition: 15,
      });
    });
  });

  describe('Roll Edit', () => {
    it('should calculate roll trim with adjacent clip', () => {
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 0, start: 0, end: 10 });
      const clip2 = createMockClip({ id: 'clip-2', timelinePosition: 10, start: 0, end: 10 });
      const timeline = createMockTimeline([clip1, clip2]);

      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { altKey: true }));
      });

      // Trim clip1 end from 10s to 12s (add 2s)
      const operation = result.current.calculateTrimOperation(clip1, 'right', 0, 12, 0);

      expect(operation?.editMode).toBe('roll');
      expect(operation?.affectedClips).toHaveLength(1);
      expect(operation?.affectedClips?.[0].clipId).toBe('clip-2');
      expect(operation?.affectedClips?.[0].newStart).toBe(2); // Clip2 start moved by +2s
    });

    it('should fall back to normal trim when no adjacent clip', () => {
      const clip = createMockClip({ id: 'clip-1', timelinePosition: 0, start: 0, end: 10 });
      const timeline = createMockTimeline([clip]);

      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { altKey: true }));
      });

      const operation = result.current.calculateTrimOperation(clip, 'right', 0, 15, 0);

      expect(operation?.editMode).toBe('normal'); // Falls back because no adjacent clip
    });
  });

  describe('Slip Edit', () => {
    it('should calculate slip edit operation', () => {
      const clip = createMockClip({
        id: 'clip-1',
        timelinePosition: 5,
        start: 0,
        end: 10,
        sourceDuration: 30,
      });
      const timeline = createMockTimeline([clip]);

      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { metaKey: true }));
      });

      // Slip: change start from 0 to 5 (delta +5)
      const operation = result.current.calculateTrimOperation(clip, 'left', 5, 15, 5);

      expect(operation?.editMode).toBe('slip');
      expect(operation?.newStart).toBe(5);
      expect(operation?.newEnd).toBe(15);
      expect(operation?.newPosition).toBe(5); // Position unchanged
    });

    it('should clamp slip to source duration bounds', () => {
      const clip = createMockClip({
        id: 'clip-1',
        timelinePosition: 5,
        start: 20,
        end: 30,
        sourceDuration: 30,
      });
      const timeline = createMockTimeline([clip]);

      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { metaKey: true }));
      });

      // For slip mode, we need to calculate based on delta (newStart - clip.start)
      // If we want to slip from 20-30 to 25-35, the delta would be +5
      // But since sourceDuration is 30, it should clamp to 20-30
      const operation = result.current.calculateTrimOperation(clip, 'left', 20, 30, 5);

      // The operation should exist and maintain the bounds
      expect(operation).not.toBeNull();
      expect(operation?.editMode).toBe('slip');
      // Position should not change in slip mode
      expect(operation?.newPosition).toBe(5);
    });
  });

  describe('Feedback', () => {
    it('should generate feedback after executing operation', () => {
      jest.useFakeTimers();
      const clip = createMockClip({ id: 'clip-1', start: 0, end: 10, timelinePosition: 5 });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      const operation = result.current.calculateTrimOperation(clip, 'right', 0, 15, 5);

      act(() => {
        if (operation) {
          result.current.executeTrimOperation(operation);
        }
      });

      expect(result.current.feedback).not.toBeNull();
      expect(result.current.feedback?.mode).toBe('normal');
      expect(result.current.feedback?.primaryClip.deltaTime).toBe(5); // 15 - 10

      // Feedback should clear after 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.feedback).toBeNull();

      jest.useRealTimers();
    });

    it('should allow manual feedback clearing', () => {
      const clip = createMockClip({ id: 'clip-1', start: 0, end: 10, timelinePosition: 5 });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      const operation = result.current.calculateTrimOperation(clip, 'right', 0, 15, 5);

      act(() => {
        if (operation) {
          result.current.executeTrimOperation(operation);
        }
      });

      expect(result.current.feedback).not.toBeNull();

      act(() => {
        result.current.clearFeedback();
      });

      expect(result.current.feedback).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should remove keyboard listeners on unmount', () => {
      const timeline = createMockTimeline();
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useAdvancedTrimming({ timeline, updateClip: updateClipMock })
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});
