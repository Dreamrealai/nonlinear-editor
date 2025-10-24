/**
 * Edit Mode Types for Timeline Editing
 *
 * Defines different editing modes for professional video editing:
 * - Normal: Standard trim without affecting other clips
 * - Ripple: Trim and shift following clips to close/open gaps
 * - Roll: Adjust boundary between two adjacent clips
 * - Slip: Change in/out points without changing position or duration
 * - Slide: Move clip without changing duration, adjusting adjacent clips
 */

/**
 * Edit modes supported by the timeline editor
 */
export type EditMode =
  | 'normal'    // Standard trim - affects only the selected clip
  | 'ripple'    // Trim and ripple - moves all following clips on the same track
  | 'roll'      // Roll edit - adjusts boundary between two adjacent clips
  | 'slip'      // Slip edit - changes in/out points without moving timeline position
  | 'slide';    // Slide edit - moves clip, adjusting adjacent clips' durations

/**
 * Keyboard modifiers that change edit mode behavior
 */
export type EditModeModifiers = {
  shift: boolean;   // Enables ripple mode
  alt: boolean;     // Enables roll mode
  cmd: boolean;     // Enables slip mode
  ctrl: boolean;    // Alternative for cmd on non-Mac
};

/**
 * Information about a trim operation for different edit modes
 */
export type TrimOperation = {
  clipId: string;
  handle: 'left' | 'right';
  editMode: EditMode;
  modifiers: EditModeModifiers;

  // Original state
  originalStart: number;
  originalEnd: number;
  originalPosition: number;

  // New state (what will be applied)
  newStart: number;
  newEnd: number;
  newPosition: number;

  // Affected clips (for ripple/roll/slide modes)
  affectedClips?: Array<{
    clipId: string;
    originalPosition: number;
    newPosition: number;
    originalStart?: number;
    originalEnd?: number;
    newStart?: number;
    newEnd?: number;
  }>;
};

/**
 * Visual feedback info for trim operations
 */
export type TrimFeedback = {
  mode: EditMode;
  primaryClip: {
    id: string;
    originalDuration: number;
    newDuration: number;
    deltaTime: number;
  };
  affectedClipsCount: number;
  description: string;
};
