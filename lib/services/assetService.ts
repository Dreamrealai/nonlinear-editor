/**
 * Asset Service Layer
 *
 * Handles all business logic related to assets:
 * - Uploading assets to Supabase Storage
 * - Creating asset records in the database
 * - Fetching assets
 * - Deleting assets
 *
 * This service layer separates business logic from API route handlers,
 * making code more testable and maintainable.
 *
 * Usage:
 * ```typescript
 * import { AssetService } from '@/lib/services/assetService';
 *
 * const service = new AssetService(supabase);
 * const asset = await service.createImageAsset(userId, projectId, imageBuffer, metadata);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';
import { trackError, ErrorCategory, ErrorSeverity } from '../errorTracking';
import { validateUUID } from '../validation';

export interface Asset {
  id: string;
  user_id: string;
  project_id: string;
  type: 'image' | 'video' | 'audio';
  source: 'upload' | 'genai';
  storage_url: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ImageAssetMetadata {
  filename: string;
  mimeType: string;
  sourceUrl: string;
  thumbnail?: string;
  provider?: string;
  model?: string;
  prompt?: string;
  negativePrompt?: string;
  aspectRatio?: string;
  seed?: number;
}

export interface CreateImageAssetOptions {
  filename: string;
  mimeType: string;
  metadata?: Partial<ImageAssetMetadata>;
}

export class AssetService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Upload image to Supabase Storage and create asset record
   */
  async createImageAsset(
    userId: string,
    projectId: string,
    imageBuffer: Buffer,
    options: CreateImageAssetOptions
  ): Promise<Asset> {
    try {
      validateUUID(projectId, 'Project ID');

      const { filename, mimeType, metadata = {} } = options;

      // Generate storage path
      const storagePath = `${userId}/${projectId}/images/${filename}`;

      // Upload to Supabase storage
      const { error: uploadError } = await this.supabase.storage
        .from('assets')
        .upload(storagePath, imageBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        trackError(uploadError, {
          category: ErrorCategory.EXTERNAL_SERVICE,
          severity: ErrorSeverity.HIGH,
          context: { userId, projectId, filename },
        });
        throw new Error(`Failed to upload asset: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from('assets')
        .getPublicUrl(storagePath);

      // Create asset record
      const assetId = uuid();
      const assetMetadata: ImageAssetMetadata = {
        filename,
        mimeType,
        sourceUrl: publicUrl,
        ...metadata,
      };

      const { data: newAsset, error: assetError } = await this.supabase
        .from('assets')
        .insert({
          id: assetId,
          user_id: userId,
          project_id: projectId,
          type: 'image',
          source: metadata.provider ? 'genai' : 'upload',
          storage_url: `supabase://assets/${storagePath}`,
          metadata: assetMetadata,
        })
        .select()
        .single();

      if (assetError) {
        // Clean up uploaded file if database insert fails
        await this.supabase.storage
          .from('assets')
          .remove([storagePath]);

        trackError(assetError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.HIGH,
          context: { userId, projectId, filename },
        });
        throw new Error(`Failed to create asset record: ${assetError.message}`);
      }

      if (!newAsset) {
        throw new Error('Asset creation returned no data');
      }

      return newAsset as Asset;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        context: { userId, projectId },
      });
      throw error;
    }
  }

  /**
   * Get all assets for a project
   */
  async getProjectAssets(projectId: string, userId: string): Promise<Asset[]> {
    try {
      validateUUID(projectId, 'Project ID');

      const { data: assets, error: dbError } = await this.supabase
        .from('assets')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { projectId, userId },
        });
        throw new Error(`Failed to fetch assets: ${dbError.message}`);
      }

      return (assets || []) as Asset[];
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { projectId, userId },
      });
      throw error;
    }
  }

  /**
   * Delete an asset (removes from storage and database)
   */
  async deleteAsset(assetId: string, userId: string): Promise<void> {
    try {
      validateUUID(assetId, 'Asset ID');

      // First, fetch the asset to get storage path
      const { data: asset, error: fetchError } = await this.supabase
        .from('assets')
        .select('storage_url')
        .eq('id', assetId)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        trackError(fetchError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { assetId, userId },
        });
        throw new Error(`Failed to fetch asset: ${fetchError.message}`);
      }

      if (!asset) {
        throw new Error('Asset not found or access denied');
      }

      // Extract storage path from URL (format: supabase://assets/path/to/file)
      const storageUrl = (asset as { storage_url: string }).storage_url;
      const storagePath = storageUrl.replace('supabase://assets/', '');

      // Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from('assets')
        .remove([storagePath]);

      if (storageError) {
        trackError(storageError, {
          category: ErrorCategory.EXTERNAL_SERVICE,
          severity: ErrorSeverity.MEDIUM,
          context: { assetId, userId, storagePath },
        });
        // Continue to delete database record even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await this.supabase
        .from('assets')
        .delete()
        .eq('id', assetId)
        .eq('user_id', userId);

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { assetId, userId },
        });
        throw new Error(`Failed to delete asset: ${dbError.message}`);
      }
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { assetId, userId },
      });
      throw error;
    }
  }

  /**
   * Create multiple image assets from a batch operation
   */
  async createImageAssetBatch(
    userId: string,
    projectId: string,
    images: Array<{
      buffer: Buffer;
      options: CreateImageAssetOptions;
    }>
  ): Promise<Asset[]> {
    const assets: Asset[] = [];
    const errors: Error[] = [];

    for (const { buffer, options } of images) {
      try {
        const asset = await this.createImageAsset(userId, projectId, buffer, options);
        assets.push(asset);
      } catch (error) {
        errors.push(error as Error);
        // Continue processing other images
      }
    }

    if (errors.length > 0 && assets.length === 0) {
      // All uploads failed
      throw new Error(`All asset uploads failed: ${errors[0].message}`);
    }

    return assets;
  }
}
