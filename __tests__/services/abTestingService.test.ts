/**
 * Tests for ABTestingService
 *
 * Tests all A/B testing functionality including:
 * - Variant assignment from feature flags
 * - Fallback behavior when PostHog unavailable
 * - Variant exposure tracking
 * - Variant outcome tracking
 * - Feature flag checking
 * - Onboarding copy variants
 *
 * Follows AAA pattern (Arrange-Act-Assert)
 */

import {
  abTestingService,
  OnboardingCopyVariant,
  OnboardingStepOrderVariant,
  TooltipPositionVariant,
  ONBOARDING_COPY_VARIANTS,
} from '@/lib/services/abTestingService';
import { analyticsService } from '@/lib/services/analyticsService';

// Mock analytics service
jest.mock('@/lib/services/analyticsService', () => ({
  analyticsService: {
    getFeatureFlag: jest.fn(),
    isFeatureEnabled: jest.fn(),
    track: jest.fn(),
  },
}));

describe('ABTestingService', () => {
  let mockGetFeatureFlag: jest.MockedFunction<typeof analyticsService.getFeatureFlag>;
  let mockIsFeatureEnabled: jest.MockedFunction<typeof analyticsService.isFeatureEnabled>;
  let mockTrack: jest.MockedFunction<typeof analyticsService.track>;

  beforeEach(() => {
    mockGetFeatureFlag = analyticsService.getFeatureFlag as jest.MockedFunction<
      typeof analyticsService.getFeatureFlag
    >;
    mockIsFeatureEnabled = analyticsService.isFeatureEnabled as jest.MockedFunction<
      typeof analyticsService.isFeatureEnabled
    >;
    mockTrack = analyticsService.track as jest.MockedFunction<typeof analyticsService.track>;

    jest.clearAllMocks();
  });

  describe('getOnboardingCopyVariant', () => {
    it('should return CONTROL when feature flag returns control', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('control');

      // Act
      const result = abTestingService.getOnboardingCopyVariant();

      // Assert
      expect(result).toBe(OnboardingCopyVariant.CONTROL);
      expect(mockGetFeatureFlag).toHaveBeenCalledWith('onboarding_copy_test');
    });

    it('should return CONCISE when feature flag returns concise', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('concise');

      // Act
      const result = abTestingService.getOnboardingCopyVariant();

      // Assert
      expect(result).toBe(OnboardingCopyVariant.CONCISE);
    });

    it('should return DETAILED when feature flag returns detailed', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('detailed');

      // Act
      const result = abTestingService.getOnboardingCopyVariant();

      // Assert
      expect(result).toBe(OnboardingCopyVariant.DETAILED);
    });

    it('should return PLAYFUL when feature flag returns playful', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('playful');

      // Act
      const result = abTestingService.getOnboardingCopyVariant();

      // Assert
      expect(result).toBe(OnboardingCopyVariant.PLAYFUL);
    });

    it('should return CONTROL for unknown variant', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('unknown_variant');

      // Act
      const result = abTestingService.getOnboardingCopyVariant();

      // Assert
      expect(result).toBe(OnboardingCopyVariant.CONTROL);
    });

    it('should return CONTROL when feature flag is not a string', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue(true);

      // Act
      const result = abTestingService.getOnboardingCopyVariant();

      // Assert
      expect(result).toBe(OnboardingCopyVariant.CONTROL);
    });

    it('should return CONTROL when feature flag is undefined', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue(undefined);

      // Act
      const result = abTestingService.getOnboardingCopyVariant();

      // Assert
      expect(result).toBe(OnboardingCopyVariant.CONTROL);
    });

    it('should return CONTROL when feature flag is null', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue(null);

      // Act
      const result = abTestingService.getOnboardingCopyVariant();

      // Assert
      expect(result).toBe(OnboardingCopyVariant.CONTROL);
    });
  });

  describe('getOnboardingStepOrderVariant', () => {
    it('should return CONTROL when feature flag returns control', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('control');

      // Act
      const result = abTestingService.getOnboardingStepOrderVariant();

      // Assert
      expect(result).toBe(OnboardingStepOrderVariant.CONTROL);
      expect(mockGetFeatureFlag).toHaveBeenCalledWith('onboarding_step_order');
    });

    it('should return TIMELINE_FIRST when feature flag returns timeline_first', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('timeline_first');

      // Act
      const result = abTestingService.getOnboardingStepOrderVariant();

      // Assert
      expect(result).toBe(OnboardingStepOrderVariant.TIMELINE_FIRST);
    });

    it('should return ASSETS_FIRST when feature flag returns assets_first', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('assets_first');

      // Act
      const result = abTestingService.getOnboardingStepOrderVariant();

      // Assert
      expect(result).toBe(OnboardingStepOrderVariant.ASSETS_FIRST);
    });

    it('should return CONTROL for unknown variant', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('unknown_order');

      // Act
      const result = abTestingService.getOnboardingStepOrderVariant();

      // Assert
      expect(result).toBe(OnboardingStepOrderVariant.CONTROL);
    });

    it('should return CONTROL when feature flag is not a string', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue(false);

      // Act
      const result = abTestingService.getOnboardingStepOrderVariant();

      // Assert
      expect(result).toBe(OnboardingStepOrderVariant.CONTROL);
    });
  });

  describe('getTooltipPositionVariant', () => {
    it('should return CONTROL when feature flag returns control', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('control');

      // Act
      const result = abTestingService.getTooltipPositionVariant();

      // Assert
      expect(result).toBe(TooltipPositionVariant.CONTROL);
      expect(mockGetFeatureFlag).toHaveBeenCalledWith('onboarding_tooltip_position');
    });

    it('should return AUTO when feature flag returns auto', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('auto');

      // Act
      const result = abTestingService.getTooltipPositionVariant();

      // Assert
      expect(result).toBe(TooltipPositionVariant.AUTO);
    });

    it('should return ALWAYS_TOP when feature flag returns always_top', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('always_top');

      // Act
      const result = abTestingService.getTooltipPositionVariant();

      // Assert
      expect(result).toBe(TooltipPositionVariant.ALWAYS_TOP);
    });

    it('should return ALWAYS_BOTTOM when feature flag returns always_bottom', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('always_bottom');

      // Act
      const result = abTestingService.getTooltipPositionVariant();

      // Assert
      expect(result).toBe(TooltipPositionVariant.ALWAYS_BOTTOM);
    });

    it('should return CONTROL for unknown variant', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('unknown_position');

      // Act
      const result = abTestingService.getTooltipPositionVariant();

      // Assert
      expect(result).toBe(TooltipPositionVariant.CONTROL);
    });

    it('should return CONTROL when feature flag is not a string', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue(123);

      // Act
      const result = abTestingService.getTooltipPositionVariant();

      // Assert
      expect(result).toBe(TooltipPositionVariant.CONTROL);
    });
  });

  describe('trackVariantExposure', () => {
    it('should track variant exposure with test name and variant', () => {
      // Arrange
      const testName = 'onboarding_copy_test';
      const variant = 'concise';

      // Act
      abTestingService.trackVariantExposure(testName, variant);

      // Assert
      expect(mockTrack).toHaveBeenCalledWith('ab_test_variant_exposure', {
        test_name: testName,
        variant,
      });
    });

    it('should track variant exposure with additional properties', () => {
      // Arrange
      const testName = 'button_color_test';
      const variant = 'blue';
      const properties = {
        page: 'home',
        position: 1,
        isFirstVisit: true,
      };

      // Act
      abTestingService.trackVariantExposure(testName, variant, properties);

      // Assert
      expect(mockTrack).toHaveBeenCalledWith('ab_test_variant_exposure', {
        test_name: testName,
        variant,
        page: 'home',
        position: 1,
        isFirstVisit: true,
      });
    });

    it('should track variant exposure without additional properties', () => {
      // Arrange
      const testName = 'pricing_page_test';
      const variant = 'variant_a';

      // Act
      abTestingService.trackVariantExposure(testName, variant);

      // Assert
      expect(mockTrack).toHaveBeenCalledTimes(1);
      expect(mockTrack).toHaveBeenCalledWith('ab_test_variant_exposure', {
        test_name: testName,
        variant,
      });
    });
  });

  describe('trackVariantOutcome', () => {
    it('should track variant outcome with all required fields', () => {
      // Arrange
      const testName = 'onboarding_copy_test';
      const variant = 'detailed';
      const outcome = 'completed';

      // Act
      abTestingService.trackVariantOutcome(testName, variant, outcome);

      // Assert
      expect(mockTrack).toHaveBeenCalledWith('ab_test_variant_outcome', {
        test_name: testName,
        variant,
        outcome,
      });
    });

    it('should track variant outcome with additional properties', () => {
      // Arrange
      const testName = 'checkout_flow_test';
      const variant = 'one_step';
      const outcome = 'purchased';
      const properties = {
        timeToComplete: 45,
        itemCount: 3,
        totalAmount: 99.99,
      };

      // Act
      abTestingService.trackVariantOutcome(testName, variant, outcome, properties);

      // Assert
      expect(mockTrack).toHaveBeenCalledWith('ab_test_variant_outcome', {
        test_name: testName,
        variant,
        outcome,
        timeToComplete: 45,
        itemCount: 3,
        totalAmount: 99.99,
      });
    });

    it('should track abandoned outcome', () => {
      // Arrange
      const testName = 'signup_form_test';
      const variant = 'short_form';
      const outcome = 'abandoned';

      // Act
      abTestingService.trackVariantOutcome(testName, variant, outcome);

      // Assert
      expect(mockTrack).toHaveBeenCalledWith('ab_test_variant_outcome', {
        test_name: testName,
        variant,
        outcome,
      });
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true when feature is enabled', () => {
      // Arrange
      mockIsFeatureEnabled.mockReturnValue(true);

      // Act
      const result = abTestingService.isFeatureEnabled('new_editor_ui');

      // Assert
      expect(result).toBe(true);
      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('new_editor_ui');
    });

    it('should return false when feature is disabled', () => {
      // Arrange
      mockIsFeatureEnabled.mockReturnValue(false);

      // Act
      const result = abTestingService.isFeatureEnabled('beta_feature');

      // Assert
      expect(result).toBe(false);
      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('beta_feature');
    });

    it('should delegate to analytics service', () => {
      // Arrange
      const flagName = 'experimental_feature';
      mockIsFeatureEnabled.mockReturnValue(true);

      // Act
      abTestingService.isFeatureEnabled(flagName);

      // Assert
      expect(mockIsFeatureEnabled).toHaveBeenCalledTimes(1);
      expect(mockIsFeatureEnabled).toHaveBeenCalledWith(flagName);
    });
  });

  describe('ONBOARDING_COPY_VARIANTS', () => {
    it('should have copy for all variants', () => {
      // Assert
      expect(ONBOARDING_COPY_VARIANTS[OnboardingCopyVariant.CONTROL]).toBeDefined();
      expect(ONBOARDING_COPY_VARIANTS[OnboardingCopyVariant.CONCISE]).toBeDefined();
      expect(ONBOARDING_COPY_VARIANTS[OnboardingCopyVariant.DETAILED]).toBeDefined();
      expect(ONBOARDING_COPY_VARIANTS[OnboardingCopyVariant.PLAYFUL]).toBeDefined();
    });

    it('should have all required steps in CONTROL variant', () => {
      // Arrange
      const controlCopy = ONBOARDING_COPY_VARIANTS[OnboardingCopyVariant.CONTROL];

      // Assert
      expect(controlCopy.welcome).toBeDefined();
      expect(controlCopy.welcome.title).toBeDefined();
      expect(controlCopy.welcome.description).toBeDefined();
      expect(controlCopy.assetPanel).toBeDefined();
      expect(controlCopy.assetPanel.title).toBeDefined();
      expect(controlCopy.assetPanel.description).toBeDefined();
      expect(controlCopy.timeline).toBeDefined();
      expect(controlCopy.timeline.title).toBeDefined();
      expect(controlCopy.timeline.description).toBeDefined();
    });

    it('should have shorter copy in CONCISE variant', () => {
      // Arrange
      const controlCopy = ONBOARDING_COPY_VARIANTS[OnboardingCopyVariant.CONTROL];
      const conciseCopy = ONBOARDING_COPY_VARIANTS[OnboardingCopyVariant.CONCISE];

      // Assert
      expect(conciseCopy.welcome.description.length).toBeLessThan(
        controlCopy.welcome.description.length
      );
      expect(conciseCopy.assetPanel.description.length).toBeLessThan(
        controlCopy.assetPanel.description.length
      );
      expect(conciseCopy.timeline.description.length).toBeLessThan(
        controlCopy.timeline.description.length
      );
    });

    it('should have longer copy in DETAILED variant', () => {
      // Arrange
      const controlCopy = ONBOARDING_COPY_VARIANTS[OnboardingCopyVariant.CONTROL];
      const detailedCopy = ONBOARDING_COPY_VARIANTS[OnboardingCopyVariant.DETAILED];

      // Assert
      expect(detailedCopy.welcome.description.length).toBeGreaterThan(
        controlCopy.welcome.description.length
      );
      expect(detailedCopy.assetPanel.description.length).toBeGreaterThan(
        controlCopy.assetPanel.description.length
      );
      expect(detailedCopy.timeline.description.length).toBeGreaterThan(
        controlCopy.timeline.description.length
      );
    });

    it('should have emojis in PLAYFUL variant', () => {
      // Arrange
      const playfulCopy = ONBOARDING_COPY_VARIANTS[OnboardingCopyVariant.PLAYFUL];

      // Assert
      expect(playfulCopy.welcome.title).toMatch(/🎬/);
      expect(playfulCopy.assetPanel.title).toMatch(/📦/);
      expect(playfulCopy.timeline.title).toMatch(/🎨/);
    });

    it('should have consistent structure across all variants', () => {
      // Arrange
      const variants = [
        OnboardingCopyVariant.CONTROL,
        OnboardingCopyVariant.CONCISE,
        OnboardingCopyVariant.DETAILED,
        OnboardingCopyVariant.PLAYFUL,
      ];

      // Assert
      variants.forEach((variant) => {
        const copy = ONBOARDING_COPY_VARIANTS[variant];
        expect(copy.welcome).toHaveProperty('title');
        expect(copy.welcome).toHaveProperty('description');
        expect(copy.assetPanel).toHaveProperty('title');
        expect(copy.assetPanel).toHaveProperty('description');
        expect(copy.timeline).toHaveProperty('title');
        expect(copy.timeline).toHaveProperty('description');
      });
    });
  });

  describe('Integration tests', () => {
    it('should work with complete onboarding flow', () => {
      // Arrange
      mockGetFeatureFlag.mockReturnValue('concise');

      // Act
      const variant = abTestingService.getOnboardingCopyVariant();
      abTestingService.trackVariantExposure('onboarding_copy_test', variant);
      const copy = ONBOARDING_COPY_VARIANTS[variant];
      abTestingService.trackVariantOutcome('onboarding_copy_test', variant, 'completed');

      // Assert
      expect(variant).toBe(OnboardingCopyVariant.CONCISE);
      expect(copy).toBeDefined();
      expect(mockTrack).toHaveBeenCalledTimes(2);
      expect(mockTrack).toHaveBeenNthCalledWith(1, 'ab_test_variant_exposure', {
        test_name: 'onboarding_copy_test',
        variant,
      });
      expect(mockTrack).toHaveBeenNthCalledWith(2, 'ab_test_variant_outcome', {
        test_name: 'onboarding_copy_test',
        variant,
        outcome: 'completed',
      });
    });

    it('should handle multiple concurrent tests', () => {
      // Arrange
      mockGetFeatureFlag
        .mockReturnValueOnce('detailed')
        .mockReturnValueOnce('timeline_first')
        .mockReturnValueOnce('auto');

      // Act
      const copyVariant = abTestingService.getOnboardingCopyVariant();
      const stepOrderVariant = abTestingService.getOnboardingStepOrderVariant();
      const tooltipVariant = abTestingService.getTooltipPositionVariant();

      // Assert
      expect(copyVariant).toBe(OnboardingCopyVariant.DETAILED);
      expect(stepOrderVariant).toBe(OnboardingStepOrderVariant.TIMELINE_FIRST);
      expect(tooltipVariant).toBe(TooltipPositionVariant.AUTO);
      expect(mockGetFeatureFlag).toHaveBeenCalledTimes(3);
    });
  });
});
