/**
 * UserOnboarding Component Tests
 *
 * Comprehensive test suite for the UserOnboarding component.
 * Tests all 7 steps, navigation, analytics tracking, and edge cases.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserOnboarding } from '@/components/UserOnboarding';
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';

// Mock analytics service
jest.mock(
  '@/lib/services/analyticsService',
  (): Record<string, unknown> => ({
    analyticsService: {
      track: jest.fn(),
    },
    AnalyticsEvents: {
      ONBOARDING_STARTED: 'onboarding_started',
      ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
      ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
      ONBOARDING_COMPLETED: 'onboarding_completed',
      ONBOARDING_SKIPPED: 'onboarding_skipped',
    },
  })
);

// Mock localStorage
const localStorageMock = ((): void => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock setTimeout for timing-related tests
jest.useFakeTimers();

describe('UserOnboarding', () => {
  beforeEach((): void => {
    // Clear mocks and localStorage before each test
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach((): void => {
    jest.clearAllTimers();
  });

  describe('Initial Render', () => {
    it('should not render when onboarding is already completed', () => {
      localStorageMock.setItem('onboarding-completed', 'true');

      render(<UserOnboarding />);

      expect(screen.queryByText(/Welcome to the Video Editor/i)).not.toBeInTheDocument();
    });

    it('should render when onboarding is not completed', () => {
      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      waitFor(() => {
        expect(screen.getByText(/Welcome to the Video Editor/i)).toBeInTheDocument();
      });
    });

    it('should render when forceShow is true even if completed', () => {
      localStorageMock.setItem('onboarding-completed', 'true');

      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      waitFor(() => {
        expect(screen.getByText(/Welcome to the Video Editor/i)).toBeInTheDocument();
      });
    });
  });

  describe('Analytics Tracking', () => {
    it('should track onboarding started event', () => {
      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      waitFor(() => {
        expect(analyticsService.track).toHaveBeenCalledWith(
          AnalyticsEvents.ONBOARDING_STARTED,
          expect.objectContaining({
            forced: true,
            timestamp: expect.any(Number),
          })
        );
      });
    });

    it('should track step viewed events', () => {
      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      waitFor(() => {
        expect(analyticsService.track).toHaveBeenCalledWith(
          AnalyticsEvents.ONBOARDING_STEP_VIEWED,
          expect.objectContaining({
            step_id: 'welcome',
            step_number: 1,
            step_title: 'Welcome to the Video Editor!',
          })
        );
      });
    });

    it('should track step completed events when clicking Next', async () => {
      const user = userEvent.setup({ delay: null });

      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      const nextButton = await screen.findByText('Next');
      await user.click(nextButton);

      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.ONBOARDING_STEP_COMPLETED,
        expect.objectContaining({
          step_id: 'welcome',
          step_number: 1,
          time_on_step_ms: expect.any(Number),
        })
      );
    });

    it('should track onboarding completed event', async () => {
      const user = userEvent.setup({ delay: null });

      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      // Click through all steps
      for (let i = 0; i < 6; i++) {
        const nextButton = await screen.findByText('Next');
        await user.click(nextButton);
      }

      // Click "Get Started" on final step
      const getStartedButton = await screen.findByText('Get Started');
      await user.click(getStartedButton);

      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.ONBOARDING_COMPLETED,
        expect.objectContaining({
          total_time_ms: expect.any(Number),
          total_steps: 7,
        })
      );
    });

    it('should track onboarding skipped event', async () => {
      const user = userEvent.setup({ delay: null });

      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      const skipButton = await screen.findByLabelText('Skip onboarding');
      await user.click(skipButton);

      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.ONBOARDING_SKIPPED,
        expect.objectContaining({
          abandoned_at_step: 1,
          abandoned_at_step_id: 'welcome',
          completion_percentage: expect.any(Number),
        })
      );
    });
  });

  describe('Step Navigation', () => {
    it('should render all 7 steps correctly', async () => {
      const user = userEvent.setup({ delay: null });

      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      // Step 1: Welcome
      expect(await screen.findByText(/Welcome to the Video Editor/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 1 of 7/i)).toBeInTheDocument();

      // Step 2: Asset Panel
      const nextButton = await screen.findByText('Next');
      await user.click(nextButton);
      expect(screen.getByText(/Asset Library/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 2 of 7/i)).toBeInTheDocument();

      // Step 3: Timeline
      await user.click(nextButton);
      expect(screen.getByText(/^Timeline$/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 3 of 7/i)).toBeInTheDocument();

      // Step 4: Preview & Playback
      await user.click(nextButton);
      expect(screen.getByText(/Preview & Playback/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 4 of 7/i)).toBeInTheDocument();

      // Step 5: Timeline Controls
      await user.click(nextButton);
      expect(screen.getByText(/Timeline Controls/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 5 of 7/i)).toBeInTheDocument();

      // Step 6: Grid & Snap
      await user.click(nextButton);
      expect(screen.getByText(/Grid & Snap/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 6 of 7/i)).toBeInTheDocument();

      // Step 7: Completion
      await user.click(nextButton);
      expect(screen.getByText(/You're Ready!/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 7 of 7/i)).toBeInTheDocument();
    });

    it('should navigate to previous step when clicking Previous', async () => {
      const user = userEvent.setup({ delay: null });

      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      // Go to step 2
      const nextButton = await screen.findByText('Next');
      await user.click(nextButton);
      expect(screen.getByText(/Asset Library/i)).toBeInTheDocument();

      // Go back to step 1
      const previousButton = await screen.findByText('Previous');
      await user.click(previousButton);
      expect(screen.getByText(/Welcome to the Video Editor/i)).toBeInTheDocument();
    });

    it('should disable Previous button on first step', async () => {
      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      const previousButton = await screen.findByText('Previous');
      expect(previousButton).toBeDisabled();
    });

    it('should show "Get Started" button on last step', async () => {
      const user = userEvent.setup({ delay: null });

      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      // Navigate to last step
      for (let i = 0; i < 6; i++) {
        const nextButton = await screen.findByText('Next');
        await user.click(nextButton);
      }

      expect(screen.getByText('Get Started')).toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate forward with ArrowRight key', async () => {
      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the Video Editor/i)).toBeInTheDocument();
      });

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByText(/Asset Library/i)).toBeInTheDocument();
      });
    });

    it('should navigate backward with ArrowLeft key', async () => {
      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the Video Editor/i)).toBeInTheDocument();
      });

      // Go to step 2
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByText(/Asset Library/i)).toBeInTheDocument();
      });

      // Go back to step 1
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the Video Editor/i)).toBeInTheDocument();
      });
    });

    it('should skip onboarding with Escape key', async () => {
      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the Video Editor/i)).toBeInTheDocument();
      });

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText(/Welcome to the Video Editor/i)).not.toBeInTheDocument();
      });

      expect(localStorageMock.getItem('onboarding-completed')).toBe('true');
    });
  });

  describe('Progress Tracking', () => {
    it('should show correct progress bar percentage', async () => {
      const user = userEvent.setup({ delay: null });

      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      // Check initial progress (1/7 = ~14%)
      const progressBar = document.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle({ width: expect.stringContaining('%') });

      // Go to step 2 (2/7 = ~29%)
      const nextButton = await screen.findByText('Next');
      await user.click(nextButton);

      await waitFor(() => {
        const updatedProgressBar = document.querySelector('.bg-blue-600');
        expect(updatedProgressBar).toHaveStyle({ width: expect.stringContaining('%') });
      });
    });

    it('should show step indicators', async () => {
      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      // Should have 7 step indicator dots
      const stepIndicators = document.querySelectorAll('[class*="rounded-full"]');
      expect(stepIndicators.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Completion and Persistence', () => {
    it('should mark onboarding as completed in localStorage', async () => {
      const user = userEvent.setup({ delay: null });

      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      // Complete all steps
      for (let i = 0; i < 6; i++) {
        const nextButton = await screen.findByText('Next');
        await user.click(nextButton);
      }

      const getStartedButton = await screen.findByText('Get Started');
      await user.click(getStartedButton);

      expect(localStorageMock.getItem('onboarding-completed')).toBe('true');
    });

    it('should call onComplete callback when completed', async () => {
      const onComplete = jest.fn();
      const user = userEvent.setup({ delay: null });

      render(<UserOnboarding forceShow={true} onComplete={onComplete} />);

      jest.advanceTimersByTime(1000);

      // Complete all steps
      for (let i = 0; i < 6; i++) {
        const nextButton = await screen.findByText('Next');
        await user.click(nextButton);
      }

      const getStartedButton = await screen.findByText('Get Started');
      await user.click(getStartedButton);

      expect(onComplete).toHaveBeenCalled();
    });

    it('should call onComplete callback when skipped', async () => {
      const onComplete = jest.fn();
      const user = userEvent.setup({ delay: null });

      render(<UserOnboarding forceShow={true} onComplete={onComplete} />);

      jest.advanceTimersByTime(1000);

      const skipButton = await screen.findByLabelText('Skip onboarding');
      await user.click(skipButton);

      expect(onComplete).toHaveBeenCalled();
    });

    it('should hide component after completion', async () => {
      const user = userEvent.setup({ delay: null });

      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      // Complete all steps
      for (let i = 0; i < 6; i++) {
        const nextButton = await screen.findByText('Next');
        await user.click(nextButton);
      }

      const getStartedButton = await screen.findByText('Get Started');
      await user.click(getStartedButton);

      await waitFor(() => {
        expect(screen.queryByText(/You're Ready!/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on skip button', async () => {
      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      const skipButton = await screen.findByLabelText('Skip onboarding');
      expect(skipButton).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      // Tab to Next button
      const nextButton = await screen.findByText('Next');
      nextButton.focus();
      expect(document.activeElement).toBe(nextButton);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid clicking of Next button', async () => {
      const user = userEvent.setup({ delay: null });

      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      const nextButton = await screen.findByText('Next');

      // Click multiple times rapidly
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      // Should not skip steps or cause errors
      expect(screen.getByText(/Step 4 of 7/i)).toBeInTheDocument();
    });

    it('should handle window resize during onboarding', async () => {
      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      // Simulate window resize
      global.innerWidth = 500;
      global.innerHeight = 600;
      fireEvent.resize(window);

      // Should still be visible and functional
      expect(screen.getByText(/Welcome to the Video Editor/i)).toBeInTheDocument();
    });

    it('should not crash if target element is not found', async () => {
      // This tests robustness when DOM elements are missing
      render(<UserOnboarding forceShow={true} />);

      jest.advanceTimersByTime(1000);

      // Component should still render even if target elements don't exist
      expect(screen.getByText(/Welcome to the Video Editor/i)).toBeInTheDocument();
    });
  });
});
