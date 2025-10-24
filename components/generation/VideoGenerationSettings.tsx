/**
 * VideoGenerationSettings Component
 *
 * Advanced settings panel for video generation.
 * Displays model-specific options in a collapsible section.
 */

'use client';

import { useState } from 'react';
import type { ModelConfig } from '@/lib/config/models';
import { MODEL_PROVIDERS } from '@/lib/config/models';

interface VideoGenerationSettingsProps {
  /** Current model configuration */
  modelConfig: ModelConfig;
  /** Resolution setting */
  resolution: '720p' | '1080p';
  /** Sample count (number of videos to generate) */
  sampleCount: 1 | 2 | 3 | 4;
  /** Person generation setting */
  personGeneration: 'allow_adult' | 'dont_allow';
  /** Random seed for reproducibility */
  seed: string;
  /** Negative prompt */
  negativePrompt: string;
  /** Whether to enhance prompt with Gemini */
  enhancePrompt: boolean;
  /** Whether to generate audio */
  generateAudio: boolean;
  /** Whether generation is in progress */
  disabled: boolean;
  /** Callbacks for setting changes */
  onResolutionChange: (value: '720p' | '1080p') => void;
  onSampleCountChange: (value: 1 | 2 | 3 | 4) => void;
  onPersonGenerationChange: (value: 'allow_adult' | 'dont_allow') => void;
  onSeedChange: (value: string) => void;
  onNegativePromptChange: (value: string) => void;
  onEnhancePromptChange: (value: boolean) => void;
  onGenerateAudioChange: (value: boolean) => void;
}

/**
 * Advanced settings component for video generation
 */
export function VideoGenerationSettings({
  modelConfig,
  resolution,
  sampleCount,
  personGeneration,
  seed,
  negativePrompt,
  enhancePrompt,
  generateAudio,
  disabled,
  onResolutionChange,
  onSampleCountChange,
  onPersonGenerationChange,
  onSeedChange,
  onNegativePromptChange,
  onEnhancePromptChange,
  onGenerateAudioChange,
}: VideoGenerationSettingsProps): JSX.Element {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={(): void => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`h-4 w-4 text-neutral-500 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-neutral-900">Advanced Settings</span>
        </div>
        <span className="text-xs text-neutral-500">{showAdvanced ? 'Hide' : 'Show'}</span>
      </button>

      {/* Settings Panel */}
      {showAdvanced && (
        <div className="border-t border-neutral-200 p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Resolution */}
              {modelConfig.supportsResolution && (
                <div>
                  <label
                    htmlFor="resolution"
                    className="block text-xs font-medium text-neutral-700 mb-2"
                  >
                    Resolution
                  </label>
                  <select
                    id="resolution"
                    value={resolution}
                    onChange={(e): void => onResolutionChange(e.target.value as '720p' | '1080p')}
                    disabled={disabled}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="720p">720p (HD)</option>
                    <option value="1080p">1080p (Full HD)</option>
                  </select>
                </div>
              )}

              {/* Sample Count */}
              {modelConfig.maxSampleCount > 1 && (
                <div>
                  <label
                    htmlFor="sampleCount"
                    className="block text-xs font-medium text-neutral-700 mb-2"
                  >
                    Number of Videos (max {modelConfig.maxSampleCount})
                  </label>
                  <select
                    id="sampleCount"
                    value={sampleCount}
                    onChange={(e): void => onSampleCountChange(parseInt(e.target.value) as 1 | 2 | 3 | 4)}
                    disabled={disabled}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {[1, 2, 3, 4]
                      .filter((n): boolean => n <= modelConfig.maxSampleCount)
                      .map((n): JSX.Element => (
                        <option key={n} value={n}>
                          {n} video{n > 1 ? 's' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Person Generation - Only for Google Veo models */}
              {modelConfig.provider === MODEL_PROVIDERS.GOOGLE && (
                <div>
                  <label
                    htmlFor="personGeneration"
                    className="block text-xs font-medium text-neutral-700 mb-2"
                  >
                    Person Generation
                  </label>
                  <select
                    id="personGeneration"
                    value={personGeneration}
                    onChange={(e): void =>
                      onPersonGenerationChange(e.target.value as 'allow_adult' | 'dont_allow')
                    }
                    disabled={disabled}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="allow_adult">Allow Adult Faces</option>
                    <option value="dont_allow">Don&apos;t Generate People</option>
                  </select>
                </div>
              )}

              {/* Seed */}
              <div>
                <label htmlFor="seed" className="block text-xs font-medium text-neutral-700 mb-2">
                  Seed (optional)
                </label>
                <input
                  type="number"
                  id="seed"
                  value={seed}
                  onChange={(e): void => onSeedChange(e.target.value)}
                  placeholder="Random"
                  min="0"
                  max="4294967295"
                  disabled={disabled}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-neutral-500">For reproducible results</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Negative Prompt */}
              {modelConfig.supportsNegativePrompt && (
                <div>
                  <label
                    htmlFor="negativePrompt"
                    className="block text-xs font-medium text-neutral-700 mb-2"
                  >
                    Negative Prompt
                  </label>
                  <textarea
                    id="negativePrompt"
                    value={negativePrompt}
                    onChange={(e): void => onNegativePromptChange(e.target.value)}
                    placeholder="What to avoid (e.g., blur, distortion)"
                    rows={4}
                    disabled={disabled}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              )}

              {/* Checkboxes */}
              <div className="space-y-3">
                {/* Enhance Prompt */}
                {modelConfig.supportsEnhancePrompt && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enhancePrompt"
                      checked={enhancePrompt}
                      onChange={(e): void => onEnhancePromptChange(e.target.checked)}
                      disabled={disabled}
                      className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <label htmlFor="enhancePrompt" className="text-sm text-neutral-700">
                      Enhance Prompt with Gemini
                    </label>
                  </div>
                )}

                {/* Generate Audio */}
                {modelConfig.supportsAudio && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="generateAudio"
                      checked={generateAudio}
                      onChange={(e): void => onGenerateAudioChange(e.target.checked)}
                      disabled={disabled}
                      className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <label htmlFor="generateAudio" className="text-sm text-neutral-700">
                      Generate Audio
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
