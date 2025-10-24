'use client';

import { Copy, Clipboard, Trash2, Files, Info, Volume2, Film, Music } from 'lucide-react';
import { useState } from 'react';

type TimelineContextMenuProps = {
  clipId: string;
  x: number;
  y: number;
  splitAudioPending?: boolean;
  splitScenesPending?: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onDelete?: (clipId: string) => void;
  onDuplicate?: (clipId: string) => void;
  onSplitAudio?: (clipId: string) => void;
  onSplitScenes?: (clipId: string) => void;
  onGenerateAudio?: (clipId: string) => void;
  onClose: () => void;
};

/**
 * Timeline context menu component
 * Displays right-click menu for clips with various actions
 * Enhanced with keyboard shortcuts, icons, and better organization
 */
export const TimelineContextMenu: React.FC<TimelineContextMenuProps> = ({
  clipId,
  x,
  y,
  splitAudioPending = false,
  splitScenesPending = false,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
  onSplitAudio,
  onSplitScenes,
  onGenerateAudio,
  onClose,
}) => {
  const [showProperties, setShowProperties] = useState(false);

  // Detect if Mac for keyboard shortcuts
  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  return (
    <>
      <div
        className="fixed z-50 rounded-md border border-neutral-200 bg-white shadow-lg py-1 min-w-[200px]"
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
        {/* Editing Actions */}
        <MenuButton
          icon={<Copy className="h-4 w-4" />}
          label="Copy"
          shortcut={`${cmdKey}C`}
          onClick={() => {
            onCopy();
            onClose();
          }}
        />
        <MenuButton
          icon={<Clipboard className="h-4 w-4" />}
          label="Paste"
          shortcut={`${cmdKey}V`}
          onClick={() => {
            onPaste();
            onClose();
          }}
        />
        {onDuplicate && (
          <MenuButton
            icon={<Files className="h-4 w-4" />}
            label="Duplicate"
            shortcut={`${cmdKey}D`}
            onClick={() => {
              onDuplicate(clipId);
              onClose();
            }}
          />
        )}
        {onDelete && (
          <MenuButton
            icon={<Trash2 className="h-4 w-4" />}
            label="Delete"
            shortcut="Del"
            onClick={() => {
              onDelete(clipId);
              onClose();
            }}
            variant="danger"
          />
        )}

        {/* Processing Actions */}
        {(onSplitAudio || onSplitScenes) && <MenuDivider />}
        {onSplitAudio && (
          <MenuButton
            icon={<Volume2 className="h-4 w-4" />}
            label="Split Audio"
            onClick={() => {
              onSplitAudio(clipId);
              onClose();
            }}
            disabled={splitAudioPending}
          />
        )}
        {onSplitScenes && (
          <MenuButton
            icon={<Film className="h-4 w-4" />}
            label="Split Scenes"
            onClick={() => {
              onSplitScenes(clipId);
              onClose();
            }}
            disabled={splitScenesPending}
          />
        )}

        {/* Generation Actions */}
        {onGenerateAudio && (
          <>
            <MenuDivider />
            <MenuButton
              icon={<Music className="h-4 w-4" />}
              label="Generate Audio"
              onClick={() => {
                onGenerateAudio(clipId);
                onClose();
              }}
            />
          </>
        )}

        {/* Properties */}
        <MenuDivider />
        <MenuButton
          icon={<Info className="h-4 w-4" />}
          label="Properties"
          onClick={() => {
            setShowProperties(true);
          }}
        />
      </div>

      {/* Properties Modal */}
      {showProperties && (
        <ClipPropertiesModal
          clipId={clipId}
          onClose={() => {
            setShowProperties(false);
            onClose();
          }}
        />
      )}
    </>
  );
};

/**
 * Reusable menu button component
 */
type MenuButtonProps = {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
};

const MenuButton: React.FC<MenuButtonProps> = ({
  icon,
  label,
  shortcut,
  onClick,
  disabled = false,
  variant = 'default',
}) => {
  const variantClasses =
    variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-neutral-700 hover:bg-neutral-100';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-4 py-2 text-left text-sm font-medium transition-colors flex items-center justify-between gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
      {shortcut && <span className="text-xs text-neutral-400 font-mono">{shortcut}</span>}
    </button>
  );
};

