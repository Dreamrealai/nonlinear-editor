/**
 * Achievement Service Tests
 *
 * Tests for easter egg achievement tracking, analytics, and database integration.
 */

import {
  achievementService,
  EasterEggIds,
  AchievementTypes,
} from '@/lib/services/achievementService';
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  createBrowserSupabaseClient: jest.fn(() => ({
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
  })),
}));

jest.mock('@/lib/services/analyticsService', () => ({
  analyticsService: {
    track: jest.fn(),
  },
  AnalyticsEvents: {
    EASTER_EGG_DISCOVERED: 'easter_egg_discovered',
    EASTER_EGG_ACTIVATED: 'easter_egg_activated',
    EASTER_EGG_DEACTIVATED: 'easter_egg_deactivated',
    EASTER_EGG_SHARED: 'easter_egg_shared',
    EASTER_EGG_ACHIEVEMENT_UNLOCKED: 'easter_egg_achievement_unlocked',
    EASTER_EGG_FEEDBACK_SUBMITTED: 'easter_egg_feedback_submitted',
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AchievementService', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    jest.clearAllMocks();

    // Initialize service
    achievementService.init();
  });

  describe('init', () => {
    it('should load discovered eggs from localStorage', () => {
      localStorage.setItem('discoveredEasterEggs', JSON.stringify(['konami', 'matrix']));
      achievementService.init();

      expect(achievementService.hasDiscovered(EasterEggIds.KONAMI)).toBe(true);
      expect(achievementService.hasDiscovered(EasterEggIds.MATRIX)).toBe(true);
      expect(achievementService.hasDiscovered(EasterEggIds.DISCO)).toBe(false);
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorage.setItem('discoveredEasterEggs', 'invalid json');
      expect(() => achievementService.init()).not.toThrow();
    });
  });

  describe('recordActivation', () => {
    it('should track first discovery with analytics', async () => {
      await achievementService.recordActivation(EasterEggIds.KONAMI);

      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_ACTIVATED,
        expect.objectContaining({
          egg_id: EasterEggIds.KONAMI,
          is_first_discovery: true,
        })
      );

      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_DISCOVERED,
        expect.objectContaining({
          egg_id: EasterEggIds.KONAMI,
          discovery_order: 1,
        })
      );
    });

    it('should not track discovery event for repeat activations', async () => {
      // First activation
      await achievementService.recordActivation(EasterEggIds.KONAMI);
      jest.clearAllMocks();

      // Second activation
      await achievementService.recordActivation(EasterEggIds.KONAMI);

      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_ACTIVATED,
        expect.objectContaining({
          egg_id: EasterEggIds.KONAMI,
          is_first_discovery: false,
        })
      );

      expect(analyticsService.track).not.toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_DISCOVERED,
        expect.anything()
      );
    });

    it('should store discovered egg in localStorage', async () => {
      await achievementService.recordActivation(EasterEggIds.MATRIX);

      const stored = localStorage.getItem('discoveredEasterEggs');
      expect(stored).toBeDefined();
      const eggs = JSON.parse(stored!);
      expect(eggs).toContain(EasterEggIds.MATRIX);
    });

    it('should track activation start time', async () => {
      const beforeTime = Date.now();
      await achievementService.recordActivation(EasterEggIds.DISCO);
      const afterTime = Date.now();

      // Verify start time was recorded (we can't access private map directly,
      // but deactivation will fail if start time wasn't recorded)
      await achievementService.recordDeactivation(EasterEggIds.DISCO);

      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_DEACTIVATED,
        expect.objectContaining({
          egg_id: EasterEggIds.DISCO,
          duration_ms: expect.any(Number),
        })
      );
    });
  });

  describe('recordDeactivation', () => {
    it('should track deactivation with duration', async () => {
      await achievementService.recordActivation(EasterEggIds.GRAVITY);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      await achievementService.recordDeactivation(EasterEggIds.GRAVITY);

      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_DEACTIVATED,
        expect.objectContaining({
          egg_id: EasterEggIds.GRAVITY,
          duration_ms: expect.any(Number),
        })
      );

      const call = (analyticsService.track as jest.Mock).mock.calls.find(
        (call) => call[0] === AnalyticsEvents.EASTER_EGG_DEACTIVATED
      );
      expect(call[1].duration_ms).toBeGreaterThan(0);
    });

    it('should handle deactivation without prior activation', async () => {
      await achievementService.recordDeactivation(EasterEggIds.DEVMODE);

      // Should not crash, but also should not track
      expect(analyticsService.track).not.toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_DEACTIVATED,
        expect.anything()
      );
    });
  });

  describe('recordShare', () => {
    it('should track share event with analytics', async () => {
      await achievementService.recordShare(EasterEggIds.KONAMI);

      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_SHARED,
        expect.objectContaining({
          egg_id: EasterEggIds.KONAMI,
        })
      );
    });
  });

  describe('submitFeedback', () => {
    it('should track feedback submission with analytics', async () => {
      await achievementService.submitFeedback(5, EasterEggIds.KONAMI, 'Great easter eggs!');

      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_FEEDBACK_SUBMITTED,
        expect.objectContaining({
          rating: 5,
          favorite_egg: EasterEggIds.KONAMI,
          has_suggestions: true,
        })
      );
    });

    it('should handle feedback without favorite or suggestions', async () => {
      await achievementService.submitFeedback(4);

      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_FEEDBACK_SUBMITTED,
        expect.objectContaining({
          rating: 4,
          favorite_egg: undefined,
          has_suggestions: false,
        })
      );
    });
  });

  describe('hasDiscovered', () => {
    it('should return true for discovered eggs', async () => {
      await achievementService.recordActivation(EasterEggIds.KONAMI);
      expect(achievementService.hasDiscovered(EasterEggIds.KONAMI)).toBe(true);
    });

    it('should return false for undiscovered eggs', () => {
      expect(achievementService.hasDiscovered(EasterEggIds.MATRIX)).toBe(false);
    });
  });

  describe('getDiscoveredCount', () => {
    it('should return 0 initially', () => {
      expect(achievementService.getDiscoveredCount()).toBe(0);
    });

    it('should return correct count after discoveries', async () => {
      await achievementService.recordActivation(EasterEggIds.KONAMI);
      expect(achievementService.getDiscoveredCount()).toBe(1);

      await achievementService.recordActivation(EasterEggIds.MATRIX);
      expect(achievementService.getDiscoveredCount()).toBe(2);

      await achievementService.recordActivation(EasterEggIds.DISCO);
      expect(achievementService.getDiscoveredCount()).toBe(3);
    });

    it('should not double-count repeated activations', async () => {
      await achievementService.recordActivation(EasterEggIds.KONAMI);
      await achievementService.recordActivation(EasterEggIds.KONAMI);
      await achievementService.recordActivation(EasterEggIds.KONAMI);

      expect(achievementService.getDiscoveredCount()).toBe(1);
    });
  });

  describe('shouldShowHints', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should return false if all eggs discovered', async () => {
      await achievementService.recordActivation(EasterEggIds.KONAMI);
      await achievementService.recordActivation(EasterEggIds.DEVMODE);
      await achievementService.recordActivation(EasterEggIds.MATRIX);
      await achievementService.recordActivation(EasterEggIds.DISCO);
      await achievementService.recordActivation(EasterEggIds.GRAVITY);

      expect(achievementService.shouldShowHints()).toBe(false);
    });

    it('should return false if hints shown recently', () => {
      const weekAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
      localStorage.setItem('lastEasterEggHint', weekAgo.toString());

      expect(achievementService.shouldShowHints()).toBe(false);
    });

    it('should return true after 30 days with no discoveries', () => {
      const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
      localStorage.setItem('accountCreatedAt', thirtyOneDaysAgo.toString());

      expect(achievementService.shouldShowHints()).toBe(true);
    });

    it('should return false for new accounts', () => {
      const yesterday = Date.now() - 1 * 24 * 60 * 60 * 1000;
      localStorage.setItem('accountCreatedAt', yesterday.toString());

      expect(achievementService.shouldShowHints()).toBe(false);
    });
  });

  describe('markHintsShown', () => {
    it('should store timestamp in localStorage', () => {
      achievementService.markHintsShown();

      const timestamp = localStorage.getItem('lastEasterEggHint');
      expect(timestamp).toBeDefined();
      expect(parseInt(timestamp!)).toBeGreaterThan(0);
    });
  });

  describe('getUserAchievements', () => {
    it('should return all achievements unlocked status', async () => {
      // Discover 3 eggs
      await achievementService.recordActivation(EasterEggIds.KONAMI);
      await achievementService.recordActivation(EasterEggIds.MATRIX);
      await achievementService.recordActivation(EasterEggIds.DISCO);

      const achievements = await achievementService.getUserAchievements();

      expect(achievements).toBeDefined();
      expect(achievements.length).toBeGreaterThan(0);

      // Should have achievement types
      const types = achievements.map((a) => a.type);
      expect(types).toContain(AchievementTypes.FIRST_EASTER_EGG);
      expect(types).toContain(AchievementTypes.EASTER_EGG_HUNTER);
      expect(types).toContain(AchievementTypes.EASTER_EGG_MASTER);
    });
  });

  describe('getLeaderboard', () => {
    it('should return empty array when no data', async () => {
      const leaderboard = await achievementService.getLeaderboard();

      expect(leaderboard).toEqual([]);
    });

    it('should handle limit parameter', async () => {
      const leaderboard = await achievementService.getLeaderboard(10);

      expect(leaderboard).toBeDefined();
      expect(Array.isArray(leaderboard)).toBe(true);
    });
  });
});

