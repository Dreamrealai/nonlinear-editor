/**
 * useProgressTracking Hook
 *
 * Manages progress state for async operations like video processing,
 * scene detection, audio extraction, etc.
 */
'use client';

import { useState, useCallback, useRef } from 'react';
import type { OperationType, ProgressState } from '@/components/ProgressModal';

interface UseProgressTrackingReturn {
  /** Current progress state */
  progressState: ProgressState;
  /** Start tracking an operation */
  startOperation: (type: OperationType, cancellable?: boolean) => void;
  /** Update progress percentage and optional step */
  updateProgress: (progress: number, currentStep?: string) => void;
  /** Mark operation as completed */
  completeOperation: () => void;
  /** Mark operation as failed with error message */
  failOperation: (error: string) => void;
  /** Reset progress state */
  resetProgress: () => void;
  /** Cancel current operation */
  cancelOperation: () => void;
  /** Check if operation is active */
  isOperationActive: boolean;
  /** Get cancel callback ref for async operations */
  getCancelCallbackRef: () => React.MutableRefObject<(() => void) | null>;
}

const INITIAL_STATE: ProgressState = {
  type: 'upscale',
  isActive: false,
  progress: undefined,
  currentStep: undefined,
  error: undefined,
  completed: false,
  startTime: undefined,
  estimatedTimeRemaining: undefined,
  cancellable: false,
};

/**
 * Hook to manage progress tracking for async operations
 */
export function useProgressTracking(): UseProgressTrackingReturn {
  const [progressState, setProgressState] = useState<ProgressState>(INITIAL_STATE);
  const cancelCallbackRef = useRef<(() => void) | null>(null);

  const startOperation = useCallback((type: OperationType, cancellable = false) => {
    setProgressState({
      type,
      isActive: true,
      progress: 0,
      currentStep: undefined,
      error: undefined,
      completed: false,
      startTime: Date.now(),
      estimatedTimeRemaining: undefined,
      cancellable,
    });
  }, []);

  const updateProgress = useCallback((progress: number, currentStep?: string) => {
    setProgressState((prev) => {
      if (!prev.isActive) return prev;
      return {
        ...prev,
        progress,
        currentStep,
      };
    });
  }, []);

  const completeOperation = useCallback(() => {
    setProgressState((prev) => ({
      ...prev,
      isActive: false,
      progress: 100,
      completed: true,
      error: undefined,
    }));
  }, []);

  const failOperation = useCallback((error: string) => {
    setProgressState((prev) => ({
      ...prev,
      isActive: false,
      completed: false,
      error,
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgressState(INITIAL_STATE);
    cancelCallbackRef.current = null;
  }, []);

  const cancelOperation = useCallback(() => {
    if (cancelCallbackRef.current) {
      cancelCallbackRef.current();
    }
    setProgressState((prev) => ({
      ...prev,
      isActive: false,
      completed: false,
      error: 'Operation cancelled by user',
    }));
  }, []);

  const getCancelCallbackRef = useCallback(() => {
    return cancelCallbackRef;
  }, []);

  return {
    progressState,
    startOperation,
    updateProgress,
    completeOperation,
    failOperation,
    resetProgress,
    cancelOperation,
    isOperationActive: progressState.isActive,
    getCancelCallbackRef,
  };
}
