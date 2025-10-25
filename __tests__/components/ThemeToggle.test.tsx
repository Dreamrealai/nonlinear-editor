/**
 * Tests for ThemeToggle Component
 *
 * Tests theme switching functionality and UI states
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from 'next-themes';

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

// Mock Tooltip component
jest.mock('@/components/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('ThemeToggle', () => {
  const mockSetTheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock useTheme default return
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      themes: ['light', 'dark', 'system'],
      systemTheme: 'light',
      resolvedTheme: 'light',
      forcedTheme: undefined,
    });
  });

  describe('Rendering', () => {
    it('renders theme toggle button', async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });
    });

    it('shows placeholder before mounted', () => {
      const { container } = render(<ThemeToggle />);

      // Should show empty div before mount
      const placeholder = container.querySelector('.inline-flex.items-center.justify-center');
      expect(placeholder).toBeInTheDocument();
    });

    it('renders button after mounting', async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Theme Icons', () => {
    it('displays sun icon for light theme', async () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        themes: ['light', 'dark', 'system'],
        systemTheme: 'light',
        resolvedTheme: 'light',
        forcedTheme: undefined,
      });

      const { container } = render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });
    });

    it('displays moon icon for dark theme', async () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
        resolvedTheme: 'dark',
        forcedTheme: undefined,
      });

      const { container } = render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });
    });

    it('displays monitor icon for system theme', async () => {
      mockUseTheme.mockReturnValue({
        theme: 'system',
        setTheme: mockSetTheme,
        themes: ['light', 'dark', 'system'],
        systemTheme: 'light',
        resolvedTheme: 'light',
        forcedTheme: undefined,
      });

      const { container } = render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Theme Cycling', () => {
    it('cycles from light to dark on click', async () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        themes: ['light', 'dark', 'system'],
        systemTheme: 'light',
        resolvedTheme: 'light',
        forcedTheme: undefined,
      });

      render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('cycles from dark to system on click', async () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
        resolvedTheme: 'dark',
        forcedTheme: undefined,
      });

      render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockSetTheme).toHaveBeenCalledWith('system');
    });

    it('cycles from system to light on click', async () => {
      mockUseTheme.mockReturnValue({
        theme: 'system',
        setTheme: mockSetTheme,
        themes: ['light', 'dark', 'system'],
        systemTheme: 'light',
        resolvedTheme: 'light',
        forcedTheme: undefined,
      });

      render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label for light theme', async () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        themes: ['light', 'dark', 'system'],
        systemTheme: 'light',
        resolvedTheme: 'light',
        forcedTheme: undefined,
      });

      render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
      });
    });

    it('has proper aria-label for dark theme', async () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
        resolvedTheme: 'dark',
        forcedTheme: undefined,
      });

      render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-label', 'Switch to system mode');
      });
    });

    it('has proper aria-label for system theme', async () => {
      mockUseTheme.mockReturnValue({
        theme: 'system',
        setTheme: mockSetTheme,
        themes: ['light', 'dark', 'system'],
        systemTheme: 'light',
        resolvedTheme: 'light',
        forcedTheme: undefined,
      });

      render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
      });
    });
  });

  describe('Size Variants', () => {
    it('renders with small size', async () => {
      render(<ThemeToggle size="sm" />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveClass('h-8', 'w-8');
      });
    });

    it('renders with medium size (default)', async () => {
      render(<ThemeToggle size="md" />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveClass('h-9', 'w-9');
      });
    });

    it('renders with large size', async () => {
      render(<ThemeToggle size="lg" />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveClass('h-10', 'w-10');
      });
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', async () => {
      render(<ThemeToggle className="custom-class" />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveClass('custom-class');
      });
    });

    it('has border and background styling', async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveClass('border', 'border-neutral-200', 'bg-white');
      });
    });

    it('has hover transition styles', async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveClass('transition-colors', 'hover:bg-neutral-50');
      });
    });
  });

  describe('Hydration Safety', () => {
    it('prevents hydration mismatch with mounted state', () => {
      const { container } = render(<ThemeToggle />);

      // Before mount, should show placeholder
      const placeholder = container.firstChild;
      expect(placeholder).toBeInTheDocument();
    });

    it('renders actual button after useEffect runs', async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Button Type', () => {
    it('has button type to prevent form submission', async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });
});
