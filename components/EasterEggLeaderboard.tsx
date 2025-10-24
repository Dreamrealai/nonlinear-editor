/**
 * Easter Egg Leaderboard Component
 *
 * Displays users who discovered all easter eggs.
 * Shows fastest discovery times and engagement stats.
 */
'use client';

import React, {  useState, useEffect  } from 'react';
import { achievementService, type LeaderboardEntry } from '@/lib/services/achievementService';

interface EasterEggLeaderboardProps {
  /** Maximum number of entries to display */
  limit?: number;
}

/**
 * Easter Egg Leaderboard
 *
 * Shows top users who discovered easter eggs.
 */
export function EasterEggLeaderboard({ limit = 50 }: EasterEggLeaderboardProps): React.ReactElement {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect((): void => {
    loadLeaderboard();
  }, [limit]);

  const loadLeaderboard = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await achievementService.getLeaderboard(limit);
      setEntries(data);
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Leaderboard error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Easter Egg Leaderboard
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Easter Egg Leaderboard
        </h3>
        <div className="text-center text-red-600 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Easter Egg Leaderboard
        </h3>
        <div className="text-center text-gray-600 dark:text-gray-400">
          <div className="mb-2 text-4xl">🥚</div>
          <p>Be the first to discover all 5 easter eggs!</p>
        </div>
      </div>
    );
  }

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 p-6 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Easter Egg Leaderboard
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Top users who discovered all 5 easter eggs
        </p>
      </div>

      {/* Leaderboard entries */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {entries.map((entry, index): React.ReactElement => {
          const rank = index + 1;
          const isMaster = entry.eggsDiscovered === 5;

          return (
            <div
              key={entry.userId}
              className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              {/* Rank and user info */}
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center text-lg font-bold">
                  {getMedalEmoji(rank)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {entry.email?.split('@')[0] || 'Anonymous'}
                    </span>
                    {isMaster && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Master
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      {entry.eggsDiscovered}/5 eggs
                    </span>
                    {entry.discoveryDuration && (
                      <span>
                        {formatDuration(entry.discoveryDuration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {entry.totalActivations}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    activations
                  </div>
                </div>
                {entry.eggsShared > 0 && (
                  <div className="text-center">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {entry.eggsShared}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      shared
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 text-center dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {entries.length} {entries.length === 1 ? 'player' : 'players'} on the leaderboard
        </p>
      </div>
    </div>
  );
}

/**
 * Compact Easter Egg Stats
 *
 * Shows user's own achievements in a compact format.
 */
export function EasterEggStats(): React.ReactElement | null {
  const [stats, setStats] = useState({
    discovered: 0,
    total: 5,
    achievements: [] as any[],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect((): void => {
    loadStats();
  }, []);

  const loadStats = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const discovered = achievementService.getDiscoveredCount();
      const achievements = await achievementService.getUserAchievements();

      setStats({
        discovered,
        total: 5,
        achievements: achievements.filter((a): boolean => a.unlocked),
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  const progress = (stats.discovered / stats.total) * 100;

  return (
    <div className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium opacity-90">Easter Eggs</div>
          <div className="mt-1 text-2xl font-bold">
            {stats.discovered}/{stats.total}
          </div>
        </div>
        <div className="text-4xl">
          {stats.discovered === 5 ? '🏆' : '🥚'}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full bg-white transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Achievements */}
      {stats.achievements.length > 0 && (
        <div className="mt-3 flex gap-1">
          {stats.achievements.map((achievement): React.ReactElement => (
            <span key={achievement.type} title={achievement.title}>
              {achievement.icon}
            </span>
          ))}
        </div>
      )}

      {/* Call to action */}
      {stats.discovered < 5 && (
        <p className="mt-2 text-xs opacity-75">
          {5 - stats.discovered} more to discover!
        </p>
      )}
    </div>
  );
}
