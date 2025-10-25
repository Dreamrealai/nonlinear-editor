/**
 * @jest-environment node
 */
import { ProjectService } from '@/lib/services/projectService';
import {
  createMockSupabaseClient,
  createMockProject,
  mockQuerySuccess,
  mockQueryError,
  resetAllMocks,
} from '@/test-utils/mockSupabase';
import { trackError } from '@/lib/errorTracking';
import { cache } from '@/lib/cache';
import { invalidateProjectCache, invalidateUserProjects } from '@/lib/cacheInvalidation';

// Mock dependencies
jest.mock('@/lib/errorTracking');
jest.mock('@/lib/cache');
jest.mock('@/lib/cacheInvalidation');
jest.mock('@/lib/validation', () => ({
  validateUUID: jest.fn((id: string) => {
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new Error('Invalid UUID format');
    }
  }),
}));

describe('ProjectService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let projectService: ProjectService;
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const projectId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    projectService = new ProjectService(mockSupabase as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
  });

  describe('createProject', () => {
    it('should create project with default title', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: userId });
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.insert.mockReturnValue(builder);
        builder.select.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: mockProject, error: null });
        return builder;
      });

      // Act
      const result = await projectService.createProject(userId);

      // Assert
      expect(result).toEqual(mockProject);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        title: 'Untitled Project',
        user_id: userId,
        timeline_state_jsonb: {},
      });
      expect(invalidateUserProjects).toHaveBeenCalledWith(userId);
    });

    it('should create project with custom title and initial state', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: userId, title: 'My Video' });
      const initialState = { clips: [], projectId };

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.insert.mockReturnValue(builder);
        builder.select.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: mockProject, error: null });
        return builder;
      });

      // Act
      const result = await projectService.createProject(userId, {
        title: 'My Video',
        initialState,
      });

      // Assert
      expect(result).toEqual(mockProject);
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        title: 'My Video',
        user_id: userId,
        timeline_state_jsonb: initialState,
      });
    });

    it('should throw error when database insert fails', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.insert.mockReturnValue(builder);
        builder.select.mockReturnValue(builder);
        builder.single.mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        });
        return builder;
      });

      // Act & Assert
      await expect(projectService.createProject(userId)).rejects.toThrow(
        'Failed to create project'
      );
      expect(trackError).toHaveBeenCalled();
    });
  });

  describe('getUserProjects', () => {
    it('should return projects from cache if available', async () => {
      // Arrange
      const mockProjects = [createMockProject({ user_id: userId })];
      (cache.get as jest.Mock).mockResolvedValue(mockProjects);

      // Act
      const result = await projectService.getUserProjects(userId);

      // Assert
      expect(result).toEqual(mockProjects);
      expect(cache.get).toHaveBeenCalledWith(`user:projects:${userId}`);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      // Arrange
      const mockProjects = [createMockProject({ user_id: userId })];
      (cache.get as jest.Mock).mockResolvedValue(null);

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.order.mockResolvedValue({ data: mockProjects, error: null });
        return builder;
      });

      // Act
      const result = await projectService.getUserProjects(userId);

      // Assert
      expect(result).toEqual(mockProjects);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabase.order).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(cache.set).toHaveBeenCalled();
    });

    it('should return empty array when user has no projects', async () => {
      // Arrange
      (cache.get as jest.Mock).mockResolvedValue(null);

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.order.mockResolvedValue({ data: null, error: null });
        return builder;
      });

      // Act
      const result = await projectService.getUserProjects(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      (cache.get as jest.Mock).mockResolvedValue(null);

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.order.mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
        });
        return builder;
      });

      // Act & Assert
      await expect(projectService.getUserProjects(userId)).rejects.toThrow(
        'Failed to fetch projects'
      );
      expect(trackError).toHaveBeenCalled();
    });
  });

  describe('getProjectById', () => {
    it('should return project from cache if available', async () => {
      // Arrange
      const mockProject = createMockProject({ id: projectId, user_id: userId });
      (cache.get as jest.Mock).mockResolvedValue(mockProject);

      // Act
      const result = await projectService.getProjectById(projectId, userId);

      // Assert
      expect(result).toEqual(mockProject);
      expect(cache.get).toHaveBeenCalled();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      // Arrange
      const mockProject = createMockProject({ id: projectId, user_id: userId });
      (cache.get as jest.Mock).mockResolvedValue(null);

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: mockProject, error: null });
        return builder;
      });

      // Act
      const result = await projectService.getProjectById(projectId, userId);

      // Assert
      expect(result).toEqual(mockProject);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(cache.set).toHaveBeenCalled();
    });

    it('should return null when project not found', async () => {
      // Arrange
      (cache.get as jest.Mock).mockResolvedValue(null);

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });
        return builder;
      });

      // Act
      const result = await projectService.getProjectById(projectId, userId);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error for invalid UUID', async () => {
      // Act & Assert
      await expect(projectService.getProjectById('invalid-uuid', userId)).rejects.toThrow(
        'Invalid UUID format'
      );
    });
  });

  describe('verifyOwnership', () => {
    it('should return true when user owns project', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: { id: projectId }, error: null });
        return builder;
      });

      // Act
      const result = await projectService.verifyOwnership(projectId, userId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user does not own project', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });
        return builder;
      });

      // Act
      const result = await projectService.verifyOwnership(projectId, userId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.single.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });
        return builder;
      });

      // Act
      const result = await projectService.verifyOwnership(projectId, userId);

      // Assert
      expect(result).toBe(false);
      expect(trackError).toHaveBeenCalled();
    });
  });

  describe('updateProjectTitle', () => {
    it('should update project title and invalidate cache', async () => {
      // Arrange
      const newTitle = 'Updated Title';
      const mockProject = createMockProject({
        id: projectId,
        user_id: userId,
        title: newTitle,
      });

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.update.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.select.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: mockProject, error: null });
        return builder;
      });

      // Act
      const result = await projectService.updateProjectTitle(projectId, userId, newTitle);

      // Assert
      expect(result).toEqual(mockProject);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ title: newTitle })
      );
      expect(invalidateProjectCache).toHaveBeenCalledWith(projectId, userId);
    });

    it('should throw error when project not found', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.update.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.select.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: null, error: null });
        return builder;
      });

      // Act & Assert
      await expect(
        projectService.updateProjectTitle(projectId, userId, 'New Title')
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('deleteProject', () => {
    it('should delete project and invalidate cache', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.delete.mockReturnValue(builder);
        builder.eq.mockResolvedValue({ data: null, error: null });
        return builder;
      });

      // Act
      await projectService.deleteProject(projectId, userId);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(invalidateProjectCache).toHaveBeenCalledWith(projectId, userId);
    });

    it('should throw error when delete fails', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.delete.mockReturnValue(builder);
        builder.eq.mockResolvedValue({
          data: null,
          error: { message: 'Delete failed' },
        });
        return builder;
      });

      // Act & Assert
      await expect(projectService.deleteProject(projectId, userId)).rejects.toThrow(
        'Failed to delete project'
      );
      expect(trackError).toHaveBeenCalled();
    });
  });

  describe('updateProjectState', () => {
    it('should update project state and invalidate cache', async () => {
      // Arrange
      const newState = { clips: [], projectId };
      const mockProject = createMockProject({
        id: projectId,
        user_id: userId,
        timeline_state_jsonb: newState,
      });

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.update.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.select.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: mockProject, error: null });
        return builder;
      });

      // Act
      const result = await projectService.updateProjectState(projectId, userId, newState);

      // Assert
      expect(result).toEqual(mockProject);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ timeline_state_jsonb: newState })
      );
      expect(invalidateProjectCache).toHaveBeenCalledWith(projectId, userId);
    });

    it('should throw error when project not found', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.update.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.select.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: null, error: null });
        return builder;
      });

      // Act & Assert
      await expect(
        projectService.updateProjectState(projectId, userId, { clips: [] })
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('getAllProjects', () => {
    it('should return all projects', async () => {
      // Arrange
      const mockProjects = [
        createMockProject({ id: projectId }),
        createMockProject({ id: '550e8400-e29b-41d4-a716-446655440002' }),
      ];

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.order.mockResolvedValue({ data: mockProjects, error: null });
        return builder;
      });

      // Act
      const result = await projectService.getAllProjects();

      // Assert
      expect(result).toEqual(mockProjects);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should throw error when query fails', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.order.mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
        });
        return builder;
      });

      // Act & Assert
      await expect(projectService.getAllProjects()).rejects.toThrow('Failed to fetch all projects');
      expect(trackError).toHaveBeenCalled();
    });
  });
});
