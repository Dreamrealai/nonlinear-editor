/**
 * User Onboarding Component
 *
 * Interactive guided tour for first-time users.
 * Highlights key features and provides step-by-step instructions.
 *
 * Features:
 * - First-time user detection via localStorage
 * - Interactive step-by-step tour
 * - Skip option
 * - Progress tracking
 * - Responsive positioning
 * - Keyboard navigation (arrow keys, Escape)
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void; // Optional action to perform when step is shown
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the Video Editor!',
    description:
      "Let's take a quick tour of the key features. You can skip this anytime or use arrow keys to navigate.",
    target: 'body',
    position: 'bottom',
  },
  {
    id: 'asset-panel',
    title: 'Asset Library',
    description:
      'Upload and manage your video clips, images, and audio files here. Drag and drop files or click to browse.',
    target: '[aria-label="Asset panel"]',
    position: 'right',
  },
  {
    id: 'timeline',
    title: 'Timeline',
    description:
      'This is where you arrange your clips. Drag clips from the asset panel to the timeline, trim them, and create your video.',
    target: '[aria-label="Timeline workspace"]',
    position: 'top',
  },
  {
    id: 'playback',
    title: 'Preview & Playback',
    description:
      'Watch your video preview here. Use the playback controls to play, pause, and scrub through your timeline.',
    target: '[aria-label="Video preview canvas"]',
    position: 'left',
  },
  {
    id: 'controls',
    title: 'Timeline Controls',
    description:
      'Zoom in/out, undo/redo, split clips, and access advanced features. Press "?" anytime to see keyboard shortcuts.',
    target: '[title="Zoom in (Cmd+=)"]',
    position: 'bottom',
  },
  {
    id: 'grid-settings',
    title: 'Grid & Snap',
    description:
      'Customize your grid intervals for precise editing. Use Cmd+Shift+S to quickly toggle snap on/off.',
    target: '.grid-settings-button',
    position: 'bottom',
  },
  {
    id: 'complete',
    title: "You're Ready!",
    description:
      'That\'s it! You\'re ready to create amazing videos. Remember, you can press "?" anytime to see keyboard shortcuts. Happy editing!',
    target: 'body',
    position: 'bottom',
  },
];

type UserOnboardingProps = {
  /** Force show onboarding (for testing) */
  forceShow?: boolean;
  /** Callback when onboarding is completed */
  onComplete?: () => void;
};

