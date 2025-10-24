/**
 * TransitionPanel Component
 *
 * Provides UI for adding and configuring transitions between clips.
 * Supports all transition types defined in the timeline data model.
 *
 * Features:
 * - Transition type selection
 * - Duration control
 * - Preview of transition effect
 * - Apply to single or multiple clips
 */
'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import type { TransitionType, Timeline } from '@/types/timeline';

const TRANSITION_OPTIONS: Array<{
  type: TransitionType;
  label: string;
  description: string;
  implemented: boolean;
}> = [
  { type: 'none', label: 'None', description: 'No transition', implemented: true },
  {
    type: 'crossfade',
    label: 'Crossfade',
    description: 'Smooth blend between clips',
    implemented: true,
  },
  { type: 'fade-in', label: 'Fade In', description: 'Fade from black', implemented: true },
  { type: 'fade-out', label: 'Fade Out', description: 'Fade to black', implemented: true },
  {
    type: 'slide-left',
    label: 'Slide Left',
    description: 'Slide clip in from right',
    implemented: false,
  },
  {
    type: 'slide-right',
    label: 'Slide Right',
    description: 'Slide clip in from left',
    implemented: false,
  },
  { type: 'slide-up', label: 'Slide Up', description: 'Slide clip in from bottom', implemented: false },
  {
    type: 'slide-down',
    label: 'Slide Down',
    description: 'Slide clip in from top',
    implemented: false,
  },
  { type: 'wipe-left', label: 'Wipe Left', description: 'Wipe left to right', implemented: false },
  { type: 'wipe-right', label: 'Wipe Right', description: 'Wipe right to left', implemented: false },
  { type: 'zoom-in', label: 'Zoom In', description: 'Zoom in effect', implemented: false },
  { type: 'zoom-out', label: 'Zoom Out', description: 'Zoom out effect', implemented: false },
];

type TransitionPanelProps = {
  onClose?: () => void;
};

export function TransitionPanel({ onClose }: TransitionPanelProps): React.ReactElement {
  const selectedClipIds = useEditorStore((state): Set<string> => state.selectedClipIds);
  const addTransitionToSelectedClips = useEditorStore((state): (transitionType: TransitionType, duration: number) => void => state.addTransitionToSelectedClips);
  const timeline = useEditorStore((state): Timeline | null => state.timeline);

  const [selectedType, setSelectedType] = useState<TransitionType>('crossfade');
  const [duration, setDuration] = useState(0.5);

  const selectedClips = React.useMemo(() => {
    if (!timeline) return [];
    return timeline.clips.filter((clip): boolean => selectedClipIds.has(clip.id));
  }, [timeline, selectedClipIds]);

  const handleApply = (): void => {
    if (selectedClips.length === 0) return;

    addTransitionToSelectedClips(selectedType, duration);

    if (onClose) {
      onClose();
    }
  };

  const currentTransition = selectedClips[0]?.transitionToNext;
  const implementedOptions = TRANSITION_OPTIONS.filter((opt): boolean => opt.implemented);
  const comingSoonOptions = TRANSITION_OPTIONS.filter((opt): boolean => !opt.implemented);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transitions</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close transitions panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Selection Info */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedClips.length === 0 ? (
            <p>Select a clip to add a transition</p>
          ) : selectedClips.length === 1 ? (
            <p>
              Adding transition to <strong>1 clip</strong>
            </p>
          ) : (
            <p>
              Adding transition to <strong>{selectedClips.length} clips</strong>
            </p>
          )}
        </div>

        {/* Current Transition Display */}
        {currentTransition && selectedClips.length === 1 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Current Transition
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {currentTransition.type} ({currentTransition.duration.toFixed(2)}s)
            </p>
          </div>
        )}

        {/* Transition Type Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Transition Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {implementedOptions.map((option): React.ReactElement => (
              <button
                key={option.type}
                onClick={(): void => setSelectedType(option.type)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedType === option.type
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                }`}
              >
                <div className="font-medium text-sm text-gray-900 dark:text-white">
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Coming Soon Transitions */}
        {comingSoonOptions.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Coming Soon
            </label>
            <div className="grid grid-cols-2 gap-2">
              {comingSoonOptions.map((option): React.ReactElement => (
                <div
                  key={option.type}
                  className="p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50 cursor-not-allowed"
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {option.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Duration Control */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Duration (seconds)
          </label>
          <input
            type="number"
            min="0.1"
            max="5"
            step="0.1"
            value={duration}
            onChange={(e): void => setDuration(parseFloat(e.target.value) || 0.5)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent dark:bg-gray-800 dark:text-white"
          />
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={duration}
            onChange={(e): void => setDuration(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>0.1s</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {duration.toFixed(1)}s
            </span>
            <span>5.0s</span>
          </div>
        </div>

        {/* Preview Info */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Transition Preview
          </p>
          <div className="flex items-center gap-2">
            {selectedType === 'none' && (
              <div className="w-full h-12 bg-blue-500 rounded"></div>
            )}
            {selectedType === 'crossfade' && (
              <div className="flex w-full h-12 gap-1">
                <div className="flex-1 bg-blue-500 rounded opacity-100"></div>
                <div className="flex-1 bg-gradient-to-r from-blue-500 to-green-500 rounded"></div>
                <div className="flex-1 bg-green-500 rounded opacity-100"></div>
              </div>
            )}
            {selectedType === 'fade-in' && (
              <div className="flex w-full h-12 gap-1">
                <div className="flex-1 bg-gradient-to-r from-black to-blue-500 rounded"></div>
                <div className="flex-1 bg-blue-500 rounded"></div>
              </div>
            )}
            {selectedType === 'fade-out' && (
              <div className="flex w-full h-12 gap-1">
                <div className="flex-1 bg-blue-500 rounded"></div>
                <div className="flex-1 bg-gradient-to-r from-blue-500 to-black rounded"></div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Transition will be applied to the end of the selected clip(s)
          </p>
        </div>
      </div>

      {/* Apply Button */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleApply}
          disabled={selectedClips.length === 0}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Apply Transition
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Shortcut: Select clip → T
        </p>
      </div>
    </div>
  );
}
