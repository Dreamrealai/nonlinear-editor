/**
 * Asset Constants
 *
 * Centralized constants for asset management including:
 * - Thumbnail generation
 * - Asset validation
 * - Storage limits
 */

// Thumbnail constants
export const THUMBNAIL_CONSTANTS = {
  /** Maximum width for generated thumbnails in pixels */
  THUMBNAIL_WIDTH: 320,
  /** JPEG quality for thumbnails (0-1) */
  THUMBNAIL_QUALITY: 0.8,
} as const;

// Asset upload constants
export const ASSET_UPLOAD_CONSTANTS = {
  /** Maximum file size for uploads in bytes (100MB) */
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  /** Supported video formats */
  SUPPORTED_VIDEO_FORMATS: ['.mp4', '.mov', '.avi', '.webm'] as const,
  /** Supported audio formats */
  SUPPORTED_AUDIO_FORMATS: ['.mp3', '.wav', '.aac', '.m4a'] as const,
  /** Supported image formats */
  SUPPORTED_IMAGE_FORMATS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'] as const,
} as const;

// Asset pagination constants
export const ASSET_PAGINATION_CONSTANTS = {
  /** Default page size for asset listings */
  DEFAULT_PAGE_SIZE: 50,
  /** Maximum page size for asset listings */
  MAX_PAGE_SIZE: 100,
} as const;
