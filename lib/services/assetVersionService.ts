/**
 * Asset Version Service
 *
 * Manages asset version history, allowing users to:
 * - Track asset versions when assets are updated
 * - Store previous versions in Supabase storage
 * - View version history
 * - Revert to previous versions
 * - Compare versions
 *
 * @example
 * ```ts
 * const versionService = new AssetVersionService(supabase);
 *
 * // Create a new version before updating an asset
 * await versionService.createVersion(assetId, userId, 'Updated asset with new file');
 *
 * // Get version history
 * const versions = await versionService.getVersionHistory(assetId);
 *
 * // Revert to a previous version
 * await versionService.revertToVersion(assetId, versionId, userId);
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { serverLogger } from '@/lib/serverLogger';
import crypto from 'crypto';

export interface AssetVersion {
  id: string;
  asset_id: string;
  user_id: string;
  project_id: string | null;
  version_number: number;
  version_label: string | null;
  storage_url: string;
  storage_path: string;
  type: 'video' | 'audio' | 'image';
  mime_type: string | null;
  file_size: bigint | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  metadata: Record<string, unknown>;
  change_reason: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface AssetVersionMetadata {
  storage_url: string;
  storage_path: string;
  type: 'video' | 'audio' | 'image';
  mime_type: string | null;
  file_size?: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  metadata: Record<string, unknown>;
  project_id: string | null;
}

export interface CreateVersionOptions {
  changeReason?: string;
  versionLabel?: string;
}

export interface RevertResult {
  success: boolean;
  newStorageUrl: string;
  newStoragePath: string;
  versionNumber: number;
}

export class AssetVersionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Creates a new version of an asset by copying the current asset state
   * to the version history table and duplicating the file in storage.
   *
   * This should be called BEFORE updating an asset to preserve the current state.
   *
   * @param assetId - UUID of the asset to version
   * @param userId - UUID of the user creating the version
   * @param options - Optional change reason and version label
   * @returns The created version record
   * @throws Error if asset not found or storage operation fails
   */
  async createVersion(
    assetId: string,
    userId: string,
    options: CreateVersionOptions = {}
  ): Promise<AssetVersion> {
    serverLogger.info(
      {
        event: 'asset_version.create_version.started',
        assetId,
        userId,
        changeReason: options.changeReason,
      },
      'Creating new asset version'
    );

    // Get current asset state
    const { data: asset, error: assetError } = await this.supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      serverLogger.error(
        {
          event: 'asset_version.create_version.asset_not_found',
          assetId,
          error: assetError?.message,
        },
        'Asset not found for versioning'
      );
      throw new Error(`Asset not found: ${assetId}`);
    }

    // Get next version number using the database function
    const { data: versionNumberData, error: versionError } = await this.supabase.rpc(
      'get_next_asset_version_number',
      { p_asset_id: assetId }
    );

    if (versionError) {
      serverLogger.error(
        {
          event: 'asset_version.create_version.version_number_error',
          assetId,
          error: versionError.message,
        },
        'Failed to get next version number'
      );
      throw new Error(`Failed to get version number: ${versionError.message}`);
    }

    const versionNumber = versionNumberData as number;

    // Extract storage path from storage URL
    // Format: supabase://assets/{userId}/{projectId}/{folder}/{filename}
    const storagePath = asset.storage_url.replace('supabase://assets/', '');
    const pathParts = storagePath.split('/');

    // Validate path structure
    if (pathParts.length < 2) {
      serverLogger.error(
        {
          event: 'asset_version.create_version.invalid_path',
          assetId,
          storagePath,
          pathPartsLength: pathParts.length,
        },
        'Invalid storage path structure'
      );
      throw new Error(`Invalid storage path structure: ${storagePath}`);
    }

    const filename = pathParts[pathParts.length - 1]!;
    const folder = pathParts[pathParts.length - 2]!;

    // Create versioned storage path
    // Format: {userId}/{projectId}/{folder}/versions/v{versionNumber}_{filename}
    const versionedFilename = `v${versionNumber}_${filename}`;
    const versionedPath = `${asset.user_id}/${asset.project_id}/${folder}/versions/${versionedFilename}`;

    serverLogger.debug(
      {
        event: 'asset_version.create_version.copying_file',
        assetId,
        sourcePath: storagePath,
        destinationPath: versionedPath,
        versionNumber,
      },
      'Copying asset file to version storage'
    );

    // Copy the current file to versioned storage
    const { error: copyError } = await this.supabase.storage
      .from('assets')
      .copy(storagePath, versionedPath);

    if (copyError) {
      serverLogger.error(
        {
          event: 'asset_version.create_version.copy_failed',
          assetId,
          error: copyError.message,
          sourcePath: storagePath,
          destinationPath: versionedPath,
        },
        'Failed to copy asset file to version storage'
      );
      throw new Error(`Failed to copy asset file: ${copyError.message}`);
    }

    // Create version record
    const versionedStorageUrl = `supabase://assets/${versionedPath}`;

    const { data: version, error: insertError } = await this.supabase
      .from('asset_versions')
      .insert({
        asset_id: assetId,
        user_id: asset.user_id,
        project_id: asset.project_id,
        version_number: versionNumber,
        version_label: options.versionLabel,
        storage_url: versionedStorageUrl,
        storage_path: versionedPath,
        type: asset.type,
        mime_type: asset.mime_type,
        file_size: asset.metadata?.size || null,
        width: asset.width,
        height: asset.height,
        duration_seconds: asset.duration_seconds,
        metadata: asset.metadata || {},
        change_reason: options.changeReason,
        changed_by: userId,
      })
      .select()
      .single();

    if (insertError || !version) {
      serverLogger.error(
        {
          event: 'asset_version.create_version.insert_failed',
          assetId,
          error: insertError?.message,
        },
        'Failed to create version record'
      );

      // Try to clean up the copied file
      await this.supabase.storage.from('assets').remove([versionedPath]);

      throw new Error(`Failed to create version record: ${insertError?.message}`);
    }

    // Update asset's current version number
    await this.supabase
      .from('assets')
      .update({ current_version: versionNumber + 1 })
      .eq('id', assetId);

    serverLogger.info(
      {
        event: 'asset_version.create_version.success',
        assetId,
        versionId: version.id,
        versionNumber,
        storagePath: versionedPath,
      },
      'Asset version created successfully'
    );

    return version as AssetVersion;
  }

  /**
   * Gets the version history for an asset, ordered by version number descending.
   *
   * @param assetId - UUID of the asset
   * @returns Array of version records
   */
  async getVersionHistory(assetId: string): Promise<AssetVersion[]> {
    serverLogger.debug(
      {
        event: 'asset_version.get_history.started',
        assetId,
      },
      'Fetching asset version history'
    );

    const { data: versions, error } = await this.supabase
      .from('asset_versions')
      .select('*')
      .eq('asset_id', assetId)
      .order('version_number', { ascending: false });

    if (error) {
      serverLogger.error(
        {
          event: 'asset_version.get_history.error',
          assetId,
          error: error.message,
        },
        'Failed to fetch version history'
      );
      throw new Error(`Failed to fetch version history: ${error.message}`);
    }

    serverLogger.debug(
      {
        event: 'asset_version.get_history.success',
        assetId,
        versionCount: versions?.length || 0,
      },
      'Version history fetched successfully'
    );

    return (versions as AssetVersion[]) || [];
  }

  /**
   * Reverts an asset to a previous version by:
   * 1. Creating a version of the current state
   * 2. Copying the version file to become the current asset
   * 3. Updating the asset record with version metadata
   *
   * @param assetId - UUID of the asset to revert
   * @param versionId - UUID of the version to revert to
   * @param userId - UUID of the user performing the revert
   * @returns Result with new storage URL and path
   */
  async revertToVersion(assetId: string, versionId: string, userId: string): Promise<RevertResult> {
    serverLogger.info(
      {
        event: 'asset_version.revert.started',
        assetId,
        versionId,
        userId,
      },
      'Reverting asset to previous version'
    );

    // Get the version to revert to
    const { data: version, error: versionError } = await this.supabase
      .from('asset_versions')
      .select('*')
      .eq('id', versionId)
      .eq('asset_id', assetId)
      .single();

    if (versionError || !version) {
      serverLogger.error(
        {
          event: 'asset_version.revert.version_not_found',
          assetId,
          versionId,
          error: versionError?.message,
        },
        'Version not found'
      );
      throw new Error(`Version not found: ${versionId}`);
    }

    // Create a version of the current state before reverting
    await this.createVersion(assetId, userId, {
      changeReason: `Before reverting to version ${version.version_number}`,
      versionLabel: 'Pre-revert snapshot',
    });

    // Get current asset
    const { data: asset, error: assetError } = await this.supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    // Extract current storage path
    const currentStoragePath = asset.storage_url.replace('supabase://assets/', '');
    const pathParts = currentStoragePath.split('/');

    // Validate path structure
    if (pathParts.length === 0) {
      serverLogger.error(
        {
          event: 'asset_version.revert.invalid_path',
          assetId,
          versionId,
          currentStoragePath,
        },
        'Invalid storage path structure'
      );
      throw new Error(`Invalid storage path structure: ${currentStoragePath}`);
    }

    const filename = pathParts[pathParts.length - 1]!;

    // Generate new filename to avoid cache issues
    const filenameParts = filename.split('.');
    const ext = filenameParts.length > 1 ? filenameParts[filenameParts.length - 1]! : 'bin';
    const newFilename = `${crypto.randomUUID()}.${ext}`;
    const newPath = pathParts.slice(0, -1).concat(newFilename).join('/');

    serverLogger.debug(
      {
        event: 'asset_version.revert.copying_version',
        assetId,
        versionId,
        sourcePath: version.storage_path,
        destinationPath: newPath,
      },
      'Copying version file to current asset location'
    );

    // Copy version file to new location (to replace current asset)
    const { error: copyError } = await this.supabase.storage
      .from('assets')
      .copy(version.storage_path, newPath);

    if (copyError) {
      serverLogger.error(
        {
          event: 'asset_version.revert.copy_failed',
          assetId,
          versionId,
          error: copyError.message,
        },
        'Failed to copy version file'
      );
      throw new Error(`Failed to copy version file: ${copyError.message}`);
    }

    // Delete old current file
    await this.supabase.storage.from('assets').remove([currentStoragePath]);

    // Update asset record with version metadata
    const newStorageUrl = `supabase://assets/${newPath}`;

    const { error: updateError } = await this.supabase
      .from('assets')
      .update({
        storage_url: newStorageUrl,
        mime_type: version.mime_type,
        width: version.width,
        height: version.height,
        duration_seconds: version.duration_seconds,
        metadata: {
          ...version.metadata,
          reverted_from_version: version.version_number,
          reverted_at: new Date().toISOString(),
        },
      })
      .eq('id', assetId);

    if (updateError) {
      serverLogger.error(
        {
          event: 'asset_version.revert.update_failed',
          assetId,
          versionId,
          error: updateError.message,
        },
        'Failed to update asset record'
      );
      throw new Error(`Failed to update asset: ${updateError.message}`);
    }

    serverLogger.info(
      {
        event: 'asset_version.revert.success',
        assetId,
        versionId,
        versionNumber: version.version_number,
        newStorageUrl,
      },
      'Asset reverted successfully'
    );

    return {
      success: true,
      newStorageUrl,
      newStoragePath: newPath,
      versionNumber: version.version_number,
    };
  }

  /**
   * Gets a signed URL to download a specific version of an asset.
   *
   * @param versionId - UUID of the version
   * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
   * @returns Signed URL to download the version
   */
  async getVersionDownloadUrl(versionId: string, expiresIn: number = 3600): Promise<string> {
    const { data: version, error } = await this.supabase
      .from('asset_versions')
      .select('storage_path')
      .eq('id', versionId)
      .single();

    if (error || !version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    const { data: signedUrl, error: urlError } = await this.supabase.storage
      .from('assets')
      .createSignedUrl(version.storage_path, expiresIn);

    if (urlError || !signedUrl) {
      throw new Error(`Failed to create signed URL: ${urlError?.message}`);
    }

    return signedUrl.signedUrl;
  }

  /**
   * Deletes a specific version from history and storage.
   *
   * @param versionId - UUID of the version to delete
   * @returns True if deleted successfully
   */
  async deleteVersion(versionId: string): Promise<boolean> {
    serverLogger.info(
      {
        event: 'asset_version.delete.started',
        versionId,
      },
      'Deleting asset version'
    );

    // Get version to delete the file
    const { data: version, error: versionError } = await this.supabase
      .from('asset_versions')
      .select('storage_path, asset_id')
      .eq('id', versionId)
      .single();

    if (versionError || !version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    // Delete from storage
    const { error: storageError } = await this.supabase.storage
      .from('assets')
      .remove([version.storage_path]);

    if (storageError) {
      serverLogger.warn(
        {
          event: 'asset_version.delete.storage_error',
          versionId,
          error: storageError.message,
        },
        'Failed to delete version file from storage (continuing with DB delete)'
      );
    }

    // Delete from database
    const { error: deleteError } = await this.supabase
      .from('asset_versions')
      .delete()
      .eq('id', versionId);

    if (deleteError) {
      serverLogger.error(
        {
          event: 'asset_version.delete.db_error',
          versionId,
          error: deleteError.message,
        },
        'Failed to delete version record'
      );
      throw new Error(`Failed to delete version: ${deleteError.message}`);
    }

    serverLogger.info(
      {
        event: 'asset_version.delete.success',
        versionId,
      },
      'Version deleted successfully'
    );

    return true;
  }

  /**
   * Gets the current version number of an asset.
   *
   * @param assetId - UUID of the asset
   * @returns Current version number
   */
  async getCurrentVersionNumber(assetId: string): Promise<number> {
    const { data: asset, error } = await this.supabase
      .from('assets')
      .select('current_version')
      .eq('id', assetId)
      .single();

    if (error || !asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    return asset.current_version || 1;
  }
}
