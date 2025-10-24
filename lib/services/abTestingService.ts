/**
 * A/B Testing Service (PostHog Feature Flags Integration)
 *
 * Provides A/B testing capabilities using PostHog feature flags.
 * Supports variant assignment, tracking, and analytics integration.
 *
 * Features:
 * - Feature flag-based variant assignment
 * - Automatic event tracking for variant assignment
 * - Type-safe variant definitions
 * - Fallback handling when PostHog is not available
 * - Onboarding-specific test variants
 *
 * Usage:
 * ```typescript
 * import { abTestingService } from '@/lib/services/abTestingService';
 *
 * // Get variant for onboarding copy test
 * const variant = abTestingService.getOnboardingCopyVariant();
 *
 * // Track variant exposure
 * abTestingService.trackVariantExposure('onboarding_copy_test', variant);
 * ```
 */

import { analyticsService } from './analyticsService';

/**
 * Onboarding copy variants
 */
export enum OnboardingCopyVariant {
  CONTROL = 'control',
  CONCISE = 'concise',
  DETAILED = 'detailed',
  PLAYFUL = 'playful',
}

/**
 * Onboarding step order variants
 */
export enum OnboardingStepOrderVariant {
  CONTROL = 'control',
  TIMELINE_FIRST = 'timeline_first',
  ASSETS_FIRST = 'assets_first',
}

/**
 * Tooltip position variants
 */
export enum TooltipPositionVariant {
  CONTROL = 'control',
  AUTO = 'auto',
  ALWAYS_TOP = 'always_top',
  ALWAYS_BOTTOM = 'always_bottom',
}

/**
 * A/B Testing Service
 *
 * Manages feature flags and variants for A/B tests.
 */
class ABTestingService {
  /**
   * Get onboarding copy variant from feature flag
   *
   * Feature flag: 'onboarding_copy_test'
   * Variants: control, concise, detailed, playful
   */
  getOnboardingCopyVariant(): OnboardingCopyVariant {
    const variant = analyticsService.getFeatureFlag('onboarding_copy_test');

    if (typeof variant === 'string') {
      switch (variant) {
        case 'concise':
          return OnboardingCopyVariant.CONCISE;
        case 'detailed':
          return OnboardingCopyVariant.DETAILED;
        case 'playful':
          return OnboardingCopyVariant.PLAYFUL;
        default:
          return OnboardingCopyVariant.CONTROL;
      }
    }

    return OnboardingCopyVariant.CONTROL;
  }

  /**
   * Get onboarding step order variant from feature flag
   *
   * Feature flag: 'onboarding_step_order'
   * Variants: control, timeline_first, assets_first
   */
  getOnboardingStepOrderVariant(): OnboardingStepOrderVariant {
    const variant = analyticsService.getFeatureFlag('onboarding_step_order');

    if (typeof variant === 'string') {
      switch (variant) {
        case 'timeline_first':
          return OnboardingStepOrderVariant.TIMELINE_FIRST;
        case 'assets_first':
          return OnboardingStepOrderVariant.ASSETS_FIRST;
        default:
          return OnboardingStepOrderVariant.CONTROL;
      }
    }

    return OnboardingStepOrderVariant.CONTROL;
  }

  /**
   * Get tooltip position variant from feature flag
   *
   * Feature flag: 'onboarding_tooltip_position'
   * Variants: control, auto, always_top, always_bottom
   */
  getTooltipPositionVariant(): TooltipPositionVariant {
    const variant = analyticsService.getFeatureFlag('onboarding_tooltip_position');

    if (typeof variant === 'string') {
      switch (variant) {
        case 'auto':
          return TooltipPositionVariant.AUTO;
        case 'always_top':
          return TooltipPositionVariant.ALWAYS_TOP;
        case 'always_bottom':
          return TooltipPositionVariant.ALWAYS_BOTTOM;
        default:
          return TooltipPositionVariant.CONTROL;
      }
    }

    return TooltipPositionVariant.CONTROL;
  }

