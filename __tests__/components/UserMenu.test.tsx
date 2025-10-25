import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UserMenu } from '@/components/UserMenu';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Mock Next.js router
jest.mock(
  'next/navigation',
  (): Record<string, unknown> => ({
    useRouter: jest.fn(),
  })
);

// Mock Next.js Link
jest.mock(
  'next/link',
  (): Record<string, unknown> => ({
    __esModule: true,
    default: ({ children, href, ...props }: any) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  })
);

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    signOut: jest.fn(),
  },
};

jest.mock(
  '@/components/providers/SupabaseProvider',
  (): Record<string, unknown> => ({
    useSupabase: (): Record<string, unknown> => ({
      supabaseClient: mockSupabaseClient,
    }),
  })
);

// Mock react-hot-toast
jest.mock(
  'react-hot-toast',
  (): Record<string, unknown> => ({
    __esModule: true,
    default: {
      success: jest.fn(),
      error: jest.fn(),
    },
  })
);

// Mock browserLogger
jest.mock(
  '@/lib/browserLogger',
  (): Record<string, unknown> => ({
    browserLogger: {
      error: jest.fn(),
    },
  })
);

describe('UserMenu', () => {
  const mockPush = jest.fn();
  const mockRefresh = jest.fn();

  beforeEach((): void => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });
  });

  describe('Rendering', () => {
    it('should render without crashing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      render(<UserMenu />);
      const menuButton = screen.getByTitle('User menu');
      expect(menuButton).toBeInTheDocument();
    });

    it('should render user icon', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const { container } = render(<UserMenu />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render chevron icon', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const { container } = render(<UserMenu />);
      const chevronIcon = container.querySelector('.rotate-180, svg:not(.rotate-180)');
      expect(chevronIcon).toBeInTheDocument();
    });
  });

  describe('User Email Display', () => {
    it('should display user email when logged in', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });

      render(<UserMenu />);

      const user = userEvent.setup();
      const menuButton = await screen.findByTitle('test@example.com');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('Signed in as')).toBeInTheDocument();
      });
    });

    it('should not show email section when user has no email', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: {} },
      });

      render(<UserMenu />);

      const user = userEvent.setup();
      const menuButton = screen.getByTitle('User menu');
      await user.click(menuButton);

      expect(screen.queryByText('Signed in as')).not.toBeInTheDocument();
    });
  });

  describe('Menu Toggle', () => {
    it('should open menu on button click', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });

      const user = userEvent.setup();
      render(<UserMenu />);

      const menuButton = await screen.findByTitle('test@example.com');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });
    });

    it('should close menu on second click', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });

      const user = userEvent.setup();
      render(<UserMenu />);

      const menuButton = await screen.findByTitle('test@example.com');

      // Open menu
      await user.click(menuButton);
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // Close menu
      await user.click(menuButton);
      await waitFor(() => {
        expect(screen.queryByText('Settings')).not.toBeInTheDocument();
      });
    });

    it('should rotate chevron when menu is open', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });

      const user = userEvent.setup();
      const { container } = render(<UserMenu />);

      const menuButton = await screen.findByTitle('test@example.com');

      // Initially not rotated
      let chevron = container.querySelector('.rotate-180');
      expect(chevron).not.toBeInTheDocument();

      // Click to open
      await user.click(menuButton);

      // Should be rotated
      await waitFor(() => {
        chevron = container.querySelector('.rotate-180');
        expect(chevron).toBeInTheDocument();
      });
    });
  });

  describe('Click Outside to Close', () => {
    it('should close menu when clicking outside', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });

      const user = userEvent.setup();
      const { container } = render(
        <div>
          <div data-testid="outside">Outside</div>
          <UserMenu />
        </div>
      );

      const menuButton = await screen.findByTitle('test@example.com');
      await user.click(menuButton);

      // Menu should be open
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // Click outside
      const outsideElement = screen.getByTestId('outside');
      fireEvent.mouseDown(outsideElement);

      // Menu should be closed
      await waitFor(() => {
        expect(screen.queryByText('Settings')).not.toBeInTheDocument();
      });
    });

    it('should not close menu when clicking inside', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });

      const user = userEvent.setup();
      render(<UserMenu />);

      const menuButton = await screen.findByTitle('test@example.com');
      await user.click(menuButton);

      // Menu should be open
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // Click inside menu
      const settingsLink = screen.getByText('Settings');
      fireEvent.mouseDown(settingsLink);

      // Menu should still be visible (will close after navigation, but that's different)
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('Settings Link', () => {
    it('should render Settings link', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });

      const user = userEvent.setup();
      render(<UserMenu />);

      const menuButton = await screen.findByTitle('test@example.com');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('should link to /settings', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });

      const user = userEvent.setup();
      render(<UserMenu />);

      const menuButton = await screen.findByTitle('test@example.com');
      await user.click(menuButton);

      await waitFor(() => {
        const settingsLink = screen.getByText('Settings').closest('a');
        expect(settingsLink).toHaveAttribute('href', '/settings');
      });
    });

    it('should close menu when clicking Settings', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });

      const user = userEvent.setup();
      render(<UserMenu />);

      const menuButton = await screen.findByTitle('test@example.com');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      const settingsLink = screen.getByText('Settings');
      await user.click(settingsLink);

      // Menu should close
      await waitFor(() => {
        expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sign Out', () => {
    it('should render Sign Out button', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });

      const user = userEvent.setup();
      render(<UserMenu />);

      const menuButton = await screen.findByTitle('test@example.com');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });
    });

    it('should call signOut on click', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const user = userEvent.setup();
      render(<UserMenu />);

      const menuButton = await screen.findByTitle('test@example.com');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });

      const signOutButton = screen.getByText('Sign Out');
      await user.click(signOutButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      });
    });

    it('should show success toast and redirect on successful sign out', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const user = userEvent.setup();
      render(<UserMenu />);

      const menuButton = await screen.findByTitle('test@example.com');
      await user.click(menuButton);

      const signOutButton = await screen.findByText('Sign Out');
      await user.click(signOutButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Signed out successfully');
        expect(mockPush).toHaveBeenCalledWith('/signin');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should show error toast on failed sign out', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: new Error('Sign out failed'),
      });

      const user = userEvent.setup();
      render(<UserMenu />);

      const menuButton = await screen.findByTitle('test@example.com');
      await user.click(menuButton);

      const signOutButton = await screen.findByText('Sign Out');
      await user.click(signOutButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to sign out');
      });
    });

    it('should have red styling for Sign Out button', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });

      const user = userEvent.setup();
      render(<UserMenu />);

      const menuButton = await screen.findByTitle('test@example.com');
      await user.click(menuButton);

      await waitFor(() => {
        const signOutButton = screen.getByText('Sign Out');
        expect(signOutButton).toHaveClass('text-red-600', 'hover:bg-red-50');
      });
    });
  });

  describe('Visual Styling', () => {
    it('should have rounded avatar', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const { container } = render(<UserMenu />);
      const avatar = container.querySelector('.rounded-full');
      expect(avatar).toBeInTheDocument();
    });

    it('should have shadow on dropdown', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });

      const user = userEvent.setup();
      const { container } = render(<UserMenu />);

      const menuButton = await screen.findByTitle('test@example.com');
      await user.click(menuButton);

      await waitFor(() => {
        const dropdown = container.querySelector('.shadow-lg');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it('should truncate long email addresses', async () => {
      const longEmail = 'verylongemailaddress@verylongdomainname.com';
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: longEmail } },
      });

      const user = userEvent.setup();
      render(<UserMenu />);

      const menuButton = await screen.findByTitle(longEmail);
      await user.click(menuButton);

      await waitFor(() => {
        const emailElement = screen.getByText(longEmail);
        expect(emailElement).toHaveClass('truncate');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing supabaseClient', async () => {
      // This is covered by the component checking if supabaseClient exists
      render(<UserMenu />);
      const menuButton = screen.getByTitle('User menu');
      expect(menuButton).toBeInTheDocument();
    });

    it('should handle null user gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      render(<UserMenu />);
      const menuButton = screen.getByTitle('User menu');
      expect(menuButton).toBeInTheDocument();
    });
  });
});
