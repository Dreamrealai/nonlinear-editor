/**
 * Tests for useTimelineKeyboardShortcuts Hook
 *
 * Tests keyboard shortcut handling for timeline editing operations.
 */

import { renderHook } from '@testing-library/react';
import { useTimelineKeyboardShortcuts } from '@/lib/hooks/useTimelineKeyboardShortcuts';
import type { Timeline } from '@/types/timeline';

describe('useTimelineKeyboardShortcuts', () => {
  const mockTimeline: Timeline = {
    id: 'timeline-1',
    projectId: 'project-1',
    clips: [
      {
        id: 'clip-1',
        timelinePosition: 0,
        start: 0,
        end: 10,
        trackIndex: 0,
        assetId: 'asset-1',
        type: 'video',
        locked: false,
      },
      {
        id: 'clip-2',
        timelinePosition: 15,
        start: 0,
        end: 5,
        trackIndex: 0,
        assetId: 'asset-2',
        type: 'video',
        locked: false,
      },
    ],
  };

  const mockOptions = {
    timeline: mockTimeline,
    currentTime: 5,
    selectedClipIds: new Set(['clip-1']),
    undo: jest.fn(),
    redo: jest.fn(),
    copyClips: jest.fn(),
    pasteClips: jest.fn(),
    removeClip: jest.fn(),
    clearSelection: jest.fn(),
    splitClipAtTime: jest.fn(),
    toggleClipLock: jest.fn(),
    onAddTransition: jest.fn(),
    onAddMarker: jest.fn(),
    onGroupClips: jest.fn(),
    onUngroupClips: jest.fn(),
    onAddGuide: jest.fn(),
    onToggleSnap: jest.fn(),
    onZoomIn: jest.fn(),
    onZoomOut: jest.fn(),
    onZoomReset: jest.fn(),
    onSelectAll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      configurable: true,
    });
  });

  describe('Setup and Cleanup', () => {
    it('should setup keyboard event listener on mount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should cleanup keyboard event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('Undo/Redo Shortcuts', () => {
    it('should call undo on Cmd+Z (Mac)', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        shiftKey: false,
      });

      window.dispatchEvent(event);

      expect(mockOptions.undo).toHaveBeenCalledTimes(1);
    });

    it('should call undo on Ctrl+Z (Windows)', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });

      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: false,
      });

      window.dispatchEvent(event);

      expect(mockOptions.undo).toHaveBeenCalledTimes(1);
    });

    it('should call redo on Cmd+Shift+Z (Mac)', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        shiftKey: true,
      });

      window.dispatchEvent(event);

      expect(mockOptions.redo).toHaveBeenCalledTimes(1);
    });

    it('should call redo on Cmd+Y', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'y',
        metaKey: true,
      });

      window.dispatchEvent(event);

      expect(mockOptions.redo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Copy/Paste Shortcuts', () => {
    it('should call copyClips on Cmd+C', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
      });

      window.dispatchEvent(event);

      expect(mockOptions.copyClips).toHaveBeenCalledTimes(1);
    });

    it('should call pasteClips on Cmd+V', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'v',
        metaKey: true,
      });

      window.dispatchEvent(event);

      expect(mockOptions.pasteClips).toHaveBeenCalledTimes(1);
    });
  });

  describe('Select All Shortcut', () => {
    it('should call onSelectAll on Cmd+A', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        metaKey: true,
      });

      window.dispatchEvent(event);

      expect(mockOptions.onSelectAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete Shortcuts', () => {
    it('should remove selected clips on Delete key', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', { key: 'Delete' });

      window.dispatchEvent(event);

      expect(mockOptions.removeClip).toHaveBeenCalledWith('clip-1');
      expect(mockOptions.clearSelection).toHaveBeenCalledTimes(1);
    });

    it('should remove selected clips on Backspace key', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', { key: 'Backspace' });

      window.dispatchEvent(event);

      expect(mockOptions.removeClip).toHaveBeenCalledWith('clip-1');
      expect(mockOptions.clearSelection).toHaveBeenCalledTimes(1);
    });

    it('should remove multiple selected clips', () => {
      const options = {
        ...mockOptions,
        selectedClipIds: new Set(['clip-1', 'clip-2']),
      };

      renderHook(() => useTimelineKeyboardShortcuts(options));

      const event = new KeyboardEvent('keydown', { key: 'Delete' });

      window.dispatchEvent(event);

      expect(mockOptions.removeClip).toHaveBeenCalledWith('clip-1');
      expect(mockOptions.removeClip).toHaveBeenCalledWith('clip-2');
      expect(mockOptions.clearSelection).toHaveBeenCalledTimes(1);
    });
  });

  describe('Split Clip Shortcut', () => {
    it('should split clip at playhead on S key', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 's',
        shiftKey: false,
        metaKey: false,
      });

      window.dispatchEvent(event);

      expect(mockOptions.splitClipAtTime).toHaveBeenCalledWith('clip-1', 5);
    });

    it('should split clip at playhead on uppercase S key', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'S',
        shiftKey: false,
        metaKey: false,
      });

      window.dispatchEvent(event);

      expect(mockOptions.splitClipAtTime).toHaveBeenCalledWith('clip-1', 5);
    });

    it('should not split clip if playhead not on clip', () => {
      const options = {
        ...mockOptions,
        currentTime: 12, // Between clips
      };

      renderHook(() => useTimelineKeyboardShortcuts(options));

      const event = new KeyboardEvent('keydown', {
        key: 's',
        shiftKey: false,
        metaKey: false,
      });

      window.dispatchEvent(event);

      expect(mockOptions.splitClipAtTime).not.toHaveBeenCalled();
    });

    it('should not split if S key with Shift (toggle snap instead)', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 's',
        shiftKey: true,
        metaKey: true,
      });

      window.dispatchEvent(event);

      expect(mockOptions.splitClipAtTime).not.toHaveBeenCalled();
      expect(mockOptions.onToggleSnap).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toggle Snap Shortcut', () => {
    it('should toggle snap on Cmd+Shift+S', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        shiftKey: true,
      });

      window.dispatchEvent(event);

      expect(mockOptions.onToggleSnap).toHaveBeenCalledTimes(1);
    });

    it('should toggle snap on uppercase S with Cmd+Shift', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'S',
        metaKey: true,
        shiftKey: true,
      });

      window.dispatchEvent(event);

      expect(mockOptions.onToggleSnap).toHaveBeenCalledTimes(1);
    });
  });

  describe('Lock/Unlock Shortcut', () => {
    it('should toggle lock on selected clips with L key', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', { key: 'l' });

      window.dispatchEvent(event);

      expect(mockOptions.toggleClipLock).toHaveBeenCalledWith('clip-1');
    });

    it('should toggle lock on uppercase L key', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', { key: 'L' });

      window.dispatchEvent(event);

      expect(mockOptions.toggleClipLock).toHaveBeenCalledWith('clip-1');
    });

    it('should not toggle lock if no clips selected', () => {
      const options = {
        ...mockOptions,
        selectedClipIds: new Set<string>(),
      };

      renderHook(() => useTimelineKeyboardShortcuts(options));

      const event = new KeyboardEvent('keydown', { key: 'l' });

      window.dispatchEvent(event);

      expect(mockOptions.toggleClipLock).not.toHaveBeenCalled();
    });
  });

  describe('Add Transition Shortcut', () => {
    it('should add transition on T key', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', { key: 't' });

      window.dispatchEvent(event);

      expect(mockOptions.onAddTransition).toHaveBeenCalledTimes(1);
    });

    it('should not add transition if no clips selected', () => {
      const options = {
        ...mockOptions,
        selectedClipIds: new Set<string>(),
      };

      renderHook(() => useTimelineKeyboardShortcuts(options));

      const event = new KeyboardEvent('keydown', { key: 't' });

      window.dispatchEvent(event);

      expect(mockOptions.onAddTransition).not.toHaveBeenCalled();
    });
  });

  describe('Add Marker Shortcut', () => {
    it('should add marker on M key', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', { key: 'm' });

      window.dispatchEvent(event);

      expect(mockOptions.onAddMarker).toHaveBeenCalledTimes(1);
    });

    it('should add marker on uppercase M key', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', { key: 'M' });

      window.dispatchEvent(event);

      expect(mockOptions.onAddMarker).toHaveBeenCalledTimes(1);
    });
  });

  describe('Group/Ungroup Shortcuts', () => {
    it('should group clips on G key', () => {
      const options = {
        ...mockOptions,
        selectedClipIds: new Set(['clip-1', 'clip-2']),
      };

      renderHook(() => useTimelineKeyboardShortcuts(options));

      const event = new KeyboardEvent('keydown', {
        key: 'g',
        shiftKey: false,
      });

      window.dispatchEvent(event);

      expect(mockOptions.onGroupClips).toHaveBeenCalledTimes(1);
    });

    it('should not group if less than 2 clips selected', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'g',
        shiftKey: false,
      });

      window.dispatchEvent(event);

      expect(mockOptions.onGroupClips).not.toHaveBeenCalled();
    });

    it('should ungroup clips on Shift+G', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'g',
        shiftKey: true,
      });

      window.dispatchEvent(event);

      expect(mockOptions.onUngroupClips).toHaveBeenCalledTimes(1);
    });

    it('should not ungroup if no clips selected', () => {
      const options = {
        ...mockOptions,
        selectedClipIds: new Set<string>(),
      };

      renderHook(() => useTimelineKeyboardShortcuts(options));

      const event = new KeyboardEvent('keydown', {
        key: 'g',
        shiftKey: true,
      });

      window.dispatchEvent(event);

      expect(mockOptions.onUngroupClips).not.toHaveBeenCalled();
    });
  });

  describe('Add Guide Shortcut', () => {
    it('should add guide on Shift+R', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'r',
        shiftKey: true,
      });

      window.dispatchEvent(event);

      expect(mockOptions.onAddGuide).toHaveBeenCalledTimes(1);
    });

    it('should add guide on Shift+R (uppercase)', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'R',
        shiftKey: true,
      });

      window.dispatchEvent(event);

      expect(mockOptions.onAddGuide).toHaveBeenCalledTimes(1);
    });
  });

  describe('Input Blocking', () => {
    it('should ignore shortcuts when typing in input field', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const input = document.createElement('input');
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        bubbles: true,
      });

      Object.defineProperty(event, 'target', {
        value: input,
        writable: false,
      });

      window.dispatchEvent(event);

      expect(mockOptions.undo).not.toHaveBeenCalled();
    });

    it('should ignore shortcuts when typing in textarea', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const textarea = document.createElement('textarea');
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
        bubbles: true,
      });

      Object.defineProperty(event, 'target', {
        value: textarea,
        writable: false,
      });

      window.dispatchEvent(event);

      expect(mockOptions.copyClips).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing timeline gracefully', () => {
      const options = {
        ...mockOptions,
        timeline: null,
      };

      renderHook(() => useTimelineKeyboardShortcuts(options));

      const event = new KeyboardEvent('keydown', { key: 's' });

      expect(() => window.dispatchEvent(event)).not.toThrow();
    });

    it('should handle missing callbacks gracefully', () => {
      const options = {
        ...mockOptions,
        onAddTransition: undefined,
        onAddMarker: undefined,
        toggleClipLock: undefined,
      };

      renderHook(() => useTimelineKeyboardShortcuts(options));

      expect(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
      }).not.toThrow();
    });

    it('should handle event without target', () => {
      renderHook(() => useTimelineKeyboardShortcuts(mockOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
      });

      Object.defineProperty(event, 'target', {
        value: null,
        writable: false,
      });

      expect(() => window.dispatchEvent(event)).not.toThrow();
    });
  });
});
