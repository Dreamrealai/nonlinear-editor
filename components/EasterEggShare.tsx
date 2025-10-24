/**
 * Easter Egg Share Component
 *
 * Social sharing buttons that appear after activating an easter egg.
 * Allows users to share their discovery on social media.
 */
'use client';

import React, {  useState, useEffect  } from 'react';
import { achievementService, EasterEggIds, type EasterEggId } from '@/lib/services/achievementService';
import toast from 'react-hot-toast';

interface ShareButtonProps {
  eggId: EasterEggId;
  eggName: string;
}

const SHARE_MESSAGES: Record<EasterEggId, string> = {
  [EasterEggIds.KONAMI]: 'I just unlocked the Konami Code easter egg! 🎮🌈',
  [EasterEggIds.DEVMODE]: 'I just discovered Developer Mode! 👨‍💻',
  [EasterEggIds.MATRIX]: 'I just entered the Matrix! 🕶️💚',
  [EasterEggIds.DISCO]: 'I just activated Disco Mode! 🕺✨',
  [EasterEggIds.GRAVITY]: 'I just reversed gravity! 🌍🎪',
};

/**
 * Share button for individual easter egg
 */
export function EasterEggShareButton({ eggId, eggName }: ShareButtonProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShared, setHasShared] = useState(false);

  useEffect((): () => void => {
    // Show share button briefly after activation
    const timer = setTimeout((): void => {
      setIsVisible(true);
    }, 1000);

    // Auto-hide after 10 seconds
    const hideTimer = setTimeout((): void => {
      setIsVisible(false);
    }, 11000);

    return (): void => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleShare = async (platform: 'twitter' | 'facebook' | 'copy'): Promise<void> => {
    const message = SHARE_MESSAGES[eggId];
    const url = window.location.origin;
    const hashtags = ['EasterEgg', 'Hidden', 'Secret'];

    if (platform === 'twitter') {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        message
      )}&url=${encodeURIComponent(url)}&hashtags=${hashtags.join(',')}`;
      window.open(twitterUrl, '_blank', 'width=550,height=420');
    } else if (platform === 'facebook') {
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}&quote=${encodeURIComponent(message)}`;
      window.open(facebookUrl, '_blank', 'width=550,height=420');
    } else if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(`${message} ${url}`);
        toast.success('Copied to clipboard!', { icon: '📋' });
      } catch (error) {
        toast.error('Failed to copy');
      }
    }

    // Record share
    if (!hasShared) {
      await achievementService.recordShare(eggId);
      setHasShared(true);
    }

    // Hide button after sharing
    setTimeout((): void => {
      setIsVisible(false);
    }, 500);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up rounded-lg bg-white p-4 shadow-2xl dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎉</span>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              Share your discovery!
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {eggName}
            </div>
          </div>
        </div>
        <button
          onClick={(): void => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

      <div className="flex gap-2">
        <button
          onClick={(): Promise<void> => handleShare('twitter')}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
          </svg>
          Tweet
        </button>

        <button
          onClick={(): Promise<void> => handleShare('facebook')}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Share
        </button>

        <button
          onClick={(): Promise<void> => handleShare('copy')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Copy link"
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
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to manage easter egg share buttons
 */
export function useEasterEggShare(eggId: EasterEggId | null): { showShare: boolean; currentEgg: EasterEggId | null; onClose: () => void; } {
  const [showShare, setShowShare] = useState(false);
  const [currentEgg, setCurrentEgg] = useState<EasterEggId | null>(null);

  useEffect((): void => {
    if (eggId) {
      setCurrentEgg(eggId);
      setShowShare(true);
    }
  }, [eggId]);

  const handleClose = (): void => {
    setShowShare(false);
    setCurrentEgg(null);
  };

  return {
    showShare,
    currentEgg,
    onClose: handleClose,
  };
}

/**
 * Share All Achievement Button
 *
 * Special share button that appears when user discovers all 5 eggs.
 */
export function ShareAllAchievementButton(): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(false);

  useEffect((): void => {
    // Check if user discovered all eggs
    const discoveredCount = achievementService.getDiscoveredCount();
    if (discoveredCount === 5) {
      // Check if already shared
      const hasSharedAll = localStorage.getItem('sharedAllEasterEggs');
      if (!hasSharedAll) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleShare = async (): Promise<void> => {
    const message = 'I just discovered all 5 hidden easter eggs! 🏆🎉';
    const url = window.location.origin;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      message
    )}&url=${encodeURIComponent(url)}&hashtags=EasterEggMaster`;

    window.open(twitterUrl, '_blank', 'width=550,height=420');

    // Mark as shared
    localStorage.setItem('sharedAllEasterEggs', 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 animate-bounce">
      <button
        onClick={handleShare}
        className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
      >
        🏆 Share Master Achievement!
      </button>
    </div>
  );
}
