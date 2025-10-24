import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetService } from '@/lib/services/assetService';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as errorTracking from '@/lib/errorTracking';
import * as validation from '@/lib/validation';

vi.mock('@/lib/errorTracking');
vi.mock('@/lib/validation');
vi.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}));

describe('AssetService', () => {
  let assetService: AssetService;
  let mockSupabase: Partial<SupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })) as unknown as SupabaseClient['from'],
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          remove: vi.fn(),
          getPublicUrl: vi.fn(),
        })),
      } as unknown as SupabaseClient['storage'],
    };

    assetService = new AssetService(mockSupabase as SupabaseClient);
    vi.spyOn(validation, 'validateUUID').mockImplementation(() => {});
  });

  describe('createImageAsset', () => {
    const userId = 'user-123';
    const projectId = 'project-456';
    const imageBuffer = Buffer.from('test-image-data');
    const options = {
      filename: 'test.png',
      mimeType: 'image/png',
      metadata: { provider: 'imagen' },
    };

    it('should create image asset successfully', async () => {
      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/image.png' },
        }),
      };

      (mockSupabase.storage!.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        mockStorage
      );

      const mockAsset = {
        id: 'mock-uuid-1234',
        user_id: userId,
        project_id: projectId,
        type: 'image',
        storage_url: `supabase://assets/${userId}/${projectId}/images/test.png`,
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAsset, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await assetService.createImageAsset(userId, projectId, imageBuffer, options);

      expect(result).toEqual(mockAsset);
      expect(validation.validateUUID).toHaveBeenCalledWith(projectId, 'Project ID');
      expect(mockStorage.upload).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
    });

    it('should throw error on upload failure', async () => {
      const uploadError = { message: 'Upload failed' };
      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ error: uploadError }),
      };

      (mockSupabase.storage!.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        mockStorage
      );

      await expect(
        assetService.createImageAsset(userId, projectId, imageBuffer, options)
      ).rejects.toThrow('Failed to upload asset');
      expect(errorTracking.trackError).toHaveBeenCalled();
    });

    it('should cleanup storage on database insert failure', async () => {
      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/image.png' },
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      };

      (mockSupabase.storage!.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        mockStorage
      );

      const dbError = { message: 'Insert failed' };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await expect(
        assetService.createImageAsset(userId, projectId, imageBuffer, options)
      ).rejects.toThrow('Failed to create asset record');
      expect(mockStorage.remove).toHaveBeenCalled();
    });
  });

  describe('getProjectAssets', () => {
    const projectId = 'project-456';
    const userId = 'user-123';

    it('should return project assets', async () => {
      const mockAssets = [
        { id: 'asset-1', type: 'image', storage_url: 'url1' },
        { id: 'asset-2', type: 'video', storage_url: 'url2' },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAssets, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await assetService.getProjectAssets(projectId, userId);

      expect(result).toEqual(mockAssets);
      expect(validation.validateUUID).toHaveBeenCalledWith(projectId, 'Project ID');
      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
    });

    it('should return empty array when no assets found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await assetService.getProjectAssets(projectId, userId);

      expect(result).toEqual([]);
    });

    it('should throw error on database error', async () => {
      const dbError = { message: 'Query failed' };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await expect(assetService.getProjectAssets(projectId, userId)).rejects.toThrow(
        'Failed to fetch assets'
      );
      expect(errorTracking.trackError).toHaveBeenCalled();
    });
  });

  describe('getProjectAssetsPaginated', () => {
    const projectId = 'project-456';
    const userId = 'user-123';

    it('should return paginated assets', async () => {
      const mockAssets = [{ id: 'asset-1' }, { id: 'asset-2' }];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockAssets, error: null, count: 10 }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await assetService.getProjectAssetsPaginated(projectId, userId, 0, 5);

      expect(result.assets).toEqual(mockAssets);
      expect(result.totalCount).toBe(10);
      expect(result.totalPages).toBe(2);
    });

    it('should validate pagination parameters', async () => {
      await expect(
        assetService.getProjectAssetsPaginated(projectId, userId, -1, 5)
      ).rejects.toThrow('Invalid page number');

      await expect(assetService.getProjectAssetsPaginated(projectId, userId, 0, 0)).rejects.toThrow(
        'Invalid page size'
      );

      await expect(
        assetService.getProjectAssetsPaginated(projectId, userId, 0, 101)
      ).rejects.toThrow('Invalid page size');
    });
  });

  describe('deleteAsset', () => {
    const assetId = 'asset-123';
    const userId = 'user-123';

    it('should delete asset from storage and database', async () => {
      const mockAsset = {
        storage_url: 'supabase://assets/user-123/project-456/file.png',
      };

      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAsset, error: null }),
      };

      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockFetchQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      const mockStorage = {
        remove: vi.fn().mockResolvedValue({ error: null }),
      };

      (mockSupabase.storage!.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        mockStorage
      );

      await assetService.deleteAsset(assetId, userId);

      expect(validation.validateUUID).toHaveBeenCalledWith(assetId, 'Asset ID');
      expect(mockStorage.remove).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
    });

    it('should throw error if asset not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await expect(assetService.deleteAsset(assetId, userId)).rejects.toThrow(
        'Failed to fetch asset'
      );
    });

    it('should continue to delete database record even if storage deletion fails', async () => {
      const mockAsset = {
        storage_url: 'supabase://assets/user-123/project-456/file.png',
      };

      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAsset, error: null }),
      };

      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockFetchQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      const storageError = { message: 'Storage delete failed' };
      const mockStorage = {
        remove: vi.fn().mockResolvedValue({ error: storageError }),
      };

      (mockSupabase.storage!.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        mockStorage
      );

      await assetService.deleteAsset(assetId, userId);

      expect(mockStorage.remove).toHaveBeenCalled();
      expect(errorTracking.trackError).toHaveBeenCalled();
    });
  });

  describe('createImageAssetBatch', () => {
    const userId = 'user-123';
    const projectId = 'project-456';

    it('should create multiple assets successfully', async () => {
      const images = [
        {
          buffer: Buffer.from('image1'),
          options: { filename: 'test1.png', mimeType: 'image/png' },
        },
        {
          buffer: Buffer.from('image2'),
          options: { filename: 'test2.png', mimeType: 'image/png' },
        },
      ];

      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/image.png' },
        }),
      };

      (mockSupabase.storage!.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        mockStorage
      );

      const mockAsset = { id: 'asset-1', type: 'image' };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAsset, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await assetService.createImageAssetBatch(userId, projectId, images);

      expect(result).toHaveLength(2);
      expect(mockStorage.upload).toHaveBeenCalledTimes(2);
    });

    it('should throw error if all uploads fail', async () => {
      const images = [
        {
          buffer: Buffer.from('image1'),
          options: { filename: 'test1.png', mimeType: 'image/png' },
        },
      ];

      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ error: { message: 'Upload failed' } }),
      };

      (mockSupabase.storage!.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        mockStorage
      );

      await expect(assetService.createImageAssetBatch(userId, projectId, images)).rejects.toThrow(
        'All asset uploads failed'
      );
    });
  });

  describe('getAssetById', () => {
    const assetId = 'asset-123';
    const userId = 'user-123';

    it('should return asset when found', async () => {
      const mockAsset = { id: assetId, type: 'image' };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAsset, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await assetService.getAssetById(assetId, userId);

      expect(result).toEqual(mockAsset);
      expect(validation.validateUUID).toHaveBeenCalledWith(assetId, 'Asset ID');
    });

    it('should return null for not found error (PGRST116)', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await assetService.getAssetById(assetId, userId);

      expect(result).toBeNull();
    });
  });

  describe('getUserAssets', () => {
    const userId = 'user-123';

    it('should return all user assets', async () => {
      const mockAssets = [
        { id: 'asset-1', type: 'image' },
        { id: 'asset-2', type: 'video' },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAssets, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await assetService.getUserAssets(userId);

      expect(result).toEqual(mockAssets);
    });

    it('should filter by asset type', async () => {
      const mockAssets = [{ id: 'asset-1', type: 'image' }];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAssets, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await assetService.getUserAssets(userId, 'image');

      expect(result).toEqual(mockAssets);
      expect(mockQuery.eq).toHaveBeenCalledWith('type', 'image');
    });
  });
});
