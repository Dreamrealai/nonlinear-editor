'use client';

import { useState, useCallback } from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import { useCorrectionSync } from './corrections/useCorrectionSync';
import { useCorrectionHandlers } from './corrections/useCorrectionHandlers';
import { ColorCorrectionSection } from './corrections/ColorCorrectionSection';
import { TransformSection } from './corrections/TransformSection';
import { AudioEffectsSection } from './corrections/AudioEffectsSection';
import { SectionTabs } from './corrections/SectionTabs';
import type { SectionType } from './corrections/types';

/**
 * TimelineCorrectionsMenu Component
 *
 * A collapsible panel below the timeline for advanced video corrections including:
 * - Color Correction (brightness, contrast, saturation, hue)
 * - Transform (rotation, flip, scale)
 * - Audio Effects (EQ, compression, normalization)
 *
 * Features modern, sleek design with smooth animations and debounced updates.
 */
export default function TimelineCorrectionsMenu() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionType>('color');

  const selectedClips = useEditorStore((state) => state.selectedClipIds);
  const clips = useEditorStore((state) => state.timeline?.clips ?? []);
  const updateClipStore = useEditorStore((state) => state.updateClip);

  // Stable reference for updateClip
  const updateClip = useCallback(
    (id: string, updates: Record<string, string | number | boolean | object>) => {
      updateClipStore(id, updates);
    },
    [updateClipStore]
  );

  // Get first selected clip
  const selectedClip =
    selectedClips.size > 0 ? (clips.find((c) => selectedClips.has(c.id)) ?? null) : null;

  // Use custom hooks for state management
  const { local, setters, debounced } = useCorrectionSync(selectedClip);
  const {
    updateTransform,
    updateAudioEffects,
    resetColorCorrection,
    resetTransform,
    resetAudioEffects,
  } = useCorrectionHandlers({
    selectedClip,
    updateClip,
    debounced,
    setters,
  });

  if (!selectedClip) {
    return null; // Don't show menu when no clip is selected
  }

  const transform = selectedClip.transform || {
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    scale: 1.0,
  };
  const audioEffects = selectedClip.audioEffects || {
    bassGain: 0,
    midGain: 0,
    trebleGain: 0,
    compression: 0,
    normalize: false,
  };

  return (
    <div className="w-full border-t border-neutral-200 bg-white shadow-lg">
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-6 py-3 transition hover:bg-neutral-50"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`h-4 w-4 text-neutral-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <h3 className="text-sm font-semibold text-neutral-900">Advanced Corrections</h3>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {selectedClip.filePath.split('/').pop()?.slice(0, 20)}...
          </span>
        </div>
        <span className="text-xs text-neutral-500">{isExpanded ? 'Collapse' : 'Expand'}</span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-neutral-100 bg-gradient-to-b from-white to-neutral-50 px-6 py-4">
          {/* Section Tabs */}
          <SectionTabs
            activeSection={activeSection}
            hasAudio={selectedClip.hasAudio ?? false}
            onSectionChange={setActiveSection}
          />

          {/* Color Correction Section */}
          {activeSection === 'color' && (
            <ColorCorrectionSection
              brightness={local.brightness}
              contrast={local.contrast}
              saturation={local.saturation}
              hue={local.hue}
              onBrightnessChange={setters.setBrightness}
              onContrastChange={setters.setContrast}
              onSaturationChange={setters.setSaturation}
              onHueChange={setters.setHue}
              onReset={resetColorCorrection}
            />
          )}

          {/* Transform Section */}
          {activeSection === 'transform' && (
            <TransformSection
              rotation={local.rotation}
              scale={local.scale}
              flipHorizontal={transform.flipHorizontal}
              flipVertical={transform.flipVertical}
              onRotationChange={setters.setRotation}
              onScaleChange={setters.setScale}
              onFlipUpdate={updateTransform}
              onReset={resetTransform}
            />
          )}

          {/* Audio Effects Section */}
          {activeSection === 'audio' && selectedClip.hasAudio && (
            <AudioEffectsSection
              bassGain={local.bassGain}
              midGain={local.midGain}
              trebleGain={local.trebleGain}
              compression={local.compression}
              normalize={audioEffects.normalize}
              onBassGainChange={setters.setBassGain}
              onMidGainChange={setters.setMidGain}
              onTrebleGainChange={setters.setTrebleGain}
              onCompressionChange={setters.setCompression}
              onAudioUpdate={updateAudioEffects}
              onReset={resetAudioEffects}
            />
          )}
        </div>
      )}
    </div>
  );
}
