import React from 'react';
/**
 * SectionTabs - Navigation tabs for timeline corrections panel
 *
 * Provides tabbed navigation between different correction sections:
 * Color, Transform, and Audio (when applicable). Highlights the active
 * section and conditionally displays the Audio tab based on clip type.
 *
 * Features:
 * - Color correction tab (always visible)
 * - Transform/effects tab (always visible)
 * - Audio effects tab (visible only for clips with audio)
 * - Active state highlighting
 * - Responsive hover states
 *
 * @param activeSection - Currently active correction section ('color' | 'transform' | 'audio')
 * @param hasAudio - Whether the selected clip has an audio track
 * @param onSectionChange - Callback when user switches sections
 *
 * @example
 * ```tsx
 * <SectionTabs
 *   activeSection="color"
 *   hasAudio={true}
 *   onSectionChange={(section) => setActiveSection(section)}
 * />
 * ```
 */
import type { SectionType } from './types';

interface SectionTabsProps {
  activeSection: SectionType;
  hasAudio: boolean;
  onSectionChange: (section: SectionType) => void;
}

export function SectionTabs({
  activeSection,
  hasAudio,
  onSectionChange,
}: SectionTabsProps): React.ReactElement {
  return (
    <div className="mb-4 flex gap-2">
      <button
        type="button"
        onClick={(): void => onSectionChange('color')}
        className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
          activeSection === 'color'
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
        }`}
      >
        Color
      </button>
      <button
        type="button"
        onClick={(): void => onSectionChange('transform')}
        className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
          activeSection === 'transform'
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
        }`}
      >
        Transform
      </button>
      {hasAudio && (
        <button
          type="button"
          onClick={(): void => onSectionChange('audio')}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeSection === 'audio'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          Audio
        </button>
      )}
    </div>
  );
}
