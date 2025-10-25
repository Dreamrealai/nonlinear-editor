/**
 * Tests for BackupService
 *
 * Tests all backup functionality including:
 * - Creating backups (auto and manual)
 * - Listing backups
 * - Getting specific backups
 * - Restoring backups
 * - Deleting backups
 * - Exporting backups as JSON
 * - Auto-backup scheduling logic
 *
 * Follows AAA pattern (Arrange-Act-Assert)
 */

import { BackupService, type ProjectBackup, type BackupType } from '@/lib/services/backupService';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '@/lib/errors/HttpError';

describe('BackupService', () => {
  let service: BackupService;
  let mockSupabase: any;

  const mockProjectData = {
    id: 'project-123',
    title: 'Test Project',
    user_id: 'user-456',
    created_at: '2025-10-24T00:00:00.000Z',
    updated_at: '2025-10-24T00:00:00.000Z',
  };

  const mockTimelineData = {
    clips: [
      {
        id: 'clip-1',
        start: 0,
        duration: 5,
        assetId: 'asset-1',
      },
    ],
    tracks: [
      {
        id: 'track-1',
        type: 'video',
      },
    ],
  };

  const mockAssets = [
    {
      id: 'asset-1',
      type: 'video',
      storage_url: 'https://example.com/video.mp4',
      project_id: 'project-123',
      user_id: 'user-456',
    },
  ];

  const mockBackup: ProjectBackup = {
    id: 'backup-123',
    project_id: 'project-123',
    user_id: 'user-456',
    backup_name: 'Manual Backup - 2025-10-24',
    backup_type: 'manual',
    project_data: mockProjectData,
    timeline_data: mockTimelineData as any,
    assets_snapshot: mockAssets as any,
    created_at: '2025-10-24T00:00:00.000Z',
  };

  beforeEach((): void => {
    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    service = new BackupService(mockSupabase as unknown as SupabaseClient);
  });

  describe('createBackup', () => {
    it('should create a manual backup successfully', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: mockBackup,
        error: null,
      });

      // Act
      const result = await service.createBackup({
        projectId: 'project-123',
        backupName: 'My Backup',
        backupType: 'manual',
        projectData: mockProjectData,
        timelineData: mockTimelineData as any,
        assets: mockAssets as any,
      });

      // Assert
      expect(result).toEqual(mockBackup);
      expect(mockSupabase.from).toHaveBeenCalledWith('project_backups');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        project_id: 'project-123',
        backup_name: 'My Backup',
        backup_type: 'manual',
        project_data: mockProjectData,
        timeline_data: mockTimelineData,
        assets_snapshot: mockAssets,
      });
    });

    it('should create an auto backup successfully', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockBackup, backup_type: 'auto' },
        error: null,
      });

      // Act
      const result = await service.createBackup({
        projectId: 'project-123',
        backupType: 'auto',
        projectData: mockProjectData,
        timelineData: mockTimelineData as any,
        assets: mockAssets as any,
      });

      // Assert
      expect(result.backup_type).toBe('auto');
    });

    it('should generate backup name if not provided', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: mockBackup,
        error: null,
      });

      // Act
      await service.createBackup({
        projectId: 'project-123',
        backupType: 'manual',
        projectData: mockProjectData,
        timelineData: mockTimelineData as any,
        assets: mockAssets as any,
      });

      // Assert
      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.backup_name).toMatch(/^(Auto|Manual) Backup - /);
    });

    it('should throw HttpError on database failure', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      // Act & Assert
      await expect(
        service.createBackup({
          projectId: 'project-123',
          backupType: 'manual',
          projectData: mockProjectData,
          timelineData: mockTimelineData as any,
          assets: mockAssets as any,
        })
      ).rejects.toThrow(HttpError);
    });

    it('should handle branded ProjectId type', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: mockBackup,
        error: null,
      });

      // Act
      const result = await service.createBackup({
        projectId: 'project-123' as any, // ProjectId branded type
        backupType: 'manual',
        projectData: mockProjectData,
        timelineData: mockTimelineData as any,
        assets: mockAssets as any,
      });

      // Assert
      expect(result.project_id).toBe('project-123');
    });
  });

  describe('listBackups', () => {
    it('should list all backups for a project', async () => {
      // Arrange
      const backups = [
        mockBackup,
        { ...mockBackup, id: 'backup-456', backup_type: 'auto' as BackupType },
      ];

      mockSupabase.single.mockResolvedValueOnce({
        data: backups,
        error: null,
      });

      // Act
      const result = await service.listBackups('project-123');

      // Assert
      expect(result).toEqual(backups);
      expect(mockSupabase.from).toHaveBeenCalledWith('project_backups');
      expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', 'project-123');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return empty array if no backups exist', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Act
      const result = await service.listBackups('project-123');

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw HttpError on database failure', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      // Act & Assert
      await expect(
        service.listBackups('project-123')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('getBackup', () => {
    it('should get a specific backup by ID', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: mockBackup,
        error: null,
      });

      // Act
      const result = await service.getBackup('backup-123');

      // Assert
      expect(result).toEqual(mockBackup);
      expect(mockSupabase.from).toHaveBeenCalledWith('project_backups');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'backup-123');
    });

    it('should throw HttpError if backup not found', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      // Act & Assert
      await expect(
        service.getBackup('invalid-backup')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('restoreBackup', () => {
    it('should restore backup successfully', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: mockBackup,
        error: null,
      });

      mockSupabase.update.mockResolvedValueOnce({
        error: null,
      });

      mockSupabase.upsert.mockResolvedValueOnce({
        error: null,
      });

      // Act
      await service.restoreBackup({
        backupId: 'backup-123',
        projectId: 'project-123',
      });

      // Assert
      expect(mockSupabase.update).toHaveBeenCalledWith({
        title: mockBackup.project_data.title,
        updated_at: expect.any(String),
      });
      expect(mockSupabase.upsert).toHaveBeenCalledWith({
        project_id: 'project-123',
        timeline_data: mockBackup.timeline_data,
        updated_at: expect.any(String),
      });
    });

    it('should throw HttpError if backup not found', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      // Act & Assert
      await expect(
        service.restoreBackup({
          backupId: 'invalid-backup',
          projectId: 'project-123',
        })
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError if backup does not belong to project', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: mockBackup,
        error: null,
      });

      // Act & Assert
      await expect(
        service.restoreBackup({
          backupId: 'backup-123',
          projectId: 'wrong-project',
        })
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError if project update fails', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: mockBackup,
        error: null,
      });

      mockSupabase.update.mockResolvedValueOnce({
        error: { message: 'Update failed' },
      });

      // Act & Assert
      await expect(
        service.restoreBackup({
          backupId: 'backup-123',
          projectId: 'project-123',
        })
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError if timeline update fails', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: mockBackup,
        error: null,
      });

      mockSupabase.update.mockResolvedValueOnce({
        error: null,
      });

      mockSupabase.upsert.mockResolvedValueOnce({
        error: { message: 'Upsert failed' },
      });

      // Act & Assert
      await expect(
        service.restoreBackup({
          backupId: 'backup-123',
          projectId: 'project-123',
        })
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup successfully', async () => {
      // Arrange
      mockSupabase.delete.mockResolvedValueOnce({
        error: null,
      });

      // Act
      await service.deleteBackup('backup-123');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('project_backups');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'backup-123');
    });

    it('should throw HttpError on database failure', async () => {
      // Arrange
      mockSupabase.delete.mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      });

      // Act & Assert
      await expect(
        service.deleteBackup('backup-123')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('exportBackupAsJSON', () => {
    it('should export backup as formatted JSON string', () => {
      // Act
      const result = service.exportBackupAsJSON(mockBackup);

      // Assert
      expect(typeof result).toBe('string');
      expect(JSON.parse(result)).toEqual(mockBackup);
      expect(result).toContain('"id": "backup-123"');
      expect(result).toContain('"project_id": "project-123"');
    });

    it('should format JSON with 2-space indentation', () => {
      // Act
      const result = service.exportBackupAsJSON(mockBackup);

      // Assert
      expect(result).toContain('  "id"');
      expect(result.split('\n').length).toBeGreaterThan(10);
    });

    it('should handle backups with complex timeline data', () => {
      // Arrange
      const complexBackup: ProjectBackup = {
        ...mockBackup,
        timeline_data: {
          ...mockTimelineData,
          clips: Array.from({ length: 10 }, (_, i) => ({
            id: `clip-${i}`,
            start: i * 5,
            duration: 5,
            assetId: `asset-${i}`,
          })),
        } as any,
      };

      // Act
      const result = service.exportBackupAsJSON(complexBackup);

      // Assert
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed.timeline_data.clips).toHaveLength(10);
    });
  });

  describe('createAutoBackupIfNeeded', () => {
    it('should create auto backup if no previous backup exists', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No rows returned
        })
        .mockResolvedValueOnce({
          data: { ...mockBackup, backup_type: 'auto' },
          error: null,
        });

      // Act
      const result = await service.createAutoBackupIfNeeded(
        'project-123',
        mockProjectData,
        mockTimelineData as any,
        mockAssets as any
      );

      // Assert
      expect(result).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should create auto backup if enough time has passed', async () => {
      // Arrange
      const oldBackupTime = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45 minutes ago
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { created_at: oldBackupTime },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockBackup, backup_type: 'auto' },
          error: null,
        });

      // Act
      const result = await service.createAutoBackupIfNeeded(
        'project-123',
        mockProjectData,
        mockTimelineData as any,
        mockAssets as any,
        30 // 30 minute minimum interval
      );

      // Assert
      expect(result).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should not create auto backup if recent backup exists', async () => {
      // Arrange
      const recentBackupTime = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 minutes ago
      mockSupabase.single.mockResolvedValueOnce({
        data: { created_at: recentBackupTime },
        error: null,
      });

      // Act
      const result = await service.createAutoBackupIfNeeded(
        'project-123',
        mockProjectData,
        mockTimelineData as any,
        mockAssets as any,
        30 // 30 minute minimum interval
      );

      // Assert
      expect(result).toBe(false);
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('should use custom minimum interval', async () => {
      // Arrange
      const recentBackupTime = new Date(Date.now() - 40 * 60 * 1000).toISOString(); // 40 minutes ago
      mockSupabase.single.mockResolvedValueOnce({
        data: { created_at: recentBackupTime },
        error: null,
      });

      // Act
      const result = await service.createAutoBackupIfNeeded(
        'project-123',
        mockProjectData,
        mockTimelineData as any,
        mockAssets as any,
        60 // 60 minute minimum interval
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should use default 30-minute interval', async () => {
      // Arrange
      const oldBackupTime = new Date(Date.now() - 35 * 60 * 1000).toISOString(); // 35 minutes ago
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { created_at: oldBackupTime },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockBackup, backup_type: 'auto' },
          error: null,
        });

      // Act
      const result = await service.createAutoBackupIfNeeded(
        'project-123',
        mockProjectData,
        mockTimelineData as any,
        mockAssets as any
      );

      // Assert
      expect(result).toBe(true);
    });

    it('should query for auto backups only', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockBackup, backup_type: 'auto' },
        error: null,
      });

      // Act
      await service.createAutoBackupIfNeeded(
        'project-123',
        mockProjectData,
        mockTimelineData as any,
        mockAssets as any
      );

      // Assert
      expect(mockSupabase.eq).toHaveBeenCalledWith('backup_type', 'auto');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockSupabase.limit).toHaveBeenCalledWith(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle backup with empty assets', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockBackup, assets_snapshot: [] },
        error: null,
      });

      // Act
      const result = await service.createBackup({
        projectId: 'project-123',
        backupType: 'manual',
        projectData: mockProjectData,
        timelineData: mockTimelineData as any,
        assets: [],
      });

      // Assert
      expect(result.assets_snapshot).toEqual([]);
    });

    it('should handle backup with empty timeline', async () => {
      // Arrange
      const emptyTimeline = { clips: [], tracks: [] };
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockBackup, timeline_data: emptyTimeline },
        error: null,
      });

      // Act
      const result = await service.createBackup({
        projectId: 'project-123',
        backupType: 'manual',
        projectData: mockProjectData,
        timelineData: emptyTimeline as any,
        assets: mockAssets as any,
      });

      // Assert
      expect(result.timeline_data.clips).toEqual([]);
      expect(result.timeline_data.tracks).toEqual([]);
    });

    it('should generate unique backup names for auto backups', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: mockBackup,
        error: null,
      });

      // Act
      const result = await service.createBackup({
        projectId: 'project-123',
        backupType: 'auto',
        projectData: mockProjectData,
        timelineData: mockTimelineData as any,
        assets: mockAssets as any,
      });

      // Assert
      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.backup_name).toMatch(/^Auto Backup - \d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
    });

    it('should generate unique backup names for manual backups', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: mockBackup,
        error: null,
      });

      // Act
      const result = await service.createBackup({
        projectId: 'project-123',
        backupType: 'manual',
        projectData: mockProjectData,
        timelineData: mockTimelineData as any,
        assets: mockAssets as any,
      });

      // Assert
      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.backup_name).toMatch(/^Manual Backup - \d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
    });
  });
});
