/**
 * Analytics Service (PostHog Integration)
 *
 * Provides centralized analytics and telemetry using PostHog.
 * Tracks user actions, feature usage, and performance metrics.
 *
 * Features:
 * - Event tracking for key user actions
 * - User identification and properties
 * - Feature flags
 * - Session recording (optional)
 * - Performance monitoring
 * - Privacy-compliant tracking
 *
 * Usage:
 * ```typescript
 * import { analyticsService } from '@/lib/services/analyticsService';
 *
 * // Track event
 * analyticsService.track('video_generated', {
 *   duration: 30,
 *   format: 'mp4',
 *   quality: 'high'
 * });
 *
 * // Identify user
 * analyticsService.identify('user_123', {
 *   email: 'user@example.com',
 *   subscription: 'premium'
 * });
 *
 * // Track page view
 * analyticsService.trackPageView('/editor');
 * ```
 */

import posthog from 'posthog-js';

/**
 * Event properties for type safety
 */
export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * User properties for identification
 */
export interface UserProperties {
  email?: string;
  username?: string;
  subscription?: string;
  plan?: string;
  createdAt?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Check if PostHog is configured
 */
export function isPostHogConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST);
}

/**
 * Analytics Service
 *
 * Wraps PostHog SDK for type-safe analytics tracking.
 * All methods are no-ops if PostHog is not configured.
 */
class AnalyticsService {
  private initialized = false;

  /**
   * Initialize PostHog
   *
   * Call this once on app startup (client-side only).
   * Safe to call multiple times (will only initialize once).
   */
  init(): void {
    // Only initialize in browser
    if (typeof window === 'undefined') {
      return;
    }

    // Only initialize if configured
    if (!isPostHogConfigured()) {
      return;
    }

    // Only initialize once
    if (this.initialized) {
      return;
    }

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!key || !host) {
      return;
    }

    posthog.init(key, {
      api_host: host,

      // Privacy settings
      respect_dnt: true, // Respect Do Not Track
      opt_out_capturing_by_default: false, // Opt-in by default

      // Session recording (disabled by default for privacy)
      session_recording: {
        maskAllInputs: true, // Mask all input fields
        maskTextSelector: '*', // Mask all text
        blockSelector: '[data-ph-no-capture]', // Allow opting out specific elements
      },

      // Capture settings
      capture_pageview: false, // Manual page view tracking
      capture_pageleave: true, // Track when users leave

      // Performance
      loaded: (ph): void => {
        // PostHog loaded successfully
        if (process.env.NODE_ENV === 'development') {
          console.log('PostHog initialized');
        }
        this.initialized = true;

        // Enable session recording only if explicitly enabled
        if (process.env.NEXT_PUBLIC_POSTHOG_ENABLE_RECORDINGS === 'true') {
          ph.startSessionRecording();
        }
      },

      // Disable in development
      disable_session_recording: process.env.NODE_ENV === 'development',
      autocapture: false, // Disable automatic event capture (manual tracking only)
    });
  }

  /**
   * Track an event
   *
   * @param event - Event name (use snake_case convention)
   * @param properties - Event properties
   *
   * @example
   * analyticsService.track('video_generated', {
   *   duration: 30,
   *   format: 'mp4',
   *   quality: 'high'
   * });
   */
  track(event: string, properties?: EventProperties): void {
    if (!this.initialized || !isPostHogConfigured()) {
      return;
    }

    posthog.capture(event, properties);
  }

  /**
   * Identify user
   *
   * Associates future events with a user ID and properties.
   *
   * @param userId - Unique user identifier
   * @param properties - User properties
   *
   * @example
   * analyticsService.identify('user_123', {
   *   email: 'user@example.com',
   *   subscription: 'premium'
   * });
   */
  identify(userId: string, properties?: UserProperties): void {
    if (!this.initialized || !isPostHogConfigured()) {
      return;
    }

    posthog.identify(userId, properties);
  }

  /**
   * Reset user identity
   *
   * Clears current user identification (useful for logout).
   */
  reset(): void {
    if (!this.initialized || !isPostHogConfigured()) {
      return;
    }

    posthog.reset();
  }

  /**
   * Track page view
   *
   * @param path - Page path (e.g., '/editor')
   * @param properties - Additional properties
   */
  trackPageView(path?: string, properties?: EventProperties): void {
    if (!this.initialized || !isPostHogConfigured()) {
      return;
    }

    posthog.capture('$pageview', {
      $current_url: path || window.location.pathname,
      ...properties,
    });
  }

  /**
   * Set user properties
   *
   * Updates properties for the current user without changing identity.
   *
   * @param properties - User properties to set
   */
  setUserProperties(properties: UserProperties): void {
    if (!this.initialized || !isPostHogConfigured()) {
      return;
    }

    posthog.people.set(properties);
  }

  /**
   * Check if a feature flag is enabled
   *
   * @param flag - Feature flag key
   * @returns true if enabled, false otherwise
   */
  isFeatureEnabled(flag: string): boolean {
    if (!this.initialized || !isPostHogConfigured()) {
      return false;
    }

    return posthog.isFeatureEnabled(flag) ?? false;
  }

  /**
   * Get feature flag value
   *
   * @param flag - Feature flag key
   * @returns Feature flag value (string, boolean, or undefined)
   */
  getFeatureFlag(flag: string): string | boolean | undefined {
    if (!this.initialized || !isPostHogConfigured()) {
      return undefined;
    }

    return posthog.getFeatureFlag(flag);
  }

  /**
   * Start session recording
   *
   * Only works if session recording is enabled in config.
   */
  startRecording(): void {
    if (!this.initialized || !isPostHogConfigured()) {
      return;
    }

    posthog.startSessionRecording();
  }

  /**
   * Stop session recording
   */
  stopRecording(): void {
    if (!this.initialized || !isPostHogConfigured()) {
      return;
    }

    posthog.stopSessionRecording();
  }

  /**
   * Opt out of tracking
   *
   * User will no longer be tracked until opt-in is called.
   */
  optOut(): void {
    if (!this.initialized || !isPostHogConfigured()) {
      return;
    }

    posthog.opt_out_capturing();
  }

  /**
   * Opt in to tracking
   *
   * Re-enables tracking after opt-out.
   */
  optIn(): void {
    if (!this.initialized || !isPostHogConfigured()) {
      return;
    }

    posthog.opt_in_capturing();
  }

  /**
   * Check if user has opted out
   */
  hasOptedOut(): boolean {
    if (!this.initialized || !isPostHogConfigured()) {
      return false;
    }

    return posthog.has_opted_out_capturing();
  }
}

