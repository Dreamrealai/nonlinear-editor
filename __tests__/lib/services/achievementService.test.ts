/**
 * Achievement Service Tests
 *
 * Tests for easter egg achievement tracking, analytics, and database integration.
 */

// Mock Supabase - create the mock implementations inline
const mockRpcFn = jest.fn();
const mockFromFn = jest.fn();
const mockSelectFn = jest.fn();
const mockOrderFn = jest.fn();
const mockLimitFn = jest.fn();

jest.mock('@/lib/supabase', () => {
  const mockRpc = jest.fn();
  const mockFrom = jest.fn();

  return {
    createBrowserSupabaseClient: jest.fn(() => ({
      rpc: mockRpc,
      from: mockFrom,
    })),
  };
});

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

// Import after mocks are set up
import {
  achievementService,
  EasterEggIds,
  AchievementTypes,
} from '@/lib/services/achievementService';
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

describe('AchievementService', () => {
  // Get references to the mocked functions
  let mockSupabase: any;
  let mockRpc: jest.Mock;
  let mockFrom: jest.Mock;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    jest.clearAllMocks();

    // Create a new mocked supabase client instance
    mockRpc = jest.fn();
    mockFrom = jest.fn();
    mockSupabase = {
      rpc: mockRpc,
      from: mockFrom,
    };

    // Reset mock implementations
    mockRpc.mockResolvedValue({
      data: {
        achievement_unlocked: null,
        total_discovered: 1,
      },
      error: null,
    });

    const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder2 = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockOrder1 = jest.fn().mockReturnValue({ order: mockOrder2 });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder1 });
    mockFrom.mockReturnValue({ select: mockSelect });

    // Inject the new mocked supabase client into the service
    (achievementService as any).supabase = mockSupabase;

    // Reset the service's internal state
    (achievementService as any).discoveredEggs = new Set();
    (achievementService as any).activationStartTimes = new Map();

    // Initialize service with clean state
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

    it('should call database RPC to record activation', async () => {
      await achievementService.recordActivation(EasterEggIds.DISCO);

      expect(mockRpc).toHaveBeenCalledWith('record_easter_egg_activation', {
        p_egg_id: EasterEggIds.DISCO,
        p_duration_ms: 0,
      });
    });

    it('should handle database errors gracefully', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const result = await achievementService.recordActivation(EasterEggIds.GRAVITY);

      // Should not throw, returns null
      expect(result).toBeNull();
    });

    it('should return achievement when unlocked', async () => {
      mockRpc.mockResolvedValue({
        data: {
          achievement_unlocked: AchievementTypes.FIRST_EASTER_EGG,
          total_discovered: 1,
        },
        error: null,
      });

      const result = await achievementService.recordActivation(EasterEggIds.KONAMI);

      expect(result).toBe(AchievementTypes.FIRST_EASTER_EGG);
      expect(toast.success).toHaveBeenCalled();
    });
  });

  describe('recordDeactivation', () => {
    it('should track deactivation with duration', async () => {
      await achievementService.recordActivation(EasterEggIds.GRAVITY);
      jest.clearAllMocks();

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

      // Should not track deactivation
      expect(analyticsService.track).not.toHaveBeenCalled();
    });

    it('should call database RPC with duration', async () => {
      await achievementService.recordActivation(EasterEggIds.MATRIX);
      jest.clearAllMocks();

      await new Promise((resolve) => setTimeout(resolve, 100));
      await achievementService.recordDeactivation(EasterEggIds.MATRIX);

      expect(mockRpc).toHaveBeenCalledWith('record_easter_egg_activation', {
        p_egg_id: EasterEggIds.MATRIX,
        p_duration_ms: expect.any(Number),
      });

      const duration = mockRpc.mock.calls[0][1].p_duration_ms;
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('recordShare', () => {
    it('should track share event with analytics', async () => {
      await achievementService.recordShare(EasterEggIds.KONAMI);

      expect(analyticsService.track).toHaveBeenCalledWith(AnalyticsEvents.EASTER_EGG_SHARED, {
        egg_id: EasterEggIds.KONAMI,
      });
    });

    it('should call database RPC to record share', async () => {
      await achievementService.recordShare(EasterEggIds.MATRIX);

      expect(mockRpc).toHaveBeenCalledWith('record_easter_egg_share', {
        p_egg_id: EasterEggIds.MATRIX,
      });
    });

    it('should show success toast on successful share', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      await achievementService.recordShare(EasterEggIds.DISCO);

      expect(toast.success).toHaveBeenCalledWith(
        'Shared on social media!',
        expect.objectContaining({ icon: '🎉' })
      );
    });
  });

  describe('submitFeedback', () => {
    it('should track feedback submission with analytics', async () => {
      await achievementService.submitFeedback(5, EasterEggIds.GRAVITY, 'Great easter egg!');

      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_FEEDBACK_SUBMITTED,
        {
          rating: 5,
          favorite_egg: EasterEggIds.GRAVITY,
          has_suggestions: true,
        }
      );
    });

    it('should call database RPC to record feedback', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      await achievementService.submitFeedback(4, EasterEggIds.DEVMODE, 'Fun!');

      expect(mockRpc).toHaveBeenCalledWith('submit_easter_egg_feedback', {
        p_rating: 4,
        p_favorite_egg: EasterEggIds.DEVMODE,
        p_suggestions: 'Fun!',
      });
    });

    it('should handle missing favorite egg and suggestions', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await achievementService.submitFeedback(3);

      expect(mockRpc).toHaveBeenCalledWith('submit_easter_egg_feedback', {
        p_rating: 3,
        p_favorite_egg: null,
        p_suggestions: null,
      });

      expect(result).toBe(true);
    });

    it('should return false on database error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const result = await achievementService.submitFeedback(5, EasterEggIds.KONAMI);

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalled();
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
    it('should return count of discovered eggs', async () => {
      await achievementService.recordActivation(EasterEggIds.KONAMI);
      await achievementService.recordActivation(EasterEggIds.MATRIX);
      await achievementService.recordActivation(EasterEggIds.DISCO);

      expect(achievementService.getDiscoveredCount()).toBe(3);
    });

    it('should return 0 for no discovered eggs', () => {
      expect(achievementService.getDiscoveredCount()).toBe(0);
    });
  });

  describe('shouldShowHints', () => {
    it('should return true after 30 days with no discoveries', () => {
      // Set account created 31 days ago
      const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
      localStorage.setItem('accountCreatedAt', thirtyOneDaysAgo.toString());

      expect(achievementService.shouldShowHints()).toBe(true);
    });

    it('should return false when eggs have been discovered', async () => {
      const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
      localStorage.setItem('accountCreatedAt', thirtyOneDaysAgo.toString());

      await achievementService.recordActivation(EasterEggIds.KONAMI);

      expect(achievementService.shouldShowHints()).toBe(false);
    });

    it('should return false after hints are marked as shown within 7 days', () => {
      const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
      localStorage.setItem('accountCreatedAt', thirtyOneDaysAgo.toString());

      achievementService.markHintsShown();

      expect(achievementService.shouldShowHints()).toBe(false);
    });

    it('should return false when all eggs discovered', async () => {
      // Discover all 5 eggs
      await achievementService.recordActivation(EasterEggIds.KONAMI);
      await achievementService.recordActivation(EasterEggIds.DEVMODE);
      await achievementService.recordActivation(EasterEggIds.MATRIX);
      await achievementService.recordActivation(EasterEggIds.DISCO);
      await achievementService.recordActivation(EasterEggIds.GRAVITY);

      expect(achievementService.shouldShowHints()).toBe(false);
    });
  });

  describe('getLeaderboard', () => {
    it('should fetch leaderboard from database', async () => {
      const mockLeaderboard = [
        {
          user_id: 'user1',
          email: 'user1@example.com',
          eggs_discovered: 5,
          first_discovery: new Date('2024-01-01'),
          last_discovery: new Date('2024-01-05'),
          discovery_duration: 345600000,
          total_activations: 20,
          eggs_shared: 3,
        },
        {
          user_id: 'user2',
          email: 'user2@example.com',
          eggs_discovered: 3,
          first_discovery: new Date('2024-01-02'),
          last_discovery: new Date('2024-01-04'),
          discovery_duration: 172800000,
          total_activations: 10,
          eggs_shared: 1,
        },
      ];

      const mockLimit = jest.fn().mockResolvedValue({
        data: mockLeaderboard,
        error: null,
      });
      const mockOrder2 = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockOrder1 = jest.fn().mockReturnValue({ order: mockOrder2 });
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder1 });
      mockFrom.mockReturnValue({ select: mockSelect });

      const leaderboard = await achievementService.getLeaderboard(10);

      expect(mockFrom).toHaveBeenCalledWith('easter_egg_leaderboard');
      expect(leaderboard).toHaveLength(2);
      expect(leaderboard[0].eggsDiscovered).toBe(5);
    });

    it('should handle database errors', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });
      const mockOrder2 = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockOrder1 = jest.fn().mockReturnValue({ order: mockOrder2 });
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder1 });
      mockFrom.mockReturnValue({ select: mockSelect });

      const leaderboard = await achievementService.getLeaderboard(10);

      expect(leaderboard).toEqual([]);
    });
  });

  describe('getUserAchievements', () => {
    it('should return achievements list', async () => {
      const achievements = await achievementService.getUserAchievements();

      expect(achievements).toBeInstanceOf(Array);
      expect(achievements.length).toBeGreaterThan(0);

      const firstEggAchievement = achievements.find(
        (a) => a.type === AchievementTypes.FIRST_EASTER_EGG
      );
      expect(firstEggAchievement).toBeDefined();
      expect(firstEggAchievement?.title).toBe('First Discovery');
    });

    it('should unlock achievements based on discovered eggs from database', async () => {
      // Mock database response with one discovered egg
      mockFrom.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [
            {
              user_id: 'user1',
              egg_id: EasterEggIds.KONAMI,
              discovered_at: new Date().toISOString(),
              shared: false,
            },
          ],
          error: null,
        }),
      });

      const achievements = await achievementService.getUserAchievements();

      // First egg achievement should be unlocked
      const firstEggAchievement = achievements.find(
        (a) => a.type === AchievementTypes.FIRST_EASTER_EGG
      );
      expect(firstEggAchievement?.unlocked).toBe(true);
    });
  });
});
