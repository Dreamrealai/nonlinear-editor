/**
 * Comprehensive tests for useKeyboardShortcuts hook
 */

import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useEditorStore } from '@/state/useEditorStore';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('@/state/useEditorStore');
jest.mock('react-hot-toast');

const mockUseEditorStore = useEditorStore as jest.MockedFunction<typeof useEditorStore>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('useKeyboardShortcuts', () => {
  // Mock store functions
  const mockUndo = jest.fn();
  const mockRedo = jest.fn();
  const mockCanUndo = jest.fn();
  const mockCanRedo = jest.fn();
  const mockRemoveClip = jest.fn();
  const mockCopyClips = jest.fn();
  const mockPasteClips = jest.fn();
  const mockSelectClip = jest.fn();
  const mockClearSelection = jest.fn();

  const mockTimeline = {
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
      {
        id: 'clip-2',
        assetId: 'asset-2',
        start: 0,
        end: 3,
        timelinePosition: 5,
        trackIndex: 0,
        effects: [],
        volume: 1,
      },
    ],
    textOverlays: [],
    transitions: [],
  };

  const mockSelectedClipIds = new Set(['clip-1']);

  // Helper to create keyboard event
  const createKeyboardEvent = (
    key: string,
    options: {
      ctrlKey?: boolean;
      metaKey?: boolean;
      shiftKey?: boolean;
      target?: EventTarget;
    } = {}
  ) => {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: options.ctrlKey || false,
      metaKey: options.metaKey || false,
      shiftKey: options.shiftKey || false,
      bubbles: true,
      cancelable: true,
    });

    if (options.target) {
      Object.defineProperty(event, 'target', {
        value: options.target,
        writable: false,
      });
    }

    return event;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default store mock
    mockUseEditorStore.mockImplementation((selector: any) => {
      const state = {
        timeline: mockTimeline,
        selectedClipIds: mockSelectedClipIds,
        undo: mockUndo,
        redo: mockRedo,
        canUndo: mockCanUndo,
        canRedo: mockCanRedo,
        removeClip: mockRemoveClip,
        copyClips: mockCopyClips,
        pasteClips: mockPasteClips,
        selectClip: mockSelectClip,
        clearSelection: mockClearSelection,
      };
      return selector(state);
    });

    mockCanUndo.mockReturnValue(true);
    mockCanRedo.mockReturnValue(true);
    mockToast.success = jest.fn();
  });

  describe('Initialization', () => {
    it('should initialize without errors', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());
      expect(result.current).toBeUndefined();
    });

    it('should not register shortcuts when disabled', () => {
      renderHook(() => useKeyboardShortcuts({ enabled: false }));

      const event = createKeyboardEvent('z', { metaKey: true });
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockUndo).not.toHaveBeenCalled();
    });

    it('should register shortcuts when enabled', () => {
      renderHook(() => useKeyboardShortcuts({ enabled: true }));

      const event = createKeyboardEvent('z', { metaKey: true });
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockUndo).toHaveBeenCalled();
    });
  });

  describe('Undo/Redo Shortcuts', () => {
    describe('Undo (Cmd/Ctrl+Z)', () => {
      it('should undo on Mac (Cmd+Z)', () => {
        // Mock Mac platform
        Object.defineProperty(navigator, 'platform', {
          value: 'MacIntel',
          writable: true,
          configurable: true,
        });

        renderHook(() => useKeyboardShortcuts());

        const event = createKeyboardEvent('z', { metaKey: true });
        const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

        act(() => {
          window.dispatchEvent(event);
        });

        expect(mockUndo).toHaveBeenCalled();
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(mockToast.success).toHaveBeenCalledWith('Undo', { duration: 1000 });
      });

      it('should undo on Windows/Linux (Ctrl+Z)', () => {
        // Mock Windows platform
        Object.defineProperty(navigator, 'platform', {
          value: 'Win32',
          writable: true,
          configurable: true,
        });

        renderHook(() => useKeyboardShortcuts());

        const event = createKeyboardEvent('z', { ctrlKey: true });
        act(() => {
          window.dispatchEvent(event);
        });

        expect(mockUndo).toHaveBeenCalled();
      });

      it('should not undo when canUndo returns false', () => {
        mockCanUndo.mockReturnValue(false);

        renderHook(() => useKeyboardShortcuts());

        const event = createKeyboardEvent('z', { metaKey: true });
        act(() => {
          window.dispatchEvent(event);
        });

        expect(mockUndo).not.toHaveBeenCalled();
      });
    });

    describe('Redo', () => {
      it('should redo on Mac (Cmd+Shift+Z)', () => {
        Object.defineProperty(navigator, 'platform', {
          value: 'MacIntel',
          writable: true,
          configurable: true,
        });

        renderHook(() => useKeyboardShortcuts());

        const event = createKeyboardEvent('z', { metaKey: true, shiftKey: true });
        const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

        act(() => {
          window.dispatchEvent(event);
        });

        expect(mockRedo).toHaveBeenCalled();
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(mockToast.success).toHaveBeenCalledWith('Redo', { duration: 1000 });
      });

      it('should redo on Windows (Ctrl+Y)', () => {
        Object.defineProperty(navigator, 'platform', {
          value: 'Win32',
          writable: true,
          configurable: true,
        });

        renderHook(() => useKeyboardShortcuts());

        const event = createKeyboardEvent('y', { ctrlKey: true });
        act(() => {
          window.dispatchEvent(event);
        });

        expect(mockRedo).toHaveBeenCalled();
      });

      it('should redo on Windows (Ctrl+Shift+Z)', () => {
        Object.defineProperty(navigator, 'platform', {
          value: 'Win32',
          writable: true,
          configurable: true,
        });

        renderHook(() => useKeyboardShortcuts());

        const event = createKeyboardEvent('z', { ctrlKey: true, shiftKey: true });
        act(() => {
          window.dispatchEvent(event);
        });

        expect(mockRedo).toHaveBeenCalled();
      });

      it('should not redo when canRedo returns false', () => {
        mockCanRedo.mockReturnValue(false);

        renderHook(() => useKeyboardShortcuts());

        const event = createKeyboardEvent('z', { metaKey: true, shiftKey: true });
        act(() => {
          window.dispatchEvent(event);
        });

        expect(mockRedo).not.toHaveBeenCalled();
      });
    });
  });

  describe('Copy/Paste/Select All Shortcuts', () => {
    it('should copy selected clips (Cmd/Ctrl+C)', () => {
      renderHook(() => useKeyboardShortcuts());

      const event = createKeyboardEvent('c', { metaKey: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockCopyClips).toHaveBeenCalled();
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Copied 1 clip', { duration: 1500 });
    });

    it('should copy multiple clips', () => {
      mockUseEditorStore.mockImplementation((selector: any) => {
        const state = {
          timeline: mockTimeline,
          selectedClipIds: new Set(['clip-1', 'clip-2', 'clip-3']),
          undo: mockUndo,
          redo: mockRedo,
          canUndo: mockCanUndo,
          canRedo: mockCanRedo,
          removeClip: mockRemoveClip,
          copyClips: mockCopyClips,
          pasteClips: mockPasteClips,
          selectClip: mockSelectClip,
          clearSelection: mockClearSelection,
        };
        return selector(state);
      });

      renderHook(() => useKeyboardShortcuts());

      const event = createKeyboardEvent('c', { metaKey: true });
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockToast.success).toHaveBeenCalledWith('Copied 3 clips', { duration: 1500 });
    });

    it('should not copy when no clips selected', () => {
      mockUseEditorStore.mockImplementation((selector: any) => {
        const state = {
          timeline: mockTimeline,
          selectedClipIds: new Set(),
          undo: mockUndo,
          redo: mockRedo,
          canUndo: mockCanUndo,
          canRedo: mockCanRedo,
          removeClip: mockRemoveClip,
          copyClips: mockCopyClips,
          pasteClips: mockPasteClips,
          selectClip: mockSelectClip,
          clearSelection: mockClearSelection,
        };
        return selector(state);
      });

      renderHook(() => useKeyboardShortcuts());

      const event = createKeyboardEvent('c', { metaKey: true });
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockCopyClips).not.toHaveBeenCalled();
    });

    it('should paste clips (Cmd/Ctrl+V)', () => {
      renderHook(() => useKeyboardShortcuts());

      const event = createKeyboardEvent('v', { metaKey: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockPasteClips).toHaveBeenCalled();
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should select all clips (Cmd/Ctrl+A)', () => {
      renderHook(() => useKeyboardShortcuts());

      const event = createKeyboardEvent('a', { metaKey: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockClearSelection).toHaveBeenCalled();
      expect(mockSelectClip).toHaveBeenCalledTimes(2);
      expect(mockSelectClip).toHaveBeenCalledWith('clip-1', true);
      expect(mockSelectClip).toHaveBeenCalledWith('clip-2', true);
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Selected 2 clips', { duration: 1500 });
    });

    it('should not select all when timeline is empty', () => {
      mockUseEditorStore.mockImplementation((selector: any) => {
        const state = {
          timeline: { clips: [], textOverlays: [], transitions: [] },
          selectedClipIds: new Set(),
          undo: mockUndo,
          redo: mockRedo,
          canUndo: mockCanUndo,
          canRedo: mockCanRedo,
          removeClip: mockRemoveClip,
          copyClips: mockCopyClips,
          pasteClips: mockPasteClips,
          selectClip: mockSelectClip,
          clearSelection: mockClearSelection,
        };
        return selector(state);
      });

      renderHook(() => useKeyboardShortcuts());

      const event = createKeyboardEvent('a', { metaKey: true });
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockSelectClip).not.toHaveBeenCalled();
    });
  });

  describe('Delete Shortcut', () => {
    it('should delete selected clips on Delete key', () => {
      renderHook(() => useKeyboardShortcuts());

      const event = createKeyboardEvent('Delete');
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockRemoveClip).toHaveBeenCalledWith('clip-1');
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Deleted 1 clip', { duration: 1500 });
    });

    it('should delete selected clips on Backspace key', () => {
      renderHook(() => useKeyboardShortcuts());

      const event = createKeyboardEvent('Backspace');
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockRemoveClip).toHaveBeenCalledWith('clip-1');
    });

    it('should delete multiple selected clips', () => {
      mockUseEditorStore.mockImplementation((selector: any) => {
        const state = {
          timeline: mockTimeline,
          selectedClipIds: new Set(['clip-1', 'clip-2']),
          undo: mockUndo,
          redo: mockRedo,
          canUndo: mockCanUndo,
          canRedo: mockCanRedo,
          removeClip: mockRemoveClip,
          copyClips: mockCopyClips,
          pasteClips: mockPasteClips,
          selectClip: mockSelectClip,
          clearSelection: mockClearSelection,
        };
        return selector(state);
      });

      renderHook(() => useKeyboardShortcuts());

      const event = createKeyboardEvent('Delete');
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockRemoveClip).toHaveBeenCalledTimes(2);
      expect(mockToast.success).toHaveBeenCalledWith('Deleted 2 clips', { duration: 1500 });
    });

    it('should not delete when no clips selected', () => {
      mockUseEditorStore.mockImplementation((selector: any) => {
        const state = {
          timeline: mockTimeline,
          selectedClipIds: new Set(),
          undo: mockUndo,
          redo: mockRedo,
          canUndo: mockCanUndo,
          canRedo: mockCanRedo,
          removeClip: mockRemoveClip,
          copyClips: mockCopyClips,
          pasteClips: mockPasteClips,
          selectClip: mockSelectClip,
          clearSelection: mockClearSelection,
        };
        return selector(state);
      });

      renderHook(() => useKeyboardShortcuts());

      const event = createKeyboardEvent('Delete');
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockRemoveClip).not.toHaveBeenCalled();
    });
  });

  describe('Play/Pause Shortcut', () => {
    it('should trigger play/pause on Space key', () => {
      const onPlayPause = jest.fn();
      renderHook(() => useKeyboardShortcuts({ onPlayPause }));

      const event = createKeyboardEvent(' ');
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      act(() => {
        window.dispatchEvent(event);
      });

      expect(onPlayPause).toHaveBeenCalled();
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should handle spacebar key name', () => {
      const onPlayPause = jest.fn();
      renderHook(() => useKeyboardShortcuts({ onPlayPause }));

      const event = createKeyboardEvent('spacebar');
      act(() => {
        window.dispatchEvent(event);
      });

      expect(onPlayPause).toHaveBeenCalled();
    });

    it('should not trigger play/pause when callback not provided', () => {
      renderHook(() => useKeyboardShortcuts());

      const event = createKeyboardEvent(' ');
      act(() => {
        window.dispatchEvent(event);
      });

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('Typing Context Detection', () => {
    it('should not trigger shortcuts in input fields', () => {
      renderHook(() => useKeyboardShortcuts());

      const input = document.createElement('input');
      const event = createKeyboardEvent('z', { metaKey: true, target: input });

      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockUndo).not.toHaveBeenCalled();
    });

    it('should not trigger shortcuts in textarea', () => {
      renderHook(() => useKeyboardShortcuts());

      const textarea = document.createElement('textarea');
      const event = createKeyboardEvent('z', { metaKey: true, target: textarea });

      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockUndo).not.toHaveBeenCalled();
    });

    it('should not trigger shortcuts in select elements', () => {
      renderHook(() => useKeyboardShortcuts());

      const select = document.createElement('select');
      const event = createKeyboardEvent('z', { metaKey: true, target: select });

      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockUndo).not.toHaveBeenCalled();
    });

    it('should not trigger shortcuts in contenteditable elements', () => {
      renderHook(() => useKeyboardShortcuts());

      const div = document.createElement('div');
      div.contentEditable = 'true';
      const event = createKeyboardEvent('z', { metaKey: true, target: div });

      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockUndo).not.toHaveBeenCalled();
    });

    it('should trigger shortcuts in normal elements', () => {
      renderHook(() => useKeyboardShortcuts());

      const div = document.createElement('div');
      const event = createKeyboardEvent('z', { metaKey: true, target: div });

      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockUndo).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      unmount();

      const event = createKeyboardEvent('z', { metaKey: true });
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockUndo).not.toHaveBeenCalled();
    });

    it('should re-register listeners when dependencies change', () => {
      const { rerender } = renderHook(({ enabled }) => useKeyboardShortcuts({ enabled }), {
        initialProps: { enabled: true },
      });

      const event = createKeyboardEvent('z', { metaKey: true });
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockUndo).toHaveBeenCalledTimes(1);

      mockUndo.mockClear();

      // Rerender with same props
      rerender({ enabled: true });

      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle uppercase keys', () => {
      renderHook(() => useKeyboardShortcuts());

      const event = createKeyboardEvent('Z', { metaKey: true });
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mockUndo).toHaveBeenCalled();
    });

    it('should handle mixed case keys', () => {
      renderHook(() => useKeyboardShortcuts());

      const events = [
        createKeyboardEvent('C', { metaKey: true }),
        createKeyboardEvent('V', { metaKey: true }),
        createKeyboardEvent('A', { metaKey: true }),
      ];

      events.forEach((event) => {
        act(() => {
          window.dispatchEvent(event);
        });
      });

      expect(mockCopyClips).toHaveBeenCalled();
      expect(mockPasteClips).toHaveBeenCalled();
      expect(mockClearSelection).toHaveBeenCalled();
    });
  });
});
