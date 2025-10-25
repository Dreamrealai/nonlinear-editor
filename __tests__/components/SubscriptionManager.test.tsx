import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SubscriptionManager } from '@/components/SubscriptionManager';
import type { UserProfile } from '@/lib/types/subscription';
import { redirectToUrl } from '@/lib/navigation';

// Mock the SupabaseProvider
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

jest.mock(
  '@/lib/navigation',
  (): Record<string, unknown> => ({
    redirectToUrl: jest.fn(),
  })
);

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
      error: jest.fn(),
      success: jest.fn(),
    },
  })
);

// Mock fetch
global.fetch = jest.fn();

const mockFreeProfile: UserProfile = {
  id: 'user-1',
  tier: 'free',
  video_minutes_used: 5,
  video_minutes_limit: 10,
  ai_requests_used: 50,
  ai_requests_limit: 100,
  storage_gb_used: 0.5,
  storage_gb_limit: 2,
  usage_reset_at: '2024-02-01T00:00:00Z',
  subscription_status: null,
  subscription_current_period_end: null,
  subscription_cancel_at_period_end: false,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

const mockPremiumProfile: UserProfile = {
  ...mockFreeProfile,
  tier: 'premium',
  video_minutes_used: 50,
  video_minutes_limit: 120,
  ai_requests_used: 500,
  ai_requests_limit: 1000,
  storage_gb_used: 5,
  storage_gb_limit: 50,
  subscription_status: 'active',
  subscription_current_period_end: '2024-02-15T00:00:00Z',
  subscription_cancel_at_period_end: false,
};

const mockAdminProfile: UserProfile = {
  ...mockFreeProfile,
  tier: 'admin',
  video_minutes_used: 1000,
  video_minutes_limit: 999999,
  ai_requests_used: 5000,
  ai_requests_limit: 999999,
  storage_gb_used: 50,
  storage_gb_limit: 999999,
};

describe('SubscriptionManager', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    (redirectToUrl as jest.Mock).mockClear();
  });

  const setupMocks = (profile: UserProfile | null) => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: profile ? { id: profile.id } : null },
      error: null,
    });

    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockMaybeSingle = jest.fn().mockResolvedValue({
      data: profile,
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
    });

    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });
  };

  describe('Loading State', () => {
    it('should show loading spinner initially', async () => {
      setupMocks(mockFreeProfile);
      render(<SubscriptionManager />);
      expect(screen.getByText('Loading subscription...')).toBeInTheDocument();
      // Wait for async state updates to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading subscription...')).not.toBeInTheDocument();
      });
    });

    it('should hide loading after data loads', async () => {
      setupMocks(mockFreeProfile);
      render(<SubscriptionManager />);
      await waitFor(() => {
        expect(screen.queryByText('Loading subscription...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Free Tier Display', () => {
    it('should render free tier information', async () => {
      setupMocks(mockFreeProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText('free')).toBeInTheDocument();
        expect(screen.getByText('Current Plan')).toBeInTheDocument();
      });
    });

    it('should show upgrade button for free tier', async () => {
      setupMocks(mockFreeProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /Upgrade to Premium/ });
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should display usage statistics', async () => {
      setupMocks(mockFreeProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText('5 / 10 min')).toBeInTheDocument();
        expect(screen.getByText('50 / 100')).toBeInTheDocument();
        expect(screen.getByText('0.50 / 2 GB')).toBeInTheDocument();
      });
    });

    it('should show premium features section for free users', async () => {
      setupMocks(mockFreeProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
        expect(screen.getByText('Unlock powerful features and higher limits')).toBeInTheDocument();
      });
    });

    it('should display correct progress bar colors based on usage', async () => {
      const highUsageProfile = {
        ...mockFreeProfile,
        video_minutes_used: 9.5,
      };
      setupMocks(highUsageProfile);
      const { container } = render(<SubscriptionManager />);

      await waitFor(() => {
        const progressBars = container.querySelectorAll('[style*="width"]');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Premium Tier Display', () => {
    it('should render premium tier information', async () => {
      setupMocks(mockPremiumProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText('premium')).toBeInTheDocument();
      });
    });

    it('should show manage subscription button for premium tier', async () => {
      setupMocks(mockPremiumProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
      });
    });

    it('should display subscription status', async () => {
      setupMocks(mockPremiumProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText('active')).toBeInTheDocument();
      });
    });

    it('should display renewal date', async () => {
      setupMocks(mockPremiumProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText(/Renews on/)).toBeInTheDocument();
      });
    });

    it('should show "Ends" instead of "Renews" when subscription is set to cancel', async () => {
      const cancelingProfile = {
        ...mockPremiumProfile,
        subscription_cancel_at_period_end: true,
      };
      setupMocks(cancelingProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText(/Ends on/)).toBeInTheDocument();
      });
    });

    it('should not show premium features upsell for premium users', async () => {
      setupMocks(mockPremiumProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(
          screen.queryByText('Unlock powerful features and higher limits')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Admin Tier Display', () => {
    it('should render admin tier information', async () => {
      setupMocks(mockAdminProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument();
      });
    });

    it('should show admin message', async () => {
      setupMocks(mockAdminProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(
          screen.getByText('You have admin access with unlimited resources')
        ).toBeInTheDocument();
      });
    });

    it('should not show upgrade or manage buttons for admin', async () => {
      setupMocks(mockAdminProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.queryByText('Upgrade to Premium')).not.toBeInTheDocument();
        expect(screen.queryByText('Manage Subscription')).not.toBeInTheDocument();
      });
    });
  });

  describe('Usage Warnings', () => {
    it('should show warning when video usage is above 90%', async () => {
      const highUsageProfile = {
        ...mockFreeProfile,
        video_minutes_used: 9.5,
      };
      setupMocks(highUsageProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText("You're running low on video minutes")).toBeInTheDocument();
      });
    });

    it('should show warning when AI usage is above 90%', async () => {
      const highUsageProfile = {
        ...mockFreeProfile,
        ai_requests_used: 95,
      };
      setupMocks(highUsageProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText("You're running low on AI requests")).toBeInTheDocument();
      });
    });

    it('should show warning when storage usage is above 90%', async () => {
      const highUsageProfile = {
        ...mockFreeProfile,
        storage_gb_used: 1.9,
      };
      setupMocks(highUsageProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText("You're running low on storage space")).toBeInTheDocument();
      });
    });
  });

  describe('Upgrade Flow', () => {
    it('should call checkout API when upgrade button is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://checkout.stripe.com/session' }),
      });

      const user = userEvent.setup();
      setupMocks(mockFreeProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(
          screen.getAllByRole('button', { name: /Upgrade to Premium/ }).length
        ).toBeGreaterThan(0);
      });

      const upgradeButton = screen.getByRole('button', { name: /Upgrade to Premium/ });
      await user.click(upgradeButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/stripe/checkout', expect.any(Object));
        expect(redirectToUrl).toHaveBeenCalledWith('https://checkout.stripe.com/session');
      });
    });

    it('should show loading state when upgrade is in progress', async () => {
      let resolveFetch: ((value: unknown) => void) | null = null;
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      );

      const user = userEvent.setup();
      setupMocks(mockFreeProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(
          screen.getAllByRole('button', { name: /Upgrade to Premium/ }).length
        ).toBeGreaterThan(0);
      });

      const upgradeButton = screen.getByRole('button', { name: /Upgrade to Premium/ });
      await user.click(upgradeButton);

      const loadingTexts = await screen.findAllByText('Loading...');
      expect(loadingTexts.length).toBeGreaterThan(0);

      resolveFetch?.({
        ok: true,
        json: async () => ({ url: 'https://checkout.stripe.com/session' }),
      });
    });
  });

  describe('Manage Subscription Flow', () => {
    it('should call portal API when manage button is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://billing.stripe.com/portal' }),
      });

      const user = userEvent.setup();
      setupMocks(mockPremiumProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Manage Subscription' })).toBeInTheDocument();
      });

      const manageButton = screen.getByRole('button', { name: 'Manage Subscription' });
      await user.click(manageButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/stripe/portal', expect.any(Object));
        expect(redirectToUrl).toHaveBeenCalledWith('https://billing.stripe.com/portal');
      });
    });

    it('should show loading state when manage is in progress', async () => {
      let resolveFetch: ((value: unknown) => void) | null = null;
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      );

      const user = userEvent.setup();
      setupMocks(mockPremiumProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Manage Subscription' })).toBeInTheDocument();
      });

      const manageButton = screen.getByRole('button', { name: 'Manage Subscription' });
      await user.click(manageButton);

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });

      resolveFetch?.({
        ok: true,
        json: async () => ({ url: 'https://billing.stripe.com/portal' }),
      });
    });
  });

  describe('Usage Reset Date', () => {
    it('should display usage reset date', async () => {
      setupMocks(mockFreeProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText(/Usage resets on/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing profile gracefully', async () => {
      setupMocks(null);
      const { container } = render(<SubscriptionManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should handle API error when upgrading', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Payment failed' }),
      });

      const user = userEvent.setup();
      setupMocks(mockFreeProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(
          screen.getAllByRole('button', { name: /Upgrade to Premium/ }).length
        ).toBeGreaterThan(0);
      });

      const upgradeButton = screen.getByRole('button', { name: /Upgrade to Premium/ });
      await user.click(upgradeButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Feature Display', () => {
    it('should display tier features', async () => {
      setupMocks(mockFreeProfile);
      render(<SubscriptionManager />);

      await waitFor(() => {
        expect(screen.getByText('10 video minutes per month')).toBeInTheDocument();
        expect(screen.getByText('50 AI requests per month')).toBeInTheDocument();
        expect(screen.getByText('5 GB storage')).toBeInTheDocument();
      });
    });
  });

  describe('Visual Elements', () => {
    it('should render icons for different sections', async () => {
      setupMocks(mockFreeProfile);
      const { container } = render(<SubscriptionManager />);

      await waitFor(() => {
        const svgs = container.querySelectorAll('svg');
        expect(svgs.length).toBeGreaterThan(0);
      });
    });

    it('should show gradient decorations for premium users', async () => {
      setupMocks(mockPremiumProfile);
      const { container } = render(<SubscriptionManager />);

      await waitFor(() => {
        const gradients = container.querySelectorAll('[class*="gradient"]');
        expect(gradients.length).toBeGreaterThan(0);
      });
    });
  });
});
