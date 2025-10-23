export type TransitionType = 'none' | 'crossfade' | 'fade-in' | 'fade-out' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'wipe-left' | 'wipe-right' | 'zoom-in' | 'zoom-out';

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

export type ColorCorrection = {
  brightness: number; // 0-200, default 100 (100 = no change)
  contrast: number;   // 0-200, default 100 (100 = no change)
  saturation: number; // 0-200, default 100 (100 = no change)
  hue: number;        // 0-360, default 0 (degrees rotation)
};

export type Transform = {
  rotation: number;       // 0-360, default 0 (degrees)
  flipHorizontal: boolean; // default false
  flipVertical: boolean;   // default false
  scale: number;          // 0.1-3, default 1.0
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
};

export type Timeline = {
  projectId: string;
  clips: Clip[];
  output: OutputSpec;
  tracks?: Track[]; // Track configurations
  markers?: Marker[]; // Timeline markers
  textOverlays?: TextOverlay[]; // Text overlays
};