describe('Easter Egg Analytics Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    achievementService.init();
  });

  it('should track complete egg discovery flow', async () => {
    // Discovery
    await achievementService.recordActivation(EasterEggIds.KONAMI);

    expect(analyticsService.track).toHaveBeenCalledWith(
      AnalyticsEvents.EASTER_EGG_DISCOVERED,
      expect.any(Object)
    );

    expect(analyticsService.track).toHaveBeenCalledWith(
      AnalyticsEvents.EASTER_EGG_ACTIVATED,
      expect.any(Object)
    );

    // Deactivation
    await achievementService.recordDeactivation(EasterEggIds.KONAMI);

    expect(analyticsService.track).toHaveBeenCalledWith(
      AnalyticsEvents.EASTER_EGG_DEACTIVATED,
      expect.any(Object)
    );

    // Share
    await achievementService.recordShare(EasterEggIds.KONAMI);

    expect(analyticsService.track).toHaveBeenCalledWith(
      AnalyticsEvents.EASTER_EGG_SHARED,
      expect.any(Object)
    );
  });

  it('should track all 5 egg discovery events', async () => {
    const eggs = [
      EasterEggIds.KONAMI,
      EasterEggIds.DEVMODE,
      EasterEggIds.MATRIX,
      EasterEggIds.DISCO,
      EasterEggIds.GRAVITY,
    ];

    for (const egg of eggs) {
      await achievementService.recordActivation(egg);
    }

    const discoveryCalls = (analyticsService.track as jest.Mock).mock.calls.filter(
      (call) => call[0] === AnalyticsEvents.EASTER_EGG_DISCOVERED
    );

    expect(discoveryCalls.length).toBe(5);

    // Check discovery order
    discoveryCalls.forEach((call, index) => {
      expect(call[1].discovery_order).toBe(index + 1);
    });
  });

  it('should track feedback with all event properties', async () => {
    await achievementService.submitFeedback(5, EasterEggIds.MATRIX, 'Add more effects!');

    expect(analyticsService.track).toHaveBeenCalledWith(
      AnalyticsEvents.EASTER_EGG_FEEDBACK_SUBMITTED,
      {
        rating: 5,
        favorite_egg: EasterEggIds.MATRIX,
        has_suggestions: true,
      }
    );
  });
});
