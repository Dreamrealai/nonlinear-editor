/**
 * Achievement Service
 *
 * Manages easter egg achievements and user progress tracking.
 * Integrates with database and analytics service.
 */

import { createBrowserSupabaseClient } from '@/lib/supabase';
import { analyticsService, AnalyticsEvents } from './analyticsService';
import toast from 'react-hot-toast';

/**
 * Easter egg IDs
 */
export const EasterEggIds = {
  KONAMI: 'konami',
  DEVMODE: 'devmode',
  MATRIX: 'matrix',
  DISCO: 'disco',
  GRAVITY: 'gravity',
} as const;

export type EasterEggId = (typeof EasterEggIds)[keyof typeof EasterEggIds];

/**
 * Achievement types
 */
export const AchievementTypes = {
  FIRST_EASTER_EGG: 'first_easter_egg',
  EASTER_EGG_HUNTER: 'easter_egg_hunter', // 3 eggs
  EASTER_EGG_MASTER: 'easter_egg_master', // All 5 eggs
  SPEED_RUNNER: 'speed_runner', // All eggs in under 5 minutes
  SOCIAL_BUTTERFLY: 'social_butterfly', // Shared an easter egg
} as const;

export type AchievementType = (typeof AchievementTypes)[keyof typeof AchievementTypes];

/**
 * Achievement data
 */
export interface Achievement {
  type: AchievementType;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

/**
 * Easter egg achievement record
 */
export interface EasterEggAchievement {
  id: string;
  userId: string;
  eggId: EasterEggId;
  discoveredAt: Date;
  activationCount: number;
  totalDurationMs: number;
  lastActivatedAt?: Date;
  shared: boolean;
  sharedAt?: Date;
}

/**
 * Activation result from database function
 */
interface ActivationResult {
  egg_id: EasterEggId;
  is_new_discovery: boolean;
  total_discovered: number;
  achievement_unlocked: AchievementType | null;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  userId: string;
  email?: string;
  eggsDiscovered: number;
  firstDiscovery?: Date;
  lastDiscovery?: Date;
  discoveryDuration?: number; // milliseconds
  totalActivations: number;
  eggsShared: number;
}

/**
 * Database row type for easter egg achievements
 */
interface EasterEggRow {
  id: string;
  user_id: string;
  egg_id: EasterEggId;
  discovered_at: string;
  activation_count: number;
  total_duration_ms: number;
  last_activated_at?: string;
  shared: boolean;
  shared_at?: string;
}

/**
 * Database row type for leaderboard
 */
interface LeaderboardRow {
  user_id: string;
  email?: string;
  eggs_discovered: number;
  first_discovery?: string;
  last_discovery?: string;
  discovery_duration?: string | number;
  total_activations: number;
  eggs_shared: number;
}

/**
 * Achievement Service
 *
 * Handles easter egg discovery, achievements, and leaderboard.
 */
class AchievementService {
  private supabase = createBrowserSupabaseClient();
  private discoveredEggs = new Set<EasterEggId>();
  private activationStartTimes = new Map<EasterEggId, number>();

  /**
   * Initialize service and load user's discovered eggs from localStorage
   */
  init(): void {
    if (typeof window === 'undefined') return;

    // Load discovered eggs from localStorage
    const stored = localStorage.getItem('discoveredEasterEggs');
    if (stored) {
      try {
        const eggs = JSON.parse(stored) as EasterEggId[];
        eggs.forEach((egg): Set<EasterEggId> => this.discoveredEggs.add(egg));
      } catch (error) {
        console.error('Failed to load discovered eggs:', error);
      }
    }
  }

  /**
   * Record easter egg activation
   *
   * @param eggId - Easter egg ID
   * @returns Achievement result if any
   */
  async recordActivation(eggId: EasterEggId): Promise<AchievementType | null> {
    const isFirstDiscovery = !this.discoveredEggs.has(eggId);

    // Store in localStorage
    this.discoveredEggs.add(eggId);
    localStorage.setItem('discoveredEasterEggs', JSON.stringify([...this.discoveredEggs]));

    // Track activation start time
    this.activationStartTimes.set(eggId, Date.now());

    // Track analytics
    analyticsService.track(AnalyticsEvents.EASTER_EGG_ACTIVATED, {
      egg_id: eggId,
      is_first_discovery: isFirstDiscovery,
      total_discovered: this.discoveredEggs.size,
    });

    if (isFirstDiscovery) {
      analyticsService.track(AnalyticsEvents.EASTER_EGG_DISCOVERED, {
        egg_id: eggId,
        discovery_order: this.discoveredEggs.size,
      });
    }

    // Record in database (if authenticated)
    try {
      const { data, error } = await this.supabase.rpc('record_easter_egg_activation', {
        p_egg_id: eggId,
        p_duration_ms: 0,
      });

      if (error) throw error;

      const result = data as ActivationResult;

      // Show achievement notification if unlocked
      if (result.achievement_unlocked) {
        this.showAchievementNotification(result.achievement_unlocked);

        // Track achievement unlock
        analyticsService.track(AnalyticsEvents.EASTER_EGG_ACHIEVEMENT_UNLOCKED, {
          achievement: result.achievement_unlocked,
          total_discovered: result.total_discovered,
        });
      }

      return result.achievement_unlocked;
    } catch (error) {
      // Silently fail if not authenticated or database error
      console.error('Failed to record activation:', error);
      return null;
    }
  }

