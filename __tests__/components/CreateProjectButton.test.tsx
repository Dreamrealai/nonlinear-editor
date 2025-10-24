import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CreateProjectButton } from '@/components/CreateProjectButton';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock browserLogger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CreateProjectButton', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<CreateProjectButton />);
      expect(screen.getByText('New Project')).toBeInTheDocument();
    });

    it('should render as a button', () => {
      render(<CreateProjectButton />);
      const button = screen.getByRole('button', { name: /New Project/i });
      expect(button).toBeInTheDocument();
    });

    it('should have correct styling classes', () => {
      render(<CreateProjectButton />);
      const button = screen.getByRole('button', { name: /New Project/i });
      expect(button).toHaveClass(
        'rounded-lg',
        'bg-neutral-900',
        'px-4',
        'py-2',
        'text-sm',
        'font-semibold',
        'text-white',
        'shadow',
        'hover:bg-neutral-800'
      );
    });
  });

  describe('Initial State', () => {
    it('should not be disabled initially', () => {
      render(<CreateProjectButton />);
      const button = screen.getByRole('button', { name: /New Project/i });
      expect(button).not.toBeDisabled();
    });

    it('should show "New Project" text initially', () => {
      render(<CreateProjectButton />);
      expect(screen.getByText('New Project')).toBeInTheDocument();
      expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
    });
  });

  describe('Creating Project', () => {
    it('should call API when button is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'project-123' }),
      });

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });
      await user.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'Untitled Project',
          }),
        });
      });
    });

    it('should show loading state while creating', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ id: 'project-123' }),
                }),
              1000
            )
          )
      );

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });
      await user.click(button);

      // Should show loading state immediately
      await waitFor(
        () => {
          expect(screen.getByText('Creating...')).toBeInTheDocument();
        },
        { timeout: 100 }
      );
    });

    it('should disable button while creating', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ id: 'project-123' }),
                }),
              1000
            )
          )
      );

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });
      await user.click(button);

      // Button should be disabled
      await waitFor(
        () => {
          expect(button).toBeDisabled();
        },
        { timeout: 100 }
      );
    });

    it('should navigate to editor on successful creation', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'project-123' }),
      });

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/editor/project-123');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show toast error on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });
      await user.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create project. Please try again.');
      });
    });

    it('should show toast error on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });
      await user.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create project. Please try again.');
      });
    });

    it('should re-enable button after error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });
      await user.click(button);

      // Wait for error handling
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Button should be re-enabled
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should show normal text after error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });
      await user.click(button);

      // Wait for error handling
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Should show normal text again
      await waitFor(() => {
        expect(screen.getByText('New Project')).toBeInTheDocument();
        expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
      });
    });

    it('should not navigate on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });
      await user.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Clicks', () => {
    it('should prevent multiple simultaneous API calls', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ id: 'project-123' }),
                }),
              1000
            )
          )
      );

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });

      // Click multiple times rapidly
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Should only call API once (button is disabled after first click)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have button role', () => {
      render(<CreateProjectButton />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have accessible text', () => {
      render(<CreateProjectButton />);
      const button = screen.getByRole('button');
      expect(button).toHaveAccessibleName();
    });

    it('should indicate disabled state to screen readers', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ id: 'project-123' }),
                }),
              1000
            )
          )
      );

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });
      await user.click(button);

      await waitFor(
        () => {
          expect(button).toHaveAttribute('disabled');
        },
        { timeout: 100 }
      );
    });
  });

  describe('Visual States', () => {
    it('should have opacity-50 when disabled', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ id: 'project-123' }),
                }),
              1000
            )
          )
      );

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });
      await user.click(button);

      await waitFor(
        () => {
          expect(button).toHaveClass('disabled:opacity-50');
        },
        { timeout: 100 }
      );
    });

    it('should have hover state classes', () => {
      render(<CreateProjectButton />);
      const button = screen.getByRole('button', { name: /New Project/i });
      expect(button).toHaveClass('hover:bg-neutral-800');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing project id in response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/editor/undefined');
      });
    });

    it('should handle malformed JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const user = userEvent.setup();
      render(<CreateProjectButton />);

      const button = screen.getByRole('button', { name: /New Project/i });
      await user.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create project. Please try again.');
      });
    });

    it('should handle different project IDs', async () => {
      const projectIds = ['abc-123', 'project-xyz', '12345'];

      for (const id of projectIds) {
        mockPush.mockClear();
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id }),
        });

        const user = userEvent.setup();
        const { unmount } = render(<CreateProjectButton />);

        const button = screen.getByRole('button', { name: /New Project/i });
        await user.click(button);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith(`/editor/${id}`);
        });

        unmount();
      }
    });
  });
});