export function UserOnboarding({
  forceShow = false,
  onComplete,
}: UserOnboardingProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightPosition, setHighlightPosition] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  // const highlightRef = useRef<HTMLDivElement>(null); // TODO: Implement spotlight highlighting
  const [onboardingStartTime, setOnboardingStartTime] = useState<number | null>(null);
  const [stepStartTime, setStepStartTime] = useState<number | null>(null);

  // Check if user has completed onboarding
  useEffect((): void => {
    if (typeof window === 'undefined') return;

    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed');
    if (!hasCompletedOnboarding || forceShow) {
      // Delay showing onboarding slightly for better UX
      setTimeout((): void => {
        setIsVisible(true);
        const startTime = Date.now();
        setOnboardingStartTime(startTime);
        setStepStartTime(startTime);

        // Track onboarding started
        analyticsService.track(AnalyticsEvents.ONBOARDING_STARTED, {
          forced: forceShow,
          timestamp: startTime,
        });
      }, 1000);
    }
  }, [forceShow]);

  // Update highlight and tooltip position when step changes
  useEffect((): void => {
    if (!isVisible) return;

    const step = ONBOARDING_STEPS[currentStep];
    if (!step) return;

    // Track step viewed
    const now = Date.now();
    const timeOnPreviousStep = stepStartTime ? now - stepStartTime : 0;
    setStepStartTime(now);

    analyticsService.track(AnalyticsEvents.ONBOARDING_STEP_VIEWED, {
      step_id: step.id,
      step_number: currentStep + 1,
      step_title: step.title,
      timestamp: now,
      time_on_previous_step_ms: timeOnPreviousStep,
    });

    // Execute step action if defined
    if (step.action) {
      step.action();
    }

    // Find target element
    const targetElement = document.querySelector(step.target);
    if (!targetElement) {
      // If target not found, show tooltip at center
      setHighlightPosition(null);
      setTooltipPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      return;
    }

    // Get element position
    const rect = targetElement.getBoundingClientRect();
    setHighlightPosition(rect);

    // Calculate tooltip position based on preferred position
    const padding = 20;
    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'top':
        top = rect.top - padding;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - padding;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + padding;
        break;
      default:
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2;
    }

    // Ensure tooltip stays within viewport
    const tooltipWidth = 400;
    const tooltipHeight = 200;

    if (left + tooltipWidth / 2 > window.innerWidth) {
      left = window.innerWidth - tooltipWidth / 2 - 20;
    }
    if (left - tooltipWidth / 2 < 0) {
      left = tooltipWidth / 2 + 20;
    }
    if (top + tooltipHeight > window.innerHeight) {
      top = window.innerHeight - tooltipHeight - 20;
    }
    if (top < 0) {
      top = 20;
    }

    setTooltipPosition({ top, left });
  }, [isVisible, currentStep]);

  // Keyboard navigation
  useEffect((): (() => void) | undefined => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, currentStep]);

  const handleNext = useCallback((): void => {
    // Track step completed
    const step = ONBOARDING_STEPS[currentStep];
    if (!step) return;

    const now = Date.now();
    const timeOnStep = stepStartTime ? now - stepStartTime : 0;

    analyticsService.track(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, {
      step_id: step.id,
      step_number: currentStep + 1,
      step_title: step.title,
      time_on_step_ms: timeOnStep,
      timestamp: now,
    });

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, stepStartTime]);

  const handlePrevious = useCallback((): void => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback((): void => {
    const now = Date.now();
    const totalTime = onboardingStartTime ? now - onboardingStartTime : 0;
    const step = ONBOARDING_STEPS[currentStep];

    // Track abandonment
    if (step) {
      analyticsService.track(AnalyticsEvents.ONBOARDING_SKIPPED, {
        abandoned_at_step: currentStep + 1,
        abandoned_at_step_id: step.id,
        abandoned_at_step_title: step.title,
        total_time_ms: totalTime,
        completion_percentage: ((currentStep + 1) / ONBOARDING_STEPS.length) * 100,
        timestamp: now,
      });
    }

    localStorage.setItem('onboarding-completed', 'true');
    setIsVisible(false);
    if (onComplete) {
      onComplete();
    }
  }, [onComplete, currentStep, onboardingStartTime]);

  const handleComplete = useCallback((): void => {
    const now = Date.now();
    const totalTime = onboardingStartTime ? now - onboardingStartTime : 0;

    // Track completion
    analyticsService.track(AnalyticsEvents.ONBOARDING_COMPLETED, {
      total_time_ms: totalTime,
      total_steps: ONBOARDING_STEPS.length,
      timestamp: now,
    });

    localStorage.setItem('onboarding-completed', 'true');
    setIsVisible(false);
    if (onComplete) {
      onComplete();
    }
  }, [onComplete, onboardingStartTime]);

  if (!isVisible) return null;

  const step = ONBOARDING_STEPS[currentStep];
  if (!step) return null; // Safety check for undefined step

  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm" />

      {/* Spotlight highlight */}
      {highlightPosition && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: highlightPosition.top - 8,
            left: highlightPosition.left - 8,
            width: highlightPosition.width + 16,
            height: highlightPosition.height + 16,
            border: '3px solid #3b82f6',
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 30px rgba(59, 130, 246, 0.6)',
            transition: 'all 0.3s ease',
          }}
        />
      )}

      {/* Tooltip card */}
      {tooltipPosition && (
        <div
          className={cn(
            'fixed z-[10000] bg-white dark:bg-neutral-800 rounded-xl shadow-2xl',
            'w-[400px] max-w-[90vw]'
          )}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translate(-50%, 0)',
            transition: 'all 0.3s ease',
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                {step.title}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </p>
            </div>
            <button
              onClick={handleSkip}
              className="rounded-md p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              aria-label="Skip onboarding"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Progress bar */}
          <div className="px-6 pb-3">
            <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 pt-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                currentStep === 0
                  ? 'text-neutral-400 cursor-not-allowed'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex gap-1">
              {ONBOARDING_STEPS.map(
                (stepItem, index): React.ReactElement => (
                  <div
                    key={stepItem.id}
                    className={cn(
                      'h-2 w-2 rounded-full transition-all',
                      index === currentStep
                        ? 'bg-blue-600 w-6'
                        : index < currentStep
                          ? 'bg-blue-400'
                          : 'bg-neutral-300 dark:bg-neutral-600'
                    )}
                  />
                )
              )}
            </div>

            <button
              onClick={isLastStep ? handleComplete : handleNext}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {isLastStep ? (
                <>
                  Get Started
                  <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