/**
 * Menu divider component
 */
const MenuDivider: React.FC = () => <div className="my-1 h-px bg-neutral-200" />;

/**
 * Clip Properties Modal
 * Displays detailed information about a clip
 */
type ClipPropertiesModalProps = {
  clipId: string;
  onClose: () => void;
};

const ClipPropertiesModal: React.FC<ClipPropertiesModalProps> = ({ clipId, onClose }) => {
  // Get clip data from store
  const clip = useClipData(clipId);

  if (!clip) {
    return null;
  }

  const duration = clip.end - clip.start;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Clip Properties</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <PropertyRow label="Clip ID" value={clip.id} />
          <PropertyRow label="Asset ID" value={clip.assetId} />
          <PropertyRow label="File Type" value={clip.mime} />

          <div className="my-3 h-px bg-neutral-200" />

          <PropertyRow label="Duration" value={formatTime(duration)} />
          <PropertyRow label="Timeline Position" value={formatTime(clip.timelinePosition)} />
          <PropertyRow label="Track" value={`Track ${clip.trackIndex + 1}`} />

          {clip.sourceDuration && (
            <>
              <PropertyRow label="Source Duration" value={formatTime(clip.sourceDuration)} />
              <PropertyRow label="Trim Start" value={formatTime(clip.start)} />
              <PropertyRow label="Trim End" value={formatTime(clip.end)} />
            </>
          )}

          <div className="my-3 h-px bg-neutral-200" />

          {clip.hasAudio !== undefined && (
            <PropertyRow label="Has Audio" value={clip.hasAudio ? 'Yes' : 'No'} />
          )}
          {clip.volume !== undefined && (
            <PropertyRow label="Volume" value={`${Math.round(clip.volume * 100)}%`} />
          )}
          {clip.muted !== undefined && (
            <PropertyRow label="Muted" value={clip.muted ? 'Yes' : 'No'} />
          )}
          {clip.opacity !== undefined && (
            <PropertyRow label="Opacity" value={`${Math.round(clip.opacity * 100)}%`} />
          )}
          {clip.speed !== undefined && clip.speed !== 1.0 && (
            <PropertyRow label="Speed" value={`${clip.speed}x`} />
          )}

          {clip.colorCorrection && (
            <>
              <div className="my-3 h-px bg-neutral-200" />
              <div className="font-medium text-neutral-700">Color Correction</div>
              <PropertyRow label="Brightness" value={`${clip.colorCorrection.brightness}%`} />
              <PropertyRow label="Contrast" value={`${clip.colorCorrection.contrast}%`} />
              <PropertyRow label="Saturation" value={`${clip.colorCorrection.saturation}%`} />
              <PropertyRow label="Hue" value={`${clip.colorCorrection.hue}°`} />
            </>
          )}

          {clip.transform && (
            <>
              <div className="my-3 h-px bg-neutral-200" />
              <div className="font-medium text-neutral-700">Transform</div>
              <PropertyRow label="Rotation" value={`${clip.transform.rotation}°`} />
              <PropertyRow label="Scale" value={`${Math.round(clip.transform.scale * 100)}%`} />
              {clip.transform.flipHorizontal && <PropertyRow label="Flip" value="Horizontal" />}
              {clip.transform.flipVertical && <PropertyRow label="Flip" value="Vertical" />}
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Property row component for modal
 */
type PropertyRowProps = {
  label: string;
  value: string;
};

const PropertyRow: React.FC<PropertyRowProps> = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-neutral-500">{label}:</span>
    <span className="text-neutral-900 font-medium">{value}</span>
  </div>
);

/**
 * Hook to get clip data from store
 */
function useClipData(clipId: string): Clip | null {
  const timeline = useEditorStore((state) => state.timeline);
  return timeline?.clips?.find((clip) => clip.id === clipId) ?? null;
}
