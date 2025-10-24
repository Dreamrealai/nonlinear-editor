/**
 * Easter Egg Hints Component
 *
 * Provides subtle hints to help users discover hidden easter eggs.
 * Shows after 30 days or based on discovery rate.
 */
'use client';

import React, {  useState, useEffect  } from 'react';
import { achievementService, EasterEggIds, type EasterEggId } from '@/lib/services/achievementService';

interface Hint {
  eggId: EasterEggId;
  title: string;
  hint: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const HINTS: Hint[] = [
  {
    eggId: EasterEggIds.KONAMI,
    title: 'Konami Code',
    hint: 'Try the classic cheat code: ↑↑↓↓←→←→BA',
    difficulty: 'medium',
  },
  {
    eggId: EasterEggIds.DEVMODE,
    title: 'Developer Mode',
    hint: 'Press the D key multiple times quickly...',
    difficulty: 'easy',
  },
  {
    eggId: EasterEggIds.MATRIX,
    title: 'Matrix Mode',
    hint: 'Press M three times. Follow the white rabbit...',
    difficulty: 'easy',
  },
  {
    eggId: EasterEggIds.DISCO,
    title: 'Disco Mode',
    hint: 'Type the word for a party with dancing and lights',
    difficulty: 'medium',
  },
  {
    eggId: EasterEggIds.GRAVITY,
    title: 'Gravity Mode',
    hint: 'Type the force that pulls things down',
    difficulty: 'hard',
  },
];

interface EasterEggHintsProps {
  /** Whether to show hints */
  enabled?: boolean;
}

/**
 * Easter Egg Hints Banner
 *
 * Shows a collapsible hints panel when appropriate.
 */
export function EasterEggHints({ enabled = true }: EasterEggHintsProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableHints, setAvailableHints] = useState<Hint[]>([]);

  useEffect((): void => {
    if (!enabled) return;

    // Check if hints should be shown
    const shouldShow = achievementService.shouldShowHints();

    if (shouldShow) {
      // Filter hints for undiscovered eggs
      const undiscovered = HINTS.filter(
        (hint): boolean => !achievementService.hasDiscovered(hint.eggId)
      );

      if (undiscovered.length > 0) {
        setAvailableHints(undiscovered);
        setIsVisible(true);
      }
    }
  }, [enabled]);

  const handleClose = (): void => {
    setIsVisible(false);
    achievementService.markHintsShown();
  };

  const handleToggle = (): void => {
    setIsExpanded(!isExpanded);
  };

  if (!isVisible || availableHints.length === 0) {
    return null;
  }

  const discoveredCount = achievementService.getDiscoveredCount();
  const remaining = 5 - discoveredCount;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 rounded-lg bg-white shadow-xl dark:bg-gray-800">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between rounded-t-lg bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥚</span>
          <div>
            <div className="font-semibold">Easter Egg Hints</div>
            <div className="text-xs opacity-90">
              {remaining} secret{remaining !== 1 ? 's' : ''} remaining
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggle}
            className="rounded-full p-1 hover:bg-white/20"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`h-5 w-5 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <button
            onClick={(e): void => {
              e.stopPropagation();
              handleClose();
            }}
            className="rounded-full p-1 hover:bg-white/20"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Hints list */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto p-4">
          <div className="space-y-3">
            {availableHints.map((hint): React.ReactElement => (
              <div
                key={hint.eggId}
                className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {hint.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          hint.difficulty === 'easy'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : hint.difficulty === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {hint.difficulty}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {hint.hint}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              These hints will help you discover the remaining easter eggs. Try them
              anywhere on the page!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Easter Egg Progress Indicator
 *
 * Shows a small floating indicator of easter egg progress.
 */
export function EasterEggProgress(): React.ReactElement | null {
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect((): () => void => {
    const updateCount = (): void => {
      setDiscoveredCount(achievementService.getDiscoveredCount());
    };

    updateCount();

    // Update count periodically
    const interval = setInterval(updateCount, 5000);
    return (): void => clearInterval(interval);
  }, []);

  if (discoveredCount === 0) {
    return null;
  }

  const percentage = (discoveredCount / 5) * 100;
  const isComplete = discoveredCount === 5;

  return (
    <div
      className="fixed bottom-4 left-4 z-40"
      onMouseEnter={(): void => setIsHovered(true)}
      onMouseLeave={(): void => setIsHovered(false)}
    >
      <div
        className={`rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-3 shadow-lg transition-all ${
          isHovered ? 'scale-110' : ''
        }`}
      >
        <div className="relative h-8 w-8">
          {/* Progress circle */}
          <svg className="h-8 w-8 -rotate-90 transform">
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="2"
              fill="none"
            />
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 14}`}
              strokeDashoffset={`${2 * Math.PI * 14 * (1 - percentage / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>

          {/* Icon */}
          <div className="absolute inset-0 flex items-center justify-center text-white">
            {isComplete ? '🏆' : '🥚'}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-gray-700">
          {discoveredCount}/5 Easter Eggs
          <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </div>
      )}
    </div>
  );
}
