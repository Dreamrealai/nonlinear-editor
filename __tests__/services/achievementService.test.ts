/**
 * Tests for AchievementService
 *
 * Tests all achievement functionality including:
 * - Easter egg discovery tracking
 * - Achievement unlocking logic
 * - Leaderboard functionality
 * - Local storage integration
 * - Analytics tracking
 * - Social sharing
 *
 * Follows AAA pattern (Arrange-Act-Assert)
 */

// Mock dependencies - must be before imports
jest.mock('@/lib/supabase', () => ({
  createBrowserSupabaseClient: jest.fn(() => ({
    rpc: jest.fn(),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn(),
  })),
}));

jest.mock('@/lib/services/analyticsService', () => ({
  analyticsService: {
    track: jest.fn(),
  },
  AnalyticsEvents: {
    EASTER_EGG_ACTIVATED: 'easter_egg_activated',
    EASTER_EGG_DISCOVERED: 'easter_egg_discovered',
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

// Now import after mocks
import {
  achievementService,
  EasterEggIds,
  AchievementTypes,
  type Achievement,
  type LeaderboardEntry,
} from '@/lib/services/achievementService';
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';
import toast from 'react-hot-toast';

describe('AchievementService', () => {
  let localStorageMock: Record<string, string>;
  let mockSupabase: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Get the mock Supabase instance
    mockSupabase = (achievementService as any).supabase;

    // Mock localStorage
    localStorageMock = {};
    global.localStorage = {
      getItem: jest.fn((key: string) => localStorageMock[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: jest.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: jest.fn(),
    };

    // Mock window (if not already defined)
    if (typeof global.window === 'undefined') {
      (global as any).window = {};
    }

    // Mock console.error to suppress expected errors in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Reset service state by re-initializing
    (achievementService as any).discoveredEggs = new Set();
    (achievementService as any).activationStartTimes = new Map();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('init', () => {
    it('should load discovered eggs from localStorage', () => {
      // Arrange
      const eggs = [EasterEggIds.KONAMI, EasterEggIds.MATRIX];
      localStorageMock['discoveredEasterEggs'] = JSON.stringify(eggs);

      // Act
      achievementService.init();

      // Assert
      expect(achievementService.hasDiscovered(EasterEggIds.KONAMI)).toBe(true);
      expect(achievementService.hasDiscovered(EasterEggIds.MATRIX)).toBe(true);
      expect(achievementService.getDiscoveredCount()).toBe(2);
    });

    it('should handle no stored eggs', () => {
      // Arrange - no eggs in localStorage

      // Act
      achievementService.init();

      // Assert
      expect(achievementService.getDiscoveredCount()).toBe(0);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Arrange
      localStorageMock['discoveredEasterEggs'] = 'invalid-json';

      // Act
      achievementService.init();

      // Assert
      expect(achievementService.getDiscoveredCount()).toBe(0);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load discovered eggs:',
        expect.any(Error)
      );
    });

    it('should not run when window is undefined (SSR)', () => {
      // Arrange
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR behavior by deleting window object
      delete global.window;

      // Act
      achievementService.init();

      // Assert - should not throw
      expect(achievementService.getDiscoveredCount()).toBeDefined();

      // Restore
      global.window = originalWindow;
    });
  });

  describe('recordActivation', () => {
    it('should record first egg discovery', async () => {
      // Arrange
      const mockResult = {
        egg_id: EasterEggIds.KONAMI,
        is_new_discovery: true,
        total_discovered: 1,
        achievement_unlocked: AchievementTypes.FIRST_EASTER_EGG,
      };
      mockSupabase.rpc.mockResolvedValueOnce({ data: mockResult, error: null });

      // Act
      const result = await achievementService.recordActivation(EasterEggIds.KONAMI);

      // Assert
      expect(result).toBe(AchievementTypes.FIRST_EASTER_EGG);
      expect(achievementService.hasDiscovered(EasterEggIds.KONAMI)).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'discoveredEasterEggs',
        JSON.stringify([EasterEggIds.KONAMI])
      );
      expect(analyticsService.track).toHaveBeenCalledWith(AnalyticsEvents.EASTER_EGG_ACTIVATED, {
        egg_id: EasterEggIds.KONAMI,
        is_first_discovery: true,
        total_discovered: 1,
      });
      expect(analyticsService.track).toHaveBeenCalledWith(AnalyticsEvents.EASTER_EGG_DISCOVERED, {
        egg_id: EasterEggIds.KONAMI,
        discovery_order: 1,
      });
    });

    it('should record subsequent activation without discovery event', async () => {
      // Arrange
      (achievementService as any).discoveredEggs.add(EasterEggIds.MATRIX);
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          egg_id: EasterEggIds.MATRIX,
          is_new_discovery: false,
          total_discovered: 1,
          achievement_unlocked: null,
        },
        error: null,
      });

      // Act
      const result = await achievementService.recordActivation(EasterEggIds.MATRIX);

      // Assert
      expect(result).toBeNull();
      expect(analyticsService.track).toHaveBeenCalledWith(AnalyticsEvents.EASTER_EGG_ACTIVATED, {
        egg_id: EasterEggIds.MATRIX,
        is_first_discovery: false,
        total_discovered: 1,
      });
      expect(analyticsService.track).not.toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_DISCOVERED,
        expect.any(Object)
      );
    });

    it('should show achievement notification when unlocked', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          egg_id: EasterEggIds.DISCO,
          is_new_discovery: true,
          total_discovered: 3,
          achievement_unlocked: AchievementTypes.EASTER_EGG_HUNTER,
        },
        error: null,
      });

      // Act
      await achievementService.recordActivation(EasterEggIds.DISCO);

      // Assert
      expect(toast.success).toHaveBeenCalledWith(
        'Achievement Unlocked: Easter Egg Hunter!',
        expect.objectContaining({
          duration: 5000,
          icon: '🕵️',
        })
      );
      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_ACHIEVEMENT_UNLOCKED,
        {
          achievement: AchievementTypes.EASTER_EGG_HUNTER,
          total_discovered: 3,
        }
      );
    });

    it('should handle database error gracefully', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      // Act
      const result = await achievementService.recordActivation(EasterEggIds.KONAMI);

      // Assert
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to record activation:',
        expect.any(Object)
      );
      // Should still track locally
      expect(achievementService.hasDiscovered(EasterEggIds.KONAMI)).toBe(true);
    });

    it('should track activation start time', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValueOnce({ data: {}, error: null });
      const beforeTime = Date.now();

      // Act
      await achievementService.recordActivation(EasterEggIds.GRAVITY);

      // Assert
      const startTime = (achievementService as any).activationStartTimes.get(EasterEggIds.GRAVITY);
      expect(startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(startTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('recordDeactivation', () => {
    it('should record deactivation with duration', async () => {
      // Arrange
      const startTime = Date.now() - 5000; // 5 seconds ago
      (achievementService as any).activationStartTimes.set(EasterEggIds.KONAMI, startTime);
      mockSupabase.rpc.mockResolvedValueOnce({ data: {}, error: null });

      // Act
      await achievementService.recordDeactivation(EasterEggIds.KONAMI);

      // Assert
      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_DEACTIVATED,
        expect.objectContaining({
          egg_id: EasterEggIds.KONAMI,
          duration_ms: expect.any(Number),
        })
      );
      expect(mockSupabase.rpc).toHaveBeenCalledWith('record_easter_egg_activation', {
        p_egg_id: EasterEggIds.KONAMI,
        p_duration_ms: expect.any(Number),
      });
      expect((achievementService as any).activationStartTimes.has(EasterEggIds.KONAMI)).toBe(false);
    });

    it('should do nothing if activation not started', async () => {
      // Arrange - no activation start time

      // Act
      await achievementService.recordDeactivation(EasterEggIds.MATRIX);

      // Assert
      expect(analyticsService.track).not.toHaveBeenCalled();
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it('should handle database error gracefully', async () => {
      // Arrange
      (achievementService as any).activationStartTimes.set(EasterEggIds.DEVMODE, Date.now());
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      // Act
      await achievementService.recordDeactivation(EasterEggIds.DEVMODE);

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        'Failed to record deactivation:',
        expect.any(Object)
      );
      // Should still track analytics
      expect(analyticsService.track).toHaveBeenCalled();
    });
  });

  describe('recordShare', () => {
    it('should record social share successfully', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValueOnce({ data: {}, error: null });

      // Act
      await achievementService.recordShare(EasterEggIds.DISCO);

      // Assert
      expect(analyticsService.track).toHaveBeenCalledWith(AnalyticsEvents.EASTER_EGG_SHARED, {
        egg_id: EasterEggIds.DISCO,
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('record_easter_egg_share', {
        p_egg_id: EasterEggIds.DISCO,
      });
      expect(toast.success).toHaveBeenCalledWith('Shared on social media!', {
        icon: '🎉',
        duration: 3000,
      });
    });

    it('should handle database error gracefully', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      // Act
      await achievementService.recordShare(EasterEggIds.MATRIX);

      // Assert
      expect(console.error).toHaveBeenCalledWith('Failed to record share:', expect.any(Object));
      // Should still track analytics
      expect(analyticsService.track).toHaveBeenCalled();
    });
  });

  describe('submitFeedback', () => {
    it('should submit feedback successfully', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValueOnce({ data: {}, error: null });

      // Act
      const result = await achievementService.submitFeedback(
        5,
        EasterEggIds.KONAMI,
        'Great feature!'
      );

      // Assert
      expect(result).toBe(true);
      expect(analyticsService.track).toHaveBeenCalledWith(
        AnalyticsEvents.EASTER_EGG_FEEDBACK_SUBMITTED,
        {
          rating: 5,
          favorite_egg: EasterEggIds.KONAMI,
          has_suggestions: true,
        }
      );
      expect(mockSupabase.rpc).toHaveBeenCalledWith('submit_easter_egg_feedback', {
        p_rating: 5,
        p_favorite_egg: EasterEggIds.KONAMI,
        p_suggestions: 'Great feature!',
      });
      expect(toast.success).toHaveBeenCalledWith('Thank you for your feedback!', {
        icon: '❤️',
        duration: 3000,
      });
    });

    it('should handle feedback without optional fields', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValueOnce({ data: {}, error: null });

      // Act
      const result = await achievementService.submitFeedback(3);

      // Assert
      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('submit_easter_egg_feedback', {
        p_rating: 3,
        p_favorite_egg: null,
        p_suggestions: null,
      });
    });

    it('should show error toast on failure', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      // Act
      const result = await achievementService.submitFeedback(4, 'none');

      // Assert
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Failed to submit feedback. Please try again.');
    });
  });

  describe('getUserAchievements', () => {
    it('should return all locked achievements when no eggs discovered', async () => {
      // Arrange
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });

      // Act
      const achievements = await achievementService.getUserAchievements();

      // Assert
      expect(achievements).toHaveLength(5);
      expect(achievements.every((a) => !a.unlocked)).toBe(true);
    });

    it('should unlock first discovery achievement', async () => {
      // Arrange
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          { egg_id: EasterEggIds.KONAMI, discovered_at: new Date().toISOString(), shared: false },
        ],
        error: null,
      });

      // Act
      const achievements = await achievementService.getUserAchievements();

      // Assert
      const firstEgg = achievements.find((a) => a.type === AchievementTypes.FIRST_EASTER_EGG);
      expect(firstEgg?.unlocked).toBe(true);
    });

    it('should unlock easter egg hunter at 3 eggs', async () => {
      // Arrange
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          { egg_id: EasterEggIds.KONAMI, discovered_at: new Date().toISOString(), shared: false },
          { egg_id: EasterEggIds.MATRIX, discovered_at: new Date().toISOString(), shared: false },
          { egg_id: EasterEggIds.DISCO, discovered_at: new Date().toISOString(), shared: false },
        ],
        error: null,
      });

      // Act
      const achievements = await achievementService.getUserAchievements();

      // Assert
      const hunter = achievements.find((a) => a.type === AchievementTypes.EASTER_EGG_HUNTER);
      expect(hunter?.unlocked).toBe(true);
    });

    it('should unlock easter egg master at 5 eggs', async () => {
      // Arrange
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          { egg_id: EasterEggIds.KONAMI, discovered_at: new Date().toISOString(), shared: false },
          { egg_id: EasterEggIds.MATRIX, discovered_at: new Date().toISOString(), shared: false },
          { egg_id: EasterEggIds.DISCO, discovered_at: new Date().toISOString(), shared: false },
          { egg_id: EasterEggIds.DEVMODE, discovered_at: new Date().toISOString(), shared: false },
          { egg_id: EasterEggIds.GRAVITY, discovered_at: new Date().toISOString(), shared: false },
        ],
        error: null,
      });

      // Act
      const achievements = await achievementService.getUserAchievements();

      // Assert
      const master = achievements.find((a) => a.type === AchievementTypes.EASTER_EGG_MASTER);
      expect(master?.unlocked).toBe(true);
    });

    it('should unlock speed runner when all eggs found in under 5 minutes', async () => {
      // Arrange
      const now = new Date();
      const fourMinutesAgo = new Date(now.getTime() - 4 * 60 * 1000);
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          {
            egg_id: EasterEggIds.KONAMI,
            discovered_at: fourMinutesAgo.toISOString(),
            shared: false,
          },
          {
            egg_id: EasterEggIds.MATRIX,
            discovered_at: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),
            shared: false,
          },
          {
            egg_id: EasterEggIds.DISCO,
            discovered_at: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
            shared: false,
          },
          {
            egg_id: EasterEggIds.DEVMODE,
            discovered_at: new Date(now.getTime() - 1 * 60 * 1000).toISOString(),
            shared: false,
          },
          { egg_id: EasterEggIds.GRAVITY, discovered_at: now.toISOString(), shared: false },
        ],
        error: null,
      });

      // Act
      const achievements = await achievementService.getUserAchievements();

      // Assert
      const speedRunner = achievements.find((a) => a.type === AchievementTypes.SPEED_RUNNER);
      expect(speedRunner?.unlocked).toBe(true);
    });

    it('should not unlock speed runner when eggs found over 5 minutes', async () => {
      // Arrange
      const now = new Date();
      const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000);
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          {
            egg_id: EasterEggIds.KONAMI,
            discovered_at: sixMinutesAgo.toISOString(),
            shared: false,
          },
          {
            egg_id: EasterEggIds.MATRIX,
            discovered_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
            shared: false,
          },
          {
            egg_id: EasterEggIds.DISCO,
            discovered_at: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),
            shared: false,
          },
          {
            egg_id: EasterEggIds.DEVMODE,
            discovered_at: new Date(now.getTime() - 1 * 60 * 1000).toISOString(),
            shared: false,
          },
          { egg_id: EasterEggIds.GRAVITY, discovered_at: now.toISOString(), shared: false },
        ],
        error: null,
      });

      // Act
      const achievements = await achievementService.getUserAchievements();

      // Assert
      const speedRunner = achievements.find((a) => a.type === AchievementTypes.SPEED_RUNNER);
      expect(speedRunner?.unlocked).toBe(false);
    });

    it('should unlock social butterfly when egg shared', async () => {
      // Arrange
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          { egg_id: EasterEggIds.KONAMI, discovered_at: new Date().toISOString(), shared: true },
          { egg_id: EasterEggIds.MATRIX, discovered_at: new Date().toISOString(), shared: false },
        ],
        error: null,
      });

      // Act
      const achievements = await achievementService.getUserAchievements();

      // Assert
      const socialButterfly = achievements.find(
        (a) => a.type === AchievementTypes.SOCIAL_BUTTERFLY
      );
      expect(socialButterfly?.unlocked).toBe(true);
    });

    it('should handle database error gracefully', async () => {
      // Arrange
      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      // Act
      const achievements = await achievementService.getUserAchievements();

      // Assert
      expect(achievements).toHaveLength(5);
      expect(achievements.every((a) => !a.unlocked)).toBe(true);
      expect(console.error).toHaveBeenCalledWith('Failed to get achievements:', expect.any(Object));
    });
  });

  describe('getLeaderboard', () => {
    it('should fetch and format leaderboard entries', async () => {
      // Arrange
      const mockData = [
        {
          user_id: 'user-1',
          email: 'user1@example.com',
          eggs_discovered: 5,
          first_discovery: new Date('2025-01-01').toISOString(),
          last_discovery: new Date('2025-01-05').toISOString(),
          discovery_duration: '300000',
          total_activations: 15,
          eggs_shared: 2,
        },
        {
          user_id: 'user-2',
          email: 'user2@example.com',
          eggs_discovered: 3,
          first_discovery: new Date('2025-01-10').toISOString(),
          last_discovery: new Date('2025-01-15').toISOString(),
          discovery_duration: '180000',
          total_activations: 8,
          eggs_shared: 0,
        },
      ];
      mockSupabase.limit.mockResolvedValueOnce({ data: mockData, error: null });

      // Act
      const leaderboard = await achievementService.getLeaderboard(10);

      // Assert
      expect(leaderboard).toHaveLength(2);
      expect(leaderboard[0]).toEqual({
        userId: 'user-1',
        email: 'user1@example.com',
        eggsDiscovered: 5,
        firstDiscovery: new Date('2025-01-01'),
        lastDiscovery: new Date('2025-01-05'),
        discoveryDuration: 300000,
        totalActivations: 15,
        eggsShared: 2,
      });
      expect(mockSupabase.order).toHaveBeenCalledWith('eggs_discovered', { ascending: false });
      expect(mockSupabase.order).toHaveBeenCalledWith('discovery_duration', { ascending: true });
      expect(mockSupabase.limit).toHaveBeenCalledWith(10);
    });

    it('should use default limit of 100', async () => {
      // Arrange
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });

      // Act
      await achievementService.getLeaderboard();

      // Assert
      expect(mockSupabase.limit).toHaveBeenCalledWith(100);
    });

    it('should handle database error gracefully', async () => {
      // Arrange
      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      // Act
      const leaderboard = await achievementService.getLeaderboard();

      // Assert
      expect(leaderboard).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Failed to get leaderboard:', expect.any(Object));
    });

    it('should handle entries with null optional fields', async () => {
      // Arrange
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          {
            user_id: 'user-3',
            email: null,
            eggs_discovered: 1,
            first_discovery: null,
            last_discovery: null,
            discovery_duration: null,
            total_activations: 1,
            eggs_shared: 0,
          },
        ],
        error: null,
      });

      // Act
      const leaderboard = await achievementService.getLeaderboard();

      // Assert
      expect(leaderboard[0]).toEqual({
        userId: 'user-3',
        email: null,
        eggsDiscovered: 1,
        firstDiscovery: undefined,
        lastDiscovery: undefined,
        discoveryDuration: undefined,
        totalActivations: 1,
        eggsShared: 0,
      });
    });
  });

  describe('hasDiscovered', () => {
    it('should return true for discovered egg', () => {
      // Arrange
      (achievementService as any).discoveredEggs.add(EasterEggIds.KONAMI);

      // Act
      const result = achievementService.hasDiscovered(EasterEggIds.KONAMI);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for undiscovered egg', () => {
      // Act
      const result = achievementService.hasDiscovered(EasterEggIds.MATRIX);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getDiscoveredCount', () => {
    it('should return correct count', () => {
      // Arrange
      (achievementService as any).discoveredEggs.add(EasterEggIds.KONAMI);
      (achievementService as any).discoveredEggs.add(EasterEggIds.MATRIX);
      (achievementService as any).discoveredEggs.add(EasterEggIds.DISCO);

      // Act
      const count = achievementService.getDiscoveredCount();

      // Assert
      expect(count).toBe(3);
    });

    it('should return 0 when no eggs discovered', () => {
      // Act
      const count = achievementService.getDiscoveredCount();

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('shouldShowHints', () => {
    it('should return false if all eggs discovered', () => {
      // Arrange
      (achievementService as any).discoveredEggs = new Set([
        EasterEggIds.KONAMI,
        EasterEggIds.MATRIX,
        EasterEggIds.DISCO,
        EasterEggIds.DEVMODE,
        EasterEggIds.GRAVITY,
      ]);

      // Act
      const result = achievementService.shouldShowHints();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false if hints shown recently (within 7 days)', () => {
      // Arrange
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      localStorageMock['lastEasterEggHint'] = threeDaysAgo.toString();

      // Act
      const result = achievementService.shouldShowHints();

      // Assert
      expect(result).toBe(false);
    });

    it('should return true after 30 days with no discoveries', () => {
      // Arrange
      const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
      localStorageMock['accountCreatedAt'] = thirtyOneDaysAgo.toString();

      // Act
      const result = achievementService.shouldShowHints();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false before 30 days even with no discoveries', () => {
      // Arrange
      const twentyDaysAgo = Date.now() - 20 * 24 * 60 * 60 * 1000;
      localStorageMock['accountCreatedAt'] = twentyDaysAgo.toString();

      // Act
      const result = achievementService.shouldShowHints();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when window is undefined (SSR)', () => {
      // Arrange
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR behavior by deleting window object
      delete global.window;

      // Act
      const result = achievementService.shouldShowHints();

      // Assert
      expect(result).toBe(false);

      // Restore
      global.window = originalWindow;
    });
  });

  describe('markHintsShown', () => {
    it('should store current timestamp', () => {
      // Arrange
      const beforeTime = Date.now();
      const setItemSpy = jest.spyOn(global.localStorage, 'setItem');

      // Act
      achievementService.markHintsShown();

      // Assert
      expect(setItemSpy).toHaveBeenCalledWith('lastEasterEggHint', expect.any(String));
      const calls = setItemSpy.mock.calls;
      const storedTime = parseInt(calls[calls.length - 1][1]);
      expect(storedTime).toBeGreaterThanOrEqual(beforeTime);
      expect(storedTime).toBeLessThanOrEqual(Date.now());
    });

    it('should do nothing when window is undefined (SSR)', () => {
      // Arrange
      const originalWindow = global.window;
      const setItemSpy = jest.spyOn(global.localStorage, 'setItem');
      setItemSpy.mockClear();
      // @ts-expect-error - Testing SSR behavior by deleting window object
      delete global.window;

      // Act
      achievementService.markHintsShown();

      // Assert
      expect(setItemSpy).not.toHaveBeenCalled();

      // Restore
      global.window = originalWindow;
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple rapid activations', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      // Act
      await Promise.all([
        achievementService.recordActivation(EasterEggIds.KONAMI),
        achievementService.recordActivation(EasterEggIds.MATRIX),
        achievementService.recordActivation(EasterEggIds.DISCO),
      ]);

      // Assert
      expect(achievementService.getDiscoveredCount()).toBe(3);
    });

    it('should handle activation followed immediately by deactivation', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      // Act
      await achievementService.recordActivation(EasterEggIds.GRAVITY);
      await achievementService.recordDeactivation(EasterEggIds.GRAVITY);

      // Assert
      expect(achievementService.hasDiscovered(EasterEggIds.GRAVITY)).toBe(true);
      expect((achievementService as any).activationStartTimes.has(EasterEggIds.GRAVITY)).toBe(
        false
      );
    });

    it('should persist discoveries across init calls', () => {
      // Arrange
      localStorageMock['discoveredEasterEggs'] = JSON.stringify([EasterEggIds.KONAMI]);

      // Act
      achievementService.init();
      const count1 = achievementService.getDiscoveredCount();
      achievementService.init();
      const count2 = achievementService.getDiscoveredCount();

      // Assert
      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });
  });
});
