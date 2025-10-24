export type TransitionType = 'none' | 'crossfade' | 'fade-in' | 'fade-out' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'wipe-left' | 'wipe-right' | 'zoom-in' | 'zoom-out';

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

export type VideoEffects = {
  brightness: number; // 0-200, default 100 (100 = no change)
  contrast: number;   // 0-200, default 100 (100 = no change)
  saturation: number; // 0-200, default 100 (100 = no change)
  hue: number;        // 0-360, default 0 (degrees rotation)
  blur: number;       // 0-20 pixels, default 0 (no blur)
};

// Keep ColorCorrection as an alias for backward compatibility
export type ColorCorrection = VideoEffects;

export type Transform = {
  rotation: number;       // 0-360, default 0 (degrees)
  flipHorizontal: boolean; // default false
  flipVertical: boolean;   // default false
  scale: number;          // 0.1-3, default 1.0
};

export type AudioEffects = {
  // Volume
  volume: number;        // -60 to +12 dB, default 0 (0 dB = 100%, no change)
  mute: boolean;         // Mute flag, default false

  // Fades
  fadeIn: number;        // Fade in duration in seconds, default 0
  fadeOut: number;       // Fade out duration in seconds, default 0

  // 3-band EQ (equalizer)
  bassGain: number;      // -12 to +12 dB, default 0 (100-400 Hz)
  midGain: number;       // -12 to +12 dB, default 0 (400-4000 Hz)
  trebleGain: number;    // -12 to +12 dB, default 0 (4000+ Hz)

  // Dynamics
  compression: number;   // 0-100, default 0 (0 = no compression, 100 = heavy)
  normalize: boolean;    // Auto-normalize to -3dB peak, default false
};

export type Clip = {
  id: string;
  assetId: string;
  filePath: string;
  mime: string;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  start: number; // Trim start (seconds into source media)
  end: number; // Trim end (seconds into source media)
  sourceDuration?: number | null; // Full length of source media in seconds
  timelinePosition: number; // Position on timeline (seconds from timeline start)
  trackIndex: number; // Track number (0 = top track in stack, higher numbers render underneath)
  crop: CropRect;
  transitionToNext?: { type: TransitionType; duration: number };
  hasAudio?: boolean; // Optional flag indicating whether source media includes an audio stream
  volume?: number; // Clip volume (0-2, default 1.0)
  opacity?: number; // Clip opacity (0-1, default 1.0)
  muted?: boolean; // Clip muted flag (default false)
  speed?: number; // Playback speed multiplier (0.25-4, default 1.0)
  colorCorrection?: ColorCorrection; // Color correction settings
  transform?: Transform; // Transform settings (rotation, flip, scale)
  audioEffects?: AudioEffects; // Audio effects (EQ, compression, normalization)
  locked?: boolean; // Clip locked flag (prevents moving/editing, default false)
  groupId?: string; // Group ID if this clip belongs to a group (default undefined)
  color?: string; // Clip label color for visual organization (hex color, default undefined)
};

export type ClipGroup = {
  id: string;
  name?: string; // Optional custom name for the group
  clipIds: string[]; // Array of clip IDs in this group
  color?: string; // Optional color for visual indication (hex color)
  locked?: boolean; // Group locked flag (locks all clips in group)
  created_at?: number; // Timestamp when group was created
};

export type OutputSpec = {
  width: number;
  height: number;
  fps: number;
  vBitrateK: number;
  aBitrateK: number;
  format: 'mp4' | 'webm';
};

export type Track = {
  id: string;
  index: number; // Track number (0 = top)
  name: string; // Display name
  type: 'video' | 'audio'; // Track type
  muted?: boolean; // Track muted (affects all clips)
  solo?: boolean; // Track solo (mutes all other tracks)
  locked?: boolean; // Track locked (prevents editing)
  height?: number; // Custom track height in pixels
};

export type Marker = {
  id: string;
  time: number; // Position in seconds
  label: string; // Marker name/description
  color?: string; // Hex color (e.g., '#000000')
};

export type Guide = {
  id: string;
  position: number; // Position in seconds (for vertical guides) or track index (for horizontal guides)
  orientation: 'vertical' | 'horizontal'; // Guide direction
  color?: string; // Hex color (default: '#3b82f6' - blue)
  visible?: boolean; // Whether guide is visible (default: true)
  label?: string; // Optional label for the guide
};

// Animation types for text overlays
export type TextAnimationType =
  | 'none'
  | 'fade-in'
  | 'fade-out'
  | 'fade-in-out'
  | 'slide-in-left'
  | 'slide-in-right'
  | 'slide-in-top'
  | 'slide-in-bottom'
  | 'slide-out-left'
  | 'slide-out-right'
  | 'slide-out-top'
  | 'slide-out-bottom'
  | 'scale-in'
  | 'scale-out'
  | 'scale-pulse'
  | 'rotate-in'
  | 'rotate-out'
  | 'bounce-in'
  | 'typewriter';

// Easing function types
export type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-quad'
  | 'ease-out-quad'
  | 'ease-in-out-quad'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'ease-in-out-cubic'
  | 'bounce';

// Animation configuration
export type TextAnimation = {
  type: TextAnimationType;
  duration: number; // Animation duration in seconds (default: 0.5)
  delay: number; // Delay before animation starts in seconds (default: 0)
  easing: EasingFunction; // Easing function (default: 'ease-out')
  repeat: number; // Number of times to repeat (0 = no repeat, -1 = infinite)
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'; // Animation direction
};

export type TextOverlay = {
  id: string;
  text: string;
  timelinePosition: number; // Start time in seconds
  duration: number; // How long the text appears (seconds)
  x: number; // X position (0-100, percentage of video width)
  y: number; // Y position (0-100, percentage of video height)
  fontSize?: number; // Font size in pixels (default 24)
  color?: string; // Text color (default white)
  backgroundColor?: string; // Background color (default transparent)
  fontFamily?: string; // Font family (default sans-serif)
  align?: 'left' | 'center' | 'right'; // Text alignment (default center)
  opacity?: number; // Text opacity (0-1, default 1.0)
  animation?: TextAnimation; // Animation configuration (default: none)
};

export type Timeline = {
  projectId: string;
  clips: Clip[];
  output: OutputSpec;
  tracks?: Track[]; // Track configurations
  markers?: Marker[]; // Timeline markers
  textOverlays?: TextOverlay[]; // Text overlays
  groups?: ClipGroup[]; // Clip groups for organizing related clips
  guides?: Guide[]; // Timeline guides for alignment
};
