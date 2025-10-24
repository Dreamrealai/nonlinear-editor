'use client';

type TimelineContextMenuProps = {
  clipId: string;
  x: number;
  y: number;
  splitAudioPending?: boolean;
  splitScenesPending?: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onSplitAudio?: (clipId: string) => void;
  onSplitScenes?: (clipId: string) => void;
  onGenerateAudio?: (clipId: string) => void;
  onClose: () => void;
};

/**
 * Timeline context menu component
 * Displays right-click menu for clips with various actions
 */
export const TimelineContextMenu: React.FC<TimelineContextMenuProps> = ({
  clipId,
  x,
  y,
  splitAudioPending = false,
  splitScenesPending = false,
  onCopy,
  onPaste,
  onSplitAudio,
  onSplitScenes,
  onGenerateAudio,
  onClose,
}) => {
  return (
    <div
      className="fixed z-50 rounded-md border border-neutral-200 bg-white shadow-lg py-1"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      role="menu"
      tabIndex={0}
      aria-label="Timeline context menu"
    >
      <button
        onClick={() => {
          onCopy();
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 flex items-center gap-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <span>Copy</span>
      </button>
      <button
        onClick={() => {
          onPaste();
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 flex items-center gap-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <span>Paste</span>
      </button>
      <div className="my-1 h-px bg-neutral-200" />
      {onSplitAudio && (
        <button
          onClick={() => {
            onSplitAudio(clipId);
            onClose();
          }}
          disabled={splitAudioPending}
          className="w-full px-4 py-2 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
          <span>Split Audio</span>
        </button>
      )}
      {onSplitScenes && (
        <button
          onClick={() => {
            onSplitScenes(clipId);
            onClose();
          }}
          disabled={splitScenesPending}
          className="w-full px-4 py-2 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
          <span>Split Scenes</span>
        </button>
      )}
      {onGenerateAudio && (
        <>
          <div className="my-1 h-px bg-neutral-200" />
          <button
            onClick={() => {
              onGenerateAudio(clipId);
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            <span>Generate Audio</span>
          </button>
        </>
      )}
    </div>
  );
};
