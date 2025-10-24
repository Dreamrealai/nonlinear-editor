/**
 * Tests for AnalyticsService
 *
 * Tests all analytics functionality including:
 * - PostHog initialization
 * - Event tracking
 * - User identification
 * - Page view tracking
 * - Feature flags
 * - Session recording
 * - Privacy controls (opt-in/opt-out)
 * - Error handling and graceful degradation
 *
 * Follows AAA pattern (Arrange-Act-Assert)
 */

import {
  analyticsService,
  isPostHogConfigured,
  AnalyticsEvents,
} from '@/lib/services/analyticsService';
import posthog from 'posthog-js';

// Mock PostHog
jest.mock('posthog-js', () => ({
  init: jest.fn(),
  capture: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  people: {
    set: jest.fn(),
  },
  isFeatureEnabled: jest.fn(),
  getFeatureFlag: jest.fn(),
  startSessionRecording: jest.fn(),
  stopSessionRecording: jest.fn(),
  opt_out_capturing: jest.fn(),
  opt_in_capturing: jest.fn(),
  has_opted_out_capturing: jest.fn(),
}));

describe('AnalyticsService', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalWindow: typeof global.window;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    originalWindow = global.window;

    // Set up browser environment
    global.window = {
      location: {
        pathname: '/test',
      },
    } as never;

    // Clear all mocks
    jest.clearAllMocks();

    // Reset the initialized state by creating a new instance
    // Since analyticsService is a singleton, we need to manually reset its state
    (analyticsService as never)['initialized'] = false;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    global.window = originalWindow;
  });

  describe('isPostHogConfigured', () => {
    it('should return true when PostHog is configured', () => {
      // Arrange
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';

      // Act
      const result = isPostHogConfigured();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when PostHog key is missing', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';

      // Act
      const result = isPostHogConfigured();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when PostHog host is missing', () => {
      // Arrange
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

      // Act
      const result = isPostHogConfigured();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when both are missing', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

      // Act
      const result = isPostHogConfigured();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('init', () => {
    it('should initialize PostHog with correct config', () => {
      // Arrange
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
      process.env.NODE_ENV = 'development';

      // Act
      analyticsService.init();

      // Assert
      expect(posthog.init).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({
          api_host: 'https://test.posthog.com',
          respect_dnt: true,
          opt_out_capturing_by_default: false,
          capture_pageview: false,
          capture_pageleave: true,
          autocapture: false,
          disable_session_recording: true,
        })
      );
    });

    // Note: Cannot properly test server-side check as typeof window is compile-time in Jest
    // Skipping server-side initialization test

    it('should not initialize when PostHog is not configured', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;

      // Act
      analyticsService.init();

      // Assert
      expect(posthog.init).not.toHaveBeenCalled();
    });

    it('should only initialize once on multiple calls', () => {
      // Arrange
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';

      // Manually set initialized to true
      (analyticsService as never)['initialized'] = true;

      // Act
      analyticsService.init();
      analyticsService.init();
      analyticsService.init();

      // Assert
      expect(posthog.init).not.toHaveBeenCalled();
    });

    it('should enable session recording when explicitly configured', () => {
      // Arrange
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
      process.env.NEXT_PUBLIC_POSTHOG_ENABLE_RECORDINGS = 'true';

      const mockPostHog = {
        startSessionRecording: jest.fn(),
      };

      (posthog.init as jest.Mock).mockImplementation((_key, config) => {
        if (config.loaded) {
          config.loaded(mockPostHog);
        }
      });

      // Act
      analyticsService.init();

      // Assert
      expect(mockPostHog.startSessionRecording).toHaveBeenCalled();
    });

    it('should disable session recording in development', () => {
      // Arrange
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
      process.env.NODE_ENV = 'development';

      // Act
      analyticsService.init();

      // Assert
      expect(posthog.init).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          disable_session_recording: true,
        })
      );
    });
  });

  describe('track', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
      (analyticsService as never)['initialized'] = true;
    });

    it('should track event with properties', () => {
      // Arrange
      const event = 'video_generated';
      const properties = {
        duration: 30,
        format: 'mp4',
        quality: 'high',
      };

      // Act
      analyticsService.track(event, properties);

      // Assert
      expect(posthog.capture).toHaveBeenCalledWith(event, properties);
    });

    it('should track event without properties', () => {
      // Arrange
      const event = 'button_clicked';

      // Act
      analyticsService.track(event);

      // Assert
      expect(posthog.capture).toHaveBeenCalledWith(event, undefined);
    });

    it('should not track when not initialized', () => {
      // Arrange
      (analyticsService as never)['initialized'] = false;

      // Act
      analyticsService.track('test_event');

      // Assert
      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it('should not track when PostHog not configured', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      (analyticsService as never)['initialized'] = true;

      // Act
      analyticsService.track('test_event');

      // Assert
      expect(posthog.capture).not.toHaveBeenCalled();
    });
  });

  describe('identify', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
      (analyticsService as never)['initialized'] = true;
    });

    it('should identify user with properties', () => {
      // Arrange
      const userId = 'user_123';
      const properties = {
        email: 'user@example.com',
        subscription: 'premium',
      };

      // Act
      analyticsService.identify(userId, properties);

      // Assert
      expect(posthog.identify).toHaveBeenCalledWith(userId, properties);
    });

    it('should identify user without properties', () => {
      // Arrange
      const userId = 'user_456';

      // Act
      analyticsService.identify(userId);

      // Assert
      expect(posthog.identify).toHaveBeenCalledWith(userId, undefined);
    });

    it('should not identify when not initialized', () => {
      // Arrange
      (analyticsService as never)['initialized'] = false;

      // Act
      analyticsService.identify('user_123');

      // Assert
      expect(posthog.identify).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
      (analyticsService as never)['initialized'] = true;
    });

    it('should reset user identity', () => {
      // Act
      analyticsService.reset();

      // Assert
      expect(posthog.reset).toHaveBeenCalled();
    });

    it('should not reset when not initialized', () => {
      // Arrange
      (analyticsService as never)['initialized'] = false;

      // Act
      analyticsService.reset();

      // Assert
      expect(posthog.reset).not.toHaveBeenCalled();
    });
  });

  describe('trackPageView', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
      (analyticsService as never)['initialized'] = true;
    });

    it('should track page view with path', () => {
      // Arrange
      const path = '/editor';

      // Act
      analyticsService.trackPageView(path);

      // Assert
      expect(posthog.capture).toHaveBeenCalledWith('$pageview', {
        $current_url: path,
      });
    });

    it('should track page view with additional properties', () => {
      // Arrange
      const path = '/dashboard';
      const properties = {
        referrer: '/home',
        campaign: 'summer_sale',
      };

      // Act
      analyticsService.trackPageView(path, properties);

      // Assert
      expect(posthog.capture).toHaveBeenCalledWith('$pageview', {
        $current_url: path,
        referrer: '/home',
        campaign: 'summer_sale',
      });
    });

    it('should use window location when path not provided', () => {
      // Act
      analyticsService.trackPageView();

      // Assert - Use whatever the current window.location is (should be set in beforeEach)
      expect(posthog.capture).toHaveBeenCalledWith(
        '$pageview',
        expect.objectContaining({
          $current_url: expect.any(String),
        })
      );
    });

    it('should not track page view when not initialized', () => {
      // Arrange
      (analyticsService as never)['initialized'] = false;

      // Act
      analyticsService.trackPageView('/test');

      // Assert
      expect(posthog.capture).not.toHaveBeenCalled();
    });
  });

  describe('setUserProperties', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
      (analyticsService as never)['initialized'] = true;
    });

    it('should set user properties', () => {
      // Arrange
      const properties = {
        plan: 'premium',
        createdAt: '2025-01-01',
      };

      // Act
      analyticsService.setUserProperties(properties);

      // Assert
      expect(posthog.people.set).toHaveBeenCalledWith(properties);
    });

    it('should not set properties when not initialized', () => {
      // Arrange
      (analyticsService as never)['initialized'] = false;

      // Act
      analyticsService.setUserProperties({ plan: 'premium' });

      // Assert
      expect(posthog.people.set).not.toHaveBeenCalled();
    });
  });

  describe('isFeatureEnabled', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
      (analyticsService as never)['initialized'] = true;
    });

    it('should return true when feature is enabled', () => {
      // Arrange
      (posthog.isFeatureEnabled as jest.Mock).mockReturnValue(true);

      // Act
      const result = analyticsService.isFeatureEnabled('new_editor');

      // Assert
      expect(result).toBe(true);
      expect(posthog.isFeatureEnabled).toHaveBeenCalledWith('new_editor');
    });

    it('should return false when feature is disabled', () => {
      // Arrange
      (posthog.isFeatureEnabled as jest.Mock).mockReturnValue(false);

      // Act
      const result = analyticsService.isFeatureEnabled('beta_feature');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when PostHog returns null', () => {
      // Arrange
      (posthog.isFeatureEnabled as jest.Mock).mockReturnValue(null);

      // Act
      const result = analyticsService.isFeatureEnabled('unknown_feature');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when not initialized', () => {
      // Arrange
      (analyticsService as never)['initialized'] = false;

      // Act
      const result = analyticsService.isFeatureEnabled('test_feature');

      // Assert
      expect(result).toBe(false);
      expect(posthog.isFeatureEnabled).not.toHaveBeenCalled();
    });
  });

  describe('getFeatureFlag', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
      (analyticsService as never)['initialized'] = true;
    });

    it('should return string value for feature flag', () => {
      // Arrange
      (posthog.getFeatureFlag as jest.Mock).mockReturnValue('variant_a');

      // Act
      const result = analyticsService.getFeatureFlag('ab_test');

      // Assert
      expect(result).toBe('variant_a');
      expect(posthog.getFeatureFlag).toHaveBeenCalledWith('ab_test');
    });

    it('should return boolean value for feature flag', () => {
      // Arrange
      (posthog.getFeatureFlag as jest.Mock).mockReturnValue(true);

      // Act
      const result = analyticsService.getFeatureFlag('feature_toggle');

      // Assert
      expect(result).toBe(true);
    });

    it('should return undefined when not initialized', () => {
      // Arrange
      (analyticsService as never)['initialized'] = false;

      // Act
      const result = analyticsService.getFeatureFlag('test_flag');

      // Assert
      expect(result).toBeUndefined();
      expect(posthog.getFeatureFlag).not.toHaveBeenCalled();
    });
  });

  describe('Session recording', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
      (analyticsService as never)['initialized'] = true;
    });

    it('should start session recording', () => {
      // Act
      analyticsService.startRecording();

      // Assert
      expect(posthog.startSessionRecording).toHaveBeenCalled();
    });

    it('should stop session recording', () => {
      // Act
      analyticsService.stopRecording();

      // Assert
      expect(posthog.stopSessionRecording).toHaveBeenCalled();
    });

    it('should not start recording when not initialized', () => {
      // Arrange
      (analyticsService as never)['initialized'] = false;

      // Act
      analyticsService.startRecording();

      // Assert
      expect(posthog.startSessionRecording).not.toHaveBeenCalled();
    });
  });

  describe('Privacy controls', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
      (analyticsService as never)['initialized'] = true;
    });

    it('should opt out of tracking', () => {
      // Act
      analyticsService.optOut();

      // Assert
      expect(posthog.opt_out_capturing).toHaveBeenCalled();
    });

    it('should opt in to tracking', () => {
      // Act
      analyticsService.optIn();

      // Assert
      expect(posthog.opt_in_capturing).toHaveBeenCalled();
    });

    it('should check if user has opted out', () => {
      // Arrange
      (posthog.has_opted_out_capturing as jest.Mock).mockReturnValue(true);

      // Act
      const result = analyticsService.hasOptedOut();

      // Assert
      expect(result).toBe(true);
      expect(posthog.has_opted_out_capturing).toHaveBeenCalled();
    });

    it('should return false for hasOptedOut when not initialized', () => {
      // Arrange
      (analyticsService as never)['initialized'] = false;

      // Act
      const result = analyticsService.hasOptedOut();

      // Assert
      expect(result).toBe(false);
      expect(posthog.has_opted_out_capturing).not.toHaveBeenCalled();
    });
  });

  describe('AnalyticsEvents', () => {
    it('should have all required event constants', () => {
      // Assert
      expect(AnalyticsEvents.VIDEO_GENERATED).toBe('video_generated');
      expect(AnalyticsEvents.VIDEO_EXPORT_STARTED).toBe('video_export_started');
      expect(AnalyticsEvents.PROJECT_CREATED).toBe('project_created');
      expect(AnalyticsEvents.USER_SIGNED_UP).toBe('user_signed_up');
      expect(AnalyticsEvents.AI_GENERATION_STARTED).toBe('ai_generation_started');
      expect(AnalyticsEvents.ONBOARDING_STARTED).toBe('onboarding_started');
      expect(AnalyticsEvents.EASTER_EGG_DISCOVERED).toBe('easter_egg_discovered');
    });

    it('should use snake_case convention for all events', () => {
      // Arrange
      const eventNames = Object.values(AnalyticsEvents);

      // Assert
      eventNames.forEach((event) => {
        expect(event).toMatch(/^[a-z_]+$/);
        expect(event).not.toMatch(/[A-Z]/);
        expect(event).not.toMatch(/-/);
      });
    });
  });

  describe('Integration tests', () => {
    it('should support complete user tracking flow', () => {
      // Arrange
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
      (analyticsService as never)['initialized'] = true;

      // Act
      analyticsService.identify('user_123', {
        email: 'user@example.com',
        subscription: 'premium',
      });
      analyticsService.track(AnalyticsEvents.VIDEO_GENERATED, {
        duration: 30,
        format: 'mp4',
      });
      analyticsService.trackPageView('/editor');

      // Assert
      expect(posthog.identify).toHaveBeenCalledWith('user_123', expect.any(Object));
      expect(posthog.capture).toHaveBeenCalledWith('video_generated', expect.any(Object));
      expect(posthog.capture).toHaveBeenCalledWith('$pageview', expect.any(Object));
    });

    it('should gracefully handle all operations when not configured', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      (analyticsService as never)['initialized'] = false;

      // Act & Assert - All should be no-ops
      expect(() => {
        analyticsService.track('event');
        analyticsService.identify('user');
        analyticsService.reset();
        analyticsService.trackPageView('/test');
        analyticsService.setUserProperties({ plan: 'free' });
        analyticsService.isFeatureEnabled('flag');
        analyticsService.getFeatureFlag('flag');
        analyticsService.startRecording();
        analyticsService.stopRecording();
        analyticsService.optOut();
        analyticsService.optIn();
        analyticsService.hasOptedOut();
      }).not.toThrow();
    });
  });
});
