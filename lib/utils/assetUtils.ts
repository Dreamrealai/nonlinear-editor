/**
 * Asset Utilities
 *
 * Shared utilities for asset management including validation,
 * type checking, and data transformation.
 */

import type { AssetMetadata, AssetRow } from '@/components/editor/AssetPanel';
import { ensureHttpsProtocol } from '@/lib/supabase';
import { CLIP_CONSTANTS, THUMBNAIL_CONSTANTS } from '@/lib/constants';

/** Minimum duration for a clip in seconds */
export const MIN_CLIP_DURATION = CLIP_CONSTANTS.MIN_CLIP_DURATION;

/** Maximum width for generated thumbnails in pixels */
export const THUMBNAIL_WIDTH = THUMBNAIL_CONSTANTS.THUMBNAIL_WIDTH;

/**
 * Safely converts unknown values to a number representing duration in seconds.
 */
export const coerceDuration = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

/**
 * Sanitizes file names to prevent path traversal attacks.
 */
export const sanitizeFileName = (fileName: string): string => {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return 'asset';
  }
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Extracts file name from a storage URL.
 */
export const extractFileName = (storageUrl: string): string => {
  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const segments = normalized.split('/');
  return segments[segments.length - 1] ?? normalized;
};

/**
 * Type guard to check if a value is a valid asset type.
 */
export const isAssetType = (value: unknown): value is AssetRow['type'] =>
  value === 'video' || value === 'audio' || value === 'image';

/**
 * Determines asset type from MIME type.
 */
export const getAssetTypeFromMimeType = (mimeType: string): AssetRow['type'] => {
  if (mimeType.startsWith('audio')) return 'audio';
  if (mimeType.startsWith('image')) return 'image';
  return 'video';
};

/**
 * Parses and normalizes asset metadata from database records.
 */
export const parseAssetMetadata = (
  metadata: Record<string, unknown> | null
): AssetMetadata | null => {
  if (!metadata) {
    return null;
  }

  const typed = metadata as Partial<Record<string, unknown>>;
  const result: AssetMetadata = {};

  if (typeof typed.filename === 'string' && typed.filename.trim().length > 0) {
    result.filename = typed.filename.trim();
  }

  if (typeof typed.mimeType === 'string' && typed.mimeType.trim().length > 0) {
    result.mimeType = typed.mimeType.trim();
  }

  if (typeof typed.thumbnail === 'string' && typed.thumbnail.trim().length > 0) {
    result.thumbnail = typed.thumbnail.trim();
  }

  const sourceUrl =
    typeof typed.sourceUrl === 'string' && typed.sourceUrl.trim().length > 0
      ? typed.sourceUrl.trim()
      : typeof typed.source_url === 'string' && typed.source_url.trim().length > 0
        ? typed.source_url.trim()
        : undefined;

  if (sourceUrl) {
    // Ensure the URL has the https:// protocol (fixes old records missing protocol)
    result.sourceUrl = ensureHttpsProtocol(sourceUrl);
  }

  const durationCandidates = [
    typed.durationSeconds,
    typed.duration_seconds,
    typed.duration,
    typed.length,
  ];
  for (const candidate of durationCandidates) {
    const coerced = coerceDuration(candidate);
    if (coerced !== null) {
      result.durationSeconds = Math.max(coerced, MIN_CLIP_DURATION);
      break;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
};

/**
 * Maps database row to AssetRow type.
 */
export const mapAssetRow = (row: Record<string, unknown>): AssetRow | null => {
  const id = typeof row.id === 'string' ? row.id : null;
  const storageUrl = typeof row.storage_url === 'string' ? row.storage_url : null;
  const duration =
    typeof row.duration_seconds === 'number' && Number.isFinite(row.duration_seconds)
      ? row.duration_seconds
      : null;
  const createdAt = typeof row.created_at === 'string' ? row.created_at : null;
  const type = isAssetType(row.type) ? row.type : null;

  if (!id || !storageUrl || !type) {
    return null;
  }

  const parsedMetadata = parseAssetMetadata(
    (row.metadata ?? null) as Record<string, unknown> | null
  );
  const rawMetadata = (row.rawMetadata ?? null) as Record<string, unknown> | null;
  const metadataDuration = parsedMetadata?.durationSeconds ?? null;

  return {
    id,
    storage_url: storageUrl,
    duration_seconds: duration ?? metadataDuration,
    metadata: parsedMetadata,
    rawMetadata,
    created_at: createdAt,
    type,
  };
};
