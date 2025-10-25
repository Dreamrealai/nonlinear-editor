/**
 * Export Preset Types
 *
 * Types for export preset system including platform-specific and custom presets
 */

export type PlatformType =
  | 'youtube_1080p'
  | 'youtube_4k'
  | 'youtube_shorts'
  | 'instagram_feed'
  | 'instagram_story'
  | 'instagram_reel'
  | 'tiktok'
  | 'twitter'
  | 'facebook'
  | 'linkedin'
  | 'custom';

export type VideoFormat = 'mp4' | 'webm' | 'mov' | 'avi';
export type VideoCodec = 'h264' | 'h265' | 'vp8' | 'vp9' | 'av1';
export type AudioCodec = 'aac' | 'mp3' | 'opus' | 'vorbis';

export interface ExportPresetSettings {
  width: number;
  height: number;
  fps: number;
  vBitrateK: number; // Video bitrate in Kbps
  aBitrateK: number; // Audio bitrate in Kbps
  format: VideoFormat;
  codec?: VideoCodec;
  audioCodec?: AudioCodec;
}

export interface ExportPreset {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_custom: boolean;
  is_platform: boolean;
  platform_type?: PlatformType;
  settings: ExportPresetSettings;
  created_at: string;
  updated_at: string;
}

export interface CreateExportPresetInput {
  name: string;
  description?: string;
  settings: ExportPresetSettings;
}

export interface UpdateExportPresetInput {
  name?: string;
  description?: string;
  settings?: ExportPresetSettings;
}

/**
 * Platform-specific export preset configurations
 */
export const PLATFORM_PRESETS: Record<
  PlatformType,
  Omit<ExportPreset, 'id' | 'user_id' | 'created_at' | 'updated_at'>
> = {
  youtube_1080p: {
    name: 'YouTube 1080p',
    description: 'Full HD for YouTube (1920x1080, 30fps)',
    is_custom: false,
    is_platform: true,
    platform_type: 'youtube_1080p',
    settings: {
      width: 1920,
      height: 1080,
      fps: 30,
      vBitrateK: 8000,
      aBitrateK: 192,
      format: 'mp4',
      codec: 'h264',
    },
  },
  youtube_4k: {
    name: 'YouTube 4K',
    description: 'Ultra HD for YouTube (3840x2160, 60fps)',
    is_custom: false,
    is_platform: true,
    platform_type: 'youtube_4k',
    settings: {
      width: 3840,
      height: 2160,
      fps: 60,
      vBitrateK: 35000,
      aBitrateK: 320,
      format: 'mp4',
      codec: 'h264',
    },
  },
  youtube_shorts: {
    name: 'YouTube Shorts',
    description: 'Vertical video for YouTube Shorts (1080x1920, 30fps)',
    is_custom: false,
    is_platform: true,
    platform_type: 'youtube_shorts',
    settings: {
      width: 1080,
      height: 1920,
      fps: 30,
      vBitrateK: 5000,
      aBitrateK: 192,
      format: 'mp4',
      codec: 'h264',
    },
  },
  instagram_feed: {
    name: 'Instagram Feed',
    description: 'Square video for Instagram Feed (1080x1080, 30fps)',
    is_custom: false,
    is_platform: true,
    platform_type: 'instagram_feed',
    settings: {
      width: 1080,
      height: 1080,
      fps: 30,
      vBitrateK: 5000,
      aBitrateK: 128,
      format: 'mp4',
      codec: 'h264',
    },
  },
  instagram_story: {
    name: 'Instagram Story',
    description: 'Vertical video for Instagram Stories (1080x1920, 30fps)',
    is_custom: false,
    is_platform: true,
    platform_type: 'instagram_story',
    settings: {
      width: 1080,
      height: 1920,
      fps: 30,
      vBitrateK: 5000,
      aBitrateK: 128,
      format: 'mp4',
      codec: 'h264',
    },
  },
  instagram_reel: {
    name: 'Instagram Reel',
    description: 'Vertical video for Instagram Reels (1080x1920, 30fps)',
    is_custom: false,
    is_platform: true,
    platform_type: 'instagram_reel',
    settings: {
      width: 1080,
      height: 1920,
      fps: 30,
      vBitrateK: 5000,
      aBitrateK: 128,
      format: 'mp4',
      codec: 'h264',
    },
  },
  tiktok: {
    name: 'TikTok',
    description: 'Vertical video for TikTok (1080x1920, 30fps)',
    is_custom: false,
    is_platform: true,
    platform_type: 'tiktok',
    settings: {
      width: 1080,
      height: 1920,
      fps: 30,
      vBitrateK: 5000,
      aBitrateK: 128,
      format: 'mp4',
      codec: 'h264',
    },
  },
  twitter: {
    name: 'Twitter',
    description: 'Optimized for Twitter (1280x720, 30fps)',
    is_custom: false,
    is_platform: true,
    platform_type: 'twitter',
    settings: {
      width: 1280,
      height: 720,
      fps: 30,
      vBitrateK: 5000,
      aBitrateK: 128,
      format: 'mp4',
      codec: 'h264',
    },
  },
  facebook: {
    name: 'Facebook',
    description: 'Optimized for Facebook (1920x1080, 30fps)',
    is_custom: false,
    is_platform: true,
    platform_type: 'facebook',
    settings: {
      width: 1920,
      height: 1080,
      fps: 30,
      vBitrateK: 5000,
      aBitrateK: 192,
      format: 'mp4',
      codec: 'h264',
    },
  },
  linkedin: {
    name: 'LinkedIn',
    description: 'Professional video for LinkedIn (1920x1080, 30fps)',
    is_custom: false,
    is_platform: true,
    platform_type: 'linkedin',
    settings: {
      width: 1920,
      height: 1080,
      fps: 30,
      vBitrateK: 5000,
      aBitrateK: 192,
      format: 'mp4',
      codec: 'h264',
    },
  },
  custom: {
    name: 'Custom',
    description: 'Custom export settings',
    is_custom: true,
    is_platform: false,
    platform_type: 'custom',
    settings: {
      width: 1920,
      height: 1080,
      fps: 30,
      vBitrateK: 8000,
      aBitrateK: 192,
      format: 'mp4',
      codec: 'h264',
    },
  },
};