/**
 * Singleton analytics service instance
 */
export const analyticsService = new AnalyticsService();

/**
 * Export PostHog SDK for direct access if needed
 */
export { posthog };

/**
 * Common event names for consistency
 */
export const AnalyticsEvents = {
  // Video events
  VIDEO_GENERATED: 'video_generated',
  VIDEO_EXPORT_STARTED: 'video_export_started',
  VIDEO_EXPORT_COMPLETED: 'video_export_completed',
  VIDEO_EXPORT_FAILED: 'video_export_failed',
  VIDEO_PREVIEW: 'video_preview',
  VIDEO_PLAY: 'video_play',
  VIDEO_PAUSE: 'video_pause',

  // Timeline events
  TIMELINE_EDIT: 'timeline_edit',
  TIMELINE_CUT: 'timeline_cut',
  TIMELINE_TRIM: 'timeline_trim',
  TIMELINE_REORDER: 'timeline_reorder',
  TIMELINE_DUPLICATE: 'timeline_duplicate',
  TIMELINE_DELETE: 'timeline_delete',

  // Asset events
  ASSET_UPLOADED: 'asset_uploaded',
  ASSET_DELETED: 'asset_deleted',
  ASSET_REPLACED: 'asset_replaced',

  // Project events
  PROJECT_CREATED: 'project_created',
  PROJECT_OPENED: 'project_opened',
  PROJECT_SAVED: 'project_saved',
  PROJECT_DELETED: 'project_deleted',
  PROJECT_SHARED: 'project_shared',

  // User events
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  USER_UPGRADED: 'user_upgraded',
  USER_DOWNGRADED: 'user_downgraded',

  // AI events
  AI_GENERATION_STARTED: 'ai_generation_started',
  AI_GENERATION_COMPLETED: 'ai_generation_completed',
  AI_GENERATION_FAILED: 'ai_generation_failed',

  // Performance events
  PAGE_LOAD: 'page_load',
  PAGE_ERROR: 'page_error',
  API_ERROR: 'api_error',

  // Onboarding events
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
  ONBOARDING_ABANDONED: 'onboarding_abandoned',
  ONBOARDING_FEEDBACK_SUBMITTED: 'onboarding_feedback_submitted',
  ONBOARDING_TUTORIAL_REPLAYED: 'onboarding_tutorial_replayed',
  ONBOARDING_HELP_ACCESSED: 'onboarding_help_accessed',

  // Easter egg events
  EASTER_EGG_DISCOVERED: 'easter_egg_discovered',
  EASTER_EGG_ACTIVATED: 'easter_egg_activated',
  EASTER_EGG_DEACTIVATED: 'easter_egg_deactivated',
  EASTER_EGG_SHARED: 'easter_egg_shared',
  EASTER_EGG_ACHIEVEMENT_UNLOCKED: 'easter_egg_achievement_unlocked',
  EASTER_EGG_FEEDBACK_SUBMITTED: 'easter_egg_feedback_submitted',
} as const;