  /**
   * Track variant exposure
   *
   * Call this when a user is exposed to a variant (sees it on screen).
   * This helps measure the impact of different variants.
   *
   * @param testName - Name of the A/B test
   * @param variant - Variant the user was exposed to
   * @param properties - Additional properties to track
   */
  trackVariantExposure(
    testName: string,
    variant: string,
    properties?: Record<string, string | number | boolean>
  ): void {
    analyticsService.track('ab_test_variant_exposure', {
      test_name: testName,
      variant,
      ...properties,
    });
  }

  /**
   * Track variant outcome
   *
   * Call this when a user completes the goal of the A/B test.
   * For example, completing onboarding for onboarding tests.
   *
   * @param testName - Name of the A/B test
   * @param variant - Variant the user was in
   * @param outcome - Outcome metric (e.g., 'completed', 'abandoned')
   * @param properties - Additional properties to track
   */
  trackVariantOutcome(
    testName: string,
    variant: string,
    outcome: string,
    properties?: Record<string, string | number | boolean>
  ): void {
    analyticsService.track('ab_test_variant_outcome', {
      test_name: testName,
      variant,
      outcome,
      ...properties,
    });
  }

  /**
   * Check if a feature flag is enabled
   *
   * @param flag - Feature flag key
   * @returns true if enabled, false otherwise
   */
  isFeatureEnabled(flag: string): boolean {
    return analyticsService.isFeatureEnabled(flag);
  }
}

/**
 * Singleton A/B testing service instance
 */
export const abTestingService = new ABTestingService();

/**
 * Onboarding copy variations
 *
 * Different copy styles for the welcome step based on A/B test variant.
 */
export const ONBOARDING_COPY_VARIANTS = {
  [OnboardingCopyVariant.CONTROL]: {
    welcome: {
      title: 'Welcome to the Video Editor!',
      description:
        "Let's take a quick tour of the key features. You can skip this anytime or use arrow keys to navigate.",
    },
    assetPanel: {
      title: 'Asset Library',
      description:
        'Upload and manage your video clips, images, and audio files here. Drag and drop files or click to browse.',
    },
    timeline: {
      title: 'Timeline',
      description:
        'This is where you arrange your clips. Drag clips from the asset panel to the timeline, trim them, and create your video.',
    },
  },
  [OnboardingCopyVariant.CONCISE]: {
    welcome: {
      title: 'Welcome!',
      description: 'Quick tour of key features. Skip anytime or use arrow keys.',
    },
    assetPanel: {
      title: 'Assets',
      description: 'Upload clips, images, and audio. Drag & drop or click to browse.',
    },
    timeline: {
      title: 'Timeline',
      description: 'Arrange clips here. Drag from assets, trim, and create your video.',
    },
  },
  [OnboardingCopyVariant.DETAILED]: {
    welcome: {
      title: 'Welcome to the Video Editor!',
      description:
        "Let's take a comprehensive tour of the key features you'll need to create amazing videos. You can skip this tutorial at any time by pressing Escape or clicking the X button. You can also use the arrow keys on your keyboard to navigate through the steps.",
    },
    assetPanel: {
      title: 'Asset Library - Your Media Hub',
      description:
        'This panel is where you upload and manage all your media files including video clips, images, and audio tracks. You can drag and drop files directly from your computer, or click anywhere in the panel to open the file browser. All uploaded assets will appear here for easy access.',
    },
    timeline: {
      title: 'Timeline - The Heart of Your Edit',
      description:
        'This is the timeline where you arrange and edit your clips to create your final video. Simply drag clips from the asset panel above down to the timeline. Once on the timeline, you can trim clips, reorder them, and fine-tune your edit. Everything you see on the timeline will be exported in your final video.',
    },
  },
  [OnboardingCopyVariant.PLAYFUL]: {
    welcome: {
      title: 'Welcome, Video Creator! 🎬',
      description:
        "Ready to make some magic? Let's take a fun tour of the editor! Skip anytime or use arrow keys to explore.",
    },
    assetPanel: {
      title: 'Your Media Treasure Chest 📦',
      description:
        'Drop your video clips, images, and sounds here! Drag & drop or click to find files. This is where all your creative materials live.',
    },
    timeline: {
      title: 'The Creative Canvas 🎨',
      description:
        'This is where the magic happens! Drag clips from your treasure chest, trim them to perfection, and build your masterpiece.',
    },
  },
} as const;
