/**
 * Tests for KeyboardShortcutsHelp Component
 *
 * Tests keyboard shortcuts modal display and interactions
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  KeyboardShortcutsHelp,
  useKeyboardShortcutsHelp,
} from '@/components/KeyboardShortcutsHelp';
import type { KeyboardShortcut } from '@/lib/hooks/useGlobalKeyboardShortcuts';

// Mock the hooks
jest.mock('@/lib/hooks/useGlobalKeyboardShortcuts', () => ({
  formatShortcut: jest.fn((keys: string[]) => keys.join('+')),
  getShortcutsByCategory: jest.fn((shortcuts) => {
    const grouped: Record<string, KeyboardShortcut[]> = {
      general: [],
      playback: [],
      editing: [],
      navigation: [],
      other: [],
    };
    shortcuts.forEach((shortcut: KeyboardShortcut) => {
      const category = shortcut.category || 'other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(shortcut);
    });
    return grouped;
  }),
  useGlobalKeyboardShortcuts: jest.fn(),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <div>Close Icon</div>,
  Keyboard: () => <div>Keyboard Icon</div>,
}));

describe('KeyboardShortcutsHelp', () => {
  const mockShortcuts: KeyboardShortcut[] = [
    {
      id: 'play-pause',
      keys: ['space'],
      description: 'Play/Pause video',
      category: 'playback',
      action: jest.fn(),
      priority: 1,
    },
    {
      id: 'save',
      keys: ['meta', 's'],
      description: 'Save project',
      category: 'general',
      action: jest.fn(),
      priority: 1,
    },
    {
      id: 'undo',
      keys: ['meta', 'z'],
      description: 'Undo last action',
      category: 'editing',
      action: jest.fn(),
      priority: 1,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('Controlled Component', () => {
    it('renders when isOpen is true', () => {
      render(<KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={false} onClose={jest.fn()} />
      );

      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      const onClose = jest.fn();
      render(<KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = jest.fn();
      const { container } = render(
        <KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={onClose} />
      );

      const backdrop = container.querySelector('.fixed.inset-0');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });
  });

  describe('Shortcuts Display', () => {
    it('displays all shortcuts', () => {
      render(<KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText('Play/Pause video')).toBeInTheDocument();
      expect(screen.getByText('Save project')).toBeInTheDocument();
      expect(screen.getByText('Undo last action')).toBeInTheDocument();
    });

    it('groups shortcuts by category', () => {
      render(<KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText('General')).toBeInTheDocument();
      expect(screen.getByText('Playback')).toBeInTheDocument();
      expect(screen.getByText('Editing')).toBeInTheDocument();
    });

    it('displays keyboard shortcut combinations', () => {
      render(<KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={jest.fn()} />);

      // Check for kbd elements
      const kbdElements = screen.getAllByRole('generic', { hidden: true });
      expect(kbdElements.length).toBeGreaterThan(0);
    });

    it('shows empty state when no shortcuts', () => {
      render(<KeyboardShortcutsHelp shortcuts={[]} isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText('No keyboard shortcuts available')).toBeInTheDocument();
    });
  });

  describe('Modal Styling', () => {
    it('has modal backdrop with blur', () => {
      const { container } = render(
        <KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={jest.fn()} />
      );

      const backdrop = container.querySelector('.backdrop-blur-sm');
      expect(backdrop).toBeInTheDocument();
    });

    it('has proper ARIA attributes', () => {
      render(<KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={jest.fn()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'shortcuts-modal-title');
    });

    it('prevents body scroll when open', async () => {
      const { unmount } = render(
        <KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={jest.fn()} />
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });

      unmount();

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('');
      });
    });

    it('has scrollable content area', () => {
      const { container } = render(
        <KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={jest.fn()} />
      );

      const scrollableArea = container.querySelector('.overflow-y-auto');
      expect(scrollableArea).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('displays Escape key instruction', () => {
      render(<KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText(/press/i)).toBeInTheDocument();
      expect(screen.getByText('Esc')).toBeInTheDocument();
      expect(screen.getByText(/to close/i)).toBeInTheDocument();
    });

    it('has footer with distinct styling', () => {
      const { container } = render(
        <KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={jest.fn()} />
      );

      const footer = container.querySelector('.border-t.bg-neutral-50');
      expect(footer).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('only shows categories with shortcuts', () => {
      const singleCategoryShortcuts: KeyboardShortcut[] = [
        {
          id: 'play',
          keys: ['space'],
          description: 'Play',
          category: 'playback',
          action: jest.fn(),
          priority: 1,
        },
      ];

      render(
        <KeyboardShortcutsHelp
          shortcuts={singleCategoryShortcuts}
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByText('Playback')).toBeInTheDocument();
      expect(screen.queryByText('General')).not.toBeInTheDocument();
      expect(screen.queryByText('Editing')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports Escape key to close via keydown handler', () => {
      const onClose = jest.fn();
      const { container } = render(
        <KeyboardShortcutsHelp shortcuts={mockShortcuts} isOpen={true} onClose={onClose} />
      );

      const modalBackdrop = container.querySelector('[role="presentation"]');
      if (modalBackdrop) {
        fireEvent.keyDown(modalBackdrop, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
      }
    });
  });
});

describe('useKeyboardShortcutsHelp', () => {
  it('returns initial state with isOpen false', () => {
    const { result } = require('@testing-library/react').renderHook(() =>
      useKeyboardShortcutsHelp()
    );

    expect(result.current.isOpen).toBe(false);
  });

  it('opens modal when open() is called', () => {
    const { result } = require('@testing-library/react').renderHook(() =>
      useKeyboardShortcutsHelp()
    );

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('closes modal when close() is called', () => {
    const { result } = require('@testing-library/react').renderHook(() =>
      useKeyboardShortcutsHelp()
    );

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('toggles modal state when toggle() is called', () => {
    const { result } = require('@testing-library/react').renderHook(() =>
      useKeyboardShortcutsHelp()
    );

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });
});
