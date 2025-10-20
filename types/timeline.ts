export type TransitionType = 'none' | 'crossfade' | 'fade-in' | 'fade-out';

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

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
  color?: string; // Hex color (e.g., '#ff0000')
};

export type Timeline = {
  projectId: string;
  clips: Clip[];
  output: OutputSpec;
  tracks?: Track[]; // Track configurations
  markers?: Marker[]; // Timeline markers
};