  /**
   * Record easter egg deactivation and duration
   *
   * @param eggId - Easter egg ID
   */
  async recordDeactivation(eggId: EasterEggId): Promise<void> {
    const startTime = this.activationStartTimes.get(eggId);
    if (!startTime) return;

    const duration = Date.now() - startTime;
    this.activationStartTimes.delete(eggId);

    // Track analytics
    analyticsService.track(AnalyticsEvents.EASTER_EGG_DEACTIVATED, {
      egg_id: eggId,
      duration_ms: duration,
    });

    // Update database with duration
    try {
      await this.supabase.rpc('record_easter_egg_activation', {
        p_egg_id: eggId,
        p_duration_ms: duration,
      });
    } catch (error) {
      console.error('Failed to record deactivation:', error);
    }
  }

  /**
   * Record easter egg share
   *
   * @param eggId - Easter egg ID
   */
  async recordShare(eggId: EasterEggId): Promise<void> {
    // Track analytics
    analyticsService.track(AnalyticsEvents.EASTER_EGG_SHARED, {
      egg_id: eggId,
    });

    // Record in database
    try {
      const { error } = await this.supabase.rpc('record_easter_egg_share', {
        p_egg_id: eggId,
      });

      if (error) throw error;

      toast.success('Shared on social media!', {
        icon: '🎉',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to record share:', error);
    }
  }

  /**
   * Submit user feedback on easter eggs
   *
   * @param rating - Rating from 1-5
   * @param favoriteEgg - User's favorite egg (optional)
   * @param suggestions - User suggestions (optional)
   */
  async submitFeedback(
    rating: number,
    favoriteEgg?: EasterEggId | 'none',
    suggestions?: string
  ): Promise<boolean> {
    // Track analytics
    analyticsService.track(AnalyticsEvents.EASTER_EGG_FEEDBACK_SUBMITTED, {
      rating,
      favorite_egg: favoriteEgg,
      has_suggestions: Boolean(suggestions),
    });

    // Submit to database
    try {
      const { error } = await this.supabase.rpc('submit_easter_egg_feedback', {
        p_rating: rating,
        p_favorite_egg: favoriteEgg || null,
        p_suggestions: suggestions || null,
      });

      if (error) throw error;

      toast.success('Thank you for your feedback!', {
        icon: '❤️',
        duration: 3000,
      });

      return true;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
      return false;
    }
  }

  /**
   * Get user's achievements
   *
   * @returns Array of achievements with unlock status
   */
  async getUserAchievements(): Promise<Achievement[]> {
    const achievements: Achievement[] = [
      {
        type: AchievementTypes.FIRST_EASTER_EGG,
        title: 'First Discovery',
        description: 'Discovered your first easter egg',
        icon: '🥚',
        unlocked: false,
      },
      {
        type: AchievementTypes.EASTER_EGG_HUNTER,
        title: 'Easter Egg Hunter',
        description: 'Discovered 3 easter eggs',
        icon: '🕵️',
        unlocked: false,
      },
      {
        type: AchievementTypes.EASTER_EGG_MASTER,
        title: 'Easter Egg Master',
        description: 'Discovered all 5 easter eggs',
        icon: '🏆',
        unlocked: false,
      },
      {
        type: AchievementTypes.SPEED_RUNNER,
        title: 'Speed Runner',
        description: 'Discovered all eggs in under 5 minutes',
        icon: '⚡',
        unlocked: false,
      },
      {
        type: AchievementTypes.SOCIAL_BUTTERFLY,
        title: 'Social Butterfly',
        description: 'Shared an easter egg on social media',
        icon: '🦋',
        unlocked: false,
      },
    ];

    try {
      // Get user's discovered eggs
      const { data: eggData, error: eggError } = await this.supabase
        .from('easter_egg_achievements')
        .select('*');

      if (eggError) throw eggError;

      const discoveredCount = eggData?.length || 0;
      const hasShared = eggData?.some((egg: EasterEggRow) => egg.shared) || false;

      // Calculate speed runner achievement
      let isSpeedRunner = false;
      if (discoveredCount === 5 && eggData) {
        const firstDiscovery = new Date(
          Math.min(...eggData.map((e: EasterEggRow): number => new Date(e.discovered_at).getTime()))
        );
        const lastDiscovery = new Date(
          Math.max(...eggData.map((e: EasterEggRow): number => new Date(e.discovered_at).getTime()))
        );
        const durationMinutes = (lastDiscovery.getTime() - firstDiscovery.getTime()) / 1000 / 60;
        isSpeedRunner = durationMinutes < 5;
      }

      // Update achievement unlock status
      if (discoveredCount >= 1 && achievements[0]) {
        achievements[0].unlocked = true;
      }
      if (discoveredCount >= 3 && achievements[1]) {
        achievements[1].unlocked = true;
      }
      if (discoveredCount >= 5 && achievements[2]) {
        achievements[2].unlocked = true;
      }
      if (isSpeedRunner && achievements[3]) {
        achievements[3].unlocked = true;
      }
      if (hasShared && achievements[4]) {
        achievements[4].unlocked = true;
      }

      return achievements;
    } catch (error) {
      console.error('Failed to get achievements:', error);
      return achievements;
    }
  }

  /**
   * Get leaderboard entries
   *
   * @param limit - Maximum number of entries to return
   * @returns Array of leaderboard entries
   */
  async getLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('easter_egg_leaderboard')
        .select('*')
        .order('eggs_discovered', { ascending: false })
        .order('discovery_duration', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (
        data?.map((entry: LeaderboardRow): LeaderboardEntry => {
          // Safely parse discovery duration with NaN validation
          let discoveryDuration: number | undefined = undefined;
          if (entry.discovery_duration) {
            const parsed = parseInt(String(entry.discovery_duration), 10);
            discoveryDuration = isNaN(parsed) ? undefined : parsed;
          }

          return {
            userId: entry.user_id,
            email: entry.email,
            eggsDiscovered: entry.eggs_discovered,
            firstDiscovery: entry.first_discovery ? new Date(entry.first_discovery) : undefined,
            lastDiscovery: entry.last_discovery ? new Date(entry.last_discovery) : undefined,
            discoveryDuration,
            totalActivations: entry.total_activations,
            eggsShared: entry.eggs_shared,
          };
        }) || []
      );
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return [];
    }
  }

  /**
   * Check if user has discovered an egg
   *
   * @param eggId - Easter egg ID
   * @returns True if discovered
   */
  hasDiscovered(eggId: EasterEggId): boolean {
    return this.discoveredEggs.has(eggId);
  }

  /**
   * Get number of eggs discovered
   *
   * @returns Number of discovered eggs
   */
  getDiscoveredCount(): number {
    return this.discoveredEggs.size;
  }

  /**
   * Check if user should see hints (after 30 days or low discovery rate)
   *
   * @returns True if hints should be shown
   */
  shouldShowHints(): boolean {
    if (typeof window === 'undefined') return false;

    // Check if user has discovered all eggs
    if (this.discoveredEggs.size === 5) return false;

    // Check last hint timestamp
    const lastHintShown = localStorage.getItem('lastEasterEggHint');
    if (lastHintShown) {
      const parsedTimestamp = parseInt(lastHintShown, 10);
      if (isNaN(parsedTimestamp)) {
        // Invalid timestamp in localStorage, clear it
        localStorage.removeItem('lastEasterEggHint');
      } else {
        const daysSinceLastHint = (Date.now() - parsedTimestamp) / 1000 / 60 / 60 / 24;
        if (daysSinceLastHint < 7) return false; // Show hints max once per week
      }
    }

    // Check account age (show after 30 days if no discoveries)
    const accountCreated = localStorage.getItem('accountCreatedAt');
    if (accountCreated) {
      const daysSinceCreation = (Date.now() - parseInt(accountCreated)) / 1000 / 60 / 60 / 24;
      if (daysSinceCreation >= 30 && this.discoveredEggs.size === 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Mark hints as shown
   */
  markHintsShown(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('lastEasterEggHint', Date.now().toString());
  }

  /**
   * Show achievement notification
   *
   * @param achievement - Achievement type unlocked
   */
  private showAchievementNotification(achievement: AchievementType): void {
    const messages: Record<AchievementType, { title: string; icon: string }> = {
      [AchievementTypes.FIRST_EASTER_EGG]: {
        title: 'Achievement Unlocked: First Discovery!',
        icon: '🥚',
      },
      [AchievementTypes.EASTER_EGG_HUNTER]: {
        title: 'Achievement Unlocked: Easter Egg Hunter!',
        icon: '🕵️',
      },
      [AchievementTypes.EASTER_EGG_MASTER]: {
        title: 'Achievement Unlocked: Easter Egg Master!',
        icon: '🏆',
      },
      [AchievementTypes.SPEED_RUNNER]: {
        title: 'Achievement Unlocked: Speed Runner!',
        icon: '⚡',
      },
      [AchievementTypes.SOCIAL_BUTTERFLY]: {
        title: 'Achievement Unlocked: Social Butterfly!',
        icon: '🦋',
      },
    };

    const message = messages[achievement];
    if (message) {
      toast.success(message.title, {
        duration: 5000,
        icon: message.icon,
      });
    }
  }
}

/**
 * Singleton achievement service instance
 */
export const achievementService = new AchievementService();
