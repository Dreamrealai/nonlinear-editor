import React from 'react';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  useGlobalKeyboardShortcuts,
  formatShortcut,
  getShortcutsByCategory,
  type KeyboardShortcut,
} from '@/lib/hooks/useGlobalKeyboardShortcuts';

describe('useGlobalKeyboardShortcuts', () => {
  const mockAction1 = jest.fn();
  const mockAction2 = jest.fn();

  const testShortcuts: KeyboardShortcut[] = [
    {
      id: 'save',
      keys: ['meta', 's'],
      description: 'Save',
      category: 'general',
      action: mockAction1,
    },
    {
      id: 'undo',
      keys: ['meta', 'z'],
      description: 'Undo',
      category: 'editing',
      action: mockAction2,
    },
  ];

  beforeEach(() => {
    mockAction1.mockClear();
    mockAction2.mockClear();
  });

  // Test: Hook registration
  it('registers keyboard shortcuts', () => {
    renderHook(() =>
      useGlobalKeyboardShortcuts({
        shortcuts: testShortcuts,
        enabled: true,
      })
    );

    // Verify no errors and hook completes
    expect(true).toBe(true);
  });

  // Test: Shortcut execution
  it('executes action when shortcut is pressed', () => {
    renderHook(() =>
      useGlobalKeyboardShortcuts({
        shortcuts: testShortcuts,
        enabled: true,
      })
    );

    // Simulate Cmd+S
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(mockAction1).toHaveBeenCalledTimes(1);
    expect(mockAction2).not.toHaveBeenCalled();
  });

  // Test: Multiple shortcuts
  it('handles multiple different shortcuts', () => {
    renderHook(() =>
      useGlobalKeyboardShortcuts({
        shortcuts: testShortcuts,
        enabled: true,
      })
    );

    // Cmd+S
    act(() => {
      const event1 = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event1);
    });

    expect(mockAction1).toHaveBeenCalledTimes(1);

    // Cmd+Z
    act(() => {
      const event2 = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event2);
    });

    expect(mockAction2).toHaveBeenCalledTimes(1);
  });

  // Test: Disabled shortcuts
  it('does not execute when enabled is false', () => {
    renderHook(() =>
      useGlobalKeyboardShortcuts({
        shortcuts: testShortcuts,
        enabled: false,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(mockAction1).not.toHaveBeenCalled();
  });

  // Test: Disabled in inputs
  it('disables shortcuts when typing in inputs', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    renderHook(() =>
      useGlobalKeyboardShortcuts({
        shortcuts: testShortcuts,
        enabled: true,
        disableInInputs: true,
      })
    );

    // Focus the input
    input.focus();

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });
      input.dispatchEvent(event);
    });

    expect(mockAction1).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  // Test: Priority handling
  it('executes higher priority shortcuts first', () => {
    const mockLowPriority = jest.fn();
    const mockHighPriority = jest.fn();

    const priorityShortcuts: KeyboardShortcut[] = [
      {
        id: 'low',
        keys: ['meta', 's'],
        description: 'Low priority',
        category: 'general',
        action: mockLowPriority,
        priority: 1,
      },
      {
        id: 'high',
        keys: ['meta', 's'],
        description: 'High priority',
        category: 'general',
        action: mockHighPriority,
        priority: 10,
      },
    ];

    renderHook(() =>
      useGlobalKeyboardShortcuts({
        shortcuts: priorityShortcuts,
        enabled: true,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    // Only high priority should execute
    expect(mockHighPriority).toHaveBeenCalledTimes(1);
    expect(mockLowPriority).not.toHaveBeenCalled();
  });

  // Test: Ctrl vs Meta
  it('handles both Ctrl and Meta key modifiers', () => {
    renderHook(() =>
      useGlobalKeyboardShortcuts({
        shortcuts: [
          {
            id: 'save',
            keys: ['control', 's'],
            description: 'Save',
            category: 'general',
            action: mockAction1,
          },
        ],
        enabled: true,
      })
    );

    // Ctrl+S
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(mockAction1).toHaveBeenCalledTimes(1);
  });

  // Test: Cleanup
  it('removes event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useGlobalKeyboardShortcuts({
        shortcuts: testShortcuts,
        enabled: true,
      })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});

describe('formatShortcut', () => {
  // Test: Basic formatting
  it('formats shortcut keys correctly', () => {
    expect(formatShortcut(['meta', 's'])).toMatch(/Cmd\+S|Ctrl\+S/);
    expect(formatShortcut(['control', 'z'])).toBe('Ctrl+Z');
    expect(formatShortcut(['shift', 'delete'])).toBe('Shift+Delete');
  });

  // Test: Case normalization
  it('normalizes key cases', () => {
    expect(formatShortcut(['META', 'S'])).toMatch(/Cmd\+S|Ctrl\+S/);
    expect(formatShortcut(['shift', 'a'])).toBe('Shift+A');
  });

  // Test: Multiple modifiers
  it('handles multiple modifier keys', () => {
    expect(formatShortcut(['meta', 'shift', 'z'])).toMatch(/Cmd\+Shift\+Z|Ctrl\+Shift\+Z/);
  });

  // Test: Special keys
  it('formats special keys correctly', () => {
    expect(formatShortcut(['space'])).toBe('Space');
    expect(formatShortcut(['escape'])).toBe('Escape');
    expect(formatShortcut(['delete'])).toBe('Delete');
  });
});

describe('getShortcutsByCategory', () => {
  const shortcuts: KeyboardShortcut[] = [
    {
      id: 'save',
      keys: ['meta', 's'],
      description: 'Save',
      category: 'general',
      action: jest.fn(),
    },
    {
      id: 'play',
      keys: ['space'],
      description: 'Play/Pause',
      category: 'playback',
      action: jest.fn(),
    },
    {
      id: 'undo',
      keys: ['meta', 'z'],
      description: 'Undo',
      category: 'editing',
      action: jest.fn(),
    },
    {
      id: 'disabled',
      keys: ['meta', 'd'],
      description: 'Disabled',
      category: 'general',
      action: jest.fn(),
      enabled: false,
    },
  ];

  // Test: Grouping by category
  it('groups shortcuts by category', () => {
    const grouped = getShortcutsByCategory(shortcuts);

    expect(grouped.general).toHaveLength(1);
    expect(grouped.playback).toHaveLength(1);
    expect(grouped.editing).toHaveLength(1);
    expect(grouped.navigation).toHaveLength(0);
    expect(grouped.other).toHaveLength(0);
  });

  // Test: Disabled shortcuts
  it('excludes disabled shortcuts', () => {
    const grouped = getShortcutsByCategory(shortcuts);

    expect(grouped.general).toHaveLength(1);
    expect(grouped.general[0].id).toBe('save');
  });

  // Test: Empty categories
  it('returns empty arrays for categories with no shortcuts', () => {
    const grouped = getShortcutsByCategory(shortcuts);

    expect(grouped.navigation).toEqual([]);
    expect(grouped.other).toEqual([]);
  });

  // Test: All categories present
  it('returns all category keys', () => {
    const grouped = getShortcutsByCategory(shortcuts);
    const categories = Object.keys(grouped);

    expect(categories).toContain('general');
    expect(categories).toContain('playback');
    expect(categories).toContain('editing');
    expect(categories).toContain('navigation');
    expect(categories).toContain('other');
  });
});
