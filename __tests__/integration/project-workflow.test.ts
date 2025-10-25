/**
 * @jest-environment node
 */

/**
 * Integration Tests: Project Workflow
 *
 * Tests the complete project lifecycle including:
 * - Create project
 * - Add assets to project
 * - Build timeline with clips
 * - Export project
 *
 * These tests verify that multiple services (ProjectService, AssetService, Export API)
 * work together correctly to support the complete project workflow.
 */

import { ProjectService } from '@/lib/services/projectService';
import { AssetService } from '@/lib/services/assetService';
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

// Mock cache invalidation
jest.mock('@/lib/cacheInvalidation', () => ({
  invalidateProjectCache: jest.fn(),
  invalidateUserProjects: jest.fn(),
}));

describe('Integration: Project Workflow', () => {
  let mockSupabase: MockSupabaseChain;
  let projectService: ProjectService;
  let assetService: AssetService;
  let mockUser: ReturnType<typeof createMockUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    projectService = new ProjectService(mockSupabase as unknown as SupabaseClient);
    assetService = new AssetService(mockSupabase as unknown as SupabaseClient);
    mockUser = mockAuthenticatedUser(mockSupabase);
  });

  afterEach(async () => {
    resetAllMocks(mockSupabase);
    await cache.clear();
  });

  describe('Complete Project Creation Flow', () => {
    it('should create project and add initial assets', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: mockUser.id });
      const mockAsset = createMockAsset({
        project_id: mockProject.id,
        user_id: mockUser.id,
      });

      // Mock project creation
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProject,
        error: null,
      });

      // Mock asset creation - storage upload
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'test-path' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      });

      // Mock asset database insert
      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      // Act - Create project
      const project = await projectService.createProject(mockUser.id, {
        title: 'Test Project',
      });

      // Act - Add asset
      const imageBuffer = Buffer.from('test-image-data');
      const asset = await assetService.createImageAsset(mockUser.id, project.id, imageBuffer, {
        filename: 'test-image.jpg',
        mimeType: 'image/jpeg',
      });

      // Assert
      expect(project).toBeDefined();
      expect(project.id).toBe(mockProject.id);
      expect(project.title).toBe('Test Project');

      expect(asset).toBeDefined();
      expect(asset.project_id).toBe(project.id);
      expect(asset.type).toBe('image');

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.storage.upload).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
    });

    it('should create project with custom initial state', async () => {
      // Arrange
      const initialState = {
        projectId: 'test-project-id',
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

      const mockProject = createMockProject({
        user_id: mockUser.id,
        timeline_state_jsonb: initialState,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockProject,
        error: null,
      });

      // Act
      const project = await projectService.createProject(mockUser.id, {
        title: 'Custom Project',
        initialState,
      });

      // Assert
      expect(project.timeline_state_jsonb).toEqual(initialState);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          timeline_state_jsonb: initialState,
        })
      );
    });

    it('should handle project creation failure gracefully', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      // Act & Assert
      await expect(
        projectService.createProject(mockUser.id, { title: 'Test Project' })
      ).rejects.toThrow('Failed to create project');
    });
  });

  describe('Multi-Asset Upload Flow', () => {
    it('should add multiple assets to a project', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: mockUser.id });

      // Mock successful uploads
      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      });

      // Mock asset creation for multiple assets
      const mockAsset1 = createMockAsset({
        id: 'asset-1',
        project_id: mockProject.id,
        user_id: mockUser.id,
      });
      const mockAsset2 = createMockAsset({
        id: 'asset-2',
        project_id: mockProject.id,
        user_id: mockUser.id,
      });

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockAsset1, error: null })
        .mockResolvedValueOnce({ data: mockAsset2, error: null });

      // Act
      const imageBuffer1 = Buffer.from('test-image-1');
      const imageBuffer2 = Buffer.from('test-image-2');

      const asset1 = await assetService.createImageAsset(
        mockUser.id,
        mockProject.id,
        imageBuffer1,
        {
          filename: 'image1.jpg',
          mimeType: 'image/jpeg',
        }
      );

      const asset2 = await assetService.createImageAsset(
        mockUser.id,
        mockProject.id,
        imageBuffer2,
        {
          filename: 'image2.jpg',
          mimeType: 'image/jpeg',
        }
      );

      // Assert
      expect(asset1.id).toBe('asset-1');
      expect(asset2.id).toBe('asset-2');
      expect(mockSupabase.storage.upload).toHaveBeenCalledTimes(2);
    });

    it('should handle partial asset upload failure', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: mockUser.id });

      // First upload succeeds
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: { path: 'test-path-1' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      });

      const mockAsset1 = createMockAsset({
        id: 'asset-1',
        project_id: mockProject.id,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset1,
        error: null,
      });

      // Second upload fails
      mockSupabase.storage.upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      // Act
      const imageBuffer1 = Buffer.from('test-image-1');
      const imageBuffer2 = Buffer.from('test-image-2');

      const asset1 = await assetService.createImageAsset(
        mockUser.id,
        mockProject.id,
        imageBuffer1,
        {
          filename: 'image1.jpg',
          mimeType: 'image/jpeg',
        }
      );

      // Assert first succeeds
      expect(asset1).toBeDefined();

      // Assert second fails
      await expect(
        assetService.createImageAsset(mockUser.id, mockProject.id, imageBuffer2, {
          filename: 'image2.jpg',
          mimeType: 'image/jpeg',
        })
      ).rejects.toThrow('Failed to upload asset');
    });

    it('should roll back asset record if storage upload succeeds but database insert fails', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: mockUser.id });

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

      // Mock cleanup
      mockSupabase.storage.remove.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Act & Assert
      const imageBuffer = Buffer.from('test-image');

      await expect(
        assetService.createImageAsset(mockUser.id, mockProject.id, imageBuffer, {
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
        })
      ).rejects.toThrow('Failed to create asset record');

      // Verify cleanup was attempted
      expect(mockSupabase.storage.remove).toHaveBeenCalled();
    });
  });

  describe('Timeline Building Flow', () => {
    it('should create project and update timeline state with clips', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: mockUser.id });
      const mockAsset1 = createMockAsset({ id: 'asset-1', project_id: mockProject.id });
      const mockAsset2 = createMockAsset({ id: 'asset-2', project_id: mockProject.id });

      // Mock project creation
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProject,
        error: null,
      });

      // Create project
      const project = await projectService.createProject(mockUser.id, {
        title: 'Timeline Project',
      });

      // Build timeline state
      const timelineState = {
        projectId: project.id,
        clips: [
          {
            id: 'clip-1',
            assetId: mockAsset1.id,
            start: 0,
            end: 5000,
            timelinePosition: 0,
            trackIndex: 0,
          },
          {
            id: 'clip-2',
            assetId: mockAsset2.id,
            start: 0,
            end: 3000,
            timelinePosition: 5000,
            trackIndex: 0,
          },
        ],
        output: {
          width: 1920,
          height: 1080,
          fps: 30,
          vBitrateK: 5000,
          aBitrateK: 192,
          format: 'mp4' as const,
        },
      };

      // Mock timeline update
      const updatedProject = {
        ...mockProject,
        timeline_state_jsonb: timelineState,
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: updatedProject,
        error: null,
      });

      // Act - Update timeline
      const result = await projectService.updateProjectState(
        project.id,
        mockUser.id,
        timelineState
      );

      // Assert
      expect(result.timeline_state_jsonb).toEqual(timelineState);
      expect(result.timeline_state_jsonb.clips).toHaveLength(2);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          timeline_state_jsonb: timelineState,
        })
      );
    });

    it('should handle empty timeline state', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: mockUser.id });

      const emptyState = {
        projectId: mockProject.id,
        clips: [],
      };

      const updatedProject = {
        ...mockProject,
        timeline_state_jsonb: emptyState,
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: updatedProject,
        error: null,
      });

      // Act
      const result = await projectService.updateProjectState(
        mockProject.id,
        mockUser.id,
        emptyState
      );

      // Assert
      expect(result.timeline_state_jsonb.clips).toEqual([]);
    });

    it('should verify project ownership before updating timeline', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: 'different-user' });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const timelineState = {
        projectId: mockProject.id,
        clips: [],
      };

      // Act & Assert
      await expect(
        projectService.updateProjectState(mockProject.id, mockUser.id, timelineState)
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('Project Retrieval and Verification Flow', () => {
    it('should fetch project with assets', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: mockUser.id });
      const mockAssets = [
        createMockAsset({ id: 'asset-1', project_id: mockProject.id, user_id: mockUser.id }),
        createMockAsset({ id: 'asset-2', project_id: mockProject.id, user_id: mockUser.id }),
      ];

      // Mock project fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProject,
        error: null,
      });

      // Mock assets fetch
      mockSupabase.order.mockResolvedValueOnce({
        data: mockAssets,
        error: null,
      });

      // Act
      const project = await projectService.getProjectById(mockProject.id, mockUser.id);
      const assets = await assetService.getProjectAssets(mockProject.id, mockUser.id);

      // Assert
      expect(project).toBeDefined();
      expect(project?.id).toBe(mockProject.id);
      expect(assets).toHaveLength(2);
      expect(assets[0].project_id).toBe(mockProject.id);
    });

    it('should verify project ownership', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: mockProject.id },
        error: null,
      });

      // Act
      const hasAccess = await projectService.verifyOwnership(mockProject.id, mockUser.id);

      // Assert
      expect(hasAccess).toBe(true);
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', mockProject.id);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should deny access to projects owned by other users', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: 'other-user-id' });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Act
      const hasAccess = await projectService.verifyOwnership(mockProject.id, mockUser.id);

      // Assert
      expect(hasAccess).toBe(false);
    });

    it('should fetch all user projects', async () => {
      // Arrange
      const mockProjects = [
        createMockProject({ id: 'project-1', user_id: mockUser.id, title: 'Project 1' }),
        createMockProject({ id: 'project-2', user_id: mockUser.id, title: 'Project 2' }),
        createMockProject({ id: 'project-3', user_id: mockUser.id, title: 'Project 3' }),
      ];

      mockSupabase.order.mockResolvedValueOnce({
        data: mockProjects,
        error: null,
      });

      // Act
      const projects = await projectService.getUserProjects(mockUser.id);

      // Assert
      expect(projects).toHaveLength(3);
      expect(projects[0].title).toBe('Project 1');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockSupabase.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    });
  });

  describe('Project Deletion Flow', () => {
    it('should delete project and clean up assets', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: mockUser.id });
      const mockAsset = createMockAsset({ project_id: mockProject.id, user_id: mockUser.id });

      // Mock project deletion
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockEqChain),
        }),
      };

      mockSupabase.from.mockReturnValue(mockDeleteChain);

      // Act
      await projectService.deleteProject(mockProject.id, mockUser.id);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockDeleteChain.delete).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: mockUser.id });

      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({ error: { message: 'Deletion failed' } }),
      };

      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockEqChain),
        }),
      };

      mockSupabase.from.mockReturnValue(mockDeleteChain);

      // Act & Assert
      await expect(projectService.deleteProject(mockProject.id, mockUser.id)).rejects.toThrow(
        'Failed to delete project'
      );
    });
  });

  describe('Complete Project Workflow End-to-End', () => {
    it('should complete full workflow: create → add assets → build timeline → fetch → delete', async () => {
      // Arrange
      const mockProject = createMockProject({ user_id: mockUser.id, title: 'Full Workflow' });
      const mockAsset = createMockAsset({ project_id: mockProject.id, user_id: mockUser.id });

      // Step 1: Create project
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProject,
        error: null,
      });

      const project = await projectService.createProject(mockUser.id, {
        title: 'Full Workflow',
      });

      expect(project.title).toBe('Full Workflow');

      // Step 2: Add asset
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

      const imageBuffer = Buffer.from('test-image');
      const asset = await assetService.createImageAsset(mockUser.id, project.id, imageBuffer, {
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
      });

      expect(asset.project_id).toBe(project.id);

      // Step 3: Build timeline
      const timelineState = {
        projectId: project.id,
        clips: [
          {
            id: 'clip-1',
            assetId: asset.id,
            start: 0,
            end: 5000,
            timelinePosition: 0,
            trackIndex: 0,
          },
        ],
      };

      const updatedProject = {
        ...mockProject,
        timeline_state_jsonb: timelineState,
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: updatedProject,
        error: null,
      });

      const projectWithTimeline = await projectService.updateProjectState(
        project.id,
        mockUser.id,
        timelineState
      );

      expect(projectWithTimeline.timeline_state_jsonb.clips).toHaveLength(1);

      // Step 4: Fetch project
      mockSupabase.single.mockResolvedValueOnce({
        data: updatedProject,
        error: null,
      });

      const fetchedProject = await projectService.getProjectById(project.id, mockUser.id);

      expect(fetchedProject?.timeline_state_jsonb.clips).toHaveLength(1);

      // Step 5: Delete project
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockEqChain),
        }),
      };

      mockSupabase.from.mockReturnValue(mockDeleteChain);

      await projectService.deleteProject(project.id, mockUser.id);

      expect(mockDeleteChain.delete).toHaveBeenCalled();
    });
  });
});
