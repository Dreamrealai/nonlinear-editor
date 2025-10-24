/**
 * useOnboarding Hook
 *
 * Manages user onboarding state and tour progress
 */

import { useState, useEffect, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { browserLogger } from '@/lib/browserLogger';
import type { UserOnboardingState } from '@/types/onboarding';

export interface UseOnboardingReturn {
  state: UserOnboardingState | null;
  isLoading: boolean;
  error: Error | null;
  startTour: (tourId: string) => Promise<void>;
  completeTour: (tourId: string) => Promise<void>;
  skipTour: (tourId: string) => Promise<void>;
  nextStep: () => Promise<void>;
  previousStep: () => Promise<void>;
  goToStep: (stepIndex: number) => Promise<void>;
  hasCompletedTour: (tourId: string) => boolean;
  hasSkippedTour: (tourId: string) => boolean;
}

/**
 * Hook to manage user onboarding state
 */
export function useOnboarding(): UseOnboardingReturn {
  const [state, setState] = useState<UserOnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadState = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get or create onboarding state
      let { data: onboardingState, error: fetchError } = await supabase
        .from('user_onboarding_state')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // No state exists, create it
        const { data: newState, error: insertError } = await supabase
          .from('user_onboarding_state')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }
        onboardingState = newState;
      } else if (fetchError) {
        throw fetchError;
      }

      setState(onboardingState);
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to load onboarding state');
      setError(errorObj);
      browserLogger.error({ error: err }, 'Failed to load onboarding state');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect((): void => {
    loadState();
  }, [loadState]);

  const updateState = useCallback(
    async (updates: Partial<UserOnboardingState>): Promise<void> => {
      if (!state) return;

      try {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: updatedState, error: updateError } = await supabase
          .from('user_onboarding_state')
          .update(updates)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setState(updatedState);
      } catch (err) {
        browserLogger.error({ error: err, updates }, 'Failed to update onboarding state');
      }
    },
    [state]
  );

  const startTour = useCallback(
    async (tourId: string): Promise<void> => {
      await updateState({
        current_tour_id: tourId,
        current_step_index: 0,
      });
    },
    [updateState]
  );

  const completeTour = useCallback(
    async (tourId: string): Promise<void> => {
      if (!state) return;

      const toursCompleted = [...state.tours_completed];
      if (!toursCompleted.includes(tourId)) {
        toursCompleted.push(tourId);
      }

      await updateState({
        tours_completed: toursCompleted,
        current_tour_id: null,
        current_step_index: 0,
      });
    },
    [state, updateState]
  );

  const skipTour = useCallback(
    async (tourId: string): Promise<void> => {
      if (!state) return;

      const toursSkipped = [...state.tours_skipped];
      if (!toursSkipped.includes(tourId)) {
        toursSkipped.push(tourId);
      }

      await updateState({
        tours_skipped: toursSkipped,
        current_tour_id: null,
        current_step_index: 0,
      });
    },
    [state, updateState]
  );

  const nextStep = useCallback(async (): Promise<void> => {
    if (!state) return;

    await updateState({
      current_step_index: state.current_step_index + 1,
    });
  }, [state, updateState]);

  const previousStep = useCallback(async (): Promise<void> => {
    if (!state) return;

    await updateState({
      current_step_index: Math.max(0, state.current_step_index - 1),
    });
  }, [state, updateState]);

  const goToStep = useCallback(
    async (stepIndex: number): Promise<void> => {
      await updateState({
        current_step_index: stepIndex,
      });
    },
    [updateState]
  );

  const hasCompletedTour = useCallback(
    (tourId: string): boolean => {
      return state?.tours_completed.includes(tourId) || false;
    },
    [state]
  );

  const hasSkippedTour = useCallback(
    (tourId: string): boolean => {
      return state?.tours_skipped.includes(tourId) || false;
    },
    [state]
  );

  return {
    state,
    isLoading,
    error,
    startTour,
    completeTour,
    skipTour,
    nextStep,
    previousStep,
    goToStep,
    hasCompletedTour,
    hasSkippedTour,
  };
}
