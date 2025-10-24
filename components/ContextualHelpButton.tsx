/**
 * Contextual Help Button
 *
 * Provides access to help resources and tutorial replay.
 * Can be placed anywhere in the UI to provide contextual assistance.
 *
 * Features:
 * - Help icon with tooltip
 * - Quick access to specific tutorial steps
 * - Full tutorial replay
 * - Keyboard shortcut (Cmd+? / Ctrl+?)
 * - Analytics tracking
 */
'use client';

import React, { useState, useEffect } from 'react';
import { HelpCircle, PlayCircle, BookOpen, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';

type ContextualHelpButtonProps = {
  /** Optional step ID to link to specific tutorial step */
  stepId?: string;
  /** Position of the button */
  position?: 'fixed' | 'inline';
  /** Callback to show full onboarding */
  onShowOnboarding?: () => void;
};

export function ContextualHelpButton({
  stepId,
  position = 'inline',
  onShowOnboarding,
}: ContextualHelpButtonProps): React.JSX.Element {
  const [showMenu, setShowMenu] = useState(false);

  // Keyboard shortcut: Cmd+? or Ctrl+?
  useEffect((): () => void => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Cmd+? on Mac or Ctrl+? on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '/') {
        e.preventDefault();
        setShowMenu((prev): boolean => !prev);

        analyticsService.track(AnalyticsEvents.ONBOARDING_HELP_ACCESSED, {
          method: 'keyboard_shortcut',
          step_id: stepId || null,
          timestamp: Date.now(),
        });
      }

      // Close menu on Escape
      if (e.key === 'Escape' && showMenu) {
        setShowMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, [showMenu, stepId]);

  const handleReplayTutorial = (): void => {
    analyticsService.track(AnalyticsEvents.ONBOARDING_TUTORIAL_REPLAYED, {
      from_step: stepId || null,
      timestamp: Date.now(),
    });

    // Reset onboarding completion
    localStorage.removeItem('onboarding-completed');

    if (onShowOnboarding) {
      onShowOnboarding();
    }

    setShowMenu(false);
  };

  const handleViewShortcuts = (): void => {
    analyticsService.track(AnalyticsEvents.ONBOARDING_HELP_ACCESSED, {
      method: 'keyboard_shortcuts',
      step_id: stepId || null,
      timestamp: Date.now(),
    });

    // Trigger keyboard shortcuts modal (assuming it exists)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    setShowMenu(false);
  };

  const handleViewDocs = (): void => {
    analyticsService.track(AnalyticsEvents.ONBOARDING_HELP_ACCESSED, {
      method: 'documentation',
      step_id: stepId || null,
      timestamp: Date.now(),
    });

    // Open documentation in new tab
    window.open('/docs', '_blank');
    setShowMenu(false);
  };

  const handleButtonClick = (): void => {
    setShowMenu(!showMenu);

    if (!showMenu) {
      analyticsService.track(AnalyticsEvents.ONBOARDING_HELP_ACCESSED, {
        method: 'help_button',
        step_id: stepId || null,
        timestamp: Date.now(),
      });
    }
  };

  return (
    <div className={cn('relative', position === 'fixed' ? 'fixed bottom-6 right-6 z-50' : '')}>
      {/* Help Button */}
      <button
        onClick={handleButtonClick}
        className={cn(
          'flex items-center justify-center rounded-full',
          'bg-blue-600 hover:bg-blue-700 text-white',
          'transition-all duration-200',
          'shadow-lg hover:shadow-xl',
          position === 'fixed' ? 'h-14 w-14' : 'h-9 w-9'
        )}
        aria-label="Help"
        title="Help (Cmd+?)"
      >
        <HelpCircle className={cn(position === 'fixed' ? 'h-6 w-6' : 'h-5 w-5')} />
      </button>

      {/* Help Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[100]" onClick={(): void => setShowMenu(false)} />

          {/* Menu Popup */}
          <div
            className={cn(
              'absolute z-[101] bg-white dark:bg-neutral-800 rounded-lg shadow-2xl',
              'w-64 overflow-hidden',
              position === 'fixed' ? 'bottom-16 right-0' : 'top-full mt-2 right-0'
            )}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Need Help?
              </h3>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {/* Replay Tutorial */}
              <button
                onClick={handleReplayTutorial}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3',
                  'text-left text-sm text-neutral-700 dark:text-neutral-300',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-700',
                  'transition-colors'
                )}
              >
                <PlayCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <div className="font-medium">Replay Tutorial</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    See the tour again
                  </div>
                </div>
              </button>

              {/* Keyboard Shortcuts */}
              <button
                onClick={handleViewShortcuts}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3',
                  'text-left text-sm text-neutral-700 dark:text-neutral-300',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-700',
                  'transition-colors'
                )}
              >
                <Keyboard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <div className="font-medium">Keyboard Shortcuts</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Press ?</div>
                </div>
              </button>

              {/* Documentation */}
              <button
                onClick={handleViewDocs}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3',
                  'text-left text-sm text-neutral-700 dark:text-neutral-300',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-700',
                  'transition-colors'
                )}
              >
                <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <div className="font-medium">Documentation</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Full reference
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                Press <kbd className="px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700">Cmd+?</kbd> anytime
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
