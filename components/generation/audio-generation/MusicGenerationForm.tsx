/**
 * MusicGenerationForm - AI music generation form (Suno integration)
 *
 * Comprehensive form for generating custom music tracks using AI. Features
 * two modes (Simple and Custom), style/genre selection, instrumental option,
 * and advanced settings. Supports long-running async generation with task tracking.
 *
 * Features:
 * - Description-based music generation
 * - Optional track title
 * - Simple Mode: Auto-generated lyrics
 * - Custom Mode: User-provided lyrics and style
 * - Instrumental toggle (no vocals)
 * - Collapsible advanced settings
 * - Generation task tracking (1-2 minutes)
 * - Form validation by mode
 * - Loading states and progress messages
 *
 * Modes:
 * - Simple: Describe music, AI generates everything
 * - Custom: Provide lyrics/description and style/genre
 *
 * @param prompt - Music description or lyrics
 * @param setPrompt - Callback to update prompt
 * @param style - Music style or genre (for Custom mode)
 * @param setStyle - Callback to update style
 * @param title - Optional track title
 * @param setTitle - Callback to update title
 * @param customMode - Whether Custom mode is enabled
 * @param setCustomMode - Callback to toggle Custom mode
 * @param instrumental - Whether to generate instrumental only
 * @param setInstrumental - Callback to toggle instrumental
 * @param generating - Whether music is currently being generated
 * @param taskId - Generation task ID for tracking
 * @param onSubmit - Form submission handler
 *
 * @example
 * ```tsx
 * <MusicGenerationForm
 *   prompt="An upbeat electronic track"
 *   setPrompt={setPrompt}
 *   style="electronic, synth-pop"
 *   setStyle={setStyle}
 *   title="My Track"
 *   setTitle={setTitle}
 *   customMode={false}
 *   setCustomMode={setMode}
 *   instrumental={false}
 *   setInstrumental={setInstrumental}
 *   generating={isGenerating}
 *   taskId={taskId}
 *   onSubmit={handleGenerate}
 * />
 * ```
 */
import React, { useState } from 'react';

interface MusicGenerationFormProps {
  prompt: string;
  setPrompt: (value: string) => void;
  style: string;
  setStyle: (value: string) => void;
  title: string;
  setTitle: (value: string) => void;
  customMode: boolean;
  setCustomMode: (value: boolean) => void;
  instrumental: boolean;
  setInstrumental: (value: boolean) => void;
  generating: boolean;
  taskId: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

export function MusicGenerationForm({
  prompt,
  setPrompt,
  style,
  setStyle,
  title,
  setTitle,
  customMode,
  setCustomMode,
  instrumental,
  setInstrumental,
  generating,
  taskId,
  onSubmit,
}: MusicGenerationFormProps): React.ReactElement {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Prompt */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <label htmlFor="prompt" className="block text-sm font-semibold text-neutral-900 mb-2">
          {customMode ? 'Lyrics / Description' : 'Music Description *'}
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e): void => setPrompt(e.target.value)}
          placeholder={
            customMode
              ? 'Enter your lyrics or description here...'
              : 'An upbeat electronic track with synth melodies, perfect for a tech video'
          }
          rows={4}
          disabled={generating}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          required={!customMode}
        />
        <p className="mt-2 text-xs text-neutral-500">Describe the music you want to generate</p>
      </div>

      {/* Title */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <label htmlFor="title" className="block text-xs font-medium text-neutral-700 mb-2">
          Title (optional)
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e): void => setTitle(e.target.value)}
          placeholder="My Awesome Track"
          disabled={generating}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Advanced Settings Collapsible */}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
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

        {showAdvanced && (
          <div className="border-t border-neutral-200 p-6 space-y-4">
            {/* Mode Selection */}
            <div>
              <span className="block text-xs font-medium text-neutral-700 mb-2">
                Generation Mode
              </span>
              <div className="flex gap-4">
                <label htmlFor="music-mode-standard" className="flex items-center gap-2">
                  <input
                    id="music-mode-standard"
                    type="radio"
                    checked={!customMode}
                    onChange={(): void => setCustomMode(false)}
                    disabled={generating}
                    className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-sm text-neutral-700">Simple Mode</span>
                </label>
                <label htmlFor="music-mode-custom" className="flex items-center gap-2">
                  <input
                    id="music-mode-custom"
                    type="radio"
                    checked={customMode}
                    onChange={(): void => setCustomMode(true)}
                    disabled={generating}
                    className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-sm text-neutral-700">Custom Mode</span>
                </label>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Simple mode auto-generates lyrics. Custom mode lets you provide your own.
              </p>
            </div>

            {/* Style (Custom Mode) */}
            {customMode && (
              <div>
                <label htmlFor="style" className="block text-xs font-medium text-neutral-700 mb-2">
                  Style / Genre *
                </label>
                <input
                  type="text"
                  id="style"
                  value={style}
                  onChange={(e): void => setStyle(e.target.value)}
                  placeholder="electronic, synth-pop, upbeat"
                  disabled={generating}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  required={customMode}
                />
                <p className="mt-1 text-xs text-neutral-500">
                  e.g., &quot;pop rock&quot;, &quot;lo-fi hip-hop&quot;, &quot;orchestral&quot;
                </p>
              </div>
            )}

            {/* Instrumental */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="instrumental"
                checked={instrumental}
                onChange={(e): void => setInstrumental(e.target.checked)}
                disabled={generating}
                className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
              />
              <label htmlFor="instrumental" className="text-sm text-neutral-700">
                Make instrumental (no vocals)
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex-1">
          {generating && taskId && (
            <p className="text-sm text-neutral-600">
              Generation in progress... This may take 1-2 minutes. You can navigate away and check
              back later.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={generating || (!prompt.trim() && !customMode) || (customMode && !style.trim())}
          className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-md transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-purple-500 disabled:hover:to-pink-500"
        >
          <div className="flex items-center gap-2">
            {generating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
                Generate Music
              </>
            )}
          </div>
        </button>
      </div>
    </form>
  );
}
