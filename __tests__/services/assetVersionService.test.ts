/**
 * Tests for AssetVersionService
 *
 * Tests all asset version functionality including:
 * - Creating asset versions
 * - Retrieving version history
 * - Reverting to previous versions
 * - Deleting versions
 * - Getting version download URLs
 * - Getting current version numbers
 *
 * Follows AAA pattern (Arrange-Act-Assert)
 */

import { AssetVersionService, type AssetVersion } from '@/lib/services/assetVersionService';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock serverLogger
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('AssetVersionService', () => {
  let service: AssetVersionService;
  let mockSupabase: any;

  const mockAsset = {
    id: 'asset-123',
    user_id: 'user-456',
    project_id: 'project-789',
    storage_url: 'supabase://assets/user-456/project-789/images/test.png',
    type: 'image',
    mime_type: 'image/png',
    width: 1920,
    height: 1080,
    duration_seconds: null,
    metadata: { size: 102400 },
    current_version: 1,
  };

  const mockVersion: AssetVersion = {
    id: 'version-123',
    asset_id: 'asset-123',
    user_id: 'user-456',
    project_id: 'project-789',
    version_number: 1,
    version_label: 'Test Version',
    storage_url: 'supabase://assets/user-456/project-789/images/versions/v1_test.png',
    storage_path: 'user-456/project-789/images/versions/v1_test.png',
    type: 'image',
    mime_type: 'image/png',
    file_size: BigInt(102400),
    width: 1920,
    height: 1080,
    duration_seconds: null,
    metadata: { size: 102400 },
    change_reason: 'Initial version',
    changed_by: 'user-456',
    created_at: '2025-10-24T00:00:00.000Z',
  };

  beforeEach(() => {
    // Create mock Supabase client with proper chaining
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
    };

    mockSupabase = {
      from: jest.fn(() => mockChain),
      rpc: jest.fn(),
      storage: {
        from: jest.fn().mockReturnThis(),
        copy: jest.fn(),
        remove: jest.fn(),
        createSignedUrl: jest.fn(),
      },
    };

    // Add methods directly to mockSupabase for direct access
    mockSupabase.select = mockChain.select;
    mockSupabase.eq = mockChain.eq;
    mockSupabase.single = mockChain.single;
    mockSupabase.order = mockChain.order;
    mockSupabase.insert = jest.fn(() => mockChain);
    mockSupabase.update = jest.fn(() => mockChain);
    mockSupabase.delete = jest.fn(() => mockChain);

    service = new AssetVersionService(mockSupabase as unknown as SupabaseClient);
  });

  describe('createVersion', () => {
    it('should create a new version successfully', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 2,
        error: null,
      });

      mockSupabase.storage.copy.mockResolvedValueOnce({
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockVersion, version_number: 2 },
        error: null,
      });

      // Act
      const result = await service.createVersion('asset-123', 'user-456', {
        changeReason: 'Updated image',
        versionLabel: 'v2.0',
      });

      // Assert
      expect(result.version_number).toBe(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.storage.copy).toHaveBeenCalled();
    });

    it('should throw error if asset not found', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Asset not found' },
      });

      // Act & Assert
      await expect(
        service.createVersion('invalid-asset', 'user-456')
      ).rejects.toThrow('Asset not found');
    });

    it('should throw error if getting version number fails', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC failed' },
      });

      // Act & Assert
      await expect(
        service.createVersion('asset-123', 'user-456')
      ).rejects.toThrow('Failed to get version number');
    });

    it('should throw error if storage copy fails', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 2,
        error: null,
      });

      mockSupabase.storage.copy.mockResolvedValueOnce({
        error: { message: 'Copy failed' },
      });

      // Act & Assert
      await expect(
        service.createVersion('asset-123', 'user-456')
      ).rejects.toThrow('Failed to copy asset file');
    });

    it('should clean up storage on insert failure', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockAsset,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Insert failed' },
        });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 2,
        error: null,
      });

      mockSupabase.storage.copy.mockResolvedValueOnce({
        error: null,
      });

      mockSupabase.storage.remove.mockResolvedValueOnce({
        error: null,
      });

      // Act & Assert
      await expect(
        service.createVersion('asset-123', 'user-456')
      ).rejects.toThrow('Failed to create version record');

      expect(mockSupabase.storage.remove).toHaveBeenCalled();
    });

    it('should update asset current version', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockAsset,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockVersion, version_number: 2 },
          error: null,
        });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 2,
        error: null,
      });

      mockSupabase.storage.copy.mockResolvedValueOnce({
        error: null,
      });

      // Act
      await service.createVersion('asset-123', 'user-456');

      // Assert
      expect(mockSupabase.update).toHaveBeenCalledWith({ current_version: 3 });
    });

    it('should handle asset without metadata size', async () => {
      // Arrange
      const assetNoMetadata = { ...mockAsset, metadata: {} };
      mockSupabase.single
        .mockResolvedValueOnce({
          data: assetNoMetadata,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockVersion,
          error: null,
        });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 1,
        error: null,
      });

      mockSupabase.storage.copy.mockResolvedValueOnce({
        error: null,
      });

      // Act
      const result = await service.createVersion('asset-123', 'user-456');

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('getVersionHistory', () => {
    it('should fetch version history successfully', async () => {
      // Arrange
      const versions = [
        { ...mockVersion, version_number: 3 },
        { ...mockVersion, version_number: 2 },
        { ...mockVersion, version_number: 1 },
      ];

      mockSupabase.single.mockResolvedValueOnce({
        data: versions,
        error: null,
      });

      // Act
      const result = await service.getVersionHistory('asset-123');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('asset_versions');
      expect(mockSupabase.eq).toHaveBeenCalledWith('asset_id', 'asset-123');
      expect(mockSupabase.order).toHaveBeenCalledWith('version_number', { ascending: false });
    });

    it('should return empty array if no versions found', async () => {
      // Arrange
      mockSupabase.order.mockReturnValueOnce({
        ...mockSupabase,
        data: null,
        error: null,
      });

      // Act
      const result = await service.getVersionHistory('asset-123');

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      // Arrange
      mockSupabase.order.mockReturnValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      // Act & Assert
      await expect(
        service.getVersionHistory('asset-123')
      ).rejects.toThrow('Failed to fetch version history');
    });
  });

  describe('revertToVersion', () => {
    it('should revert to previous version successfully', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockVersion,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockVersion, version_number: 2 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockAsset,
          error: null,
        });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 3,
        error: null,
      });

      mockSupabase.storage.copy.mockResolvedValue({
        error: null,
      });

      mockSupabase.storage.remove.mockResolvedValueOnce({
        error: null,
      });

      mockSupabase.update.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({ error: null }),
      });

      // Act
      const result = await service.revertToVersion('asset-123', 'version-123', 'user-456');

      // Assert
      expect(result.success).toBe(true);
      expect(result.versionNumber).toBe(1);
      expect(result.newStorageUrl).toContain('supabase://assets/');
      expect(mockSupabase.storage.copy).toHaveBeenCalledTimes(2); // Pre-revert snapshot + revert
      expect(mockSupabase.storage.remove).toHaveBeenCalled();
    });

    it('should throw error if version not found', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Version not found' },
      });

      // Act & Assert
      await expect(
        service.revertToVersion('asset-123', 'invalid-version', 'user-456')
      ).rejects.toThrow('Version not found');
    });

    it('should create pre-revert snapshot', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockVersion,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockAsset,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockVersion, version_number: 99 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockAsset,
          error: null,
        });

      mockSupabase.rpc.mockResolvedValue({
        data: 99,
        error: null,
      });

      mockSupabase.storage.copy.mockResolvedValue({
        error: null,
      });

      mockSupabase.storage.remove.mockResolvedValue({
        error: null,
      });

      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      // Act
      await service.revertToVersion('asset-123', 'version-123', 'user-456');

      // Assert
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should throw error if asset not found during revert', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockVersion,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockVersion, version_number: 2 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Asset not found' },
        });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 3,
        error: null,
      });

      mockSupabase.storage.copy.mockResolvedValue({
        error: null,
      });

      // Act & Assert
      await expect(
        service.revertToVersion('asset-123', 'version-123', 'user-456')
      ).rejects.toThrow('Asset not found');
    });

    it('should throw error if copy fails during revert', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockVersion,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockVersion, version_number: 2 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockAsset,
          error: null,
        });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 3,
        error: null,
      });

      mockSupabase.storage.copy
        .mockResolvedValueOnce({
          error: null,
        })
        .mockResolvedValueOnce({
          error: { message: 'Copy failed' },
        });

      // Act & Assert
      await expect(
        service.revertToVersion('asset-123', 'version-123', 'user-456')
      ).rejects.toThrow('Failed to copy version file');
    });

    it('should throw error if update fails during revert', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockVersion,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockVersion, version_number: 2 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockAsset,
          error: null,
        });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 3,
        error: null,
      });

      mockSupabase.storage.copy.mockResolvedValue({
        error: null,
      });

      mockSupabase.storage.remove.mockResolvedValue({
        error: null,
      });

      mockSupabase.update.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({ error: { message: 'Update failed' } }),
      });

      // Act & Assert
      await expect(
        service.revertToVersion('asset-123', 'version-123', 'user-456')
      ).rejects.toThrow('Failed to update asset');
    });
  });

  describe('getVersionDownloadUrl', () => {
    it('should generate signed URL successfully', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: { storage_path: 'user-456/project-789/images/versions/v1_test.png' },
        error: null,
      });

      mockSupabase.storage.createSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://storage.example.com/signed-url' },
        error: null,
      });

      // Act
      const result = await service.getVersionDownloadUrl('version-123');

      // Assert
      expect(result).toBe('https://storage.example.com/signed-url');
      expect(mockSupabase.storage.createSignedUrl).toHaveBeenCalledWith(
        'user-456/project-789/images/versions/v1_test.png',
        3600
      );
    });

    it('should use custom expiration time', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: { storage_path: 'user-456/project-789/images/versions/v1_test.png' },
        error: null,
      });

      mockSupabase.storage.createSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://storage.example.com/signed-url' },
        error: null,
      });

      // Act
      await service.getVersionDownloadUrl('version-123', 7200);

      // Assert
      expect(mockSupabase.storage.createSignedUrl).toHaveBeenCalledWith(
        'user-456/project-789/images/versions/v1_test.png',
        7200
      );
    });

    it('should throw error if version not found', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Version not found' },
      });

      // Act & Assert
      await expect(
        service.getVersionDownloadUrl('invalid-version')
      ).rejects.toThrow('Version not found');
    });

    it('should throw error if signed URL creation fails', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: { storage_path: 'user-456/project-789/images/versions/v1_test.png' },
        error: null,
      });

      mockSupabase.storage.createSignedUrl.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to create signed URL' },
      });

      // Act & Assert
      await expect(
        service.getVersionDownloadUrl('version-123')
      ).rejects.toThrow('Failed to create signed URL');
    });
  });

  describe('deleteVersion', () => {
    it('should delete version successfully', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          storage_path: 'user-456/project-789/images/versions/v1_test.png',
          asset_id: 'asset-123',
        },
        error: null,
      });

      mockSupabase.storage.remove.mockResolvedValueOnce({
        error: null,
      });

      mockSupabase.delete.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({ error: null }),
      });

      // Act
      const result = await service.deleteVersion('version-123');

      // Assert
      expect(result).toBe(true);
      expect(mockSupabase.storage.remove).toHaveBeenCalledWith([
        'user-456/project-789/images/versions/v1_test.png',
      ]);
      expect(mockSupabase.delete).toHaveBeenCalled();
    });

    it('should throw error if version not found', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Version not found' },
      });

      // Act & Assert
      await expect(
        service.deleteVersion('invalid-version')
      ).rejects.toThrow('Version not found');
    });

    it('should continue with DB delete if storage delete fails', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          storage_path: 'user-456/project-789/images/versions/v1_test.png',
          asset_id: 'asset-123',
        },
        error: null,
      });

      mockSupabase.storage.remove.mockResolvedValueOnce({
        error: { message: 'Storage delete failed' },
      });

      mockSupabase.delete.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({ error: null }),
      });

      // Act
      const result = await service.deleteVersion('version-123');

      // Assert
      expect(result).toBe(true);
      expect(mockSupabase.delete).toHaveBeenCalled();
    });

    it('should throw error if database delete fails', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          storage_path: 'user-456/project-789/images/versions/v1_test.png',
          asset_id: 'asset-123',
        },
        error: null,
      });

      mockSupabase.storage.remove.mockResolvedValueOnce({
        error: null,
      });

      mockSupabase.delete.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({ error: { message: 'Delete failed' } }),
      });

      // Act & Assert
      await expect(
        service.deleteVersion('version-123')
      ).rejects.toThrow('Failed to delete version');
    });
  });

  describe('getCurrentVersionNumber', () => {
    it('should get current version number successfully', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: { current_version: 5 },
        error: null,
      });

      // Act
      const result = await service.getCurrentVersionNumber('asset-123');

      // Assert
      expect(result).toBe(5);
      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.select).toHaveBeenCalledWith('current_version');
    });

    it('should return 1 if current_version is null', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: { current_version: null },
        error: null,
      });

      // Act
      const result = await service.getCurrentVersionNumber('asset-123');

      // Assert
      expect(result).toBe(1);
    });

    it('should throw error if asset not found', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Asset not found' },
      });

      // Act & Assert
      await expect(
        service.getCurrentVersionNumber('invalid-asset')
      ).rejects.toThrow('Asset not found');
    });
  });

  describe('Edge cases', () => {
    it('should handle video assets', async () => {
      // Arrange
      const videoAsset = {
        ...mockAsset,
        type: 'video',
        mime_type: 'video/mp4',
        duration_seconds: 120,
      };

      mockSupabase.single
        .mockResolvedValueOnce({
          data: videoAsset,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockVersion, type: 'video' },
          error: null,
        });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 1,
        error: null,
      });

      mockSupabase.storage.copy.mockResolvedValueOnce({
        error: null,
      });

      // Act
      const result = await service.createVersion('asset-123', 'user-456');

      // Assert
      expect(result.type).toBe('video');
    });

    it('should handle audio assets', async () => {
      // Arrange
      const audioAsset = {
        ...mockAsset,
        type: 'audio',
        mime_type: 'audio/mp3',
        duration_seconds: 240,
      };

      mockSupabase.single
        .mockResolvedValueOnce({
          data: audioAsset,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockVersion, type: 'audio' },
          error: null,
        });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 1,
        error: null,
      });

      mockSupabase.storage.copy.mockResolvedValueOnce({
        error: null,
      });

      // Act
      const result = await service.createVersion('asset-123', 'user-456');

      // Assert
      expect(result.type).toBe('audio');
    });

    it('should handle version without label', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockAsset,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockVersion,
          error: null,
        });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 1,
        error: null,
      });

      mockSupabase.storage.copy.mockResolvedValueOnce({
        error: null,
      });

      // Act
      const result = await service.createVersion('asset-123', 'user-456');

      // Assert
      expect(result).toBeDefined();
    });
  });
});
