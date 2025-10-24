import type { SectionType } from './types';

interface SectionTabsProps {
  activeSection: SectionType;
  hasAudio: boolean;
  onSectionChange: (section: SectionType) => void;
}

export function SectionTabs({ activeSection, hasAudio, onSectionChange }: SectionTabsProps) {
  return (
    <div className="mb-4 flex gap-2">
      <button
        type="button"
        onClick={() => onSectionChange('color')}
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
        onClick={() => onSectionChange('transform')}
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
          onClick={() => onSectionChange('audio')}
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
