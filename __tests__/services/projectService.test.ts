/**
 * Tests for ProjectService
 */

import { ProjectService } from '@/lib/services/projectService';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock the error tracking module
jest.mock('@/lib/errorTracking', () => ({
  trackError: jest.fn(),
  ErrorCategory: {
    DATABASE: 'database',
  },
  ErrorSeverity: {
    HIGH: 'high',
    MEDIUM: 'medium',
  },
}));

describe('ProjectService', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let projectService: ProjectService;

  beforeEach(() => {
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

  afterEach(() => {
    jest.clearAllMocks();
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

      await expect(
        projectService.createProject('user123', { title: 'Test' })
      ).rejects.toThrow('Failed to create project');
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

      await expect(
        projectService.getUserProjects('user123')
      ).rejects.toThrow('Failed to fetch projects');
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
      await expect(
        projectService.getProjectById('invalid-uuid', 'user123')
      ).rejects.toThrow();
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
        projectService.deleteProject(
          '550e8400-e29b-41d4-a716-446655440000',
          'user123'
        )
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
        projectService.deleteProject(
          '550e8400-e29b-41d4-a716-446655440000',
          'user123'
        )
      ).rejects.toThrow('Failed to delete project');
    });
  });
});
