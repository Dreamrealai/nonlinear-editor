/**
 * OnboardingTour Component
 *
 * Interactive guided tour with step-by-step instructions
 * - Highlights target elements
 * - Shows tooltips with instructions
 * - Tracks progress
 * - Allows skip/dismiss
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useOnboarding } from '@/lib/hooks/useOnboarding';
import type { OnboardingTour as OnboardingTourType, OnboardingStep } from '@/types/onboarding';
import { cn } from '@/lib/utils';

interface OnboardingTourProps {
  tour: OnboardingTourType;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingTour({ tour, onComplete, onSkip }: OnboardingTourProps) {
  const {
    state,
    isLoading,
    startTour,
    completeTour,
    skipTour,
    nextStep,
    previousStep,
    hasCompletedTour,
    hasSkippedTour,
  } = useOnboarding();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightPosition, setHighlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const currentStep = tour.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === tour.steps.length - 1;

  // Check if tour should auto-start
  useEffect(() => {
    if (!isLoading && state && tour.autoStart) {
      const completed = hasCompletedTour(tour.id);
      const skipped = hasSkippedTour(tour.id);

      if (!completed && !skipped && tour.showOnce) {
        setIsActive(true);
        startTour(tour.id);
      }
    }
  }, [isLoading, state, tour, hasCompletedTour, hasSkippedTour, startTour]);

  // Sync current step with state
  useEffect(() => {
    if (state?.current_tour_id === tour.id) {
      setCurrentStepIndex(state.current_step_index);
    }
  }, [state, tour.id]);

  // Calculate positions for highlight and tooltip
  const updatePositions = useCallback(() => {
    if (!currentStep || !isActive) return;

    const targetElement = document.querySelector(currentStep.target);
    if (!targetElement) {
      // If target not found, show tooltip in center
      setTooltipPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      setHighlightPosition({ top: 0, left: 0, width: 0, height: 0 });
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    const padding = currentStep.highlightPadding || 8;

    // Set highlight position
    setHighlightPosition({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    // Calculate tooltip position based on placement
    const placement = currentStep.placement || 'bottom';
    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = rect.top - 20;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 20;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 20;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 20;
        break;
    }

    setTooltipPosition({ top, left });
  }, [currentStep, isActive]);

  useEffect(() => {
    updatePositions();

    // Update positions on resize and scroll
    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions);

    return () => {
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions);
    };
  }, [updatePositions]);

  const handleNext = async () => {
    if (isLastStep) {
      await handleComplete();
    } else {
      await nextStep();
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = async () => {
    if (!isFirstStep) {
      await previousStep();
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = async () => {
    await skipTour(tour.id);
    setIsActive(false);
    onSkip?.();
  };

  const handleComplete = async () => {
    await completeTour(tour.id);
    setIsActive(false);
    onComplete?.();
  };

  if (!isActive || !currentStep) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        style={{ pointerEvents: 'none' }}
        aria-hidden="true"
      />

      {/* Highlight */}
      {highlightPosition.width > 0 && (
        <div
          className="fixed z-[9999] pointer-events-none border-2 border-purple-500 rounded-lg shadow-lg"
          style={{
            top: `${highlightPosition.top}px`,
            left: `${highlightPosition.left}px`,
            width: `${highlightPosition.width}px`,
            height: `${highlightPosition.height}px`,
            transition: 'all 0.3s ease-in-out',
          }}
          aria-hidden="true"
        />
      )}

      {/* Tooltip */}
      <div
        className={cn(
          'fixed z-[10000] bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md',
          'border border-purple-200 dark:border-purple-700'
        )}
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          transform: 'translate(-50%, -50%)',
          transition: 'all 0.3s ease-in-out',
        }}
        role="dialog"
        aria-labelledby="tour-step-title"
        aria-describedby="tour-step-description"
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Close tour"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / tour.steps.length) * 100}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {currentStepIndex + 1} / {tour.steps.length}
            </span>
          </div>

          {/* Title */}
          <h3 id="tour-step-title" className="text-lg font-semibold">
            {currentStep.title}
          </h3>

          {/* Description */}
          <p id="tour-step-description" className="text-sm text-muted-foreground">
            {currentStep.description}
          </p>

          {/* Action */}
          {currentStep.action && (
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                {currentStep.action}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip Tour
            </Button>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button variant="outline" size="sm" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}

              <Button variant="default" size="sm" onClick={handleNext}>
                {isLastStep ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
