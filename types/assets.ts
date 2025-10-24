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
  duration?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  originalName?: string;
  fileSize?: number;
  generatedBy?: string;
  prompt?: string;
  model?: string;
  [key: string]: unknown; // Allow additional fields for extensibility
}

/**
 * Base asset row from database
 * Used by keyframe hooks and frame utilities
 */
export interface BaseAssetRow {
  id: string;
  title?: string | null;
  storage_url: string;
  metadata: AssetMetadata | null;
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
  rawMetadata: AssetMetadata | null;
  created_at: string | null;
  type: 'video' | 'audio' | 'image';
  title?: string | null;
}

/**
 * Type guard to check if an object is a BaseAssetRow
 */
export function isBaseAssetRow(obj: unknown): obj is BaseAssetRow {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'storage_url' in obj &&
    typeof (obj as BaseAssetRow).id === 'string' &&
    typeof (obj as BaseAssetRow).storage_url === 'string'
  );
}

/**
 * Type guard to check if an object is a full AssetRow
 */
export function isAssetRow(obj: unknown): obj is AssetRow {
  return (
    isBaseAssetRow(obj) &&
    'type' in obj &&
    ['video', 'audio', 'image'].includes((obj as AssetRow).type)
  );
}

/**
 * Convert BaseAssetRow to AssetRow format
 * Used when upgrading from simplified to full asset representation
 */
export function baseAssetToAssetRow(
  base: BaseAssetRow,
  type: AssetRow['type'],
  durationSeconds?: number | null,
  createdAt?: string | null
): AssetRow {
  return {
    id: base.id,
    storage_url: base.storage_url,
    duration_seconds: durationSeconds ?? null,
    metadata: base.metadata as AssetMetadata | null,
    rawMetadata: base.metadata,
    created_at: createdAt ?? null,
    type,
    title: base.title,
  };
}
