/**
 * Tests for ProjectService
 */

// Mock external modules BEFORE imports
jest.mock(
  '@/lib/errorTracking',
  () => ({
    trackError: jest.fn(),
    ErrorCategory: {
      DATABASE: 'database',
    },
    ErrorSeverity: {
      HIGH: 'high',
      MEDIUM: 'medium',
    },
  })
);

jest.mock('@/lib/serverLogger', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  };
  return {
    serverLogger: mockLogger,
  };
});

import { ProjectService } from '@/lib/services/projectService';
import { SupabaseClient } from '@supabase/supabase-js';
import { cache } from '@/lib/cache';

describe('ProjectService', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let projectService: ProjectService;

  beforeEach((): void => {
    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SupabaseClient>;

    projectService = new ProjectService(mockSupabase);
  });

  afterEach(async (): Promise<void> => {
    jest.clearAllMocks();
    await cache.clear();
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const mockProject = {
        id: '123',
        user_id: 'user123',
        title: 'Test Project',
        timeline_state_jsonb: {},
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockProject,
        error: null,
      } as never);

      const result = await projectService.createProject('user123', {
        title: 'Test Project',
      });

      expect(result).toEqual(mockProject);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        title: 'Test Project',
        user_id: 'user123',
        timeline_state_jsonb: {},
      });
    });

    it('should use default title if not provided', async () => {
      const mockProject = {
        id: '123',
        user_id: 'user123',
        title: 'Untitled Project',
        timeline_state_jsonb: {},
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockProject,
        error: null,
      } as never);

      await projectService.createProject('user123');

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        title: 'Untitled Project',
        user_id: 'user123',
        timeline_state_jsonb: {},
      });
    });

    it('should throw error on database failure', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      } as never);

      await expect(projectService.createProject('user123', { title: 'Test' })).rejects.toThrow(
        'Failed to create project'
      );
    });

    it('should use custom initial state if provided', async () => {
      const initialState = { version: 1, clips: [] };
      const mockProject = {
        id: '123',
        user_id: 'user123',
        title: 'Test',
        timeline_state_jsonb: initialState,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockProject,
        error: null,
      } as never);

      await projectService.createProject('user123', {
        title: 'Test',
        initialState,
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        title: 'Test',
        user_id: 'user123',
        timeline_state_jsonb: initialState,
      });
    });
  });

  describe('getUserProjects', () => {
    it('should fetch all projects for a user', async () => {
      const mockProjects = [
        {
          id: '123',
          user_id: 'user123',
          title: 'Project 1',
          timeline_state_jsonb: {},
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '456',
          user_id: 'user123',
          title: 'Project 2',
          timeline_state_jsonb: {},
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
        },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockProjects,
        error: null,
      } as never);

      const result = await projectService.getUserProjects('user123');

      expect(result).toEqual(mockProjects);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user123');
      expect(mockSupabase.order).toHaveBeenCalledWith('updated_at', {
        ascending: false,
      });
    });

    it('should return empty array if no projects found', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: null,
      } as never);

      const result = await projectService.getUserProjects('user123');

      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      } as never);

      await expect(projectService.getUserProjects('user123')).rejects.toThrow(
        'Failed to fetch projects'
      );
    });
  });

  describe('getProjectById', () => {
    it('should fetch a project by ID', async () => {
      const mockProject = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'user123',
        title: 'Project 1',
        timeline_state_jsonb: {},
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockProject,
        error: null,
      } as never);

      const result = await projectService.getProjectById(
        '550e8400-e29b-41d4-a716-446655440000',
        'user123'
      );

      expect(result).toEqual(mockProject);
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440000');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user123');
    });

    it('should return null if project not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      } as never);

      const result = await projectService.getProjectById(
        '550e8400-e29b-41d4-a716-446655440000',
        'user123'
      );

      expect(result).toBeNull();
    });

    it('should throw error for invalid UUID', async () => {
      await expect(projectService.getProjectById('invalid-uuid', 'user123')).rejects.toThrow();
    });
  });

  describe('verifyOwnership', () => {
    it('should return true if user owns project', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: '550e8400-e29b-41d4-a716-446655440000' },
        error: null,
      } as never);

      const result = await projectService.verifyOwnership(
        '550e8400-e29b-41d4-a716-446655440000',
        'user123'
      );

      expect(result).toBe(true);
    });

    it('should return false if project not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      } as never);

      const result = await projectService.verifyOwnership(
        '550e8400-e29b-41d4-a716-446655440000',
        'user123'
      );

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      } as never);

      const result = await projectService.verifyOwnership(
        '550e8400-e29b-41d4-a716-446655440000',
        'user123'
      );

      expect(result).toBe(false);
    });
  });

  describe('updateProjectTitle', () => {
    it('should update project title successfully', async () => {
      const mockProject = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'user123',
        title: 'Updated Title',
        timeline_state_jsonb: {},
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T01:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockProject,
        error: null,
      } as never);

      const result = await projectService.updateProjectTitle(
        '550e8400-e29b-41d4-a716-446655440000',
        'user123',
        'Updated Title'
      );

      expect(result).toEqual(mockProject);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Title',
        })
      );
    });

    it('should throw error if project not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      } as never);

      await expect(
        projectService.updateProjectTitle(
          '550e8400-e29b-41d4-a716-446655440000',
          'user123',
          'New Title'
        )
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({
          error: null,
        } as never),
      };

      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockEqChain),
        }),
      };

      mockSupabase.from.mockReturnValue(mockDeleteChain);

      await expect(
        projectService.deleteProject('550e8400-e29b-41d4-a716-446655440000', 'user123')
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockDeleteChain.delete).toHaveBeenCalled();
    });

    it('should throw error on database failure', async () => {
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Database error' },
        } as never),
      };

      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockEqChain),
        }),
      };

      mockSupabase.from.mockReturnValue(mockDeleteChain);

      await expect(
        projectService.deleteProject('550e8400-e29b-41d4-a716-446655440000', 'user123')
      ).rejects.toThrow('Failed to delete project');
    });
  });

  describe('updateProjectState', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = 'user123';

    it('should successfully update project state', async () => {
      // Arrange
      const newState = {
        projectId,
        clips: [
          {
            id: 'clip1',
            assetId: 'asset1',
            start: 0,
            end: 10,
            timelinePosition: 0,
            trackIndex: 0,
          },
        ],
      };

      const mockUpdatedProject = {
        id: projectId,
        user_id: userId,
        title: 'Test Project',
        timeline_state_jsonb: newState,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T01:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedProject,
        error: null,
      } as never);

      // Act
      const result = await projectService.updateProjectState(projectId, userId, newState);

      // Assert
      expect(result).toEqual(mockUpdatedProject);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          timeline_state_jsonb: newState,
        })
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', projectId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
    });

    it('should update timeline clips successfully', async () => {
      // Arrange
      const newState = {
        projectId,
        clips: [
          {
            id: 'clip1',
            assetId: 'asset1',
            start: 0,
            end: 5,
            timelinePosition: 0,
            trackIndex: 0,
          },
          {
            id: 'clip2',
            assetId: 'asset2',
            start: 0,
            end: 10,
            timelinePosition: 5,
            trackIndex: 1,
          },
        ],
      };

      const mockUpdatedProject = {
        id: projectId,
        user_id: userId,
        title: 'Test Project',
        timeline_state_jsonb: newState,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T01:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedProject,
        error: null,
      } as never);

      // Act
      const result = await projectService.updateProjectState(projectId, userId, newState);

      // Assert
      expect(result.timeline_state_jsonb.clips).toHaveLength(2);
      expect(result.timeline_state_jsonb.clips[0].id).toBe('clip1');
      expect(result.timeline_state_jsonb.clips[1].id).toBe('clip2');
    });

    it('should update text overlays and other metadata', async () => {
      // Arrange
      const newState = {
        projectId,
        clips: [],
        textOverlays: [
          {
            id: 'text1',
            content: 'Hello World',
            x: 100,
            y: 200,
            fontSize: 24,
          },
        ],
        customMetadata: {
          author: 'Test User',
          version: 2,
        },
      };

      const mockUpdatedProject = {
        id: projectId,
        user_id: userId,
        title: 'Test Project',
        timeline_state_jsonb: newState,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T01:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedProject,
        error: null,
      } as never);

      // Act
      const result = await projectService.updateProjectState(projectId, userId, newState);

      // Assert
      expect(result.timeline_state_jsonb).toHaveProperty('textOverlays');
      expect(result.timeline_state_jsonb).toHaveProperty('customMetadata');
      expect(result.timeline_state_jsonb.customMetadata).toEqual({
        author: 'Test User',
        version: 2,
      });
    });

    it('should update project output metadata', async () => {
      // Arrange
      const newState = {
        projectId,
        clips: [],
        output: {
          width: 1920,
          height: 1080,
          fps: 30,
          vBitrateK: 5000,
          aBitrateK: 192,
          format: 'mp4' as const,
        },
      };

      const mockUpdatedProject = {
        id: projectId,
        user_id: userId,
        title: 'Test Project',
        timeline_state_jsonb: newState,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T01:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedProject,
        error: null,
      } as never);

      // Act
      const result = await projectService.updateProjectState(projectId, userId, newState);

      // Assert
      expect(result.timeline_state_jsonb.output).toEqual({
        width: 1920,
        height: 1080,
        fps: 30,
        vBitrateK: 5000,
        aBitrateK: 192,
        format: 'mp4',
      });
    });

    it('should validate state structure is preserved', async () => {
      // Arrange
      const complexState = {
        projectId,
        clips: [
          {
            id: 'clip1',
            assetId: 'asset1',
            start: 0,
            end: 10,
            timelinePosition: 0,
            trackIndex: 0,
            filters: ['blur', 'grayscale'],
            volume: 0.8,
          },
        ],
        output: {
          width: 1920,
          height: 1080,
          fps: 60,
          vBitrateK: 8000,
          aBitrateK: 256,
          format: 'webm' as const,
        },
        globalEffects: {
          colorGrading: { temperature: 5500 },
        },
      };

      const mockUpdatedProject = {
        id: projectId,
        user_id: userId,
        title: 'Test Project',
        timeline_state_jsonb: complexState,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T01:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedProject,
        error: null,
      } as never);

      // Act
      const result = await projectService.updateProjectState(projectId, userId, complexState);

      // Assert
      expect(result.timeline_state_jsonb).toEqual(complexState);
      expect(result.timeline_state_jsonb.clips[0]).toHaveProperty('filters');
      expect(result.timeline_state_jsonb.clips[0]).toHaveProperty('volume');
      expect(result.timeline_state_jsonb).toHaveProperty('globalEffects');
    });

    it('should handle database errors', async () => {
      // Arrange
      const newState = { projectId, clips: [] };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection error' },
      } as never);

      // Act & Assert
      await expect(projectService.updateProjectState(projectId, userId, newState)).rejects.toThrow(
        'Failed to update project state'
      );
    });

    it('should invalidate cache after update', async () => {
      // Arrange
      const newState = { projectId, clips: [] };
      const mockUpdatedProject = {
        id: projectId,
        user_id: userId,
        title: 'Test Project',
        timeline_state_jsonb: newState,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T01:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedProject,
        error: null,
      } as never);

      // Spy on cache.del to verify it's called
      const cacheSpy = jest.spyOn(cache, 'del');

      // Act
      await projectService.updateProjectState(projectId, userId, newState);

      // Assert - cache invalidation should be called with correct keys
      expect(cacheSpy).toHaveBeenCalledWith(`project:metadata:${projectId}`);
      expect(cacheSpy).toHaveBeenCalledWith(`user:projects:${userId}`);
    });

    it('should throw error if project not found', async () => {
      // Arrange
      const newState = { projectId, clips: [] };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      } as never);

      // Act & Assert
      await expect(projectService.updateProjectState(projectId, userId, newState)).rejects.toThrow(
        'Project not found or access denied'
      );
    });

    it('should throw error for invalid UUID', async () => {
      // Arrange
      const invalidProjectId = 'invalid-uuid';
      const newState = { projectId: invalidProjectId, clips: [] };

      // Act & Assert
      await expect(
        projectService.updateProjectState(invalidProjectId, userId, newState)
      ).rejects.toThrow();
    });

    it('should handle partial state updates', async () => {
      // Arrange
      const partialState = {
        clips: [
          {
            id: 'clip1',
            assetId: 'asset1',
            start: 0,
            end: 5,
            timelinePosition: 0,
            trackIndex: 0,
          },
        ],
      };

      const mockUpdatedProject = {
        id: projectId,
        user_id: userId,
        title: 'Test Project',
        timeline_state_jsonb: partialState,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T01:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedProject,
        error: null,
      } as never);

      // Act
      const result = await projectService.updateProjectState(projectId, userId, partialState);

      // Assert
      expect(result.timeline_state_jsonb).toEqual(partialState);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          timeline_state_jsonb: partialState,
        })
      );
    });
  });

  describe('getAllProjects', () => {
    it('should return all projects (admin use case)', async () => {
      // Arrange
      const mockProjects = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: 'user1',
          title: 'Project 1',
          timeline_state_jsonb: {},
          created_at: '2025-01-03T00:00:00Z',
          updated_at: '2025-01-03T00:00:00Z',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          user_id: 'user2',
          title: 'Project 2',
          timeline_state_jsonb: {},
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          user_id: 'user1',
          title: 'Project 3',
          timeline_state_jsonb: {},
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockProjects,
        error: null,
      } as never);

      // Act
      const result = await projectService.getAllProjects();

      // Assert
      expect(result).toEqual(mockProjects);
      expect(result).toHaveLength(3);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return projects ordered by creation date (descending)', async () => {
      // Arrange
      const mockProjects = [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          user_id: 'user1',
          title: 'Newest Project',
          timeline_state_jsonb: {},
          created_at: '2025-01-03T00:00:00Z',
          updated_at: '2025-01-03T00:00:00Z',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          user_id: 'user2',
          title: 'Middle Project',
          timeline_state_jsonb: {},
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: 'user1',
          title: 'Oldest Project',
          timeline_state_jsonb: {},
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockProjects,
        error: null,
      } as never);

      // Act
      const result = await projectService.getAllProjects();

      // Assert
      expect(result[0].title).toBe('Newest Project');
      expect(result[2].title).toBe('Oldest Project');
      expect(new Date(result[0].created_at).getTime()).toBeGreaterThan(
        new Date(result[2].created_at).getTime()
      );
    });

    it('should handle empty database', async () => {
      // Arrange
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: null,
      } as never);

      // Act
      const result = await projectService.getAllProjects();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      // Arrange
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      } as never);

      // Act & Assert
      await expect(projectService.getAllProjects()).rejects.toThrow('Failed to fetch all projects');
    });

    it('should return correct project structure', async () => {
      // Arrange
      const mockProjects = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: 'user1',
          title: 'Test Project',
          timeline_state_jsonb: {
            projectId: '550e8400-e29b-41d4-a716-446655440000',
            clips: [
              {
                id: 'clip1',
                assetId: 'asset1',
                start: 0,
                end: 10,
                timelinePosition: 0,
                trackIndex: 0,
              },
            ],
            output: {
              width: 1920,
              height: 1080,
              fps: 30,
              vBitrateK: 5000,
              aBitrateK: 192,
              format: 'mp4',
            },
          },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockProjects,
        error: null,
      } as never);

      // Act
      const result = await projectService.getAllProjects();

      // Assert
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('user_id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('timeline_state_jsonb');
      expect(result[0]).toHaveProperty('created_at');
      expect(result[0]).toHaveProperty('updated_at');
      expect(result[0].timeline_state_jsonb).toHaveProperty('clips');
      expect(result[0].timeline_state_jsonb).toHaveProperty('output');
    });

    it('should include projects from multiple users', async () => {
      // Arrange
      const mockProjects = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: 'user1',
          title: 'User 1 Project',
          timeline_state_jsonb: {},
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          user_id: 'user2',
          title: 'User 2 Project',
          timeline_state_jsonb: {},
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          user_id: 'user3',
          title: 'User 3 Project',
          timeline_state_jsonb: {},
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockProjects,
        error: null,
      } as never);

      // Act
      const result = await projectService.getAllProjects();

      // Assert
      const uniqueUsers = new Set(result.map((p) => p.user_id));
      expect(uniqueUsers.size).toBe(3);
      expect(uniqueUsers).toContain('user1');
      expect(uniqueUsers).toContain('user2');
      expect(uniqueUsers).toContain('user3');
    });

    it('should handle large number of projects', async () => {
      // Arrange
      const mockProjects = Array.from({ length: 100 }, (_, i) => ({
        id: `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`,
        user_id: `user${i % 10}`,
        title: `Project ${i}`,
        timeline_state_jsonb: {},
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }));

      mockSupabase.order.mockResolvedValue({
        data: mockProjects,
        error: null,
      } as never);

      // Act
      const result = await projectService.getAllProjects();

      // Assert
      expect(result).toHaveLength(100);
      expect(result).toEqual(mockProjects);
    });
  });
});
