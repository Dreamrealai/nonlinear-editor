/**
 * Easter Egg Feedback Component
 *
 * Collects user feedback on easter eggs after discovering all 5.
 * Features 5-star rating, favorite egg selection, and suggestions.
 */
'use client';

import React, { useState, useEffect } from 'react';
import { achievementService, EasterEggIds, type EasterEggId } from '@/lib/services/achievementService';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

interface EasterEggFeedbackProps {
  /** Whether feedback dialog is open */
  isOpen: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
}

/**
 * Easter Egg Feedback Dialog
 *
 * Shows after user discovers all 5 easter eggs.
 */
export function EasterEggFeedback({ isOpen, onClose }: EasterEggFeedbackProps): React.ReactElement | null {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [favoriteEgg, setFavoriteEgg] = useState<EasterEggId | 'none' | ''>('');
  const [suggestions, setSuggestions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when opened
  useEffect((): void => {
    if (isOpen) {
      setRating(0);
      setHoveredRating(0);
      setFavoriteEgg('');
      setSuggestions('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setIsSubmitting(true);

    const success = await achievementService.submitFeedback(
      rating,
      favoriteEgg || 'none',
      suggestions || undefined
    );

    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const eggNames: Record<EasterEggId | 'none', string> = {
    [EasterEggIds.KONAMI]: 'Konami Code (Rainbow Mode)',
    [EasterEggIds.DEVMODE]: 'Developer Mode',
    [EasterEggIds.MATRIX]: 'Matrix Mode',
    [EasterEggIds.DISCO]: 'Disco Mode',
    [EasterEggIds.GRAVITY]: 'Gravity Mode',
    none: "I don't have a favorite",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close"
        >
          <svg
            className="h-6 w-6"
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

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Congratulations!
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            You discovered all 5 easter eggs! How did you enjoy them?
          </p>
        </div>

        {/* Feedback form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div>
            <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              How would you rate the easter eggs?
            </Label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star): React.ReactElement => (
                <button
                  key={star}
                  type="button"
                  onClick={(): void => setRating(star)}
                  onMouseEnter={(): void => setHoveredRating(star)}
                  onMouseLeave={(): void => setHoveredRating(0)}
                  className="text-4xl transition-transform hover:scale-110"
                  aria-label={`Rate ${star} stars`}
                >
                  {star <= (hoveredRating || rating) ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                {rating === 5 && 'Amazing! We are so glad you enjoyed them!'}
                {rating === 4 && 'Great! Thanks for the feedback!'}
                {rating === 3 && 'Good! We will keep improving!'}
                {rating === 2 && 'Thanks! We will work to make them better!'}
                {rating === 1 && 'Sorry! We will do better next time!'}
              </p>
            )}
          </div>

          {/* Favorite egg */}
          <div>
            <Label
              htmlFor="favorite-egg"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Which was your favorite?
            </Label>
            <Select value={favoriteEgg} onValueChange={(value: string): void => setFavoriteEgg(value as EasterEggId | 'none' | '')}>
              <SelectTrigger id="favorite-egg" className="w-full">
                <SelectValue placeholder="Select your favorite..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(eggNames).map(([id, name]): React.ReactElement => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Suggestions */}
          <div>
            <Label
              htmlFor="suggestions"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Any other easter eggs we should add? (Optional)
            </Label>
            <Textarea
              id="suggestions"
              value={suggestions}
              onChange={(e): void => setSuggestions(e.target.value)}
              placeholder="Share your ideas..."
              rows={4}
              className="w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Skip
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Hook to manage easter egg feedback dialog
 *
 * Automatically shows feedback dialog after user discovers all 5 eggs.
 */
export function useEasterEggFeedback(): { isOpen: boolean; onClose: () => void; } {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect((): void => {
    // Check if user has discovered all 5 eggs
    const checkDiscoveries = async (): Promise<void> => {
      if (hasShown) return;

      const discoveredCount = achievementService.getDiscoveredCount();

      // Check if feedback already submitted
      const feedbackSubmitted = localStorage.getItem('easterEggFeedbackSubmitted');

      if (discoveredCount === 5 && !feedbackSubmitted) {
        // Show feedback dialog after a short delay
        setTimeout((): void => {
          setIsOpen(true);
          setHasShown(true);
        }, 2000);
      }
    };

    checkDiscoveries();
  }, [hasShown]);

  const handleClose = (): void => {
    setIsOpen(false);
    // Mark as submitted so it doesn't show again
    localStorage.setItem('easterEggFeedbackSubmitted', 'true');
  };

  return {
    isOpen,
    onClose: handleClose,
  };
}
