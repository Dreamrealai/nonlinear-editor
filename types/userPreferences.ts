/**
 * User Preferences Types
 *
 * Type definitions for user-customizable preferences including
 * keyboard shortcuts, UI settings, and editor configurations.
 */

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcutConfig {
  /** Unique identifier matching the shortcut ID */
  id: string;
  /** Array of keys that make up the shortcut (e.g., ['Meta', 'z']) */
  keys: string[];
  /** Whether this shortcut is enabled */
  enabled: boolean;
}

/**
 * User preferences stored in database
 */
export interface UserPreferences {
  /** User ID (foreign key to auth.users) */
  userId: string;
  /** Custom keyboard shortcuts configuration */
  keyboardShortcuts: KeyboardShortcutConfig[];
  /** When the preferences were created */
  createdAt?: string;
  /** When the preferences were last updated */
  updatedAt?: string;
}

/**
 * Default keyboard shortcuts available for customization
 */
export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcutConfig[] = [
  // General shortcuts
  { id: 'undo', keys: ['Meta', 'z'], enabled: true },
  { id: 'redo', keys: ['Meta', 'Shift', 'z'], enabled: true },
  { id: 'save', keys: ['Meta', 's'], enabled: true },

  // Editing shortcuts
  { id: 'copy', keys: ['Meta', 'c'], enabled: true },
  { id: 'paste', keys: ['Meta', 'v'], enabled: true },
  { id: 'cut', keys: ['Meta', 'x'], enabled: true },
  { id: 'delete', keys: ['Delete'], enabled: true },
  { id: 'selectAll', keys: ['Meta', 'a'], enabled: true },

  // Timeline shortcuts
  { id: 'splitClip', keys: ['s'], enabled: true },
  { id: 'toggleLock', keys: ['l'], enabled: true },
  { id: 'addTransition', keys: ['t'], enabled: true },

  // Playback shortcuts
  { id: 'playPause', keys: ['Space'], enabled: true },
  { id: 'stepForward', keys: ['ArrowRight'], enabled: true },
  { id: 'stepBackward', keys: ['ArrowLeft'], enabled: true },
  { id: 'jumpToStart', keys: ['Home'], enabled: true },
  { id: 'jumpToEnd', keys: ['End'], enabled: true },

  // Navigation shortcuts
  { id: 'zoomIn', keys: ['Meta', '='], enabled: true },
  { id: 'zoomOut', keys: ['Meta', '-'], enabled: true },
  { id: 'fitTimeline', keys: ['Meta', '0'], enabled: true },
];

/**
 * Shortcut metadata for display and categorization
 */
export interface ShortcutMetadata {
  id: string;
  label: string;
  description: string;
  category: 'general' | 'editing' | 'timeline' | 'playback' | 'navigation';
  allowCustomization: boolean;
}

/**
 * All available shortcuts with metadata
 */
export const SHORTCUT_METADATA: Record<string, ShortcutMetadata> = {
  // General
  undo: {
    id: 'undo',
    label: 'Undo',
    description: 'Undo the last action',
    category: 'general',
    allowCustomization: true,
  },
  redo: {
    id: 'redo',
    label: 'Redo',
    description: 'Redo the last undone action',
    category: 'general',
    allowCustomization: true,
  },
  save: {
    id: 'save',
    label: 'Save Project',
    description: 'Save the current project',
    category: 'general',
    allowCustomization: true,
  },

  // Editing
  copy: {
    id: 'copy',
    label: 'Copy',
    description: 'Copy selected clips',
    category: 'editing',
    allowCustomization: true,
  },
  paste: {
    id: 'paste',
    label: 'Paste',
    description: 'Paste copied clips',
    category: 'editing',
    allowCustomization: true,
  },
  cut: {
    id: 'cut',
    label: 'Cut',
    description: 'Cut selected clips',
    category: 'editing',
    allowCustomization: true,
  },
  delete: {
    id: 'delete',
    label: 'Delete',
    description: 'Delete selected clips',
    category: 'editing',
    allowCustomization: true,
  },
  selectAll: {
    id: 'selectAll',
    label: 'Select All',
    description: 'Select all clips in timeline',
    category: 'editing',
    allowCustomization: true,
  },

  // Timeline
  splitClip: {
    id: 'splitClip',
    label: 'Split Clip',
    description: 'Split clip at playhead position',
    category: 'timeline',
    allowCustomization: true,
  },
  toggleLock: {
    id: 'toggleLock',
    label: 'Toggle Lock',
    description: 'Lock/unlock selected clips',
    category: 'timeline',
    allowCustomization: true,
  },
  addTransition: {
    id: 'addTransition',
    label: 'Add Transition',
    description: 'Add transition to selected clips',
    category: 'timeline',
    allowCustomization: true,
  },

  // Playback
  playPause: {
    id: 'playPause',
    label: 'Play/Pause',
    description: 'Toggle playback',
    category: 'playback',
    allowCustomization: true,
  },
  stepForward: {
    id: 'stepForward',
    label: 'Step Forward',
    description: 'Step forward one frame',
    category: 'playback',
    allowCustomization: true,
  },
  stepBackward: {
    id: 'stepBackward',
    label: 'Step Backward',
    description: 'Step backward one frame',
    category: 'playback',
    allowCustomization: true,
  },
  jumpToStart: {
    id: 'jumpToStart',
    label: 'Jump to Start',
    description: 'Jump to timeline start',
    category: 'playback',
    allowCustomization: true,
  },
  jumpToEnd: {
    id: 'jumpToEnd',
    label: 'Jump to End',
    description: 'Jump to timeline end',
    category: 'playback',
    allowCustomization: true,
  },

  // Navigation
  zoomIn: {
    id: 'zoomIn',
    label: 'Zoom In',
    description: 'Zoom in on timeline',
    category: 'navigation',
    allowCustomization: true,
  },
  zoomOut: {
    id: 'zoomOut',
    label: 'Zoom Out',
    description: 'Zoom out on timeline',
    category: 'navigation',
    allowCustomization: true,
  },
  fitTimeline: {
    id: 'fitTimeline',
    label: 'Fit Timeline',
    description: 'Fit entire timeline in view',
    category: 'navigation',
    allowCustomization: true,
  },
};
