/**
 * useUndoRedoWithFeedback Hook
 *
 * Wraps undo/redo actions with toast notifications for visual feedback
 */
'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

type UndoRedoFeedbackOptions = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

/**
 * Enhances undo/redo actions with visual feedback using toast notifications
 *
 * @param options - Undo/redo functions and availability flags
 * @returns Enhanced undo/redo functions with toast feedback
 */
export function useUndoRedoWithFeedback({ undo, redo, canUndo, canRedo }: UndoRedoFeedbackOptions) {
  const handleUndo = useCallback(() => {
    if (!canUndo) return;

    undo();

    toast.success('Action undone', {
      duration: 1500,
      icon: '↩️',
      position: 'bottom-center',
      style: {
        borderRadius: '8px',
        background: '#333',
        color: '#fff',
        fontSize: '14px',
      },
    });
  }, [undo, canUndo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;

    redo();

    toast.success('Action redone', {
      duration: 1500,
      icon: '↪️',
      position: 'bottom-center',
      style: {
        borderRadius: '8px',
        background: '#333',
        color: '#fff',
        fontSize: '14px',
      },
    });
  }, [redo, canRedo]);

  return {
    handleUndo,
    handleRedo,
  };
}
