/**
 * Asset Type Definitions
 *
 * Centralized type definitions for assets to prevent duplication
 * and ensure consistency across the codebase.
 */

/**
 * Asset metadata structure with specific known fields
 */
export interface AssetMetadata {
  filename?: string;
  mimeType?: string;
  thumbnail?: string;
  sourceUrl?: string;
  /** Legacy snake_case support */
  source_url?: string;
  duration?: number;
  durationSeconds?: number;
  /** Legacy snake_case support */
  duration_seconds?: number;
  width?: number;
  height?: number;
  originalName?: string;
  fileSize?: number;
  generatedBy?: string;
  prompt?: string;
  model?: string;
  format?: string;
  videoCodec?: string;
  audioCodec?: string;
  bitrate?: number;
  project_id?: string;
  [key: string]: unknown; // Allow additional fields for extensibility
}

export type RawAssetMetadata = Record<string, unknown>;

/**
 * Base asset row from database
 * Used by keyframe hooks and frame utilities
 */
export interface BaseAssetRow {
  id: string;
  title?: string | null;
  storage_url: string;
  metadata: RawAssetMetadata | null;
}

/**
 * Complete asset row with all fields
 * Used by AssetPanel and editor components
 */
export interface AssetRow {
  id: string;
  storage_url: string;
  duration_seconds: number | null;
  metadata: AssetMetadata | null;
  rawMetadata: RawAssetMetadata | null;
  created_at: string | null;
  type: 'video' | 'audio' | 'image';
  title?: string | null;
  /** User-defined tags for organization */
  tags?: string[];
  /** Number of times asset has been used in timelines */
  usage_count?: number;
  /** Last time asset was added to a timeline */
  last_used_at?: string | null;
  /** Whether user has favorited this asset */
  is_favorite?: boolean;
  /** Last update timestamp */
  updated_at?: string | null;
}

/**
 * Type guard to check if an object is a full AssetRow
 */
export function isAssetRow(obj: unknown): obj is AssetRow {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'storage_url' in obj &&
    typeof (obj as AssetRow).id === 'string' &&
    typeof (obj as AssetRow).storage_url === 'string' &&
    'type' in obj &&
    ['video', 'audio', 'image'].includes((obj as AssetRow).type)
  );
}
