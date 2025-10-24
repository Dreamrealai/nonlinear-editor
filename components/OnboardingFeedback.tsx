/**
 * Onboarding Feedback Component
 *
 * Collects user feedback after completing the onboarding tutorial.
 * Helps improve the onboarding experience based on user input.
 *
 * Features:
 * - Yes/No helpfulness rating
 * - Optional feedback textarea
 * - Analytics tracking
 * - Dismissible modal
 * - Slide-in animation
 */
'use client';

import React, { useState, useEffect } from 'react';
import { X, ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';

type OnboardingFeedbackProps = {
  /** Show feedback modal after onboarding completion */
  show: boolean;
  /** Callback when feedback is dismissed */
  onDismiss: () => void;
};

export function OnboardingFeedback({ show, onDismiss }: OnboardingFeedbackProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(false);
  const [rating, setRating] = useState<'helpful' | 'not_helpful' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect((): void => {
    if (show) {
      // Delay showing feedback modal for better UX
      setTimeout((): void => setIsVisible(true), 500);
    } else {
      setIsVisible(false);
    }
  }, [show]);

  const handleRatingClick = (selectedRating: 'helpful' | 'not_helpful'): void => {
    setRating(selectedRating);

    // Track rating immediately
    analyticsService.track(AnalyticsEvents.ONBOARDING_FEEDBACK_SUBMITTED, {
      rating: selectedRating,
      has_text_feedback: false,
      timestamp: Date.now(),
    });
  };

  const handleSubmitFeedback = async (): Promise<void> => {
    if (!rating) return;

    setIsSubmitting(true);

    try {
      // Track detailed feedback
      analyticsService.track(AnalyticsEvents.ONBOARDING_FEEDBACK_SUBMITTED, {
        rating,
        feedback_text: feedbackText || null,
        has_text_feedback: Boolean(feedbackText),
        feedback_length: feedbackText.length,
        timestamp: Date.now(),
      });

      // TODO: Store feedback in database for analysis
      // await fetch('/api/feedback/onboarding', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ rating, feedback: feedbackText }),
      // });

      setIsSubmitted(true);

      // Auto-dismiss after showing thank you message
      setTimeout((): void => {
        handleDismiss();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = (): void => {
    setIsVisible(false);
    setTimeout((): void => {
      onDismiss();
      // Reset state for next time
      setRating(null);
      setFeedbackText('');
      setIsSubmitted(false);
    }, 300);
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[9997] bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleDismiss}
      />

      {/* Feedback Modal */}
      <div
        className={cn(
          'fixed bottom-8 right-8 z-[9998] w-[400px] max-w-[calc(100vw-64px)]',
          'bg-white dark:bg-neutral-800 rounded-xl shadow-2xl',
          'transition-all duration-300',
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        )}
      >
        {!isSubmitted ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                  How was the tutorial?
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Your feedback helps us improve
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="rounded-md p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                aria-label="Close feedback"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Rating Buttons */}
            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={(): void => handleRatingClick('helpful')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg',
                    'border-2 transition-all',
                    rating === 'helpful'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10'
                  )}
                >
                  <ThumbsUp className="h-5 w-5" />
                  <span className="font-medium">Helpful</span>
                </button>

                <button
                  onClick={(): void => handleRatingClick('not_helpful')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg',
                    'border-2 transition-all',
                    rating === 'not_helpful'
                      ? 'border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/10'
                  )}
                >
                  <ThumbsDown className="h-5 w-5" />
                  <span className="font-medium">Not Helpful</span>
                </button>
              </div>

              {/* Optional Feedback Text */}
              {rating && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label
                    htmlFor="feedback-text"
                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    What could we improve? (optional)
                  </label>
                  <textarea
                    id="feedback-text"
                    value={feedbackText}
                    onChange={(e): void => setFeedbackText(e.target.value)}
                    placeholder="Share your thoughts..."
                    className={cn(
                      'w-full px-3 py-2 rounded-lg',
                      'border border-neutral-300 dark:border-neutral-600',
                      'bg-white dark:bg-neutral-900',
                      'text-neutral-900 dark:text-neutral-100',
                      'placeholder:text-neutral-500',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                      'resize-none'
                    )}
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            {rating && (
              <div className="px-6 pb-6">
                <button
                  onClick={handleSubmitFeedback}
                  disabled={isSubmitting}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
                    'bg-blue-600 text-white font-medium',
                    'hover:bg-blue-700 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Feedback
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          /* Thank You Message */
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <ThumbsUp className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Thank you for your feedback!
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              We'll use it to make the tutorial even better
            </p>
          </div>
        )}
      </div>
    </>
  );
}
