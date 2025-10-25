'use client';

import {
  Copy,
  Clipboard,
  Trash2,
  Files,
  Info,
  Volume2,
  Film,
  Music,
  Lock,
  Unlock,
  Zap,
  Users,
  Ungroup,
  Palette,
  RotateCw,
  Gauge,
  VolumeX,
  Volume1,
  FastForward,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  Tag,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Clip, Timeline } from '@/types/timeline';
import { formatTimeMMSSCS } from '@/lib/utils/timeFormatting';
import { CLIP_COLORS } from '@/lib/constants/clipColors';

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
  onAddTransition?: (clipId: string) => void;
  onSelectAllInTrack?: (trackIndex: number) => void;
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
  onAddTransition,
  onSelectAllInTrack,
  onClose,
}): React.ReactElement => {
  const [showProperties, setShowProperties] = useState(false);
  const [showColorSubmenu, setShowColorSubmenu] = useState(false);
  const toggleClipLock = useEditorStore((state): ((id: string) => void) => state.toggleClipLock);
  const groupSelectedClips = useEditorStore(
    (state): ((name?: string) => void) => state.groupSelectedClips
  );
  const ungroupClips = useEditorStore((state): ((groupId: string) => void) => state.ungroupClips);
  const getClipGroupId = useEditorStore(
    (state): ((clipId: string) => string | null) => state.getClipGroupId
  );
  const selectedClipIds = useEditorStore((state): Set<string> => state.selectedClipIds);
  const updateClip = useEditorStore(
    (state): ((id: string, patch: Partial<Clip>) => void) => state.updateClip
  );
  const updateClipColor = useEditorStore(
    (state): ((id: string, color: string | null) => void) => state.updateClipColor
  );
  const clip = useClipData(clipId);
  const isLocked = clip?.locked ?? false;
  const groupId = getClipGroupId(clipId);
  const isGrouped = Boolean(groupId);
  const canGroup = selectedClipIds.size >= 2;
  const isMuted = clip?.muted ?? false;
  const hasAudio = clip?.hasAudio ?? false;
  const currentColor = clip?.color;

  // Detect if Mac for keyboard shortcuts
  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  return (
    <>
      <button
        className="fixed z-50 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg py-1 min-w-[220px] max-h-[80vh] overflow-y-auto text-left w-auto"
        style={{ left: x, top: y }}
        onClick={(e): void => e.stopPropagation()}
        onKeyDown={(e): void => {
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
          onClick={(): void => {
            onCopy();
            onClose();
          }}
        />
        <MenuButton
          icon={<Clipboard className="h-4 w-4" />}
          label="Paste"
          shortcut={`${cmdKey}V`}
          onClick={(): void => {
            onPaste();
            onClose();
          }}
        />
        {onDuplicate && (
          <MenuButton
            icon={<Files className="h-4 w-4" />}
            label="Duplicate"
            shortcut={`${cmdKey}D`}
            onClick={(): void => {
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
            onClick={(): void => {
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
            onClick={(): void => {
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
            onClick={(): void => {
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
              onClick={(): void => {
                onGenerateAudio(clipId);
                onClose();
              }}
            />
          </>
        )}

        {/* Transition */}
        {onAddTransition && (
          <>
            <MenuDivider />
            <MenuButton
              icon={<Zap className="h-4 w-4" />}
              label="Add Transition"
              shortcut="T"
              onClick={(): void => {
                onAddTransition(clipId);
                onClose();
              }}
            />
          </>
        )}

        {/* Effects Section */}
        <MenuDivider />
        <MenuSectionHeader label="Effects" />
        <MenuButton
          icon={<Palette className="h-4 w-4" />}
          label="Color Correction"
          onClick={(): void => {
            // Reset to default color correction
            updateClip(clipId, {
              colorCorrection: {
                brightness: 100,
                contrast: 100,
                saturation: 100,
                hue: 0,
                blur: 0,
              },
            });
            onClose();
          }}
        />
        <MenuButton
          icon={<RotateCw className="h-4 w-4" />}
          label="Reset Transform"
          onClick={(): void => {
            // Reset rotation and scale
            updateClip(clipId, {
              transform: {
                rotation: 0,
                flipHorizontal: false,
                flipVertical: false,
                scale: 1.0,
              },
            });
            onClose();
          }}
        />
        <MenuButton
          icon={<FlipHorizontal className="h-4 w-4" />}
          label="Flip Horizontal"
          onClick={(): void => {
            const currentTransform = clip?.transform ?? {
              rotation: 0,
              flipHorizontal: false,
              flipVertical: false,
              scale: 1.0,
            };
            updateClip(clipId, {
              transform: {
                ...currentTransform,
                flipHorizontal: !currentTransform.flipHorizontal,
              },
            });
            onClose();
          }}
        />
        <MenuButton
          icon={<FlipVertical className="h-4 w-4" />}
          label="Flip Vertical"
          onClick={(): void => {
            const currentTransform = clip?.transform ?? {
              rotation: 0,
              flipHorizontal: false,
              flipVertical: false,
              scale: 1.0,
            };
            updateClip(clipId, {
              transform: {
                ...currentTransform,
                flipVertical: !currentTransform.flipVertical,
              },
            });
            onClose();
          }}
        />

        {/* Speed Control Section */}
        <MenuDivider />
        <MenuSectionHeader label="Speed" />
        <MenuButton
          icon={<FastForward className="h-4 w-4" />}
          label="0.5x Speed"
          onClick={(): void => {
            updateClip(clipId, { speed: 0.5 });
            onClose();
          }}
        />
        <MenuButton
          icon={<FastForward className="h-4 w-4" />}
          label="1.0x Speed (Normal)"
          onClick={(): void => {
            updateClip(clipId, { speed: 1.0 });
            onClose();
          }}
        />
        <MenuButton
          icon={<FastForward className="h-4 w-4" />}
          label="2.0x Speed"
          onClick={(): void => {
            updateClip(clipId, { speed: 2.0 });
            onClose();
          }}
        />

        {/* Audio Section */}
        {hasAudio && (
          <>
            <MenuDivider />
            <MenuSectionHeader label="Audio" />
            <MenuButton
              icon={isMuted ? <Volume1 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              label={isMuted ? 'Unmute' : 'Mute'}
              shortcut="M"
              onClick={(): void => {
                updateClip(clipId, { muted: !isMuted });
                onClose();
              }}
            />
            <MenuButton
              icon={<Volume2 className="h-4 w-4" />}
              label="Reset Volume"
              onClick={(): void => {
                updateClip(clipId, { volume: 1.0 });
                onClose();
              }}
            />
            <MenuButton
              icon={<Gauge className="h-4 w-4" />}
              label="Reset Audio Effects"
              onClick={(): void => {
                updateClip(clipId, {
                  audioEffects: {
                    volume: 1.0,
                    mute: false,
                    fadeIn: 0,
                    fadeOut: 0,
                    bassGain: 0,
                    midGain: 0,
                    trebleGain: 0,
                    compression: 0,
                    normalize: false,
                  },
                });
                onClose();
              }}
            />
          </>
        )}

        {/* Scale/Zoom Section */}
        <MenuDivider />
        <MenuSectionHeader label="Scale" />
        <MenuButton
          icon={<Maximize2 className="h-4 w-4" />}
          label="Fit to Frame"
          onClick={(): void => {
            updateClip(clipId, {
              transform: {
                ...(clip?.transform ?? {
                  rotation: 0,
                  flipHorizontal: false,
                  flipVertical: false,
                  scale: 1.0,
                }),
                scale: 1.0,
              },
            });
            onClose();
          }}
        />
        <MenuButton
          icon={<Maximize2 className="h-4 w-4" />}
          label="Scale 1.5x"
          onClick={(): void => {
            updateClip(clipId, {
              transform: {
                ...(clip?.transform ?? {
                  rotation: 0,
                  flipHorizontal: false,
                  flipVertical: false,
                  scale: 1.0,
                }),
                scale: 1.5,
              },
            });
            onClose();
          }}
        />

        {/* Lock/Unlock */}
        <MenuDivider />
        <MenuButton
          icon={isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          label={isLocked ? 'Unlock Clip' : 'Lock Clip'}
          shortcut="L"
          onClick={(): void => {
            toggleClipLock(clipId);
            onClose();
          }}
        />

        {/* Group/Ungroup */}
        <MenuDivider />
        {canGroup && !isGrouped && (
          <MenuButton
            icon={<Users className="h-4 w-4" />}
            label="Group Selected Clips"
            shortcut="G"
            onClick={(): void => {
              groupSelectedClips();
              onClose();
            }}
          />
        )}
        {isGrouped && groupId && (
          <MenuButton
            icon={<Ungroup className="h-4 w-4" />}
            label="Ungroup"
            shortcut="Shift+G"
            onClick={(): void => {
              ungroupClips(groupId);
              onClose();
            }}
          />
        )}

        {/* Color Label */}
        <MenuDivider />
        <MenuSectionHeader label="Color Label" />
        <div className="relative">
          <MenuButton
            icon={<Tag className="h-4 w-4" />}
            label={currentColor ? 'Change Color' : 'Set Color'}
            onClick={(): void => {
              setShowColorSubmenu(!showColorSubmenu);
            }}
          />
          {showColorSubmenu && (
            <div className="absolute left-full top-0 ml-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg p-2 min-w-[180px] z-50">
              <div className="grid grid-cols-4 gap-2 mb-2">
                {/*
                  Key strategy: Use color name as key since it's unique in CLIP_COLORS object.
                  The name property is guaranteed unique by the object structure.
                */}
                {Object.entries(CLIP_COLORS).map(([name, hex]) => (
                  <button
                    key={`color-${name}`}
                    className={`w-10 h-10 rounded border-2 transition-all hover:scale-110 ${
                      currentColor === hex
                        ? 'border-white ring-2 ring-offset-2 ring-offset-neutral-100 dark:ring-offset-neutral-800 ring-blue-500'
                        : 'border-neutral-300 dark:border-neutral-600'
                    }`}
                    style={{ backgroundColor: hex }}
                    onClick={(): void => {
                      updateClipColor(clipId, hex);
                      setShowColorSubmenu(false);
                      onClose();
                    }}
                    title={name.charAt(0).toUpperCase() + name.slice(1)}
                    aria-label={`Set color to ${name}`}
                  />
                ))}
              </div>
              {currentColor && (
                <>
                  <div className="my-2 h-px bg-neutral-200 dark:bg-neutral-700" />
                  <button
                    className="w-full px-3 py-2 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors flex items-center gap-2"
                    onClick={(): void => {
                      updateClipColor(clipId, null);
                      setShowColorSubmenu(false);
                      onClose();
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span>Clear Color</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Selection */}
        {onSelectAllInTrack && clip && (
          <>
            <MenuDivider />
            <MenuButton
              icon={<Users className="h-4 w-4" />}
              label={`Select All in Track ${clip.trackIndex + 1}`}
              onClick={(): void => {
                onSelectAllInTrack(clip.trackIndex);
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
          onClick={(): void => {
            setShowProperties(true);
          }}
        />
      </button>

      {/* Properties Modal */}
      {showProperties && (
        <ClipPropertiesModal
          clipId={clipId}
          onClose={(): void => {
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
}): React.ReactElement => {
  const variantClasses =
    variant === 'danger'
      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950'
      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700';

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
      {shortcut && (
        <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">{shortcut}</span>
      )}
    </button>
  );
};

/**
 * Menu divider component
 */
const MenuDivider: React.FC = (): React.ReactElement => (
  <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />
);

/**
 * Menu section header component
 * Used to organize menu items into labeled sections
 */
type MenuSectionHeaderProps = {
  label: string;
};

const MenuSectionHeader: React.FC<MenuSectionHeaderProps> = ({ label }): React.ReactElement => (
  <div className="px-4 py-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
    {label}
  </div>
);

/**
 * Clip Properties Modal
 * Displays detailed information about a clip
 */
type ClipPropertiesModalProps = {
  clipId: string;
  onClose: () => void;
};

const ClipPropertiesModal: React.FC<ClipPropertiesModalProps> = ({
  clipId,
  onClose,
}): React.ReactElement | null => {
  // Get clip data from store
  const clip = useClipData(clipId);

  if (!clip) {
    return null;
  }

  const duration = clip.end - clip.start;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={(e): void => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Close clip properties dialog"
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clip-properties-title"
        onClick={(e): void => e.stopPropagation()}
        onKeyDown={(e): void => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="clip-properties-title" className="text-lg font-semibold text-neutral-900">
            Clip Properties
          </h2>
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

          <div className="my-3 h-px bg-neutral-200 dark:bg-neutral-700" />

          <PropertyRow label="Duration" value={formatTimeMMSSCS(duration)} />
          <PropertyRow label="Timeline Position" value={formatTimeMMSSCS(clip.timelinePosition)} />
          <PropertyRow label="Track" value={`Track ${clip.trackIndex + 1}`} />
          <PropertyRow label="Locked" value={clip.locked ? 'Yes' : 'No'} />

          {clip.sourceDuration && (
            <>
              <PropertyRow label="Source Duration" value={formatTimeMMSSCS(clip.sourceDuration)} />
              <PropertyRow label="Trim Start" value={formatTimeMMSSCS(clip.start)} />
              <PropertyRow label="Trim End" value={formatTimeMMSSCS(clip.end)} />
            </>
          )}

          <div className="my-3 h-px bg-neutral-200 dark:bg-neutral-700" />

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
              <div className="my-3 h-px bg-neutral-200 dark:bg-neutral-700" />
              <div className="font-medium text-neutral-700 dark:text-neutral-300">
                Color Correction
              </div>
              <PropertyRow label="Brightness" value={`${clip.colorCorrection.brightness}%`} />
              <PropertyRow label="Contrast" value={`${clip.colorCorrection.contrast}%`} />
              <PropertyRow label="Saturation" value={`${clip.colorCorrection.saturation}%`} />
              <PropertyRow label="Hue" value={`${clip.colorCorrection.hue}°`} />
            </>
          )}

          {clip.transform && (
            <>
              <div className="my-3 h-px bg-neutral-200 dark:bg-neutral-700" />
              <div className="font-medium text-neutral-700 dark:text-neutral-300">Transform</div>
              <PropertyRow label="Rotation" value={`${clip.transform.rotation}°`} />
              <PropertyRow label="Scale" value={`${Math.round(clip.transform.scale * 100)}%`} />
              {clip.transform.flipHorizontal && <PropertyRow label="Flip" value="Horizontal" />}
              {clip.transform.flipVertical && <PropertyRow label="Flip" value="Vertical" />}
            </>
          )}

          {clip.transitionToNext && clip.transitionToNext.type !== 'none' && (
            <>
              <div className="my-3 h-px bg-neutral-200 dark:bg-neutral-700" />
              <div className="font-medium text-neutral-700 dark:text-neutral-300">Transition</div>
              <PropertyRow label="Type" value={clip.transitionToNext.type} />
              <PropertyRow
                label="Duration"
                value={`${clip.transitionToNext.duration.toFixed(2)}s`}
              />
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 dark:bg-neutral-700 text-white rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-600 transition-colors text-sm font-medium"
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

const PropertyRow: React.FC<PropertyRowProps> = ({ label, value }): React.ReactElement => (
  <div className="flex justify-between">
    <span className="text-neutral-500 dark:text-neutral-400">{label}:</span>
    <span className="text-neutral-900 dark:text-neutral-100 font-medium">{value}</span>
  </div>
);

/**
 * Hook to get clip data from store
 */
function useClipData(clipId: string): Clip | null {
  const timeline = useEditorStore((state): Timeline | null => state.timeline);
  return timeline?.clips?.find((clip): boolean => clip.id === clipId) ?? null;
}
