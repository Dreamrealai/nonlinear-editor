/**
 * EditModeFeedback Component
 *
 * Provides visual feedback for different editing modes:
 * - Shows current edit mode (Normal, Ripple, Roll, Slip, Slide)
 * - Displays keyboard modifiers being used
 * - Shows affected clips count
 * - Real-time duration changes
 * - Color-coded by mode type
 */
'use client';

import React from 'react';
import type { EditMode, TrimFeedback } from '@/types/editModes';

type EditModeFeedbackProps = {
  currentMode: EditMode;
  feedback: TrimFeedback | null;
  modifiers: {
    shift: boolean;
    alt: boolean;
    cmd: boolean;
    ctrl: boolean;
  };
};

/**
 * Get color scheme for edit mode
 */
function getModeColors(mode: EditMode): { bg: string; border: string; text: string } {
  switch (mode) {
    case 'ripple':
      return {
        bg: 'bg-blue-900/95',
        border: 'border-blue-400',
        text: 'text-blue-400',
      };
    case 'roll':
      return {
        bg: 'bg-purple-900/95',
        border: 'border-purple-400',
        text: 'text-purple-400',
      };
    case 'slip':
      return {
        bg: 'bg-green-900/95',
        border: 'border-green-400',
        text: 'text-green-400',
      };
    case 'slide':
      return {
        bg: 'bg-orange-900/95',
        border: 'border-orange-400',
        text: 'text-orange-400',
      };
    default:
      return {
        bg: 'bg-gray-900/95',
        border: 'border-gray-400',
        text: 'text-gray-400',
      };
  }
}

/**
 * Get icon for edit mode
 */
function getModeIcon(mode: EditMode): React.ReactNode {
  switch (mode) {
    case 'ripple':
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 5l7 7-7 7M5 5l7 7-7 7"
          />
        </svg>
      );
    case 'roll':
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      );
    case 'slip':
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    case 'slide':
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l4-4 4 4m0 6l-4 4-4-4"
          />
        </svg>
      );
    default:
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
  }
}

export const EditModeFeedback = React.memo<EditModeFeedbackProps>(function EditModeFeedback({
  currentMode,
  feedback,
  modifiers,
}): React.ReactElement {
  const colors = getModeColors(currentMode);
  const showModifiers = modifiers.shift || modifiers.alt || modifiers.cmd || modifiers.ctrl;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={`flex items-center gap-3 rounded-lg border-2 ${colors.border} ${colors.bg} px-4 py-2 shadow-xl backdrop-blur-sm`}
      >
        {/* Mode icon and name */}
        <div className="flex items-center gap-2">
          <div className={colors.text}>{getModeIcon(currentMode)}</div>
          <div className="flex flex-col">
            <span className={`text-sm font-bold uppercase tracking-wider ${colors.text}`}>
              {currentMode} Mode
            </span>
            {feedback && (
              <span className="text-[10px] text-gray-300">{feedback.description}</span>
            )}
          </div>
        </div>

        {/* Keyboard modifiers */}
        {showModifiers && (
          <div className="flex items-center gap-1 border-l border-gray-600 pl-3">
            {modifiers.shift && (
              <div className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                ⇧ SHIFT
              </div>
            )}
            {modifiers.alt && (
              <div className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                ⌥ ALT
              </div>
            )}
            {(modifiers.cmd || modifiers.ctrl) && (
              <div className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {modifiers.cmd ? '⌘ CMD' : '⌃ CTRL'}
              </div>
            )}
          </div>
        )}

        {/* Trim feedback */}
        {feedback && (
          <div className="flex items-center gap-3 border-l border-gray-600 pl-3">
            {/* Duration change */}
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400">Duration</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-mono text-white">
                  {feedback.primaryClip.originalDuration.toFixed(2)}s
                </span>
                <svg
                  className="h-3 w-3 text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="text-sm font-mono font-bold text-yellow-400">
                  {feedback.primaryClip.newDuration.toFixed(2)}s
                </span>
              </div>
            </div>

            {/* Delta indicator */}
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400">Change</span>
              <div
                className={`flex items-center gap-0.5 ${
                  feedback.primaryClip.deltaTime > 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                <span className="text-sm font-semibold">
                  {feedback.primaryClip.deltaTime > 0 ? '+' : ''}
                  {feedback.primaryClip.deltaTime.toFixed(2)}s
                </span>
              </div>
            </div>

            {/* Affected clips count */}
            {feedback.affectedClipsCount > 0 && (
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400">Affected</span>
                <div className="flex items-center gap-1">
                  <svg
                    className="h-3 w-3 text-orange-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                  <span className="text-sm font-bold text-orange-400">
                    {feedback.affectedClipsCount} clips
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
