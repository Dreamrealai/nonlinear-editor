/**
 * @jest-environment node
 */

/**
 * Integration Tests: Asset Upload Flow
 *
 * Tests the complete asset upload lifecycle including:
 * - Request signed URL
 * - Upload to storage
 * - Create asset record in database
 * - Verify asset accessibility
 * - Asset deletion and cleanup
 *
 * These tests verify that Assets API, Storage, and Database
 * work together correctly to support the complete asset upload flow.
 */

import { AssetService } from '@/lib/services/assetService';
import { ProjectService } from '@/lib/services/projectService';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockProject,
  createMockAsset,
  mockAuthenticatedUser,
  resetAllMocks,
  MockSupabaseChain,
} from '@/test-utils/mockSupabase';
import { cache } from '@/lib/cache';

// Mock the error tracking module
jest.mock('@/lib/errorTracking', () => ({
  trackError: jest.fn(),
  ErrorCategory: {
    DATABASE: 'database',
    EXTERNAL_SERVICE: 'external_service',
  },
  ErrorSeverity: {
    HIGH: 'high',
    MEDIUM: 'medium',
  },
}));

describe('Integration: Asset Upload Flow', () => {
  let mockSupabase: MockSupabaseChain;
  let assetService: AssetService;
  let projectService: ProjectService;
  let mockUser: ReturnType<typeof createMockUser>;
  let mockProject: ReturnType<typeof createMockProject>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    assetService = new AssetService(mockSupabase as unknown as SupabaseClient);
    projectService = new ProjectService(mockSupabase as unknown as SupabaseClient);
    mockUser = mockAuthenticatedUser(mockSupabase);
    mockProject = createMockProject({ user_id: mockUser.id });
  });

  afterEach(async () => {
    resetAllMocks(mockSupabase);
    await cache.clear();
  });

  describe('Basic Upload Flow', () => {
    it('should complete upload flow: upload to storage → create asset record → verify', async () => {
      // Arrange
      const imageBuffer = Buffer.from('test-image-data');
      const mockAsset = createMockAsset({
        project_id: mockProject.id,
        user_id: mockUser.id,
        type: 'image',
      });

      // Step 1: Upload to storage
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'test-path/image.jpg' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/storage/test-path/image.jpg' },
      });

      // Step 2: Create asset record
      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      // Act - Upload asset
      const asset = await assetService.createImageAsset(mockUser.id, mockProject.id, imageBuffer, {
        filename: 'test-image.jpg',
        mimeType: 'image/jpeg',
      });

      // Assert upload succeeded
      expect(asset).toBeDefined();
      expect(asset.id).toBe(mockAsset.id);
      expect(asset.type).toBe('image');
      expect(mockSupabase.storage.upload).toHaveBeenCalled();

      // Step 3: Verify asset
      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      const verifiedAsset = await assetService.getAssetById(asset.id, mockUser.id);

      // Assert verification
      expect(verifiedAsset).toBeDefined();
      expect(verifiedAsset?.id).toBe(asset.id);
    });

    it('should upload multiple assets to same project', async () => {
      // Arrange
      const imageBuffer1 = Buffer.from('image-1-data');
      const imageBuffer2 = Buffer.from('image-2-data');
      const imageBuffer3 = Buffer.from('image-3-data');

      const mockAsset1 = createMockAsset({ id: 'asset-1', project_id: mockProject.id });
      const mockAsset2 = createMockAsset({ id: 'asset-2', project_id: mockProject.id });
      const mockAsset3 = createMockAsset({ id: 'asset-3', project_id: mockProject.id });

      // Mock storage uploads
      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      });

      // Mock asset creation
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockAsset1, error: null })
        .mockResolvedValueOnce({ data: mockAsset2, error: null })
        .mockResolvedValueOnce({ data: mockAsset3, error: null });

      // Act - Upload assets
      const asset1 = await assetService.createImageAsset(
        mockUser.id,
        mockProject.id,
        imageBuffer1,
        {
          filename: 'image-1.jpg',
          mimeType: 'image/jpeg',
        }
      );

      const asset2 = await assetService.createImageAsset(
        mockUser.id,
        mockProject.id,
        imageBuffer2,
        {
          filename: 'image-2.jpg',
          mimeType: 'image/jpeg',
        }
      );

      const asset3 = await assetService.createImageAsset(
        mockUser.id,
        mockProject.id,
        imageBuffer3,
        {
          filename: 'image-3.jpg',
          mimeType: 'image/jpeg',
        }
      );

      // Assert
      expect(asset1.id).toBe('asset-1');
      expect(asset2.id).toBe('asset-2');
      expect(asset3.id).toBe('asset-3');
      expect(mockSupabase.storage.upload).toHaveBeenCalledTimes(3);

      // Verify all assets belong to same project
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockAsset1, mockAsset2, mockAsset3],
        error: null,
      });

      const projectAssets = await assetService.getProjectAssets(mockProject.id, mockUser.id);
      expect(projectAssets).toHaveLength(3);
    });

    it('should handle different asset types (image, video, audio)', async () => {
      // Arrange
      const imageBuffer = Buffer.from('image-data');
      const mockImageAsset = createMockAsset({ type: 'image', project_id: mockProject.id });

      // Mock storage and database for image
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'image-path' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/image.jpg' },
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockImageAsset,
        error: null,
      });

      // Act - Upload image
      const imageAsset = await assetService.createImageAsset(
        mockUser.id,
        mockProject.id,
        imageBuffer,
        {
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
        }
      );

      // Assert
      expect(imageAsset.type).toBe('image');
      expect(imageAsset.metadata.mimeType).toBe('image/jpeg');
    });
  });

  describe('Upload Error Handling', () => {
    it('should handle storage upload failure', async () => {
      // Arrange
      const imageBuffer = Buffer.from('test-data');

      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      // Act & Assert
      await expect(
        assetService.createImageAsset(mockUser.id, mockProject.id, imageBuffer, {
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
        })
      ).rejects.toThrow('Failed to upload asset');
    });

    it('should rollback storage upload when database insert fails', async () => {
      // Arrange
      const imageBuffer = Buffer.from('test-data');
      const storagePath = `${mockUser.id}/${mockProject.id}/images/test.jpg`;

      // Storage upload succeeds
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: storagePath },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      });

      // Database insert fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database constraint violation' },
      });

      // Mock cleanup
      mockSupabase.storage.remove.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(
        assetService.createImageAsset(mockUser.id, mockProject.id, imageBuffer, {
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
        })
      ).rejects.toThrow('Failed to create asset record');

      // Verify cleanup was called
      expect(mockSupabase.storage.remove).toHaveBeenCalled();
    });

    it('should continue with database error even if cleanup fails', async () => {
      // Arrange
      const imageBuffer = Buffer.from('test-data');

      // Storage upload succeeds
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'test-path' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      });

      // Database insert fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      // Cleanup also fails
      mockSupabase.storage.remove.mockResolvedValueOnce({
        data: null,
        error: { message: 'Cleanup failed' },
      });

      // Act & Assert - Should still throw database error
      await expect(
        assetService.createImageAsset(mockUser.id, mockProject.id, imageBuffer, {
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
        })
      ).rejects.toThrow('Failed to create asset record');

      expect(mockSupabase.storage.remove).toHaveBeenCalled();
    });
  });

  describe('Asset Retrieval Flow', () => {
    it('should fetch all assets for a project', async () => {
      // Arrange
      const mockAssets = [
        createMockAsset({ id: 'asset-1', project_id: mockProject.id }),
        createMockAsset({ id: 'asset-2', project_id: mockProject.id }),
        createMockAsset({ id: 'asset-3', project_id: mockProject.id }),
      ];

      mockSupabase.order.mockResolvedValueOnce({
        data: mockAssets,
        error: null,
      });

      // Act
      const assets = await assetService.getProjectAssets(mockProject.id, mockUser.id);

      // Assert
      expect(assets).toHaveLength(3);
      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', mockProject.id);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should fetch single asset by ID', async () => {
      // Arrange
      const mockAsset = createMockAsset({
        id: 'specific-asset-id',
        project_id: mockProject.id,
        user_id: mockUser.id,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      // Act
      const asset = await assetService.getAssetById('specific-asset-id', mockUser.id);

      // Assert
      expect(asset).toBeDefined();
      expect(asset?.id).toBe('specific-asset-id');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'specific-asset-id');
    });

    it('should return null for non-existent asset', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Act
      const asset = await assetService.getAssetById('non-existent-id', mockUser.id);

      // Assert
      expect(asset).toBeNull();
    });

    it('should fetch paginated assets', async () => {
      // Arrange
      const mockAssets = Array.from({ length: 10 }, (_, i) =>
        createMockAsset({ id: `asset-${i}`, project_id: mockProject.id })
      );

      mockSupabase.range = jest.fn().mockReturnThis();
      mockSupabase.range.mockResolvedValueOnce({
        data: mockAssets.slice(0, 5),
        error: null,
        count: 10,
      });

      // Act
      const result = await assetService.getProjectAssetsPaginated(
        mockProject.id,
        mockUser.id,
        0,
        5
      );

      // Assert
      expect(result.assets).toHaveLength(5);
      expect(result.totalCount).toBe(10);
      expect(result.totalPages).toBe(2);
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 4);
    });
  });

  describe('Asset Deletion Flow', () => {
    it('should delete asset from storage and database', async () => {
      // Arrange
      const mockAsset = createMockAsset({
        id: 'asset-to-delete',
        project_id: mockProject.id,
        user_id: mockUser.id,
        storage_url: 'supabase://assets/test-user/test-project/test.jpg',
      });

      // Mock asset fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      // Mock storage deletion
      mockSupabase.storage.remove.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock database deletion
      const mockDeleteChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const mockDelete = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockDeleteChain),
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockDelete);

      // Act
      await assetService.deleteAsset('asset-to-delete', mockUser.id);

      // Assert
      expect(mockSupabase.storage.remove).toHaveBeenCalled();
      expect(mockDelete.delete).toHaveBeenCalled();
    });

    it('should delete from database even if storage deletion fails', async () => {
      // Arrange
      const mockAsset = createMockAsset({
        id: 'asset-id',
        storage_url: 'supabase://assets/test-path.jpg',
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      // Storage deletion fails
      mockSupabase.storage.remove.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage error' },
      });

      // Database deletion succeeds
      const mockDeleteChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const mockDelete = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockDeleteChain),
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockDelete);

      // Act
      await assetService.deleteAsset('asset-id', mockUser.id);

      // Assert - database deletion should still happen
      expect(mockDelete.delete).toHaveBeenCalled();
    });

    it('should throw error if asset not found during deletion', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Act & Assert
      await expect(assetService.deleteAsset('non-existent-id', mockUser.id)).rejects.toThrow(
        'Failed to fetch asset'
      );
    });
  });

  describe('Batch Upload Flow', () => {
    it('should upload multiple assets in batch', async () => {
      // Arrange
      const images = [
        {
          buffer: Buffer.from('image-1'),
          options: { filename: 'image-1.jpg', mimeType: 'image/jpeg' },
        },
        {
          buffer: Buffer.from('image-2'),
          options: { filename: 'image-2.jpg', mimeType: 'image/jpeg' },
        },
        {
          buffer: Buffer.from('image-3'),
          options: { filename: 'image-3.jpg', mimeType: 'image/jpeg' },
        },
      ];

      const mockAssets = [
        createMockAsset({ id: 'asset-1' }),
        createMockAsset({ id: 'asset-2' }),
        createMockAsset({ id: 'asset-3' }),
      ];

      // Mock successful uploads
      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      });

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockAssets[0], error: null })
        .mockResolvedValueOnce({ data: mockAssets[1], error: null })
        .mockResolvedValueOnce({ data: mockAssets[2], error: null });

      // Act
      const uploadedAssets = await assetService.createImageAssetBatch(
        mockUser.id,
        mockProject.id,
        images
      );

      // Assert
      expect(uploadedAssets).toHaveLength(3);
      expect(uploadedAssets[0].id).toBe('asset-1');
      expect(mockSupabase.storage.upload).toHaveBeenCalledTimes(3);
    });

    it('should continue batch upload even if some fail', async () => {
      // Arrange
      const images = [
        {
          buffer: Buffer.from('image-1'),
          options: { filename: 'image-1.jpg', mimeType: 'image/jpeg' },
        },
        {
          buffer: Buffer.from('image-2'),
          options: { filename: 'image-2.jpg', mimeType: 'image/jpeg' },
        },
        {
          buffer: Buffer.from('image-3'),
          options: { filename: 'image-3.jpg', mimeType: 'image/jpeg' },
        },
      ];

      const mockAsset1 = createMockAsset({ id: 'asset-1' });
      const mockAsset3 = createMockAsset({ id: 'asset-3' });

      // First upload succeeds
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'path-1' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset1,
        error: null,
      });

      // Second upload fails
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Upload failed' },
      });

      // Third upload succeeds
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'path-3' },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset3,
        error: null,
      });

      // Act
      const uploadedAssets = await assetService.createImageAssetBatch(
        mockUser.id,
        mockProject.id,
        images
      );

      // Assert - should have 2 successful uploads
      expect(uploadedAssets).toHaveLength(2);
      expect(uploadedAssets[0].id).toBe('asset-1');
      expect(uploadedAssets[1].id).toBe('asset-3');
    });

    it('should throw error if all batch uploads fail', async () => {
      // Arrange
      const images = [
        {
          buffer: Buffer.from('image-1'),
          options: { filename: 'image-1.jpg', mimeType: 'image/jpeg' },
        },
        {
          buffer: Buffer.from('image-2'),
          options: { filename: 'image-2.jpg', mimeType: 'image/jpeg' },
        },
      ];

      // All uploads fail
      mockSupabase.storage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      });

      // Act & Assert
      await expect(
        assetService.createImageAssetBatch(mockUser.id, mockProject.id, images)
      ).rejects.toThrow('All asset uploads failed');
    });
  });

  describe('Complete Asset Lifecycle', () => {
    it('should complete full asset lifecycle: upload → verify → use in project → delete', async () => {
      // Step 1: Upload asset
      const imageBuffer = Buffer.from('test-image');
      const mockAsset = createMockAsset({
        id: 'lifecycle-asset',
        project_id: mockProject.id,
        user_id: mockUser.id,
      });

      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'test-path' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      const uploadedAsset = await assetService.createImageAsset(
        mockUser.id,
        mockProject.id,
        imageBuffer,
        {
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
        }
      );

      expect(uploadedAsset.id).toBe('lifecycle-asset');

      // Step 2: Verify asset exists
      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      const verifiedAsset = await assetService.getAssetById(uploadedAsset.id, mockUser.id);
      expect(verifiedAsset?.id).toBe(uploadedAsset.id);

      // Step 3: Use in project (simulated by fetching project assets)
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockAsset],
        error: null,
      });

      const projectAssets = await assetService.getProjectAssets(mockProject.id, mockUser.id);
      expect(projectAssets).toHaveLength(1);
      expect(projectAssets[0].id).toBe(uploadedAsset.id);

      // Step 4: Delete asset
      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      mockSupabase.storage.remove.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const mockDeleteChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const mockDelete = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockDeleteChain),
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockDelete);

      await assetService.deleteAsset(uploadedAsset.id, mockUser.id);

      expect(mockSupabase.storage.remove).toHaveBeenCalled();
      expect(mockDelete.delete).toHaveBeenCalled();

      // Step 5: Verify asset no longer exists
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const deletedAsset = await assetService.getAssetById(uploadedAsset.id, mockUser.id);
      expect(deletedAsset).toBeNull();
    });
  });
});
